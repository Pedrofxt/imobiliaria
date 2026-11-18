import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, num, cover, loc, toggleCompare, clearCompare, isPublicado, TIPOS, FINALIDADES, STATUS } from '../lib/core.js';
import { Icon, Img, Price, DbError, useStore } from '../ui/kit.jsx';

// custo mensal estimado: aluguel + condomínio + IPTU (IPTU anual ÷ 12 na venda)
const mensal = (im) => (im.finalidade === 'aluguel' ? Number(im.preco) + Number(im.iptu || 0) : Number(im.iptu || 0) / 12) + Number(im.condominio || 0);
const m2 = (im) => (im.area_m2 ? Number(im.preco) / Number(im.area_m2) : null);

export default function Comparar() {
  const st = useStore();
  const [all, setAll] = useState(null);
  const [erro, setErro] = useState(null);
  useEffect(() => { api.listImoveis().then(setAll).catch(setErro); }, []);
  const ids = st.compare;
  useEffect(() => {
    if (!all) return;
    ids.filter((id) => !all.some((i) => i.id === id && isPublicado(i))).forEach((id) => toggleCompare(id));
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  let corpo;
  if (!ids.length) corpo = <div className="empty"><h3>Nada para comparar ainda</h3><p>No catálogo, toque no ícone <Icon name="columns" /> dos imóveis que quer comparar.</p><Link className="btn" to="/#catalogo" style={{ marginTop: '1rem' }}>Ir ao catálogo</Link></div>;
  else if (erro) corpo = <DbError error={erro} />;
  else if (!all) corpo = <div className="skeleton" style={{ height: 420 }} />;
  else {
    const list = ids.map((id) => all.find((i) => i.id === id)).filter((i) => i && isPublicado(i));
    const best = (fn, dir) => {
      const vals = list.map(fn).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
      if (list.length < 2 || !vals.length) return () => false;
      const target = dir === 'min' ? Math.min(...vals) : Math.max(...vals);
      return (im) => fn(im) === target;
    };
    const mixed = new Set(list.map((i) => i.finalidade)).size > 1;
    const rows = [
      ['Preço', (im) => <Price im={im} />, mixed ? null : best((im) => Number(im.preco), 'min')],
      ['Preço por m²', (im) => (m2(im) ? money(m2(im)) + (im.finalidade === 'aluguel' ? '/mês' : '') : '—'), mixed ? null : best(m2, 'min')],
      ['Custo mensal estimado', (im) => money(mensal(im)), mixed ? null : best(mensal, 'min')],
      ['Condomínio', (im) => (im.condominio ? money(im.condominio) : '—')],
      ['IPTU', (im) => (im.iptu ? money(im.iptu) + (im.finalidade === 'aluguel' ? '/mês' : '/ano') : '—')],
      ['Finalidade', (im) => FINALIDADES[im.finalidade]],
      ['Tipo', (im) => TIPOS[im.tipo]],
      ['Situação', (im) => STATUS[im.status] || 'Disponível'],
      ['Área', (im) => (im.area_m2 ? `${num(im.area_m2)} m²` : '—'), best((im) => Number(im.area_m2) || null, 'max')],
      ['Quartos', (im) => im.quartos || 0, best((im) => im.quartos || 0, 'max')],
      ['Suítes', (im) => im.suites || 0, best((im) => im.suites || 0, 'max')],
      ['Banheiros', (im) => im.banheiros || 0, best((im) => im.banheiros || 0, 'max')],
      ['Vagas', (im) => im.vagas || 0, best((im) => im.vagas || 0, 'max')],
      ['Localização', (im) => loc(im)],
      ['Responsável', (im) => im.responsavel?.nome || '—'],
    ];
    const coms = [...new Set(list.flatMap((i) => i.comodidades || []))].sort((a, b) => a.localeCompare(b));
    const vago = list.length < 3;
    corpo = (
      <>
        {mixed && <div className="notice" style={{ marginBottom: '1rem' }}>Você está comparando imóveis de venda e de aluguel — os preços não são comparáveis entre si.</div>}
        <div className="table-wrap reveal"><table className="cmp-table">
          <thead><tr><th />{list.map((im) => (
            <td className="cmp-head" key={im.id}>
              <Link to={`/imovel/${encodeURIComponent(im.id)}`}><Img src={cover(im)} /></Link>
              <Link className="t" to={`/imovel/${encodeURIComponent(im.id)}`}>{im.titulo}</Link>
              <button className="btn btn-ghost btn-sm rm" onClick={() => toggleCompare(im.id)}><Icon name="x" /> Remover</button>
            </td>
          ))}{vago && <td className="cmp-head"><Link className="empty" to="/#catalogo" style={{ display: 'grid', placeItems: 'center', aspectRatio: '4/3', padding: '1rem' }}><Icon name="plus" /><span style={{ fontSize: '.85rem' }}>Adicionar imóvel</span></Link></td>}</tr></thead>
          <tbody>
            {rows.map(([label, fn, isBest]) => <tr key={label}><th>{label}</th>{list.map((im) => <td key={im.id} className={isBest && isBest(im) ? 'best' : ''}>{fn(im)}</td>)}{vago && <td />}</tr>)}
            {coms.length > 0 && <tr><th colSpan={list.length + 1 + (vago ? 1 : 0)} style={{ background: 'var(--bg-2)' }}>Comodidades</th></tr>}
            {coms.map((c) => <tr key={c}><th>{c}</th>{list.map((im) => <td key={im.id}>{(im.comodidades || []).includes(c) ? <span className="yes"><Icon name="check" /></span> : <span className="no">—</span>}</td>)}{vago && <td />}</tr>)}
          </tbody>
        </table></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}><button className="btn btn-ghost btn-sm" onClick={clearCompare}><Icon name="trash" /> Limpar comparação</button></div>
      </>
    );
  }
  return (
    <main className="page-top">
      <section className="section" style={{ paddingTop: '3rem' }}>
        <div className="container">
          <div className="section-head reveal">
            <div><span className="eyebrow">Comparar</span><h2>Lado a lado, sem achismo.</h2></div>
            <p>Até 3 imóveis. Os melhores valores em cada linha ficam destacados com ★.</p>
          </div>
          <div id="cmp">{corpo}</div>
        </div>
      </section>
    </main>
  );
}
