# Relatório Informativo — Status cPanel e Briefing para Deploy do Gestão Gastro

Data da leitura: 13/07/2026
Destino: Arquiteto Codex integrado à IDE de desenvolvimento
Escopo: leitura do Gerenciador de Arquivos cPanel e orientação para montar o ZIP final de deploy

## 1. Objetivo

Este documento registra o estado observado no cPanel da HostGator e define os limites para o próximo pacote de deploy. O objetivo é publicar o Gestão Gastro sem interromper os sistemas já utilizados pelos clientes da Barbearia.

Nenhuma alteração foi feita no cPanel nesta leitura.

## 2. Evidência do cPanel

### 2.1 Local observado

- Painel: cPanel File Manager v3
- Caminho visível: `/home2/hg2fbe99/sistemasdegestao.tech`
- Domínio relacionado: `sistemasdegestao.tech`
- O diretório `public_html` existe como pasta irmã no home, mas a pasta selecionada no Gerenciador é `sistemasdegestao.tech`.
- A confirmação definitiva do document root deve ser feita em cPanel > Domains, mas a estrutura observada é compatível com o 404 das rotas Gastro.

### 2.2 Sistemas encontrados

Foram observadas 27 pastas com prefixo `gestao-`, incluindo:

- `gestao-barbearia`
- `gestao-beleza`
- `gestao-pdv`
- `gestao-pizzaria`
- `gestao-hamburgueria`
- `gestao-odonto`
- `gestao-financas`
- `gestao-estoque`
- demais sistemas listados no Gerenciador

**Não foi observada a pasta `gestao-gastro`.**

Essa ausência é compatível com o teste anterior, no qual `/gestao-gastro/` e `/gestao-gastro/cantinhodaresenha/comanda` retornaram HTTP 404.

### 2.3 Arquivos relevantes observados

Na raiz do domínio foram observados:

- `.htaccess` — 0644
- `.env` — 0644
- `index.html` — 0644
- `error_log` — 0644
- `notifications_data.json` — 0644
- `api_licenca_ml.php` — 0666
- `api_vendas.php` — 0666
- `api_notificacoes.php` — 0644
- `api_notificacoes_admin.php` — 0644
- `api_data.zip` — 0644
- `assets.zip` — 0644
- `deploy.zip` — 0644

### 2.4 Permissões e riscos

As pastas de sistemas, incluindo `gestao-barbearia`, aparecem com permissão `0777`. Também existem arquivos PHP com permissão `0666`.

Isso não prova, sozinho, que os arquivos estejam acessíveis para escrita pela internet, mas é uma configuração permissiva e deve ser tratada como risco de segurança e de integridade do deploy.

O `.env` aparece no Gerenciador com 0644. O servidor deve bloquear acesso HTTP a arquivos `.env`, e a validação deve incluir uma tentativa segura de acesso que confirme `403` ou resposta equivalente sem revelar conteúdo.

Arquivos ZIP, logs, JSON operacionais e APIs na raiz também devem ser revisados para evitar exposição pública desnecessária.

## 3. Estado do checkout local

O checkout possui alterações locais ainda não integradas ao servidor. Entre elas:

### 3.1 Gastro

- `gestao-gastro/src/App.tsx`
- `gestao-gastro/src/components/ComandaMobileApp.tsx`
- `gestao-gastro/src/components/Dashboard.tsx`
- `gestao-gastro/src/components/Settings.tsx`
- `gestao-gastro/src/config/modulesConfig.ts`
- `gestao-gastro/src/hooks/useModules.ts`
- `gestao-gastro/src/utils/**`
- `gestao-gastro/vite.config.ts`
- `gestao-gastro/public/.htaccess`
- documentação de cliente e relatório QA

### 3.2 Infraestrutura compartilhada

- `.htaccess`
- `api_licenca_ml.php`
- `api_notificacoes_admin.php`
- `api_provisioning.php`
- `env.example`
- alterações no `admin`, `admin-vendas` e documentação geral

Esses arquivos não devem ser misturados automaticamente no ZIP do Gastro. Cada alteração compartilhada exige revisão separada e teste de regressão.

### 3.3 Barbearia — área protegida

O checkout possui alterações locais em:

- `gestao-barbearia/index.html`
- `gestao-barbearia/js/app_core.js`

Esses arquivos devem ficar fora do ZIP do Gastro. Os dois clientes ativos precisam continuar usando exatamente a instalação atual até existir um pacote e uma homologação específicos para Barbearia.

## 4. O que o ZIP final do Gastro deve conter

