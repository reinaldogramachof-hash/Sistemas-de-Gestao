# Status Report - Gestao Gastro / Painel Admin SaaS

Data/hora do registro: 2026-07-16 20:36:25 -03:00

## Resumo executivo

Nesta sessao, o foco foi estabilizar o fluxo SaaS do Painel Admin para o Gestao Gastro, validar a criacao do cliente de teste `Gastro Teste`, corrigir a rota publica `/gestao-gastro/gastro-teste` e preparar um pacote de atualizacao para o servidor.

O provisionamento SaaS passou a funcionar no Supabase, a licenca SaaS passou a ser validada pela API PHP e o Painel Admin ganhou uma listagem propria de clientes SaaS provisionados.

## Acoes aplicadas

- Corrigida a RPC `public.provision_saas_tenant` no Supabase.
  - Problema encontrado: a funcao usava `ON CONFLICT (email)` em `customers`, mas a tabela real nao possui constraint unica em `email`.
  - Ajuste aplicado: busca/atualizacao manual do cliente existente por e-mail, criando novo registro somente quando necessario.

- Criado e validado o tenant de teste:
  - Cliente: `Gastro Teste`
  - Slug: `gastro-teste`
  - Tenant ID: `552e5a5a-6bb7-49ee-abd4-51614e3ebdf3`
  - Plano: `base`
  - Mesas criadas: `12`
  - Modulos ativos: `10`
  - Cozinha: nao liberada

- Ajustado o fluxo de rota SaaS no Gestao Gastro.
  - Antes: o app aceitava apenas slugs fixos do Cantinho da Resenha.
  - Agora: o app aceita slugs dinamicos provisionados pelo Painel Admin, como `/gestao-gastro/gastro-teste`.

- Ajustada a ativacao de licenca SaaS.
  - `ActivationGate` envia `tenant_slug` para a API.
  - `api_licenca_ml.php` consulta licencas SaaS no Supabase quando a chave nao existe no JSON vitalicio.
  - O app persiste o `tenant_id` por slug apos validacao.

- Ajustado o primeiro acesso/admin.
  - `api_admin_users.php` agora aceita prova de licenca SaaS vinda do Supabase.
  - `get_owner_status` foi validado com sucesso para o tenant `gastro-teste`.

- Ajustado o Painel Admin.
  - Criada a acao `saas_clients` em `api_provisioning.php`.
  - Adicionada a tabela "Clientes SaaS provisionados" na aba "Clientes SaaS".
  - A tabela mostra cliente, slug, sistema, plano, licenca, status, modulos e link publico.
  - A lista recarrega automaticamente apos novo provisionamento.

- Gerado pacote de atualizacao para o servidor:
  - `deploy_packages/atualizar.zip`
  - Estrutura pronta para extrair na raiz do servidor.

- Commit e push aplicados:
  - Commit: `f593062`
  - Mensagem: `Evolui Gestao Gastro SaaS e deploy`
  - Branch: `main`
  - Remoto: `origin/main`

## Validacoes realizadas

- `php -l api_provisioning.php`: OK
- `php -l api_licenca_ml.php`: OK
- `php -l api_admin_users.php`: OK
- Parse JS do `admin/index.html`: OK
- `npm run lint` no `gestao-gastro`: OK
- `npm run build` no `gestao-gastro`: OK
- Testes focados:
  - `tests/gastro-public-routing.test.mjs`
  - `tests/gastro-admin-auth.test.mjs`
  - `tests/admin-saas-central.test.mjs`
  - Resultado: 32 testes passaram

- Validacao local da API:
  - `api_licenca_ml.php?action=activate`: retornou sucesso para a licenca SaaS do `gastro-teste`.
  - `api_licenca_ml.php?action=verify`: retornou `license_status: active`.
  - `api_admin_users.php get_owner_status`: retornou `status: success`.
  - `api_provisioning.php?action=saas_clients`: retornou `Gastro Teste` e `Cantinho da Resenha`.

## Observacoes importantes

- A tela em producao ainda exibiu "Cliente nao identificado" porque o servidor estava servindo o bundle antigo do Gestao Gastro.
- O novo comportamento depende de subir o pacote `deploy_packages/atualizar.zip` no servidor.
- Depois de atualizar o servidor, testar em aba anonima ou limpar cache/PWA/service worker, pois o navegador pode manter o bundle antigo.
- O pacote `.zip` e a pasta `deploy_packages/` ficaram fora do commit como artefatos locais de deploy.
- Arquivos de build soltos em `gestao-gastro/` tambem ficaram fora do commit.

## Proximos caminhos para a proxima sessao

1. Aplicar `deploy_packages/atualizar.zip` na raiz do servidor.
2. Limpar cache/PWA/service worker ou testar em aba anonima.
3. Validar em producao:
   - `https://sistemasdegestao.tech/gestao-gastro/gastro-teste`
   - ativacao da licenca SaaS
   - login/admin
   - abertura do dashboard
   - modulos liberados conforme plano base
4. Validar no Painel Admin:
   - aba "Clientes SaaS"
   - tabela "Clientes SaaS provisionados"
   - link, licenca e status do `Gastro Teste`
5. Decidir se o cliente `Gastro Teste` sera mantido para homologacao ou removido apos validar o fluxo.
6. Depois da validacao em producao, revisar o fluxo definitivo do Cantinho da Resenha:
   - slug oficial
   - licenca oficial
   - usuario owner
   - dados reais preservados
   - limpeza de dados de teste
7. Preparar novo deploy final somente apos validar o fluxo SaaS ponta a ponta no servidor.

## Estado atual recomendado para retomada

Comecar a proxima sessao pela verificacao do deploy em producao. A prioridade nao e mexer em codigo primeiro; e confirmar se o servidor recebeu o build novo e se o link dinamico SaaS deixou de cair em "Cliente nao identificado".
