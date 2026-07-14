
// ESTADO GLOBAL
const DB_KEY = 'brand_barber_pro_v2';
const defaultDB = {
    appointments: [],
    team: [
        {
            id: 'adm',
            name: 'Administrador (Dono)',
            commission: 0,
            contract: 'CLT',
            phone: '',
            startDate: '',
            notes: 'Acesso total'
        }
    ],
    services: [
        { id: 's1', name: 'Corte Degradê', price: 40.00 },
        { id: 's2', name: 'Corte Social', price: 35.00 },
        { id: 's3', name: 'Barba Completa', price: 30.00 },
        { id: 's4', name: 'Combo Corte + Barba', price: 60.00 },
        { id: 's5', name: 'Pezinho / Acabamento', price: 15.00 },
        { id: 's6', name: 'Sobrancelha', price: 20.00 },
        { id: 's7', name: 'Platinado / Nevou', price: 120.00 },
        { id: 's8', name: 'Relaxamento', price: 80.00 },
        { id: 's9', name: 'Hidratação Capilar', price: 45.00 },
        { id: 's10', name: 'Luzes Masculinas', price: 150.00 },
        { id: 's11', name: 'Coloração', price: 70.00 },
        { id: 's12', name: 'Corte Infantil', price: 30.00 },
        { id: 's13', name: 'Tratamento para Barba', price: 50.00 }
    ],
    clients: [],
    transactions: [],
    settings: {
        businessName: '',
        businessHours: '09:00 às 19:00',
        businessStart: 8,
        businessEnd: 20,
        agendaInterval: 60,
        workDays: {
            saturday: { active: true, start: 9, end: 18 },
            sunday: { active: false, start: 9, end: 14 }
        },
        theme: 'blue',
        termsAccepted: false,
        termsAcceptedAt: null
    },
    tutorial: {
        completedSteps: [],
        checklistState: {}
    },
    inventory: [],
    stockMovements: []
};
let db = JSON.parse(localStorage.getItem(DB_KEY)) || defaultDB;
// Migração: garantir que campos novos existam em bancos antigos
if (!db.inventory) db.inventory = [];
if (!db.stockMovements) db.stockMovements = [];
if (db.settings.productCommission === undefined) db.settings.productCommission = 0;
// UTILITÁRIOS
const sanitizeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};
const save = () => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    updateDataStatus();
};
const fmtMoney = (v) => {
    return v.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};
