# Registro Técnico: Fase C.5.1.1 - Correção de Paridade Comercial do Catálogo Local

**Data/Hora:** 23 de Julho de 2026, 15:59 (-03:00)
**Fase:** C.5.1.1 - Correção de Paridade Comercial do Catálogo Local
**Status:** Concluído

---

## 1. Escopo Executado
- Atualização do `api_data/products_catalog.json` para alinhar os valores dos planos SaaS à matriz comercial canônica já aprovada (Fases B.1/B.1.1).
- Ajustes dos preços de mensalidade SaaS por sistema:
  - **Gestão Barbearia:** Online Essencial = R$ 59,90 | Online Premium = R$ 99,00
  - **Gestão Beleza:** Online Essencial = R$ 59,90 | Online Premium = R$ 99,00
  - **Gestão Assistência:** Online Essencial = R$ 97,90 | Online Premium = R$ 149,90
  - **Gestão Gastro:** Online Essencial = R$ 89,00 | Online Premium = R$ 189,00
- Atualização de `docs/CATALOGO_COMERCIAL_LOCAL_OFICIAL.md` adicionando a Tabela Canônica de Preços SaaS por sistema e removendo generalizações de preço.
- Atualização do teste em `tests/admin-saas-central.test.mjs` para assertar explicitamente os valores exatos de `monthly_price` de cada plano SaaS e sistema.

---

## 2. Validações Executadas
1. **Parser do JSON:** `api_data/products_catalog.json` válido.
2. **Node.js Test Suite:**
   - `node --test tests/admin-saas-central.test.mjs` (65 testes passados)
   - `node --test tests/admin-hardening.test.mjs` (65 testes passados)
   - `node --test tests/evolution-leads.test.mjs` (65 testes passados)
3. **Sintaxe PHP:** `php -l api_licenca_ml.php` e `php -l api_provisioning.php` sem erros.
4. **Git Diff Check:** `git diff --check` limpo.
