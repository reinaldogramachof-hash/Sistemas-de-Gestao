# Registro de Auditoria - Fase 2.2: Pré-deploy, Limpeza de Escopo e Checklist Noturno
**Data/Hora:** 22 de Julho de 2026 às 16:35 (Local: 13:35)
**Agente:** Antigravity (IA Dev Sênior)

## 1. Status da Auditoria Geral
Auditoria de escopo executada com base no repositório após o commit `83f4537`. Identificamos modificações de desenvolvimento não-comitadas referentes a Gastro (Ciclo 2 - Concorrência), arquivos de apoio de desenvolvimento antigos e não rastreados no módulo de Assistência, e inconsistências de builds/arquivos locais dentro da pasta `deploy_packages/`.

---

## 2. Classificação Completa e Recomendação de Arquivos Pendentes

### 2.1. Componentes e Testes da Gastro (Ciclo 2 - Concorrência)
*   `gestao-gastro/src/components/CheckoutModal.tsx` (M)
*   `gestao-gastro/src/components/OrderModal.tsx` (M)
*   `gestao-gastro/src/components/Support.tsx` (M)
*   `tests/gastro-modules-plan.test.mjs` (M)
*   `tests/gastro-settings-access.test.mjs` (M)
*   `tests/gastro-cycle2-operational-flow.test.mjs` (??)

**Classificação:** `manter para próxima fase` / `não tocar agora`.
**Recomendação:** Estas alterações pertencem ao Ciclo 2 (Resolução de Concorrência e Hardening de Checkout da Gastro) e não devem ser incluídas no deploy atual de Evolução/Licenças. Devem permanecer locais no workspace de desenvolvimento e integradas no próximo ciclo de Gastro.

---

### 2.2. Arquivos Não Rastreados na Assistência (`gestao-assistencia/`)
*   `gestao-assistencia/STATUS_ATUALIZACAO_OS.md` (??)
    *   *Classificação:* `manter para próxima fase`.
    *   *Recomendação:* Documentação de histórico de alterações de OS. Não é referenciado nem executado em produção, mas é valioso como histórico. Manter localmente ou mover para um diretório de docs geral.
*   `gestao-assistencia/assets/js/modules/clients_fixed.js` (??)
    *   *Classificação:* `candidato a descarte`.
    *   *Recomendação:* Código redundante extraído durante o desenvolvimento de clientes. Não é referenciado pelo sistema. Pode ser descartado/excluído com segurança em fase posterior de limpeza.
*   `gestao-assistencia/os_extracted.js` (??)
    *   *Classificação:* `candidato a descarte`.
    *   *Recomendação:* Fragmentos de código extraídos do módulo de ordens de serviço antigo. Sem uso no projeto real. Pode ser descartado.
*   `gestao-assistencia/check-divs.js` (??)
    *   *Classificação:* `candidato a descarte`.
    *   *Recomendação:* Script Node local utilitário para contar divs no index.html. Útil em desenvolvimento, mas não deve ir para commit nem deploy.
*   `gestao-assistencia/check-global-divs.js` (??)
    *   *Classificação:* `candidato a descarte`.
    *   *Recomendação:* Idem ao anterior. Script local.
*   `gestao-assistencia/index.html.bak.20260215_101408` (??)
    *   *Classificação:* `candidato a descarte`.
    *   *Recomendação:* Cópia de segurança antiga criada manualmente. Totalmente obsoleta. Pode ser descartada.
*   `gestao-assistencia/index.html.bak.premium` (??)
    *   *Classificação:* `candidato a descarte`.
    *   *Recomendação:* Cópia de segurança de versão premium de referência visual. Sem uso no sistema produtivo. Pode ser descartada.

---

### 2.3. Diretório de Empacotamento (`deploy_packages/`)
*   `deploy_packages/atualizar_root/api_admin_users.php` (M)
*   `deploy_packages/atualizar_root/api_licenca_ml.php` (M)
*   `deploy_packages/atualizar_root/api_provisioning.php` (M)
*   `deploy_packages/atualizar_root/gestao-gastro/index.html` (M)
*   `deploy_packages/atualizar_root/gestao-gastro/sw.js` (M)
*   `deploy_packages/atualizar_root/gestao-gastro/assets/ComandaMobileApp-C7QzybU_.js` (D)
*   `deploy_packages/atualizar_root/gestao-gastro/assets/index-C7-gOV9Z.css` (D)
*   `deploy_packages/atualizar_root/gestao-gastro/assets/index-CtHH58ra.js` (D)
*   `deploy_packages/atualizar_root/gestao-gastro/assets/ComandaMobileApp-6CWd9IpG.js` (??)
*   `deploy_packages/atualizar_root/gestao-gastro/assets/index-BNk2ngrh.js` (??)
*   `deploy_packages/atualizar_root/gestao-gastro/assets/index-CjhQuJ_Y.css` (??)

**Classificação:** `exige decisão do Arquiteto`.
**Recomendação:** O pacote atual de deploy em disco está **inválido e obsoleto**. Ele contém builds locais não sincronizados de Gastro e arquivos PHP que refletem modificações locais em andamento, as quais foram em parte comitadas no `83f4537` mas que estão com pendências na pasta do pacote.
*Decisão recomendada:* Após às 22h, realizar a limpeza total do conteúdo de `deploy_packages/atualizar_root/` e regenerá-lo de forma limpa copiando apenas os arquivos comitados que farão parte do deploy noturno oficial (excluindo os assets obsoletos de Gastro e mantendo apenas a build homologada).