const fmtDate = (d) => {
    if (!d) return '--/--/--';
    // Se for string YYYY-MM-DD, formata preservando o dia exato (sem sofrer fuso horário)
    if (typeof d === 'string' && d.includes('-')) {
        const [y, m, day] = d.split('-');
        if (y.length === 4) return `${day}/${m}/${y}`;
    }
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR');
};
const fmtDateInput = (d) => {
    return getLocalIsoDate(new Date(d));
};
const getID = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Utils: Local Timezone Helpers
const getLocalIsoString = (dateObj = new Date()) => {
    const offset = dateObj.getTimezoneOffset() * 60000;
    return (new Date(dateObj.getTime() - offset)).toISOString().slice(0, -1);
};
const getLocalIsoDate = (dateObj = new Date()) => {
    return getLocalIsoString(dateObj).split('T')[0];
};
const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return new Date(y, m - 1, d);
};
const compareIsoDate = (a, b) => {
    if (!a || !b) return 0;
    return a.localeCompare(b);
};
const isDateInRange = (dateStr, startStr, endStr) => {
    if (!dateStr) return false;
    const s = startStr || '0000-00-00';
    const e = endStr || '9999-12-31';
    return dateStr >= s && dateStr <= e;
};
const isSameLocalMonth = (dateStr, referenceDate = new Date()) => {
    if (!dateStr) return false;
    const refY = referenceDate.getFullYear();
    const refM = String(referenceDate.getMonth() + 1).padStart(2, '0');
    return dateStr.startsWith(`${refY}-${refM}`);
};
const isAppointmentDone = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'done' || s === 'concluido' || s === 'concluído';
};
const calculatePercentage = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
};
function updateDateDisplay() {
    const update = () => {
        const now = new Date();
        const optsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const dateStr = now.toLocaleDateString('pt-BR', optsDate);
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const el = document.getElementById('current-date');
        if (el) el.textContent = `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} • ${timeStr}`;
    };
    update(); // Initial call
    setInterval(update, 1000); // Update every second
}
// INICIALIZAÇÃO
async function init() {
    try {
        lucide.createIcons();
        updateDateDisplay();

        // Configurar datas padrão
        const today = getLocalIsoDate();
        const nowObj = new Date();
        const firstDayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-01`;

        // Configurar inputs de data
        const dateIds = ['ap-date', 'agenda-date', 'exp-date', 'rep-start', 'rep-end', 'filter-start', 'filter-end'];
        dateIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id.includes('start')) el.value = firstDayStr;
                else el.value = today;
            }
        });

        // Configurar business info
        if (document.getElementById('biz-name')) document.getElementById('biz-name').value = db.settings.businessName || '';
        if (document.getElementById('biz-owner')) document.getElementById('biz-owner').value = db.settings.businessOwner || '';
        if (document.getElementById('biz-doc')) document.getElementById('biz-doc').value = db.settings.businessDoc || '';
        if (document.getElementById('biz-hours')) document.getElementById('biz-hours').value = db.settings.businessHours || '';
        if (document.getElementById('biz-prod-comm')) document.getElementById('biz-prod-comm').value = db.settings.productCommission || 0;

        // Novos campos de agenda
        if (document.getElementById('agenda-interval')) document.getElementById('agenda-interval').value = db.settings.agendaInterval || 60;
        if (document.getElementById('hour-start-week')) document.getElementById('hour-start-week').value = db.settings.businessStart || 8;
        if (document.getElementById('hour-end-week')) document.getElementById('hour-end-week').value = db.settings.businessEnd || 20;

        if (db.settings.workDays) {
            const sat = db.settings.workDays.saturday;
            const sun = db.settings.workDays.sunday;

            if (document.getElementById('closed-sat')) {
                document.getElementById('closed-sat').checked = !sat.active;
                document.getElementById('hour-start-sat').value = sat.start;
                document.getElementById('hour-end-sat').value = sat.end;
                toggleDayInput('sat');
            }
            if (document.getElementById('closed-sun')) {
                document.getElementById('closed-sun').checked = !sun.active;
                document.getElementById('hour-start-sun').value = sun.start;
                document.getElementById('hour-end-sun').value = sun.end;
                toggleDayInput('sun');
            }
        }

        // Renderizar dados iniciais
        renderDashboard();
        updateDataStatus();
        updateClientsDatalist();
        if (typeof updateTermsVisuals === 'function') updateTermsVisuals();

        // Configurar periodicidade para salvar
        setInterval(save, 30000); // Salva a cada 30 segundos

        // Inicializar visual
        router('dashboard');

        // Inicializar Tutorial
        if (typeof initTutorial === 'function') initTutorial();

        // Inicializar Notificações
        if (typeof initNotifications === 'function') initNotifications();

        // Lógica de Auditoria e Airlock
        checkAirlock();

    } catch (criticalError) {
        console.error('Erro crítico na inicialização:', criticalError);
        checkAirlock();
    }
}

// ==========================================
// LÓGICA DE SEGURANÇA E ATIVAÇÃO
// ==========================================
async function checkAirlock() {
    const key = localStorage.getItem('plena_license');

    const viewLogin = document.getElementById('view-login');
    const appMain = document.getElementById('app-main-content');

    // 1. Sem licença -> Vai pra Login
    if (!key) {
        if (viewLogin) viewLogin.classList.remove('hidden');
        if (appMain) appMain.classList.add('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // 2. Com licença -> Desbloqueia direto
    // Auto-confirma recibo para garantir consistência
    if (!localStorage.getItem('ml_receipt_confirmed')) {
        localStorage.setItem('ml_receipt_confirmed', 'true');
    }
    unlockSystem();
}

function unlockSystem() {
    const viewLogin = document.getElementById('view-login');
    const appMain = document.getElementById('app-main-content');

    if (viewLogin) viewLogin.classList.add('hidden');
    if (appMain) appMain.classList.remove('hidden');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// A Função activateSystem foi transferida para o index.html para evitar conflitos no load
// e gerenciar o bypass mestre da tela preta. (Ver window.activateSystem no index.html)


async function confirmReceipt() {
    const btn = document.getElementById('btn-confirm-receipt');
    if (btn) {
        btn.innerText = "Registrando...";
        btn.disabled = true;
    }

    const key = localStorage.getItem('plena_license'); // Pega a chave salva no login

    try {
        // Envia JSON, igual ao activate
        const response = await fetch('../api_licenca_ml.php?action=confirm_receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // Cabeçalho Importante
            body: JSON.stringify({
                license_key: key,
                legal_agree: true
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            localStorage.setItem('ml_receipt_confirmed', 'true');
            const modal = document.getElementById('welcome-receipt-modal');
            if (modal) modal.classList.add('hidden');
            alert("Recebimento Confirmado! Bom trabalho.");
            unlockSystem(); // Libera o app
        } else {
            console.error("Erro Recibo:", data);
            alert("Atenção: Não foi possível registrar o recibo automaticamente.\nErro: " + (data.message || "Falha de comunicação."));
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Tentar Novamente";
            }
        }
    } catch (e) {
        alert("Erro de conexão.");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Confirmar Recebimento";
        }
    }
}
// ==========================================
// LÓGICA DO MANUAL (TUTORIAL)
// ==========================================
const tutorialSections = [
    'instalacao',
    'primeiro-cadastro',
    'agendamentos',
    'relatorios',
    'backup',
    'duvidas',
    'checklist'
];
function initTutorial() {
    updateTutorialProgress();
}
function updateDateDisplay() {
    const update = () => {
        const now = new Date();
        const optsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const dateStr = now.toLocaleDateString('pt-BR', optsDate);
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const el = document.getElementById('current-date');
        if (el) el.textContent = `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} • ${timeStr}`;
    };
    update(); // Initial call
    setInterval(update, 1000); // Update every second
}
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
function markSectionComplete(id) {
    // Recuperar estado atual
    let progress = JSON.parse(localStorage.getItem('tutorial_progress') || '[]');
    // Adicionar se não existir
    if (!progress.includes(id)) {
        progress.push(id);
        localStorage.setItem('tutorial_progress', JSON.stringify(progress));
        // Feedback visual
        if (typeof showNotification === 'function') {
            showNotification('Etapa concluída com sucesso!', 'success');
        } else {
            alert('Etapa concluída!');
        }
        // Atualizar UI
        updateTutorialProgress();
    } else {
        if (typeof showNotification === 'function') {
            showNotification('Esta etapa já foi concluída!', 'info');
        }
    }
}
function updateTutorialProgress() {
    const progress = JSON.parse(localStorage.getItem('tutorial_progress') || '[]');
    const total = tutorialSections.length;
    const completed = progress.length;
    const percent = Math.round((completed / total) * 100);
    // Atualizar barra
    const bar = document.getElementById('tutorial-progress');
    if (bar) bar.style.width = `${percent}%`;
    // Atualizar texto
    const text = document.getElementById('completed-steps');
    if (text) text.innerText = `${completed}/${total} etapas`;
    // Atualizar visual dos botões
    tutorialSections.forEach(section => {
        const btn = document.querySelector(`button[onclick="scrollToSection('${section}')"]`);
        if (btn) {
            if (progress.includes(section)) {
                btn.classList.add('bg-green-50', 'text-green-700', 'border-green-200');
                btn.classList.remove('hover:bg-gray-50', 'border-gray-200');
            }
        }
    });
}
// ==========================================
// PWA INSTALLATION LOGIC
// ==========================================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('flex'); // Ensure flex display
    }
});
function installApp() {
    // Hide the app provided install promotion
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.classList.add('hidden');
        installBtn.classList.remove('flex');
    }
    // Show the install prompt
    if (deferredPrompt) {
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                // Usuário aceitou a instalação
            } else {
                // Usuário recusou a instalação
            }
            deferredPrompt = null;
        });
    }
}
window.addEventListener('appinstalled', (evt) => {
    // App instalado com sucesso
});
// ROTEAMENTO E NAVEGAÇÃO
function router(view) {
    // Esconder todas as views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hide'));
    // Remover classe active de todos os nav items
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-white/10', 'text-white', 'active-nav');
        el.classList.add('text-slate-400');
    });
    // Mostrar view selecionada
    const viewElement = document.getElementById(`view-${view}`);
    if (viewElement) {
        viewElement.classList.remove('hide');
        viewElement.classList.add('fade-in');
    }
    // Ativar nav item selecionado
    const navElement = document.getElementById(`nav-${view}`);
    if (navElement) {
        navElement.classList.add('active-nav');
        navElement.classList.remove('text-slate-400');
    }
    // Atualizar título da página
    const titles = {
        dashboard: 'Visão Geral',
        agenda: 'Agenda Diária',
        team: 'Barbeiros',
        services: 'Serviços',
        inventory: 'Estoque',
        finance: 'Financeiro',
        clients: 'Clientes',
        pdv: 'Ponto de Venda',
        reports: 'Relatórios',
        settings: 'Configurações',
        instructions: 'Manual de Uso',
        notifications: 'Notificações',
        about: 'Sobre',
        evolution: 'Central de Evolução'
    };
    document.getElementById('page-title').innerText = titles[view] || 'Gestão Barbearia';
    // Fechar sidebar no mobile
    if (window.innerWidth < 1024) {
        toggleSidebar();
    }
    // Renderizar dados específicos da view
    if (view === 'dashboard') {
        renderDashboard();
    } else if (view === 'agenda') {
        renderAgenda();
    } else if (view === 'team') {
        renderTeam();
    } else if (view === 'services') {
        renderServices();
    } else if (view === 'inventory') {
        renderInventory();
    } else if (view === 'finance') {
        renderFinance();
    } else if (view === 'clients') {
        renderClients();
    } else if (view === 'pdv') {
        if(typeof renderPDV === 'function') renderPDV();
    } else if (view === 'notifications') {
        if(typeof renderNotifications === 'function') renderNotifications();
    } else if (view === 'evolution') {
        if(typeof renderEvolutionCenter === 'function') renderEvolutionCenter();
    }
}

const EVOLUTION_FEATURES = {
    onlineAgenda: { status: 'premium', plan: 'premium_monthly', title: 'Agenda Online para Clientes', description: 'Permita que seus clientes escolham horários disponíveis pelo celular.', icon: 'smartphone', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    cloudBackup: { status: 'premium', plan: 'premium_monthly', title: 'Backup em Nuvem', description: 'Proteja os dados da barbearia com sincronização segura fora do computador.', icon: 'cloud', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    multiUser: { status: 'premium', plan: 'premium_monthly', title: 'Multiusuário', description: 'Dê acesso para recepção, barbeiros e gestores com permissões separadas.', icon: 'users', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    whatsappAuto: { status: 'premium', plan: 'premium_monthly', title: 'WhatsApp Automático', description: 'Envie lembretes, confirmações e mensagens de retorno para clientes.', icon: 'message-circle', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    publicPage: { status: 'premium', plan: 'premium_monthly', title: 'Página Pública da Barbearia', description: 'Tenha uma página online com serviços, horários e link de agendamento.', icon: 'globe', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    advReports: { status: 'premium', plan: 'premium_monthly', title: 'Relatórios Avançados Online', description: 'Compare períodos e acompanhe métricas da equipe na nuvem.', icon: 'bar-chart', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' }
};

function renderEvolutionCenter() {
    const container = document.getElementById('evolution-cards');
    if (!container) return;

    const themeColors = {
        bg: 'bg-white dark:bg-barber-card',
        border: 'border-slate-100 dark:border-white/5',
        textTitle: 'text-slate-800 dark:text-white',
        textDesc: 'text-slate-600 dark:text-slate-400',
        cta: 'text-brand-blue hover:text-brand-dark'
    };
    const iconColors = {
        onlineAgenda: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        cloudBackup: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
        multiUser: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        whatsappAuto: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        publicPage: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
        advReports: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
    };

    let html = '';
    for (const [key, feature] of Object.entries(EVOLUTION_FEATURES)) {
        let badgeHtml = '';
        if (feature.status === 'premium') {
            badgeHtml = `<span class="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full uppercase tracking-wide">${feature.plan === 'pro_lifetime' ? 'Pro/Premium' : 'Premium Online'}</span>`;
        } else if (feature.status === 'soon') {
            badgeHtml = '<span class="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full uppercase tracking-wide">Em breve</span>';
        } else if (feature.status === 'available') {
            badgeHtml = '<span class="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full uppercase tracking-wide">Disponível</span>';
        } else if (feature.status === 'optional') {
            badgeHtml = '<span class="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full uppercase tracking-wide">Opcional</span>';
        }

        const iColor = iconColors[key] || 'bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400';

        html += `
        <div class="${themeColors.bg} rounded-2xl p-6 shadow-sm border ${themeColors.border} flex flex-col">
            <div class="w-12 h-12 ${iColor} rounded-xl flex items-center justify-center mb-4">
                <i data-lucide="${feature.icon}" class="w-6 h-6"></i>
            </div>
            <h3 class="font-bold text-lg ${themeColors.textTitle} mb-2">${feature.title}</h3>
            <p class="text-sm ${themeColors.textDesc} mb-4 flex-1">${feature.description}</p>
            <div class="flex items-center justify-between mt-auto pt-4 border-t ${themeColors.border}">
                ${badgeHtml}
                <button onclick="showEvolutionToast('${key}')" class="text-sm font-bold ${themeColors.cta} transition-colors">${feature.cta}</button>
            </div>
        </div>`;
    }

    container.innerHTML = html;

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function showEvolutionToast(featureKey) {
    let msg = "Este recurso fará parte das próximas evoluções premium.";
    if (featureKey && EVOLUTION_FEATURES[featureKey]) {
        msg = EVOLUTION_FEATURES[featureKey].message || msg;
    }

    if (typeof showNotification === 'function') {
        showNotification(msg, "info");
    } else {
        alert(msg);
    }
}
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('hidden');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

// ── Weekly Chart ────────────────────────────
function renderWeeklyChart(data, labels = []) {
    const container = document.getElementById('mini-chart-container');
    if (!container) return;
    if (data.length < 2 || data.every(v => v === 0)) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-500"><i data-lucide="bar-chart-2" class="w-8 h-8 mb-2 opacity-50 text-slate-400"></i><span class="text-xs">Sem dados suficientes</span></div>';
        lucide.createIcons(); return;
    }
    const maxVal = Math.max(...data) * 1.1 || 100;
    const barWidth = 8;
    const spacing = (100 - (barWidth * data.length)) / (data.length + 1);

    const svg = `
    <svg viewBox="0 0 100 130" class="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
        <defs>
            <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.2" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        ${data.map((val, i) => {
            const x = spacing + i * (barWidth + spacing);
            const barHeight = (val / maxVal) * 90;
            const y = 100 - barHeight;
            const isToday = i === data.length - 1;

            return `
            <g class="cursor-pointer group">
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="2.5"
                    fill="url(#barGrad)" filter="${isToday ? 'url(#glow)' : ''}"
                    class="transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:brightness-110">
                    <title>${labels[i]}: ${fmtMoney(val)}</title>
                </rect>
                <text x="${x + barWidth/2}" y="115" font-size="6" fill="#94a3b8" text-anchor="middle" font-weight="${isToday ? 'bold' : 'medium'}">${labels[i]}</text>
                ${val > 0 ? `<text x="${x + barWidth/2}" y="${y - 4}" font-size="5" fill="#3b82f6" text-anchor="middle" font-weight="bold" class="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">${fmtMoney(val)}</text>` : ''}
            </g>
            `;
        }).join('')}
        <line x1="0" y1="102" x2="100" y2="102" stroke="#94a3b8" stroke-width="0.5" stroke-opacity="0.2" />
    </svg>`;
    container.innerHTML = svg;
}

// DASHBOARD
function renderDashboard() {
    const date = document.getElementById('agenda-date').value;
    const todayAppts = db.appointments
        .filter(a => a.date === date)
        .sort((a, b) => a.time.localeCompare(b.time));
    // Calcular estatísticas
    const todayStr = getLocalIsoDate();
    const todayTrans = db.transactions.filter(t => t.date === todayStr);

    const incomeToday = todayTrans
        .filter(t => t.type === 'income' && !t.isPending)
        .reduce((sum, t) => sum + t.amount, 0);

    const pendingToday = todayTrans
        .filter(t => t.type === 'income' && t.isPending)
        .reduce((sum, t) => sum + t.amount, 0);

    const expenseToday = todayTrans
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const commissionPending = db.transactions
        .filter(t => t.type === 'income' && !t.commissionPaid)
        .reduce((sum, t) => sum + (t.commission || 0), 0);

    // Atualizar KPI cards
    document.getElementById('dash-appt-today').innerText = db.appointments
        .filter(a => a.date === todayStr && a.status === 'pending').length;

    document.getElementById('dash-rev-today').innerText = fmtMoney(incomeToday);

    const revGrowthEl = document.getElementById('rev-growth');
    const revSubtextEl = document.getElementById('dash-rev-subtext');
    if (revSubtextEl) {
        revSubtextEl.innerHTML = pendingToday > 0
            ? `<span class="text-rose-500 font-bold">+ ${fmtMoney(pendingToday)} em fiados</span>`
            : `<span class="text-slate-400">Tudo recebido hoje</span>`;
    }

    document.getElementById('dash-comm-pending').innerText = fmtMoney(commissionPending);

    // Calcular crescimento vs ontem
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalIsoDate(yesterday);
    const yesterdayIncome = db.transactions
        .filter(t => t.date === yesterdayStr && t.type === 'income' && !t.isPending)
        .reduce((sum, t) => sum + t.amount, 0);

    const growth = calculatePercentage(incomeToday, yesterdayIncome);
    if (revGrowthEl) {
        revGrowthEl.innerText = `${growth >= 0 ? '+' : ''}${growth}%`;
        revGrowthEl.className = growth >= 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold';
    }

    // Próximos Agendamentos
    const upcoming = db.appointments
        .filter(a => a.date >= todayStr && a.status === 'pending')
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
        .slice(0, 5);

    const listEl = document.getElementById('upcoming-appts');
    if (listEl) {
        listEl.innerHTML = upcoming.length === 0
            ? `<div class="text-center py-8 text-slate-500 flex flex-col items-center"><i data-lucide="coffee" class="w-8 h-8 mb-2 opacity-50 text-slate-400"></i><span class="text-xs">Tudo tranquilo por enquanto</span></div>`
            : upcoming.map(appt => `
            <div class="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-colors group">
                <div class="flex items-center gap-3">
                    <div class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 p-2.5 rounded-lg text-center min-w-[55px] group-hover:bg-blue-500/10 group-hover:text-brand-blue transition-colors">
                        <span class="block font-bold text-sm text-center">${appt.time}</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-800 dark:text-white truncate">${sanitizeHTML(appt.client)}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-brand-blue px-1.5 py-0.5 rounded font-medium truncate max-w-[80px]">${sanitizeHTML(appt.proName)}</span>
                            <span class="text-[10px] text-slate-400 font-medium">${fmtDate(appt.date)} • ${sanitizeHTML(appt.serviceName)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="finishAppt('${appt.id}')" class="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Concluir">
                        <i data-lucide="check" class="w-4 h-4"></i>
                    </button>
                    <div class="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                    <button onclick="cancelAppt('${appt.id}')" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" title="Cancelar">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>`).join('');
    }

    // Gráfico de Tendência Semanal
    const chartLabels = [];
    const chartValues = [];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const isoDate = getLocalIsoDate(d);
        const dayLabel = weekDays[d.getDay()];
        const rev = db.transactions.filter(t => t.date === isoDate && t.type === 'income' && !t.isPending).reduce((acc, t) => acc + t.amount, 0);
        chartValues.push(rev);
        chartLabels.push(dayLabel);
    }
    renderWeeklyChart(chartValues, chartLabels);

    // Avisos de Planos
    const warningContainer = document.getElementById('dashboard-plan-warnings');
    if (warningContainer) {
        let warningsHTML = '';
        const todayStrLocal = getLocalIsoDate();
        const todayDate = new Date(todayStrLocal);

        db.clients.forEach(c => {
            if (c.planDate) {
                const diffDays = Math.ceil((new Date(c.planDate) - todayDate) / (1000 * 60 * 60 * 24));
                if (c.planDate < todayStrLocal) {
                    warningsHTML += `<div class="bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 p-3 rounded-r-lg text-rose-800 dark:text-rose-400 text-sm flex items-center justify-between"><div class="flex items-center gap-2"><i data-lucide="alert-triangle" class="w-4 h-4"></i> <strong>Cliente: ${sanitizeHTML(c.name)}</strong> - Plano Vencido (${fmtDate(c.planDate)})</div><button onclick="router('clients')" class="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm hover:bg-rose-100 dark:hover:bg-slate-700 font-bold transition">Ver</button></div>`;
                } else if (diffDays <= 5) {
                    warningsHTML += `<div class="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-3 rounded-r-lg text-amber-800 dark:text-amber-400 text-sm flex items-center justify-between"><div class="flex items-center gap-2"><i data-lucide="clock" class="w-4 h-4"></i> <strong>Cliente: ${sanitizeHTML(c.name)}</strong> - Plano vence em ${diffDays} dia(s)</div><button onclick="router('clients')" class="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm hover:bg-amber-100 dark:hover:bg-slate-700 font-bold transition">Ver</button></div>`;
                }
            }
        });

        db.team.forEach(t => {
            if (t.planDate) {
                const diffDays = Math.ceil((new Date(t.planDate) - todayDate) / (1000 * 60 * 60 * 24));
                if (t.planDate < todayStrLocal) {
                    warningsHTML += `<div class="bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 p-3 rounded-r-lg text-rose-800 dark:text-rose-400 text-sm flex items-center justify-between"><div class="flex items-center gap-2"><i data-lucide="alert-triangle" class="w-4 h-4"></i> <strong>Equipe: ${sanitizeHTML(t.name)}</strong> - Plano Vencido (${fmtDate(t.planDate)})</div><button onclick="router('home')" class="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm hover:bg-rose-100 dark:hover:bg-slate-700 font-bold transition">Ver</button></div>`;
                } else if (diffDays <= 5) {
                    warningsHTML += `<div class="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-3 rounded-r-lg text-amber-800 dark:text-amber-400 text-sm flex items-center justify-between"><div class="flex items-center gap-2"><i data-lucide="clock" class="w-4 h-4"></i> <strong>Equipe: ${sanitizeHTML(t.name)}</strong> - Plano vence em ${diffDays} dia(s)</div><button onclick="router('home')" class="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm hover:bg-amber-100 dark:hover:bg-slate-700 font-bold transition">Ver</button></div>`;
                }
            }
        });
        warningContainer.innerHTML = warningsHTML;
    }

    lucide.createIcons();
}

// LÓGICA DA NOVA AGENDA MATRICIAL
function renderAgenda() {
    const date = document.getElementById('agenda-date').value;
    const headerEl = document.getElementById('agenda-header');
    const bodyEl = document.getElementById('agenda-body');

    if (!headerEl || !bodyEl) return;

    // Determinar horários de hoje
    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado

    let startHour = db.settings.businessStart || 8;
    let endHour = db.settings.businessEnd || 20;
    let isActive = true;

    if (dayOfWeek === 6) { // Sábado
        const sat = db.settings.workDays?.saturday || { active: true, start: 9, end: 18 };
        startHour = sat.start;
        endHour = sat.end;
        isActive = sat.active;
    } else if (dayOfWeek === 0) { // Domingo
        const sun = db.settings.workDays?.sunday || { active: false, start: 9, end: 14 };
        startHour = sun.start;
        endHour = sun.end;
        isActive = sun.active;
    }

    if (!isActive) {
        bodyEl.innerHTML = `
            <div class="col-span-full py-20 text-center flex flex-col items-center justify-center">
                <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="moon" class="w-8 h-8 text-slate-400"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 dark:text-white">Estabelecimento Fechado</h3>
                <p class="text-slate-500 dark:text-slate-400">Não há expediente cadastrado para este dia.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    headerEl.style.gridTemplateColumns = `100px repeat(${db.team.length}, 1fr)`;
    headerEl.innerHTML = `<div class="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/80">Horário</div>` + db.team.map(t => `<div class="p-4 text-sm font-bold text-slate-800 dark:text-white text-center truncate border-l border-slate-100 dark:border-white/5">${t.name}</div>`).join('');

    const interval = db.settings.agendaInterval || 60;
    let html = '';

    for (let h = startHour; h <= endHour; h++) {
        const slots = interval === 30 ? [`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`] : [`${h.toString().padStart(2, '0')}:00`];

        slots.forEach(time => {
            // Se for o último horário e for :30 em um intervalo de 30 min, e h for igual ao endHour,
            // talvez devêssemos parar. Mas geralmente o endHour é o último horário disponível para agendamento.

            html += `<div class="grid divide-x divide-slate-100 dark:divide-white/5 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors" style="grid-template-columns: 100px repeat(${db.team.length}, 1fr)">`;
            html += `<div class="p-3 text-xs font-bold text-slate-500 text-center flex items-center justify-center gap-1"><i data-lucide="clock" class="w-3 h-3 text-brand-blue opacity-50"></i>${time}</div>`;

            db.team.forEach(pro => {
                const slotAppts = db.appointments.filter(a => a.date === date && a.time === time && a.proId === pro.id && a.status !== 'canceled');
                if (slotAppts.length > 0) {
                    if (slotAppts.length > 1) {
                        console.warn(`Conflito: múltiplos agendamentos no mesmo slot (${date} ${time}, Pro: ${pro.name}):`, slotAppts.map(a => a.id));
                    }
                    const appt = slotAppts.find(a => a.status === 'pending') || slotAppts[0];
                    const isConflict = slotAppts.length > 1;
                    const isDone = isAppointmentDone(appt.status);

                    let statusColor = isDone ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 border-blue-500 text-brand-blue dark:text-brand-lightblue';
                    if (isConflict) {
                        statusColor = 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400';
                    }
                    const textColor = isConflict ? 'text-rose-700 dark:text-rose-300' : (isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300');

                    html += `<div class="p-1 relative group cursor-pointer">
                        <div class="h-full w-full ${statusColor} border-l-4 rounded p-2 text-xs hover:opacity-80 transition-colors flex flex-col justify-between">
                            <div>
                                <p class="font-bold ${textColor} truncate">${sanitizeHTML(appt.client)} ${isConflict ? '⚠️' : ''}</p>
                                <p class="${textColor}/70 truncate">${sanitizeHTML(appt.serviceName)}</p>
                                ${isConflict ? `<p class="text-[9px] text-rose-500 font-bold">Conflito (${slotAppts.length} agendamentos)</p>` : ''}
                            </div>
                            <div class="flex justify-end gap-1 mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                ${!isDone ? `<button onclick="finishAppt('${appt.id}')" class="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded" title="Concluir"><i data-lucide="check" class="w-3 h-3"></i></button>` : '<i data-lucide="check-circle" class="w-3 h-3 text-emerald-500"></i>'}
                                ${!isDone ? `<button onclick="editAppt('${appt.id}')" class="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded" title="Editar"><i data-lucide="edit-2" class="w-3 h-3"></i></button>` : ''}
                                <button onclick="cancelAppt('${appt.id}')" class="p-1 text-red-600 dark:text-rose-400 hover:bg-red-500/20 rounded" title="Cancelar"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                            </div>
                        </div>
                    </div>`;
                } else {
                    html += `<div class="p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group relative" onclick="openApptModalWithContext('${date}', '${time}', '${pro.id}')"><i data-lucide="plus" class="w-4 h-4 text-brand-blue opacity-0 group-hover:opacity-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity"></i></div>`;
                }
            });
            html += `</div>`;
        });
    }
    bodyEl.innerHTML = html;
    lucide.createIcons();
}

function openApptModalWithContext(date, time, proId) {
    // Primeiro abre o modal para carregar os selects de serviços e barbeiros
    openApptModal();

    // Define os valores de contexto
    if (date) document.getElementById('ap-date').value = date;
    if (time) document.getElementById('ap-time').value = time;
    if (proId) document.getElementById('ap-pro').value = proId;

    // Garante que o título do modal reflita o novo agendamento
    document.querySelector('#apptModal h3').textContent = 'Novo Agendamento';
}

function changeAgendaDate(days) {
    const input = document.getElementById('agenda-date');
    const bDate = parseLocalDate(input.value);
    if (!bDate) return;
    bDate.setDate(bDate.getDate() + days);
    input.value = getLocalIsoDate(bDate);
    renderAgenda();
}

// TEAM MANAGEMENT
function renderTeam() {
    const list = document.getElementById('team-list');
    if (!list) return;

    if (db.team.length === 0) {
        list.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i data-lucide="users" class="w-12 h-12 mx-auto mb-4 text-slate-300"></i>
                <p class="text-slate-400">Nenhum barbeiro cadastrado</p>
            </div>
        `;
        return;
    }

    list.innerHTML = db.team.map(t => {
        // Calculate stats
        const servicesCount = db.appointments.filter(a => a.proId === t.id && isAppointmentDone(a.status)).length;

        const pendingCommissions = db.transactions
            .filter(tr => tr.proId === t.id && tr.type === 'income' && !tr.commissionPaid)
            .reduce((sum, tr) => sum + (tr.commission || 0), 0);

        const rawPhone = t.phone ? t.phone.replace(/\D/g, '') : '';
        const waLink = rawPhone ? `https://wa.me/55${rawPhone}` : null;

        let planWarning = '';
        let planDisplay = '';
        if (t.planName) {
            planDisplay = `<span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">${sanitizeHTML(t.planName)} - ${fmtMoney(t.planValue || 0)}</span>`;
            if (t.planDate) {
                const today = getLocalIsoDate();
                if (t.planDate < today) {
                    planWarning = `<div class="mt-2 text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 p-1.5 rounded flex items-center gap-1"><i data-lucide="alert-circle" class="w-3 h-3"></i> Plano Vencido (${fmtDate(t.planDate)})</div>`;
                } else {
                    const daysUntil = Math.ceil((new Date(t.planDate) - new Date(today)) / (1000 * 60 * 60 * 24));
                    if (daysUntil <= 5) {
                        planWarning = `<div class="mt-2 text-[10px] text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> Vence em ${daysUntil} dia(s)</div>`;
                    }
                }
            }
        }

        return `
        <div class="bg-white dark:bg-barber-card p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 flex flex-col justify-between h-full card-hover">
            <div>
                <div class="flex justify-between items-start mb-4">
                    <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <i data-lucide="user" class="w-6 h-6"></i>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider">
                            ${t.contract || 'PJ'}
                        </span>
                        <span class="text-[10px] font-bold text-brand-blue dark:text-brand-lightblue uppercase">Comissão: ${t.commission}%</span>
                    </div>
                </div>
                <h3 class="font-bold text-lg text-slate-800 dark:text-white mb-0">${sanitizeHTML(t.name)}</h3>
                ${planDisplay}
                ${t.startDate ? `<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1 mb-3 flex items-center"><i data-lucide="calendar" class="w-3 h-3 mr-1"></i> Desde ${fmtDate(t.startDate)}</p>` : '<div class="mb-3"></div>'}
                ${planWarning}

                <div class="space-y-2 mt-4">
                    <div class="flex justify-between text-sm">
                        <span class="text-slate-500 dark:text-slate-400">Serviços realizados:</span>
                        <span class="font-bold text-slate-800 dark:text-slate-200">${servicesCount}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-slate-500 dark:text-slate-400">Comissões pendentes:</span>
                        <span class="font-bold ${pendingCommissions > 0 ? 'text-brand-blue dark:text-brand-lightblue' : 'text-slate-400 dark:text-slate-600'}">${fmtMoney(pendingCommissions)}</span>
                    </div>
                </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-50 dark:border-white/5 flex gap-2">
                <button onclick="payCommission('${t.id}')"
                    class="flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${pendingCommissions > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-brand-blue dark:text-brand-lightblue hover:bg-blue-100 dark:hover:bg-blue-900/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'}"
                    ${pendingCommissions === 0 ? 'disabled' : ''}>
                    Pagar Comissão
                </button>
                <div class="flex gap-1">
                    ${waLink ? `
                        <a href="${waLink}" target="_blank" class="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-colors" title="WhatsApp">
                            <i data-lucide="message-circle" class="w-5 h-5"></i>
                        </a>
                    ` : ''}
                    <button onclick="editTeam('${t.id}')" class="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar">
                        <i data-lucide="edit-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
    lucide.createIcons();
}
// SERVICES MANAGEMENT (Atualizados para universo masculino)
function renderServices() {
    const container = document.getElementById('services-list');
    if (db.services.length === 0) {
        container.innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <i data-lucide="scissors" class="w-12 h-12 mx-auto mb-4 text-slate-300"></i>
                        <p class="text-slate-400">Nenhum serviço cadastrado</p>
                    </div>
                `;
        return;
    }
    container.innerHTML = db.services.map(service => {
        const serviceCount = db.transactions
            .filter(t => t.serviceId === service.id)
            .length;
        return `
                    <div class="bg-white dark:bg-barber-card p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm flex justify-between items-center card-hover transition-all">
                        <div>
                            <span class="font-bold text-slate-800 dark:text-white">${service.name}</span>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${serviceCount} realizados</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-brand-blue dark:text-brand-lightblue">${fmtMoney(service.price)}</span>
                            <button onclick="editService('${service.id}')"
                                    class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                `;
    }).join('');
    lucide.createIcons();
}
// FINANCE MANAGEMENT
function renderFinance() {
    const term = document.getElementById('search-term').value.toLowerCase();
    const filter = document.getElementById('filter-type').value;
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    // Filtrar transações
    let filtered = db.transactions.filter(t => {
        const matchesTerm = t.description.toLowerCase().includes(term) ||
            (t.proName && t.proName.toLowerCase().includes(term));
        const matchesType = filter === 'all' || t.type === filter;
        const matchesDate = (!start || t.date >= start) && (!end || t.date <= end);
        return matchesTerm && matchesType && matchesDate;
    });
    // Ordenar por data (mais recente primeiro)
    filtered.sort((a, b) => compareIsoDate(b.date, a.date));
    // Atualizar estatísticas
    const monthTrans = db.transactions.filter(t => isSameLocalMonth(t.date, new Date()));
    const incomeMonth = monthTrans
        .filter(t => t.type === 'income' && !t.isPending)
        .reduce((sum, t) => sum + t.amount, 0);
    const expenseMonth = monthTrans
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const commissionMonth = monthTrans
        .filter(t => t.type === 'income' && !t.isPending)
        .reduce((sum, t) => sum + (t.commission || 0), 0);
    document.getElementById('fin-income').textContent = fmtMoney(incomeMonth);
    document.getElementById('fin-expense').textContent = fmtMoney(expenseMonth);
    document.getElementById('fin-commission').textContent = fmtMoney(commissionMonth);
    // Atualizar tabela
    const tbody = document.getElementById('trans-list');
    const emptyMsg = document.getElementById('empty-msg');
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        return;
    }
    emptyMsg.classList.add('hidden');
    tbody.innerHTML = filtered.map(t => {
        const isIncome = t.type === 'income';
        const isPending = !!t.isPending;
        const rowClass = isPending ? 'bg-rose-50/40 dark:bg-rose-900/10' : '';
        const pendingBadge = isPending
            ? '<span class="ml-1.5 text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 px-1.5 py-0.5 rounded-full">FIADO</span>'
            : '';
        const typeBadge = isPending
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">Fiado</span>'
            : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isIncome ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'}">${isIncome ? 'Entrada' : 'Saída'}</span>`;
        const amtColor = isPending ? 'text-rose-500 dark:text-rose-400' : (isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
        return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 group border-b border-slate-100 dark:border-white/5 transition-colors ${rowClass}">
                        <td class="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">${fmtDate(t.date)}</td>
                        <td class="px-6 py-4">
                            <div class="font-medium text-slate-800 dark:text-white">${sanitizeHTML(t.description)}${pendingBadge}</div>
                        ${t.category ? `<div class="text-xs text-slate-400 dark:text-slate-500">${sanitizeHTML(t.category)}</div>` : ''}
                    </td>
                    <td class="px-6 py-4 dark:text-slate-300">${t.proName ? sanitizeHTML(t.proName) : '-'}</td>
                        <td class="px-6 py-4">${typeBadge}</td>
                        <td class="px-6 py-4 text-right font-bold ${amtColor}">
                            ${isIncome ? '+' : '-'} ${fmtMoney(t.amount)}
                        </td>
                        <td class="px-6 py-4 text-right text-sm text-slate-500 dark:text-slate-400">
                            ${t.commission ? fmtMoney(t.commission) : '-'}
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button onclick="editTransaction('${t.id}')" class="text-slate-400 hover:text-blue-600 dark:hover:text-brand-lightblue transition-colors">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                        </td>
                    </tr>
                `;
    }).join('');
    lucide.createIcons();
}


// CLIENTS MANAGEMENT
function renderClients() {
    const container = document.getElementById('clients-list');
    if (db.clients.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                    <i data-lucide="user" class="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600"></i>
                    <p>Nenhum cliente cadastrado</p>
                </td>
            </tr>
        `;
        return;
    }
    container.innerHTML = db.clients.map(client => {
        const clientTrans = db.transactions
            .filter(t => t.clientId === client.id && t.type === 'income');
        const totalSpent = clientTrans.reduce((sum, t) => sum + t.amount, 0);
        const lastVisit = clientTrans.length > 0
            ? clientTrans.sort((a, b) => compareIsoDate(b.date, a.date))[0].date
            : null;

        // WhatsApp Link Logic
        const rawPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
        const waLink = rawPhone ? `https://wa.me/55${rawPhone}` : '#';

        // Debt badge
        const debtTotal = db.transactions
            .filter(t => t.clientId === client.id && t.isPending)
            .reduce((sum, t) => sum + t.amount, 0);
        const debtBadge = debtTotal > 0
            ? `<span class="ml-2 text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 px-1.5 py-0.5 rounded-full">Fiado ${fmtMoney(debtTotal)}</span>`
            : '';

        let planBadge = '';
        if (client.planName) {
            let planStatusClass = 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-brand-lightblue';
            if (client.planDate) {
                const today = getLocalIsoDate();
                if (client.planDate < today) {
                    planStatusClass = 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400';
                    planBadge += `<span class="ml-2 text-[10px] font-bold ${planStatusClass} px-1.5 py-0.5 rounded-full" title="Plano vencido em ${fmtDate(client.planDate)}">⚠️ ${sanitizeHTML(client.planName)}</span>`;
                } else {
                    const daysUntil = Math.ceil((new Date(client.planDate) - new Date(today)) / (1000 * 60 * 60 * 24));
                    if (daysUntil <= 5) {
                        planStatusClass = 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400';
                        planBadge += `<span class="ml-2 text-[10px] font-bold ${planStatusClass} px-1.5 py-0.5 rounded-full" title="Vence em ${daysUntil} dia(s)">⚠️ ${sanitizeHTML(client.planName)}</span>`;
                    } else {
                        planBadge += `<span class="ml-2 text-[10px] font-bold ${planStatusClass} px-1.5 py-0.5 rounded-full">${sanitizeHTML(client.planName)}</span>`;
                    }
                }
            } else {
                planBadge += `<span class="ml-2 text-[10px] font-bold ${planStatusClass} px-1.5 py-0.5 rounded-full">${sanitizeHTML(client.planName)}</span>`;
            }
        }

        return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-white/5 transition-colors">
                <td class="px-6 py-4">
                    <div class="font-medium text-slate-800 dark:text-white flex items-center flex-wrap gap-y-1">${sanitizeHTML(client.name)}${debtBadge}${planBadge}</div>
                    ${client.email ? `<div class="text-xs text-slate-400 dark:text-slate-500">${sanitizeHTML(client.email)}</div>` : ''}
                </td>
                <td class="px-6 py-4 text-slate-600 dark:text-slate-400">${client.phone ? sanitizeHTML(client.phone) : '-'}</td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-500">${lastVisit ? fmtDate(lastVisit) : 'Nunca'}</td>
                <td class="px-6 py-4 font-bold text-brand-blue dark:text-brand-lightblue">${fmtMoney(totalSpent)}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center gap-2">
                        <!-- WhatsApp Action -->
                        ${rawPhone ? `
                        <a href="${waLink}" target="_blank" class="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-colors" title="Chamar no WhatsApp">
                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                        </a>` : ''}

                        <!-- Quick Schedule -->
                        <button onclick="openApptModal('${client.id}')" class="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Novo Agendamento">
                            <i data-lucide="calendar-plus" class="w-4 h-4"></i>
                        </button>

                        <!-- View Details (CRM) -->
                        <button onclick="openClientDetails('${client.id}')" class="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Ver Detalhes">
                            <i data-lucide="user" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

// CRM LOGIC
function openClientDetails(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;

    // 1. Basic Info
    document.getElementById('cd-name').textContent = client.name;
    document.getElementById('cd-phone').textContent = client.phone || 'Sem telefone';
    document.getElementById('cd-notes').textContent = client.notes || 'Nenhuma observação registrada.';
    document.getElementById('cd-birthday').textContent = client.birthDate ? fmtDate(client.birthDate) : '-';

    // 2. Stats Calculation — apenas transações quitadas e do tipo income entram nas métricas
    const clientTrans = db.transactions.filter(t => t.clientId === clientId && t.type === 'income');
    const paidTrans = clientTrans.filter(t => !t.isPending);
    const totalSpent = paidTrans.reduce((sum, t) => sum + t.amount, 0);
    const visits = paidTrans.length;
    const avgTicket = visits > 0 ? (totalSpent / visits) : 0;

    document.getElementById('cd-total-spent').textContent = fmtMoney(totalSpent);
    document.getElementById('cd-visits').textContent = visits;
    document.getElementById('cd-avg-ticket').textContent = fmtMoney(avgTicket);

    // 3. Visit Dates (using string comparison helper)
    if (visits > 0) {
        const sorted = [...paidTrans].sort((a, b) => compareIsoDate(a.date, b.date));
        document.getElementById('cd-first-visit').textContent = fmtDate(sorted[0].date);
        document.getElementById('cd-last-visit').textContent = fmtDate(sorted[sorted.length - 1].date);
    } else {
        document.getElementById('cd-first-visit').textContent = '-';
        document.getElementById('cd-last-visit').textContent = '-';
    }

    // 4. Debt Section
    const debtTransactions = db.transactions.filter(t => t.clientId === clientId && t.isPending);
    const totalDebt = debtTransactions.reduce((sum, t) => sum + t.amount, 0);
    const debtSection = document.getElementById('cd-debt-section');
    if (totalDebt > 0) {
        debtSection.classList.remove('hidden');
        document.getElementById('cd-debt-amount').textContent = fmtMoney(totalDebt);
        document.getElementById('cd-btn-pay-debt').onclick = () => payClientDebt(clientId);
    } else {
        debtSection.classList.add('hidden');
    }

    // 5. History Timeline
    const historyContainer = document.getElementById('cd-history-list');
    if (historyContainer) {
        if (clientTrans.length === 0) {
            historyContainer.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Nenhum histórico encontrado.</p>';
        } else {
            const sortedHistory = [...clientTrans].sort((a, b) => compareIsoDate(b.date, a.date));
            historyContainer.innerHTML = sortedHistory.map(t => {
                const pending = t.isPending;
                const rowBg = pending
                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-white/5';
                const amtColor = pending
                    ? 'text-rose-500 dark:text-rose-400'
                    : 'text-green-600 dark:text-green-400';
                const badge = pending
                    ? '<span class="ml-2 text-[10px] font-bold bg-rose-200 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-1.5 py-0.5 rounded-full">FIADO</span>'
                    : '';
                return `
                <div class="flex justify-between items-center p-3 rounded-lg border transition-all ${rowBg}">
                    <div>
                        <p class="font-bold text-slate-700 dark:text-white text-sm">${sanitizeHTML(t.description)}${badge}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">${fmtDate(t.date)} • ${t.proName || 'Barbearia'}</p>
                    </div>
                    <span class="font-bold ${amtColor} text-sm">${fmtMoney(t.amount)}</span>
                </div>`;
            }).join('');
        }
    }

    // 6. Action Buttons (WhatsApp link, schedule, edit)
    const rawPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
    const btnWa = document.getElementById('cd-btn-whatsapp');
    if (btnWa) {
        if (rawPhone) {
            btnWa.onclick = () => window.open(`https://wa.me/55${rawPhone}`, '_blank');
            btnWa.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            btnWa.onclick = null;
            btnWa.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    document.getElementById('cd-btn-schedule').onclick = () => {
        closeModal('clientDetailsModal');
        openApptModal(clientId);
    };

    document.getElementById('cd-btn-edit').onclick = () => {
        closeModal('clientDetailsModal');
        openClientModal(client); // Reuse existing edit modal
    };

    // 7. Show Modal & Lucide Icons
    document.getElementById('clientDetailsModal').classList.remove('hidden');
    lucide.createIcons();
}

function payClientDebt(clientId) {
    const debtTransactions = db.transactions.filter(t => t.clientId === clientId && t.isPending);
    if (debtTransactions.length === 0) return;

    const total = debtTransactions.reduce((sum, t) => sum + t.amount, 0);
    const client = db.clients.find(c => c.id === clientId);

    if (confirm(`Confirmar o recebimento de ${fmtMoney(total)} referente ao fiado de ${client.name}?`)) {
        const today = getLocalIsoDate();
        debtTransactions.forEach(t => {
            t.isPending = false; // Quita a transação original liberando-a para o financeiro
            t.date = today; // Move a transação para o dia atual (data real do acerto do caixa e da comissão)
        });
        save();
        showNotification('Dívida quitada! Baixa gerada no caixa de hoje e comissões liberadas.', 'success');
        closeModal('clientDetailsModal');
        // Recarregar os elementos dependendo de qual tela está aberta
        renderDashboard();
        renderClients();
    }
}

function updateClientsDatalist() {
    const list = document.getElementById('clients-list');
    if (!list) return;
    list.innerHTML = '';
    db.clients.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        list.appendChild(opt);
    });
}
// MODAIS E FORMULÁRIOS
function openApptModal(clientId = null) {
    // Carregar Serviços
    const svcSelect = document.getElementById('ap-service');
    svcSelect.innerHTML = '<option value="">Selecione o Serviço...</option>';
    db.services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.text = `${s.name} - ${fmtMoney(s.price)}`;
        opt.dataset.price = s.price;
        svcSelect.appendChild(opt);
    });
    // Carregar Barbeiros
    const proSelect = document.getElementById('ap-pro');
    proSelect.innerHTML = '<option value="">Selecione o Barbeiro...</option>';
    db.team.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.text = p.name;
        proSelect.appendChild(opt);
    });
    // Resetar campos
    document.getElementById('ap-id').value = '';
    document.getElementById('ap-client').value = '';
    document.getElementById('ap-time').value = '';
    document.getElementById('ap-display-val').textContent = 'R$ 0,00';

    // Se passar clientId, preenche o nome e bloqueia se desejar (ou apenas preenche)
    if (clientId) {
        const client = db.clients.find(c => c.id === clientId);
        if (client) {
            document.getElementById('ap-client').value = client.name;
        }
    }

    document.getElementById('apptModal').classList.remove('hidden');
}
function updateApptValue() {
    const svcSelect = document.getElementById('ap-service');
    const price = svcSelect.options[svcSelect.selectedIndex].dataset.price || 0;
    document.getElementById('ap-display-val').textContent = fmtMoney(parseFloat(price));
}
function openTeamModal(professional = null) {
    if (professional) {
        document.getElementById('tm-id').value = professional.id;
        document.getElementById('tm-name').value = professional.name;
        document.getElementById('tm-comm').value = professional.commission;
        document.getElementById('tm-contract').value = professional.contract || 'PJ';
        document.getElementById('tm-phone').value = professional.phone || '';
        document.getElementById('tm-start-date').value = professional.startDate || '';
        document.getElementById('tm-notes').value = professional.notes || '';
        document.getElementById('tm-plan-name').value = professional.planName || '';
        document.getElementById('tm-plan-value').value = professional.planValue || '';
        document.getElementById('tm-plan-date').value = professional.planDate || '';
        document.querySelector('#teamModal h3').textContent = 'Editar Barbeiro';
    } else {
        document.querySelector('#teamModal form').reset();
        document.getElementById('tm-id').value = '';
        document.getElementById('tm-contract').value = 'PJ';
        document.querySelector('#teamModal h3').textContent = 'Novo Barbeiro';
    }
    document.getElementById('teamModal').classList.remove('hidden');
}
function openServiceModal(service = null) {
    if (service) {
        document.getElementById('svc-id').value = service.id;
        document.getElementById('svc-name').value = service.name;
        document.getElementById('svc-price').value = service.price;
    } else {
        document.querySelector('#serviceModal form').reset();
        document.getElementById('svc-id').value = '';
    }
    document.getElementById('serviceModal').classList.remove('hidden');
}
function openExpenseModal() {
    document.querySelector('#expenseModal form').reset();
    document.getElementById('exp-id').value = '';
    document.getElementById('exp-date').value = getLocalIsoDate();
    document.querySelector('#expenseModal h3').textContent = 'Lançar Movimentação';
    document.querySelector('#expenseModal button[type="submit"]').textContent = 'Salvar Lançamento';
    document.getElementById('expenseModal').classList.remove('hidden');
}
function editTransaction(id) {
    const transaction = db.transactions.find(t => t.id === id);
    if (!transaction) return;
    document.getElementById('exp-id').value = transaction.id;
    document.getElementById('exp-type').value = transaction.type;
    document.getElementById('exp-desc').value = transaction.description;
    document.getElementById('exp-amount').value = transaction.amount;
    document.getElementById('exp-date').value = transaction.date;
    document.getElementById('exp-category').value = transaction.category || 'outros';
    document.querySelector('#expenseModal h3').textContent = 'Editar Movimentação';
    document.querySelector('#expenseModal button[type="submit"]').textContent = 'Atualizar Lançamento';
    document.getElementById('expenseModal').classList.remove('hidden');
}
function openClientModal(client = null) {
    if (client) {
        document.getElementById('cli-id').value = client.id;
        document.getElementById('cli-name').value = client.name;
        document.getElementById('cli-phone').value = client.phone || '';
        document.getElementById('cli-email').value = client.email || '';
        document.getElementById('cli-birthdate').value = client.birthDate || '';
        document.getElementById('cli-notes').value = client.notes || '';
        document.getElementById('cli-plan-name').value = client.planName || '';
        document.getElementById('cli-plan-value').value = client.planValue || '';
        document.getElementById('cli-plan-date').value = client.planDate || '';
    } else {
        document.querySelector('#clientModal form').reset();
        document.getElementById('cli-id').value = '';
    }
    document.getElementById('clientModal').classList.remove('hidden');
}
function openClosingModal() {
    const today = getLocalIsoDate();
    const todayTrans = db.transactions.filter(t => t.date === today);
    const incomeToday = todayTrans
        .filter(t => t.type === 'income' && !t.isPending)
        .reduce((sum, t) => sum + t.amount, 0);
    const expenseToday = todayTrans
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const commissionToday = todayTrans
        .filter(t => t.type === 'income' && !t.isPending)
        .reduce((sum, t) => sum + (t.commission || 0), 0);
    const balanceToday = incomeToday - expenseToday - commissionToday;
    document.getElementById('close-inc').textContent = fmtMoney(incomeToday);
    document.getElementById('close-exp').textContent = fmtMoney(expenseToday);
    document.getElementById('close-com').textContent = fmtMoney(commissionToday);
    document.getElementById('close-bal').textContent = fmtMoney(balanceToday);
    document.getElementById('close-date').textContent = fmtDate(today);
    document.getElementById('close-time').textContent = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('closingModal').classList.remove('hidden');
}
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}


function updateApptValue() {
    const sel = document.getElementById('ap-service');
    const price = parseFloat(sel.options[sel.selectedIndex]?.getAttribute('data-price')) || 0;
    document.getElementById('ap-display-val').innerText = fmtMoney(price);
}
// CRUD OPERATIONS
function submitAppt(e) {
    e.preventDefault();
    const id = document.getElementById('ap-id').value;
    const client = document.getElementById('ap-client').value.trim();
    const date = document.getElementById('ap-date').value;
    const time = document.getElementById('ap-time').value;
    const serviceId = document.getElementById('ap-service').value;
    const proId = document.getElementById('ap-pro').value;
    const service = db.services.find(s => s.id === serviceId);
    const professional = db.team.find(t => t.id === proId);
    if (!client || !service || !professional) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
    }

    // Validar conflito de horários (mesmo barbeiro, data, horário e não cancelado, ignorando o próprio agendamento)
    const hasConflict = db.appointments.some(a => {
        if (id && a.id === id) return false;
        return a.date === date && a.time === time && a.proId === proId && a.status !== 'canceled';
    });

    if (hasConflict) {
        showNotification('Horário indisponível! Já existe um agendamento para este barbeiro nesse horário.', 'error');
        return;
    }

    // Garantir que o cliente exista no banco de dados e obter o ID
    const clientId = findOrCreateClient(client);
    updateClientsDatalist(); // Atualizar lista se for um cliente novo

    // Preservar status existente se for edição
    let apptStatus = 'pending';
    if (id) {
        const existingAppt = db.appointments.find(a => a.id === id);
        if (existingAppt) {
            apptStatus = existingAppt.status;
        }
    }

    const appointment = {
        id: id || getID(),
        client,
        clientId,
        date,
        time,
        serviceId,
        serviceName: service.name,
        proId,
        proName: professional.name,
        price: service.price,
        status: apptStatus,
        commissionPct: professional.commission,
        commissionVal: service.price * (professional.commission / 100)
    };
    if (id) {
        // Editar
        const index = db.appointments.findIndex(a => a.id === id);
        if (index !== -1) {
            db.appointments[index] = appointment;
        }
    } else {
        // Adicionar
        db.appointments.push(appointment);
    }
    save();
    closeModal('apptModal');
    renderDashboard();
    renderDashboard();

    // Atualizar Agenda se ativa
    const agendaView = document.getElementById('view-agenda');
    if (agendaView && !agendaView.classList.contains('hide')) {
        renderAgenda();
    }

    // Atualizar Clientes se ativa (Caso relatado pelo usuário)
    const clientsView = document.getElementById('view-clients');
    if (clientsView && !clientsView.classList.contains('hide')) {
        renderClients();
    }
    showNotification('Agendamento salvo com sucesso!', 'success');
}
function submitTeam(e) {
    e.preventDefault();
    const id = document.getElementById('tm-id').value;
    const name = document.getElementById('tm-name').value.trim();
    const commission = parseFloat(document.getElementById('tm-comm').value) || 0;
    const contract = document.getElementById('tm-contract').value;
    const phone = document.getElementById('tm-phone').value.trim();
    const startDate = document.getElementById('tm-start-date').value;
    const notes = document.getElementById('tm-notes').value.trim();
    const planName = document.getElementById('tm-plan-name').value.trim();
    const planValue = parseFloat(document.getElementById('tm-plan-value').value) || 0;
    const planDate = document.getElementById('tm-plan-date').value;

    if (!name) {
        showNotification('Por favor, insira o nome do barbeiro.', 'error');
        return;
    }

    const professional = {
        id: id || getID(),
        name,
        commission,
        contract,
        phone,
        startDate,
        notes,
        planName: planName || null,
        planValue: planName ? planValue : null,
        planDate: planName ? (planDate || null) : null
    };

    if (id) {
        const index = db.team.findIndex(t => t.id === id);
        if (index !== -1) {
            db.team[index] = professional;
        }
    } else {
        db.team.push(professional);
    }

    save();
    closeModal('teamModal');
    renderTeam();
    showNotification('Barbeiro salvo com sucesso!', 'success');
}
function submitService(e) {
    e.preventDefault();
    const id = document.getElementById('svc-id').value;
    const name = document.getElementById('svc-name').value.trim();
    const price = parseFloat(document.getElementById('svc-price').value) || 0;
    if (!name || price <= 0) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
    }
    const service = {
        id: id || getID(),
        name,
        price
    };
    if (id) {
        const index = db.services.findIndex(s => s.id === id);
        if (index !== -1) {
            db.services[index] = service;
        }
    } else {
        db.services.push(service);
    }
    save();
    closeModal('serviceModal');
    renderServices();
    showNotification('Serviço salvo com sucesso!', 'success');
}
function submitExpense(e) {
    e.preventDefault();
    const id = document.getElementById('exp-id').value;
    const type = document.getElementById('exp-type').value;
    const description = document.getElementById('exp-desc').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
    const date = document.getElementById('exp-date').value;
    const category = document.getElementById('exp-category').value;
    if (!description || amount <= 0) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
    }
    const transaction = {
        id: id || getID(),
        type: type, // 'income' or 'expense'
        description,
        amount,
        date,
        category
    };
    if (id) {
        const index = db.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            db.transactions[index] = { ...db.transactions[index], ...transaction };
        }
    } else {
        db.transactions.push(transaction);
    }
    save();
    closeModal('expenseModal');
    if (document.getElementById('view-finance').classList.contains('hide') === false) {
        renderFinance();
    }
    const msg = id ? 'Lançamento atualizado!' : (type === 'income' ? 'Receita registrada!' : 'Despesa registrada!');
    showNotification(msg, 'success');
}
function submitClient(e) {
    e.preventDefault();
    const id = document.getElementById('cli-id').value;
    const name = document.getElementById('cli-name').value.trim();
    const phone = document.getElementById('cli-phone').value.trim();
    const email = document.getElementById('cli-email').value.trim();
    const birthDate = document.getElementById('cli-birthdate').value;
    const notes = document.getElementById('cli-notes').value.trim();
    const planName = document.getElementById('cli-plan-name').value.trim();
    const planValue = parseFloat(document.getElementById('cli-plan-value').value) || 0;
    const planDate = document.getElementById('cli-plan-date').value;

    if (!name) {
        alert('Por favor, insira o nome do cliente.');
        return;
    }

    // Preserve original creation date if editing
    let originalCreatedAt = getLocalIsoString();
    if (id) {
        const existing = db.clients.find(c => c.id === id);
        if (existing && existing.createdAt) {
            originalCreatedAt = existing.createdAt;
        }
    }

    const client = {
        id: id || getID(),
        name,
        phone: phone || null,
        email: email || null,
        birthDate: birthDate || null,
        notes: notes || null,
        createdAt: originalCreatedAt,
        planName: planName || null,
        planValue: planName ? planValue : null,
        planDate: planName ? (planDate || null) : null
    };

    if (id) {
        const index = db.clients.findIndex(c => c.id === id);
        if (index !== -1) {
            db.clients[index] = client;
        }
    } else {
        db.clients.push(client);
    }
    save();
    closeModal('clientModal');
    renderClients();
    updateClientsDatalist();
    showNotification('Cliente salvo com sucesso!', 'success');
}
// APPOINTMENT ACTIONS
let currentCheckoutAppt = null;
let currentCheckoutProducts = [];

