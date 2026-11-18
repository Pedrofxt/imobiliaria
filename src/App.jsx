import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { initAuth, corretores, watchUnread, DEMO } from './lib/core.js';
import { ToastProvider, ModalProvider, useAuth, useModal, useRevealAll, OnboardingForm, Icon } from './ui/kit.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CompareBar from './components/CompareBar.jsx';
import Home from './pages/Home.jsx';
import Imovel from './pages/Imovel.jsx';
import Comparar from './pages/Comparar.jsx';
import Equipe from './pages/Equipe.jsx';
import { Privacidade, Termos } from './pages/Legal.jsx';
// a área de conta é carregada só quando alguém abre (deixa a página inicial mais leve)
const Conta = lazy(() => import('./pages/conta/Conta.jsx'));

export default function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        <Shell />
      </ModalProvider>
    </ToastProvider>
  );
}

function Shell() {
  const [ready, setReady] = useState(false);
  const a = useAuth();
  const modal = useModal();
  const { pathname, hash } = useLocation();
  const onbShown = useRef(null);
  useRevealAll();

  useEffect(() => { initAuth().then(() => setReady(true)); }, []);

  // esconde a tela de carregamento inicial
  useEffect(() => {
    if (!ready) return;
    const l = document.querySelector('.page-loader');
    if (l) setTimeout(() => l.classList.add('done'), 350);
  }, [ready]);

  // mensagens não lidas acompanham o login
  useEffect(() => { if (ready) watchUnread(); }, [ready, a.user?.id]);

  // primeiro acesso: escolher visitante ou corretor
  useEffect(() => {
    if (!ready || !a.user || !a.profile || a.profile.tipo_conta || onbShown.current === a.user.id) return;
    onbShown.current = a.user.id;
    let escolhido = null; try { escolhido = localStorage.getItem('alvar_tipo'); } catch {}
    if (escolhido === 'visitante') { corretores.escolher('visitante').catch(() => {}); return; }
    modal.open((c) => <OnboardingForm inicial={escolhido || 'visitante'} obrigatorio onDone={() => c()} />, { locked: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, a.user?.id, a.profile?.tipo_conta]);

  // rolagem ao trocar de página / âncoras
  // nova página: volta ao topo (a menos que o link aponte para uma seção)
  useEffect(() => { if (!location.hash) window.scrollTo(0, 0); }, [pathname]);
  // links com #seção rolam até ela
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 120);
  }, [pathname, hash]);

  if (!ready) return null;
  return (
    <>
      <Header />
      <Suspense fallback={<main className="page-top"><div className="container"><div className="skeleton" style={{ height: '50vh', marginTop: '2rem' }} /></div></main>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/imovel/:id" element={<Imovel />} />
        <Route path="/comparar" element={<Comparar />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/conta" element={<Conta />} />
        <Route path="/conta/:tab" element={<Conta />} />
        {/* links antigos (.html) */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/imovel.html" element={<LegacyImovel />} />
        <Route path="/conta.html" element={<LegacyConta />} />
        <Route path="/equipe.html" element={<Navigate to="/equipe" replace />} />
        <Route path="/comparar.html" element={<Navigate to="/comparar" replace />} />
        <Route path="/privacidade.html" element={<Navigate to="/privacidade" replace />} />
        <Route path="/termos.html" element={<Navigate to="/termos" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <Footer />
      {DEMO && <DemoBanner />}
      <CompareBar />
    </>
  );
}

function LegacyImovel() {
  const [sp] = useSearchParams();
  return <Navigate to={sp.get('id') ? `/imovel/${encodeURIComponent(sp.get('id'))}` : '/'} replace />;
}
function LegacyConta() {
  const [sp] = useSearchParams();
  const { hash } = useLocation();
  const tab = hash.slice(1) || '';
  const rest = new URLSearchParams(sp); const q = rest.toString();
  return <Navigate to={`/conta${tab ? '/' + tab : ''}${q ? '?' + q : ''}`} replace />;
}
function NotFound() {
  return (
    <main className="page-top"><div className="container"><div className="empty" style={{ margin: '4rem 0' }}>
      <h3>Página não encontrada</h3><p>O endereço pode ter mudado.</p>
      <a className="btn" href={import.meta.env.BASE_URL} style={{ marginTop: '1rem' }}>Ir para o início</a>
    </div></div></main>
  );
}
function DemoBanner() {
  const [hide, setHide] = useState(() => { try { return !!sessionStorage.getItem('alvar_demo_hide'); } catch { return false; } });
  if (hide) return null;
  return (
    <div className="demo-banner"><span>Modo demonstração — configure o Supabase em <b>src/lib/config.js</b></span>
      <button aria-label="Fechar" onClick={() => { setHide(true); try { sessionStorage.setItem('alvar_demo_hide', '1'); } catch {} }}><Icon name="x" /></button>
    </div>
  );
}
