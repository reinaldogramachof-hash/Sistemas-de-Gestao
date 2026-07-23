# Registro Técnico - Fase B.6: Captura de Nome e WhatsApp na Solicitação de Evolução
Data/Hora: 2026-07-23 11:00

## 1. Escopo e Objetivos
Este registro técnico documenta o desenvolvimento, testes e validações da **Fase B.6**, que introduziu a captura consultiva do Nome do Responsável e do WhatsApp do cliente no momento da solicitação de evolução nos três sistemas legados (`gestao-assistencia`, `gestao-barbearia`, `gestao-beleza`), integrando-os de ponta a ponta com o backend e com o painel Admin.

## 2. Detalhamento Técnico das Modificações

### 2.1. Backend (`api_licenca_ml.php`)
- Ação `register_evolution_lead` atualizada para suportar `customer_name`, `customer_whatsapp` e `contact_consent`.
- Sanitização de dados:
  - `customer_name`: tags HTML removidas, limite de 100 caracteres.
  - `customer_whatsapp`: retidos apenas dígitos e o caractere `+`, limite de 20 caracteres.
  - `contact_consent`: tratado como booleano seguro (`1` ou `0`).
- Em casos de leads duplicados (mesmo e-mail/licença, mesmo sistema e mesma feature), as novas informações de Nome, WhatsApp e Consentimento sobrescrevem as anteriores caso sejam válidas.
- Bloqueio reforçado contra o envio de campos administrativos pelo payload público.

### 2.2. Frontends dos Sistemas Legados
- **Gestão Assistência (`gestao-assistencia/assets/js/modules/evolution.js`)**
- **Gestão Barbearia (`gestao-barbearia/js/app_core.js`)**
- **Gestão Beleza (`gestao-beleza/js/app_core.js`)**
- O comportamento do botão "Tenho interesse" foi alterado para abrir um modal consultivo HTML/CSS com o visual adaptado para o respectivo sistema.
- Persistência e auto-preenchimento no `localStorage` respeitando o isolamento por sistema:
  - Assistência: `assistencia_customer_name`, `assistencia_customer_whatsapp`
  - Barbearia: `barbearia_customer_name`, `barbearia_customer_whatsapp`
  - Beleza: `beleza_customer_name`, `beleza_customer_whatsapp`
- Validação: se o WhatsApp estiver preenchido, o checkbox de consentimento torna-se obrigatório. Em caso de inconsistência, uma mensagem de erro é exibida diretamente no modal, impedindo o envio e o uso de `alert()`.

### 2.3. Painel Admin (`admin/index.html`)
- Tabela de leads exibe o Nome e o WhatsApp do cliente na coluna de "Origem" (sob a licença/email) com indicador visual de consentimento. Se ausente, exibe fallback ("WhatsApp não informado").
- Função de exportação CSV (`exportEvolutionLeadsCsv`) atualizada com as colunas `Nome Cliente`, `WhatsApp Cliente` e `Consentimento Contato`.
- Ação de "Copiar mensagem" inclui as novas linhas `• *Nome:* ...` e `• *WhatsApp:* ...` de forma dinâmica (apenas se preenchidos).
- Remoção do `alert()` administrativo na atualização de leads, substituído por `showAdminToast`.

### 2.4. Testes Automatizados
- **`tests/evolution-leads.test.mjs`**: adicionado caso de teste para validar o recebimento, sanitização e isolamento dos novos campos no backend, além da garantia de envio por parte dos três sistemas cliente.
- **`tests/admin-hardening.test.mjs`**: adicionado caso de teste para validar renderização no painel Admin, colunas e valores na exportação de CSV, inclusão dinâmica de variáveis na mensagem copiada e conformidade UX (sem `alert()` ou `onclick`/`onchange` inline).

## 3. Validações Executadas
Todas as validações obrigatórias foram executadas e retornaram sucesso absoluto:

1. **PHP Syntax Check**:
   ```powershell
   php -l api_licenca_ml.php
   # No syntax errors detected in api_licenca_ml.php
   ```

2. **Evolution Leads Test Suite**:
   ```powershell
   node --test tests/evolution-leads.test.mjs
   # 15/15 testes passando
   ```

3. **Admin Hardening Test Suite**:
   ```powershell
   node --test tests/admin-hardening.test.mjs
   # 22/22 testes passando
   ```

4. **Admin SaaS Central Test Suite**:
   ```powershell
   node --test tests/admin-saas-central.test.mjs
   # 20/20 testes passando
   ```

5. **Git Diff Check**:
   ```powershell
   git diff --check
   # Retornou sucesso absoluto (sem whitespaces pendentes ou conflitos)
   ```

## 4. Confirmação de Diretrizes
- Não foram criados arquivos zip.
- Não foram executados `git commit`, `git push` ou deploys.
