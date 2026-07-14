# Proximos Passos - Cantinho da Resenha

Data: 2026-07-13
Projeto Supabase: Sistemas de Gestao (`lxaframzkwmhjiamipsv`)
Tenant: Cantinho da Resenha (`cd8f21f4-73a1-4c87-a385-9b6deacaeae7`)
Link publico definido: `https://sistemasdegestao.tech/gestao-gastro/cantinhodaresenha`
Link da comanda/QR Code: `https://sistemasdegestao.tech/gestao-gastro/cantinhodaresenha/comanda`

## Status Report Da Sessao - 2026-07-13

Sessao encerrada com dois deploys estruturais aprovados:

- Gestao Gastro publicado em `/gestao-gastro/` no dominio `sistemasdegestao.tech`.
- Rotas publicas validadas sem 404:
  - `/gestao-gastro/`
  - `/gestao-gastro/cantinhodaresenha`
  - `/gestao-gastro/cantinhodaresenha/comanda`
- Painel Admin publicado em `/admin/` com autenticacao ativa.
- Backup do painel Admin criado no cPanel em `backup-admin-pre-deploy-2026-07-13`.
- Base ativa do painel Admin ficou restrita aos 2 clientes reais da Gestao Barbearia:
  - Wilson Calgaro
  - Diego
- `gestao-barbearia` permaneceu acessivel e nao foi substituido no deploy.
- `.htaccess` raiz foi preservado no deploy do Admin.
- Nenhum `.env`, `.env.local`, `src`, testes ou `node_modules` foi publicado nos pacotes.

Validacao ainda pendente:

- Entrar no painel Admin com a senha real e validar o conteudo interno das abas.
- Gerar uma licenca real/de teste para o Gestao Gastro pelo painel Admin.
- Confirmar se o link gerado segue o padrao:
  `https://sistemasdegestao.tech/gestao-gastro/cantinhodaresenha`
- Validar o fluxo completo de ativacao do cliente com a licenca emitida.
- Conectar o fluxo online ao Supabase com usuarios Auth reais, `tenant_members`, mesas e RLS.

Artefatos locais gerados na sessao:

- `deploy-gestao-gastro-final-2026-07-13.zip`
- `deploy-admin-panel-final-2026-07-13.zip`
- `deploy-admin-panel-final-2026-07-13.zip.sha256`

Esses artefatos sao operacionais e nao precisam ser versionados no Git.

## Correcao De Publicacao Aplicada

O teste do GPT Work em 2026-07-13 encontrou HTTP 404 nas rotas:

- `/gestao-gastro/`
- `/gestao-gastro/cantinhodaresenha`
- `/gestao-gastro/cantinhodaresenha/comanda`

Raiz tecnica corrigida localmente:

- `vite.config.ts` agora usa `base: '/gestao-gastro/'`, evitando assets quebrados em rotas profundas.
- `gestao-gastro/public/.htaccess` agora vai para o `dist` e reescreve subrotas para `index.html`.
- `.htaccess` raiz documenta e protege o fallback da SPA em `/gestao-gastro/*`.
- Teste de regressao criado em `tests/gastro-public-routing.test.mjs`.

Para publicar corretamente:

```powershell
cd gestao-gastro
npm.cmd run build
```

Depois, enviar o conteudo de `gestao-gastro/dist/` para a pasta publica do dominio em:

```text
/gestao-gastro/
```

O arquivo `/gestao-gastro/.htaccess` gerado no `dist` precisa subir junto. Apos a publicacao, validar:

```text
https://sistemasdegestao.tech/gestao-gastro/
https://sistemasdegestao.tech/gestao-gastro/cantinhodaresenha
https://sistemasdegestao.tech/gestao-gastro/cantinhodaresenha/comanda
```

## Estado Validado Do Gestao Gastro

- Commit enviado: `b5d3d8c feat: harden gastro client access flow`
- Rota por cliente criada em `src/config/clientRoutes.ts`
- `main.tsx` separa app administrativo e app mobile da comanda.
- `ComandaMobileApp` exige sessao Supabase Auth valida quando Supabase esta configurado.
- `GarcomLogin` usa e-mail/senha via Supabase Auth e bloqueia login offline antes de autenticar.
- `ActivationGate` envia `tenant_id` na ativacao/verificacao e recusa licenca de outro tenant quando retornada pela API.
- Dashboard exibe link da comanda mobile para gerar QR Code.
- Cardapio do Cantinho ja existe no Supabase com 8 categorias e 50 produtos.
- RLS e Realtime ja estao ativos para mesas e pedidos.

Validacoes executadas antes do commit:

