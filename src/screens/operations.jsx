// screen-operations.jsx -> window.ScreenOperations
function FlowNode({ node, idx, hover, onHover }) {
  const palette = {
    entry: { bg: "rgba(37,99,235,0.08)", fg: "var(--info)", border: "rgba(37,99,235,0.25)" },
    security: { bg: "rgba(124,58,237,0.08)", fg: "#7C3AED", border: "rgba(124,58,237,0.25)" },
    logic: { bg: "var(--glass-2)", fg: "var(--ink)", border: "var(--rule-strong)" },
    /* FIX A1.2: esmeralda -> accent token */
    data: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", border: "color-mix(in srgb, var(--accent) 25%, transparent)" },
    notify: { bg: "var(--warn-soft)", fg: "var(--warn-ink)", border: "rgba(217,119,6,0.25)" },
  };
  const kind = node.kind || (idx === 0 ? "entry" : idx >= 4 ? "notify" : "logic");
  const c = palette[kind] || palette.logic;
  const isH = hover === node.id;
  const desc = node.desc || node.sub || "";
  return (
    <div onMouseEnter={() => onHover(node.id)} onMouseLeave={() => onHover(null)} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 11, padding: "13px 15px", transition: "all 220ms var(--ease)", transform: isH ? "translateY(-3px)" : "none", boxShadow: isH ? "var(--shadow-md)" : "none" }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: c.fg, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{String(idx + 1).padStart(2, "0")} · {kind}</span></div>
      <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, marginBottom: 4 }}>{node.label}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

