/**
 * Modulo de Autenticacao -- Login/Register/Sessao
 * Cuida de tudo relacionado a login, registro e sessao do usuario.
 *
 * Isso aqui e absolute cinema: valida sessao, mostra formularios,
 * trata erros e redireciona tudo automaticamente.
 * Caraca velho, ta pior que seguranca de banco -- ninguem passa sem credencial.
 */
const Auth = (() => {
    // Inicializa a pagina de login
    // Se o usuario ja ta logado, manda direto pro dashboard. Sem enrolacao.
    function initLoginPage() {
        if (API.isLoggedIn()) { location.href = 'dashboard.html'; return; }

        // Elementos do formulario de Login -- cada um no seu lugar
        const loginForm = document.getElementById('loginForm');
        const loginErr = document.getElementById('loginError');
        const loginErrMsg = document.getElementById('loginErrorMsg');
        const loginBtn = document.getElementById('loginBtn');

        // Elementos do formulario de Registro -- novo usuario? vem aqui
        const registerForm = document.getElementById('registerForm');
        const regErr = document.getElementById('registerError');
        const regErrMsg = document.getElementById('registerErrorMsg');
        const regBtn = document.getElementById('registerBtn');

        // Elementos de navegacao entre Login e Registro
        const showRegBtn = document.getElementById('showRegisterBtn');
        const backToLoginBtn = document.getElementById('backToLoginBtn');
        const loginSec = document.getElementById('loginSection');
        const regSec = document.getElementById('registerSection');

        // Toggle entre Login e Registro -- mostra um, esconde o outro
        // Simples mas funciona perfeitamente
        if (showRegBtn && backToLoginBtn) {
            showRegBtn.addEventListener('click', () => {
                loginSec.style.display = 'none';
                regSec.style.display = 'block';
            });

            backToLoginBtn.addEventListener('click', () => {
                regSec.style.display = 'none';
                loginSec.style.display = 'block';
            });
        }

        // Handler de Login -- aqui a magia acontece
        // Manda email e senha pro backend via API.login()
        // Se der certo, redireciona pro dashboard. Agora ta legal, agora vai funcionar
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value.trim();
                const pw = document.getElementById('loginPassword').value;
                if (!email || !pw) { showErr(loginErr, loginErrMsg, 'Preencha todos os campos'); return; }

                // Coloca o botao em modo loading -- feedback visual e importante
                loginBtn.classList.add('loading');
                loginBtn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Entrando...';

                try {
                    await API.login(email, pw);
                    location.href = 'dashboard.html';
                } catch (err) {
                    // Se deu erro, mostra a mensagem e reseta o botao
                    showErr(loginErr, loginErrMsg, err.message || 'Credenciais invalidas');
                    loginBtn.classList.remove('loading');
                    loginBtn.innerHTML = '<span>Continuar com Email</span>';
                }
            });
        }

        // Handler de Registro -- cria conta nova
        // Isso me deu um pouco de trabalho pra fazer o fluxo ficar bonito
        // Apos registrar, mostra mensagem de sucesso e volta pro login automaticamente
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('regName').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const pw = document.getElementById('regPassword').value;

                if (!name || !email || !pw) { showErr(regErr, regErrMsg, 'Preencha todos os campos'); return; }

                regBtn.classList.add('loading');
                regBtn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Aguarde...';

                try {
                    await API.registerUser(name, email, pw, 'analyst');
                    // Mostra sucesso com cor verde e redireciona pro login apos 2s
                    // Ainda bem que a AI me ajudou nisso kkk, o timing ficou perfeito
                    regErr.style.display = 'flex';
                    regErr.style.background = 'var(--accent-green-bg)';
                    regErr.style.color = 'var(--accent-green)';
                    regErrMsg.textContent = 'Conta criada com sucesso! Faca login.';
                    setTimeout(() => {
                        regSec.style.display = 'none';
                        loginSec.style.display = 'block';
                        document.getElementById('loginEmail').value = email;
                        document.getElementById('loginPassword').focus();

                        // Reseta o estilo do erro pra vermelho novamente
                        regErr.style.background = 'var(--accent-red-bg)';
                        regErr.style.color = 'var(--accent-red)';
                        regErr.style.display = 'none';
                    }, 2000);
                } catch (err) {
                    showErr(regErr, regErrMsg, err.message || 'Erro ao registrar');
                } finally {
                    regBtn.classList.remove('loading');
                    regBtn.innerHTML = '<span>Cadastrar</span>';
                }
            });
        }

        // Mostra mensagem de erro e some depois de 5 segundos
        // UX basica mas faz diferenca
        function showErr(container, msgEl, msg) {
            if (!container || !msgEl) return;
            msgEl.textContent = msg;
            container.style.display = 'flex';
            setTimeout(() => container.style.display = 'none', 5000);
        }
    }

    // Verifica se a sessao ta ativa -- se nao tiver, manda pro login
    // Guarda de seguranca do dashboard, ninguem passa sem token valido
    function checkSession() {
        if (!API.isLoggedIn()) { location.href = 'index.html'; return false; }
        return true;
    }

    // Configura o menu do usuario no header -- nome, role e avatar
    // Pega a primeira letra do nome pra fazer o avatar circular
    function setupUserMenu() {
        const user = API.getUser();
        if (!user) return;
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');
        const avatarEl = document.getElementById('userAvatar');
        if (nameEl) nameEl.textContent = user.name || user.email;
        if (roleEl) roleEl.textContent = user.role || 'analyst';
        if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }

    return { initLoginPage, checkSession, setupUserMenu };
})();