Para publicação pelo cPanel, o pacote final deve ser um artefato estático, não um espelho do repositório.

### Incluir

1. `gestao-gastro/` contendo o conteúdo de `gestao-gastro/dist/`:
   - `index.html`
   - `assets/**`
   - `manifest.webmanifest`
   - `registerSW.js`
   - `sw.js`
   - `workbox-*.js`
   - `pwa-512x512.png`
   - `.htaccess`
2. Um manifesto de versão e checksum.
3. Um arquivo separado com o bloco a ser mesclado no `.htaccess` raiz.
4. Instruções de rollback.

### Não incluir

- `.env`, `.env.local` ou qualquer segredo
- `node_modules`
- código-fonte TypeScript/React, salvo se o Arquiteto decidir entregar também um pacote-fonte separado
- `gestao-barbearia/**`
- `admin/**` e `admin-vendas/**`
- APIs compartilhadas sem aprovação individual
- `supabase/**` ou migrations de banco junto com o frontend
- testes, relatórios internos e arquivos temporários
- ZIPs antigos, logs e backups do servidor

## 5. Bloqueio técnico do pacote atual

O build local foi gerado com `VITE_SUPABASE_ANON_KEY` placeholder em `gestao-gastro/.env.local`.

Portanto, o ZIP atual é candidato para homologação estrutural, mas não deve ser considerado pronto para operação online do Cantinho da Resenha. Antes do pacote final:

1. configurar a chave anon pública real no ambiente de build;
2. confirmar `VITE_SUPABASE_URL` e `VITE_GASTRO_TENANT_ID`;
3. regenerar `dist`;
4. executar build, lint e testes;
5. verificar que nenhum segredo foi parar no ZIP;
6. validar login, mesas, cardápio, pedido, mesa ocupada, offline e sincronização.

## 6. Estratégia de atualização sem interromper Barbearia

### Primeira publicação do Gastro

Como a pasta `gestao-gastro` ainda não existe no document root observado, a primeira implantação pode ser isolada:

1. Fazer backup da pasta `sistemasdegestao.tech` ou, no mínimo, de `.htaccess`, `index.html` e `gestao-barbearia`.
2. Confirmar em cPanel Domains o document root do domínio.
3. Enviar o ZIP e extrair somente a pasta `gestao-gastro` nesse document root.
4. Mesclar o bloco Gastro no `.htaccess` atual; não substituir o arquivo inteiro.
5. Testar imediatamente a raiz e uma URL real de cada cliente Barbearia.
6. Testar `/gestao-gastro/` e `/gestao-gastro/cantinhodaresenha/comanda`.

### Atualizações posteriores do Gastro

1. Preparar uma pasta temporária fora de `gestao-gastro`.
2. Fazer upload dos assets com nomes hash primeiro.
3. Substituir `index.html` por último.
4. Preservar o `.htaccess` já validado.
5. Manter uma cópia da versão anterior para rollback.

Essa estratégia reduz a janela de inconsistência de assets e não toca na pasta `gestao-barbearia`.

## 7. Critérios de aceite para o próximo DOC/ZIP

O Arquiteto Codex da IDE deve entregar:

- lista fechada de arquivos incluídos no ZIP;
- lista fechada de arquivos excluídos e motivo;
- confirmação de que `gestao-barbearia` não foi alterado pelo pacote;
- confirmação de que `.env` e credenciais não foram incluídos;
- confirmação do document root do domínio;
- instrução de mesclagem do `.htaccess`, sem substituição cega;
- checksum do ZIP;
- roteiro de smoke test antes e depois do deploy;
- rollback específico para o Gastro;
- declaração explícita sobre o estado da chave Supabase e da homologação online.

## 8. Referências do workspace

- Pacote candidato atual: `deploy-gestao-gastro-2026-07-13.zip`
- Manifesto do pacote: `deploy-gestao-gastro/MANIFESTO_ALTERACOES.txt`
- Instruções do pacote: `deploy-gestao-gastro/DEPLOY_README.md`
- Relatório QA do garçom mobile: `gestao-gastro/docs/RELATORIO_QA_GARCOM_MOBILE_CANTINHO_2026-07-13.md`

## 9. Conclusão

O 404 do Gastro é explicado, com alta probabilidade, pela inexistência da pasta `gestao-gastro` no diretório publicado observado. A publicação deve ser feita como módulo isolado, com mesclagem controlada do `.htaccess`, mantendo `gestao-barbearia` intacto. O próximo ZIP final só deve ser liberado após corrigir a configuração Supabase do build e concluir a validação online.
