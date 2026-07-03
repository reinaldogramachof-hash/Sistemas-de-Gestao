# Auditoria de Paridade - Fase 1

Este documento apresenta a análise comparativa detalhada entre os aplicativos standalone **Gestão Barbearia** e **Gestão Beleza**, mapeando o núcleo comum do ecossistema, as diferenças de negócio intencionais por nicho, as lacunas técnicas a serem resolvidas e os riscos identificados.

---

## 1. Módulos e Navegação

### Núcleo Comum
- Ambos utilizam um roteamento baseado em abas/views controladas via JavaScript pela função `router(view)` (`gestao-barbearia/js/app_core.js:431` e `gestao-beleza/js/app_core.js:114`).
- Módulos estruturais presentes em ambos: Visão Geral (Dashboard), Agenda, Clientes, Profissionais, Serviços, Financeiro, Relatórios, Estoque, Configurações, Manual de Uso e Central de Evolução.

### Diferença Intencional por Nicho
- **Barbearia:** Possui o módulo de PDV (Ponto de Venda/Balcão) ativo no menu (`gestao-barbearia/index.html:119`), focado em atendimento rápido de balcão e vendas diretas.
- **Beleza:** Navegação otimizada para agendamentos e atendimentos de estética mais longos. O termo para a equipe é "Profissionais" (`gestao-beleza/js/app_core.js:136`) ao invés de "Barbeiros" (`gestao-barbearia/js/app_core.js:455`).

### Lacuna Técnica
- O Beleza não implementa o PDV como uma seção separada ou com a mesma interface otimizada para vendas rápidas que a Barbearia possui em `gestao-barbearia/js/pdv.js`.
- A Barbearia possui uma visualização de notificações dedicada (`gestao-barbearia/index.html:175`), enquanto no Beleza a aba de notificações foi removida do menu lateral principal, restando apenas o Toast de sistema.

### Risco
- A divergência na presença ou ausência de rotas (como `pdv` e `notifications`) pode quebrar o roteador (`router()`) se este for unificado sem tratamento dinâmico de abas inexistentes por nicho.

---

## 2. Estrutura de Dados e LocalStorage

### Núcleo Comum
- Ambos salvam o estado de dados no LocalStorage do navegador serializado em JSON.
- A estrutura de dados básica é idêntica: `appointments`, `team`, `services`, `clients`, `transactions`, `inventory`, `stockMovements` e `settings`.

### Diferença Intencional por Nicho
- **Chave do Banco de Dados (DB_KEY):**
  - Barbearia: `brand_barber_pro_v2` (`gestao-barbearia/js/app_core.js:3`).
  - Beleza: `brand_beauty_pro_v2` (`gestao-beleza/js/app_core.js:6`).
- **Serviços Padrão:**
  - Barbearia pré-cadastra serviços masculinos como "Corte Degradê", "Barba Completa", etc. (`gestao-barbearia/js/app_core.js:18-30`).
  - Beleza pré-cadastra "Corte Feminino", "Escova", "Manicure" (`gestao-beleza/js/app_core.js:60`).

### Lacuna Técnica
- **Divergência de Campos em Tabelas:**
  - *Estoque:* A Barbearia usa `minQuantity` (`gestao-barbearia/js/app_core.js:2541`), enquanto o Beleza usa `minStock` (`gestao-beleza/js/app_core.js:1086`).
  - *Configurações:* A Barbearia armazena parâmetros mais granulares em `settings`, tais como `workDays` (dias úteis detalhados), `agendaInterval` (intervalo de agenda), `businessStart` e `businessEnd`. O Beleza possui um objeto `settings` simplificado (`gestao-beleza/js/app_core.js:65-68`).

### Risco
- Ao realizar upgrades de banco ou sincronizações futuras de dados locais, campos inconsistentes (como `minQuantity` vs `minStock`) podem causar falhas silenciosas na renderização de alertas ou relatórios.

---

## 3. Agenda e Agendamentos

### Núcleo Comum
- Ambos utilizam uma agenda matricial (Horários vs Profissionais) renderizada dinamicamente pela função `renderAgenda()`.
- Ambos contam com proteção contra conflitos de horário na mesma célula de profissional (`submitAppt` e lógica de aviso visual de conflito com ícone `⚠️`).

### Diferença Intencional por Nicho
- **Visual e Cores:**
  - Barbearia usa o azul da marca (`bg-brand-blue`, `text-brand-blue`) e possui configurações extras de funcionamento de final de semana (`workDays`).
  - Beleza usa rosa escuro (`bg-rose-500/10`, `text-rose-300`) e possui um grid fixo de 8:00 às 20:00.

### Lacuna Técnica
- O Beleza não permite parametrizar dinamicamente os horários de início/fim e o intervalo de agendamento (30 min ou 60 min), que na Barbearia são lidos dinamicamente de `db.settings.agendaInterval` (`gestao-barbearia/js/app_core.js:719`).

