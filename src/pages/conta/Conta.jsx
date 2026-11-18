import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { auth, favs, isStaff, isAdmin, podeAprovar, corretores, visitas, buscas, api, matchFiltros, isPublicado, signInWithPassword, PAPEIS, DEMO } from '../../lib/core.js';
import { Icon, Logo, Avatar, TipoPicker, GoogleIcon, entrarComGoogle, useAuth, useToast, useOnboarding } from '../../ui/kit.jsx';
import { Perfil, Favoritos, Seguranca, Restrito } from './TabsBasicas.jsx';
import Mensagens from './Mensagens.jsx';
import { Visitas, Buscas, Painel, Leads, Aprovacoes, EquipeAdmin } from './TabsGestao.jsx';
import { MeusImoveis, NovoImovel } from './TabsImoveis.jsx';

const TABS = [
  { id: 'perfil', label: 'Perfil', ic: 'user', C: Perfil },
  { id: 'chat', label: 'Mensagens', ic: 'chat', C: Mensagens },
  { id: 'visitas', label: 'Visitas', ic: 'calendar', C: Visitas },
  { id: 'favoritos', label: 'Favoritos', ic: 'heart', C: Favoritos, fav: true },
  { id: 'buscas', label: 'Buscas salvas', ic: 'bell', C: Buscas },
  { id: 'painel', label: 'Painel', ic: 'chart', staff: true, C: Painel },
  { id: 'imoveis', label: 'Meus imóveis', ic: 'grid', staff: true, C: MeusImoveis },
  { id: 'novo', label: 'Cadastrar imóvel', ic: 'plus', staff: true, C: NovoImovel },
  { id: 'leads', label: 'Interessados', ic: 'inbox', staff: true, C: Leads },
  { id: 'aprovacoes', label: 'Aprovações', ic: 'check', aprova: true, C: Aprovacoes },
  { id: 'equipe', label: 'Equipe', ic: 'users', admin: true, C: EquipeAdmin },
  { id: 'seguranca', label: 'Segurança', ic: 'shield', C: Seguranca },
];

