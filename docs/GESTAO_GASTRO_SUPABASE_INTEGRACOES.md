# Gestão Gastro — mapa de integrações Supabase

Este documento descreve a origem de dados operacional. Em ambiente online, o
Cantinho da Resenha não pode substituir dados remotos por mocks; o fallback
local é exclusivo de homologação e de indisponibilidade declarada.

| Área | Origem principal | Identidade e isolamento | Fallback permitido |
| --- | --- | --- | --- |
| Autenticação e equipe | Supabase Auth e `tenant_members` | `auth.uid()` deve ser membro ativo do `tenant_id` | Nenhum em operação online |
| Módulos contratados | `tenant_modules` | RLS por membro ativo; `module_key` normalizado no app | Matriz do plano somente enquanto a consulta ainda carrega/offline |
| Mesas e disponibilidade | `restaurant_tables` + Realtime | Consulta por tenant | Cache/fila local apenas para contingência offline |
| Pedidos e comanda | `restaurant_orders` + Realtime | Pedido, mesa e garçom pertencem ao mesmo tenant | Fila local de sincronização; nunca mock em sessão online |
| Categorias e cardápio | `menu_categories`, `menu_products` | Consulta por tenant | Seed local apenas no ambiente de teste/offline |
| Licença, tenant e provisionamento | API autenticada (`api_licenca_ml.php`) | Licença vinculada ao tenant solicitado | Nenhum |
| Administração de equipe e acesso QR | API autenticada (`api_admin_users.php`) e `tenants.metadata.waiter_access` | Membro ativo; gravação de QR limitada a owner/admin | Preferência local só até a configuração remota ser carregada |
| Auditoria | `saas_audit_logs` via API autenticada | Ator e tenant validados; leitura apenas owner/admin por RLS | Log local pode apoiar diagnóstico, mas não é trilha oficial |
| Caixa, estoque, fornecedores, clientes, relatórios e configurações gerais | Estado local atual | Chaves locais isoladas pelo tenant | Permitido enquanto não houver migração de cada domínio para o backend |

## Regras de QR e homologação

- O QR externo usa a origem HTTPS oficial e sempre exige login de garçom ativo
  no tenant.
- O QR local aceita apenas uma origem LAN privada validada e é contingência no
  Wi-Fi; o servidor precisa estar acessível para os dispositivos da rede.
- O QR é desenhado no navegador. A URL não é enviada a um gerador externo.
- `gastro-teste` mantém slug, usuários e dados próprios. Ele usa os mesmos
  contratos e RLS do Cantinho, sem compartilhar cardápio, pedidos ou sessão.

## Auditoria e retenção

Eventos críticos registram ator, tenant, ação, correlação e metadados
sanitizados. Senhas, tokens, licenças, contatos, observações e conteúdo de
pedido são bloqueados no cliente e novamente na API. A função de limpeza tem
retenção padrão de 180 dias, limites de 30 a 3650 dias e execução exclusiva de
`service_role`.
