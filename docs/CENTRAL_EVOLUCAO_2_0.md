# Central de Evolução 2.0

## 1. Objetivo
A Central de Evolução deixa de ser apenas uma vitrine estática e passa a atuar como ponte comercial organizada entre o produto vitalício e os planos premium, sem bloquear o uso local.

## 2. Princípios
- Não interromper fluxos do produto vitalício.
- Não esconder recursos já comprados pelo cliente.
- Não simular recurso premium como se estivesse disponível.
- Educar antes de vender.
- Usar mensagens contextuais, curtas e não invasivas.
- Preservar compliance ML e funcionamento offline.

## 3. Status dos Recursos
- **Disponível**: recurso já incluso no plano atual.
  - **Texto do badge:** Disponível
  - **Intenção comercial:** Mostrar valor já entregue e acesso direto.
  - **Comportamento do botão:** Abre o módulo ou funcionalidade.
  - **Mensagem/toast:** Nenhuma.
- **Premium**: recurso disponível apenas no plano mensal.
  - **Texto do badge:** Premium
  - **Intenção comercial:** Despertar interesse e gerar conversão para o plano mensal.
  - **Comportamento do botão:** Exibe toast ou modal explicativo comercial.
  - **Mensagem/toast:** Explica que a funcionalidade pertence ao Premium Online Mensal.
- **Em breve**: recurso planejado, ainda não vendido como ativo.
  - **Texto do badge:** Em breve
  - **Intenção comercial:** Mostrar evolução contínua do sistema.
  - **Comportamento do botão:** Exibe aviso de que a novidade chegará em atualizações futuras.
  - **Mensagem/toast:** Explica que o recurso está em desenvolvimento.
- **Opcional**: recurso que pode existir no Pro Vitalício ou implantação personalizada.
  - **Texto do badge:** Opcional
  - **Intenção comercial:** Ofertar pacotes de melhorias adicionais.
  - **Comportamento do botão:** Exibe informações de upgrade ou contato.
  - **Mensagem/toast:** Informa que requer implantação extra ou upgrade offline.

## 4. Recursos Premium Prioritários
| Recurso | Status recomendado | Plano associado | Mensagem curta | CTA recomendado |
| :--- | :--- | :--- | :--- | :--- |
| Agenda Online para Clientes | Premium | Premium Mensal | "Permita que seus clientes agendem pelo celular 24h por dia." | Conhecer recurso |
| Backup em Nuvem | Premium | Premium Mensal | "Seus dados seguros e sincronizados automaticamente na nuvem." | Quero saber mais |
| Multiusuário | Premium | Premium Mensal | "Acessos individuais com permissões para cada profissional." | Conhecer recurso |
| Múltiplos Dispositivos | Premium | Premium Mensal | "Gerencie seu negócio de qualquer lugar, em qualquer tela." | Quero saber mais |
| Página Pública do Negócio | Premium | Premium Mensal | "Um site profissional integrado para atrair mais clientes." | Conhecer recurso |
| WhatsApp Automático | Premium | Premium Mensal | "Confirmações e lembretes enviados diretamente no WhatsApp." | Quero saber mais |
| E-mail Automático | Premium | Premium Mensal | "Comunicação padronizada para reter seus clientes." | Conhecer recurso |
| Relatórios Avançados Online | Premium | Premium Mensal | "Métricas em tempo real para tomada de decisão estratégica." | Quero saber mais |
| Painel Web | Premium | Premium Mensal | "Visão unificada de múltiplos estabelecimentos via navegador." | Conhecer recurso |

## 5. Regras de UX
- Cards simples, claros e sem promessas exageradas.
- CTA principal: “Conhecer recurso” ou “Quero saber mais”.
- Toast/modal deve explicar que o recurso faz parte da evolução Premium.
- Não usar alert() invasivo quando houver showToast disponível.
- Não abrir links externos automaticamente.
- Não exigir login online no produto vitalício.

## 6. Feature Flags Locais
Estrutura conceitual futura (sem implementar código ainda):
```javascript
const EVOLUTION_FEATURES = {
  onlineAgenda: {
    status: 'premium',
    plan: 'premium_monthly',
    title: 'Agenda Online',
    enabled: false
  }
};
```
Essa estrutura futura deve permitir:
- Renderizar cards por status.
- Trocar texto comercial sem reescrever HTML.
- Preparar o premium sem quebrar o vitalício.
- Adaptar mensagens por nicho.

## 7. Primeiro Bloco Futuro de Implementação
1. Criar contrato de dados dos cards premium.
2. Refatorar a Central de Evolução para renderização baseada em configuração local.
3. Manter os 6 cards atuais visíveis.
4. Adicionar badges de status.
5. Padronizar CTA e showEvolutionToast.
6. Validar Barbearia e Beleza em paridade.
7. Só depois iniciar AgendaService e Agenda Online.

## 8. Critérios de Pronto
- Roadmap aponta a matriz oficial.
- Central 2.0 documentada.
- Nenhum código alterado nesta etapa.
- Próximo bloco técnico pode ser planejado com segurança.
