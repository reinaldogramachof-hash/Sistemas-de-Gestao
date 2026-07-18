# Roadmap de Evolução — Gestão Gastro / Cantinho da Resenha

**Horizonte:** 90 dias

**Cadência:** 6 ciclos quinzenais

**Início de referência:** 18/07/2026

**Responsáveis:** a definir

**Revisão:** quinzenal, ao encerramento de cada ciclo

## 1. Contexto

O Cantinho da Resenha utiliza o plano básico do Gestão Gastro para conduzir a operação de salão e balcão, controlar caixa, cardápio e estoque e acompanhar os resultados do estabelecimento.

Este roadmap organiza a evolução do produto contratado com três objetivos:

1. **Organização:** tornar a navegação, as regras e os dados fáceis de localizar e compreender.
2. **Funcionalidades:** completar e integrar as rotinas essenciais da operação real.
3. **Experiência do usuário:** reduzir dúvidas, cliques, bloqueios e dependência de suporte técnico.

O plano parte do sistema atualmente implementado, das homologações já realizadas e dos contratos existentes entre frontend, APIs PHP e Supabase. O roadmap não autoriza automaticamente alterações de banco, APIs ou licenciamento; qualquer mudança nesses contratos deverá ser detalhada e aprovada antes da execução.

## 2. Escopo contratado

### Módulos contemplados

- PDV (Balcão)
- Mesas e Comanda do Garçom
- Caixa
- Dashboard
- Cardápio
- Financeiro
- Estoque
- Manual de Uso
- Configurações
- Suporte

Os aliases comerciais devem permanecer consistentes em todas as superfícies:

- `produtos` → **Cardápio**
- `relatorios` → **Financeiro**
- `mesas_garcom_mobile` → **Mesas e Comanda do Garçom**

### Fora do escopo funcional

- Cozinha/KDS
- Clientes
- Colaboradores como módulo independente
- Fornecedores
- Segurança como módulo independente
- Central de Evolução
- Integrações com iFood, marketplaces, NFC-e ou emissão fiscal

Autenticação, permissões, sincronização, auditoria, PWA e observabilidade permanecem no roadmap somente como fundações técnicas necessárias aos módulos contratados. Configurações poderá administrar acessos operacionais, mas isso não libera o módulo comercial de Colaboradores.

## 3. Princípios de produto

- **Operação primeiro:** priorizar tarefas executadas durante o atendimento e o fechamento diário.
- **Uma regra, uma fonte:** valores e estados devem ser calculados da mesma forma no PDV, Caixa, Dashboard e Financeiro.
- **Ações reversíveis e confirmadas:** operações críticas devem informar impacto, resultado e possibilidade de recuperação.
- **Estado sempre visível:** o usuário deve reconhecer quando o sistema está online, offline, sincronizando, com fila pendente ou com erro.
- **Acesso pelo contrato e pelo perfil:** o plano define os módulos disponíveis; o perfil define o que cada usuário pode executar.
- **Desktop e celular:** o painel deve funcionar em desktop e tablet, enquanto a comanda deve priorizar uso rápido no celular.
- **Português claro:** evitar termos técnicos, mensagens genéricas e variações de nomenclatura.
- **Evolução mensurável:** cada ciclo deve começar com uma linha de base e terminar com evidências de melhoria.

## 4. Situação atual

### Base existente

- Rotas específicas do Cantinho da Resenha para painel e comanda.
- Plano básico filtrando menu, conteúdo e Manual de Uso.
- PDV com carrinho, atendente, produtos, itens avulsos, combos e checkout.
- Mesas e pedidos integrados ao Supabase, com fallback local controlado.
- Comanda móvel com autenticação, fila offline e prevenção de envios duplicados.
- Caixa com abertura, movimentações, fechamento e histórico.
- Financeiro com indicadores, DRE resumido, gráficos, lançamentos e exportação.
- Cardápio com ficha técnica e sincronização remota.
- Estoque com entradas, perdas, movimentações, mínimos e validade.
- Configurações com mesas, usuários operacionais, rede local, QR Code e backup local.

### Pontos que orientam o roadmap