function finishAppt(id) {
    const appt = db.appointments.find(a => a.id === id);
    if (!appt) return;
    currentCheckoutAppt = appt;
    currentCheckoutProducts = [];

    document.getElementById('co-appt-id').value = id;
    document.getElementById('co-client-name').textContent = appt.client;
    document.getElementById('co-service-name').textContent = appt.serviceName;
    document.getElementById('co-service-price').textContent = `R$ ${appt.price.toFixed(2)}`;

    updateCheckoutApptModal();

    // Popular select de produtos
    const sel = document.getElementById('co-product-select');
    sel.innerHTML = '<option value="">Selecione um produto...</option>';
    db.inventory.forEach(p => {
        if(p.quantity > 0) {
            sel.innerHTML += `<option value="${p.id}">${p.name} - R$ ${parseFloat(p.price || p.unitPrice).toFixed(2)} (Estoque: ${p.quantity})</option>`;
        }
    });

    document.getElementById('checkoutApptModal').classList.remove('hidden');
}

function updateCheckoutApptModal() {
    const list = document.getElementById('co-products-list');
    list.innerHTML = '';
    let totalProd = 0;

    currentCheckoutProducts.forEach((p, idx) => {
        totalProd += p.price;
        list.innerHTML += `
            <div class="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-white/5">
                <div class="flex items-center gap-2">
                    <button onclick="removeCheckoutApptProduct(${idx})" class="text-rose-500 hover:text-rose-700">
                        <i data-lucide="minus-circle" class="w-4 h-4"></i>
                    </button>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${p.name}</span>
                </div>
                <span class="text-sm font-bold text-slate-900 dark:text-white">R$ ${p.price.toFixed(2)}</span>
            </div>
        `;
    });
    lucide.createIcons();

    const finalTotal = currentCheckoutAppt.price + totalProd;
    document.getElementById('co-total-price').textContent = `R$ ${finalTotal.toFixed(2)}`;
}

