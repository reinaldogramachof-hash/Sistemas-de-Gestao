// ============================================================
// MÓDULO DE NOTIFICAÇÕES — Gestão Barbearia Pro v4.2
// Busca notificações em sistemasdegestao.tech/api_notificacoes.php
// ============================================================

const NOTIF_API_URL   = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '../api_notificacoes.php' : 'https://sistemasdegestao.tech/api_notificacoes.php';
const NOTIF_TARGET    = 'barbearia';
const NOTIF_READ_KEY  = 'ml_notif_read_barber';
const NOTIF_CACHE_KEY = 'ml_notif_cache_barber';
const NOTIF_MAX       = 10;

let _notifData = []; // lista processada e filtrada

// ── Inicialização e Background Refresh ──────────────────────
function initNotifications() {
    fetchNotifications();

    // Auto-atualizar silenciosamente quando o usuário voltar para a aba
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            fetchNotifications(true);
        }
    });
}

// ── Fetch com cache de 30 min ─────────────────────────────
async function fetchNotifications(forceNetwork = false) {
    const cached = (() => { try { return JSON.parse(localStorage.getItem(NOTIF_CACHE_KEY)); } catch { return null; } })();
    const now = Date.now();

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const cacheTime = isLocal ? 0 : 30 * 60 * 1000;

    // Usar cache se fresco (< 30 min em produção, 0 em local para testes), e se não for forceNetwork
    if (!forceNetwork && cached && (now - cached.fetchedAt) < cacheTime) {
        processNotifications(cached.data);
        return;
    }

    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        // cache:'no-store' garante que o browser nunca retorne resposta em cache
        const res   = await fetch(`${NOTIF_API_URL}?target=${NOTIF_TARGET}&_t=${now}`, {
            signal: ctrl.signal,
            cache: 'no-store'
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        // Verifica se os dados chegaram diferentes para re-renderizar
        const isDataChanged = !cached || JSON.stringify(cached.data) !== JSON.stringify(data);
        
        localStorage.setItem(NOTIF_CACHE_KEY, JSON.stringify({ data, fetchedAt: now }));
        
        if (isDataChanged || !forceNetwork) {
            processNotifications(data);
        }
    } catch (e) {
        // Offline ou erro → usar cache antigo silenciosamente
        if (cached) {
            processNotifications(cached.data);
        } else {
            // Se falhar e não tiver cache, remove o spinner de carregamento e exibe erro de conexão
            const container = document.getElementById('notif-list');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-20 text-slate-400 dark:text-slate-500">
                        <i data-lucide="wifi-off" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
                        <p class="font-medium text-sm">Erro de conexão</p>
                        <p class="text-xs mt-1">Não foi possível carregar as notificações.</p>
                    </div>`;
                lucide.createIcons();
            }
        }
    }
}

// ── Filtragem, ordenação e limite ─────────────────────────
function processNotifications(rawList) {
    const now = new Date();
    _notifData = (rawList || [])
        .filter(n => {
            const targets    = n.targets || ['all'];
            const validTarget  = targets.includes('all') || targets.includes(NOTIF_TARGET);
            const notExpired   = !n.expires || new Date(n.expires) > now;
            return validTarget && notExpired;
        })
        .sort((a, b) => new Date(b.published) - new Date(a.published))
        .slice(0, NOTIF_MAX);

    updateNotifBadge();
    renderNotifications(); // ← CORREÇÃO: sempre re-renderizar a lista após processar os dados
}

// ── Leitura / marcação ─────────────────────────────────────
function _getReadIds() {
    try { return JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '[]'); }
    catch { return []; }
}

function markAsRead(id) {
    const read = _getReadIds();
    if (!read.includes(id)) {
        read.push(id);
        localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(read));
    }
    updateNotifBadge();
    renderNotifications();
}

function markAllAsRead() {
    localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(_notifData.map(n => n.id)));
    updateNotifBadge();
    renderNotifications();
}

// ── Badge ─────────────────────────────────────────────────
function updateNotifBadge() {
    const read  = _getReadIds();
    const count = _notifData.filter(n => !read.includes(n.id)).length;
    document.querySelectorAll('.notif-badge').forEach(badge => {
        badge.textContent = count > 9 ? '9+' : count;
        badge.classList.toggle('hidden', count === 0);
    });
}

// ── Render da view Notificações ───────────────────────────
function renderNotifications() {
    const container = document.getElementById('notif-list');
    if (!container) return;

    const read = _getReadIds();

    if (_notifData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 text-slate-400 dark:text-slate-500">
                <i data-lucide="bell-off" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
                <p class="font-medium text-sm">Nenhuma notificação disponível</p>
                <p class="text-xs mt-1">Novidades, atualizações e avisos aparecerão aqui</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    const typeMap = {
        update:   { icon: 'rocket',       color: 'blue',  label: 'Atualização' },
        security: { icon: 'shield-alert', color: 'red',   label: 'Segurança'   },
        backup:   { icon: 'hard-drive',   color: 'amber', label: 'Backup'      },
        info:     { icon: 'info',         color: 'slate', label: 'Informativo' },
        promo:    { icon: 'tag',          color: 'green', label: 'Novidade'    },
    };

    container.innerHTML = _notifData.map(n => {
        const isRead = read.includes(n.id);
        const tc     = typeMap[n.type] || typeMap.info;
        // Removed invalid 'title' option from toLocaleString which causes RangeError in JS runtimes
        const date   = new Date(n.published).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        const pulse  = !isRead ? '<span class="w-2 h-2 rounded-full bg-brand-blue animate-pulse inline-block ml-1 align-middle"></span>' : '';

        return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md ${isRead ? 'border-slate-200 dark:border-white/10 opacity-70' : 'border-brand-blue/40 dark:border-brand-blue/30'} p-6 lg:p-8 transition-all">
            <div class="flex flex-col sm:flex-row items-start justify-between gap-6">
                <div class="flex items-start gap-4 lg:gap-6 flex-1 min-w-0 w-full">
                    <div class="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-${tc.color}-100 dark:bg-${tc.color}-900/30 flex items-center justify-center shrink-0 mt-1">
                        <i data-lucide="${tc.icon}" class="w-6 h-6 lg:w-8 lg:h-8 text-${tc.color}-600 dark:text-${tc.color}-400"></i>
                    </div>
                    <div class="flex-1 min-w-0 w-full">
                        <div class="flex flex-wrap items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                            <span class="text-xs lg:text-sm font-bold bg-${tc.color}-100 dark:bg-${tc.color}-900/30 text-${tc.color}-700 dark:text-${tc.color}-400 px-3 py-1 rounded-full uppercase tracking-widest">${tc.label}</span>
                            ${pulse}
                            <span class="text-xs lg:text-sm font-medium text-slate-500 dark:text-slate-400">${date}</span>
                            ${n.version ? `<span class="text-xs lg:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">v${n.version}</span>` : ''}
                        </div>
                        <h4 class="font-extrabold text-slate-800 dark:text-white text-lg lg:text-2xl mb-2 lg:mb-3">${n.title}</h4>
                        <p class="text-base lg:text-lg text-slate-700 dark:text-slate-300 leading-relaxed lg:leading-loose whitespace-pre-wrap">${n.body}</p>
                        ${n.details ? `<div class="bg-slate-50 dark:bg-slate-800/50 p-4 lg:p-5 rounded-xl border border-slate-100 dark:border-slate-700 mt-4 lg:mt-6"><p class="text-sm lg:text-base text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">${n.details}</p></div>` : ''}
                    </div>
                </div>
                <div class="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-slate-100 dark:border-slate-700 sm:border-0 flex justify-end">
                    ${!isRead
                        ? `<button onclick="markAsRead('${n.id}')" class="w-full sm:w-auto text-sm lg:text-base bg-brand-blue/10 hover:bg-brand-blue border border-brand-blue/30 hover:border-brand-blue text-brand-blue hover:text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2"><i data-lucide="check" class="w-5 h-5"></i> Marcar como Lida</button>`
                        : `<div class="text-xs lg:text-sm font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><i data-lucide="check-check" class="w-4 h-4"></i> Já lida</div>`
                    }
                </div>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

// ── Auto-inicialização (fallback) ─────────────────────────
// Garante que as notificações sejam inicializadas mesmo que
// o app_core.js cacheado pelo SW não chame initNotifications()
(function _autoInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initNotifications());
    } else {
        // DOM já carregou — inicializar imediatamente
        initNotifications();
    }
})();
