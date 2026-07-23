# Registro Técnico - Fase C.4.1: Reorganização do Modal de Geração de Licenças
**Data/Hora local:** 2026-07-23T15:40:00-03:00
**Autor:** Antigravity (Agente Dev Sênior)

## Objetivos Alcançados
Reorganização conceitual e visual do modal **Gerar Licença Standalone / ML** (`#generate-modal`) no Painel Admin, separando claramente conceitos comerciais de liberações técnicas, definindo um sistema ML maduro como padrão e oferecendo um resumo dinâmico pré-emissão.

## Alterações Realizadas

### 1. Inclusão do Gestão Assistência e Padrão Barbearia
*   **Gestão Assistência Integrado**: Adicionado o `gestao-assistencia` ao seletor técnico `gen-system` e aos mapeamentos de dados em JS (`LICENSE_SEGMENTS_BY_SYSTEM` e `PRODUCT_BY_SYSTEM`).
*   **Default Maduro (Barbearia)**: Alterada a opção padrão selecionada do modal e os fallbacks em JS (`updateGenerateSystemPlanOptions` e `resolveLicenseGenerationContext`) de `gestao-gastro` para `gestao-barbearia` (`Gestão Barbearia`), evitando a emissão acidental de licenças standalone para o Gastro.

### 2. Separação em Seções Conceituais
O formulário foi reorganizado visualmente em 4 blocos distintos e numerados:
1.  **Identificação do Sistema**: Sistema Base (`gen-system`), Produto Comercial (`gen-product`) e Segmento (`gen-segment`).
2.  **Oferta & Modelo Comercial**: Modelo Comercial de Venda (`gen-plan`), Preço Registrado (`gen-price`) e Nome/E-mail do Cliente (`gen-client`).
3.  **Pacote de Recursos Liberação**: Rótulo ajustado para `Liberação / Pacote de Recursos (Plano)` (`gen-system-plan`), evidenciando o pacote técnico contratado.
4.  **Modalidade de Teste (Trial)**: Configuração de vigência temporária (`gen-trial` e `gen-trial-days`).

### 3. Descrições Comerciais Expandidas
As opções do modelo comercial (`gen-plan`) receberam descrições explicativas:
*   `ML Vitalício - Venda Mercado Livre (Chave Standalone)`
*   `Direto Vitalício - Venda Direta (Site/WhatsApp)`
*   `Pro Vitalício - Pacote local ampliado (Multi-recursos)`

### 4. Painel de Resumo Dinâmico (Live Summary Box)
*   Criado o elemento `#gen-live-summary` e a função associada `updateGenerateSummary()`.
*   Atualiza em tempo real conforme o operador altera os campos, exibindo:
    *   Sistema base e segmento selecionado;
    *   Modelo comercial e canal de venda;
    *   Pacote de liberação técnica e limites (aparelhos/usuários);
    *   Preço em reais (R$);
    *   Validade (Vitalício ou Trial com horas/dias);
    *   Alerta específico caso o produto selecionado seja o `Gestão Gastro`.

### 5. Cobertura de Testes
*   Adicionado o teste `Fase C.4.1: License generation modal reorganization, Gestão Assistência addition, Barbearia default and Live Summary` no arquivo [admin-saas-central.test.mjs](file:///C:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/tests/admin-saas-central.test.mjs), cobrindo as novas opções do Assistência, o padrão Barbearia, as novas labels do modal e o gerador do resumo live.

## Validações Executadas
1.  `php -l api_licenca_ml.php` -> Syntax OK
2.  `php -l api_provisioning.php` -> Syntax OK
3.  `node --test tests/admin-saas-central.test.mjs` -> Passou (64/64 testes)
4.  `node --test tests/admin-hardening.test.mjs` -> Passou
5.  `node --test tests/evolution-leads.test.mjs` -> Passou
6.  `git diff --check` -> Limpo

## Garantias de Segurança
*   Sem arquivos ZIP gerados.
*   Sem commits ou pushes realizados.
*   Nenhum deploy efetuado.
*   Regras de ativação de licença, rotas PHP e payload de geração mantidos 100% retrocompatíveis.