### Risco
- A rigidez nos horários padrão do Beleza pode limitar o uso do sistema por salões que operam fora da faixa das 8h às 20h.

---

## 4. Clientes

### Núcleo Comum
- Cadastro de clientes contendo: `id`, `name`, `phone`, `email`, `address`, `birth` e `notes`.
- Ambos calculam estatísticas de visitas (atendimentos concluídos) e total gasto acumulado.

### Diferença Intencional por Nicho
- Nenhuma diferença operacional significativa; a estrutura de representação e os cards são idênticos.

### Lacuna Técnica
- Nenhuma lacuna operacional grave; a paridade funcional no módulo de clientes foi totalmente atingida.

### Risco
- Baixo. O fluxo de clientes é puramente local e estruturalmente simples.

---

## 5. Serviços e Profissionais

### Núcleo Comum
- Cadastro de profissionais com controle de percentual de comissão, tipo de contrato (CLT/PJ) e histórico de serviços prestados.
- Preço padrão de serviços associado a IDs de serviços para facilitar o cálculo do PDV e checkout.

### Diferença Intencional por Nicho
- Nomenclatura descritiva nos arquivos HTML ("Barbeiros" na Barbearia vs "Profissionais" no Beleza).

### Lacuna Técnica
- A Barbearia pré-cadastra apenas um administrador ("Administrador (Dono)") sem comissão por padrão (`gestao-barbearia/js/app_core.js:7-15`), enquanto o Beleza inicia com "Profissional Principal" com comissão padrão de 50% (`gestao-beleza/js/app_core.js:59`).

### Risco
- Negligenciar a configuração correta da comissão inicial do profissional principal pode gerar cálculos incorretos de lucro líquido nos primeiros dias de uso.

---

## 6. Financeiro, Transações e Comissões

### Núcleo Comum
- Registro de transações financeiras (`transactions`) contendo tipo (`income`/`expense`), data, valor (`amount`), descrição e associação a agendamento (`apptId`).
- Fluxo de fechamento de caixa diário ("Fechar Caixa") integrado ao saldo do dia.

### Diferença Intencional por Nicho
- Nenhuma. O fluxo financeiro local funciona de forma análoga nos dois sistemas.

### Lacuna Técnica
- **Reparação de Transações sem `proId`:** O Beleza possui uma rotina na inicialização (`gestao-beleza/js/app_core.js:90-98`) para reparar transações órfãs associando o `proId` e `proName` a partir do agendamento vinculado. Essa rotina de integridade não foi encontrada na Barbearia.

### Risco
- Transações importadas de backups antigos na Barbearia podem ficar permanentemente sem referência de profissional, distorcendo o cálculo individual de comissões retroativas.

---

## 7. Relatórios

### Núcleo Comum
- Geração de relatórios por período, com cálculo de Receita Total, Despesas e Lucro Líquido.
- Listagem de "Top Serviços" e "Top Clientes".
- Compartilhamento de resumo financeiro formatado para WhatsApp via link da API do WhatsApp.

### Diferença Intencional por Nicho
- Textos customizados para o compartilhamento ("Gerado via Gestão Beleza" vs "Gerado via Gestão Barbearia").

### Lacuna Técnica
- O gráfico de tendência semanal da Barbearia é gerado dinamicamente com barras em SVG (`gestao-barbearia/js/app_core.js:530-561`), enquanto o Beleza renderiza um gráfico de linha contínua (Path/Polyline) em SVG (`gestao-beleza/js/app_core.js:208-209`).

### Risco
- Diferenças visuais na representação dos gráficos podem causar confusão se o usuário operar ambos os sistemas, embora se enquadre também como decisão estética de nicho.

---

## 8. Controle de Estoque (Inventory & Stock Movements)

### Núcleo Comum
- Cadastro de produtos contendo quantidade atual e quantidade mínima para alerta de baixo estoque.
- Histórico de movimentações de estoque (`stockMovements`) registrando entradas, saídas e perdas.

### Diferença Intencional por Nicho
- Categorias sugeridas no filtro de busca:
  - Barbearia: Cosméticos, Lâminas/Descartáveis, Higiene, Equipamentos, Bebidas.
  - Beleza: Cabelo, Unhas, Maquiagem, Cosméticos, Equipamentos, Outros.

### Lacuna Técnica
- O Beleza possui limiar de estoque mínimo configurado estaticamente com fallback para `5` unidades (`gestao-beleza/js/app_core.js:1086`), enquanto a Barbearia tem fallback para `2` unidades (`gestao-barbearia/js/app_core.js:2550`).

### Risco
- Divergência no comportamento do sistema de alerta de estoque quando o limite não é configurado explicitamente pelo usuário.

---

## 9. Backup e Restauração

