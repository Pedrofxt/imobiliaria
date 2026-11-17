// =========================================================
//  ALVAR — núcleo compartilhado: Supabase, auth, API, UI
// =========================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET, SITE } from './config.js';
import { DEMO_PROFILES, DEMO_IMOVEIS } from './demo-data.js';

export { SITE };
export const DEMO = !SUPABASE_URL || SUPABASE_URL.includes('SEU-PROJETO') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('SUA-CHAVE');

export let sb = null;
if (!DEMO) {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
}

// ---------------------------------------------------------
//  Utilidades
// ---------------------------------------------------------
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const money = (n) => brl.format(Number(n) || 0);
export const num = (n) => new Intl.NumberFormat('pt-BR').format(Number(n) || 0);
export const initials = (name = '') => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
export const qs = (k) => new URLSearchParams(location.search).get(k);
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());
export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
export const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export const TIPOS = { casa: 'Casa', apartamento: 'Apartamento', cobertura: 'Cobertura', terreno: 'Terreno', comercial: 'Comercial' };
export const FINALIDADES = { venda: 'Venda', aluguel: 'Aluguel' };
export const STATUS = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido', alugado: 'Alugado' };
export const PAPEIS = { cliente: 'Cliente', corretor: 'Corretor', admin: 'Administrador' };
export const COMODIDADES = ['Piscina', 'Churrasqueira', 'Varanda', 'Terraço', 'Jardim', 'Quintal', 'Academia', 'Salão de festas', 'Portaria 24h', 'Elevador', 'Pet friendly', 'Mobiliado', 'Ar-condicionado', 'Energia solar', 'Automação', 'Vista para o mar', 'Condomínio fechado', 'Closet', 'Lareira', 'Espaço gourmet'];

export const loc = (im) => [im.bairro, im.cidade].filter(Boolean).map(esc).join(', ');
export const priceLabel = (im) => im.finalidade === 'aluguel' ? `${money(im.preco)}<small> /mês</small>` : money(im.preco);
export const cover = (im) => (im.imovel_fotos && im.imovel_fotos[0]?.url) || PLACEHOLDER;
export const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9DFD2"/><stop offset="1" stop-color="#CFDAD3"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><g fill="none" stroke="#B8552F" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"><path d="M150 150 200 110 250 150"/><path d="M172 200v-28a28 28 0 0 1 56 0v28"/></g></svg>`);
export function imgFallback(root = document) {
  $$('img[data-fb]', root).forEach((img) => { img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; }; });
}

// ---------------------------------------------------------
//  Ícones (traço estilo lucide)
// ---------------------------------------------------------
const P = {
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  bath: '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.68 3 4 3.68 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M2 12h20"/><path d="M7 19v2"/><path d="M17 19v2"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  area: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  home: '<path d="M3 10 12 3l9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
};
export const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
export const LOGO = `<svg class="logo-mark" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19 20 6l15 13"/><path d="M12.5 35V25a7.5 7.5 0 0 1 15 0v10"/><circle cx="20" cy="25" r="1.6" fill="currentColor" stroke="none"/></svg>`;
const GOOGLE = `<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
export const googleBtn = (label = 'Entrar com Google', style = '') => `<button class="btn btn-google" style="${style}" data-login>${GOOGLE} ${label}</button>`;
export const avatarHTML = (p, cls = '') => p?.avatar_url
  ? `<span class="avatar ${cls}"><img src="${esc(p.avatar_url)}" alt="" referrerpolicy="no-referrer"></span>`
  : `<span class="avatar ${cls}">${esc(initials(p?.nome || p?.email))}</span>`;

// ---------------------------------------------------------
//  Toast / modal
// ---------------------------------------------------------
export function toast(msg, type = 'ok') {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.append(box); }
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'err' ? ' err' : '');
  t.innerHTML = `${icon(type === 'err' ? 'x' : 'check')}<span>${esc(msg)}</span>`;
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3600);
}

export function modal(html) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><button class="btn-icon modal-close" aria-label="Fechar">${icon('x')}</button>${html}</div>`;
  document.body.append(m);
  requestAnimationFrame(() => m.classList.add('open'));
  const close = () => { m.classList.remove('open'); setTimeout(() => m.remove(), 350); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.modal-close')) close(); });
  bindLoginButtons(m);
  return { el: m, close };
}