- Existem alterações locais em andamento que devem ser consolidadas antes de ampliar o escopo.
- Estados de erro, sincronização e offline ainda precisam de linguagem e apresentação consistentes.
- Algumas rotinas usam alertas bloqueantes e mensagens técnicas.
- A operação atravessa vários módulos, mas nem sempre deixa clara a continuidade entre eles.
- Caixa e Financeiro exigem proteção permanente contra divergência de fórmulas.
- Configurações concentra muitas tarefas e precisa ser organizada por objetivo do usuário.
- Impressão ainda deve ser tratada como capacidade a homologar, não como funcionalidade concluída.

## 5. Matriz dos módulos contratados

| Módulo | Maturidade atual | Problemas ou oportunidades | Prioridade | Resultado esperado em 90 dias |
| --- | --- | --- | --- | --- |
| PDV | Operacional | Densidade de ações, alertas bloqueantes, clareza do carrinho e continuidade do pedido | Crítica | Venda rápida, segura e adequada a toque e teclado |
| Mesas/Comanda | Operacional em evolução | Conflitos entre dispositivos, fila offline, mesas órfãs e transferência | Crítica | Fluxo contínuo da abertura ao pré-fechamento, com estados visíveis |
| Caixa | Operacional | Conferência, diferença, formas de pagamento e histórico podem ser mais guiados | Crítica | Abertura e fechamento auditáveis, sem ambiguidade financeira |
| Dashboard | Funcional | Muitos dados, pouca orientação para a próxima ação | Alta | Central diária de decisões e pendências operacionais |
| Cardápio | Operacional | Categorias, disponibilidade, ações em lote, ficha técnica e diagnóstico de sync | Alta | Manutenção rápida e produtos confiáveis para venda |
| Financeiro | Funcional | Consistência de filtros, fórmulas e detalhamento dos valores | Crítica | Indicadores rastreáveis até pedidos e lançamentos de origem |
| Estoque | Operacional | Rastreabilidade, perdas, validade e ligação com vendas | Alta | Saldo compreensível e alertas acionáveis |
| Manual | Funcional | Conteúdo extenso e pouco contextual | Média | Orientação curta, por perfil e por tarefa |
| Configurações | Amplo | Muitas responsabilidades, termos técnicos e setup de rede complexo | Alta | Assistentes por tarefa e diagnóstico compreensível |
| Suporte | Básico | Falta de diagnóstico copiável e contexto automático | Média | Atendimento mais rápido, com evidências do ambiente |

## 6. Backlog por eixo

### 6.1 Organização

- Padronizar cabeçalhos, ações primárias, filtros, busca, tabelas, formulários e confirmações.
- Agrupar a navegação pelas rotinas **Operação**, **Gestão** e **Sistema**, exibindo somente módulos contratados.
- Adotar nomes únicos para mesa, comanda, pedido, venda, suprimento, sangria, despesa e fechamento.
- Criar padrões compartilhados para carregamento, estado vazio, erro, offline, sincronização e sucesso.
- Reorganizar Configurações por tarefas: estabelecimento, operação, acessos, mesas, comanda, impressão, dados e diagnóstico.
- Manter ajuda contextual junto das decisões mais difíceis, sem transformar telas operacionais em manuais extensos.

### 6.2 Funcionalidades

- Integrar PDV, Mesas, Comanda e Caixa como um único fluxo operacional.
- Preservar rascunhos e impedir pedidos duplicados ou fechamento concorrente.
- Expor fila offline, tentativas, conflitos e recuperação de sincronização.
- Permitir transferência segura de mesa e tratamento guiado de mesa órfã.
- Consolidar regras financeiras e formas de pagamento em uma fonte compartilhada.
- Ampliar ações em lote do Cardápio e validações preventivas da ficha técnica.
- Relacionar estoque, vendas, perdas e movimentações com trilha de auditoria.
- Permitir detalhamento de indicadores financeiros até os registros de origem.
- Criar diagnóstico operacional para rede, sessão, tenant, módulos, sincronização e versão.

### 6.3 Experiência do usuário

