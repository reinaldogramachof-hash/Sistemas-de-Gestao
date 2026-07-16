# Acesso Master do Painel Admin

O acesso master e exclusivo do Painel Admin Central (`/admin/`). Ele nao deve ser usado como licenca, senha de cliente, credencial de garcom ou segredo de Supabase.

## Configuracao obrigatoria

Configure as duas variaveis no arquivo `.env` da raiz do projeto, tanto localmente quanto no document root do servidor:

```dotenv
ADMIN_MASTER_EMAIL=seu-email@dominio.com
ADMIN_SECRET=sua-senha-secreta
MASTER_LICENSE_KEY=PLENA-MASTER-COLOQUEUMA_CHAVE_UNICA
```

O `.env` nunca deve ser enviado ao Git, incluido em pacotes de deploy ou servido publicamente.

## Validacao apos o deploy

1. Confirme que o `.env` do servidor esta na raiz, ao lado de `api_admin_auth.php`.
2. Abra `/admin/` em uma janela anonima para evitar token de sessao antigo.
3. Entre com o e-mail master configurado e a senha definida em `ADMIN_SECRET`.
4. Confirme que uma combinacao com e-mail incorreto e recusada.
5. Confirme que uma combinacao com senha incorreta e recusada.

O token de sessao continua valido apenas para o dia corrente e e guardado no `sessionStorage` do navegador.

## Licenca master interna

A licenca master libera os sistemas atuais sem criar uma nova licenca pelo painel a cada teste. Ela e vinculada ao e-mail master, nao expira e nao fica vinculada a um dispositivo.

Para manter a mesma chave local e publicada, configure o mesmo `MASTER_LICENSE_KEY` no `.env` dos dois ambientes e execute uma unica vez em cada ambiente:

```powershell
php scripts/create_master_license.php
```

O script so pode ser executado pela linha de comando. Ele cria ou reutiliza a licenca do e-mail configurado, sem expor uma rota publica de emissao.

No Gestao Gastro, a licenca master libera a tela de ativacao e o plano interno de testes. Ela nao substitui o Supabase Auth, os vinculos `tenant_members` ou as permissoes reais de administrador, caixa e garcom.