export function confirmBox(texto, okLabel = 'Confirmar') {
  return new Promise((resolve) => {
    const { el, close } = modal(`<h3 style="font-size:1.5rem;margin-bottom:.6rem">Tem certeza?</h3><p class="muted">${esc(texto)}</p><div style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1.4rem"><button class="btn btn-ghost" data-no>Cancelar</button><button class="btn btn-danger" data-yes>${esc(okLabel)}</button></div>`);
    el.querySelector('[data-no]').onclick = () => { close(); resolve(false); };
    el.querySelector('[data-yes]').onclick = () => { close(); resolve(true); };
  });
}

export function askLogin(motivo = 'Entre para continuar') {
  modal(`<div style="text-align:center;padding:.5rem 0">${LOGO.replace('class="logo-mark"', 'class="logo-mark" style="width:52px;height:52px;color:var(--accent);margin:0 auto 1rem"')}<h3 style="font-size:1.7rem">${esc(motivo)}</h3><p class="muted">Use sua conta Google — leva dois segundos.</p>${googleBtn('Continuar com Google', 'width:100%;margin-top:1rem')}<p class="muted" style="font-size:.75rem;margin-top:1rem">Ao continuar, você concorda com os <a href="./termos.html" style="text-decoration:underline">Termos</a> e a <a href="./privacidade.html" style="text-decoration:underline">Política de Privacidade</a>.</p></div>`);
}

// ---------------------------------------------------------
//  Banco local do modo demonstração
// ---------------------------------------------------------
const LS = 'alvar_demo_v1';
function db() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(LS)); } catch {}
  if (!d) { d = { profiles: structuredClone(DEMO_PROFILES), imoveis: structuredClone(DEMO_IMOVEIS), favoritos: [], leads: [], user: null }; save(d); }
  d.conversas ||= []; d.mensagens ||= [];
  return d;
}
function save(d) {
  try { localStorage.setItem(LS, JSON.stringify(d)); }
  catch { toast('Armazenamento do navegador cheio — use fotos menores no modo demo.', 'err'); throw new Error('quota'); }
}
const hydrate = (im, d) => ({ ...im, imovel_fotos: [...(im.imovel_fotos || [])].sort((a, b) => a.ordem - b.ordem), responsavel: d.profiles.find((p) => p.id === im.responsavel_id) || null });

// ---------------------------------------------------------
//  Autenticação
// ---------------------------------------------------------
export const auth = { user: null, profile: null, ready: false };
const listeners = new Set();
export const onAuth = (fn) => { listeners.add(fn); if (auth.ready) fn(auth); };
const emit = () => listeners.forEach((fn) => fn(auth));
export const isStaff = () => ['corretor', 'admin'].includes(auth.profile?.papel);
export const isAdmin = () => auth.profile?.papel === 'admin';

async function loadProfile() {
  if (!auth.user) { auth.profile = null; return; }
  if (DEMO) { auth.profile = db().profiles.find((p) => p.id === auth.user.id) || null; return; }
  const { data } = await sb.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
  auth.profile = data;
}

export async function initAuth() {
  if (DEMO) {
    auth.user = db().user;
  } else {
    const { data } = await sb.auth.getSession();
    auth.user = data.session?.user || null;
    sb.auth.onAuthStateChange(async (_ev, session) => {
      const changed = (session?.user?.id || null) !== (auth.user?.id || null);
      auth.user = session?.user || null;
      if (changed) { await loadProfile(); await refreshFavs(); emit(); }
    });
  }
  await loadProfile();
  await refreshFavs();
  auth.ready = true;
  emit();
}

export async function signIn() {
  if (DEMO) {
    const d = db();
    const id = 'demo-user';
    if (!d.profiles.find((p) => p.id === id)) d.profiles.push({ id, nome: 'Visitante Demo', email: 'demo@alvar.app', telefone: '', creci: '', cargo: 'Administrador (demo)', bio: '', papel: 'admin', avatar_url: null });
    d.user = { id, email: 'demo@alvar.app' };
    save(d);
    auth.user = d.user; await loadProfile(); await refreshFavs(); emit();
    toast('Você entrou no modo demonstração como administrador.');
    $$('.modal.open').forEach((m) => m.querySelector('.modal-close')?.click());
    return;
  }
  const redirectTo = location.origin + location.pathname + location.search;
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) toast(error.message, 'err');
}

