import { $, $$, esc, api, initAuth, renderChrome, observeReveal, finishLoading, icon, money, num, priceLabel, cover, imgFallback, loc, getCompare, toggleCompare, clearCompare, isPublicado, TIPOS, FINALIDADES, STATUS, dbErrorHTML } from './core.js';

renderChrome('imoveis');
const box = $('#cmp');

// custo mensal estimado: aluguel + condomínio + IPTU (IPTU anual ÷ 12 na venda)
const mensal = (im) => (im.finalidade === 'aluguel' ? Number(im.preco) + Number(im.iptu || 0) : Number(im.iptu || 0) / 12) + Number(im.condominio || 0);
const m2 = (im) => (im.area_m2 ? Number(im.preco) / Number(im.area_m2) : null);

async function draw() {
  const ids = getCompare();
  if (!ids.length) {
    box.innerHTML = `<div class="empty"><h3>Nada para comparar ainda</h3><p>No catálogo, toque no ícone ${icon('columns')} dos imóveis que quer comparar.</p><a class="btn" href="./index.html#catalogo" style="margin-top:1rem">Ir ao catálogo</a></div>`;
    return;
  }
  let all;
  try { all = await api.listImoveis(); } catch (e) { box.innerHTML = dbErrorHTML(e); return; }
  const list = ids.map((id) => all.find((i) => i.id === id)).filter((i) => i && isPublicado(i));
  if (list.length !== ids.length) ids.filter((id) => !list.some((i) => i.id === id)).forEach((id) => toggleCompare(id));

  const best = (fn, dir) => {
    const vals = list.map(fn).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (list.length < 2 || !vals.length) return () => false;
    const target = dir === 'min' ? Math.min(...vals) : Math.max(...vals);
    return (im) => fn(im) === target;
  };
  const mixed = new Set(list.map((i) => i.finalidade)).size > 1;
  const rows = [
    ['Preço', (im) => priceLabel(im), mixed ? null : best((im) => Number(im.preco), 'min')],
    ['Preço por m²', (im) => (m2(im) ? money(m2(im)) + (im.finalidade === 'aluguel' ? '/mês' : '') : '—'), mixed ? null : best(m2, 'min')],
    ['Custo mensal estimado', (im) => money(mensal(im)), mixed ? null : best(mensal, 'min')],
    ['Condomínio', (im) => (im.condominio ? money(im.condominio) : '—')],
    ['IPTU', (im) => (im.iptu ? money(im.iptu) + (im.finalidade === 'aluguel' ? '/mês' : '/ano') : '—')],
    ['Finalidade', (im) => FINALIDADES[im.finalidade]],
    ['Tipo', (im) => TIPOS[im.tipo]],
    ['Situação', (im) => STATUS[im.status] || 'Disponível'],
    ['Área', (im) => (im.area_m2 ? `${num(im.area_m2)} m²` : '—'), best((im) => Number(im.area_m2) || null, 'max')],
    ['Quartos', (im) => im.quartos || 0, best((im) => im.quartos || 0, 'max')],
    ['Suítes', (im) => im.suites || 0, best((im) => im.suites || 0, 'max')],
    ['Banheiros', (im) => im.banheiros || 0, best((im) => im.banheiros || 0, 'max')],
    ['Vagas', (im) => im.vagas || 0, best((im) => im.vagas || 0, 'max')],
    ['Localização', (im) => loc(im)],
    ['Responsável', (im) => esc(im.responsavel?.nome || '—')],
  ];
  const coms = [...new Set(list.flatMap((i) => i.comodidades || []))].sort((a, b) => a.localeCompare(b));

  box.innerHTML = `
    ${mixed ? `<div class="notice" style="margin-bottom:1rem">Você está comparando imóveis de venda e de aluguel — os preços não são comparáveis entre si.</div>` : ''}
    <div class="table-wrap reveal"><table class="cmp-table">
      <thead><tr><th></th>${list.map((im) => `<td class="cmp-head"><a href="./imovel.html?id=${encodeURIComponent(im.id)}"><img src="${esc(cover(im))}" alt="" data-fb></a><a class="t" href="./imovel.html?id=${encodeURIComponent(im.id)}">${esc(im.titulo)}</a><button class="btn btn-ghost btn-sm rm" data-rm="${esc(im.id)}">${icon('x')} Remover</button></td>`).join('')}${list.length < 3 ? `<td class="cmp-head"><a class="empty" href="./index.html#catalogo" style="display:grid;place-items:center;aspect-ratio:4/3;padding:1rem">${icon('plus')}<span style="font-size:.85rem">Adicionar imóvel</span></a></td>` : ''}</tr></thead>
      <tbody>
        ${rows.map(([label, fn, isBest]) => `<tr><th>${label}</th>${list.map((im) => `<td class="${isBest && isBest(im) ? 'best' : ''}">${fn(im)}</td>`).join('')}${list.length < 3 ? '<td></td>' : ''}</tr>`).join('')}
        ${coms.length ? `<tr><th colspan="${list.length + 1 + (list.length < 3 ? 1 : 0)}" style="background:var(--bg-2)">Comodidades</th></tr>` : ''}
        ${coms.map((c) => `<tr><th>${esc(c)}</th>${list.map((im) => `<td>${(im.comodidades || []).includes(c) ? `<span class="yes">${icon('check')}</span>` : '<span class="no">—</span>'}</td>`).join('')}${list.length < 3 ? '<td></td>' : ''}</tr>`).join('')}
      </tbody>
    </table></div>
    <div style="display:flex;justify-content:flex-end;margin-top:1rem"><button class="btn btn-ghost btn-sm" id="clear">${icon('trash')} Limpar comparação</button></div>`;
  imgFallback(box); observeReveal(box);
  $$('[data-rm]').forEach((b) => b.onclick = () => { toggleCompare(b.dataset.rm); draw(); });
  $('#clear').onclick = () => { clearCompare(); draw(); };
}

initAuth().then(async () => { await draw(); finishLoading(); });
