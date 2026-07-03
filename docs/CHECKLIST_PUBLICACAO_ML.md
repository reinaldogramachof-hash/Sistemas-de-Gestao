# Checklist de Publicação - Mercado Livre (ML)

Este checklist descreve os passos operacionais obrigatórios para a homologação, validação e empacotamento de qualquer aplicativo standalone (nicho) deste ecossistema antes da publicação ou entrega.

---

## 1. Compliance Offline e Isolamento de Rede
- [ ] **Sem Dependência de CDNs:** Varra todos os arquivos `.html` buscando referências a URLs externas (`http://` ou `https://`). Nenhuma biblioteca deve ser importada de servidores externos (ex: cdnjs, unpkg, tailwindcss.com, googleapis, fontawesome).
- [ ] **Utilização de Libs Locais:** Certifique-se de que os scripts importados no `<head>` apontam exclusivamente para assets locais:
  - `<script src="assets/libs/tailwindcss.js"></script>`
  - `<script src="assets/libs/lucide.js"></script>`
- [ ] **Localização de Recursos Visuais:** Ícones, fontes e imagens necessárias no carregamento offline devem residir fisicamente no diretório local `/assets/` do projeto.

---

## 2. Validações Técnicas e de Sintaxe
- [ ] **Validação de Sintaxe JS (`node -c`):** Execute a checagem sintática do Node.js em todos os arquivos de script locais para garantir a ausência de bugs básicos:
  ```powershell
  Get-ChildItem -Path "gestao-<nicho>/js" -Filter "*.js" -Recurse | ForEach-Object { node -c $_.FullName }
  ```
- [ ] **Validação de Diferenças no Git (`git diff --check`):** Verifique se não há espaços em branco sobressalentes ou conflitos pendentes na árvore de trabalho:
  ```bash
  git diff --check
  ```
- [ ] **Validação de Lints PHP (Se aplicável na raiz):** Caso existam scripts PHP de licença ou API local:
  ```bash
  php -l *.php
  ```

---

## 3. Configurações de PWA (Instalação e Cache Offline)
- [ ] **Manifesto Válido (`manifest.json`):**
  - O arquivo deve possuir `name`, `short_name`, `start_url` corrigido (`./index.html` ou `./`), `display: "standalone"`, `theme_color` e `background_color`.
  - Deve conter a declaração de ícones locais nos tamanhos de `192x192` e `512x512`.
- [ ] **Configuração do Service Worker (`sw.js`):**
  - O array de URLs a serem cacheadas (`ASSETS_TO_CACHE` ou `urlsToCache`) deve conter todos os arquivos físicos necessários para inicialização offline: `index.html`, `css/styles.css`, `js/app_core.js`, `manifest.json`, `assets/libs/lucide.js`, `assets/libs/tailwindcss.js` e os ícones em `/assets/`.
  - A estratégia de rede deve prever o funcionamento do aplicativo mesmo sem sinal de internet (Ex: *Stale While Revalidate* para assets e bypass explícito ou tratamento offline para requisições de API local).

---

## 4. Fluxos de Negócio Obrigatórios
- [ ] **Licenciamento / Ativação (Airlock):** O sistema deve bloquear a interface se o usuário não possuir chaves de licença registradas. Validar o fluxo de bypass e ativação local através da tela preta de ativação.
- [ ] **Backup e Restauração:** Realizar um teste manual gerando o backup `.json` (download) e restaurando-o em um LocalStorage limpo. Garantir que todas as coleções de agendamentos, clientes e transações sejam importadas com sucesso.
- [ ] **Agenda:** Validar o cadastro de novos agendamentos e confirmar que a lógica de detecção de conflitos de horários em `renderAgenda()` sinaliza colisões com `⚠️`.
- [ ] **Financeiro e Caixa:** Testar o fluxo de fechar caixa, verificar se a gravação de transações (entradas/saídas) deduz ou soma valores do caixa do dia corretamente.
- [ ] **Relatórios:** Verificar se a agregação de dados e o link de compartilhamento de relatórios via WhatsApp são montados com os dados locais corretos.
- [ ] **Central de Evolução:** Certificar-se de que a página exibe todos os 6 cards premium e que a função `showEvolutionToast` dispara um Toast elegante alertando sobre os recursos premium online (sem disparar alertas invasivos `alert()`, a menos que não haja suporte ao Toast nativo).

---

## 5. Empacotamento e Entrega
- [ ] **Ignore de Arquivos Compactados:** O arquivo `.gitignore` na raiz do projeto deve conter a regra `*.zip` para evitar o versionamento indevido de entregáveis temporários:
  ```text
  *.zip
  ```
- [ ] **Empacotamento Limpo:** Ao gerar o entregável em ZIP para distribuição, certifique-se de que a pasta compactada contém apenas a árvore limpa do nicho correspondente e suas pastas internas necessárias (`assets/`, `css/`, `js/`), sem resíduos de logs, caches do sistema ou diretórios de controle de versão (como `.git/`).
