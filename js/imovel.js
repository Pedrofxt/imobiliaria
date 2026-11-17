import { $, $$, esc, api, auth, chat, initAuth, onAuth, renderChrome, observeReveal, cardGlow, cardHTML, bindFavs, favs, finishLoading, icon, money, num, priceLabel, imgFallback, qs, onlyDigits, avatarHTML, toast, TIPOS, FINALIDADES, STATUS, PLACEHOLDER, SITE, isAdmin, dbErrorHTML } from './core.js';

renderChrome('imoveis');
const root = $('#prop');

async function boot() {
  await initAuth();
  const id = qs('id');
  let im = null;
  try { im = id ? await api.getImovel(id) : null; }
  catch (e) { root.innerHTML = dbErrorHTML(e); finishLoading(); return; }
  if (!im) {
    root.innerHTML = `<div class="empty" style="margin:4rem 0"><h3>Imóvel não encontrado</h3><p>Ele pode ter sido removido.</p><a class="btn" href="./index.html#catalogo" style="margin-top:1rem">Ver catálogo</a></div>`;
    finishLoading(); return;
  }
  document.title = `${im.titulo} — Alvar Imóveis`;
  render(im);
  finishLoading();
  try {
    const all = await api.listImoveis();
    const sim = all.filter((x) => x.id !== im.id && (x.tipo === im.tipo || x.cidade === im.cidade)).slice(0, 3);
    if (sim.length) {
      const sec = document.createElement('section');
      sec.className = 'section';
      sec.innerHTML = `<div class="section-head reveal"><div><span class="eyebrow">Você também pode gostar</span><h2>Imóveis parecidos</h2></div></div><div class="grid">${sim.map(cardHTML).join('')}</div>`;
      root.append(sec);
      imgFallback(sec); bindFavs(sec); cardGlow(sec); observeReveal(sec);
    }
  } catch {}
}

