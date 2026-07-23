# Matriz Comercial Canônica - Documento de Aprovação do Arquiteto (Fase A.1)

**Data:** 2026-07-22  
**Autor:** Agente Dev Sênior Antigravity  
**Finalidade:** Apresentação consolidada para revisão e decisão formal do Arquiteto  
**Projeto:** Sistemas de Gestão (Plena Informática)

---

## 1. Visão Geral para Decisão

Este documento resume a auditoria da **Matriz Comercial Canônica** dos quatro sistemas Plena (**Gestão Assistência**, **Gestão Barbearia**, **Gestão Beleza** e **Gestão Gastro**), separando rigorosamente os dados **atuais observados** das **propostas canônicas recomendadas** para homologação do Arquiteto antes do início da Fase B (implementação técnica).

---

## 2. Matriz Consolidada por Sistema (Atual Observado vs. Canônico Recomendado)

### 2.1. Gestão Assistência
- **ML Vitalício (`ml_lifetime`):**
  - *Atual Observado:* R$ 97,00 (Mercado Livre). Sistema local para 1 PC. O.S., Peças, PDV, Caixa, Clientes e Relatórios simples.
  - *Canônico Recomendado:* `Gestão Assistência Pro - ML Vitalício` (R$ 97,00). Manter 100% local.
- **Site Vitalício (`direct_lifetime`):**
  - *Atual Observado:* **R$ 299,90 pagamento único** (na landing `assistencia-pro.html`).
  - *Canônico Recomendado:* `Gestão Assistência Pro - Direto Vitalício` (R$ 299,90).
- **Online Essencial (`basic` / `monthly_essential`):**
  - *Atual Observado:* **R$ 97,90/mês** com a nomenclatura `Multiusuário` na landing específica (`assistencia-pro.html`). Na página geral `tecnologia.html` menciona "a partir de R$ 59,90/mês". O Admin omite este produto.
  - *Canônico Recomendado:* `Gestão Assistência Online Essencial` (Padronização sugerida de nome; definir valor entre R$ 59,90 e R$ 97,90/mês).
- **Online Premium (`premium` / `monthly_premium`):**
  - *Atual Observado:* **R$ 149,90/mês** com a nomenclatura `On-line Avançado` na landing específica.
  - *Canônico Recomendado:* `Gestão Assistência Online Premium` (R$ 149,90/mês ou padronizar em R$ 99,00/mês. Inclui Portal do Cliente O.S. e WhatsApp).
- **Projeto com Marca (`custom_project`):**
  - *Atual Observado:* **R$ 1.299,90 implantação inicial** (`Sistema Completo com sua Marca` na landing).
  - *Canônico Recomendado:* `Gestão Assistência Enterprise` (R$ 1.299,90 implantação + mensalidade).

---

### 2.2. Gestão Barbearia
- **ML Vitalício (`ml_lifetime`):**
  - *Atual Observado:* R$ 97,00 (Mercado Livre). Local para 1 PC. Agenda manual por barbeiro, Comissões, PDV, Caixa.
  - *Canônico Recomendado:* `Gestão Barbearia Pro - ML Vitalício` (R$ 97,00).
- **Site Vitalício (`direct_lifetime`):**
  - *Atual Observado:* R$ 299,90 pagamento único.
  - *Canônico Recomendado:* `Gestão Barbearia Pro - Direto Vitalício` (R$ 299,90).
- **Online Essencial (`basic`):**
  - *Atual Observado:* Admin marca Básico R$ 59,00/mês. Landing Tech menciona a partir de R$ 59,90/mês.
  - *Canônico Recomendado:* `Gestão Barbearia Online Essencial` (R$ 59,90/mês).
- **Online Premium (`premium`):**
  - *Atual Observado:* Admin marca Premium Online R$ 99,00/mês.
  - *Canônico Recomendado:* `Gestão Barbearia Online Premium` (R$ 99,00/mês). Agendamento Online pelos Clientes, Página Pública e WhatsApp.
- **Projeto com Marca (`custom_project`):**
  - *Atual Observado:* **R$ 1.699,90 implantação inicial** (Landing Barbearia).
  - *Canônico Recomendado:* `Gestão Barbearia Enterprise` (R$ 1.699,90 implantação + mensalidade). App/PWA próprio.

---

### 2.3. Gestão Beleza
- **ML Vitalício (`ml_lifetime`):**
  - *Atual Observado:* R$ 97,00 (Mercado Livre). Local para 1 PC. Agenda por especialista, Pacotes, Checkout, Caixa.
  - *Canônico Recomendado:* `Gestão Beleza Pro - ML Vitalício` (R$ 97,00).
- **Site Vitalício (`direct_lifetime`):**
  - *Atual Observado:* R$ 299,90 pagamento único.
  - *Canônico Recomendado:* `Gestão Beleza Pro - Direto Vitalício` (R$ 299,90).
- **Online Essencial (`basic`):**
  - *Atual Observado:* Admin marca Básico R$ 69,00/mês. Landing Tech menciona a partir de R$ 59,90/mês.
  - *Canônico Recomendado:* `Gestão Beleza Online Essencial` (R$ 59,90/mês ou R$ 69,00/mês).
