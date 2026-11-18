import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clearCompare } from '../lib/core.js';
import { Icon, useStore } from '../ui/kit.jsx';

// barra flutuante "N imóveis para comparar"
export default function CompareBar() {
  const st = useStore();
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const n = st.compare.length;
  const oculto = pathname.startsWith('/comparar') || pathname.startsWith('/conta');
  useEffect(() => { const r = requestAnimationFrame(() => setShow(n > 0)); return () => cancelAnimationFrame(r); }, [n]);
  if (oculto || !n) return null;
  return (
    <div className={`cmp-bar ${show ? 'show' : ''}`} id="cmp-bar">
      <Icon name="columns" /><span><b>{n}</b> {n === 1 ? 'imóvel' : 'imóveis'} para comparar</span>
      <Link className="btn btn-accent btn-sm" to="/comparar">Comparar</Link>
      <button className="btn-icon" aria-label="Limpar" onClick={clearCompare}><Icon name="x" /></button>
    </div>
  );
}