function addCheckoutApptProduct() {
    const sel = document.getElementById('co-product-select');
    if(!sel.value) return;

    const product = db.inventory.find(i => i.id === sel.value);
    if(product) {
        currentCheckoutProducts.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price || product.unitPrice)
        });
        updateCheckoutApptModal();
        sel.value = '';
    }
}

function removeCheckoutApptProduct(index) {
    currentCheckoutProducts.splice(index, 1);
    updateCheckoutApptModal();
}

function confirmCheckoutAppt(paymentType) {
    const appt = currentCheckoutAppt;

    // Validar se o checkout já foi feito (idempotência)
    const existingTx = db.transactions.find(t => t.appointmentId === appt.id && t.type === 'income');
    if (existingTx) {
        showNotification('Este agendamento já foi finalizado anteriormente!', 'warning');
        closeModal('checkoutApptModal');
        appt.status = 'done';
        save();
        if (document.getElementById('view-agenda') && !document.getElementById('view-agenda').classList.contains('hide')) {
            renderAgenda();
        }
        return;
    }

    appt.status = 'done';

    if (paymentType === 'pending' && (!appt.client || !appt.client.trim())) {
        showNotification('Fiado exige um cliente vinculado ao agendamento!', 'error');
        return;
    }

    const clientId = findOrCreateClient(appt.client);
    let totalProductsPrice = 0;
    let totalProductCommission = 0;
    const globalCommPercent = parseFloat(db.settings.productCommission) || 0;

    currentCheckoutProducts.forEach(p => {
        totalProductsPrice += p.price;
        totalProductCommission += (p.price * globalCommPercent / 100);

        // Baixa no estoque
        const invItem = db.inventory.find(i => i.id === p.id);
        if(invItem && invItem.quantity > 0) {
            invItem.quantity--;
            db.stockMovements.push({
                id: getID(),
                date: getLocalIsoDate(),
                productId: p.id,
                productName: p.name,
                type: 'out',
                quantity: 1,
                reason: `Venda Agendamento: ${appt.client}`
            });
            checkLowStock(invItem);
        }
    });

    const isPending = (paymentType === 'pending');

    const t = {
        id: getID(),
        type: 'income',
        description: `Serviço: ${appt.serviceName} + ${currentCheckoutProducts.length} prod(s) - ${appt.client}`,
        amount: appt.price + totalProductsPrice,
        date: appt.date,
        proId: appt.proId,
        proName: appt.proName,
        serviceId: appt.serviceId,
        clientId: clientId,
        commission: (appt.commissionVal || 0) + totalProductCommission,
        isPending: isPending,
        productsOrigin: currentCheckoutProducts.map(p => ({id: p.id, name: p.name, price: p.price})),
        appointmentId: appt.id
    };

    db.transactions.push(t);
    save();
    renderDashboard();
    if (document.getElementById('view-agenda') && !document.getElementById('view-agenda').classList.contains('hide')) {
        renderAgenda();
    }
    closeModal('checkoutApptModal');

    if(isPending) {
        showNotification('Fiado lançado na ficha do cliente!', 'warning');
    } else {
        showNotification('Corte e produtos finalizados no caixa!', 'success');
    }
}
function cancelAppt(id) {
    if (confirm('Cancelar este agendamento?')) {
        const index = db.appointments.findIndex(a => a.id === id);
        if (index !== -1) {
            db.appointments[index].status = 'canceled';
            save();
            renderDashboard();
            if (document.getElementById('view-agenda') && !document.getElementById('view-agenda').classList.contains('hide')) {
                renderAgenda();
            }
            showNotification('Agendamento cancelado!', 'success');
        }
    }
}

