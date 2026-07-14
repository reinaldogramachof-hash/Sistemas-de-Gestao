# Relatório de Teste - Garçom Mobile Gestão Gastro

Data: 13/07/2026

## 1. Resumo Executivo

Veredito: **ainda exige ajustes antes de liberar ao cliente**.

O bloqueio principal é de disponibilidade: as rotas públicas do Gestão Gastro retornaram HTTP 404. Assim, não foi possível chegar ao login nem executar o fluxo funcional em smartphone. A base local compila, passa pelo lint e pelos testes automatizados direcionados, mas isso não comprova o ambiente publicado.

## 2. Ambiente Testado

- URL testada: `https://sistemasdegestao.tech/gestao-gastro/cantinhodaresenha/comanda`
- URLs auxiliares: `/`, `/gestao-gastro/` e `/gestao-gastro/cantinhodaresenha`
- Cliente: Cantinho da Resenha
- Usuário: nenhum; não havia credencial de garçom fornecida e a rota não abriu
- Modo: online; tentativa de acesso via requisição HTTPS
- Viewports mobile: não executados, pois a página não carregou
- Estado local: build e lint executados em `gestao-gastro`

## 3. Fluxos Validados

- A raiz do domínio respondeu HTTP 200.
- As rotas de Gastro testadas responderam HTTP 404.
- `npm.cmd run build`: passou.
- `npm.cmd run lint`: passou.
- Testes direcionados de permissões, módulos, configurações e segurança Supabase: **42/42 passaram**.
- A implementação possui separação do bundle mobile, sem importação do Layout administrativo.
- A implementação possui detecção online/offline e fila local para pedidos.
- A implementação possui caminho de atualização de itens de uma comanda já aberta.

## 4. Problemas Encontrados

### P0 — Crítico: rota pública da comanda indisponível

- Onde: `https://sistemasdegestao.tech/gestao-gastro/cantinhodaresenha/comanda`
- Passos: abrir a URL diretamente em HTTPS.
- Resultado atual: HTTP 404. O mesmo ocorreu na rota do cliente e em `/gestao-gastro/`.
- Resultado esperado: carregar a tela exclusiva do garçom ou, no mínimo, uma tela de login válida.
- Impacto: impede login, lançamento de pedidos, uso em salão e qualquer homologação com o cliente.

### Alto — ambiente de dados/credenciais não comprovado para homologação

- Onde: dependências de autenticação e dados do tenant.
- Evidência: não foi disponibilizada credencial funcional nesta rodada; a documentação local registra como pendências anteriores `auth.users`, `tenant_members` e `restaurant_tables`.
- Resultado esperado: usuário waiter ativo, mesas e cardápio disponíveis no tenant do Cantinho.
- Impacto: mesmo após corrigir a publicação, o teste ponta a ponta pode continuar bloqueado sem provisionamento real.

### Médio — risco de divergência entre documentação e comportamento online

- Onde: documentação do cardápio/integração e caminhos Supabase do app.
- Resultado atual: há documentação afirmando operação local-first sem consumo automático do Supabase, enquanto o código atual contém autenticação, cardápio, mesas, pedidos e sincronização online.
- Resultado esperado: uma única descrição oficial do modo de operação liberado.
- Impacto: dificulta preparar o ambiente, interpretar falhas e garantir que o pedido chegou à cozinha/PDV.

## 5. Pontos de Atenção de UX

Não foi possível observar visualmente a interface publicada por causa do HTTP 404.

Pontos que deverão ser confirmados em nova rodada:

- clareza do estado livre/ocupada/aguardando;
- tamanho dos alvos de toque em 360x740, 390x844 e 430x932;
- quantidade de toques até confirmar um pedido;
- visibilidade de preço, quantidade e observação;
- confirmação explícita de que a cozinha recebeu a comanda;
- resumo de pré-fechamento sem expor caixa completo;
- mensagem simples ao perder conexão e ao sincronizar a fila.

## 6. Segurança e Permissões

Na inspeção estática, o módulo mobile não importa o Layout administrativo e o papel waiter possui matriz própria restrita a mesas, produtos/cardápio e capacidades operacionais de pré-fechamento. Os testes direcionados confirmaram esses contratos.

Não foi possível confirmar em execução que um garçom não acessa módulos administrativos, porque não houve login real. Também não foi possível testar usuário sem `tenant_members`.

## 7. Sincronização com PDV/Sistema Matriz

**Não validada.** A rota pública indisponível impediu criar pedido, reabrir mesa, conferir atualização de itens e observar Realtime no painel matriz.

## 8. Melhorias Recomendadas

### Ajustes obrigatórios antes da liberação

- Corrigir a publicação/roteamento para que as três rotas Gastro retornem a aplicação SPA correta.
- Provisionar um usuário waiter real, vinculá-lo ao tenant e disponibilizar mesas e cardápio de homologação.
- Reexecutar o fluxo completo com painel matriz/PDV aberto em outra sessão.
- Confirmar que pedidos novos e adicionais em mesa ocupada chegam ao mesmo pedido, sem duplicidade.
- Confirmar logout, usuário sem vínculo, credencial inválida e recuperação após perda de conexão.

### Melhorias desejáveis pós-liberação

- Manter mensagem de status de sincronização visível e persistente até confirmação.
- Exibir identificador/horário do último envio para aumentar a confiança operacional.
- Adicionar teste automatizado de publicação/healthcheck das rotas públicas.

### Ideias futuras

- Modo de teste guiado com dados descartáveis do tenant.
- Indicador de pedido pendente na cozinha e confirmação de recebimento pelo KDS.
- Auditoria de reenvio e resolução de conflitos quando dois dispositivos alterarem a mesma mesa.

## 9. Veredito Final

**Pode liberar para teste com o cliente? Não.**

Motivo objetivo: a rota pública da comanda está indisponível (HTTP 404) e o fluxo real não pôde ser executado. Após corrigir a publicação e fornecer ambiente de homologação, é necessária uma nova rodada funcional mobile.

## Evidências da rodada

- `npm.cmd run build`: aprovado; build Vite concluído, com aviso não bloqueante de chunk administrativo grande.
- `npm.cmd run lint`: aprovado.
- `node --test tests\\gastro-garcom-permissions.test.mjs tests\\gastro-modules-plan.test.mjs tests\\gastro-settings-access.test.mjs tests\\gastro-supabase-security.test.mjs`: 42 testes aprovados.
- HTTPS: raiz 200; `/gestao-gastro/`, `/gestao-gastro/cantinhodaresenha` e `/gestao-gastro/cantinhodaresenha/comanda` retornaram 404.
- `git diff --check`: sem erro de whitespace; o checkout já possuía alterações locais não relacionadas, preservadas.
