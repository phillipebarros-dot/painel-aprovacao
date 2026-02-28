/**
 * Modulo Dashboard -- Inicializacao, KPIs, Auto-refresh
 * Cerebro central do painel. Aqui tudo se conecta.
 *
 * Carrega stats, inicia graficos, configura navegacao e tema.
 * Auto-refresh a cada 60 segundos pra manter tudo atualizado em tempo real.
 *
 * Isso aqui e absolute cinema -- orquestra todos os modulos
 * como se fosse maestro de orquestra. Potencia maxima.
 */
const Dashboard = (() => {
    let statsData = null;
    let refreshTimer = null;
    let currentPeriod = 'all';

    function setPeriod(period) {
        currentPeriod = period;
        // update UI buttons
        const container = document.getElementById('dashboardGlobalFilter');
        if (container) {
            container.querySelectorAll('.period-btn').forEach(b => {
                if (b.dataset.period === period) b.classList.add('active');
                else b.classList.remove('active');
            });
        }
        applyFilter();
    }

    function applyFilter() {
        const allCheckings = typeof Approvals !== 'undefined' ? Approvals.getCheckings() : [];
        let filteredCheckings = allCheckings;
        let filteredStats = { ...statsData };

        if (currentPeriod !== 'all' && allCheckings.length > 0) {
            const now = new Date();
            let days = 0;
            if (currentPeriod === 'daily') days = 1;
            else if (currentPeriod === 'weekly') days = 7;
            else if (currentPeriod === 'monthly') days = 30;

            if (days > 0) {
                const limitTs = now.getTime() - (days * 24 * 60 * 60 * 1000);
                filteredCheckings = allCheckings.filter(c => {
                    if (!c.created_at) return false;
                    return new Date(c.created_at.replace(' ', 'T')).getTime() >= limitTs;
                });

                let approved = 0, pending = 0, rejected = 0, novos = 0, comp = 0;
                filteredCheckings.forEach(c => {
                    if (c.status === 'APROVADO') approved++;
                    else if (c.status === 'REJEITADO' || c.status === 'REPROVADO') rejected++;
                    else {
                        pending++;
                        if (c.is_complement == 1) comp++;
                        else novos++;
                    }
                });

                filteredStats = {
                    total_geral: filteredCheckings.length,
                    total_approved: approved,
                    total_rejected: rejected,
                    total_pending: pending,
                    novos_pendentes: novos,
                    complementos_pendentes: comp
                };
            }
        }

        updateKPIs(filteredStats, filteredCheckings);
        Charts.setData(filteredStats, filteredCheckings);
    }

    // Inicializa TUDO do dashboard -- este e o ponto de partida
    // Checa sessao, configura menu, navegacao, tema e carrega dados
    // Ta pior que o Nero ativando a Devil Trigger -- todos os modulos de uma vez
    async function init() {
        if (!Auth.checkSession()) return;
        Auth.setupUserMenu();
        setupThemeToggle();
        startServerClock();
        Charts.init();
        await Promise.all([refreshStats(), Approvals.load(), fetchHealthCheck()]);
        applyFilter();
        Approvals.renderAuditLog();
        startAutoRefresh();
        window.addEventListener('resize', () => Charts.resize());
    }

    // Fetch health check from backend
    async function fetchHealthCheck() {
        try {
            const d = await API.healthCheck();
            const el = document.getElementById('systemStatus');
            if (el && d.status === 'online') {
                el.innerHTML = '● Online';
                el.className = 'text-[11px] font-mono text-green-600 dark:text-green-500 uppercase tracking-wider font-semibold';
            }
        } catch (e) {
            const el = document.getElementById('systemStatus');
            if (el) {
                el.innerHTML = '● Offline';
                el.className = 'text-[11px] font-mono text-red-600 dark:text-red-500 uppercase tracking-wider font-semibold';
            }
        }
    }

    // Live server time clock
    function startServerClock() {
        const el = document.getElementById('serverTime');
        if (!el) return;
        function tick() {
            const now = new Date();
            el.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        tick();
        setInterval(tick, 1000);
    }

    // Busca as estatisticas do backend e atualiza os KPIs na tela
    // Isso me deu um pouco de trabalho pra calcular as metricas avancadas
    async function refreshStats() {
        try {
            const data = await API.getStats();
            statsData = data;
            updateKPIs(data);
            return data;
        } catch (e) { console.error('Stats error:', e); }
    }

    // Atualiza todos os KPIs na tela com os dados recebidos
    // Cada numero e animado com easing cubico -- ficou show
    // Ainda bem que a AI me ajudou nisso kkk, a matematica do gauge foi tensa
    function updateKPIs(d, checkingsItems = null) {
        if (!d) return;
        const pending = Number(d.total_pending || 0);
        const approved = Number(d.total_approved || 0);
        const rejected = Number(d.total_rejected || 0);
        const total = Number(d.total_geral || (pending + approved + rejected));
        const processed = approved + rejected;
        const taxa = processed > 0 ? ((approved / processed) * 100).toFixed(1) : '0.0';

        // Anima os contadores com easing -- nada de numero pulando direto
        animateCounter('kpiTotal', total);
        animateCounter('kpiPending', pending);
        animateCounter('kpiApproved', approved);
        animateCounter('kpiRejected', rejected);

        const taxaEl = document.getElementById('kpiTaxaAprov');
        if (taxaEl) taxaEl.textContent = taxa + '%';

        // KPIs de novos e complementos
        const novos = Number(d.novos_pendentes || 0);
        const comp = Number(d.complementos_pendentes || 0);
        const novosEl = document.getElementById('kpiNovos');
        const compEl = document.getElementById('kpiComplementos');
        if (novosEl) novosEl.textContent = novos;
        if (compEl) compEl.textContent = comp;

        // ── KPIs Avancados ──────────────────────────────
        // Atualiza a barra horizontal de progresso do sistema
        const gaugePercent = document.getElementById('kpiGaugePercent');
        const systemHealthBar = document.getElementById('systemHealthBar');
        if (gaugePercent && systemHealthBar) {
            const pct = processed > 0 ? (approved / processed) * 100 : 0;
            systemHealthBar.style.width = `${pct}%`;
            gaugePercent.textContent = pct.toFixed(1) + '%';

            // Cor muda conforme a taxa
            if (pct >= 80) systemHealthBar.className = 'bg-green-500 h-full transition-all duration-1000';
            else if (pct >= 50) systemHealthBar.className = 'bg-amber-500 h-full transition-all duration-1000';
            else systemHealthBar.className = 'bg-red-500 h-full transition-all duration-1000';
        }

        // Estatisticas de veiculos -- agrupa os checkings por veiculo
        const checkings = checkingsItems !== null ? checkingsItems : (typeof Approvals !== 'undefined' ? Approvals.getCheckings() : []);
        const vehicles = {};
        let compCount = 0;
        checkings.forEach(c => {
            const v = c.veiculo || c.meio || '';
            if (v) vehicles[v] = (vehicles[v] || 0) + 1;
            if (Number(c.is_complement) === 1) compCount++;
        });

        const vehicleKeys = Object.keys(vehicles);
        const vehiclesEl = document.getElementById('kpiVehicles');
        if (vehiclesEl) animateCounter('kpiVehicles', vehicleKeys.length);

        // Encontra o veiculo com mais checkings -- o campeao
        const topVehicleEl = document.getElementById('kpiTopVehicle');
        const topVehicleCountEl = document.getElementById('kpiTopVehicleCount');
        if (topVehicleEl && vehicleKeys.length > 0) {
            const sorted = Object.entries(vehicles).sort((a, b) => b[1] - a[1]);
            topVehicleEl.textContent = sorted[0][0];
            if (topVehicleCountEl) topVehicleCountEl.textContent = sorted[0][1] + ' checkings';
        }

        // Sync donut legend counts
        const donutCenter = document.getElementById('donutCenterValue');
        if (donutCenter) donutCenter.textContent = total.toLocaleString('pt-BR');
        const donutAC = document.getElementById('donutApprovedCount');
        const donutPC = document.getElementById('donutPendingCount');
        const donutRC = document.getElementById('donutRejectedCount');
        if (donutAC) donutAC.textContent = approved.toLocaleString('pt-BR');
        if (donutPC) donutPC.textContent = pending.toLocaleString('pt-BR');
        if (donutRC) donutRC.textContent = rejected.toLocaleString('pt-BR');

        // Sync KPI cards
        const kpiTotalCard = document.getElementById('kpiTotalCard');
        if (kpiTotalCard) kpiTotalCard.textContent = total.toLocaleString('pt-BR');
        const kpiTaxaCard = document.getElementById('kpiTaxaCard');
        if (kpiTaxaCard) kpiTaxaCard.innerHTML = taxa + '<span class="text-lg text-slate-400 dark:text-neutral-400">%</span>';

        // Taxa de complementos -- quanto % do total sao reenvios
        const complementRateEl = document.getElementById('kpiComplementRate');
        if (complementRateEl && checkings.length > 0) {
            complementRateEl.textContent = ((compCount / checkings.length) * 100).toFixed(1) + '%';
        }
    }

    // Anima o contador com easing cubico -- o numero sobe suave
    // requestAnimationFrame garante 60fps, nada de setTimeout amador
    function animateCounter(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const start = parseInt(el.textContent) || 0;
        const diff = target - start;
        if (diff === 0) { el.textContent = target; return; }
        const dur = 800;
        const st = performance.now();
        function step(now) {
            const p = Math.min((now - st) / dur, 1);
            // Easing cubico out -- desacelera no final, fica elegante
            const ease = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(start + diff * ease).toLocaleString('pt-BR');
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }



    // Configura o tema claro/escuro
    // Respeita a preferencia salva no localStorage, ou o tema do sistema
    function setupThemeToggle() {
        const saved = localStorage.getItem('painel_theme');
        if (saved) document.documentElement.setAttribute('data-theme', saved);
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark');
        updateDashThemeIcon();
    }

    // Alterna entre tema claro e escuro -- um clique e muda tudo
    // Inclusive re-renderiza os graficos pra combinar com o novo tema
    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('painel_theme', next);
        // Sync Tailwind class-based dark mode
        if (next === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        updateDashThemeIcon();
    }

    // Atualiza o icone do botao de tema -- sol pra light, lua pra dark
    function updateDashThemeIcon() {
        const icon = document.getElementById('dashThemeIcon');
        if (!icon) return;
        const theme = document.documentElement.getAttribute('data-theme');
        icon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
    }

    // Auto-refresh a cada 60 segundos -- dados sempre fresquinhos
    // Isso aqui roda tudo sozinho, nao precisa ficar dando F5
    function startAutoRefresh() {
        refreshTimer = setInterval(async () => {
            await refreshStats();
            await Approvals.load();
            applyFilter();
        }, 60000);
    }

    return { init, refreshStats, toggleTheme, animateCounter, setPeriod, applyFilter };
})();
