# Relatório de Auditoria Técnica - Evolução Standalone para SaaS
**Data:** 22 de Julho de 2026
**Auditor:** Antigravity (AI Dev Sênior)
**Status:** Concluído (Fase de Análise)

---

## 1. Resumo Executivo
Este documento apresenta o resultado da auditoria técnica focada na padronização e evolução comercial dos três sistemas standalone (`gestao-assistencia`, `gestao-barbearia` e `gestao-beleza`) de licença local/vitalícia para um ecossistema SaaS online integrado com o painel `admin` e o banco de dados centralizado Supabase.

Foram identificados gaps críticos de segurança (validação de dispositivos burlável), vulnerabilidades operacionais (colisão de chaves de localStorage entre os sistemas da Barbearia e Beleza) e desalinhamentos de catálogo de provisionamento no backend que inviabilizam a ativação imediata do SaaS para a Assistência Técnica.

---

## 2. Escopo Analisado
A auditoria concentrou-se na análise estática do código-fonte e logs locais nos seguintes diretórios e componentes:
- **Painel Administrativo:** `admin/index.html`
- **APIs PHP de Controle:** `api_licenca_ml.php`, `api_provisioning.php` e `api_admin_users.php`
- **Frontend dos Módulos:** `gestao-assistencia/`, `gestao-barbearia/` e `gestao-beleza/`
- **Testes de Contrato e Integração:** `tests/`
- **Políticas Comerciais:** `docs/POLITICA_COMERCIAL_PLANOS_E_LICENCAS.md`

---

