# Homologacao - Gestao Gastro Cantinho da Resenha

Objetivo: publicar um pacote seguro para validar em ambiente real a funcionalidade de acesso da comanda pela rede local.

## Conteudo do pacote

- Frontend compilado em `gestao-gastro/`.
- APIs PHP necessarias no diretorio raiz.
- Arquivos `.htaccess` de roteamento e protecao.
- `env.example` como referencia de configuracao.
- `api_data/.htaccess` para manter a pasta de dados protegida.

## Itens que nao entram no pacote

- `.env` real do servidor.
- `.env.local` do frontend.
- Chaves secretas, service role ou senhas.
- `node_modules`.
- Codigo-fonte `src/`.
- Arquivos reais de banco local, como `database_licenses_secure.json`.

## Como subir no HostGator

1. Extraia o zip localmente.
2. Envie o conteudo da raiz do pacote para `public_html/`.
3. A pasta `gestao-gastro/` do pacote deve ficar em `public_html/gestao-gastro/`.
4. Preserve o `.env` real ja existente no servidor. Se for uma hospedagem nova, crie o `.env` manualmente com base no `env.example`.
5. Preserve os arquivos reais dentro de `api_data/`; o pacote leva apenas a protecao `.htaccess`.

## Rotas para teste

- Sistema do cliente: `https://www.sistemasdegestao.tech/gestao-gastro/cantinhodaresenha`
- Comanda externa: `https://www.sistemasdegestao.tech/gestao-gastro/cantinhodaresenha/comanda`

## Teste da rede local

1. Acesse o sistema do cliente no ambiente publicado.
2. Entre em Configuracoes e localize a area de acesso dos garcons/comanda.
3. Gere o QR Code no modo de rede local.
4. Leia o QR Code com um celular conectado ao mesmo Wi-Fi do computador/dispositivo do restaurante.
5. Confirme que o endereco gerado nao usa `localhost` nem `127.0.0.1`.
6. Faca login como garcom e lance itens em uma mesa.
7. Verifique se o painel principal recebe os itens em tempo real.

## Observacoes

- O modo de rede local depende dos dispositivos estarem na mesma rede Wi-Fi.
- Se o cliente nao tiver rede local confiavel, use o caminho externo publicado.
- A validacao final deve ser feita fora de `localhost`, pois o navegador local mascara o comportamento real do QR Code.