// EDIT FUNCTIONS
function editTeam(id) {
    const professional = db.team.find(p => p.id === id);
    if (professional) {
        openTeamModal(professional);
    }
}

function editService(id) {
    const service = db.services.find(s => s.id === id);
    if (service) {
        openServiceModal(service);
    }
}

function editClient(id) {
    const client = db.clients.find(c => c.id === id);
    if (client) {
        openClientModal(client);
    }
}

function editAppt(id) {
    const appt = db.appointments.find(a => a.id === id);
    if (!appt) return;

    // Abrir o modal base (que limpa e carrega serviços/pros)
    openApptModal();

    // Preencher campos
    document.getElementById('ap-id').value = appt.id;
    document.getElementById('ap-client').value = appt.client;
    document.getElementById('ap-date').value = appt.date;
    document.getElementById('ap-time').value = appt.time;
    document.getElementById('ap-service').value = appt.serviceId;
    document.getElementById('ap-pro').value = appt.proId;

    // Atualizar valor exibido
    updateApptValue();
}

// REPORTS
function generateReport() {
    const start = document.getElementById('rep-start').value;
    const end = document.getElementById('rep-end').value;

    if (!start || !end) {
        alert('Selecione um período.');
        return;
    }

    let income = 0;
    let expense = 0;
    let commission = 0;
    const serviceCounts = {};

    db.transactions.forEach(t => {
        if (isDateInRange(t.date, start, end)) {
            const val = parseFloat(t.amount || 0);

            if (t.type === 'income' && !t.isPending) {
                income += val;
                commission += parseFloat(t.commission || 0);

                // Track services
                let svcName = '';
                if (t.serviceId) {
                    const svc = db.services.find(s => s.id === t.serviceId);
                    if (svc) {
                        svcName = svc.name;
                    }
                }
                if (!svcName && t.description && t.description.startsWith('Serviço:')) {
                    svcName = t.description.split(' - ')[0].replace('Serviço: ', '').trim();
                    svcName = svcName.split(' + ')[0].trim();
                }
                if (svcName) {
                    serviceCounts[svcName] = (serviceCounts[svcName] || 0) + 1;
                }

            } else if (t.type === 'expense') {
                expense += val;
            }
        }
    });

    // Update UI
    document.getElementById('rep-inc').innerText = fmtMoney(income);
    document.getElementById('rep-exp').innerText = fmtMoney(expense);
    document.getElementById('rep-com').innerText = fmtMoney(commission);

    // Top Services
    const sortedServices = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const topSvcsEl = document.getElementById('top-services');
    topSvcsEl.innerHTML = sortedServices.map(([name, count], i) => `
        <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-3">
                <span class="font-bold text-slate-400 dark:text-slate-600">#${i + 1}</span>
                <span class="font-medium text-slate-700 dark:text-slate-300">${name}</span>
            </div>
            <span class="bg-blue-100 dark:bg-blue-900/30 text-brand-blue dark:text-brand-lightblue text-xs font-bold px-2 py-1 rounded-full">${count} cortes</span>
        </div>
    `).join('') || '<p class="text-sm text-slate-400 dark:text-slate-500 text-center">Nenhum serviço neste período.</p>';

    document.getElementById('report-result').classList.remove('hide');
}

