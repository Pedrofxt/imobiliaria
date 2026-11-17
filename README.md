# Alvar Imóveis

Site de imobiliária **fictícia** no estilo e-commerce: catálogo com filtros, favoritos (o "carrinho"), página de cada imóvel com galeria, dados e corretor responsável, área da conta para cadastrar imóveis e fotos, e página da equipe.

- HTML, CSS e JavaScript puros (ES modules), sem build: roda direto no GitHub Pages
- Supabase: banco Postgres com RLS, Storage para fotos e login com Google
- Modo claro e escuro (com transição circular), responsivo, com animações

**Site:** https://pedrofxt.github.io/imobiliaria/

## Funcionalidades

- Catálogo com filtros, **lista ou mapa** (OpenStreetMap), favoritos e **comparação de até 3 imóveis**
- **Buscas salvas** com alerta de imóvel novo (no site e por e-mail)
- Página do imóvel com galeria, **agendamento de visita**, **simulador de financiamento** (SAC/Price), mapa e chat com o corretor
- "Tenho interesse" vira conversa no chat automaticamente; proteção anti-robô e anti-spam
- Conta: perfil, mensagens em tempo real, visitas, favoritos, buscas salvas, segurança (senha do site, recuperação, exclusão de conta)
- Equipe: **painel com números**, imóveis com **rascunho → aprovação**, interessados com **etapas** (novo → fechado), gestão de usuários
- Avisos por e-mail (Edge Function + Resend)

## Estrutura

```
index.html        início + catálogo
imovel.html       página do imóvel (?id=…)
conta.html        perfil, favoritos, meus imóveis, cadastrar, interessados, equipe (admin)
equipe.html       corretores
comparar.html     comparação lado a lado
privacidade.html / termos.html
css/style.css     estilos e tema
js/config.js      URL e chave pública do Supabase
js/core.js        cliente Supabase, auth, API de dados, componentes
supabase/schema.sql   tabelas, RLS, triggers, bucket de fotos
supabase/seed.sql     imóveis de exemplo (opcional)
supabase/chat.sql, excluir-conta.sql, melhorias.sql   atualizações (já incluídas no schema.sql)
supabase/notificacoes.sql      gatilhos dos avisos por e-mail
supabase/functions/notificar   Edge Function que envia os e-mails
```

## Configurar o Supabase (uma vez)

1. **Banco:** no painel do projeto, abra **SQL Editor**, cole todo o `supabase/schema.sql` e clique em **Run**.
2. **Login com Google:**
   - No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um **ID do cliente OAuth** (tipo "Aplicativo da Web").
   - Em *URIs de redirecionamento autorizados*, adicione `https://esotkfzgmkncfkqbaiho.supabase.co/auth/v1/callback`.
   - No Supabase, vá em **Authentication → Sign In / Providers → Google**, ative e cole o *Client ID* e o *Client Secret*.
3. **URLs do site:** em **Authentication → URL Configuration**:
   - *Site URL:* `https://pedrofxt.github.io/imobiliaria/`
   - *Redirect URLs:* `https://pedrofxt.github.io/imobiliaria/**` (e `http://localhost:*/**` se for testar localmente)
4. **Primeiro acesso:** entre no site com o Google. **O primeiro usuário vira administrador.**
5. *(Opcional)* Rode `supabase/seed.sql` no SQL Editor para criar 9 imóveis de exemplo sob sua responsabilidade.

## Atualizando um banco já existente

Se você já rodou uma versão antiga do `schema.sql`, rode na ordem: `chat.sql`, `excluir-conta.sql`, `melhorias.sql`. Todos podem ser executados mais de uma vez.

## Avisos por e-mail (opcional)

1. Crie uma conta na [Resend](https://resend.com) e gere uma **API Key**. Sem domínio verificado, ela só entrega para o seu próprio e-mail — para enviar a qualquer pessoa, verifique um domínio e use-o em `EMAIL_FROM`.
2. No Supabase: **Edge Functions → Deploy a new function → Via editor**, nome `notificar`, cole `supabase/functions/notificar/index.ts` e publique. Nas configurações da função, **desligue "Verify JWT"** (a função usa um segredo próprio).
3. Em **Edge Functions → Secrets**, crie `RESEND_API_KEY` e `WEBHOOK_SECRET` (um texto aleatório longo). Opcionais: `EMAIL_FROM`, `SITE_URL`.
4. Copie `supabase/notificacoes.sql`, troque `TROQUE-ESTE-SEGREDO` pelo mesmo `WEBHOOK_SECRET` e rode no SQL Editor. **Não** suba a versão com o segredo para o GitHub.

## E-mails de recuperação de senha

O servidor de e-mail padrão do Supabase só envia para membros da equipe do projeto e tem limite baixo. Para o "Esqueci minha senha" funcionar com qualquer usuário, configure **Authentication → Emails → SMTP Settings** com a Resend: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = sua API Key.

## Papéis

| Papel | Pode |
|---|---|
| Cliente | ver imóveis, favoritar, enviar interesse, editar o próprio perfil |
| Corretor | tudo acima + cadastrar imóveis (vão para aprovação), editar/excluir os seus, ver interessados e visitas deles, painel |
| Admin | tudo + publicar/rejeitar anúncios, editar qualquer imóvel e promover usuários em **Conta → Equipe** |

As regras valem no banco (RLS), não só na interface.

## Modo demonstração

Se `js/config.js` ficar com os valores de exemplo, o site roda com dados fictícios salvos no navegador e um login simulado de administrador. Serve para testar sem banco.
