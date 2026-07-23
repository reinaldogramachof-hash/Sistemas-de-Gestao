# Registro de Execução - Fase C.5.4.4

**Data/Hora:** 2026-07-23T19:49:00Z
**Agente:** Antigravity (Agente Dev Sênior)
**Projeto:** Sistemas De Gestão
**Fase:** C.5.4.4 - Preservação Canônica do JSON do Catálogo Pós-CRUD

---

### 1. Causa Raiz Identificada
Anteriormente, o manipulador `save_system` em `api_catalog.php` reconstruía a estrutura do sistema montando um novo array PHP `$updatedSystem` a partir dos dados do formulário da UI. Como a interface do Admin edita apenas campos comerciais principais (nome, subtítulo, status, canais, modelos, preços essenciais/premiums e vitalícios), campos canônicos não expostos no formulário (`trial_config`, `project_custom_brand_config`, etc.) eram omitidos da gravação. Além disso, a conversão de arrays vazios em PHP resultava em `lifetime_plans: []` (array numérico) para o `gestao-gastro`, em vez do objeto de chave/valor `{}`.

---

### 2. Resumo das Correções Aplicadas

1. **`api_catalog.php`**:
   - Ajustada a action `save_system` para inicializar `$updatedSystem` com a cópia integral do sistema pré-existente (`$updatedSystem = $existingSys;`), aplicando um merge seguro.
   - Preservados todos os campos canônicos existentes não editáveis diretamente pela UI (`trial_config`, `project_custom_brand_config`, `offline_standalone_fallback`, etc.).
   - Para `gestao-gastro`, atribuição explícita de `lifetime_plans = (object) []` para forçar a serialização JSON como objeto `{}`.
   - Para a criação de novos sistemas (`$isNew`), adição de blocos canônicos padrão para `trial_config` e `project_custom_brand_config`.

2. **`api_data/products_catalog.json`**:
   - Restaurado para o estado canônico dos 4 sistemas oficiais (`gestao-barbearia`, `gestao-beleza`, `gestao-assistencia`, `gestao-gastro`).
   - Restaurados os blocos `trial_config` e `project_custom_brand_config` do `gestao-beleza`.
   - Ajustada a propriedade `lifetime_plans` do `gestao-gastro` para objeto vazio `{}`.
   - Confirmada a ausência de resíduos QA ou sistemas temporários.

3. **`docs/CATALOGO_COMERCIAL_LOCAL_OFICIAL.md`**:
   - Adicionada a **Seção 7**, detalhando as regras de merge seguro e preservação de campos canônicos.

4. **`tests/admin-saas-central.test.mjs`**:
   - Adicionada a suíte de testes unitários para a **Fase C.5.4.4**, validando o merge seguro, a integridade dos 4 sistemas oficiais, a presença de `trial_config` no `gestao-beleza` e a tipagem de objeto para `lifetime_plans` no `gestao-gastro`.

---

### 3. Validações Realizadas

- Sintaxe PHP: `catalog_loader.php`, `api_catalog.php`, `api_licenca_ml.php`, `api_provisioning.php` -> **PASS**
- Validação do JSON: `api_data/products_catalog.json` -> **PASS** (4 sistemas canônicos)
- Suíte completa Node.js: `tests/admin-saas-central.test.mjs`, `tests/admin-hardening.test.mjs`, `tests/evolution-leads.test.mjs` -> **PASS (72 / 72 testes aprovados)**
- `git diff --check` -> **PASS** (100% limpo)

---

### 4. Status de Segurança e Governança

- **Zip gerado:** Não
- **Git Commit:** Não
- **Git Push:** Não
- **Deploy:** Não
