// Peças de interface reaproveitadas em todo o site
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { P, PLACEHOLDER, initials, money, store, subscribe, auth, ui, signIn, corretores } from '../lib/core.js';

// ---------- Ícones e marca ----------
export function Icon({ name, className = '', style }) {
  return <svg className={`i ${className}`} style={style} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: P[name] || '' }} />;
}
export function Logo({ style, className = 'logo-mark' }) {
  return (
    <svg className={className} style={style} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 19 20 6l15 13" /><path d="M12.5 35V25a7.5 7.5 0 0 1 15 0v10" /><circle cx="20" cy="25" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
  );
}
export function Avatar({ p, size = '' }) {
  if (p?.avatar_url) return <span className={`avatar ${size}`}><img src={p.avatar_url} alt="" referrerPolicy="no-referrer" /></span>;
  return <span className={`avatar ${size}`}>{initials(p?.nome || p?.email)}</span>;
}
export function Img({ src, alt = '', ...rest }) {
  return <img src={src || PLACEHOLDER} alt={alt} onError={(e) => { if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER; }} {...rest} />;
}
export function Price({ im }) {
  return im.finalidade === 'aluguel' ? <>{money(im.preco)}<small> /mês</small></> : <>{money(im.preco)}</>;
}
export const Spinner = () => <span className="spinner" />;

// ---------- Estado observável ----------
export function useStore() {
  useSyncExternalStore(subscribe, () => store.version);
  return store;
}
export function useAuth() {
  useStore(); // toda mudança de login também incrementa store.version
  return auth;
}

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setItems((l) => [...l, { id, msg, type }]);
    setTimeout(() => setItems((l) => l.map((t) => (t.id === id ? { ...t, out: true } : t))), 3600);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4000);
  }, []);
  useEffect(() => { ui.toast = toast; }, [toast]);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'err' ? 'err' : ''} ${t.out ? 'out' : ''}`}><Icon name={t.type === 'err' ? 'x' : 'check'} /><span>{t.msg}</span></div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Janelas (modais) ----------
const ModalCtx = createContext(null);
export const useModal = () => useContext(ModalCtx);
export function ModalProvider({ children }) {
  const [stack, setStack] = useState([]);
  const open = useCallback((render, opts = {}) => {
    const id = Math.random();
    const close = () => {
      setStack((s) => s.map((m) => (m.id === id ? { ...m, closing: true } : m)));
      setTimeout(() => setStack((s) => s.filter((m) => m.id !== id)), 350);
    };
    setStack((s) => [...s, { id, render, opts, close }]);
    return close;
  }, []);
  const confirm = useCallback((texto, okLabel = 'Confirmar') => new Promise((resolve) => {
    open((close) => (
      <>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '.6rem' }}>Tem certeza?</h3>
        <p className="muted">{texto}</p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end', marginTop: '1.4rem' }}>
          <button className="btn btn-ghost" onClick={() => { close(); resolve(false); }}>Cancelar</button>
          <button className="btn btn-danger" onClick={() => { close(); resolve(true); }}>{okLabel}</button>
        </div>
      </>
    ), { onDismiss: () => resolve(false) });
  }), [open]);
  const api = { open, confirm };
  useEffect(() => {
    ui.askLogin = (motivo) => open((close) => <LoginBox motivo={motivo} onDone={close} />);
  }, [open]);
  return (
    <ModalCtx.Provider value={api}>
      {children}
      {stack.map((m) => <ModalView key={m.id} m={m} />)}
    </ModalCtx.Provider>
  );
}
function ModalView({ m }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);
  const dismiss = () => { if (m.opts.locked) return; m.opts.onDismiss?.(); m.close(); };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });
  return (
    <div className={`modal ${shown && !m.closing ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="modal-box" role="dialog" aria-modal="true">
        {!m.opts.locked && <button className="btn-icon modal-close" aria-label="Fechar" onClick={dismiss}><Icon name="x" /></button>}
        {m.render(m.close)}
      </div>
    </div>
  );
}

// ---------- Login: escolha visitante × corretor ----------
export function TipoPicker({ value, onChange }) {
  return (
    <div className="tipo-picker" role="radiogroup" aria-label="Como você quer entrar">
      {[['visitante', 'search', 'Visitante', 'Procurar imóveis, favoritar, agendar visitas e conversar.'], ['corretor', 'key', 'Corretor', 'Anunciar imóveis. Precisa da aprovação da equipe.']].map(([v, ic, t, d]) => (
        <label className="tipo-opt" key={v}>
          <input type="radio" checked={value === v} onChange={() => onChange(v)} />
          <span><Icon name={ic} /><b>{t}</b><small>{d}</small></span>
        </label>
      ))}
    </div>
  );
}
const tipoSalvo = () => { try { return localStorage.getItem('alvar_tipo') || 'visitante'; } catch { return 'visitante'; } };
export function entrarComGoogle(tipo) {
  try { localStorage.setItem('alvar_tipo', tipo); } catch {}
  return signIn();
}
export function GoogleButton({ label = 'Entrar com Google', tipo, style }) {
  return <button className="btn btn-google" style={style} onClick={() => entrarComGoogle(tipo)}><GoogleIcon /> {label}</button>;
}
function LoginBox({ motivo, onDone }) {
  const [tipo, setTipo] = useState(tipoSalvo());
  return (
    <div style={{ textAlign: 'center', padding: '.5rem 0' }}>
      <Logo style={{ width: 52, height: 52, color: 'var(--accent)', margin: '0 auto 1rem' }} />
      <h3 style={{ fontSize: '1.7rem' }}>{motivo}</h3>
      <p className="muted">Como você quer usar a Alvar?</p>
      <TipoPicker value={tipo} onChange={setTipo} />
      <button className="btn btn-google" style={{ width: '100%', marginTop: '1rem' }} onClick={async () => { await entrarComGoogle(tipo); onDone(); }}><GoogleIcon /> Continuar com Google</button>
      <p className="muted" style={{ fontSize: '.75rem', marginTop: '1rem' }}>Ao continuar, você concorda com os <a href={`${import.meta.env.BASE_URL}termos`} style={{ textDecoration: 'underline' }}>Termos</a> e a <a href={`${import.meta.env.BASE_URL}privacidade`} style={{ textDecoration: 'underline' }}>Política de Privacidade</a>.</p>
    </div>
  );
}

