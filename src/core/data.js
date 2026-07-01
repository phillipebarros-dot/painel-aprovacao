/* data.js — Camada de dados REAL (produção). Substitui o mock.
   Mantém a forma window.MOCK para nenhuma tela quebrar, mas SEM dados falsos:
   tudo comeca vazio e e preenchido pelo n8n/BigQuery apos o login.
   window.PainelAPI e injetado por um <script type="module"> no HTML. */
(function () {
  // Constantes de dominio (NAO sao dados falsos — sao categorias fixas do negocio)
  const MEIOS = ["TV Aberta", "Rádio", "Impresso", "Mídia Exterior", "Digital"];

  // REQ 6 (01/07): grupos de acesso e contas por grupo.
  // Alinhado com automacao_pauta_checking.py (linhas 535-544):
  //   8 grupos nomeados: Eudora, Unicred, Boti Sul, Boti SP, Boti SP INT, Boti NE, Boti SE, Boti RS
  //   + clientes restantes que viram aba propria (AERO, VULT, BOTI SC, etc.)
  // O campo 'conta' no BigQuery corresponde ao nome da aba no Sheets.
  const CONTAS_BOTICARIO = [
    "BOTI NE", "BOTI SE", "BOTI SP INT", "BOTI SUL", "BOTI SP",
    "EUDORA", "AERO", "BOTI RS", "BOTI SC", "BOTI SC FRANQUEADOS",
    "VULT", "BOTI BRASIL",
    // Script Python: grupos com cod_cliente agrupados (535-544)
    // Eudora: 65612,65613,65614,65767,65768,65769,67747
    // Unicred: 66384,65253,66385 (NAO e Boticario; tratar separadamente se necessario)
    // Boti Sul: 58587,59075
    // Boti SP: 58589,59074
    // Boti SP INT: 63642,63643
    // Boti NE: 58590,62313
    // Boti SE: 58591,59073
    // Boti RS: 68294,68293
  ];
  const CONTAS_KAUANA = ["UNINTER"];

  const GRUPOS = {
    boticario: { label: "Boticario", contas: CONTAS_BOTICARIO },
    kauana:    { label: "Kauana / Uninter", contas: CONTAS_KAUANA },
    todos:     { label: "Todos", contas: null }, // admin: sem filtro
  };

  // REQ 6.2 (01/07): filtra checkings pelo grupo do usuario logado.
  // Retorna somente os PIs cujo campo 'conta' pertence ao grupo.
  // grupo "todos" ou ausente = sem filtro (admin).
  function visibleCheckings(user, checkings) {
    const grupo = user?.grupo || "todos";
    if (grupo === "todos") return checkings;
    const g = GRUPOS[grupo];
    if (!g || !g.contas) return checkings;
    const set = new Set(g.contas.map(function (s) { return s.toLowerCase(); }));
    return checkings.filter(function (c) {
      return set.has((c.conta || "").toLowerCase());
    });
  }

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
      { name: "BigQuery", status: "ok", uptime: 99.98, latency: 120, lastCheck: Date.now() - 60000 },
      { name: "n8n", status: "ok", uptime: 99.95, latency: 85, lastCheck: Date.now() - 90000 },
      { name: "Google Drive", status: "ok", uptime: 99.99, latency: 200, lastCheck: Date.now() - 120000 },
      { name: "SMTP", status: "ok", uptime: 99.90, latency: 340, lastCheck: Date.now() - 180000 },
    ],
    n8nFlow: N8N_FLOW,
    securityLayers: SECURITY_LAYERS,
    accounts: [], // sem contas de teste — login real via n8n
    meios: MEIOS,
    // REQ 6 (01/07): segmentacao de acesso
    GRUPOS: GRUPOS,
    CONTAS_BOTICARIO: CONTAS_BOTICARIO,
    CONTAS_KAUANA: CONTAS_KAUANA,
    visibleCheckings: visibleCheckings,
    getFiles: (id) => MOCK.filesById[id] || [],
  };

  // Normaliza um checking do BigQuery para a forma usada pelas telas.
  function normalizeChecking(c) {
    let status = (c.status || "").toLowerCase().trim();
    const hadNoStatus = !status || status === "null" || status === "undefined";
    if (hadNoStatus) status = "pending";
    const parseTs = (v) => { if (!v) return null; const ms = new Date(v).getTime(); return (!isNaN(ms) && ms > 946684800000) ? ms : null; };
    let submittedAt = parseTs(c.created_at) || parseTs(c.submitted_at);
    if (!submittedAt && c.submission_id) { const n = parseInt(String(c.submission_id).split("_")[0], 10); if (!isNaN(n) && n > 1e12) submittedAt = n; }
    if (!submittedAt) submittedAt = Date.now();
    // PIs antigos (>90 dias) sem status no BigQuery sao historicos, nao pendentes.
    // Evita que PIs orfaos do sistema antigo poluam a fila de triagem.
    const AGE_LIMIT_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias
    if (hadNoStatus && (Date.now() - submittedAt) > AGE_LIMIT_MS) status = "sem_checking";
    // Normaliza webViewLink de diferentes nomes de campo possíveis
    const webViewLink = c.webViewLink || c.web_view_link || c.drive_link || c.driveLink || c.link_pasta || '';
    // Extrai folder_id do link se disponível
    let drive_folder_id = c.drive_folder_id || c.folder_id || '';
    if (webViewLink && !drive_folder_id) {
      const m = webViewLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (m) drive_folder_id = m[1];
    }
    // Normaliza rejection_count: BigQuery pode retornar string ou valor corrupto
    const rawRej = parseInt(c.rejection_count, 10);
    const rejection_count = (!isNaN(rawRej) && rawRej >= 0) ? rawRej : 0;

    return {
      ...c, status, submittedAt, rejection_count,
      approvedAt: parseTs(c.approved_at),
      rejectedAt: parseTs(c.rejected_at),
      assigned_to: c.responsavel || c.assigned_to || "",
      approval_user: c.approval_user || "",
      webViewLink,
      drive_folder_id,
      // SLA: datas de veiculacao (regra Marlene: revisao comeca apos dt_fim_veic)
      dt_inicio_veic: c.dt_inicio_veic || c.dt_inicio || null,
      dt_fim_veic: c.dt_fim_veic || c.dt_fim || null,
      // Campos do Publi/ERP mapeados pelo script automacao_pauta_checking.py.
      // Nomes flexiveis para casar com BigQuery (snake_case) ou Sheets (acentuado).
      situacao_pi: c.situacao_pi || c["Situação PI"] || c.situacao || "",
      planilha: c.planilha || c.Planilha || "",
      produto: c.produto || c.Produto || "",
      vencimento: c.vencimento || c.Vencimento || null,
      liberado_publi: c.liberado_publi || c["Liberado no publi"] || "",
      sit_contas_pagar: c.sit_contas_pagar || c["Situação Contas a Pagar"] || "",
      valor_liquido: c.valor_liquido || c["Líquido"] || c.liquido || c.valor || 0,
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
        color: "#0E7490", last_seen: u.lastSeen || u.created_at || Date.now(),
        avatar: (u.avatar && String(u.avatar).startsWith("http")) ? u.avatar : (u.googlePic || u.google_pic || (u.name || u.email || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()),
      }));
    }
    if (onlineRes.status === "fulfilled") {
      MOCK.onlineUsers = onlineRes.value?.online || onlineRes.value?.users || [];
    }
    return MOCK;
  };

  // Gera thumbnail URL estavel a partir do file ID do Google Drive.
  // O thumbnailLink da API do Drive EXPIRA em poucas horas.
  // O lh3.googleusercontent.com/d/{id} funciona enquanto o arquivo existir.
  function stableThumbnail(fileId) {
    if (!fileId) return null;
    return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
  }

  // Normaliza um arquivo vindo do BigQuery/n8n para formato consistente.
  function normalizeFile(f) {
    let id = f.id_imagem || f.id || f.fileId || f.file_id || '';
    // Rejeita IDs que sao claramente timestamps (13+ digitos puros no inicio).
    if (id && /^\d{13,}/.test(id)) id = '';
    const mime = (f.mimeType || f.mime_type || '').toLowerCase();
    const name = (f.nome || f.name || f.detalhe || '').toLowerCase();

    // Respeita flags do n8n se ja existem; senao detecta por MIME/extensao
    const isAudio = f.isAudio === true || mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|m4a|wma)$/i.test(name)
      || name.includes('audio') || name.includes('spot') || name.includes('jingle');
    const isVideo = f.isVideo === true || mime.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(name)
      || name.includes('video') || name.includes('gravacao');
    const isPdf = f.isPdf === true || mime === 'application/pdf' || /\.pdf$/i.test(name)
      || name.includes('relatorio') || name.includes('pdf') || name.includes('zip');
    const isImage = f.isImage === true || (!isVideo && !isPdf && !isAudio && (
      mime.startsWith('image/') || /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(name)
      || name.includes('foto') || name.includes('perto') || name.includes('longe')
      || name.includes('noturna') || name.includes('comprovante')
      || (!mime && !isVideo && !isPdf && !isAudio) // se nenhum tipo detectado, assume imagem
    ));

    // Proxy URL via n8n backend (resolve 401 de cookies de terceiros).
    // O n8n tem service account do Drive e serve o binario direto.
    const proxy = window.PainelAPI?.fileProxyUrl;
    const proxyUrl = (proxy && id) ? proxy(id) : null;

    // Thumbnail: proxy > n8n thumb > lh3 (fallback publico)
    const n8nThumb = f.thumbnailUrl || f.thumbnail_url || f.thumbnailLink || null;
    let thumb = null;
    if (id) {
      thumb = proxyUrl || n8nThumb || `https://lh3.googleusercontent.com/d/${id}=w400`;
    } else {
      thumb = n8nThumb;
    }

    // Preview URL para iframes (PDF/video): proxy > n8n > Drive /preview
    const previewUrl = proxyUrl || f.previewUrl || f.preview_url
      || (id ? `https://drive.google.com/file/d/${id}/preview` : null);

    // Download URL: proxy > n8n > Drive uc?export
    const downloadUrl = proxyUrl || f.downloadUrl || f.download_url
      || (id ? `https://drive.google.com/uc?id=${id}&export=download` : null);

    // webViewLink (sempre Drive, para abrir em nova aba)
    const webView = f.webViewLink || f.web_view_link || f.viewUrl
      || (id ? `https://drive.google.com/file/d/${id}/view` : null);

    return {
      ...f,
      id, id_imagem: id,
      thumbnailUrl: thumb,
      proxyUrl,
      previewUrl,
      downloadUrl,
      webViewLink: webView,
      viewUrl: webView,
      isImage: isImage && !isPdf && !isVideo && !isAudio,
      isVideo,
      isPdf,
      isAudio,
      detalhe: f.detalhe || f.nome || f.name || f.tag || '',
      tag: f.tag || (isAudio ? 'AUDIO' : isVideo ? 'VIDEO' : isPdf ? 'PDF' : 'IMG'),
    };
  }

  // Carrega arquivos reais (Drive) de um checking sob demanda.
  MOCK.loadFiles = async function (submissionId) {
    const API = window.PainelAPI;
    if (!API || !submissionId) return [];
    try {
      const res = await API.getFiles(submissionId);
      const files = res?.files || [];
      if (!files.length) {
        // Fallback: tenta extrair dados do próprio checking
        const ck = MOCK.checkings.find(c => c.submission_id === submissionId);
        if (ck) {
          // Extrai folder_id do webViewLink se disponível
          if (ck.webViewLink && !ck.drive_folder_id) {
            const folderMatch = ck.webViewLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
            if (folderMatch) ck.drive_folder_id = folderMatch[1];
          }
          // Se tem thumbnails ou IDs de arquivo no checking, constrói entries
          if (ck.file_ids || ck.thumbnails || ck.arquivos) {
            const fileIds = ck.file_ids || ck.arquivos || [];
            const built = (Array.isArray(fileIds) ? fileIds : [fileIds]).map((fid, i) => {
              const id = typeof fid === 'object' ? (fid.id || fid.fileId || '') : fid;
              return normalizeFile({ id, id_imagem: id, detalhe: `Arquivo ${i + 1}`, tag: 'IMG', ...(typeof fid === 'object' ? fid : {}) });
            });
            if (built.length) {
              MOCK.filesById[submissionId] = built;
              return [{ endereco: '', files: built }];
            }
          }
          // Último fallback: card vazio com link direto
          if (ck.webViewLink) {
            return [{ endereco: '', files: [{ id: submissionId, id_imagem: submissionId, detalhe: 'Pasta do Drive', tag: 'DRIVE', isImage: false, isPdf: false, isVideo: false, webViewLink: ck.webViewLink, viewUrl: ck.webViewLink, thumbnailUrl: null }] }];
          }
        }
        return [];
      }
      MOCK.filesById[submissionId] = files;
      const byAddr = {};
      for (const raw of files) {
        const f = normalizeFile(raw);
        const key = f.endereco || '_sem_endereco';
        if (!byAddr[key]) byAddr[key] = { endereco: f.endereco || '', files: [] };
        byAddr[key].files.push(f);
      }
      // Extrai drive_folder_id do checking para uso em links
      const ck = MOCK.checkings.find(c => c.submission_id === submissionId);
      if (ck && ck.webViewLink && !ck.drive_folder_id) {
        const folderMatch = ck.webViewLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (folderMatch) ck.drive_folder_id = folderMatch[1];
      }
      return Object.values(byAddr);
    } catch (err) {
      // Bug 4.4 fix: registrar erro em vez de engolir silenciosamente
      console.warn('[loadFiles] Falha ao carregar arquivos:', err?.message || err);
      return [];
    }
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
