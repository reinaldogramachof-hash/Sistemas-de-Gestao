# Registro Técnico - Fase C.4: Licenças Vitalícias: Clareza Operacional e Preparação ML
**Data/Hora local:** 2026-07-23T15:35:00-03:00
**Autor:** Antigravity (Agente Dev Sênior)

## Objetivos Alcançados
Evolução da clareza operacional e UX do módulo de **Licenças Vitalícias** (`tab-licenses`) no Painel Admin, alinhando a nomenclatura técnica aos arquivos reais do repositório, sinalizando a arquitetura recomendada do **Gestão Gastro** e melhorando o suporte visual para vinculação de dispositivos.

## Alterações Realizadas

### 1. Correção Nomenclatura dos Arquivos Físicos de Dados
*   Alinhados todos os registros e referências documentais e de código para utilizar os caminhos/nomes reais do repositório:
    *   Base principal de licenças: `api_data/database_licenses_secure.json`
    *   Arquivo de licenças arquivadas/inativas: `api_data/database_licenses_archived.json`
    *   Registro de recibos/aceites: `api_data/receipts_log.json`

### 2. Transparência Operacional e Estados de Licença (`admin/index.html`)
*   **Detalhamento de Status**: Adicionados subtextos descritivos abaixo dos badges de status na tabela de licenças:
    *   `ATIVO`: Exibe subtexto `Dispositivo Vinculado` ou `Sem Dispositivo / Livre`.
    *   `PENDENTE`: Exibe subtexto `Aguardando Ativação`.
    *   `BLOQUEADO`: Exibe subtexto `Acesso Revogado`.
    *   `TESTE (ATIVO)` / `TESTE (EXPIRADO)`: Exibe subtexto `Período de Avaliação` ou `Prazo de Teste Encerrado`.
*   **Visualização de Dispositivo Vinculado**:
    *   Quando a licença tem `device_id` vinculado: Exibe badge azul `📱 device_id...` e nota verde `Vinculado (IP: X.X.X.X)`.
    *   Quando a licença não tem `device_id`: Exibe badge amarelo `⏳ Livre` com subtexto `Sem aparelho vinculado`.
*   **Melhoria de Tooltips nas Ações**:
    *   Botão Reset: Tooltip estendido `Resetar Dispositivo Vinculado (Use se o cliente trocou de aparelho ou formatou)`.
    *   Botões de Bloqueio, Desbloqueio e Cópia atualizados com dicas de suporte explicativas.

### 3. Sinalização do Gestão Gastro (Nuvem / SaaS Recomendado)
*   **No Formulário de Geração de Licença**:
    *   Opções do seletor `gen-product` e `gen-system` atualizadas para `Gestão Gastro (Nuvem/SaaS)` e `Gestão Gastro (SaaS Recomendado)`.
    *   Adicionada caixa de aviso operacional amarela (`#gen-gastro-warning-box`) no modal de geração alertando que o Gestão Gastro é nativamente um sistema SaaS/Supabase e que a emissão vitalícia/standalone deve ser feita apenas para atendimento de clientes offline específicos.
*   **Na Tabela de Licenças**:
    *   Adicionado badge `SaaS Recomendado` ao lado da coluna do produto quando a licença for do `Gestão Gastro`.

### 4. Cobertura de Testes
*   Adicionado o teste `Fase C.4: Licenças Vitalícias UI operational clarity, Gastro notices and device binding details` no arquivo [admin-saas-central.test.mjs](file:///C:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/tests/admin-saas-central.test.mjs), validando os novos badges, ids, opções do Gastro e as referências exatas de arquivos no backend PHP.

## Validações Executadas
1.  `php -l api_licenca_ml.php` -> Syntax OK
2.  `php -l api_provisioning.php` -> Syntax OK
3.  `node --test tests/admin-saas-central.test.mjs` -> Passou (63/63 testes)
4.  `node --test tests/admin-hardening.test.mjs` -> Passou
5.  `node --test tests/evolution-leads.test.mjs` -> Passou
6.  `git diff --check` -> Limpo

## Garantias de Segurança
*   Sem arquivos ZIP gerados.
*   Sem commits ou pushes realizados.
*   Nenhum deploy efetuado.
*   Regras de ativação de licença, `device_id` e `smart rebind` permanecem 100% intactas.
