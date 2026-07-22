// ==========================================
// MÓDULO PRINCIPAL DE INICIALIZAÇÃO E BOOTLOADER
// ==========================================

// Inicialização e Event Listeners Universais
function init() {
    console.log("Sistema Mestre Iniciado - Padrão Ouro Modular");
    if(typeof lucide !== 'undefined') lucide.createIcons();

    const today = new Date().toISOString().split('T')[0];
    const orderDateInput = document.getElementById('order-date');
    if (orderDateInput) orderDateInput.value = today;

    const receiptDateInput = document.getElementById('receipt-date');
    if(receiptDateInput) receiptDateInput.value = today;

    // Carregar configurações da Empresa Padrão (Fallback)
    const settings = db.settings || {};
    const companyName = settings.companyName || 'Minha Assistência Técnica';
    document.querySelectorAll('.company-name-display').forEach(el => el.textContent = companyName);
    const theme = settings.theme || 'light';
    if(theme === 'dark') document.documentElement.classList.add('dark');

    // Inicializar visualizações primárias
    renderDashboard();
    renderOrders();
    renderClients();
    renderInventory();
    renderTransactions();
    if (typeof renderPDVGrid === 'function') renderPDVGrid();
    if (typeof updateCashierUI === 'function') updateCashierUI();

    startClock();

    // Auto-save e Backup Silencioso A cada 5 minutos
    setInterval(() => {
        save();
        if(db.settings.autoBackup) {
            console.log('Autosave concluído silenciosamente.');
        }
    }, 5 * 60 * 1000);

    // Setup Event Listeners globais (Buscas e Filtros)
    setupEventListeners();
}

function setupEventListeners() {
    const el = document.getElementById.bind(document);

    // Ordens
    if(el('order-search')) el('order-search').addEventListener('input', renderOrders);
    if(el('order-status-filter')) el('order-status-filter').addEventListener('change', renderOrders);
    if(el('order-date-filter')) el('order-date-filter').addEventListener('change', renderOrders);

    // Configurações do Produto O.S
    if(el('part-select')) el('part-select').addEventListener('change', function() { updatePartPrice(this); });
    if(el('part-qty')) el('part-qty').addEventListener('input', calcPartTotal);
    if(el('part-price')) el('part-price').addEventListener('input', calcPartTotal);

    // Clientes
    if(el('client-search')) el('client-search').addEventListener('input', renderClients);

    // Estoque
    if(el('inventory-search')) el('inventory-search').addEventListener('input', renderInventory);

    // PDV / Frente de Caixa
    if(el('pdv-search')) el('pdv-search').addEventListener('input', renderPDVGrid);
    if(el('pdv-amount-received')) el('pdv-amount-received').addEventListener('input', calculateChange);

    // Transações
    if(el('transaction-search')) el('transaction-search').addEventListener('input', renderTransactions);
    if(el('transaction-month')) el('transaction-month').addEventListener('change', renderTransactions);

    // Modal clicks outside (fechar clicando no fundo escuro)
    window.addEventListener('click', function(e) {
        if(e.target.classList.contains('fixed') && !e.target.classList.contains('modal-content')) {
             if(e.target.id && e.target.id.endsWith('-modal')) {
                  e.target.classList.add('hidden');
             }
        }
    });
}

// Inicializa a SPA quando The Document Content for Loaded
document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega o Banco de Dados primeiro
    loadDB();

    // 2. Inicializa Variáveis Globais de Componentes
    if(typeof currentOSParts !== 'undefined') currentOSParts = [];
    if(typeof currentOSId !== 'undefined') currentOSId = null;
    if(typeof cart !== 'undefined') cart = [];
    if(typeof pdvPayments !== 'undefined') pdvPayments = [{ method: 'money', amount: 0 }];

    // 3. Verifica licença de Airlock e Inicia
    if(typeof checkAirlock === 'function') {
        checkAirlock().then(isValid => {
            if(isValid) {
                init();
                router('dashboard'); // Start View
            }
        });
    } else {
        init();
        router('dashboard');
    }
});

// ==========================================
// CONFIGURAÇÕES DA EMPRESA
// ==========================================
function loadCompanySettings() {
    const s = db.settings;
    if(document.getElementById('company-name')) document.getElementById('company-name').value = s.companyName || '';
    if(document.getElementById('company-doc')) document.getElementById('company-doc').value = s.companyDoc || '';
    if(document.getElementById('company-phone')) document.getElementById('company-phone').value = s.companyPhone || '';
    if(document.getElementById('company-address')) document.getElementById('company-address').value = s.companyAddress || '';
    if(document.getElementById('company-warranty')) document.getElementById('company-warranty').value = s.warrantyTerms || '';
}

function saveCompanySettings() {
    if(!db.settings) db.settings = {};
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

    db.settings.companyName = getVal('company-name');
    db.settings.companyDoc = getVal('company-doc');
    db.settings.companyPhone = getVal('company-phone');
    db.settings.companyAddress = getVal('company-address');
    db.settings.warrantyTerms = getVal('company-warranty');

    save();

    document.querySelectorAll('.company-name-display').forEach(el => el.textContent = db.settings.companyName || 'Minha Assistência Técnica');
    showNotification('Configurações da empresa salvas com sucesso!', 'success');
}

// ==========================================
// GERENCIAMENTO DE TÉCNICOS
// ==========================================
function renderTechniciansList() {
    const list = document.getElementById('technicians-list');
    if (!list) return;

    const techs = db.settings.technicians || [];
    if (techs.length === 0) {
        list.innerHTML = '<p class="text-gray-400 text-xs italic p-2">Nenhum técnico cadastrado.</p>';
        return;
    }

    list.innerHTML = techs.map((t, index) => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 group">
            <div class="flex items-center">
                <i data-lucide="user" class="w-3 h-3 mr-2 text-gray-400"></i>
                <span class="text-sm text-gray-700">${sanitizeHTML(t)}</span>
            </div>
            <button onclick="removeTechnician(${index})" class="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
        </div>
    `).join('');

    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function addTechnician() {
    const input = document.getElementById('new-tech-name');
    if (!input) return;

    const name = input.value.trim();
    if (!name) {
        showNotification('Digite o nome do técnico.', 'warning');
        return;
    }

    if (!db.settings.technicians) db.settings.technicians = [];

    // Evitar duplicados
    if (db.settings.technicians.includes(name)) {
        showNotification('Este técnico já está cadastrado.', 'warning');
        return;
    }

    db.settings.technicians.push(name);
    save();
    input.value = '';
    renderTechniciansList();

    // Atualiza selects de técnicos em outros locais se necessário
    if (typeof populateTechnicianSelect === 'function') populateTechnicianSelect();

    showNotification('Técnico adicionado com sucesso!', 'success');
}

function removeTechnician(index) {
    if (!confirm('Excluir este técnico?')) return;

    db.settings.technicians.splice(index, 1);
    save();
    renderTechniciansList();

    if (typeof populateTechnicianSelect === 'function') populateTechnicianSelect();

    showNotification('Técnico removido.', 'info');
}
// ==========================================
// PWA - SERVICE WORKER & INSTALLATION
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado!', reg))
            .catch(err => console.log('Falha ao registrar SW', err));
    });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('flex');
    }
});

async function installPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuário escolheu: ${outcome}`);
    deferredPrompt = null;
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) installBtn.classList.add('hidden');
}
