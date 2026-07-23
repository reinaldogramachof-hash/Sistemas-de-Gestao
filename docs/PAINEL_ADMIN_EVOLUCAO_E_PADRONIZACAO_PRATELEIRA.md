# Painel Admin - Evolucao e Padronizacao da Prateleira Comercial

Data: 2026-07-22

## Objetivo

Este documento define a visao de evolucao do Painel Admin como controle de prateleira comercial dos sistemas Plena Informatica.

A diretriz aprovada e manter a conversao para SaaS em fluxo manual e consultivo neste momento. O cliente vindo do Mercado Livre entra por uma versao local/vitalicia, visualiza no proprio sistema uma vitrine de evolucao, solicita interesse e e recebido comercialmente pelo atendimento humano via WhatsApp.

O Painel Admin deve apoiar esse processo como centro de catalogo, funil, contexto do cliente e preparo para provisionamento, sem automatizar a venda antes da oferta estar madura.

## Fontes analisadas

Foram usadas como base as landing pages atuais dos produtos:

- Gestao Assistencia Pro: `https://www.plenainformatica.com.br/produtos/assistencia-pro.html`
- Gestao Barbearia Pro: `https://www.plenainformatica.com.br/produtos/barbearia-premium.html`
- Gestao Beleza Pro: `https://www.plenainformatica.com.br/produtos/beleza-spa.html`
- Gestao Gastro Pro: `https://www.plenainformatica.com.br/produtos/gestao-gastro.html`
- Catalogo geral de tecnologia: `https://www.plenainformatica.com.br/tecnologia/tecnologia.html`

## Leitura estrategica das ofertas

As landings confirmam uma estrutura comercial recorrente:

1. Produto de entrada para organizacao local da rotina.
2. Evolucao online para equipe, multiplos acessos e recursos conectados.
3. Plano premium com recursos de conveniencia, automacao ou inteligencia.
4. Projeto personalizado com marca propria, implantacao orientada e escopo sob medida.

Essa estrutura deve orientar o Painel Admin e a Central de Evolucao dentro dos sistemas.

## Papel do Painel Admin

O Painel Admin deve evoluir de um painel de licencas para uma central operacional comercial.

Papeis principais:

- Controlar a prateleira de sistemas, planos, precos, modulos e caminhos publicos.
- Gerenciar licencas locais/vitalicias vendidas por Mercado Livre ou venda direta.
- Receber pedidos de evolucao vindos dos sistemas instalados.
- Organizar o funil comercial manual: novo, contatado, proposta enviada, convertido, perdido, descartado.
- Dar contexto para contato via WhatsApp: sistema, email, licenca, plano atual, recurso de interesse e historico.
- Preparar a transicao para SaaS quando o cliente converter.
- Separar claramente produto ML, produto SaaS mensal e projeto personalizado.

## Papel da Central de Evolucao nos sistemas

A Central de Evolucao deve ser uma vitrine comercial interna, nao uma loja automatica.

Ela deve mostrar ao cliente:

- O que ele ja tem na licenca atual.
- O que ele pode ganhar ao evoluir.
- Quais planos online existem.
- Quais recursos motivam a evolucao.
- Um caminho simples para solicitar atendimento.

O botao principal recomendado e:

`Solicitar Evolucao do Sistema`

Os botoes por recurso devem funcionar como sinais de interesse:

`Tenho interesse neste recurso`

Esses botoes nao devem liberar modulo avulso neste momento. Eles devem registrar qual recurso despertou a intencao comercial do cliente.

## Modelo de prateleira recomendado

### Camada 1 - Licenca Vitalicia Local

Entrada natural para Mercado Livre e venda direta.

Uso:

- Cliente compra uma versao local.
- Recebe licenca.
- Usa o sistema no dispositivo autorizado.
- Tem dados locais e rotina organizada.

No Admin:

- Geracao de licenca.
- Status da licenca.
- Email do comprador.
- Sistema comprado.
- Canal de venda.
- Plano comercial: `ml_lifetime` ou `direct_lifetime`.

### Camada 2 - Online Essencial

Primeira evolucao SaaS.

