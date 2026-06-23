/* helpers.js — formatters + data computations (plain JS -> window.H) */
(function () {
  const fmtRelTime = (ts) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d`;
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  };
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (ts) => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const fmtDateLong = (ts) => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const fmtNum = (n) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
  const fmtPct = (n) => { const v = Math.round(n * 1000) / 10; return n === 1 ? "100%" : v >= 100 ? "99.9%" : `${v}%`; };
  const fmtHours = (h) => h < 1 ? `${Math.round(h * 60)}min` : `${h.toFixed(1)}h`;
  const fmtDur = (h) => { if (h < 1) return `${Math.round(h * 60)}min`; if (h < 36) return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`; return `${Math.round(h / 24)} dias`; };
  const norm = (s) => { const v = (s || '').toLowerCase().trim(); return (!v || v === 'null') ? 'pending' : v; };
  // Bug 1.2 fix: chave de data em horario LOCAL (nao UTC) para evitar troca de dia a noite
  const localDateKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  function computeStats(checkings) {
    const total = checkings.length;
    const pending = checkings.filter(c => norm(c.status) === 'pending').length;
    const approved = checkings.filter(c => norm(c.status) === 'approved').length;
    const rejected = checkings.filter(c => norm(c.status) === 'rejected').length;
    const taxaAprovacao = (approved + rejected) > 0 ? approved / (approved + rejected) : 0;
    const veiculosDistintos = new Set(checkings.map(c => c.veiculo).filter(Boolean)).size;
    const clientesDistintos = new Set(checkings.map(c => c.cliente).filter(Boolean)).size;
    const isC = (c) => c.is_complement === 1 || c.is_complement === true;
    const novos = checkings.filter(c => norm(c.status) === 'pending' && !isC(c)).length;
    const complementos = checkings.filter(c => norm(c.status) === 'pending' && isC(c)).length;
    const resolved = checkings.filter(c => c.approvedAt || c.rejectedAt);
    let avgSlaHours = 0;
    if (resolved.length) avgSlaHours = resolved.reduce((s, c) => s + ((c.approvedAt || c.rejectedAt) - c.submittedAt) / 3600000, 0) / resolved.length;
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const recebidosHoje = checkings.filter(c => c.submittedAt >= todayMs).length;
    const slaMet = resolved.filter(c => ((c.approvedAt || c.rejectedAt) - c.submittedAt) / 3600000 <= 4).length;
    const slaCompliance = resolved.length ? slaMet / resolved.length : 0;
    return { total, pending, approved, rejected, taxaAprovacao, veiculosDistintos, clientesDistintos, novos, complementos, avgSlaHours, recebidosHoje, slaCompliance, resolved: resolved.length };
  }

  function buildVolumeSeries(checkings, days = 90) {
    const now = Date.now();
    const start = new Date(now - (days - 1) * 86400000).setHours(0, 0, 0, 0);
    const map = {};
    for (let d = 0; d < days; d++) {
      const ts = start + d * 86400000;
      // Bug 1.2 fix: usar chave local em vez de toISOString (UTC)
      map[localDateKey(ts)] = { ts, approved: 0, rejected: 0, pending: 0, total: 0 };
    }
    checkings.forEach(c => {
      const key = localDateKey(c.submittedAt);
      if (map[key]) {
        const s = norm(c.status);
        if (s === 'approved') map[key].approved++;
        else if (s === 'rejected') map[key].rejected++;
        else map[key].pending++;
        map[key].total++;
      }
    });
    return Object.values(map);
  }

  // Série de um mês cheio (1 ao último dia). monthKey = "YYYY-MM"
  function buildMonthSeries(checkings, monthKey) {
    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const map = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const ts = new Date(y, m - 1, d).setHours(0, 0, 0, 0);
      // Bug 1.2 fix: usar chave local em vez de toISOString (UTC)
      map[localDateKey(ts)] = { ts, approved: 0, rejected: 0, pending: 0, total: 0 };
    }
    checkings.forEach(c => {
      const key = localDateKey(c.submittedAt);
      if (map[key]) {
        const s = norm(c.status);
        if (s === 'approved') map[key].approved++;
        else if (s === 'rejected') map[key].rejected++;
        else map[key].pending++;
        map[key].total++;
      }
    });
    return Object.values(map);
  }

  // Lista os últimos N meses como opções {value:"YYYY-MM", label:"abr/2026"}
  function recentMonths(n = 6) {
    const out = []; const now = new Date();
    const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    for (let i = 0; i < n; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${nomes[d.getMonth()]}/${d.getFullYear()}` });
    }
    return out;
  }

  function topRanking(checkings, field, limit = 6) {
    const m = {};
    checkings.forEach(c => { if (c[field]) m[c[field]] = (m[c[field]] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, v]) => ({ label, v }));
  }

  // Análise de carga (inspirado no Load Analysis da Atera): PIs pendentes por faixa de idade
  function agingBuckets(checkings) {
    const now = Date.now(), H1 = 3600000, D1 = 86400000;
    const b = [
      { key: "dia", label: "Em dia", hint: "< 4h em fila", color: "var(--accent)", v: 0, items: [] },
      { key: "risco", label: "Em risco", hint: "4h a 12h", color: "var(--warn)", v: 0, items: [] },
      { key: "critico", label: "Crítico", hint: "12h a 30 dias", color: "var(--alert)", v: 0, items: [] },
      { key: "parado", label: "Parado", hint: "mais de 30 dias", color: "#7c2d12", v: 0, items: [] },
    ];
    checkings.forEach(c => {
      if (norm(c.status) !== "pending") return;
      const age = (now - c.submittedAt);
      let i = 0;
      if (age >= 30 * D1) i = 3; else if (age >= 12 * H1) i = 2; else if (age >= 4 * H1) i = 1; else i = 0;
      b[i].v++; b[i].items.push(c);
    });
    const total = b.reduce((s, x) => s + x.v, 0);
    return { buckets: b, total };
  }

  // Distribuição por categoria (donut multi-segmento, inspirado em Tickets by Source)
  function distribution(checkings, field, limit = 5) {
    const m = {};
    checkings.forEach(c => { const k = c[field] || "Outros"; m[k] = (m[k] || 0) + 1; });
    const palette = ["var(--accent)", "#2A6FDB", "#7E22CE", "#B45309", "#0E7490", "#9F1239"];
    const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, limit);
    const restV = sorted.slice(limit).reduce((s, [, v]) => s + v, 0);
    const rows = top.map(([label, v], i) => ({ label, v, color: palette[i % palette.length] }));
    if (restV) rows.push({ label: "Outros", v: restV, color: "var(--ink-4)" });
    const total = rows.reduce((s, r) => s + r.v, 0);
    return { rows, total };
  }

  function extractList(checkings, field) {
    return [...new Set(checkings.map(c => c[field]).filter(Boolean))].sort();
  }

  // Ranking de fornecedores — estrelas só aparecem se alguém avaliou manualmente
  function supplierRating(checkings, limit = 20) {
    const m = {};
    // Bug 2.1 fix: pre-cachear ratings do localStorage UMA vez (nao por checking)
    const ratingCache = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("painel_rating_")) ratingCache[k] = Number(localStorage.getItem(k) || 0);
      }
    } catch (e) {}
    checkings.forEach(c => {
      const k = c.veiculo; if (!k) return;
      const s = m[k] || (m[k] = { label: k, total: 0, approved: 0, rejected: 0, rej: 0, manual: 0, manualN: 0 });
      s.total++;
      const st = norm(c.status);
      if (st === "approved") s.approved++;
      if (st === "rejected") s.rejected++;
      s.rej += (c.rejection_count || 0);
      const rkey = "painel_rating_" + (c.email_contato || c.nome_contato || "x");
      const r = ratingCache[rkey] || 0;
      if (r) { s.manual += r; s.manualN++; }
    });
    return Object.values(m).map(s => {
      const stars = s.manualN > 0 ? Math.round((s.manual / s.manualN) * 10) / 10 : null;
      return { label: s.label, stars, total: s.total, approved: s.approved, rejected: s.rejected, reinc: s.rej };
    }).sort((a, b) => b.total - a.total).slice(0, limit);
  }

  // SLA heatmap: dia-da-semana (0=Dom..6=Sab) x faixa horária (6 buckets de 4h)
  function slaHeatmap(checkings) {
    const buckets = []; // [dow][hourBucket] = {sum, n}
    for (let d = 0; d < 7; d++) { buckets.push([]); for (let h = 0; h < 6; h++) buckets[d].push({ sum: 0, n: 0 }); }
    checkings.forEach(c => {
      const end = c.approvedAt || c.rejectedAt; if (!end) return;
      const dt = new Date(c.submittedAt);
      const dow = dt.getDay(); const hb = Math.floor(dt.getHours() / 4);
      const sla = (end - c.submittedAt) / 3600000;
      buckets[dow][hb].sum += sla; buckets[dow][hb].n++;
    });
    let max = 0;
    const grid = buckets.map(row => row.map(cell => { const v = cell.n ? cell.sum / cell.n : 0; if (v > max) max = v; return { avg: v, n: cell.n }; }));
    return { grid, max };
  }

  // Calendar data for a given month offset (0 = current). Returns weeks of {day, ts, count, inMonth}
  function calendarData(checkings, monthOffset = 0) {
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + monthOffset); base.setHours(0, 0, 0, 0);
    const year = base.getFullYear(), month = base.getMonth();
    const counts = {};
    checkings.forEach(c => {
      const d = new Date(c.submittedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const k = d.getDate(); counts[k] = (counts[k] || 0) + 1;
      }
    });
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    let max = 0;
    for (let d = 1; d <= daysInMonth; d++) { const cnt = counts[d] || 0; if (cnt > max) max = cnt; cells.push({ day: d, count: cnt, ts: new Date(year, month, d).getTime() }); }
    while (cells.length % 7 !== 0) cells.push(null);
    const label = base.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { cells, max, label, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  function funnelData(checkings) {
    const total = checkings.length;
    const resolved = checkings.filter(c => c.approvedAt || c.rejectedAt).length;
    const approved = checkings.filter(c => norm(c.status) === 'approved').length;
    // Bug 1.3 fix: funil estritamente decrescente, sem etapa duplicada
    return [
      { label: "Recebidos", v: total, color: "var(--info)" },
      { label: "Decididos", v: resolved, color: "var(--warn)" },
      { label: "Aprovados", v: approved, color: "var(--accent)" },
    ];
  }

  // Produtividade por pessoa (divisão de demanda + baixas)
  function teamProductivity(checkings, sinceTs = 0) {
    const m = {};
    const ensure = (name) => (m[name] = m[name] || { name, demanda: 0, baixados: 0, approved: 0, rejected: 0, pendentes: 0, slaSum: 0, slaN: 0 });
    checkings.forEach(c => {
      const who = c.assigned_to || c.approval_user || "Sem atribuição";
      const e = ensure(who);
      e.demanda++;
      const s = norm(c.status);
      const decidedAt = c.approvedAt || c.rejectedAt;
      if (s === 'pending') e.pendentes++;
      else if (decidedAt && decidedAt >= sinceTs) {
        e.baixados++;
        if (s === 'approved') e.approved++; else e.rejected++;
        const sla = (decidedAt - c.submittedAt) / 3600000; e.slaSum += sla; e.slaN++;
      }
    });
    const rows = Object.values(m).map(e => ({ ...e, pct: e.demanda ? e.baixados / e.demanda : 0, avgSla: e.slaN ? e.slaSum / e.slaN : 0 }));
    rows.sort((a, b) => b.baixados - a.baixados);
    const totals = rows.reduce((t, e) => ({ demanda: t.demanda + e.demanda, baixados: t.baixados + e.baixados, pendentes: t.pendentes + e.pendentes, approved: t.approved + e.approved, rejected: t.rejected + e.rejected }), { demanda: 0, baixados: 0, pendentes: 0, approved: 0, rejected: 0 });
    return { rows, totals };
  }

  window.H = { fmtRelTime, fmtTime, fmtDate, fmtDateLong, fmtNum, fmtPct, fmtHours, fmtDur, norm, computeStats, buildVolumeSeries, buildMonthSeries, recentMonths, topRanking, extractList, supplierRating, agingBuckets, distribution, slaHeatmap, calendarData, funnelData, teamProductivity };

  // Exportação PDF genérica (abre janela de impressão com tabela estilizada)
  window.H.exportPDF = function (title, columns, rows, subtitle) {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const head = columns.map(c => `<th>${esc(c)}</th>`).join("");
    const body = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        @page { size: A4 landscape; margin: 16mm; }
        * { font-family: Inter, system-ui, Arial, sans-serif; }
        body { color: #111; margin: 0; padding: 28px; }
        .hd { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
        .brand { font-weight: 700; font-size: 18px; letter-spacing: -0.02em; }
        .brand span { color: #059669; }
        .meta { font-size: 11px; color: #666; text-align: right; }
        h1 { font-size: 15px; margin: 0 0 2px; }
        .sub { font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
        th { text-align: left; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.05em; color: #555; border-bottom: 1px solid #999; padding: 7px 8px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; color: #222; }
        tr:nth-child(even) td { background: #fafafa; }
        .ft { margin-top: 18px; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
      </style></head><body>
      <div class="hd"><div><div class="brand">Grupo OM <span>·</span> Painel de Checking</div><h1 style="margin-top:8px">${esc(title)}</h1>${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ""}</div>
      <div class="meta">Gerado em<br>${new Date().toLocaleString("pt-BR")}</div></div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <div class="ft"><span>painelchecking.grupoom.com.br</span><span>${rows.length} registros</span></div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)}<\/script>
      </body></html>`);
    w.document.close();
  };
})();
