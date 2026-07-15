# Roteiro de Homologação Manual — Comanda Mobile

Este roteiro descreve as etapas para testar e validar o módulo de Comanda Mobile em ambiente local para o cliente **Cantinho da Resenha**.

---

## Preparação do Ambiente Local

1. Suba o servidor de desenvolvimento:
   ```bash
   cd gestao-gastro
   npm run dev
   ```
2. Caso vá testar usando um dispositivo móvel real conectado à mesma rede Wi-Fi, certifique-se de acessar usando o IP da máquina local na mesma rede (ex: `http://192.168.0.10:5173`).

---

## Passos para Homologação

### 1. Acesso à Rota da Comanda Mobile
- **Ação:** Acesse no navegador o link:
  `http://localhost:5173/gestao-gastro/cantinhodaresenha/comanda`
- **Resultado Esperado:** A aplicação carrega o formulário de login de garçom. O tenant ID `cd8f21f4-73a1-4c87-a385-9b6deacaeae7` deve ser resolvido dinamicamente a partir do slug `cantinhodaresenha` contido na URL, sem utilizar nenhuma variável estática `VITE_GASTRO_TENANT_ID` (o que é demonstrado pela ausência da variável no código do componente e arquivo `.env`).

### 2. Validação de Rota/Tenant Inválido
- **Ação:** Altere a URL no navegador para um slug não cadastrado:
  `http://localhost:5173/gestao-gastro/outrorestaurante/comanda`
- **Resultado Esperado:** A comanda deve identificar que o estabelecimento é inválido e mostrar a mensagem clara:
  **"Estabelecimento não encontrado"** com instruções para verificar a URL digitada.

### 3. Login de Garçom do Estabelecimento
- **Ação:** Digite o e-mail e senha de um colaborador ativo que esteja cadastrado no tenant do Cantinho da Resenha.
- **Resultado Esperado:** O login é concluído com sucesso e o garçom é redirecionado para a tela de seleção de mesas.
- **Nota:** Se você tentar logar com um e-mail de um garçom pertencente a outro tenant, o sistema deve exibir uma mensagem indicando que as credenciais são inválidas ou que o colaborador não pertence a este estabelecimento.

### 4. Visualização de Mesas
- **Ação:** Verifique a lista de mesas na tela após o login.
- **Resultado Esperado:** Devem ser listadas exatamente 12 mesas (de 01 a 12) correspondentes ao restaurante no Supabase. Não deve aparecer a mensagem de "Nenhuma mesa encontrada".

### 5. Abertura de Mesa e Envio de Pedido
- **Ação:**
  1. Toque em uma mesa livre (ex: Mesa 02).
  2. Adicione produtos ao carrinho (ex: 2 refrigerantes).
  3. Clique em **Enviar Pedido**.
- **Resultado Esperado:** O pedido é enviado e salvo no banco de dados. O status da mesa muda para ocupada e ela aparece destacada na lista da comanda e do PDV administrativo.

### 6. Teste de Falha de Conexão ou Permissão (RLS)
- **Ação:** Simule a perda de rede desligando a Wi-Fi/Internet do dispositivo e tente atualizar a lista ou abrir outra mesa. Alternativamente, acesse com uma conta sem permissões de membro ativo do tenant para simular a política RLS.
- **Resultado Esperado:** A interface exibe um aviso claro de **"Erro de conexão ou permissão de acesso ao banco de dados"** em vez de dizer apenas que as mesas não existem. O sistema exibe um botão de "Tentar Novamente" e/ou orienta o usuário a relogar.

---

## Confirmação Final de Entrega

O fluxo de garçom mobile está limpo e descentralizado, utilizando caminhos semânticos adequados para resolver os tenants e garantindo que diferentes filiais acessem apenas suas respectivas bases de dados respeitando as políticas do banco de dados (RLS).
