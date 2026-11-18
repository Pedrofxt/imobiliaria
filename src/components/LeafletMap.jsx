import { useEffect, useRef, useState } from 'react';
import { loadLeaflet, tileLayer, priceShort, cover, loc, money } from '../lib/core.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pin = (L, im) => L.divIcon({ className: '', html: `<span class="price-pin ${im.finalidade}">${esc(priceShort(im))}</span>`, iconSize: [0, 0] });

// mapa com marcadores de preço (catálogo e página do imóvel)
export function MapaImoveis({ imoveis, className = 'map-view', single = false, base = import.meta.env.BASE_URL }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null);
  const [erro, setErro] = useState(null);
  useEffect(() => {
    let vivo = true;
    loadLeaflet().then((L) => {
      if (!vivo || !el.current) return;
      if (!map.current) {
        map.current = L.map(el.current, { scrollWheelZoom: !single }).setView([-25.52, -48.51], 12);
        tileLayer(L).addTo(map.current);
      }
      setTimeout(() => map.current?.invalidateSize(), 60);
      layer.current?.remove();
      layer.current = L.layerGroup().addTo(map.current);
      const pts = imoveis.filter((i) => i.latitude && i.longitude);
      pts.forEach((im) => {
        const m = L.marker([im.latitude, im.longitude], { icon: pin(L, im), title: im.titulo }).addTo(layer.current);
        if (!single) {
          const preco = im.finalidade === 'aluguel' ? `${money(im.preco)}<small> /mês</small>` : money(im.preco);
          m.bindPopup(`<a class="map-pop" href="${base}imovel/${encodeURIComponent(im.id)}"><img src="${esc(cover(im))}" alt=""><div><b>${preco}</b><span>${esc(im.titulo)}</span><small>${esc(loc(im))}</small></div></a>`, { closeButton: false, offset: [0, -22] });
        }
      });
      if (single && pts[0]) map.current.setView([pts[0].latitude, pts[0].longitude], 15);
      else if (pts.length) map.current.fitBounds(L.latLngBounds(pts.map((i) => [i.latitude, i.longitude])), { padding: [50, 50], maxZoom: 15 });
    }).catch((e) => setErro(e.message || 'Não foi possível carregar o mapa'));
    return () => { vivo = false; };
  }, [imoveis, single, base]);
  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);
  if (erro) return <div className={className}><div className="empty" style={{ height: '100%', display: 'grid', placeItems: 'center' }}>{erro}</div></div>;
  return <div ref={el} className={className} />;
}

// mapa do formulário: clique ou arraste o marcador para definir a posição
export function MapaSeletor({ lat, lng, onChange }) {
  const el = useRef(null), map = useRef(null), mk = useRef(null), Lr = useRef(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let vivo = true;
    loadLeaflet().then((L) => {
      if (!vivo || !el.current || map.current) return;
      Lr.current = L;
      map.current = L.map(el.current, { scrollWheelZoom: false }).setView(lat ? [lat, lng] : [-25.52, -48.51], lat ? 16 : 12);
      tileLayer(L).addTo(map.current);
      map.current.on('click', (e) => onChange(e.latlng.lat, e.latlng.lng, false));
    }).catch(() => setErro(true));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);
  // sincroniza o marcador com a posição
  useEffect(() => {
    const L = Lr.current; if (!L || !map.current || !lat) return;
    if (!mk.current) {
      mk.current = L.marker([lat, lng], { draggable: true }).addTo(map.current);
      mk.current.on('dragend', () => { const p = mk.current.getLatLng(); onChange(p.lat, p.lng, false); });
    } else mk.current.setLatLng([lat, lng]);
  });
  // centralizar quando a posição vem de uma busca
  MapaSeletor.pan = (la, ln) => map.current?.setView([la, ln], 16);
  if (erro) return <div className="mini-map"><p className="muted" style={{ padding: '1rem' }}>Não foi possível carregar o mapa.</p></div>;
  return <div ref={el} className="mini-map" />;
}
