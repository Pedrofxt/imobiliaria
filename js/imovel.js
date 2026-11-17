import { $, $$, esc, api, auth, chat, visitas, isPublicado, SITUACOES, getCompare, toggleCompare, loadLeaflet, tileLayer, askLogin, priceShort, initAuth, onAuth, renderChrome, observeReveal, cardGlow, cardHTML, bindFavs, favs, finishLoading, icon, money, num, priceLabel, imgFallback, qs, onlyDigits, avatarHTML, toast, TIPOS, FINALIDADES, STATUS, PLACEHOLDER, SITE, isAdmin, dbErrorHTML, bindLoginButtons } from './core.js';

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
  if (isPublicado(im)) api.registerView(im.id).catch(() => {});
  render(im);
  finishLoading();
  try {
    const all = await api.listImoveis();
    const sim = all.filter((x) => isPublicado(x) && x.id !== im.id && (x.tipo === im.tipo || x.cidade === im.cidade)).slice(0, 3);
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
    ${!isPublicado(im) ? `<div class="draft-banner">${icon('eye')}<span>Este anúncio está como <b>${SITUACOES[im.situacao]}</b>${im.motivo_rejeicao ? ` — motivo: ${esc(im.motivo_rejeicao)}` : ''}. Só a equipe consegue vê-lo.</span></div>` : ''}
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
        <button class="btn-icon ${getCompare().includes(im.id) ? 'on-cmp' : ''}" id="cmp" aria-label="Comparar" title="Comparar">${icon('columns')}</button>
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
        <div class="block reveal" id="agendar"><h2>Agendar visita</h2>
          <p class="muted" style="margin-top:-.6rem">Escolha o dia e o horário. ${r ? esc(r.nome.split(' ')[0]) : 'O corretor'} confirma por aqui e pelo chat.</p>
          <div class="days" id="days"></div>
          <div class="slots" id="slots" style="margin-top:.8rem"></div>
          <div class="field" style="margin-top:1rem"><label for="v-obs">Observação (opcional)</label><input id="v-obs" maxlength="500" placeholder="Ex.: vou com minha família, prefiro entrar pela garagem…"></div>
          <button class="btn btn-accent" id="v-go" style="margin-top:1rem" disabled>${icon('calendar')} Escolha um horário</button>
        </div>
        ${im.finalidade === 'venda' && Number(im.preco) > 0 ? `<div class="block reveal" id="simulador"><h2>Simule o financiamento</h2>
          <div class="sim-grid">
            <div class="form">
              <div class="field"><div class="range-row"><label>Entrada</label><b id="s-ent-l"></b></div><input type="range" class="range" id="s-ent" min="10" max="90" step="5" value="20"></div>
              <div class="field"><div class="range-row"><label>Prazo</label><b id="s-prazo-l"></b></div><input type="range" class="range" id="s-prazo" min="5" max="35" step="1" value="30"></div>
              <div class="field"><label>Juros ao ano (%)</label><input type="number" id="s-taxa" min="1" max="30" step="0.1" value="11.5"></div>
              <div class="field"><label>Sistema de amortização</label><div class="seg-sm" id="s-sis"><button type="button" class="on" data-v="sac">SAC</button><button type="button" data-v="price">Price</button></div></div>
            </div>
            <div class="sim-out" id="s-out"></div>
          </div>
          <p class="muted" style="font-size:.78rem;margin-top:1rem">Simulação aproximada, sem seguros (MIP/DFI), taxas administrativas e ITBI. Condições reais dependem do banco e da análise de crédito.</p>
        </div>` : ''}
        <div class="block reveal" style="border:0"><h2>Localização</h2>
          ${im.latitude && im.longitude ? `<div class="map" id="prop-map"></div>` : `<iframe class="map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa" src="https://maps.google.com/maps?q=${encodeURIComponent(endereco)}&z=15&output=embed"></iframe>`}
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
            <input class="hp" id="l-site" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <div class="field"><label for="l-msg">Mensagem</label><textarea id="l-msg" style="min-height:90px">Olá! Gostaria de mais informações e de agendar uma visita.</textarea></div>
            <button class="btn btn-accent" type="submit">Tenho interesse</button>
            <a class="btn btn-ghost btn-sm" href="#agendar">${icon('calendar')} Agendar visita</a>
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
    try { if (navigator.share) await navigator.share({ title: im.titulo, text: `${im.titulo} — ${priceShort(im)} · Alvar Imóveis`, url: location.href }); else { await navigator.clipboard.writeText(location.href); toast('Link copiado!'); } } catch {}
  };

  const formStart = Date.now();
  $('#lead').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type=submit]');
    // anti-robô: campo escondido preenchido ou envio rápido demais
    if ($('#l-site').value || Date.now() - formStart < 2500) { btn.innerHTML = `${icon('check')} Interesse enviado`; btn.disabled = true; return; }
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enviando…';
    const nome = $('#l-nome').value.trim(), email = $('#l-email').value.trim(), telefone = $('#l-tel').value.trim(), mensagem = $('#l-msg').value.trim();
    try {
      await api.createLead({ imovel_id: im.id, nome, email, telefone, mensagem });
      let convId = null;
      if (auth.user && r && auth.user.id !== r.id) {
        try { convId = await chat.open(im.id); await chat.send(convId, `📩 ${mensagem || 'Tenho interesse neste imóvel.'}${telefone ? `\nTelefone: ${telefone}` : ''}`); } catch {}
      }
      btn.innerHTML = `${icon('check')} Interesse enviado`;
      const after = document.createElement('div');
      after.className = 'notice';
      after.style.marginTop = '.4rem';
      after.innerHTML = convId
        ? `Mensagem enviada também pelo chat. <a href="./conta.html?c=${encodeURIComponent(convId)}#chat" style="text-decoration:underline;font-weight:600">Continuar a conversa →</a>`
        : `Recebemos seu contato! ${auth.user ? '' : `<button type="button" data-login style="text-decoration:underline;font-weight:600">Entre com Google</button> para acompanhar a resposta pelo chat.`}`;
      form.append(after);
      bindLoginButtons(after);
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

  const cb = $('#cmp');
  cb.onclick = () => { const on = toggleCompare(im.id); cb.classList.toggle('on-cmp', on); toast(on ? 'Adicionado à comparação' : 'Removido da comparação'); };

  agenda(im, r);
  simulador(im);
  if (im.latitude && im.longitude) propMap(im);

  lightbox(fotos);
}


