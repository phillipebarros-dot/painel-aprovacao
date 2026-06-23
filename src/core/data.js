/* data.js — Camada de dados REAL (produção). Substitui o mock.
   Mantém a forma window.MOCK para nenhuma tela quebrar, mas SEM dados falsos:
   tudo comeca vazio e e preenchido pelo n8n/BigQuery apos o login.
   window.PainelAPI e injetado por um <script type="module"> no HTML. */
(function () {
  // Constantes de dominio (NAO sao dados falsos — sao categorias fixas do negocio)
  const MEIOS = ["TV Aberta", "Rádio", "Impresso", "Mídia Exterior", "Digital"];

  // Arquitetura real do pipeline (mostrada em Operações). Descreve o fluxo n8n real.
  const N8N_FLOW = [
    { id: "form",    label: "Formulário",   sub: "Fornecedor envia",      icon: "inbox",     status: "ok" },
    { id: "drive",   label: "Google Drive", sub: "Arquivos + histórico",  icon: "folder",    status: "ok" },
    { id: "bq",      label: "BigQuery",     sub: "checking_logs",         icon: "database",  status: "ok" },
    { id: "n8n",     label: "n8n",          sub: "Webhook + rotas",       icon: "workflow",  status: "ok" },
    { id: "painel",  label: "Painel",       sub: "Aprovação + auditoria", icon: "dashboard", status: "ok" },
    { id: "email",   label: "E-mail SMTP",  sub: "Notifica fornecedor",   icon: "mail",      status: "ok" },
  ];
  const SECURITY_LAYERS = [
    { num: 1, label: "JWT HS256", desc: "Sessão assinada, 8h" },
    { num: 2, label: "Fingerprint", desc: "Vínculo de dispositivo" },
    { num: 3, label: "Rate limit", desc: "Brute force no login" },
    { num: 4, label: "scrypt", desc: "Hash de senha OWASP" },
    { num: 5, label: "Inatividade", desc: "Logout em 15 min" },
    { num: 6, label: "Auditoria", desc: "audit_logs no BigQuery" },
    { num: 7, label: "CORS travado", desc: "Origem única" },
    { num: 8, label: "Sessões revogadas", desc: "revoked_sessions" },
    { num: 9, label: "RBAC", desc: "Admin / Analyst / Viewer" },
  ];

  const MOCK = {
    checkings: [],
    filesById: {},
    users: [],
    onlineUsers: [],
    securityEvents: [],
    services: [
      { name: "BigQuery", status: "ok" },
      { name: "n8n", status: "ok" },
      { name: "Google Drive", status: "ok" },
      { name: "SMTP", status: "ok" },
    ],
    n8nFlow: N8N_FLOW,
    securityLayers: SECURITY_LAYERS,
    accounts: [], // sem contas de teste — login real via n8n
    meios: MEIOS,
    getFiles: (id) => MOCK.filesById[id] || [],
  };

  // Normaliza um checking do BigQuery para a forma usada pelas telas.
  function normalizeChecking(c) {
    let status = (c.status || "").toLowerCase().trim();
    if (!status || status === "null" || status === "undefined") status = "pending";
    const parseTs = (v) => { if (!v) return null; const ms = new Date(v).getTime(); return (!isNaN(ms) && ms > 946684800000) ? ms : null; };
    let submittedAt = parseTs(c.created_at) || parseTs(c.submitted_at);
    if (!submittedAt && c.submission_id) { const n = parseInt(String(c.submission_id).split("_")[0], 10); if (!isNaN(n) && n > 1e12) submittedAt = n; }
    if (!submittedAt) submittedAt = Date.now();
    return {
      ...c, status, submittedAt,
      approvedAt: parseTs(c.approved_at),
      rejectedAt: parseTs(c.rejected_at),
      assigned_to: c.responsavel || c.assigned_to || "",
      approval_user: c.approval_user || "",
    };
  }

  // Carrega dados reais do n8n. Chamada depois do login.
  MOCK.loadReal = async function () {
    const API = window.PainelAPI;
    if (!API) throw new Error("PainelAPI não carregada");
    const [checkingsRes, usersRes, onlineRes] = await Promise.allSettled([
      API.getAllCheckings(),
      API.getUsers(),
      API.getOnlineUsers(),
    ]);
    if (checkingsRes.status === "fulfilled" && checkingsRes.value?.checkings) {
      MOCK.checkings = checkingsRes.value.checkings.map(normalizeChecking);
    }
    if (usersRes.status === "fulfilled" && usersRes.value?.users) {
      MOCK.users = usersRes.value.users.map(u => ({
        ...u, nome: u.name || u.email, name: u.name || u.email,
        color: "#0E7490", last_seen: u.lastSeen || u.created_at,
        avatar: (u.name || u.email || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase(),
      }));
    }
    if (onlineRes.status === "fulfilled") {
      MOCK.onlineUsers = onlineRes.value?.online || onlineRes.value?.users || [];
    }
    return MOCK;
  };

  // Carrega arquivos reais (Drive) de um checking sob demanda.
  MOCK.loadFiles = async function (submissionId) {
    const API = window.PainelAPI;
    if (!API) return [];
    try {
      const res = await API.getFiles(submissionId);
      const files = res?.files || [];
      MOCK.filesById[submissionId] = files;
      // Agrupar por endereço (review.jsx espera [{endereco, files: [...]}])
      const byAddr = {};
      for (const f of files) {
        const key = f.endereco || '_sem_endereco';
        if (!byAddr[key]) byAddr[key] = { endereco: f.endereco || '', files: [] };
        byAddr[key].files.push(f);
      }
      return Object.values(byAddr);
    } catch { return []; }
  };
  // Carrega board de produção sob demanda (lazy, com cache TTL 5min)
  let _prodCache = null;
  let _prodTs = 0;
  const PROD_TTL = 5 * 60 * 1000; // 5 minutos
  MOCK.loadProduction = async function (force) {
    if (!force && _prodCache && (Date.now() - _prodTs) < PROD_TTL) return _prodCache;
    const API = window.PainelAPI;
    if (!API || !API.getProductionBoard) return _prodCache || { board: [] };
    try {
      const res = await API.getProductionBoard();
      if (res?.success && res?.board) {
        _prodCache = res;
        _prodTs = Date.now();
        return res;
      }
      return _prodCache || { board: [], error: res?.error };
    } catch (e) {
      // loadProduction falhou — silencioso
      return _prodCache || { board: [] };
    }
  };

  window.MOCK = MOCK;
})();
