// PDV LOGIC
let pdvCart = [];

function renderPDV() {
    renderPDVGrid();
    renderPDVCart();
    populatePDVClients();
    populatePDVProfessionals();
}

function renderPDVGrid() {
    const term = document.getElementById('pdv-search').value.toLowerCase();
    const grid = document.getElementById('pdv-product-grid');
    grid.innerHTML = '';

    db.inventory.forEach(p => {
        if (p.name.toLowerCase().includes(term) || (p.id && p.id.toLowerCase().includes(term))) {
            const stockColor = p.quantity <= 0 ? 'text-rose-500' : (p.quantity <= (p.minQuantity || p.minStock || 2) ? 'text-amber-500' : 'text-emerald-500');
            const disabled = p.quantity <= 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:border-brand-blue';

            grid.innerHTML += `
                <div onclick="addPDVCart('${p.id}')" class="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-white/10 ${disabled} transition-all">
                    <p class="font-bold text-sm text-slate-800 dark:text-white truncate">${p.name}</p>
                    <p class="text-xs text-slate-500 mt-1">R$ ${parseFloat(p.price || p.unitPrice).toFixed(2)}</p>
                    <p class="text-[10px] font-bold ${stockColor} mt-2">Estoque: ${p.quantity}</p>
                </div>
            `;
        }
    });
}

function addPDVCart(productId) {
    const product = db.inventory.find(i => i.id === productId);
    if(product && product.quantity > 0) {
        pdvCart.push({ id: product.id, name: product.name, price: parseFloat(product.price || product.unitPrice) });
        renderPDVCart();
    }
}

function clearPDVCart() {
    pdvCart = [];
    renderPDVCart();
}

function renderPDVCart() {
    const list = document.getElementById('pdv-cart-items');
    list.innerHTML = '';
    let total = 0;

    if (pdvCart.length === 0) {
        list.innerHTML = `
            <p id="pdv-cart-empty" class="text-center text-slate-400 dark:text-slate-500 text-sm py-6">
                <i data-lucide="shopping-cart" class="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 block"></i>
                Nenhum item adicionado
            </p>`;
    } else {
        pdvCart.forEach((p, index) => {
            total += p.price;
            list.innerHTML += `
                <div class="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-white/5">
                    <div class="flex items-center gap-2">
                        <button onclick="removePDVCart(${index})" class="text-rose-500 hover:text-rose-700">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${p.name}</span>
                    </div>
                    <span class="text-xs font-bold text-slate-900 dark:text-white">R$ ${p.price.toFixed(2)}</span>
                </div>
            `;
        });
    }
    document.getElementById('pdv-total').textContent = `R$ ${total.toFixed(2)}`;

    // Preview de comissão do profissional selecionado
    const pro = getPDVSelectedPro();
    const commRow   = document.getElementById('pdv-commission-row');
    const commLabel = document.getElementById('pdv-commission-label');
    const commVal   = document.getElementById('pdv-commission-val');
    if (pro && pro.commission > 0 && pdvCart.length > 0) {
        const commAmt = total * (pro.commission / 100);
        commLabel.textContent = `Comissão — ${pro.name} (${pro.commission}%)`;
        commVal.textContent   = `R$ ${commAmt.toFixed(2)}`;
        commRow.classList.remove('hidden');
    } else {
        commRow.classList.add('hidden');
    }

    lucide.createIcons();
}

function removePDVCart(index) {
    pdvCart.splice(index, 1);
    renderPDVCart();
}

function populatePDVClients() {
    const sel = document.getElementById('pdv-client-select');
    sel.innerHTML = '<option value="">Selecione um cliente...</option>';
    db.clients.forEach(c => {
        sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
}

function populatePDVProfessionals() {
    const sel = document.getElementById('pdv-pro-select');
    sel.innerHTML = '<option value="">Sem Profissional (Balcão)</option>';
    db.team.forEach(pro => {
        sel.innerHTML += `<option value="${pro.id}">${pro.name} (${pro.commission}%)</option>`;
    });
}

function getPDVSelectedPro() {
    const proId = document.getElementById('pdv-pro-select').value;
    if (!proId) return null;
    return db.team.find(t => t.id === proId) || null;
}

function togglePDVSaleType() {
    const isClient = document.querySelector('input[name="pdv-sale-type"][value="client"]').checked;
    if(isClient) {
        document.getElementById('pdv-client-container').classList.remove('hidden');
        document.getElementById('pdv-fiado-btn').classList.remove('hidden');
    } else {
        document.getElementById('pdv-client-container').classList.add('hidden');
        document.getElementById('pdv-fiado-btn').classList.add('hidden');
        // Reset payment back to dinheiro if it was pending
        const pendingRadio = document.querySelector('input[name="pdv-payment"][value="pendente"]');
        if(pendingRadio && pendingRadio.checked) {
            document.querySelector('input[name="pdv-payment"][value="dinheiro"]').checked = true;
        }
    }
}

function finalizePDVSale() {
    if(pdvCart.length === 0) return showNotification('Adicione produtos ao carrinho!', 'error');

    try {
        const isClient = document.querySelector('input[name="pdv-sale-type"][value="client"]').checked;
        const clientId = isClient ? (document.getElementById('pdv-client-select').value || '').trim() : 'avulso';
        const payment = document.querySelector('input[name="pdv-payment"]:checked').value;

        if(isClient && !clientId) return showNotification('Selecione um cliente!', 'error');

        const isPending = (payment === 'pendente');
        if(isPending && !isClient) return showNotification('Fiado exige um cliente vinculado!', 'error');

        let total = 0;
        pdvCart.forEach(p => {
            total += p.price;
            const invItem = db.inventory.find(i => i.id === p.id);
            if(invItem && invItem.quantity > 0) {
                invItem.quantity--;
                db.stockMovements.push({
                    id: getID(),
                    date: getLocalIsoDate(),
                    productId: p.id,
                    productName: p.name,
                    type: 'out',
                    quantity: 1,
                    reason: `Venda Direta PDV`
                });
                checkLowStock(invItem);
            }
        });

        const pro = getPDVSelectedPro();
        const proId         = pro ? pro.id   : 'pdv';
        const proName       = pro ? pro.name : 'Caixa Balcão';
        const commissionVal = pro ? total * ((parseFloat(pro.commission) || 0) / 100) : 0;
        const proLabel      = pro ? pro.name : 'Balcão';
        const itemNames     = pdvCart.map(p => p.name).join(', ');

        const t = {
            id: getID(),
            type: 'income',
            description: `PDV [${proLabel}]: ${itemNames}`,
            amount: total,
            date: getLocalIsoDate(),
            proId: proId,
            proName: proName,
            serviceId: 'pdv',
            clientId: clientId === 'avulso' ? null : clientId,
            commission: commissionVal,
            commissionPaid: false,
            isPending: isPending,
            productsOrigin: pdvCart.map(p => ({id: p.id, name: p.name, price: p.price}))
        };

        db.transactions.push(t);
        save();
        clearPDVCart();
        renderPDVGrid();

        if(isPending) showNotification('Venda PDV registrada como FIADO na ficha do cliente!', 'warning');
        else showNotification('Venda PDV finalizada com sucesso!', 'success');
    } catch(err) {
        console.error('[PDV] Erro ao finalizar venda:', err);
        showNotification('Erro ao finalizar venda. Verifique o console.', 'error');
    }
}

// Os métodos de CRM e Fiado redundantes foram removidos e consolidados em app_core.js
