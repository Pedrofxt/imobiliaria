import { $, $$, esc, api, auth, signInWithPassword, providers, initAuth, onAuth, renderChrome, observeReveal, cardGlow, cardHTML, bindFavs, favs, finishLoading, icon, money, priceLabel, imgFallback, qs, onlyDigits, avatarHTML, toast, confirmBox, modal, googleBtn, bindLoginButtons, LOGO, cover, loc, fmtDate, isStaff, isAdmin, TIPOS, FINALIDADES, STATUS, PAPEIS, COMODIDADES, DEMO, dbErrorHTML } from './core.js';

renderChrome('anunciar');
const root = $('#conta');
let IMOVEIS = null;
const loadImoveis = async (force = false) => { if (!IMOVEIS || force) IMOVEIS = await api.listImoveis(); return IMOVEIS; };

// ---------------------------------------------------------
function renderLogin() {
  root.innerHTML = `
    <div class="panel login-card reveal">
      ${LOGO}
      <h1>Sua conta Alvar</h1>
      <p class="muted">Entre para salvar favoritos, acompanhar seus interesses e — se você for da equipe — cadastrar imóveis.</p>
      ${googleBtn('Entrar com Google')}
      <details style="margin-top:1.2rem;text-align:left">
        <summary class="muted" style="cursor:pointer;font-size:.88rem;text-align:center">Já criei uma senha — entrar com e-mail</summary>
        <form class="form" id="pw-login" style="margin-top:1rem">
          <div class="field"><label>E-mail</label><input type="email" name="email" required autocomplete="email"></div>
          <div class="field"><label>Senha</label><input type="password" name="senha" required autocomplete="current-password"></div>
          <button class="btn" type="submit" style="margin-top:.2rem">Entrar</button>
        </form>
      </details>
      <p class="muted" style="font-size:.78rem;margin-top:1.2rem">${DEMO ? 'Modo demonstração: você entra como administrador fictício.' : 'Usamos apenas seu nome, e-mail e foto do Google.'}</p>
      <p class="muted" style="font-size:.75rem;margin-top:.4rem">Ao entrar, você concorda com os <a href="./termos.html" style="text-decoration:underline">Termos de Serviço</a> e a <a href="./privacidade.html" style="text-decoration:underline">Política de Privacidade</a>.</p>
    </div>`;
  bindLoginButtons(root); observeReveal(root);
  $('#pw-login').onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector('button'); b.disabled = true;
    try { await signInWithPassword(e.target.email.value.trim(), e.target.senha.value); }
    catch (err) { toast(err.message, 'err'); b.disabled = false; }
  };
}

const TABS = [
  { id: 'perfil', label: 'Perfil', ic: 'user' },
  { id: 'favoritos', label: 'Favoritos', ic: 'heart', count: () => favs.size },
  { id: 'imoveis', label: 'Meus imóveis', ic: 'grid', staff: true },
  { id: 'novo', label: 'Cadastrar imóvel', ic: 'plus', staff: true },
  { id: 'leads', label: 'Interessados', ic: 'inbox', staff: true },
  { id: 'equipe', label: 'Equipe', ic: 'users', admin: true },
  { id: 'seguranca', label: 'Segurança', ic: 'shield' },
];

function renderShell() {
  const p = auth.profile || { nome: auth.user.email, email: auth.user.email, papel: 'cliente' };
  const tabs = TABS.filter((t) => (!t.staff || isStaff()) && (!t.admin || isAdmin()));
  root.innerHTML = `
    <div class="panel profile-card reveal">
      ${avatarHTML(p, 'lg')}
      <div style="flex:1;min-width:0"><span class="eyebrow">Minha conta</span><h1 style="font-size:clamp(1.6rem,3vw,2.3rem)">Olá, ${esc((p.nome || '').split(' ')[0] || 'bem-vindo')}</h1><span class="muted" style="font-size:.88rem">${esc(p.email || '')}</span> <span class="role-pill">${esc(PAPEIS[p.papel] || 'Cliente')}</span></div>
      ${isStaff() ? `<a class="btn btn-accent" href="#novo">${icon('plus')} Novo imóvel</a>` : ''}
    </div>
    <div class="account">
      <nav class="side-nav">${tabs.map((t) => `<button data-tab="${t.id}">${icon(t.ic)} ${t.label}${t.count ? `<span class="count" data-count-for="${t.id}">${t.count()}</span>` : ''}</button>`).join('')}</nav>
      <div>${tabs.map((t) => `<section class="tab" id="tab-${t.id}"></section>`).join('')}
        ${!isStaff() ? `<section class="tab" id="tab-restrito"></section>` : ''}
      </div>
    </div>`;
  $$('.side-nav button').forEach((b) => b.onclick = () => { history.replaceState(null, '', (b.dataset.tab === 'novo' ? location.pathname : location.pathname + location.search) + '#' + b.dataset.tab); route(); });
  observeReveal(root);
}

