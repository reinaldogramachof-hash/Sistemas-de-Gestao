# Continuidade Sistemas de Gestao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retomar o projeto com seguranca, fechar o Bloco 2 de paridade Agenda/Clientes/Servicos e preparar o Bloco 3 de Equipe/Profissionais + Comissoes sem afetar licencas ou dados ativos.

**Architecture:** O projeto continua com dois sistemas locais/PWA independentes: `gestao-barbearia` preserva a identidade azul/slate e o fluxo mais operacional; `gestao-beleza` preserva a identidade dark/glass/rose e recebe paridade funcional sem copia literal de UI. O painel/admin, APIs PHP, licencas, backup e PWA devem ficar fora do proximo bloco salvo revisao explicita.

**Tech Stack:** HTML estatico, JavaScript local em `js/app_core.js`, testes Node `node:test`, PHP compartilhado para APIs administrativas/licencas, persistencia local via `localStorage`.

---

## Estado Atual

### Blocos concluidos

- [x] Fase 0: consolidacao de planos oficiais, compatibilidade administrativa e notificacoes.
- [x] Bloco 1: backup + PWA + seguranca local.
- [x] Bloco 2: implementacao inicial de paridade segura em Agenda, Clientes e Servicos no Gestao Beleza.

### Commits recentes

- `e2b9bea feat(core): harden backup validation and update PWA cache configs`
- `7c8c982 feat(core): consolidate admin plans and notification parity`
- `cba7551 feat(evolution): adiciona feature flags locais na central`

### Estado de trabalho observado antes deste plano

- Modificado: `gestao-beleza/js/app_core.js`
- Novo: `tests/appointments-and-services.test.mjs`
- Validacoes executadas nesta revisao:
  - `node --test tests/admin-hardening.test.mjs` passou com 12 testes.
  - `node --test tests/backup-and-pwa.test.mjs` passou com 7 testes.
  - `node --test tests/appointments-and-services.test.mjs` passou com 3 testes.
  - `node -c gestao-beleza/js/app_core.js` passou.
  - `node -c gestao-barbearia/js/app_core.js` passou.
  - `node -c gestao-beleza/js/notif_logic.js` passou.
  - `node -c gestao-barbearia/js/notif_logic.js` passou.
  - `node -c gestao-barbearia/js/pdv.js` passou.
  - `git diff --check` passou sem erros.

---

## Revisao Tecnica do Bloco 2

### Resultado

O Bloco 2 esta tecnicamente aprovado para fechamento com ressalvas leves. O escopo ficou concentrado em `gestao-beleza/js/app_core.js`, preservando o Gestao Barbearia e sem tocar em licencas, APIs, backup, PWA, notificacoes, estoque ou PDV.

### Pontos positivos verificados

- [x] `renderServices()` passou a sanitizar o nome do servico com `sanitizeHTML(s.name)`.
- [x] Cards e detalhe de cliente ganharam acao rapida de agendar com icone `calendar-plus`.
- [x] `openApptModal(context)` agora diferencia contexto de cliente por string e contexto de agenda por objeto `{ date, time, proId }`.
- [x] `editAppt(id)` foi adicionado e o botao de editar aparece apenas para agendamentos pendentes.
- [x] `submitAppt(e)` valida cliente, data, hora, servico e profissional antes de salvar.
- [x] A validacao de conflito ignora o proprio agendamento em modo edicao.
- [x] Cliente criado via agendamento recebe estrutura minima com `createdAt`.
- [x] `submitService(e)` rejeita nome vazio, preco `NaN`, preco zero e preco negativo.
- [x] `submitClient(e)` preserva ou cria `createdAt`.

### Ressalvas para o proximo ciclo

- [ ] `setupModalSelects()` ainda monta `<option>` via `innerHTML` usando `s.name` e `p.name` sem `sanitizeHTML`. Nao bloqueia o Bloco 2, mas deve entrar no hardening do Bloco 3 ou em um micro-ajuste antes do commit, se houver tempo.
- [ ] O teste `tests/appointments-and-services.test.mjs` e bom como contrato estatico, mas ainda nao executa fluxo DOM real. Para uma proxima evolucao, preferir testes que extraiam regras puras ou simulem minimamente os handlers.
- [ ] O `openApptModal()` define `ap-date` como `getLocalIsoDate()` ao abrir sem contexto. Isso e aceitavel como UX, mas diverge do texto original "limpar ap-date". Manter se o objetivo for facilitar novo agendamento para hoje.

---

## Task 1: Fechar o Bloco 2 com seguranca

**Files:**

- Modify/stage: `gestao-beleza/js/app_core.js`
- Create/stage: `tests/appointments-and-services.test.mjs`

- [ ] **Step 1: Revisar o diff final**

Run:

```powershell
git diff -- gestao-beleza\js\app_core.js
git diff -- tests\appointments-and-services.test.mjs
```

Expected:

- Mudancas somente no Gestao Beleza e na nova suite de testes.
- Nenhuma alteracao em licencas, APIs PHP, backup, PWA, notificacoes, estoque ou PDV.

- [ ] **Step 2: Rodar validacoes finais**

Run:

```powershell
node --test tests\admin-hardening.test.mjs
node --test tests\backup-and-pwa.test.mjs
node --test tests\appointments-and-services.test.mjs
node -c gestao-beleza\js\app_core.js
node -c gestao-barbearia\js\app_core.js
node -c gestao-beleza\js\notif_logic.js
node -c gestao-barbearia\js\notif_logic.js
node -c gestao-barbearia\js\pdv.js
git diff --check
```