export async function signInWithPassword(email, password) {
  if (DEMO) { await signIn(); return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
}

export const providers = () => auth.user?.app_metadata?.providers || (DEMO ? ['google'] : []);

export async function signOut() {
  if (DEMO) { const d = db(); d.user = null; save(d); auth.user = null; auth.profile = null; favs.clear(); emit(); toast('Sessão encerrada.'); return; }
  await sb.auth.signOut();
  auth.user = null; auth.profile = null; favs.clear(); emit();
  toast('Sessão encerrada.');
}

export function bindLoginButtons(root = document) {
  $$('[data-login]', root).forEach((b) => { b.onclick = (e) => { e.preventDefault(); signIn(); }; });
}

// ---------------------------------------------------------
//  Favoritos ("carrinho")
// ---------------------------------------------------------
export const favs = new Set();
async function refreshFavs() {
  favs.clear();
  if (!auth.user) return;
  if (DEMO) { db().favoritos.filter((f) => f.user_id === auth.user.id).forEach((f) => favs.add(f.imovel_id)); return; }
  const { data } = await sb.from('favoritos').select('imovel_id').eq('user_id', auth.user.id);
  (data || []).forEach((f) => favs.add(f.imovel_id));
}
export async function toggleFav(id) {
  if (!auth.user) { askLogin('Salve seus imóveis favoritos'); return null; }
  const on = !favs.has(id);
  on ? favs.add(id) : favs.delete(id);
  updateFavBadge(true);
  try {
    if (DEMO) {
      const d = db();
      d.favoritos = d.favoritos.filter((f) => !(f.user_id === auth.user.id && f.imovel_id === id));
      if (on) d.favoritos.push({ user_id: auth.user.id, imovel_id: id });
      save(d);
    } else if (on) {
      const { error } = await sb.from('favoritos').insert({ user_id: auth.user.id, imovel_id: id }); if (error) throw error;
    } else {
      const { error } = await sb.from('favoritos').delete().eq('user_id', auth.user.id).eq('imovel_id', id); if (error) throw error;
    }
    toast(on ? 'Salvo nos favoritos' : 'Removido dos favoritos');
  } catch (e) {
    on ? favs.delete(id) : favs.add(id); updateFavBadge();
    toast(e.message || 'Não foi possível atualizar', 'err');
  }
  return favs.has(id);
}
function updateFavBadge(pop = false) {
  const b = $('#fav-count'); if (!b) return;
  b.textContent = favs.size;
  b.classList.toggle('show', favs.size > 0);
  if (pop) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
}

// ---------------------------------------------------------
//  API de dados (Supabase ou demo)
// ---------------------------------------------------------
const SEL = '*, imovel_fotos(id,url,path,ordem), responsavel:profiles!imoveis_responsavel_fk(id,nome,email,telefone,creci,cargo,avatar_url,bio)';
const sortFotos = (im) => { im.imovel_fotos = (im.imovel_fotos || []).sort((a, b) => a.ordem - b.ordem); return im; };
const must = ({ data, error }) => { if (error) throw error; return data; };

export const api = {
  async listImoveis() {
    if (DEMO) { const d = db(); return d.imoveis.map((i) => hydrate(i, d)).sort((a, b) => b.created_at.localeCompare(a.created_at)); }
    return must(await sb.from('imoveis').select(SEL).order('created_at', { ascending: false })).map(sortFotos);
  },
  async getImovel(id) {
    if (DEMO) { const d = db(); const im = d.imoveis.find((i) => i.id === id); return im ? hydrate(im, d) : null; }
    const data = must(await sb.from('imoveis').select(SEL).eq('id', id).maybeSingle());
    return data ? sortFotos(data) : null;
  },
  async listEquipe() {
    if (DEMO) return db().profiles.filter((p) => ['corretor', 'admin'].includes(p.papel));
    return must(await sb.from('profiles').select('*').in('papel', ['corretor', 'admin']).order('nome'));
  },
  async listProfiles() {
    if (DEMO) return db().profiles;
    return must(await sb.from('profiles').select('*').order('created_at', { ascending: false }));
  },
  async saveImovel(payload, id = null) {
    if (DEMO) {
      const d = db();
      if (id) { const i = d.imoveis.findIndex((x) => x.id === id); d.imoveis[i] = { ...d.imoveis[i], ...payload }; }
      else { id = 'i-' + uid().slice(0, 8); d.imoveis.unshift({ ...payload, id, criado_por: auth.user.id, created_at: new Date().toISOString(), imovel_fotos: [] }); }
      save(d); return id;
    }
    if (id) { must(await sb.from('imoveis').update(payload).eq('id', id)); return id; }
    const row = must(await sb.from('imoveis').insert({ ...payload, criado_por: auth.user.id }).select('id').single());
    return row.id;
  },
  // fotos: [{id?, url?, path?, file?}] na ordem final; removidas: [{id, path}]
  async saveFotos(imovelId, fotos, removidas = [], onProgress = () => {}) {
    if (DEMO) {
      const d = db(); const im = d.imoveis.find((x) => x.id === imovelId);
      const out = [];
      for (let i = 0; i < fotos.length; i++) {
        const f = fotos[i]; onProgress(i + 1, fotos.length);
        const url = f.file ? await compress(f.file, 1000, .7, 'dataurl') : f.url;
        out.push({ id: f.id || uid(), url, ordem: i });
      }
      im.imovel_fotos = out; save(d); return;
    }
    for (const r of removidas) {
      if (r.path) await sb.storage.from(STORAGE_BUCKET).remove([r.path]);
      if (r.id) must(await sb.from('imovel_fotos').delete().eq('id', r.id));
    }
    for (let i = 0; i < fotos.length; i++) {
      const f = fotos[i]; onProgress(i + 1, fotos.length);
      if (f.file) {
        const blob = await compress(f.file, 1800, .82, 'blob');
        const path = `${imovelId}/${Date.now()}-${i}.jpg`;
        must(await sb.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
        const { data: pub } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        must(await sb.from('imovel_fotos').insert({ imovel_id: imovelId, url: pub.publicUrl, path, ordem: i }));
      } else if (f.id) {
        must(await sb.from('imovel_fotos').update({ ordem: i }).eq('id', f.id));
      }
    }
  },
  async deleteImovel(im) {
    if (DEMO) { const d = db(); d.imoveis = d.imoveis.filter((x) => x.id !== im.id); d.favoritos = d.favoritos.filter((f) => f.imovel_id !== im.id); save(d); return; }
    const paths = (im.imovel_fotos || []).map((f) => f.path).filter(Boolean);
    if (paths.length) await sb.storage.from(STORAGE_BUCKET).remove(paths);
    must(await sb.from('imoveis').delete().eq('id', im.id));
  },
  async createLead(lead) {
    if (DEMO) { const d = db(); d.leads.unshift({ ...lead, id: uid(), created_at: new Date().toISOString() }); save(d); return; }
    must(await sb.from('leads').insert({ ...lead, user_id: auth.user?.id || null }));
  },
  async listLeads() {
    if (DEMO) {
      const d = db();
      return d.leads.map((l) => ({ ...l, imovel: d.imoveis.find((i) => i.id === l.imovel_id) || null }))
        .filter((l) => isAdmin() || l.imovel?.responsavel_id === auth.user.id);
    }
    return must(await sb.from('leads').select('*, imovel:imoveis(id,titulo,responsavel_id)').order('created_at', { ascending: false }));
  },
  async deleteLead(id) {
    if (DEMO) { const d = db(); d.leads = d.leads.filter((l) => l.id !== id); save(d); return; }
    must(await sb.from('leads').delete().eq('id', id));
  },
  async updateProfile(patch, id = auth.user.id) {
    if (DEMO) { const d = db(); const p = d.profiles.find((x) => x.id === id); Object.assign(p, patch); save(d); }
    else must(await sb.from('profiles').update(patch).eq('id', id));
    if (id === auth.user.id) { await loadProfile(); emit(); }
  },
  async changePassword(password) {
    if (DEMO) return;
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      if (/reauthentication|nonce/i.test(error.message)) throw new Error('Por segurança, saia e entre de novo antes de alterar a senha.');
      if (/same/i.test(error.message)) throw new Error('A nova senha precisa ser diferente da atual.');
      throw error;
    }
    const { data } = await sb.auth.getUser(); if (data?.user) auth.user = data.user;
  },
  async deleteAccount() {
    if (DEMO) {
      const d = db(); const id = auth.user.id;
      d.profiles = d.profiles.filter((p) => p.id !== id);
      d.favoritos = d.favoritos.filter((f) => f.user_id !== id);
      d.imoveis.forEach((i) => { if (i.responsavel_id === id) i.responsavel_id = null; });
      d.user = null; save(d);
    } else {
      const dir = `avatars/${auth.user.id}`;
      const { data: files } = await sb.storage.from(STORAGE_BUCKET).list(dir);
      if (files?.length) await sb.storage.from(STORAGE_BUCKET).remove(files.map((f) => `${dir}/${f.name}`));
      must(await sb.rpc('delete_my_account'));
      await sb.auth.signOut();
    }
    auth.user = null; auth.profile = null; favs.clear(); emit();
  },
  async uploadAvatar(file) {
    if (DEMO) return compress(file, 300, .8, 'dataurl');
    const blob = await compress(file, 500, .85, 'blob');
    const path = `avatars/${auth.user.id}/${Date.now()}.jpg`;
    must(await sb.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true }));
    return sb.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  },
};