function route() {
  let id = location.hash.slice(1) || 'perfil';
  const staffOnly = ['imoveis', 'novo', 'leads'];
  if ((staffOnly.includes(id) && !isStaff()) || (id === 'equipe' && !isAdmin())) id = 'restrito';
  if (!$('#tab-' + id)) id = 'perfil';
  $$('.side-nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
  $$('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + id));
  ({ perfil: tabPerfil, favoritos: tabFavoritos, imoveis: tabImoveis, novo: tabNovo, leads: tabLeads, equipe: tabEquipe, restrito: tabRestrito, seguranca: tabSeguranca })[id]?.();
}

// ---------------------------------------------------------
function tabRestrito() {
  $('#tab-restrito').innerHTML = `<div class="panel" style="text-align:center;padding:3rem 2rem"><div style="font-size:2.6rem;color:var(--accent);display:grid;place-items:center">${icon('shield')}</div><h2 style="font-size:1.8rem;margin:.8rem 0 .4rem">Área da equipe</h2><p class="muted" style="max-width:44ch;margin:0 auto">Cadastrar e gerenciar imóveis é exclusivo para corretores. Peça a um administrador da Alvar para liberar seu acesso — ele faz isso em <b>Conta → Equipe</b>.</p></div>`;
}

function tabPerfil() {
  const p = auth.profile || {};
  const t = $('#tab-perfil');
  t.innerHTML = `
    <div class="tab-head"><div><span class="eyebrow">Dados pessoais</span><h2>Perfil</h2></div></div>
    <form class="panel form" id="f-perfil">
      <div style="display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap">
        <span id="av-prev">${avatarHTML(p, 'xl')}</span>
        <div><label class="btn btn-ghost btn-sm" style="cursor:pointer">${icon('upload')} Trocar foto<input type="file" accept="image/*" id="av-file" hidden></label><p class="muted" style="font-size:.8rem;margin:.5rem 0 0">JPG ou PNG. Redimensionamos automaticamente.</p></div>
      </div>
      <div class="form-row"><div class="field"><label>Nome completo</label><input name="nome" required value="${esc(p.nome || '')}"></div><div class="field"><label>Telefone / WhatsApp</label><input name="telefone" type="tel" placeholder="(41) 99999-0000" value="${esc(p.telefone || '')}"></div></div>
      ${isStaff() ? `<div class="form-row"><div class="field"><label>Cargo</label><input name="cargo" value="${esc(p.cargo || '')}" placeholder="Corretor · Locação"></div><div class="field"><label>CRECI</label><input name="creci" value="${esc(p.creci || '')}" placeholder="CRECI-PR 00.000"></div></div>
      <div class="field"><label>Bio (aparece na página da equipe)</label><textarea name="bio" style="min-height:100px">${esc(p.bio || '')}</textarea></div>` : ''}
      <div><button class="btn btn-accent" type="submit">${icon('check')} Salvar perfil</button></div>
    </form>`;
  let avatarUrl = null;
  $('#av-file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { toast('Enviando foto…'); avatarUrl = await api.uploadAvatar(f); $('#av-prev').innerHTML = avatarHTML({ avatar_url: avatarUrl }, 'xl'); }
    catch (err) { toast(err.message, 'err'); }
  };
  $('#f-perfil').onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    if (avatarUrl) fd.avatar_url = avatarUrl;
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
    try { await api.updateProfile(fd); toast('Perfil atualizado!'); renderShell(); history.replaceState(null, '', '#perfil'); route(); }
    catch (err) { toast(err.message, 'err'); btn.disabled = false; }
  };
}

async function tabFavoritos() {
  const t = $('#tab-favoritos');
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">Sua seleção</span><h2>Favoritos</h2></div></div><div class="grid" id="fav-grid"><div class="skeleton" style="height:380px"></div></div>`;
  try {
    const all = await loadImoveis();
    const list = all.filter((i) => favs.has(i.id));
    const g = $('#fav-grid');
    g.innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="empty" style="grid-column:1/-1"><h3>Nenhum favorito ainda</h3><p>Toque no coração dos imóveis que você curtir.</p><a class="btn" href="./index.html#catalogo" style="margin-top:1rem">Explorar imóveis</a></div>`;
    imgFallback(g); cardGlow(g); observeReveal(g);
    bindFavs(g);
    g.addEventListener('click', (e) => { if (e.target.closest('[data-fav]')) setTimeout(() => { const c = $('[data-count-for="favoritos"]'); if (c) c.textContent = favs.size; tabFavoritos(); }, 400); });
  } catch (e) { $('#fav-grid').innerHTML = dbErrorHTML(e); }
}

async function tabImoveis() {
  const t = $('#tab-imoveis');
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">${isAdmin() ? 'Todos os anúncios' : 'Sob sua responsabilidade'}</span><h2>Imóveis</h2></div><label class="field-inline" style="border:1px solid var(--line);min-width:240px">${icon('search')}<input id="mi-q" placeholder="Filtrar…"></label></div><div class="list" id="mi-list"><div class="skeleton" style="height:100px"></div></div>`;
  try {
    const all = await loadImoveis(true);
    const mine = isAdmin() ? all : all.filter((i) => i.responsavel_id === auth.user.id || i.criado_por === auth.user.id);
    const draw = (q = '') => {
      const l = mine.filter((i) => (i.titulo + i.bairro + i.cidade).toLowerCase().includes(q.toLowerCase()));
      $('#mi-list').innerHTML = l.length ? l.map((im) => `
        <div class="list-item">
          <img src="${esc(cover(im))}" alt="" data-fb loading="lazy">
          <div style="min-width:0">
            <h4>${esc(im.titulo)}</h4>
            <div class="meta"><span>${priceLabel(im)}</span><span>${TIPOS[im.tipo] || ''} · ${FINALIDADES[im.finalidade] || ''}</span><span class="status ${im.status}">${STATUS[im.status] || ''}</span>${im.destaque ? `<span style="color:var(--accent)">★ Destaque</span>` : ''}</div>
            <div class="meta"><span>${icon('pin')} ${loc(im)}</span><span>${icon('image')} ${im.imovel_fotos?.length || 0}</span><span>${icon('user')} ${esc(im.responsavel?.nome || '—')}</span></div>
          </div>
          <div class="row-actions">
            <a class="btn-icon" href="./imovel.html?id=${encodeURIComponent(im.id)}" aria-label="Ver">${icon('eye')}</a>
            <a class="btn-icon" href="?editar=${encodeURIComponent(im.id)}#novo" aria-label="Editar">${icon('edit')}</a>
            <button class="btn-icon" data-del="${esc(im.id)}" aria-label="Excluir">${icon('trash')}</button>
          </div>
        </div>`).join('') : `<div class="empty"><h3>Nenhum imóvel</h3><p>Cadastre o primeiro agora mesmo.</p><a class="btn btn-accent" href="#novo" style="margin-top:1rem">${icon('plus')} Cadastrar imóvel</a></div>`;
      imgFallback($('#mi-list'));
      $$('[data-del]').forEach((b) => b.onclick = async () => {
        const im = mine.find((x) => x.id === b.dataset.del);
        if (!(await confirmBox(`“${im.titulo}” e todas as fotos serão excluídos permanentemente.`, 'Excluir'))) return;
        try { await api.deleteImovel(im); toast('Imóvel excluído'); tabImoveis(); } catch (e) { toast(e.message, 'err'); }
      });
    };
    draw();
    $('#mi-q').oninput = (e) => draw(e.target.value);
  } catch (e) { $('#mi-list').innerHTML = dbErrorHTML(e); }
}

// ---------------------------------------------------------
//  Cadastro / edição de imóvel
// ---------------------------------------------------------
async function tabNovo() {
  const t = $('#tab-novo');
  const editId = qs('editar');
  t.innerHTML = `<div class="skeleton" style="height:60vh"></div>`;
  let im = null, equipe = [];
  try {
    [equipe, im] = await Promise.all([api.listEquipe(), editId ? api.getImovel(editId) : null]);
  } catch (e) { t.innerHTML = dbErrorHTML(e); return; }
  const v = im || { finalidade: 'venda', tipo: 'casa', status: 'disponivel', estado: 'PR', responsavel_id: auth.user.id, comodidades: [] };
  const extras = (v.comodidades || []).filter((c) => !COMODIDADES.includes(c));
  let fotos = (im?.imovel_fotos || []).map((f) => ({ ...f, preview: f.url }));
  const removidas = [];

  const opt = (obj, sel) => Object.entries(obj).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${l}</option>`).join('');
  const val = (k) => esc(v[k] ?? '');

  t.innerHTML = `
    <div class="tab-head"><div><span class="eyebrow">${im ? 'Editar anúncio' : 'Novo anúncio'}</span><h2>${im ? esc(im.titulo) : 'Cadastrar imóvel'}</h2></div>${im ? `<a class="btn btn-ghost btn-sm" href="${location.pathname}#novo" id="nv-new">${icon('plus')} Novo em branco</a>` : ''}</div>
    <form class="form" id="f-imovel" novalidate>
      <div class="panel form">
        <h3 style="font-size:1.3rem">Informações principais</h3>
        <div class="field"><label>Título do anúncio *</label><input name="titulo" required maxlength="120" value="${val('titulo')}" placeholder="Ex.: Casa com piscina e vista para a baía"></div>
        <div class="form-row" style="--cols:3">
          <div class="field"><label>Finalidade</label><select name="finalidade">${opt(FINALIDADES, v.finalidade)}</select></div>
          <div class="field"><label>Tipo</label><select name="tipo">${opt(TIPOS, v.tipo)}</select></div>
          <div class="field"><label>Status</label><select name="status">${opt(STATUS, v.status)}</select></div>
        </div>
        <div class="form-row" style="--cols:3">
          <div class="field"><label id="lbl-preco">${v.finalidade === 'aluguel' ? 'Aluguel mensal (R$) *' : 'Preço de venda (R$) *'}</label><input name="preco" type="number" min="0" step="1" required value="${val('preco')}"></div>
          <div class="field"><label>Condomínio (R$)</label><input name="condominio" type="number" min="0" value="${val('condominio')}"></div>
          <div class="field"><label>IPTU (R$)</label><input name="iptu" type="number" min="0" value="${val('iptu')}"></div>
        </div>
        <label class="switch"><input type="checkbox" name="destaque" ${v.destaque ? 'checked' : ''}> Exibir nos destaques da página inicial</label>
      </div>

      <div class="panel form">
        <h3 style="font-size:1.3rem">Dados do imóvel</h3>
        <div class="form-row" style="--cols:5">
          <div class="field"><label>Área (m²)</label><input name="area_m2" type="number" min="0" value="${val('area_m2')}"></div>
          <div class="field"><label>Quartos</label><input name="quartos" type="number" min="0" value="${val('quartos')}"></div>
          <div class="field"><label>Suítes</label><input name="suites" type="number" min="0" value="${val('suites')}"></div>
          <div class="field"><label>Banheiros</label><input name="banheiros" type="number" min="0" value="${val('banheiros')}"></div>
          <div class="field"><label>Vagas</label><input name="vagas" type="number" min="0" value="${val('vagas')}"></div>
        </div>
        <div class="field"><label>Descrição</label><textarea name="descricao" placeholder="Conte a história do imóvel: ambientes, acabamentos, vizinhança…">${val('descricao')}</textarea></div>
        <div class="field"><label>Comodidades</label>
          <div class="check-chips">${COMODIDADES.map((c) => `<label><input type="checkbox" name="com" value="${esc(c)}" ${(v.comodidades || []).includes(c) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div>
          <input name="com_extra" placeholder="Outras, separadas por vírgula" value="${esc(extras.join(', '))}" style="margin-top:.5rem">
        </div>
      </div>

      <div class="panel form">
        <h3 style="font-size:1.3rem">Endereço</h3>
        <div class="form-row" style="--cols:3">
          <div class="field"><label>CEP</label><input name="cep" id="cep" inputmode="numeric" placeholder="00000-000" value="${val('cep')}"></div>
          <div class="field" style="grid-column:span 2"><label>Endereço</label><input name="endereco" value="${val('endereco')}" placeholder="Rua, número"></div>
        </div>
        <div class="form-row" style="--cols:3">
          <div class="field"><label>Bairro</label><input name="bairro" value="${val('bairro')}"></div>
          <div class="field"><label>Cidade *</label><input name="cidade" required value="${val('cidade')}"></div>
          <div class="field"><label>UF</label><input name="estado" maxlength="2" value="${val('estado')}"></div>
        </div>
      </div>

      <div class="panel form">
        <h3 style="font-size:1.3rem">Fotos</h3>
        <label class="dropzone" id="drop">${icon('upload')}<strong>Arraste as fotos aqui</strong><br><span class="muted" style="font-size:.88rem">ou clique para escolher · a primeira é a capa · arraste para reordenar</span><input type="file" id="files" accept="image/*" multiple hidden></label>
        <div class="thumbs" id="thumbs"></div>
      </div>

      <div class="panel form">
        <h3 style="font-size:1.3rem">Responsável pelo imóvel</h3>
        <div class="field"><label>Corretor responsável</label><select name="responsavel_id">${equipe.map((p) => `<option value="${esc(p.id)}" ${p.id === v.responsavel_id ? 'selected' : ''}>${esc(p.nome || p.email)}${p.creci ? ' — ' + esc(p.creci) : ''}</option>`).join('')}</select></div>
        <p class="muted" style="font-size:.85rem;margin:0">Ele aparece na página do imóvel e recebe os interessados.</p>
      </div>

      <div style="display:flex;gap:.6rem;justify-content:flex-end;position:sticky;bottom:1rem;z-index:5">
        <a class="btn btn-ghost" href="#imoveis" style="background:var(--surface)">Cancelar</a>
        <button class="btn btn-accent" type="submit" id="save-btn">${icon('check')} ${im ? 'Salvar alterações' : 'Publicar imóvel'}</button>
      </div>
    </form>`;

  const form = $('#f-imovel');
  $('#nv-new')?.addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', location.pathname + '#novo'); tabNovo(); });
  form.finalidade.onchange = () => { $('#lbl-preco').textContent = form.finalidade.value === 'aluguel' ? 'Aluguel mensal (R$) *' : 'Preço de venda (R$) *'; };

  // ViaCEP
  $('#cep').addEventListener('blur', async (e) => {
    const c = onlyDigits(e.target.value); if (c.length !== 8) return;
    e.target.value = c.replace(/(\d{5})(\d{3})/, '$1-$2');
    try {
      const r = await (await fetch(`https://viacep.com.br/ws/${c}/json/`)).json();
      if (r.erro) return;
      if (!form.endereco.value) form.endereco.value = r.logradouro ? r.logradouro + ', ' : '';
      form.bairro.value = r.bairro || form.bairro.value; form.cidade.value = r.localidade || form.cidade.value; form.estado.value = r.uf || form.estado.value;
      toast('Endereço preenchido pelo CEP');
    } catch {}
  });

  // Fotos
  const thumbs = $('#thumbs');
  let dragFrom = null;
  const drawThumbs = () => {
    thumbs.innerHTML = fotos.map((f, i) => `
      <div class="thumb" draggable="true" data-i="${i}">
        <img src="${esc(f.preview)}" alt="">
        ${i === 0 ? '<span class="tag accent cover-tag">Capa</span>' : ''}
        <div class="tools">
          <button type="button" data-act="left" aria-label="Mover para a esquerda">${icon('left')}</button>
          ${i ? `<button type="button" data-act="cover" aria-label="Tornar capa">${icon('star')}</button>` : ''}
          <button type="button" data-act="right" aria-label="Mover para a direita">${icon('right')}</button>
          <button type="button" data-act="del" aria-label="Remover">${icon('trash')}</button>
        </div>
      </div>`).join('');
  };
  const move = (from, to) => { if (to < 0 || to >= fotos.length) return; const [x] = fotos.splice(from, 1); fotos.splice(to, 0, x); drawThumbs(); };
  thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const i = +b.closest('.thumb').dataset.i;
    if (b.dataset.act === 'left') move(i, i - 1);
    if (b.dataset.act === 'right') move(i, i + 1);
    if (b.dataset.act === 'cover') move(i, 0);
    if (b.dataset.act === 'del') { const [x] = fotos.splice(i, 1); if (x.id) removidas.push(x); else URL.revokeObjectURL(x.preview); drawThumbs(); }
  });
  thumbs.addEventListener('dragstart', (e) => { const th = e.target.closest('.thumb'); if (!th) return; dragFrom = +th.dataset.i; th.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  thumbs.addEventListener('dragend', () => { dragFrom = null; $$('.thumb', thumbs).forEach((t) => t.classList.remove('dragging')); });
  thumbs.addEventListener('dragover', (e) => { if (dragFrom !== null) e.preventDefault(); });
  thumbs.addEventListener('drop', (e) => { const th = e.target.closest('.thumb'); if (dragFrom === null || !th) return; e.preventDefault(); e.stopPropagation(); move(dragFrom, +th.dataset.i); });

  const addFiles = (list) => {
    const imgs = [...list].filter((f) => f.type.startsWith('image/'));
    if (fotos.length + imgs.length > 30) { toast('Máximo de 30 fotos por imóvel', 'err'); return; }
    imgs.forEach((file) => fotos.push({ file, preview: URL.createObjectURL(file) }));
    drawThumbs();
  };
  const drop = $('#drop');
  $('#files').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { if (dragFrom !== null) return; e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => { if (dragFrom !== null) return; e.preventDefault(); addFiles(e.dataTransfer.files); });
  drawThumbs();

  // Salvar
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const n = (k) => (fd.get(k) === '' || fd.get(k) === null ? null : Number(fd.get(k)));
    const titulo = String(fd.get('titulo') || '').trim();
    const cidade = String(fd.get('cidade') || '').trim();
    if (!titulo || !cidade || fd.get('preco') === '') { toast('Preencha título, preço e cidade.', 'err'); (!titulo ? form.titulo : !cidade ? form.cidade : form.preco).focus(); return; }
    const comodidades = [...fd.getAll('com'), ...String(fd.get('com_extra') || '').split(',').map((s) => s.trim()).filter(Boolean)];
    const payload = {
      titulo, finalidade: fd.get('finalidade'), tipo: fd.get('tipo'), status: fd.get('status'),
      preco: n('preco') || 0, condominio: n('condominio'), iptu: n('iptu'), destaque: form.destaque.checked,
      area_m2: n('area_m2'), quartos: n('quartos') || 0, suites: n('suites') || 0, banheiros: n('banheiros') || 0, vagas: n('vagas') || 0,
      descricao: String(fd.get('descricao') || '').trim(), comodidades,
      cep: String(fd.get('cep') || '').trim(), endereco: String(fd.get('endereco') || '').trim(), bairro: String(fd.get('bairro') || '').trim(), cidade, estado: String(fd.get('estado') || '').trim().toUpperCase(),
      responsavel_id: fd.get('responsavel_id') || auth.user.id,
    };
    const btn = $('#save-btn'); btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Salvando dados…';
    try {
      const id = await api.saveImovel(payload, im?.id || null);
      await api.saveFotos(id, fotos, removidas, (i, tot) => { btn.innerHTML = `<span class="spinner"></span> Enviando foto ${i}/${tot}…`; });
      toast(im ? 'Alterações salvas!' : 'Imóvel publicado!');
      setTimeout(() => location.href = `./imovel.html?id=${encodeURIComponent(id)}`, 700);
    } catch (err) {
      console.error(err);
      toast(err.message || 'Erro ao salvar', 'err');
      btn.disabled = false; btn.innerHTML = `${icon('check')} Tentar novamente`;
    }
  };
}

// ---------------------------------------------------------
async function tabLeads() {
  const t = $('#tab-leads');
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">Contatos recebidos</span><h2>Interessados</h2></div></div><div id="leads-box"><div class="skeleton" style="height:200px"></div></div>`;
  try {
    const leads = await api.listLeads();
    $('#leads-box').innerHTML = leads.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Pessoa</th><th>Imóvel</th><th>Mensagem</th><th></th></tr></thead>
      <tbody>${leads.map((l) => {
        const tel = onlyDigits(l.telefone);
        return `<tr>
          <td style="white-space:nowrap">${fmtDate(l.created_at)}</td>
          <td><strong>${esc(l.nome)}</strong><br><a class="muted" href="mailto:${esc(l.email)}">${esc(l.email)}</a>${tel ? `<br><a class="muted" href="https://wa.me/${tel.startsWith('55') ? tel : '55' + tel}" target="_blank" rel="noopener">${esc(l.telefone)}</a>` : ''}</td>
          <td>${l.imovel ? `<a href="./imovel.html?id=${encodeURIComponent(l.imovel.id)}" style="color:var(--accent)">${esc(l.imovel.titulo)}</a>` : '<span class="muted">removido</span>'}</td>
          <td style="max-width:320px">${esc(l.mensagem)}</td>
          <td><button class="btn-icon" data-dl="${esc(l.id)}" aria-label="Excluir">${icon('trash')}</button></td>
        </tr>`;
      }).join('')}</tbody></table></div>` : `<div class="empty"><h3>Nenhum interessado ainda</h3><p>Quando alguém clicar em “Tenho interesse” num imóvel seu, aparece aqui.</p></div>`;
    $$('[data-dl]').forEach((b) => b.onclick = async () => { if (!(await confirmBox('Remover este contato da lista?', 'Remover'))) return; try { await api.deleteLead(b.dataset.dl); tabLeads(); } catch (e) { toast(e.message, 'err'); } });
  } catch (e) { $('#leads-box').innerHTML = dbErrorHTML(e); }
}

async function tabEquipe() {
  const t = $('#tab-equipe');
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">Administração</span><h2>Equipe e acessos</h2></div></div>
    <p class="muted" style="margin-top:-.8rem">Todo mundo que entra com o Google aparece aqui como <b>cliente</b>. Promova a <b>corretor</b> para liberar o cadastro de imóveis.</p>
    <div id="eq-box"><div class="skeleton" style="height:200px"></div></div>`;
  try {
    const users = await api.listProfiles();
    $('#eq-box').innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Usuário</th><th>Papel</th><th>Cargo</th><th>CRECI</th><th></th></tr></thead>
      <tbody>${users.map((u) => `<tr data-u="${esc(u.id)}">
        <td><div class="agent">${avatarHTML(u)}<div><strong>${esc(u.nome || '—')}</strong><span>${esc(u.email || '')}</span></div></div></td>
        <td><select class="select" data-k="papel" ${u.id === auth.user.id ? 'disabled title="Você não pode alterar o próprio papel"' : ''}>${Object.entries(PAPEIS).map(([k, l]) => `<option value="${k}" ${u.papel === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
        <td><input class="input" data-k="cargo" value="${esc(u.cargo || '')}" placeholder="Cargo" style="min-width:160px"></td>
        <td><input class="input" data-k="creci" value="${esc(u.creci || '')}" placeholder="CRECI" style="min-width:130px"></td>
        <td><button class="btn btn-sm" data-save>Salvar</button></td>
      </tr>`).join('')}</tbody></table></div>`;
    $$('[data-save]').forEach((b) => b.onclick = async () => {
      const tr = b.closest('tr'); const patch = {};
      $$('[data-k]', tr).forEach((el) => { if (!el.disabled) patch[el.dataset.k] = el.value; });
      b.disabled = true;
      try { await api.updateProfile(patch, tr.dataset.u); toast('Usuário atualizado'); } catch (e) { toast(e.message, 'err'); }
      b.disabled = false;
    });
  } catch (e) { $('#eq-box').innerHTML = dbErrorHTML(e); }
}

// ---------------------------------------------------------
//  Segurança: senha e exclusão de conta
// ---------------------------------------------------------
function tabSeguranca() {
  const t = $('#tab-seguranca');
  const prov = providers();
  const temGoogle = prov.includes('google');
  const temSenha = prov.includes('email');
  t.innerHTML = `
    <div class="tab-head"><div><span class="eyebrow">Acesso e privacidade</span><h2>Segurança</h2></div></div>

    <div class="panel form" style="margin-bottom:1.2rem">
      <h3 style="font-size:1.35rem">Senha</h3>
      ${temGoogle ? `<p class="muted" style="margin:0">Você entra com o <b>Google</b>, então a senha principal da sua conta é a do Google. Para trocá-la, use a página de segurança do Google.</p>
      <div><a class="btn btn-ghost btn-sm" href="https://myaccount.google.com/signinoptions/password" target="_blank" rel="noopener">Alterar senha do Google ↗</a></div>
      <hr style="border:0;border-top:1px solid var(--line);width:100%;margin:.4rem 0">` : ''}
      <div>
        <h4 style="font-family:var(--ff-body);font-weight:700;font-size:1rem;margin-bottom:.3rem">${temSenha ? 'Alterar senha do site' : 'Criar senha do site (opcional)'}</h4>
        <p class="muted" style="margin:0;font-size:.92rem">${temSenha ? 'Essa senha permite entrar com e-mail e senha, além do Google.' : 'Com uma senha você também pode entrar com seu e-mail, sem depender do Google.'}</p>
      </div>
      <form class="form" id="f-senha">
        <div class="form-row">
          <div class="field"><label>Nova senha</label><input type="password" name="s1" minlength="8" required autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></div>
          <div class="field"><label>Confirmar nova senha</label><input type="password" name="s2" minlength="8" required autocomplete="new-password"></div>
        </div>
        <div class="pw-meter" aria-hidden="true"><span></span></div>
        <div><button class="btn" type="submit">${icon('check')} ${temSenha ? 'Alterar senha' : 'Criar senha'}</button></div>
      </form>
    </div>

    <div class="panel form danger-zone">
      <h3 style="font-size:1.35rem;color:var(--danger)">Excluir conta</h3>
      <p class="muted" style="margin:0">Apaga definitivamente seu perfil, foto, favoritos e acesso. ${isStaff() ? 'Os imóveis sob sua responsabilidade continuam publicados, mas ficam <b>sem responsável</b> até um administrador definir outro.' : ''} Essa ação não pode ser desfeita.</p>
      <div><button class="btn btn-danger" id="del-acc">${icon('trash')} Excluir minha conta</button></div>
    </div>`;

  const f = $('#f-senha');
  const meter = $('.pw-meter span', t);
  f.s1.oninput = () => {
    const v = f.s1.value; let sc = 0;
    if (v.length >= 8) sc++; if (v.length >= 12) sc++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) sc++; if (/\d/.test(v)) sc++; if (/[^A-Za-z0-9]/.test(v)) sc++;
    meter.style.width = (sc / 5) * 100 + '%';
    meter.style.background = sc <= 2 ? 'var(--danger)' : sc <= 3 ? 'var(--warn)' : 'var(--ok)';
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (f.s1.value.length < 8) return toast('A senha precisa ter pelo menos 8 caracteres.', 'err');
    if (f.s1.value !== f.s2.value) return toast('As senhas não conferem.', 'err');
    const b = f.querySelector('button'); b.disabled = true;
    try { await api.changePassword(f.s1.value); toast(temSenha ? 'Senha alterada!' : 'Senha criada! Agora você também pode entrar com e-mail.'); f.reset(); meter.style.width = '0'; tabSeguranca(); }
    catch (err) { toast(err.message, 'err'); b.disabled = false; }
  };

  $('#del-acc').onclick = () => {
    const { el, close } = modal(`
      <h3 style="font-size:1.6rem;margin-bottom:.6rem;color:var(--danger)">Excluir conta?</h3>
      <p class="muted">Todos os seus dados serão apagados para sempre. Para confirmar, digite <b>EXCLUIR</b> abaixo.</p>
      <div class="field" style="margin-top:1rem"><input id="del-confirm" autocomplete="off" placeholder="EXCLUIR"></div>
      <div style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1.2rem"><button class="btn btn-ghost" data-no>Cancelar</button><button class="btn btn-danger" data-yes disabled>Excluir definitivamente</button></div>`);
    const inp = el.querySelector('#del-confirm'), yes = el.querySelector('[data-yes]');
    inp.oninput = () => { yes.disabled = inp.value.trim().toUpperCase() !== 'EXCLUIR'; };
    el.querySelector('[data-no]').onclick = close;
    yes.onclick = async () => {
      yes.disabled = true; yes.innerHTML = '<span class="spinner"></span> Excluindo…';
      try { await api.deleteAccount(); close(); toast('Sua conta foi excluída.'); setTimeout(() => location.href = './index.html', 900); }
      catch (err) { toast(err.message, 'err'); yes.disabled = false; yes.textContent = 'Excluir definitivamente'; }
    };
  };
}

// ---------------------------------------------------------
async function boot() {
  await initAuth();
  let lastUser;
  onAuth(() => {
    if (auth.user?.id === lastUser && root.dataset.ready) return;
    lastUser = auth.user?.id; root.dataset.ready = '1';
    IMOVEIS = null;
    if (!auth.user) renderLogin(); else { renderShell(); route(); }
  });
  addEventListener('hashchange', () => auth.user && route());
  finishLoading();
}
boot();