Uso:

- Cliente quer usar em mais de um ponto da operacao.
- Precisa de usuarios, dispositivos, backup e acesso mais flexivel.
- Continua com escopo enxuto.

No Admin:

- Plano mensal.
- Limite de usuarios e dispositivos.
- Modulos essenciais por sistema.
- Conversao manual a partir de lead de evolucao.

### Camada 3 - Online Premium

Evolucao com recursos de conveniencia, automacao ou visao avancada.

Uso:

- Cliente quer agendamento online, portal, WhatsApp automatico, relatorios avancados, inteligencia ou recursos conectados.

No Admin:

- Plano mensal premium.
- Modulos adicionais.
- Preco e limites superiores.
- Origem do interesse por recurso.

### Camada 4 - Sistema Completo com Marca

Projeto personalizado.

Uso:

- Cliente deseja sistema com identidade propria, dominio, marca e escopo ajustado.

No Admin:

- Lead/proposta consultiva.
- Status de projeto.
- Valor de implantacao.
- Observacoes de escopo.
- Separacao de hospedagem/dominio quando aplicavel.

## Prateleira por sistema

### Gestao Assistencia Pro

Oferta local:

- Ordens de servico.
- Clientes e equipamentos.
- Estoque de pecas.
- PDV e vendas.
- Fluxo de caixa.
- Relatorios.
- Manual de uso.

Evolucoes destacadas:

- Multiusuario.
- Acesso remoto/multi-dispositivo.
- Backup em nuvem.
- Portal do cliente O.S.
- WhatsApp automatico.
- Relatorios avancados.
- Garantias e pos-venda.
- Sistema com marca.

Diretriz para Central de Evolucao:

- Mostrar claramente que a licenca atual organiza a rotina local.
- Posicionar a evolucao como reducao de risco, seguranca dos dados, acesso em equipe e experiencia melhor para o cliente final da assistencia.

### Gestao Barbearia Pro

Oferta local:

- Agenda por barbeiro.
- Clientes.
- Servicos.
- PDV e produtos.
- Caixa.
- Comissoes.
- Estoque.
- Relatorios.

Evolucoes destacadas:

- Online Essencial.
- Online Premium.
- Agendamento online.
- Multiusuario.
- Mais dispositivos.
- Pagina publica da barbearia.
- WhatsApp automatico.
- Relatorios avancados.
- Sistema com marca.

Diretriz para Central de Evolucao:

- Posicionar evolucao como agenda mais profissional, equipe sincronizada, menos ruído na recepcao e mais retorno de clientes.

### Gestao Beleza Pro

Oferta local:

- Agenda por especialista.
- Clientes.
- Pacotes e recorrencia.
- Checkout.
- Caixa.
- Comissoes.
- Estoque.
- Relatorios.

Evolucoes destacadas:

- Online Essencial.
- Online Premium.
- Agendamento online.
- Multiusuario.
- Mais dispositivos.
- Pagina publica.
- WhatsApp automatico.
- Relatorios avancados.
- Sistema com marca.

Diretriz para Central de Evolucao:

- Posicionar evolucao como continuidade da experiencia de cuidado: recorrencia, agenda, pacotes, retorno e equipe conectada.

### Gestao Gastro Pro

Situacao atual:

- Ainda nao e produto de entrada ML.
- Deve ser adaptado para venda no Mercado Livre em ciclo proprio.

Oferta SaaS atual:

- PDV touch.
- Mesas e comandas.
- Painel de cozinha.
- Delivery.
- Pedidos online.
- Cardapio digital.
- Estoque.
- Caixa.
- Relatorios.
- Clientes.
- Colaboradores.
- Fornecedores.
- Diario de bordo.
- Seguranca.
- Inteligencia.

Planos na landing:

- Essencial: R$ 89/mes.
- Profissional: R$ 189/mes.
- Gestao: R$ 329/mes.
- Projeto personalizado: R$ 4.999,90 implantacao inicial.

Diretriz para entrada ML futura:

