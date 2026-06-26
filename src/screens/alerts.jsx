// screen-alerts.jsx — Central de Alertas + perfis de limite -> window.ScreenAlerts
function AlertLine({ a, i, sevMeta, leadOf, isViewer, onDecide, onOpenReview }) {
  const m = sevMeta[a.sev];
  const [lv, lu] = leadOf(a);
  return (
    <div className="alert-line" style={{ "--sev": m.color, animationDelay: (i * 24) + "ms" }}>
      <div className="alert-sev"><span className="alert-sev-dot"/><span className="alert-sev-code">{m.code}</span></div>
      <div className="alert-main">
        <div className="row gap-2" style={{ alignItems: "baseline", flexWrap: "wrap" }}>
          <span className="alert-h">{a.type}</span>
          <span className="alert-target">{a.c ? a.c.cliente : a.cliente || "operação"}</span>
        </div>
        <div className="alert-sub">{a.c ? <><span className="cell-pi">{a.c.n_pi}</span> · {a.c.meio} · {a.c.praca}</> : a.detail}</div>
      </div>
      <div className="alert-lead"><span className="alert-lead-v">{lv}</span><span className="alert-lead-u">{lu}</span></div>
      <div className="alert-act">
        {a.c && !isViewer && <button className="btn btn-accent sm" title="Aprovar" onClick={() => onDecide(a.c, "approve")}><Icon name="check"/></button>}
        {a.c && <button className="btn btn-ghost sm" onClick={() => onOpenReview(a.c)}>Revisar</button>}
        {a.group && <button className="btn btn-ghost sm" onClick={() => onOpenReview(a.group[0])}>Ver fila</button>}
      </div>
    </div>
  );
}

