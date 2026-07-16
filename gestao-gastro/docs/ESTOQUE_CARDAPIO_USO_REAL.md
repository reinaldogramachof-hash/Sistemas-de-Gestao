# Estoque e Cardápio - Uso Real e Validação

Este documento define o status atual, o fluxo e os próximos passos para a validação do uso real da integração entre Estoque e Cardápio no projeto Gestão Gastro, especialmente para o ambiente "Cantinho da Resenha".

## 1. Fluxo de Operação Atual

O ciclo de vida de um produto e a baixa de estoque funcionam da seguinte forma:

1. **Cadastro de Insumos (Estoque)**
   * Os insumos são geridos no módulo **Estoque**.
   * **Atenção:** Atualmente o estoque é salvo no *armazenamento local* (LocalStorage) do navegador/dispositivo atual. Operar em vários dispositivos simultâneos sem a persistência no banco na nuvem causará divergência de saldos.

2. **Criação da Ficha Técnica (Cardápio)**
   * No módulo **Cardápio**, os produtos podem receber uma "Ficha Técnica".
   * A Ficha Técnica vincula um insumo (do módulo Estoque) à quantidade usada em uma porção/unidade de venda.
   * *Status da Ficha Técnica:*
     * **Com Ficha Completa**: Calcula o custo, a margem estimada, e permite baixa automática.
     * **Sem Ficha Técnica**: O produto é exibido como `Sem Ficha`. Não baixa estoque e é livre para venda.
     * **Ficha Incompleta**: Se um insumo foi apagado do estoque, a ficha fica inválida. O PDV exibirá o erro `Ficha Incompleta` e a venda deste produto será bloqueada.

3. **Venda e Carrinho (PDV)**
   * Ao adicionar ao carrinho, o sistema faz uma dupla verificação (`stockGuard.ts`):
     * O saldo de todos os insumos vinculados atende a quantidade que está sendo vendida?
     * A ficha técnica é válida (todos os insumos existem)?
   * Se houver divergência, a venda não é permitida.

4. **Fechamento e Baixa Automática**
   * Ao fechar o pedido (`closeOrder`), o sistema faz a baixa do `currentStock` de cada insumo.
   * Cria-se uma `StockMovement` (movimentação de saída) documentando: `Venda - Produto [Nome]`.

## 2. Bloqueios de Segurança

Foram adicionadas travas de segurança para prevenir anomalias:
* **Exclusão de Insumo Bloqueada:** Não é possível excluir um insumo (`<Trash2>`) se ele estiver atrelado à ficha técnica de qualquer produto. O usuário deve primeiro removê-lo da ficha para só então apagar do estoque.
* **Quantidade Zero ou Vazia:** O formulário do Cardápio impede salvar itens na ficha com `0` ou sem insumo definido.

## 3. Próximos Passos na Nuvem (Supabase)

Para garantir que o cliente opere com **Múltiplos Dispositivos** (ex: garçom tirando pedido no celular e retaguarda no caixa), será necessário o suporte no Supabase:

* **Tabelas Requeridas:**
  * `stock_items` (para os saldos e regras dos insumos)
  * `stock_movements` (para o histórico de entradas e saídas)
* **Desenvolvimento do Endpoint:**
  * Evoluir `useApp.tsx` ou criar `stockSupabaseService.ts` que se encarregará do upload, download (sincronização) e do abatimento via RLS e Functions (ideal para não haver *race condition* na hora da baixa simultânea).

*Recomendação para os testes atuais:* Orientar o dono a usar o estoque apenas num dispositivo central para validar a matemática das fichas antes da implementação completa das tabelas online.
