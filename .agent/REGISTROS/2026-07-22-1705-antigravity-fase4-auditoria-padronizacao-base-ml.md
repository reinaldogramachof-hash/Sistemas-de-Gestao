# Relatório de Auditoria — Fase 4: Padronização Base ML entre Sistemas Standalone

**Data/Hora:** 2026-07-22 17:05:00 -03:00
**Responsável:** Arquiteto de Software (Antigravity)
**Status:** Auditoria Somente Leitura Concluída

---

## 1. Confirmação Explicitada de Restrições

- **Auditoria somente leitura:** SIM
- **Nenhum arquivo de sistema foi alterado:** SIM
- **Nenhum zip/deploy package foi gerado:** SIM
- **Nenhum commit foi criado:** SIM
- **Nenhum ajuste feito em `gestao-gastro/`:** SIM

---

## 2. Mapa Estrutural por Sistema

### 2.1 Gestão Barbearia (`gestao-barbearia/`)
- **Padrão de Arquitetura:** Arquivo monolítico principal (`index.html` + `js/app_core.js`).
- **Arquivos na Raiz:**
  - `index.html` (256 KB): Visualizações SPA e modais legados.
  - `lock.js` (3.5 KB): Guardião Smart Lock v11.5 com migração transparente de chaves legadas.
  - `sw.js` (2.1 KB): Service Worker v6 com bypass explícito de APIs centralizadas (`api_`).
  - `manifest.json` (517 B): Manifesto PWA (tema `#2563EB`).
  - `access_denied.html` (1.6 KB): Tela de redirecionamento para licenças revogadas/bloqueadas.
  - `reset.html` (1.9 KB): Utilitário de redefinição de estado local.
- **Estrutura JS (`js/`):**
  - `app_core.js` (148 KB): Núcleo da aplicação, regras de negócio, backup e sanitização XSS.
  - `notif_logic.js` (11.1 KB): Módulo de consulta e exibição de notificações remotas.
  - `pdv.js` (8.3 KB): Lógica de vendas e frente de caixa.
  - `tailwind_config.js` (1.1 KB): Tematização Tailwind em JS.
  - `tutorial_logic.js` (2.8 KB): Controle de progresso do tutorial interativo.
- **Recursos Locais (`assets/`):**
  - `assets/libs/lucide.js`, `assets/libs/tailwindcss.js`, `assets/icon-512.png`.

---

### 2.2 Gestão Beleza (`gestao-beleza/`)
- **Padrão de Arquitetura:** Arquivo monolítico principal (`index.html` + `js/app_core.js`).
- **Arquivos na Raiz:**
  - `index.html` (154 KB): Visualizações SPA e formulários.
  - `lock.js` (7.4 KB): Guardião v12.1 estendido com suporte nativo a Período de Testes (Trial), Banner Flutuante e validação de Recibo ML inline no DOM.
  - `sw.js` (2.4 KB): Service Worker v3 com bypass de requisições de API (`api_`).
  - `manifest.json` (533 B): Manifesto PWA (tema `#e11d48`).
- **Estrutura JS (`js/`):**
  - `app_core.js` (98.3 KB): Regras de negócio, relatórios, caixa e sanitização.
  - `notif_logic.js` (11.4 KB): Módulo de notificações com cache de 30 min.
  - `tailwind_config.js` (999 B): Configurações visuais.
- **Recursos Locais (`assets/`):**
  - `assets/libs/lucide.js`, `assets/libs/tailwindcss.js`, `assets/icon-192.png`, `assets/icon-512.png`.

---

### 2.3 Gestão Assistência (`gestao-assistencia/`)
- **Padrão de Arquitetura:** Estrutura Modular ES (`assets/js/modules/` + `db.js` + `router.js`).
- **Arquivos na Raiz:**
  - `index.html` (221 KB): SPA estruturado por containers (`#view-orders`, `#view-clients`, etc.).
  - `lock.js` (2.5 KB): Guardião v11.4 básico (validação silenciosa e redirecionamento).
  - `sw.js` (1.2 KB): Service Worker v7 básico (estratégia simples de cache).
  - `manifest.json` (530 B): Manifesto PWA (tema `#2563EB`).
  - `os_extracted.js` (31 KB): Módulo extraído para gestão de Ordens de Serviço.
  - *Arquivos Sobressalentes:* `STATUS_ATUALIZACAO_OS.md`, `check-divs.js`, `check-global-divs.js`, `index.html.bak.premium`, `index.html.bak.20260215_101408`.
