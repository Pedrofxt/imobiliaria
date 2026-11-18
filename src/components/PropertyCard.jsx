import { Link } from 'react-router-dom';
import { favs, toggleFav, toggleCompare, cover, loc, num, FINALIDADES, STATUS } from '../lib/core.js';
import { Icon, Img, Price, glow, useStore } from '../ui/kit.jsx';

export default function PropertyCard({ im, i = 0 }) {
  const st = useStore();
  const fav = favs.has(im.id);
  const cmp = st.compare.includes(im.id);
  const href = `/imovel/${encodeURIComponent(im.id)}`;
  return (
    <article className="card reveal" style={{ '--d': `${(i % 3) * 0.08}s` }} onPointerMove={glow}>
      <Link to={href} className="card-media"><Img src={cover(im)} alt={im.titulo} loading="lazy" /></Link>
      <div className="card-tags">
        <span className={`tag ${im.finalidade === 'venda' ? 'accent' : ''}`}>{FINALIDADES[im.finalidade] || ''}</span>
        {im.status && im.status !== 'disponivel' && <span className="tag dark">{STATUS[im.status]}</span>}
      </div>
      <button className={`heart ${fav ? 'on' : ''}`} aria-label="Favoritar" onClick={(e) => { e.preventDefault(); toggleFav(im.id); }}><Icon name="heart" /></button>
      <button className={`cmp-btn ${cmp ? 'on' : ''}`} aria-label="Comparar" title="Comparar" onClick={(e) => { e.preventDefault(); toggleCompare(im.id); }}><Icon name="columns" /></button>
      <Link to={href} className="card-body">
        <div className="card-price"><Price im={im} /></div>
        <div className="card-title">{im.titulo}</div>
        <div className="card-loc"><Icon name="pin" /> {loc(im)}</div>
        <div className="specs">
          {im.area_m2 ? <span><Icon name="area" /> {num(im.area_m2)} m²</span> : null}
          {im.quartos ? <span><Icon name="bed" /> {im.quartos}</span> : null}
          {im.banheiros ? <span><Icon name="bath" /> {im.banheiros}</span> : null}
          {im.vagas ? <span><Icon name="car" /> {im.vagas}</span> : null}
        </div>
      </Link>
    </article>
  );
}
