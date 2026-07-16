(function () {
    // V11.4 - SMART LOCK (Status Check)
    const licenseKey = localStorage.getItem('plena_license');
    const licenseEmail = localStorage.getItem('ml_license_email');

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
        // Endpoint relativo, assume que lock.js está na raiz do app (ex: /gestao-barbearia/lock.js)
        const API_CHECK = '../api_licenca_ml.php?action=verify';

        fetch(API_CHECK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: licenseKey, email: licenseEmail })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.license_status === 'blocked') {
                    console.warn('Licença BLOCKED pelo servidor.');
                    localStorage.removeItem('plena_license'); // Mata a sessão
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
