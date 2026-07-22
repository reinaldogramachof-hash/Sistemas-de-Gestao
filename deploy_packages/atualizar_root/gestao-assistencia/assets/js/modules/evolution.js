const EVOLUTION_FEATURES = {
    cloudBackup: { status: 'premium', plan: 'premium_monthly', title: 'Backup em Nuvem', description: 'Proteja os dados da sua assistência com sincronização automática e segura na nuvem.', icon: 'cloud', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    multiUser: { status: 'premium', plan: 'premium_monthly', title: 'Multiusuário/Equipe', description: 'Cadastre técnicos e atendentes com permissões de acesso e controle de comissões na nuvem.', icon: 'users', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    multiDevice: { status: 'premium', plan: 'premium_monthly', title: 'Acesso Multi-dispositivo', description: 'Acesse o sistema simultaneamente de computadores, tablets ou celulares de qualquer lugar.', icon: 'smartphone', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    customerPortal: { status: 'premium', plan: 'premium_monthly', title: 'Portal do Cliente O.S.', description: 'Permita que seus clientes consultem o status e histórico de suas O.S. online pelo site.', icon: 'globe', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    whatsappAuto: { status: 'premium', plan: 'premium_monthly', title: 'WhatsApp Automático', description: 'Envie alertas de conclusão, orçamentos e mensagens de pós-venda diretamente pelo WhatsApp.', icon: 'message-circle', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    advReports: { status: 'premium', plan: 'premium_monthly', title: 'Relatórios Avançados', description: 'Gráficos de BI, análise de performance técnica e lucratividade consolidada online.', icon: 'bar-chart-3', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' },
    warrantyMgmt: { status: 'premium', plan: 'premium_monthly', title: 'Gestão de Garantias e Pós-venda', description: 'Controle de prazos de garantia ativa e campanhas de fidelização pós-serviço.', icon: 'shield', cta: 'Conhecer recurso', message: 'Este recurso fará parte da evolução Premium Online Mensal.' }
};

function renderEvolutionCenter() {
    const container = document.getElementById('evolution-cards');
    if (!container) return;

    const themeColors = {
        bg: 'bg-white dark:bg-slate-800',
        border: 'border-slate-100 dark:border-white/5',
        textTitle: 'text-slate-800 dark:text-white',
        textDesc: 'text-slate-600 dark:text-slate-400',
        cta: 'text-brand-primary hover:text-brand-dark'
    };
    const iconColors = {
        cloudBackup: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
        multiUser: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        multiDevice: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        customerPortal: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
        whatsappAuto: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        advReports: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
        warrantyMgmt: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
    };

    let html = '';
    for (const [key, feature] of Object.entries(EVOLUTION_FEATURES)) {
        let badgeHtml = `<span class="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full uppercase tracking-wide">Premium Online</span>`;
        const iColor = iconColors[key] || 'bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400';

        html += `
        <div class="${themeColors.bg} rounded-2xl p-6 shadow-sm border ${themeColors.border} flex flex-col hover:shadow-md transition-shadow">
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
    const feature = EVOLUTION_FEATURES[featureKey] || {};
    const featureTitle = feature.title || featureKey;
    const notify = (msg, type) => {
        if (typeof showNotification === 'function') {
            showNotification(msg, type);
        } else {
            const el = document.createElement('div');
            el.className = `fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-2xl z-[100] transform transition-all duration-300 font-bold border border-white/10 ${
                type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-blue-600'
            }`;
            el.innerText = msg;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 4000);
        }
    };

    notify(`Registrando interesse no recurso premium: ${featureTitle}...`, 'info');

    // Registro comercial assíncrono (Fase 2)
    try {
        const licenseKey = localStorage.getItem('assistencia_license') || '';
        const email = localStorage.getItem('assistencia_email') || '';

        fetch('../api_licenca_ml.php?action=register_evolution_lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                license_key: licenseKey,
                email: email,
                system_id: 'gestao-assistencia',
                feature_key: featureKey,
                feature_title: featureTitle,
                source: 'evolution_module'
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.status === 'success') {
                notify(`Interesse registrado! O recurso "${featureTitle}" estará disponível na evolução online.`, 'success');
            } else {
                notify(`Interesse registrado localmente. Não foi possível enviar agora.`, 'warning');
            }
        })
        .catch(err => {
            console.warn('Erro ao registrar interesse (offline):', err);
            notify(`Não foi possível registrar no momento devido à falta de conexão.`, 'error');
        });
    } catch (e) {
        console.error('Falha ao processar registro comercial:', e);
        notify(`Não foi possível registrar no momento.`, 'error');
    }
}
