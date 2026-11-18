import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, auth, chat, visitas, buscas, corretores, isAdmin, isPublicado, matchFiltros, filtrosLabel, onlyDigits, fmtDate, loc, num, DEMO, VISITA_STATUS, ETAPAS, PAPEIS } from '../../lib/core.js';
import { Icon, Avatar, DbError, useToast, useModal } from '../../ui/kit.jsx';
import { TabHead } from './TabsBasicas.jsx';
import Select from '../../ui/Select.jsx';

const wa = (tel) => { const t = onlyDigits(tel); return t ? `https://wa.me/${t.startsWith('55') ? t : '55' + t}` : null; };
const Skel = ({ h = 120 }) => <div className="skeleton" style={{ height: h }} />;

// ---------- Visitas ----------
export function Visitas({ refreshCounts }) {
  const toast = useToast(); const modal = useModal(); const nav = useNavigate();
  const [list, setList] = useState(null); const [erro, setErro] = useState(null);
  const carregar = () => visitas.list().then(setList).catch(setErro);
  useEffect(() => { carregar(); }, []);
  const me = auth.user.id, agora = new Date();
  const mudar = async (v, st) => {
    if (['cancelada', 'recusada'].includes(st) && !(await modal.confirm(st === 'cancelada' ? 'Cancelar esta visita?' : 'Recusar este pedido de visita?', st === 'cancelada' ? 'Cancelar visita' : 'Recusar'))) return;
    try {
      await visitas.setStatus(v.id, st);
      const msg = { confirmada: '✅ Visita confirmada', recusada: '❌ Não poderei receber a visita neste horário — que tal escolher outro?', cancelada: '🚫 Visita cancelada', realizada: '🏠 Visita realizada. Obrigado!' }[st];
      if (v.imovel && msg) {
        try {
          const c = (await chat.list()).find((x) => x.imovel_id === v.imovel.id && x.cliente_id === v.cliente_id);
          if (c) await chat.send(c.id, `${msg} — ${new Date(v.data_hora).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`);
        } catch {}
      }
      toast(VISITA_STATUS[st]); carregar(); refreshCounts();
    } catch (e) { toast(e.message, 'err'); }
  };
  const conversar = async (imovelId) => { try { const id = await chat.open(imovelId); if (id) nav(`/conta/chat?c=${encodeURIComponent(id)}`); } catch (e) { toast(e.message, 'err'); } };

  const Card = ({ v, papel }) => {
    const d = new Date(v.data_hora), past = d < agora;
    const outro = papel === 'corretor' ? v.cliente : v.corretor;
    const link = wa(outro?.telefone);
    return (
      <div className={`panel visit-card ${past || ['cancelada', 'recusada'].includes(v.status) ? 'past' : ''}`}>
        <div className="visit-date"><small>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><b>{d.getDate()}</b><span>{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} · {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div style={{ minWidth: 0 }}>
          <h4>{v.imovel ? <Link to={`/imovel/${encodeURIComponent(v.imovel.id)}`}>{v.imovel.titulo}</Link> : 'Imóvel removido'}</h4>
          <div className="meta"><span className={`pill ${v.status}`}>{VISITA_STATUS[v.status]}</span>{v.imovel && <span><Icon name="pin" /> {loc(v.imovel)}</span>}<span><Icon name="user" /> {papel === 'corretor' ? 'Interessado' : 'Corretor'}: {outro?.nome || '—'}</span></div>
          {v.observacao && <div className="meta">“{v.observacao}”</div>}
        </div>
        <div className="row-actions">
          {papel === 'corretor' && v.status === 'pendente' && !past && <><button className="btn btn-sm" onClick={() => mudar(v, 'confirmada')}><Icon name="check" /> Confirmar</button><button className="btn btn-ghost btn-sm" onClick={() => mudar(v, 'recusada')}>Recusar</button></>}
          {papel === 'corretor' && v.status === 'confirmada' && past && <button className="btn btn-sm" onClick={() => mudar(v, 'realizada')}>Marcar realizada</button>}
          {['pendente', 'confirmada'].includes(v.status) && !past && <button className="btn btn-ghost btn-sm" onClick={() => mudar(v, 'cancelada')}>Cancelar</button>}
          {v.imovel && outro && papel === 'cliente' && <button className="btn-icon" aria-label="Conversar" onClick={() => conversar(v.imovel.id)}><Icon name="chat" /></button>}
          {link && papel === 'corretor' && <a className="btn-icon" href={link} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon name="phone" /></a>}
        </div>
      </div>
    );
  };
  const ord = (a, b) => { const fa = new Date(a.data_hora) < agora, fb = new Date(b.data_hora) < agora; return fa !== fb ? (fa ? 1 : -1) : (fa ? b.data_hora.localeCompare(a.data_hora) : a.data_hora.localeCompare(b.data_hora)); };
  const comoCorretor = (list || []).filter((v) => v.corretor_id === me || (isAdmin() && v.cliente_id !== me)).sort(ord);
  const comoCliente = (list || []).filter((v) => v.cliente_id === me).sort(ord);
  return (
    <>
      <TabHead eyebrow="Agenda" titulo="Visitas" />
      {erro ? <DbError error={erro} /> : !list ? <Skel /> : <>
        {!list.length && <div className="empty"><h3>Nenhuma visita agendada</h3><p>Abra um imóvel e use <b>Agendar visita</b> para escolher dia e horário.</p><Link className="btn" to="/#catalogo" style={{ marginTop: '1rem' }}>Ver imóveis</Link></div>}
        {comoCorretor.length > 0 && <><h3 className="sub-title">Pedidos nos seus imóveis</h3><div className="list">{comoCorretor.map((v) => <Card key={v.id} v={v} papel="corretor" />)}</div></>}
        {comoCliente.length > 0 && <><h3 className="sub-title">Suas visitas</h3><div className="list">{comoCliente.map((v) => <Card key={v.id} v={v} papel="cliente" />)}</div></>}
      </>}
    </>
  );
}

// ---------- Buscas salvas ----------
export function Buscas({ refreshCounts }) {
  const toast = useToast(); const modal = useModal();
  const [dados, setDados] = useState(null); const [erro, setErro] = useState(null);
  const carregar = () => Promise.all([buscas.list(), api.listImoveis()]).then(([bs, all]) => setDados({ bs, all: all.filter(isPublicado) })).catch(setErro);
  useEffect(() => { carregar(); }, []);
  const url = (f) => { const p = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => { if (v && v !== '0' && v !== 0) p.set(k === 'fin' ? 'f' : k, v); }); return `/?${p}#catalogo`; };
  return (
    <>
      <TabHead eyebrow="Alertas" titulo="Buscas salvas"><Link className="btn btn-ghost btn-sm" to="/#catalogo"><Icon name="search" /> Nova busca</Link></TabHead>
      {erro ? <DbError error={erro} /> : !dados ? <Skel h={100} /> : !dados.bs.length ? (
        <div className="empty"><h3>Nenhuma busca salva</h3><p>No catálogo, aplique os filtros e toque em <b>Salvar busca</b>. Avisamos quando surgir imóvel novo que combine.</p><Link className="btn" to="/#catalogo" style={{ marginTop: '1rem' }}>Ir ao catálogo</Link></div>
      ) : (
        <div className="list">{dados.bs.map((b) => {
          const f = b.filtros || {};
          const res = dados.all.filter((i) => matchFiltros(f, i));
          const novos = res.filter((i) => i.created_at > b.visto_em).length;
          return (
            <div className="panel busca-card" key={b.id}>
              <div style={{ minWidth: 0 }}>
                <h4>{b.nome} {novos > 0 && <span className="pill novo">{novos} {novos === 1 ? 'novo' : 'novos'}</span>}</h4>
                <div className="chips-sm">{filtrosLabel(f).map((x) => <span key={x}>{x}</span>)}</div>
                <div className="muted" style={{ fontSize: '.82rem', marginTop: '.5rem' }}>{res.length} {res.length === 1 ? 'imóvel combina' : 'imóveis combinam'} agora · salva em {fmtDate(b.created_at)}</div>
              </div>
              <div className="row-actions" style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="switch" title="Alertas por e-mail"><input type="checkbox" defaultChecked={b.alerta_email} onChange={async (e) => { const c = e.target.checked; try { await buscas.update(b.id, { alerta_email: c }); toast(c ? 'Alertas por e-mail ligados' : 'Alertas por e-mail desligados'); } catch (err) { toast(err.message, 'err'); e.target.checked = !c; } }} /> <span style={{ fontSize: '.84rem' }}>E-mail</span></label>
                <Link className="btn btn-sm" to={url(f)} onClick={() => buscas.update(b.id, { visto_em: new Date().toISOString() }).catch(() => {})}>Ver resultados</Link>
                <button className="btn-icon" aria-label="Excluir" onClick={async () => { if (!(await modal.confirm('Excluir esta busca salva?', 'Excluir'))) return; try { await buscas.remove(b.id); carregar(); refreshCounts(); } catch (e) { toast(e.message, 'err'); } }}><Icon name="trash" /></button>
              </div>
            </div>
          );
        })}</div>
      )}
    </>
  );
}

