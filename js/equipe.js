import { $, esc, api, initAuth, renderChrome, observeReveal, finishLoading, icon, avatarHTML, onlyDigits, dbErrorHTML } from './core.js';

renderChrome('equipe');

async function boot() {
  await initAuth();
  const box = $('#team');
  try {
    const [equipe, imoveis] = await Promise.all([api.listEquipe(), api.listImoveis()]);
    if (!equipe.length) {
      box.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Equipe em formação</h3><p>Nossos corretores aparecem aqui assim que forem aprovados.</p></div>`;
    } else {
      box.innerHTML = equipe.map((p, i) => {
        const n = imoveis.filter((im) => im.responsavel_id === p.id).length;
        const tel = onlyDigits(p.telefone);
        return `<article class="panel member reveal" style="--d:${(i % 4) * 0.08}s">
          ${avatarHTML(p, 'xl')}
          <h3>${esc(p.nome || 'Sem nome')}</h3>
          <div class="role">${esc(p.cargo || 'Corretor')}${p.creci ? ` · ${esc(p.creci)}` : ''}</div>
          <p>${esc(p.bio || 'Pronto para encontrar o imóvel certo para você.')}</p>
          <div class="links">
            ${tel ? `<a class="btn-icon" href="https://wa.me/${tel.startsWith('55') ? tel : '55' + tel}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('chat')}</a><a class="btn-icon" href="tel:+${tel.startsWith('55') ? tel : '55' + tel}" aria-label="Ligar">${icon('phone')}</a>` : ''}
            ${p.email ? `<a class="btn-icon" href="mailto:${esc(p.email)}" aria-label="E-mail">${icon('mail')}</a>` : ''}
          </div>
          <div class="count">${n} ${n === 1 ? 'imóvel sob responsabilidade' : 'imóveis sob responsabilidade'}</div>
        </article>`;
      }).join('');
    }
  } catch (e) { box.innerHTML = dbErrorHTML(e); }
  observeReveal();
  finishLoading();
}
boot();
