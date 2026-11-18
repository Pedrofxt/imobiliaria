import { useEffect, useState } from 'react';
import { api, onlyDigits } from '../lib/core.js';
import { Icon, Avatar, DbError } from '../ui/kit.jsx';

export default function Equipe() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  useEffect(() => { Promise.all([api.listEquipe(), api.listImoveis()]).then(([e, i]) => setDados({ equipe: e, imoveis: i })).catch(setErro); }, []);
  return (
    <main className="page-top">
      <section className="section" style={{ paddingTop: '3rem' }}>
        <div className="container">
          <div className="section-head reveal">
            <div><span className="eyebrow">Equipe</span><h2>Gente que entende de chão, luz e vizinhança.</h2></div>
            <p>Cada imóvel tem um responsável. Fale direto com quem conhece o endereço de perto.</p>
          </div>
          <div className="team-grid">
            {erro ? <DbError error={erro} /> : !dados ? [0, 1, 2].map((k) => <div key={k} className="skeleton" style={{ height: 340 }} />)
              : !dados.equipe.length ? <div className="empty" style={{ gridColumn: '1/-1' }}><h3>Equipe em formação</h3><p>Nossos corretores aparecem aqui assim que forem aprovados.</p></div>
              : dados.equipe.map((p, i) => {
                const n = dados.imoveis.filter((im) => im.responsavel_id === p.id).length;
                const tel = onlyDigits(p.telefone); const t55 = tel.startsWith('55') ? tel : '55' + tel;
                return (
                  <article className="panel member reveal" key={p.id} style={{ '--d': `${(i % 4) * 0.08}s` }}>
                    <Avatar p={p} size="xl" />
                    <h3>{p.nome || 'Sem nome'}</h3>
                    <div className="role">{p.cargo || 'Corretor'}{p.creci ? ` · ${p.creci}` : ''}</div>
                    <p>{p.bio || 'Pronto para encontrar o imóvel certo para você.'}</p>
                    <div className="links">
                      {tel && <><a className="btn-icon" href={`https://wa.me/${t55}`} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon name="chat" /></a><a className="btn-icon" href={`tel:+${t55}`} aria-label="Ligar"><Icon name="phone" /></a></>}
                      {p.email && <a className="btn-icon" href={`mailto:${p.email}`} aria-label="E-mail"><Icon name="mail" /></a>}
                    </div>
                    <div className="count">{n} {n === 1 ? 'imóvel sob responsabilidade' : 'imóveis sob responsabilidade'}</div>
                  </article>
                );
              })}
          </div>
        </div>
      </section>
    </main>
  );
}
