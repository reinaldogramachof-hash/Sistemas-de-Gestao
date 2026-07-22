# Nota de Execução - Fase 1: Segurança & Catálogo

**Objetivo Executado:**
- Isolamento de namespaces no `localStorage` para `gestao-barbearia` e `gestao-beleza` (evitando colisões) com migração automática e transparente de dados de ativação/recibo legados.
- Habilitação da trava de dispositivos (Device Lock) real ao corrigir a chamada silenciosa `verify` do `lock.js` nos três sistemas (`gestao-assistencia`, `gestao-barbearia`, `gestao-beleza`) para enviar `device_id` e `email`.
- Integração completa de `gestao-assistencia` no catálogo oficial do backend (`api_provisioning.php` e `api_licenca_ml.php`).
- Remoção de mapeamentos condicionais fixos (fallbacks de Beleza) no painel administrativo (`admin/index.html`), tornando a resolução de caminhos e nomes de produtos 100% dinâmica via `SAAS_CATALOG`.

**Arquivos Alterados:**
- `gestao-assistencia/lock.js`
- `gestao-barbearia/lock.js`
- `gestao-barbearia/index.html`
- `gestao-barbearia/js/app_core.js`
- `gestao-barbearia/js/notif_logic.js`
- `gestao-beleza/lock.js`
- `gestao-beleza/index.html`
- `gestao-beleza/js/notif_logic.js`
- `api_provisioning.php`
- `api_licenca_ml.php`
- `admin/index.html`
- `tests/admin-hardening.test.mjs`
- `tests/admin-saas-central.test.mjs`

**Validações Executadas:**
- Lints de sintaxe PHP: `php -l api_licenca_ml.php` e `php -l api_provisioning.php` (Passaram, sem erros).
- Execução da suíte de testes locais: `tests/admin-hardening.test.mjs` e `tests/admin-saas-central.test.mjs` (Todos os 37 testes passaram com sucesso).

**Riscos e Atenção do Arquiteto:**
- **Compatibilidade do localstorage:** As chaves antigas (`plena_license`, `ml_license_email`, `ml_receipt_confirmed`, `device_id`) continuam sendo gravadas de forma duplicada durante novos logins/ativações no Barbearia e Beleza para garantir que integrações antigas ou extensões do navegador continuem funcionando.
- **Fail-Open offline:** Se o cliente estiver sem conexão com a internet, o sistema standalone continua permitindo o acesso caso a licença local seja encontrada (Standalone Promise mantida).

**Pendências para a Fase 2 (Módulo Evolução):**
- Criação visual da "Central de Evolução" no `gestao-assistencia`.
- Substituição dos toasts simulados/estáticos por captação ativa de leads de upgrade integradas com a API central do Admin.
