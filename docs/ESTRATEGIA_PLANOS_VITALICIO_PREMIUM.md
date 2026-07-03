# Estratégia de Planos - Vitalício vs Premium

## 1. Objetivo
O produto vitalício continua forte, local e sem mensalidade, enquanto o Premium Online Mensal vende recursos conectados, recorrentes e dependentes de infraestrutura em nuvem.

## 2. Princípios de Separação
As regras de separação são claras:
- O plano Vitalício não depende de nuvem.
- O plano Vitalício não promete multiusuário real.
- O plano Vitalício não promete agenda pública online.
- O plano Vitalício não promete backup automático em nuvem.
- O plano Premium vende conveniência, acesso remoto, automação e sincronização.
- O plano Pro Vitalício foca em melhorias avançadas offline, não oferecendo recursos recorrentes conectados ou em nuvem.

## 3. Matriz de Planos
| Recurso | ML Vitalício | Direto Vitalício | Pro Vitalício | Premium Mensal |
| :--- | :--- | :--- | :--- | :--- |
| Dashboard | Incluído | Incluído | Incluído | Incluído |
| Agenda manual | Incluído | Incluído | Incluído | Incluído |
| Clientes | Incluído | Incluído | Incluído | Incluído |
| Serviços | Incluído | Incluído | Incluído | Incluído |
| Profissionais/equipe | Incluído | Incluído | Incluído | Incluído |
| Financeiro básico | Incluído | Incluído | Incluído | Incluído |
| Relatórios simples | Incluído | Incluído | Incluído | Incluído |
| Backup local | Incluído | Incluído | Incluído | Incluído |
| Manual de uso | Incluído | Incluído | Incluído | Incluído |
| Licença local | Incluído | Incluído | Incluído | Incluído |
| PWA offline | Incluído | Incluído | Incluído | Incluído |
| Central de Evolução | Vitrine | Vitrine | Vitrine | Incluído |
| PDV balcão | Incluído na Barbearia / Opcional no Beleza | Incluído na Barbearia / Opcional no Beleza | Incluído | Incluído |
| Estoque | Incluído | Incluído | Incluído avançado | Incluído |
| Comissões | Incluído básico | Incluído básico | Incluído | Incluído |
| Fiado/dívidas | Incluído na Barbearia / Limitado ou não aplicável no Beleza | Incluído na Barbearia / Limitado ou não aplicável no Beleza | Incluído | Incluído |
| Fechamento de caixa | Incluído/Limitado | Incluído/Limitado | Incluído | Incluído |
| Recibos/impressão | Limitado | Incluído | Incluído | Incluído |
| Exportação CSV/PDF | Não incluso | Não incluso | Incluído | Incluído |
| Permissões locais simples | Não incluso | Não incluso | Incluído | Incluído |
| Agenda online para clientes | Vitrine | Vitrine | Vitrine | Premium |
| Backup em nuvem | Vitrine | Vitrine | Vitrine | Premium |
| Multiusuário | Vitrine | Vitrine | Vitrine | Premium |
| Múltiplos dispositivos | Vitrine | Vitrine | Vitrine | Premium |
| Página pública do negócio | Vitrine | Vitrine | Vitrine | Premium |
| WhatsApp automático | Vitrine | Vitrine | Vitrine | Premium |
| E-mail automático | Vitrine | Vitrine | Vitrine | Premium |
| Relatórios avançados online | Vitrine | Vitrine | Vitrine | Premium |
| Painel web | Vitrine | Vitrine | Vitrine | Premium |
| Supabase/API online | Não incluso | Não incluso | Não incluso | Premium |

## 4. Limites do Produto Vitalício
O plano vitalício (Mercado Livre e Venda Direta) NÃO deve incluir:
- Agenda pública online funcional
- Login multiusuário em nuvem
- Sincronização entre dispositivos
- Backup automático em nuvem
- Automações recorrentes de WhatsApp/e-mail
- Painel web remoto
- Supabase obrigatório

## 5. O Que Pode Entrar no Pro Vitalício
O Pro Vitalício não cria recursos de nuvem, mas aprimora recursos offline já existentes:
- Recibo/impressão melhorada
- Exportações de dados
- PDV mais completo
- Controle de estoque avançado
- Relatórios locais mais detalhados e completos
- Permissões locais simples
- Fechamento de caixa profissional
- Melhorias gerais de usabilidade
- Modelos variados de relatório ou comprovante

## 6. Premium Online Mensal
O Premium é o plano recorrente que conta com infraestrutura online:
- Agenda online
- Página pública
- Backup em nuvem
- Multiusuário e Sincronização entre dispositivos
- Automação de WhatsApp/e-mail
- Relatórios online integrados
- Painel web dedicado
- API PHP + Supabase como backend

## 7. Primeiro Piloto Recomendado
- **Produto piloto:** Gestão Barbearia Premium Online
- **Primeiro módulo:** Agenda Online para Clientes
- **Justificativa:** Possui alto valor percebido e é de fácil comunicação comercial. Depende intrinsecamente da nuvem, de modo que não reduz o valor da oferta vitalícia offline. Além disso, a agenda online abre caminho futuramente para funcionalidades como página pública, integrações com WhatsApp e backup em nuvem.

## 8. Arquitetura Inicial do Premium
A arquitetura proposta para a versão Premium baseia-se em:
Frontend atual -> Services JS -> Local Adapter -> API Adapter -> PHP API -> Supabase

A primeira implementação deve focar estritamente nas camadas de serviços/adaptadores, preservando e aproveitando a interface atual sem reescrever o frontend inteiro.

## 9. Central de Evolução 2.0
A Central de Evolução passa a adotar o seguinte comportamento estratégico:
- Cards informativos com os status: "Disponível", "Premium", ou "Em breve".
- Calls to Action (CTAs) padronizados e orientados a vendas.
- Texto comercial atraente para cada recurso.
- É mandatório que nenhum recurso Premium quebre ou impeça a usabilidade do produto vitalício; os cards devem servir para educar o usuário e tentar a conversão para o Premium, e nunca para bloquear a operação local básica.

## 10. Próximos Blocos
Os próximos passos operacionais envolvem:
1. Revisão final e aprovação desta matriz de planos.
2. Atualização do ROADMAP incluindo a matriz oficial, após aprovação.
3. Criação de feature flags locais no código para mapear os status dos recursos premium.
4. Evolução da Central de Evolução no frontend para refletir essa matriz.
5. Mapeamento das funções atuais da ferramenta de Agenda.
6. Criação de um contrato bem definido para o `AgendaService`.
7. Criação do `LocalAdapter` para garantir que o comportamento offline atual se mantém intacto.
8. Início do desenvolvimento do `ApiAdapter` e integração com o Supabase unicamente para a Agenda Online, validando a arquitetura proposta.
