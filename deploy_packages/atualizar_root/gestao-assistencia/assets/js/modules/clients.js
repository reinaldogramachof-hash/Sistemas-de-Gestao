let currentProfileClientId = null;

function openClientModal(client = null) {
    document.getElementById('client-id').value = client?.id || '';
    document.getElementById('client-name').value = client?.name || '';
    document.getElementById('client-cpf-cnpj').value = client?.cpf_cnpj || '';
    document.getElementById('client-birthdate').value = client?.birthdate || '';
    document.getElementById('client-phone').value = client?.phone || '';
    document.getElementById('client-email').value = client?.email || '';
    document.getElementById('client-cep').value = client?.cep || '';
    document.getElementById('client-neighborhood').value = client?.neighborhood || '';
    document.getElementById('client-address').value = client?.address || '';
    document.getElementById('client-city').value = client?.city || '';
    document.getElementById('client-state').value = client?.state || '';
    const notesEl = document.getElementById('client-notes');
    if (notesEl) notesEl.value = client?.notes || '';

    const titleEl = document.querySelector('#clientModal h3');
    if (titleEl) titleEl.textContent = client ? 'Editar Cliente' : 'Novo Cliente';

    const modal = document.getElementById('clientModal');
    if (modal) modal.classList.remove('hidden');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function searchCEP(cep) {
    cep = cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (!data.erro) {
            document.getElementById('client-neighborhood').value = data.bairro;
            document.getElementById('client-address').value = data.logradouro;
            document.getElementById('client-city').value = data.localidade;
            document.getElementById('client-state').value = data.uf;
        } else {
            showNotification('CEP não encontrado.', 'error');
        }
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
    }
}

