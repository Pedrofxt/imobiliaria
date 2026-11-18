import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SITE, favs, chat, auth, signOut, isStaff, isAdmin, PAPEIS, ui } from '../lib/core.js';
import { Icon, Logo, Avatar, useAuth, useStore } from '../ui/kit.jsx';

// tema claro/escuro com transição circular
function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const toggle = (ev) => {
    const next = dark ? 'light' : 'dark';
    const apply = () => { document.documentElement.dataset.theme = next; localStorage.setItem('alvar_theme', next); setDark(next === 'dark'); };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--vt-x', ev.clientX + 'px');
      document.documentElement.style.setProperty('--vt-y', ev.clientY + 'px');
      document.startViewTransition(apply);
    } else apply();
  };
  return [dark, toggle];
}

// pequeno "pulo" no contador quando o número muda
function Badge({ n, id }) {
  const ref = useRef(null), prev = useRef(n);
  useEffect(() => {
    if (n > prev.current && ref.current) { ref.current.classList.remove('pop'); void ref.current.offsetWidth; ref.current.classList.add('pop'); }
    prev.current = n;
  }, [n]);
  return <span ref={ref} id={id} className={`badge ${n > 0 ? 'show' : ''}`}>{n}</span>;
}

export default function Header() {
  const a = useAuth();
  const st = useStore();
  const [dark, toggleTheme] = useTheme();
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(null); // 'msg' | 'user' | null
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const loc = useLocation();

  useEffect(() => { setMenu(false); setOpen(null); }, [loc.pathname, loc.search, loc.hash]);
  useEffect(() => {
    let last = 0;
    const onScroll = () => { const y = scrollY; setScrolled(y > 30); setHidden(y > 400 && y > last); last = y; };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return () => removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const close = () => setOpen(null);
    const key = (e) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('click', close); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', key); };
  }, []);

  const path = loc.pathname;
  const p = a.profile || { nome: a.user?.email };
  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''} ${hidden && !menu ? 'hidden' : ''}`}>
      <div className="container nav">
        <Link className="brand" to="/" aria-label="Alvar Imóveis — início"><Logo /><span>{SITE.nome}<small>Imóveis</small></span></Link>
        <nav className={`nav-links ${menu ? 'open' : ''}`}>
          <Link to="/#catalogo" className={path === '/' || path.startsWith('/imovel') ? 'active' : ''}>Imóveis</Link>
          <Link to="/?f=venda#catalogo">Comprar</Link>
          <Link to="/?f=aluguel#catalogo">Alugar</Link>
          <NavLink to="/equipe">Equipe</NavLink>
          <Link to="/conta/novo" className={path.startsWith('/conta') ? 'active' : ''}>Anunciar</Link>
        </nav>
        <div className="nav-actions">
          <button className="btn-icon" onClick={toggleTheme} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}><Icon name={dark ? 'sun' : 'moon'} /></button>
          {a.user && (
            <div className="msg-menu" onClick={(e) => e.stopPropagation()}>
              <button className="btn-icon fav-btn" aria-label="Mensagens" aria-haspopup="true" aria-expanded={open === 'msg'} onClick={() => setOpen(open === 'msg' ? null : 'msg')}><Icon name="chat" /><Badge n={st.unread} id="msg-count" /></button>
              <div className={`dropdown msg-panel ${open === 'msg' ? 'open' : ''}`} role="dialog" aria-label="Mensagens">{open === 'msg' && <MsgPanel />}</div>
            </div>
          )}
          <Link className="btn-icon fav-btn" to="/conta/favoritos" aria-label="Favoritos"><Icon name="heart" /><Badge n={favs.size} id="fav-count" /></Link>
          <div>
            {!a.user ? (
              <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); ui.askLogin('Entrar na Alvar'); }}><Icon name="user" /><span>Entrar</span></button>
            ) : (
              <div className="user-menu" onClick={(e) => e.stopPropagation()}>
                <button aria-label="Conta" onClick={() => setOpen(open === 'user' ? null : 'user')}><Avatar p={p} /></button>
                <div className={`dropdown ${open === 'user' ? 'open' : ''}`}>
                  <div className="who"><strong>{p.nome || 'Minha conta'}</strong><span>{p.email || a.user.email || ''}</span><br /><span className="role-pill">{PAPEIS[p.papel] || 'Visitante'}</span></div>
                  <Link to="/conta/perfil"><Icon name="user" /> Meu perfil</Link>
                  <Link to="/conta/favoritos"><Icon name="heart" /> Favoritos</Link>
                  <Link to="/conta/chat"><Icon name="chat" /> Mensagens</Link>
                  {isStaff() && <><Link to="/conta/imoveis"><Icon name="grid" /> Meus imóveis</Link><Link to="/conta/novo"><Icon name="plus" /> Cadastrar imóvel</Link><Link to="/conta/leads"><Icon name="inbox" /> Interessados</Link></>}
                  {isAdmin() && <Link to="/conta/equipe"><Icon name="users" /> Gerenciar equipe</Link>}
                  <Link to="/conta/seguranca"><Icon name="shield" /> Segurança</Link>
                  <button onClick={() => { setOpen(null); signOut(); }}><Icon name="logout" /> Sair</button>
                </div>
              </div>
            )}
          </div>
          <button className="btn-icon menu-toggle" aria-label="Menu" onClick={() => setMenu(!menu)}><Icon name="menu" /></button>
        </div>
      </div>
    </header>
  );
}

const quandoCurto = (d) => {
  if (!d) return '';
  const dt = new Date(d), hoje = new Date();
  if (dt.toDateString() === hoje.toDateString()) return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (dt.toDateString() === ontem.toDateString()) return 'Ontem';
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// painel rápido de mensagens no ícone do topo
function MsgPanel() {
  const [convs, setConvs] = useState(null);
  const [erro, setErro] = useState(false);
  const st = useStore();
  useEffect(() => {
    let vivo = true;
    chat.list().then((c) => vivo && setConvs(c)).catch(() => vivo && setErro(true));
    return () => { vivo = false; };
  }, [st.unread]);
  const me = auth.user.id;
  if (erro) return <><div className="mp-head"><strong>Mensagens</strong></div><div className="mp-empty"><Icon name="chat" /><p>O chat ainda não está disponível.</p></div></>;
  if (!convs) return <><div className="mp-head"><strong>Mensagens</strong></div><div className="mp-list"><div className="skeleton" style={{ height: 58, margin: '.4rem' }} /><div className="skeleton" style={{ height: 58, margin: '.4rem' }} /></div></>;
  const total = convs.reduce((n, c) => n + (c.naoLidas || 0), 0);
  return (
    <>
      <div className="mp-head"><strong>Mensagens</strong>{total > 0 && <span className="mp-count">{total} não {total === 1 ? 'lida' : 'lidas'}</span>}</div>
      {convs.length ? (
        <>
          <div className="mp-list">
            {convs.slice(0, 6).map((c) => {
              const o = (c.cliente_id === me ? c.corretor : c.cliente) || { nome: 'Usuário removido' };
              return (
                <Link key={c.id} className={`mp-item ${c.naoLidas ? 'unread' : ''}`} to={`/conta/chat?c=${encodeURIComponent(c.id)}`}>
                  <Avatar p={o} />
                  <span className="mp-body"><span className="mp-top"><strong>{o.nome || o.email || '—'}</strong><small>{quandoCurto(c.updated_at)}</small></span>
                    <span className="mp-im">{c.imovel?.titulo || 'Imóvel removido'}</span>
                    <span className="mp-last">{c.ultima_msg || 'Conversa iniciada'}</span></span>
                  {c.naoLidas > 0 && <span className="mp-dot">{c.naoLidas}</span>}
                </Link>
              );
            })}
          </div>
          <Link className="mp-all" to="/conta/chat">Ver todas as conversas <Icon name="arrow" /></Link>
        </>
      ) : (
        <div className="mp-empty"><Icon name="chat" /><p><b>Nenhuma mensagem ainda</b></p><p className="muted">Abra um imóvel e toque em <b>Conversar</b> para falar com o corretor.</p><Link className="btn btn-sm" to="/#catalogo">Ver imóveis</Link></div>
      )}
    </>
  );
}