Expected:

- Todas as suites passam.
- Sintaxe JS sem erros.
- `git diff --check` sem trailing whitespace.

- [ ] **Step 3: Stagear arquivos do Bloco 2**

Run:

```powershell
git add gestao-beleza/js/app_core.js tests/appointments-and-services.test.mjs
git diff --cached --check
git status --short
```

Expected:

- `gestao-beleza/js/app_core.js` e `tests/appointments-and-services.test.mjs` staged.
- Nada fora do escopo staged por acidente.

- [ ] **Step 4: Commitar Bloco 2**

Run:

```powershell
git commit -m "feat(beleza): harden appointments clients and services flows"
git status --short
```

Expected:

- Commit criado.
- Working tree limpa ou contendo apenas arquivos explicitamente deixados para a proxima sessao.

---

## Task 2: Auditoria read-only do Bloco 3

**Goal:** Mapear Equipe/Profissionais + Comissoes nos dois sistemas antes de pedir implementacao ao Antigravity.

**Files to read:**

- `gestao-barbearia/js/app_core.js`
- `gestao-barbearia/index.html`
- `gestao-beleza/js/app_core.js`
- `gestao-beleza/index.html`
- `tests/admin-hardening.test.mjs`
- `tests/appointments-and-services.test.mjs`

- [ ] **Step 1: Mapear funcoes de equipe e comissoes**

Run:

```powershell
rg -n "function (renderTeam|openTeamModal|submitTeam|editTeam|payCommission|confirmCommissionPayment|shareCommissionWhatsApp|printCommissionReceipt)|commission|commissionPaid|contract|startDate|tm-" gestao-barbearia gestao-beleza tests
```

Expected:

- Lista de funcoes e elementos DOM que controlam profissionais, contratos, comissoes pendentes, pagamento, recibo e compartilhamento.

- [ ] **Step 2: Comparar contratos de dados**

Run:

```powershell
rg -n "team:|commission:|contract:|phone:|startDate:|notes:|commissionPaid|commissionPaidDate|transactionIds|apptId|appointmentId" gestao-barbearia\js\app_core.js gestao-beleza\js\app_core.js
```

Expected:

- Identificar diferencas entre `team`, `transactions` e `appointments` nos dois sistemas.
- Separar diferencas funcionais de diferencas de identidade visual.

- [ ] **Step 3: Verificar fluxo financeiro de comissoes**

Read and compare:

- Barbearia: `payCommission`, `confirmCommissionPayment`, recibos e relatorios.
- Beleza: `payCommission`, `confirmCommissionPayment`, recibos e relatorios.

Acceptance:

- Nao propor mudanca que altere caixa, comissoes pagas ou historico de clientes sem teste.
- Nao mudar regra de fiado/PDV neste bloco.

---

## Task 3: Prompt para Antigravity do Bloco 3

**Goal:** Gerar um prompt cirurgico depois da auditoria, sem aplicar codigo diretamente.

- [ ] **Step 1: Escrever diagnostico**

Conteudo minimo:

- O que Barbearia tem melhor em Equipe/Comissoes.
- O que Beleza tem melhor em Equipe/Comissoes.
- Quais mudancas sao paridade obrigatoria.
- Quais mudancas devem esperar Bloco 4 Financeiro/PDV.

- [ ] **Step 2: Gerar prompt**

O prompt deve conter estes limites:

- Nao alterar licencas, APIs PHP, backup, PWA ou notificacoes.
- Nao alterar identidade visual dos sistemas.
- Nao mexer em dados ativos ou converter historico automaticamente.
- Adicionar validacoes sem apagar registros antigos.
- Rodar `node -c` e suites existentes.

- [ ] **Step 3: Aguardar retorno do Antigravity**

Nao editar arquivos antes do retorno, salvo pedido explicito do usuario.

---

## Task 4: Guardrails de Produto e Planos

**Goal:** Manter o trabalho alinhado com a futura matriz de planos.

- [ ] **Step 1: Classificar funcionalidades por camada**

Use esta matriz provisoria:

- Essencial local: agenda, clientes, servicos, equipe basica, backup local.
- Pro vitalicio: relatorios avancados locais, estoque, comissoes completas, recibos/impressao.
- Premium online mensal: multiusuario, agenda online, backup em nuvem, WhatsApp automatico, pagina publica, sincronizacao.

- [ ] **Step 2: Evitar enforcement prematuro**

Regra:

- Nao bloquear funcionalidades por plano dentro dos sistemas cliente ate o painel administrativo estar totalmente confiavel como fonte canonica de plano.

- [ ] **Step 3: Registrar decisoes**

Atualizar documento estrategico existente se o usuario aprovar:

- `docs/ESTRATEGIA_PLANOS_VITALICIO_PREMIUM.md`
- ou novo documento especifico de matriz final de funcionalidades.

---

## Checklist de Continuidade

- [ ] Preservar licencas ativas e compatibilidade de clientes existentes.
- [ ] Preservar identidade visual: Barbearia azul/slate/operacional; Beleza dark/glass/rose/feminino.
- [ ] Preferir auditoria e prompt para Antigravity antes de codigo direto.
- [ ] Rodar testes focados e relatar escopo validado, sem vender readiness do repo inteiro.
- [ ] Usar `git diff --check` antes de cada commit.
- [ ] Confirmar `git status --short` antes e depois de cada fechamento.
