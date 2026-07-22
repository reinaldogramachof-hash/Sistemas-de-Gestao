/**
 * Lock.js - Guardião de Segurança V12.1 (Receipt + Trial + Email Capture + Namespace Migration)
 * Padrão ML Factory - Confirm Receipt System
 */
(function () {
    const LICENSE_KEY = 'beleza_license';
    const EMAIL_KEY = 'beleza_email';
    const DEVICE_KEY = 'beleza_device';
    const RECEIPT_KEY = 'beleza_receipt_confirmed';
    const API_URL = '../api_licenca_ml.php';

    // Migração transparente do legado
    let licenseKey = localStorage.getItem(LICENSE_KEY);
    let licenseEmail = localStorage.getItem(EMAIL_KEY);
    let deviceId = localStorage.getItem(DEVICE_KEY);

    if (!licenseKey) {
        const legacyKey = localStorage.getItem('plena_license');
        const legacyEmail = localStorage.getItem('ml_license_email');
        const legacyDevice = localStorage.getItem('device_id');
        const legacyReceipt = localStorage.getItem('ml_receipt_confirmed');

        if (legacyKey && legacyEmail) {
            licenseKey = legacyKey;
            licenseEmail = legacyEmail;
            deviceId = legacyDevice || ('dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36));

            localStorage.setItem(LICENSE_KEY, licenseKey);
            localStorage.setItem(EMAIL_KEY, licenseEmail);
            localStorage.setItem(DEVICE_KEY, deviceId);
            if (legacyReceipt) {
                localStorage.setItem(RECEIPT_KEY, legacyReceipt);
            }
        }
    }

    if (!deviceId && (licenseKey || licenseEmail)) {
        deviceId = localStorage.getItem('device_id') || ('dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36));
        localStorage.setItem(DEVICE_KEY, deviceId);
    }

    function getLocalLicense() {
        return localStorage.getItem(LICENSE_KEY);
    }

    async function checkStatus() {
        const key = getLocalLicense();
        const email = localStorage.getItem(EMAIL_KEY);

        if (!key || !email) {
            redirectToLogin("Ative sua licença para continuar.");
            return;
        }

        try {
            const res = await fetch(API_URL + '?action=verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license_key: key,
                    email: email,
                    device_id: deviceId
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                if (data.license_status === 'expired') {
                    blockSystem("Seu período de teste acabou.", "Adquira a versão vitalícia para continuar usando seus dados.");
                } else if (data.license_status === 'blocked') {
                    // Limpa sessões
                    localStorage.removeItem(LICENSE_KEY);
                    localStorage.removeItem(EMAIL_KEY);
                    localStorage.removeItem('plena_license');
                    localStorage.removeItem('ml_license_email');
                    blockSystem("Licença Bloqueada", "Entre em contato com o suporte.");
                } else {
                    // ATIVO ou TRIAL VÁLIDO
                    if (!localStorage.getItem(RECEIPT_KEY)) {
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

    // Mantém compatibilidade com elementos do DOM que usam unlockSystem
    window.unlockSystem = function() {
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

    function unlockSystem() {
        window.unlockSystem();
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