
// ==========================================
// MÓDULO ROUTES: Gerenciamento da SPA
// ==========================================

function router(view) {
    console.log("Roteando para: " + view);

    // Ocultar todas as views
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hide');
    });

    // Remover estado ativo de todos os links do menu
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active-nav');
    });

    // Mostrar a view solicitada
    const viewEl = document.getElementById('view-' + view);
    if (viewEl) {
        viewEl.classList.remove('hide');
        // Adiciona fade in animation apenas se não tiver
        viewEl.classList.add('fade-in');
        setTimeout(() => viewEl.classList.remove('fade-in'), 400);
    } else {
        console.error('View não encontrada:', view);
        return;
    }

    // Ativar o link correspondente no menu
    const navEl = document.getElementById('nav-' + view);
    if (navEl) {
        navEl.classList.add('active-nav');
    }

    // Fechar sidebar no mobile se estiver aberta
    if (window.innerWidth <= 1024) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.add('hidden');
        }
    }

    // Atualizar título e disparar funções de renderização específicas
    switch (view) {
        case 'dashboard':
            document.getElementById('page-title').textContent = 'Visão Geral';
            if (typeof renderDashboard === 'function') renderDashboard();
            break;
        case 'orders':
            document.getElementById('page-title').textContent = 'Ordens de Serviço';
            if (typeof renderOrders === 'function') renderOrders();
            break;
        case 'clients':
            document.getElementById('page-title').textContent = 'Clientes';
            if (typeof renderClients === 'function') renderClients();
            break;
        case 'inventory':
            document.getElementById('page-title').textContent = 'Estoque';
            if (typeof renderInventory === 'function') renderInventory();
            break;
        case 'pdv':
            document.getElementById('page-title').textContent = 'Frente de Caixa (PDV)';
            if (typeof renderPDVGrid === 'function') renderPDVGrid();
            if (typeof renderPDVSalesHistory === 'function') renderPDVSalesHistory();
            if (typeof updateCashierUI === 'function') updateCashierUI();
            break;
        case 'financial':
            document.getElementById('page-title').textContent = 'Financeiro';
            if (typeof renderTransactions === 'function') renderTransactions();
            break;
        case 'reports':
            document.getElementById('page-title').textContent = 'Relatórios';
            break;
        case 'settings':
            document.getElementById('page-title').textContent = 'Configurações';
            if (typeof loadCompanySettings === 'function') loadCompanySettings();
            if (typeof renderTechniciansList === 'function') renderTechniciansList();
            break;
        case 'evolution':
            document.getElementById('page-title').textContent = 'Central de Evolução';
            if (typeof renderEvolutionCenter === 'function') renderEvolutionCenter();
            break;
        case 'notifications':
            document.getElementById('page-title').textContent = 'Notificações & Atualizações';
            if (typeof renderNotifications === 'function') renderNotifications();
            break;
    }
}

// Relógio global
function startClock() {
    const clockEl = document.getElementById('header-datetime');
    const updateTime = () => {
        if (!clockEl) return;
        const now = new Date();
        const optionsDate = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
        const dateStr = now.toLocaleDateString('pt-BR', optionsDate);
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Formata: Segunda-feira, 13 de março de 2026 • 20:40:00
        clockEl.textContent = `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} • ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// Side-bar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('hidden');
    }
}

// Expor globalmente para os botões do HTML
window.router = router;
window.toggleSidebar = toggleSidebar;
window.startClock = startClock;