- Substituir `alert` e mensagens genéricas por notificações, banners, validação em campo e diálogos consistentes.
- Exibir mensagens com três elementos: o que ocorreu, o impacto e a próxima ação.
- Reduzir cliques nas tarefas frequentes e preservar o contexto ao voltar de modais ou detalhes.
- Garantir áreas de toque adequadas, foco visível, navegação por teclado e contraste acessível.
- Priorizar o celular na comanda e manter o painel legível em tablet e desktop.
- Utilizar confirmação reforçada apenas para exclusões, cancelamentos, fechamentos e sobrescrita de dados.
- Evitar bloquear a operação por falhas recuperáveis de sincronização.

## 7. Cronograma de 90 dias

### Ciclo 1 — Semanas 1–2: Organização e estabilização

**Objetivo:** estabelecer uma base confiável antes de ampliar funcionalidades.

**Entregas**

- Consolidar e revisar as alterações locais em andamento.
- Validar as rotas do Cantinho em produção, cache, service worker e atualização do PWA.
- Criar inventário de nomenclaturas, ações e estados usados nos 10 módulos.
- Definir componentes ou padrões compartilhados de feedback, confirmação e estado de tela.
- Substituir primeiro os alertas bloqueantes dos fluxos críticos.
- Registrar a linha de base dos indicadores e os cenários de regressão.

**Dependências**

- Estado local consolidado e revisado.
- Ambiente de homologação com perfis de administrador, caixa e garçom.
- Mesas, cardápio e estoque de teste disponíveis.

**Critérios de aceite**

- Produção carrega o bundle atual nas rotas do painel e da comanda.
- Nenhum módulo fora do contrato aparece no menu, Manual ou acesso direto.
- Estados padrão estão documentados e aplicados ao menos aos fluxos críticos.
- Erros de operação não exigem consulta ao console para serem compreendidos.

**Indicadores**

- Incidentes de cache/PWA após publicação.
- Quantidade de alertas bloqueantes nos fluxos críticos.
- Cobertura de estados padrão nos módulos contratados.

### Ciclo 2 — Semanas 3–4: Operação principal

**Objetivo:** tornar PDV, Mesas e Comanda um fluxo contínuo e resistente a falhas.

**Entregas**

- Revisar abertura de mesa e balcão, lançamento de itens e observações.
- Melhorar carrinho para toque e teclado, mantendo rascunho ao trocar de tela.
- Exibir disponibilidade e insuficiência de estoque antes da finalização.
- Guiar transferência de mesa, recuperação de mesa órfã e pré-fechamento.
- Mostrar fila offline, itens pendentes, última sincronização e ação de nova tentativa.
- Bloquear duplo envio e tratar alterações concorrentes entre dispositivos.

**Dependências**

- Padrões de feedback do Ciclo 1.
- Realtime e autenticação estáveis no ambiente de homologação.
- Regras de pedido e mesa preservadas nos contratos atuais.

**Critérios de aceite**

- Um garçom conclui o lançamento sem acessar módulos administrativos.
- Um pedido offline é identificado, reenviado e reconciliado sem duplicação.
- Duas sessões concorrentes não criam duas comandas para a mesma mesa.
- Transferência e recuperação de mesa exibem origem, destino e resultado.

**Indicadores**

- Tempo mediano para lançar um pedido.
- Cliques/toques para adicionar item e concluir lançamento.
- Taxa de reenvio da fila offline.
- Ocorrências de pedido duplicado ou mesa órfã.

### Ciclo 3 — Semanas 5–6: Caixa e fechamento

**Objetivo:** garantir fechamento diário claro, conferível e consistente.

**Entregas**

- Criar abertura guiada com operador, data/hora e fundo inicial.
- Organizar suprimento, sangria e despesa com explicação do impacto no saldo.
- Exibir resumo por forma de pagamento e valores esperados.
- Adicionar conferência declarada, diferença de caixa e confirmação de fechamento.
- Preservar histórico e snapshots necessários para auditoria.
- Centralizar e testar fórmulas compartilhadas por Caixa, Dashboard e Financeiro.

**Dependências**

- Pedidos e pagamentos confiáveis após o Ciclo 2.
- Definição única para entradas, saídas, CMV, gorjeta e taxa de serviço.

**Critérios de aceite**

