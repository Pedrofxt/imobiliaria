import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth, chat, cover } from '../../lib/core.js';
import { Icon, Avatar, Img, Price, DbError, useToast } from '../../ui/kit.jsx';
import { TabHead } from './TabsBasicas.jsx';

const hora = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const quando = (d) => {
  const dt = new Date(d), hoje = new Date();
  if (dt.toDateString() === hoje.toDateString()) return hora(d);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (dt.toDateString() === ontem.toDateString()) return 'Ontem';
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
const diaLabel = (d) => {
  const dt = new Date(d), hoje = new Date();
  if (dt.toDateString() === hoje.toDateString()) return 'Hoje';
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (dt.toDateString() === ontem.toDateString()) return 'Ontem';
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};
const ordena = (l) => [...l].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

export default function Mensagens() {
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const atualId = sp.get('c');
  const [convs, setConvs] = useState(null);
  const [erro, setErro] = useState(null);
  const [msgs, setMsgs] = useState(null);
  const [texto, setTexto] = useState('');
  const box = useRef(null), inp = useRef(null), chatEl = useRef(null);
  const atualRef = useRef(atualId);
  atualRef.current = atualId;
  const me = auth.user.id;

  useEffect(() => { chat.list().then((c) => setConvs(ordena(c))).catch(setErro); }, []);

  // tempo real
  useEffect(() => chat.subscribe(async (m) => {
    setConvs((cs) => {
      if (!cs) return cs;
      if (!cs.some((c) => c.id === m.conversa_id)) { chat.list().then((c) => setConvs(ordena(c))).catch(() => {}); return cs; }
      return ordena(cs.map((c) => c.id !== m.conversa_id ? c : { ...c, ultima_msg: m.texto, updated_at: m.created_at, naoLidas: (atualRef.current !== c.id && m.autor_id !== me) ? (c.naoLidas || 0) + 1 : c.naoLidas }));
    });
    if (atualRef.current === m.conversa_id) {
      setMsgs((l) => (l && !l.some((x) => x.id === m.id) ? [...l, m] : l));
      if (m.autor_id !== me) chat.markRead(m.conversa_id);
    }
  }), [me]);

  // abrir conversa
  useEffect(() => {
    if (!atualId || !convs) return;
    let vivo = true;
    setMsgs(null);
    chat.messages(atualId).then((l) => { if (!vivo) return; setMsgs(l); chat.markRead(atualId); setConvs((cs) => cs?.map((c) => (c.id === atualId ? { ...c, naoLidas: 0 } : c))); });
    if (matchMedia('(min-width: 900px)').matches) setTimeout(() => inp.current?.focus({ preventScroll: true }), 50);
    chatEl.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atualId, !!convs]);

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);
  useEffect(() => { if (inp.current) { inp.current.style.height = 'auto'; inp.current.style.height = Math.min(inp.current.scrollHeight, 140) + 'px'; } }, [texto]);

  if (erro) return <><TabHead eyebrow="Conversas com a equipe" titulo="Mensagens" /><DbError error={erro} /></>;
  const atual = convs?.find((c) => c.id === atualId);
  const outro = (c) => (c.cliente_id === me ? c.corretor : c.cliente) || { nome: 'Usuário removido' };
  const abrir = (id) => setSp(id ? { c: id } : {}, { replace: true });

  const enviar = async (e) => {
    e.preventDefault();
    const t = texto; if (!t.trim()) return;
    setTexto(''); inp.current?.focus({ preventScroll: true });
    try {
      const m = await chat.send(atual.id, t);
      if (m) {
        setMsgs((l) => (l && !l.some((x) => x.id === m.id) ? [...l, m] : l));
        setConvs((cs) => ordena(cs.map((c) => (c.id === atual.id ? { ...c, ultima_msg: m.texto, updated_at: m.created_at } : c))));
      }
    } catch (err) { toast(err.message, 'err'); setTexto(t); }
  };

  return (
    <>
      <TabHead eyebrow="Conversas com a equipe" titulo="Mensagens" />
      <div className={`chat panel ${atual ? 'open' : ''}`} ref={chatEl}>
        <aside className="chat-list">
          {!convs ? <div className="skeleton" style={{ height: 76, margin: '.6rem' }} />
            : !convs.length ? <div className="chat-empty-list"><p className="muted">Nenhuma conversa ainda.</p><p className="muted" style={{ fontSize: '.85rem' }}>Abra um imóvel e toque em <b>Conversar com o corretor</b>.</p><Link className="btn btn-sm" to="/#catalogo">Ver imóveis</Link></div>
            : convs.map((c) => {
              const o = outro(c);
              return (
                <button key={c.id} className={`chat-item ${atualId === c.id ? 'on' : ''}`} onClick={() => abrir(c.id)}>
                  <Avatar p={o} />
                  <span className="ci-body"><span className="ci-top"><strong>{o.nome || o.email || '—'}</strong><small>{c.updated_at ? quando(c.updated_at) : ''}</small></span>
                    <span className="ci-im">{c.imovel?.titulo || 'Imóvel removido'}</span>
                    <span className="ci-last">{c.ultima_msg || 'Comece a conversa…'}</span></span>
                  {c.naoLidas > 0 && <span className="ci-badge">{c.naoLidas}</span>}
                </button>
              );
            })}
        </aside>
        <section className="chat-win">
          {!atual ? (
            <div className="chat-placeholder"><Icon name="chat" /><h3>Suas conversas</h3><p className="muted">Escolha uma conversa ao lado para ver as mensagens.</p></div>
          ) : (
            <>
              <header className="chat-head">
                <button className="btn-icon chat-back" aria-label="Voltar" onClick={() => abrir(null)}><Icon name="left" /></button>
                <Avatar p={outro(atual)} />
                <div style={{ minWidth: 0, flex: 1 }}><strong>{outro(atual).nome || outro(atual).email}</strong><span className="muted">{atual.cliente_id === me ? (outro(atual).cargo || 'Corretor responsável') : 'Interessado'}</span></div>
                {atual.imovel && <Link className="chat-im" to={`/imovel/${encodeURIComponent(atual.imovel.id)}`}><Img src={cover(atual.imovel)} /><span><b>{atual.imovel.titulo}</b><small><Price im={atual.imovel} /></small></span></Link>}
              </header>
              <div className="msgs" ref={box}>
                {!msgs ? <div className="skeleton" style={{ height: 60, width: '60%', margin: '1rem' }} />
                  : !msgs.length ? <div className="chat-hint">Envie a primeira mensagem para {outro(atual).nome?.split(' ')[0] || 'o corretor'}. Pergunte sobre visitas, documentação ou condições.</div>
                  : msgs.map((m, i) => {
                    const prev = msgs[i - 1], mine = m.autor_id === me;
                    const novoDia = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                    const agrupa = prev && !novoDia && prev.autor_id === m.autor_id && (new Date(m.created_at) - new Date(prev.created_at)) < 120000;
                    return (
                      <div key={m.id} style={{ display: 'contents' }}>
                        {novoDia && <div className="day-sep"><span>{diaLabel(m.created_at)}</span></div>}
                        <div className={`msg ${mine ? 'me' : ''} ${agrupa ? 'grouped' : ''}`}><div className="bubble">{m.texto}<span className="t">{hora(m.created_at)}{mine ? ` ${m.lida ? '✓✓' : '✓'}` : ''}</span></div></div>
                      </div>
                    );
                  })}
              </div>
              <form className="chat-form" onSubmit={enviar}>
                <textarea ref={inp} rows={1} placeholder="Escreva uma mensagem…" maxLength={2000} aria-label="Mensagem" value={texto} onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }} />
                <button className="btn btn-accent" type="submit" aria-label="Enviar"><Icon name="arrow" /></button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
