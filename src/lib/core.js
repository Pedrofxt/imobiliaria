// =========================================================
//  ALVAR — camada de dados: Supabase, auth, API (sem DOM)
//  A interface (React) se inscreve via subscribe() / onAuth().
// =========================================================
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET, SITE } from './config.js';
import { DEMO_PROFILES, DEMO_IMOVEIS } from './demo-data.js';

export { SITE };
export const DEMO = !SUPABASE_URL || SUPABASE_URL.includes('SEU-PROJETO') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('SUA-CHAVE');
export const sb = DEMO ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });

// Ganchos de interface, preenchidos pelo React (toasts e pedido de login)
export const ui = { toast: () => {}, askLogin: () => {} };

// Estado observável (favoritos, não lidas, comparação) para o React
export const store = { version: 0, unread: 0, compare: [] };
const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
function bump() { store.version++; subs.forEach((fn) => fn()); }

// ---------------------------------------------------------
//  Utilidades
// ---------------------------------------------------------
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
export const PAPEIS = { cliente: 'Visitante', corretor: 'Corretor', admin: 'Administrador' };
export const COMODIDADES = ['Piscina', 'Churrasqueira', 'Varanda', 'Terraço', 'Jardim', 'Quintal', 'Academia', 'Salão de festas', 'Portaria 24h', 'Elevador', 'Pet friendly', 'Mobiliado', 'Ar-condicionado', 'Energia solar', 'Automação', 'Vista para o mar', 'Condomínio fechado', 'Closet', 'Lareira', 'Espaço gourmet'];

export const loc = (im) => [im.bairro, im.cidade].filter(Boolean).join(', ');
export const priceText = (im) => (im.finalidade === 'aluguel' ? `${money(im.preco)}/mês` : money(im.preco));
export const cover = (im) => (im.imovel_fotos && im.imovel_fotos[0]?.url) || PLACEHOLDER;
export const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9DFD2"/><stop offset="1" stop-color="#CFDAD3"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><g fill="none" stroke="#B8552F" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"><path d="M150 150 200 110 250 150"/><path d="M172 200v-28a28 28 0 0 1 56 0v28"/></g></svg>`);

// ---------------------------------------------------------
//  Ícones (traço estilo lucide)
// ---------------------------------------------------------
export const P = {
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
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  map: '<path d="M14.1 6.3 9.9 4.2a2 2 0 0 0-1.8 0L3.6 6.5A1 1 0 0 0 3 7.4v12.2a1 1 0 0 0 1.4.9l3.7-1.9a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.3a1 1 0 0 0 .6-.9V5.4a1 1 0 0 0-1.4-.9l-3.7 1.9a2 2 0 0 1-1.8 0z"/><path d="M15 6.8v14"/><path d="M9 3.2v14"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
};

// ---------------------------------------------------------
//  Banco local do modo demonstração
// ---------------------------------------------------------
const LS = 'alvar_demo_v3';
function db() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(LS)); } catch {}
  if (!d) { d = { profiles: structuredClone(DEMO_PROFILES), imoveis: structuredClone(DEMO_IMOVEIS), favoritos: [], leads: [], user: null }; save(d); }
  d.conversas ||= []; d.mensagens ||= [];
  if (!d.solicitacoes) {
    d.profiles.forEach((p) => { if (['corretor', 'admin'].includes(p.papel)) p.tipo_conta ||= 'corretor'; });
    d.profiles.push({ id: 'p-bruno', nome: 'Bruno Lacerda', email: 'bruno.lacerda@email.com', telefone: '41988887777', creci: 'CRECI-PR 71.508', cargo: '', bio: '', papel: 'cliente', tipo_conta: 'corretor', avatar_url: null });
    d.solicitacoes = [{ id: 's-bruno', user_id: 'p-bruno', creci: 'CRECI-PR 71.508', telefone: '41988887777', mensagem: 'Atuo há 6 anos com locação em Paranaguá e Pontal. Gostaria de anunciar pela Alvar.', status: 'pendente', created_at: new Date(Date.now() - 3600e3).toISOString() }];
    d.votos = [];
  }
  return d;
}
function save(d) {
  try { localStorage.setItem(LS, JSON.stringify(d)); }
  catch { ui.toast('Armazenamento do navegador cheio — use fotos menores no modo demo.', 'err'); throw new Error('quota'); }
}
const hydrate = (im, d) => ({ ...im, imovel_fotos: [...(im.imovel_fotos || [])].sort((a, b) => a.ordem - b.ordem), responsavel: d.profiles.find((p) => p.id === im.responsavel_id) || null });

