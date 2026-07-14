# ROADMAP - Sistemas de Gestão

> Documento mestre de produto, arquitetura e evolução comercial dos sistemas standalone e premium.

## 1. Visão

Os Sistemas de Gestão devem operar em dois trilhos complementares:

1. **Linha Vitalícia Standalone**
   - Produto local, autônomo e sem dependência operacional de nuvem.
   - Ideal para Mercado Livre, venda direta e nichos replicáveis.
   - Base técnica: HTML, CSS, JavaScript, PHP, JSON/localStorage, PWA e licença local.

2. **Linha Premium Online**
   - Evolução mensal/recorrente para clientes que precisam de agenda online, backup em nuvem, multiusuário, automações e recursos comerciais.
   - Base técnica inicial: mesmo frontend/padrão visual, PHP como API intermediária e Supabase como banco/autenticação.
   - A migração deve acontecer por módulos, preservando o produto vitalício.

O objetivo não é substituir o vitalício pelo premium, mas criar uma escada natural:

```text
Mercado Livre R$97
  -> Venda direta R$299,90
    -> Pro Vitalício R$599,90
      -> Premium Online mensal
        -> Módulos avulsos e planos avançados
```

## 2. Produtos Atuais

### Gestão Barbearia

Status: produto ativo com clientes reais.

Módulos atuais:

- Visão Geral
- Agenda
- Clientes
- PDV de balcão
- Financeiro
- Relatórios
- Barbeiros/equipe
- Serviços
- Estoque
- Configurações
- Manual de uso
- Notificações
- Licença local
- Backup/restauração local

Papel na estratégia:

- Produto base mais completo para validar a receita de evolução.
- Melhor candidato para iniciar a Central de Evolução e a futura agenda online premium.

### Gestão Beleza

Status: produto ativo em alinhamento funcional com Barbearia.

Módulos atuais:

- Visão Geral
- Agenda
- Clientes
- Profissionais
- Serviços
- Financeiro
- Relatórios
- Estoque
- Configurações
- Manual de uso
- Licença local
- Backup/restauração local

Papel na estratégia:

- Segundo produto base para replicar padronizações.
- Melhor candidato para validar variações de nicho sem reescrever o núcleo.

## 3. Canais e Preços

> **NOTA IMPORTANTE:** A estratégia de planos foi formalizada e a matriz oficial atualizada encontra-se em: [docs/POLITICA_COMERCIAL_PLANOS_E_LICENCAS.md](docs/POLITICA_COMERCIAL_PLANOS_E_LICENCAS.md) e [docs/ESTRATEGIA_PLANOS_VITALICIO_PREMIUM.md](docs/ESTRATEGIA_PLANOS_VITALICIO_PREMIUM.md).
>
> A diretriz principal estabelece que:
> - O plano **ML Vitalício** permanece como produto local/offline pronto para venda.
> - O **Pro Vitalício** deve melhorar recursos offline, sem criar dependência de nuvem.
> - O **Premium Online Mensal** fica reservado para agenda online, backup em nuvem, multiusuário, múltiplos dispositivos, página pública, automações e Supabase/API.
> - O piloto recomendado permanece: **Gestão Barbearia Premium Online** com **Agenda Online para Clientes**.

### Mercado Livre - Entrada

Preço de referência: **R$97,00**.

Objetivo:

- Alcance.
- Volume.
- Prova social.
- Aquisição de usuários para upgrade futuro.

Posicionamento:

- "Sistema vitalício essencial/promocional".
- Não prometer suporte ilimitado nem evolução premium gratuita.
- Manter compliance: white-label, isolamento local e ativação única.

### Venda Direta - Vitalício Completo

Preço de referência: **R$299,90**.

Objetivo:

- Valor percebido maior.
- Melhor margem.
- Possibilidade de onboarding, material de implantação e relacionamento.

Posicionamento:

- "Sistema completo, vitalício e sem mensalidade".
- Usar os módulos atuais como argumento de valor.

### Pro Vitalício

Preço oficial atual: **R$599,90**.

Objetivo:

- Capturar usuários que querem mais recursos offline sem mensalidade.
- Criar ponte antes do premium mensal.

Possíveis diferenciais:

- PDV avançado.
- Estoque com mais controles.
- Relatórios mais completos.
- Exportações.
- Fechamento profissional.
- Permissões simples.
- Impressão/recibos aprimorados.

### Premium Online Mensal

Faixa inicial sugerida: **R$49,90 a R$149,90/mês**.

Objetivo:

- Receita recorrente.
- Recursos dependentes de nuvem.
- Maior retenção e evolução contínua.

Possíveis diferenciais:

- Agenda online para clientes.
- Backup em nuvem.
- Multiusuário.
- Múltiplos dispositivos.
- WhatsApp/e-mail automático.
- Página pública do negócio.
- Relatórios avançados.
- Painel web.
- Integrações.

## 4. Matriz de Módulos por Plano

| Módulo | ML R$97 | Direto R$299,90 | Pro Vitalício | Premium Mensal |
| --- | --- | --- | --- | --- |
| Dashboard básico | Sim | Sim | Sim | Sim |
| Agenda manual | Sim | Sim | Sim | Sim |
| Clientes | Sim | Sim | Sim | Sim |
| Serviços | Sim | Sim | Sim | Sim |
| Profissionais/equipe | Sim | Sim | Sim | Sim |
| Financeiro básico | Sim | Sim | Sim | Sim |
| Relatório mensal simples | Sim | Sim | Sim | Sim |
| Backup local | Sim | Sim | Sim | Sim |
| Manual de uso | Sim | Sim | Sim | Sim |
| Notificações internas | Sim | Sim | Sim | Sim |
| PDV balcão | Sim na Barbearia atual | Sim | Sim avançado | Sim integrado |
| Estoque | Sim | Sim | Sim avançado | Sim sincronizado |
| Comissões | Sim básico | Sim | Sim avançado | Sim avançado |
| Fiado/dívidas | Sim na Barbearia atual | Sim | Sim aprimorado | Sim sincronizado |
| Fechamento/recibo | Sim básico | Sim | Sim aprimorado | Sim integrado |
| Exportações CSV/PDF | Não obrigatório | Opcional | Sim | Sim |
| Permissões | Não | Não ou básico | Sim básico | Sim por usuário |
| Central de Evolução | Sim | Sim | Sim | Sim |
| Agenda online cliente | Vitrine/bloqueado | Vitrine/bloqueado | Opcional | Sim |
| Backup em nuvem | Vitrine/bloqueado | Vitrine/bloqueado | Opcional | Sim |
| Multiusuário | Não | Não | Opcional | Sim |
| WhatsApp automático | Vitrine/bloqueado | Vitrine/bloqueado | Opcional | Sim |
| Página pública | Vitrine/bloqueado | Vitrine/bloqueado | Opcional | Sim |
| Supabase | Não | Não | Não obrigatório | Sim |

## 5. Central de Evolução

A Central de Evolução será o módulo comercial dentro do próprio app.

Objetivos:

- Educar o cliente sobre recursos premium.
- Transformar o vitalício em canal de aquisição recorrente.
- Apresentar upgrades no contexto real de uso.
- Evitar propaganda invasiva.

Exemplo de card:

```text
Agenda Online
Permita que seus clientes escolham horários disponíveis pelo celular.

Disponível na versão Premium.
[Conhecer recurso]
```

Categorias sugeridas:

- Recursos Online
- Gestão Avançada
- Recursos Comerciais
- Segurança e Backup
- Automação e Marketing

Recursos premium prioritários para vitrine:

- Agenda online.
- Backup em nuvem.
- Multiusuário.
- WhatsApp automático.
- Página pública do negócio.
- Relatórios avançados.

## 6. Arquitetura de Evolução

### Estado atual

```text
Frontend standalone
  -> JavaScript local
    -> localStorage/JSON
    -> PHP para licença, notificações e vendas
```

### Próximo estágio recomendado

Criar uma camada lógica de serviços/adaptadores:

```text
Interface atual
  -> Services JS
    -> Local Adapter
      -> localStorage/JSON
    -> API Adapter
      -> PHP
        -> Supabase
```

Serviços-alvo:

- `ClientesService`
- `AgendaService`
- `FinanceiroService`
- `RelatoriosService`
- `EstoqueService`
- `EquipeService`
- `LicencaService`
- `NotificacoesService`
- `ComercialService`