- **Estrutura JS (`assets/js/`):**
  - `app.js` (9.1 KB): Inicializador e bindings globais.
  - `db.js` (7.6 KB): Motor de banco local em LocalStorage (`gestao_assistencia_v1`).
  - `router.js` (4.6 KB): Roteador SPA.
  - `tailwind_config.js` (1.7 KB): Configurações visuais.
  - `modules/clients.js` (17.6 KB): Gestão de Clientes.
  - `modules/evolution.js` (7.0 KB): Central de Evolução SaaS.
  - `modules/financial.js` (11.2 KB): Controle Financeiro e Caixa.
  - `modules/inventory.js` (20.9 KB): Estoque de Peças e Peças Utilizadas.
  - `modules/orders.js` (48.4 KB): Gestão de Ordem de Serviço, Impressão e Garantia.
  - `modules/pdv.js` (27.7 KB): Venda Rápida de Peças e Acessórios.
  - `modules/reports.js` (11.6 KB): Relatórios Gerenciais.
  - `modules/clients_fixed.js` (4.7 KB): Arquivo residual de ajuste prévio.
- **Recursos Locais (`assets/`):**
  - `assets/libs/lucide.js`, `assets/libs/tailwindcss.js`, `assets/img/icons/icon-192.png`, `assets/img/icons/icon-512.png`.

---

## 3. Comparativo de Módulos Funcionais

| Módulo / Funcionalidade | Gestão Barbearia | Gestão Beleza | Gestão Assistência | Situação / Diagnóstico |
| :--- | :---: | :---: | :---: | :--- |
| **Ativação e Licença** | Sim (`lock.js` v11.5) | Sim (`lock.js` v12.1 com Trial) | Parcial (`lock.js` v11.4) | Barbearia e Beleza possuem guardiões resilientes. Assistência necessita atualização para o padrão v12.1. |
| **Recibo / Termo Mercado Livre** | Sim (`barbearia_receipt_confirmed`) | Sim (`welcome-receipt-modal`) | Parcial (Lógica inline no HTML) | Assistência não possui o modal visual padronizado de boas-vindas do ML. |
| **Central de Notificações** | Sim (`js/notif_logic.js`) | Sim (`js/notif_logic.js`) | **Ausente** | Assistência não possui o módulo `notif_logic.js` nem consome `api_notificacoes.php`. |
| **Central Evolução SaaS** | Sim (`register_evolution_lead`) | Sim (`register_evolution_lead`) | Sim (`modules/evolution.js`) | **100% Alinhado:** Os três sistemas capturam leads para a Central SaaS com sucesso. |
| **Dashboard / Visão Geral** | Sim | Sim | Sim | Presente em todos os três sistemas. |
| **Gestão de Clientes** | Sim | Sim | Sim (`modules/clients.js`) | Presente em todos os três sistemas. |
| **Financeiro e Caixa** | Sim | Sim | Sim (`modules/financial.js`) | Presente em todos os três sistemas. |
| **Estoque e Produtos** | Sim | Sim | Sim (`modules/inventory.js`) | Presente em todos os três sistemas. |
| **Serviços / Agendamentos / OS** | Sim (Agendamentos) | Sim (Agendamentos/Serviços) | Sim (`modules/orders.js`) | Específico por nicho (Cadeiras x Estética x Ordens de Serviço). |
| **Relatórios Gerenciais** | Sim | Sim | Sim (`modules/reports.js`) | Presente em todos os três sistemas. |
| **Configurações da Empresa** | Sim | Sim | Sim | Presente em todos os três sistemas. |
| **PWA / Service Worker** | Sim (v6 + bypass `api_`) | Sim (v3 + bypass `api_`) | Parcial (v7 sem bypass `api_`) | Assistência corre risco de cachear chamadas de API no SW. |
| **Carga de Dados Seed (Demo)** | Sim (`defaultDB`) | Sim (`defaultDB`) | Sim (`db.js`) | Presente em todos os três sistemas. |
| **Exportação / Impressão** | Sim (PDF/CSV/Excel) | Sim (PDF/CSV/Excel) | Sim (Impressão de O.S. / Garantia) | Adaptado por nicho. |
| **Backup e Importação JSON** | Sim (Sanitização XSS) | Sim (Sanitização XSS) | Sim (Importação via `db.js`) | Barbearia e Beleza possuem testes unitários automatizados para backup. |

