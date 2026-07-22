/**
 * Módulo de Relatórios - Gestão Assistência Pro
 * Centraliza a lógica de geração de relatórios e BI
 */

function generateMonthlyReport() {
    const reportContent = document.getElementById('report-content');
    if (!reportContent) return;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Filtros
    const monthOrders = db.orders.filter(o => (o.date || '').startsWith(currentMonth));
    const monthPDV = db.pdvSales.filter(v => (v.date || '').startsWith(currentMonth));
    const monthTrans = db.transactions.filter(t => (t.date || '').startsWith(currentMonth));

    // Métricas OS
    const osTotal = monthOrders.length;
    const osCompleted = monthOrders.filter(o => o.status === 'delivered' || o.status === 'ready').length;
    const osRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Métricas PDV
    const pdvTotal = monthPDV.length;
    const pdvRevenue = monthPDV.reduce((sum, v) => sum + (v.total || 0), 0);

    // Métricas Financeiras (Lembrando que OS e PDV podem gerar transações automáticas)
    // Para evitar contagem dupla se o usuário lançou manualmente, idealmente olhamos o fluxo de caixa
    const totalIncome = monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = monthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    reportContent.innerHTML = `
        <div class="flex justify-between items-center mb-6 border-b pb-4">
            <div>
                <h3 class="text-xl font-bold text-gray-800">Relatório Mensal Consolidado</h3>
                <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">${monthLabel}</p>
            </div>
            <button onclick="window.print()" class="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <i data-lucide="printer" class="w-5 h-5 text-gray-600"></i>
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div class="flex items-center gap-3 mb-2">
                    <i data-lucide="clipboard-list" class="w-5 h-5 text-blue-600"></i>
                    <span class="text-xs font-bold text-blue-600 uppercase">Ordens de Serviço</span>
                </div>
                <p class="text-2xl font-black text-blue-900">${osTotal}</p>
                <p class="text-xs text-blue-700 mt-1">${osCompleted} concluídas / prontos</p>
            </div>

            <div class="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                <div class="flex items-center gap-3 mb-2">
                    <i data-lucide="shopping-cart" class="w-5 h-5 text-purple-600"></i>
                    <span class="text-xs font-bold text-purple-600 uppercase">Vendas PDV</span>
                </div>
                <p class="text-2xl font-black text-purple-900">${pdvTotal}</p>
                <p class="text-xs text-purple-700 mt-1">Ticket Médio: ${fmtMoney(pdvTotal > 0 ? pdvRevenue / pdvTotal : 0)}</p>
            </div>

            <div class="bg-green-50 p-6 rounded-2xl border border-green-100">
                <div class="flex items-center gap-3 mb-2">
                    <i data-lucide="trending-up" class="w-5 h-5 text-green-600"></i>
                    <span class="text-xs font-bold text-green-600 uppercase">Resultado (Mês)</span>
                </div>
                <p class="text-2xl font-black text-green-900">${fmtMoney(balance)}</p>
                <p class="text-xs text-green-700 mt-1">Acúmulo de entradas e saídas</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h4 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i data-lucide="pie-chart" class="w-4 h-4 text-brand-primary"></i>
                    Resumo Operacional
                </h4>
                <div class="space-y-3">
                    <div class="flex justify-between p-3 bg-gray-50 rounded-xl">
                        <span class="text-gray-600">Faturamento O.S.</span>
                        <span class="font-bold">${fmtMoney(osRevenue)}</span>
                    </div>
                    <div class="flex justify-between p-3 bg-gray-50 rounded-xl">
                        <span class="text-gray-600">Faturamento PDV</span>
                        <span class="font-bold">${fmtMoney(pdvRevenue)}</span>
                    </div>
                    <div class="flex justify-between p-3 bg-gray-50 rounded-xl border-t-2 border-gray-200 mt-2">
                        <span class="font-bold text-gray-800">Total Bruto</span>
                        <span class="font-black text-brand-primary">${fmtMoney(osRevenue + pdvRevenue)}</span>
                    </div>
                </div>
            </div>

            <div>
                <h4 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i data-lucide="wallet" class="w-4 h-4 text-brand-primary"></i>
                    Fluxo Financeiro
                </h4>
                <div class="space-y-3">
                    <div class="flex justify-between p-3 bg-green-50 rounded-xl text-green-700">
                        <span>Total de Entradas</span>
                        <span class="font-bold">+ ${fmtMoney(totalIncome)}</span>
                    </div>
                    <div class="flex justify-between p-3 bg-red-50 rounded-xl text-red-700">
                        <span>Total de Saídas</span>
                        <span class="font-bold">- ${fmtMoney(totalExpense)}</span>
                    </div>
                    <div class="flex justify-between p-3 bg-gray-100 rounded-xl mt-2 ${balance >= 0 ? 'text-gray-800' : 'text-red-700'}">
                        <span class="font-bold">Saldo do Período</span>
                        <span class="font-black">${fmtMoney(balance)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('report-result').classList.remove('hide');
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Scroll suave para o resultado
    document.getElementById('report-result').scrollIntoView({ behavior: 'smooth' });
}

function generateFinancialReport() {
    const reportContent = document.getElementById('report-content');
    if (!reportContent) return;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const monthTrans = db.transactions.filter(t => (t.date || '').startsWith(currentMonth));

    const catMap = {
        'service': 'Serviço',
        'parts': 'Peças',
        'supplies': 'Materiais/Insumos',
        'rent': 'Aluguel',
        'utilities': 'Contas de Consumo',
        'other': 'Outros',
        'sale': 'Venda PDV'
    };

    // Agrupar Saídas por Categoria
    const expensesByCategory = {};
    monthTrans.filter(t => t.type === 'expense').forEach(t => {
        const cat = catMap[t.category] || t.category || 'Outros';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
    });

    // Agrupar Entradas por Categoria (OS, Venda, etc)
    const incomeByCategory = {};
    monthTrans.filter(t => t.type === 'income').forEach(t => {
        const cat = catMap[t.category] || t.category || 'Outros';
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
    });

    const categoriesHTML = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => `
            <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span class="text-gray-600">${cat}</span>
                <span class="font-bold text-red-600">${fmtMoney(val)}</span>
            </div>
        `).join('');

    const incomeHTML = Object.entries(incomeByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => `
            <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span class="text-gray-600">${cat}</span>
                <span class="font-bold text-green-600">${fmtMoney(val)}</span>
            </div>
        `).join('');

    reportContent.innerHTML = `
        <div class="flex justify-between items-center mb-6 border-b pb-4">
            <div>
                <h3 class="text-xl font-bold text-gray-800">DRE Simplificado (Financeiro)</h3>
                <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">${monthLabel}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="exportFinancialCSV()" class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Exportar CSV">
                    <i data-lucide="download" class="w-5 h-5"></i>
                </button>
                <button onclick="window.print()" class="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <i data-lucide="printer" class="w-5 h-5 text-gray-600"></i>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i data-lucide="arrow-down-circle" class="w-4 h-4 text-green-600"></i>
                    Detalhamento de Entradas
                </h4>
                <div class="min-h-[100px]">
                    ${incomeHTML || '<p class="text-center text-gray-400 py-4 italic">Nenhuma entrada registrada</p>'}
                </div>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i data-lucide="arrow-up-circle" class="w-4 h-4 text-red-600"></i>
                    Detalhamento de Saídas
                </h4>
                <div class="min-h-[100px]">
                    ${categoriesHTML || '<p class="text-center text-gray-400 py-4 italic">Nenhuma saída registrada</p>'}
                </div>
            </div>
        </div>

        <div class="bg-gray-900 text-white p-6 rounded-2xl">
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-xs text-gray-400 uppercase font-bold mb-1">Resultado Líquido do Mês</p>
                    <h3 class="text-3xl font-black">${fmtMoney(monthTrans.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0))}</h3>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-400 font-medium">Margem Operacional Estimada</p>
                    <p class="text-lg font-bold text-brand-green">100% Digital</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('report-result').classList.remove('hide');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('report-result').scrollIntoView({ behavior: 'smooth' });
}
