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

    // Inicializa TUDO do dashboard -- este e o ponto de partida
    // Checa sessao, configura menu, navegacao, tema e carrega dados
    // Ta pior que o Nero ativando a Devil Trigger -- todos os modulos de uma vez
    async function init() {
        if (!Auth.checkSession()) return;
        Auth.setupUserMenu();
        setupNavigation();
        setupThemeToggle();
        Charts.init();
        // Carrega stats e checkings em paralelo -- mais veloz que o Sonic
        await Promise.all([refreshStats(), Approvals.load()]);
        Charts.setData(statsData, Approvals.getCheckings());
        Approvals.renderAuditLog();
        startAutoRefresh();
        // Redimensiona os graficos quando a janela muda de tamanho
        window.addEventListener('resize', () => Charts.resize());
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
    function updateKPIs(d) {
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
        // Gauge circular -- o SVG e manipulado direto via stroke-dasharray
        // A matematica aqui e: (percentual / 100) * circunferencia
        const gaugeCircle = document.getElementById('gaugeCircle');
        const gaugePercent = document.getElementById('kpiGaugePercent');
        if (gaugeCircle && gaugePercent) {
            const pct = processed > 0 ? (approved / processed) * 100 : 0;
            const circumference = 2 * Math.PI * 15.5; // ~97.4
            const filled = (pct / 100) * circumference;
            gaugeCircle.setAttribute('stroke-dasharray', `${filled} ${circumference - filled}`);
            gaugePercent.textContent = pct.toFixed(1) + '%';
            // Cor muda conforme a taxa -- verde = bom, amarelo = meh, vermelho = ruim
            if (pct >= 80) gaugeCircle.setAttribute('stroke', 'var(--accent-green)');
            else if (pct >= 50) gaugeCircle.setAttribute('stroke', 'var(--accent-amber)');
            else gaugeCircle.setAttribute('stroke', 'var(--accent-red)');
        }

        // Estatisticas de veiculos -- agrupa os checkings por veiculo
        const checkings = typeof Approvals !== 'undefined' ? Approvals.getCheckings() : [];
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

    // Configura a navegacao entre as abas (Dashboard, Aprovacoes, Usuarios)
    // Cada botao ativa sua secao e desativa as outras
    function setupNavigation() {
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.nav;
                document.querySelectorAll('[data-nav]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
                const section = document.getElementById(`page-${target}`);
                if (section) section.classList.add('active');
                // Se clicou em Usuarios, carrega a lista
                if (target === 'usuarios') Users.load();
            });
        });
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
        updateDashThemeIcon();
        Charts.renderAll();
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
            Charts.setData(statsData, Approvals.getCheckings());
        }, 60000);
    }

    return { init, refreshStats, toggleTheme, animateCounter };
})();