// ---------- Agendar visita ----------
async function agenda(im, r) {
  const daysBox = $('#days'), slotsBox = $('#slots'), go = $('#v-go');
  if (!daysBox) return;
  if (auth.user && r && auth.user.id === r.id) { $('#agendar').innerHTML = `<h2>Agendar visita</h2><p class="muted">Você é o responsável por este imóvel. As visitas pedidas aparecem em <a class="inline" href="./conta.html#visitas" style="color:var(--accent);text-decoration:underline">Minha conta → Visitas</a>.</p>`; return; }
  let ocupados = new Set();
  try { (await visitas.ocupados(im.id)).forEach((d) => ocupados.add(new Date(d).getTime())); } catch {}
  const dias = [];
  for (let k = 1; dias.length < 12 && k < 30; k++) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + k); if (d.getDay() !== 0) dias.push(d); }
  let dia = null, hora = null;
  const horas = (d) => (d.getDay() === 6 ? [9, 10, 11, 12] : [9, 10, 11, 13, 14, 15, 16, 17]);
  daysBox.innerHTML = dias.map((d, i) => `<button type="button" class="day" data-i="${i}">${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}<b>${d.getDate()}</b>${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</button>`).join('');
  const drawSlots = () => {
    if (!dia) { slotsBox.innerHTML = '<p class="muted" style="font-size:.88rem;margin:0;grid-column:1/-1">Escolha um dia acima.</p>'; return; }
    slotsBox.innerHTML = horas(dia).map((h) => {
      const t = new Date(dia); t.setHours(h, 0, 0, 0);
      return `<button type="button" class="slot ${hora && hora.getTime() === t.getTime() ? 'on' : ''}" data-t="${t.getTime()}" ${ocupados.has(t.getTime()) ? 'disabled title="Horário ocupado"' : ''}>${String(h).padStart(2, '0')}:00</button>`;
    }).join('');
    $$('.slot', slotsBox).forEach((b) => b.onclick = () => { hora = new Date(+b.dataset.t); drawSlots(); upd(); });
  };
  const upd = () => {
    go.disabled = !hora;
    go.innerHTML = hora ? `${icon('calendar')} Pedir visita · ${hora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : `${icon('calendar')} Escolha um horário`;
  };
  $$('.day', daysBox).forEach((b) => b.onclick = () => { $$('.day', daysBox).forEach((x) => x.classList.remove('on')); b.classList.add('on'); dia = dias[+b.dataset.i]; hora = null; drawSlots(); upd(); });
  drawSlots();
  go.onclick = async () => {
    if (!auth.user) { askLogin('Entre para agendar sua visita'); return; }
    go.disabled = true; go.innerHTML = '<span class="spinner"></span> Enviando…';
    try {
      const obs = $('#v-obs').value.trim();
      const v = await visitas.create({ imovel_id: im.id, data_hora: hora.toISOString(), observacao: obs || null });
      if (!v) { upd(); return; }
      ocupados.add(hora.getTime());
      const quando = `${hora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às ${hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      try { const c = await chat.open(im.id); await chat.send(c, `📅 Pedi uma visita para ${quando}.${obs ? `\nObs.: ${obs}` : ''}`); } catch {}
      $('#agendar').querySelector('.notice')?.remove();
      const n = document.createElement('div'); n.className = 'notice'; n.style.marginTop = '1rem';
      n.innerHTML = `Pedido enviado para <b>${quando}</b>. Você recebe a confirmação em <a href="./conta.html#visitas" style="text-decoration:underline;font-weight:600">Minha conta → Visitas</a> e pelo chat.`;
      $('#agendar').append(n);
      toast('Visita solicitada!');
      hora = null; drawSlots(); upd();
    } catch (err) { toast(err.message, 'err'); upd(); }
  };
}