- **Online Premium (`premium`):**
  - *Atual Observado:* Admin marca Premium R$ 129,00/mês.
  - *Canônico Recomendado:* `Gestão Beleza Online Premium` (R$ 99,00/mês ou R$ 129,00/mês). Agendamento Online, Pacotes e Página Pública.
- **Projeto com Marca (`custom_project`):**
  - *Atual Observado:* **R$ 1.699,90 implantação inicial** (Landing Beleza).
  - *Canônico Recomendado:* `Gestão Beleza Enterprise` (R$ 1.699,90 implantação + mensalidade).

---

### 2.4. Gestão Gastro
- **ML Vitalício (`ml_lifetime`):**
  - *Atual Observado:* **INEXISTENTE HOJE.** Gastro opera 100% via SaaS/Supabase.
  - *Canônico Recomendado:* **PROPOSTA FUTURA:** `Gestão Gastro Balcão Local` (PDV Balcão + Caixa local em 1 PC).
- **Site Vitalício (`direct_lifetime`):**
  - *Atual Observado:* Inexistente hoje.
  - *Canônico Recomendado:* Manter sem oferta vitalícia no site por enquanto.
- **Online Essencial (`basic`):**
  - *Atual Observado:* Landing Gastro marca R$ 89,00/mês (`Essencial`). Admin marca R$ 97,00/mês (`basic`).
  - *Canônico Recomendado:* `Gestão Gastro Online Essencial` (R$ 89,00/mês). PDV, Mesas/Comandas, Garçom Mobile, Cardápio Digital.
- **Online Premium (`premium`):**
  - *Atual Observado:* Landing Gastro marca R$ 189,00/mês (`Profissional`) e R$ 329,00/mês (`Gestão`). Admin marca R$ 197,00/mês (`premium`).
  - *Canônico Recomendado:* `Gestão Gastro Online Premium` (R$ 189,00/mês). KDS (Cozinha), Delivery, Pedidos Online e BI.
- **Projeto com Marca (`custom_project`):**
  - *Atual Observado:* **R$ 4.999,90 implantação inicial** (Landing Gastro).
  - *Canônico Recomendado:* `Gestão Gastro Enterprise` (R$ 4.999,90 implantação + mensalidade). Marca própria e servidor dedicado.

---

## 3. Pauta de Decisão Formal do Arquiteto (Homologada)

As 7 decisões estratégicas foram aprovadas pelo Arquiteto e aplicadas na **Fase B.1**:

| # | Item de Decisão | Escolha Aprovada | Status |
| :-: | :--- | :--- | :-: |
| **1** | **Preços Mensais da Assistência** | **Opção A:** `R$ 97,90/mês` (Online Essencial) / `R$ 149,90/mês` (Online Premium) | ✅ **APROVADO E IMPLEMENTADO (Fase B.1)** |
| **2** | **Preços Mensais do Gastro** | **Opção A:** `R$ 89,00/mês` (Online Essencial) / `R$ 189,00/mês` (Online Premium) | ✅ **APROVADO E IMPLEMENTADO (Fase B.1)** |
| **3** | **Padronização de Nomes** | **Opção A:** Adotar `Online Essencial` (`basic`) e `Online Premium` (`premium`) | ✅ **APROVADO E IMPLEMENTADO (Fase B.1)** |
| **4** | **Produto ML para o Gastro** | **Opção A:** Aprovado como especificação futura ("Gastro Balcão Local"). Não implementar nesta fase. | ✅ **APROVADO (Especificação Futura)** |
| **5** | **Inclusão da Assistência no Admin** | **Opção A:** Adicionar `gestao-assistencia` no catálogo local/SaaS do Admin e PHP | ✅ **APROVADO E IMPLEMENTADO (Fase B.1)** |
| **6** | **Evolução dos Leads no Backend** | **Opção A:** Adicionar `current_plan_code` e `target_plan_code` (Fase B.3) | ⏳ Aprovado para Fase B.3 |
| **7** | **Conversão Assistida no Admin** | **Opção A:** Criar atalho Lead convertido -> Provisionar Tenant (Fase B.3) | ⏳ Aprovado para Fase B.3 |

---

## 4. Registro de Implementação da Fase B.1 e B.1.1

Nesta etapa técnica (**Fase B.1** e refinamento **Fase B.1.1**), foi realizada a unificação completa do **catálogo comercial base** no Painel Admin (`admin/index.html`) e no backend PHP (`api_provisioning.php`), garantindo 100% de paridade de nomes públicos e preços canônicos em centavos (`price_cents` no PHP e `priceCents` no HTML).

- **Gestão Assistência:** Essencial = 9790 (R$ 97,90), Premium = 14990 (R$ 149,90), Trial = 0
- **Gestão Barbearia:** Essencial = 5990 (R$ 59,90), Premium = 9900 (R$ 99,00), Trial = 0
- **Gestão Beleza:** Essencial = 5990 (R$ 59,90), Premium = 9900 (R$ 99,00), Trial = 0
- **Gestão Gastro:** Essencial = 8900 (R$ 89,00), Premium = 18900 (R$ 189,00), Trial = 0

**Restrição respeitada:** Os módulos de evolução dos sistemas (`evolution.js`, `app_core.js`), APIs de licença ML e a base do Gastro não sofreram qualquer alteração nesta etapa.

---
*Documento atualizado em conformidade com as aprovações da Fase B.1.1.*

