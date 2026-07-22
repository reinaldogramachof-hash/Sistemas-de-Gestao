// ==========================================
// MÓDULO ESTOQUE E PRODUTOS - GESTÃO ASSISTÊNCIA
// ==========================================

function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('product-id').value = product?.id || '';
    document.getElementById('product-name').value = product?.name || '';
    document.getElementById('product-price').value = product ? (product.price || 0).toFixed(2).replace('.', ',') : '';
    document.getElementById('product-cost').value = product ? (product.cost || 0).toFixed(2).replace('.', ',') : '';
    document.getElementById('product-stock').value = product?.stock || 0;
    document.getElementById('product-min-stock').value = product?.minStock || 5;
    document.getElementById('product-category').value = product?.category || 'Peças';

    const titleEl = modal.querySelector('h3');
    if (titleEl) titleEl.textContent = product ? 'Editar Produto' : 'Novo Produto';

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    calculateProfit();
}

function submitProduct(event) {
    if (event) event.preventDefault();

    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value.replace(',', '.')) || 0;
    const cost = parseFloat(document.getElementById('product-cost').value.replace(',', '.')) || 0;
    const stock = parseInt(document.getElementById('product-stock').value) || 0;
    const minStock = parseInt(document.getElementById('product-min-stock').value) || 5;
    const category = document.getElementById('product-category').value;

    if (!name) {
        showNotification('O nome do produto é obrigatório!', 'error');
        return;
    }

    const product = {
        id: id || getProductID(),
        name,
        price,
        cost,
        stock,
        minStock,
        category,
        updatedAt: new Date().toISOString()
    };

    if (id) {
        const idx = db.products.findIndex(p => p.id === id);
        if (idx !== -1) {
            // Se o estoque mudou, registrar uma movimentação de ajuste
            const oldStock = db.products[idx].stock;
            if (oldStock !== stock) {
                const diff = stock - oldStock;
                addMovement(id, diff > 0 ? 'in' : 'out', Math.abs(diff), 'Ajuste Manual');
            }
            db.products[idx] = product;
        }
    } else {
        db.products.unshift(product);
        addMovement(product.id, 'in', stock, 'Estoque Inicial');
    }

    save();
    closeModal('productModal');
    renderInventory();
    renderDashboard();
    if (typeof populateProductSelectors === 'function') populateProductSelectors();
    showNotification(id ? 'Produto atualizado!' : 'Produto cadastrado!', 'success');
}

function calculateProfit() {
    const cost = parseFloat(document.getElementById('product-cost')?.value) || 0;
    const price = parseFloat(document.getElementById('product-price')?.value) || 0;

    const profitVal = price - cost;
    const profitPercent = cost > 0 ? (profitVal / cost) * 100 : (price > 0 ? 100 : 0);

    const valEl = document.getElementById('product-profit-val');
    const percentEl = document.getElementById('product-profit-percent');

    if (valEl) valEl.textContent = fmtMoney(profitVal);
    if (percentEl) percentEl.textContent = profitPercent.toFixed(1).replace('.', ',') + '%';

    // Mudar cor baseado no lucro
    const container = document.getElementById('product-profit-stats');
    if (container) {
        if (profitVal < 0) {
            container.className = "bg-red-50 p-3 rounded-xl border border-red-100 grid grid-cols-2 gap-4 animate-pulse";
        } else if (profitVal === 0) {
            container.className = "bg-gray-50 p-3 rounded-xl border border-gray-100 grid grid-cols-2 gap-4";
        } else {
            container.className = "bg-green-50 p-3 rounded-xl border border-green-100 grid grid-cols-2 gap-4";
        }
    }
}

