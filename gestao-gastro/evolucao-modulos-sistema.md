# Roteiro de Evolução: Módulos do "Sistema"

Este documento detalha as ações funcionais e de experiência de usuário planejadas exclusivamente para os módulos estruturais do Gestão Gastro (Configurações, Suporte, Segurança e Central de Evolução).

Essas melhorias visam reduzir a dependência de suporte técnico, simplificar o *onboarding* (implantação) e garantir rastreabilidade das ações críticas do sistema.

---

## 1. Módulo de Configurações (`Settings.tsx`)

Atualmente, a tela de configurações concentra muitas informações em uma única visão, o que pode sobrecarregar novos usuários.

### Ações de Melhoria:
- [x] **Reorganização Visual (Abas/Pílulas):** Dividir a interface nas seguintes categorias lógicas:
  - **Estabelecimento:** Nome, CNPJ, Endereço, Logo.
  - **Equipe & Acessos:** Perfil do Administrador Principal e Gestão de Colaboradores/Senhas.
  - **Rede Local & QR Code:** Status do IP, porta do servidor, atalhos de detecção e QR Code para garçons.
  - **Mesas e Salão:** Definição da quantidade de mesas e reinicialização.
  - **Impressão:** Configuração de impressoras térmicas e cupons.
  - **Dados e Backups:** Exportação, Importação e Zonas de Perigo.
- [ ] **Assistente de Rede (Troubleshooting):** Ao invés de apenas mostrar o IP, adicionar um botão "Diagnosticar Conexão" que verifica se as portas estão liberadas no firewall do Windows.
- [ ] **Visibilidade de Nuvem vs Local:** Adicionar rótulos visuais nas áreas de dados informando quais ações afetam apenas o dispositivo local e quais afetam a nuvem (Supabase).

---

## 2. Módulo de Suporte (`Support.tsx`)

O objetivo é transformar a tela de suporte, que hoje é estática, em uma ferramenta ativa de diagnóstico para o atendimento.

### Ações de Melhoria:
- [x] **Painel de Saúde do Sistema (Health Check):**
  - Indicador de status da conexão com a internet (Navegador).
  - Indicador de conexão com o banco de dados (Supabase / Modo Local).
  - Status do Service Worker (PWA) e se a aplicação está instalada.
  - Quantidade de requisições pendentes na fila offline (PDV + Comanda Garçom).
- [x] **Diagnóstico Copiável (One-Click):**
  - Botão "Copiar Diagnóstico para o Suporte".
  - Gera um texto amigável e limpo contendo informações vitais da máquina, Tenant ID, versão, fila offline e falhas ativas, ocultando qualquer chave de API, senha ou token.
- [ ] **Links Úteis e Base de Conhecimento:**
  - Adicionar links diretos para vídeos curtos de como usar as principais funções da operação.

---

## 3. Módulo de Segurança (`Security.tsx`)

Este módulo dará ao proprietário/administrador visão total do que acontece de crítico na operação, evitando fraudes e enganos.

### Ações de Melhoria:
- [ ] **Trilha de Auditoria (Logs Críticos):**
  - Registrar cancelamento de pedidos no PDV.
  - Registrar exclusão ou desconto manual forçado.
  - Registrar alteração de status de mesas (ex: forçar liberação de mesa ocupada).
  - Registrar acessos com horários e IPs (se disponível).
- [ ] **Tabela de Auditoria com Filtros:**
  - Criar uma interface para o Administrador buscar logs por data, usuário ou tipo de evento.
- [ ] **Revogação de Dispositivos (Sessões):**
  - Permitir deslogar forçadamente outras sessões ativas caso o garçom perca o celular ou haja troca de equipe.

---

## 4. Módulo Central de Evolução (`EvolutionCenter.tsx`)

Manter o cliente engajado com as atualizações do sistema e coletar feedbacks.

### Ações de Melhoria:
- [ ] **Changelog Visível (O que há de novo):**
  - Consumir de um arquivo JSON estático ou do Supabase as últimas notas de atualização (Release Notes) para o cliente ver o que melhorou na versão atual.
- [ ] **Quadro de Sugestões:**
  - Pequeno formulário onde o cliente pode enviar uma sugestão de melhoria diretamente para a equipe de desenvolvimento.

---

## Ordem de Execução Sugerida

1. **Configurações:** Reorganizar a UI em abas. É rápido, tem alto impacto visual e organiza a casa para novas configurações.
2. **Suporte:** Criar o diagnóstico copiável. Isso facilitará imediatamente o seu dia a dia ao testar os clientes.
3. **Segurança:** Estruturar a trilha de auditoria e exibir na tela de segurança.
4. **Central de Evolução:** Implementar o mural de novidades e formulário de feedback.
