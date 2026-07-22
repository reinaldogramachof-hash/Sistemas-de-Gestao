# Fase 5.1 — Hardening das Notificações da Assistência
**Data:** 2026-07-22 | **Agente:** Antigravity | **Status:** ✅ CONCLUÍDO

---

## Objetivo
Blindar a renderização das notificações no módulo `notif_logic.js` da Gestão Assistência, eliminando riscos de injeção HTML/script e handlers inline.

## Escopo autorizado
- `gestao-assistencia/assets/js/notif_logic.js`
- `tests/assistencia-standardization.test.mjs`
- `.agent/REGISTROS/`

## Ações realizadas

### 1. Sanitização HTML (escapeHtml)
- Helper `escapeHtml(str)` criado e aplicado a todos os campos renderizados dinamicamente:
  - `n.title` → `escapeHtml(n.title)` = `safeTitle`
  - `n.body` → `escapeHtml(n.body)` = `safeBody`
  - `n.details` → `escapeHtml(n.details)` = `safeDetails`
  - `n.version` → `escapeHtml(n.version)` = `safeVersion`
  - `String(n.id)` → `escapeHtml(strId)` = `safeId`
  - `tc.label` → `escapeHtml(tc.label)` = `safeLabel`
- Caracteres cobertos: `&`, `<`, `>`, `"`, `'`

### 2. Eliminação de handlers inline (onclick)
- Substituído `onclick="markAsRead(...)"` por `data-notif-id="${safeId}"` no botão
- Listener único via delegação no container `#notif-list`
- Função `setupNotifContainerListeners()` garante attachment único com flag `__notifListenerAttached`

### 3. Formatação segura de data
- Helper `formatPublishedDate(published)` criado com:
  - Fallback `'Data não informada'` para valores falsy
  - Validação via `isNaN(dateObj.getTime())`
  - Try/catch em `toLocaleString` para resiliência total

### 4. Resiliência de ID com fallback
- IDs ausentes/nulos geram `notif_fallback_${idx}` via map no `processNotifications`

### 5. Exposição global segura
- `escapeHtml` e `formatPublishedDate` expostos em `window` para possível uso externo

## Testes adicionados / atualizados
- `tests/assistencia-standardization.test.mjs` — novo bloco:
  - **Subtest 4**: Hardening em `notif_logic.js` — sanitização, sem inline onclick, event listeners, resiliência de data/ID
  - Mantidos subtests 1–3 e 5–6 de fases anteriores

## Resultado da validação
```
TAP version 13
ok 1 - PWA Service Worker in gestao-assistencia has API bypass with no-store
ok 2 - Access denied page exists and lock.js points to it
ok 3 - Central Notifications module is integrated in gestao-assistencia
ok 4 - Hardening in gestao-assistencia/assets/js/notif_logic.js (Sanitization, No inline onclick, Event listeners, Date handling)
ok 5 - LocalStorage manual_progress is namespaced to assistencia_manual_progress with fallback
ok 6 - Out of scope directories and files remain untouched
# tests 6 | pass 6 | fail 0
```

## Fora de escopo (não alterado)
- `gestao-barbearia/`, `gestao-beleza/`, `gestao-gastro/`
- `deploy_packages/`, APIs PHP, admin, zips
- `sw.js` (service worker), demais arquivos da Assistência

## Próximo passo sugerido
**Fase 5.2** — Auditoria de consistência de recibo Mercado Livre entre os três sistemas standalone, ou commit/deploy da Assistência após aprovação humana.
