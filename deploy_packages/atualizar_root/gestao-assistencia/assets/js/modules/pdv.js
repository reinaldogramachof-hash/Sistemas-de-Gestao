// ==========================================
// MÓDULO PDV (FRENTE DE CAIXA) - GESTÃO ASSISTÊNCIA
// ==========================================

let pdvCart = [];
let lastSaleId = null;

function renderPDVGrid(event) {
    const searchInput = document.getElementById('pdv-search');
    const term = (searchInput?.value || '').toLowerCase();
    const grid = document.getElementById('pdv-product-grid');
    const emptyMsg = document.getElementById('pdv-empty-products');

    if (!grid) return;

    // Popular seletor de clientes se houver
    populatePDVClients();

    // Filtra produtos ativos no estoque
    let filtered = db.products.filter(product =>
        product.name.toLowerCase().includes(term) ||
        (product.id && product.id.toLowerCase().includes(term)) ||
        (product.category && product.category.toLowerCase().includes(term))
    );

    // Suporte a Leitor de Código de Barras (Enter)
    if (event && event.key === 'Enter' && term.trim() !== '') {
        // Se houver um match exato por ID ou apenas um resultado, adiciona ao carrinho
        const exactMatch = filtered.find(p => p.id.toLowerCase() === term.trim().toLowerCase());
        const itemToAdd = exactMatch || (filtered.length === 1 ? filtered[0] : null);

        if (itemToAdd) {
            if (itemToAdd.stock > 0) {
                addToCart(itemToAdd.id);
                searchInput.value = '';
                renderPDVGrid(); // Refresh grid
                return;
            } else {
                showNotification('Produto sem estoque!', 'error');
            }
        }
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');
    grid.innerHTML = filtered.map(product => {
        const outOfStock = product.stock <= 0;
        return `
            <div class="bg-white border text-left border-gray-100 rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full ${outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''}"
                 onclick="${outOfStock ? '' : `addToCart('${product.id}')`}">
                <div class="flex-1">
                    <span class="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md mb-2 inline-block">${product.id}</span>
                    <h4 class="text-sm font-bold text-gray-800 line-clamp-2 leading-tight mb-1">${sanitizeHTML(product.name)}</h4>
                    <p class="text-xs text-gray-500 mb-2">${sanitizeHTML(product.category)}</p>
                </div>
                <div class="flex items-end justify-between mt-2 pt-2 border-t border-gray-50">
                    <div>
                        <p class="text-[10px] text-gray-400 font-medium">Estoque</p>
                        <p class="text-xs font-bold ${product.stock <= product.minStock ? 'text-red-500' : 'text-green-600'}">${product.stock} un.</p>
                    </div>
                    <p class="text-sm font-bold text-brand-primary">${fmtMoney(product.price)}</p>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addToCart(productId) {
    // Verificar se o caixa está aberto
    if (db.cashier.status !== 'open') {
        showNotification('O caixa está fechado! Abra o caixa antes de vender.', 'warning');
        openCashierModal();
        return;
    }

    const product = db.products.find(p => p.id === productId);
    if (!product) return;

    // Verifica se já está no carrinho
    const existingIndex = pdvCart.findIndex(item => item.productId === productId);

    if (existingIndex !== -1) {
        updateCartQty(existingIndex, 1);
    } else {
        if (product.stock <= 0) {
            showNotification('Produto sem estoque disponível!', 'error');
            return;
        }

        pdvCart.push({
            productId: product.id,
            name: product.name,
            price: Number(product.price),
            qty: 1,
            total: Number(product.price)
        });
        renderCart();
    }
}

function updateCartQty(index, delta) {
    const item = pdvCart[index];
    if (!item) return;

    const product = db.products.find(p => p.id === item.productId);
    const newQty = item.qty + delta;

    if (newQty <= 0) {
        removeFromCart(index);
        return;
    }

    if (newQty > product.stock) {
        showNotification(`Estoque insuficiente! Disponível: ${product.stock}`, 'warning');
        return;
    }

    item.qty = newQty;
    item.total = item.qty * item.price;
    renderCart();
}

function renderCart() {
    const container = document.getElementById('pdv-cart-items');
    const emptyMsg = document.getElementById('pdv-cart-empty');

    if (!container) return;

    if (pdvCart.length === 0) {
        container.innerHTML = '';
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        renderCartTotals();
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');
    container.innerHTML = pdvCart.map((item, index) => `
        <div class="bg-gray-50 rounded-lg p-2 flex flex-col gap-2 group">
            <div class="flex items-center justify-between gap-2">
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-gray-800 truncate">${sanitizeHTML(item.name)}</p>
                    <p class="text-[10px] text-gray-500">${fmtMoney(item.price)}</p>
                </div>
                <button onclick="removeFromCart(${index})" class="text-gray-300 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
            <div class="flex items-center justify-between">
                <div class="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden">
                    <button onclick="updateCartQty(${index}, -1)" class="px-2 py-1 hover:bg-gray-100 text-gray-500 text-sm font-bold">-</button>
                    <span class="px-3 py-1 text-xs font-bold text-gray-700 border-x border-gray-100">${item.qty}</span>
                    <button onclick="updateCartQty(${index}, 1)" class="px-2 py-1 hover:bg-gray-100 text-gray-500 text-sm font-bold">+</button>
                </div>
                <div class="font-bold text-xs text-brand-primary">${fmtMoney(item.total)}</div>
            </div>
        </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderCartTotals();
}

function removeFromCart(index) {
    pdvCart.splice(index, 1);
    renderCart();
}

function clearCart() {
    if (pdvCart.length > 0) {
        if (confirm('Tem certeza que deseja esvaziar o carrinho?')) {
            pdvCart = [];
            const discInput = document.getElementById('pdv-discount');
            if (discInput) discInput.value = 0;
            renderCart();
        }
    }
}

function renderCartTotals() {
    const subtotal = pdvCart.reduce((sum, item) => sum + item.total, 0);
    const discountPct = parseFloat(document.getElementById('pdv-discount')?.value) || 0;
    const discountVal = subtotal * (discountPct / 100);
    const total = subtotal - discountVal;

    const subEl = document.getElementById('pdv-subtotal');
    const discValEl = document.getElementById('pdv-discount-val');
    const totEl = document.getElementById('pdv-total');

    if (subEl) subEl.textContent = fmtMoney(subtotal);
    if (discValEl) discValEl.textContent = '- ' + fmtMoney(discountVal);
    if (totEl) totEl.textContent = fmtMoney(total);

    const salesCountEl = document.getElementById('pdv-sales-count');
    if (salesCountEl) {
        salesCountEl.textContent = `${db.pdvSales.length} venda(s)`;
    }

    calculateChange();
}

function toggleChangeInput() {
    const paymentMethodEl = document.querySelector('input[name="pdv-payment"]:checked');
    if (!paymentMethodEl) return;
    const paymentMethod = paymentMethodEl.value;

    const splitSection = document.getElementById('pdv-split-section');
    const changeSection = document.getElementById('pdv-change-section') || document.getElementById('pdv-change-row');

    if (splitSection) {
        if (paymentMethod === 'misto') splitSection.classList.remove('hidden');
        else splitSection.classList.add('hidden');
    }

    if (changeSection) {
        // Mostra seção de troco apenas para dinheiro ou misto
        if (paymentMethod === 'dinheiro' || paymentMethod === 'misto') changeSection.classList.remove('hidden');
        else changeSection.classList.add('hidden');
    }

    calculateChange();
}

function calculateChange() {
    const paymentMethodEl = document.querySelector('input[name="pdv-payment"]:checked');
    if (!paymentMethodEl) return;
    const paymentMethod = paymentMethodEl.value;

    const subtotal = pdvCart.reduce((sum, item) => sum + item.total, 0);
    const discountPct = parseFloat(document.getElementById('pdv-discount')?.value) || 0;
    const total = subtotal - (subtotal * (discountPct / 100));

    const changeValEl = document.getElementById('pdv-change-val');
    if (!changeValEl) return;

    let received = 0;

    if (paymentMethod === 'dinheiro') {
        const receivedInput = document.getElementById('pdv-amount-received') || document.getElementById('pdv-received');
        received = parseFloat(receivedInput?.value) || 0;
    } else if (paymentMethod === 'misto') {
        const splitDin = parseFloat(document.getElementById('pdv-split-dinheiro')?.value) || 0;
        const splitCart = parseFloat(document.getElementById('pdv-split-cartao')?.value) || 0;
        const splitPix = parseFloat(document.getElementById('pdv-split-pix')?.value) || 0;
        received = splitDin + splitCart + splitPix;

        const splitTotEl = document.getElementById('pdv-split-total');
        if (splitTotEl) {
            splitTotEl.textContent = fmtMoney(received);
            splitTotEl.className = `font-bold ${received >= total ? 'text-green-600' : 'text-orange-600'}`;
        }
    } else {
        received = total;
    }

    if (received > total + 0.01) {
        const change = received - total;
        changeValEl.textContent = fmtMoney(change);
        changeValEl.classList.remove('text-red-500');
        changeValEl.classList.add('text-green-600');
    } else if (received > 0 && received < total - 0.01) {
        const pending = total - received;
        changeValEl.textContent = 'Falta ' + fmtMoney(pending);
        changeValEl.classList.remove('text-green-600');
        changeValEl.classList.add('text-red-500');
    } else {
        changeValEl.textContent = 'R$ 0,00';
        changeValEl.classList.remove('text-red-500');
        changeValEl.classList.add('text-green-600');
    }
}

function populatePDVClients() {
    const select = document.getElementById('pdv-client-select');
    if (!select) return;

    // Preserva o valor selecionado se houver
    const currentVal = select.value;

    let html = '<option value="">👤 Consumidor Final (Padrão)</option>';
    db.clients.sort((a, b) => a.name.localeCompare(b.name)).forEach(client => {
        html += `<option value="${client.id}" ${currentVal === client.id ? 'selected' : ''}>${sanitizeHTML(client.name)}</option>`;
    });

    select.innerHTML = html;
}

function finalizeSale() {
    if (pdvCart.length === 0) return;

    // Verificar se o caixa está aberto
    if (db.cashier.status !== 'open') {
        showNotification('O caixa está fechado!', 'error');
        return;
    }

    const subtotal = pdvCart.reduce((sum, item) => sum + item.total, 0);
    const discountPct = parseFloat(document.getElementById('pdv-discount')?.value) || 0;
    const discountVal = subtotal * (discountPct / 100);
    const total = subtotal - discountVal;

    const paymentMethodEl = document.querySelector('input[name="pdv-payment"]:checked');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'dinheiro';

    let received = 0;
    let splitDetails = null;

    if (paymentMethod === 'dinheiro') {
        const receivedInput = document.getElementById('pdv-amount-received') || document.getElementById('pdv-received');
        received = parseFloat(receivedInput?.value) || 0;
    } else if (paymentMethod === 'misto') {
        const splitDin = parseFloat(document.getElementById('pdv-split-dinheiro')?.value) || 0;
        const splitCart = parseFloat(document.getElementById('pdv-split-cartao')?.value) || 0;
        const splitPix = parseFloat(document.getElementById('pdv-split-pix')?.value) || 0;
        received = splitDin + splitCart + splitPix;
        splitDetails = { dinheiro: splitDin, cartao: splitCart, pix: splitPix };
    } else {
        received = total;
    }

    if (received < total - 0.01) {
        showNotification('O valor recebido é menor que o total da venda!', 'error');
        return;
    }

    const clientId = document.getElementById('pdv-client-select')?.value || null;
    const saleId = 'V' + Date.now().toString(36).toUpperCase().substr(-5);
    const saleDate = new Date().toISOString();
    const change = Math.max(0, received - total);

    // 1. Registrar Venda
    db.pdvSales.unshift({
        id: saleId,
        date: saleDate,
        clientId: clientId, // Vincula ao cliente
        items: [...pdvCart],
        subtotal: subtotal,
        discount: discountVal,
        total: total,
        payment: paymentMethod,
        received: received,
        changeValue: change,
        splitDetails: splitDetails
    });

    // 1.1 Atualizar Total Gasto do Cliente se houver
    if (clientId) {
        const clientIdx = db.clients.findIndex(c => c.id === clientId);
        if (clientIdx > -1) {
            db.clients[clientIdx].totalSpent = (db.clients[clientIdx].totalSpent || 0) + total;
        }
    }

    // 2. Baixa no Estoque
    pdvCart.forEach(item => {
        const pIdx = db.products.findIndex(p => p.id === item.productId);
        if (pIdx > -1) {
            db.products[pIdx].stock -= item.qty;

            db.movements.unshift({
                id: getMovementID(),
                productId: item.productId,
                type: 'out',
                qty: item.qty,
                reason: `Venda PDV #${saleId}`,
                date: saleDate
            });
        }
    });

    // 3. Financeiro
    if (paymentMethod === 'misto' && splitDetails) {
        if (splitDetails.dinheiro > 0) {
            db.transactions.unshift({
                id: 'TR' + Date.now().toString(36).toUpperCase().substr(-6),
                type: 'income', amount: splitDetails.dinheiro - change, desc: `Venda PDV #${saleId} (Dinheiro)`,
                category: 'sale', date: saleDate.split('T')[0], method: 'money', createdAt: saleDate
            });
        }
        if (splitDetails.cartao > 0) {
            db.transactions.unshift({
                id: 'TR' + Date.now().toString(36).toUpperCase().substr(-6),
                type: 'income', amount: splitDetails.cartao, desc: `Venda PDV #${saleId} (Cartão)`,
                category: 'sale', date: saleDate.split('T')[0], method: 'credit', createdAt: saleDate
            });
        }
        if (splitDetails.pix > 0) {
            db.transactions.unshift({
                id: 'TR' + Date.now().toString(36).toUpperCase().substr(-6),
                type: 'income', amount: splitDetails.pix, desc: `Venda PDV #${saleId} (Pix)`,
                category: 'sale', date: saleDate.split('T')[0], method: 'pix', createdAt: saleDate
            });
        }
    } else {
        db.transactions.unshift({
            id: 'TR' + Date.now().toString(36).toUpperCase().substr(-6),
            type: 'income', amount: total, desc: `Venda PDV #${saleId}`,
            category: 'sale', date: saleDate.split('T')[0], method: paymentMethod, createdAt: saleDate
        });
    }

    save();
    pdvCart = [];
    if (document.getElementById('pdv-discount')) document.getElementById('pdv-discount').value = 0;
    const amountReceivedInput = document.getElementById('pdv-amount-received') || document.getElementById('pdv-received');
    if (amountReceivedInput) amountReceivedInput.value = '';

    renderCart();
    renderPDVGrid();
    renderDashboard();
    renderPDVSalesHistory();

    showNotification('Venda finalizada com sucesso!', 'success');

    // Abre modal de confirmação de impressão
    lastSaleId = saleId;
    const successModal = document.getElementById('pdvSuccessModal');
    if (successModal) {
        successModal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Foca na busca novamente após um tempo
    setTimeout(() => {
        document.getElementById('pdv-search')?.focus();
    }, 500);
}

function printLastSale() {
    if (lastSaleId) {
        printSaleReceipt(lastSaleId);
        closeModal('pdvSuccessModal');
    }
}

function printSaleReceipt(id) {
    const sale = db.pdvSales.find(s => s.id === id);
    if (!sale) return;

    const win = window.open('', '_blank');
    if (!win) {
        showNotification('Bloqueador de Pop-ups impediu a abertura do recibo!', 'warning');
        return;
    }

    win.document.write(`
        <html>
        <head>
            <title>Recibo PDV #${sale.id}</title>
            <style>
                @page { size: auto; margin: 0mm; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 72mm; /* Padrão para 80mm com margem */
                    margin: 0 auto;
                    padding: 5mm;
                    font-size: 11px;
                    line-height: 1.2;
                    color: #000;
                }
                .center { text-align: center; }
                .divider { border-top: 1px dashed #000; margin: 5mm 0; }
                table { width: 100%; border-collapse: collapse; }
                .right { text-align: right; }
                .bold { font-weight: bold; }
                .item-row td { padding: 1mm 0; }
                .total-row td { padding-top: 2mm; }
                .receipt-header { margin-bottom: 3mm; }
                .receipt-footer { margin-top: 5mm; font-size: 10px; }
            </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
            <div class="center receipt-header">
                <strong style="font-size: 14px;">${db.settings.companyName.toUpperCase()}</strong><br>
                ${db.settings.companyDoc ? `CNPJ/CPF: ${db.settings.companyDoc}<br>` : ''}
                ${db.settings.companyPhone ? `FONE: ${db.settings.companyPhone}<br>` : ''}
                ${db.settings.companyAddress ? `END: ${db.settings.companyAddress}<br>` : ''}
            </div>

            <div class="divider"></div>

            <div class="center bold">CUPOM NÃO FISCAL</div>
            <div class="center">
                VENDA: #${sale.id}<br>
                DATA: ${new Date(sale.date).toLocaleString('pt-BR')}
            </div>

            <div class="divider"></div>

            <table>
                <thead>
                    <tr class="bold">
                        <th align="left">ITEM</th>
                        <th align="right">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${sale.items.map(i => `
                        <tr class="item-row">
                            <td>${i.qty}x ${sanitizeHTML(i.name).substring(0, 22)}</td>
                            <td class="right">${fmtMoney(i.total)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="divider"></div>

            <table class="total-row">
                <tr>
                    <td>Subtotal:</td>
                    <td class="right">${fmtMoney(sale.subtotal)}</td>
                </tr>
                ${sale.discount > 0 ? `
                <tr>
                    <td>Desconto:</td>
                    <td class="right">-${fmtMoney(sale.discount)}</td>
                </tr>` : ''}
                <tr class="bold" style="font-size: 13px;">
                    <td>TOTAL:</td>
                    <td class="right">${fmtMoney(sale.total)}</td>
                </tr>
            </table>

            <div class="divider"></div>

            <div class="center text-sm">
                <strong>FORMA DE PAGAMENTO</strong><br>
                ${sale.payment.toUpperCase()}
                ${sale.changeValue > 0 ? `<br>TROCO: ${fmtMoney(sale.changeValue)}` : ''}
            </div>

            <div class="divider"></div>

            <div class="center receipt-footer">
                OBRIGADO PELA PREFERÊNCIA!<br>
                www.gestaoassistencia.com.br
            </div>

            <div style="height: 10mm;"></div> <!-- Espaço para corte -->
        </body>
        </html>
    `);
    win.document.close();
}

function renderPDVSalesHistory() {
    const container = document.getElementById('pdv-history-body');
    const emptyMsg = document.getElementById('pdv-history-empty');
    if (!container) return;

    if (db.pdvSales.length === 0) {
        container.innerHTML = '';
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');

    const methodMap = {
        'money': 'Dinheiro',
        'dinheiro': 'Dinheiro',
        'credit': 'Cartão',
        'cartao': 'Cartão',
        'pix': 'Pix',
        'misto': 'Misto'
    };

    container.innerHTML = db.pdvSales.slice(0, 10).map(sale => `
        <tr class="border-b border-gray-50 text-xs hover:bg-gray-50 transition-colors">
            <td class="px-6 py-3 font-bold text-gray-700">#${sale.id}</td>
            <td class="px-6 py-3 text-gray-600">
                <div class="flex flex-col">
                    <span class="font-medium">${new Date(sale.date).toLocaleDateString('pt-BR')}</span>
                    <span class="text-[10px] text-gray-400 text-uppercase">${new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </td>
            <td class="px-6 py-3">
                <span class="text-xs text-gray-500">${sale.items.length} item(ns)</span>
            </td>
            <td class="px-6 py-3">
                <span class="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border border-blue-100">${methodMap[sale.payment] || sale.payment}</span>
            </td>
            <td class="px-6 py-3 font-bold text-gray-800 text-right">${fmtMoney(sale.total)}</td>
            <td class="px-6 py-3 text-center">
                <button onclick="printSaleReceipt('${sale.id}')" title="Reimprimir Cupom" class="text-blue-500 hover:text-blue-700 transition-colors p-1.5 hover:bg-blue-50 rounded-lg">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==========================================
// FUNÇÕES DE CONTROLE DE CAIXA (ABRIR/FECHAR)
// ==========================================

function updateCashierUI() {
    const statusLabel = document.getElementById('cashier-status-label');
    const actionBtn = document.getElementById('cashier-action-btn');
    const pdvSection = document.getElementById('pdv-layout-container');
    const lockedOverlay = document.getElementById('pdv-locked-overlay');

    if (!statusLabel || !actionBtn) return;

    if (db.cashier.status === 'open') {
        statusLabel.innerHTML = `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Caixa Aberto
        </span>`;
        actionBtn.innerHTML = `<i data-lucide="lock" class="w-4 h-4"></i> Fechar Caixa`;
        actionBtn.onclick = confirmCloseCashier;
        actionBtn.className = "flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors";

        if (pdvSection) {
            pdvSection.classList.remove('grayscale', 'opacity-50', 'pointer-events-none');
        }
        if (lockedOverlay) {
            lockedOverlay.classList.add('hidden');
        }

        // Renderiza o grid se estiver aberto para garantir que os itens apareçam
        renderPDVGrid();
    } else {
        statusLabel.innerHTML = `<span class="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">Caixa Fechado</span>`;
        actionBtn.innerHTML = `<i data-lucide="unlock" class="w-4 h-4"></i> Abrir Caixa`;
        actionBtn.onclick = openCashierModal;
        actionBtn.className = "flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors";

        if (pdvSection) {
            pdvSection.classList.add('grayscale', 'opacity-50', 'pointer-events-none');
        }
        if (lockedOverlay) {
            lockedOverlay.classList.remove('hidden');
        }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openCashierModal() {
    const modal = document.getElementById('cashierOpenModal');
    if (modal) modal.classList.remove('hidden');
}

function submitOpenCashier(event) {
    if (event) event.preventDefault();
    const amountInput = document.getElementById('cashier-opening-amount');
    const amount = parseFloat(amountInput?.value) || 0;

    db.cashier = {
        status: 'open',
        openedAt: new Date().toISOString(),
        closedAt: null,
        initialAmount: amount,
        balance: amount
    };

    save();
    closeModal('cashierOpenModal');
    updateCashierUI();
    showNotification('Caixa aberto com sucesso!', 'success');
}

function confirmCloseCashier() {
    // Calcular resumo das vendas desde a abertura
    const openedAt = new Date(db.cashier.openedAt);
    const salesSinceOpen = db.pdvSales.filter(sale => new Date(sale.date) >= openedAt);
    const totalSales = salesSinceOpen.reduce((sum, sale) => sum + sale.total, 0);

    // Injetar dados no modal de fechamento (usando o modal que já existe no HTML)
    const closingDateEl = document.getElementById('closing-date');
    const closingIncEl = document.getElementById('closing-inc');
    const closingExpEl = document.getElementById('closing-exp');
    const closingBalEl = document.getElementById('closing-bal');

    if (closingDateEl) closingDateEl.textContent = 'Fechamento de Caixa';
    if (closingIncEl) closingIncEl.textContent = fmtMoney(totalSales + db.cashier.initialAmount);
    if (closingExpEl) closingExpEl.textContent = 'Abertura: ' + fmtMoney(db.cashier.initialAmount);
    if (closingBalEl) closingBalEl.textContent = fmtMoney(totalSales);

    const modal = document.getElementById('closingModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Sobrescrever o botão de conclusão do modal original para efetivar o fechamento no DB
        const footerBtn = modal.querySelector('button[onclick="closeModal(\'closingModal\')"]');
        if (footerBtn) {
            footerBtn.onclick = finalizeCashierClosing;
        }
    }
}

function finalizeCashierClosing() {
    db.cashier.status = 'closed';
    db.cashier.closedAt = new Date().toISOString();
    save();
    closeModal('closingModal');
    updateCashierUI();
    showNotification('Caixa fechado com sucesso!', 'info');
}
