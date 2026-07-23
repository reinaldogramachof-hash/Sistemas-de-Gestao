# Registro Técnico: Fase C.5.2 - Integração Backend do Catálogo Local

**Data/Hora:** 23 de Julho de 2026, 16:03 (-03:00)
**Fase:** C.5.2 - Integração Backend do Catálogo Local
**Status:** Concluído

---

## 1. Escopo Executado
- Criado o helper PHP autocontido `catalog_loader.php` para centralizar a leitura e consulta do `api_data/products_catalog.json`.
- Implementadas funções de consulta e validação de permissão comercial:
  - `loadCommercialCatalog()` com fallback seguro se o JSON estiver ausente ou corrompido.
  - `getCommercialSystems()`, `getCommercialSystem($systemSlug)`.
  - `isSystemStandardMLAllowed($systemSlug)`, `isSystemAllowedForModel($systemSlug, $modelCode)`.
  - `getAllowedSystemsForML()`, `getAllowedSystemsForLeads()`.
  - `getDefaultSystemId()` retornando `'gestao-barbearia'`.
- Integrado o `catalog_loader.php` no `api_licenca_ml.php` (`require_once`).
- Resoluções de divergências comerciais:
  - `gestao-assistencia` incluído nos fluxos ML vitalícios e leads via retorno do catálogo (`getAllowedSystemsForML()`).
  - `gestao-gastro` removido da lista de geração de licenças vitalícias padrão ML (`standard_ml_allowed: false`).
  - Fallback para requisições sem `system_id` alterado de `gestao-gastro` para `gestao-barbearia`.
- Removidas as listas conflitantes de arrays hardcoded (`$allowedSystems` e `$allowed_systems`) em `api_licenca_ml.php`.
- Atualizado o documento oficial `docs/CATALOGO_COMERCIAL_LOCAL_OFICIAL.md`.
- Adicionado bloco de testes automatizados para a Fase C.5.2 em `tests/admin-saas-central.test.mjs`.

---

## 2. Validações Executadas
1. **Parser do JSON:** `api_data/products_catalog.json` válido.
2. **Sintaxe PHP (`php -l`)**:
   - `php -l catalog_loader.php` -> *No syntax errors detected*
   - `php -l api_licenca_ml.php` -> *No syntax errors detected*
   - `php -l api_provisioning.php` -> *No syntax errors detected*
3. **Suíte de Testes Node.js**:
   - `node --test tests/admin-saas-central.test.mjs` (66 testes passados)
   - `node --test tests/admin-hardening.test.mjs` (66 testes passados)
   - `node --test tests/evolution-leads.test.mjs` (66 testes passados)
4. **Git Diff Check**: `git diff --check` limpo.
