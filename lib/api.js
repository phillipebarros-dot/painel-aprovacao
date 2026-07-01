// lib/api.js — Real API Client for n8n Webhook Backend (ES Module)

const BASE_URL = 'https://n8n.grupoom.com.br/webhook/painel-aprovacao';
const GOOGLE_CLIENT_ID = '737388414069-3f9dnrla5807dd99d2s7apr38vjufpvv.apps.googleusercontent.com';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

const TK = 'painel_token';
const UK = 'painel_user';
const FK = 'painel_fp';
const SK = 'painel_sk';

function generateFingerprint() {
  const raw = [
    navigator.userAgent || '',
    navigator.language || '',
    screen.width + 'x' + screen.height,
    screen.colorDepth || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.hardwareConcurrency || ''
  ].join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const _sessionKey = (() => {
  const existing = sessionStorage.getItem(SK);
  if (existing) {
    try { const d = atob(existing); if (d.length === 32) return d; } catch (e) {}
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes, b => String.fromCharCode(b)).join('');
  sessionStorage.setItem(SK, btoa(key));
  return key;
})();

function xorObfuscate(str) {
  let r = '';
  for (let i = 0; i < str.length; i++) r += String.fromCharCode(str.charCodeAt(i) ^ _sessionKey.charCodeAt(i % _sessionKey.length));
  return btoa(r);
}
function xorDeobfuscate(encoded) {
  try {
    const str = atob(encoded);
    let r = '';
    for (let i = 0; i < str.length; i++) r += String.fromCharCode(str.charCodeAt(i) ^ _sessionKey.charCodeAt(i % _sessionKey.length));
    return r;
  } catch { return null; }
}

function getToken() {
  const raw = sessionStorage.getItem(TK);
  if (!raw) return null;
  const token = xorDeobfuscate(raw);
  if (!token || !/^[\x20-\x7E]+$/.test(token) || token.split('.').length !== 3) {
    removeToken();
    return null;
  }
  return token;
}
function setToken(t) {
  sessionStorage.setItem(TK, xorObfuscate(t));
  sessionStorage.setItem(FK, generateFingerprint());
}
function removeToken() {
  sessionStorage.removeItem(TK);
  sessionStorage.removeItem(UK);
  sessionStorage.removeItem(FK);
  sessionStorage.removeItem(SK);
}
function getUser() {
  try {
    const raw = sessionStorage.getItem(UK);
    if (!raw) return null;
    return JSON.parse(xorDeobfuscate(raw));
  } catch { return null; }
}
function setUser(u) {
  sessionStorage.setItem(UK, xorObfuscate(JSON.stringify(u)));
}

function decodeJwtPayload(token) {
  try {
    const b64url = token.split('.')[1];
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
    return JSON.parse(atob(padded));
  } catch { return null; }
}

function validateFingerprint() {
  const stored = sessionStorage.getItem(FK);
  if (!stored) return true;
  return stored === generateFingerprint();
}

function isLoggedIn() {
  const t = getToken();
  if (!t) return false;
  if (!validateFingerprint()) { removeToken(); return false; }
  const payload = decodeJwtPayload(t);
  if (!payload) return false;
  return !(payload.exp && Date.now() / 1000 > payload.exp);
}

let inactivityTimer = null;
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (getToken()) {
      removeToken();
      window.__painelOnSessionExpired?.();
    }
  }, INACTIVITY_TIMEOUT_MS);
}
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, resetInactivityTimer, { passive: true });
});
resetInactivityTimer();

const MAX_CONCURRENT = 4;
let _activeRequests = 0;
const _requestQueue = [];
function _enqueue() {
  if (_activeRequests < MAX_CONCURRENT) { _activeRequests++; return Promise.resolve(); }
  return new Promise(resolve => { _requestQueue.push(resolve); });
}
function _dequeue() {
  _activeRequests--;
  if (_requestQueue.length > 0) { _activeRequests++; _requestQueue.shift()(); }
}

