# Alvar Imóveis

Site de imobiliária **fictícia** no estilo e-commerce: catálogo com filtros, favoritos (o "carrinho"), página de cada imóvel com galeria, dados e corretor responsável, área da conta para cadastrar imóveis e fotos, e página da equipe.

- HTML, CSS e JavaScript puros (ES modules), sem build: roda direto no GitHub Pages
- Supabase: banco Postgres com RLS, Storage para fotos e login com Google
- Modo claro e escuro (com transição circular), responsivo, com animações

**Site:** https://pedrofxt.github.io/imobiliaria/

## Estrutura

```
index.html        início + catálogo
imovel.html       página do imóvel (?id=…)
conta.html        perfil, favoritos, meus imóveis, cadastrar, interessados, equipe (admin)
equipe.html       corretores
css/style.css     estilos e tema
js/config.js      URL e chave pública do Supabase
js/core.js        cliente Supabase, auth, API de dados, componentes
supabase/schema.sql   tabelas, RLS, triggers, bucket de fotos
supabase/seed.sql     imóveis de exemplo (opcional)
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

## Papéis

| Papel | Pode |
|---|---|
| Cliente | ver imóveis, favoritar, enviar interesse, editar o próprio perfil |
| Corretor | tudo acima + cadastrar imóveis, editar/excluir os seus, ver os interessados neles |
| Admin | tudo + editar qualquer imóvel e promover usuários em **Conta → Equipe** |

As regras valem no banco (RLS), não só na interface.

## Modo demonstração

Se `js/config.js` ficar com os valores de exemplo, o site roda com dados fictícios salvos no navegador e um login simulado de administrador. Serve para testar sem banco.