function render(im) {
  const fotos = im.imovel_fotos?.length ? im.imovel_fotos : [{ url: PLACEHOLDER }];
  const shown = fotos.slice(0, 5);
  const r = im.responsavel;
  const tel = onlyDigits(r?.telefone || SITE.whatsapp);
  const wa = `https://wa.me/${tel.startsWith('55') ? tel : '55' + tel}?text=${encodeURIComponent(`Olá! Tenho interesse no imóvel "${im.titulo}" (${location.href})`)}`;
  const endereco = [im.endereco, im.bairro, im.cidade, im.estado].filter(Boolean).join(', ');
  const canEdit = auth.user && (isAdmin() || im.responsavel_id === auth.user.id || im.criado_por === auth.user.id);

  const specs = [
    ['area', im.area_m2 ? `${num(im.area_m2)} m²` : null, 'Área'],
    ['bed', im.quartos, 'Quartos'],
    ['star', im.suites, 'Suítes'],
    ['bath', im.banheiros, 'Banheiros'],
    ['car', im.vagas, 'Vagas'],
    ['home', TIPOS[im.tipo], 'Tipo'],
  ].filter(([, v]) => v);

  root.innerHTML = `
    <nav class="crumbs reveal"><a href="./index.html">Início</a>${icon('right')}<a href="./index.html?f=${im.finalidade}#catalogo">${FINALIDADES[im.finalidade]}</a>${icon('right')}<span>${esc(im.cidade)}</span></nav>
    <div class="prop-head reveal">
      <div>
        <div style="display:flex;gap:.4rem;margin-bottom:.8rem">
          <span class="tag ${im.finalidade === 'venda' ? 'accent' : ''}">${FINALIDADES[im.finalidade]}</span>
          <span class="tag" style="background:var(--pine-soft);color:var(--pine)">${STATUS[im.status] || 'Disponível'}</span>
        </div>
        <h1>${esc(im.titulo)}</h1>
        <p class="card-loc" style="margin-top:.7rem">${icon('pin')} ${esc(endereco)}</p>
      </div>
      <div class="actions">
        ${canEdit ? `<a class="btn btn-ghost btn-sm" href="./conta.html?editar=${encodeURIComponent(im.id)}#novo">${icon('edit')} Editar</a>` : ''}
        <button class="btn-icon" id="share" aria-label="Compartilhar">${icon('share')}</button>
        <button class="btn-icon heart-lg ${favs.has(im.id) ? 'on' : ''}" data-fav="${esc(im.id)}" aria-label="Favoritar" style="${favs.has(im.id) ? 'color:#E04F4F' : ''}">${icon('heart')}</button>
      </div>
    </div>

    <div class="gallery n${shown.length} reveal">
      ${shown.map((f, i) => `<button data-lb="${i}" aria-label="Ver foto ${i + 1}"><img src="${esc(f.url)}" alt="Foto ${i + 1}" ${i ? 'loading="lazy"' : ''} data-fb>${i === shown.length - 1 && fotos.length > 1 ? `<span class="more">${icon('image')} ${fotos.length} fotos</span>` : ''}</button>`).join('')}
    </div>

    <div class="prop-layout">
      <div>
        <div class="block reveal" style="padding-top:0"><div class="spec-grid">
          ${specs.map(([ic, v, l]) => `<div class="spec-item">${icon(ic)}<b>${esc(v)}</b><span>${l}</span></div>`).join('')}
        </div></div>
        <div class="block reveal"><h2>Sobre o imóvel</h2><div class="prose">${esc(im.descricao || 'Sem descrição.')}</div></div>
        ${im.comodidades?.length ? `<div class="block reveal"><h2>Comodidades</h2><div class="amenities">${im.comodidades.map((c) => `<span>${icon('check')} ${esc(c)}</span>`).join('')}</div></div>` : ''}
        <div class="block reveal" style="border:0"><h2>Localização</h2>
          <iframe class="map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa" src="https://maps.google.com/maps?q=${encodeURIComponent(endereco)}&z=15&output=embed"></iframe>
        </div>
      </div>

      <aside class="sidebar">
        <div class="panel reveal">
          <span class="muted" style="font-size:.85rem">${im.finalidade === 'aluguel' ? 'Aluguel' : 'Valor de venda'}</span>
          <div class="big-price">${priceLabel(im)}</div>
          <ul class="cost-list">
            ${im.condominio ? `<li>Condomínio <b>${money(im.condominio)}</b></li>` : ''}
            ${im.iptu ? `<li>IPTU ${im.finalidade === 'aluguel' ? '(mês)' : '(ano)'} <b>${money(im.iptu)}</b></li>` : ''}
            ${im.finalidade === 'aluguel' ? `<li>Total estimado <b>${money(Number(im.preco) + Number(im.condominio || 0) + Number(im.iptu || 0))}</b></li>` : ''}
          </ul>
          <form class="form" id="lead">
            <div class="field"><label for="l-nome">Nome</label><input id="l-nome" required value="${esc(auth.profile?.nome || '')}"></div>
            <div class="form-row"><div class="field"><label for="l-email">E-mail</label><input id="l-email" type="email" required value="${esc(auth.profile?.email || auth.user?.email || '')}"></div>
            <div class="field"><label for="l-tel">Telefone</label><input id="l-tel" type="tel" value="${esc(auth.profile?.telefone || '')}"></div></div>
            <div class="field"><label for="l-msg">Mensagem</label><textarea id="l-msg" style="min-height:90px">Olá! Gostaria de mais informações e de agendar uma visita.</textarea></div>
            <button class="btn btn-accent" type="submit">Tenho interesse</button>
          </form>
        </div>
        ${r ? `<div class="panel reveal" style="--d:.1s">
          <span class="eyebrow">Responsável pelo imóvel</span>
          <div class="agent" style="margin-top:1rem">${avatarHTML(r, 'lg')}<div><strong>${esc(r.nome)}</strong><span>${esc(r.cargo || 'Corretor')}</span><br><span>${esc(r.creci || '')}</span></div></div>
          ${auth.user?.id !== r.id ? `<button class="btn btn-accent" id="open-chat" style="width:100%;margin-top:1.1rem">${icon('chat')} Conversar com ${esc(r.nome.split(' ')[0])}</button>` : ''}
          <div class="agent-links">
            <a class="btn btn-sm" href="${wa}" target="_blank" rel="noopener">${icon('phone')} WhatsApp</a>
            ${r.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(r.email)}">${icon('mail')} E-mail</a>` : ''}
          </div>
        </div>` : ''}
      </aside>
    </div>`;

  imgFallback(root); observeReveal(root);

  // favoritar (versão grande)
  const hb = $('.heart-lg');
  hb.onclick = async () => {
    const { toggleFav } = await import('./core.js');
    const on = await toggleFav(im.id);
    if (on !== null) { hb.classList.toggle('on', on); hb.style.color = on ? '#E04F4F' : ''; hb.querySelector('svg').style.fill = on ? 'currentColor' : 'none'; }
  };
  if (favs.has(im.id)) hb.querySelector('svg').style.fill = 'currentColor';

  $('#share').onclick = async () => {
    try { if (navigator.share) await navigator.share({ title: im.titulo, url: location.href }); else { await navigator.clipboard.writeText(location.href); toast('Link copiado!'); } } catch {}
  };

  $('#lead').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enviando…';
    try {
      await api.createLead({ imovel_id: im.id, nome: $('#l-nome').value.trim(), email: $('#l-email').value.trim(), telefone: $('#l-tel').value.trim(), mensagem: $('#l-msg').value.trim() });
      btn.innerHTML = `${icon('check')} Interesse enviado`;
      toast(`Recebemos seu contato! ${r ? r.nome.split(' ')[0] + ' vai falar com você.' : ''}`);
    } catch (err) { toast(err.message || 'Erro ao enviar', 'err'); btn.disabled = false; btn.textContent = 'Tenho interesse'; }
  };

  const oc = $('#open-chat');
  if (oc) oc.onclick = async () => {
    oc.disabled = true;
    try { const id = await chat.open(im.id); if (id) location.href = `./conta.html?c=${encodeURIComponent(id)}#chat`; }
    catch (err) { toast(err.message, 'err'); }
    oc.disabled = false;
  };

  lightbox(fotos);
}

function lightbox(fotos) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<button class="lb-btn" data-p aria-label="Anterior">${icon('left')}</button><div id="lb-img" style="display:grid;place-items:center;min-width:0;padding:1rem"></div><button class="lb-btn" data-n aria-label="Próxima">${icon('right')}</button><button class="lb-btn lb-close" aria-label="Fechar">${icon('x')}</button><div class="lb-count"></div>`;
  document.body.append(lb);
  let i = 0;
  const show = () => { $('#lb-img').innerHTML = `<img src="${esc(fotos[i].url)}" alt="">`; lb.querySelector('.lb-count').textContent = `${i + 1} / ${fotos.length}`; };
  const open = (n) => { i = n; show(); lb.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
  const go = (d) => { i = (i + d + fotos.length) % fotos.length; show(); };
  $$('[data-lb]').forEach((b) => b.onclick = () => open(+b.dataset.lb));
  lb.querySelector('[data-p]').onclick = () => go(-1);
  lb.querySelector('[data-n]').onclick = () => go(1);
  lb.querySelector('.lb-close').onclick = close;
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.id === 'lb-img') close(); });
  addEventListener('keydown', (e) => { if (!lb.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
  let sx = 0;
  lb.addEventListener('touchstart', (e) => sx = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
}

onAuth(() => {});
boot();
