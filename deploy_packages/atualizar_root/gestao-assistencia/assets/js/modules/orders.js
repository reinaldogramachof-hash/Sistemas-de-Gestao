// ==========================================
// MÃ“DULO ORDENS DE SERVIÃ‡O (O.S.) E DASHBOARD
// ==========================================

let currentOrderParts = [];
let currentViewOrder = null;

// DASHBOARD
function renderDashboard() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthOrders = db.orders.filter(o => o.date && o.date.startsWith(currentMonth));
    const monthPDVSales = (db.pdvSales || []).filter(s => s.date && s.date.startsWith(currentMonth));

    // Calcular estatísticas
    const active = db.orders.filter(o => ['received', 'analyzing', 'waiting_parts'].includes(o.status)).length;
    const ready = db.orders.filter(o => o.status === 'ready').length;
    const pdvCount = monthPDVSales.length;

    const osRevenue = monthOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total || 0), 0);

    const pdvRevenue = monthPDVSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalRevenue = osRevenue + pdvRevenue;

    // Atualizar cards
    const dashActive = document.getElementById('dash-active');
    if(dashActive) dashActive.innerText = active;

    const dashReady = document.getElementById('dash-ready');
    if(dashReady) dashReady.innerText = ready;

    const pdvSalesEl = document.getElementById('dash-pdv-sales');
    if (pdvSalesEl) pdvSalesEl.innerText = pdvCount;

    const dashRevenue = document.getElementById('dash-revenue');
    if(dashRevenue) dashRevenue.innerText = fmtMoney(totalRevenue);

    // Atualizar gráfico
    renderChart();

    // Atualizar ordens recentes
    renderRecentOrders();

    // Atualizar alertas de estoque baixo
    renderLowStockAlerts();
}

function renderChart() {
    const chartArea = document.getElementById('chart-area');
    if(!chartArea) return;

    const statusCount = {
        received: 0,
        analyzing: 0,
        waiting_parts: 0,
        ready: 0,
        delivered: 0
    };

    db.orders.forEach(o => {
        if (statusCount[o.status] !== undefined) {
            statusCount[o.status]++;
        }
    });

    const maxValue = Math.max(...Object.values(statusCount), 1);

    const chartData = [
        { label: 'Recebido', value: statusCount.received, color: '#9CA3AF' },
        { label: 'Análise', value: statusCount.analyzing, color: '#3B82F6' },
        { label: 'Peça', value: statusCount.waiting_parts, color: '#F59E0B' },
        { label: 'Pronto', value: statusCount.ready, color: '#10B981' },
        { label: 'Entregue', value: statusCount.delivered, color: '#8B5CF6' }
    ];

    let chartHTML = '';
    chartData.forEach(item => {
        const height = (item.value / maxValue) * 100;
        chartHTML += `
            <div class="bar-group">
                <div class="bar-wrapper">
                    <div class="bar"
                         style="height:${height}%; background-color:${item.color}"
                         data-value="${item.value} ${item.label}"></div>
                </div>
                <div class="x-label">${item.label.substring(0, 3)}</div>
            </div>
        `;
    });

    chartArea.innerHTML = chartHTML || '<p class="text-gray-400 text-sm">Sem dados para exibir</p>';
}

