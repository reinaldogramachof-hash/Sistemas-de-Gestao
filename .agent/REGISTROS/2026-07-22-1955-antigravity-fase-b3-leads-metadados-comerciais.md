# Registro Técnico: Fase B.3 — Formalização dos Leads de Evolução com Metadados Comerciais Padronizados

**Data/Hora:** 2026-07-22 19:55 (BRT)  
**Agente:** Antigravity (Dev Sênior)  
**Status:** Concluído com sucesso (100% dos testes validados)

---

## 1. Resumo da Fase B.3

A Fase B.3 expandiu a infraestrutura e a experiência de gestão dos **Leads de Evolução**, registrando, sanitizando, exibindo e exportando metadados comerciais estruturados:
- `interest_type` (`plan_upgrade` | `feature_interest`)
- `current_plan_code` (`ml_lifetime`, `site_lifetime`, `basic`, `premium`)
- `target_plan_code` (`basic`, `premium`)

A experiência comercial permanece 100% consultiva e manual, sem provisionamento automático, cobrança ou alteração de licenças locais.

---

## 2. Alterações Realizadas

1. **`api_licenca_ml.php` (Backend):**
   - Atualizado o action `register_evolution_lead` para receber os novos campos opcionais (`interest_type`, `current_plan_code`, `target_plan_code`).
   - Aplicada sanitização rigorosa via whitelists com fallbacks inteligentes.
   - Bloqueada a leitura/gravação de campos administrativos sensíveis (`notes`, `owner`, `next_contact_at`, `contact_channel`, `status`) a partir do payload público.
   - Mantida deduplicação inteligente e atualização de metadados em leads já existentes.

2. **Sistemas ML (`gestao-assistencia/assets/js/modules/evolution.js`, `gestao-barbearia/js/app_core.js`, `gestao-beleza/js/app_core.js`):**
   - Atualizado o payload do disparador `showEvolutionToast` para enviar `interest_type`, `current_plan_code` e `target_plan_code` junto aos 6 campos legados de compatibilidade.

3. **Painel Admin (`admin/index.html`):**
   - Atualizada a listagem de leads para exibir o tipo de interesse com badges coloridas, o plano atual e o plano alvo com rótulos amigáveis (`Licença Vitalícia ML`, `Online Essencial`, `Online Premium`, `Upgrade de Plano`, `Interesse em Recurso`).
   - Atualizada a função de busca para filtrar por qualquer um dos novos códigos e rótulos.
   - Incluídas as colunas `Tipo Interesse`, `Plano Atual` e `Plano Alvo` no arquivo CSV gerado em `exportEvolutionLeadsCsv()`.

4. **Bateria de Testes (`tests/evolution-leads.test.mjs`, `tests/admin-hardening.test.mjs`):**
   - Adicionados testes automatizados para validar a sanitização do backend, o envio pelos 3 sistemas, a ausência de injeção de campos administrativos e a renderização/exportação no Admin.

---

## 3. Validações Executadas

- `php -l api_licenca_ml.php` ➔ **PASS** (Sem erros de sintaxe)
- `node --test tests/evolution-leads.test.mjs` ➔ **PASS** (14/14 subtestes aprovados)
- `node --test tests/admin-saas-central.test.mjs` ➔ **PASS** (20/20 subtestes aprovados)
- `node --test tests/admin-hardening.test.mjs` ➔ **PASS** (20/20 subtestes aprovados)
- `git diff --check` ➔ **PASS** (Sem avisos ou erros de formatação/ whitespace)

---

## 4. Confirmação de Governança
- **NENHUM** arquivo zip foi gerado.
- **NENHUM** `git commit` foi realizado.
- **NENHUM** `git push` foi realizado.
- **NENHUM** deploy foi realizado.