// ---------------------------------------------------------
//  Autenticação
// ---------------------------------------------------------
export const auth = { user: null, profile: null, ready: false };
const listeners = new Set();
export const onAuth = (fn) => { listeners.add(fn); if (auth.ready) fn(auth); return () => listeners.delete(fn); };
const emit = () => { listeners.forEach((fn) => fn(auth)); bump(); };
export const reloadProfile = async () => { await loadProfile(); emit(); };
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
    if (!d.profiles.find((p) => p.id === id)) d.profiles.push({ id, nome: 'Visitante Demo', email: 'demo@alvar.app', telefone: '', creci: '', cargo: 'Administrador (demo)', bio: '', papel: 'admin', tipo_conta: 'corretor', avatar_url: null });
    d.user = { id, email: 'demo@alvar.app' };
    save(d);
    auth.user = d.user; await loadProfile(); await refreshFavs(); emit();
    ui.toast('Você entrou no modo demonstração como administrador.');
    return;
  }
  const redirectTo = location.origin + location.pathname + location.search;
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) ui.toast(error.message, 'err');
}

export async function signInWithPassword(email, password) {
  if (DEMO) { await signIn(); return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
}

export const providers = () => auth.user?.app_metadata?.providers || (DEMO ? ['google'] : []);

export async function signOut() {
  if (DEMO) { const d = db(); d.user = null; save(d); auth.user = null; auth.profile = null; favs.clear(); emit(); ui.toast('Sessão encerrada.'); return; }
  await sb.auth.signOut();
  auth.user = null; auth.profile = null; favs.clear(); emit();
  ui.toast('Sessão encerrada.');
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
  if (!auth.user) { ui.askLogin('Salve seus imóveis favoritos'); return null; }
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
    ui.toast(on ? 'Salvo nos favoritos' : 'Removido dos favoritos');
  } catch (e) {
    on ? favs.delete(id) : favs.add(id); updateFavBadge();
    ui.toast(e.message || 'Não foi possível atualizar', 'err');
  }
  return favs.has(id);
}
function updateFavBadge() { bump(); }