async function call(action, body = {}) {
  if (getToken() && !validateFingerprint()) {
    removeToken();
    window.__painelOnSessionExpired?.();
    throw new Error('Sessao invalidada por seguranca');
  }
  resetInactivityTimer();
  // Long-running actions bypass concurrency limiter
  const isLongRunning = ['generate_slides', 'export_pdf', 'copilot_analyze'].includes(action);
  if (!isLongRunning) await _enqueue();
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t && typeof t === 'string' && /^[\x20-\x7E]+$/.test(t)) {
    h['Authorization'] = `Bearer ${t}`;
  }
  try {
    // Long-running actions get 120s timeout, normal actions 30s
    const controller = new AbortController();
    const timeoutMs = isLongRunning ? 120000 : 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(BASE_URL, {
      method: 'POST', headers: h,
      body: JSON.stringify({ action, ...body }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    let d;
    try { d = await r.clone().json(); } catch {
      try { d = { message: await r.text() }; } catch { d = { message: `Erro ${r.status}` }; }
    }
    if (r.status === 401) { removeToken(); window.__painelOnSessionExpired?.(); throw new Error(d.error || 'Sessao expirada'); }
    if (!r.ok) throw new Error(d.error || d.message || `Erro ${r.status}`);
    return d;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(isLongRunning ? 'Geração demorou mais de 2 min. Tente novamente.' : 'Timeout na requisição.');
    if (e.message?.includes('fetch') || e.name === 'TypeError') throw new Error('Erro de conexao com o servidor.');
    throw e;
  } finally { if (!isLongRunning) _dequeue(); }
}

async function login(email, password) {
  const d = await call('login', { email, password });
  if (d.token) { setToken(d.token); setUser(d.user); }
  return d;
}
async function loginWithGoogle(idToken) {
  let googlePicture = null;
  try { const payload = decodeJwtPayload(idToken); if (payload?.picture) googlePicture = payload.picture; } catch (e) {}
  const d = await call('login_sso', { id_token: idToken });
  if (d.token) {
    setToken(d.token);
    const user = d.user || {};
    // Foto do Google sempre tem prioridade sobre iniciais do backend
    if (googlePicture) user.avatar = googlePicture;
    setUser(user);
  }
  return d;
}
async function logout() {
  try { await call('logout'); } catch (e) {}
  removeToken();
}

let _heartbeatInterval = null;
function startHeartbeat() {
  if (_heartbeatInterval) return;
  const user = getUser();
  if (!user) return;
  call('heartbeat', { avatar: user.avatar || '' }).catch(() => {});
  _heartbeatInterval = setInterval(() => {
    if (!isLoggedIn()) { clearInterval(_heartbeatInterval); _heartbeatInterval = null; return; }
    call('heartbeat', { avatar: user.avatar || '' }).catch(() => {});
  }, 30000);
}
function stopHeartbeat() {
  if (_heartbeatInterval) { clearInterval(_heartbeatInterval); _heartbeatInterval = null; }
}

const PainelAPI = {
  call, login, loginWithGoogle, logout,
  getToken, getUser, setUser, isLoggedIn, removeToken,
  startHeartbeat, stopHeartbeat, GOOGLE_CLIENT_ID, decodeJwtPayload,
  healthCheck:       ()              => call('health_check'),
  getStats:          ()              => call('get_stats'),
  getPending:        ()              => call('get_pending'),
  getAllCheckings:    ()              => call('get_all_checkings'),
  getCheckings:      (filters)       => call('get_checkings', filters),
  approve:           (id, user)      => call('approve', { id, approval_user: user }),
  reject:            (id, user, reason) => call('reject', { id, approval_user: user, reason }),
  getUsers:          ()              => call('get_users'),
  getFiles:          (submissionId)  => call('get_files', { submission_id: submissionId }),
  registerUser:      (n, e, p, r='viewer') => call('register_user', { name: n, email: e, password: p, role: r }),
  updateUserRole:    (id, role)      => call('update_user_role', { userId: id, newRole: role }),
  updateUserStatus:  (id, status)    => call('update_user_status', { userId: id, status }),
  generateSlides:    (payload)       => call('generate_slides', payload),
  resubmitChecking:  (submissionId)  => call('resubmit_checking', { submission_id: submissionId }),
  getSecurityAlerts: ()              => call('get_security_alerts'),
  getOnlineUsers:    ()              => call('get_online_users'),
  getNotifications:  ()              => call('get_notifications'),

  // ── 2ª fase: divisão de demanda (Camilo / Marlene) ──
  // Atribui responsável a um PI (tabela pi_responsaveis: n_pi + responsavel + mes_referencia)
  assignResponsible: (nPi, responsavel, mes) => call('assign_responsible', { n_pi: nPi, responsavel, mes_referencia: mes }),
  getResponsaveis:   (mes)           => call('get_responsaveis', { mes_referencia: mes }),

  // ── Histórico / comentários por PI (Phillipe / Anne) ──
  addComment:        (submissionId, texto, autor) => call('add_comment', { submission_id: submissionId, comentario: texto, autor }),
  getHistory:        (submissionId)  => call('get_history', { submission_id: submissionId }),

  // ── Comentários do cliente Uninter (somente leitura no admin) ──
  getClientComments:       (submissionId) => call('get_client_comments', { submission_id: submissionId }),
  markClientCommentsRead:  (submissionId) => call('mark_client_comment_read', { submission_id: submissionId }),

  // ── Classificação de fornecedor, interno (mídia) ──
  setSupplierRating: (veiculo, rating) => call('set_supplier_rating', { veiculo, rating }),
  getSuppliers:      ()              => call('get_suppliers'),

  // ── Reverter status (bug Marlene): admin muda status mesmo de aprovado ──
  updateCheckingStatus: (id, status, user) => call('update_checking_status', { id, status, approval_user: user }),

  // ── Config de SLA de risco (perfil limite, Phillipe) ──
  saveSlaConfig:     (cfg)           => call('save_sla_config', cfg),
  getSlaConfig:      ()              => call('get_sla_config'),

  // ── Export relatório em PDF (além de CSV/slides) ──
  exportPdf:         (payload)       => call('export_pdf', payload),

  // ── Copiloto IA (Gemini 2.0 Flash via n8n) ──
  copilotAnalyze:    (submissionId)  => call('copilot_analyze', { submission_id: submissionId }),

  // ── Board de produção (admin) ──
  getProductionBoard: ()             => call('get_production_board'),

  // ── Upload de suplemento ao PI (FormData binário) ──
  uploadSupplement: async (submissionId, formDataOrFiles) => {
    // Se recebeu FormData direto (com binários), envia via fetch
    if (formDataOrFiles instanceof FormData) {
      const fd = formDataOrFiles;
      fd.set('submission_id', submissionId);
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(BASE_URL, { method: 'POST', headers, body: fd });
      if (!res.ok) throw new Error('Upload falhou: ' + res.status);
      return res.json();
    }
    // Fallback JSON (sem binários)
    return call('upload_supplement', { submission_id: submissionId, files: formDataOrFiles });
  },

  // ── Distribuição de demandas ──
  distributeDemands: (payload)       => call('distribute_demands', payload),

  // -- Automacoes --
  getAutomations:    ()              => call('get_automations'),
  toggleAutomation:  (id, enabled)   => call('toggle_automation', { automation_id: id, enabled }),

  // -- Proxy de arquivos do Drive (resolve 401 em iframes/img) --
  // O n8n webhook so aceita POST, entao nao da pra usar URL direta no src.
  // fetchFileBlob faz POST, recebe o binario e retorna um blob: URL local.
  // Cache em memoria para nao re-baixar o mesmo arquivo.
  _blobCache: {},
  fetchFileBlob: async (fileId) => {
    if (!fileId) return null;
    if (PainelAPI._blobCache[fileId]) return PainelAPI._blobCache[fileId];
    try {
      const token = getToken();
      const resp = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'proxy_file', file_id: fileId }),
      });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      PainelAPI._blobCache[fileId] = url;
      return url;
    } catch (e) {
      console.warn('[PainelAPI] fetchFileBlob failed for', fileId, e);
      return null;
    }
  },
  // fileProxyUrl retorna null (proxy e async via fetchFileBlob)
  fileProxyUrl: () => null,
};

export default PainelAPI;
