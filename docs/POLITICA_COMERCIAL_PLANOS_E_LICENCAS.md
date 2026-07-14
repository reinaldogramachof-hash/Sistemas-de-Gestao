# Politica Comercial de Planos e Licencas

Data: 2026-07-13

## Objetivo

Todos os sistemas atuais e futuros devem seguir a mesma base comercial de liberacao. O painel admin deve ser a fonte de verdade para gerar licencas, liberar planos, identificar o canal de venda e preparar a evolucao mensal SaaS com Supabase.

## Modalidades Oficiais

| Codigo | Canal | Modelo | Backend | Preco Base | Regra |
| --- | --- | --- | --- | ---: | --- |
| `ml_lifetime` | Mercado Livre | Vitalicio local | API PHP + JSON | R$ 97,00 | Produto entregue via Mercado Livre, localStorage/PWA, sem promessa de nuvem. |
| `direct_lifetime` | Venda direta | Vitalicio local | API PHP + JSON | R$ 299,90 | Venda direta para cliente final, localStorage/PWA, suporte direto e liberacao local. |
| `pro_lifetime` | Venda direta Pro | Vitalicio local robusto | API PHP + JSON | R$ 599,90 | Sistema local mais robusto, com mais funcoes offline, sem custo recorrente de Supabase. |
| `premium_monthly` | Venda direta SaaS | Mensal online | API PHP + Supabase | Variavel por sistema/plano | Evolucao natural SaaS, com planos, modulos, usuarios, sincronizacao e funcionalidades online. |

## Regras Nao Negociaveis

1. Melhorias de manutencao, correcao, seguranca e estabilidade devem chegar aos clientes que ja compraram o modulo correspondente.
2. Novas capacidades online, recorrentes ou com custo de infraestrutura entram no fluxo SaaS mensal.
3. O painel admin deve armazenar `plan_code`, `plan_name`, `billing_model`, `sales_channel`, `system_version`, `package_version` e `price`.
4. Licencas antigas sem metadados devem continuar sendo interpretadas como `ml_lifetime` ate migracao formal.
5. Todo novo sistema deve nascer com esses quatro caminhos comerciais previstos, mesmo que o SaaS seja ativado depois.
6. A gestao mensal SaaS deve usar Supabase para tenant, plano, modulos, usuarios, licenca e auditoria.

## Papel do Painel Admin

O painel admin deve permitir:

- Gerar licencas de Mercado Livre, venda direta local, Pro local e SaaS mensal.
- Controlar status da licenca: pendente, ativa, bloqueada, expirada ou arquivada.
- Identificar canal e modelo comercial de cada venda.
- Vincular cliente, sistema, plano e modulos ativos.
- Evoluir para gestao de usuarios, limites de dispositivos, vencimentos e cobranca mensal.
- Preservar compatibilidade com API PHP/JSON enquanto a central SaaS com Supabase amadurece.

## Criterio de Evolucao

Antes de implementar uma funcionalidade nova, classificar como:

- `maintenance`: correcao ou melhoria de algo ja vendido.
- `offline_upgrade`: melhoria local robusta para plano Pro vitalicio.
- `saas_capability`: capacidade online/mensal com Supabase.

Essa classificacao define se a funcionalidade entra em todos os planos, apenas no Pro local, ou apenas no SaaS mensal.