function generateMonthReport() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const daysInMonth = new Date(y, now.getMonth() + 1, 0).getDate();

    const startStr = `${y}-${m}-01`;
    const endStr = `${y}-${m}-${String(daysInMonth).padStart(2, '0')}`;

    document.getElementById('rep-start').value = startStr;
    document.getElementById('rep-end').value = endStr;

    generateReport();
}

function shareReport() {
    const start = document.getElementById('rep-start').value;
    const end = document.getElementById('rep-end').value;
    const inc = document.getElementById('rep-inc').innerText;
    const exp = document.getElementById('rep-exp').innerText;
    const com = document.getElementById('rep-com').innerText;

    if (!start || !end) {
        alert('Gere um relatório primeiro!');
        return;
    }

    const fmtDateBr = (d) => d.split('-').reverse().join('/');

    const text = `📊 *Relatório Financeiro*
📅 Período: ${fmtDateBr(start)} a ${fmtDateBr(end)}

💰 *Receita:* ${inc}
💸 *Despesas:* ${exp}
🤝 *Comissões:* ${com}

Gerado pelo Sistema de Gestão.`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}
function findOrCreateClient(name) {
    let client = db.clients.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!client) {
        client = {
            id: getID(),
            name,
            createdAt: getLocalIsoString()
        };
        db.clients.push(client);
    }
    return client.id;
}
// COMMISSIONS
let currentCommissionData = null;
function payCommission(proId) {
    const pendingTransactions = db.transactions.filter(t =>
        t.proId === proId && t.type === 'income' && !t.commissionPaid
    );
    if (pendingTransactions.length === 0) {
        alert('Não há comissões pendentes para este barbeiro.');
        return;
    }
    const totalCommission = pendingTransactions.reduce((sum, t) => sum + (t.commission || 0), 0);
    const professional = db.team.find(t => t.id === proId);
    // Store data for the modal actions
    currentCommissionData = {
        proId: proId,
        proName: professional.name,
        amount: totalCommission,
        date: getLocalIsoDate()
    };
    // Fill Modal
    document.getElementById('comm-pro-name').innerText = professional.name;
    document.getElementById('comm-value').innerText = fmtMoney(totalCommission);
    // Show Modal
    document.getElementById('commissionModal').classList.remove('hidden');
}
function confirmCommissionPayment() {
    if (!currentCommissionData) return;
    // Generate Expense
    const expenseTransaction = {
        id: getID(),
        description: `Pagamento Comissão: ${currentCommissionData.proName}`,
        amount: currentCommissionData.amount,
        date: currentCommissionData.date,
        category: 'comissao'
    };
    db.transactions.push(expenseTransaction);
    // Mark transactions as paid
    db.transactions.forEach(t => {
        if (t.proId === currentCommissionData.proId && t.type === 'income' && !t.commissionPaid) {
            t.commissionPaid = true;
            t.commissionPaidDate = currentCommissionData.date;
        }
    });
    save();
    renderFinance(); // Ensure finance view updates if active
    renderTeam();    // Refresh team list to disable button
    closeModal('commissionModal');
    showNotification('Comissão paga com sucesso!', 'success');
    currentCommissionData = null;
}
function shareCommissionWhatsApp() {
    if (!currentCommissionData) return;

    const salonName = db.settings.businessName || 'SUA BARBEARIA';
    const date = new Date().toLocaleDateString('pt-BR');
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let msg = `🧾 *RECIBO DE COMISSÃO*\n`;
    msg += `💈 *${salonName.toUpperCase()}*\n`;
    msg += `📅 Data: ${date} às ${time}\n`;
    msg += `--------------------------------\n`;
    msg += `👤 *Profissional:* ${currentCommissionData.proName}\n`;
    msg += `💰 *Valor Pago:* ${fmtMoney(currentCommissionData.amount)}\n`;
    msg += `--------------------------------\n`;
    msg += `✅ *PAGAMENTO REALIZADO*\n`;
    msg += `_Comprovante digital gerado pelo sistema._`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

function printCommissionReceipt() {
    if (!currentCommissionData) return;

    const salonName = db.settings.businessName || 'SUA BARBEARIA';
    const date = new Date().toLocaleDateString('pt-BR');
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const createReceiptBlock = (title) => `
        <div style="font-family: 'Courier New', monospace; padding: 10px; max-width: 300px; margin: 0 auto; border: 1px dashed #000; margin-bottom: 20px;">
            <h2 style="text-align: center; margin: 0; font-size: 18px;">${salonName.toUpperCase()}</h2>
            <p style="text-align: center; font-size: 12px; margin: 5px 0 15px 0; border-bottom: 1px solid #000; padding-bottom: 5px;">${title}</p>

            <p style="margin: 5px 0; font-size: 12px;"><strong>DATA:</strong> ${date} ${time}</p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>PROFISSIONAL:</strong><br>${currentCommissionData.proName}</p>
            <p style="margin: 5px 0; font-size: 12px;"><strong>TIPO:</strong> COMISSÃO DE SERVIÇOS</p>

            <table style="width: 100%; margin-top: 15px; border-top: 1px dashed #000;">
                <tr>
                    <td style="font-size: 16px; padding-top: 5px;"><strong>TOTAL PAGO:</strong></td>
                    <td style="font-size: 16px; text-align: right; padding-top: 5px;"><strong>${fmtMoney(currentCommissionData.amount)}</strong></td>
                </tr>
            </table>

            <div style="margin-top: 30px; text-align: center;">
                <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
                <p style="font-size: 10px; margin: 0;">ASSINATURA DO PROFISSIONAL</p>
            </div>

            <div style="margin-top: 25px; text-align: center;">
                <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
                <p style="font-size: 10px; margin: 0;">ASSINATURA DO RESPONSÁVEL</p>
            </div>

            <p style="text-align: center; font-size: 9px; margin-top: 15px; color: #666;">Sistema de Gestão - ${new Date().getFullYear()}</p>
        </div>
    `;

    const content = `
        <html>
        <head>
            <title>Recibo de Comissão</title>
            <style>
                @media print {
                    body { margin: 0; padding: 0; }
                    @page { margin: 0; }
                }
            </style>
        </head>
        <body>
            ${createReceiptBlock('RECIBO - VIA DO PROFISSIONAL')}
            <div style="text-align: center; margin: 10px 0; font-size: 10px; color: #999;">----------------- CORTE AQUI -----------------</div>
            ${createReceiptBlock('RECIBO - VIA DA BARBEARIA')}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank', 'width=350,height=800');
    win.document.write(content);
    win.document.close();
}
function printClosing() {
    const inc = document.getElementById('close-inc').textContent;
    const exp = document.getElementById('close-exp').textContent;
    const com = document.getElementById('close-com').textContent;
    const bal = document.getElementById('close-bal').textContent;
    const salonName = db.settings.businessName || 'SUA BARBEARIA';
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    const receiptHTML = `
                <div style="font-family: 'Courier New', monospace; padding: 40px; max-width: 800px; margin: 0 auto; color: #000;">
                    <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 20px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">${salonName}</h1>
                        <p style="margin: 5px 0; font-size: 14px;">RELATÓRIO DE FECHAMENTO DE CAIXA</p>
                        <p style="margin: 5px 0; font-size: 12px;">Data: ${dateStr} - Hora: ${timeStr}</p>
                    </div>
                    <div style="margin-bottom: 30px;">
                        <h3 style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 15px;">RESUMO FINANCEIRO</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">(+) Total de Entradas</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${inc}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">(-) Despesas Operacionais</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${exp}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">(-) Comissões Pagas/Previstas</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${com}</td>
                            </tr>
                            <tr style="font-size: 18px;">
                                <td style="padding: 15px 0; font-weight: bold;">(=) SALDO EM CAIXA</td>
                                <td style="padding: 15px 0; text-align: right; font-weight: bold;">${bal}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="margin-top: 50px;">
                        <div style="border: 1px solid #000; padding: 15px; font-size: 12px; text-align: center; margin-bottom: 50px;">
                            <p style="font-weight: bold; margin-bottom: 5px;">DECLARAÇÃO DE CONFERÊNCIA</p>
                            <p>Declaro que os valores acima conferem com o numerário físico e comprovantes em caixa nesta data.</p>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 40px;">
                            <div style="flex: 1; text-align: center;">
                                <div style="border-top: 1px solid #000; padding-top: 10px;">
                                    Responsável pelo Caixa
                                </div>
                            </div>
                            <div style="flex: 1; text-align: center;">
                                <div style="border-top: 1px solid #000; padding-top: 10px;">
                                    Gerência / Auditoria
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px dotted #ccc; padding-top: 10px;">
                        Documento gerado eletronicamente por Sistema de Gestão V4 Pro<br>
                        ${new Date().toLocaleString('pt-BR')}
                    </div>
                </div>
            `;
    // 3. Criar Iframe Invisível (Técnica Robusta)
    const iframe = document.createElement('iframe');
    // Posicionamento fora da tela (melhor que display:none para impressão)
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    document.body.appendChild(iframe);
    // 4. Escrever e Imprimir
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(receiptHTML);
    doc.close();
    // Executar com pequeno delay para garantir renderização das fontes
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Limpeza após impressão
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 2000);
    }, 500);
}
function updatePrintHeaders() {
    const s = db.settings;
    // Header estilo Barbearia (Ajustado)
    const headerHTML = `
                <div class="print-header" style="text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px;">
                    <h2 style="font-size: 24px; font-weight: bold; color: #000; margin: 0; text-transform: uppercase; font-family: 'Courier New', monospace;">${s.businessName || 'BARBEARIA'}</h2>
                    <p style="font-size: 14px; color: #000; margin: 5px 0 0 0; font-family: 'Courier New', monospace;">RELATÓRIO GERENCIAL</p>
                    <p style="font-size: 12px; color: #000; margin: 0; font-family: 'Courier New', monospace;">${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
            `;
    const containers = [
        document.getElementById('report-result')
    ];
    containers.forEach(container => {
        if (!container) return;
        const existing = container.querySelector('.print-header');
        if (existing) existing.outerHTML = headerHTML;
        else container.insertAdjacentHTML('afterbegin', headerHTML);
    });
}
function printReport() {
    updatePrintHeaders();
    window.print();
}
function printFinanceReport() {
    updatePrintHeaders();
    window.print();
}
// SETTINGS
function saveBusinessInfo() {
    db.settings.businessName = document.getElementById('biz-name').value;
    db.settings.businessOwner = document.getElementById('biz-owner').value;
    db.settings.businessDoc = document.getElementById('biz-doc').value;
    // db.settings.businessHours = document.getElementById('biz-hours').value; // Deprecated

    db.settings.agendaInterval = parseInt(document.getElementById('agenda-interval').value) || 60;
    db.settings.businessStart = parseInt(document.getElementById('hour-start-week').value) || 8;
    db.settings.businessEnd = parseInt(document.getElementById('hour-end-week').value) || 20;

    db.settings.workDays = {
        saturday: {
            active: !document.getElementById('closed-sat').checked,
            start: parseInt(document.getElementById('hour-start-sat').value) || 9,
            end: parseInt(document.getElementById('hour-end-sat').value) || 18
        },
        sunday: {
            active: !document.getElementById('closed-sun').checked,
            start: parseInt(document.getElementById('hour-start-sun').value) || 9,
            end: parseInt(document.getElementById('hour-end-sun').value) || 14
        }
    };

    const prodComm = parseFloat(document.getElementById('biz-prod-comm').value);
    db.settings.productCommission = isNaN(prodComm) ? 0 : prodComm;
    save();
    showNotification('Informações salvas com sucesso!', 'success');
}

function toggleDayInput(day) {
    const isClosed = document.getElementById(`closed-${day}`).checked;
    const wrapper = document.getElementById(`wrapper-${day}`);
    if (wrapper) {
        if (isClosed) {
            wrapper.classList.add('opacity-50', 'pointer-events-none');
        } else {
            wrapper.classList.remove('opacity-50', 'pointer-events-none');
        }
    }
}
// BACKUP E RESTAURAÇÃO
function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "brand_barbearia_backup.json");
    document.body.appendChild(downloadAnchorNode); // Required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showNotification('Backup baixado! Guarde em local seguro (nuvem/email).', 'success');
}

// NOTIFICATION SYSTEM
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-600 dark:bg-green-500',
        error: 'bg-red-600 dark:bg-red-500',
        info: 'bg-blue-600 dark:bg-brand-blue',
        warning: 'bg-orange-500'
    };
    const colorClass = colors[type] || colors.info;

    // Criar elemento
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colorClass} text-white px-6 py-3 rounded-xl shadow-2xl z-[100] transform transition-all duration-300 translate-y-[-20%] opacity-0 flex items-center gap-2 font-bold backdrop-blur-md border border-white/10`;
    notification.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" class="w-5 h-5"></i>
        <span>${sanitizeHTML(message)}</span>
    `;

    document.body.appendChild(notification);
    lucide.createIcons();

    // Animar entrada
    requestAnimationFrame(() => {
        notification.classList.remove('translate-y-[-20%]', 'opacity-0');
    });

    // Remover após 3 segundos
    setTimeout(() => {
        notification.classList.add('translate-y-[-20%]', 'opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 3500);
}

function restoreBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const backup = JSON.parse(e.target.result);

            // Validação de estrutura básica (Security Audit)
            const isValidBackupStructure =
                backup &&
                typeof backup === 'object' &&
                !Array.isArray(backup) &&
                backup.settings &&
                typeof backup.settings === 'object' &&
                !Array.isArray(backup.settings) &&
                Array.isArray(backup.appointments);

            if (!isValidBackupStructure) {
                showNotification('Arquivo inválido: Estrutura irreconhecível ou incompleta.', 'error');
                return;
            }

            // Validação rigorosa de tipos (Security Audit)
            const arrayKeys = ['appointments', 'team', 'services', 'transactions', 'clients', 'inventory', 'stockMovements'];

            const isArraysValid = arrayKeys.every(key => Array.isArray(backup[key] || [])); // Allow missing keys as empty arrays
            const isObjectsValid = backup.settings && typeof backup.settings === 'object' && !Array.isArray(backup.settings);

            if (isArraysValid && isObjectsValid) {
                // Sanitização profunda do backup antes de carregar
                const sanitizeObj = (obj) => {
                    if (typeof obj === 'string') return sanitizeHTML(obj);
                    if (Array.isArray(obj)) return obj.map(sanitizeObj);
                    if (typeof obj === 'object' && obj !== null) {
                        Object.keys(obj).forEach(key => {
                            obj[key] = sanitizeObj(obj[key]);
                        });
                        return obj;
                    }
                    return obj;
                };

                const sanitized = sanitizeObj(backup);

                // Merge seguro com fallback a partir do defaultDB
                db = {
                    appointments: sanitized.appointments || [],
                    team: sanitized.team || JSON.parse(JSON.stringify(defaultDB.team)),
                    services: sanitized.services || JSON.parse(JSON.stringify(defaultDB.services)),
                    clients: sanitized.clients || [],
                    transactions: sanitized.transactions || [],
                    inventory: sanitized.inventory || [],
                    stockMovements: sanitized.stockMovements || [],
                    settings: { ...defaultDB.settings, ...(sanitized.settings || {}) }
                };

                save();
                showNotification('Backup restaurado com sucesso! Atualizando...', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification('Arquivo corrompido ou formato incompatível.', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Erro ao processar arquivo. Tente novamente.', 'error');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('Tem certeza que deseja limpar TODOS os dados? Esta ação é irreversível!')) {
        db.appointments = [];
        db.transactions = [];
        save();
        renderDashboard();
        renderFinance();
        showNotification('Todos os dados foram removidos!', 'success');
    }
}
function factoryReset() {
    if (confirm('ATENÇÃO: Isso resetará TODO o sistema para as configurações de fábrica. Todos os dados serão perdidos. Tem certeza?')) {
        localStorage.removeItem(DB_KEY);
        location.reload();
    }
}
function clearFinanceFilters() {
    const nowObj = new Date();
    const firstDayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-01`;
    const today = getLocalIsoDate();
    document.getElementById('search-term').value = '';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-start').value = firstDayStr;
    document.getElementById('filter-end').value = today;
    renderFinance();
}
// UTILITÁRIOS GERAIS
function updateDataStatus() {
    const totalAppts = db.appointments.length;
    const totalServices = db.services.length;
    const totalClients = db.clients.length;
    // Status dos dados atualizado
}

// OFFLINE SUPPORT
window.addEventListener('online', () => {
    showNotification('Conexão restaurada!', 'success');
});
window.addEventListener('offline', () => {
    showNotification('Modo offline ativado. Seus dados estão seguros localmente.', 'warning');
});
// === MANUAL INTERATIVO PADRONIZADO ===
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
function markSectionComplete(sectionId) {
    let completed = JSON.parse(localStorage.getItem('brand_manual_completed') || '[]');
    if (!completed.includes(sectionId)) {
        completed.push(sectionId);
        localStorage.setItem('brand_manual_completed', JSON.stringify(completed));
        showNotification('Etapa concluída!', 'success');
    }
    updateTutorialProgress();
}
function updateTutorialProgress() {
    const sections = ['instalacao', 'primeiro-cadastro', 'agendamentos', 'relatorios', 'backup', 'duvidas', 'checklist'];
    const completed = JSON.parse(localStorage.getItem('brand_manual_completed') || '[]');
    const total = sections.length;
    const percent = Math.round((completed.length / total) * 100);
    const progressBar = document.getElementById('tutorial-progress');
    const completedSteps = document.getElementById('completed-steps');
    if (progressBar) progressBar.style.width = percent + '%';
    if (completedSteps) completedSteps.textContent = `${completed.length}/${total} etapas`;
    // Atualizar visual dos botões
    sections.forEach(id => {
        const btn = document.querySelector(`[onclick="scrollToSection('${id}')"]`);
        if (btn) {
            if (completed.includes(id)) {
                btn.classList.add('bg-green-100', 'dark:bg-green-900/30', 'border-green-300', 'dark:border-green-800/50', 'text-green-700', 'dark:text-green-400');
                btn.classList.remove('border-gray-200', 'dark:border-white/10');
            } else {
                btn.classList.remove('bg-green-100', 'dark:bg-green-900/30', 'border-green-300', 'dark:border-green-800/50', 'text-green-700', 'dark:text-green-400');
                btn.classList.add('border-gray-200', 'dark:border-white/10');
            }
        }
    });
}
function updateChecklist() {
    const checkboxes = document.querySelectorAll('#checklist input[type="checkbox"]');
    const totalTasks = checkboxes.length;
    let completedTasks = 0;
    const checklistState = {};
    checkboxes.forEach(cb => {
        checklistState[cb.id] = cb.checked;
        if (cb.checked) completedTasks++;
        // Estilo visual do item
        const item = cb.closest('.checklist-item');
        if (item) {
            if (cb.checked) {
                item.classList.add('opacity-60');
                item.querySelector('span').classList.add('line-through');
            } else {
                item.classList.remove('opacity-60');
                item.querySelector('span').classList.remove('line-through');
            }
        }
    });
    localStorage.setItem('brand_checklist_state', JSON.stringify(checklistState));
    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const percentEl = document.getElementById('checklist-percent');
    const progressEl = document.getElementById('checklist-progress');
    const completedEl = document.getElementById('checklist-completed');
    const totalEl = document.getElementById('checklist-total');
    if (percentEl) percentEl.textContent = percent + '%';
    if (progressEl) progressEl.style.width = percent + '%';
    if (completedEl) completedEl.textContent = completedTasks;
    if (totalEl) totalEl.textContent = totalTasks;
    // Atualizar próximas tarefas
    const nextTasks = document.getElementById('next-tasks');
    if (nextTasks) {
        const unchecked = Array.from(checkboxes).filter(cb => !cb.checked).slice(0, 2);
        if (unchecked.length > 0) {
            nextTasks.innerHTML = unchecked.map(cb => {
                const text = cb.nextElementSibling.textContent;
                return `<div class="flex items-center gap-2 text-xs text-gray-300">
                                    <i data-lucide="circle" class="w-3 h-3"></i>
                                    <span>${text}</span>
                                </div>`;
            }).join('');
        } else {
            nextTasks.innerHTML = `<div class="flex items-center gap-2 text-xs text-green-400 font-bold">
                                                <i data-lucide="check-circle" class="w-3 h-3"></i>
                                                <span>Tudo em dia!</span>
                                            </div>`;
        }
        lucide.createIcons();
    }
}
function loadChecklistState() {
    const saved = JSON.parse(localStorage.getItem('brand_checklist_state') || '{}');
    Object.keys(saved).forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = saved[id];
    });
    updateChecklist();
}
function showExample(type) {
    showNotification(`Exemplo de ${type} carregado!`, 'info');
}
// INICIALIZAR APLICATIVO
document.addEventListener('DOMContentLoaded', init);
// Carregar estado do manual ao carregar página
document.addEventListener('DOMContentLoaded', () => {
    updateTutorialProgress();
    loadChecklistState();

    // Auto-check receipt status
    const confirmed = localStorage.getItem('ml_receipt_confirmed');
    if (confirmed === 'true') {
        const btn = document.getElementById('btn-confirm-terms');
        const badge = document.getElementById('terms-accepted-badge');
        const dateEl = document.getElementById('terms-date');

        if (btn && badge) {
            btn.classList.add('hidden');
            badge.classList.remove('hidden');
            if (dateEl) dateEl.textContent = 'Confirmado em: ' + (localStorage.getItem('ml_receipt_date') || 'Anteriormente');
        }
    }
});

