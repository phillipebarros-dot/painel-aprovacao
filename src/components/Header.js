const HeaderComponent = {
    render: function (activePage = 'dashboard') {
        const user = typeof API !== 'undefined' ? API.getUser() : null;
        const role = user ? user.role : 'analyst';
        const isAdmin = role === 'admin';

        const activeClass = 'active text-slate-900 dark:text-white border-b border-black dark:border-white pb-0.5';
        const inactiveClass = 'text-slate-500 dark:text-neutral-600 hover:text-slate-900 dark:hover:text-white transition-colors';

        const dashboardActive = activePage === 'dashboard' ? activeClass : inactiveClass;
        const aprovacoesActive = activePage === 'aprovacoes' ? activeClass : inactiveClass;
        const operacoesActive = activePage === 'operacoes' ? activeClass : inactiveClass;
        const usuariosActive = activePage === 'usuarios' ? activeClass : inactiveClass;
        const relatoriosActive = activePage === 'relatorios' ? activeClass : inactiveClass;

        const navStyle = 'style="background:transparent;border-top:none;border-left:none;border-right:none;"';

        // Build nav links — Operações and Usuários only for admin/manager, Relatórios always last
        let navLinks = `
                <a href="dashboard.html" class="header-nav-item ${dashboardActive} text-[12px] font-mono uppercase tracking-[0.15em] font-medium" ${navStyle}>Dashboard</a>
                <a href="aprovacoes.html" class="header-nav-item ${aprovacoesActive} text-[12px] font-mono uppercase tracking-[0.15em] font-medium" ${navStyle}>Aprovações</a>`;

        if (isAdmin) {
            navLinks += `
                <a href="operacoes.html" class="header-nav-item ${operacoesActive} text-[12px] font-mono uppercase tracking-[0.15em] font-medium" ${navStyle}>Operações</a>
                <a href="usuarios.html" class="header-nav-item ${usuariosActive} text-[12px] font-mono uppercase tracking-[0.15em] font-medium" ${navStyle}>Usuários</a>`;
        }

        navLinks += `
                <a href="relatorios.html" class="header-nav-item ${relatoriosActive} text-[12px] font-mono uppercase tracking-[0.15em] font-medium" ${navStyle}>Relatórios</a>`;

        return `
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-3 text-slate-900 dark:text-white">
                <img src="../assets/img/logo-grupoom.png"
                    class="h-6 object-contain grayscale hover:grayscale-0 transition-all" alt="Grupo OM" />
                <h2 class="text-xs font-semibold tracking-[0.2em] uppercase font-mono text-slate-700 dark:text-neutral-400 hidden md:block">
                    Grupo OM <span class="text-slate-400 dark:text-neutral-700 mx-2">//</span> <span class="text-slate-900 dark:text-white">Painel de Aprovação</span>
                </h2>
            </div>
        </div>
        <div class="flex items-center gap-8">
            <nav class="hidden lg:flex items-center gap-6">
                ${navLinks}
            </nav>
            <div class="h-3 w-px bg-slate-200 dark:bg-neutral-800 mx-2"></div>
            <div class="flex items-center gap-4">
                <button class="text-slate-500 dark:text-neutral-600 hover:text-slate-900 dark:hover:text-white transition-colors" onclick="Dashboard.toggleTheme()" title="Alternar Tema">
                    <span class="material-symbols-outlined text-[18px]" id="dashThemeIcon">dark_mode</span>
                </button>
                <button class="text-slate-500 dark:text-neutral-600 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-[18px]">notifications</span>
                </button>
                <div class="bg-center bg-no-repeat bg-cover size-7 grayscale hover:grayscale-0 transition-all border border-slate-400 dark:border-neutral-700 font-mono text-center leading-7 text-[11px] user-avatar cursor-pointer flex items-center justify-center font-bold text-slate-900 dark:text-white shadow-inner" onclick="API.logout()" id="userAvatar" title="Sair">U</div>
                <span id="userName" class="hidden"></span>
                <span id="userRole" class="hidden"></span>
            </div>
        </div>
        `;
    }
};
