# Prontidão de Testes Reais e Deploy - Cantinho da Resenha

Este documento consolida o estado atual do projeto **gestao-gastro** para o cliente **Cantinho da Resenha**.

## 1. Estado Validado Localmente
- **[x] Fallback SPA**: `.htaccess` configurado em `gestao-gastro/public`. (Validado por teste local)
- **[x] Slug e Tenant**: `clientRoutes.ts` aponta para `cantinhodaresenha` e o `tenant_id` `cd8f21f4-73a1-4c87-a385-9b6deacaeae7`. (Validado por código/teste local)
- **[x] Base da URL**: `vite.config.ts` mantém `base: '/gestao-gastro/'`. (Validado por código/teste local)
- **[x] Segurança do Frontend**: Nenhuma chave `service_role` no código fonte do React. (Validado por código/teste local)
- **[x] Variáveis de Ambiente**: `.env.example` documenta as 3 variáveis vitais. (Validado por código/teste local)
- **[x] Fluxo de Usuários (Admin API)**: Criação de owner, membros, e ativação/desativação validados com restrições corretas de Tenant. (Validado por código/teste local)
- **[x] Licenciamento (ML API)**: Impede ativação cruzada e licenças master seguem vinculadas ao owner. (Validado por código/teste local)

## 2. Estado Real do Supabase (Auditado)
O banco de dados oficial (Sistemas de Gestão / lxaframzkwmhjiamipsv) já se encontra configurado. Estado verificado:
- **Tenant existente**: `cd8f21f4-73a1-4c87-a385-9b6deacaeae7`
- **Tabelas base preparadas**: RLS habilitado nas tabelas principais.
- **Usuários Auth**: 2 usuários Auth cadastrados.
- **Membros Ativos (`tenant_members`)**: 1 owner ativo e 1 waiter ativo.
- **Mesas (`restaurant_tables`)**: 12 mesas já existentes.
- **Cardápio**: 8 categorias (`menu_categories`) e 50 produtos (`menu_products`) já existentes.
- **Pedidos (`restaurant_orders`)**: Zero pedidos abertos no momento da auditoria.

**IMPORTANTE**: Nenhuma alteração no Supabase deve ser aplicada sem dado operacional real (ex: criar usuário com e-mail fictício).

## 3. Pendências para Teste Funcional Real e Deploy
- **[ ] Validação de Login Real**: Testar o login real do owner.
- **[ ] Validação de Acesso PDV/Comanda**: Testar o login real do waiter.
- **[ ] Validar fluxo de Caixa (Opcional/Se Necessário)**: Criar/validar o acesso e fechamento por perfil de `cashier`, apenas se a operação exigir (exige fornecer e-mail real para cadastro).
- **[ ] Validar Mesas**: Validar mesas 1 a 12 no fluxo real do painel/PDV.
- **[ ] Roteiro de Teste Ponta a Ponta**: Abertura de comanda/pedido, lançamento de itens no PDV/painel, fechamento e reflexo em relatórios.
- **[ ] Deploy cPanel**: Efetuar a build, upload da pasta `dist` e dos scripts do painel administrativo no servidor cPanel.

## 4. Roteiro de Deploy no cPanel (Depende de publicação cPanel)
1. Fazer build local com `npm run build` na pasta `gestao-gastro`.
2. O build gerará a pasta `dist`.
3. Fazer upload do conteúdo de `dist` para a pasta `/public_html/gestao-gastro/` no cPanel.
4. Fazer upload do backend PHP (ex: `api_admin_users.php`, `api_licenca_ml.php`, `.env`) para o raiz (ou nível acima de `public_html`, dependendo da arquitetura).
5. Certificar-se que o `.htaccess` em `gestao-gastro` force as requisições de frontend a caírem no `index.html`.

## 5. Comandos de Validação Final
```bash
node --test tests\gastro-real-readiness.test.mjs tests\gastro-public-routing.test.mjs tests\gastro-supabase-security.test.mjs tests\gastro-admin-auth.test.mjs tests\gastro-garcom-permissions.test.mjs tests\gastro-lan-roles.test.mjs tests\gastro-collaborators-contract.test.mjs
php -l api_admin_users.php
php -l api_licenca_ml.php
cd gestao-gastro
npm run lint
npm run build
```
