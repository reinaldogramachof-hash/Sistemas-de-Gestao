(function () {
    // V11.5 - SMART LOCK (Status Check with namespace migration)
    let licenseKey = localStorage.getItem('barbearia_license');
    let licenseEmail = localStorage.getItem('barbearia_email');
    let deviceId = localStorage.getItem('barbearia_device');

    // Migração transparente do legado
    if (!licenseKey) {
        const legacyKey = localStorage.getItem('plena_license');
        const legacyEmail = localStorage.getItem('ml_license_email');
        const legacyDevice = localStorage.getItem('device_id');
        const legacyReceipt = localStorage.getItem('ml_receipt_confirmed');

        if (legacyKey && legacyEmail) {
            licenseKey = legacyKey;
            licenseEmail = legacyEmail;
            deviceId = legacyDevice || ('dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36));

            localStorage.setItem('barbearia_license', licenseKey);
            localStorage.setItem('barbearia_email', licenseEmail);
            localStorage.setItem('barbearia_device', deviceId);
            if (legacyReceipt) {
                localStorage.setItem('barbearia_receipt_confirmed', legacyReceipt);
            }
        }
    }

    // Garante deviceId se logado
    if (!deviceId && (licenseKey || licenseEmail)) {
        deviceId = localStorage.getItem('device_id') || ('dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36));
        localStorage.setItem('barbearia_device', deviceId);
    }

    // 1. Verificação Básica de Existência
    if (!licenseKey || !licenseEmail) {
        // Redireciona para ativação se não houver licença, exceto na página de entrada
        const isEntryPage = window.location.pathname.endsWith('index.html') ||
            window.location.pathname.endsWith('/') ||
            window.location.pathname === '';

        if (!isEntryPage) {
            console.log('Acesso negado: Redirecionando para ativação.');
            window.location.href = 'index.html';
        }
        return;
    }

    // 2. Smart Lock: Verificação de Status Online (Silenciosa)
    // Se tiver internet, valida se a chave foi bloqueada/cancelada
    if (navigator.onLine) {
        const API_CHECK = '../api_licenca_ml.php?action=verify';

        fetch(API_CHECK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                license_key: licenseKey,
                email: licenseEmail,
                device_id: deviceId
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.license_status === 'blocked') {
                    console.warn('Licença BLOCKED pelo servidor.');
                    localStorage.removeItem('barbearia_license'); // Mata a sessão
                    localStorage.removeItem('barbearia_email');
                    localStorage.removeItem('plena_license');
                    localStorage.removeItem('ml_license_email');
                    window.location.href = 'access_denied.html'; // Chuta para página de bloqueio
                }
            })
            .catch(err => {
                // Falha silenciosa (servidor offline ou erro de rede).
                // O sistema continua funcionando (Standalone Promise).
                console.log('Smart Lock: Verificação offline mantida.');
            });
    }

    console.log('Filtro de Segurança: Licença ativa localmente.');
})();