---

## 4. Comparativo de Contratos Técnicos

### 4.1 Armazenamento Local (`localStorage`)
- **Gestão Barbearia:**
  - `barbearia_license`, `barbearia_email`, `barbearia_device`, `barbearia_receipt_confirmed`
  - `brand_barber_pro_v2` (Chave principal do banco local)
  - `ml_notif_read_barber`, `ml_notif_cache_barber`
  - `tutorial_progress`, `brand_manual_completed`, `brand_checklist_state`
- **Gestão Beleza:**
  - `beleza_license`, `beleza_email`, `beleza_device`, `beleza_receipt_confirmed`
  - `brand_beauty_pro_v2` (Chave principal do banco local)
  - `ml_notif_read_beleza`, `ml_notif_cache_beleza`
  - `beleza_sidebar_open`, `tutorial_progress`
- **Gestão Assistência:**
  - `assistencia_license`, `assistencia_email`, `assistencia_device`, `assistencia_receipt_confirmed`
  - `gestao_assistencia_v1` (Chave principal do banco local - fora do padrão `brand_[nicho]_pro_v2`)
  - `manual_progress` (**Sem namespace**, risco de conflito global)

### 4.2 Identificação de Dispositivo (`device_id`)
- Todos os três sistemas utilizam a mesma assinatura de geração de ID único:
  `'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)`

### 4.3 Validação de Licença Backend
- **Endpoint Central:** `POST ../api_licenca_ml.php?action=verify`
- **Payload:** `{ license_key, email, device_id }`
- **Comportamento em Bloqueio:**
  - Barbearia: Redireciona para `access_denied.html`.
  - Beleza: Trata diretamente no DOM via `blockSystem()` em `lock.js` v12.1.
  - Assistência: Redireciona para `access_denied.html` (porém **o arquivo não existe no diretório**).

### 4.4 Recibo Mercado Livre
- **Endpoint Central:** `POST ../api_licenca_ml.php?action=confirm_receipt`
- **Payload:** `{ license_key, email, device_id }`

### 4.5 Lead da Central Evolução SaaS
- **Endpoint Central:** `POST ../api_licenca_ml.php?action=register_evolution_lead`
- **Payload:** `{ license_key, email, system_id }`
- **Identificadores de Sistema:** `gestao-barbearia`, `gestao-beleza`, `gestao-assistencia`.

### 4.6 Filosofia Standalone Offline
- Todos os três sistemas realizam checagem silenciosa e aplicam **Fail-Open**: se a requisição de validação falhar por ausência de internet ou queda do servidor, o acesso local do usuário é mantido sem interrupções.

---

## 5. Base Comum ML Recomendada (Arquitetura Padrão)

Para a criação de novos sistemas no ecossistema ML (ex: Pet, Odonto, Lava-Jato, etc.), propõe-se a seguinte **Base Padrão Replicável**:

```text
gestao-[nicho]/
├── index.html               # SPA principal com estrutura de views por container
├── lock.js                  # Guardião Smart Lock v12.1 (Licença, Trial, Bloqueio DOM e Recibo)
├── sw.js                    # Service Worker com cache-first e passthrough no-store para /api_
├── manifest.json            # PWA Manifest com identidade visual do nicho
├── access_denied.html       # Página de bloqueio de segurança
└── assets/
    ├── css/
    │   └── styles.css       # Estilos customizados e overrides
    ├── img/
    │   └── icons/           # Ícones PWA
    ├── libs/
    │   ├── lucide.js        # Biblioteca de ícones offline
    │   └── tailwindcss.js   # Framework CSS standalone offline
    └── js/
        ├── app.js           # Orquestrador principal da aplicação
        ├── db.js            # Engine de armazenamento local com suporte a backup e sanitização XSS
        ├── router.js        # Roteador SPA leve
        ├── notif_logic.js   # Módulo padrão de Notificações centralizadas
        ├── tailwind_config.js # Configuração visual do tema
        └── modules/         # Módulos funcionais encapsulados (ES Modules)
            ├── clients.js
            ├── financial.js
            ├── inventory.js
            ├── evolution.js # Central Evolução SaaS
            ├── reports.js
            └── [nicho].js   # Lógica específica do nicho
```

