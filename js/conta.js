import { $, $$, esc, api, auth, chat, refreshUnread, signInWithPassword, providers, initAuth, onAuth, renderChrome, observeReveal, cardGlow, cardHTML, bindFavs, favs, finishLoading, icon, money, priceLabel, imgFallback, qs, onlyDigits, avatarHTML, toast, confirmBox, modal, googleBtn, bindLoginButtons, LOGO, cover, loc, fmtDate, isStaff, isAdmin, TIPOS, FINALIDADES, STATUS, PAPEIS, COMODIDADES, DEMO, dbErrorHTML, visitas, VISITA_STATUS, buscas, matchFiltros, filtrosLabel, isPublicado, SITUACOES, ETAPAS, loadLeaflet, tileLayer, geocode, num } from './core.js';

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
  { id: 'chat', label: 'Mensagens', ic: 'chat' },
  { id: 'visitas', label: 'Visitas', ic: 'calendar' },
  { id: 'favoritos', label: 'Favoritos', ic: 'heart', count: () => favs.size },
  { id: 'buscas', label: 'Buscas salvas', ic: 'bell' },
  { id: 'painel', label: 'Painel', ic: 'chart', staff: true },
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
  refreshCounts();
}

// Números ao lado das abas (visitas a confirmar, anúncios a aprovar, novidades nas buscas)
function setCount(tab, n) {
  const btn = $(`.side-nav [data-tab="${tab}"]`); if (!btn) return;
  let c = btn.querySelector('.count');
  if (!n) { c?.remove(); return; }
  if (!c) { c = document.createElement('span'); c.className = 'count'; btn.append(c); }
  c.textContent = n;
}
async function refreshCounts() {
  const me = auth.user.id;
  try { const v = await visitas.list(); setCount('visitas', v.filter((x) => x.corretor_id === me && x.status === 'pendente' && new Date(x.data_hora) > new Date()).length); } catch {}
  try {
    const [bs, all] = await Promise.all([buscas.list(), loadImoveis()]);
    setCount('buscas', bs.reduce((n, b) => n + all.filter((i) => isPublicado(i) && matchFiltros(b.filtros || {}, i) && i.created_at > b.visto_em).length, 0));
    if (isAdmin()) setCount('imoveis', all.filter((i) => i.situacao === 'pendente').length);
  } catch {}
}

