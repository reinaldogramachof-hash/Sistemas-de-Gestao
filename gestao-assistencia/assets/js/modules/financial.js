// ==========================================
// MÓDULO FINANCEIRO E TRANSAÇÕES - GESTÃO ASSISTÊNCIA
// ==========================================

function openTransactionModal(type = 'income', trans = null) {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;

    // Resetar formulário
    document.getElementById('trans-id').value = trans?.id || '';
    document.getElementById('trans-amount').value = trans ? trans.amount.toFixed(2).replace('.', ',') : '';
    document.getElementById('trans-desc').value = trans?.desc || '';
    document.getElementById('trans-category').value = trans?.category || (type === 'income' ? 'service' : 'supplies');
    document.getElementById('trans-method').value = trans?.method || 'money';
    document.getElementById('trans-date').value = trans ? trans.date : new Date().toISOString().split('T')[0];

    // Ajustar tipo (Radio)
    const targetType = trans ? trans.type : type;
    const radio = document.querySelector(`input[name="trans-type"][value="${targetType}"]`);
    if (radio) radio.checked = true;

    // Título dinâmico
    const modalTitleEl = document.getElementById('transactionModal').querySelector('h3');
    if (modalTitleEl) {
        modalTitleEl.textContent = trans ? 'Editar Lançamento' : (type === 'income' ? 'Nova Receita' : 'Nova Despesa');
    }

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function submitTransaction(event) {
    if (event) event.preventDefault();

    const id = document.getElementById('trans-id').value;
    const typeValue = document.querySelector('input[name="trans-type"]:checked').value;
    const amountStr = document.getElementById('trans-amount').value.replace(',', '.');
    const amount = parseFloat(amountStr) || 0;
    const desc = document.getElementById('trans-desc').value.trim();
    const category = document.getElementById('trans-category').value;
    const method = document.getElementById('trans-method').value;
    const date = document.getElementById('trans-date').value;

    if (!desc || amount <= 0 || !date) {
        showNotification('Preencha os campos obrigatórios corretamente!', 'error');
        return;
    }

    const transaction = {
        id: id || 'TR' + Date.now().toString(36).toUpperCase().substr(-6),
        type: typeValue,
        amount,
        desc,
        category,
        method,
        date,
        createdAt: new Date().toISOString()
    };

    if (id) {
        const idx = db.transactions.findIndex(t => t.id === id);
        if (idx !== -1) {
            db.transactions[idx] = transaction;
        }
    } else {
        db.transactions.unshift(transaction);
    }

    save();
    closeModal('transactionModal');
    renderTransactions();
    renderDashboard();
    showNotification(id ? 'Lançamento atualizado!' : 'Lançamento registrado!', 'success');
}

function deleteTransaction(id) {
    if (confirm('Tem certeza que deseja excluir este lançamento?\n\nEsta ação não poderá ser desfeita.')) {
        db.transactions = db.transactions.filter(t => t.id !== id);
        save();
        renderTransactions();
        renderDashboard();
        showNotification('Lançamento excluído!', 'success');
    }
}

function renderTransactions() {
    const start = document.getElementById('cash-start')?.value || '';
    const end = document.getElementById('cash-end')?.value || '';
    const type = document.getElementById('cash-type')?.value || 'all';
    const tbody = document.getElementById('trans-table-body');

    if (!tbody) return;

    let filtered = db.transactions.filter(t => {
        // Filtro de Data
        if (start && t.date < start) return false;
        if (end && t.date > end) return false;

        // Filtro de Tipo
        if (type !== 'all' && t.type !== type) return false;

        return true;
    });

    // Ordenar por data decrescente
    filtered.sort((a, b) => new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00'));

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-12 text-center text-gray-400">Nenhum lançamento encontrado.</td></tr>';
        updateFinancialStats(filtered);
        return;
    }

    tbody.innerHTML = filtered.map(t => {
        const transData = JSON.stringify(t).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const catMap = {
            'service': 'Serviço',
            'parts': 'Peças',
            'supplies': 'Materiais/Insumos',
            'rent': 'Aluguel',
            'utilities': 'Contas de Consumo',
            'other': 'Outros',
            'sale': 'Venda PDV'
        };

        const methodMap = {
            'money': 'Dinheiro',
            'dinheiro': 'Dinheiro',
            'credit': 'Cartão',
            'cartao': 'Cartão',
            'pix': 'Pix',
            'misto': 'Misto'
        };

        return `
            <tr class="hover:bg-gray-50 border-b border-gray-100 group transition-colors">
                <td class="px-6 py-4 text-xs font-mono text-gray-400">${fmtDate(t.date)}</td>
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-800">${sanitizeHTML(t.desc)}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-medium">
                        ${catMap[t.category] || t.category}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex flex-col items-end">
                        <span class="font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}">
                            ${t.type === 'income' ? '+' : '-'} ${fmtMoney(t.amount)}
                        </span>
                        <div class="flex items-center gap-1 mt-1 opacity-60">
                            <span class="text-[10px] font-bold uppercase">${methodMap[t.method] || t.method || 'dinheiro'}</span>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick='openTransactionModal("", ${transData})'
                                class="text-gray-400 hover:text-blue-500 transition-colors" title="Editar">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteTransaction('${t.id}')"
                                class="text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateFinancialStats(filtered);
    renderCategoryStats(filtered);
}

function renderCategoryStats(transactions) {
    const container = document.getElementById('category-stats-container');
    if (!container) return;

    const expenses = transactions.filter(t => t.type === 'expense');
    const categories = {};
    const catMap = {
        'service': 'Serviço',
        'parts': 'Peças',
        'supplies': 'Materiais/Insumos',
        'rent': 'Aluguel',
        'utilities': 'Contas de Consumo',
        'other': 'Outros',
        'sale': 'Venda PDV'
    };

    expenses.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    if (sortedCats.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic">Sem despesas no período.</p>';
        return;
    }

    container.innerHTML = sortedCats.map(([cat, amount]) => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
            <span class="text-xs font-bold text-gray-600 uppercase">${catMap[cat] || cat}</span>
            <span class="text-xs font-bold text-red-500">${fmtMoney(amount)}</span>
        </div>
    `).join('');
}

function updateFinancialStats(filteredTransactions) {
    const incomeEl = document.getElementById('cash-income');
    const expenseEl = document.getElementById('cash-expense');
    const balanceEl = document.getElementById('cash-balance');
    const periodBalanceEl = document.getElementById('period-balance');

    // Cálculos do Período (Filtrados)
    const periodIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const periodExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const periodBalance = periodIncome - periodExpense;

    // Saldo Total Acumulado (Todos os Lançamentos)
    const totalIncome = db.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = db.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const totalBalance = totalIncome - totalExpense;

    if (incomeEl) incomeEl.textContent = fmtMoney(periodIncome);
    if (expenseEl) expenseEl.textContent = '- ' + fmtMoney(periodExpense);

    if (balanceEl) {
        balanceEl.textContent = fmtMoney(totalBalance);
        balanceEl.className = `text-3xl font-bold ${totalBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`;
    }

    if (periodBalanceEl) {
        periodBalanceEl.textContent = (periodBalance >= 0 ? '+ ' : '') + fmtMoney(periodBalance);
        periodBalanceEl.className = `text-sm font-bold ${periodBalance >= 0 ? 'text-green-600' : 'text-red-500'}`;
    }
}

function exportFinancialCSV() {
    const start = document.getElementById('cash-start')?.value || '';
    const end = document.getElementById('cash-end')?.value || '';

    let toExport = db.transactions;
    if (start || end) {
        toExport = db.transactions.filter(t => {
            if (start && t.date < start) return false;
            if (end && t.date > end) return false;
            return true;
        });
    }

    if (toExport.length === 0) {
        showNotification('Nenhum dado para exportar!', 'warning');
        return;
    }

    const headers = ['Data', 'Descricao', 'Tipo', 'Categoria', 'Metodo', 'Valor'];
    const rows = toExport.map(t => [
        fmtDate(t.date),
        t.desc.replace(/,/g, ';'),
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.category,
        t.method || 'money',
        t.amount.toFixed(2)
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fluxo_caixa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('CSV financeiro exportado!', 'success');
}
