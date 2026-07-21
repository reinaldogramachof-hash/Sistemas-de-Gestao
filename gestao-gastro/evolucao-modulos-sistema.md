# Roteiro de Evolução: Módulos do "Sistema"

Este documento detalha as ações funcionais e de experiência de usuário planejadas exclusivamente para os módulos estruturais do Gestão Gastro (Configurações, Suporte, Segurança e Central de Evolução).

Essas melhorias visam reduzir a dependência de suporte técnico, simplificar o *onboarding* (implantação) e garantir rastreabilidade das ações críticas do sistema.

---

## Histórico de Sessões

### 🗓️ Sessão 21/07/2026 — Controle de Acesso por Perfil, Auditoria e Redirecionamento Inteligente

**Commits:** `a736e14` · `5250a26` · `2165089`
**Pacote deploy:** `deploy_packages/atualizar.zip`

#### ✅ Controle de Acesso e Perfis

- [x] Separação dos painéis de login: **Administrador**, **Atendente (cashier)** e **Garçom (waiter)**.
- [x] Permissões por perfil consolidadas:
  - **Atendente:** PDV, Mesas, Caixa — sem acesso a Gestão (Cardápio, Financeiro, Estoque) nem a Sistema (Configurações, Segurança).
  - **Garçom:** apenas Mesas / Comanda Mobile.
  - **Administrador/Owner:** acesso total a todos os módulos.
- [x] **Redirecionamento automático ao login por perfil:**
  - Atendente → **PDV (Balcão)** diretamente.
  - Garçom → **Mesas** (mobile → `/comanda`) diretamente.
  - Administrador → **Dashboard de Indicadores**.
  - Guard ativo: tentativa de acessar módulo restrito redireciona para o módulo principal do perfil (sem mensagem de "recurso não disponível").

#### ✅ Auditoria de Segurança — Trilha Completa de Ações

- [x] **PDV:** `operator_switch`, `sale_complete`, `order_cancel`
- [x] **Caixa:** `cashier_open`, `cashier_close`, `cashier_movement`, `cashier_movement_delete`
- [x] **Salão:** `table_open`, `table_release`
- [x] **Equipe:** `collaborator_add`, `collaborator_update`, `collaborator_status`
- [x] Filtragem de metadados: segredos mascarados; dados operacionais (operador, valor, forma de pagamento, item) visíveis para revisão dos administradores.
- [x] Remoção do card estático **"Matriz de Acesso & Permissões dos Usuários"** — tela de Segurança focada na Trilha de Auditoria com filtros e exportação CSV.

#### ✅ PDV — Vinculação de Operador

- [x] Colaborador logado detectado automaticamente como operador padrão no PDV (`selectedOperatorId`).
- [x] Troca manual de operador registrada no log de auditoria.

---

## 1. Módulo de Configurações (`Settings.tsx`)

### Ações de Melhoria:
- [x] **Reorganização Visual (Abas/Pílulas):** Estabelecimento, Equipe & Acessos, Rede Local & QR Code, Mesas e Salão, Impressão, Dados e Backups.
- [ ] **Assistente de Rede (Troubleshooting):** Botão "Diagnosticar Conexão" com verificação de portas no firewall do Windows.
- [ ] **Visibilidade de Nuvem vs Local:** Rótulos visuais indicando se a ação afeta dispositivo local ou Supabase.

---

## 2. Módulo de Suporte (`Support.tsx`)

### Ações de Melhoria:
- [x] **Painel de Saúde do Sistema (Health Check):** Status internet, Supabase, Service Worker (PWA) e fila offline.
- [x] **Diagnóstico Copiável (One-Click):** Gera texto limpo com Tenant ID, versão, fila offline e falhas ativas — sem expor chaves de API ou tokens.
- [ ] **Links Úteis e Base de Conhecimento:** Links para vídeos curtos das principais funções operacionais.

---

## 3. Módulo de Segurança (`Security.tsx`)

### Ações de Melhoria:
- [x] **Trilha de Auditoria (Logs Críticos):** Cobertura completa de PDV, Caixa, Salão e Equipe (ver Sessão 21/07/2026).
- [x] **Tabela de Auditoria com Filtros:** Busca por tipo de evento, colaborador e período; paginação; exportação CSV.
- [x] **Remoção da Matriz de Permissões Estática:** Tela focada na Trilha de Auditoria dinâmica.
- [ ] **Revogação de Dispositivos (Sessões):** Deslogar forçadamente sessões ativas remotamente.

---

## 4. Módulo Central de Evolução (`EvolutionCenter.tsx`)

### Ações de Melhoria:
- [x] **Changelog Visível (O que há de novo):** Release notes consumidas de JSON/Supabase.
- [x] **Quadro de Sugestões:** Formulário de envio de sugestões direto para a equipe de desenvolvimento.

---

## Próximos Itens Pendentes

- [ ] Assistente de diagnóstico de rede em Configurações.
- [ ] Links e base de conhecimento em vídeo no Suporte.
- [ ] Revogação de sessões remotas em Segurança.