- Caixa não fecha com pedidos pendentes sem orientação explícita.
- Saldo esperado, valor contado e diferença ficam registrados.
- Suprimento não aparece como receita e sangria não duplica despesas.
- Valores de Caixa e Financeiro coincidem para o mesmo período.

**Indicadores**

- Diferença média de caixa.
- Fechamentos reabertos ou corrigidos.
- Divergências encontradas entre módulos.
- Tempo para concluir o fechamento.

### Ciclo 4 — Semanas 7–8: Cardápio e Estoque

**Objetivo:** reduzir indisponibilidades e tornar os saldos explicáveis.

**Entregas**

- Melhorar categorias, busca, filtros e alternância entre grade e lista.
- Permitir ativar ou desativar produtos em lote com confirmação do impacto.
- Exibir status de sincronização e oferecer nova tentativa sem duplicar produtos.
- Bloquear ou sinalizar ficha técnica incompleta antes da venda.
- Organizar histórico de entradas, ajustes, perdas e baixas por venda.
- Destacar estoque mínimo, validade e itens sem vínculo confiável.
- Permitir rastrear uma baixa até a venda ou movimentação que a originou.

**Dependências**

- Identificadores remotos e sincronização de produtos estáveis.
- Regras de baixa e ficha técnica documentadas.

**Critérios de aceite**

- Produto indisponível deixa de ser oferecido para venda conforme a regra definida.
- Falha de sincronização é visível e recuperável.
- Ficha técnica inválida não gera baixa silenciosamente incorreta.
- Toda alteração de saldo possui tipo, data, quantidade e origem.

**Indicadores**

- Produtos com erro de sincronização.
- Produtos ativos com ficha técnica incompleta.
- Rupturas de estoque durante a venda.
- Ajustes manuais sem origem identificada.

### Ciclo 5 — Semanas 9–10: Dashboard e Financeiro

**Objetivo:** converter dados operacionais em decisões rastreáveis.

**Entregas**

- Priorizar no Dashboard caixa, mesas, vendas, estoque crítico e pendências.
- Criar atalhos dos alertas para a ação correspondente.
- Unificar seleção de período e fuso operacional.
- Documentar fórmulas dos indicadores em linguagem simples.
- Permitir detalhar vendas, despesas, CMV, lucro e fechamento até a origem.
- Revisar DRE, gráficos, ranking e exportações com o mesmo conjunto de dados.
- Distinguir ausência de movimento, dado incompleto e erro de carregamento.

**Dependências**

- Fórmulas centralizadas no Ciclo 3.
- Rastreabilidade de estoque e cardápio no Ciclo 4.

**Critérios de aceite**

- O mesmo período produz os mesmos totais em Dashboard, Financeiro e CSV.
- Cada indicador apresenta definição e origem dos dados.
- Alertas relevantes levam diretamente à tela de resolução.
- Estados sem movimento não são apresentados como falha.

**Indicadores**

- Divergências entre tela e exportação.
- Alertas acionados a partir do Dashboard.
- Tempo para localizar a origem de um valor.
- Indicadores sem definição ou detalhamento.

### Ciclo 6 — Semanas 11–12: Configuração, aprendizado e suporte

**Objetivo:** permitir implantação e uso diário com menor dependência técnica.

**Entregas**

- Reorganizar Configurações por tarefas e permissões.
- Criar assistentes para mesas, acessos operacionais, rede local, QR Code e impressão.
- Informar claramente limites de backup local e dados sincronizados.
- Tornar o Manual contextual, filtrado pelo contrato e pelo perfil.
- Criar roteiros curtos: abrir operação, atender mesa, vender no balcão, fechar caixa e corrigir falha de sincronização.
- Adicionar ao Suporte um diagnóstico copiável, sem segredos, com versão, rota, tenant, conexão, PWA e módulos liberados.
- Executar QA final em desktop, tablet e celular, seguido de publicação controlada.

**Dependências**

- Fluxos dos ciclos anteriores estabilizados.
- Modelo de permissões validado para administrador, caixa e garçom.
- Estratégia de impressão definida e homologada antes de ser anunciada como concluída.

**Critérios de aceite**

- Um administrador configura mesas e acesso da comanda sem orientação técnica externa.
- Manual não revela módulos fora do contrato.
- Diagnóstico de suporte não contém tokens, senhas ou chaves.
- Fluxo completo passa em desktop e celular sem erro bloqueante.