// ---------------------------------------------------------
//  API de dados (Supabase ou demo)
// ---------------------------------------------------------
const SEL = '*, imovel_fotos(id,url,path,ordem), responsavel:profiles!imoveis_responsavel_fk(id,nome,email,telefone,creci,cargo,avatar_url,bio,papel)';
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
    // só corretores: administradores não são responsáveis por imóveis
    if (DEMO) return db().profiles.filter((p) => p.papel === 'corretor');
    return must(await sb.from('profiles').select('*').eq('papel', 'corretor').order('nome'));
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
  async setLeadEtapa(id, etapa) {
    if (DEMO) { const d = db(); const l = d.leads.find((x) => x.id === id); if (l) l.etapa = etapa; save(d); return; }
    must(await sb.from('leads').update({ etapa }).eq('id', id));
  },
  async setSituacao(id, situacao, motivo = null) {
    if (DEMO) { const d = db(); const i = d.imoveis.find((x) => x.id === id); i.situacao = situacao; i.motivo_rejeicao = motivo; save(d); return; }
    must(await sb.from('imoveis').update({ situacao, motivo_rejeicao: motivo }).eq('id', id));
  },
  async registerView(imovelId) {
    const k = 'alvar_view_' + imovelId;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch {}
    if (DEMO) { const d = db(); d.views ||= []; d.views.push({ imovel_id: imovelId, created_at: new Date().toISOString() }); save(d); return; }
    await sb.from('visualizacoes').insert({ imovel_id: imovelId });
  },
  async stats(dias = 30) {
    if (DEMO) {
      const d = db(); const since = Date.now() - dias * 864e5;
      return d.imoveis.filter((i) => isAdmin() || i.responsavel_id === auth.user.id || i.criado_por === auth.user.id).map((i) => ({
        imovel_id: i.id,
        views: demoNum(i.id, 40, 420) + (d.views || []).filter((v) => v.imovel_id === i.id && Date.parse(v.created_at) > since).length,
        favoritos: demoNum(i.id + 'f', 2, 38) + d.favoritos.filter((f) => f.imovel_id === i.id).length,
        leads: demoNum(i.id + 'l', 0, 9) + d.leads.filter((l) => l.imovel_id === i.id).length,
        visitas: demoNum(i.id + 'v', 0, 5) + (d.visitas || []).filter((v) => v.imovel_id === i.id).length,
      }));
    }
    return must(await sb.rpc('stats_imoveis', { dias }));
  },
  async viewsPorDia(dias = 14) {
    if (DEMO) {
      const out = [];
      for (let k = dias - 1; k >= 0; k--) { const dt = new Date(Date.now() - k * 864e5); out.push({ dia: dt.toISOString().slice(0, 10), total: demoNum(dt.toDateString(), 18, 95) + (k < 2 ? 0 : 0) }); }
      return out;
    }
    return must(await sb.rpc('views_por_dia', { dias }));
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
    if (!auth.user) { ui.askLogin('Entre para conversar com o corretor'); return null; }
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
  let n = 0;
  if (auth.user) {
    try {
      if (DEMO) { const me = auth.user.id; const d = db(); const mine = new Set(d.conversas.filter((c) => c.cliente_id === me || c.corretor_id === me).map((c) => c.id)); n = d.mensagens.filter((m) => mine.has(m.conversa_id) && !m.lida && m.autor_id !== me).length; }
      else { const { count } = await sb.from('mensagens').select('id', { count: 'exact', head: true }).eq('lida', false).neq('autor_id', auth.user.id); n = count || 0; }
    } catch { n = 0; }
  }
  if (store.unread !== n) { store.unread = n; bump(); }
}
let watchedUser = null;
export function watchUnread() {
  if ((auth.user?.id || null) === watchedUser) return;
  watchedUser = auth.user?.id || null;
  if (unreadSub) { unreadSub(); unreadSub = null; }
  refreshUnread();
  if (!auth.user) return;
  unreadSub = chat.subscribe((m) => { if (m.autor_id !== auth.user?.id) setTimeout(refreshUnread, 300); });
}