---

## 3. Checklist Noturno de Deploy (Pós-22:00)

Este checklist deverá ser executado estritamente no horário noturno, visando a segurança da produção.

### 3.1. Preparação e Limpeza
1.  **Stash de Gastro:** Fazer `git stash` temporário para remover as alterações de concorrência da Gastro (`CheckoutModal`, `OrderModal`, etc.) e os testes associados do workspace de build.
2.  **Limpeza de Não-Rastreados:** Remover os arquivos candidatos a descarte (scripts de divs, backups `.bak`) para garantir um build limpo.
3.  **Sanidade do Workspace:** Garantir que `git status` esteja 100% limpo em relação ao commit `83f4537` (ou commits de hardening posteriores autorizados).

### 3.2. Geração do Pacote (Build & Update Root)
1.  **Limpar Diretório do Pacote:** Deletar todo o conteúdo anterior de `deploy_packages/atualizar_root/` para evitar vazamento de resíduos locais.
2.  **Sincronizar Arquivos de Licenças:** Copiar os arquivos PHP de controle de licenças oficiais da raiz do projeto para o diretório `deploy_packages/atualizar_root/`:
    *   `api_licenca_ml.php`
    *   `api_provisioning.php`
    *   `api_admin_users.php` (se aplicável ao módulo administrativo)
3.  **Sincronizar a Assistência:** Copiar a estrutura comitada de `gestao-assistencia/` para o diretório de deploy apropriado.
4.  **Validar Versão da Gastro:** Verificar se a Gastro em produção necessita de atualização de index/sw. Se não, mantê-la de fora e usar o build oficial de Gastro correspondente ao commit `83f4537` estável.
5.  **Geração do Zip:** Compactar o diretório de deploy gerando o pacote sob controle de versão.

### 3.3. Ordem Recomendada de Deploy (Subida dos Sistemas)
1.  **Passo 1: Banco Central e RPCs (Supabase):** Garantir que quaisquer migrations pendentes do Supabase estejam ativas antes do deploy PHP.
2.  **Passo 2: APIs de Controle de Licenças (Raiz do Servidor):**
    *   Subir os arquivos de validação de licenças: `api_licenca_ml.php` e `api_provisioning.php`.
    *   *Por que primeiro:* Garante que quando os frontends standalones forem carregados e fizerem a verificação inicial, as novas rotas/parâmetros SaaS estejam prontas para responder.
3.  **Passo 3: Módulos Standalone Existentes:**
    *   Subir atualizações de Barbearia (`gestao-barbearia/`) e Beleza (`gestao-beleza/`) com suporte à Central de Evolução.
4.  **Passo 4: Novo Módulo de Assistência Técnica (`gestao-assistencia/`):**
    *   Criar o diretório e subir os arquivos do frontend.
5.  **Passo 5: Painel Admin Geral (`admin/index.html`):**
    *   Subir o painel administrativo atualizado com o gerenciador de leads de Evolução.

### 3.4. Validações Pós-Deploy (Smoke Tests em Produção)
1.  **Verificar Respostas da API:** Acessar o endpoint `api_licenca_ml.php?action=verify` via navegador/curl e garantir que responde com erro de parâmetros mas não dá HTTP 500.
2.  **Testar Carregamento da Barbearia/Beleza:** Abrir o sistema em modo anônimo, verificar se o banner de evolução/leads é renderizado e se o botão funciona sem erros no console.
3.  **Testar Cadastro de Leads:** Cadastrar um email de teste no banner de Evolução e certificar-se de que o lead aparece com status "pendente" no Painel Admin (`/admin/`).
4.  **Testar Acesso à Assistência:** Acessar o novo subdiretório `/gestao-assistencia/` e verificar se a tela de bloqueio e licença é inicializada corretamente.

### 3.5. Plano Mínimo de Rollback
1.  Caso ocorra instabilidade geral nas licenças de produção:
    *   Restaurar imediatamente os backups em produção dos arquivos `api_licenca_ml.php` e `api_provisioning.php`.
2.  Caso os sistemas standalones apresentem quebras ou loops de login:
    *   Reverter o arquivo `lock.js` e `app_core.js` correspondentes de Barbearia/Beleza para as versões anteriores.
3.  Caso a Assistência Técnica falhe em produção:
    *   Remover/ocultar a pasta `gestao-assistencia/` até a depuração.

---

## 4. Riscos Restantes antes da Geração dos Pacotes
*   **Inconsistência em deploy_packages/ atual:** Se alguém compactar o diretório `deploy_packages/` no estado em que está agora (às 13:30h), o pacote irá com lixo de assets e arquivos php modificados de forma incompleta no diretório de empacotamento. É de extrema importância fazer o `clean` total antes da geração do zip após às 22h.
*   **Deploy Concorrente de Gastro:** A Gastro tem melhorias locais de concorrência pendentes que não foram comitadas. Se essas melhorias forem mescladas acidentalmente durante a preparação do pacote, testes adicionais da Gastro deverão ser executados. A separação clara (através de `git stash` ou `git checkout` seletivo) é vital para mitigar riscos de quebra do PDV/Mesa da Gastro.

---

## 5. Declaração Crítica de Conformidade
*   **Nenhum zip/deploy package foi gerado nesta fase.**
*   **Nenhum arquivo foi apagado do workspace.**
*   **Nenhum commit foi criado no Git.**
