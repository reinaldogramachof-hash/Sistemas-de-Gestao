# Checklist de Entrega — Homologação Cantinho da Resenha

Este documento apresenta o status real de implementação dos requisitos solicitados para homologação do restaurante **Cantinho da Resenha**.

## Requisitos Implementados

- [x] **Tenant da Comanda Mobile resolvido pela rota e passado por `tenantId`**
  - O tenant `cd8f21f4-73a1-4c87-a385-9b6deacaeae7` é resolvido na rota `/gestao-gastro/cantinhodaresenha/comanda` via `resolveTenant(window.location.pathname)`.
  - O ID resolvido é repassado como prop `tenantId` no componente `ComandaMobileApp.tsx` para `ComandaMobile.tsx`.
- [x] **Tratamento detalhado e visível de erros operacionais na Comanda**
  - Diferenciação clara de estados de carregamento, tenant ausente/inválido, erros operacionais de conexão/RLS e mesas vazias.
  - Mensagens amigáveis e botões de ação para re-autenticação.
- [x] **Checkout iniciado em dinheiro**
  - Estado inicial de `currentMethod` em `CheckoutModal.tsx` modificado de `'credito'` para `'dinheiro'`, garantindo coerência visual e lógica.
- [x] **Inicialização incremental de mesas e bloqueio de exclusão seguro**
  - Correção na função `initializeTables` do `tablesSupabaseService.ts` para criar apenas as mesas faltantes ao aumentar e preencher lacunas de numeração sem duplicar.
  - Bloqueio robusto de deleção de mesas que possuem status diferente de `'livre'` ou contêm pedidos abertos (`activeOrderId`), com avisos acionáveis de erro no painel do administrador.
- [x] **Padronização monetária com `formatCurrency`**
  - Criação do helper centralizado `src/utils/format.ts` usando `Intl.NumberFormat('pt-BR')`.
  - Substituição de `.toFixed(2)` e formatações ad-hoc com ponto decimal por `formatCurrency` em Caixa (`Cashier.tsx`), PDV (`PDV.tsx`), Fechamento (`CheckoutModal.tsx`), Comprovante (`ReceiptModal.tsx`) e Financeiro (`Reports.tsx`).
- [x] **Melhorias de UI/UX aplicadas**
  - O Dashboard, PDV, Cardápio, Suporte e Evolução usam a paleta e os componentes consistentes.
  - Inclusão do "Responsável Padrão" no PDV se não houver atendentes ativos cadastrados para evitar fechamentos de conta silenciosos e sem rastreabilidade.
- [x] **Testes automatizados, lint e build**
  - 16 testes passando com sucesso.
  - Linting e build executando com sucesso e livre de erros.

## Itens Pendentes de Homologação Manual

- [ ] Validar login com perfil de garçom no restaurante Cantinho da Resenha.
- [ ] Validar visualização das mesas 01 a 12 na Comanda Mobile.
- [ ] Validar abertura de mesa e criação de pedido na comanda.
- [ ] Validar fechamento de venda direta e em dinheiro no PDV com emissão correta do comprovante.
- [ ] Validar reflexo das vendas no Caixa e Financeiro (Relatórios).
- [ ] Validar bloqueio de acesso a usuários não vinculados ao tenant.
