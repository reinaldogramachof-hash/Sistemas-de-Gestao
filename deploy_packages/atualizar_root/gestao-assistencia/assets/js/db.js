
// ==========================================
// CAMADA CORE: BANCO DE DADOS E ESTADO GLOBAL
// ==========================================

const DB_KEY = 'gestao_assistencia_v1';
const defaultDB = {
    orders: [],
    clients: [],
    products: [],
    movements: [],
    transactions: [],
    pdvSales: [],
    settings: {
        companyName: 'Minha Assistência Técnica',
        companyDoc: '',
        companyPhone: '',
        companyAddress: '',
        currency: 'R$',
        theme: 'light',
        autoBackup: true,
        termsAccepted: false,
        termsAcceptedAt: null,
        technicians: []
    },
    cashier: {
        status: 'closed', // 'open' ou 'closed'
        openedAt: null,
        closedAt: null,
        initialAmount: 0,
        balance: 0
    }
};

let db = JSON.parse(JSON.stringify(defaultDB));

// Funções de Persistência
function save() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    updateDataStatus();
}

function loadDB() {
    try {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            db = Object.assign({}, defaultDB, parsed);

            // Garantir arrays
            if (!Array.isArray(db.pdvSales)) db.pdvSales = [];
            if (!Array.isArray(db.transactions)) db.transactions = [];

            // Garantir cashier
            if (!db.cashier) {
                db.cashier = { status: 'closed', openedAt: null, closedAt: null, initialAmount: 0, balance: 0 };
            }

            // Compatibilidade retroativa para O.S antigas sem histórico
            db.orders.forEach(o => {
                if (!o.history) o.history = [];
            });

            // Compatibilidade pdvSales
            db.pdvSales.forEach(s => {
                if (!s.payments) s.payments = [{ method: s.paymentMethod || 'money', amount: s.total }];
            });

            console.log('Banco de dados carregado com sucesso!');
        } else {
            console.log('Criando novo banco de dados vazio.');
            save();
        }
    } catch (e) {
        console.error('Erro ao ler banco de dados. Usando padrão.', e);
        db = JSON.parse(JSON.stringify(defaultDB));
        save();
    }
}

// Funções Utilitárias Globais
function getMovementID() {
    return 'MOV' + Date.now().toString(36).toUpperCase().substr(-6);
}

function getPDVID() {
    return 'PDV' + Date.now().toString(36).toUpperCase().substr(-6);
}

function getID() {
    return 'OS' + Date.now().toString(36).toUpperCase().substr(-6);
}

function getClientID() {
    return 'CL' + Date.now().toString(36).toUpperCase().substr(-6);
}

function getProductID() {
    return 'PR' + Date.now().toString(36).toUpperCase().substr(-6);
}

const statusColors = {
    received: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Recebido' },
    analyzing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Em Análise' },
    waiting_parts: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aguardando Peças' },
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pronto' },
    delivered: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Entregue' }
};

function fmtDate(d) {
    if (!d) return '-';
    const [y, m, date] = d.split('-');
    return `${date}/${m}/${y}`;
}

function fmtMoney(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function sanitizeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function updateDataStatus() {
    console.log(`Dados atualizados: ${db.orders.length} O.S., ${db.clients.length} clientes, ${db.products.length} produtos, ${db.movements.length} movimentações`);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'}`;

    const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    notification.innerHTML = `
        <div class="flex items-center">
            <i data-lucide="${icons[type]}" class="w-5 h-5 mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);
    if(typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// BACKUP E SEGURANÇA DE DADOS
function downloadBackup() {
    const data = JSON.stringify(db, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_assistencia_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup baixado com sucesso!', 'success');
}

function restoreBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const restored = JSON.parse(e.target.result);
            if (!restored.orders || !restored.clients) {
                showNotification('Arquivo de backup inválido!', 'error');
                return;
            }
            if (!confirm('Restaurar backup? Os dados atuais serão substituídos.\n\nEsta ação não pode ser desfeita!')) return;
            db = Object.assign({}, defaultDB, restored);
            save();
            renderDashboard();
            renderOrders();
            renderClients();
            renderInventory();
            renderTransactions();
            showNotification('Backup restaurado com sucesso!', 'success');
        } catch {
            showNotification('Erro ao ler o arquivo de backup!', 'error');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function clearOldOrders() {
    const delivered = db.orders.filter(o => o.status === 'delivered');
    if (delivered.length === 0) {
        showNotification('Nenhuma O.S. entregue encontrada.', 'info');
        return;
    }
    if (!confirm(`Excluir ${delivered.length} ordem(ns) de serviço com status "Entregue"?\n\nEsta ação não pode ser desfeita!`)) return;
    db.orders = db.orders.filter(o => o.status !== 'delivered');
    save();
    renderOrders();
    renderDashboard();
    showNotification(`${delivered.length} O.S. entregues excluídas!`, 'success');
}

function factoryReset() {
    if (!confirm('ATENÇÃO: Isso apagará TODOS os dados do sistema!\n\nTem certeza?')) return;
    if (!confirm('ÚLTIMA CONFIRMAÇÃO: Todos os dados serão perdidos permanentemente.\n\nContinuar?')) return;
    db = JSON.parse(JSON.stringify(defaultDB));
    save();
    renderDashboard();
    renderOrders();
    renderClients();
    renderInventory();
    renderTransactions();
    showNotification('Sistema resetado para os padrões de fábrica.', 'info');
}