## 3. Arquivos Inspecionados
Os seguintes arquivos críticos foram abertos e analisados em detalhe:
1. [lock.js (gestao-assistencia)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/gestao-assistencia/lock.js) — Controle de segurança local do módulo Assistência.
2. [lock.js (gestao-barbearia)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/gestao-barbearia/lock.js) — Controle de segurança local do módulo Barbearia.
3. [lock.js (gestao-beleza)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/gestao-beleza/lock.js) — Controle de segurança local do módulo Beleza.
4. [index.html (gestao-assistencia)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/gestao-assistencia/index.html) — Fluxo de ativação e interface da Assistência.
5. [index.html (gestao-barbearia)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/gestao-barbearia/index.html) — Ativação, recibo e Central de Evolução da Barbearia.
6. [index.html (gestao-beleza)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/gestao-beleza/index.html) — Ativação, recibo e Central de Evolução da Beleza.
7. [app_core.js (gestao-barbearia)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/gestao-barbearia/js/app_core.js) — Renderização da Central de Evolução da Barbearia.
8. [app_core.js (gestao-beleza)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/gestao-beleza/js/app_core.js) — Renderização da Central de Evolução da Beleza.
9. [index.html (admin)](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/admin/index.html) — Catálogo SaaS, geração de licenças e listagem de clientes.
10. [api_licenca_ml.php](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/api_licenca_ml.php) — Ações públicas de ativação, verificação silenciosa e recibo.
11. [api_provisioning.php](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/api_provisioning.php) — Whitelist de sistemas e automação do fluxo de provisionamento no Supabase.
12. [api_admin_users.php](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/api_admin_users.php) — Gerenciamento de cargos, controle de owners e RLS.
13. [admin-hardening.test.mjs](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/tests/admin-hardening.test.mjs) e [admin-saas-central.test.mjs](file:///c:/Users/reina/OneDrive/Desktop/Sistemas%20De%20Gest%C3%A3o/tests/admin-saas-central.test.mjs) — Conjunto de testes de integridade de licenças e segurança.

---

## 4. Matriz Comparativa dos Três Sistemas
Esta tabela sintetiza o estado atual das configurações técnicas e de segurança de licenciamento e do módulo Evolução:

| Item de Controle | Gestão Assistência | Gestão Barbearia | Gestão Beleza |
| :--- | :---: | :---: | :---: |
| **Licença localStorage** | `assistencia_license` | `plena_license` | `plena_license` |
| **E-mail localStorage** | `assistencia_email` | `ml_license_email` | `ml_license_email` |
| **Device ID Local** | `assistencia_device` | `device_id` | `device_id` |
| **Reabre sem licença?** | Sim (Fail-Open se offline) | Sim (Fail-Open se offline) | Sim (Fail-Open se offline) |
| **Recibo confirmado** | `assistencia_receipt_confirmed` | `ml_receipt_confirmed` | `ml_receipt_confirmed` |
| **Módulo Evolução existe?**| Não | Sim (Central de Evolução) | Sim (Central de Evolução) |
| **CTA de upgrade existe?** | Não | Sim (Apenas Toast Visual) | Sim (Apenas Toast Visual) |
| **Integração com admin** | Parcial (Gaps no HTML) | Sim | Sim |
| **Pronto para SaaS?** | **Não** | **Parcial** | **Parcial** |
| **Gaps Críticos** | Ausência do Módulo Evolução; Ausente no catálogo PHP; Renderizadores Admin quebrados; Validação online sem Device ID. | Validação online sem Device ID; Colisão de chaves localStorage com Beleza; CTA de evolução meramente estático. | Validação online sem Device ID; Colisão de chaves localStorage com Barbearia; CTA de evolução meramente estático. |

---

## 5. Fluxo Atual de Licença
O ciclo de vida de uma licença atualmente opera sob a seguinte lógica:

1. **Ativação Inicial (Online obrigatório):**
   - O cliente insere chave, e-mail e gera um `device_id` único local.
   - O frontend envia estes dados para `api_licenca_ml.php?action=activate`.
   - A API localiza a licença (JSON local ou SaaS no Supabase), registra o `device_id` (se ainda vazio ou se rebind do mesmo IP) e atualiza o status para `active`.
   - O frontend salva a chave e e-mail no `localStorage`.
2. **Confirmação de Recibo (Padrão Compra Garantida ML):**
   - O sistema bloqueia a UI até que o usuário confirme o recebimento do produto. Esta ação envia uma requisição `confirm_receipt`, gravando a confirmação na API e salvando o status no `localStorage` do cliente para evitar novos popups.
3. **Uso Recorrente (Offline/Online):**
   - **Offline (Fail-Open):** Se o usuário reabre a aplicação sem internet, o script `lock.js` detecta a chave e o e-mail locais e libera o acesso incondicionalmente.
   - **Online (Verificação Silenciosa):** Se houver internet, `lock.js` dispara uma requisição em background para `api_licenca_ml.php?action=verify` a cada 5 minutos.
     - *Falha detectada:* Se a API responder que a licença está bloqueada (`blocked`) ou expirada (`expired`), o `lock.js` apaga a licença do `localStorage` e redireciona para a tela de bloqueio/ativação.

---

## 6. Estado do Módulo "Evolução"
O Módulo Evolução possui comportamentos heterogêneos entre os sistemas:

- **Barbearia & Beleza:**
  - Possuem a "Central de Evolução" acessível pelo menu lateral, apresentando recursos futuros online (Agenda Online, Backup na Nuvem, Multiusuário, WhatsApp Automático, Página Pública, Relatórios Avançados).
  - O fluxo é apenas **visual/mockado**: ao clicar no CTA "Conhecer recurso", o método `showEvolutionToast()` exibe um alerta genérico na tela indicando que a classificação pertencerá ao plano Premium. Não há gravação de interesse, integração com CRM ou envio de leads para o Admin.
- **Assistência:**
  - **Inexistente:** Não há menu ou view. O arquivo `index.html` possui no rodapé apenas uma barra laranja fixa marcando `"Modo Demonstração (SaaS) - Dados Fictícios Locais"`, sem qualquer link ou menção ao fluxo comercial SaaS.

---

## 7. Estado do Painel Admin
O painel admin (`admin/index.html`) já possui a fundação para lidar com SaaS, porém com sérios acoplamentos e exclusões funcionais:

1. **Catalogação Incompleta de Sistemas:**
   - O catálogo local do admin (`SAAS_CATALOG_FALLBACK`) declara a `gestao-assistencia` como um sistema ativo com seus respectivos módulos e limites de planos.
   - No entanto, os scripts do admin não possuem consistência na leitura deste catálogo. Funções de listagem (como `renderSaasCustomers`, linha 1487), validação de slugs e rotas de acesso possuem estruturas condicionais do tipo:
     `c.system === 'gestao-gastro' ? 'Gestão Gastro' : (c.system === 'gestao-barbearia' ? 'Gestão Barbearia' : 'Gestão Beleza')`
     Isso exclui a Assistência e faz com que clientes desse sistema sejam incorretamente renderizados como "Gestão Beleza" na interface do painel.
2. **Duplicação de Catálogos:**
   - O catálogo de planos e módulos está duplicado entre a constante no frontend do admin (`SAAS_CATALOG_FALLBACK`) e o método `getSaasCatalog()` no arquivo backend `api_provisioning.php`.

---

## 8. Estado das APIs

- **`api_licenca_ml.php` (Licenciamento):**
  - Contém todas as ações essenciais de validação local e SaaS (via Supabase REST API com cURL).
  - A ação `verify` possui suporte para receber `device_id` para fins de auditoria e validação de limites de aparelhos.
- **`api_provisioning.php` (Provisionamento SaaS):**
  - Executa as regras de criação de tenants, vinculação de módulos dinâmicos no Supabase e criação de usuários administradores no Auth do Supabase.
  - **Bug impeditivo:** O método `getSaasCatalog()` (linhas 145-188) **não lista o sistema `gestao-assistencia`**. Consequentemente, a API recusa qualquer solicitação de provisionamento para este sistema, pois a validação de whitelist na linha 682 barra a execução.
- **`api_admin_users.php` (Controle de Usuários):**
  - Excelente maturidade na proteção de RLS, controle de owners do tenant e rotinas de primeiro acesso para forçar alteração de senha de tenants SaaS recém-criados.

---

## 9. Testes Existentes e Lacunas
A suíte de testes (`tests/`) possui excelente cobertura para as regras de negócio do *Gestão Gastro*, mas apresenta grandes lacunas nos outros três sistemas:

- **O que já está coberto:**
  - `admin-hardening.test.mjs` valida que bypasses e chaves de teste comuns (ex: `MASTER123`, `TESTE2026`) não estão presentes nos códigos dos três sistemas.
  - `admin-saas-central.test.mjs` testa se o admin possui os mappers de catálogo mínimos.
  - `backup-and-pwa.test.mjs` valida integridade do Service Worker da Barbearia e Beleza e sanitização de dados.
- **Lacunas Críticas nos Testes:**
  - **Sem testes de colisão:** Nenhum teste valida se os namespaces de `localStorage` são idênticos ou se colidem entre si.
  - **Sem testes de Device Lock no Lock.js:** Não há teste que valide se o `lock.js` está omitindo o `device_id` nas requisições online silenciosas.
  - **Sem testes de catálogo unificado:** Não há testes que comparem a paridade entre o catálogo exposto no admin HTML e o catálogo do provisioning PHP.

---

## 10. Achados Priorizados (Severidade)

### P0 (Bloqueia ativação, segurança ou venda)
*   **P0.1: Validação de Dispositivo Ineficaz (Ignorada no `lock.js`)**
    *   *Descrição:* O `lock.js` dos três sistemas não anexa o `device_id` na verificação silenciosa `verify` periódica de 5 minutos.
    *   *Impacto:* Um cliente pode ativar a licença em um aparelho legítimo e copiar o `localStorage` para múltiplos computadores. Como a chamada de verificação periódica não envia o device, o servidor não detecta a violação do limite de dispositivos.
*   **P0.2: Risco de Colisão no `localStorage` entre Barbearia e Beleza**
    *   *Descrição:* Ambos os sistemas salvam dados comerciais usando as mesmas chaves: `plena_license` e `ml_license_email`.
    *   *Impacto:* Se o mesmo usuário ou integrador acessar ambos os sistemas a partir do mesmo domínio/porta local (como `http://localhost:8000`), a ativação de um removerá a licença ativa do outro.

### P1 (Bloqueia padronização ou evolução SaaS)
*   **P1.1: Ausência de Módulo de Evolução no `gestao-assistencia`**
    *   *Descrição:* Não existe menu, view ou lógica de "Central de Evolução" implementada no sistema de Assistência Técnica.
    *   *Impacto:* Impossibilita o upsell para a versão SaaS nesse produto.
*   **P1.2: Whitelist do Backend Rejeita `gestao-assistencia`**
    *   *Descrição:* O sistema `gestao-assistencia` não está mapeado no catálogo interno de `api_provisioning.php`.
    *   *Impacto:* Tentativas de provisionar o SaaS para este módulo através do painel admin retornarão erro imediato de validação de catálogo.
*   **P1.3: Mapeamentos Quebrados no Painel Admin para Assistência**
    *   *Descrição:* Métodos JavaScript no painel admin forçam strings fixas que reduzem as possibilidades apenas a Gastro, Barbearia e Beleza.
    *   *Impacto:* Logs de auditoria, listagens de clientes e telas de detalhe exibirão metadados incorretos ou quebrados quando o sistema de Assistência estiver sob gestão.

### P2 (Inconsistência funcional ou UX relevante)
*   **P2.1: Central de Evolução Puramente Estática**
    *   *Descrição:* As telas de evolução apenas exibem toasts al clicar nos botões.
    *   *Impacto:* Não há conversão comercial ativa (não há captura de leads de interesse do cliente local para o painel admin).
*   **P2.2: Duplicação de Regras de Catálogo**
    *   *Descrição:* Divergência e redundância de informações de planos/módulos entre `admin/index.html` e `api_provisioning.php`.

---

## 11. Recomendações Arquiteturais (Norte Técnico)
Para viabilizar a evolução comercial de forma limpa, segura e escalável, sugere-se a seguinte estratégia de engenharia nos próximos ciclos:

1. **Prefixação Estrita de chaves de Licenciamento:**
   - Mudar os nomes de variáveis de `localStorage` para incluir o slug de cada sistema como prefixo obrigatório:
     - Barbearia: `barbearia_license`, `barbearia_email`, `barbearia_device`, `barbearia_receipt_confirmed`
     - Beleza: `beleza_license`, `beleza_email`, `beleza_device`, `beleza_receipt_confirmed`
2. **Correção do Envio de Dispositivo no `lock.js`:**
   - Alterar o `lock.js` para recuperar o `device_id` local e enviá-lo nas chamadas `verify` da API PHP (`body: JSON.stringify({ license_key: key, email: email, device_id: deviceId })`).
3. **Módulo Evolução Único / Padronizado:**
   - Criar uma estrutura de "Central de Evolução" unificada para os três sistemas, injetando os cards de forma dinâmica de acordo com o sistema atual.
   - Implementar um disparador de interesse: ao clicar no CTA, o frontend realiza uma chamada discreta à API (`api_licenca_ml.php?action=register_evolution_lead`) enviando a chave e o módulo de interesse. Isso registra o interesse do cliente no banco (local JSON ou Supabase), alertando o admin no painel sobre leads quentes de upgrade.
4. **Unificação do Catálogo de Provisionamento:**
   - Inserir a `gestao-assistencia` no catálogo oficial do `api_provisioning.php`.
   - Ajustar os mappers dinâmicos no `admin/index.html` para lerem os dados do catálogo diretamente da API (`systems_catalog`) em vez de operarem com mapeamentos de strings fixos ou constantes locais obsoletas.

---

## 12. Próximos Passos Sugeridos
1. **Fase 1 (Segurança & Isolamento):** Modificar chaves de `localStorage` de Barbearia/Beleza para evitar colisões e ajustar o payload do `lock.js` para enviar o device ID.
2. **Fase 2 (Padronização do Catálogo):** Integrar a Assistência no catálogo do backend de provisionamento e corrigir os mappers da interface do painel admin.
3. **Fase 3 (Implementação do Módulo Evolução):** Portar o layout da Central de Evolução para o `gestao-assistencia` e evoluir o fluxo estático para uma chamada ativa de captação de lead comercial.
4. **Fase 4 (Testes Adicionais):** Escrever testes que validem o isolamento do localStorage e o payload do `lock.js`.

---

## 13. Comandos Executados e Resultados Principais
Durante a auditoria, foram rodados os seguintes utilitários e varreduras:
*   **Inicialização do Servidor de Homologação:**
    `php -S localhost:8000` (Iniciado com sucesso como tarefa em segundo plano).
*   **Pesquisa de Rotas do Backend PHP:**
    Utilizado `Select-String` para identificar as ações expostas na API de licenças e de provisionamento, validando a falta de mapeamento do módulo de assistência.
*   **Varredura de Menus de Evolução:**
    Confirmado que apenas Barbearia e Beleza possuem a Central de Evolução via pesquisas estruturadas no código-fonte das views HTML.
*   **Varredura de Hardened Keys:**
    Analisado as asserções de segurança dos testes locais para garantir que nenhum resquício de senha bypass ou chaves master inseguras persistem em produção.