function ScreenOperations({ onToast, checkings, slaCfg, onSaveSla }) {
  const H = window.H;
  const [tab, setTab] = React.useState("flow");
  const [hover, setHover] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [slaDraft, setSlaDraft] = React.useState(slaCfg || { meta: 4, atencao: 5, risco: 12 });
  React.useEffect(() => { if (slaCfg) setSlaDraft(slaCfg); }, [slaCfg]);
  const events = window.MOCK.securityEvents;
  const services = window.MOCK.services;
  const refresh = () => { setLoading(true); setTimeout(() => { setLoading(false); onToast?.({ type: "success", message: "Status atualizado." }); }, 900); };

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div className="col" style={{ gap: 6 }}><div className="eyebrow">Operações · admin only</div><h1 className="display-1">Arquitetura e segurança</h1></div>
        <div className="row gap-3">
          <Segmented value={tab} onChange={setTab} options={[{ value: "flow", label: "Fluxo n8n" }, { value: "security", label: "Segurança" }, { value: "services", label: "Serviços" }, { value: "sla", label: "SLA" }, { value: "latency", label: "Latência" }]}/>
          <Button variant="ghost" icon="refresh" loading={loading} onClick={refresh}>Atualizar</Button>
        </div>
      </div>

      {tab === "flow" && (<>
        <div className="card card-glass card-pad" style={{ marginBottom: 22, padding: "18px 22px" }}>
          <div className="row gap-4">
            {/* FIX A1.2: esmeralda -> accent token */}
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", display: "grid", placeItems: "center" }}><Icon name="lock" size={18} style={{ color: "var(--accent)" }}/></div>
            <div className="col" style={{ gap: 2, flex: 1 }}><div className="h2">Frontend nunca fala diretamente com BigQuery, Drive ou SMTP</div><div style={{ fontSize: 13, color: "var(--ink-2)" }}>Toda requisição passa pelo n8n. CORS restrito + JWT obrigatório.</div></div>
            <Pill status="approved">9 camadas de segurança</Pill>
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 22 }}><div className="col" style={{ gap: 2 }}><div className="eyebrow">Fluxo de dados</div><div className="h2">Frontend → n8n → Backend</div></div></div>
          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {window.MOCK.n8nFlow.map((node, i) => <FlowNode key={node.id} node={node} idx={i} hover={hover} onHover={setHover}/>)}
          </div>
        </div>
      </>)}

      {tab === "security" && (<>
        <div className="grid-cols-3 stagger" style={{ marginBottom: 22 }}>
          <div className="kpi"><div className="kpi-label">Camadas ativas</div><div className="kpi-value"><CountUp value={9}/><span className="unit">/ 9</span></div><div className="kpi-meta"><strong style={{ color: "var(--accent-ink)" }}>operacionais</strong></div></div>
          <div className="kpi"><div className="kpi-label">Eventos críticos · 24h</div><div className="kpi-value" style={{ color: events.filter(e => e.severity === "critical").length ? "var(--alert)" : "var(--ink)" }}><CountUp value={events.filter(e => e.severity === "critical").length}/></div></div>
          <div className="kpi"><div className="kpi-label">Eventos · 24h</div><div className="kpi-value"><CountUp value={events.length}/></div><div className="kpi-meta">monitorados</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Camadas</div><div className="h2">9 controles ativos</div></div></div>
          <div className="stagger" style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {window.MOCK.securityLayers.map(l => (
              <div key={l.num} style={{ padding: "14px 16px", background: "var(--bg)", border: "1px solid var(--rule)", borderRadius: 11, display: "flex", gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", flexShrink: 0 }}>{l.num}</div>
                <div className="col" style={{ gap: 2 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{l.label}</div><div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{l.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Eventos 24h</div><div className="h2">Últimas detecções</div></div></div>
          <table className="tbl"><thead><tr><th>Severidade</th><th>Evento</th><th>Usuário</th><th>IP</th><th>Detalhe</th><th style={{ textAlign: "right" }}>Quando</th></tr></thead>
            <tbody>{events.map((ev, i) => (
              <tr key={i} className="row-anim" style={{ animationDelay: (i * 30) + "ms" }}>
                <td><Pill status={ev.severity === "critical" ? "rejected" : ev.severity === "warning" ? "pending" : "info"}>{ev.severity === "critical" ? "Crítico" : ev.severity === "warning" ? "Aviso" : "Info"}</Pill></td>
                <td className="cell-pi">{ev.type}</td><td className="cell-secondary">{ev.user}</td><td className="cell-mono cell-secondary">{ev.ip}</td><td style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{ev.detail}</td><td className="cell-time" style={{ textAlign: "right" }}>{H.fmtRelTime(ev.ts)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>)}

      {tab === "services" && (
        <div className="grid-cols-3 stagger">
          {services.map(s => (
            <div key={s.name} className="card card-pad card-hover" style={{ padding: "20px 22px" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div className="row gap-3"><div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}><Icon name="check" size={14} strokeWidth={2}/></div><div className="col" style={{ gap: 2 }}><div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.name}</div><div className="cell-time">verificado {H.fmtRelTime(s.lastCheck)}</div></div></div>
                <Pill status="approved">Online</Pill>
              </div>
              <div className="row gap-6">
                <div><div className="eyebrow" style={{ marginBottom: 4 }}>Latência</div><div className="cell-mono" style={{ fontSize: 15, fontWeight: 500, color: (s.latency || 0) > 1000 ? "var(--warn)" : "var(--ink)" }}>{s.latency || 0}<span style={{ color: "var(--ink-3)", marginLeft: 2 }}>ms</span></div></div>
                <div><div className="eyebrow" style={{ marginBottom: 4 }}>Uptime 30d</div><div className="cell-mono" style={{ fontSize: 15, fontWeight: 500 }}>{(Number(s.uptime) || 0).toFixed(2)}<span style={{ color: "var(--ink-3)", marginLeft: 2 }}>%</span></div></div>
              </div>
              <div style={{ marginTop: 14, height: 4, borderRadius: 99, background: "var(--surface-3)" }}><div className="rank-fill" style={{ width: s.uptime + "%", height: "100%", borderRadius: 99, background: "var(--accent)" }}/></div>
            </div>
          ))}
        </div>
      )}
      {tab === "sla" && (
        <div className="card" style={{ padding: 24, maxWidth: 620 }}>
          <div className="col" style={{ gap: 2, marginBottom: 6 }}><div className="eyebrow">Configuração</div><div className="h2">Limites de SLA</div></div>
          <p className="body-sm" style={{ marginTop: 0, color: "var(--ink-2)" }}>Fonte única. A <strong>meta</strong> alimenta o "% dentro do prazo" do Dashboard; <strong>atenção</strong> e <strong>risco</strong> definem quando um checking pendente vira aviso ou alerta crítico na tela de Alertas.</p>
          <div className="col" style={{ gap: 16, marginTop: 12 }}>
            {[
              ["meta", "Meta de decisão", "Tempo alvo entre receber e decidir. Base do compliance do Dashboard.", 1, 48],
              ["atencao", "Atenção (aviso)", "Checking pendente acima disso vira aviso nos Alertas.", 1, 48],
              ["risco", "Risco (crítico)", "Pendente acima disso vira alerta crítico.", 1, 72],
            ].map(([k, label, hint, min, max]) => (
              <div key={k} className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div className="col" style={{ gap: 2, flex: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
                  <span className="body-xs muted">{hint}</span>
                </div>
                <div className="row gap-2" style={{ alignItems: "center", flexShrink: 0 }}>
                  <input className="input" type="number" min={min} max={max} value={slaDraft[k]} onChange={e => setSlaDraft({ ...slaDraft, [k]: Math.max(min, Math.min(max, Number(e.target.value) || min)) })} style={{ width: 78, textAlign: "center" }}/>
                  <span className="body-xs muted">horas</span>
                </div>
              </div>
            ))}
          </div>
          {slaDraft.atencao >= slaDraft.risco && <p className="body-xs" style={{ color: "var(--warn)", marginTop: 12 }}>O limite de atenção deve ser menor que o de risco.</p>}
          <div className="row gap-2" style={{ justifyContent: "flex-end", marginTop: 20 }}>
            <Button variant="ghost" onClick={() => setSlaDraft(slaCfg || { meta: 4, atencao: 5, risco: 12 })}>Cancelar</Button>
            <Button variant="primary" icon="check" disabled={slaDraft.atencao >= slaDraft.risco} onClick={() => onSaveSla?.(slaDraft)}>Salvar SLA</Button>
          </div>
        </div>
      )}

      {/* ── Fase 0: Aba de Latência por endpoint ── */}
      {tab === "latency" && <LatencyPanel H={H} onToast={onToast}/>}
    </div>
  );
}

// ── Fase 0: Painel de latência (componente isolado pra encapsular o setInterval) ──
function LatencyPanel({ H, onToast }) {
  const [summary, setSummary] = React.useState(() => window.PainelAPI?.getMetricsSummary?.() || { total: 0, avgAll: 0, errorRateAll: 0, byAction: {} });

  // Auto-refresh a cada 5s
  React.useEffect(() => {
    const tick = () => { const s = window.PainelAPI?.getMetricsSummary?.(); if (s) setSummary(s); };
    tick();
    const iv = setInterval(tick, 5000);
    return () => clearInterval(iv);
  }, []);

  const actions = React.useMemo(() => {
    const entries = Object.entries(summary.byAction || {});
    // Ordena por p95 desc (se existir), senao por max desc
    entries.sort((a, b) => (b[1].p95 || b[1].max || 0) - (a[1].p95 || a[1].max || 0));
    return entries;
  }, [summary]);

  const fmtMs = (ms) => {
    if (ms == null) return "—";
    if (ms >= 10000) return (ms / 1000).toFixed(1) + "s";
    if (ms >= 1000) return (ms / 1000).toFixed(2) + "s";
    return Math.round(ms) + "ms";
  };
  const latColor = (ms) => {
    if (ms == null) return undefined;
    if (ms > 5000) return "var(--alert)";
    if (ms > 2000) return "var(--warn)";
    return undefined;
  };

  const exportCsv = () => {
    const raw = window.PainelAPI?.getMetrics?.() || [];
    if (!raw.length) { onToast?.({ type: "info", message: "Sem metricas pra exportar." }); return; }
    const head = "action,totalMs,queueMs,netMs,status,error,timestamp\n";
    const rows = raw.map(e => `"${e.action}",${e.totalMs.toFixed(1)},${e.queueMs.toFixed(1)},${e.netMs.toFixed(1)},${e.status},${e.error},${new Date(e.ts).toISOString()}`).join("\n");
    const blob = new Blob(["\uFEFF" + head + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `latencia_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
    onToast?.({ type: "success", message: `${raw.length} registros exportados.` });
  };

  return (<>
    {/* KPIs */}
    <div className="grid-cols-3 stagger" style={{ marginBottom: "var(--gap)" }}>
      <div className="kpi"><div className="kpi-label">Chamadas na sessão</div><div className="kpi-value"><CountUp value={summary.total}/></div><div className="kpi-meta">{summary.bufferUsed || 0} no buffer (max 300)</div></div>
      <div className="kpi"><div className="kpi-label">Latência média geral</div><div className="kpi-value" style={{ color: latColor(summary.avgAll) }}>{fmtMs(summary.avgAll)}</div><div className="kpi-meta">rede + parse (end-to-end)</div></div>
      <div className="kpi"><div className="kpi-label">Taxa de erro</div><div className="kpi-value" style={{ color: summary.errorRateAll > 0.05 ? "var(--alert)" : summary.errorRateAll > 0 ? "var(--warn)" : "var(--ink)" }}>{(summary.errorRateAll * 100).toFixed(1)}%</div><div className="kpi-meta">inclui timeout (408) e rede (0)</div></div>
    </div>

    {/* Info */}
    <div className="card card-pad" style={{ marginBottom: "var(--gap)", padding: "10px 14px", background: "var(--info-soft)", border: "1px solid rgba(37,99,235,0.2)" }}>
      <div className="row gap-2" style={{ alignItems: "center" }}><Icon name="info" size={14} style={{ color: "var(--info)" }}/><span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Dados coletados nesta sessão do browser. Não persistem, não saem do navegador. Atualiza a cada 5s. A coluna "Fila" mede espera no limitador client-side (MAX_CONCURRENT=4), não o servidor.</span></div>
    </div>

    {/* Tabela */}
    <div className="card">
      <div className="card-head">
        <div className="col" style={{ gap: 2 }}><div className="eyebrow">Por endpoint</div><div className="h2">Latência real medida no browser</div></div>
        <div className="row gap-2">
          <Button variant="ghost" size="sm" icon="layers" onClick={exportCsv}>Exportar CSV</Button>
          <Button variant="ghost" size="sm" icon="x" onClick={() => { window.PainelAPI?.clearMetrics?.(); setSummary({ total: 0, bufferUsed: 0, avgAll: 0, errorRateAll: 0, byAction: {} }); onToast?.({ type: "success", message: "Métricas zeradas." }); }}>Limpar</Button>
        </div>
      </div>
      {actions.length === 0
        ? <Empty title="Sem dados ainda" hint="Navegue pelo painel — as metricas aparecem conforme voce usa" icon="target"/>
        : (
          <table className="tbl">
            <thead><tr>
              <th>Endpoint</th>
              <th style={{ textAlign: "right" }}>Chamadas</th>
              <th style={{ textAlign: "right" }}>Avg</th>
              <th style={{ textAlign: "right" }}>p50</th>
              <th style={{ textAlign: "right" }}>p95</th>
              <th style={{ textAlign: "right" }}>Max</th>
              <th style={{ textAlign: "right" }}>Fila (avg)</th>
              <th style={{ textAlign: "right" }}>Erros</th>
              <th style={{ textAlign: "right" }}>Última</th>
            </tr></thead>
            <tbody>
              {actions.map(([action, m], i) => {
                const worst = m.p95 || m.max;
                return (
                  <tr key={action} className={i < 20 ? "row-anim" : ""} style={i < 20 ? { animationDelay: (i * 25) + "ms" } : undefined}>
                    <td className="cell-mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{action}</td>
                    <td className="cell-mono" style={{ textAlign: "right" }}>{m.count}</td>
                    <td className="cell-mono" style={{ textAlign: "right", color: latColor(m.avg) }}>{fmtMs(m.avg)}</td>
                    <td className="cell-mono" style={{ textAlign: "right", color: latColor(m.p50) }}>{fmtMs(m.p50)}</td>
                    <td className="cell-mono" style={{ textAlign: "right", color: latColor(m.p95), fontWeight: m.p95 != null ? 600 : 400 }}>{fmtMs(m.p95)}</td>
                    <td className="cell-mono" style={{ textAlign: "right", color: latColor(m.max) }}>{fmtMs(m.max)}</td>
                    <td className="cell-mono" style={{ textAlign: "right", color: m.queueAvg > 100 ? "var(--warn)" : undefined }}>{m.queueAvg > 0 ? fmtMs(m.queueAvg) : "—"}</td>
                    <td className="cell-mono" style={{ textAlign: "right", color: m.errorRate > 0 ? "var(--alert)" : "var(--ink-3)" }}>{m.errorRate > 0 ? (m.errorRate * 100).toFixed(0) + "%" : "0%"}</td>
                    <td className="cell-time" style={{ textAlign: "right", fontSize: 12 }}>{m.lastCall ? H.fmtRelTime(m.lastCall) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
    </div>
  </>);
}

window.ScreenOperations = ScreenOperations;
