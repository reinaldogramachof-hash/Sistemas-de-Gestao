# Auditoria do Módulo Catálogo Comercial

**Data/Hora:** 23 de Julho de 2026, 15:51 (-03:00)
**Módulo:** Catálogo Comercial (Painel Admin)
**Status:** Leitura / Read-Only

## 1. Papel Funcional Atual do Módulo
O módulo **Catálogo Comercial** atua visualmente no Admin (via aba `<div id="tab-systems">`) como a vitrine dos sistemas e planos disponíveis, sendo alimentado primariamente pela nuvem (Supabase). Ele dita quais sistemas aparecem no dropdown de provisionamento SaaS e como as nomenclaturas são exibidas no CRM e nos formulários. Contudo, seu papel comercial real está fragmentado, pois ele não governa as vendas vitalícias ou geradores de licença, que possuem lógicas isoladas.

## 2. Fontes de Dados Encontradas
1. **Supabase (Nuvem)**: Fonte principal e dinâmica para sistemas SaaS, planos e módulos. Chamado via `api_provisioning.php` (`action === 'systems_catalog'`).
2. **`SAAS_CATALOG_FALLBACK` (Admin - `index.html`)**: Constante local usada para popular o frontend caso o Supabase falhe ou esteja indisponível. Atualmente muito focado no Gestão Gastro (planos Essencial e Premium).
3. **Hardcoded Arrays (PHP - `api_licenca_ml.php`)**: Múltiplas listas engessadas (ex: `$allowedSystems = ['gestao-gastro', 'gestao-barbearia', 'gestao-beleza'];`), validando vendas ML e Diretas.
4. **`api_data/products_catalog.json`**: Arquivo vazio (`[]`), indicando que não está sendo aproveitado como fonte de verdade local.

## 3. Integrações Existentes
- **Clientes SaaS (`api_provisioning.php`)**: Altamente integrado. O dropdown de novos clientes SaaS consome o catálogo para vincular o `systemSlug` e o `planSlug`.
- **CRM / Dashboard (`admin/index.html`)**: Consome o catálogo para formatar links de acesso dos clientes (`getClientAccessLink`) e padronizar nomes.
- **Licenças Vitalícias & ML (`api_licenca_ml.php`)**: **Não integrado** ao catálogo SaaS. Funciona com variáveis e arrays hardcoded.
- **Leads Evolução (`api_licenca_ml.php`)**: Identifica planos (`ml_lifetime`, `basic`, etc.) usando arrays isolados.

## 4. Divergências Encontradas
- **Nuvem vs Local**: O catálogo online do Admin se propõe a ser central, mas as apis legadas e de vendas (ML) ignoram-no completamente.
- **Divergências de Sistemas**: A validação em `api_licenca_ml.php` (linha 1183) aceita `['gestao-gastro', 'gestao-barbearia', 'gestao-beleza']`, mas a validação de leads (linha 1383) aceita `['gestao-assistencia', 'gestao-barbearia', 'gestao-beleza']` (omite Gastro, inclui Assistência).
- **Fallback Incompleto**: O `SAAS_CATALOG_FALLBACK` define os planos 'basic' e 'premium' com preços hardcoded (`R$ 89/mês` e `R$ 189/mês`) apenas para o Gestão Gastro em sua totalidade; outros sistemas não estão mapeados detalhadamente no fallback.
- **Modelos Comerciais**: Produtos `ml_lifetime` e `site_lifetime` constam no backend ML, mas o Catálogo Comercial (visão Admin) parece focado apenas em gerenciar planos recorrentes (SaaS).

## 5. Riscos Operacionais
1. **Catálogo Fracionado**: Lançar um novo sistema no Supabase fará com que ele apareça no Admin para SaaS, mas vendas no Mercado Livre ou via licenças manuais falharão por conta dos arrays hardcoded no backend.
2. **Preço e Provisionamento Divergentes**: Se o Supabase estiver off, o sistema de provisionamento usa o Fallback local que contém preços hardcoded (R$ 89). Pode não refletir a realidade atual (risco de exibição incorreta e desalinhamento).
3. **Gestão Assistência Bloqueado**: Como `gestao-assistencia` foi omitido no array principal de vendas (`api_licenca_ml.php`), a venda/geração de licença para este sistema pode sofrer falhas ("Sistema inválido").
4. **Gastro como Vitalício**: O Gestão Gastro consta nas rotas do ML (`api_licenca_ml.php`), mesmo sendo o carro-chefe SaaS e possivelmente não preparado ou destinado à venda vitalícia ML padrão.

## 6. Recomendações de Curto Prazo (Fase Atual)
- Unificar os arrays hardcoded de sistemas no `api_licenca_ml.php` para um array global ou apontar para um config.
- Povoar o arquivo `products_catalog.json` para atuar como cache/single-source-of-truth offline, substituindo o `SAAS_CATALOG_FALLBACK` hardcoded no JS.
- Mapear claramente no Catálogo quais produtos são SaaS e quais são Vitalícios.

## 7. Recomendações Futuras
- **Central de Governança Comercial**: Tornar o Catálogo Comercial agnóstico (Supabase governando SaaS, Vitalício, ML, Módulos Avulsos). O endpoint PHP deve consultar o Supabase e expor uma API estrita de produtos para todos os geradores e checkouts.
- **Desacoplar Regras de Negócio do Frontend**: Remover validações e construções de fallback do `admin/index.html` e unificar as regras num Controller comercial dedicado.

> **Confirmação:** Declaro que esta auditoria foi executada de forma **read-only**. Nenhuma linha de código foi alterada, nenhum commit ou deploy foi realizado.