```powershell
node --test tests\gastro-supabase-security.test.mjs tests\gastro-garcom-permissions.test.mjs tests\gastro-modules-plan.test.mjs tests\gastro-stock-and-menu.test.mjs tests\gastro-ui-polish.test.mjs tests\gastro-security-and-release.test.mjs tests\gastro-cashier-history.test.mjs
npm.cmd run lint
npm.cmd run build
git diff --check
```

Resultado: 50 testes passaram, lint passou, build passou, `git diff --check` limpo.

## Pendencias Reais Antes Do Teste Funcional

No Supabase real, a ultima auditoria apontou:

- `auth.users = 0`
- `tenant_members = 0`
- `restaurant_tables = 0`
- `open_orders = 0`

Ou seja, o app esta preparado, mas ainda falta liberar os acessos e popular as mesas do cliente.

## Ordem Recomendada Para A Proxima Sessao

1. Validar o Painel Admin logado.
   - Abrir `https://sistemasdegestao.tech/admin/`.
   - Entrar com a senha de administrador real.
   - Conferir Dashboard, Clientes, Provisionamento, Licencas, Sistemas e Planos, Historico, Logs e Notificacoes.

2. Gerar a licenca do Cantinho da Resenha.
   - Sistema: Gestao Gastro.
   - Plano inicial: Basico.
   - Slug publico: `cantinhodaresenha`.
   - Link esperado: `https://sistemasdegestao.tech/gestao-gastro/cantinhodaresenha`.
   - Conferir se a licenca aparece corretamente na base ativa.

3. Confirmar se `gestao-gastro/.env.local` recebeu a `VITE_SUPABASE_ANON_KEY` real.
   - Nunca usar `service_role` no frontend.
   - Nao commitar chaves reais.

4. Aplicar o seed de mesas, se autorizado.
   - Arquivo: `supabase/migrations/20260713_cantinho_data_seed.sql`
   - Ele cria mesas 1 a 12 com `ON CONFLICT DO NOTHING`.
   - Pode ser aplicado no SQL Editor do Supabase.

5. Criar usuarios Supabase Auth para teste.
   Sugestao inicial:
   - admin do cliente
   - caixa
   - garcom 1
   - garcom 2, opcional

6. Vincular usuarios ao tenant em `tenant_members`.
   Roles sugeridas:
   - admin: `owner` ou `admin`
   - caixa: `cashier`
   - garcom: `waiter`

7. Validar RLS com usuario real.
   - Login na rota administrativa do cliente.
   - Login em `/gestao-gastro/cantinhodaresenha/comanda`.
   - Confirmar que garcom ve cardapio e mesas.
   - Confirmar que usuario sem `tenant_members` nao acessa.

8. Teste ponta a ponta.
   - Abrir painel admin/PDV em um dispositivo.
   - Abrir comanda mobile em outro dispositivo ou janela anonima.
   - Criar pedido pela comanda.
   - Verificar mesa ocupada e pedido aparecendo no painel.
   - Fechar pedido pelo caixa/PDV.
   - Conferir reflexos em financeiro/estoque/dashboard.

9. Ajustar fluxo comercial da ativacao.
   Ainda falta consolidar a criacao/vinculo automatico do admin do cliente apos ativacao da licenca. Hoje o app ja envia `tenant_id`, mas a API de licenca precisa garantir:
   - licenca pertence ao tenant do slug
   - plano liberado corresponde ao plano contratado
   - e-mail informado sera o admin inicial
   - usuario Auth/admin sera criado ou vinculado com seguranca

## Cuidados

- Nao mexer em `gestao-barbearia`; existem alteracoes locais fora do escopo.
- Nao desabilitar RLS para facilitar teste.
- Nao criar policy aberta com `USING (true)` ou `WITH CHECK (true)`.
- Nao adicionar segredo em arquivo versionado.
- Antes de qualquer commit, rodar `git status --short` e stagear apenas `gestao-gastro`/`tests` quando aplicavel.

## Checklist Rapido Da Proxima Sessao

```powershell
git status --short
node --test tests\gastro-supabase-security.test.mjs tests\gastro-garcom-permissions.test.mjs
npm.cmd run lint
npm.cmd run build
```

Depois consultar no Supabase:

```sql
select 'auth_users' as area, count(*)::int as total from auth.users
union all
select 'tenant_members', count(*)::int from public.tenant_members where tenant_id='cd8f21f4-73a1-4c87-a385-9b6deacaeae7'
union all
select 'restaurant_tables', count(*)::int from public.restaurant_tables where tenant_id='cd8f21f4-73a1-4c87-a385-9b6deacaeae7'
union all
select 'open_orders', count(*)::int from public.restaurant_orders where tenant_id='cd8f21f4-73a1-4c87-a385-9b6deacaeae7' and status='open';
```