function submitClient(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('client-id').value;
    const client = {
        id: id || getClientID(),
        name: document.getElementById('client-name').value.trim(),
        cpf_cnpj: document.getElementById('client-cpf-cnpj').value.trim(),
        birthdate: document.getElementById('client-birthdate').value,
        phone: document.getElementById('client-phone').value.trim(),
        email: document.getElementById('client-email').value.trim(),
        cep: document.getElementById('client-cep').value.trim(),
        neighborhood: document.getElementById('client-neighborhood').value.trim(),
        address: document.getElementById('client-address').value.trim(),
        city: document.getElementById('client-city').value.trim(),
        state: document.getElementById('client-state').value.trim().toUpperCase(),
        notes: document.getElementById('client-notes')?.value.trim() || '',
        createdAt: id ? (db.clients.find(c => c.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (!client.name) {
        showNotification('O nome do cliente é obrigatório!', 'error');
        return;
    }

    if (id) {
        const idx = db.clients.findIndex(c => c.id === id);
        if (idx !== -1) db.clients[idx] = client;
    } else {
        db.clients.unshift(client);
    }

    save();
    closeModal('clientModal');
    renderClients();
    showNotification(id ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
}

function openClientProfile(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;

    currentProfileClientId = clientId;

    // Preenche cabeçalho e dados básicos
    document.getElementById('profile-name').textContent = client.name;
    document.getElementById('profile-since').textContent = `Cliente desde: ${fmtDate(client.createdAt)}`;
    document.getElementById('profile-phone').textContent = client.phone || 'N/A';
    document.getElementById('profile-email').textContent = client.email || 'N/A';
    document.getElementById('profile-cpf').textContent = client.cpf_cnpj || 'Não informado';

    const addr = [client.address, client.neighborhood, client.city, client.state].filter(x => x).join(', ');
    document.getElementById('profile-address-full').textContent = addr || 'Nenhum endereço cadastrado.';

    // Métricas Financeiras
    const clientOrders = db.orders.filter(o => o.clientId === client.id || o.client === client.name);
    const totalSpent = (client.totalSpent || 0);

    document.getElementById('profile-total-spent').textContent = fmtMoney(totalSpent);
    document.getElementById('profile-orders-count').textContent = clientOrders.length;

    // Tabela de Histórico
    const tbody = document.getElementById('profile-orders-table');
    if (clientOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400 italic">Nenhuma ordem de serviço registrada.</td></tr>';
    } else {
        tbody.innerHTML = clientOrders.sort((a,b) => new Date(b.date) - new Date(a.date)).map(o => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 font-mono font-bold text-brand-primary">#${o.id.slice(-4)}</td>
                <td class="px-6 py-4">${o.device}</td>
                <td class="px-6 py-4 text-xs">${fmtDate(o.date)}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${(statusColors[o.status] || statusColors.received).bg} ${(statusColors[o.status] || statusColors.received).text}">
                        ${(statusColors[o.status] || statusColors.received).label}
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-bold">${fmtMoney(o.total)}</td>
            </tr>
        `).join('');
    }

    const modal = document.getElementById('clientProfileModal');
    if (modal) modal.classList.remove('hidden');

    // Reseta para a aba de OS por padrão
    switchProfileTab('os');

    // Popula Vendas PDV
    const clientSales = (db.pdvSales || []).filter(s => s.clientId === client.id);
    const pdvBody = document.getElementById('profile-pdv-table');
    if (clientSales.length === 0) {
        pdvBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400 italic">Nenhuma venda de balcão registrada.</td></tr>';
    } else {
        pdvBody.innerHTML = clientSales.sort((a,b) => new Date(b.date) - new Date(a.date)).map(s => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 font-mono font-bold text-green-600">#${s.id}</td>
                <td class="px-6 py-4">
                    <div class="text-xs">${s.items.map(i => `${i.qty}x ${sanitizeHTML(i.name)}`).join(', ')}</div>
                </td>
                <td class="px-6 py-4 text-xs">${fmtDate(s.date)}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                        ${({ 'money': 'Dinheiro', 'dinheiro': 'Dinheiro', 'credit': 'Cartão', 'cartao': 'Cartão', 'pix': 'Pix', 'misto': 'Misto' }[s.payment] || s.payment)}
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-bold">${fmtMoney(s.total)}</td>
            </tr>
        `).join('');
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function switchProfileTab(tab) {
    const osCont = document.getElementById('profile-os-container');
    const pdvCont = document.getElementById('profile-pdv-container');
    const btnOs = document.getElementById('tab-os');
    const btnPdv = document.getElementById('tab-pdv');

    if (tab === 'os') {
        osCont.classList.remove('hidden');
        pdvCont.classList.add('hidden');
        btnOs.className = 'px-6 py-2 font-bold text-sm border-b-2 border-brand-primary text-brand-primary';
        btnPdv.className = 'px-6 py-2 font-bold text-sm border-b-2 border-transparent text-gray-500 hover:text-brand-primary transition-colors';
    } else {
        osCont.classList.add('hidden');
        pdvCont.classList.remove('hidden');
        btnOs.className = 'px-6 py-2 font-bold text-sm border-b-2 border-transparent text-gray-500 hover:text-brand-primary transition-colors';
        btnPdv.className = 'px-6 py-2 font-bold text-sm border-b-2 border-brand-primary text-brand-primary';
    }
}

function createNewOrderForClient(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;

    // Se houver uma função de abertura de modal de OS, usamos ela
    if (typeof openOrderModal === 'function') {
        openOrderModal(); // Abre em modo criação

        // Preenche os campos do cliente no modal de OS
        const clientInput = document.getElementById('order-client');
        const phoneInput = document.getElementById('order-phone');

        if (clientInput) clientInput.value = client.name;
        if (phoneInput) phoneInput.value = client.phone || '';

        // Se estiver no perfil, fecha ele
        closeModal('clientProfileModal');
    }
}

function createNewOrderFromProfile() {
    if (currentProfileClientId) {
        createNewOrderForClient(currentProfileClientId);
    }
}

function createNewSaleFromProfile() {
    if (!currentProfileClientId) return;

    const clientId = currentProfileClientId;

    // Navega para o PDV
    if (typeof router === 'function') {
        router('pdv');

        // Aguarda renderização e seleciona o cliente
        setTimeout(() => {
            const select = document.getElementById('pdv-client-select');
            if (select) {
                select.value = clientId;
            }
        }, 100);

        closeModal('clientProfileModal');
    }
}

function updateClientDashboard() {
    const totalCountEl = document.getElementById('client-total-count');
    const newMonthEl = document.getElementById('client-new-month');
    const activeCountEl = document.getElementById('client-active-count');
    const ticketAvgEl = document.getElementById('client-ticket-avg');

    if (!totalCountEl) return;

    const totalClients = db.clients.length;

    // Novos este mês
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = db.clients.filter(c => new Date(c.createdAt) >= firstDayMonth).length;

    // Ativos (pedidos nos últimos 60 dias)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const activeClients = db.clients.filter(client => {
        const clientOrders = db.orders.filter(o => o.clientId === client.id || o.client === client.name);
        const lastOrder = clientOrders.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        return lastOrder && new Date(lastOrder.date) >= sixtyDaysAgo;
    }).length;

    // Ticket Médio (Total gasto / Clientes com gastos)
    const clientsWithSpending = db.clients.filter(c => (c.totalSpent || 0) > 0);
    const totalSpentSum = db.clients.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const avgTicket = clientsWithSpending.length > 0 ? totalSpentSum / clientsWithSpending.length : 0;

    totalCountEl.textContent = totalClients;
    newMonthEl.textContent = newThisMonth;
    activeCountEl.textContent = activeClients;
    ticketAvgEl.textContent = fmtMoney(avgTicket);
}

function renderClients() {
    const term = (document.getElementById('search-client')?.value || '').toLowerCase();
    const tbody = document.getElementById('clients-table-body');
    const emptyMsg = document.getElementById('empty-clients-msg');

    if (!tbody) return;

    // Atualiza Dashboard antes de filtrar
    updateClientDashboard();

    let filtered = db.clients.filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.cpf_cnpj || '').toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');

    tbody.innerHTML = filtered.map(client => {
        const clientOrders = db.orders.filter(o => o.clientId === client.id || o.client === client.name);
        const lastOrder = clientOrders.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        // Escape quotes in client JSON for HTML attribute
        const clientData = JSON.stringify(client).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        const waLink = client.phone ? `https://api.whatsapp.com/send?phone=55${client.phone.replace(/\D/g, '')}` : '#';

        return `
            <tr class="hover:bg-gray-50 group border-b border-gray-100">
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-800">${sanitizeHTML(client.name)}</div>
                    <div class="text-[10px] text-gray-400 font-mono">${client.cpf_cnpj || 'Sem CPF/CNPJ'}</div>
                    ${client.address ? `<div class="text-xs text-gray-400">${sanitizeHTML(client.address)}</div>` : ''}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        ${client.phone ? `
                            <div class="text-sm text-gray-700">${sanitizeHTML(client.phone)}</div>
                            <a href="${waLink}" target="_blank" class="text-green-500 hover:text-green-600 transition-colors" title="WhatsApp">
                                <i data-lucide="message-circle" class="w-4 h-4"></i>
                            </a>
                        ` : '<span class="text-xs text-gray-300">Sem telefone</span>'}
                    </div>
                    ${client.email ? `<div class="text-xs text-gray-400">${sanitizeHTML(client.email)}</div>` : ''}
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">${clientOrders.length}</span>
                    <div class="text-[10px] text-gray-400 mt-1">Total: ${fmtMoney(client.totalSpent || 0)}</div>
                </td>
                <td class="px-6 py-4 text-gray-500 text-sm">
                    ${lastOrder ? `
                        <div>${fmtDate(lastOrder.date)}</div>
                        <div class="text-[10px] ${(statusColors[lastOrder.status] || statusColors.received).text} font-bold uppercase">${(statusColors[lastOrder.status] || statusColors.received).label}</div>
                    ` : '-'}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="createNewOrderForClient('${client.id}')"
                                class="text-gray-400 hover:text-green-500 transition-colors" title="Nova O.S.">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i>
                        </button>
                        <button onclick="openClientProfile('${client.id}')"
                                class="text-gray-400 hover:text-brand-primary transition-colors" title="Ver Perfil 360">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button onclick="openClientModal(${clientData})"
                                class="text-gray-400 hover:text-blue-500 transition-colors" title="Editar">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteClient('${client.id}')"
                                class="text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function deleteClient(id) {
    if (confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) {
        db.clients = db.clients.filter(c => c.id !== id);
        save();
        renderClients();
        showNotification('Cliente excluído.', 'success');
    }
}

function saveClientFromOrder(order) {
    const existingClient = db.clients.find(c =>
        c.name.toLowerCase() === order.client.toLowerCase() ||
        (c.phone && c.phone === order.phone)
    );

    if (!existingClient && order.client) {
        db.clients.push({
            id: getClientID(),
            name: order.client,
            phone: order.phone,
            email: '',
            address: '',
            notes: '',
            orders: 1,
            lastOrder: order.date,
            totalSpent: order.total,
            createdAt: new Date().toISOString()
        });
        save();
    } else if (existingClient) {
        existingClient.orders = (existingClient.orders || 0) + 1;
        existingClient.lastOrder = order.date;
        existingClient.totalSpent = (existingClient.totalSpent || 0) + order.total;
        save();
    }
}
