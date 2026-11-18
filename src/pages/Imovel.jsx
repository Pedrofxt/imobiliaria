import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, auth, chat, visitas, favs, toggleFav, toggleCompare, isAdmin, isPublicado, priceShort, onlyDigits, money, num, SITE, TIPOS, FINALIDADES, STATUS, SITUACOES, PLACEHOLDER, ui } from '../lib/core.js';
import { Icon, Img, Price, Avatar, Logo, Spinner, DbError, useStore, useToast } from '../ui/kit.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { MapaImoveis } from '../components/LeafletMap.jsx';

export default function Imovel() {
  const { id } = useParams();
  const st = useStore();
  const toast = useToast();
  const [im, setIm] = useState(undefined);
  const [erro, setErro] = useState(null);
  const [similares, setSimilares] = useState([]);
  const [lb, setLb] = useState(null); // índice da foto aberta

  useEffect(() => {
    let vivo = true;
    setIm(undefined); setErro(null);
    api.getImovel(id).then((x) => {
      if (!vivo) return;
      setIm(x);
      if (x) {
        document.title = `${x.titulo} — Alvar Imóveis`;
        if (isPublicado(x)) api.registerView(x.id).catch(() => {});
        api.listImoveis().then((all) => vivo && setSimilares(all.filter((o) => isPublicado(o) && o.id !== x.id && (o.tipo === x.tipo || o.cidade === x.cidade)).slice(0, 3))).catch(() => {});
      }
    }).catch((e) => vivo && setErro(e));
    return () => { vivo = false; document.title = 'Alvar Imóveis — Endereços que contam histórias'; };
  }, [id]);

  if (erro) return <main className="page-top"><div className="container"><DbError error={erro} /></div></main>;
  if (im === undefined) return <main className="page-top"><div className="container"><div className="skeleton" style={{ height: '60vh', marginTop: '2rem' }} /></div></main>;
  if (!im) return (
    <main className="page-top"><div className="container"><div className="empty" style={{ margin: '4rem 0' }}>
      <h3>Imóvel não encontrado</h3><p>Ele pode ter sido removido.</p><Link className="btn" to="/#catalogo" style={{ marginTop: '1rem' }}>Ver catálogo</Link>
    </div></div></main>
  );

  const fotos = im.imovel_fotos?.length ? im.imovel_fotos : [{ url: PLACEHOLDER }];
  const shown = fotos.slice(0, 5);
  // só corretores aparecem como responsáveis; sem corretor → contato geral da Alvar
  const r = im.responsavel && (im.responsavel.papel || 'corretor') === 'corretor' ? im.responsavel : null;
  const tel = onlyDigits(r?.telefone || SITE.whatsapp);
  const wa = `https://wa.me/${tel.startsWith('55') ? tel : '55' + tel}?text=${encodeURIComponent(`Olá! Tenho interesse no imóvel "${im.titulo}" (${location.href})`)}`;
  const endereco = [im.endereco, im.bairro, im.cidade, im.estado].filter(Boolean).join(', ');
  const canEdit = auth.user && (isAdmin() || im.responsavel_id === auth.user.id || im.criado_por === auth.user.id);
  const fav = favs.has(im.id);
  const cmp = st.compare.includes(im.id);
  const specs = [
    ['area', im.area_m2 ? `${num(im.area_m2)} m²` : null, 'Área'], ['bed', im.quartos, 'Quartos'], ['star', im.suites, 'Suítes'],
    ['bath', im.banheiros, 'Banheiros'], ['car', im.vagas, 'Vagas'], ['home', TIPOS[im.tipo], 'Tipo'],
  ].filter(([, v]) => v);

  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: im.titulo, text: `${im.titulo} — ${priceShort(im)} · Alvar Imóveis`, url: location.href }); else { await navigator.clipboard.writeText(location.href); toast('Link copiado!'); } } catch {}
  };

  return (
    <main className="page-top">
      <div className="container">
        {!isPublicado(im) && <div className="draft-banner"><Icon name="eye" /><span>Este anúncio está como <b>{SITUACOES[im.situacao]}</b>{im.motivo_rejeicao ? ` — motivo: ${im.motivo_rejeicao}` : ''}. Só a equipe consegue vê-lo.</span></div>}
        <nav className="crumbs reveal"><Link to="/">Início</Link><Icon name="right" /><Link to={`/?f=${im.finalidade}#catalogo`}>{FINALIDADES[im.finalidade]}</Link><Icon name="right" /><span>{im.cidade}</span></nav>
        <div className="prop-head reveal">
          <div>
            <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.8rem' }}>
              <span className={`tag ${im.finalidade === 'venda' ? 'accent' : ''}`}>{FINALIDADES[im.finalidade]}</span>
              <span className="tag" style={{ background: 'var(--pine-soft)', color: 'var(--pine)' }}>{STATUS[im.status] || 'Disponível'}</span>
            </div>
            <h1>{im.titulo}</h1>
            <p className="card-loc" style={{ marginTop: '.7rem' }}><Icon name="pin" /> {endereco}</p>
          </div>
          <div className="actions">
            {canEdit && <Link className="btn btn-ghost btn-sm" to={`/conta/novo?editar=${encodeURIComponent(im.id)}`}><Icon name="edit" /> Editar</Link>}
            <button className={`btn-icon ${cmp ? 'on-cmp' : ''}`} aria-label="Comparar" title="Comparar" onClick={() => { const on = toggleCompare(im.id); toast(on ? 'Adicionado à comparação' : 'Removido da comparação'); }}><Icon name="columns" /></button>
            <button className="btn-icon" aria-label="Compartilhar" onClick={share}><Icon name="share" /></button>
            <button className={`btn-icon heart-lg ${fav ? 'on' : ''}`} aria-label="Favoritar" style={fav ? { color: '#E04F4F' } : undefined} onClick={() => toggleFav(im.id)}><Icon name="heart" style={fav ? { fill: 'currentColor' } : undefined} /></button>
          </div>
        </div>

        <div className={`gallery n${shown.length} reveal`}>
          {shown.map((f, i) => (
            <button key={i} aria-label={`Ver foto ${i + 1}`} onClick={() => setLb(i)}>
              <Img src={f.url} alt={`Foto ${i + 1}`} loading={i ? 'lazy' : undefined} />
              {i === shown.length - 1 && fotos.length > 1 && <span className="more"><Icon name="image" /> {fotos.length} fotos</span>}
            </button>
          ))}
        </div>

        <div className="prop-layout">
          <div>
            <div className="block reveal" style={{ paddingTop: 0 }}><div className="spec-grid">
              {specs.map(([ic, v, l]) => <div className="spec-item" key={l}><Icon name={ic} /><b>{v}</b><span>{l}</span></div>)}
            </div></div>
            <div className="block reveal"><h2>Sobre o imóvel</h2><div className="prose">{im.descricao || 'Sem descrição.'}</div></div>
            {im.comodidades?.length > 0 && <div className="block reveal"><h2>Comodidades</h2><div className="amenities">{im.comodidades.map((c) => <span key={c}><Icon name="check" /> {c}</span>)}</div></div>}
            <Agenda im={im} r={r} />
            {im.finalidade === 'venda' && Number(im.preco) > 0 && <Simulador im={im} />}
            <div className="block reveal" style={{ border: 0 }}><h2>Localização</h2>
              {im.latitude && im.longitude ? <MapaImoveis imoveis={[im]} single className="map" />
                : <iframe className="map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Mapa" src={`https://maps.google.com/maps?q=${encodeURIComponent(endereco)}&z=15&output=embed`} />}
            </div>
          </div>

          <aside className="sidebar">
            <div className="panel reveal">
              <span className="muted" style={{ fontSize: '.85rem' }}>{im.finalidade === 'aluguel' ? 'Aluguel' : 'Valor de venda'}</span>
              <div className="big-price"><Price im={im} /></div>
              <ul className="cost-list">
                {im.condominio ? <li>Condomínio <b>{money(im.condominio)}</b></li> : null}
                {im.iptu ? <li>IPTU {im.finalidade === 'aluguel' ? '(mês)' : '(ano)'} <b>{money(im.iptu)}</b></li> : null}
                {im.finalidade === 'aluguel' && <li>Total estimado <b>{money(Number(im.preco) + Number(im.condominio || 0) + Number(im.iptu || 0))}</b></li>}
              </ul>
              <LeadForm im={im} r={r} />
            </div>
            <ContatoPanel im={im} r={r} wa={wa} />
          </aside>
        </div>

        {similares.length > 0 && (
          <section className="section">
            <div className="section-head reveal"><div><span className="eyebrow">Você também pode gostar</span><h2>Imóveis parecidos</h2></div></div>
            <div className="grid">{similares.map((s, i) => <PropertyCard key={s.id} im={s} i={i} />)}</div>
          </section>
        )}
      </div>
      {lb !== null && <Lightbox fotos={fotos} start={lb} onClose={() => setLb(null)} />}
    </main>
  );
}