### Núcleo Comum
- Backup completo exportado para um arquivo em formato JSON (`.json`) gerado localmente pelo navegador.
- Restauração realizada via upload do arquivo JSON estruturado, sobrescrevendo a base do LocalStorage.

### Diferença Intencional por Nicho
- Nome padrão do arquivo de exportação:
  - Barbearia: `brand_barber_backup.json` (ou gerado dinamicamente pelo app).
  - Beleza: `gestao_beleza_backup.json` (`gestao-beleza/js/app_core.js:1055`).

### Lacuna Técnica
- Nenhuma. O módulo de importação/exportação atinge paridade estrutural completa.

### Risco
- A importação direta do JSON não valida a compatibilidade de chaves específicas de nicho. Se um arquivo da Barbearia for importado no Beleza, ele sobrescreverá o banco local com chaves incompatíveis de serviços, gerando inconsistências no app.

---

## 10. Licença e Ativação (Airlock Security)

### Núcleo Comum
- Ambas as aplicações utilizam a proteção local **Airlock Security** via `lock.js`.
- O login bloqueia a tela caso as chaves `plena_license` e `ml_license_email` não estejam salvas no LocalStorage.

### Diferença Intencional por Nicho
- Estilo visual da tela preta de ativação (Tailwind gradient e ícones: `sparkles` para Beleza e `key` para Barbearia).

### Lacuna Técnica
- O Beleza realiza uma chamada direta de ativação que consome dados locais, mas possui tratativas de bypass simplificadas em comparação com a barbearia standalone, que implementa de forma robusta o fluxo de confirmação de recebimento do Mercado Livre (`confirmReceipt` em `gestao-barbearia/js/app_core.js:270`).

### Risco
- Vulnerabilidades no script de proteção `lock.js` que permitam contornar a validação local por meio da manipulação de variáveis globais ou chaves simples no LocalStorage.

---

## 11. Notificações

### Núcleo Comum
- Emissão de feedback imediato de ações do usuário (ex: "Agendamento concluído").

### Diferença Intencional por Nicho
- O Beleza utiliza um componente customizado de Toast (`showToast` em `gestao-beleza/js/app_core.js:77`), gerando alertas elegantes empilhados no topo direito da tela.
- A Barbearia utiliza a função `showNotification` que utiliza alerts locais em navegadores comuns ou rotinas internas do painel de notificações integrado.

### Lacuna Técnica
- Falta de unificação do contrato visual de notificações. O uso de `showNotification` vs `showToast` fragmenta a base de código do núcleo comum.

### Risco
- Invocação de métodos incorretos de notificação ao copiar e colar códigos entre nichos, resultando em erros de execução (ex: `ReferenceError: showNotification is not defined`).

---

## 12. PWA, Manifest e Service Worker

### Núcleo Comum
- Ambos rodam offline a partir de arquivos declarados para cache local no `sw.js`.
- Registram manifestos válidos para permitir a instalação do PWA no dispositivo.

### Diferença Intencional por Nicho
- Assets de ícones específicos e nomes correspondentes ao nicho.

### Lacuna Técnica / Arquitetural
- **Conflito de Estratégia de Rede:**
  - Barbearia usa *Cache First* agressivo, dependendo de atualizações manuais ou limpeza de cache de versão.
  - Beleza usa *Network First* para navegação (`index.html`) e *Stale While Revalidate* para os demais assets, garantindo atualizações mais suaves em segundo plano.

### Risco
- O *Cache First* agressivo da Barbearia pode prender o usuário em versões antigas do código mesmo após a publicação de correções no servidor principal.

---

## 13. Central de Evolução

### Núcleo Comum
- Exibição de 6 cards de funcionalidades premium indisponíveis na versão standalone offline.
- Ambos invocam o modal explicativo ou exibem aviso customizado via `showEvolutionToast()`.

### Diferença Intencional por Nicho
- Adaptação semântica das descrições dos cards para o mercado de estética (Beleza) e de barbas/cortes masculinos (Barbearia).

### Lacuna Técnica
- Nenhuma. O módulo está totalmente sincronizado visualmente e em comportamento.

### Risco
- Baixo. Central puramente informativa para conversão comercial futura.

---

## 14. Compliance ML (Isolamento de Redes)

### Núcleo Comum
- Remoção completa de dependências de CDNs e fontes externas.
- Utilização estrita dos arquivos em `/assets/libs/tailwindcss.js` e `/assets/libs/lucide.js`.

### Diferença Intencional por Nicho
- Cores de destaque nos estilos inline baseados nos arquivos Tailwind locais configurados individualmente.

### Lacuna Técnica
- Nenhuma. Ambos atingiram 100% de conformidade com as regras de homologação sem CDNs externas.

### Risco
- Falha na atualização das bibliotecas locais de terceiros (`tailwindcss.js` e `lucide.js`) caso surjam incompatibilidades com novas versões do motor de renderização do WebKit/Chromium local dos dispositivos mobile.
