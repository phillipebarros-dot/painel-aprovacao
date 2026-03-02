/**
 * API Client -- Painel de Aprovacao
 * Wrapper centralizado de fetch com autenticacao JWT
 *
 * Isso aqui roda tudo, mais veloz que o Sonic na fase final.
 * Um unico ponto de entrada pra todas as chamadas ao backend n8n.
 * Cada request vai com o token JWT no header Authorization.
 * Se o token expirar, redireciona pro login automaticamente.
 *
 * Ainda bem que a AI me ajudou nisso kkk, montar JWT na mao e sofrimento
 */
const API = (() => {
  // Altere para true se estiver testando o workflow no n8n (botao 'Test Workflow')
  // Quando e teste, usa o webhook-test. Quando e producao, usa o webhook normal.
  // Caraca velho, isso aqui salva muito tempo na hora de debugar
  const IS_TEST_MODE = false;
  const BASE_URL = IS_TEST_MODE
    ? 'https://n8n.grupoom.com.br/webhook-test/painel-aprovacao'
    : 'https://n8n.grupoom.com.br/webhook/painel-aprovacao';

  // Chaves do localStorage -- simples e direto
  const TK = 'painel_token', UK = 'painel_user';

  // Funcoes de token -- pega, salva e remove do localStorage
  // Parece basico mas e a base de tudo
  const getToken = () => localStorage.getItem(TK);
  const setToken = t => localStorage.setItem(TK, t);
  const removeToken = () => { localStorage.removeItem(TK); localStorage.removeItem(UK); };
  const getUser = () => { try { return JSON.parse(localStorage.getItem(UK)); } catch { return null; } };
  const setUser = u => localStorage.setItem(UK, JSON.stringify(u));

  // FIX: atob() nao aceita Base64URL (com - e _). E necessario converter antes de decodificar.
  // Isso me deu um pouco de trabalho ate descobrir que o problema era o padding.
  // Base64URL usa - e _ no lugar de + e /, e nao tem padding com =.
  // Agora ta legal, agora vai funcionar
  function decodeJwtPayload(token) {
    try {
      const base64url = token.split('.')[1];
      // Converte Base64URL para Base64 padrao -- sem isso o atob explode
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      // Padding necessario para o atob funcionar corretamente
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  // Verifica se o usuario ta logado checando o token e a expiracao
  // Se o token expirou, retorna false e o usuario vai pro login
  function isLoggedIn() {
    const t = getToken();
    if (!t) return false;
    const payload = decodeJwtPayload(t);
    if (!payload) return false;
    // Compara timestamp de expiracao com o horario atual
    return !(payload.exp && Date.now() / 1000 > payload.exp);
  }

  // Funcao central de chamada ao backend -- TODAS as requests passam por aqui
  // Isso e absolute cinema: um unico ponto de entrada, tratamento de erro,
  // header automatico, e redirect quando o token expira
  async function call(action, body = {}) {
    const h = { 'Content-Type': 'application/json' };
    const t = getToken(); if (t) h['Authorization'] = `Bearer ${t}`;
    try {
      const r = await fetch(BASE_URL, { method: 'POST', headers: h, body: JSON.stringify({ action, ...body }) });
      let d;
      try {
        d = await r.json();
        // Se o n8n devolver um array (comum), pegamos o primeiro item
        if (Array.isArray(d) && d.length > 0) d = d[0];
      } catch {
        d = { message: await r.text() };
      }

      // Tratamento especial para erro do n8n (AxiosError) que vem dentro do 200 OK
      if (d && d.error && d.error.message) {
        let msg = d.error.message;
        // Limpa escapes comuns do n8n para tentar achar o JSON do GCP
        const cleanStr = msg.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const jsonMatch = cleanStr.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            const innerJson = JSON.parse(jsonMatch[0]);
            if (innerJson.mensagem) msg = innerJson.mensagem;
            else if (innerJson.message) msg = innerJson.message;
          } catch (e) { }
        } else {
          // Se nao for JSON, apenas limpa o prefixo do status code (ex: "404 - ")
          msg = msg.split(' - ').pop().replace(/^"|"$/g, '');
        }
        throw new Error(msg);
      }

      // Se retornou 401, o token expirou -- manda pro login de qualquer pagina
      if (r.status === 401) { removeToken(); if (!location.pathname.includes('index.html')) location.href = 'index.html'; throw new Error(d.error || 'Sessao expirada'); }

      if (!r.ok) {
        console.error(`[API Error] ${action}:`, d);
        throw new Error(d.error || d.message || d.mensagem || `Erro ${r.status}`);
      }
      return d;
    } catch (e) {
      console.error(`[Fetch Error] ${action}:`, e);
      // Se e erro de rede (fetch failed), da uma mensagem mais clara
      if (e.message?.includes('fetch') || e.name === 'TypeError') {
        throw new Error('Erro de conexao com o servidor. Verifique se o n8n esta rodando e se o CORS esta configurado.');
      }
      throw e;
    }
  }

  // Login -- chama a action 'login' e salva o token/usuario no localStorage
  // Simples assim: email + senha = token JWT + dados do usuario
  async function login(email, password) {
    const d = await call('login', { email, password });
    if (d.token) { setToken(d.token); setUser(d.user); }
    return d;
  }

  // Logout -- limpa tudo e manda pro login. Tchau, ate a proxima
  const logout = () => { removeToken(); location.href = 'index.html'; };

  // API publica do modulo -- cada funcao e um atalho pra uma action do backend
  // Ta pior que o Nero ativando a Devil Trigger -- poder maximo na API
  return {
    call, login, logout, getToken, getUser, isLoggedIn, removeToken,
    healthCheck: () => call('health_check'),
    getStats: () => call('get_stats'),
    getPending: () => call('get_pending'),
    getAllCheckings: () => call('get_all_checkings'),
    getCheckings: f => call('get_checkings', f),
    approve: (id, u) => call('approve', { id, approval_user: u }),
    reject: (id, u, r) => call('reject', { id, approval_user: u, reason: r }),
    getUsers: () => call('get_users'),
    getFiles: (id) => call('get_files', { submission_id: id }),
    registerUser: (n, e, p, r = 'analyst', g = 'Midia') => call('register_user', { name: n, email: e, password: p, role: r, grupo: g }),
    updateUserRole: (id, r) => call('update_user_role', { userId: id, newRole: r }),
    updateUserStatus: (id, s) => call('update_user_status', { userId: id, status: s }),
    generateSlides: (payload) => call('generate_slides', payload) // Comunicação com GCP para autogeração de Slides do PPTX na raiz do relatorios.html
  };
})();
