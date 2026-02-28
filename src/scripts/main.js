/**
 * Main Application Orchestrator
 * Bootstraps the Vanilla JS application by mounting components and initializing modules.
 */

// ── Global Utilities ─────────────────────────────────────────────
// Tab switching for filter buttons (used in aprovacoes, dashboard, etc.)
function setActiveTab(btn) {
    if (!btn || !btn.parentElement) return;
    btn.parentElement.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    // 0. Apply saved theme (for pages using Tailwind class-based dark mode)
    const savedTheme = localStorage.getItem('painel_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        // Tailwind class-based dark mode sync
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    // 1. Mount Header Component
    const headerContainer = document.getElementById('app-header');
    if (headerContainer && typeof HeaderComponent !== 'undefined') {
        const activePage = document.body.dataset.page || 'dashboard';
        headerContainer.innerHTML = HeaderComponent.render(activePage);

        // Re-bind Auth setup for the newly rendered header
        if (typeof Auth !== 'undefined') {
            Auth.setupUserMenu();
        }
    }

    // 2. Initialize Dashboard/Page specific Logic
    if (document.body.dataset.page === 'dashboard' && typeof Dashboard !== 'undefined') {
        Dashboard.init();
    } else if (document.body.dataset.page === 'aprovacoes' && typeof Approvals !== 'undefined') {
        if (typeof Auth !== 'undefined' && Auth.checkSession()) {
            Approvals.load();
            Approvals.renderAuditLog();
        }
    } else if (document.body.dataset.page === 'usuarios' && typeof Users !== 'undefined') {
        if (typeof Auth !== 'undefined' && Auth.checkSession()) {
            const currentUser = API.getUser();
            if (!currentUser || currentUser.role !== 'admin') {
                location.href = 'dashboard.html';
                return;
            }
            Users.load();
        }
    } else if (document.body.dataset.page === 'relatorios' && typeof Reports !== 'undefined') {
        if (typeof Auth !== 'undefined' && Auth.checkSession()) {
            Reports.init();
        }
    }
});
