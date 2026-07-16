# Painel Admin - Fluxos Comerciais e de Provisionamento

Este documento descreve as três trilhas comerciais oficiais suportadas pela plataforma e como elas se separam em nível de banco de dados, API e uso de tenants.

## 1. Mercado Livre / Vitalício
- **Produto**: Entrada, focado em vendas isoladas no Mercado Livre.
- **Preço Médio**: R$ 97,00 (pagamento único).
- **Características**:
  - Uso local ou como PWA em dispositivo.
  - Ativação por chave gerada localmente.
  - Armazena os dados no `localStorage`.
  - Recibo de entrega digital fornecido ao cliente.
- **Backend (API)**: Processado exclusivamente por `api_licenca_ml.php`.
- **Tenant (SaaS)**: **Nenhum**. Não cria tenant no Supabase e não possui estrutura em banco de dados nuvem online (SaaS).

## 2. Venda Direta / Vitalício Premium
- **Produto**: Solução premium, adquirida diretamente pelos canais de vendas.
- **Preço Médio**: Entre R$ 299,90 e R$ 599,90 (pagamento único).
- **Características**:
  - Mesmo fluxo técnico da licença Mercado Livre, operando em modo local.
  - Ativação por chave local.
  - Pode incluir recursos avançados locais e suporte inicial customizado.
- **Backend (API)**: Processado exclusivamente por `api_licenca_ml.php`.
- **Tenant (SaaS)**: **Nenhum**. A fonte de dados é local/PWA, sem criação de estrutura de dados no Supabase.

## 3. SaaS / Planos Online
- **Produto**: Sistema em nuvem, com mensalidade recorrente (Planos Básico, Premium e futuros).
- **Características**:
  - Exige criação de tenant (separação de ambiente em banco).
  - Controle de usuários, rotas, e dados centralizados no Supabase.
  - Geração automática de chaves e configuração atreladas ao banco de dados.
- **Backend (API)**: Processado exclusivamente por `api_provisioning.php` (chamando `public.provision_saas_tenant`).
- **Restrição**: O cliente **Gestão Gastro (Cantinho da Resenha)** deve seguir **obrigatoriamente** esta trilha, utilizando o modo online e de tenant, devido a integrações avançadas e segurança centralizada.

## Segurança e Prevenção de Falhas
- **Isolamento de Funcionalidades**: Para evitar criação indevida de acessos e "contaminação" de banco de dados:
  - O fluxo de geração de **Licenças Vitalícias** está restrito apenas para modos locais, ignorando qualquer tentativa de passar `tenant_slug` ou utilizar modelo de cobrança mensal.
  - O provisionamento **SaaS** requer que a Procedure (RPC) correspondente (`provision_saas_tenant`) exista no Supabase.

Qualquer tentativa de alterar ou remover as restrições arquiteturais para forçar o sistema SaaS a usar lógicas offline, ou vice-versa, não é recomendada e deve passar por revisão técnica.
