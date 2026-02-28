/**
 * Modulo de Graficos Customizados (Substituindo Google Charts)
 * Cinema puro. Usa SVG nativo e manipulacao de DOM para criar as artes.
 */
const Charts = (() => {
    let statsData = null;
    let checkingsData = [];
    let liveInterval = null;

    function init() {
        // Inicializa animacoes que ficam em loop
        startLiveProcessingBars();
        console.log("Custom Charts Module Initialized.");
    }

    function setData(stats, checkings) {
        statsData = stats;
        checkingsData = checkings || [];
        updateDonutChart();
        updateVolumeChart();
        updateAreaChart();
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

        // svg dashboard total length is 100 based on path total length for r=15.9155
        // (100 is the circumference)
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

    function updateVolumeChart() {
        const container = document.getElementById('opVolumeChart');
        if (!container) return;

        const bars = container.querySelectorAll('.w-full[class*="h-"]');
        if (!bars.length) return;

        // Group checkings by date (last 7 days if possible)
        const recentDates = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            recentDates[dateStr] = 0;
        }

        if (checkingsData && checkingsData.length) {
            checkingsData.forEach(c => {
                if (c.created_at) {
                    const dateStr = c.created_at.split(' ')[0];
                    if (recentDates.hasOwnProperty(dateStr)) {
                        recentDates[dateStr]++;
                    }
                }
            });
        }

        const counts = Object.values(recentDates);
        const maxVol = Math.max(...counts, 10);

        bars.forEach((bar, i) => {
            if (i < counts.length) {
                const heightPct = Math.floor((counts[i] / maxVol) * 100);
                const visualHeight = Math.max(heightPct, 5); // min 5% to show something
                bar.style.height = `${visualHeight}%`;
                const text = bar.querySelector('div.absolute');
                if (text) text.innerText = counts[i].toString();
            }
        });
    }

    function updateAreaChart() {
        const svg = document.getElementById('areaChartSvg');
        if (!svg) return;

        const paths = svg.querySelectorAll('path');
        const circles = svg.querySelectorAll('circle');

        // Plot timeline based on actual data
        let counts = [0, 0, 0, 0, 0, 0];

        if (checkingsData && checkingsData.length) {
            const now = new Date();
            checkingsData.forEach(c => {
                if (c.created_at) {
                    const d = new Date(c.created_at.replace(' ', 'T'));
                    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
                    // Group into 6 buckets (e.g. 0-5 days ago)
                    if (diffDays >= 0 && diffDays < 6) {
                        counts[5 - diffDays]++; // 0 is oldest, 5 is newest
                    }
                }
            });
        } else {
            // Fallback empty flat line if no data
            counts = [0, 0, 0, 0, 0, 0];
        }

        const maxCount = Math.max(...counts, 10);

        // Map to svg coordinates (y usually inverted, 100 is bottom, 0 is top)
        // Adjust padding to fit
        const pts = counts.map((c, i) => {
            const x = i * 20; // 0, 20, 40, 60, 80, 100
            const y = 90 - (c / maxCount) * 80; // Scale between y=10 and y=90
            return { x, y: Math.max(10, y) };
        });

        let dArea = `M0,100 L0,${pts[0].y} `;
        let dLine = `M0,${pts[0].y} `;

        for (let i = 1; i < pts.length; i++) {
            // curve smoothness
            const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 2;
            const cp1y = pts[i - 1].y;
            const cp2x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 2;
            const cp2y = pts[i].y;
            dArea += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${pts[i].x},${pts[i].y} `;
            dLine += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${pts[i].x},${pts[i].y} `;
        }

        dArea += `V100 Z`;

        if (paths[0]) paths[0].setAttribute('d', dArea);
        if (paths[1]) paths[1].setAttribute('d', dLine);

        circles.forEach((c, i) => {
            if (pts[i]) {
                c.setAttribute('cy', pts[i].y);
            }
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
        // svg is responsive naturally
    }

    return { init, setData, resize };
})();