// ---------------------------------------------------------
//  Visitas agendadas
// ---------------------------------------------------------
export const visitas = {
  async ocupados(imovelId) {
    if (DEMO) return (db().visitas || []).filter((v) => v.imovel_id === imovelId && ['pendente', 'confirmada'].includes(v.status)).map((v) => v.data_hora);
    const { data, error } = await sb.rpc('horarios_ocupados', { _imovel: imovelId });
    if (error) return [];
    return (data || []).map((r) => (typeof r === 'string' ? r : Object.values(r)[0]));
  },
  async create({ imovel_id, data_hora, observacao }) {
    if (!auth.user) { ui.askLogin('Entre para agendar uma visita'); return null; }
    if (DEMO) {
      const d = db(); d.visitas ||= [];
      const im = d.imoveis.find((i) => i.id === imovel_id);
      const corretor = im.responsavel_id || d.profiles.find((p) => p.papel === 'admin' && p.id !== auth.user.id)?.id;
      if (corretor === auth.user.id) throw new Error('Você é o responsável por este imóvel.');
      if (d.visitas.some((v) => v.imovel_id === imovel_id && v.data_hora === data_hora && ['pendente', 'confirmada'].includes(v.status))) throw new Error('Esse horário acabou de ser reservado. Escolha outro.');
      const v = { id: 'v-' + uid().slice(0, 8), imovel_id, cliente_id: auth.user.id, corretor_id: corretor, data_hora, observacao, status: 'pendente', created_at: new Date().toISOString() };
      d.visitas.push(v); save(d);
      if (corretor?.startsWith('p-')) setTimeout(() => { const dd = db(); const x = dd.visitas.find((y) => y.id === v.id); if (x && x.status === 'pendente') { x.status = 'confirmada'; save(dd); } }, 4000);
      return v;
    }
    const { data, error } = await sb.from('visitas').insert({ imovel_id, data_hora, observacao }).select('*').single();
    if (error) throw new Error(error.message);
    return data;
  },
  async list() {
    const me = auth.user.id;
    if (DEMO) {
      const d = db();
      return (d.visitas || []).filter((v) => v.cliente_id === me || v.corretor_id === me || isAdmin()).map((v) => {
        const im = d.imoveis.find((i) => i.id === v.imovel_id);
        return { ...v, imovel: im ? hydrate(im, d) : null, cliente: d.profiles.find((p) => p.id === v.cliente_id), corretor: d.profiles.find((p) => p.id === v.corretor_id) };
      }).sort((a, b) => a.data_hora.localeCompare(b.data_hora));
    }
    const data = must(await sb.from('visitas').select('*, imovel:imoveis(id,titulo,bairro,cidade,endereco,imovel_fotos(url,ordem)), cliente:profiles!visitas_cliente_fk(id,nome,email,telefone,avatar_url), corretor:profiles!visitas_corretor_fk(id,nome,email,telefone,avatar_url)').order('data_hora'));
    data.forEach((v) => v.imovel && sortFotos(v.imovel));
    return data;
  },
  async setStatus(id, status) {
    if (DEMO) { const d = db(); const v = d.visitas.find((x) => x.id === id); v.status = status; save(d); return; }
    must(await sb.from('visitas').update({ status }).eq('id', id));
  },
};
export const VISITA_STATUS = { pendente: 'Aguardando confirmação', confirmada: 'Confirmada', recusada: 'Recusada', cancelada: 'Cancelada', realizada: 'Realizada' };

// ---------------------------------------------------------
//  Buscas salvas
// ---------------------------------------------------------
export const buscas = {
  async list() {
    if (DEMO) return (db().buscas || []).filter((b) => b.user_id === auth.user.id);
    return must(await sb.from('buscas_salvas').select('*').order('created_at', { ascending: false }));
  },
  async create(nome, filtros, alerta_email = true) {
    if (!auth.user) { ui.askLogin('Entre para salvar buscas e receber alertas'); return null; }
    const row = { nome, filtros, alerta_email };
    if (DEMO) { const d = db(); d.buscas ||= []; const b = { ...row, id: uid(), user_id: auth.user.id, visto_em: new Date().toISOString(), created_at: new Date().toISOString() }; d.buscas.unshift(b); save(d); return b; }
    return must(await sb.from('buscas_salvas').insert(row).select('*').single());
  },
  async update(id, patch) {
    if (DEMO) { const d = db(); Object.assign(d.buscas.find((b) => b.id === id), patch); save(d); return; }
    must(await sb.from('buscas_salvas').update(patch).eq('id', id));
  },
  async remove(id) {
    if (DEMO) { const d = db(); d.buscas = d.buscas.filter((b) => b.id !== id); save(d); return; }
    must(await sb.from('buscas_salvas').delete().eq('id', id));
  },
};

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function matchFiltros(f, i) {
  const q = norm(f.q);
  return (!f.fin || i.finalidade === f.fin) && (!f.tipo || i.tipo === f.tipo) && (i.quartos || 0) >= (+f.quartos || 0) &&
    (!f.preco || Number(i.preco) <= Number(f.preco)) &&
    (!q || norm(`${i.titulo} ${i.bairro} ${i.cidade} ${i.descricao} ${(i.comodidades || []).join(' ')}`).includes(q));
}
export function filtrosLabel(f) {
  const p = [];
  if (f.tipo) p.push(TIPOS[f.tipo]);
  if (f.fin) p.push(f.fin === 'venda' ? 'Comprar' : 'Alugar');
  if (+f.quartos) p.push(`${f.quartos}+ quartos`);
  if (f.preco) p.push(`até ${money(f.preco)}`);
  if (f.q) p.push(`“${f.q}”`);
  return p.length ? p : ['Todos os imóveis'];
}
export const isPublicado = (im) => !im.situacao || im.situacao === 'publicado';
export const SITUACOES = { rascunho: 'Rascunho', pendente: 'Aguardando aprovação', publicado: 'Publicado', rejeitado: 'Rejeitado' };
export const ETAPAS = { novo: 'Novo', contato: 'Em contato', visita: 'Visita', proposta: 'Proposta', fechado: 'Fechado', perdido: 'Perdido' };