// Função consolidada em checkAirlock e blocos superiores

// ==========================================
// MISSING MODAL FUNCTIONS (Restored)
// ==========================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openTeamModal(professional = null) {
    const modal = document.getElementById('teamModal');
    if (!modal) return;

    // Reset form
    document.getElementById('tm-id').value = '';
    document.getElementById('tm-name').value = '';
    document.getElementById('tm-comm').value = '50';

    if (professional) {
        document.getElementById('tm-id').value = professional.id;
        document.getElementById('tm-name').value = professional.name;
        document.getElementById('tm-comm').value = professional.commission;
    }
    modal.classList.remove('hidden');
}

function openServiceModal(service = null) {
    const modal = document.getElementById('serviceModal');
    if (!modal) return;

    // Reset form
    document.getElementById('svc-id').value = '';
    document.getElementById('svc-name').value = '';
    document.getElementById('svc-price').value = '';

    if (service) {
        document.getElementById('svc-id').value = service.id;
        document.getElementById('svc-name').value = service.name;
        document.getElementById('svc-price').value = service.price;
    }
    modal.classList.remove('hidden');
}

function openClientModal(client = null) {
    const modal = document.getElementById('clientModal');
    if (!modal) return;

    // Clear fields first
    document.getElementById('cli-id').value = '';
    document.getElementById('cli-name').value = '';
    document.getElementById('cli-phone').value = '';
    document.getElementById('cli-email').value = '';
    document.getElementById('cli-birthdate').value = '';
    document.getElementById('cli-notes').value = '';

    if (client) {
        document.getElementById('cli-id').value = client.id;
        document.getElementById('cli-name').value = client.name;
        document.getElementById('cli-phone').value = client.phone;
        document.getElementById('cli-email').value = client.email || '';
        document.getElementById('cli-birthdate').value = client.birthDate || '';
        document.getElementById('cli-notes').value = client.notes || '';
    }
    modal.classList.remove('hidden');
}

// ==========================================
// CONTROLE DE ESTOQUE
// ==========================================
const INVENTORY_CATEGORIES = {
    cosmeticos: 'Cosméticos',
    laminas: 'Lâminas/Descartáveis',
    higiene: 'Higiene',
    equipamentos: 'Equipamentos',
    bebidas: 'Bebidas',
    outros: 'Outros'
};
const MOVEMENT_REASONS = {
    compra: 'Compra',
    venda: 'Venda',
    uso_interno: 'Uso Interno',
    perda: 'Perda/Avaria',
    ajuste: 'Ajuste Manual'
};

