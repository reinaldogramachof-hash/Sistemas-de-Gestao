// ============================================================
// MÓDULO DE NOTIFICAÇÕES — Gestão Assistência Pro v5.0 (Hardened)
// Busca notificações em sistemasdegestao.tech/api_notificacoes.php
// ============================================================

const NOTIF_API_URL   = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '../api_notificacoes.php' : 'https://sistemasdegestao.tech/api_notificacoes.php';
const NOTIF_TARGET    = 'assistencia';
const NOTIF_READ_KEY  = 'ml_notif_read_assistencia';
const NOTIF_CACHE_KEY = 'ml_notif_cache_assistencia';
const NOTIF_MAX       = 10;

let _notifData = []; // lista processada e filtrada

// ── Helper de Sanitização HTML ────────────────────────────
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ── Formatação Segura de Data ─────────────────────────────
function formatPublishedDate(published) {
    if (!published) return 'Data não informada';
    const dateObj = new Date(published);
    if (isNaN(dateObj.getTime())) return 'Data não informada';
    try {
        return dateObj.toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Data não informada';
    }
}

// ── Inicialização e Background Refresh ──────────────────────
function initNotifications() {
    if (window.__notificationsInitialized) return;
    window.__notificationsInitialized = true;

    setupNotifContainerListeners();
    fetchNotifications();

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            fetchNotifications(true);
        }
    });
}

// ── Configuração de Listeners sem Handler Inline ─────────
function setupNotifContainerListeners() {
    const container = document.getElementById('notif-list');
    if (!container || container.__notifListenerAttached) return;
    container.__notifListenerAttached = true;

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-notif-id]');
        if (btn) {
            const id = btn.getAttribute('data-notif-id');
            if (id) markAsRead(id);
        }
    });
}