// ---------------------------------------------------------
//  Chat (conversas entre interessado e corretor)
// ---------------------------------------------------------
const demoBus = new Set();
const CONV_SEL = '*, imovel:imoveis(id,titulo,cidade,bairro,preco,finalidade,imovel_fotos(url,ordem)), cliente:profiles!conversas_cliente_fk(id,nome,email,avatar_url), corretor:profiles!conversas_corretor_fk(id,nome,email,avatar_url,cargo,creci)';

export const chat = {
  async list() {
    const me = auth.user.id;
    if (DEMO) {
      const d = db();
      return d.conversas.filter((c) => c.cliente_id === me || c.corretor_id === me).map((c) => {
        const im = d.imoveis.find((i) => i.id === c.imovel_id);
        return { ...c, imovel: im ? hydrate(im, d) : null, cliente: d.profiles.find((p) => p.id === c.cliente_id), corretor: d.profiles.find((p) => p.id === c.corretor_id),
          naoLidas: d.mensagens.filter((m) => m.conversa_id === c.id && !m.lida && m.autor_id !== me).length };
      }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }
    const convs = must(await sb.from('conversas').select(CONV_SEL).order('updated_at', { ascending: false }));
    const unread = must(await sb.from('mensagens').select('conversa_id').eq('lida', false).neq('autor_id', me));
    return convs.map((c) => { if (c.imovel) sortFotos(c.imovel); return { ...c, naoLidas: unread.filter((u) => u.conversa_id === c.id).length }; });
  },
  async open(imovelId) {
    if (!auth.user) { askLogin('Entre para conversar com o corretor'); return null; }
    const me = auth.user.id;
    if (DEMO) {
      const d = db();
      let c = d.conversas.find((x) => x.imovel_id === imovelId && x.cliente_id === me);
      if (!c) {
        const im = d.imoveis.find((i) => i.id === imovelId);
        const corretor = im.responsavel_id || d.profiles.find((p) => p.papel === 'admin' && p.id !== me)?.id;
        if (corretor === me) throw new Error('Você é o responsável por este imóvel.');
        c = { id: 'c-' + uid().slice(0, 8), imovel_id: imovelId, cliente_id: me, corretor_id: corretor, ultima_msg: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        d.conversas.unshift(c); save(d);
      }
      return c.id;
    }
    const found = must(await sb.from('conversas').select('id').eq('imovel_id', imovelId).eq('cliente_id', me).maybeSingle());
    if (found) return found.id;
    const { data, error } = await sb.from('conversas').insert({ imovel_id: imovelId, cliente_id: me }).select('id').single();
    if (error) throw new Error(/responsável/.test(error.message) ? 'Você é o responsável por este imóvel.' : error.message);
    return data.id;
  },
  async messages(conversaId) {
    if (DEMO) return db().mensagens.filter((m) => m.conversa_id === conversaId).sort((a, b) => a.created_at.localeCompare(b.created_at));
    return must(await sb.from('mensagens').select('*').eq('conversa_id', conversaId).order('created_at').limit(500));
  },
  async send(conversaId, texto) {
    texto = texto.trim().slice(0, 2000);
    if (!texto) return null;
    if (DEMO) {
      const d = db(); const c = d.conversas.find((x) => x.id === conversaId);
      const m = { id: uid(), conversa_id: conversaId, autor_id: auth.user.id, texto, lida: false, created_at: new Date().toISOString() };
      d.mensagens.push(m); c.ultima_msg = texto; c.updated_at = m.created_at; save(d);
      demoBus.forEach((fn) => fn(m));
      const outro = c.cliente_id === auth.user.id ? c.corretor_id : c.cliente_id;
      if (outro?.startsWith('p-')) setTimeout(() => demoReply(conversaId, outro), 1500 + Math.random() * 1200);
      return m;
    }
    return must(await sb.from('mensagens').insert({ conversa_id: conversaId, autor_id: auth.user.id, texto }).select('*').single());
  },
  async markRead(conversaId) {
    const me = auth.user.id;
    if (DEMO) { const d = db(); d.mensagens.forEach((m) => { if (m.conversa_id === conversaId && m.autor_id !== me) m.lida = true; }); save(d); }
    else await sb.from('mensagens').update({ lida: true }).eq('conversa_id', conversaId).neq('autor_id', me).eq('lida', false);
    refreshUnread();
  },
  subscribe(fn) {
    if (DEMO) { demoBus.add(fn); return () => demoBus.delete(fn); }
    const ch = sb.channel('mensagens-' + uid().slice(0, 6))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (p) => fn(p.new))
      .subscribe();
    return () => sb.removeChannel(ch);
  },
};

function demoReply(conversaId, autor) {
  const d = db(); const c = d.conversas.find((x) => x.id === conversaId); if (!c) return;
  const im = d.imoveis.find((i) => i.id === c.imovel_id);
  const nome = d.profiles.find((p) => p.id === autor)?.nome?.split(' ')[0] || 'Corretor';
  const qtd = d.mensagens.filter((m) => m.conversa_id === conversaId && m.autor_id === autor).length;
  const respostas = [
    `Olá! Aqui é ${nome}, da Alvar. Que bom que se interessou por “${im?.titulo || 'este imóvel'}”. Como posso ajudar?`,
    'Ótima pergunta! Posso te passar todos os detalhes e, se quiser, agendamos uma visita. Qual dia fica melhor para você?',
    'Perfeito, anotado! Vou confirmar a disponibilidade e te retorno por aqui. 😊',
  ];
  const m = { id: uid(), conversa_id: conversaId, autor_id: autor, texto: respostas[Math.min(qtd, respostas.length - 1)], lida: false, created_at: new Date().toISOString() };
  d.mensagens.push(m); c.ultima_msg = m.texto; c.updated_at = m.created_at; save(d);
  demoBus.forEach((fn) => fn(m));
}

let unreadSub = null;
export async function refreshUnread() {
  const b = $('#msg-count'); if (!b) return;
  if (!auth.user) { b.classList.remove('show'); return; }
  let n = 0;
  try {
    if (DEMO) { const me = auth.user.id; const d = db(); const mine = new Set(d.conversas.filter((c) => c.cliente_id === me || c.corretor_id === me).map((c) => c.id)); n = d.mensagens.filter((m) => mine.has(m.conversa_id) && !m.lida && m.autor_id !== me).length; }
    else { const { count } = await sb.from('mensagens').select('id', { count: 'exact', head: true }).eq('lida', false).neq('autor_id', auth.user.id); n = count || 0; }
  } catch { n = 0; }
  const changed = b.textContent !== String(n) && n > 0;
  b.textContent = n; b.classList.toggle('show', n > 0);
  if (changed) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
}
function watchUnread() {
  if (unreadSub) { unreadSub(); unreadSub = null; }
  if (!auth.user) return;
  unreadSub = chat.subscribe((m) => { if (m.autor_id !== auth.user?.id) setTimeout(refreshUnread, 300); });
}

// Redimensiona a imagem no navegador antes de enviar
export function compress(file, max = 1600, quality = .82, as = 'blob') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      if (as === 'dataurl') resolve(c.toDataURL('image/jpeg', quality));
      else c.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao processar imagem'))), 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('Imagem inválida'));
    img.src = URL.createObjectURL(file);
  });
}