function getProductStatus(product) {
    if (product.quantity <= 0) return { label: 'Esgotado', key: 'critical', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' };
    if (product.quantity <= product.minQuantity) return { label: 'Baixo', key: 'low', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400' };
    return { label: 'OK', key: 'ok', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' };
}

function getInventoryStats() {
    const totalProducts = db.inventory.length;
    const totalValue = db.inventory.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const lowStock = db.inventory.filter(p => p.quantity <= p.minQuantity).length;
    const movementsMonth = db.stockMovements.filter(m => isSameLocalMonth(m.date, new Date())).length;
    return { totalProducts, totalValue, lowStock, movementsMonth };
}

function checkLowStock(product) {
    if (!product) return;
    if (product.quantity <= 0) {
        setTimeout(() => showNotification(`🔴 ESGOTADO: "${product.name}" sem estoque!`, 'warning'), 1500);
    } else if (product.quantity <= (product.minQuantity || product.minStock || 2)) {
        setTimeout(() => showNotification(`⚠️ Estoque baixo: "${product.name}" (${product.quantity} un)`, 'warning'), 1500);
    }
}

function renderInventory() {
    const stats = getInventoryStats();
    document.getElementById('inv-total-products').textContent = stats.totalProducts;
    document.getElementById('inv-total-value').textContent = fmtMoney(stats.totalValue);
    document.getElementById('inv-low-stock').textContent = stats.lowStock;
    document.getElementById('inv-movements-month').textContent = stats.movementsMonth;

    const searchTerm = (document.getElementById('inv-search')?.value || '').toLowerCase();
    const filterCategory = document.getElementById('inv-filter-category')?.value || 'all';
    const filterStatus = document.getElementById('inv-filter-status')?.value || 'all';

    let filtered = db.inventory.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
            (p.supplier && p.supplier.toLowerCase().includes(searchTerm));
        const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
        const status = getProductStatus(p);
        const matchesStatus = filterStatus === 'all' || status.key === filterStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const tbody = document.getElementById('inventory-list');
    const emptyMsg = document.getElementById('inv-empty-msg');

    if (filtered.length === 0 && db.inventory.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        emptyMsg.innerHTML = `
            <i data-lucide="package-open" class="w-16 h-16 mx-auto mb-4 text-slate-200 dark:text-slate-700"></i>
            <p class="text-slate-400 dark:text-slate-500 font-medium">Nenhum produto cadastrado</p>
            <p class="text-xs text-slate-300 dark:text-slate-600 mt-1">Clique em "Novo Produto" para começar</p>
        `;
    } else if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        emptyMsg.innerHTML = `
            <i data-lucide="search-x" class="w-12 h-12 mx-auto mb-3 text-slate-200 dark:text-slate-700"></i>
            <p class="text-slate-400 dark:text-slate-500 font-medium">Nenhum produto encontrado</p>
            <p class="text-xs text-slate-300 dark:text-slate-600 mt-1">Tente ajustar os filtros</p>
        `;
    } else {
        emptyMsg.classList.add('hidden');
        tbody.innerHTML = filtered.map(p => {
            const status = getProductStatus(p);
            const catLabel = INVENTORY_CATEGORIES[p.category] || p.category;
            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-white/5 transition-colors">
                    <td class="px-6 py-4">
                        <div class="font-medium text-slate-800 dark:text-white">${sanitizeHTML(p.name)}</div>
                        ${p.supplier ? `<div class="text-xs text-slate-400 dark:text-slate-500">${sanitizeHTML(p.supplier)}</div>` : ''}
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">${sanitizeHTML(catLabel)}</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="font-bold text-lg ${p.quantity <= p.minQuantity ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}">${p.quantity}</span>
                    </td>
                    <td class="px-6 py-4 text-center text-slate-500 dark:text-slate-400">${p.minQuantity}</td>
                    <td class="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">${fmtMoney(p.unitPrice)}</td>
                    <td class="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">${fmtMoney(parseFloat(p.price || p.unitPrice) || 0)}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${status.color}">${status.label}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-1">
                            <button onclick="openStockMovementModal('${p.id}')" class="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Movimentar">
                                <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
                            </button>
                            <button onclick="openInventoryModal(db.inventory.find(x=>x.id==='${p.id}'))" class="p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button onclick="deleteInventoryProduct('${p.id}')" class="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Excluir">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderRecentMovements();
    lucide.createIcons();
}

function renderRecentMovements() {
    const container = document.getElementById('inv-movements-list');
    const emptyEl = document.getElementById('inv-movements-empty');
    const recent = [...db.stockMovements]
        .sort((a, b) => compareIsoDate(b.date, a.date))
        .slice(0, 15);

    if (recent.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    container.innerHTML = recent.map(m => {
        const isIn = m.type === 'in';
        const reasonLabel = MOVEMENT_REASONS[m.reason] || m.reason;
        return `
            <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-50 dark:border-white/5">
                <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}">
                    <i data-lucide="${isIn ? 'arrow-down-left' : 'arrow-up-right'}" class="w-4 h-4 ${isIn ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start">
                        <p class="text-sm font-medium text-slate-800 dark:text-white truncate">${sanitizeHTML(m.productName)}</p>
                        <span class="text-xs font-bold flex-shrink-0 ml-2 ${isIn ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${isIn ? '+' : '-'}${m.quantity}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] text-slate-400 dark:text-slate-500">${fmtDate(m.date)}</span>
                        <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">${sanitizeHTML(reasonLabel)}</span>
                        ${m.notes ? `<span class="text-[10px] text-slate-400 dark:text-slate-600 truncate">${sanitizeHTML(m.notes)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterInventory() {
    renderInventory();
}

function openInventoryModal(product = null) {
    const modal = document.getElementById('inventoryModal');
    if (!modal) return;

    document.getElementById('inv-id').value = '';
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-category').value = 'cosmeticos';
    document.getElementById('inv-price').value = '';
    document.getElementById('inv-sell-price').value = '';
    document.getElementById('inv-quantity').value = '';
    document.getElementById('inv-min-quantity').value = '';
    document.getElementById('inv-supplier').value = '';
    document.getElementById('inv-notes').value = '';
    document.getElementById('inv-modal-title').textContent = 'Novo Produto';

    if (product) {
        document.getElementById('inv-id').value = product.id;
        document.getElementById('inv-name').value = product.name;
        document.getElementById('inv-category').value = product.category;
        document.getElementById('inv-price').value = product.unitPrice;
        document.getElementById('inv-sell-price').value = product.price || '';
        document.getElementById('inv-quantity').value = product.quantity;
        document.getElementById('inv-min-quantity').value = product.minQuantity;
        document.getElementById('inv-supplier').value = product.supplier || '';
        document.getElementById('inv-notes').value = product.notes || '';
        document.getElementById('inv-modal-title').textContent = 'Editar Produto';
    }

    modal.classList.remove('hidden');
    lucide.createIcons();
}

function submitInventoryProduct(e) {
    e.preventDefault();
    const id = document.getElementById('inv-id').value;
    const name = document.getElementById('inv-name').value.trim();
    const category = document.getElementById('inv-category').value;
    const unitPrice = parseFloat(document.getElementById('inv-price').value) || 0;
    const price = parseFloat(document.getElementById('inv-sell-price').value) || 0;
    const quantity = parseInt(document.getElementById('inv-quantity').value) || 0;
    const minQuantity = parseInt(document.getElementById('inv-min-quantity').value) || 0;
    const supplier = document.getElementById('inv-supplier').value.trim();
    const notes = document.getElementById('inv-notes').value.trim();

    if (!name) {
        showNotification('Nome do produto é obrigatório!', 'warning');
        return;
    }

    if (id) {
        const idx = db.inventory.findIndex(p => p.id === id);
        if (idx !== -1) {
            const oldQty = db.inventory[idx].quantity;
            db.inventory[idx] = { ...db.inventory[idx], name, category, unitPrice, price, quantity, minQuantity, supplier, notes };
            if (quantity !== oldQty) {
                const diff = quantity - oldQty;
                db.stockMovements.push({
                    id: getID(),
                    productId: id,
                    productName: name,
                    type: diff > 0 ? 'in' : 'out',
                    quantity: Math.abs(diff),
                    reason: 'ajuste',
                    date: getLocalIsoDate(),
                    notes: 'Ajuste via edição do produto'
                });
            }
            showNotification('Produto atualizado com sucesso!', 'success');
        }
    } else {
        const newProduct = {
            id: getID(),
            name,
            category,
            unitPrice,
            price,
            quantity,
            minQuantity,
            supplier,
            notes,
            createdAt: getLocalIsoString()
        };
        db.inventory.push(newProduct);
        if (quantity > 0) {
            db.stockMovements.push({
                id: getID(),
                productId: newProduct.id,
                productName: name,
                type: 'in',
                quantity,
                reason: 'ajuste',
                date: getLocalIsoDate(),
                notes: 'Estoque inicial'
            });
        }
        showNotification('Produto cadastrado com sucesso!', 'success');
    }

    save();
    closeModal('inventoryModal');
    renderInventory();
}

function deleteInventoryProduct(id) {
    const product = db.inventory.find(p => p.id === id);
    if (!product) return;
    if (!confirm(`Excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`)) return;

    db.inventory = db.inventory.filter(p => p.id !== id);
    db.stockMovements = db.stockMovements.filter(m => m.productId !== id);
    save();
    renderInventory();
    showNotification('Produto excluído.', 'info');
}

function openStockMovementModal(productId = null) {
    const modal = document.getElementById('stockMovementModal');
    if (!modal) return;

    const select = document.getElementById('mov-product');
    select.innerHTML = '<option value="">Selecione um produto...</option>' +
        db.inventory.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${sanitizeHTML(p.name)} (${p.quantity} un)</option>`).join('');

    document.getElementById('mov-type').value = 'in';
    document.getElementById('mov-quantity').value = '';
    document.getElementById('mov-reason').value = 'compra';
    document.getElementById('mov-notes').value = '';

    if (productId) {
        updateMovementProductInfo();
    } else {
        document.getElementById('mov-product-info').classList.add('hidden');
    }

    modal.classList.remove('hidden');
    lucide.createIcons();
}

function updateMovementProductInfo() {
    const productId = document.getElementById('mov-product').value;
    const infoDiv = document.getElementById('mov-product-info');
    if (!productId) {
        infoDiv.classList.add('hidden');
        return;
    }
    const product = db.inventory.find(p => p.id === productId);
    if (product) {
        document.getElementById('mov-current-stock').textContent = product.quantity + ' unidades';
        infoDiv.classList.remove('hidden');
    }
}

function submitStockMovement(e) {
    e.preventDefault();
    const productId = document.getElementById('mov-product').value;
    const type = document.getElementById('mov-type').value;
    const quantity = parseInt(document.getElementById('mov-quantity').value) || 0;
    const reason = document.getElementById('mov-reason').value;
    const notes = document.getElementById('mov-notes').value.trim();

    if (!productId) {
        showNotification('Selecione um produto!', 'warning');
        return;
    }
    if (quantity <= 0) {
        showNotification('Quantidade deve ser maior que zero!', 'warning');
        return;
    }

    const product = db.inventory.find(p => p.id === productId);
    if (!product) return;

    if (type === 'out' && product.quantity < quantity) {
        showNotification(`Estoque insuficiente! Disponível: ${product.quantity} unidades.`, 'warning');
        return;
    }

    // Atualizar quantidade do produto
    if (type === 'in') {
        product.quantity += quantity;
    } else {
        product.quantity -= quantity;
    }

    const today = getLocalIsoDate();
    const movementId = getID();

    // Registrar movimentação de estoque
    db.stockMovements.push({
        id: movementId,
        productId,
        productName: product.name,
        type,
        quantity,
        reason,
        date: today,
        notes
    });

    // ==========================================
    // INTEGRAÇÃO FINANCEIRA AUTOMÁTICA
    // Compra → Despesa | Venda → Receita | Perda → Despesa
    // ==========================================
    const totalAmount = quantity * product.unitPrice;

    if (reason === 'compra') {
        // Compra de produto = DESPESA no financeiro
        db.transactions.push({
            id: getID(),
            date: today,
            description: `Compra: ${quantity}x ${product.name}`,
            amount: totalAmount,
            type: 'expense',
            category: 'Estoque - Compra',
            proName: null,
            proId: null,
            clientId: null,
            stockMovementId: movementId,
            productId: productId
        });
    } else if (reason === 'venda') {
        // Venda de produto = RECEITA no financeiro
        db.transactions.push({
            id: getID(),
            date: today,
            description: `Venda Produto: ${quantity}x ${product.name}`,
            amount: totalAmount,
            type: 'income',
            category: 'Estoque - Venda',
            proName: null,
            proId: null,
            clientId: null,
            commission: 0,
            stockMovementId: movementId,
            productId: productId
        });
    } else if (reason === 'perda') {
        // Perda/Avaria = DESPESA (prejuízo) no financeiro
        db.transactions.push({
            id: getID(),
            date: today,
            description: `Perda/Avaria: ${quantity}x ${product.name}`,
            amount: totalAmount,
            type: 'expense',
            category: 'Estoque - Perda',
            proName: null,
            proId: null,
            clientId: null,
            stockMovementId: movementId,
            productId: productId
        });
    }

    save();
    closeModal('stockMovementModal');
    renderInventory();

    const actionText = type === 'in' ? 'Entrada' : 'Saída';
    showNotification(`${actionText} de ${quantity}x ${product.name} registrada!`, 'success');

    // Notificação de lançamento financeiro
    if (reason === 'compra' || reason === 'venda' || reason === 'perda') {
        const finType = reason === 'venda' ? 'Receita' : 'Despesa';
        setTimeout(() => {
            showNotification(`💰 ${finType} de ${fmtMoney(totalAmount)} registrada no Financeiro (${MOVEMENT_REASONS[reason]})`, 'info');
        }, 800);
    }

    // Alerta de estoque baixo
    if (product.quantity <= product.minQuantity && product.quantity > 0) {
        setTimeout(() => {
            showNotification(`⚠️ Atenção: "${product.name}" está com estoque baixo (${product.quantity} un)!`, 'warning');
        }, 2000);
    } else if (product.quantity <= 0) {
        setTimeout(() => {
            showNotification(`🔴 ALERTA: "${product.name}" esgotou!`, 'warning');
        }, 2000);
    }
}


