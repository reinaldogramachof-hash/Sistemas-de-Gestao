# Deploy - Painel Admin e APIs

Objetivo: atualizar o Painel Admin Central e os arquivos raiz necessarios para criar licencas, provisionar clientes e validar o fluxo de liberacao do Gestao Gastro.

## Conteudo do pacote

- `admin/index.html`
- APIs PHP do painel e operacao:
  - `api_admin_auth.php`
  - `api_admin_users.php`
  - `api_licenca_ml.php`
  - `api_mailer.php`
  - `api_notificacoes.php`
  - `api_notificacoes_admin.php`
  - `api_provisioning.php`
  - `api_vendas.php`
- `env_loader.php`
- `.htaccess`
- `env.example`
- `api_data/.htaccess`

## Itens que nao entram no pacote

- `.env` real do servidor.
- Arquivos JSON reais de `api_data/`, incluindo licencas, logs, vendas, cupons e historicos.
- `notifications_data.json` local.
- Arquivos de desenvolvimento, `.git`, `node_modules` ou fontes do frontend.

## Como subir no HostGator

1. Extraia o zip.
2. Envie o conteudo da raiz do pacote para `public_html/`.
3. A pasta `admin/` deve ficar em `public_html/admin/`.
4. Preserve o `.env` real ja existente no servidor.
5. Preserve os arquivos reais dentro de `api_data/`.
6. Se for um servidor novo, crie manualmente o `.env` com base no `env.example` e garanta permissao de escrita na pasta `api_data/`.

## Variaveis obrigatorias para o Admin

- `ADMIN_MASTER_EMAIL`
- `ADMIN_SECRET`
- `MASTER_LICENSE_KEY`
- `BASE_URL`
- `PUBLIC_BASE_URL`
- `ALLOWED_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

As variaveis de Mercado Pago e SMTP podem ficar vazias durante homologacao se o teste nao envolver pagamento ou envio real de e-mail.

## Rotas para validar

- Painel Admin: `https://www.sistemasdegestao.tech/admin/`
- API de licencas: `https://www.sistemasdegestao.tech/api_licenca_ml.php?action=ping`
- Sistema do cliente: `https://www.sistemasdegestao.tech/gestao-gastro/cantinhodaresenha`
- Comanda: `https://www.sistemasdegestao.tech/gestao-gastro/cantinhodaresenha/comanda`

## Fluxo minimo de homologacao

1. Acesse o Painel Admin.
2. Entre com o e-mail definido em `ADMIN_MASTER_EMAIL` e a senha definida em `ADMIN_SECRET`.
3. Crie uma nova licenca para o Gestao Gastro.
4. Defina o cliente, plano, slug publico e e-mail do responsavel.
5. Ative o sistema no caminho publico do cliente.
6. Valide acesso ao dashboard, mesas, PDV, configuracoes e comanda.
7. Em Configuracoes, gere o QR Code da comanda em modo rede local e teste com celular na mesma rede Wi-Fi.

## Cuidado importante

Nao sobrescreva `api_data/database_licenses_secure.json` em producao. Esse arquivo guarda licencas reais. O pacote leva apenas a protecao `.htaccess` da pasta.