- Criar uma versao local/entrada bem delimitada antes de publicar no ML.
- Evitar prometer todo o escopo SaaS no produto de entrada.
- Usar a Central de Evolucao para apresentar Profissional/Gestao como expansao natural.

## Estado atual do Admin frente a essa visao

Ja existe:

- Catalogo de Sistemas e Planos.
- Clientes SaaS/provisionamento.
- Leads de Evolucao.
- Filtros por sistema e status.
- Campos comerciais de lead: responsavel, canal, proximo contato e observacoes.
- Exportacao CSV.
- Registro de interesse vindo dos tres sistemas ML atuais.

Ainda falta:

- Transformar o Catalogo em fonte unica real da prateleira.
- Alinhar nomes e precos entre landings, catalogo local, backend PHP e Supabase.
- Fazer a Central de Evolucao ler uma estrutura padronizada de planos/recursos.
- Registrar plano de interesse, nao apenas recurso clicado.
- Exibir no lead o plano atual do cliente e a camada sugerida de evolucao.
- Criar acao assistida: `Preparar contato WhatsApp`.
- Criar acao assistida: `Promover para proposta`.
- Criar acao assistida: `Enviar para provisionamento SaaS` sem criar automaticamente.
- Separar claramente leads de recurso, leads de plano e projetos personalizados.

## Fluxo manual recomendado

1. Cliente acessa a Central de Evolucao dentro do sistema.
2. Ele visualiza:
   - plano atual,
   - planos online,
   - recursos novos,
   - beneficios da evolucao.
3. Cliente clica em `Solicitar Evolucao do Sistema` ou em `Tenho interesse neste recurso`.
4. Sistema envia lead para o Admin com:
   - sistema,
   - email,
   - licenca,
   - plano atual,
   - plano de interesse,
   - recurso de interesse,
   - origem,
   - data.
5. Admin recebe o lead em status `novo`.
6. Operador define responsavel, canal e proximo contato.
7. Admin prepara mensagem de WhatsApp com contexto.
8. Atendimento humano conversa com o cliente.
9. Se fizer sentido, o status vai para `proposta_enviada`.
10. Se converter, o status vira `convertido`.
11. O provisionamento SaaS e feito manualmente na aba apropriada, com conferencia humana.

## Campos recomendados para evoluir os Leads de Evolucao

Campos ja existentes ou equivalentes:

- `email`
- `license_key`
- `system_id`
- `feature_key`
- `feature_title`
- `source`
- `created_at`
- `last_interaction`
- `count`
- `status`
- `owner`
- `contact_channel`
- `next_contact_at`
- `notes`

Campos recomendados:

- `current_plan_code`
- `current_plan_label`
- `interest_type`: `plan`, `feature`, `custom_project`
- `target_plan_code`
- `target_plan_label`
- `catalog_version`
- `customer_name`
- `whatsapp_hint`
- `last_license_status`
- `converted_tenant_id`
- `converted_at`
- `proposal_value`
- `proposal_notes`

## Padrao recomendado para a Central de Evolucao 2.0

Cada sistema deve ter a mesma estrutura narrativa:

1. Cabecalho:
   - `Sua licenca atual`
   - `Gestao [Sistema] Pro - Licenca Vitalicia Local`
   - resumo do que esta ativo.

2. Comparativo:
   - Coluna 1: `Voce ja tem`
   - Coluna 2: `Voce pode evoluir para`

3. Planos:
   - Online Essencial.
   - Online Premium.
   - Projeto com sua marca.

4. Recursos de interesse:
   - Cards de recursos conectados aos planos.
   - Botao `Tenho interesse neste recurso`.

5. CTA principal:
   - `Solicitar Evolucao do Sistema`.

6. Mensagem de confiança:
   - `Seu pedido sera analisado pela equipe Plena. Entraremos em contato pelo WhatsApp para explicar os melhores caminhos para sua rotina.`

## Regras de governanca

- Nao vender modulo avulso neste momento.
- Recurso individual serve como indicador de interesse comercial.
- Conversao deve continuar manual enquanto houver poucos clientes.
- Provisionamento automatico deve ser evitado ate a prateleira estar estabilizada.
- O Catalogo Comercial deve ser tratado como fonte de verdade de nomes, precos, modulos e limites.
- Landing pages, Admin, APIs e Central de Evolucao devem usar a mesma nomenclatura de planos.
- Mudancas de catalogo devem afetar novos leads/provisionamentos, nao alterar clientes ja provisionados sem acao explicita.

