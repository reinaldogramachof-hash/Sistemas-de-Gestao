/**
 * Lock.js - Guardião de Segurança V12.1 (Receipt + Trial + Email Capture)
 * Padrão ML Factory - Confirm Receipt System
 */
(function () {
    const LICENSE_KEY = 'plena_license';
    const EMAIL_KEY = 'ml_license_email';
    const API_URL = '../api_licenca_ml.php';

    function getLocalLicense() {
        return localStorage.getItem(LICENSE_KEY);
    }

    async function checkStatus() {
        // --- MASTER PASSWORD BYPASS ---
        if (localStorage.getItem('ml_master_mode') === 'true') {
            unlockSystem();
            console.log('🔓 Master Mode Enabled - API Check Skipped');
            return;
        }

        const key = getLocalLicense();

        if (!key) {
            redirectToLogin("Ative sua licença para continuar.");
            return;
        }

        try {
            const res = await fetch(API_URL + '?action=verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_key: key })
            });
            const data = await res.json();

            if (data.status === 'success') {
                if (data.license_status === 'expired') {
                    blockSystem("Seu período de teste acabou.", "Adquira a versão vitalícia para continuar usando seus dados.");
                } else if (data.license_status === 'blocked') {
                    blockSystem("Licença Bloqueada", "Entre em contato com o suporte.");
                } else {
                    // ATIVO ou TRIAL VÁLIDO
                    if (!localStorage.getItem('ml_receipt_confirmed') && localStorage.getItem('ml_master_mode') !== 'true') {
                        hideApp();
                        const login = document.getElementById('view-login');
                        if (login) login.style.display = 'none';
                        const receiptModal = document.getElementById('welcome-receipt-modal');
                        if (receiptModal) receiptModal.classList.remove('hidden');
                    } else {
                        unlockSystem();
                        if (data.is_trial && data.expiration_date) {
                            showTrialBanner(data.expiration_date);
                        }
                    }
                }
            } else {
                redirectToLogin("Licença inválida ou não encontrada.");
            }

        } catch (e) {
            console.warn("Erro ao verificar licença (offline?):", e);
            // Fail-open se já tem chave local (evita bloquear usuários offline)
            if (key) unlockSystem();
        }
    }

    // --- UI HELPERS ---

    function redirectToLogin(msg) {
        const login = document.getElementById('view-login');
        if (login) {
            login.classList.remove('hide');
            login.style.display = 'flex';
            const msgEl = login.querySelector('p.text-slate-500, p.subtitle, .login-subtitle');
            if (msgEl) msgEl.innerText = msg;
        }
        hideApp();
    }

    function blockSystem(titleText, msgText) {
        const login = document.getElementById('view-login');
        if (login) {
            login.classList.remove('hide');
            login.style.display = 'flex';

            const h3 = login.querySelector('h3, h2');
            const p = login.querySelector('p.text-slate-500, p.subtitle, .login-subtitle');
            const btn = login.querySelector("button[type='submit'], #btn-activate");

            if (h3) h3.innerText = titleText;
            if (p) {
                p.innerHTML = `${msgText}<br><br><a href="../loja/checkout.html" class="text-blue-600 font-bold underline">COMPRAR VERSÃO VITALÍCIA</a>`;
            }
            if (btn) btn.innerText = "Já comprei (Ativar)";
        }
        hideApp();
    }

    function hideApp() {
        const sidebar = document.getElementById('sidebar');
        const main = document.querySelector('main');
        const header = document.querySelector('header');
        if (sidebar) sidebar.style.display = 'none';
        if (main) main.style.display = 'none';
        if (header) header.style.display = 'none';
    }

    function unlockSystem() {
        const login = document.getElementById('view-login');
        if (login) {
            login.classList.add('hide');
        }
        const sidebar = document.getElementById('sidebar');
        const main = document.querySelector('main');
        const header = document.querySelector('header');
        if (sidebar) sidebar.style.display = '';
        if (main) main.style.display = '';
        if (header) header.style.display = '';
    }

    function showTrialBanner(expDate) {
        const old = document.getElementById('trial-banner');
        if (old) old.remove();

        const exp = new Date(expDate);
        const now = new Date();
        const diffHrs = Math.ceil((exp - now) / (1000 * 60 * 60));

        if (diffHrs <= 0) return;

        const banner = document.createElement('div');
        banner.id = 'trial-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f97316;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            pointer-events: none;
        `;
        banner.innerHTML = `⏳ Teste Grátis: Restam ${diffHrs}h`;
        document.body.appendChild(banner);
    }

    // INIT
    document.addEventListener('DOMContentLoaded', checkStatus);
    setInterval(checkStatus, 5 * 60 * 1000);

})();
