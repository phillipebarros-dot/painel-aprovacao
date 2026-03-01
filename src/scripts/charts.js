/**
 * Charts Module -- Area Chart, Bar Chart, Logs Table
 */
const Charts = (() => {
    let statsData = null;
    let checkingsData = [];
    let areaChartInstance = null;
    let radarChartInstance = null;
    let tableCurrentPage = 1;
    const tableItemsPerPage = 10;
    let chartDays = 90; // Default days for chart (Todos)
    let currentLogsFilter = '';
    let currentAprovFilter = 'all';

    function init() {
        startLiveProcessingBars();
        setupTableFilters();
        setupChartPeriodButtons();
        console.log("Custom Charts Module (Chart.js) Initialized.");
    }

    function setupChartPeriodButtons() {
        document.querySelectorAll('.chart-period-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.chart-period-btn').forEach(b => {
                    b.classList.remove('active', 'bg-white', 'dark:bg-black', 'text-slate-900', 'dark:text-white', 'border', 'border-slate-200', 'dark:border-border-dark', 'font-bold');
                    b.classList.add('font-medium', 'text-slate-500', 'dark:text-neutral-400');
                });
                this.classList.add('active', 'bg-white', 'dark:bg-black', 'text-slate-900', 'dark:text-white', 'border', 'border-slate-200', 'dark:border-border-dark', 'font-bold');
                this.classList.remove('font-medium', 'text-slate-500', 'dark:text-neutral-400');
                const days = parseInt(this.dataset.days) || 90;
                chartDays = days;
                updateAreaChart();
            });
        });
    }

    function setupTableFilters() {
        const tableFilter = document.getElementById('tableFilter');
        if (tableFilter) {
            tableFilter.addEventListener('input', (e) => {
                currentLogsFilter = e.target.value.toLowerCase();
                tableCurrentPage = 1;
                renderLogsTable();
            });
        }



        document.querySelectorAll('.aprov-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.aprov-tab').forEach(b => {
                    b.classList.remove('active', 'text-slate-900', 'dark:text-white', 'border-slate-900', 'dark:border-white');
                    b.classList.add('text-slate-500', 'dark:text-neutral-400', 'border-transparent');
                });

                const target = e.currentTarget;
                target.classList.remove('text-slate-500', 'dark:text-neutral-400', 'border-transparent');
                target.classList.add('active', 'text-slate-900', 'dark:text-white', 'border-slate-900', 'dark:border-white');

                currentAprovFilter = target.dataset.aprov;
                tableCurrentPage = 1;
                renderLogsTable();
            });
        });

        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) prevBtn.addEventListener('click', () => { if (tableCurrentPage > 1) { tableCurrentPage--; renderLogsTable(); } });
        if (nextBtn) nextBtn.addEventListener('click', () => { tableCurrentPage++; renderLogsTable(); });
    }

    function setData(stats, checkings) {
        statsData = stats;
        checkingsData = checkings || [];
        updateDonutChart();
        updateAreaChart();
        updateRadarChart();
        renderLogsTable();
    }

    function updateDonutChart() {
        if (!statsData) return;
        const total = Number(statsData.total_geral || statsData.total || 0);
        if (total === 0) return;

        const approved = Number(statsData.total_approved || 0);
        const pending = Number(statsData.total_pending || 0);
        const rejected = Number(statsData.total_rejected || 0);

        const pctA = (approved / total) * 100;
        const pctP = (pending / total) * 100;
        const pctR = (rejected / total) * 100;

        const donutA = document.getElementById('donutApproved');
        const donutP = document.getElementById('donutPending');
        const donutR = document.getElementById('donutRejected');

        if (donutA) {
            donutA.style.strokeDasharray = `${pctA}, 100`;
            donutA.style.strokeDashoffset = '0';
        }
        if (donutP) {
            donutP.style.strokeDasharray = `${pctP}, 100`;
            donutP.style.strokeDashoffset = `-${pctA}`;
        }
        if (donutR) {
            donutR.style.strokeDasharray = `${pctR}, 100`;
            donutR.style.strokeDashoffset = `-${pctA + pctP}`;
        }
    }

    function isDarkMode() {
        return document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function updateAreaChart() {
        const canvas = document.getElementById('areaChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Prepare data based on chart period
        const recentDates = {};
        const today = new Date();
        const daysToShow = chartDays; // Use chartDays variable
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dParts = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/');
            const dateStr = `${dParts[0]}/${dParts[1]}`;
            recentDates[dateStr] = {};
        }

        if (checkingsData && checkingsData.length) {
            checkingsData.forEach(c => {
                const ts = c.created_at || c.approved_at || c.rejected_at || c.timestamp;
                if (ts) {
                    let isoTs = ts.replace(' ', 'T');
                    if (!isoTs.endsWith('Z') && !isoTs.match(/[+\-]\d{2}:?\d{2}$/)) isoTs += 'Z';
                    const d = new Date(isoTs);
                    const dParts = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/');
                    if (dParts.length === 3) {
                        const dateStr = `${dParts[0]}/${dParts[1]}`;
                        if (recentDates[dateStr]) {
                            // Use client name directly
                            const cName = c.cliente || c.client || 'Desconhecido';
                            if (!recentDates[dateStr][cName]) recentDates[dateStr][cName] = 0;
                            recentDates[dateStr][cName]++;
                        }
                    }
                }
            });
        }

        const labels = Object.keys(recentDates);

        const isDark = isDarkMode();
        const gridColor = isDark ? '#262626' : '#e5e7eb';
        const textColor = isDark ? '#737373' : '#64748b';

        // Gather all unique clients across all dates
        const allClientsSet = new Set();
        for (const date in recentDates) {
            for (const client in recentDates[date]) {
                allClientsSet.add(client);
            }
        }
        const allClients = Array.from(allClientsSet);

        // We use vibrant colors for the "Fluxo de Envios" multi-line chart like the reference image
        const VIBRANT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#8b5cf6'];

        const datasets = allClients.map((client, i) => {
            const dataForClient = labels.map(l => recentDates[l][client] || 0);
            const color = VIBRANT_COLORS[i % VIBRANT_COLORS.length];

            // Create gradient for this color
            const grad = ctx.createLinearGradient(0, 0, 0, 400);
            if (isDark) {
                grad.addColorStop(0, color + 'B3'); // 70% opacity
                grad.addColorStop(1, color + '00'); // 0% opacity
            } else {
                grad.addColorStop(0, color + '99'); // 60% opacity
                grad.addColorStop(1, color + '00');
            }

            return {
                label: client,
                data: dataForClient,
                borderColor: color,
                backgroundColor: grad,
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: isDark ? '#000' : '#fff',
                pointBorderColor: color,
                pointBorderWidth: 2,
            };
        });

        if (areaChartInstance) {
            areaChartInstance.destroy();
        }

        areaChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: isDark ? '#171717' : '#ffffff',
                        titleColor: isDark ? '#a3a3a3' : '#64748b',
                        bodyColor: isDark ? '#f5f5f5' : '#0f172a',
                        borderColor: isDark ? '#262626' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', size: 11 },
                        bodyFont: { family: 'Inter', size: 13, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: textColor, font: { family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', size: 10 } }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMin: 0,
                        suggestedMax: 4,
                        grid: { color: gridColor, drawBorder: false, borderDash: [2, 4] },
                        ticks: { color: textColor, font: { family: 'Inter', size: 11 }, padding: 10, stepSize: 1, precision: 0 }
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
    }

    function updateRadarChart() {
        const canvas = document.getElementById('radarChart');
        if (!canvas) return;

        // Top Performance by Client
        const clients = {};
        checkingsData.forEach(c => {
            const client = c.cliente || c.client || 'Desconhecido';
            clients[client] = (clients[client] || 0) + 1;
        });

        // Sort and get top 6
        const sortedClients = Object.entries(clients).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const labels = sortedClients.map(c => c[0]);
        const data = sortedClients.map(c => c[1]);

        const ctx = canvas.getContext('2d');
        const isDark = isDarkMode();
        const gridColor = isDark ? '#262626' : '#e5e7eb';
        const textColor = isDark ? '#737373' : '#64748b';

        if (radarChartInstance) {
            radarChartInstance.destroy();
        }

        radarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Volume',
                    data: data,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#171717' : '#ffffff',
                        titleColor: isDark ? '#a3a3a3' : '#64748b',
                        bodyColor: isDark ? '#f5f5f5' : '#0f172a',
                        borderColor: isDark ? '#262626' : '#e2e8f0',
                        borderWidth: 1,
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Inter', size: 10, weight: 'bold' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor, borderDash: [2, 4], drawBorder: false },
                        ticks: { color: textColor, stepSize: 1 }
                    }
                }
            }
        });
    }

    function renderLogsTable() {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        let filtered = [...checkingsData];

        // Apply filters
        if (currentLogsFilter) {
            filtered = filtered.filter(c =>
                (c.cliente || '').toLowerCase().includes(currentLogsFilter) ||
                (c.id_pi || c.pi || c.n_pi || '').toLowerCase().includes(currentLogsFilter) ||
                (c.veiculo || c.meio || '').toLowerCase().includes(currentLogsFilter)
            );
        }

        if (currentAprovFilter !== 'all') {
            filtered = filtered.filter(c => {
                const st = (c.status || '').toLowerCase();
                const filterLower = currentAprovFilter.toLowerCase();
                if (filterLower === 'pendente') return st !== 'approved' && st !== 'aprovado' && st !== 'rejected' && st !== 'rejeitado' && st !== 'reprovado';
                if (filterLower === 'aprovado') return st === 'approved' || st === 'aprovado';
                if (filterLower === 'reprovado') return st === 'rejected' || st === 'rejeitado' || st === 'reprovado';
                return true;
            });
        }


        // Pagination
        const total = filtered.length;
        document.getElementById('totalCount').textContent = total;

        const pendingCount = checkingsData.filter(c => {
            const st = (c.status || '').toLowerCase();
            return st !== 'aprovado' && st !== 'approved' && st !== 'rejeitado' && st !== 'rejected' && st !== 'reprovado';
        }).length;
        document.getElementById('tabCountPendente').textContent = pendingCount;

        const badge = document.getElementById('pendenteBadge');
        if (badge) {
            if (pendingCount > 0) {
                badge.classList.remove('hidden');
                badge.classList.add('flex');
                document.getElementById('pendenteBadgeCount').textContent = pendingCount;
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
            }
        }

        const maxPages = Math.ceil(total / tableItemsPerPage) || 1;
        if (tableCurrentPage > maxPages) tableCurrentPage = maxPages;

        document.getElementById('pageInfo').textContent = tableCurrentPage;
        document.getElementById('prevPage').disabled = (tableCurrentPage === 1);
        document.getElementById('nextPage').disabled = (tableCurrentPage >= maxPages);

        const startIdx = (tableCurrentPage - 1) * tableItemsPerPage;
        const pageData = filtered.slice(startIdx, startIdx + tableItemsPerPage);

        document.getElementById('showingCount').textContent = pageData.length;

        tbody.innerHTML = '';

        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500 font-mono text-xs">Nenhum registro encontrado.</td></tr>`;
            return;
        }

        pageData.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 dark:hover:bg-neutral-900/50 transition-colors group cursor-pointer';

            // Format date
            const dStr = item.created_at || item.approved_at || item.rejected_at || item.timestamp || '';
            let dateFormatted = dStr;
            if (dStr) {
                let isoTs = dStr.replace(' ', 'T');
                if (!isoTs.endsWith('Z') && !isoTs.match(/[+\-]\d{2}:?\d{2}$/)) isoTs += 'Z';
                const dDate = new Date(isoTs);
                if (!isNaN(dDate.getTime())) {
                    dateFormatted = dDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                }
            }

            // Aprovacao Status format
            const st = (item.status || '').toLowerCase();
            let statusHtml = '';
            let isPendente = false;
            if (st === 'aprovado' || st === 'approved') {
                statusHtml = `<span class="status-badge badge-approved inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px]"><span class="material-symbols-outlined text-[12px]">check_circle</span>Aprovado</span>`;
            } else if (st === 'rejeitado' || st === 'rejected' || st === 'reprovado') {
                statusHtml = `<span class="status-badge badge-rejected inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px]"><span class="material-symbols-outlined text-[12px]">cancel</span>Reprovado</span>`;
            } else {
                isPendente = true;
                statusHtml = `<span class="status-badge badge-pending inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px]"><span class="material-symbols-outlined text-[12px]">pending</span>Pendente</span>`;
            }

            // Click entirely removed — dashboard log is visual only

            const mediaUrl = item.download_url || item.url || '#';
            const submissionIdEnc = encodeURIComponent(item.submission_id || item.id || '');
            const clienteEnc = encodeURIComponent(item.cliente || '');
            const actionBtn = isPendente
                ? `<div class="flex gap-1 justify-center" onclick="event.stopPropagation()">
                    <button onclick="Approvals.openApprove('${submissionIdEnc}', '${clienteEnc}')" class="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 py-1 rounded-sm text-[10px] font-bold uppercase transition-colors hover:bg-green-100 dark:hover:bg-green-900/40">
                        <span class="material-symbols-outlined text-[12px]">check_circle</span>Aprovar
                    </button>
                    <button onclick="Approvals.openReject('${submissionIdEnc}', '${clienteEnc}')" class="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-1 rounded-sm text-[10px] font-bold uppercase transition-colors hover:bg-red-100 dark:hover:bg-red-900/40">
                        <span class="material-symbols-outlined text-[12px]">cancel</span>Reprovar
                    </button>
                   </div>`
                : `<a href="${mediaUrl}" target="_blank" class="p-1.5 border border-slate-200 dark:border-neutral-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center rounded-sm" onclick="event.stopPropagation()"><span class="material-symbols-outlined text-[16px]">download</span></a>`;

                tr.innerHTML = `
                <td class="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-neutral-500 whitespace-nowrap">${dateFormatted}</td>
                <td class="px-4 py-3 font-bold text-slate-900 dark:text-white max-w-[150px]truncate" title="${item.cliente || '-'}">${item.cliente || '-'}</td>
                <td class="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600 dark:text-neutral-400">${item.id_pi || item.pi || item.n_pi || '-'}</td>
                <td class="px-4 py-3 font-medium text-slate-700 dark:text-neutral-300 max-w-[120px] truncate" title="${item.veiculo || item.meio || '-'}">${item.veiculo || item.meio || '-'}</td>
                <td class="px-4 py-3 text-center">${statusHtml}</td>
                <td class="px-4 py-3 text-center font-mono text-[10px] text-slate-500 dark:text-neutral-500 uppercase tracking-wider">${item.avaliador_nome || item.approval_user || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function startLiveProcessingBars() {
        const container = document.getElementById('processingBars');
        if (!container) return;
        const bars = container.querySelectorAll('.flex-1');

        if (liveInterval) clearInterval(liveInterval);

        liveInterval = setInterval(() => {
            bars.forEach(bar => {
                const isHigh = Math.random() > 0.7;
                const h = isHigh ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 40) + 20;
                bar.style.height = `${h}%`;
                bar.style.transition = 'height 0.3s ease';
                if (h > 80) bar.style.backgroundColor = '#ffffff';
                else if (h > 50) bar.style.backgroundColor = '#404040';
                else bar.style.backgroundColor = '#1a1a1a';
            });
        }, 1200);
    }

    function resize() {
        if (areaChartInstance) areaChartInstance.resize();
        if (radarChartInstance) radarChartInstance.resize();
    }

    return { init, setData, resize };
})();

