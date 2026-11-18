import { Link } from 'react-router-dom';
import { SITE } from '../lib/core.js';
import { Logo } from '../ui/kit.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="brand" to="/"><Logo /><span>{SITE.nome}<small>Imóveis</small></span></Link>
            <p className="muted" style={{ maxWidth: '34ch', marginTop: '1rem' }}>{SITE.slogan} Imobiliária fictícia criada para demonstração.</p>
          </div>
          <div><h4>Explorar</h4><Link to="/?f=venda#catalogo">Comprar</Link><Link to="/?f=aluguel#catalogo">Alugar</Link><Link to="/#destaques">Destaques</Link></div>
          <div><h4>Alvar</h4><Link to="/equipe">Equipe</Link><Link to="/conta/novo">Anunciar imóvel</Link><Link to="/conta">Minha conta</Link><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos</Link></div>
          <div><h4>Contato</h4><a href={`mailto:${SITE.email}`}>{SITE.email}</a><a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener">WhatsApp</a><span className="muted" style={{ fontSize: '.88rem', display: 'block', marginTop: '.3rem' }}>{SITE.endereco}</span></div>
        </div>
        <div className="footer-big" aria-hidden="true">alvar.</div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Alvar Imóveis — marca fictícia.</span><span style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}><Link to="/privacidade">Política de Privacidade</Link><Link to="/termos">Termos de Serviço</Link><span>CRECI-J 0000 (fictício)</span></span></div>
      </div>
    </footer>
  );
}
