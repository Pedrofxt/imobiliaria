import { $, $$, esc, api, initAuth, onAuth, renderChrome, observeReveal, cardGlow, cardHTML, bindFavs, finishLoading, countUp, cover, priceLabel, imgFallback, qs, dbErrorHTML } from './core.js';

renderChrome('imoveis');

// Título com palavras animadas
const h1 = $('#hero-title');
let wi = 0;
h1.innerHTML = h1.innerHTML.split(/(<em>.*?<\/em>|\s+)/).filter((t) => t && t.trim()).map((t) => {
  const d = (0.15 + wi++ * 0.07).toFixed(2);
  return `<span class="w"><span style="animation-delay:${d}s">${t}</span></span>`;
}).join(' ');

// Parallax do hero
const heroImg = $('#hero-img');
addEventListener('scroll', () => { if (scrollY < innerHeight) heroImg.style.setProperty('--py', scrollY * 0.3 + 'px'); }, { passive: true });

// Segmented control
const seg = $('#hero-seg');
const thumb = seg.querySelector('.seg-thumb');
let heroFin = 'venda';
const moveThumb = () => { const on = seg.querySelector('.on'); thumb.style.left = on.offsetLeft + 'px'; thumb.style.width = on.offsetWidth + 'px'; };
seg.querySelectorAll('button').forEach((b) => b.onclick = () => { seg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); heroFin = b.dataset.v; moveThumb(); });
requestAnimationFrame(moveThumb); addEventListener('resize', moveThumb);
document.fonts?.ready.then(moveThumb);

// Estado dos filtros
const F = { fin: qs('f') || '', q: '', tipo: '', quartos: 0, preco: '', ord: 'recentes' };
let ALL = [];

$('#hero-search').onsubmit = (e) => {
  e.preventDefault();
  F.fin = heroFin; F.tipo = $('#hero-tipo').value; F.q = $('#hero-q').value.trim();
  syncFilterUI(); render();
  $('#catalogo').scrollIntoView({ behavior: 'smooth' });
};

$$('#f-fin .chip').forEach((c) => c.onclick = () => { F.fin = c.dataset.v; syncFilterUI(); render(); });
let qt; $('#f-q').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { F.q = e.target.value.trim(); render(); }, 200); };
$('#f-tipo').onchange = (e) => { F.tipo = e.target.value; render(); };
$('#f-quartos').onchange = (e) => { F.quartos = +e.target.value; render(); };
$('#f-preco').onchange = (e) => { F.preco = e.target.value; render(); };
$('#f-ord').onchange = (e) => { F.ord = e.target.value; render(); };
$('#f-clear').onclick = () => { Object.assign(F, { fin: '', q: '', tipo: '', quartos: 0, preco: '', ord: 'recentes' }); syncFilterUI(); render(); };

function syncFilterUI() {
  $$('#f-fin .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === F.fin));
  $('#f-q').value = F.q; $('#f-tipo').value = F.tipo; $('#f-quartos').value = F.quartos; $('#f-preco').value = F.preco; $('#f-ord').value = F.ord;
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function filtered() {
  const q = norm(F.q);
  let r = ALL.filter((i) =>
    (!F.fin || i.finalidade === F.fin) &&
    (!F.tipo || i.tipo === F.tipo) &&
    (i.quartos || 0) >= F.quartos &&
    (!F.preco || Number(i.preco) <= Number(F.preco)) &&
    (!q || norm(`${i.titulo} ${i.bairro} ${i.cidade} ${i.descricao} ${(i.comodidades || []).join(' ')}`).includes(q)));
  const by = { menor: (a, b) => a.preco - b.preco, maior: (a, b) => b.preco - a.preco, area: (a, b) => (b.area_m2 || 0) - (a.area_m2 || 0) }[F.ord];
  if (by) r = [...r].sort(by);
  return r;
}

function render() {
  const list = filtered();
  const grid = $('#grid');
  $('#res-count').textContent = `${list.length} ${list.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}`;
  $('#f-clear').classList.toggle('hide', !(F.fin || F.q || F.tipo || F.quartos || F.preco));
  grid.innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="empty" style="grid-column:1/-1"><h3>Nenhum imóvel por aqui</h3><p>Tente ampliar os filtros.</p></div>`;
  imgFallback(grid); bindFavs(grid); cardGlow(grid); observeReveal(grid);
}

function renderFeatured() {
  const feat = ALL.filter((i) => i.destaque);
  const list = feat.length ? feat : ALL.slice(0, 5);
  const box = $('#featured');
  if (!list.length) { $('#destaques').classList.add('hide'); return; }
  box.innerHTML = list.map((im) => `
    <a class="feat" href="./imovel.html?id=${encodeURIComponent(im.id)}">
      <img src="${esc(cover(im))}" alt="${esc(im.titulo)}" loading="lazy" data-fb>
      <div class="feat-body">
        <div><span class="tag" style="margin-bottom:.7rem;display:inline-block">${esc(im.cidade)}</span><h3>${esc(im.titulo)}</h3></div>
        <div class="price">${priceLabel(im)}</div>
      </div>
    </a>`).join('');
  imgFallback(box);
  const step = () => box.querySelector('.feat')?.offsetWidth + 20 || 400;
  $('#feat-prev').onclick = () => box.scrollBy({ left: -step(), behavior: 'smooth' });
  $('#feat-next').onclick = () => box.scrollBy({ left: step(), behavior: 'smooth' });
}

function renderMarquee() {
  const cities = [...new Set(ALL.flatMap((i) => [i.cidade, i.bairro]).filter(Boolean))];
  const base = cities.length >= 4 ? cities : ['Paranaguá', 'Pontal do Paraná', 'Matinhos', 'Guaratuba', 'Antonina', 'Morretes', 'Curitiba'];
  const items = base.map((c) => `<span>${esc(c)}</span>`).join('');
  $('#marquee').innerHTML = items + items;
}

async function boot() {
  syncFilterUI();
  await initAuth();
  try {
    const [imoveis, equipe] = await Promise.all([api.listImoveis(), api.listEquipe()]);
    ALL = imoveis;
    countUp($('#st-total'), ALL.length);
    countUp($('#st-venda'), ALL.filter((i) => i.finalidade === 'venda').length);
    countUp($('#st-aluguel'), ALL.filter((i) => i.finalidade === 'aluguel').length);
    countUp($('#st-equipe'), equipe.length);
    renderFeatured(); renderMarquee(); render();
  } catch (e) {
    console.error(e);
    $('#grid').innerHTML = dbErrorHTML(e);
    $('#featured').innerHTML = '';
    $('#res-count').textContent = '';
    renderMarquee();
  }
  observeReveal();
  finishLoading();
  // Re-renderiza corações quando o login muda
  onAuth(() => { if (ALL.length) render(); });
}
boot();