function route() {
  let id = location.hash.slice(1) || 'perfil';
  const staffOnly = ['imoveis', 'novo', 'leads', 'painel'];
  if ((staffOnly.includes(id) && !isStaff()) || (id === 'equipe' && !isAdmin())) id = 'restrito';
  if (!$('#tab-' + id)) id = 'perfil';
  $$('.side-nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
  $$('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + id));
  ({ perfil: tabPerfil, favoritos: tabFavoritos, imoveis: tabImoveis, novo: tabNovo, leads: tabLeads, equipe: tabEquipe, restrito: tabRestrito, seguranca: tabSeguranca, chat: tabChat, visitas: tabVisitas, buscas: tabBuscas, painel: tabPainel })[id]?.();
  if (id !== 'chat' && stopChat) { stopChat(); stopChat = null; }
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
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">${isAdmin() ? 'Todos os anúncios' : 'Sob sua responsabilidade'}</span><h2>Imóveis</h2></div><label class="field-inline" style="border:1px solid var(--line);min-width:240px">${icon('search')}<input id="mi-q" placeholder="Filtrar…"></label></div><div class="filter-chips" id="mi-sit"></div><div class="list" id="mi-list"><div class="skeleton" style="height:100px"></div></div>`;
  try {
    const all = await loadImoveis(true);
    const mine = isAdmin() ? all : all.filter((i) => i.responsavel_id === auth.user.id || i.criado_por === auth.user.id);
    const sit = (i) => i.situacao || 'publicado';
    let fSit = isAdmin() && mine.some((i) => sit(i) === 'pendente') ? 'pendente' : '';
    let q = '';
    const chips = () => {
      const c = (k) => mine.filter((i) => !k || sit(i) === k).length;
      $('#mi-sit').innerHTML = [['', 'Todos'], ['pendente', 'Aguardando aprovação'], ['publicado', 'Publicados'], ['rascunho', 'Rascunhos'], ['rejeitado', 'Rejeitados']]
        .filter(([k]) => !k || c(k)).map(([k, l]) => `<button class="chip ${fSit === k ? 'on' : ''}" data-s="${k}">${l}<small>${c(k)}</small></button>`).join('');
      $$('#mi-sit [data-s]').forEach((b) => b.onclick = () => { fSit = b.dataset.s; chips(); draw(); });
    };
    const draw = () => {
      const l = mine.filter((i) => (!fSit || sit(i) === fSit) && (i.titulo + i.bairro + i.cidade).toLowerCase().includes(q.toLowerCase()));
      $('#mi-list').innerHTML = l.length ? l.map((im) => `
        <div class="list-item">
          <img src="${esc(cover(im))}" alt="" data-fb loading="lazy">
          <div style="min-width:0">
            <h4>${esc(im.titulo)} <span class="pill ${sit(im)}">${SITUACOES[sit(im)]}</span></h4>
            <div class="meta"><span>${priceLabel(im)}</span><span>${TIPOS[im.tipo] || ''} · ${FINALIDADES[im.finalidade] || ''}</span><span class="status ${im.status}">${STATUS[im.status] || ''}</span>${im.destaque ? `<span style="color:var(--accent)">★ Destaque</span>` : ''}</div>
            <div class="meta"><span>${icon('pin')} ${loc(im)}</span><span>${icon('image')} ${im.imovel_fotos?.length || 0}</span><span>${icon('user')} ${esc(im.responsavel?.nome || '—')}</span>${im.latitude ? `<span>${icon('map')} no mapa</span>` : ''}</div>
            ${sit(im) === 'rejeitado' && im.motivo_rejeicao ? `<div class="meta" style="color:var(--danger)">Motivo: ${esc(im.motivo_rejeicao)}</div>` : ''}
          </div>
          <div class="row-actions">
            ${isAdmin() && sit(im) === 'pendente' ? `<button class="btn btn-sm" data-ok="${esc(im.id)}">${icon('check')} Aprovar</button><button class="btn btn-ghost btn-sm" data-rej="${esc(im.id)}">Rejeitar</button>` : ''}
            <a class="btn-icon" href="./imovel.html?id=${encodeURIComponent(im.id)}" aria-label="Ver">${icon('eye')}</a>
            <a class="btn-icon" href="?editar=${encodeURIComponent(im.id)}#novo" aria-label="Editar">${icon('edit')}</a>
            <button class="btn-icon" data-del="${esc(im.id)}" aria-label="Excluir">${icon('trash')}</button>
          </div>
        </div>`).join('') : `<div class="empty"><h3>Nenhum imóvel ${fSit ? 'nesta situação' : ''}</h3><p>${fSit ? 'Troque o filtro acima.' : 'Cadastre o primeiro agora mesmo.'}</p>${fSit ? '' : `<a class="btn btn-accent" href="#novo" style="margin-top:1rem">${icon('plus')} Cadastrar imóvel</a>`}</div>`;
      imgFallback($('#mi-list'));
      $$('[data-del]').forEach((b) => b.onclick = async () => {
        const im = mine.find((x) => x.id === b.dataset.del);
        if (!(await confirmBox(`“${im.titulo}” e todas as fotos serão excluídos permanentemente.`, 'Excluir'))) return;
        try { await api.deleteImovel(im); toast('Imóvel excluído'); tabImoveis(); } catch (e) { toast(e.message, 'err'); }
      });
      $$('[data-ok]').forEach((b) => b.onclick = async () => {
        try { await api.setSituacao(b.dataset.ok, 'publicado'); toast('Anúncio aprovado e publicado!'); IMOVEIS = null; tabImoveis(); refreshCounts(); } catch (e) { toast(e.message, 'err'); }
      });
      $$('[data-rej]').forEach((b) => b.onclick = () => {
        const { el, close } = modal(`<h3 style="font-size:1.5rem;margin-bottom:.5rem">Rejeitar anúncio</h3><p class="muted" style="margin-top:0">Explique ao corretor o que ajustar. Ele vê o motivo e pode reenviar.</p>
          <div class="field"><textarea id="rej-m" style="min-height:100px" maxlength="400" placeholder="Ex.: faltam fotos da cozinha e o preço está desatualizado."></textarea></div>
          <div style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem"><button class="btn btn-ghost" data-no>Cancelar</button><button class="btn btn-danger" data-yes>Rejeitar</button></div>`);
        el.querySelector('[data-no]').onclick = close;
        el.querySelector('[data-yes]').onclick = async () => {
          try { await api.setSituacao(b.dataset.rej, 'rejeitado', el.querySelector('#rej-m').value.trim() || null); close(); toast('Anúncio rejeitado'); IMOVEIS = null; tabImoveis(); refreshCounts(); } catch (e) { toast(e.message, 'err'); }
        };
      });
    };
    chips(); draw();
    $('#mi-q').oninput = (e) => { q = e.target.value; draw(); };
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
    ${im && im.situacao === 'rejeitado' ? `<div class="draft-banner" style="border-color:color-mix(in srgb,var(--danger) 45%,transparent);background:color-mix(in srgb,var(--danger) 10%,transparent)">${icon('x')}<span><b>Anúncio rejeitado.</b> ${esc(im.motivo_rejeicao || 'Ajuste e reenvie para aprovação.')}</span></div>` : ''}
    ${im && im.situacao === 'pendente' ? `<div class="draft-banner">${icon('clock')}<span>Este anúncio está <b>aguardando aprovação</b> de um administrador.</span></div>` : ''}
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
        <div class="field">
          <div style="display:flex;justify-content:space-between;align-items:end;gap:.6rem;flex-wrap:wrap"><label>Posição no mapa <span id="geo-st" style="font-weight:400">${v.latitude ? '· definida' : '· não definida'}</span></label><button type="button" class="btn btn-ghost btn-sm" id="geo-btn">${icon('pin')} Localizar pelo endereço</button></div>
          <div class="mini-map" id="mini-map"></div>
          <p class="muted" style="font-size:.8rem;margin:.2rem 0 0">Clique no mapa ou arraste o marcador para ajustar. É o que aparece na busca por mapa.</p>
          <input type="hidden" name="latitude" value="${val('latitude')}"><input type="hidden" name="longitude" value="${val('longitude')}">
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

      <div class="form-actions">
        <a class="btn btn-ghost" href="#imoveis" style="background:var(--surface)">Cancelar</a>
        <button class="btn btn-ghost" type="submit" data-sit="rascunho" style="background:var(--surface)">Salvar rascunho</button>
        <button class="btn btn-accent" type="submit" data-sit="publicado" id="save-btn">${icon('check')} ${isAdmin() ? (im && im.situacao === 'publicado' ? 'Salvar alterações' : 'Publicar imóvel') : (im && im.situacao === 'publicado' ? 'Salvar alterações' : 'Enviar para aprovação')}</button>
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
      if (!form.latitude.value) $('#geo-btn').click();
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
    const situacao = e.submitter?.dataset.sit || 'publicado';
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
      latitude: n('latitude'), longitude: n('longitude'),
      situacao: situacao === 'rascunho' ? 'rascunho' : (isAdmin() ? 'publicado' : (im?.situacao === 'publicado' ? 'publicado' : 'pendente')),
    };
    const btn = e.submitter || $('#save-btn'); $$('.form-actions button').forEach((b) => b.disabled = true);
    btn.innerHTML = '<span class="spinner"></span> Salvando dados…';
    try {
      const id = await api.saveImovel(payload, im?.id || null);
      await api.saveFotos(id, fotos, removidas, (i, tot) => { btn.innerHTML = `<span class="spinner"></span> Enviando foto ${i}/${tot}…`; });
      toast(payload.situacao === 'rascunho' ? 'Rascunho salvo.' : payload.situacao === 'pendente' ? 'Enviado para aprovação! Avisaremos quando for publicado.' : (im ? 'Alterações salvas!' : 'Imóvel publicado!'));
      setTimeout(() => location.href = `./imovel.html?id=${encodeURIComponent(id)}`, 700);
    } catch (err) {
      console.error(err);
      toast(err.message || 'Erro ao salvar', 'err');
      $$('.form-actions button').forEach((b) => b.disabled = false); btn.innerHTML = `${icon('check')} Tentar novamente`;
    }
  };

  // Mapa do formulário
  let mm = null, mk = null;
  const setPos = (lat, lng, pan = true) => {
    form.latitude.value = lat.toFixed(6); form.longitude.value = lng.toFixed(6);
    $('#geo-st').textContent = '· definida';
    if (!mm) return;
    if (!mk) { mk = window.L.marker([lat, lng], { draggable: true }).addTo(mm); mk.on('dragend', () => { const p = mk.getLatLng(); setPos(p.lat, p.lng, false); }); }
    else mk.setLatLng([lat, lng]);
    if (pan) mm.setView([lat, lng], 16);
  };
  loadLeaflet().then((L) => {
    const lat = Number(v.latitude), lng = Number(v.longitude);
    mm = L.map('mini-map', { scrollWheelZoom: false }).setView(lat ? [lat, lng] : [-25.52, -48.51], lat ? 16 : 12);
    tileLayer(L).addTo(mm);
    if (lat) setPos(lat, lng);
    mm.on('click', (e) => setPos(e.latlng.lat, e.latlng.lng, false));
  }).catch(() => { $('#mini-map').innerHTML = '<p class="muted" style="padding:1rem">Não foi possível carregar o mapa.</p>'; });
  const localizar = async (silencioso = false) => {
    const q = [form.endereco.value, form.bairro.value, form.cidade.value, form.estado.value, 'Brasil'].filter((x) => x && x.trim()).join(', ');
    if (!form.cidade.value.trim()) { if (!silencioso) toast('Preencha ao menos a cidade.', 'err'); return; }
    const b = $('#geo-btn'); b.disabled = true;
    try {
      let r = await geocode(q);
      if (!r) r = await geocode([form.bairro.value, form.cidade.value, form.estado.value, 'Brasil'].filter(Boolean).join(', '));
      if (r) { setPos(r.lat, r.lng); if (!silencioso) toast('Posição encontrada — ajuste o marcador se precisar.'); }
      else if (!silencioso) toast('Endereço não encontrado. Clique no mapa para marcar.', 'err');
    } catch { if (!silencioso) toast('Busca de endereço indisponível agora.', 'err'); }
    b.disabled = false;
  };
  $('#geo-btn').onclick = () => localizar(false);
  form.cidade.addEventListener('change', () => { if (!form.latitude.value) localizar(true); });
}

// ---------------------------------------------------------
async function tabLeads() {
  const t = $('#tab-leads');
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">Contatos recebidos</span><h2>Interessados</h2></div></div><div class="filter-chips" id="et-chips"></div><div id="leads-box"><div class="skeleton" style="height:200px"></div></div>`;
  let leads;
  try { leads = await api.listLeads(); } catch (e) { $('#leads-box').innerHTML = dbErrorHTML(e); return; }
  leads.forEach((l) => { l.etapa ||= 'novo'; });
  let fEt = '';
  const chips = () => {
    const c = (k) => leads.filter((l) => !k || l.etapa === k).length;
    $('#et-chips').innerHTML = [['', 'Todos'], ...Object.entries(ETAPAS)].map(([k, lbl]) => `<button class="chip ${fEt === k ? 'on' : ''}" data-e="${k}">${lbl}<small>${c(k)}</small></button>`).join('');
    $$('#et-chips [data-e]').forEach((b) => b.onclick = () => { fEt = b.dataset.e; chips(); draw(); });
  };
  const draw = () => {
    const list = leads.filter((l) => !fEt || l.etapa === fEt);
    $('#leads-box').innerHTML = list.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Pessoa</th><th>Imóvel</th><th>Mensagem</th><th>Etapa</th><th></th></tr></thead>
      <tbody>${list.map((l) => {
        const tel = onlyDigits(l.telefone);
        return `<tr>
          <td style="white-space:nowrap">${fmtDate(l.created_at)}</td>
          <td><strong>${esc(l.nome)}</strong><br><a class="muted" href="mailto:${esc(l.email)}">${esc(l.email)}</a>${tel ? `<br><a class="muted" href="https://wa.me/${tel.startsWith('55') ? tel : '55' + tel}" target="_blank" rel="noopener">${esc(l.telefone)}</a>` : ''}</td>
          <td>${l.imovel ? `<a href="./imovel.html?id=${encodeURIComponent(l.imovel.id)}" style="color:var(--accent)">${esc(l.imovel.titulo)}</a>` : '<span class="muted">removido</span>'}</td>
          <td style="max-width:300px">${esc(l.mensagem)}</td>
          <td><select class="select" data-et="${esc(l.id)}" aria-label="Etapa">${Object.entries(ETAPAS).map(([k, lbl]) => `<option value="${k}" ${l.etapa === k ? 'selected' : ''}>${lbl}</option>`).join('')}</select></td>
          <td><button class="btn-icon" data-dl="${esc(l.id)}" aria-label="Excluir">${icon('trash')}</button></td>
        </tr>`;
      }).join('')}</tbody></table></div>` : `<div class="empty"><h3>${fEt ? 'Ninguém nesta etapa' : 'Nenhum interessado ainda'}</h3><p>${fEt ? 'Troque o filtro acima.' : 'Quando alguém clicar em “Tenho interesse” num imóvel seu, aparece aqui.'}</p></div>`;
    $$('[data-et]').forEach((sel) => sel.onchange = async () => {
      const l = leads.find((x) => x.id === sel.dataset.et);
      try { await api.setLeadEtapa(l.id, sel.value); l.etapa = sel.value; chips(); toast(`Etapa: ${ETAPAS[sel.value]}`); if (fEt) draw(); }
      catch (e) { toast(e.message, 'err'); sel.value = l.etapa; }
    });
    $$('[data-dl]').forEach((b) => b.onclick = async () => { if (!(await confirmBox('Remover este contato da lista?', 'Remover'))) return; try { await api.deleteLead(b.dataset.dl); tabLeads(); } catch (e) { toast(e.message, 'err'); } });
  };
  chips(); draw();
}

// ---------------------------------------------------------
//  Visitas
// ---------------------------------------------------------
async function tabVisitas() {
  const t = $('#tab-visitas');
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">Agenda</span><h2>Visitas</h2></div></div><div id="vis-box"><div class="skeleton" style="height:120px"></div></div>`;
  let list;
  try { list = await visitas.list(); } catch (e) { $('#vis-box').innerHTML = dbErrorHTML(e); return; }
  const me = auth.user.id, agora = new Date();
  const card = (v, papel) => {
    const d = new Date(v.data_hora), past = d < agora;
    const outro = papel === 'corretor' ? v.cliente : v.corretor;
    const tel = onlyDigits(outro?.telefone);
    const acts = [];
    if (papel === 'corretor' && v.status === 'pendente' && !past) acts.push(`<button class="btn btn-sm" data-st="confirmada" data-v="${esc(v.id)}">${icon('check')} Confirmar</button>`, `<button class="btn btn-ghost btn-sm" data-st="recusada" data-v="${esc(v.id)}">Recusar</button>`);
    if (papel === 'corretor' && v.status === 'confirmada' && past) acts.push(`<button class="btn btn-sm" data-st="realizada" data-v="${esc(v.id)}">Marcar realizada</button>`);
    if (['pendente', 'confirmada'].includes(v.status) && !past) acts.push(`<button class="btn btn-ghost btn-sm" data-st="cancelada" data-v="${esc(v.id)}">Cancelar</button>`);
    if (v.imovel && outro && papel === 'cliente') acts.push(`<button class="btn-icon" data-chat="${esc(v.imovel.id)}" aria-label="Conversar">${icon('chat')}</button>`);
    if (tel && papel === 'corretor') acts.push(`<a class="btn-icon" href="https://wa.me/${tel.startsWith('55') ? tel : '55' + tel}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('phone')}</a>`);
    return `<div class="panel visit-card ${past || ['cancelada', 'recusada'].includes(v.status) ? 'past' : ''}">
      <div class="visit-date"><small>${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><b>${d.getDate()}</b><span>${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
      <div style="min-width:0">
        <h4>${v.imovel ? `<a href="./imovel.html?id=${encodeURIComponent(v.imovel.id)}">${esc(v.imovel.titulo)}</a>` : 'Imóvel removido'}</h4>
        <div class="meta"><span class="pill ${v.status}">${VISITA_STATUS[v.status]}</span>${v.imovel ? `<span>${icon('pin')} ${loc(v.imovel)}</span>` : ''}<span>${icon('user')} ${papel === 'corretor' ? 'Interessado' : 'Corretor'}: ${esc(outro?.nome || '—')}</span></div>
        ${v.observacao ? `<div class="meta">“${esc(v.observacao)}”</div>` : ''}
      </div>
      <div class="row-actions">${acts.join('')}</div>
    </div>`;
  };
  const ord = (a, b) => { const fa = new Date(a.data_hora) < agora, fb = new Date(b.data_hora) < agora; return fa !== fb ? (fa ? 1 : -1) : (fa ? b.data_hora.localeCompare(a.data_hora) : a.data_hora.localeCompare(b.data_hora)); };
  const comoCorretor = list.filter((v) => v.corretor_id === me || (isAdmin() && v.cliente_id !== me)).sort(ord);
  const comoCliente = list.filter((v) => v.cliente_id === me).sort(ord);
  $('#vis-box').innerHTML = (!list.length ? `<div class="empty"><h3>Nenhuma visita agendada</h3><p>Abra um imóvel e use <b>Agendar visita</b> para escolher dia e horário.</p><a class="btn" href="./index.html#catalogo" style="margin-top:1rem">Ver imóveis</a></div>` : '')
    + (comoCorretor.length ? `<h3 class="sub-title">Pedidos nos seus imóveis</h3><div class="list">${comoCorretor.map((v) => card(v, 'corretor')).join('')}</div>` : '')
    + (comoCliente.length ? `<h3 class="sub-title">Suas visitas</h3><div class="list">${comoCliente.map((v) => card(v, 'cliente')).join('')}</div>` : '');
  $$('[data-st]', t).forEach((b) => b.onclick = async () => {
    const st = b.dataset.st;
    if (['cancelada', 'recusada'].includes(st) && !(await confirmBox(st === 'cancelada' ? 'Cancelar esta visita?' : 'Recusar este pedido de visita?', st === 'cancelada' ? 'Cancelar visita' : 'Recusar'))) return;
    try {
      await visitas.setStatus(b.dataset.v, st);
      const v = list.find((x) => x.id === b.dataset.v);
      const msg = { confirmada: '✅ Visita confirmada', recusada: '❌ Não poderei receber a visita neste horário — que tal escolher outro?', cancelada: '🚫 Visita cancelada', realizada: '🏠 Visita realizada. Obrigado!' }[st];
      if (v?.imovel && msg) {
        try {
          const convs = await chat.list();
          const c = convs.find((x) => x.imovel_id === v.imovel.id && x.cliente_id === v.cliente_id);
          if (c) await chat.send(c.id, `${msg} — ${new Date(v.data_hora).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`);
        } catch {}
      }
      toast(VISITA_STATUS[st]); tabVisitas(); refreshCounts();
    } catch (e) { toast(e.message, 'err'); }
  });
  $$('[data-chat]', t).forEach((b) => b.onclick = async () => { try { const id = await chat.open(b.dataset.chat); if (id) { history.replaceState(null, '', `${location.pathname}?c=${encodeURIComponent(id)}#chat`); route(); } } catch (e) { toast(e.message, 'err'); } });
}

// ---------------------------------------------------------
//  Buscas salvas
// ---------------------------------------------------------
async function tabBuscas() {
  const t = $('#tab-buscas');
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">Alertas</span><h2>Buscas salvas</h2></div><a class="btn btn-ghost btn-sm" href="./index.html#catalogo">${icon('search')} Nova busca</a></div><div id="bs-box"><div class="skeleton" style="height:100px"></div></div>`;
  let bs, all;
  try { [bs, all] = await Promise.all([buscas.list(), loadImoveis()]); } catch (e) { $('#bs-box').innerHTML = dbErrorHTML(e); return; }
  all = all.filter(isPublicado);
  const url = (f) => { const p = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => { if (v && v !== '0' && v !== 0) p.set(k === 'fin' ? 'f' : k, v); }); return `./index.html?${p}#catalogo`; };
  $('#bs-box').innerHTML = bs.length ? `<div class="list">${bs.map((b) => {
    const f = b.filtros || {};
    const res = all.filter((i) => matchFiltros(f, i));
    const novos = res.filter((i) => i.created_at > b.visto_em).length;
    return `<div class="panel busca-card">
      <div style="min-width:0">
        <h4>${esc(b.nome)} ${novos ? `<span class="pill novo">${novos} ${novos === 1 ? 'novo' : 'novos'}</span>` : ''}</h4>
        <div class="chips-sm">${filtrosLabel(f).map((x) => `<span>${esc(x)}</span>`).join('')}</div>
        <div class="muted" style="font-size:.82rem;margin-top:.5rem">${res.length} ${res.length === 1 ? 'imóvel combina' : 'imóveis combinam'} agora · salva em ${fmtDate(b.created_at)}</div>
      </div>
      <div class="row-actions" style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">
        <label class="switch" title="Alertas por e-mail"><input type="checkbox" data-al="${esc(b.id)}" ${b.alerta_email ? 'checked' : ''}> <span style="font-size:.84rem">E-mail</span></label>
        <a class="btn btn-sm" href="${url(f)}" data-ver="${esc(b.id)}">Ver resultados</a>
        <button class="btn-icon" data-rm="${esc(b.id)}" aria-label="Excluir">${icon('trash')}</button>
      </div>
    </div>`;
  }).join('')}</div>` : `<div class="empty"><h3>Nenhuma busca salva</h3><p>No catálogo, aplique os filtros e toque em <b>Salvar busca</b>. Avisamos quando surgir imóvel novo que combine.</p><a class="btn" href="./index.html#catalogo" style="margin-top:1rem">Ir ao catálogo</a></div>`;
  $$('[data-al]', t).forEach((c) => c.onchange = async () => { try { await buscas.update(c.dataset.al, { alerta_email: c.checked }); toast(c.checked ? 'Alertas por e-mail ligados' : 'Alertas por e-mail desligados'); } catch (e) { toast(e.message, 'err'); c.checked = !c.checked; } });
  $$('[data-ver]', t).forEach((a) => a.addEventListener('click', () => { buscas.update(a.dataset.ver, { visto_em: new Date().toISOString() }).catch(() => {}); }));
  $$('[data-rm]', t).forEach((b) => b.onclick = async () => { if (!(await confirmBox('Excluir esta busca salva?', 'Excluir'))) return; try { await buscas.remove(b.dataset.rm); tabBuscas(); refreshCounts(); } catch (e) { toast(e.message, 'err'); } });
}

// ---------------------------------------------------------
//  Painel (números)
// ---------------------------------------------------------
async function tabPainel() {
  const t = $('#tab-painel');
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">Últimos 30 dias</span><h2>Painel</h2></div></div><div id="pn-box"><div class="skeleton" style="height:320px"></div></div>`;
  let stats, dias, all, leads = [], vis = [];
  try {
    [stats, dias, all] = await Promise.all([api.stats(30), api.viewsPorDia(14), loadImoveis(true)]);
    try { leads = await api.listLeads(); } catch {}
    try { vis = await visitas.list(); } catch {}
  } catch (e) { $('#pn-box').innerHTML = dbErrorHTML(e); return; }
  const byId = Object.fromEntries(all.map((i) => [i.id, i]));
  const tot = (k) => stats.reduce((n, s) => n + Number(s[k] || 0), 0);
  const ativos = stats.filter((s) => isPublicado(byId[s.imovel_id] || {})).length;
  const pendVis = vis.filter((v) => v.corretor_id === auth.user.id && v.status === 'pendente' && new Date(v.data_hora) > new Date()).length;
  const fechados = leads.filter((l) => l.etapa === 'fechado').length;
  const conv = leads.length ? Math.round((fechados / leads.length) * 100) : 0;
  const max = Math.max(1, ...dias.map((d) => Number(d.total)));
  const top = [...stats].sort((a, b) => Number(b.views) - Number(a.views)).slice(0, 8);
  const fmtDia = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  $('#pn-box').innerHTML = `
    <div class="kpis">
      <div class="kpi"><span>${icon('home')} Anúncios publicados</span><b>${num(ativos)}</b></div>
      <div class="kpi"><span>${icon('eye')} Visualizações</span><b>${num(tot('views'))}</b></div>
      <div class="kpi"><span>${icon('inbox')} Interessados</span><b>${num(tot('leads'))}</b></div>
      <div class="kpi"><span>${icon('heart')} Favoritados</span><b>${num(tot('favoritos'))}</b></div>
      <div class="kpi"><span>${icon('calendar')} Visitas a confirmar</span><b>${num(pendVis)}</b></div>
      <div class="kpi"><span>${icon('check')} Negócios fechados</span><b>${num(fechados)}</b><span style="margin-top:.2rem">${conv}% dos interessados</span></div>
    </div>
    <div class="panel chart-card">
      <h3>Visualizações por dia</h3><div class="sub">Últimos 14 dias · ${num(dias.reduce((n, d) => n + Number(d.total), 0))} no total</div>
      <div class="bars" role="img" aria-label="Gráfico de barras de visualizações por dia">
        <span class="y-max">${num(max)}</span>
        ${dias.map((d, k) => { const h = (Number(d.total) / max) * 100; return `<div class="bar-col" tabindex="0" style="--k:${k};--h:${h}%"><i style="height:${h}%"></i><span class="bar-tip">${fmtDia(d.dia)} · ${num(d.total)} ${Number(d.total) === 1 ? 'visualização' : 'visualizações'}</span></div>`; }).join('')}
      </div>
      <div class="bar-x">${dias.map((d, k) => `<span>${k % 2 === 0 || dias.length <= 7 ? fmtDia(d.dia) : ''}</span>`).join('')}</div>
      <table class="sr-only"><caption>Visualizações por dia</caption><tbody>${dias.map((d) => `<tr><th>${fmtDia(d.dia)}</th><td>${d.total}</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="panel chart-card">
      <h3>Desempenho por imóvel</h3><div class="sub">Os mais vistos nos últimos 30 dias</div>
      ${top.length ? `<div class="table-wrap" style="margin-top:1rem;border:0"><table>
        <thead><tr><th>Imóvel</th><th class="num-cell">Visualizações</th><th class="num-cell">Favoritos</th><th class="num-cell">Interessados</th><th class="num-cell">Visitas</th></tr></thead>
        <tbody>${top.map((s) => { const im = byId[s.imovel_id]; return `<tr><td>${im ? `<a href="./imovel.html?id=${encodeURIComponent(im.id)}">${esc(im.titulo)}</a>` : '—'}</td><td class="num-cell">${num(s.views)}</td><td class="num-cell">${num(s.favoritos)}</td><td class="num-cell">${num(s.leads)}</td><td class="num-cell">${num(s.visitas)}</td></tr>`; }).join('')}</tbody>
      </table></div>` : '<p class="muted">Sem dados ainda.</p>'}
    </div>
    ${DEMO ? '<p class="muted" style="font-size:.8rem">No modo demonstração os números são simulados.</p>' : ''}`;
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
//  Mensagens (chat em tempo real)
// ---------------------------------------------------------
let stopChat = null;
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

async function tabChat() {
  const t = $('#tab-chat');
  if (stopChat) { stopChat(); stopChat = null; }
  t.innerHTML = `<div class="tab-head"><div><span class="eyebrow">Conversas com a equipe</span><h2>Mensagens</h2></div></div>
    <div class="chat panel" id="chat"><aside class="chat-list" id="chat-list"><div class="skeleton" style="height:76px;margin:.6rem"></div></aside><section class="chat-win" id="chat-win"></section></div>`;
  const me = auth.user.id;
  let convs = [], atual = null, msgs = [];

  try { convs = await chat.list(); }
  catch (e) { $('#chat').outerHTML = dbErrorHTML(e); return; }

  const outro = (c) => (c.cliente_id === me ? c.corretor : c.cliente) || { nome: 'Usuário removido' };

  const drawList = () => {
    const l = $('#chat-list');
    if (!convs.length) {
      l.innerHTML = `<div class="chat-empty-list"><p class="muted">Nenhuma conversa ainda.</p><p class="muted" style="font-size:.85rem">Abra um imóvel e toque em <b>Conversar com o corretor</b>.</p><a class="btn btn-sm" href="./index.html#catalogo">Ver imóveis</a></div>`;
      return;
    }
    l.innerHTML = convs.map((c) => {
      const o = outro(c);
      return `<button class="chat-item ${atual?.id === c.id ? 'on' : ''}" data-c="${esc(c.id)}">
        ${avatarHTML(o)}
        <span class="ci-body"><span class="ci-top"><strong>${esc(o.nome || o.email || '—')}</strong><small>${c.updated_at ? quando(c.updated_at) : ''}</small></span>
        <span class="ci-im">${esc(c.imovel?.titulo || 'Imóvel removido')}</span>
        <span class="ci-last">${esc(c.ultima_msg || 'Comece a conversa…')}</span></span>
        ${c.naoLidas ? `<span class="ci-badge">${c.naoLidas}</span>` : ''}
      </button>`;
    }).join('');
    $$('[data-c]', l).forEach((b) => b.onclick = () => abrir(b.dataset.c));
  };

  const bubble = (m, prev) => {
    const mine = m.autor_id === me;
    const novoDia = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
    const agrupa = prev && !novoDia && prev.autor_id === m.autor_id && (new Date(m.created_at) - new Date(prev.created_at)) < 120000;
    return `${novoDia ? `<div class="day-sep"><span>${diaLabel(m.created_at)}</span></div>` : ''}
      <div class="msg ${mine ? 'me' : ''} ${agrupa ? 'grouped' : ''}" data-m="${esc(m.id)}"><div class="bubble">${esc(m.texto)}<span class="t">${hora(m.created_at)}${mine ? ` ${m.lida ? '✓✓' : '✓'}` : ''}</span></div></div>`;
  };

  const drawMsgs = () => {
    const box = $('#msgs'); if (!box) return;
    box.innerHTML = msgs.length ? msgs.map((m, i) => bubble(m, msgs[i - 1])).join('') : `<div class="chat-hint">Envie a primeira mensagem para ${esc(outro(atual).nome?.split(' ')[0] || 'o corretor')}. Pergunte sobre visitas, documentação ou condições.</div>`;
    box.scrollTop = box.scrollHeight;
  };

  async function abrir(id) {
    atual = convs.find((c) => c.id === id); if (!atual) return;
    history.replaceState(null, '', `${location.pathname}?c=${encodeURIComponent(id)}#chat`);
    $('#chat').classList.add('open');
    drawList();
    const o = outro(atual), im = atual.imovel;
    $('#chat-win').innerHTML = `
      <header class="chat-head">
        <button class="btn-icon chat-back" aria-label="Voltar">${icon('left')}</button>
        ${avatarHTML(o)}
        <div style="min-width:0;flex:1"><strong>${esc(o.nome || o.email)}</strong><span class="muted">${atual.cliente_id === me ? esc(o.cargo || 'Corretor responsável') : 'Interessado'}</span></div>
        ${im ? `<a class="chat-im" href="./imovel.html?id=${encodeURIComponent(im.id)}"><img src="${esc(cover(im))}" alt="" data-fb><span><b>${esc(im.titulo)}</b><small>${priceLabel(im)}</small></span></a>` : ''}
      </header>
      <div class="msgs" id="msgs"><div class="skeleton" style="height:60px;width:60%;margin:1rem"></div></div>
      <form class="chat-form" id="chat-form">
        <textarea id="chat-input" rows="1" placeholder="Escreva uma mensagem…" maxlength="2000" aria-label="Mensagem"></textarea>
        <button class="btn btn-accent" type="submit" aria-label="Enviar">${icon('arrow')}</button>
      </form>`;
    imgFallback($('#chat-win'));
    $('.chat-back').onclick = () => { $('#chat').classList.remove('open'); history.replaceState(null, '', location.pathname + '#chat'); };
    const inp = $('#chat-input'), form = $('#chat-form');
    const grow = () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 140) + 'px'; };
    inp.oninput = grow;
    inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const txt = inp.value; if (!txt.trim()) return;
      inp.value = ''; grow(); inp.focus({ preventScroll: true });
      try {
        const m = await chat.send(atual.id, txt);
        if (m && !msgs.some((x) => x.id === m.id)) { msgs.push(m); drawMsgs(); }
        atual.ultima_msg = m?.texto; atual.updated_at = m?.created_at;
        convs.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')); drawList();
      } catch (err) { toast(err.message, 'err'); inp.value = txt; }
    };
    msgs = await chat.messages(id);
    drawMsgs();
    if (atual.naoLidas) { atual.naoLidas = 0; drawList(); }
    chat.markRead(id);
    if (matchMedia('(min-width: 900px)').matches) inp.focus({ preventScroll: true });
    $('#chat').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const empty = () => { $('#chat-win').innerHTML = `<div class="chat-placeholder">${icon('chat')}<h3>Suas conversas</h3><p class="muted">Escolha uma conversa ao lado para ver as mensagens.</p></div>`; };

  // tempo real
  stopChat = chat.subscribe(async (m) => {
    let c = convs.find((x) => x.id === m.conversa_id);
    if (!c) { try { convs = await chat.list(); } catch {} drawList(); return; }
    c.ultima_msg = m.texto; c.updated_at = m.created_at;
    if (atual?.id === m.conversa_id) {
      if (!msgs.some((x) => x.id === m.id)) { msgs.push(m); drawMsgs(); }
      if (m.autor_id !== me) chat.markRead(m.conversa_id);
    } else if (m.autor_id !== me) c.naoLidas = (c.naoLidas || 0) + 1;
    convs.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    drawList();
  });

  drawList();
  const alvo = qs('c');
  if (alvo && convs.some((c) => c.id === alvo)) abrir(alvo); else empty();
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