Princípio-chave:

> A interface deve depender dos serviços, não diretamente da origem dos dados.

Isso permite manter o vitalício local e ativar premium online sem reescrever cada tela.

## 7. Fases de Execução

### Fase 0 - Consolidação Operacional

Objetivo:

- Garantir que Barbearia e Beleza estejam estáveis como produtos ativos.

Tarefas:

- Validar relatórios, agenda e datas locais.
- Validar fechamento, comissões e financeiro.
- Validar backup/restauração.
- Validar licença e notificações.
- Corrigir inconsistências entre os dois sistemas.
- Documentar diferenças funcionais.

Critério de pronto:

- Ambos os sistemas passam em checagens de sintaxe.
- Fluxos principais testados manualmente.
- Nenhum bug crítico conhecido em agenda, financeiro e relatórios.

### Fase 1 - Padronização de Produto

Objetivo:

- Criar um núcleo comum replicável para novos nichos.

Tarefas:

- Padronizar nomes de módulos.
- Padronizar estrutura de dados.
- Padronizar helpers de data local.
- Padronizar backup/restauração.
- Padronizar notificações.
- Padronizar manual de uso.
- Padronizar checklist de publicação.

Critério de pronto:

- Barbearia e Beleza seguem o mesmo contrato funcional.
- Diferenças por nicho ficam documentadas.

### Fase 2 - Central de Evolução

Objetivo:

- Criar a vitrine comercial dentro dos apps.

Tarefas:

- Criar módulo/aba "Central de Evolução".
- Criar cards de recursos premium.
- Criar estrutura de feature flags locais.
- Definir status dos recursos: disponível, premium, em breve.
- Criar mensagens comerciais por contexto.
- Integrar com notificações internas quando fizer sentido.

Critério de pronto:

- Cliente vitalício enxerga a evolução possível sem perder funcionalidade atual.
- Recursos bloqueados não quebram fluxos existentes.

### Fase 3 - Camada de Serviços

Objetivo:

- Reduzir acoplamento entre telas e armazenamento.

Tarefas:

- Mapear funções atuais por domínio.
- Criar serviços JS por domínio.
- Preservar comportamento atual via Local Adapter.
- Evitar reescrita ampla de UI.
- Criar testes/harnesses para regras críticas.

Critério de pronto:

- Agenda, clientes, financeiro e relatórios passam por serviços.
- O app continua funcionando localmente.

### Fase 4 - Premium Online Piloto

Objetivo:

- Criar o primeiro módulo online recorrente sem substituir o vitalício.

Produto piloto recomendado:

- Gestão Barbearia Premium Online.

Módulo inicial recomendado:

- Agenda online para clientes.

Tarefas:

- Definir schema Supabase multiempresa.
- Criar API PHP intermediária.
- Criar autenticação/tenant.
- Criar página pública de agendamento.
- Sincronizar agendamentos com o painel interno.
- Criar plano/feature flag premium.

Critério de pronto:

- Cliente externo consegue solicitar/agendar.
- Dono do negócio vê o agendamento no sistema.
- Dados ficam isolados por empresa.

### Fase 5 - Expansão Premium

Objetivo:

- Ampliar receita recorrente.

Módulos prioritários:

- Backup em nuvem.
- Multiusuário.
- WhatsApp/e-mail automático.
- Página pública.
- Relatórios avançados.
- Campanhas para clientes inativos.
- Fidelidade/cashback.

Critério de pronto:

- Cada novo recurso premium tem preço, dependência técnica e métrica de valor definidos antes da implementação.

## 8. Receita para Novos Nichos

Todo novo nicho deve seguir este fluxo:

1. Escolher nicho com agenda, clientes ou vendas recorrentes.
2. Copiar núcleo padrão.
3. Adaptar identidade visual e linguagem.
4. Adaptar entidades específicas do nicho.
5. Preservar módulos comuns.
6. Validar dados locais, backup e licença.
7. Criar Central de Evolução com módulos premium coerentes.
8. Publicar com checklist de compliance.

Nichos candidatos:

