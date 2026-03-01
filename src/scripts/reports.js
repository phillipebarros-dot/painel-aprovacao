/**
 * Reports Module — Gerenciamento de Relatórios com Filtros
 * Permite filtrar checkings por período (semanal/mensal/anual) e tipo (todos/aprovados/pix/complemento)
 */

const Reports = (() => {
    let allCheckings = [];
    let filteredCheckings = [];
    let currentPeriod = 'all';
    let currentType = 'all';

    async function init() {
        try {
            const data = await API.getAllCheckings();
            allCheckings = data.checkings || (Array.isArray(data) ? data : []);
            render();
        } catch (e) {
            console.error('Reports.init error:', e);
            allCheckings = [];
            render();
        }
    }

    function setPeriod(period) {
        currentPeriod = period;
        // Update active button
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-black', 'border-slate-900', 'dark:border-white');
        });
        const activeBtn = document.querySelector(`.period-btn[data-period="${period}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-black', 'border-slate-900', 'dark:border-white');
        }
        render();
    }

    function setType(type) {
        currentType = type;
        render();
    }

    function filterByPeriod(data) {
        if (currentPeriod === 'all') return data;

        const now = new Date();
        let cutoff;

        switch (currentPeriod) {
            case 'weekly':
                cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'yearly':
                cutoff = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return data;
        }

        return data.filter(c => {
            const ts = c.approved_at || c.rejected_at || c.created_at || c.timestamp || '';
            if (!ts) return false;
            try {
                let isoTs = ts.replace(' ', 'T');
                if (!isoTs.endsWith('Z') && !isoTs.match(/[+\-]\d{2}:?\d{2}$/)) isoTs += 'Z';
                const d = new Date(isoTs);
                return d >= cutoff;
            } catch {
                return false;
            }
        });
    }

    function filterByType(data) {
        switch (currentType) {
            case 'approved':
                return data.filter(c => (c.status || '').toLowerCase() === 'approved');
            case 'rejected':
                return data.filter(c => (c.status || '').toLowerCase() === 'rejected');
            case 'pending':
                return data.filter(c => (c.status || '').toLowerCase() === 'pending');
            case 'complement':
                return data.filter(c => Number(c.is_complement) === 1);
            default:
                return data;
        }
    }

    function render() {
        filteredCheckings = filterByType(filterByPeriod(allCheckings));

        // Update KPIs
        const total = filteredCheckings.length;
        const approved = filteredCheckings.filter(c => (c.status || '').toLowerCase() === 'approved').length;
        const rejected = filteredCheckings.filter(c => (c.status || '').toLowerCase() === 'rejected').length;
        const pending = filteredCheckings.filter(c => (c.status || '').toLowerCase() === 'pending').length;
        const complementos = filteredCheckings.filter(c => Number(c.is_complement) === 1).length;
        const taxa = total > 0 ? ((approved / total) * 100).toFixed(1) : '0';

        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('rptTotal', total);
        setText('rptApproved', approved);
        setText('rptRejected', rejected);
        setText('rptPending', pending);
        setText('rptComplementos', complementos);
        setText('rptTaxa', taxa + '%');

        // Extra metrics
        const novos = filteredCheckings.filter(c => Number(c.is_complement) !== 1).length;
        setText('rptNovos', novos);

        // Top veículo
        const veiculoCount = {};
        filteredCheckings.forEach(c => { const v = c.veiculo || '-'; veiculoCount[v] = (veiculoCount[v] || 0) + 1; });
        const topVeiculo = Object.keys(veiculoCount).sort((a, b) => veiculoCount[b] - veiculoCount[a])[0] || '-';
        setText('rptTopVeiculo', topVeiculo);

        // Top meio
        const meioCount = {};
        filteredCheckings.forEach(c => { const m = c.meio || '-'; meioCount[m] = (meioCount[m] || 0) + 1; });
        const topMeio = Object.keys(meioCount).sort((a, b) => meioCount[b] - meioCount[a])[0] || '-';
        setText('rptTopMeio', topMeio);

        // Taxa de reenvio (complementos)
        const taxaReenvio = total > 0 ? ((complementos / total) * 100).toFixed(1) : '0';
        setText('rptTaxaReenvio', taxaReenvio + '%');

        // Render table
        const tbody = document.getElementById('rptTableBody');
        if (!tbody) return;

        if (filteredCheckings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-500 dark:text-neutral-500 font-mono text-[11px] uppercase">Nenhum registro encontrado para os filtros selecionados</td></tr>`;
            return;
        }

        const safeText = (str) => typeof escapeHtml === 'function' ? escapeHtml(str || '') : (str || '');

        tbody.innerHTML = filteredCheckings.slice(0, 200).map((c, i) => {
            const st = (c.status || 'pending').toLowerCase();
            const statusLabel = st === 'approved' ? 'Aprovado' : st === 'rejected' ? 'Reprovado' : 'Pendente';
            const statusClass = st === 'approved'
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : st === 'rejected'
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
            const isCompl = Number(c.is_complement) === 1;
            const ts = c.approved_at || c.rejected_at || c.created_at || c.timestamp || '-';
            let shortTs = '-';
            if (ts !== '-') {
                try {
                    let isoTs = ts.replace(' ', 'T');
                    if (!isoTs.endsWith('Z') && !isoTs.match(/[+\-]\d{2}:?\d{2}$/)) isoTs += 'Z';
                    shortTs = new Date(isoTs).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                } catch { shortTs = ts; }
            }

            return `<tr class="${i % 2 === 0 ? 'bg-white dark:bg-black' : 'bg-slate-50 dark:bg-neutral-900/30'} hover:bg-slate-100 dark:hover:bg-neutral-800/30 transition-colors">
                <td class="px-4 py-3 text-[11px] font-mono text-slate-900 dark:text-white font-semibold">${safeText(c.submission_id)}</td>
                <td class="px-4 py-3 text-[11px] font-mono text-slate-700 dark:text-neutral-300">${safeText(c.n_pi)}</td>
                <td class="px-4 py-3 text-[11px] text-slate-700 dark:text-neutral-300">${safeText(c.cliente)}</td>
                <td class="px-4 py-3 text-[11px] text-slate-700 dark:text-neutral-300">${safeText(c.veiculo)}</td>
                <td class="px-4 py-3 text-[11px] text-slate-700 dark:text-neutral-300">${safeText(c.meio)}</td>
                <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase border ${statusClass}">${statusLabel}</span></td>
                <td class="px-4 py-3 text-center text-[11px] font-mono ${isCompl ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400 dark:text-neutral-600'}">${isCompl ? 'Sim' : 'Não'}</td>
                <td class="px-4 py-3 text-[11px] font-mono text-slate-500 dark:text-neutral-500">${shortTs}</td>
            </tr>`;
        }).join('');
    }

    function exportPDF() {
        if (typeof generateAuditPDF === 'function') {
            generateAuditPDF(currentPeriod === 'all' ? 'atual' : currentPeriod);
        }
    }

    function getFilteredCheckings() { return filteredCheckings; }

    return { init, setPeriod, setType, render, exportPDF, getFilteredCheckings };
})();