function ScreenAlerts({ checkings, currentUser, onOpenReview, onStartTriage, onDecide, onToast, viewMode, preAlerts }) {
  const H = window.H, AI = window.AI;
  const [profile, setProfile] = React.useState(() => AI.loadProfile());
  const [draft, setDraft] = React.useState(profile);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("all");
  const view = viewMode || "lista";
  const isViewer = currentUser?.role === "viewer";
  const isAdmin = currentUser?.role === "admin";

  // Central de alertas referente às tarefas do usuário: analista vê só os seus PIs; admin vê todos (reunião 22/06)
  const scoped = React.useMemo(() => {
    if (isAdmin) return checkings;
    /* FIX A7.4: normalizar name matching (trim+toLowerCase) */
    const me = (currentUser?.nome || currentUser?.name || "").trim().toLowerCase();
    return checkings.filter(c => (c.assigned_to || "").trim().toLowerCase() === me);
  }, [checkings, currentUser, isAdmin]);

  const alerts = React.useMemo(() => (isAdmin && preAlerts) ? preAlerts : AI.computeAlerts(scoped, profile), [scoped, profile, isAdmin, preAlerts]);
  const counts = React.useMemo(() => AI.alertCounts(alerts), [alerts]);
  const shown = filter === "all" ? alerts : alerts.filter(a => a.sev === filter);

  const applyProfile = () => { setProfile(draft); AI.saveProfile(draft); setConfigOpen(false); onToast?.({ type: "success", message: "Perfil de alertas atualizado." }); };
  const resetProfile = () => setDraft(AI.DEFAULT_PROFILE);

  const sevMeta = {
    critical: { label: "Crítico", code: "CRIT", color: "var(--alert)" },
    warning: { label: "Risco", code: "RISCO", color: "var(--warn)" },
    info: { label: "Info", code: "INFO", color: "var(--info)" },
  };
  const leadOf = (a) => {
    if (a.type === "SLA estourado" || a.type === "SLA em risco") { const h = Number(a.wait) || 0; return h >= 36 ? [Math.round(h / 24), "dias na fila"] : [h < 10 ? h.toFixed(1) : Math.round(h), "h na fila"]; }
    if (a.type === "Reincidência") return [(a.c.rejection_count + 1) + "ª", "versão"];
    if (a.type === "Fila acumulada") return [a.group.length, "na fila"];
    if (a.type === "Pico de volume") return [a.metric, "hoje"];
    return ["", ""];
  };

  const Slider = ({ label, suffix, val, min, max, step, onChange, hint }) => (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
        <span className="cell-mono" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{val}{suffix}</span>
      </div>
      <input type="range" className="range" min={min} max={max} step={step} value={val} onChange={e => onChange(Number(e.target.value))}/>
      {hint && <div className="body-xs muted">{hint}</div>}
    </div>
  );

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div className="col" style={{ gap: 6 }}>
          <div className="eyebrow">Monitoramento · tempo real</div>
          <h1 className="display-1">Central de alertas</h1>
          <p className="body-xs muted" style={{ margin: 0 }}>{isAdmin ? "Visão completa da operação · todos os responsáveis." : "Alertas das suas demandas atribuídas."}</p>
        </div>
        <div className="row gap-3">
          <Button variant="ghost" icon="settings" onClick={() => { setDraft(profile); setConfigOpen(true); }}>Perfil de limites</Button>
          {!isViewer && counts.total > 0 && <Button variant="primary" icon="bolt" onClick={onStartTriage}>Revisar em sequência</Button>}
        </div>
      </div>

      {/* Summary tiles */}
      {(() => {
        const tiles = [
          { k: "all", cls: "", label: "Alertas ativos", val: counts.total, meta: `monitorando ${checkings.filter(c => H.norm(c.status) === "pending").length} pendentes`, icon: "alert", color: "var(--ink)", share: 1 },
          { k: "critical", cls: "crit", label: "Críticos", val: counts.critical, meta: "SLA estourado", icon: "alert", color: "var(--alert)", share: counts.total ? counts.critical / counts.total : 0 },
          { k: "warning", cls: "warn", label: "Avisos", val: counts.warning, meta: "SLA em risco · reincidência", icon: "clock", color: "var(--warn)", share: counts.total ? counts.warning / counts.total : 0 },
          { k: "info", cls: "info", label: "Informativos", val: counts.info, meta: "fila · volume", icon: "info", color: "var(--info)", share: counts.total ? counts.info / counts.total : 0 },
        ];
        return (
        <div className="grid-cols-4 stagger" style={{ marginBottom: 22 }}>
          {tiles.map(t => (
            <button key={t.k} className={"alert-tile " + t.cls + (filter === t.k ? " on" : "")} onClick={() => setFilter(t.k)}>
              <div className="alert-tile-top">
                <div className="col" style={{ gap: 2 }}>
                  <div className="kpi-label">{t.label}</div>
                  <div className="kpi-value" style={{ color: t.val ? t.color : "var(--ink)" }}><CountUp value={t.val}/></div>
                </div>
                <span className="alert-tile-ic" style={{ "--ic": t.color }}><Icon name={t.icon} size={16}/></span>
              </div>
              <div className="kpi-meta">{t.meta}</div>
              <div className="alert-tile-bar"><span style={{ width: Math.max(4, Math.round(t.share * 100)) + "%", background: t.color }}/></div>
            </button>
          ))}
        </div>
        );
      })()}

      {shown.length === 0 ? (
        <div className="card"><div style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 15, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icon name="check" size={26} strokeWidth={2}/></div>
          <div style={{ fontSize: 16, color: "var(--ink)", fontWeight: 500 }}>Tudo sob controle</div>
          <div className="body-sm" style={{ marginTop: 4 }}>Nenhum alerta {filter !== "all" ? "deste tipo" : ""} com o perfil de limites atual.</div>
        </div></div>
      ) : (
        view === "lista" ? (
          <div className="alert-list">
            {shown.map((a, i) => <AlertLine key={a.id} a={a} i={i} sevMeta={sevMeta} leadOf={leadOf} isViewer={isViewer} onDecide={onDecide} onOpenReview={onOpenReview}/>)}
          </div>
        ) : (
          <div className="alert-board">
            {["critical", "warning", "info"].map(sev => {
              const grp = shown.filter(a => a.sev === sev);
              const m = sevMeta[sev];
              return (
                <div key={sev} className="alert-board-col" style={{ "--sev": m.color }}>
                  <div className="alert-board-head"><span className="alert-sev-dot" style={{ background: m.color, boxShadow: `0 0 9px ${m.color}` }}/><span className="alert-group-title">{m.label}</span><span className="numdot" style={{ marginLeft: "auto" }}>{grp.length}</span></div>
                  <div className="alert-board-body">
                    {grp.length === 0 && <div className="kanban-empty">Nenhum</div>}
                    {grp.map((a, i) => {
                      const [lv, lu] = leadOf(a);
                      return (
                        <div key={a.id} className="alert-card" style={{ animationDelay: (i * 20) + "ms" }} onClick={() => a.c ? onOpenReview(a.c) : (a.group && onOpenReview(a.group[0]))}>
                          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.type}</span>
                            <span className="alert-lead-v" style={{ fontSize: 16 }}>{lv}<span style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 2 }}>{lu}</span></span>
                          </div>
                          <div className="alert-sub" style={{ whiteSpace: "normal" }}>{a.c ? <><span className="cell-pi">{a.c.n_pi}</span> · {a.c.cliente} · {a.c.meio}</> : a.detail}</div>
                          {a.c && !isViewer && <div className="row gap-2" style={{ marginTop: 9 }}><button className="btn btn-accent sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onDecide(a.c, "approve"); }}><Icon name="check"/>Aprovar</button><button className="btn btn-ghost sm" onClick={(e) => { e.stopPropagation(); onOpenReview(a.c); }}>Revisar</button></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Threshold profile config */}
      {configOpen && (<>
        <div className="scrim" onClick={() => setConfigOpen(false)}/>
        <div className="modal content" style={{ width: "min(520px, 94vw)" }}>
          <div className="row" style={{ justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--rule)" }}>
            <div className="col" style={{ gap: 2 }}><div className="eyebrow">Configuração</div><h3 className="h2">Perfil de limites</h3></div>
            <button className="icon-btn" onClick={() => setConfigOpen(false)}><Icon name="x" size={15}/></button>
          </div>
          <div className="card-pad col gap-4">
            <p className="body-sm" style={{ margin: 0 }}>Defina quando você quer ser alertado. Só aparecem alertas que cruzam estes limites.</p>
            <Slider label="SLA em risco a partir de" suffix="h" val={draft.slaWarnH} min={1} max={12} step={1} onChange={v => setDraft({ ...draft, slaWarnH: v })} hint="Checking pendente acima deste tempo vira aviso."/>
            <Slider label="SLA estourado a partir de" suffix="h" val={draft.slaBreachH} min={draft.slaWarnH + 1} max={48} step={1} onChange={v => setDraft({ ...draft, slaBreachH: v })} hint="Acima deste tempo vira alerta crítico."/>
            <Slider label="Reincidência a partir de" suffix="ª devolução" val={draft.reincidencia} min={1} max={3} step={1} onChange={v => setDraft({ ...draft, reincidencia: v })} hint="Alerta quando um checking já foi devolvido N vezes."/>
            <Slider label="Fila por fornecedor a partir de" suffix=" pendentes" val={draft.filaFornecedor} min={2} max={12} step={1} onChange={v => setDraft({ ...draft, filaFornecedor: v })} hint="Alerta quando um cliente acumula muitos pendentes."/>
            <div className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--rule)" }}>
              <div className="col" style={{ gap: 2 }}><span style={{ fontSize: 13, fontWeight: 500 }}>Detectar picos de volume</span><span className="body-xs muted">Alerta quando o dia recebe muito acima da média.</span></div>
              <Toggle on={draft.volumeSpike} onClick={() => setDraft({ ...draft, volumeSpike: !draft.volumeSpike })}/>
            </div>
          </div>
          <div className="row gap-3" style={{ justifyContent: "space-between", padding: "14px 22px", borderTop: "1px solid var(--rule)" }}>
            <Button variant="quiet" onClick={resetProfile}>Restaurar padrão</Button>
            <div className="row gap-2"><Button variant="ghost" onClick={() => setConfigOpen(false)}>Cancelar</Button><Button variant="primary" icon="check" onClick={applyProfile}>Salvar perfil</Button></div>
          </div>
        </div>
      </>)}
    </div>
  );
}
window.ScreenAlerts = ScreenAlerts;
