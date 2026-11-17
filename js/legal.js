import { initAuth, renderChrome, observeReveal, finishLoading, SITE, $$ } from './core.js';
renderChrome('');
$$('[data-email]').forEach((el) => { el.textContent = SITE.email; el.href = 'mailto:' + SITE.email; });
$$('[data-endereco]').forEach((el) => { el.textContent = SITE.endereco; });
initAuth().then(() => { observeReveal(); finishLoading(); });