// ---------- Painel (números) ----------
export function Painel() {
  const [d, setD] = useState(null); const [erro, setErro] = useState(null);
  useEffect(() => {
    (async () => {
      const [stats, dias, all] = await Promise.all([api.stats(30), api.viewsPorDia(14), api.listImoveis()]);
      let leads = [], vis = [];
      try { leads = await api.listLeads(); } catch {}
      try { vis = await visitas.list(); } catch {}
      setD({ stats, dias, all, leads, vis });
    })().catch(setErro);
  }, []);
  if (erro) return <><TabHead eyebrow="Últimos 30 dias" titulo="Painel" /><DbError error={erro} /></>;
  if (!d) return <><TabHead eyebrow="Últimos 30 dias" titulo="Painel" /><Skel h={320} /></>;
  const { stats, dias, all, leads, vis } = d;
  const byId = Object.fromEntries(all.map((i) => [i.id, i]));
  const tot = (k) => stats.reduce((n, s) => n + Number(s[k] || 0), 0);
  const ativos = stats.filter((s) => isPublicado(byId[s.imovel_id] || {})).length;
  const pendVis = vis.filter((v) => v.corretor_id === auth.user.id && v.status === 'pendente' && new Date(v.data_hora) > new Date()).length;
  const fechados = leads.filter((l) => l.etapa === 'fechado').length;
  const conv = leads.length ? Math.round((fechados / leads.length) * 100) : 0;
  const max = Math.max(1, ...dias.map((x) => Number(x.total)));
  const top = [...stats].sort((a, b) => Number(b.views) - Number(a.views)).slice(0, 8);
  const fmtDia = (x) => new Date(x + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return (
    <>
      <TabHead eyebrow="Últimos 30 dias" titulo="Painel" />
      <div className="kpis">
        <div className="kpi"><span><Icon name="home" /> Anúncios publicados</span><b>{num(ativos)}</b></div>
        <div className="kpi"><span><Icon name="eye" /> Visualizações</span><b>{num(tot('views'))}</b></div>
        <div className="kpi"><span><Icon name="inbox" /> Interessados</span><b>{num(tot('leads'))}</b></div>
        <div className="kpi"><span><Icon name="heart" /> Favoritados</span><b>{num(tot('favoritos'))}</b></div>
        <div className="kpi"><span><Icon name="calendar" /> Visitas a confirmar</span><b>{num(pendVis)}</b></div>
        <div className="kpi"><span><Icon name="check" /> Negócios fechados</span><b>{num(fechados)}</b><span style={{ marginTop: '.2rem' }}>{conv}% dos interessados</span></div>
      </div>
      <div className="panel chart-card">
        <h3>Visualizações por dia</h3><div className="sub">Últimos 14 dias · {num(dias.reduce((n, x) => n + Number(x.total), 0))} no total</div>
        <div className="bars" role="img" aria-label="Gráfico de barras de visualizações por dia">
          <span className="y-max">{num(max)}</span>
          {dias.map((x, k) => { const h = (Number(x.total) / max) * 100; return (
            <div className="bar-col" tabIndex={0} key={x.dia} style={{ '--k': k, '--h': `${h}%` }}><i style={{ height: `${h}%` }} /><span className="bar-tip">{fmtDia(x.dia)} · {num(x.total)} {Number(x.total) === 1 ? 'visualização' : 'visualizações'}</span></div>
          ); })}
        </div>
        <div className="bar-x">{dias.map((x, k) => <span key={x.dia}>{k % 2 === 0 || dias.length <= 7 ? fmtDia(x.dia) : ''}</span>)}</div>
        <table className="sr-only"><caption>Visualizações por dia</caption><tbody>{dias.map((x) => <tr key={x.dia}><th>{fmtDia(x.dia)}</th><td>{x.total}</td></tr>)}</tbody></table>
      </div>
      <div className="panel chart-card">
        <h3>Desempenho por imóvel</h3><div className="sub">Os mais vistos nos últimos 30 dias</div>
        {top.length ? <div className="table-wrap" style={{ marginTop: '1rem', border: 0 }}><table>
          <thead><tr><th>Imóvel</th><th className="num-cell">Visualizações</th><th className="num-cell">Favoritos</th><th className="num-cell">Interessados</th><th className="num-cell">Visitas</th></tr></thead>
          <tbody>{top.map((s) => { const im = byId[s.imovel_id]; return <tr key={s.imovel_id}><td>{im ? <Link to={`/imovel/${encodeURIComponent(im.id)}`}>{im.titulo}</Link> : '—'}</td><td className="num-cell">{num(s.views)}</td><td className="num-cell">{num(s.favoritos)}</td><td className="num-cell">{num(s.leads)}</td><td className="num-cell">{num(s.visitas)}</td></tr>; })}</tbody>
        </table></div> : <p className="muted">Sem dados ainda.</p>}
      </div>
      {DEMO && <p className="muted" style={{ fontSize: '.8rem' }}>No modo demonstração os números são simulados.</p>}
    </>
  );
}

// ---------- Interessados (etapas) ----------
export function Leads() {
  const toast = useToast(); const modal = useModal();
  const [leads, setLeads] = useState(null); const [erro, setErro] = useState(null);
  const [fEt, setFEt] = useState('');
  const carregar = () => api.listLeads().then((l) => setLeads(l.map((x) => ({ ...x, etapa: x.etapa || 'novo' })))).catch(setErro);
  useEffect(() => { carregar(); }, []);
  const c = (k) => (leads || []).filter((l) => !k || l.etapa === k).length;
  const list = (leads || []).filter((l) => !fEt || l.etapa === fEt);
  const mudar = async (l, etapa) => {
    try { await api.setLeadEtapa(l.id, etapa); setLeads((ls) => ls.map((x) => (x.id === l.id ? { ...x, etapa } : x))); toast(`Etapa: ${ETAPAS[etapa]}`); }
    catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <TabHead eyebrow="Contatos recebidos" titulo="Interessados" />
      {erro ? <DbError error={erro} /> : !leads ? <Skel h={200} /> : <>
        <div className="filter-chips">{[['', 'Todos'], ...Object.entries(ETAPAS)].map(([k, lbl]) => <button key={k} className={`chip ${fEt === k ? 'on' : ''}`} onClick={() => setFEt(k)}>{lbl}<small>{c(k)}</small></button>)}</div>
        {list.length ? <div className="table-wrap"><table>
          <thead><tr><th>Data</th><th>Pessoa</th><th>Imóvel</th><th>Mensagem</th><th>Etapa</th><th /></tr></thead>
          <tbody>{list.map((l) => (
            <tr key={l.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
              <td><strong>{l.nome}</strong><br /><a className="muted" href={`mailto:${l.email}`}>{l.email}</a>{wa(l.telefone) && <><br /><a className="muted" href={wa(l.telefone)} target="_blank" rel="noopener">{l.telefone}</a></>}</td>
              <td>{l.imovel ? <Link to={`/imovel/${encodeURIComponent(l.imovel.id)}`} style={{ color: 'var(--accent)' }}>{l.imovel.titulo}</Link> : <span className="muted">removido</span>}</td>
              <td style={{ maxWidth: 300 }}>{l.mensagem}</td>
              <td><Select className="select" aria-label="Etapa" value={l.etapa} onChange={(e) => mudar(l, e.target.value)}>{Object.entries(ETAPAS).map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}</Select></td>
              <td><button className="btn-icon" aria-label="Excluir" onClick={async () => { if (!(await modal.confirm('Remover este contato da lista?', 'Remover'))) return; try { await api.deleteLead(l.id); carregar(); } catch (e) { toast(e.message, 'err'); } }}><Icon name="trash" /></button></td>
            </tr>
          ))}</tbody></table></div>
          : <div className="empty"><h3>{fEt ? 'Ninguém nesta etapa' : 'Nenhum interessado ainda'}</h3><p>{fEt ? 'Troque o filtro acima.' : 'Quando alguém clicar em “Tenho interesse” num imóvel seu, aparece aqui.'}</p></div>}
      </>}
    </>
  );
}

// ---------- Aprovações de novos corretores ----------
export function Aprovacoes({ cfg, refreshCounts }) {
  const toast = useToast(); const modal = useModal();
  const [list, setList] = useState(null); const [erro, setErro] = useState(null);
  const carregar = () => corretores.list().then(setList).catch(setErro);
  useEffect(() => { carregar(); }, []);
  const n = cfg.aprovacoes_necessarias, me = auth.user.id;
  const votar = async (s, voto) => {
    if (voto === 'rejeitar' && !(await modal.confirm(isAdmin() ? 'Recusar este pedido? Como administrador, isso encerra o pedido.' : 'Votar para recusar este pedido?', 'Recusar'))) return;
    try {
      const r = await corretores.votar(s.id, voto);
      toast(r === 'aprovada' ? 'Corretor aprovado! O acesso já está liberado.' : r === 'rejeitada' ? 'Pedido recusado.' : 'Voto registrado. Aguardando outros aprovadores.');
      carregar(); refreshCounts();
    } catch (e) { toast(e.message, 'err'); }
  };
  const Card = ({ s }) => {
    const p = s.perfil || {}; const votos = s.votos || [];
    const sim = votos.filter((v) => v.voto === 'aprovar').length, nao = votos.filter((v) => v.voto === 'rejeitar').length;
    const meu = votos.find((v) => v.aprovador_id === me)?.voto;
    const link = wa(s.telefone || p.telefone);
    return (
      <div className="panel sol-card">
        <Avatar p={p} size="lg" />
        <div style={{ minWidth: 0 }}>
          <h4>{p.nome || p.email || '—'} <span className={`pill ${s.status}`}>{{ pendente: 'Aguardando', aprovada: 'Aprovado', rejeitada: 'Não aprovado' }[s.status]}</span></h4>
          <div className="meta"><span><Icon name="key" /> {s.creci}</span>{p.email && <a href={`mailto:${p.email}`}><Icon name="mail" /> {p.email}</a>}{link && <a href={link} target="_blank" rel="noopener"><Icon name="phone" /> {s.telefone || p.telefone}</a>}<span><Icon name="clock" /> {fmtDate(s.created_at)}</span></div>
          {s.mensagem && <blockquote>{s.mensagem}</blockquote>}
          <div className="votes"><span className="vote-bar">{Array.from({ length: n }, (_, i) => <i key={i} className={i < sim ? 'on' : ''} />)}</span> {sim}/{n} {n === 1 ? 'aprovação' : 'aprovações'}{nao ? ` · ${nao} contra` : ''}{votos.length ? ` · ${votos.map((v) => (v.aprovador?.nome?.split(' ')[0] || '—') + (v.voto === 'aprovar' ? ' ✓' : ' ✕')).join(', ')}` : ''}</div>
        </div>
        <div className="row-actions">
          {s.status === 'pendente' && s.user_id !== me && <>
            <button className="btn btn-sm" disabled={meu === 'aprovar'} onClick={() => votar(s, 'aprovar')}><Icon name="check" /> {meu === 'aprovar' ? 'Você aprovou' : 'Aprovar'}</button>
            <button className="btn btn-ghost btn-sm" disabled={meu === 'rejeitar'} onClick={() => votar(s, 'rejeitar')}>{meu === 'rejeitar' ? 'Você recusou' : 'Recusar'}</button>
          </>}
        </div>
      </div>
    );
  };
  const pend = (list || []).filter((s) => s.status === 'pendente'), dec = (list || []).filter((s) => s.status !== 'pendente').slice(0, 20);
  return (
    <>
      <TabHead eyebrow="Novos corretores" titulo="Aprovações" />
      <p className="muted" style={{ marginTop: '-.8rem' }}>Cada pedido precisa de <b>{n} {n === 1 ? 'aprovação' : 'aprovações'}</b> {cfg.quem_aprova === 'admin' ? 'de administradores' : 'de corretores ou administradores'}.{isAdmin() ? ' Como administrador, seu voto decide na hora.' : ''}</p>
      {erro ? <DbError error={erro} /> : !list ? <Skel h={140} /> : <>
        {pend.length ? <div className="list">{pend.map((s) => <Card key={s.id} s={s} />)}</div> : <div className="empty"><h3>Nenhum pedido aguardando</h3><p>Quando alguém escolher “Corretor” ao entrar, o pedido aparece aqui.</p></div>}
        {dec.length > 0 && <><h3 className="sub-title">Decididos recentemente</h3><div className="list">{dec.map((s) => <Card key={s.id} s={s} />)}</div></>}
      </>}
    </>
  );
}

// ---------- Equipe e acessos (admin) ----------
export function EquipeAdmin({ cfg, setCfg, refreshCounts }) {
  const toast = useToast();
  const [regras, setRegras] = useState(cfg);
  const [users, setUsers] = useState(null); const [erro, setErro] = useState(null);
  useEffect(() => { setRegras(cfg); }, [cfg]);
  useEffect(() => { api.listProfiles().then((u) => setUsers(u.map((x) => ({ ...x })))).catch(setErro); }, []);
  const salvarRegras = async () => {
    try { await corretores.salvarConfig({ quem_aprova: regras.quem_aprova, aprovacoes_necessarias: +regras.aprovacoes_necessarias }); setCfg({ ...cfg, ...regras, aprovacoes_necessarias: +regras.aprovacoes_necessarias }); toast('Regras de aprovação salvas'); }
    catch (e) { toast(e.message, 'err'); }
  };
  const editar = (id, k, v) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, [k]: v } : u)));
  const salvar = async (u) => {
    const patch = { cargo: u.cargo || '', creci: u.creci || '' };
    if (u.id !== auth.user.id) patch.papel = u.papel;
    try { await api.updateProfile(patch, u.id); toast('Usuário atualizado'); refreshCounts(); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <TabHead eyebrow="Administração" titulo="Equipe e acessos" />
      <div className="panel form" style={{ marginBottom: '1.2rem' }}>
        <h3 style={{ fontSize: '1.3rem' }}>Aprovação de novos corretores</h3>
        <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>Quem escolhe “Corretor” ao entrar fica como visitante até ser aprovado. Seu voto de administrador sempre decide na hora.</p>
        <div className="config-grid">
          <div className="field"><label>Quem pode aprovar</label><Select value={regras.quem_aprova} onChange={(e) => setRegras({ ...regras, quem_aprova: e.target.value })}><option value="equipe">Corretores e administradores</option><option value="admin">Somente administradores</option></Select></div>
          <div className="field"><label>Aprovações necessárias</label><Select value={regras.aprovacoes_necessarias} onChange={(e) => setRegras({ ...regras, aprovacoes_necessarias: +e.target.value })}>{[1, 2, 3, 4, 5].map((k) => <option key={k} value={k}>{k} {k === 1 ? 'aprovação' : 'aprovações'}</option>)}</Select></div>
        </div>
        <div><button className="btn btn-sm" onClick={salvarRegras}><Icon name="check" /> Salvar regras</button></div>
      </div>
      <p className="muted" style={{ margin: '0 0 .8rem' }}>Você também pode mudar o papel de qualquer pessoa diretamente: <b>Visitante</b>, <b>Corretor</b> ou <b>Administrador</b>.</p>
      {erro ? <DbError error={erro} /> : !users ? <Skel h={200} /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Usuário</th><th>Entrou como</th><th>Papel</th><th>Cargo</th><th>CRECI</th><th /></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td><div className="agent"><Avatar p={u} /><div><strong>{u.nome || '—'}</strong><span>{u.email || ''}</span></div></div></td>
              <td>{u.tipo_conta === 'corretor' ? (u.papel === 'cliente' ? <span className="pill pendente">Corretor (aguardando)</span> : <span className="pill publicado">Corretor</span>) : u.tipo_conta === 'visitante' ? <span className="pill rascunho">Visitante</span> : <span className="muted" style={{ fontSize: '.8rem' }}>—</span>}</td>
              <td><Select className="select" value={u.papel} disabled={u.id === auth.user.id} title={u.id === auth.user.id ? 'Você não pode alterar o próprio papel' : undefined} onChange={(e) => editar(u.id, 'papel', e.target.value)}>{Object.entries(PAPEIS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></td>
              <td><input className="input" value={u.cargo || ''} placeholder="Cargo" style={{ minWidth: 160 }} onChange={(e) => editar(u.id, 'cargo', e.target.value)} /></td>
              <td><input className="input" value={u.creci || ''} placeholder="CRECI" style={{ minWidth: 130 }} onChange={(e) => editar(u.id, 'creci', e.target.value)} /></td>
              <td><button className="btn btn-sm" onClick={() => salvar(u)}>Salvar</button></td>
            </tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