function demoNum(seed, min, max) {
  let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return min + (Math.abs(h) % (max - min + 1));
}

// ---------------------------------------------------------
//  Comparar imóveis (até 3, guardado no navegador)
// ---------------------------------------------------------
const CMP = 'alvar_compare';
export function getCompare() { try { return JSON.parse(localStorage.getItem(CMP)) || []; } catch { return []; } }
function setCompare(list) { try { localStorage.setItem(CMP, JSON.stringify(list)); } catch {} store.compare = list; bump(); }
export function toggleCompare(id) {
  let l = getCompare();
  if (l.includes(id)) l = l.filter((x) => x !== id);
  else { if (l.length >= 3) { ui.toast('Compare até 3 imóveis por vez.', 'err'); return false; } l.push(id); }
  setCompare(l);
  return l.includes(id);
}
export function clearCompare() { setCompare([]); }

// ---------------------------------------------------------
//  Mapa (Leaflet + OpenStreetMap)
// ---------------------------------------------------------
let leafletP = null;
export function loadLeaflet() {
  if (!leafletP) leafletP = Promise.all([
    import('leaflet'), import('leaflet/dist/leaflet.css'),
    import('leaflet/dist/images/marker-icon.png'), import('leaflet/dist/images/marker-icon-2x.png'), import('leaflet/dist/images/marker-shadow.png'),
  ]).then(([m, , i1, i2, sh]) => {
    const L = m.default || m;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({ iconUrl: i1.default, iconRetinaUrl: i2.default, shadowUrl: sh.default });
    return L;
  });
  return leafletP;
}
export function tileLayer(L) {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
}
export function priceShort(im) {
  const v = Number(im.preco) || 0;
  const f = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const t = v >= 1e6 ? `R$ ${f(v / 1e6)} mi` : v >= 1e3 ? `R$ ${f(v / 1e3)} mil` : money(v);
  return im.finalidade === 'aluguel' ? t + '/mês' : t;
}
export async function geocode(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'pt-BR' } });
  const j = await r.json();
  return j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null;
}


