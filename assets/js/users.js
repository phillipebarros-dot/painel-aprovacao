/**
 * Modulo de Usuarios -- Listar, Registrar, Alterar Permissao/Status
 * Gerencia os usuarios que tem acesso ao painel.
 *
 * CRUD de usuarios: listar em cards, criar novo, trocar role e ativar/desativar.
 * Tudo com SweetAlert2 pra manter o padrao visual do sistema.
 *
 * cada usuario com seu card bonito e funcional.
 * Ta pior que o Nero ativando a Devil Trigger no gerenciamento de permissoes kkk
 */
const Users = (() => {
    let users = [];

    // Carrega a lista de usuarios do backend
    // Pronto, simples assim. Uma chamada e traz tudo.
    async function load() {
        try {
            const data = await API.getUsers();
            users = data.users || (Array.isArray(data) ? data : []);
            render();
        } catch (e) { console.error('Users load:', e); }
    }

    // Renderiza os cards de usuarios na grid
    // Cada card mostra: iniciais, nome, email, status e role
    // O select de role ja altera direto no backend -- sem precisar de botao salvar
    // Agora ta legal, agora vai funcionar
    function render() {
        const grid = document.getElementById('usersGrid');
        if (!grid) return;
        if (users.length === 0) {
            grid.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">group</span><h4>Nenhum usuario encontrado</h4><p>Cadastre o primeiro usuario</p></div>';
            return;
        }
        // Monta os cards -- cada usuario vira um card bonito com avatar
        // As iniciais sao as 2 primeiras letras do nome, tipo avatar de perfil
        grid.innerHTML = users.map(u => {
            const initials = (u.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            const statusLabel = u.status === 'active' ? 'Ativo' : 'Inativo';
            const statusClass = u.status === 'active' ? 'badge-approved' : 'badge-rejected';
            return `<div class="user-card anim-fade-up">
        <div class="user-card-header">
          <div class="user-avatar">${initials}</div>
          <div class="user-card-info">
            <h4>${u.name || '–'}</h4>
            <p>${u.email || '–'}</p>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
          <select class="role-select" onchange="Users.changeRole('${u.id}',this.value)">
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Manager</option>
            <option value="analyst" ${u.role === 'analyst' ? 'selected' : ''}>Analyst</option>
          </select>
          <button class="btn btn-ghost" style="padding:4px 8px;font-size:11px" onclick="Users.toggleStatus('${u.id}','${u.status}')">
            <span class="material-symbols-outlined" style="font-size:14px">${u.status === 'active' ? 'person_off' : 'person'}</span>
            ${u.status === 'active' ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>`;
        }).join('');
    }

    // Troca o role de um usuario -- admin, manager ou analyst
    // Altera no backend e atualiza o estado local
    // Isso me deu um pouco de trabalho pra fazer o select funcionar inline
    async function changeRole(id, role) {
        try {
            await API.updateUserRole(id, role);
            const u = users.find(x => x.id === id);
            if (u) u.role = role;
        } catch (e) { Swal.fire('Erro', e.message, 'error'); }
    }

    // Ativa ou desativa um usuario -- toggle simples
    // Caraca velho, uma linha muda tudo: active vira inactive e vice-versa
    async function toggleStatus(id, current) {
        const next = current === 'active' ? 'inactive' : 'active';
        try {
            await API.updateUserStatus(id, next);
            const u = users.find(x => x.id === id);
            if (u) u.status = next;
            render();
        } catch (e) { Swal.fire('Erro', e.message, 'error'); }
    }

    // Modal de cadastro de novo usuario -- SweetAlert2 customizado
    // Campos: nome, email, senha e papel (role)
    // Ainda bem que a AI me ajudou nisso kkk, o formulario ficou bonito demais
    async function openRegister() {
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';
        const { isConfirmed, value } = await Swal.fire({
            title: 'Novo Usuario',
            html: `<div style="text-align:left">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${dk ? '#94a3b8' : '#374151'};display:block;margin-bottom:4px">Nome</label>
        <input id="regName" placeholder="Nome completo" style="width:100%;padding:10px;border:1.5px solid ${dk ? '#333' : '#d1d5db'};border-radius:8px;font-size:13px;background:${dk ? '#111' : '#fff'};color:${dk ? '#f1f5f9' : '#111'};outline:none;margin-bottom:12px;box-sizing:border-box"/>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${dk ? '#94a3b8' : '#374151'};display:block;margin-bottom:4px">Email</label>
        <input id="regEmail" type="email" placeholder="email@empresa.com" style="width:100%;padding:10px;border:1.5px solid ${dk ? '#333' : '#d1d5db'};border-radius:8px;font-size:13px;background:${dk ? '#111' : '#fff'};color:${dk ? '#f1f5f9' : '#111'};outline:none;margin-bottom:12px;box-sizing:border-box"/>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${dk ? '#94a3b8' : '#374151'};display:block;margin-bottom:4px">Senha</label>
        <input id="regPw" type="password" placeholder="••••••••" style="width:100%;padding:10px;border:1.5px solid ${dk ? '#333' : '#d1d5db'};border-radius:8px;font-size:13px;background:${dk ? '#111' : '#fff'};color:${dk ? '#f1f5f9' : '#111'};outline:none;margin-bottom:12px;box-sizing:border-box"/>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${dk ? '#94a3b8' : '#374151'};display:block;margin-bottom:4px">Papel</label>
        <select id="regRole" style="width:100%;padding:10px;border:1.5px solid ${dk ? '#333' : '#d1d5db'};border-radius:8px;font-size:13px;background:${dk ? '#111' : '#fff'};color:${dk ? '#f1f5f9' : '#111'};outline:none;box-sizing:border-box">
          <option value="analyst">Analyst</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>`,
            showCancelButton: true,
            confirmButtonText: 'Cadastrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3b82f6',
            background: dk ? '#0f1629' : '#fff',
            color: dk ? '#f1f5f9' : '#111',
            preConfirm: () => {
                const n = document.getElementById('regName').value.trim();
                const e = document.getElementById('regEmail').value.trim();
                const p = document.getElementById('regPw').value;
                const r = document.getElementById('regRole').value;
                if (!n || !e || !p) { Swal.showValidationMessage('Preencha todos os campos'); return false; }
                return { name: n, email: e, password: p, role: r };
            }
        });

        if (isConfirmed) {
            try {
                await API.registerUser(value.name, value.email, value.password, value.role);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Usuario cadastrado!', showConfirmButton: false, timer: 3000 });
                await load();
            } catch (e) { Swal.fire('Erro', e.message, 'error'); }
        }
    }

    return { load, render, changeRole, toggleStatus, openRegister };
})();