// ---------- Primeiro acesso / pedido de acesso de corretor ----------
export function OnboardingForm({ inicial = 'visitante', obrigatorio = true, onDone }) {
  const toast = useToast();
  const [tipo, setTipo] = useState(inicial);
  const [f, setF] = useState({ creci: auth.profile?.creci || '', telefone: auth.profile?.telefone || '', mensagem: '' });
  const [busy, setBusy] = useState(false);
  const t = obrigatorio ? tipo : 'corretor';
  const submit = async (e) => {
    e.preventDefault();
    if (t === 'corretor' && !f.creci.trim()) { toast('Informe o CRECI.', 'err'); return; }
    setBusy(true);
    try {
      const r = await corretores.escolher(t, f.creci, f.telefone, f.mensagem);
      try { localStorage.setItem('alvar_tipo', t); } catch {}
      toast(r === 'pendente' ? 'Solicitação enviada! Enquanto isso, você navega como visitante.' : 'Tudo pronto. Boas buscas!');
      onDone?.(r);
    } catch (err) { toast(err.message, 'err'); setBusy(false); }
  };
  return (
    <div>
      <span className="eyebrow">{obrigatorio ? 'Bem-vindo à Alvar' : 'Acesso de corretor'}</span>
      <h3 style={{ fontSize: '1.7rem', margin: '.3rem 0 .4rem' }}>{obrigatorio ? 'Como você vai usar a Alvar?' : 'Quero anunciar imóveis'}</h3>
      {obrigatorio && <TipoPicker value={tipo} onChange={setTipo} />}
      <form className="form" onSubmit={submit} style={{ marginTop: '1rem' }}>
        {t === 'corretor' && (
          <div>
            <div className="notice" style={{ marginBottom: '.9rem', fontSize: '.86rem' }}>Sua conta funciona como <b>visitante</b> até ser aprovada pela equipe. Você recebe a resposta por e-mail e na sua conta.</div>
            <div className="form-row stack">
              <div className="field"><label>CRECI *</label><input maxLength={40} placeholder="CRECI-PR 00.000" value={f.creci} onChange={(e) => setF({ ...f, creci: e.target.value })} /></div>
              <div className="field"><label>Telefone / WhatsApp</label><input type="tel" maxLength={40} value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></div>
            </div>
            <div className="field" style={{ marginTop: '.8rem' }}><label>Conte um pouco sobre você (opcional)</label><textarea maxLength={600} style={{ minHeight: 80 }} placeholder="Onde atua, há quanto tempo, especialidade…" value={f.mensagem} onChange={(e) => setF({ ...f, mensagem: e.target.value })} /></div>
          </div>
        )}
        <button className="btn btn-accent" type="submit" style={{ width: '100%' }} disabled={busy}>{t === 'corretor' ? 'Enviar para aprovação' : 'Continuar como visitante'}</button>
      </form>
    </div>
  );
}
export function useOnboarding() {
  const modal = useModal();
  return (inicial = 'corretor', obrigatorio = false, onDone) =>
    modal.open((close) => <OnboardingForm inicial={inicial} obrigatorio={obrigatorio} onDone={(r) => { close(); onDone?.(r); }} />, { locked: obrigatorio });
}

// ---------- Animação de entrada (.reveal) em todo o site ----------
export function useRevealAll() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px' });
    const scan = () => document.querySelectorAll('.reveal:not(.in):not([data-obs])').forEach((el) => { el.dataset.obs = '1'; io.observe(el); });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

// brilho que segue o cursor nos cartões
export const glow = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', e.clientX - r.left + 'px');
  e.currentTarget.style.setProperty('--my', e.clientY - r.top + 'px');
};

export function useMounted() { const r = useRef(true); useEffect(() => () => { r.current = false; }, []); return r; }

// mensagem amigável para erros do banco
export function DbError({ error }) {
  const msg = String(error?.message || error || '');
  const semTabela = /schema cache|does not exist|PGRST20|42P01|relationship/i.test(msg + (error?.code || ''));
  return (
    <div className="notice" style={{ gridColumn: '1/-1' }}>
      {semTabela
        ? <><b>Banco ainda não configurado.</b> Abra o <b>SQL Editor</b> do seu projeto Supabase e rode o arquivo <code>supabase/schema.sql</code>.</>
        : <><b>Não foi possível carregar os dados.</b> {msg}</>}
    </div>
  );
}
