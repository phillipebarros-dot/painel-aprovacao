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

    /**
     * Dispara o modal encarregado da autogeração de Slides do PPTX na página relatorios.html.
     * Esta função recupera as opções em tempo real a partir dos checkings locais, monta o input do usuário via SweetAlert,
     * submete para a Cloud Function e reage inteligentemente alterando opções quando o usuário brinca com as datas.
     */
    async function openSlidesModal() {
        // Obter valores unicos iniciais para os dropdowns (base on-load)
        const getUnique = (field) => [...new Set(allCheckings.map(c => c[field]).filter(v => v !== null && v !== undefined && String(v).trim() !== ''))].sort();

        const clients = getUnique('cliente');
        const pracas = getUnique('praca');
        const meios = getUnique('meio');
        const veiculos = getUnique('veiculo');

        const safeText = (str) => typeof escapeHtml === 'function' ? escapeHtml(str || '') : (str || '');

        const { value: formValues } = await Swal.fire({
            title: '<h3 class="text-lg font-semibold text-slate-900 dark:text-white">Gerar Slides</h3>',
            html: `
                <div class="text-left space-y-4 font-sans pb-2">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-500 font-semibold mb-1">Período Início <span class="text-red-500">*</span></label>
                            <input type="date" id="slide_inicio" class="w-full h-9 border border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors" required>
                        </div>
                        <div>
                            <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-500 font-semibold mb-1">Período Fim <span class="text-red-500">*</span></label>
                            <input type="date" id="slide_fim" class="w-full h-9 border border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors" required>
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-500 font-semibold mb-1">Título (Opcional)</label>
                        <input type="text" id="slide_titulo" placeholder="Ex: Campanha de Captação" class="w-full h-9 border border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors">
                    </div>
                    <div>
                        <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-500 font-semibold mb-1">Cliente (Opcional)</label>
                        <select id="slide_cliente" class="w-full h-9 border border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors">
                            <option value="">Todos</option>
                            ` + clients.map(c => `<option value="${safeText(c)}">${safeText(c)}</option>`).join('') + `
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-500 font-semibold mb-1">Praça (Opcional)</label>
                        <select id="slide_praca" class="w-full h-9 border border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors">
                            <option value="">Todas</option>
                            ` + pracas.map(v => `<option value="${safeText(v)}">${safeText(v)}</option>`).join('') + `
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-500 font-semibold mb-1">Veículo (Opcional)</label>
                        <select id="slide_veiculo" class="w-full h-9 border border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors">
                            <option value="">Todos</option>
                            ` + veiculos.map(v => `<option value="${safeText(v)}">${safeText(v)}</option>`).join('') + `
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-500 font-semibold mb-1">Meio (Opcional)</label>
                        <select id="slide_meio" class="w-full h-9 border border-slate-300 dark:border-neutral-700 bg-white dark:bg-black text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors">
                            <option value="">Todos</option>
                            ` + meios.map(v => `<option value="${safeText(v)}">${safeText(v)}</option>`).join('') + `
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Gerar Slides',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'dark:bg-neutral-900 dark:border dark:border-neutral-800 rounded-none',
                confirmButton: 'bg-slate-900 dark:bg-white text-white dark:text-black font-semibold px-4 py-2 text-sm rounded-none hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors',
                cancelButton: 'bg-transparent border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 font-semibold px-4 py-2 text-sm rounded-none hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors'
            },
            buttonsStyling: false,
            didOpen: () => {
                const dataInicio = document.getElementById('slide_inicio');
                const dataFim = document.getElementById('slide_fim');

                // Inteligência do form. Ao mudar Início/Fim, filtramos as aprovações no cache
                // para exibir no Select Picker APENAS Clientes, Veículos e Meios que realmente tiveram campanhas naqueles dias.
                const updateDropdowns = () => {
                    const startVal = dataInicio.value;
                    const endVal = dataFim.value;

                    let filteredForSlides = allCheckings;

                    if (startVal && endVal) {
                        const start = new Date(startVal + 'T00:00:00');
                        const end = new Date(endVal + 'T23:59:59');

                        filteredForSlides = allCheckings.filter(c => {
                            const ts = c.approved_at || c.rejected_at || c.created_at || c.timestamp || '';
                            if (!ts) return false;
                            try {
                                let isoTs = ts.replace(' ', 'T');
                                if (!isoTs.endsWith('Z') && !isoTs.match(/[+\-]\d{2}:?\d{2}$/)) isoTs += 'Z';
                                const d = new Date(isoTs);
                                return d >= start && d <= end;
                            } catch {
                                return false;
                            }
                        });
                    }

                    const subGetUnique = (field) => [...new Set(filteredForSlides.map(c => c[field]).filter(v => v !== null && v !== undefined && String(v).trim() !== ''))].sort();

                    const updateSelect = (id, vals) => {
                        const sel = document.getElementById(id);
                        if (!sel) return;
                        const currentVal = sel.value;
                        sel.innerHTML = '<option value="">Todos</option>' + vals.map(v => `<option value="${safeText(v)}">${safeText(v)}</option>`).join('');
                        if (vals.includes(currentVal)) {
                            sel.value = currentVal;
                        }
                    };

                    updateSelect('slide_cliente', subGetUnique('cliente'));
                    updateSelect('slide_praca', subGetUnique('praca'));
                    updateSelect('slide_veiculo', subGetUnique('veiculo'));
                    updateSelect('slide_meio', subGetUnique('meio'));
                };

                dataInicio.addEventListener('change', updateDropdowns);
                dataFim.addEventListener('change', updateDropdowns);
            },
            preConfirm: () => {
                const inicio = document.getElementById('slide_inicio').value;
                const fim = document.getElementById('slide_fim').value;
                if (!inicio || !fim) {
                    Swal.showValidationMessage('Os campos de data são obrigatórios.');
                    return false;
                }

                // Formatar para DD/MM/YYYY
                const formatData = (d) => {
                    const [y, m, day] = d.split('-');
                    return `${day}/${m}/${y}`;
                };

                return {
                    periodo_inicio: formatData(inicio),
                    periodo_fim: formatData(fim),
                    titulo: document.getElementById('slide_titulo').value,
                    cliente: document.getElementById('slide_cliente').value,
                    praca: document.getElementById('slide_praca').value,
                    veiculo: document.getElementById('slide_veiculo').value,
                    meio: document.getElementById('slide_meio').value
                };
            }
        });

        if (formValues) {
            // Remover chaves vazias se forem opcionais
            Object.keys(formValues).forEach(k => {
                if (!formValues[k]) delete formValues[k];
            });

            Swal.fire({
                title: 'Gerando Slides...',
                text: 'Isso pode levar alguns minutos.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                let data = await API.generateSlides(formValues);

                // Defensive programming - parse JSON caso o webhook retorne string "envelopada" como objeto ({ "data": "{\"status\":\"sucesso\"...}" })
                if (data && typeof data.data === 'string') {
                    try {
                        data = JSON.parse(data.data);
                    } catch (e) { console.warn("Erro ao fazer parse de data.data", e); }
                    // Ou se toda a payload em si retornar stringuada (comum em falhas de parsing via webhooks do n8n)
                } else if (typeof data === 'string') {
                    try {
                        data = JSON.parse(data);
                    } catch (e) { console.warn("Erro ao fazer parse do response", e); }
                }

                if (data && data.status === 'sucesso') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sucesso!',
                        html: `<p class="text-slate-700 dark:text-neutral-300">${data.mensagem || 'Slides gerados com sucesso!'}</p>
                               <div class="mt-4">
                                  <a href="${data.url}" target="_blank" class="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-800">Abrir Apresentação</a>
                               </div>`,
                        customClass: {
                            popup: 'dark:bg-neutral-900 dark:border dark:border-neutral-800 rounded-none',
                            confirmButton: 'bg-slate-900 dark:bg-white text-white dark:text-black font-semibold px-4 py-2 text-sm rounded-none hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors'
                        },
                        buttonsStyling: false
                    });
                } else {
                    throw new Error(data.mensagem || data.message || 'Ocorreu um erro desconhecido ao gerar.');
                }

            } catch (error) {
                console.error("Erro ao gerar slides:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: error.message || 'Erro ao comunicar com a GCP Function.',
                    customClass: {
                        popup: 'dark:bg-neutral-900 dark:border dark:border-neutral-800 rounded-none',
                        confirmButton: 'bg-slate-900 dark:bg-white text-white dark:text-black font-semibold px-4 py-2 text-sm rounded-none hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors'
                    },
                    buttonsStyling: false
                });
            }
        }
    }

    function getFilteredCheckings() { return filteredCheckings; }

    return { init, setPeriod, setType, render, exportPDF, openSlidesModal, getFilteredCheckings };
})();