// ---------------------------------------------------------
//  Visitante × corretor: solicitações, votos e configurações
// ---------------------------------------------------------
export const corretores = {
  async escolher(tipo, creci = null, telefone = null, mensagem = null) {
    if (DEMO) {
      const d = db(); const p = d.profiles.find((x) => x.id === auth.user.id);
      if (['corretor', 'admin'].includes(p.papel)) { p.tipo_conta = 'corretor'; save(d); await loadProfile(); return 'equipe'; }
      if (tipo === 'visitante') { p.tipo_conta ||= 'visitante'; save(d); await loadProfile(); return 'visitante'; }
      p.tipo_conta = 'corretor'; p.creci = creci; if (telefone) p.telefone = telefone;
      d.solicitacoes ||= []; d.votos ||= [];
      d.solicitacoes = d.solicitacoes.filter((x) => x.user_id !== p.id);
      d.solicitacoes.push({ id: 's-' + uid().slice(0, 8), user_id: p.id, creci, telefone, mensagem, status: 'pendente', created_at: new Date().toISOString() });
      save(d); await loadProfile(); return 'pendente';
    }
    const { data, error } = await sb.rpc('escolher_tipo_conta', { _tipo: tipo, _creci: creci, _telefone: telefone, _mensagem: mensagem });
    if (error) throw new Error(error.message);
    await loadProfile(); emit();
    return data;
  },
  async minha() {
    if (DEMO) return (db().solicitacoes || []).find((x) => x.user_id === auth.user.id) || null;
    const { data } = await sb.from('solicitacoes_corretor').select('*').eq('user_id', auth.user.id).maybeSingle();
    return data;
  },
  async votosDe(solId) {
    if (DEMO) return (db().votos || []).filter((v) => v.solicitacao_id === solId);
    return must(await sb.from('votos_corretor').select('*').eq('solicitacao_id', solId));
  },
  async list() {
    if (DEMO) {
      const d = db();
      return (d.solicitacoes || []).map((s) => ({ ...s, perfil: d.profiles.find((p) => p.id === s.user_id), votos: (d.votos || []).filter((v) => v.solicitacao_id === s.id).map((v) => ({ ...v, aprovador: d.profiles.find((p) => p.id === v.aprovador_id) })) }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return must(await sb.from('solicitacoes_corretor').select('*, perfil:profiles!solicitacoes_corretor_user_id_fkey(id,nome,email,avatar_url,telefone), votos:votos_corretor(voto,aprovador_id,created_at,aprovador:profiles!votos_corretor_aprovador_id_fkey(id,nome))').order('created_at', { ascending: false }));
  },
  async votar(solId, voto) {
    if (DEMO) {
      const d = db(); const s = d.solicitacoes.find((x) => x.id === solId); const cfg = d.config || { quem_aprova: 'equipe', aprovacoes_necessarias: 1 };
      if (s.user_id === auth.user.id) throw new Error('Você não pode votar na própria solicitação');
      d.votos = (d.votos || []).filter((v) => !(v.solicitacao_id === solId && v.aprovador_id === auth.user.id));
      d.votos.push({ solicitacao_id: solId, aprovador_id: auth.user.id, voto, created_at: new Date().toISOString() });
      const sim = d.votos.filter((v) => v.solicitacao_id === solId && v.voto === 'aprovar').length;
      const nao = d.votos.filter((v) => v.solicitacao_id === solId && v.voto === 'rejeitar').length;
      const adm = isAdmin();
      if ((adm && voto === 'aprovar') || sim >= cfg.aprovacoes_necessarias) { s.status = 'aprovada'; const p = d.profiles.find((x) => x.id === s.user_id); if (p && p.papel === 'cliente') { p.papel = 'corretor'; p.tipo_conta = 'corretor'; p.creci ||= s.creci; } }
      else if ((adm && voto === 'rejeitar') || nao >= cfg.aprovacoes_necessarias) s.status = 'rejeitada';
      s.decidido_em = s.status !== 'pendente' ? new Date().toISOString() : null;
      save(d); return s.status;
    }
    const { data, error } = await sb.rpc('votar_corretor', { _solicitacao: solId, _voto: voto });
    if (error) throw new Error(error.message);
    return data;
  },
  async config() {
    if (DEMO) return db().config || { quem_aprova: 'equipe', aprovacoes_necessarias: 1 };
    const { data } = await sb.from('configuracoes').select('*').eq('id', 1).maybeSingle();
    return data || { quem_aprova: 'equipe', aprovacoes_necessarias: 1 };
  },
  async salvarConfig(patch) {
    if (DEMO) { const d = db(); d.config = { ...(d.config || { quem_aprova: 'equipe', aprovacoes_necessarias: 1 }), ...patch }; save(d); return; }
    must(await sb.from('configuracoes').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1));
  },
};
export const podeAprovar = (cfg) => isAdmin() || (auth.profile?.papel === 'corretor' && (cfg?.quem_aprova || 'equipe') === 'equipe');

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

store.compare = getCompare();