function ContatoPanel({ im, r, wa }) {
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const abrirChat = async () => {
    setBusy(true);
    try { const cid = await chat.open(im.id); if (cid) nav(`/conta/chat?c=${encodeURIComponent(cid)}`); }
    catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  if (r) return (
    <div className="panel reveal" style={{ '--d': '.1s' }}>
      <span className="eyebrow">Responsável pelo imóvel</span>
      <div className="agent" style={{ marginTop: '1rem' }}><Avatar p={r} size="lg" /><div><strong>{r.nome}</strong><span>{r.cargo || 'Corretor'}</span><br /><span>{r.creci || ''}</span></div></div>
      {auth.user?.id !== r.id && <button className="btn btn-accent" id="open-chat" style={{ width: '100%', marginTop: '1.1rem' }} disabled={busy} onClick={abrirChat}><Icon name="chat" /> Conversar com {r.nome.split(' ')[0]}</button>}
      <div className="agent-links">
        <a className="btn btn-sm" href={wa} target="_blank" rel="noopener"><Icon name="phone" /> WhatsApp</a>
        {r.email && <a className="btn btn-ghost btn-sm" href={`mailto:${r.email}`}><Icon name="mail" /> E-mail</a>}
      </div>
    </div>
  );
  return (
    <div className="panel reveal" style={{ '--d': '.1s' }}>
      <span className="eyebrow">Atendimento</span>
      <div className="agent" style={{ marginTop: '1rem' }}><span className="avatar lg" style={{ background: 'var(--pine)' }}><Logo /></span><div><strong>Equipe Alvar</strong><span>Um corretor vai te atender</span></div></div>
      <button className="btn btn-accent" id="open-chat" style={{ width: '100%', marginTop: '1.1rem' }} disabled={busy} onClick={abrirChat}><Icon name="chat" /> Conversar com a equipe</button>
      <div className="agent-links">
        <a className="btn btn-sm" href={wa} target="_blank" rel="noopener"><Icon name="phone" /> WhatsApp</a>
        <a className="btn btn-ghost btn-sm" href={`mailto:${SITE.email}`}><Icon name="mail" /> E-mail</a>
      </div>
    </div>
  );
}

// "Tenho interesse": vai para o corretor e, se logado, também vira mensagem no chat
function LeadForm({ im, r }) {
  const toast = useToast();
  const inicio = useRef(Date.now());
  const [f, setF] = useState({ nome: auth.profile?.nome || '', email: auth.profile?.email || auth.user?.email || '', telefone: auth.profile?.telefone || '', mensagem: 'Olá! Gostaria de mais informações e de agendar uma visita.', site: '' });
  const [estado, setEstado] = useState('idle'); // idle | busy | ok
  const [convId, setConvId] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    // anti-robô: campo escondido preenchido ou envio rápido demais
    if (f.site || Date.now() - inicio.current < 2500) { setEstado('ok'); return; }
    setEstado('busy');
    try {
      await api.createLead({ imovel_id: im.id, nome: f.nome.trim(), email: f.email.trim(), telefone: f.telefone.trim(), mensagem: f.mensagem.trim() });
      let cid = null;
      if (auth.user && (!r || auth.user.id !== r.id)) {
        try { cid = await chat.open(im.id); await chat.send(cid, `📩 ${f.mensagem.trim() || 'Tenho interesse neste imóvel.'}${f.telefone.trim() ? `\nTelefone: ${f.telefone.trim()}` : ''}`); } catch {}
      }
      setConvId(cid); setEstado('ok');
      toast(`Recebemos seu contato! ${r ? r.nome.split(' ')[0] + ' vai falar com você.' : ''}`);
    } catch (err) { toast(err.message || 'Erro ao enviar', 'err'); setEstado('idle'); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="form" onSubmit={submit}>
      <div className="field"><label htmlFor="l-nome">Nome</label><input id="l-nome" required value={f.nome} onChange={set('nome')} /></div>
      <div className="form-row">
        <div className="field"><label htmlFor="l-email">E-mail</label><input id="l-email" type="email" required value={f.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="l-tel">Telefone</label><input id="l-tel" type="tel" value={f.telefone} onChange={set('telefone')} /></div>
      </div>
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.site} onChange={set('site')} />
      <div className="field"><label htmlFor="l-msg">Mensagem</label><textarea id="l-msg" style={{ minHeight: 90 }} value={f.mensagem} onChange={set('mensagem')} /></div>
      <button className="btn btn-accent" type="submit" disabled={estado !== 'idle'}>{estado === 'busy' ? <><Spinner /> Enviando…</> : estado === 'ok' ? <><Icon name="check" /> Interesse enviado</> : 'Tenho interesse'}</button>
      <a className="btn btn-ghost btn-sm" href="#agendar" onClick={(e) => { e.preventDefault(); document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' }); }}><Icon name="calendar" /> Agendar visita</a>
      {estado === 'ok' && (
        <div className="notice" style={{ marginTop: '.4rem' }}>
          {convId ? <>Mensagem enviada também pelo chat. <Link to={`/conta/chat?c=${encodeURIComponent(convId)}`} style={{ textDecoration: 'underline', fontWeight: 600 }}>Continuar a conversa →</Link></>
            : <>Recebemos seu contato! {!auth.user && <><button type="button" onClick={() => ui.askLogin('Entre para acompanhar pelo chat')} style={{ textDecoration: 'underline', fontWeight: 600 }}>Entre com Google</button> para acompanhar a resposta pelo chat.</>}</>}
        </div>
      )}
    </form>
  );
}

// ---------- Agendar visita ----------
function Agenda({ im, r }) {
  const toast = useToast();
  const [ocupados, setOcupados] = useState(new Set());
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState(null);
  const [obs, setObs] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(null);
  const dias = useMemo(() => {
    const out = [];
    for (let k = 1; out.length < 12 && k < 30; k++) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + k); if (d.getDay() !== 0) out.push(d); }
    return out;
  }, []);
  useEffect(() => { visitas.ocupados(im.id).then((l) => setOcupados(new Set(l.map((d) => new Date(d).getTime())))).catch(() => {}); }, [im.id]);

  if (auth.user && r && auth.user.id === r.id) return (
    <div className="block reveal" id="agendar"><h2>Agendar visita</h2>
      <p className="muted">Você é o responsável por este imóvel. As visitas pedidas aparecem em <Link to="/conta/visitas" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Minha conta → Visitas</Link>.</p>
    </div>
  );
  const horas = (d) => (d.getDay() === 6 ? [9, 10, 11, 12] : [9, 10, 11, 13, 14, 15, 16, 17]);
  const fmtHora = (h) => `${h.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const pedir = async () => {
    if (!auth.user) { ui.askLogin('Entre para agendar sua visita'); return; }
    setBusy(true);
    try {
      const v = await visitas.create({ imovel_id: im.id, data_hora: hora.toISOString(), observacao: obs.trim() || null });
      if (v) {
        setOcupados((s) => new Set([...s, hora.getTime()]));
        const quando = `${hora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às ${hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        try { const c = await chat.open(im.id); await chat.send(c, `📅 Pedi uma visita para ${quando}.${obs.trim() ? `\nObs.: ${obs.trim()}` : ''}`); } catch {}
        setOk(quando); setHora(null);
        toast('Visita solicitada!');
      }
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  return (
    <div className="block reveal" id="agendar"><h2>Agendar visita</h2>
      <p className="muted" style={{ marginTop: '-.6rem' }}>Escolha o dia e o horário. {r ? r.nome.split(' ')[0] : 'O corretor'} confirma por aqui e pelo chat.</p>
      <div className="days">
        {dias.map((d, i) => (
          <button type="button" key={i} className={`day ${dia && dia.getTime() === d.getTime() ? 'on' : ''}`} onClick={() => { setDia(d); setHora(null); }}>
            {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}<b>{d.getDate()}</b>{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
          </button>
        ))}
      </div>
      <div className="slots" style={{ marginTop: '.8rem' }}>
        {!dia ? <p className="muted" style={{ fontSize: '.88rem', margin: 0, gridColumn: '1/-1' }}>Escolha um dia acima.</p> : horas(dia).map((h) => {
          const t = new Date(dia); t.setHours(h, 0, 0, 0);
          const ocupado = ocupados.has(t.getTime());
          return <button type="button" key={h} className={`slot ${hora && hora.getTime() === t.getTime() ? 'on' : ''}`} disabled={ocupado} title={ocupado ? 'Horário ocupado' : undefined} onClick={() => setHora(t)}>{String(h).padStart(2, '0')}:00</button>;
        })}
      </div>
      <div className="field" style={{ marginTop: '1rem' }}><label htmlFor="v-obs">Observação (opcional)</label><input id="v-obs" maxLength={500} placeholder="Ex.: vou com minha família, prefiro entrar pela garagem…" value={obs} onChange={(e) => setObs(e.target.value)} /></div>
      <button className="btn btn-accent" style={{ marginTop: '1rem' }} disabled={!hora || busy} onClick={pedir}>
        {busy ? <><Spinner /> Enviando…</> : <><Icon name="calendar" /> {hora ? `Pedir visita · ${fmtHora(hora)}` : 'Escolha um horário'}</>}
      </button>
      {ok && <div className="notice" style={{ marginTop: '1rem' }}>Pedido enviado para <b>{ok}</b>. Você recebe a confirmação em <Link to="/conta/visitas" style={{ textDecoration: 'underline', fontWeight: 600 }}>Minha conta → Visitas</Link> e pelo chat.</div>}
    </div>
  );
}

// ---------- Simulador de financiamento ----------
function Simulador({ im }) {
  const [ent, setEnt] = useState(20), [anos, setAnos] = useState(30), [taxa, setTaxa] = useState(11.5), [sis, setSis] = useState('sac');
  const preco = Number(im.preco);
  const entrada = preco * ent / 100, fin = preco - entrada, n = anos * 12, i = Math.pow(1 + Math.max(0, +taxa || 0) / 100, 1 / 12) - 1;
  let primeira, ultima, total;
  if (sis === 'price') { const pmt = i ? fin * i / (1 - Math.pow(1 + i, -n)) : fin / n; primeira = ultima = pmt; total = pmt * n; }
  else { const amort = fin / n; primeira = amort + fin * i; ultima = amort + amort * i; total = fin + i * amort * n * (n + 1) / 2; }
  return (
    <div className="block reveal" id="simulador"><h2>Simule o financiamento</h2>
      <div className="sim-grid">
        <div className="form">
          <div className="field"><div className="range-row"><label>Entrada</label><b>{ent}% · {money(entrada)}</b></div><input type="range" className="range" min="10" max="90" step="5" value={ent} onChange={(e) => setEnt(+e.target.value)} /></div>
          <div className="field"><div className="range-row"><label>Prazo</label><b>{anos} anos · {n} parcelas</b></div><input type="range" className="range" min="5" max="35" step="1" value={anos} onChange={(e) => setAnos(+e.target.value)} /></div>
          <div className="field"><label>Juros ao ano (%)</label><input type="number" min="1" max="30" step="0.1" value={taxa} onChange={(e) => setTaxa(e.target.value)} /></div>
          <div className="field"><label>Sistema de amortização</label><div className="seg-sm">{[['sac', 'SAC'], ['price', 'Price']].map(([v, l]) => <button type="button" key={v} className={sis === v ? 'on' : ''} onClick={() => setSis(v)}>{l}</button>)}</div></div>
        </div>
        <div className="sim-out">
          <span className="muted" style={{ fontSize: '.85rem' }}>{sis === 'sac' ? 'Primeira parcela' : 'Parcela fixa'}</span>
          <div className="big">{money(primeira)}</div>
          <ul className="cost-list">
            {sis === 'sac' && <li>Última parcela <b>{money(ultima)}</b></li>}
            <li>Valor financiado <b>{money(fin)}</b></li>
            <li>Total de juros <b>{money(total - fin)}</b></li>
            <li>Total pago (com entrada) <b>{money(total + entrada)}</b></li>
            <li>Renda familiar sugerida <b>{money(primeira / 0.3)}</b></li>
          </ul>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '.78rem', marginTop: '1rem' }}>Simulação aproximada, sem seguros (MIP/DFI), taxas administrativas e ITBI. Condições reais dependem do banco e da análise de crédito.</p>
    </div>
  );
}

// ---------- Fotos em tela cheia ----------
function Lightbox({ fotos, start, onClose }) {
  const [i, setI] = useState(start);
  const [open, setOpen] = useState(false);
  const sx = useRef(0);
  const go = (d) => setI((x) => (x + d + fotos.length) % fotos.length);
  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
    document.body.style.overflow = 'hidden';
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
    addEventListener('keydown', key);
    return () => { removeEventListener('keydown', key); document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`lightbox ${open ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget || e.target.dataset.bg) onClose(); }}
      onTouchStart={(e) => { sx.current = e.touches[0].clientX; }} onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - sx.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}>
      <button className="lb-btn" aria-label="Anterior" onClick={() => go(-1)}><Icon name="left" /></button>
      <div data-bg="1" style={{ display: 'grid', placeItems: 'center', minWidth: 0, padding: '1rem' }}><img key={i} src={fotos[i].url} alt="" /></div>
      <button className="lb-btn" aria-label="Próxima" onClick={() => go(1)}><Icon name="right" /></button>
      <button className="lb-btn lb-close" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button>
      <div className="lb-count">{i + 1} / {fotos.length}</div>
    </div>
  );
}
