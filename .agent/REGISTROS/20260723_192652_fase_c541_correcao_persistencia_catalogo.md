# Registro Técnico: Fase C.5.4.1 - Correção de Persistência do CRUD do Catálogo

**Data/Hora:** 23 de Julho de 2026, 16:26 (-03:00)
**Fase:** C.5.4.1 - Correção de Persistência do CRUD do Catálogo
**Status:** Concluído

---

## 1. Escopo Executado e Correções Aplicadas

1. **Correção do Campo de Preço Vitalício**:
   - Ajustado o `api_catalog.php` para gravar os preços vitalícios estritamente na chave canônica `base_price` (`lifetime_plans.ml_lifetime.base_price`, `lifetime_plans.direct_lifetime.base_price`, `lifetime_plans.pro_lifetime.base_price`).
   - Adicionado mecanismo para remover a chave legada `price` caso existisse, prevenindo duplicações ou divergências de leitura no sistema.

2. **Estruturação Completa em Novos Sistemas**:
   - Na criação de novos sistemas (`is_new: true`), o backend agora gera a estrutura canônica completa de `lifetime_plans` com todas as propriedades necessárias: `code`, `name`, `billing_model: one_time`, `base_price`, `max_devices`, `max_users` e `features`.

3. **Edição Real de Canais e Modelos Comerciais**:
   - Atualizado o `admin/index.html` com seletores checkbox para selecionar individualmente os `allowed_channels` (`mercadolivre`, `direct`, `landing_page`, `admin_saas`) e `allowed_commercial_models` (`ml_lifetime`, `direct_lifetime`, `pro_lifetime`, `trial`, `online_essential`, `online_premium`, `project_custom_brand`).
   - Adicionada sanitização server-side no `api_catalog.php` utilizando allowlists fixas para filtrar valores indesejados.

4. **Preservação Rígida das Regras do Gestão Gastro**:
   - O backend força `saas_recommended: true` e `standard_ml_allowed: false` para o `gestao-gastro`.
   - Remove automaticamente o canal `mercadolivre` e o modelo `ml_lifetime` da prateleira padrão do Gastro.

5. **Feedback Não-Bloqueante**:
   - Ao salvar um sistema com sucesso, o Admin exibe mensagem de confirmação em selo verde não-bloqueante (`systems-catalog-status`), confirmando a atualização do catálogo e a criação do backup automático.

---

## 2. Validações Executadas
1. **Validação JSON**:
   - `api_data/products_catalog.json` estruturado e VÁLIDO.
2. **Sintaxe PHP (`php -l`)**:
   - `php -l catalog_loader.php` -> *No syntax errors detected*
   - `php -l api_catalog.php` -> *No syntax errors detected*
   - `php -l api_licenca_ml.php` -> *No syntax errors detected*
   - `php -l api_provisioning.php` -> *No syntax errors detected*
3. **Suíte de Testes Node.js**:
   - `node --test tests/admin-saas-central.test.mjs` (69 testes passados)
   - `node --test tests/admin-hardening.test.mjs` (69 testes passados)
   - `node --test tests/evolution-leads.test.mjs` (69 testes passados)
4. **Git Diff Check**: `git diff --check` limpo.
