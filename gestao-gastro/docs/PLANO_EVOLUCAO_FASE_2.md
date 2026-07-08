# Plano de Evolucao - Fase 2

Data: 2026-07-07
Sistema: Gestao Gastro
Referencia: Sistema de Gestao Restaurantes

## Objetivo

Evoluir o Gestao Gastro usando o Sistema de Gestao Restaurantes como referencia funcional, preservando o modelo ML Factory atual:

- sistema em subpasta;
- Vite com `base: './'`;
- licenciamento via `../api_licenca_ml.php`;
- `ActivationGate`;
- `ReceiptConfirmation`;
- `EvolutionCenter`;
- funcionamento local-first com `localStorage`;
- sem trazer Supabase, auth, painel master ou integracoes externas nesta etapa.

## Fora do Escopo Nesta Fase

Nao portar ou ativar:

- iFood;
- NFC-e, NF ou Focus NFe;
- Supabase;
- autenticacao;
- painel master;
- multiempresa avancado;
- billing/planos do Sistema Restaurantes;
- feature flags ligadas a integracoes externas;
- delivery integrado a marketplace.

## Diagnostico da Fase 2A

O Gestao Gastro ja possui boa base operacional local:

- PDV;
- Mesas;
- Caixa;
- Produtos/Cardapio;
- Estoque;
- Clientes;
- Colaboradores;
- Fornecedores;
- Relatorios;
- Seguranca;
- Suporte;
- Central de Evolucao.

O Sistema de Gestao Restaurantes esta mais maduro em:

- PDV com operador, cliente, item avulso, combos e carrinho persistente;
- Checkout com pagamentos parciais e fidelidade;
- Cozinha real/KDS com status por item;
- Caixa com fundo inicial, suprimento/sangria, contagem declarada e diferenca;
- Delivery manual;
- Menu digital;
- Vendas/promocoes/combos/fidelidade/campanhas;
- Tipos de dados mais completos.

## Matriz de Decisao

| Area | Decisao | Observacao |
| --- | --- | --- |
| PDV | Portar agora | Maior ganho comercial imediato. |
| Checkout | Portar parcialmente | Pagamentos parciais e fidelidade simples; sem NFC-e. |
| Cozinha | Portar agora | Gastro tem placeholder; Restaurantes tem KDS real. |
| Caixa | Portar agora | Fundo inicial, entradas/saidas, contagem e diferenca. |
| Produtos/Cardapio | Portar parcialmente | Ativo/inativo e suporte a combos; evitar excesso. |
| Estoque | Adaptar depois | Gastro ja baixa por ficha tecnica; refinar apos fluxo principal. |
| Clientes/Fidelidade | Portar basico | Aproveitar `loyaltyPoints` existente. |
| Delivery manual | Fase seguinte | Valioso, mas adiciona muitos tipos/telas. |
| Menu digital/Pedidos online | Depois | Pode ser util, mas nao e o primeiro bloco. |
| Supabase/Auth/Master | Nao portar | Conflita com o modelo atual desta entrega. |
| iFood/NF/NFC-e | Descartar agora | Funcionalidades ainda nao disponiveis. |

## Fase 2B Recomendada

Implementar em um bloco controlado:

1. Normalizar contratos internos
   - `OrderMode` deve permanecer `mesa | balcao`.
   - Labels visiveis podem ter acento, mas ids, rotas e contratos internos nao.
   - Adicionar campos opcionais seguros:
     - `KitchenItemStatus`;
     - `OrderItem.observation`;
     - `OrderItem.originalPrice`;
     - `OrderItem.discount`;
     - `OrderItem.promotionName`;
     - `OrderItem.comboId`;
     - `OrderItem.addedAt`;
     - `OrderItem.kitchenStatus`;
     - `PartialPaymentItem`;
     - `Order.partialPayments`;
     - `Order.loyaltyDiscount`;
     - `Order.loyaltyPointsEarned`;
     - `Order.loyaltyPointsRedeemed`;
     - `Expense.entryType`;
     - `CashierSession.countedCash`;
     - `CashierSession.cashBreakdown`;
     - `AppSettings.kitchenMode`.

2. Evoluir o PDV
   - Usar carrinho persistente (`draftOrder`) no `AppContext`.
   - Permitir selecionar operador/atendente.
   - Permitir vincular cliente.
   - Permitir item avulso.
   - Preparar suporte a combos simples.
   - Corrigir qualquer uso interno de `Balcao` ou label acentuado para `balcao` no contrato.

3. Evoluir a Cozinha
   - Substituir placeholder do `Kitchen.tsx`.
   - Criar fila KDS com pedidos abertos de mesa e balcao.
   - Adicionar status por item:
     - `aguardando`;
     - `preparo`;
     - `pronto`.
   - Comecar com modo visualizacao e permitir modo interativo via configuracao.

4. Evoluir o Caixa
   - Abrir caixa com fundo inicial.
   - Registrar entrada/suprimento e saida/sangria.
   - Fechar caixa com gorjeta, contagem declarada e diferenca.
   - Manter historico claro.

5. Validar
   - `npm.cmd run lint`
   - `npm.cmd run build`
   - Fluxo manual:
     - abrir caixa;
     - criar pedido no PDV;
     - visualizar pedido na cozinha;
     - atualizar status dos itens;
     - finalizar pagamento;
     - fechar caixa.

## Regras Para o Agente Executor

- Nao reescrever o projeto.
- Nao copiar Supabase ou hooks remotos do Sistema Restaurantes.
- Preferir adaptar trechos pequenos e compativeis com localStorage.
- Manter `ActivationGate`, `ReceiptConfirmation` e `EvolutionCenter`.
- Nao alterar licenciamento.
- Nao adicionar dependencias externas sem necessidade.
- Preservar o design neutro da Fase 1.
- Corrigir mojibake somente em textos visiveis, sem alterar identificadores.
- Relatar exatamente arquivos alterados, validacoes e pendencias.
