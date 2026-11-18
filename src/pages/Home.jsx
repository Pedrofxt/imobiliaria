import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, auth, buscas, cover, matchFiltros, filtrosLabel, isPublicado, num, ui } from '../lib/core.js';
import { Icon, Img, Price, useModal, useToast, DbError, useStore } from '../ui/kit.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { MapaImoveis } from '../components/LeafletMap.jsx';

const HERO = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2200&q=80';
const TITULO = ['Encontre', 'o', 'lugar', 'onde', 'a', 'sua', <em key="h">história</em>, 'mora.'];
const CIDADES = ['Paranaguá', 'Pontal do Paraná', 'Matinhos', 'Guaratuba', 'Antonina', 'Morretes', 'Curitiba'];

function CountUp({ to }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now(); let raf;
    const step = (t) => { const p = Math.min(1, (t - start) / 1600); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{num(v)}</>;
}

export default function Home() {
  useStore(); // re-renderiza corações e comparação
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const modal = useModal();
  const [all, setAll] = useState(null);
  const [equipe, setEquipe] = useState(0);
  const [erro, setErro] = useState(null);
  const F = { fin: sp.get('f') || '', q: sp.get('q') || '', tipo: sp.get('tipo') || '', quartos: +sp.get('quartos') || 0, preco: sp.get('preco') || '', ord: sp.get('ord') || 'recentes' };
  const view = sp.get('view') === 'mapa' ? 'mapa' : 'lista';
  const [qLocal, setQLocal] = useState(F.q);
  const [heroFin, setHeroFin] = useState('venda');
  const [heroTipo, setHeroTipo] = useState('');
  const [heroQ, setHeroQ] = useState('');
  const heroImg = useRef(null), seg = useRef(null);
  const [thumb, setThumb] = useState({ left: 4, width: 0 });

  useEffect(() => {
    Promise.all([api.listImoveis(), api.listEquipe()])
      .then(([ims, eq]) => { setAll(ims.filter(isPublicado)); setEquipe(eq.length); })
      .catch((e) => { console.error(e); setErro(e); setAll([]); });
  }, []);

  // parallax do hero
  useEffect(() => {
    const onScroll = () => { if (scrollY < innerHeight && heroImg.current) heroImg.current.style.setProperty('--py', scrollY * 0.3 + 'px'); };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  // indicador do Comprar/Alugar
  useEffect(() => {
    const move = () => { const on = seg.current?.querySelector('.on'); if (on) setThumb({ left: on.offsetLeft, width: on.offsetWidth }); };
    move(); document.fonts?.ready.then(move);
    addEventListener('resize', move); return () => removeEventListener('resize', move);
  }, [heroFin]);
  useEffect(() => { setQLocal(F.q); }, [F.q]);
  // busca digitada com pequeno atraso
  useEffect(() => {
    if (qLocal === F.q) return;
    const t = setTimeout(() => setF({ q: qLocal.trim() }), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  function setF(patch, extra = {}) {
    const next = { ...F, ...patch };
    const p = new URLSearchParams();
    if (next.fin) p.set('f', next.fin);
    if (next.q) p.set('q', next.q);
    if (next.tipo) p.set('tipo', next.tipo);
    if (+next.quartos) p.set('quartos', next.quartos);
    if (next.preco) p.set('preco', next.preco);
    if (next.ord && next.ord !== 'recentes') p.set('ord', next.ord);
    const v = extra.view ?? view; if (v === 'mapa') p.set('view', 'mapa');
    setSp(p, { replace: true, preventScrollReset: true });
  }

  const lista = useMemo(() => {
    if (!all) return [];
    let r = all.filter((i) => matchFiltros(F, i));
    const by = { menor: (a, b) => a.preco - b.preco, maior: (a, b) => b.preco - a.preco, area: (a, b) => (b.area_m2 || 0) - (a.area_m2 || 0) }[F.ord];
    if (by) r = [...r].sort(by);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, sp]);
  const destaques = useMemo(() => { if (!all) return []; const d = all.filter((i) => i.destaque); return d.length ? d : all.slice(0, 5); }, [all]);
  const cidades = useMemo(() => { const c = [...new Set((all || []).flatMap((i) => [i.cidade, i.bairro]).filter(Boolean))]; return c.length >= 4 ? c : CIDADES; }, [all]);
  const filtrado = F.fin || F.q || F.tipo || F.quartos || F.preco;
  const semMapa = lista.filter((i) => !(i.latitude && i.longitude)).length;
  const featRef = useRef(null);
  const passo = () => (featRef.current?.querySelector('.feat')?.offsetWidth || 380) + 20;

  const heroSubmit = (e) => {
    e.preventDefault();
    setF({ fin: heroFin, tipo: heroTipo, q: heroQ.trim() });
    setQLocal(heroQ.trim());
    setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const salvarBusca = () => {
    if (!auth.user) { ui.askLogin('Entre para salvar buscas e receber alertas'); return; }
    const f = { fin: F.fin, q: F.q, tipo: F.tipo, quartos: F.quartos, preco: F.preco };
    const sugestao = filtrosLabel(f).join(' · ');
    modal.open((close) => <SalvarBusca sugestao={sugestao} onCancel={close} onSave={async (nome, email) => {
      try { await buscas.create(nome || sugestao, f, email); close(); toast('Busca salva! Veja em Minha conta → Buscas salvas.'); }
      catch (e) { toast(e.message, 'err'); }
    }} />);
  };

  return (
    <main>
      <section className="hero">
        <div className="hero-media"><img src={HERO} alt="" ref={heroImg} fetchpriority="high" /></div>
        <div className="container hero-content">
          <span className="eyebrow" style={{ color: '#F2A27F' }}>Alvar Imóveis · Litoral do Paraná</span>
          <h1>{TITULO.map((w, i) => <span key={i}><span className="w"><span style={{ animationDelay: `${(0.15 + i * 0.07).toFixed(2)}s` }}>{w}</span></span>{' '}</span>)}</h1>
          <p className="lead">Casas, apartamentos e terrenos escolhidos a dedo. Navegue, salve seus favoritos e fale direto com o corretor responsável.</p>
          <form className="search-box" onSubmit={heroSubmit}>
            <div className="seg" ref={seg}>
              <span className="seg-thumb" style={{ left: thumb.left, width: thumb.width }} />
              <button type="button" className={heroFin === 'venda' ? 'on' : ''} onClick={() => setHeroFin('venda')}>Comprar</button>
              <button type="button" className={heroFin === 'aluguel' ? 'on' : ''} onClick={() => setHeroFin('aluguel')}>Alugar</button>
            </div>
            <label className="field-inline">
              <Icon name="home" />
              <select aria-label="Tipo" value={heroTipo} onChange={(e) => setHeroTipo(e.target.value)}>
                <option value="">Todos os tipos</option><option value="casa">Casa</option><option value="apartamento">Apartamento</option><option value="cobertura">Cobertura</option><option value="terreno">Terreno</option><option value="comercial">Comercial</option>
              </select>
            </label>
            <label className="field-inline"><Icon name="pin" /><input placeholder="Cidade, bairro ou palavra-chave" aria-label="Busca" value={heroQ} onChange={(e) => setHeroQ(e.target.value)} /></label>
            <button className="btn btn-accent" type="submit"><Icon name="search" /> Buscar</button>
          </form>
        </div>
        <div className="hero-scroll">Role para explorar</div>
      </section>

      <div className="container stats">
        <div className="stat reveal"><b>{all ? <CountUp to={all.length} /> : 0}</b><span>imóveis no catálogo</span></div>
        <div className="stat reveal" style={{ '--d': '.08s' }}><b>{all ? <CountUp to={all.filter((i) => i.finalidade === 'venda').length} /> : 0}</b><span>à venda</span></div>
        <div className="stat reveal" style={{ '--d': '.16s' }}><b>{all ? <CountUp to={all.filter((i) => i.finalidade === 'aluguel').length} /> : 0}</b><span>para alugar</span></div>
        <div className="stat reveal" style={{ '--d': '.24s' }}><b>{all ? <CountUp to={equipe} /> : 0}</b><span>especialistas na equipe</span></div>
      </div>

      <div className="marquee" aria-hidden="true"><div className="marquee-track">{[...cidades, ...cidades].map((c, i) => <span key={i}>{c}</span>)}</div></div>

      {(!all || destaques.length > 0) && (
        <section className="section" id="destaques">
          <div className="container">
            <div className="section-head reveal">
              <div><span className="eyebrow">Seleção da curadoria</span><h2>Destaques da semana</h2></div>
              <div className="carousel-nav">
                <button className="btn-icon" aria-label="Anterior" onClick={() => featRef.current?.scrollBy({ left: -passo(), behavior: 'smooth' })}><Icon name="left" /></button>
                <button className="btn-icon" aria-label="Próximo" onClick={() => featRef.current?.scrollBy({ left: passo(), behavior: 'smooth' })}><Icon name="right" /></button>
              </div>
            </div>
            <div className="featured" ref={featRef}>
              {!all ? <><div className="feat skeleton" /><div className="feat skeleton" /></> : destaques.map((im) => (
                <Link key={im.id} className="feat" to={`/imovel/${encodeURIComponent(im.id)}`}>
                  <Img src={cover(im)} alt={im.titulo} loading="lazy" />
                  <div className="feat-body">
                    <div><span className="tag" style={{ marginBottom: '.7rem', display: 'inline-block' }}>{im.cidade}</span><h3>{im.titulo}</h3></div>
                    <div className="price"><Price im={im} /></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" id="catalogo" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head reveal">
            <div><span className="eyebrow">Catálogo</span><h2>Todos os imóveis</h2></div>
            <p>Filtre por finalidade, tipo, quartos e faixa de preço. Toque no coração para salvar.</p>
          </div>

          <div className="filters">
            <div className="chip-group">
              {[['', 'Todos'], ['venda', 'Comprar'], ['aluguel', 'Alugar']].map(([v, l]) => <button key={v} className={`chip ${F.fin === v ? 'on' : ''}`} onClick={() => setF({ fin: v })}>{l}</button>)}
            </div>
            <label className="field-inline"><Icon name="search" /><input placeholder="Buscar…" aria-label="Buscar" value={qLocal} onChange={(e) => setQLocal(e.target.value)} /></label>
            <select className="select" aria-label="Tipo" value={F.tipo} onChange={(e) => setF({ tipo: e.target.value })}>
              <option value="">Tipo</option><option value="casa">Casa</option><option value="apartamento">Apartamento</option><option value="cobertura">Cobertura</option><option value="terreno">Terreno</option><option value="comercial">Comercial</option>
            </select>
            <select className="select" aria-label="Quartos" value={F.quartos} onChange={(e) => setF({ quartos: +e.target.value })}>
              <option value="0">Quartos</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option>
            </select>
            <select className="select" aria-label="Preço máximo" value={F.preco} onChange={(e) => setF({ preco: e.target.value })}>
              <option value="">Preço máx.</option><option value="3000">até R$ 3 mil</option><option value="5000">até R$ 5 mil</option><option value="500000">até R$ 500 mil</option><option value="1000000">até R$ 1 mi</option><option value="2000000">até R$ 2 mi</option>
            </select>
            <select className="select" aria-label="Ordenar" value={F.ord} onChange={(e) => setF({ ord: e.target.value })}>
              <option value="recentes">Mais recentes</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option><option value="area">Maior área</option>
            </select>
          </div>

          <div className="results-info">
            <span id="res-count">{!all ? 'Carregando…' : erro ? '' : `${lista.length} ${lista.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}${view === 'mapa' && semMapa ? ` · ${semMapa} sem localização no mapa` : ''}`}</span>
            <div className="results-actions">
              {filtrado ? <button className="btn btn-ghost btn-sm" onClick={() => { setQLocal(''); setF({ fin: '', q: '', tipo: '', quartos: 0, preco: '', ord: 'recentes' }); }}>Limpar filtros</button> : null}
              <button className="btn btn-ghost btn-sm" onClick={salvarBusca}><Icon name="bell" /> Salvar busca</button>
              <div className="view-toggle" role="group" aria-label="Visualização">
                <button className={view === 'lista' ? 'on' : ''} onClick={() => setF({}, { view: 'lista' })}><Icon name="grid" /> Lista</button>
                <button className={view === 'mapa' ? 'on' : ''} onClick={() => setF({}, { view: 'mapa' })}><Icon name="pin" /> Mapa</button>
              </div>
            </div>
          </div>

          {view === 'mapa' && all && !erro ? <MapaImoveis imoveis={lista} /> : (
            <div className="grid">
              {!all ? [0, 1, 2].map((k) => <div key={k} className="skeleton" style={{ height: 400 }} />)
                : erro ? <DbError error={erro} />
                : lista.length ? lista.map((im, i) => <PropertyCard key={im.id} im={im} i={i} />)
                : <div className="empty" style={{ gridColumn: '1/-1' }}><h3>Nenhum imóvel por aqui</h3><p>Tente ampliar os filtros.</p></div>}
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head reveal"><div><span className="eyebrow">Como funciona</span><h2>Simples como deveria ser</h2></div></div>
          <div className="steps">
            <div className="step reveal"><div className="n">01</div><h3>Explore</h3><p>Filtre o catálogo, veja fotos em tela cheia e todos os dados de cada imóvel.</p></div>
            <div className="step reveal" style={{ '--d': '.1s' }}><div className="n">02</div><h3>Salve</h3><p>Entre com o Google e monte sua lista de favoritos, como num carrinho.</p></div>
            <div className="step reveal" style={{ '--d': '.2s' }}><div className="n">03</div><h3>Converse</h3><p>Envie seu interesse e fale direto com o corretor responsável pelo imóvel.</p></div>
          </div>
        </div>
      </section>

      <section className="container reveal">
        <div className="cta">
          <div className="blob" />
          <span className="eyebrow" style={{ color: '#F2A27F' }}>Para proprietários e corretores</span>
          <h2 style={{ margin: '.8rem 0 1rem' }}>Anuncie com quem cuida de cada detalhe.</h2>
          <p>Cadastre o imóvel com fotos, descrição e responsável. Nossa equipe assume daí.</p>
          <button className="btn btn-accent" onClick={() => nav('/conta/novo')} style={{ marginTop: '1rem' }}>Anunciar imóvel <Icon name="arrow" /></button>
        </div>
      </section>
    </main>
  );
}

function SalvarBusca({ sugestao, onSave, onCancel }) {
  const [nome, setNome] = useState(sugestao);
  const [email, setEmail] = useState(true);
  return (
    <>
      <h3 style={{ fontSize: '1.6rem', marginBottom: '.4rem' }}>Salvar busca</h3>
      <p className="muted" style={{ marginTop: 0 }}>Avisamos quando surgir um imóvel novo com esses filtros.</p>
      <div className="form">
        <div className="field"><label>Nome da busca</label><input maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <label className="switch"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Receber alertas por e-mail</label>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end' }}><button className="btn btn-ghost" onClick={onCancel}>Cancelar</button><button className="btn btn-accent" onClick={() => onSave(nome.trim(), email)}>Salvar busca</button></div>
      </div>
    </>
  );
}
