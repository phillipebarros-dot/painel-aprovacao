// screen-producao.jsx — Produção: divisão de demanda + produtividade por pessoa -> window.ScreenProducao
function ScreenProducao({ checkings, currentUser, onOpenReview, onToast, viewMode, onAssign, onSetCheckStatus, onSetComentario }) {
  const H = window.H;
  const isManager = currentUser?.role === "admin";
  const pview = viewMode || "tabela";
  const [period, setPeriod] = React.useState("mes");
  const [divOpen, setDivOpen] = React.useState(false);
  const [divMonth, setDivMonth] = React.useState("all");
  const [divConta, setDivConta] = React.useState(null);
  const [divPage, setDivPage] = React.useState(50); // paginação virtual
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const changePeriod = (v) => { if (React.startTransition) React.startTransition(() => setPeriod(v)); else setPeriod(v); };

  // ── Lazy load: carregar board de produção do n8n (BigQuery) ──
  const [boardData, setBoardData] = React.useState(null);
  const [boardLoading, setBoardLoading] = React.useState(false);
  React.useEffect(() => {
    if (boardData) return; // já carregou
    setBoardLoading(true);
    window.MOCK?.loadProduction?.()
      .then(res => { if (res?.board?.length) setBoardData(res.board); })
      .catch(() => {})
      .finally(() => setBoardLoading(false));
  }, []);

  const sinceTs = React.useMemo(() => {
    const now = Date.now();
    if (period === "hoje") return new Date().setHours(0, 0, 0, 0);
    if (period === "semana") return now - 7 * 86400000;
    if (period === "mes") return now - 30 * 86400000;
    if (period === "custom" && customFrom) return new Date(customFrom).getTime();
    return 0;
  }, [period, customFrom]);

  const untilTs = React.useMemo(() => {
    if (period === "custom" && customTo) return new Date(customTo).getTime() + 86400000 - 1;
    return Infinity;
  }, [period, customTo]);

  const filteredCheckings = React.useMemo(() => {
    if (period !== "custom" || (!customFrom && !customTo)) return checkings;
    return checkings.filter(c => {
      const t = c.submittedAt || c.ingestion_time;
      return (!customFrom || t >= sinceTs) && (!customTo || t <= untilTs);
    });
  }, [checkings, period, sinceTs, untilTs, customFrom, customTo]);

  const prod = React.useMemo(() => H.teamProductivity(filteredCheckings, period === "custom" ? 0 : sinceTs), [filteredCheckings, sinceTs, period]);
  const maxBaixados = Math.max(1, ...prod.rows.map(r => r.baixados));
  const periodLabel = period === "custom" ? (customFrom && customTo ? `${new Date(customFrom).toLocaleDateString("pt-BR")} – ${new Date(customTo).toLocaleDateString("pt-BR")}` : "período personalizado") : { hoje: "hoje", semana: "últimos 7 dias", mes: "últimos 30 dias", tudo: "todo o período" }[period];

  // colaborador: minha fila
  const myName = currentUser?.nome || currentUser?.name;
  const mine = React.useMemo(() => checkings.filter(c => c.assigned_to === myName), [checkings, myName]);
  const myStats = prod.rows.find(r => r.name === myName);
  const myPending = mine.filter(c => H.norm(c.status) === "pending").sort((a, b) => a.submittedAt - b.submittedAt);
  // dashboard pessoal do analista
  const myAging = React.useMemo(() => H.agingBuckets(mine), [mine]);
  const myDist = React.useMemo(() => H.distribution(mine, "cliente", 5), [mine]);
  const myDone = React.useMemo(() => mine.filter(c => c.approvedAt || c.rejectedAt), [mine]);
  const myApproved = myDone.filter(c => H.norm(c.status) === "approved").length;
  const myApprovalRate = myDone.length ? myApproved / myDone.length : 0;
  const teamAvgSla = React.useMemo(() => { const v = prod.rows.filter(r => r.avgSla > 0); return v.length ? v.reduce((s, r) => s + r.avgSla, 0) / v.length : 0; }, [prod.rows]);
  const mySpark = React.useMemo(() => {
    const days = 14, today = new Date(); today.setHours(0, 0, 0, 0);
    const arr = Array.from({ length: days }, () => 0);
    myDone.forEach(c => { const end = c.approvedAt || c.rejectedAt; const d = Math.floor((today - new Date(end).setHours(0, 0, 0, 0)) / 86400000); if (d >= 0 && d < days) arr[days - 1 - d]++; });
    return arr.map(v => ({ v }));
  }, [myDone]);

  const colorOf = (name) => (window.MOCK.users.find(u => u.name === name)?.color) || "#0E7490";

  // Divisão por conta (espelha as abas da planilha da Marlene): agrupa PIs por conta
  const team = React.useMemo(() => (window.MOCK?.users || []).filter(u => u.role !== "viewer").map(u => u.nome || u.name), []);
  const contaAgg = React.useMemo(() => {
    const m = {};
    const src = divMonth === "all" ? checkings : checkings.filter(c => { const d = new Date(c.submittedAt); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === divMonth; });
    src.forEach(c => {
      const k = c.conta || "Sem conta";
      if (!m[k]) m[k] = { conta: k, total: 0, pend: 0, resp: {} };
      m[k].total++;
      if (H.norm(c.status) === "pending") m[k].pend++;
      if (c.assigned_to) m[k].resp[c.assigned_to] = (m[k].resp[c.assigned_to] || 0) + 1;
    });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [checkings, divMonth]);
  const divMonths = React.useMemo(() => H.recentMonths(6), []);
  const divTotalPIs = React.useMemo(() => contaAgg.reduce((s, r) => s + r.total, 0), [contaAgg]);
  const activeConta = divConta || (contaAgg[0] && contaAgg[0].conta);
  const divRows = React.useMemo(() => {
    const src = divMonth === "all" ? checkings : checkings.filter(c => { const d = new Date(c.submittedAt); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === divMonth; });
    return src.filter(c => (c.conta || "Sem conta") === activeConta);
  }, [checkings, divMonth, activeConta]);
  const assignOne = (id, name) => { onAssign && onAssign({ [id]: name }); onToast && onToast({ type: "success", message: `PI atribuído a ${name.split(" ")[0]}` }); };
  const assignConta = (conta, name) => {
    const map = {}; checkings.forEach(c => { if ((c.conta || "Sem conta") === conta) map[c.submission_id] = name; });
    onAssign && onAssign(map);
    onToast && onToast({ type: "success", message: `Conta ${conta} atribuída a ${name.split(" ")[0]}` });
  };

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div className="col" style={{ gap: 6, flex: "1 1 340px" }}>
          <div className="eyebrow">Produção · {isManager ? "gestão da equipe" : "minhas demandas"}</div>
          <h1 className="display-1">{isManager ? "Produção da equipe" : "Minhas tarefas"}</h1>
        </div>
        <div className="row gap-3" style={{ flex: "0 0 auto" }}>
          <Segmented value={period} onChange={changePeriod} options={[{ value: "hoje", label: "Hoje" }, { value: "semana", label: "7d" }, { value: "mes", label: "30d" }, { value: "tudo", label: "Tudo" }, { value: "custom", label: "Período" }]}/>
          {period === "custom" && (
            <div className="row gap-2" style={{ alignItems: "center" }}>
              <input type="date" className="input sm" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 140, fontSize: 12 }}/>
              <span className="muted" style={{ fontSize: 12 }}>até</span>
              <input type="date" className="input sm" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 140, fontSize: 12 }}/>
            </div>
          )}
          {isManager && <Button variant="primary" icon="layers" onClick={() => setDivOpen(true)}>Dividir demanda</Button>}
        </div>
      </div>

      {isManager ? (<>
        <div className="card card-pad" style={{ marginBottom: "var(--gap)", padding: "10px 14px", background: "var(--info-soft)", border: "1px solid rgba(37,99,235,0.2)" }}>
          <div className="row gap-2" style={{ alignItems: "center" }}><Icon name="lock" size={14} style={{ color: "var(--info)" }}/><span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Indicadores individuais visíveis apenas para gestores. Uso de gestão, não exposto à equipe, conforme boas práticas de privacidade (LGPD e CLT).</span></div>
        </div>
        {/* Totais */}
        <div className="grid-cols-4 stagger" style={{ marginBottom: "var(--gap)" }}>
          <div className="kpi"><div className="kpi-label">Demanda total</div><div className="kpi-value"><CountUp value={prod.totals.demanda}/></div><div className="kpi-meta">distribuída entre <strong>{prod.rows.length}</strong> pessoas</div></div>
          <div className="kpi"><div className="kpi-label">Baixados · {periodLabel}</div><div className="kpi-value" style={{ color: "var(--accent)" }}><CountUp value={prod.totals.baixados}/></div><div className="kpi-meta"><strong>{prod.totals.approved}</strong> aprovados · <strong>{prod.totals.rejected}</strong> reprovados</div></div>
          <div className="kpi"><div className="kpi-label">Pendentes</div><div className="kpi-value" style={{ color: prod.totals.pendentes ? "var(--warn)" : "var(--ink)" }}><CountUp value={prod.totals.pendentes}/></div><div className="kpi-meta">aguardando baixa</div></div>
          <div className="kpi"><div className="kpi-label">Conclusão</div><div className="kpi-value"><CountUp value={prod.totals.demanda ? Math.round((prod.totals.baixados / prod.totals.demanda) * 100) : 0}/><span className="unit">%</span></div><div className="kpi-meta">da demanda baixada</div></div>
        </div>

        {/* Produtividade por pessoa */}
        <div className="card" style={{ display: pview === "tabela" ? undefined : "none" }}>
          <div className="card-head">
            <div className="col" style={{ gap: 2 }}><div className="eyebrow">Por login · {periodLabel}</div><div className="h2">Baixas por pessoa</div></div>
            <ExportMenu label="Relatório" onCsv={() => {
              const head = "Pessoa,Demanda,Baixados,Aprovados,Reprovados,Pendentes,Conclusao %,SLA medio h\n";
              const rows = prod.rows.map(r => `"${r.name}",${r.demanda},${r.baixados},${r.approved},${r.rejected},${r.pendentes},${Math.round(r.pct * 100)},${r.avgSla.toFixed(1)}`).join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([head + rows], { type: "text/csv" })); a.download = `producao_${period}.csv`; a.click(); URL.revokeObjectURL(a.href);
            }} onPdf={() => H.exportPDF("Produtividade por pessoa", ["Pessoa", "Demanda", "Baixados", "Aprovados", "Reprovados", "Pendentes", "Conclusão", "SLA médio"], prod.rows.map(r => [r.name, r.demanda, r.baixados, r.approved, r.rejected, r.pendentes, Math.round(r.pct * 100) + "%", (r.avgSla ? r.avgSla.toFixed(1) + "h" : "·")]), periodLabel)}/>
          </div>
          <table className="tbl">
            <thead><tr><th>Pessoa</th><th style={{ width: 240 }}>Baixas</th><th style={{ textAlign: "right" }}>Demanda</th><th style={{ textAlign: "right" }}>Baixados</th><th style={{ textAlign: "right" }}>Pendentes</th><th style={{ textAlign: "right" }}>SLA médio</th><th style={{ width: 110, textAlign: "right" }}>Conclusão</th></tr></thead>
            <tbody>
              {prod.rows.map((r, i) => (
                <tr key={r.name} className="row-anim" style={{ animationDelay: (i * 30) + "ms" }}>
                  <td><div className="row gap-2"><Avatar user={{ nome: r.name, color: colorOf(r.name) }} size={26}/><span style={{ fontWeight: 500 }}>{r.name}</span></div></td>
                  <td>
                    <div className="rank-track" style={{ height: 7 }}>
                      <div className="rank-fill" style={{ width: `${(r.baixados / maxBaixados) * 100}%`, height: "100%", background: colorOf(r.name), transitionDelay: (i * 60) + "ms" }}/>
                    </div>
                    <div className="row gap-2" style={{ marginTop: 5, fontSize: 11, color: "var(--ink-3)" }}><span style={{ color: "var(--accent)" }}>{r.approved} aprov.</span><span>·</span><span style={{ color: "var(--alert)" }}>{r.rejected} reprov.</span></div>
                  </td>
                  <td className="cell-mono" style={{ textAlign: "right" }}>{r.demanda}</td>
                  <td className="cell-mono" style={{ textAlign: "right", color: "var(--ink)", fontWeight: 600 }}>{r.baixados}</td>
                  <td className="cell-mono" style={{ textAlign: "right", color: r.pendentes ? "var(--warn)" : "var(--ink-3)" }}>{r.pendentes}</td>
                  <td className="cell-mono" style={{ textAlign: "right", color: r.avgSla > 4 ? "var(--warn)" : "var(--ink-2)" }}>{r.avgSla ? r.avgSla.toFixed(1) + "h" : "·"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
                      <span className="cell-mono" style={{ fontWeight: 600, color: r.pct >= 0.8 ? "var(--accent)" : r.pct >= 0.5 ? "var(--warn)" : "var(--alert)" }}>{Math.round(r.pct * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pview === "cards" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {prod.rows.map((r, i) => (
              <div key={r.name} className="card card-pad card-hover" style={{ animation: "rowIn 400ms var(--ease-out) both", animationDelay: (i * 30) + "ms" }}>
                <div className="row gap-3" style={{ alignItems: "center", marginBottom: 14 }}>
                  <Avatar user={{ nome: r.name, color: colorOf(r.name) }} size={36}/>
                  <div className="col" style={{ gap: 1, flex: 1, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span><span className="body-xs muted">{r.demanda} na demanda</span></div>
                  <span className="cell-mono" style={{ fontSize: 18, fontWeight: 700, color: r.pct >= 0.8 ? "var(--accent)" : r.pct >= 0.5 ? "var(--warn)" : "var(--alert)" }}>{Math.round(r.pct * 100)}%</span>
                </div>
                <div className="rank-track" style={{ height: 7 }}><div className="rank-fill" style={{ width: `${(r.baixados / maxBaixados) * 100}%`, height: "100%", background: colorOf(r.name) }}/></div>
                <div className="row gap-4" style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
                  <span><b style={{ color: "var(--ink)" }}>{r.baixados}</b> baixados</span>
                  <span><b style={{ color: r.pendentes ? "var(--warn)" : "var(--ink)" }}>{r.pendentes}</b> pendentes</span>
                  <span>SLA <b style={{ color: "var(--ink)" }}>{r.avgSla ? r.avgSla.toFixed(1) + "h" : "·"}</b></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {pview === "divisao" && (
          <div className="card">
            <div className="card-head">
              <div className="col" style={{ gap: 2 }}><div className="eyebrow">Divisão de demanda · por conta</div><div className="h2">Atribua o responsável por PI</div></div>
              <div className="row gap-3" style={{ alignItems: "center" }}>
                <select className="dash-month" value={divMonth} onChange={e => setDivMonth(e.target.value)}>
                  <option value="all">Todos os meses</option>
                  {divMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <span className="cell-mono muted">{activeConta} · {divRows.length} PIs</span>
              </div>
            </div>
            <div>
              <table className="tbl tbl-planilha" style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: "8%" }}/>
                  <col style={{ width: "16%" }}/>
                  <col style={{ width: "18%" }}/>
                  <col style={{ width: "6%" }}/>
                  <col style={{ width: "14%" }}/>
                  <col style={{ width: "15%" }}/>
                  <col style={{ width: "18%" }}/>
                  <col style={{ width: "5%" }}/>
                </colgroup>
                <thead><tr>
                  <th>Nº PI</th><th>Cliente</th><th>Veículo</th><th>Meio</th>
                  <th>Status</th><th>Responsável</th><th>Comentário</th><th>Arq.</th>
                </tr></thead>
                <tbody>
                  {divRows.length === 0
                    ? <tr><td colSpan={8}><div style={{ padding: 28 }}><Empty title="Sem PIs nesta conta/mês" hint="Troque a aba ou o mês" icon="layers"/></div></td></tr>
                    : divRows.slice(0, divPage).map((c, i) => {
                      const SC = window.CHECK_STATUS || {}; const SCL = window.CHECK_STATUS_LIST || [];
                      const per = c.periodo_ini && c.periodo_fim ? `${new Date(c.periodo_ini).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}–${new Date(c.periodo_fim).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : "";
                      const tip = [c.campanha, per, c.valor_liquido ? (c.valor_liquido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null, c.praca].filter(Boolean).join(" · ");
                      return (
                      <tr key={c.submission_id} className={i < 20 ? "row-anim" : ""} style={i < 20 ? { animationDelay: (i * 12) + "ms" } : undefined} title={tip}>
                        <td className="cell-pi">{c.n_pi}</td>
                        <td style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cliente}</td>
                        <td className="cell-secondary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.veiculo}</td>
                        <td className="cell-secondary">{c.meio}</td>
                        <td className="plan-edit" onClick={e => e.stopPropagation()}>
                          <div className="plan-status" style={{ "--sc": SC[c.statusCheck] || "var(--ink-3)" }}>
                            {!isManager ? <span className="plan-status-tag">{c.statusCheck || "—"}</span> : (
                              <select value={c.statusCheck || ""} onChange={e => { onSetCheckStatus && onSetCheckStatus(c.submission_id, e.target.value); onToast?.({ type: "success", message: `Status: ${e.target.value}` }); }}>
                                {!c.statusCheck && <option value="">—</option>}
                                {SCL.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="plan-edit" onClick={e => e.stopPropagation()}>
                          {!isManager ? <span className="cell-secondary">{c.assigned_to || "—"}</span> : (
                            <select className="plan-resp" value={c.assigned_to || ""} onChange={e => e.target.value && assignOne(c.submission_id, e.target.value)}>
                              <option value="">— a definir —</option>
                              {team.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="plan-edit" onClick={e => e.stopPropagation()}>
                          {!isManager ? <span className="cell-secondary" style={{ fontSize: 12 }}>{c.comentario || "—"}</span> : (
                            <input className="plan-input" defaultValue={c.comentario || ""} placeholder="Comentário…" onBlur={e => { if (e.target.value !== (c.comentario || "")) { onSetComentario && onSetComentario(c.submission_id, e.target.value); onToast?.({ type: "success", message: "Comentário salvo." }); } }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}/>
                          )}
                        </td>
                        <td className="cell-secondary" style={{ textAlign: "center" }}>{c.total_arquivos || 0}</td>
                      </tr>
                    );})
                    }
                    {divRows.length > divPage && (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: 12 }}>
                        <button className="btn btn-quiet sm" onClick={() => setDivPage(p => p + 50)}>Mostrar mais {Math.min(50, divRows.length - divPage)} de {divRows.length - divPage} restantes</button>
                      </td></tr>
                    )}
                </tbody>
              </table>
            </div>
            {/* Abas de conta no rodapé — igual às abas do Sheets */}
            <div className="plan-tabs">
              {contaAgg.map(row => (
                <button key={row.conta} className={"plan-tab " + (activeConta === row.conta ? "on" : "")} onClick={() => { setDivConta(row.conta); setDivPage(50); }}>{row.conta} <span className="plan-tab-n">{row.total}</span></button>
              ))}
            </div>
          </div>
        )}

        {divOpen && <DividirDemanda checkings={checkings} team={prod.rows.map(r => r.name)} onClose={() => setDivOpen(false)} onAssign={onAssign} onToast={onToast}/>}
      </>) : (<>
        {/* Colaborador: minhas métricas + minha fila */}
        <div className="grid-cols-4 stagger" style={{ marginBottom: "var(--gap)" }}>
          <div className="kpi"><div className="kpi-label">Minha demanda</div><div className="kpi-value"><CountUp value={myStats?.demanda || 0}/></div><div className="kpi-meta">PIs sob minha responsabilidade</div></div>
          <div className="kpi"><div className="kpi-label">Baixei · {periodLabel}</div><div className="kpi-value" style={{ color: "var(--accent)" }}><CountUp value={myStats?.baixados || 0}/></div><div className="kpi-meta"><strong>{myStats?.approved || 0}</strong> aprov. · <strong>{myStats?.rejected || 0}</strong> reprov.</div></div>
          <div className="kpi"><div className="kpi-label">Na minha fila</div><div className="kpi-value" style={{ color: myPending.length ? "var(--warn)" : "var(--ink)" }}><CountUp value={myPending.length}/></div><div className="kpi-meta">aguardando minha baixa</div></div>
          <div className="kpi"><div className="kpi-label">Meu ritmo</div><div className="kpi-value"><CountUp value={myStats?.avgSla || 0} format={v => v.toFixed(1)}/><span className="unit">h</span></div><div className="kpi-meta">SLA médio das minhas baixas</div></div>
        </div>

        {/* Dashboard pessoal do analista */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
          <div className="card">
            <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Minha carga</div><div className="h2">Onde minha fila está parada</div></div><span className="cell-mono muted">{myAging.total} na fila</span></div>
            <div className="card-pad"><LoadAnalysis data={myAging} onPick={() => myPending[0] && onOpenReview(myPending[0])}/></div>
          </div>
          <div className="card">
            <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Meu desempenho</div><div className="h2">Aprovação</div></div></div>
            <div className="card-pad col gap-3" style={{ alignItems: "center" }}>
              <Ring pct={myApprovalRate} size={110} color="var(--accent)" stroke={10}><span style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(myApprovalRate * 100)}<span style={{ fontSize: 13, color: "var(--ink-3)" }}>%</span></span></Ring>
              <div className="row gap-4" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                <span><b style={{ color: "var(--accent)" }}>{myApproved}</b> aprov.</span>
                <span><b style={{ color: "var(--alert)" }}>{myDone.length - myApproved}</b> reprov.</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Meu ritmo · 14 dias</div><div className="h2">Baixas por dia</div></div></div>
            <div className="card-pad col gap-3">
              <AreaSpark data={mySpark} height={84} color="var(--accent)"/>
              <div className="row gap-2" style={{ justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)", borderTop: "1px solid var(--rule)", paddingTop: 10 }}>
                <span>Meu SLA <b style={{ color: (myStats?.avgSla || 0) <= teamAvgSla ? "var(--accent)" : "var(--warn)" }}>{(myStats?.avgSla || 0).toFixed(1)}h</b></span>
                <span>Média do time <b style={{ color: "var(--ink-2)" }}>{teamAvgSla.toFixed(1)}h</b></span>
              </div>
            </div>
          </div>
        </div>

        {myDist.rows.length > 0 && <div className="card" style={{ marginBottom: "var(--gap)" }}>
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Distribuição</div><div className="h2">Minhas demandas por cliente</div></div></div>
          <div className="card-pad"><MultiDonut rows={myDist.rows} total={myDist.total}/></div>
        </div>}
        <div className="card">
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Minha fila</div><div className="h2">{myPending.length} PIs aguardando minha decisão</div></div></div>
          {myPending.length === 0 ? <Empty title="Fila zerada" hint="Você baixou tudo que era seu. Bom trabalho." icon="check"/> : (
            <table className="tbl">
              <thead><tr><th style={{ width: 30 }}/><th>Recebido</th><th>Cliente</th><th>PI</th><th>Veículo</th><th>Arquivos</th><th style={{ width: 40 }}/></tr></thead>
              <tbody>
                {myPending.map((c, i) => (
                  <tr key={c.submission_id} className="row-action row-anim" style={{ animationDelay: (i * 30) + "ms" }} onClick={() => onOpenReview(c)}>
                    <td><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--warn)", display: "inline-block" }}/></td>
                    <td className="cell-time">{H.fmtRelTime(c.submittedAt)}</td>
                    <td style={{ fontWeight: 500 }}>{c.cliente}</td>
                    <td><span className="pi-strong">{c.n_pi}</span></td>
                    <td className="cell-secondary">{c.veiculo}</td>
                    <td className="cell-mono">{c.total_arquivos}</td>
                    <td><span className="row-arrow"><Icon name="arrow_right"/></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>)}
    </div>
  );
}

// Modal de divisão de demanda
// Modal de divisão de demanda — espelha a planilha do Camilo (abas por conta + responsável mensal)
function DividirDemanda({ checkings, team, onClose, onAssign, onToast }) {
  const H = window.H;
  const monthOpts = React.useMemo(() => { const a = []; const now = new Date(); for (let i = 0; i < 3; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); a.push({ v: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) }); } return a; }, []);
  const [mes, setMes] = React.useState(monthOpts[0].v);
  const [mode, setMode] = React.useState("conta");
  const inMonth = (c) => { const d = new Date(c.submittedAt); return `${d.getFullYear()}-${d.getMonth()}` === mes; };
  const poolAll = React.useMemo(() => checkings.filter(c => H.norm(c.status) === "pending" && inMonth(c)), [checkings, mes]);

  // ── Por conta: cada conta (aba) recebe um responsável para o mês ──
  const contasGrupo = React.useMemo(() => {
    const m = {};
    poolAll.forEach(c => { const k = c.conta || c.cliente || "Sem conta"; (m[k] = m[k] || { conta: k, pis: [], pracas: new Set() }).pis.push(c); m[k].pracas.add(c.praca); });
    return Object.values(m).sort((a, b) => b.pis.length - a.pis.length);
  }, [poolAll]);
  const [contaResp, setContaResp] = React.useState({});
  React.useEffect(() => {
    const init = {};
    contasGrupo.forEach(g => { const counts = {}; g.pis.forEach(c => { if (c.assigned_to) counts[c.assigned_to] = (counts[c.assigned_to] || 0) + 1; }); init[g.conta] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ""; });
    setContaResp(init);
  }, [contasGrupo]);
  const contasAtribuidas = contasGrupo.filter(g => contaResp[g.conta]).length;
  const pisAtribuidos = contasGrupo.reduce((s, g) => s + (contaResp[g.conta] ? g.pis.length : 0), 0);

  // ── Equilibrar: divide a fila igualmente entre pessoas ──
  const [people, setPeople] = React.useState(() => team.slice());
  const per = people.length ? Math.floor(poolAll.length / people.length) : 0;
  const resto = people.length ? poolAll.length % people.length : 0;
  const toggle = (name) => setPeople(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  const confirm = () => {
    const map = {};
    if (mode === "conta") {
      contasGrupo.forEach(g => { const r = contaResp[g.conta]; if (r) g.pis.forEach(c => { map[c.submission_id] = r; }); });
      onAssign && onAssign(map);
      onClose();
      onToast?.({ type: "success", message: `${pisAtribuidos} PIs de ${contasAtribuidas} contas atribuídos para o mês.` });
    } else {
      if (!people.length) return;
      poolAll.forEach((c, i) => { map[c.submission_id] = people[i % people.length]; });
      onAssign && onAssign(map);
      onClose();
      onToast?.({ type: "success", message: `${poolAll.length} PIs divididos entre ${people.length} pessoas (~${per} cada).` });
    }
  };

  const userColor = (name) => window.MOCK.users.find(u => u.name === name)?.color || "#0E7490";

  return (<>
    <div className="scrim" onClick={onClose}/>
    <div className="modal content" style={{ width: "min(620px, 95vw)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
      <div className="row" style={{ justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--rule)" }}>
        <div className="col" style={{ gap: 2 }}><div className="eyebrow">Pauta de checking · divisão mensal</div><h3 className="h2">Dividir demanda</h3></div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={15}/></button>
      </div>
      <div className="card-pad col gap-4" style={{ overflowY: "auto" }}>
        <div className="row gap-3">
          <div className="col" style={{ gap: 6, flex: 1 }}>
            <label className="eyebrow" style={{ fontSize: 10 }}>Mês da demanda</label>
            <select className="input" value={mes} onChange={e => setMes(e.target.value)} style={{ textTransform: "capitalize" }}>{monthOpts.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}</select>
          </div>
          <div className="col" style={{ gap: 6, flex: 1 }}>
            <label className="eyebrow" style={{ fontSize: 10 }}>Modo</label>
            <Segmented value={mode} onChange={setMode} options={[{ value: "conta", label: "Por conta" }, { value: "equilibrar", label: "Equilibrar" }]}/>
          </div>
        </div>

        {mode === "conta" ? (<>
          <p className="body-sm" style={{ margin: 0 }}>Cada conta (aba da pauta) recebe um responsável para o mês, como na planilha. Todos os PIs daquela conta ficam travados no login de quem recebeu. Só vale a partir do mês selecionado, sem mexer no que já está em andamento.</p>
          {contasGrupo.length === 0 ? <Empty title="Sem PIs pendentes neste mês" icon="layers"/> : (
            <div className="div-conta-list">
              {contasGrupo.map(g => (
                <div key={g.conta} className={"div-conta-row " + (contaResp[g.conta] ? "set" : "")}>
                  <div className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{g.conta}</span>
                    <span className="body-xs muted">{g.pis.length} PIs · {g.pracas.size} praças</span>
                  </div>
                  <select className="input" value={contaResp[g.conta] || ""} onChange={e => setContaResp(p => ({ ...p, [g.conta]: e.target.value }))} style={{ width: 168, height: 34, flexShrink: 0 }}>
                    <option value="">Sem responsável</option>
                    {team.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </>) : (<>
          <p className="body-sm" style={{ margin: 0 }}>Divide a fila pendente do mês igualmente entre as pessoas selecionadas. Cada PI fica travado no login de quem recebeu.</p>
          <div className="col" style={{ gap: 8 }}>
            <label className="eyebrow" style={{ fontSize: 10 }}>Pessoas ({people.length})</label>
            <div className="row gap-2" style={{ flexWrap: "wrap" }}>
              {team.map(name => (
                <button key={name} className="chip" style={{ cursor: "pointer", opacity: people.includes(name) ? 1 : 0.45 }} onClick={() => toggle(name)}>
                  <Avatar user={{ nome: name, color: userColor(name) }} size={18}/> {name.split(" ")[0]}
                  {people.includes(name) && <Icon name="check" size={11} strokeWidth={2.4} style={{ color: "var(--accent)" }}/>}
                </button>
              ))}
            </div>
          </div>
          <div className="card" style={{ background: "var(--surface-2)", padding: "14px 16px" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="body-sm">{poolAll.length} PIs ÷ {people.length} pessoas</span>
              <span className="cell-mono" style={{ fontWeight: 600 }}>{per}{resto ? ` a ${per + 1}` : ""} por pessoa</span>
            </div>
          </div>
        </>)}
      </div>
      <div className="row gap-3" style={{ justifyContent: "space-between", padding: "14px 22px", borderTop: "1px solid var(--rule)" }}>
        <span className="body-xs muted">{mode === "conta" ? `${contasAtribuidas}/${contasGrupo.length} contas · ${pisAtribuidos} PIs` : `${poolAll.length} PIs no mês`}</span>
        <div className="row gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" disabled={mode === "conta" ? !contasAtribuidas : (!people.length || !poolAll.length)} onClick={confirm}>Confirmar divisão</Button>
        </div>
      </div>
    </div>
  </>);
}
window.ScreenProducao = ScreenProducao;
