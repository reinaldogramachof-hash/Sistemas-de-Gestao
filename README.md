# Sistemas de Gestão

Repositório oficial do ecossistema **Sistemas de Gestão**, reunindo os aplicativos locais/vitalícios, o painel administrativo, APIs PHP de licenças/vendas/notificações e a preparação da camada online com Supabase.

## Produtos Atuais

- `gestao-gastro/`: aplicação React/Vite/PWA para gestão de restaurantes, com controle de módulos por plano.
- `gestao-barbearia/`: aplicação standalone HTML/CSS/JS para barbearias, com licença local e PWA.
- `gestao-beleza/`: aplicação standalone HTML/CSS/JS para salão de beleza, com licença local e PWA.

## Superfícies Administrativas

- `admin/`: painel administrativo principal para licenças, clientes, planos e operações centrais.
- `admin-vendas/`: painel auxiliar de vendas/cupons.
- `api_licenca_ml.php`: API de geração, validação e ativação de licenças.
- `api_vendas.php`: API de vendas, cupons, transações e integração de pagamento.
- `api_notificacoes.php`: consulta de notificações pelos aplicativos.
- `api_notificacoes_admin.php`: gestão administrativa de notificações.
- `api_admin_auth.php`: autenticação do painel administrativo.
- `api_mailer.php`: envio de e-mails via SMTP.
- `env_loader.php`: carregamento seguro de variáveis do `.env`.

## Estrutura

```text
Sistemas De Gestão/
  admin/                         Painel administrativo principal
  admin-vendas/                  Painel auxiliar de vendas
  api_data/                      Dados locais protegidos por .htaccess
  assets/                        Assets compartilhados locais
  docs/                          Documentação técnica, produto e governança
  gestao-barbearia/              App standalone Barbearia
  gestao-beleza/                 App standalone Beleza
  gestao-gastro/                 App React/Vite Gestão Gastro
  tests/                         Testes Node
  .agent/                        Instruções operacionais Codex/Antigravity
```

## Regras de Segurança

- Nunca commitar `.env`, credenciais, chaves de pagamento, tokens ou dados reais de clientes.
- Arquivos sensíveis de `api_data/` devem ficar fora do Git, com backup privado e migração controlada.
- `api_data/.htaccess` deve bloquear acesso HTTP direto aos JSONs operacionais.
- Builds (`dist/`), dependências (`node_modules/`) e pacotes `.zip` são artefatos locais e não entram no repositório.
- O painel administrativo deve ser a fonte de verdade para planos, versões e licenças.

## Modelo de Planos

O projeto trabalha com três camadas comerciais principais:

- **ML/Vitalício:** produto local, pagamento único, sem dependência operacional de nuvem.
- **Premium Vitalício:** produto mais completo, pagamento único, ainda local/offline.
- **Master/Mensal:** recursos online, mensalidade, módulos liberados conforme plano.

A matriz oficial e as decisões comerciais ficam documentadas em:

- `ROADMAP_SISTEMAS_DE_GESTAO.md`
- `docs/POLITICA_COMERCIAL_PLANOS_E_LICENCAS.md`
- `docs/ESTRATEGIA_PLANOS_VITALICIO_PREMIUM.md`
- `docs/HIGIENE_E_SEGURANCA_REPO.md`

Atualizacao oficial de canais e liberacoes:

- `ml_lifetime`: venda Mercado Livre via API PHP, R$ 97,00.
- `direct_lifetime`: venda direta cliente final via API PHP, R$ 299,90.
- `pro_lifetime`: venda direta local robusta, ainda localStorage/PWA, R$ 599,90.
- `premium_monthly`: evolucao SaaS mensal com PHP + Supabase, planos e funcionalidades por sistema.

As nomenclaturas antigas como "ML/Vitalicio", "Premium Vitalicio" e "Master/Mensal" devem ser lidas como familias comerciais historicas. A fonte de verdade atual para precos, canais, billing, versao e liberacao evolutiva e `docs/POLITICA_COMERCIAL_PLANOS_E_LICENCAS.md`.

## Supabase

O projeto Supabase atual é:

- Nome: `Sistemas de Gestão`
- Ref: `lxaframzkwmhjiamipsv`
- URL: `https://lxaframzkwmhjiamipsv.supabase.co`

Ele foi preparado para ser a base futura de clientes, tenants, licenças, planos, módulos, notificações, auditoria, pagamentos e versões dos sistemas.

## Validação Recomendada

Antes de qualquer commit ou entrega:

```powershell
git status -sb
git diff --check
node --test tests\admin-hardening.test.mjs tests\backup-and-pwa.test.mjs tests\appointments-and-services.test.mjs
node --test tests\gastro-modules-plan.test.mjs tests\gastro-stock-and-menu.test.mjs tests\gastro-ui-polish.test.mjs
cd gestao-gastro
npm.cmd run lint
npm.cmd run build
```

## Fluxo de Trabalho

- **Codex:** arquitetura, auditoria, revisão técnica, critérios de aceite e validação.
- **Antigravity:** implementação orientada, ajustes de código e evidências de execução.

Toda entrega deve registrar:

- arquivos alterados;
- comandos executados;
- testes realizados;
- riscos restantes;
- confirmação de `commit` e `push`, quando aplicável.
