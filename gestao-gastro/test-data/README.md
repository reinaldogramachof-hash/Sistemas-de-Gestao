# Pacote local — Plena Gestão Gastro Teste

`gastro-teste-plena-local-mock.json` é um backup fictício para validar PDV,
mesas, comanda, caixa, estoque, financeiro e cardápio no navegador local.

## Importação segura

1. Entre exclusivamente na rota/tenant `gastro-teste`.
2. Em **Configurações > Dados & Backup**, faça primeiro um backup local do
   navegador de homologação.
3. Em **Importação Legada**, selecione o JSON deste diretório e confirme.
4. Ao concluir, a aplicação ativa automaticamente o **modo homologação local**.
   Recarregue a página e valide as mesas 3 e 7 (ocupadas), o caixa aberto e o
   pedido fechado no histórico.

O arquivo não possui credenciais, dados pessoais reais, licença, tokens nem
identificadores do Cantinho da Resenha. A importação usa somente o estado local
do navegador: pausa Realtime e bloqueia escrita remota para esse tenant neste
navegador. Não deve ser usada em Cantinho nem para popular Supabase.
