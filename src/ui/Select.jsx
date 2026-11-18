// Lista de seleção do próprio site (substitui o <select> nativo).
// O <select> nativo abre uma caixa desenhada pelo sistema, que em alguns
// navegadores ignora o modo escuro. Esta versão segue as cores do tema.
// Uso igual ao <select>: <Select value onChange={(e) => e.target.value}><option value="x">X</option></Select>
import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const flat = (children) => {
  const out = [];
  Children.toArray(children).forEach((c) => {
    if (!isValidElement(c)) return;
    if (c.type === 'option') out.push({ value: String(c.props.value ?? ''), label: c.props.children, disabled: !!c.props.disabled });
    else if (c.props?.children) out.push(...flat(c.props.children));
  });
  return out;
};

export default function Select({ value, onChange, children, className = '', disabled, title, 'aria-label': ariaLabel, style }) {
  const opts = flat(children);
  const atual = opts.find((o) => o.value === String(value ?? '')) || opts[0];
  const [open, setOpen] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [pos, setPos] = useState(null);
  const btn = useRef(null), menu = useRef(null);

  const posicionar = () => {
    const r = btn.current?.getBoundingClientRect(); if (!r) return;
    const alturaMax = 300, abaixo = innerHeight - r.bottom, acima = r.top;
    const paraCima = abaixo < Math.min(alturaMax, opts.length * 40 + 12) && acima > abaixo;
    setPos({ left: Math.min(r.left, innerWidth - Math.max(r.width, 180) - 8), width: r.width, top: paraCima ? undefined : r.bottom + 6, bottom: paraCima ? innerHeight - r.top + 6 : undefined, max: Math.min(alturaMax, (paraCima ? acima : abaixo) - 16) });
  };
  const abrir = () => { if (disabled) return; posicionar(); setAtivo(Math.max(0, opts.indexOf(atual))); setOpen(true); };
  const fechar = () => setOpen(false);
  const escolher = (o) => { if (o.disabled) return; fechar(); btn.current?.focus(); if (o.value !== String(value ?? '')) onChange?.({ target: { value: o.value } }); };

  useLayoutEffect(() => { if (open) posicionar(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const fora = (e) => { if (!btn.current?.contains(e.target) && !menu.current?.contains(e.target)) fechar(); };
    // ao rolar a página, a lista acompanha o botão (fecha só se ele sair da tela)
    const mover = (e) => {
      if (menu.current?.contains(e.target)) return;
      const r = btn.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > innerHeight) fechar(); else posicionar();
    };
    document.addEventListener('mousedown', fora);
    addEventListener('scroll', mover, true); addEventListener('resize', fechar);
    return () => { document.removeEventListener('mousedown', fora); removeEventListener('scroll', mover, true); removeEventListener('resize', fechar); };
  }, [open]);
  useEffect(() => { if (open) menu.current?.querySelector('.dd-opt.active')?.scrollIntoView({ block: 'nearest' }); }, [open, ativo]);

  const teclado = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((i) => Math.min(opts.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setAtivo(0); }
    else if (e.key === 'End') { e.preventDefault(); setAtivo(opts.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (opts[ativo]) escolher(opts[ativo]); }
    else if (e.key === 'Tab') fechar();
  };

  return (
    <>
      <button type="button" ref={btn} className={`dd-btn ${className} ${open ? 'open' : ''}`} style={style} disabled={disabled} title={title}
        aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => (open ? fechar() : abrir())} onKeyDown={teclado}>
        <span className="dd-val">{atual?.label}</span>
        {!className.includes('select') && <svg className="dd-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>}
      </button>
      {open && pos && createPortal(
        <ul ref={menu} className="dd-menu" role="listbox" aria-label={ariaLabel}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: Math.max(pos.width, 180), maxHeight: pos.max }}>
          {opts.map((o, i) => (
            <li key={o.value + i} role="option" aria-selected={o === atual} aria-disabled={o.disabled || undefined}
              className={`dd-opt ${o === atual ? 'sel' : ''} ${i === ativo ? 'active' : ''} ${o.disabled ? 'off' : ''}`}
              onMouseEnter={() => setAtivo(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(o)}>
              <span>{o.label}</span>
              {o === atual && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  );
}
