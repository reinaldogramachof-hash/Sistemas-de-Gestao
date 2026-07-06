// ============================================================
// MÓDULO DE NOTIFICAÇÕES — Gestão Beleza Pro
// Busca notificações em sistemasdegestao.tech/api_notificacoes.php
// ============================================================

const NOTIF_API_URL   = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '../api_notificacoes.php' : 'https://sistemasdegestao.tech/api_notificacoes.php';
const NOTIF_TARGET    = 'beleza';
const NOTIF_READ_KEY  = 'ml_notif_read_beleza';
const NOTIF_CACHE_KEY = 'ml_notif_cache_beleza';
const NOTIF_MAX       = 10;

let _notifData = []; // lista processada e filtrada

// ── Inicialização e Background Refresh ──────────────────────
function initNotifications() {
    // Trava de idempotência: evita registrar listeners duplicados
    if (window.__notificationsInitialized) return;
    window.__notificationsInitialized = true;

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
        const licenseKey = localStorage.getItem('plena_license') || '';
        // cache:'no-store' garante que o browser nunca retorne resposta em cache
        const res   = await fetch(`${NOTIF_API_URL}?target=${NOTIF_TARGET}&license=${licenseKey}&_t=${now}`, {
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
            <div class="text-center py-20 text-slate-500">
                <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <i data-lucide="bell-off" class="w-8 h-8 text-slate-400 opacity-60"></i>
                </div>
                <p class="font-bold text-white text-lg">Nenhuma notificação</p>
                <p class="text-sm mt-1 text-slate-400">Novidades e avisos aparecerão aqui</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    const typeMap = {
        update:   { icon: 'rocket',       label: 'Atualização', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', iconColor: 'text-blue-400' },
        security: { icon: 'shield-alert', label: 'Segurança',   bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', iconColor: 'text-rose-400' },
        backup:   { icon: 'hard-drive',   label: 'Backup',      bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', iconColor: 'text-amber-400' },
        info:     { icon: 'info',         label: 'Informativo', bg: 'bg-white/5',     border: 'border-white/10',    text: 'text-slate-300', iconColor: 'text-slate-400' },
        promo:    { icon: 'tag',          label: 'Novidade',    bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400', iconColor: 'text-emerald-400' },
    };

    container.innerHTML = _notifData.map(n => {
        const isRead = read.includes(n.id);
        const tc     = typeMap[n.type] || typeMap.info;
        const date   = new Date(n.published).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        const pulse  = !isRead ? '<span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)] inline-block ml-1 align-middle"></span>' : '';

        return `
        <div class="glass rounded-2xl border shadow-sm hover:shadow-glow ${isRead ? 'border-white/5 opacity-50' : 'border-white/20'} p-6 lg:p-8 transition-all">
            <div class="flex flex-col sm:flex-row items-start justify-between gap-6">
                <div class="flex items-start gap-4 lg:gap-6 flex-1 min-w-0 w-full">
                    <div class="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl ${tc.bg} flex items-center justify-center shrink-0 mt-1 border ${tc.border}">
                        <i data-lucide="${tc.icon}" class="w-6 h-6 lg:w-8 lg:h-8 ${tc.iconColor}"></i>
                    </div>
                    <div class="flex-1 min-w-0 w-full">
                        <div class="flex flex-wrap items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                            <span class="text-xs lg:text-sm font-bold ${tc.bg} ${tc.text} px-3 py-1 rounded-full border ${tc.border} uppercase tracking-widest">${tc.label}</span>
                            ${pulse}
                            <span class="text-xs lg:text-sm font-medium text-slate-400">${date}</span>
                            ${n.version ? '<span class="text-xs lg:text-sm font-bold bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-md">v' + n.version + '</span>' : ''}
                        </div>
                        <h4 class="font-extrabold text-white text-lg lg:text-2xl mb-2 lg:mb-3">${n.title}</h4>
                        <p class="text-base lg:text-lg text-slate-300 leading-relaxed lg:leading-loose whitespace-pre-wrap">${n.body}</p>
                        ${n.details ? '<div class="bg-black/20 p-4 lg:p-5 rounded-xl border border-white/5 mt-4 lg:mt-6"><p class="text-sm lg:text-base text-slate-400 leading-relaxed whitespace-pre-wrap">' + n.details + '</p></div>' : ''}
                    </div>
                </div>
                <div class="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/10 sm:border-0 flex justify-end">
                    ${!isRead
                        ? `<button onclick="markAsRead('${n.id}')" class="w-full sm:w-auto text-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2"><i data-lucide="check" class="w-4 h-4"></i> Marcar como Lida</button>`
                        : `<div class="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5"><i data-lucide="check-check" class="w-4 h-4"></i> Já lida</div>`
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
