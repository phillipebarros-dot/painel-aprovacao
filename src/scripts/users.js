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
    const currentUser = API.getUser();
    const isAdmin = currentUser && currentUser.role === 'admin';

    grid.innerHTML = users.map(u => {
      const safeName = escapeHtml(u.name || '–');
      const safeEmail = escapeHtml(u.email || '–');
      const safeGrupo = escapeHtml(u.grupo || 'Mídia');
      const safeId = escapeHtml(u.id);
      const initials = (u.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const statusLabel = u.status === 'active' ? 'Ativo' : 'Inativo';
      const statusClass = u.status === 'active' ? 'badge-approved' : 'badge-rejected';

      const adminControls = isAdmin ? `
            <select class="role-select" onchange="Users.changeRole('${safeId}',this.value)">
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="analyst" ${u.role === 'analyst' ? 'selected' : ''}>Analyst</option>
          </select>
          <button class="btn btn-ghost" style="padding:4px 8px;font-size:11px" onclick="Users.toggleStatus('${safeId}','${u.status}')">
            <span class="material-symbols-outlined" style="font-size:14px">${u.status === 'active' ? 'person_off' : 'person'}</span>
            ${u.status === 'active' ? 'Desativar' : 'Ativar'}
          </button>` : `<span style="font-size:10px;color:var(--text-tertiary);font-family:var(--font-mono);text-transform:uppercase">${escapeHtml(u.role)}</span>`;

      return `<div class="user-card anim-fade-up">
        <div class="user-card-header">
          <div class="user-avatar">${escapeHtml(initials)}</div>
          <div class="user-card-info">
            <h4>${safeName}</h4>
            <p>${safeEmail}</p>
            <p style="font-size:10px;color:var(--text-tertiary);margin-top:2px;font-family:var(--font-mono);font-weight:600"><span class="material-symbols-outlined" style="font-size:11px;vertical-align:middle;margin-right:2px">group</span>${safeGrupo}</p>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
          ${adminControls}
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
  // Abre a nova modal nativa desenhada em HTML (substitui o antigo Swal)
  function openRegister() {
    // Reseta o form por precaucao
    const form = document.getElementById('nativeRegisterForm');
    if (form) form.reset();

    const alertBox = document.getElementById('registerAlert');
    if (alertBox) alertBox.style.display = 'none';

    // Abre a modal ativando o input hidden do tailwind
    const toggle = document.getElementById('register-modal-toggle');
    if (toggle) toggle.checked = true;
  }

  // Inicializa os listeners do modulo, principalmente o form de registro
  function init() {
    const regForm = document.getElementById('nativeRegisterForm');
    if (!regForm) return;

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('registerSubmitBtn');
      const alertBox = document.getElementById('registerAlert');
      const alertMsg = document.getElementById('registerAlertMsg');

      const n = document.getElementById('regName').value.trim();
      const em = document.getElementById('regEmail').value.trim();
      const p = document.getElementById('regPassword').value;
      const g = document.getElementById('regGrupo').value;
      const r = document.getElementById('regRole').value;

      if (!n || !em || !p) {
        if (alertBox && alertMsg) {
          alertMsg.textContent = 'Preencha todos os campos obrigatórios';
          alertBox.style.display = 'flex';
          setTimeout(() => alertBox.style.display = 'none', 5000);
        }
        return;
      }

      const ogText = btn.innerHTML;
      btn.innerHTML = 'Processando...';
      btn.disabled = true;

      try {
        await API.registerUser(n, em, p, r, g);

        // Sucesso: fecha a modal, limpa o form e recarrega a grid
        document.getElementById('register-modal-toggle').checked = false;
        regForm.reset();

        // Usa Swal pequeno nativo apenas para o toast de confirmacao
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Usuario cadastrado!', showConfirmButton: false, timer: 3000 });

        await load();
      } catch (err) {
        if (alertBox && alertMsg) {
          alertMsg.textContent = err.message || 'Erro ao registrar usuario';
          alertBox.style.display = 'flex';
          setTimeout(() => alertBox.style.display = 'none', 5000);
        }
      } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
      }
    });
  }

  // Executa o init automaticamente no parser
  setTimeout(init, 100);

  return { load, render, changeRole, toggleStatus, openRegister };
})();