function renderRecentOrders() {
    const container = document.getElementById('recent-orders');
    if(!container) return;

    const recent = db.orders
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center">Nenhuma ordem de serviço recente</p>';
        return;
    }

    container.innerHTML = recent.map(order => {
        const status = statusColors[order.status] || statusColors.received;
        return `
            <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full ${status.bg} flex items-center justify-center mr-3">
                        <i data-lucide="clipboard" class="w-4 h-4 ${status.text}"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-800">${order.client}</p>
                        <p class="text-xs text-gray-500">${order.device} • ${fmtDate(order.date)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-xs font-bold ${status.text}">${status.label}</span>
                    ${order.total > 0 ? `<p class="text-sm font-bold text-gray-800 mt-1">${fmtMoney(order.total)}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function renderLowStockAlerts() {
    const container = document.getElementById('low-stock-alerts');
    if(!container) return;

    const lowStockProducts = db.products.filter(p => {
        return p.stock > 0 && p.stock <= p.minStock;
    }).slice(0, 5);

    if (lowStockProducts.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center">Estoque em dia</p>';
        return;
    }

    container.innerHTML = lowStockProducts.map(product => {
        const stockClass = product.stock === 0 ? 'stock-critical' :
            product.stock <= product.minStock * 0.5 ? 'stock-critical' : 'stock-low';

        return `
            <div class="flex items-center justify-between p-3 ${stockClass} rounded-lg">
                <div>
                    <p class="text-sm font-medium text-gray-800">${product.name}</p>
                    <p class="text-xs text-gray-600">${product.category}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-bold ${product.stock === 0 ? 'text-red-600' : 'text-yellow-600'}">
                        ${product.stock} un.
                    </p>
                    <p class="text-xs text-gray-500">Mín: ${product.minStock}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ORDENS DE SERVIÃ‡O (O.S.)
function renderOrders() {
    const term = (document.getElementById('search-order')?.value || '').toLowerCase();
    const startDate = document.getElementById('filter-start')?.value || '';
    const endDate = document.getElementById('filter-end')?.value || '';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';

    let filtered = db.orders.filter(o => {
        const matchesTerm = !term || o.client.toLowerCase().includes(term) ||
            o.device.toLowerCase().includes(term) || o.id.includes(term) ||
            (o.brand || '').toLowerCase().includes(term);
        const matchesDate = (!startDate || o.date >= startDate) && (!endDate || o.date <= endDate);
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchesTerm && matchesDate && matchesStatus;
    });
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const el = id => document.getElementById(id);
    if (el('filter-active')) el('filter-active').textContent = db.orders.filter(o => o.status === 'analyzing').length;
    if (el('filter-waiting')) el('filter-waiting').textContent = db.orders.filter(o => o.status === 'waiting_parts').length;
    if (el('filter-ready')) el('filter-ready').textContent = db.orders.filter(o => o.status === 'ready').length;
    if (el('filter-total')) el('filter-total').textContent = db.orders.length;

    const tbody = document.getElementById('orders-table-body');
    const emptyMsg = document.getElementById('empty-msg');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyMsg?.classList.remove('hidden');
        lucide.createIcons();
        return;
    }
    emptyMsg?.classList.add('hidden');

    tbody.innerHTML = filtered.map(order => {
        const status = statusColors[order.status] || statusColors.received;
        return `
            <tr class="hover:bg-gray-50 group border-b border-gray-100">
                <td class="px-6 py-4 font-mono text-sm text-gray-500">${order.id}</td>
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-800">${order.client}</div>
                    ${order.phone ? `<div class="text-xs text-gray-400">${order.phone}</div>` : ''}
                </td>
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-800">${order.device}</div>
                    ${order.brand ? `<div class="text-xs text-gray-400">${order.brand}</div>` : ''}
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}">
                        ${status.label}
                    </span>
                </td>
                <td class="px-6 py-4 text-gray-500 whitespace-nowrap">${fmtDate(order.date)}</td>
                <td class="px-6 py-4 text-right font-bold ${order.total > 0 ? 'text-green-600' : 'text-gray-500'}">
                    ${fmtMoney(order.total)}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="openOrderView('${order.id}')"
                                class="text-gray-400 hover:text-blue-500 transition-colors"
                                title="Visualizar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button onclick="openOrderModal(${JSON.stringify(order).replace(/"/g, '&quot;')})"
                                class="text-gray-400 hover:text-yellow-500 transition-colors"
                                title="Editar">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteOrder('${order.id}')"
                                class="text-gray-400 hover:text-red-500 transition-colors"
                                title="Excluir">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

function openOrderModal(order = null) {
    const modal = document.getElementById('orderModal');
    const title = modal.querySelector('#order-modal-title');

    // Resetar partes da ordem
    currentOrderParts = [];

    if (order) {
        // Modo edição
        title.textContent = 'Editar Ordem de Serviço';
        document.getElementById('order-id').value = order.id;
        document.getElementById('order-client').value = order.client || '';
        document.getElementById('order-phone').value = order.phone || '';
        document.getElementById('order-device').value = order.device || '';
        document.getElementById('order-brand').value = order.brand || '';
        document.getElementById('order-serial').value = order.serial || '';
        document.getElementById('order-password').value = order.password || '';
        document.getElementById('order-problem').value = order.problem || '';
        document.getElementById('order-diagnosis').value = order.diagnosis || '';

        document.getElementById('order-entry-notes').value = order.entryNotes || '';
        ['screen', 'back', 'buttons', 'tray', 'cameras', 'biometrics', 'power', 'connector'].forEach(key => {
            const chk = document.getElementById(`chk-${key}`);
            if (chk) chk.checked = order.checklist ? !!order.checklist[key] : false;
        });

        document.getElementById('order-labor').value = order.labor || 0;
        document.getElementById('order-discount').value = order.discount || 0;

        // Carregar partes se existirem
        if (order.parts && Array.isArray(order.parts)) {
            currentOrderParts = [...order.parts];
            renderOrderPartsList();
        }

        populateTechnicianSelect(order.technician);
        updateOrderSummary();
    } else {
        // Modo criação
        title.textContent = 'Nova Ordem de Serviço';
        modal.querySelector('form').reset();
        document.getElementById('order-id').value = '';

        document.getElementById('order-entry-notes').value = '';
        ['screen', 'back', 'buttons', 'tray', 'cameras', 'biometrics', 'power', 'connector'].forEach(key => {
            const chk = document.getElementById(`chk-${key}`);
            if (chk) chk.checked = false;
        });

        document.getElementById('order-labor').value = 0;
        document.getElementById('order-discount').value = 0;
        document.getElementById('order-parts-list').innerHTML = '';
        populateTechnicianSelect();
        updateOrderSummary();
    }

    modal.classList.remove('hidden');
}

function addPartFromInventory() {
    // Popular seletor de produtos
    const select = document.getElementById('select-product');
    select.innerHTML = '<option value="">Selecione um produto</option>';

    db.products.forEach(product => {
        if (product.stock > 0) {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.stock} disponíveis)`;
            select.appendChild(option);
        }
    });

    document.getElementById('addPartModal').classList.remove('hidden');
}

function updateSelectedProductInfo(productId) {
    const product = db.products.find(p => p.id === productId);
    const infoDiv = document.getElementById('product-info');
    const totalDiv = document.getElementById('part-total');

    if (product) {
        infoDiv.classList.remove('hidden');
        document.getElementById('available-stock').textContent = product.stock;
        document.getElementById('product-price-display').textContent = fmtMoney(product.price);

        // Calcular total inicial
        const quantity = parseInt(document.getElementById('part-quantity').value) || 1;
        const total = quantity * product.price;
        document.getElementById('part-total-value').textContent = fmtMoney(total);
        totalDiv.classList.remove('hidden');
    } else {
        infoDiv.classList.add('hidden');
        totalDiv.classList.add('hidden');
    }
}

function updatePartTotal() {
    const productId = document.getElementById('select-product').value;
    const quantity = parseInt(document.getElementById('part-quantity').value) || 1;
    const product = db.products.find(p => p.id === productId);

    if (product) {
        const total = quantity * product.price;
        document.getElementById('part-total-value').textContent = fmtMoney(total);
    }
}

function addSelectedPart() {
    const productId = document.getElementById('select-product').value;
    const quantity = parseInt(document.getElementById('part-quantity').value) || 1;
    const notes = document.getElementById('part-notes').value;

    const product = db.products.find(p => p.id === productId);

    if (!product) {
        showNotification('Selecione um produto válido', 'error');
        return;
    }

    if (quantity > product.stock) {
        showNotification(`Estoque insuficiente. Disponível: ${product.stock} unidades`, 'error');
        return;
    }

    // Adicionar à lista de partes
    const part = {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        unitPrice: product.price,
        total: quantity * product.price,
        notes: notes
    };

    currentOrderParts.push(part);
    renderOrderPartsList();
    updateOrderSummary();

    // Fechar modal e limpar
    closeModal('addPartModal');
    document.getElementById('part-quantity').value = 1;
    document.getElementById('part-notes').value = '';
    document.getElementById('select-product').value = '';

    showNotification('Peça adicionada à ordem de serviço', 'success');
}

function renderOrderPartsList() {
    const container = document.getElementById('order-parts-list');

    if (currentOrderParts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-400">
                <i data-lucide="package" class="w-8 h-8 mx-auto mb-2"></i>
                <p class="text-sm">Nenhuma peça adicionada</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentOrderParts.map((part, index) => `
        <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <div class="flex-1">
                <p class="font-medium text-gray-800">${part.productName}</p>
                <p class="text-xs text-gray-500">
                    ${part.quantity} x ${fmtMoney(part.unitPrice)} = ${fmtMoney(part.total)}
                    ${part.notes ? ` • ${part.notes}` : ''}
                </p>
            </div>
            <button onclick="removeOrderPart(${index})"
                    class="ml-2 text-red-500 hover:text-red-700">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');

    lucide.createIcons();
}

function removeOrderPart(index) {
    currentOrderParts.splice(index, 1);
    renderOrderPartsList();
    updateOrderSummary();
}

function updateOrderSummary() {
    // Calcular total das peças
    const partsTotal = currentOrderParts.reduce((sum, part) => sum + part.total, 0);

    // Obter valores de mão de obra e desconto
    const labor = parseFloat(document.getElementById('order-labor').value) || 0;
    const discount = parseFloat(document.getElementById('order-discount').value) || 0;

    // Calcular total geral
    const total = partsTotal + labor - discount;

    // Atualizar displays
    document.getElementById('order-parts-total').textContent = fmtMoney(partsTotal);
    document.getElementById('summary-parts').textContent = fmtMoney(partsTotal);
    document.getElementById('summary-labor').textContent = fmtMoney(labor);
    document.getElementById('summary-discount').textContent = fmtMoney(discount);
    document.getElementById('order-total').textContent = fmtMoney(total);
}

function submitOrder(e) {
    e.preventDefault();

    const id = document.getElementById('order-id').value;
    const labor = parseFloat(document.getElementById('order-labor').value) || 0;
    const discount = parseFloat(document.getElementById('order-discount').value) || 0;
    const partsTotal = currentOrderParts.reduce((sum, part) => sum + part.total, 0);
    const total = partsTotal + labor - discount;

    const order = {
        id: id || getID(),
        client: document.getElementById('order-client').value.trim(),
        phone: document.getElementById('order-phone').value.trim(),
        device: document.getElementById('order-device').value.trim(),
        brand: document.getElementById('order-brand').value.trim(),
        serial: document.getElementById('order-serial').value.trim(),
        password: document.getElementById('order-password').value.trim(),
        problem: document.getElementById('order-problem').value.trim(),
        diagnosis: document.getElementById('order-diagnosis').value.trim(),
        entryNotes: (document.getElementById('order-entry-notes')?.value || '').trim(),
        checklist: {
            screen: document.getElementById('chk-screen')?.checked || false,
            back: document.getElementById('chk-back')?.checked || false,
            buttons: document.getElementById('chk-buttons')?.checked || false,
            tray: document.getElementById('chk-tray')?.checked || false,
            cameras: document.getElementById('chk-cameras')?.checked || false,
            biometrics: document.getElementById('chk-biometrics')?.checked || false,
            power: document.getElementById('chk-power')?.checked || false,
            connector: document.getElementById('chk-connector')?.checked || false
        },
        parts: currentOrderParts,
        labor,
        discount,
        total,
        date: id ? db.orders.find(o => o.id === id).date : new Date().toISOString().split('T')[0],
        status: id ? db.orders.find(o => o.id === id).status : 'received',
        updatedAt: new Date().toISOString(),
        technician: document.getElementById('order-technician').value
    };

    if (!order.client || !order.device || !order.problem) {
        showNotification('Preencha todos os campos obrigatórios!', 'error');
        return;
    }

    if (id) {
        // Editar ordem existente
        const index = db.orders.findIndex(o => o.id === id);
        if (index !== -1) {
            db.orders[index] = order;
        }
    } else {
        // Adicionar nova ordem
        db.orders.unshift(order);
    }

    // Salvar/atualizar cliente
    saveClientFromOrder(order);

    save();
    closeModal('orderModal');
    renderDashboard();
    renderOrders();

    showNotification('Ordem de serviço salva com sucesso!', 'success');
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
    } else if (existingClient) {
        existingClient.orders += 1;
        existingClient.lastOrder = order.date;
        existingClient.totalSpent = (existingClient.totalSpent || 0) + order.total;
    }
}

function openOrderView(id) {
    const order = db.orders.find(o => o.id === id);
    if (!order) return;

    currentViewOrder = order;

    // Preencher dados da visualização
    document.getElementById('view-os-number').textContent = order.id;
    document.getElementById('view-os-id').textContent = order.id;
    document.getElementById('view-os-date').textContent = `Data: ${fmtDate(order.date)}`;

    // Layout das tags de status
    let statusHtml = `Status: ${statusColors[order.status]?.label || 'Recebido'}`;
    if (order.paid) {
        statusHtml += ` <span class="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded ml-2 font-bold" title="Lançado no Fluxo de Caixa">💰 PAGO</span>`;
    }
    if (order.partsDeducted) {
        statusHtml += ` <span class="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded ml-1 font-bold" title="Peças debitadas do Estoque">📦 BAIXA ESTOQUE</span>`;
    }
    document.getElementById('view-os-status').innerHTML = statusHtml;
    document.getElementById('view-client').textContent = order.client;
    document.getElementById('view-phone').textContent = order.phone || 'Não informado';
    document.getElementById('view-device').textContent = order.device + (order.brand ? ` - ${order.brand}` : '');
    document.getElementById('view-serial').textContent = order.serial || 'N/D';

    document.getElementById('view-entry-notes').textContent = order.entryNotes || 'Nenhuma observação de entrada.';
    const checklistLabels = {
        screen: 'Tela Intacta', back: 'Tampa Traseira', buttons: 'Botões',
        tray: 'Gaveta Chip', cameras: 'Câmeras', biometrics: 'Biometria',
        power: 'Liga Facilmente', connector: 'Conector Carga'
    };
    let checklistHtml = '';
    if (order.checklist) {
        for (const [key, label] of Object.entries(checklistLabels)) {
            const isChecked = order.checklist[key];
            const icon = isChecked ? '<i data-lucide="check-square" class="w-3 h-3 text-green-600 inline mr-1"></i>' : '<i data-lucide="square" class="w-3 h-3 text-gray-300 inline mr-1"></i>';
            checklistHtml += `<div class="flex items-center">${icon} ${label}</div>`;
        }
    } else {
        checklistHtml = '<div class="col-span-full">Checklist não preenchido.</div>';
    }
    const viewChecklistGrid = document.getElementById('view-checklist-grid');
    if (viewChecklistGrid) {
        viewChecklistGrid.innerHTML = checklistHtml;
    }

    const warrantyContainer = document.getElementById('view-warranty-terms');
    if (warrantyContainer) {
        const defaultWarranty = "A garantia cobre apenas defeitos de fabricação das peças substituídas e falhas na mão de obra executada, pelo prazo legal de 60 dias (Art. 26, II do CDC). A garantia é anulada automaticamente em caso de: mau uso, quedas, contato com líquidos, oxidação, descarga elétrica ou violação do selo de garantia.\n\nABANDONO: Conforme Art. 1.275 do Código Civil, aparelhos não retirados no prazo de 60 dias após notificação de conclusão serão considerados abandonados, podendo ser descartados ou vendidos para custear despesas de armazenamento e reparo.";
        let terms = db.settings ? (db.settings.warrantyTerms || defaultWarranty) : defaultWarranty;
        warrantyContainer.innerHTML = terms.split('\n').map(p => p.trim() ? `<p class="mb-2">${sanitizeHTML(p)}</p>` : '').join('');
    }

    document.getElementById('view-problem').textContent = order.problem || 'Não informado';
    document.getElementById('view-diagnosis').textContent = order.diagnosis || 'Em análise';
    document.getElementById('view-labor').textContent = fmtMoney(order.labor || 0);
    document.getElementById('view-discount').textContent = fmtMoney(order.discount || 0);
    document.getElementById('view-total').textContent = fmtMoney(order.total || 0);

    // Exibir técnico responsável
    const techStatus = document.getElementById('view-os-status');
    if (order.technician) {
        techStatus.innerHTML += `<div class="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center justify-end">
            <i data-lucide="wrench" class="w-3 h-3 mr-1"></i> Técnico: ${order.technician}
        </div>`;
        lucide.createIcons();
    }

    // Mostrar/ocultar botão de usar peças
    const usePartsBtn = document.getElementById('btn-use-parts');
    if (usePartsBtn) {
        usePartsBtn.style.display = order.status === 'delivered' ? 'none' : 'flex';
    }

    // Atualizar seção de peças se existirem
    const partsContainer = document.getElementById('view-parts-container');
    const partsList = document.getElementById('view-parts-list');
    const partsTotalElem = document.getElementById('view-parts-total');
    const partsSummary = document.getElementById('view-parts-summary');

    if (order.parts && order.parts.length > 0) {
        partsContainer.classList.remove('hidden');

        // Calcular total das peças
        const partsTotal = order.parts.reduce((sum, part) => sum + part.total, 0);

        // Renderizar lista de peças
        partsList.innerHTML = order.parts.map(part => `
            <tr>
                <td class="py-2">${part.productName}${part.notes ? `<br><span class="text-xs text-gray-500">${part.notes}</span>` : ''}</td>
                <td class="py-2 text-center">${part.quantity}</td>
                <td class="py-2 text-right">${fmtMoney(part.total)}</td>
            </tr>
        `).join('');

        partsTotalElem.textContent = fmtMoney(partsTotal);
        partsSummary.textContent = fmtMoney(partsTotal);
    } else {
        partsContainer.classList.add('hidden');
        partsSummary.textContent = 'R$ 0,00';
    }

    document.getElementById('view-status-select').value = order.status;
    document.getElementById('orderViewModal').classList.remove('hidden');

    // Injetar cabeçalho corporativo
    updatePrintHeaders();
}

function usePartsFromOrder() {
    if (!currentViewOrder || !currentViewOrder.parts || currentViewOrder.parts.length === 0) {
        showNotification('Esta ordem não tem peças para usar do estoque', 'warning');
        return;
    }

    if (currentViewOrder.partsDeducted) {
        showNotification('As peças desta O.S. já foram debitadas do estoque anteriormente!', 'error');
        return;
    }

    if (confirm('Deseja debitar as peças usadas desta O.S. do estoque?\n\nEsta ação atualizará o estoque automaticamente.')) {
        let hasError = false;

        currentViewOrder.parts.forEach(part => {
            // Encontrar o produto no estoque
            const product = db.products.find(p => p.id === part.productId);
            if (product) {
                // Verificar se há estoque suficiente
                if (product.stock >= part.quantity) {
                    // Criar movimentação de saída
                    const movement = {
                        id: getMovementID(),
                        productId: product.id,
                        productName: product.name,
                        type: 'out',
                        quantity: part.quantity,
                        unitValue: product.cost, // Usar custo para movimentação interna
                        totalValue: part.quantity * product.cost,
                        reason: 'os_use',
                        notes: `Uso na O.S. ${currentViewOrder.id} - ${currentViewOrder.client}`,
                        date: new Date().toISOString().split('T')[0],
                        orderId: currentViewOrder.id
                    };

                    db.movements.push(movement);

                    // Atualizar estoque do produto
                    product.stock -= part.quantity;
                } else {
                    hasError = true;
                    showNotification(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock}, Necessário: ${part.quantity}`, 'error');
                }
            }
        });

        if (!hasError) {
            currentViewOrder.partsDeducted = true;
            // Salva a alteração na OS atual no banco principal
            const idx = db.orders.findIndex(o => o.id === currentViewOrder.id);
            if (idx !== -1) {
                db.orders[idx] = currentViewOrder;
            }
            save();
            renderInventory();
            renderMovements();

            showNotification('Peças debitadas do estoque com sucesso!', 'success');
        }
    }
}

function deleteOrder(id) {
    if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
        db.orders = db.orders.filter(o => o.id !== id);
        save();
        renderDashboard();
        renderOrders();
        showNotification('Ordem de serviço excluída com sucesso!', 'success');
    }
}

function updateOrderStatus(status) {
    if (currentViewOrder) {
        currentViewOrder.status = status;

        // --- Automação de Fechamento de O.S (Estoque e Financeiro) ---
        if (status === 'delivered') {
            // 1. Baixa Automática de Estoque (se houver peças e não tiver sido dada baixa ainda)
            if (currentViewOrder.parts && currentViewOrder.parts.length > 0 && !currentViewOrder.partsDeducted) {
                let stockError = false;

                // Checagem prévia de disponibilidade
                for (const part of currentViewOrder.parts) {
                    const product = db.products.find(p => p.id === part.productId);
                    if (!product || product.stock < part.quantity) {
                        stockError = true;
                        showNotification(`Estoque insuficiente para a peça: ${part.name || part.productId}. A baixa automática falhou.`, 'error');
                        break;
                    }
                }

                if (!stockError) {
                    currentViewOrder.parts.forEach(part => {
                        const product = db.products.find(p => p.id === part.productId);
                        if (product) {
                            product.stock -= part.quantity;
                            db.movements.unshift({
                                id: getMovementID(),
                                productId: product.id,
                                productName: product.name,
                                type: 'out',
                                quantity: part.quantity,
                                unitValue: product.cost,
                                totalValue: part.quantity * product.cost,
                                reason: 'os_use',
                                notes: `Baixa automática O.S. #${currentViewOrder.id} - ${currentViewOrder.client}`,
                                date: new Date().toISOString().split('T')[0],
                                orderId: currentViewOrder.id
                            });
                        }
                    });
                    currentViewOrder.partsDeducted = true;
                    renderInventory();
                    renderMovements();
                    showNotification('Baixa de peças aplicada automaticamente!', 'success');
                }
            }

            // 2. Lançamento Automático no Fluxo de Caixa (se total > 0 e não foi pago)
            if (currentViewOrder.total > 0 && !currentViewOrder.paid) {
                db.transactions.unshift({
                    id: 'TR' + Date.now().toString(36).toUpperCase().substr(-6),
                    type: 'income',
                    amount: currentViewOrder.total,
                    desc: `Faturamento O.S. #${currentViewOrder.id} - ${currentViewOrder.client}`,
                    category: 'service',
                    date: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString()
                });
                currentViewOrder.paid = true;

                if (typeof renderTransactions === 'function') renderTransactions();
                showNotification('Faturamento lançado no Caixa automaticamente!', 'success');
            }
        }
        // ----------------------------------------------------------------

        const index = db.orders.findIndex(o => o.id === currentViewOrder.id);
        if (index !== -1) {
            db.orders[index] = currentViewOrder;
            save();

            // Atualizar visualização
            document.getElementById('view-os-status').textContent = `Status: ${statusColors[status]?.label || status}`;

            // Atualizar outras views
            renderDashboard();
            renderOrders();

            showNotification('Status atualizado com sucesso!', 'success');
        }
    }
}

function editCurrentOrder() {
    if (currentViewOrder) {
        closeModal('orderViewModal');
        openOrderModal(currentViewOrder);
    }
}

function shareOrderWhatsApp() {
    // Implementação simplificada
    if (!currentViewOrder) return;

    const message = encodeURIComponent(
        `🔧 Ordem de Serviço #${currentViewOrder.id}\n` +
        `Cliente: ${currentViewOrder.client}\n` +
        `Equipamento: ${currentViewOrder.device}\n` +
        `Status: ${statusColors[currentViewOrder.status]?.label || 'Recebido'}\n` +
        `Total: ${fmtMoney(currentViewOrder.total)}`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
}

function updatePrintHeaders() {
    const s = db.settings;
    // Usando estilos inline mais robustos para impressão (evitando quebras de flexbox em navegadores antigos/drivers)
    const headerHTML = `
        <div class="print-header-container" style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 25px; width: 100%;">
            <h2 style="font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 2px;">${s.companyName || 'ASSISTÊNCIA TÉCNICA'}</h2>
            <div style="font-size: 12px; color: #666; margin-top: 8px; font-weight: 500;">
                ${s.companyDoc ? `<span style="margin: 0 10px;">CNPJ/CPF: ${s.companyDoc}</span>` : ''}
                ${s.companyPhone ? `<span style="margin: 0 10px;">TEL: ${s.companyPhone}</span>` : ''}
            </div>
            ${s.companyAddress ? `<p style="font-size: 10px; color: #999; margin: 5px 0 0 0; text-transform: uppercase;">${s.companyAddress}</p>` : ''}
        </div>
    `;

    const containers = [
        document.getElementById('invoice-print'),
        document.getElementById('report-result'),
        document.querySelector('#closingModal .p-6')
    ];

    containers.forEach(container => {
        if (!container) return;
        const existingHeader = container.querySelector('.print-header-container');
        if (existingHeader) {
            existingHeader.outerHTML = headerHTML;
        } else {
            container.insertAdjacentHTML('afterbegin', headerHTML);
        }
    });
}

function printOrderList() {
    const term = (document.getElementById('search-order')?.value || '').toLowerCase();
    const startDate = document.getElementById('filter-start')?.value || '';
    const endDate = document.getElementById('filter-end')?.value || '';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';
    let filtered = db.orders.filter(o => {
        const matchesTerm = !term || o.client.toLowerCase().includes(term) || o.device.toLowerCase().includes(term) || o.id.includes(term);
        const matchesDate = (!startDate || o.date >= startDate) && (!endDate || o.date <= endDate);
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchesTerm && matchesDate && matchesStatus;
    });
    const s = db.settings;
    const rows = filtered.map(o => `
        <tr>
            <td>${o.id}</td>
            <td>${o.client}</td>
            <td>${o.device}${o.brand ? ' — ' + o.brand : ''}</td>
            <td>${statusColors[o.status]?.label || o.status}</td>
            <td>${fmtDate(o.date)}</td>
            <td style="text-align:right">${fmtMoney(o.total)}</td>
        </tr>
    `).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Lista de O.S.</title>
        <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
        h2{text-align:center}table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#f0f0f0;font-weight:bold}</style></head><body>
        <h2>${s.companyName || 'ASSISTÊNCIA TÉCNICA'} — Lista de O.S.</h2>
        <p style="text-align:center;font-size:11px">Emitido em ${new Date().toLocaleString('pt-BR')}</p>
        <table><thead><tr><th>ID</th><th>Cliente</th><th>Equipamento</th><th>Status</th><th>Data</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p style="text-align:right;margin-top:10px;font-size:11px">Total: ${filtered.length} O.S.</p>
        </body></html>`);
    win.document.close();
    win.print();
}

function exportOrdersCSV() {
    const headers = ['ID', 'Cliente', 'Telefone', 'Equipamento', 'Marca', 'Status', 'Data', 'Total'];
    const rows = db.orders.map(o => [
        o.id,
        `"${o.client}"`,
        o.phone || '',
        `"${o.device}"`,
        o.brand || '',
        statusColors[o.status]?.label || o.status,
        fmtDate(o.date),
        (o.total || 0).toFixed(2).replace('.', ',')
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordens_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('CSV exportado com sucesso!', 'success');
}

function clearFilters() {
    // Implementação simplificada
    const firstDay = new Date();
    firstDay.setDate(1);
    const firstDayStr = firstDay.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const elements = [
        { id: 'search-order', value: '' },
        { id: 'filter-status', value: 'all' },
        { id: 'filter-start', value: firstDayStr },
        { id: 'filter-end', value: today }
    ];

    elements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    });

    renderOrders();
}















function printOSDualLayout() {
    const original = document.getElementById('invoice-print');
    if(!original) return;

    // Criar um container limpo na raiz do Body para fugir de qualquer "overflow" ou "fixed" do Modal originário
    const printContainer = document.createElement('div');
    printContainer.id = 'clean-print-container';

    const clone = original.cloneNode(true);
    clone.id = 'clean-invoice-print';

    // Assinatura Customizada
    const viaAssistencia = clone.querySelector('.text-center.mt-6');
    if(viaAssistencia) viaAssistencia.innerHTML = '---------- VIA DO CLIENTE & ASSISTÊNCIA ----------';

    // Capturar dados para a Comanda do Cliente
    const osNumber = clone.querySelector('#view-os-id') ? clone.querySelector('#view-os-id').innerText : 'N/A';
    const clientName = clone.querySelector('#view-client') ? clone.querySelector('#view-client').innerText : 'N/A';
    const deviceName = clone.querySelector('#view-device') ? clone.querySelector('#view-device').innerText : 'N/A';

    // O html tem 'Data: 13/03...', pegamos limpo
    let entryDate = 'N/A';
    if(clone.querySelector('#view-os-date')) {
        entryDate = clone.querySelector('#view-os-date').innerText.replace('Data:', '').trim();
    }

    // Criar Miniguia (Comanda) SUPER compacta para não empurrar a OS para a página 2
    const guiaHeader = document.createElement('div');
    guiaHeader.className = 'w-full mb-2 pb-2 font-sans text-sm border-b border-dashed border-gray-400';
    guiaHeader.innerHTML = `
        <div class="flex justify-between items-center mb-1">
            <h2 class="font-bold text-sm uppercase">Comanda do Cliente - ${osNumber}</h2>
            <span class="text-xs text-gray-500 font-bold">${entryDate}</span>
        </div>
        <div class="flex justify-between text-gray-700 text-xs">
            <span><strong>Cliente:</strong> ${clientName}</span>
            <span><strong>Aparelho:</strong> ${deviceName}</span>
        </div>
        <div class="text-center mt-2 text-[10px] font-bold text-gray-400">✂️ <span class="mx-2">LINHA DE CORTE</span> ✂️</div>
    `;

    clone.insertBefore(guiaHeader, clone.firstChild);

    printContainer.appendChild(clone);
    document.body.appendChild(printContainer);

    const styleId = 'print-single-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        // Mover a quebra de página de "mt-8" (Termos) para "financial-summary-container" (Resumo + Termos)
        styleEl.innerHTML = `
            @media print {
                @page { margin: 5mm; size: A4 portrait; }

                /* Esconde TUDO no body, exceto o nosso container limpo */
                body > *:not(#clean-print-container) { display: none !important; }

                body {
                    visibility: visible !important; background: white !important;
                    padding: 0 !important; margin: 0 !important;
                    height: auto !important; overflow: visible !important; display: block !important;
                }
                html { height: auto !important; overflow: visible !important; display: block !important; background: white !important; }

                #clean-print-container {
                    display: block !important; width: 100%; height: auto !important;
                    position: static !important; overflow: visible !important;
                    background: white !important;
                }

                #clean-invoice-print {
                    display: block !important; width: 100%; height: auto !important;
                    overflow: visible !important; padding: 0; margin: 0; box-sizing: border-box;
                    zoom: 0.85; /* Encolhendo 15% para caber toda a tabela de peças na Página 1 */
                    transform-origin: top left;
                }

                /* Forçar quebra de página trazendo o Resumo Financeiro + Termos para a Página 2 */
                #financial-summary-container {
                    page-break-before: always !important;
                    break-before: page !important;
                    margin-top: 20px !important;
                }

                /* Estilizando a tipografia e layout dos Termos de Garantia especificamente na impressão (Página 2) */
                #clean-print-container .text-\\[10px\\].text-gray-500.text-justify.leading-relaxed {
                    font-size: 13px !important;
                    line-height: 1.8 !important;
                    color: #374151 !important; /* text-gray-700 para maior legibilidade */
                    margin-bottom: 3rem !important; /* Espaço até as assinaturas */
                }

                #clean-print-container .uppercase.text-gray-700 {
                    font-size: 15px !important;
                    color: #1f2937 !important;
                    display: block !important;
                    margin-bottom: 15px !important;
                }

                #clean-print-container #view-warranty-terms {
                    border-bottom: none !important; /* Vamos usar uma linha superior nas assinaturas ao invés desta */
                }

                /* Aumentando e formatando os blocos de Assinatura */
                #clean-print-container .flex.justify-between.gap-8 {
                    margin-top: 60px !important;
                    padding-bottom: 30px !important;
                }

                #clean-print-container .flex-1.border-t.border-gray-400 {
                    border-top-width: 2px !important;
                    padding-top: 15px !important;
                }

                #clean-print-container .text-\\[10px\\].font-bold.text-gray-600.uppercase {
                    font-size: 13px !important;
                }

                #clean-print-container .text-\\[9px\\].text-gray-400 {
                    font-size: 11px !important;
                    margin-top: 5px !important;
                }

                /* Esconder o "VIA DA ASSISTÊNCIA" que fica repetido no fim pois já temos Comanda "VIA DO CLIENTE & ASSISTENCIA" no Topo */
                #clean-print-container .text-center.mt-6.text-\\[9px\\] {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(styleEl);
    }

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            // Limpeza completa após enviar impressora
            if (printContainer.parentNode) printContainer.parentNode.removeChild(printContainer);
            if (document.getElementById(styleId)) document.getElementById(styleId).remove();
        }, 1000);
    }, 150);
}

function populateTechnicianSelect(selectedValue = '') {
    const select = document.getElementById('order-technician');
    if (!select) return;

    const techs = db.settings.technicians || [];
    select.innerHTML = '<option value="">Selecione um técnico</option>' +
        techs.map(t => `<option value="${sanitizeHTML(t)}" ${t === selectedValue ? 'selected' : ''}>${sanitizeHTML(t)}</option>`).join('');
}
