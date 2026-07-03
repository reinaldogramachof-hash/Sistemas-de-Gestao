# Mapa de Núcleo Comum - Sistemas de Gestão Standalone

Este documento estabelece o contrato técnico comum e as especificações replicáveis necessárias para expandir o ecossistema para novos nichos (ex: Gestão Petshop, Gestão Clínicas, etc.), sem reescrever a base lógica principal.

---

## 1. Estrutura Mínima do Banco de Dados Local (`db`)

Qualquer novo nicho standalone deve implementar uma estrutura do LocalStorage contendo obrigatoriamente as seguintes coleções iniciais:

```json
{
  "appointments": [],
  "team": [],
  "services": [],
  "clients": [],
  "transactions": [],
  "inventory": [],
  "stockMovements": [],
  "settings": {
    "businessName": "",
    "businessHours": ""
  }
}
```

### Contratos de Modelo (Schema) Obrigatórios

- **`appointments` (Agendamentos):**
  - `id`: String alfanumérica única (`getID()`).
  - `date`: String formato `YYYY-MM-DD`.
  - `time`: String formato `HH:MM`.
  - `client`: String (Nome do cliente).
  - `proId`: String (ID do profissional associado).
  - `proName`: String (Nome do profissional associado).
  - `serviceId`: String (ID do serviço).
  - `serviceName`: String (Nome do serviço).
  - `price`: Number.
  - `status`: String (`pending` | `done` | `canceled`).
  - `transactionId`: String (Opcional, link com o financeiro).

- **`team` (Profissionais):**
  - `id`: String alfanumérica única.
  - `name`: String.
  - `commission`: Number (Representando percentual, ex: 30 para 30%).
  - `contract`: String (`CLT` | `PJ` | `Parceiro`).
  - `phone`: String.
  - `startDate`: String `YYYY-MM-DD`.

- **`services` (Serviços):**
  - `id`: String.
  - `name`: String.
  - `price`: Number.

- **`transactions` (Financeiro):**
  - `id`: String.
  - `date`: String `YYYY-MM-DD`.
  - `description`: String.
  - `type`: String (`income` | `expense`).
  - `amount`: Number.
  - `category`: String.
  - `commission`: Number (Valor monetário da comissão gerada).
  - `commissionPaid`: Boolean.
  - `apptId`: String (Link para agendamento originador, opcional).

- **`inventory` (Estoque):**
  - `id`: String.
  - `name`: String.
  - `category`: String.
  - `price`: Number.
  - `quantity`: Number.
  - `minStock`: Number (Quantidade mínima para alerta de reposição).

---

## 2. Helpers e Utilitários Obrigatórios

Os utilitários básicos do núcleo lógico de front-end devem ser padronizados nos arquivos `app_core.js`:

- **Geração de IDs Únicos:**
  ```javascript
  const getID = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  ```
- **Formatação de Moeda (Real Brasileiro):**
  ```javascript
  const fmtMoney = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **Sanitização de HTML contra XSS (Segurança):**
  ```javascript
  function sanitizeHTML(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
  }
  ```
- **Helpers de Fuso Horário Local:**
  Evitam distorções de data causadas pela conversão de fuso horário UTC no navegador.
  ```javascript
  const getLocalIsoString = (dateObj = new Date()) => {
      const offset = dateObj.getTimezoneOffset() * 60000;
      return (new Date(dateObj.getTime() - offset)).toISOString().slice(0, -1);
  };
  const getLocalIsoDate = (dateObj = new Date()) => {
      return getLocalIsoString(dateObj).split('T')[0];
  };
  ```

---

## 3. Padrão de Notificações Recomendado

Para eliminar a divergência entre `showNotification` (Barbearia) e `showToast` (Beleza), o mapa de núcleo comum estabelece a padronização do método **`showToast`** nativo.

### Especificação do Componente Global de Notificação:
1. Deve existir um container de toasts no arquivo `index.html`:
   ```html
   <div id="toast-container" class="fixed top-4 right-4 z-[100] space-y-3 flex flex-col items-end pointer-events-none"></div>
   ```
2. A função no `app_core.js` deve gerenciar os estados visualmente e renderizar ícones dinamicamente usando Lucide:
   ```javascript
   function showToast(msg, type = 'success') {
       const container = document.getElementById('toast-container');
       if (!container) {
           alert(msg); // Fallback secundário
           return;
       }
       const el = document.createElement('div');
       const colors = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-blue-500';
       const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
       el.className = `toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-2xl ${colors} min-w-[300px] backdrop-blur-md z-50`;
       el.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i><span class="font-bold text-sm">${msg}</span>`;
       container.appendChild(el);
       if (typeof lucide !== 'undefined') lucide.createIcons();
       setTimeout(() => {
           el.style.opacity = '0';
           el.style.transform = 'translateY(-10px)';
           setTimeout(() => el.remove(), 300);
       }, 3000);
   }
   ```

---

## 4. Padrão de Service Worker Recomendado

Recomenda-se a adoção da estratégia **Network First para navegação (HTML)** e **Stale While Revalidate para assets locais**, minimizando problemas de cache preso (Locking) em atualizações críticas.

### Estrutura do `sw.js` Core:
```javascript
const CACHE_NAME = 'app-cache-v1';
const ASSETS_TO_CACHE = [
    './index.html',
    './css/styles.css',
    './js/app_core.js',
    './manifest.json',
    './assets/libs/lucide.js',
    './assets/libs/tailwindcss.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match('./index.html'))
        );
        return;
    }
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, networkResponse.clone());
                });
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});
```

---

## 5. Elementos Configuráveis por Nicho

Ao iniciar um novo nicho do zero, os desenvolvedores devem customizar e parametrizar exclusivamente:

1. **`DB_KEY` no `app_core.js`:** A chave de prefixo no LocalStorage deve ser exclusiva do nicho (ex: `brand_pet_pro_v1`).
2. **Serviços Padrão (`services`):** Pré-cadastrar os serviços ideais para o nicho no `defaultDB`.
3. **Cores do Manifesto (`manifest.json`):** Cores de fundo e do tema coerentes com a marca do nicho.
4. **Paleta do Tailwind (`tailwind_config.js`):** Ajustar variáveis de layout e estilos visuais do tema sem mexer na estrutura lógica.
5. **Semântica HTML no `index.html`:** Traduzir termos (ex: "Profissionais" no Beleza, "Barbeiros" na Barbearia, "Veterinários" no Petshop).

---

## 6. O que NÃO deve ser Copiado Cegamente

- **Lógicas de Agendamento Rígidas:** Nichos que lidam com tempo de atendimento variável (como petshops com banho e tosa grandes ou clínicas médicas com exames demorados) não se adaptam bem ao grid fixo de 30 ou 60 minutos do salão/barbearia. A escala da agenda precisa ser parametrizável.
- **Estruturas de Backup Cruzadas:** O método `restoreBackup` precisa verificar a compatibilidade do JSON de entrada. Copiar cegamente a restauração de dados sem validar o nicho do arquivo original pode corromper o banco local do usuário se ele tentar importar o backup de uma Barbearia em um app de Beleza.