// ── Fetch com cache de 30 min ─────────────────────────────
async function fetchNotifications(forceNetwork = false) {
    const cached = (() => { try { return JSON.parse(localStorage.getItem(NOTIF_CACHE_KEY)); } catch { return null; } })();
    const now = Date.now();

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const cacheTime = isLocal ? 0 : 30 * 60 * 1000;

    if (!forceNetwork && cached && (now - cached.fetchedAt) < cacheTime) {
        processNotifications(cached.data);
        return;
    }

    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const licenseKey = localStorage.getItem('assistencia_license') || '';
        const res   = await fetch(`${NOTIF_API_URL}?target=${NOTIF_TARGET}&license=${licenseKey}&_t=${now}`, {
            signal: ctrl.signal,
            cache: 'no-store'
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const isDataChanged = !cached || JSON.stringify(cached.data) !== JSON.stringify(data);

        localStorage.setItem(NOTIF_CACHE_KEY, JSON.stringify({ data, fetchedAt: now }));

        if (isDataChanged || !forceNetwork) {
            processNotifications(data);
        }
    } catch (e) {
        if (cached) {
            processNotifications(cached.data);
        } else {
            const container = document.getElementById('notif-list');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-20 text-slate-400 dark:text-slate-500">
                        <i data-lucide="wifi-off" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
                        <p class="font-medium text-sm">Erro de conexão</p>
                        <p class="text-xs mt-1">Não foi possível carregar as notificações.</p>
                    </div>`;
                if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
            }
        }
    }
}

// ── Filtragem, ordenação e limite ─────────────────────────
function processNotifications(rawList) {
    const now = new Date();
    _notifData = (rawList || [])
        .map((n, idx) => ({
            ...n,
            id: n && n.id !== undefined && n.id !== null ? String(n.id) : (`notif_fallback_${idx}`)
        }))
        .filter(n => {
            const targets      = n.targets || ['all'];
            const validTarget  = targets.includes('all') || targets.includes(NOTIF_TARGET);
            const notExpired   = !n.expires || isNaN(new Date(n.expires).getTime()) || new Date(n.expires) > now;
            return validTarget && notExpired;
        })
        .sort((a, b) => {
            const timeA = a.published ? new Date(a.published).getTime() : 0;
            const timeB = b.published ? new Date(b.published).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        })
        .slice(0, NOTIF_MAX);

    updateNotifBadge();
    renderNotifications();
}

// ── Leitura / marcação ─────────────────────────────────────
function _getReadIds() {
    try { return JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '[]'); }
    catch { return []; }
}

function markAsRead(id) {
    const read = _getReadIds();
    const strId = String(id);
    if (!read.includes(strId)) {
        read.push(strId);
        localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(read));
    }
    updateNotifBadge();
    renderNotifications();
}

function markAllAsRead() {
    localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(_notifData.map(n => String(n.id))));
    updateNotifBadge();
    renderNotifications();
}

// ── Badge ─────────────────────────────────────────────────
function updateNotifBadge() {
    const read  = _getReadIds();
    const count = _notifData.filter(n => !read.includes(String(n.id))).length;
    document.querySelectorAll('.notif-badge').forEach(badge => {
        badge.textContent = count > 9 ? '9+' : count;
        badge.classList.toggle('hidden', count === 0);
    });
}

// ── Render da view Notificações (Hardened) ───────────────
function renderNotifications() {
    const container = document.getElementById('notif-list');
    if (!container) return;

    setupNotifContainerListeners();
    const read = _getReadIds();

    if (_notifData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 text-slate-400 dark:text-slate-500">
                <i data-lucide="bell-off" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
                <p class="font-medium text-sm">Nenhuma notificação disponível</p>
                <p class="text-xs mt-1">Novidades, atualizações e avisos aparecerão aqui</p>
            </div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
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
        const strId = String(n.id);
        const isRead = read.includes(strId);
        const tc     = typeMap[n.type] || typeMap.info;
        const date   = formatPublishedDate(n.published);
        const pulse  = !isRead ? '<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block ml-1 align-middle"></span>' : '';

        const safeId      = escapeHtml(strId);
        const safeTitle   = escapeHtml(n.title);
        const safeBody    = escapeHtml(n.body);
        const safeDetails = n.details ? escapeHtml(n.details) : '';
        const safeVersion = n.version ? escapeHtml(n.version) : '';
        const safeLabel   = escapeHtml(tc.label);

        return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md ${isRead ? 'border-slate-200 dark:border-white/10 opacity-70' : 'border-blue-500/40 dark:border-blue-500/30'} p-6 lg:p-8 transition-all">
            <div class="flex flex-col sm:flex-row items-start justify-between gap-6">
                <div class="flex items-start gap-4 lg:gap-6 flex-1 min-w-0 w-full">
                    <div class="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-${tc.color}-100 dark:bg-${tc.color}-900/30 flex items-center justify-center shrink-0 mt-1">
                        <i data-lucide="${tc.icon}" class="w-6 h-6 lg:w-8 lg:h-8 text-${tc.color}-600 dark:text-${tc.color}-400"></i>
                    </div>
                    <div class="flex-1 min-w-0 w-full">
                        <div class="flex flex-wrap items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                            <span class="text-xs lg:text-sm font-bold bg-${tc.color}-100 dark:bg-${tc.color}-900/30 text-${tc.color}-700 dark:text-${tc.color}-400 px-3 py-1 rounded-full uppercase tracking-widest">${safeLabel}</span>
                            ${pulse}
                            <span class="text-xs lg:text-sm font-medium text-slate-500 dark:text-slate-400">${date}</span>
                            ${safeVersion ? `<span class="text-xs lg:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">v${safeVersion}</span>` : ''}
                        </div>
                        <h4 class="font-extrabold text-slate-800 dark:text-white text-lg lg:text-2xl mb-2 lg:mb-3">${safeTitle}</h4>
                        <p class="text-base lg:text-lg text-slate-700 dark:text-slate-300 leading-relaxed lg:leading-loose whitespace-pre-wrap">${safeBody}</p>
                        ${safeDetails ? `<div class="bg-slate-50 dark:bg-slate-800/50 p-4 lg:p-5 rounded-xl border border-slate-100 dark:border-slate-700 mt-4 lg:mt-6"><p class="text-sm lg:text-base text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">${safeDetails}</p></div>` : ''}
                    </div>
                </div>
                <div class="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-slate-100 dark:border-slate-700 sm:border-0 flex justify-end">
                    ${!isRead
                        ? `<button data-notif-id="${safeId}" class="btn-mark-as-read w-full sm:w-auto text-sm lg:text-base bg-blue-500/10 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-600 text-blue-600 hover:text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2"><i data-lucide="check" class="w-5 h-5"></i> Marcar como Lida</button>`
                        : `<div class="text-xs lg:text-sm font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><i data-lucide="check-check" class="w-4 h-4"></i> Já lida</div>`
                    }
                </div>
            </div>
        </div>`;
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

// ── Auto-inicialização ─────────────────────────────────────
(function _autoInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initNotifications());
    } else {
        initNotifications();
    }
})();

// Expor globalmente
window.escapeHtml = escapeHtml;
window.formatPublishedDate = formatPublishedDate;
window.initNotifications = initNotifications;
window.fetchNotifications = fetchNotifications;
window.markAsRead = markAsRead;
window.markAllAsRead = markAllAsRead;
window.renderNotifications = renderNotifications;
