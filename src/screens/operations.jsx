// screen-operations.jsx -> window.ScreenOperations
function FlowNode({ node, idx, hover, onHover }) {
  const palette = {
    entry: { bg: "rgba(37,99,235,0.08)", fg: "var(--info)", border: "rgba(37,99,235,0.25)" },
    security: { bg: "rgba(124,58,237,0.08)", fg: "#7C3AED", border: "rgba(124,58,237,0.25)" },
    logic: { bg: "var(--glass-2)", fg: "var(--ink)", border: "var(--rule-strong)" },
    data: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", border: "rgba(5,150,105,0.25)" },
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

function ScreenOperations({ onToast, checkings }) {
  const H = window.H;
  const [tab, setTab] = React.useState("flow");
  const [hover, setHover] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const events = window.MOCK.securityEvents;
  const services = window.MOCK.services;
  const refresh = () => { setLoading(true); setTimeout(() => { setLoading(false); onToast?.({ type: "success", message: "Status atualizado." }); }, 900); };

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div className="col" style={{ gap: 6 }}><div className="eyebrow">Operações · admin only</div><h1 className="display-1">Arquitetura e segurança</h1></div>
        <div className="row gap-3">
          <Segmented value={tab} onChange={setTab} options={[{ value: "flow", label: "Fluxo n8n" }, { value: "security", label: "Segurança" }, { value: "services", label: "Serviços" }]}/>
          <Button variant="ghost" icon="refresh" loading={loading} onClick={refresh}>Atualizar</Button>
        </div>
      </div>

      {tab === "flow" && (<>
        <div className="card card-glass card-pad" style={{ marginBottom: 22, padding: "18px 22px" }}>
          <div className="row gap-4">
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent-soft)", border: "1px solid rgba(5,150,105,0.3)", display: "grid", placeItems: "center" }}><Icon name="lock" size={18} style={{ color: "var(--accent)" }}/></div>
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
                <div><div className="eyebrow" style={{ marginBottom: 4 }}>Latência</div><div className="cell-mono" style={{ fontSize: 15, fontWeight: 500, color: s.latency > 1000 ? "var(--warn)" : "var(--ink)" }}>{s.latency}<span style={{ color: "var(--ink-3)", marginLeft: 2 }}>ms</span></div></div>
                <div><div className="eyebrow" style={{ marginBottom: 4 }}>Uptime 30d</div><div className="cell-mono" style={{ fontSize: 15, fontWeight: 500 }}>{s.uptime.toFixed(2)}<span style={{ color: "var(--ink-3)", marginLeft: 2 }}>%</span></div></div>
              </div>
              <div style={{ marginTop: 14, height: 4, borderRadius: 99, background: "var(--surface-3)" }}><div className="rank-fill" style={{ width: s.uptime + "%", height: "100%", borderRadius: 99, background: "var(--accent)" }}/></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
window.ScreenOperations = ScreenOperations;
