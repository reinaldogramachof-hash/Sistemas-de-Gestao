const EVOLUTION_FEATURES = {
    cloudBackup: { status: 'premium', plan: 'online_premium', title: 'Backup em Nuvem', description: 'Proteja os dados da sua assistência com sincronização automática e segura na nuvem.', icon: 'cloud', cta: 'Tenho interesse', currentPlanCode: 'ml_lifetime', targetPlanCode: 'online_premium', interestType: 'feature' },
    multiUser: { status: 'essential', plan: 'online_essential', title: 'Multiusuário/Equipe', description: 'Cadastre técnicos e atendentes com permissões de acesso e controle de comissões na nuvem.', icon: 'users', cta: 'Tenho interesse', currentPlanCode: 'ml_lifetime', targetPlanCode: 'online_essential', interestType: 'feature' },
    multiDevice: { status: 'essential', plan: 'online_essential', title: 'Acesso Multi-dispositivo', description: 'Acesse o sistema simultaneamente de computadores, tablets ou celulares de qualquer lugar.', icon: 'smartphone', cta: 'Tenho interesse', currentPlanCode: 'ml_lifetime', targetPlanCode: 'online_essential', interestType: 'feature' },
    customerPortal: { status: 'premium', plan: 'online_premium', title: 'Portal do Cliente O.S.', description: 'Permita que seus clientes consultem o status e histórico de suas O.S. online pelo site.', icon: 'globe', cta: 'Tenho interesse', currentPlanCode: 'ml_lifetime', targetPlanCode: 'online_premium', interestType: 'feature' },
    whatsappAuto: { status: 'premium', plan: 'online_premium', title: 'WhatsApp Automático', description: 'Envie alertas de conclusão, orçamentos e mensagens de pós-venda diretamente pelo WhatsApp.', icon: 'message-circle', cta: 'Tenho interesse', currentPlanCode: 'ml_lifetime', targetPlanCode: 'online_premium', interestType: 'feature' },
    advReports: { status: 'premium', plan: 'online_premium', title: 'Relatórios Avançados', description: 'Gráficos de BI, análise de performance técnica e lucratividade consolidada online.', icon: 'bar-chart-3', cta: 'Tenho interesse', currentPlanCode: 'ml_lifetime', targetPlanCode: 'online_premium', interestType: 'feature' },
    warrantyMgmt: { status: 'premium', plan: 'online_premium', title: 'Gestão de Garantias e Pós-venda', description: 'Controle de prazos de garantia ativa e campanhas de fidelização pós-serviço.', icon: 'shield', cta: 'Tenho interesse', currentPlanCode: 'ml_lifetime', targetPlanCode: 'online_premium', interestType: 'feature' }
};

