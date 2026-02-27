/**
 * Modulo de Graficos Google Charts -- Pie, Area, Combo, Bar
 * Isso aqui e absolute cinema. Seis graficos renderizados em tempo real,
 * cada um com animacao, tema dark/light e cores customizadas.
 * Ta pior que o Nero ativando a Devil Trigger -- poder maximo nos charts.
 *
 * Usa sliceVisibilityThreshold, isStacked, animations e focusTarget
 * para garantir que o hover nao pisca mais (finalmente, depois de 47 tentativas).
 * Ainda bem que a AI me ajudou nisso kkk
 */
const Charts = (() => {
    let loaded = false;
    let pieChart, areaChart, comboChart, barChart, vehicleChart, stackedBarChart;
    let statsData = null;
    let checkingsData = [];

    // Inicializa o Google Charts -- carrega os pacotes necessarios
    // Isso me deu um pouco de trabalho pra descobrir quais pacotes usar
    function init() {
        google.charts.load('current', { packages: ['corechart', 'controls'] });
        google.charts.setOnLoadCallback(() => { loaded = true; renderAll(); });
    }

    // Detecta tema dark pra ajustar as cores -- simplesao mas funciona
    function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

    // Paleta de cores escolhida a dedo, nao e random nao
    // Cada cor testada no dark e no light pra ficar bonito nos dois
    function getChartColors() {
        return ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    }

    // Cores do texto e background que mudam com o tema
    function getTextColor() { return isDark() ? '#94a3b8' : '#64748b'; }
    function getBgColor() { return isDark() ? '#0f1629' : '#ffffff'; }
    function getGridColor() { return isDark() ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.06)'; }

    // Recebe os dados e renderiza tudo -- mais veloz que o Sonic na fase final
    function setData(stats, checkings) {
        statsData = stats;
        checkingsData = checkings || [];
        if (loaded) renderAll();
    }

    // Renderiza todos os 6 graficos de uma vez -- POTENCIA MAXIMA
    function renderAll() {
        if (!loaded || !statsData) return;
        renderPieChart();
        renderAreaChart();
        renderComboChart();
        renderBarChart();
        renderVehicleChart();
        renderStackedBarChart();
    }

    // ══ CONFIG BASE DO TOOLTIP ════════════════════════════════════
    // Esse objeto resolve o problema do hover que ficava piscando.
    // O segredo e usar trigger: 'focus' pra nao ficar recriando o tooltip
    // toda hora. Isso me deu DOR DE CABECA ate descobrir.
    function getTooltipConfig() {
        return {
            textStyle: { fontName: 'Inter', fontSize: 13 },
            showColorCode: true,
            trigger: 'focus'
        };
    }

    // ══ GRAFICO DE PIZZA -- Distribuicao de Aprovacoes ═══════════
    // Donut chart mostrando aprovados vs pendentes vs reprovados
    // pieHole: 0.45 cria o buraco no meio (donut style, nao pie puro)
    function renderPieChart() {
        const el = document.getElementById('pieChartDiv');
        if (!el || !statsData) return;

        const pending = Number(statsData.total_pending || statsData.novos_pendentes || 0);
        const approved = Number(statsData.total_approved || 0);
        const rejected = Number(statsData.total_rejected || 0);

        const data = new google.visualization.DataTable();
        data.addColumn('string', 'Status');
        data.addColumn('number', 'Quantidade');
        data.addRows([
            ['Aprovados', approved],
            ['Pendentes', pending],
            ['Reprovados', rejected]
        ]);

        // Opcoes do grafico de pizza -- cada propriedade foi testada no olho
        const options = {
            title: '',
            pieHole: 0.45,
            sliceVisibilityThreshold: 0.02,
            colors: ['#22c55e', '#f59e0b', '#ef4444'],
            backgroundColor: getBgColor(),
            legend: { position: 'bottom', textStyle: { color: getTextColor(), fontSize: 12, fontName: 'Inter' } },
            chartArea: { left: 20, top: 10, right: 20, bottom: 60, width: '90%', height: '80%' },
            pieSliceText: 'percentage',
            pieSliceTextStyle: { color: '#fff', fontSize: 12, fontName: 'Inter', bold: true },
            tooltip: getTooltipConfig(),
            animation: { startup: true, duration: 1000, easing: 'out' },
            fontName: 'Inter',
            // Isso aqui impede o chart de se redesenhar quando o mouse sai -- CRUCIAL
            enableInteractivity: true
        };

        if (pieChart) pieChart.clearChart();
        pieChart = new google.visualization.PieChart(el);
        pieChart.draw(data, options);
    }

    // ══ GRAFICO DE AREA -- Evolucao Temporal por Status ══════════
    // Mostra a timeline empilhada em 100% (isStacked: 'relative')
    // Agora ta legal, agora vai funcionar
    function renderAreaChart(days) {
        const el = document.getElementById('areaChartDiv');
        if (!el || !checkingsData.length) {
            if (el) renderEmptyAreaChart(el);
            return;
        }

        // Agrupa os checkings por data -- logica que parece simples mas da trabalho
        const grouped = {};
        checkingsData.forEach(c => {
            const d = (c.approved_at || c.rejected_at || '').substring(0, 10) || 'Sem data';
            if (d === 'Sem data') return;
            if (!grouped[d]) grouped[d] = { approved: 0, pending: 0, rejected: 0 };
            const s = (c.status || 'pending').toLowerCase();
            if (grouped[d][s] !== undefined) grouped[d][s]++;
        });

        let dates = Object.keys(grouped).sort();
        if (days && days < dates.length) dates = dates.slice(-days);

        if (dates.length === 0) { renderEmptyAreaChart(el); return; }

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Data');
        dt.addColumn('number', 'Aprovados');
        dt.addColumn('number', 'Pendentes');
        dt.addColumn('number', 'Reprovados');

        dates.forEach(d => {
            const g = grouped[d];
            dt.addRow([d.substring(5), g.approved, g.pending, g.rejected]);
        });

        const options = {
            isStacked: 'relative',
            backgroundColor: getBgColor(),
            colors: ['#22c55e', '#f59e0b', '#ef4444'],
            legend: { position: 'top', textStyle: { color: getTextColor(), fontSize: 11, fontName: 'Inter' }, maxLines: 1 },
            chartArea: { left: 50, top: 40, right: 20, bottom: 40, width: '85%', height: '70%' },
            hAxis: { textStyle: { color: getTextColor(), fontSize: 10, fontName: 'JetBrains Mono' }, gridlines: { color: 'transparent' } },
            vAxis: { textStyle: { color: getTextColor(), fontSize: 10 }, gridlines: { color: getGridColor() }, minValue: 0, format: 'percent' },
            areaOpacity: 0.4,
            animation: { startup: true, duration: 800, easing: 'out' },
            fontName: 'Inter',
            tooltip: getTooltipConfig(),
            focusTarget: 'category'
        };

        if (areaChart) areaChart.clearChart();
        areaChart = new google.visualization.AreaChart(el);
        areaChart.draw(dt, options);
    }

    // Grafico vazio quando nao tem dados -- placeholder educado
    function renderEmptyAreaChart(el) {
        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Data');
        dt.addColumn('number', 'Dados');
        dt.addRow(['Sem dados', 0]);
        const c = new google.visualization.AreaChart(el);
        c.draw(dt, { backgroundColor: getBgColor(), chartArea: { width: '80%', height: '70%' }, fontName: 'Inter' });
    }

    // ══ GRAFICO COMBO -- Volume de Checkings por Cliente ═════════
    // Barras por cliente + linha tracejada de media
    // Caraca velho, esse combo chart ficou bonito demais
    function renderComboChart() {
        const el = document.getElementById('comboChartDiv');
        if (!el || !checkingsData.length) return;

        // Conta checkings por cliente e pega os top 8
        const byClient = {};
        checkingsData.forEach(c => {
            const cl = c.cliente || 'Desconhecido';
            byClient[cl] = (byClient[cl] || 0) + 1;
        });

        const sorted = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 8);
        if (sorted.length === 0) return;
        const avg = sorted.reduce((s, e) => s + e[1], 0) / sorted.length;

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Cliente');
        dt.addColumn('number', 'Quantidade de Checkings');
        dt.addColumn('number', 'Media Geral');

        sorted.forEach(([cl, vol]) => {
            const label = cl.length > 18 ? cl.substring(0, 16) + '...' : cl;
            dt.addRow([label, vol, Math.round(avg)]);
        });

        const options = {
            backgroundColor: getBgColor(),
            colors: ['#3b82f6', '#ef4444'],
            seriesType: 'bars',
            series: { 1: { type: 'line', lineWidth: 3, pointSize: 0, color: '#ef4444', lineDashStyle: [4, 4] } },
            legend: { position: 'top', textStyle: { color: getTextColor(), fontSize: 11, fontName: 'Inter' } },
            chartArea: { left: 50, top: 40, right: 20, bottom: 60, width: '85%', height: '65%' },
            hAxis: { textStyle: { color: getTextColor(), fontSize: 10, fontName: 'Inter' }, slantedText: true, slantedTextAngle: 30 },
            vAxis: { textStyle: { color: getTextColor(), fontSize: 10 }, gridlines: { color: getGridColor() }, minValue: 0 },
            bar: { groupWidth: '60%' },
            animation: { startup: true, duration: 1000, easing: 'inAndOut' },
            fontName: 'Inter',
            tooltip: getTooltipConfig(),
            focusTarget: 'category'
        };

        if (comboChart) comboChart.clearChart();
        comboChart = new google.visualization.ComboChart(el);
        comboChart.draw(dt, options);
    }

    // ══ GRAFICO DE BARRAS HORIZONTAL -- Ranking dos Principais Clientes ═══
    // Ranking colorido -- cada barra com uma cor diferente, ficou show
    function renderBarChart() {
        const el = document.getElementById('barChartDiv');
        if (!el || !checkingsData.length) return;

        const byClient = {};
        checkingsData.forEach(c => {
            const cl = c.cliente || 'Desconhecido';
            byClient[cl] = (byClient[cl] || 0) + 1;
        });

        const sorted = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 6);
        if (sorted.length === 0) return;

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Cliente');
        dt.addColumn('number', 'Total de Checkings');
        dt.addColumn({ type: 'string', role: 'style' });

        const chartColors = getChartColors();
        sorted.forEach(([cl, vol], i) => {
            const label = cl.length > 20 ? cl.substring(0, 18) + '...' : cl;
            dt.addRow([label, vol, `color: ${chartColors[i % chartColors.length]}`]);
        });

        const options = {
            backgroundColor: getBgColor(),
            legend: { position: 'none' },
            chartArea: { left: 120, top: 10, right: 20, bottom: 40, width: '70%', height: '85%' },
            hAxis: { textStyle: { color: getTextColor(), fontSize: 10 }, gridlines: { color: getGridColor() }, minValue: 0 },
            vAxis: { textStyle: { color: getTextColor(), fontSize: 11, fontName: 'Inter' } },
            bars: 'horizontal',
            animation: { startup: true, duration: 800, easing: 'out' },
            fontName: 'Inter',
            tooltip: getTooltipConfig()
        };

        if (barChart) barChart.clearChart();
        barChart = new google.visualization.BarChart(el);
        barChart.draw(dt, options);
    }

    // ══ DONUT DE VEICULOS -- Distribuicao por Veiculo de Midia ═══
    // Mostra quanto cada veiculo/meio tem de checkings
    // Esse aqui ficou lindo com as cores customizadas
    function renderVehicleChart() {
        const el = document.getElementById('vehicleChartDiv');
        if (!el || !checkingsData.length) return;

        const byVehicle = {};
        checkingsData.forEach(c => {
            const v = c.veiculo || c.meio || 'Outros';
            byVehicle[v] = (byVehicle[v] || 0) + 1;
        });

        const sorted = Object.entries(byVehicle).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (sorted.length === 0) return;

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Veiculo de Midia');
        dt.addColumn('number', 'Total de Checkings');
        sorted.forEach(([v, n]) => dt.addRow([v, n]));

        const options = {
            title: '',
            pieHole: 0.5,
            colors: getChartColors(),
            backgroundColor: getBgColor(),
            legend: { position: 'right', textStyle: { color: getTextColor(), fontSize: 11, fontName: 'Inter' } },
            chartArea: { left: 20, top: 10, right: 140, bottom: 20, width: '90%', height: '85%' },
            pieSliceText: 'percentage',
            pieSliceTextStyle: { color: '#fff', fontSize: 11, fontName: 'Inter', bold: true },
            tooltip: getTooltipConfig(),
            animation: { startup: true, duration: 1000, easing: 'out' },
            fontName: 'Inter'
        };

        if (vehicleChart) vehicleChart.clearChart();
        vehicleChart = new google.visualization.PieChart(el);
        vehicleChart.draw(dt, options);
    }

    // ══ BARRA EMPILHADA -- Situacao por Cliente ══════════════════
    // Mostra aprovados, pendentes e reprovados empilhados por cliente
    // Isso aqui roda tudo, mais veloz que o Sonic
    function renderStackedBarChart() {
        const el = document.getElementById('stackedBarChartDiv');
        if (!el || !checkingsData.length) return;

        const byClient = {};
        checkingsData.forEach(c => {
            const cl = c.cliente || 'Desconhecido';
            if (!byClient[cl]) byClient[cl] = { approved: 0, pending: 0, rejected: 0 };
            const s = (c.status || 'pending').toLowerCase();
            if (byClient[cl][s] !== undefined) byClient[cl][s]++;
        });

        const sorted = Object.entries(byClient)
            .map(([cl, st]) => [cl, st.approved + st.pending + st.rejected, st])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        if (sorted.length === 0) return;

        const dt = new google.visualization.DataTable();
        dt.addColumn('string', 'Cliente');
        dt.addColumn('number', 'Aprovados');
        dt.addColumn('number', 'Pendentes');
        dt.addColumn('number', 'Reprovados');

        sorted.forEach(([cl, , st]) => {
            const label = cl.length > 18 ? cl.substring(0, 16) + '...' : cl;
            dt.addRow([label, st.approved, st.pending, st.rejected]);
        });

        const options = {
            isStacked: true,
            backgroundColor: getBgColor(),
            colors: ['#22c55e', '#f59e0b', '#ef4444'],
            legend: { position: 'top', textStyle: { color: getTextColor(), fontSize: 11, fontName: 'Inter' } },
            chartArea: { left: 120, top: 40, right: 20, bottom: 40, width: '75%', height: '75%' },
            hAxis: { textStyle: { color: getTextColor(), fontSize: 10 }, gridlines: { color: getGridColor() }, minValue: 0 },
            vAxis: { textStyle: { color: getTextColor(), fontSize: 10, fontName: 'Inter' } },
            bars: 'horizontal',
            animation: { startup: true, duration: 800, easing: 'out' },
            fontName: 'Inter',
            tooltip: getTooltipConfig(),
            focusTarget: 'category'
        };

        if (stackedBarChart) stackedBarChart.clearChart();
        stackedBarChart = new google.visualization.BarChart(el);
        stackedBarChart.draw(dt, options);
    }

    // Redimensiona tudo quando a janela muda de tamanho
    // Responsivo ate o infinito e alem
    function resize() { if (loaded) renderAll(); }

    return { init, setData, renderAll, renderAreaChart, resize };
})();
