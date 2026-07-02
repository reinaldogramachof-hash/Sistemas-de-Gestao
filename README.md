# Sistemas de Gestão 🏭

> **Repositório Oficial de Engenharia de Produto - Gestão Profissional (ML Factory)**

Este repositório contém o ecossistema de conversão e manutenção dos aplicativos "Vitalícios" (Standalone) destinados à venda em escala no Mercado Livre, juntamente com o servidor centralizado de licenças e notificações.

## 🎯 Missão
Transformar aplicações complexas em produtos digitais **autônomos**, **seguros** e **isolados**, operando sem dependência de infraestrutura externa, otimizados para o modelo de pagamento único (vitalício).

## 📜 As 3 Leis do Mercado Livre (Compliance)

1.  **Lei do White-Label:** O produto entregue **JAMAIS** deve conter links de suporte, logomarcas ou referências externas. O cliente adquire um software completo e independente.
2.  **Lei do Isolamento (No Cross-Over):** A aplicação ML deve conter todas as suas dependências localmente. Caminhos absolutos ou links externos para bibliotecas são proibidos.
3.  **Lei da Ativação Única:** O produto usa o modelo "Lock-Airlock" com validação de licença local via PHP/JSON.

## 📂 Estrutura de Diretórios e Arquivos

```text
/Sistemas-de-Gestao
  ├── Gestão Barbearia/          # App Standalone de Barbearia (HTML/CSS/JS local + lock.js)
  ├── Gestão Beleza/             # App Standalone de Salão de Beleza (HTML/CSS/JS local + lock.js)
  │
  ├── api_admin_auth.php         # API de autenticação do painel administrativo
  ├── api_licenca_ml.php         # API de validação, ativação e expiração de licenças
  ├── api_mailer.php             # Envio de e-mails via SMTP (validação/chaves de licença)
  ├── api_notificacoes.php       # API para consulta de notificações nos aplicativos cliente
  ├── api_notificacoes_admin.php # API para gerenciamento de notificações (painel admin)
  ├── api_vendas.php             # API de cupons, afiliados e registro de transações
  │
  ├── .env                       # Variáveis de ambiente e credenciais (ex: ADMIN_SECRET, MP_ACCESS_TOKEN)
  ├── .htaccess                  # Configuração de segurança Apache (bloqueio do .env e CORS)
  ├── env_loader.php             # Script PHP para carregar o arquivo .env
  ├── index.html                 # Página de status do servidor com gatilhos secretos para admin
  ├── lock.js                    # Guardião de Segurança V12.1 (Molde/Referência)
  ├── notifications_data.json    # Banco de dados (JSON) das notificações registradas
  └── README.md                  # Este documento de referência
```

## 🏗 Arquitetura Técnica dos Apps

*   **Core:** HTML5, Tailwind CSS (Local), Vanilla JavaScript.
*   **Tema:** Premium Dark UI (Consistência total em tabelas, modais e relatórios).
*   **PWA:** Service Worker e Manifesto configurados para instalação offline.
*   **Segurança:** Bloqueio via `lock.js` e sistema de licenças standalone integrado à API central.
*   **Recibos:** Geração de recibos térmicos em duas vias com campos de assinatura.

---
*Engenharia de Produto - 2026*
