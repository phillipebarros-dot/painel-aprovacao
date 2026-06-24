/* intelligence.js — Camada de inteligência: co-piloto de decisão + central de alertas.
   Heurística determinística (sem chamada externa). -> window.AI */
(function () {
  const norm = (s) => { const v = (s || '').toLowerCase().trim(); return (!v || v === 'null') ? 'pending' : v; };

  const DEFAULT_PROFILE = { slaWarnH: 4, slaBreachH: 12, reincidencia: 1, filaFornecedor: 4, volumeSpike: true };

  function loadProfile() {
    try { return { ...DEFAULT_PROFILE, ...(JSON.parse(localStorage.getItem("painel_alert_profile") || "{}")) }; }
    catch { return { ...DEFAULT_PROFILE }; }
  }
  function saveProfile(p) { localStorage.setItem("painel_alert_profile", JSON.stringify(p)); }

  // ── Co-piloto: pontua um checking de 4 a 97 (confiança para aprovar) + motivos ──
  // Mínimo de arquivos esperados por meio (baseado nas 28 regras reais do workflow)
  const MIN_FILES = {
    "TV Aberta": 2,      // mapa + espelho/print
    "TV Fechada": 2,
    "Rádio": 2,          // mapa + roteiro
    "Impresso": 1,        // comprovante de veiculação
    "Revista": 1,
    "Mídia Exterior": 3,  // foto + mapa + comprovante
    "Digital": 2,          // print + relatório
    "Cinema": 1,
    "Painel": 2,
  };
  const CHECKS = {
    "TV Aberta": "Conferir mapa de horários e espelho de veiculação",
    "TV Fechada": "Conferir mapa de horários e print/espelho",
    "Rádio": "Conferir mapa de inserções e roteiro",
    "Impresso": "Conferir comprovante de página e edição",
    "Revista": "Conferir comprovante de página e edição",
    "Mídia Exterior": "Conferir foto do painel no local + mapa",
    "Digital": "Conferir print da peça + relatório de entrega",
    "Cinema": "Conferir certificado de exibição",
    "Painel": "Conferir foto + mapa de localização",
  };

  function copilotScore(c) {
    let conf = 80;
    const reasons = [];
    // SLA: usa H.slaAgeH que conta a partir de dt_fim_veic (regra Marlene)
    const ageH = window.H ? window.H.slaAgeH(c) : (Date.now() - c.submittedAt) / 3600000;
    const meio = c.meio || "";
    const minFiles = MIN_FILES[meio] || 3;

    // Regra 1: Reincidência (forte penalização)
    if (c.rejection_count > 0) { conf -= 22 * c.rejection_count; reasons.push({ neg: true, text: `Reincidência: ${c.rejection_count}ª devolução anterior` }); }

    // Regra 2: Arquivos vs mínimo do meio
    if (c.total_arquivos < minFiles) {
      conf -= 12;
      reasons.push({ neg: true, text: `Esperado pelo menos ${minFiles} arquivo(s) para ${meio || "este meio"}, enviou ${c.total_arquivos}` });
    } else {
      reasons.push({ neg: false, text: `${c.total_arquivos} arquivo(s), compatível com ${meio || "o meio"}` });
      if (c.total_arquivos >= minFiles + 3) conf += 5;
    }

    // Regra 3: SLA
    if (norm(c.status) === 'pending' && ageH > 8) { conf -= 9; reasons.push({ neg: true, text: `Em fila há ${window.H.fmtDur(ageH)}, SLA estourado` }); }

    // Regra 4: Complemento
    if (c.is_complement === 1) { conf -= 8; reasons.push({ neg: true, text: `Complemento: conferir contra a versão anterior` }); }

    // Regra 5: Observações descritivas (bom sinal)
    if (c.observacoes && c.observacoes.length > 10) { conf += 6; reasons.push({ neg: false, text: `Fornecedor incluiu observação descritiva` }); }

    // Regra 6: Checagem específica do meio
    if (CHECKS[meio]) { reasons.push({ neg: false, text: CHECKS[meio] }); }

    conf = Math.max(4, Math.min(97, Math.round(conf)));
    const level = conf >= 70 ? 'high' : conf >= 45 ? 'mid' : 'low';
    const rec = level === 'high' ? 'Provável aprovação' : level === 'mid' ? 'Requer atenção' : 'Risco de reprovação';
    return { conf, level, reasons, rec };
  }

  // ── Classificação automática (estilo AI ticket tagging) ──
  function classify(c) {
    if (c.rejection_count > 0) return { tag: 'Reincidência', color: 'var(--alert)' };
    if (c.total_arquivos < 5) return { tag: 'Comprovação incompleta', color: 'var(--warn)' };
    if (c.is_complement === 1) return { tag: 'Complemento', color: 'var(--info)' };
    // SLA: usa H.slaAgeH que conta a partir de dt_fim_veic (regra Marlene)
    const ageH = window.H ? window.H.slaAgeH(c) : (Date.now() - c.submittedAt) / 3600000;
    if (norm(c.status) === 'pending' && ageH > 12) return { tag: 'SLA crítico', color: 'var(--alert)' };
    if (c.total_arquivos >= 10 && (c.observacoes || '').length > 10) return { tag: 'Pronto para aprovar', color: 'var(--accent)' };
    return { tag: 'Conferência padrão', color: 'var(--ink-3)' };
  }

  // ── Triagem automática por IA (inspirado no TicketZero): separa por confiança ──
  function autoTriage(checkings, opts) {
    const threshold = (opts && opts.threshold) || 80;
    const pending = checkings.filter(c => norm(c.status) === 'pending');
    const auto = [], review = [], escalate = [];
    pending.forEach(c => {
      const s = copilotScore(c);
      const rec = { ...c, _conf: s.conf, _tag: classify(c).tag };
      if (s.conf >= threshold && (c.rejection_count || 0) === 0 && c.total_arquivos >= 5) auto.push(rec);
      else if (s.level === 'low' || (c.rejection_count || 0) > 0) escalate.push(rec);
      else review.push(rec);
    });
    auto.sort((a, b) => b._conf - a._conf);
    escalate.sort((a, b) => a._conf - b._conf);
    const pct = pending.length ? Math.round((auto.length / pending.length) * 100) : 0;
    return { auto, review, escalate, pending: pending.length, pct, threshold };
  }

  // ── Central de alertas ──
  function computeAlerts(checkings, profile) {
    const p = profile || loadProfile();
    const now = Date.now();
    const pending = checkings.filter(c => norm(c.status) === 'pending');
    const alerts = [];

    pending.forEach(c => {
      // SLA: usa H.slaAgeH que conta a partir de dt_fim_veic (regra que a Marlene pediu)
      const ageH = window.H ? window.H.slaAgeH(c) : (now - c.submittedAt) / 3600000;
      const D = window.H.fmtDur;
      if (ageH >= p.slaBreachH) alerts.push({ id: "sla_" + c.submission_id, sev: 'critical', type: 'SLA estourado', c, detail: `${D(ageH)} em fila · limite ${p.slaBreachH}h`, metric: ageH, wait: ageH });
      else if (ageH >= p.slaWarnH) alerts.push({ id: "slaw_" + c.submission_id, sev: 'warning', type: 'SLA em risco', c, detail: `${D(ageH)} em fila · alerta a ${p.slaWarnH}h`, metric: ageH, wait: ageH });
    });
    pending.forEach(c => { if (c.rejection_count >= p.reincidencia) alerts.push({ id: "rei_" + c.submission_id, sev: 'warning', type: 'Reincidência', c, detail: `${c.rejection_count + 1}ª versão deste checking`, metric: c.rejection_count + 5 }); });

    const byClient = {};
    pending.forEach(c => { (byClient[c.cliente] = byClient[c.cliente] || []).push(c); });
    Object.entries(byClient).forEach(([cli, arr]) => { if (arr.length >= p.filaFornecedor) alerts.push({ id: "fila_" + cli, sev: 'info', type: 'Fila acumulada', cliente: cli, group: arr, detail: `${arr.length} checkings pendentes de ${cli}`, metric: arr.length }); });

    if (p.volumeSpike) {
      const todayMs = new Date().setHours(0, 0, 0, 0);
      const today = checkings.filter(c => c.submittedAt >= todayMs).length;
      const avg = checkings.filter(c => c.submittedAt >= todayMs - 14 * 86400000 && c.submittedAt < todayMs).length / 14;
      if (avg > 0 && today >= avg * 1.8 && today >= 4) alerts.push({ id: "spike", sev: 'info', type: 'Pico de volume', detail: `${today} recebidos hoje · média ${(Number(avg) || 0).toFixed(1)}/dia`, metric: today });
    }

    const rank = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => rank[a.sev] - rank[b.sev] || (b.metric || 0) - (a.metric || 0));
    return alerts;
  }

  function alertCounts(alerts) {
    return { total: alerts.length, critical: alerts.filter(a => a.sev === 'critical').length, warning: alerts.filter(a => a.sev === 'warning').length, info: alerts.filter(a => a.sev === 'info').length };
  }

  window.AI = { DEFAULT_PROFILE, loadProfile, saveProfile, copilotScore, classify, autoTriage, computeAlerts, alertCounts };
})();