### Regras de Padronização de Armazenamento:
1. **Licença:** `[nicho]_license`
2. **E-mail:** `[nicho]_email`
3. **Dispositivo:** `[nicho]_device`
4. **Recibo:** `[nicho]_receipt_confirmed`
5. **Banco Local:** `brand_[nicho]_pro_v2`
6. **Notificações:** `ml_notif_read_[nicho]`, `ml_notif_cache_[nicho]`
7. **Progresso:** `[nicho]_tutorial_progress`

---

## 6. Tabela Objetiva de Lacunas por Sistema

| Recurso / Módulo | Barbearia | Beleza | Assistência | Recomendação do Arquiteto | Prioridade |
| :--- | :---: | :---: | :---: | :--- | :---: |
| **Central de Notificações** | OK | OK | **Ausente** | Portar `notif_logic.js` e a view de notificações para Assistência. | **Alta** |
| **Service Worker (Bypass API)** | OK | OK | **Sem Bypass** | Adicionar regra `no-store` para rotas `/api_` em `gestao-assistencia/sw.js`. | **Alta** |
| **Tratamento de Bloqueio de Licença** | `access_denied.html` | Inline (`lock.js`) | Redireciona p/ 404 | Criar `access_denied.html` em Assistência ou atualizar `lock.js` para v12.1. | **Alta** |
| **Modal de Recibo ML** | OK | OK | Incompleto | Incluir componente de modal de recibo padrão em Assistência. | **Média** |
| **Namespace em `manual_progress`** | OK | OK | `manual_progress` | Alterar chave para `assistencia_manual_progress` para evitar colisões. | **Média** |
| **Nomenclatura da DB_KEY** | `brand_barber...` | `brand_beauty...` | `gestao_assistencia_v1` | Padronizar prefixo para `brand_assistencia_pro_v2` com migração transparente. | **Baixa** |
| **Limpeza de Arquivos Sobressalentes** | Limpo | Limpo | Possui `.bak` e testes | Remover arquivos `.bak` e scripts temporários de raiz em Assistência. | **Baixa** |

---

## 7. Riscos Identificados e Decisões do Arquiteto

1. **Risco de Tela 404 em Caso de Bloqueio em Assistência:**
   Como `gestao-assistencia/lock.js` tenta redirecionar para `access_denied.html` e o arquivo não existe, o cliente bloqueado verá um erro 404 em vez de uma tela instrutiva.
   *Decisão:* Atualizar o `lock.js` de Assistência para a versão v12.1 (com modal e banner inline) ou adicionar `access_denied.html`.

2. **Risco de Cache Indevido no Service Worker de Assistência:**
   O `sw.js` de Assistência não possui filtro com `cache: 'no-store'` para rotas de API. Se uma API for chamada pelo navegador via Service Worker, ela pode ficar retida no cache HTTP.
   *Decisão:* Padronizar o Service Worker de Assistência com a estratégia utilizada em Barbearia e Beleza.

3. **Discrepância Arquitetural Monolito vs. Modular:**
   Barbearia e Beleza utilizam `js/app_core.js` (monolítico), enquanto Assistência utiliza `assets/js/modules/` (modular). A estrutura modular de Assistência é tecnicamente superior para escalabilidade e novos desenvolvimentos.
   *Decisão:* Adotar a estrutura modular em ES Modules (`assets/js/modules/`) como a **Base Padronizada Oficial** para novos sistemas do ecossistema.

---

**Caminho do Registro:** `.agent/REGISTROS/2026-07-22-1705-antigravity-fase4-auditoria-padronizacao-base-ml.md`