// ---------------------------------------------------------
//  Tema claro/escuro (com transição circular)
// ---------------------------------------------------------
export function toggleTheme(ev) {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  const apply = () => { document.documentElement.dataset.theme = next; localStorage.setItem('alvar_theme', next); syncThemeIcon(); };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (ev) { document.documentElement.style.setProperty('--vt-x', ev.clientX + 'px'); document.documentElement.style.setProperty('--vt-y', ev.clientY + 'px'); }
    document.startViewTransition(apply);
  } else apply();
}
function syncThemeIcon() {
  const b = $('#theme-btn'); if (!b) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  b.innerHTML = icon(dark ? 'sun' : 'moon');
  b.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
}

// ---------------------------------------------------------
//  Header / footer / animações
// ---------------------------------------------------------
export function renderChrome(active = '') {
  const header = $('#site-header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="container nav">
      <a class="brand" href="./index.html" aria-label="Alvar Imóveis — início">${LOGO}<span>${SITE.nome}<small>Imóveis</small></span></a>
      <nav class="nav-links" id="nav-links">
        <a href="./index.html#catalogo" class="${active === 'imoveis' ? 'active' : ''}">Imóveis</a>
        <a href="./index.html?f=venda#catalogo">Comprar</a>
        <a href="./index.html?f=aluguel#catalogo">Alugar</a>
        <a href="./equipe.html" class="${active === 'equipe' ? 'active' : ''}">Equipe</a>
        <a href="./conta.html#novo" class="${active === 'anunciar' ? 'active' : ''}">Anunciar</a>
      </nav>
      <div class="nav-actions">
        <button class="btn-icon" id="theme-btn"></button>
        <a class="btn-icon fav-btn hide" id="msg-btn" href="./conta.html#chat" aria-label="Mensagens">${icon('chat')}<span class="badge" id="msg-count">0</span></a>
        <a class="btn-icon fav-btn" href="./conta.html#favoritos" aria-label="Favoritos">${icon('heart')}<span class="badge" id="fav-count">0</span></a>
        <div id="auth-slot"></div>
        <button class="btn-icon menu-toggle" id="menu-btn" aria-label="Menu">${icon('menu')}</button>
      </div>
    </div>`;
  syncThemeIcon();
  $('#theme-btn').onclick = toggleTheme;
  $('#menu-btn').onclick = () => $('#nav-links').classList.toggle('open');

  let last = 0;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('scrolled', y > 30);
    header.classList.toggle('hidden', y > 400 && y > last && !$('#nav-links').classList.contains('open'));
    last = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const footer = $('#site-footer');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="brand" href="./index.html">${LOGO}<span>${SITE.nome}<small>Imóveis</small></span></a>
            <p class="muted" style="max-width:34ch;margin-top:1rem">${esc(SITE.slogan)} Imobiliária fictícia criada para demonstração.</p>
          </div>
          <div><h4>Explorar</h4><a href="./index.html?f=venda#catalogo">Comprar</a><a href="./index.html?f=aluguel#catalogo">Alugar</a><a href="./index.html#destaques">Destaques</a></div>
          <div><h4>Alvar</h4><a href="./equipe.html">Equipe</a><a href="./conta.html#novo">Anunciar imóvel</a><a href="./conta.html">Minha conta</a><a href="./privacidade.html">Privacidade</a><a href="./termos.html">Termos</a></div>
          <div><h4>Contato</h4><a href="mailto:${SITE.email}">${SITE.email}</a><a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">WhatsApp</a><span class="muted" style="font-size:.88rem;display:block;margin-top:.3rem">${esc(SITE.endereco)}</span></div>
        </div>
        <div class="footer-big" aria-hidden="true">alvar.</div>
        <div class="footer-bottom"><span>© ${new Date().getFullYear()} Alvar Imóveis — marca fictícia.</span><span style="display:flex;gap:1.2rem;flex-wrap:wrap"><a href="./privacidade.html">Política de Privacidade</a><a href="./termos.html">Termos de Serviço</a><span>CRECI-J 0000 (fictício)</span></span></div>
      </div>`;
  }

  if (DEMO && !sessionStorage.getItem('alvar_demo_hide')) {
    const b = document.createElement('div');
    b.className = 'demo-banner';
    b.innerHTML = `<span>Modo demonstração — configure o Supabase em <b>js/config.js</b></span><button aria-label="Fechar">${icon('x')}</button>`;
    b.querySelector('button').onclick = () => { b.remove(); sessionStorage.setItem('alvar_demo_hide', '1'); };
    document.body.append(b);
  }

  onAuth(renderAuthSlot);
}