## Inconsistencias que precisam ser corrigidas

1. A pagina geral de Tecnologia apresenta os produtos como planos mensais, enquanto o fluxo ML usa licenca vitalicia como entrada.
2. O Admin ainda possui fallback local de catalogo e catalogo de backend/Supabase, criando risco de divergencia.
3. As Centrais de Evolucao atuais mostram recursos, mas nao apresentam ainda uma comparacao forte entre plano atual e planos online.
4. O lead atual registra recurso de interesse, mas nao registra explicitamente plano alvo.
5. O status `convertido` nao esta conectado a um registro de tenant/provisionamento.
6. O Gastro ainda nao possui desenho de produto ML de entrada.

## Fases sugeridas

### Fase A - Consolidar prateleira comercial

- Definir nomes canonicos dos planos por sistema.
- Definir precos canonicos.
- Definir modulos por plano.
- Definir limites de usuarios e dispositivos.
- Definir qual plano aparece em cada canal: ML, site, venda direta, SaaS.

### Fase B - Evoluir Central de Evolucao nos tres sistemas ML

- Reescrever layout para vitrine comercial.
- Incluir plano atual.
- Incluir comparativo.
- Incluir planos disponiveis.
- Registrar `interest_type` e `target_plan_code`.
- Manter tratamento manual via WhatsApp.

### Fase C - Evoluir Leads de Evolucao no Admin

- Adicionar colunas de plano atual e plano alvo.
- Adicionar acao `Preparar WhatsApp`.
- Adicionar acao `Promover para proposta`.
- Adicionar vinculo opcional a provisionamento quando convertido.
- Melhorar agrupamento por cliente/licenca.

### Fase D - Unificar Catalogo Comercial

- Reduzir duplicidade entre frontend, PHP e Supabase.
- Criar rotina de auditoria de divergencia.
- Bloquear edicoes perigosas sem confirmacao.
- Tratar catalogo como fonte para landings, evolucao e provisionamento.

### Fase E - Preparar Gastro para ML

- Definir versao local de entrada.
- Definir o que fica fora da entrada e vira evolucao.
- Criar recibo/descricao ML coerente.
- Adicionar fluxo de licenca ML se aplicavel.
- Incluir Gastro no mesmo modelo de Central de Evolucao.

## Perguntas de lapidacao

1. O produto ML deve sempre se chamar `Licenca Vitalicia Local` em todos os sistemas?
2. O valor de entrada sera sempre R$ 299,90 no site e outro valor promocional no Mercado Livre, ou teremos uma tabela por canal?
3. Para Barbearia e Beleza, os planos `Online Essencial` e `Online Premium` devem manter R$ 59,90 e R$ 99,00?
4. Para Assistencia, devemos manter `Multiusuario` e `Online Avancado`, ou padronizar tambem como `Online Essencial` e `Online Premium`?
5. O cliente deve conseguir informar WhatsApp dentro da Central de Evolucao, ou usaremos apenas email/licenca e contato posterior manual?
6. Ao marcar um lead como `convertido`, o Admin deve pedir um `tenant_id`/link SaaS manualmente?
7. O Gastro tera licenca vitalicia local no ML ou apenas trial/entrada mensal?

## Decisao recomendada

Avancar primeiro com a Fase A e Fase B.

Motivo:

- Sem prateleira canonica, cada sistema pode falar uma linguagem diferente.
- Sem Central de Evolucao mais clara, o cliente entende recurso, mas nao entende jornada de upgrade.
- Sem novos campos no lead, o Admin recebe interesse, mas ainda perde parte do contexto comercial.

O melhor proximo passo e gerar um prompt para o Agente auditar e propor a matriz canonica de planos/modulos/precos dos quatro sistemas, sem implementar, para aprovacao do Arquiteto antes de qualquer ajuste no codigo.