**Indicadores**

- Chamados de suporte por configuração inicial.
- Tempo para configurar a comanda em rede local.
- Tarefas concluídas usando o Manual.
- Problemas reproduzidos a partir do diagnóstico fornecido.

## 8. Critérios gerais de sucesso

- Fluxo validado: abrir caixa → abrir mesa/comanda → lançar itens → fechar pedido → conferir estoque, Caixa, Dashboard e Financeiro.
- Nenhum módulo não contratado exposto por menu, URL direta ou Manual.
- Estados online, offline, sincronizando e com erro compreensíveis sem console.
- Redução mensurável de cliques, tempo e mensagens bloqueantes nas rotinas principais.
- Cálculos financeiros consistentes entre Caixa, Dashboard, Financeiro e exportações.
- Operações críticas geram confirmação e evidência de resultado.
- Interfaces prioritárias atendem teclado, foco visível, contraste e áreas de toque adequadas.

## 9. Processo de validação por ciclo

Cada ciclo somente poderá ser encerrado após:

1. Revisão do escopo e dos critérios de aceite.
2. TypeScript sem erros com `npm.cmd run lint`.
3. Build de produção com `npm.cmd run build`.
4. Testes focados e regressões dos módulos afetados.
5. `git diff --check` sem erros.
6. QA em navegador com os perfis aplicáveis: administrador, caixa e garçom.
7. Teste nas dimensões previstas: desktop/tablet para painel e celular para comanda.
8. Cenários online, offline e recuperação após falha, quando aplicáveis.
9. Registro das evidências, pendências e indicadores medidos.
10. Publicação controlada, limpeza/atualização de cache e verificação da versão servida.

## 10. Riscos e respostas

| Risco | Impacto | Resposta prevista |
| --- | --- | --- |
| Alterações locais concorrentes | Sobrescrita ou regressão | Consolidar e revisar o working tree antes do Ciclo 1 |
| Bundle ou PWA desatualizado | Produção diferente do código aprovado | Versionar build, revisar service worker e validar a versão servida |
| Divergência entre local e Supabase | Pedidos, mesas ou produtos inconsistentes | Tornar origem e estado de sincronização visíveis; testar recuperação |
| Fórmulas duplicadas | Valores diferentes entre módulos | Centralizar regras e manter testes de paridade |
| Escopo comercial indevido | Cliente acessa módulo não contratado | Validar plano, tenant, perfil, menu, URL e Manual |
| Impressão não homologada | Promessa de função indisponível | Manter como experimental até teste com equipamento real |
| Excesso de mudanças por ciclo | Retrabalho e QA insuficiente | Limitar entregas aos critérios definidos e mover excedentes para revisão |
| Diagnóstico com dados sensíveis | Exposição de credenciais | Aplicar lista segura de campos e teste específico de sanitização |

## 11. Governança do roadmap

- A prioridade será revisada a cada 15 dias com base em uso real, falhas e impacto operacional.
- Itens novos entram primeiro no backlog e não interrompem o ciclo corrente, salvo incidente crítico.
- Toda alteração de schema, RLS, RPC, API PHP, licenciamento ou contrato remoto exige plano técnico e aprovação próprios.
- Responsáveis permanecerão como **a definir** até a alocação formal.
- Indicadores sem histórico começarão como **linha de base a medir** no primeiro ciclo aplicável.
- Entregas incompletas não serão promovidas a produção apenas para cumprir a data do ciclo.

## 12. Definição de concluído para os 90 dias

O roadmap será considerado concluído quando:

- os seis ciclos tiverem evidências de aceite ou decisão formal de replanejamento;
- os 10 módulos contratados apresentarem navegação, estados e terminologia consistentes;
- o fluxo operacional completo estiver validado com dados de homologação representativos;
- divergências financeiras conhecidas estiverem eliminadas e cobertas por testes;
- usuário e suporte conseguirem identificar conexão, sincronização e versão sem ferramentas técnicas;
- o backlog remanescente estiver priorizado para o próximo horizonte, sem incluir automaticamente módulos não contratados.