let lastWatched;
function renderAuthSlot() {
  const slot = $('#auth-slot'); if (!slot) return;
  updateFavBadge();
  $('#msg-btn')?.classList.toggle('hide', !auth.user);
  if ((auth.user?.id || null) !== lastWatched) { lastWatched = auth.user?.id || null; watchUnread(); }
  refreshUnread();
  if (!auth.user) {
    slot.innerHTML = `<button class="btn btn-sm" data-login>${icon('user')}<span>Entrar</span></button>`;
    bindLoginButtons(slot); return;
  }
  const p = auth.profile || { nome: auth.user.email };
  slot.innerHTML = `
    <div class="user-menu">
      <button id="user-btn" aria-label="Conta">${avatarHTML(p)}</button>
      <div class="dropdown" id="user-dd">
        <div class="who"><strong>${esc(p.nome || 'Minha conta')}</strong><span>${esc(p.email || auth.user.email || '')}</span><br><span class="role-pill">${esc(PAPEIS[p.papel] || 'Cliente')}</span></div>
        <a href="./conta.html#perfil">${icon('user')} Meu perfil</a>
        <a href="./conta.html#favoritos">${icon('heart')} Favoritos</a>
        <a href="./conta.html#chat">${icon('chat')} Mensagens</a>
        ${isStaff() ? `<a href="./conta.html#imoveis">${icon('grid')} Meus imóveis</a><a href="./conta.html#novo">${icon('plus')} Cadastrar imóvel</a><a href="./conta.html#leads">${icon('inbox')} Interessados</a>` : ''}
        ${isAdmin() ? `<a href="./conta.html#equipe">${icon('users')} Gerenciar equipe</a>` : ''}
        <a href="./conta.html#seguranca">${icon('shield')} Segurança</a>
        <button id="logout-btn">${icon('logout')} Sair</button>
      </div>
    </div>`;
  const dd = $('#user-dd');
  $('#user-btn').onclick = (e) => { e.stopPropagation(); dd.classList.toggle('open'); };
  document.addEventListener('click', (e) => { if (!e.target.closest('.user-menu')) dd.classList.remove('open'); });
  $('#logout-btn').onclick = signOut;
}