function renderEvolutionCenter() {
    const container = document.getElementById('evolution-cards');
    if (!container) return;

    let html = `
    <!-- Banner de Vitrine Comercial de Planos -->
    <div class="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-left">
        <!-- Plano Atual -->
        <div class="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border-2 border-emerald-500/30 dark:border-emerald-500/20 flex flex-col relative shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full uppercase tracking-wider">Plano Ativo</span>
                <i data-lucide="check-circle-2" class="w-6 h-6 text-emerald-500"></i>
            </div>
            <h3 class="text-xl font-extrabold text-slate-800 dark:text-white mb-1">Licença Vitalícia Local</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Sua licença local adquirida no Mercado Livre para 1 computador.</p>
            <div class="text-2xl font-black text-slate-700 dark:text-slate-200 mb-4">Ativo e Permanente</div>
            <ul class="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-6 flex-1">
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-500"></i> Gestão Completa de O.S. e Clientes</li>
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-500"></i> PDV Balcão e Controle de Estoque</li>
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-500"></i> Impressão de Comprovantes e Garantia</li>
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-emerald-500"></i> Operação 100% offline em 1 PC</li>
            </ul>
            <div class="text-[11px] text-slate-400 text-center italic">Sua licença local continua funcionando normalmente sem custos adicionais.</div>
        </div>

        <!-- Plano Online Essencial -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30 flex flex-col relative shadow-sm hover:shadow-md transition-all">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full uppercase tracking-wider">Evolução Cloud</span>
                <i data-lucide="cloud" class="w-6 h-6 text-blue-500"></i>
            </div>
            <h3 class="text-xl font-extrabold text-slate-800 dark:text-white mb-1">Online Essencial</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Expanda sua assistência para acesso remoto e múltiplos atendentes.</p>
            <div class="text-2xl font-black text-blue-600 dark:text-blue-400 mb-4">R$ 97,90 <span class="text-xs font-normal text-slate-500">/mês</span></div>
            <ul class="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-6 flex-1">
                <li class="flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4 text-blue-500"></i> Tudo do Plano Vitalício Local</li>
                <li class="flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4 text-blue-500"></i> Acesso Equipe (Atendentes e Técnicos)</li>
                <li class="flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4 text-blue-500"></i> Multi-dispositivo (PC, Tablet, Celular)</li>
                <li class="flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4 text-blue-500"></i> Backup Automático Seguro na Nuvem</li>
            </ul>
            <button onclick="showEvolutionToast('online_essential')" class="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                <i data-lucide="sparkles" class="w-4 h-4"></i> Solicitar Evolução do Sistema
            </button>
        </div>

        <!-- Plano Online Premium -->
        <div class="bg-gradient-to-b from-amber-500/5 to-orange-500/5 bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-amber-500/40 dark:border-amber-500/30 flex flex-col relative shadow-md">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-bold px-3 py-1 bg-amber-500 text-white rounded-full uppercase tracking-wider shadow-sm">Recomendado</span>
                <i data-lucide="crown" class="w-6 h-6 text-amber-500"></i>
            </div>
            <h3 class="text-xl font-extrabold text-slate-800 dark:text-white mb-1">Online Premium</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Automação total, portal do cliente e recursos avançados de pós-venda.</p>
            <div class="text-2xl font-black text-amber-600 dark:text-amber-400 mb-4">R$ 149,90 <span class="text-xs font-normal text-slate-500">/mês</span></div>
            <ul class="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-6 flex-1">
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-amber-500"></i> Tudo do Online Essencial</li>
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-amber-500"></i> Portal do Cliente O.S. (Consulta online)</li>
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-amber-500"></i> WhatsApp Automático de Notificações</li>
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-amber-500"></i> Relatórios Avançados e BI de Lucro</li>
                <li class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4 text-amber-500"></i> Gestão de Garantias e Pós-venda</li>
            </ul>
            <button onclick="showEvolutionToast('online_premium')" class="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
                <i data-lucide="zap" class="w-4 h-4"></i> Solicitar Evolução do Sistema
            </button>
        </div>

    </div>

    <!-- Divisor da Vitrine de Recursos -->
    <div class="col-span-full border-t border-slate-200 dark:border-white/10 pt-6 mb-4 text-left">
        <h4 class="text-lg font-bold text-slate-800 dark:text-white">Recursos Específicos para Manifestar Interesse</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400">Clique em "Tenho interesse" para registrar prioridade para sua assistência.</p>
    </div>
    `;

    for (const [key, feature] of Object.entries(EVOLUTION_FEATURES)) {
        let badgeHtml = `<span class="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full uppercase tracking-wide">Premium Online</span>`;

        html += `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col hover:shadow-md transition-shadow text-left">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                <i data-lucide="${feature.icon}" class="w-6 h-6"></i>
            </div>
            <h3 class="font-bold text-lg text-slate-800 dark:text-white mb-2">${feature.title}</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 flex-1">${feature.description}</p>
            <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                ${badgeHtml}
                <button onclick="showEvolutionToast('${key}')" class="text-sm font-bold text-brand-primary hover:text-brand-dark transition-colors">${feature.cta}</button>
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
    const isPlanUpgrade = (featureKey === 'online_essential' || featureKey === 'online_premium');
    const interestType = feature.interestType || (isPlanUpgrade ? 'plan_upgrade' : 'feature_interest');
    const currentPlanCode = feature.currentPlanCode || 'ml_lifetime';
    const targetPlanCode = feature.targetPlanCode || (featureKey === 'online_essential' ? 'basic' : featureKey === 'online_premium' ? 'premium' : (feature.status === 'essential' ? 'basic' : 'premium'));

    const featureTitle = feature.title || (featureKey === 'online_essential' ? 'Evolução Online Essencial' : featureKey === 'online_premium' ? 'Evolução Online Premium' : featureKey);
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

    // Modal consultivo de WhatsApp
    const prefix = 'assistencia';
    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const savedName = localStorage.getItem(prefix + '_customer_name') || '';
    const savedWhatsapp = localStorage.getItem(prefix + '_customer_whatsapp') || '';

    let modal = document.getElementById('evolution-consultative-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'evolution-consultative-modal';
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transform transition-all text-left">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Solicitar Evolução</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Informe um WhatsApp para a equipe Plena explicar os próximos passos da evolução.</p>

        <div class="space-y-4 mb-4">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome do Responsável (Opcional)</label>
            <input type="text" id="evo-modal-name" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" placeholder="Ex: João Silva" value="${esc(savedName)}">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">WhatsApp (Recomendado)</label>
            <input type="tel" id="evo-modal-whatsapp" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" placeholder="Ex: (11) 99999-9999" value="${esc(savedWhatsapp)}">
          </div>
          <label class="flex items-start gap-2.5 cursor-pointer mt-2">
            <input type="checkbox" id="evo-modal-consent" class="mt-1 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500" ${savedWhatsapp ? 'checked' : ''}>
            <span class="text-xs text-slate-600 dark:text-slate-400 leading-tight">Autorizo a Plena Informática a entrar em contato sobre esta solicitação.</span>
          </label>
          <div id="evo-modal-error" class="text-xs text-rose-500 font-bold hidden"></div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button id="evo-modal-cancel" class="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Cancelar</button>
          <button id="evo-modal-submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors">Enviar Solicitação</button>
        </div>
      </div>
    `;

    document.getElementById('evo-modal-cancel').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('evo-modal-submit').addEventListener('click', () => {
        const nameVal = document.getElementById('evo-modal-name').value.trim();
        const whatsappVal = document.getElementById('evo-modal-whatsapp').value.trim();
        const consentChecked = document.getElementById('evo-modal-consent').checked;
        const errorEl = document.getElementById('evo-modal-error');

        if (whatsappVal !== '' && !consentChecked) {
            errorEl.textContent = 'Autorize o contato para enviar seu telefone.';
            errorEl.classList.remove('hidden');
            return;
        }
        errorEl.classList.add('hidden');

        // Save local
        localStorage.setItem(prefix + '_customer_name', nameVal);
        localStorage.setItem(prefix + '_customer_whatsapp', whatsappVal);

        modal.remove();
        notify(`Registrando interesse comercial: ${featureTitle}...`, 'info');

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
                    source: 'evolution_module',
                    interest_type: interestType,
                    current_plan_code: currentPlanCode,
                    target_plan_code: targetPlanCode,
                    customer_name: nameVal,
                    customer_whatsapp: whatsappVal,
                    contact_consent: consentChecked
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
    });
}
