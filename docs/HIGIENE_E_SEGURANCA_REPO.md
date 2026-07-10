# Higiene e Segurança do Repositório

Este documento define as regras de organização da raiz do projeto **Sistemas de Gestão** e separa código-fonte, artefatos locais, dados sensíveis e entregáveis.

## Estado Atual Validado

- Branch principal: `main`.
- Repositório sincronizado com `origin/main`.
- Sem arquivos de código pendentes fora do Git.
- Arquivos ignorados são compostos por dependências, builds, pacotes, `.env` e dados operacionais locais.

## O Que Deve Ser Versionado

- Código-fonte dos sistemas:
  - `gestao-gastro/src/`
  - `gestao-barbearia/`
  - `gestao-beleza/`
- Painéis administrativos:
  - `admin/`
  - `admin-vendas/`
- APIs PHP:
  - `api_*.php`
  - `env_loader.php`
- Documentação:
  - `README.md`
  - `ROADMAP_SISTEMAS_DE_GESTAO.md`
  - `docs/*.md`
- Testes:
  - `tests/*.mjs`
- Arquivos de segurança e configuração pública:
  - `.gitignore`
  - `.htaccess`
  - `env.example`
  - `api_data/.htaccess`

## O Que Não Deve Ser Versionado

- `.env` e qualquer variação com credenciais reais.
- `node_modules/`.
- `dist/`, `build/` e `coverage/`.
- Pacotes `.zip` gerados para envio ou deploy.
- Logs e arquivos temporários.
- JSONs operacionais com dados de clientes, licenças, recibos, vendas ou auditoria.

## Política para `api_data`

`api_data/` é uma área operacional local. Ela pode conter dados reais e, por isso, deve ser tratada como sensível.

Arquivos permitidos no Git:

- `api_data/.htaccess`
- `api_data/apps_config.json`
- `api_data/finance_transactions.json`
- `api_data/leads_crm.json`
- `api_data/notifications_system.json`
- `api_data/parceiros.json`
- `api_data/products_catalog.json`
- `api_data/reports_history.json`
- `api_data/sales_transactions.json`
- `api_data/team_members.json`

Arquivos que devem permanecer fora do Git:

- `api_data/database_licenses_secure.json`
- `api_data/database_licenses_archived.json`
- `api_data/receipts_log.json`
- `api_data/sales_coupons.json`
- `api_data/system_logs.json`
- `api_data/debug_log.txt`
- `notifications_data.json`

## Política para Pacotes e Builds

Pacotes e builds devem ser recriáveis. Eles não devem ser usados como fonte de verdade.

- `gestao-gastro/dist/` deve ser gerado com `npm.cmd run build`.
- `gestao-gastro/node_modules/` deve ser gerado com `npm.cmd install`.
- Arquivos `.zip` devem ser tratados como entregáveis temporários.

Recomendação operacional:

- manter pacotes fora do repositório, por exemplo em `C:\tmp\SistemasDeGestao\pacotes`;
- gerar novos pacotes a partir de uma tag ou commit conhecido;
- registrar no relatório de entrega o commit usado para gerar o pacote.

## Supabase

O projeto Supabase **Sistemas de Gestão** passa a ser o destino recomendado para dados comerciais e operacionais centralizados.

Projeto:

- Ref: `lxaframzkwmhjiamipsv`
- URL: `https://lxaframzkwmhjiamipsv.supabase.co`

Prioridade de migração:

1. Licenças ativas e histórico arquivado.
2. Clientes e tenants.
3. Notificações.
4. Logs de auditoria.
5. Pagamentos, cupons e recibos.

Regra: nenhuma migração deve apagar ou sobrescrever JSON local sem backup e validação de contagem antes/depois.

## Checklist de Higiene Antes de Commit

```powershell
git status -sb
git diff --check
git diff --cached --check
git ls-files --others --exclude-standard
```

Esperado:

- nenhum arquivo sensível aparecendo como untracked;
- nenhum build ou dependência staged;
- nenhuma credencial real em diff;
- nenhuma alteração fora do escopo planejado.

## Checklist de Segurança Antes de Publicação

- Conferir se `.env` não foi incluído no pacote.
- Conferir se `api_data/*.json` sensíveis não foram incluídos no pacote público.
- Conferir se `api_data/.htaccess` está presente no servidor.
- Conferir se `env_loader.php` não é acessível diretamente.
- Validar se o domínio configurado no `.env` bate com o ambiente publicado.
- Validar fluxo de licença sem expor `ADMIN_SECRET` no frontend.

## Decisão Arquitetural

O Git deve guardar o produto e sua história técnica. Dados reais de operação devem viver em armazenamento controlado, com backup, trilha de auditoria e plano de migração para Supabase.