export function observeReveal(root = document) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px' });
  $$('.reveal:not(.in)', root).forEach((el) => io.observe(el));
}

export function cardGlow(root = document) {
  $$('.card', root).forEach((c) => c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));
}

export function cardHTML(im, i = 0) {
  const fav = favs.has(im.id);
  return `
  <article class="card reveal" style="--d:${(i % 3) * 0.08}s">
    <a href="./imovel.html?id=${encodeURIComponent(im.id)}" class="card-media">
      <img src="${esc(cover(im))}" alt="${esc(im.titulo)}" loading="lazy" data-fb>
    </a>
    <div class="card-tags">
      <span class="tag ${im.finalidade === 'venda' ? 'accent' : ''}">${FINALIDADES[im.finalidade] || ''}</span>
      ${im.status && im.status !== 'disponivel' ? `<span class="tag dark">${STATUS[im.status]}</span>` : ''}
    </div>
    <button class="heart ${fav ? 'on' : ''}" data-fav="${esc(im.id)}" aria-label="Favoritar">${icon('heart')}</button>
    <a href="./imovel.html?id=${encodeURIComponent(im.id)}" class="card-body">
      <div class="card-price">${priceLabel(im)}</div>
      <div class="card-title">${esc(im.titulo)}</div>
      <div class="card-loc">${icon('pin')} ${loc(im)}</div>
      <div class="specs">
        ${im.area_m2 ? `<span>${icon('area')} ${num(im.area_m2)} m²</span>` : ''}
        ${im.quartos ? `<span>${icon('bed')} ${im.quartos}</span>` : ''}
        ${im.banheiros ? `<span>${icon('bath')} ${im.banheiros}</span>` : ''}
        ${im.vagas ? `<span>${icon('car')} ${im.vagas}</span>` : ''}
      </div>
    </a>
  </article>`;
}

export function bindFavs(root = document) {
  $$('[data-fav]', root).forEach((b) => {
    b.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const on = await toggleFav(b.dataset.fav);
      if (on !== null) $$(`[data-fav="${CSS.escape(b.dataset.fav)}"]`).forEach((x) => x.classList.toggle('on', on));
    };
  });
}

// Mensagem amigável quando as tabelas ainda não foram criadas no Supabase
export function dbErrorHTML(e) {
  const msg = String(e?.message || e || '');
  const semTabela = /schema cache|does not exist|PGRST20|42P01|relationship/i.test(msg + (e?.code || ''));
  return `<div class="notice" style="grid-column:1/-1">${semTabela
    ? `<b>Banco ainda não configurado.</b> Abra o <b>SQL Editor</b> do seu projeto Supabase e rode o arquivo <code>supabase/schema.sql</code> (e, se quiser dados de exemplo, <code>supabase/seed.sql</code>).`
    : `<b>Não foi possível carregar os dados.</b> ${esc(msg)}`}</div>`;
}

export function finishLoading() {
  const l = $('.page-loader');
  if (l) setTimeout(() => l.classList.add('done'), 350);
}

export function countUp(el, to, dur = 1600) {
  const start = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - start) / dur);
    el.textContent = num(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
