# Registro Técnico - Auditoria do Módulo Licenças Vitalícias
**Data/Hora local:** 2026-07-23T15:30:00-03:00
**Autor:** Antigravity (Agente Dev Sênior)

## 1. Papel Funcional Atual do Módulo
O módulo de **Licenças Vitalícias** (`tab-licenses` no Painel Admin e rotas em `api_licenca_ml.php`) é responsável pelo provisionamento e controle de chaves de ativação vendidas no modelo "Standalone" (ex: Mercado Livre, venda direta). Ele atua como o sistema canônico de DRM (Digital Rights Management) para os sistemas locais (Gestão Barbearia, Gestão Beleza e Gestão Assistência), assegurando que uma licença seja vinculada a apenas um dispositivo (ou IP), gerenciando trials e coletando aceite de termos de uso e recibos.

## 2. Fontes de Dados Encontradas
*   `api_data/database_licenses_secure.json`: Banco de dados principal JSON que armazena todas as chaves geradas, seus metadados (plano, produto, e-mail captado, device_id, IP) e status.
*   `api_data/database_licenses_archived.json`: Armazena licenças inativas arquivadas pelo administrador.
*   `api_data/receipts_log.json`: Registro de recibos de entrega digital confirmados pelos clientes no primeiro acesso.

## 3. Fluxos Cobertos
*   **Venda Mercado Livre / Geração:** O operador gera um lote de chaves (ex: `XXXX-XXXX-XXXX`) no admin com status inicial `pending`.
*   **Primeiro Acesso (Activate):** O cliente insere a chave e, opcionalmente, o e-mail. A API valida a chave, altera o status para `active`, vincula ao `device_id` gerado no navegador do cliente, e registra o IP e a data da ativação.
*   **Persistência do Dispositivo (Verify):** A cada carga, o sistema cliente envia a chave e o `device_id`. A API garante que a chave está `active`, não expirou (se for trial) e confere o dispositivo (se aplicável).
*   **Suporte para Troca de Computador:** O módulo possui o comando `reset_device` no Admin (`update_status`), que limpa o `device_id` no JSON, permitindo que o cliente ative a mesma chave em um novo computador.
*   **Smart Rebind (V11.5):** Se o cliente troca de navegador (novo device_id) mas mantém o mesmo IP (ex: instala via PWA), a API faz o re-bind automaticamente sem exigir suporte manual.
*   **Confirmação e Captura de E-mail:** O endpoint `confirm_receipt` grava o e-mail (gerando um Lead/CRM primitivo) e o aceite da entrega.

## 4. Lacunas e Riscos de Operação
*   **Dispositivo Preso (Locking):** Se o usuário limpar o cache/LocalStorage do navegador ou trocar de rede (mudando o IP), perderá o acesso e precisará contatar o suporte para um `reset_device` manual, gerando gargalo operacional.
*   **Qualidade do E-mail (Lead):** O e-mail não é obrigatório no ato de geração (geralmente não se tem na venda do ML), sendo capturado via input do cliente. Isso pode gerar erros de digitação, comprometendo a qualificação no CRM.
*   **Segurança (Exposição via Backup):** O endpoint `action=backup` permite baixar o arquivo JSON completo. Se a constante `$ADMIN_SECRET` vazar, toda a base de clientes pode ser exportada indiscriminadamente.
*   **Gastro ML:** A API aceita o `system_id = gestao-gastro`. No entanto, o Gastro caminha fortemente para uma abordagem SaaS. Caso licenças vitálicias sejam emitidas para o Gastro, precisaremos manter a compatibilidade offline do sistema.

## 5. Relação com CRM, SaaS, Leads e Dashboard
*   **CRM (Customer 360):** O endpoint `customers_summary` (auditado na Fase C.2) já lê o `database_licenses_secure.json` e unifica com a base SaaS e Leads, sendo a principal fonte primária de clientes offline.
*   **Leads de Evolução:** Os clientes com licença vitalícia têm acesso a botões de "Evolução" no seu painel local que chamam o `register_evolution_lead`, cruzando o interesse deles em planos SaaS e gravando em `evolution_leads.json`.
*   **Clientes SaaS:** O mecanismo de ativação e verificação de licença possui um **fallback robusto**. Se a chave não for encontrada no JSON local, a `api_licenca_ml.php` faz um proxy e busca a chave no banco SaaS (Supabase) via `findSaasLicense()`, validando a licença em nuvem. Isso significa que o módulo de licença atende tanto clientes locais quanto nuvem de forma transparente para o aplicativo.
*   **Dashboard:** As métricas financeiras locais e contagens de trials/ativas do Admin Dashboard dependem diretamente da leitura do `database_licenses_secure.json` via endpoint `dashboard_stats`.

## 6. Recomendações de Curto Prazo
1.  **Refinamento do Smart Rebind:** Aumentar a tolerância para PWA, talvez utilizando fingerprints mais perenes que o simples `device_id` local e IP (que muda em redes móveis), reduzindo chamadas de suporte por "Licença já usada".
2.  **Obrigatoriedade e Validação de E-mail:** Inserir validação de sintaxe rígida no endpoint `activate` e `confirm_receipt` para que o lead capturado para o CRM seja sempre acionável.

## 7. Recomendações Futuras (Arquitetura)
1.  **Migração Suave para Autenticação Híbrida:** Reduzir a dependência do arquivo JSON físico (`database_licenses_secure.json`). Em vez disso, fazer o upload sincrônico dessas licenças para o Supabase (como "Standalone Tenants"), permitindo que clientes vitalícios também usem e-mail/senha, eliminando de vez o problema de "perda de device_id".
2.  **Gestão Gastro ML:** Definir se o produto Gastro ML terá de fato uma modalidade Vitalícia (Standalone). Caso não tenha, o `generate` deve restringir estritamente a emissão de licenças locais para ele.

## 8. Garantias de Segurança
*   **Sem alterações de código**: Apenas arquivos foram lidos. Nenhum código de produção ou de testes foi modificado.
*   **Nenhum dado sensível real listado**: O relatório não contém chaves válidas, secrets ou senhas reais.
*   **Não houve** geração de ZIP, commits no repositório, push ou deploy.
