# Registro Técnico: Fase C.5.2.1 - Ajuste de Permissões por Contexto do Catálogo Backend

**Data/Hora:** 23 de Julho de 2026, 16:08 (-03:00)
**Fase:** C.5.2.1 - Ajuste de Permissões por Contexto do Catálogo Backend
**Status:** Concluído

---

## 1. Escopo Executado
- Revisão do helper `catalog_loader.php` para expor funções com responsabilidades contextuais bem delimitadas:
  - `getAllowedSystemsForML()`: Retorna exclusivamente sistemas com `standard_ml_allowed: true` (`gestao-barbearia`, `gestao-beleza`, `gestao-assistencia`).
  - `getAllowedSystemsForLicenseGeneration()`: Retorna sistemas com `standard_ml_allowed: true` OU com `offline_standalone_fallback.permitted: true` (inclui `gestao-gastro` para contextos controlados/legados).
  - `getAllowedSystemsForLeads()`: Retorna todos os sistemas comerciais ativos (`commercial_status === 'active'`), garantindo que a captação de leads SaaS não seja bloqueada indevidamente para o Gastro.
  - `isOfflineFallbackPermitted($systemSlug)`: Verifica se o sistema possui autorização para atendimento offline/standalone controlado.
- Ajuste das rotas de negócio no `api_licenca_ml.php`:
  - **Ação `generate`**: Passa a utilizar `getAllowedSystemsForLicenseGeneration()`. Bloqueia a geração de `gestao-gastro` **somente** se o plano solicitado for `ml_lifetime` padrão (`!isSystemStandardMLAllowed($systemId)`). Permite Gastro em contextos controlados/legados sob demanda (`direct_lifetime`, `pro_lifetime`, `trial`).
  - **Ação `register_evolution_lead`**: Passa a utilizar `getAllowedSystemsForLeads()`, permitindo o registro de interesse de evolução para todos os sistemas ativos (incluindo Gastro).
  - **Fallback Default**: Preservado em `getDefaultSystemId()` (`gestao-barbearia`).
- Atualização do documento oficial `docs/CATALOGO_COMERCIAL_LOCAL_OFICIAL.md` detalhando as 3 funções contextuais de permissão.
- Atualização da suíte de testes em `tests/admin-saas-central.test.mjs`.

---

## 2. Validações Executadas
1. **Sintaxe PHP (`php -l`)**:
   - `php -l catalog_loader.php` -> *No syntax errors detected*
   - `php -l api_licenca_ml.php` -> *No syntax errors detected*
   - `php -l api_provisioning.php` -> *No syntax errors detected*
2. **Suíte de Testes Node.js**:
   - `node --test tests/admin-saas-central.test.mjs` (66 testes passados)
   - `node --test tests/admin-hardening.test.mjs` (66 testes passados)
   - `node --test tests/evolution-leads.test.mjs` (66 testes passados)
3. **Git Diff Check**: `git diff --check` limpo.
