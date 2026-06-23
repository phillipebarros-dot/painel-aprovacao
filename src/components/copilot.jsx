// copilot.jsx — Co-piloto de decisão: badge, gauge e painel -> window
function CopilotBadge({ checking, size = "md" }) {
  const s = React.useMemo(() => window.AI.copilotScore(checking), [checking.submission_id, checking.status, checking.rejection_count, checking.total_arquivos]);
  const color = s.level === "high" ? "var(--accent)" : s.level === "mid" ? "var(--warn)" : "var(--alert)";
  const soft = s.level === "high" ? "var(--accent-soft)" : s.level === "mid" ? "var(--warn-soft)" : "var(--alert-soft)";
  if (size === "sm") {
    return <span className="copilot-chip" style={{ background: soft, color }} title={s.rec + " · " + s.conf + "% de confiança para aprovar"}><span className="copilot-dot" style={{ background: color }}/>{s.conf}%</span>;
  }
  return (
    <span className="copilot-chip" style={{ background: soft, color }}><Icon name="target" size={12}/>{s.conf}% · {s.rec}</span>
  );
}

function CopilotPanel({ checking, onApprove, onReject, isViewer }) {
  const s = React.useMemo(() => window.AI.copilotScore(checking), [checking.submission_id, checking.status, checking.rejection_count]);
  const color = s.level === "high" ? "var(--accent)" : s.level === "mid" ? "var(--warn)" : "var(--alert)";
  const soft = s.level === "high" ? "var(--accent-soft)" : s.level === "mid" ? "var(--warn-soft)" : "var(--alert-soft)";
  const size = 92, stroke = 9, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const [off, setOff] = React.useState(c);
  React.useEffect(() => { const t = setTimeout(() => setOff(c * (1 - s.conf / 100)), 120); return () => clearTimeout(t); }, [s.conf, c]);

  return (
    <div className="card copilot-card">
      <div className="copilot-header" style={{ background: `linear-gradient(180deg, ${soft}, transparent)` }}>
        <div className="row gap-2"><div className="copilot-spark" style={{ color }}><Icon name="bolt" size={14}/></div><div className="eyebrow" style={{ color }}>Co-piloto · apoio à decisão</div></div>
      </div>
      <div className="card-pad">
        <div className="row gap-4" style={{ alignItems: "center", marginBottom: 16 }}>
          <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size}>
              <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}/>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1200ms var(--ease-out)" }}/>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color }}><CountUp value={s.conf}/><span style={{ fontSize: 13 }}>%</span></div><div style={{ fontSize: 8.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginTop: 1 }}>CONFIANÇA</div></div></div>
          </div>
          <div className="col" style={{ gap: 4, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color }}>{s.rec}</div>
            <div className="body-xs" style={{ lineHeight: 1.5 }}>Lê os arquivos anexados, o histórico de devoluções, o tempo em fila e o tipo de mídia para sugerir uma decisão. Você decide.</div>
          </div>
        </div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Por que esse número</div>
        <div className="col gap-2">
          {s.reasons.map((rs, i) => (
            <div key={i} className="copilot-reason" style={{ animationDelay: (i * 50) + "ms" }}>
              <span className="copilot-reason-ico" style={{ color: rs.neg ? "var(--alert)" : "var(--accent)" }}><Icon name={rs.neg ? "warn" : "check"} size={12} strokeWidth={2}/></span>
              <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{rs.text}</span>
            </div>
          ))}
        </div>
        {checking.status === "pending" && !isViewer && (
          <div className="row gap-2" style={{ marginTop: 16 }}>
            <button className="btn btn-accent sm" style={{ flex: 1 }} onClick={onApprove}><Icon name="check"/>Aprovar</button>
            <button className="btn btn-ghost sm" style={{ flex: 1 }} onClick={onReject}><Icon name="x"/>Reprovar</button>
          </div>
        )}
        <div className="copilot-foot">Sugestão de apoio · a decisão final é sempre sua</div>
      </div>
    </div>
  );
}

Object.assign(window, { CopilotBadge, CopilotPanel });