- Pet shop/banho e tosa.
- Clínica estética.
- Oficina mecânica.
- Lava-rápido.
- Studio de tatuagem.
- Consultório simples.
- Personal trainer/estúdio fitness.
- Assistência técnica.

## 9. Checklist de Publicação

Antes de publicar qualquer sistema:

- [ ] Nome, título e manifest corretos.
- [ ] Dependências locais sem CDN externa.
- [ ] Licença `lock.js` validada.
- [ ] Dados locais isolados por app.
- [ ] Backup e restauração testados.
- [ ] Agenda testada.
- [ ] Financeiro testado.
- [ ] Relatórios testados.
- [ ] Manual de uso atualizado.
- [ ] Central de Evolução revisada.
- [ ] Notificações funcionando.
- [ ] Sintaxe JavaScript validada.
- [ ] Sem caminhos absolutos de desenvolvimento.
- [ ] Sem links externos indevidos no pacote Mercado Livre.

## 10. Padrão de Trabalho Codex + Antigravity

Papéis:

- **Codex:** Arquiteto de Software, analista de produto e validador técnico.
- **Antigravity:** Desenvolvedor Sênior executor das alterações.

Fluxo:

1. Codex analisa e define a tarefa.
2. Codex gera prompt técnico para Antigravity.
3. Antigravity aplica alterações.
4. Codex valida código, comportamento e aderência ao roadmap.
5. Ajustes finais são solicitados se houver risco.
6. Commit/push apenas após validação clara.

Critérios de validação recorrentes:

- `node -c` nos arquivos JS alterados.
- `git diff --check` ou `git diff --cached --check`.
- Busca por padrões legados críticos.
- Teste manual dos fluxos impactados.
- Verificação de que alterações não quebram compliance ML.

## 11. Próximas Ações Recomendadas

### Bloco A - Governança do Produto

1. Confirmar oficialmente a matriz de preços.
2. Confirmar nomes comerciais dos planos.
3. Definir quais módulos entram em cada plano.
4. Definir nomenclatura final da Central de Evolução.

### Bloco B - Aplicação nos Sistemas Atuais

1. Validar estado final do Gestão Barbearia.
2. Validar estado final do Gestão Beleza.
3. Criar Central de Evolução nos dois sistemas.
4. Padronizar mensagens comerciais.
5. Criar notificação interna anunciando a Central de Evolução.

### Bloco C - Arquitetura Técnica

1. Mapear funções atuais por domínio.
2. Definir contratos dos Services JS.
3. Criar Local Adapter sem mudar comportamento.
4. Preparar API Adapter para versão premium.

### Bloco D - Premium Piloto

1. Escolher Barbearia como primeiro piloto.
2. Definir schema Supabase.
3. Criar agenda pública online.
4. Criar sincronização com sistema interno.
5. Criar plano mensal inicial.

## 12. Prompt Base para Antigravity

Use este prompt como base para tarefas derivadas deste roadmap:

```text
Você é o Desenvolvedor Sênior Antigravity no projeto Sistemas de Gestão.
Codex atua como Arquiteto de Software e validador técnico.

Contexto:
- Repositório: Sistemas de Gestão.
- Produtos atuais: gestao-barbearia e gestao-beleza.
- Arquitetura atual: HTML/CSS/JS local, PHP APIs, licença local, PWA, localStorage/JSON.
- Direção estratégica: preservar produto vitalício standalone e preparar evolução premium online por módulos.
- Referência obrigatória: ROADMAP_SISTEMAS_DE_GESTAO.md.

Regras:
- Não reescrever UI sem necessidade.
- Preservar comportamento atual dos clientes ativos.
- Não remover módulos existentes.
- Não introduzir dependências externas/CDN nos pacotes standalone.
- Manter compliance Mercado Livre.
- Aplicar alterações primeiro de forma incremental.
- Validar sintaxe e ausência de whitespace antes de devolver.

Tarefa:
[DESCREVER TAREFA ESPECÍFICA]

Evidências esperadas:
- Arquivos alterados.
- Resumo objetivo das mudanças.
- Comandos executados.
- Resultado de `node -c` nos JS impactados.
- Resultado de `git diff --check` ou `git diff --cached --check`.
- Observações de risco ou pendências.
```

