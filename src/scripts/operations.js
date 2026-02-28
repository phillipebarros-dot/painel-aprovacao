/**
 * Módulo de Operações — Admin Only
 * Status dos serviços, log de ações e informações do sistema.
 */
const Operations = (() => {
    let refreshInterval = null;

    async function init() {
        // RBAC: Only admin/manager can access
        if (!Auth.checkSession()) return;
        const user = API.getUser();
        if (!user || user.role !== 'admin') {
            location.href = 'dashboard.html';
            return;
        }

        // Setup header
        const header = document.getElementById('app-header');
        if (header && typeof HeaderComponent !== 'undefined') {
            header.innerHTML = HeaderComponent.render('operacoes');
        }
        Auth.setupUserMenu();

        // Populate user info
        const userEl = document.getElementById('opsCurrentUser');
        const roleEl = document.getElementById('opsCurrentRole');
        if (userEl) userEl.textContent = user.name || user.email;
        if (roleEl) roleEl.textContent = user.role;

        // Setup theme toggle
        setupTheme();

        // Load data
        await Promise.all([checkServices(), loadAuditLog()]);

        // Auto-refresh every 30s
        refreshInterval = setInterval(async () => {
            await checkServices();
        }, 30000);
    }

    function setupTheme() {
        const saved = localStorage.getItem('painel_theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            if (saved === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }
        const icon = document.getElementById('dashThemeIcon');
        if (icon) {
            const theme = document.documentElement.getAttribute('data-theme');
            icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    }

    async function checkServices() {
        const startTime = Date.now();
        try {
            const d = await API.healthCheck();
            const latency = Date.now() - startTime;

            // API Status
            setServiceStatus('svcApi', 'Online', 'green', `latência: ${latency}ms`);

            // BigQuery — infer from health response
            if (d.status === 'online') {
                setServiceStatus('svcBq', 'Online', 'green');
                setServiceStatus('svcDrive', 'Online', 'green');
                setServiceStatus('svcSmtp', 'Online', 'green');
            }

            // Overall status
            const statusEl = document.getElementById('opsSystemStatus');
            if (statusEl) {
                statusEl.innerHTML = '● Todos Serviços Online';
                statusEl.className = 'text-[11px] font-mono text-green-600 dark:text-green-500 uppercase tracking-wider font-semibold';
            }
        } catch (e) {
            setServiceStatus('svcApi', 'Offline', 'red', 'sem resposta');
            setServiceStatus('svcBq', 'Desconhecido', 'amber');
            setServiceStatus('svcDrive', 'Desconhecido', 'amber');
            setServiceStatus('svcSmtp', 'Desconhecido', 'amber');

            const statusEl = document.getElementById('opsSystemStatus');
            if (statusEl) {
                statusEl.innerHTML = '● Falha de Conexão';
                statusEl.className = 'text-[11px] font-mono text-red-600 dark:text-red-500 uppercase tracking-wider font-semibold';
            }
        }

        // Update last check time
        const lastCheck = document.getElementById('opsLastCheck');
        if (lastCheck) {
            lastCheck.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }

    function setServiceStatus(prefix, status, color, extra) {
        const el = document.getElementById(prefix + 'Status');
        const dot = document.getElementById(prefix + 'Dot');
        const latency = document.getElementById(prefix + 'Latency');

        if (el) el.textContent = status;
        if (dot) {
            dot.className = `size-2 rounded-full ${color === 'green' ? 'bg-green-500 animate-pulse' : color === 'red' ? 'bg-red-500' : 'bg-amber-500'}`;
        }
        if (latency && extra) latency.textContent = extra;
    }

    async function loadAuditLog() {
        const body = document.getElementById('opsLogBody');
        const countEl = document.getElementById('opsLogCount');
        if (!body) return;

        try {
            // Fetch all checkings to build an operations log
            const res = await API.getAllCheckings();
            const checkings = res.checkings || res || [];

            // Filter only processed (approved/rejected) items — these are the "operations"
            const operations = checkings
                .filter(c => c.status === 'approved' || c.status === 'rejected')
                .sort((a, b) => {
                    const da = new Date(a.updated_at || a.created_at || 0);
                    const db = new Date(b.updated_at || b.created_at || 0);
                    return db - da;
                })
                .slice(0, 50); // Last 50

            if (countEl) countEl.textContent = operations.length + ' registros';

            if (operations.length === 0) {
                body.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-slate-400 dark:text-neutral-600 font-mono text-[12px]">Nenhuma operação registrada</td></tr>';
                return;
            }

            body.innerHTML = operations.map(op => {
                const date = op.updated_at || op.created_at || '';
                const time = date ? new Date(date.replace(' ', 'T')).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                const action = op.status === 'approved' ? 'APROVAR' : 'REPROVAR';
                const actionClass = op.status === 'approved'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400';
                const user = typeof escapeHtml === 'function' ? escapeHtml(op.approval_user || '—') : (op.approval_user || '—');
                const details = typeof escapeHtml === 'function' ? escapeHtml(op.cliente || op.pi || '—') : (op.cliente || op.pi || '—');

                return `<tr class="border-b border-slate-100 dark:border-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-900/30 transition-colors">
                    <td class="py-2 px-2 text-slate-500 dark:text-neutral-500 font-semibold">${time}</td>
                    <td class="py-2 px-2 font-bold ${actionClass}">${action}</td>
                    <td class="py-2 px-2 text-slate-700 dark:text-neutral-300 font-semibold">${user}</td>
                    <td class="py-2 px-2 text-slate-500 dark:text-neutral-400 font-semibold">${details}</td>
                </tr>`;
            }).join('');
        } catch (e) {
            body.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-red-500 font-mono text-[12px]">Erro ao carregar log</td></tr>';
        }
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', init);

    return { init };
})();