// Triagem automática por IA (inspirado no TicketZero) -> window
function AutoTriagePanel({ checkings, onStartTriage, onOpenReview, onToast }) {
  const [threshold, setThreshold] = React.useState(() => Number(localStorage.getItem("painel_ai_threshold") || 80));
  const t = React.useMemo(() => window.AI.autoTriage(checkings, { threshold }), [checkings, threshold]);
  const setTh = (v) => { setThreshold(v); localStorage.setItem("painel_ai_threshold", String(v)); };
  const lanes = [
    { key: "auto", label: "Auto-resolução sugerida", hint: "alta confiança, sem reincidência", list: t.auto, color: "var(--accent)", soft: "var(--accent-soft)" },
    { key: "review", label: "Revisar", hint: "confiança média", list: t.review, color: "var(--warn)", soft: "var(--warn-soft)" },
    { key: "escalate", label: "Escalar", hint: "risco ou reincidência", list: t.escalate, color: "var(--alert)", soft: "var(--alert-soft)" },
  ];
  return (
    <div className="card copilot-card" style={{ marginBottom: "var(--gap)" }}>
      <div className="copilot-header" style={{ background: "linear-gradient(180deg, var(--accent-soft), transparent)" }}>
        <div className="row gap-2" style={{ alignItems: "center", width: "100%" }}>
          <div className="copilot-spark" style={{ color: "var(--accent)" }}><Icon name="bolt" size={14}/></div>
          <div className="col" style={{ gap: 1 }}><div className="eyebrow" style={{ color: "var(--accent)" }}>Triagem automática por IA</div><span className="body-xs muted">{t.pending} pendentes analisados · {t.pct}% elegíveis a auto-resolução</span></div>
          <div className="spacer"/>
          <div className="row gap-2" style={{ alignItems: "center" }}>
            <span className="tb-view-lbl">Confiança mín.</span>
            <input type="range" min="60" max="95" step="5" value={threshold} onChange={e => setTh(Number(e.target.value))} style={{ width: 110 }}/>
            <span className="cell-mono" style={{ fontSize: 12, width: 34 }}>{threshold}%</span>
          </div>
        </div>
      </div>
      <div className="card-pad">
        <div className="ai-lanes">
          {lanes.map(l => (
            <div key={l.key} className="ai-lane" style={{ borderTopColor: l.color }}>
              <div className="row gap-2" style={{ alignItems: "baseline" }}><span style={{ fontSize: 24, fontWeight: 700, color: l.color, fontVariantNumeric: "tabular-nums" }}>{l.list.length}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{l.label}</span></div>
              <div className="body-xs muted" style={{ marginBottom: 8 }}>{l.hint}</div>
              <div className="col" style={{ gap: 5 }}>
                {l.list.slice(0, 3).map(c => (
                  <div key={c.submission_id} className="ai-lane-row" onClick={() => onOpenReview(c)}>
                    <span className="cell-pi" style={{ fontSize: 11.5 }}>{c.n_pi}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{c.cliente}</span>
                    <span className="copilot-chip" style={{ background: l.soft, color: l.color, padding: "1px 6px", fontSize: 10.5 }}>{c._conf}%</span>
                  </div>
                ))}
                {l.list.length > 3 && <span className="body-xs muted">+{l.list.length - 3} outros</span>}
                {l.list.length === 0 && <span className="body-xs muted">Nenhum</span>}
              </div>
              {l.key === "auto" && l.list.length > 0 && <button className="btn btn-accent sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onStartTriage(l.list)}><Icon name="bolt"/>Revisar lote sugerido</button>}
              {l.key === "escalate" && l.list.length > 0 && <button className="btn btn-ghost sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onStartTriage(l.list)}>Tratar escalados</button>}
            </div>
          ))}
        </div>
        <div className="copilot-foot" style={{ marginTop: 12 }}>A IA pré-classifica e ordena a fila. Nenhuma aprovação é feita sem a sua confirmação no lote.</div>
      </div>
    </div>
  );
}
Object.assign(window, { AutoTriagePanel });
