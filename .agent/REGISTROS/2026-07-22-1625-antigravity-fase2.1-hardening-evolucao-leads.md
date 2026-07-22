# Registro de Atualização - Fase 2.1: Hardening do Módulo Evolução
**Data/Hora:** 22 de Julho de 2026 às 16:25
**Agente:** Antigravity (IA Dev Sênior)

## 1. Escopo das Alterações
- **Painel Administrativo:**
  - `admin/index.html` (Removido `onchange` inline no dropdown de status dos leads e implementado `addEventListener` com event mapping dinâmico através de seletores de classe e atributos `data-*` para garantir a proteção contra injeções).
- **Sistemas Standalone:**
  - `gestao-assistencia/assets/js/modules/evolution.js` (Removidos `alert()` do fluxo da Central de Evolução, substituídos por feedback visual em toasts não-bloqueantes usando o padrão global `showNotification` com tratamento específico para estados de carregamento, sucesso e erros/offline).
  - `gestao-barbearia/js/app_core.js` (Idem, removidos alerts e integrado o comportamento de notificação por toasts não bloqueantes).
  - `gestao-beleza/js/app_core.js` (Idem, removidos alerts e integrado o comportamento de notificação por toasts não bloqueantes).
- **Testes Unitários e Integração:**
  - `tests/evolution-leads.test.mjs` (Atualizado para validar que nenhum sistema standalone usa `alert()` no fluxo comercial de evolução, e que o admin não possui `onchange` inline na tabela de leads).

## 2. Confirmações Críticas de Segurança
- **Nenhum zip/deploy package foi gerado.**
- **deploy_packages/ não foi alterado nesta fase.**

## 3. Validações Executadas
- Execução do teste de sintaxe do PHP: `php -l api_licenca_ml.php` (Ok).
- Execução dos testes automatizados:
  - `node --test tests/evolution-leads.test.mjs` (Pass - 7/7)
  - `node --test tests/admin-hardening.test.mjs` (Pass - 18/18)
  - `node --test tests/admin-saas-central.test.mjs` (Pass - 19/19)
  - **Total:** 44/44 testes aprovados.

## 4. Riscos Restantes
- O comportamento offline informa amigavelmente que o envio falhou e que o registro de interesse não pôde ser completado. Como os sistemas rodam de maneira standalone e local, a perda de conexão no momento exato do clique não gerará problemas de usabilidade uma vez que o feedback é exibido em formato de toast não bloqueante.