// ---------- Simulador de financiamento ----------
function simulador(im) {
  const out = $('#s-out'); if (!out) return;
  let sis = 'sac';
  const calc = () => {
    const preco = Number(im.preco), entPct = +$('#s-ent').value, anos = +$('#s-prazo').value, taxaAno = Math.max(0, +$('#s-taxa').value || 0) / 100;
    const entrada = preco * entPct / 100, fin = preco - entrada, n = anos * 12, i = Math.pow(1 + taxaAno, 1 / 12) - 1;
    $('#s-ent-l').textContent = `${entPct}% · ${money(entrada)}`; $('#s-prazo-l').textContent = `${anos} anos · ${n} parcelas`;
    let primeira, ultima, total;
    if (sis === 'price') {
      const pmt = i ? fin * i / (1 - Math.pow(1 + i, -n)) : fin / n;
      primeira = ultima = pmt; total = pmt * n;
    } else {
      const amort = fin / n;
      primeira = amort + fin * i; ultima = amort + amort * i;
      total = fin + i * amort * n * (n + 1) / 2;
    }
    out.innerHTML = `<span class="muted" style="font-size:.85rem">${sis === 'sac' ? 'Primeira parcela' : 'Parcela fixa'}</span>
      <div class="big">${money(primeira)}</div>
      <ul class="cost-list">
        ${sis === 'sac' ? `<li>Última parcela <b>${money(ultima)}</b></li>` : ''}
        <li>Valor financiado <b>${money(fin)}</b></li>
        <li>Total de juros <b>${money(total - fin)}</b></li>
        <li>Total pago (com entrada) <b>${money(total + entrada)}</b></li>
        <li>Renda familiar sugerida <b>${money(primeira / 0.3)}</b></li>
      </ul>`;
  };
  ['s-ent', 's-prazo', 's-taxa'].forEach((id) => $('#' + id).addEventListener('input', calc));
  $$('#s-sis button').forEach((b) => b.onclick = () => { $$('#s-sis button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); sis = b.dataset.v; calc(); });
  calc();
}

// ---------- Mapa do imóvel ----------
async function propMap(im) {
  const el = $('#prop-map');
  try {
    const L = await loadLeaflet();
    const m = L.map(el, { scrollWheelZoom: false }).setView([im.latitude, im.longitude], 15);
    tileLayer(L).addTo(m);
    L.marker([im.latitude, im.longitude], { icon: L.divIcon({ className: '', html: `<span class="price-pin ${im.finalidade}">${esc(priceShort(im))}</span>`, iconSize: [0, 0] }) }).addTo(m);
  } catch { el.outerHTML = `<iframe class="map" loading="lazy" title="Mapa" src="https://maps.google.com/maps?q=${im.latitude},${im.longitude}&z=15&output=embed"></iframe>`; }
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