export default function Conta() {
  const a = useAuth();
  const { tab = 'perfil' } = useParams();
  const [cfg, setCfg] = useState({ quem_aprova: 'equipe', aprovacoes_necessarias: 1 });
  const [counts, setCounts] = useState({});
  const [tick, setTick] = useState(0); // força recontagem

  useEffect(() => { corretores.config().then(setCfg).catch(() => {}); }, []);

  // números ao lado das abas
  useEffect(() => {
    if (!a.user) return;
    let vivo = true;
    const me = a.user.id, c = {};
    (async () => {
      try { const v = await visitas.list(); c.visitas = v.filter((x) => x.corretor_id === me && x.status === 'pendente' && new Date(x.data_hora) > new Date()).length; } catch {}
      try {
        const [bs, all] = await Promise.all([buscas.list(), api.listImoveis()]);
        c.buscas = bs.reduce((n, b) => n + all.filter((i) => isPublicado(i) && matchFiltros(b.filtros || {}, i) && i.created_at > b.visto_em).length, 0);
        if (isAdmin()) c.imoveis = all.filter((i) => i.situacao === 'pendente').length;
      } catch {}
      if (podeAprovar(cfg)) { try { const sl = await corretores.list(); c.aprovacoes = sl.filter((x) => x.status === 'pendente' && x.user_id !== me && !(x.votos || []).some((v) => v.aprovador_id === me)).length; } catch {} }
      if (vivo) setCounts(c);
    })();
    return () => { vivo = false; };
  }, [a.user?.id, a.profile?.papel, cfg, tab, tick]);

  if (!a.user) return <main className="page-top"><div className="container" style={{ paddingBottom: '2rem' }}><Login inicial={tab === 'novo' ? 'corretor' : undefined} /></div></main>;

  const p = a.profile || { nome: a.user.email, email: a.user.email, papel: 'cliente' };
  const tabs = TABS.filter((t) => (!t.staff || isStaff()) && (!t.admin || isAdmin()) && (!t.aprova || podeAprovar(cfg)));
  const atual = TABS.find((t) => t.id === tab);
  if (!atual) return <Navigate to="/conta/perfil" replace />;
  const permitido = tabs.includes(atual);
  const Tab = permitido ? atual.C : Restrito;

  return (
    <main className="page-top">
      <div className="container" style={{ paddingBottom: '2rem' }}>
        <div className="panel profile-card reveal">
          <Avatar p={p} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}><span className="eyebrow">Minha conta</span><h1 style={{ fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>Olá, {(p.nome || '').split(' ')[0] || 'bem-vindo'}</h1><span className="muted" style={{ fontSize: '.88rem' }}>{p.email || ''}</span> <span className="role-pill">{PAPEIS[p.papel] || 'Visitante'}</span></div>
          {isStaff() && <Link className="btn btn-accent" to="/conta/novo"><Icon name="plus" /> Novo imóvel</Link>}
        </div>
        {!isStaff() && <SolBanner cfg={cfg} />}
        <div className="account">
          <nav className="side-nav">
            {tabs.map((t) => {
              const n = t.fav ? favs.size : counts[t.id];
              return <Link key={t.id} to={`/conta/${t.id}`} className={`side-link ${t.id === tab ? 'on' : ''}`}><Icon name={t.ic} /> {t.label}{(t.fav || n) ? <span className="count">{n}</span> : null}</Link>;
            })}
          </nav>
          <div>
            <section className="tab on" key={tab}>
              <Tab cfg={cfg} setCfg={setCfg} refreshCounts={() => setTick((x) => x + 1)} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

// situação do pedido de acesso de corretor (para quem ainda é visitante)
function SolBanner({ cfg }) {
  const [sol, setSol] = useState(null);
  const [sim, setSim] = useState(0);
  const onb = useOnboarding();
  const a = useAuth();
  useEffect(() => {
    corretores.minha().then(async (s) => {
      setSol(s);
      if (s) { try { const v = await corretores.votosDe(s.id); setSim(v.filter((x) => x.voto === 'aprovar').length); } catch {} }
    }).catch(() => {});
  }, [a.profile?.tipo_conta]);
  if (!sol) return null;
  if (sol.status === 'pendente') return <div className="draft-banner"><Icon name="clock" /><span><b>Seu acesso de corretor está em análise.</b> {sim ? `${sim} de ${cfg.aprovacoes_necessarias} ${cfg.aprovacoes_necessarias === 1 ? 'aprovação' : 'aprovações'}. ` : ''}Enquanto isso, você usa a Alvar como visitante.</span></div>;
  if (sol.status === 'rejeitada') return (
    <div className="draft-banner" style={{ borderColor: 'color-mix(in srgb,var(--danger) 45%,transparent)', background: 'color-mix(in srgb,var(--danger) 10%,transparent)' }}>
      <Icon name="x" /><span><b>Seu pedido de acesso de corretor não foi aprovado.</b> Você pode revisar os dados e pedir de novo.</span>
      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => onb('corretor', false, () => setSol({ ...sol, status: 'pendente' }))}>Pedir de novo</button>
    </div>
  );
  return null;
}

function Login({ inicial }) {
  const toast = useToast();
  const [tipo, setTipo] = useState(() => inicial || (() => { try { return localStorage.getItem('alvar_tipo') || 'visitante'; } catch { return 'visitante'; } })());
  const [f, setF] = useState({ email: '', senha: '' });
  const [busy, setBusy] = useState(false);
  const entrarSenha = async (e) => {
    e.preventDefault(); setBusy(true);
    try { localStorage.setItem('alvar_tipo', tipo); } catch {}
    try { await signInWithPassword(f.email.trim(), f.senha); } catch (err) { toast(err.message, 'err'); setBusy(false); }
  };
  return (
    <div className="panel login-card reveal">
      <Logo />
      <h1>Sua conta Alvar</h1>
      <p className="muted">Como você quer usar a Alvar?</p>
      <TipoPicker value={tipo} onChange={setTipo} />
      <button className="btn btn-google" onClick={() => entrarComGoogle(tipo)}><GoogleIcon /> Entrar com Google</button>
      <details style={{ marginTop: '1.2rem', textAlign: 'left' }}>
        <summary className="muted" style={{ cursor: 'pointer', fontSize: '.88rem', textAlign: 'center' }}>Já criei uma senha — entrar com e-mail</summary>
        <form className="form" style={{ marginTop: '1rem' }} onSubmit={entrarSenha}>
          <div className="field"><label>E-mail</label><input type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="field"><label>Senha</label><input type="password" required autoComplete="current-password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} /></div>
          <button className="btn" type="submit" style={{ marginTop: '.2rem' }} disabled={busy}>Entrar</button>
        </form>
      </details>
      <p className="muted" style={{ fontSize: '.78rem', marginTop: '1.2rem' }}>{DEMO ? 'Modo demonstração: você entra como administrador fictício.' : 'Corretores entram como visitantes até a equipe aprovar o acesso.'}</p>
      <p className="muted" style={{ fontSize: '.75rem', marginTop: '.4rem' }}>Ao entrar, você concorda com os <Link to="/termos" style={{ textDecoration: 'underline' }}>Termos de Serviço</Link> e a <Link to="/privacidade" style={{ textDecoration: 'underline' }}>Política de Privacidade</Link>.</p>
    </div>
  );
}