function renderInventory() {
    const term = (document.getElementById('search-inventory')?.value || '').toLowerCase();
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    const filterCat = document.getElementById('filter-category')?.value || 'all';
    const filterStock = document.getElementById('filter-stock')?.value || 'all';

    let filtered = db.products.filter(p => {
        const matchesTerm = p.name.toLowerCase().includes(term) ||
            p.id.toLowerCase().includes(term) ||
            (p.category && p.category.toLowerCase().includes(term));

        const matchesCat = filterCat === 'all' || p.category === filterCat;

        let matchesStock = true;
        if (filterStock === 'low') matchesStock = p.stock > 0 && p.stock <= p.minStock;
        else if (filterStock === 'critical') matchesStock = p.stock > 0 && p.stock <= (p.minStock / 2);
        else if (filterStock === 'out') matchesStock = p.stock <= 0;

        return matchesTerm && matchesCat && matchesStock;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-gray-500">Nenhum produto encontrado.</td></tr>';
        updateInventoryStats(filtered);
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const isCritical = p.stock === 0;
        const isLow = p.stock > 0 && p.stock <= p.minStock;
        const stockClass = isCritical ? 'text-red-600 font-bold' : isLow ? 'text-yellow-600 font-bold' : 'text-green-600 font-bold';

        const productData = JSON.stringify(p).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        return `
            <tr class="hover:bg-gray-50 border-b border-gray-100 group transition-colors">
                <td class="px-6 py-4 text-xs font-mono text-gray-400">${p.id}</td>
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-800">${sanitizeHTML(p.name)}</div>
                    <div class="text-xs text-gray-400">${sanitizeHTML(p.category)}</div>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="${stockClass}">${p.stock}</div>
                    <div class="text-[10px] text-gray-400">mín: ${p.minStock}</div>
                </td>
                <td class="px-6 py-4 text-right text-sm text-gray-600">
                    ${fmtMoney(p.price)}
                </td>
                <td class="px-6 py-4 text-right text-gray-400 text-xs">
                    ${fmtMoney(p.cost)}
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="openProductHistory('${p.id}')"
                                class="text-gray-400 hover:text-purple-500 transition-colors" title="Ver Histórico">
                            <i data-lucide="history" class="w-4 h-4"></i>
                        </button>
                        <button onclick="openProductModal(${productData})"
                                class="text-gray-400 hover:text-blue-500 transition-colors" title="Editar">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteProduct('${p.id}')"
                                class="text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateInventoryStats(filtered);
}

function updateInventoryStats(products) {
    const totalItemsEl = document.getElementById('inv-total');
    const totalValueEl = document.getElementById('inv-value');
    const lowStockEl = document.getElementById('inv-low');
    const categoriesEl = document.getElementById('inv-categories');

    const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
    const totalValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    const categoriesCount = new Set(products.map(p => p.category)).size;

    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (totalValueEl) totalValueEl.textContent = fmtMoney(totalValue);
    if (lowStockEl) lowStockEl.textContent = lowStockCount;
    if (categoriesEl) categoriesEl.textContent = categoriesCount;

    populateInventoryCategories();
}

function populateInventoryCategories() {
    const select = document.getElementById('filter-category');
    if (!select) return;

    const currentVal = select.value;
    const categories = [...new Set(db.products.map(p => p.category))].filter(Boolean);

    select.innerHTML = '<option value="all">Todas Categorias</option>' +
        categories.sort().map(cat => `<option value="${cat}" ${cat === currentVal ? 'selected' : ''}>${cat}</option>`).join('');
}

function deleteProduct(id) {
    if (confirm('Tem certeza que deseja excluir este produto?\n\nEsta ação não pode ser desfeita.')) {
        // Verificar se usado em O.S. (opcional, mas seguro)
        const usedInOrders = db.orders.some(o => o.parts && o.parts.some(part => part.productId === id));
        if (usedInOrders) {
            showNotification('Este produto está vinculado a ordens de serviço e não pode ser excluído.', 'error');
            return;
        }

        db.products = db.products.filter(p => p.id !== id);
        save();
        renderInventory();
        renderDashboard();
        if (typeof populateProductSelectors === 'function') populateProductSelectors();
        showNotification('Produto excluído!', 'success');
    }
}

function openMovementModal() {
    const modal = document.getElementById('movementModal');
    if (!modal) return;

    // Popular seletor de produtos
    const select = document.getElementById('move-product');
    if (select) {
        select.innerHTML = '<option value="">Selecione o produto</option>' +
            db.products.map(p => `<option value="${p.id}">${sanitizeHTML(p.name)} (Qtd: ${p.stock})</option>`).join('');
    }

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function submitMovement(event) {
    if (event) event.preventDefault();
    const productId = document.getElementById('move-product').value;
    const type = document.getElementById('move-type').value;
    const qty = parseInt(document.getElementById('move-qty').value) || 0;
    const reason = document.getElementById('move-reason').value.trim();

    if (!productId || qty <= 0) {
        showNotification('Preencha os campos obrigatórios corretamente!', 'error');
        return;
    }

    const product = db.products.find(p => p.id === productId);
    if (!product) return;

    if (type === 'out' && product.stock < qty) {
        showNotification('Estoque insuficiente para esta saída!', 'error');
        return;
    }

    addMovement(productId, type, qty, reason);
    product.stock += (type === 'in' ? qty : -qty);

    save();
    closeModal('movementModal');
    renderInventory();
    renderDashboard();
    showNotification(`Estoque de ${product.name} atualizado!`, 'success');
}

function addMovement(productId, type, qty, reason = '') {
    db.movements.push({
        id: getMovementID(),
        productId,
        type,
        qty: parseInt(qty),
        reason: reason || (type === 'in' ? 'Entrada Manual' : 'Saída Manual'),
        date: new Date().toISOString()
    });
}

function generateInventoryReport() {
    const reportContent = document.getElementById('report-content');
    if (!reportContent) return;

    const totalProducts = db.products.length;
    const totalValue = db.products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
    const potentialRevenue = db.products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockCount = db.products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockCount = db.products.filter(p => p.stock === 0).length;

    // Itens de maior valor (Investimento)
    const mostValuable = [...db.products]
        .sort((a, b) => (b.stock * b.cost) - (a.stock * a.cost))
        .slice(0, 5);

    // Agrupar por Categoria
    const categoriesValue = {};
    db.products.forEach(p => {
        const cat = p.category || 'Sem Categoria';
        categoriesValue[cat] = (categoriesValue[cat] || 0) + (p.stock * p.cost);
    });

    const topCategories = Object.entries(categoriesValue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    reportContent.innerHTML = `
        <div class="flex justify-between items-center mb-6 border-b pb-4">
            <div>
                <h3 class="text-xl font-bold text-gray-800">Relatório de Inventário</h3>
                <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">Posição Atual do Estoque</p>
            </div>
            <div class="flex gap-2">
                <button onclick="exportInventoryCSV()" class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Exportar CSV">
                    <i data-lucide="download" class="w-5 h-5"></i>
                </button>
                <button onclick="window.print()" class="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <i data-lucide="printer" class="w-5 h-5 text-gray-600"></i>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center">
                <p class="text-[10px] text-blue-600 uppercase font-bold mb-1">Total SKU's</p>
                <p class="text-2xl font-black text-blue-900">${totalProducts}</p>
            </div>
            <div class="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center">
                <p class="text-[10px] text-indigo-600 uppercase font-bold mb-1">Custo Total (Investimento)</p>
                <p class="text-xl font-black text-indigo-900">${fmtMoney(totalValue)}</p>
            </div>
            <div class="bg-green-50 p-6 rounded-2xl border border-green-100 text-center">
                <p class="text-[10px] text-green-600 uppercase font-bold mb-1">Faturamento Potencial</p>
                <p class="text-xl font-black text-green-900">${fmtMoney(potentialRevenue)}</p>
            </div>
            <div class="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
                <p class="text-[10px] text-red-600 uppercase font-bold mb-1">Esgotados / Alerta</p>
                <p class="text-2xl font-black text-red-900">${outOfStockCount} / ${lowStockCount}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i data-lucide="award" class="w-4 h-4 text-brand-orange"></i>
                    Ranking por Valor (Categoria)
                </h4>
                <div class="space-y-2">
                    ${topCategories.map(([cat, val]) => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                            <span class="capitalize text-gray-600">${cat}</span>
                            <span class="font-bold text-gray-800">${fmtMoney(val)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i data-lucide="star" class="w-4 h-4 text-brand-primary"></i>
                    Itens de Maior Valor
                </h4>
                <div class="space-y-2">
                    ${mostValuable.map(p => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                            <span class="truncate text-gray-600">${sanitizeHTML(p.name)}</span>
                            <span class="font-bold text-brand-primary">${fmtMoney(p.stock * p.cost)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const resultModal = document.getElementById('report-result');
    if (resultModal) resultModal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function exportInventoryCSV() {
    const headers = ['ID', 'Nome', 'Categoria', 'Estoque', 'Minimo', 'Custo', 'Venda'];
    const rows = db.products.map(p => [
        p.id,
        `"${p.name}"`,
        p.category,
        p.stock,
        p.minStock,
        p.cost,
        p.price
    ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('CSV exportado com sucesso!', 'success');
}

function openProductHistory(productId) {
    const product = db.products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('productHistoryModal');
    const nameEl = document.getElementById('history-product-name');
    const tbody = document.getElementById('product-history-body');

    if (!modal || !tbody) return;

    nameEl.textContent = `Produto: ${product.name} (${product.id})`;

    const movements = db.movements.filter(m => m.productId === productId);
    movements.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (movements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-gray-400">Nenhuma movimentação registrada.</td></tr>';
    } else {
        tbody.innerHTML = movements.map(m => {
            const typeLabels = { 'in': 'Entrada', 'out': 'Saída', 'adjust': 'Ajuste' };
            const typeColors = { 'in': 'text-green-600', 'out': 'text-red-600', 'adjust': 'text-orange-600' };

            return `
                <tr class="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <td class="px-6 py-3 text-xs text-gray-400 font-mono">${new Date(m.date).toLocaleString('pt-BR')}</td>
                    <td class="px-6 py-3">
                        <span class="font-bold text-xs uppercase ${typeColors[m.type] || 'text-gray-600'}">
                            ${typeLabels[m.type] || m.type}
                        </span>
                    </td>
                    <td class="px-6 py-3 text-center font-bold text-gray-700">${m.qty}</td>
                    <td class="px-6 py-3 text-xs text-gray-500">${sanitizeHTML(m.reason)}</td>
                </tr>
            `;
        }).join('');
    }

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function printProductLabel(productId) {
    const product = db.products.find(p => p.id === productId);
    if (!product) return;

    const printWindow = window.open('', '_blank', 'width=400,height=400');
    printWindow.document.write(`
        <html>
            <head>
                <title>Etiqueta - ${product.id}</title>
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 20px; }
                    .label { border: 2px dashed #000; padding: 15px; display: inline-block; width: 60mm; height: 30mm; }
                    .name { font-weight: bold; font-size: 14px; margin-bottom: 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                    .price { font-size: 20px; font-weight: 800; color: #000; margin: 10px 0; }
                    .id { font-family: monospace; font-size: 10px; color: #666; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="label">
                    <div class="name">${product.name}</div>
                    <div class="price">${fmtMoney(product.price)}</div>
                    <div class="id">${product.id}</div>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
}
