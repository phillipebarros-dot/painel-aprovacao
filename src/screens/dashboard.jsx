// screen-dashboard.jsx -> window.ScreenDashboard
function ScreenDashboard({ stats: globalStats, checkings, auditLog, onOpenReview, onNavigate, loading, onStartTriage, viewMode }) {
  const resumido = viewMode === "resumido";
  const [period, setPeriod] = React.useState("90d");
  const [chartMode, setChartMode] = React.useState("trend");
  const H = window.H;
  const months = React.useMemo(() => H.recentMonths(6), []);
  const isMonth = period.startsWith("m:");
  const monthKey = isMonth ? period.slice(2) : null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 30;
  const periodLabel = isMonth ? (months.find(m => m.value === monthKey)?.label || "mês") : `${days} dias`;

  // Filtrar checkings pelo período selecionado
  const periodCheckings = React.useMemo(() => {
    if (isMonth && monthKey) {
      const [y, m] = monthKey.split("-").map(Number);
      const start = new Date(y, m - 1, 1).getTime();
      const end = new Date(y, m, 1).getTime();
      return checkings.filter(c => c.submittedAt >= start && c.submittedAt < end);
    }
    const cutoff = Date.now() - days * 86400000;
    return checkings.filter(c => c.submittedAt >= cutoff);
  }, [checkings, isMonth, monthKey, days]);

  // Stats filtrados pelo período (KPIs mudam ao trocar mês/período)
  const stats = React.useMemo(() => H.computeStats(periodCheckings), [periodCheckings]);

  const series = React.useMemo(() => isMonth ? H.buildMonthSeries(checkings, monthKey) : H.buildVolumeSeries(checkings, days), [checkings, days, isMonth, monthKey]);
  const last30 = React.useMemo(() => H.buildVolumeSeries(checkings, 30), [checkings]);
  const sparkApp = last30.map(d => ({ v: d.approved }));
  const sparkRej = last30.map(d => ({ v: d.rejected }));
  const sparkPen = last30.map(d => ({ v: d.total }));
  const topVeic = React.useMemo(() => H.topRanking(periodCheckings, "veiculo", 6).map(r => ({ ...r, color: "var(--ink)" })), [periodCheckings]);
  const topClientes = React.useMemo(() => H.topRanking(periodCheckings, "cliente", 5).map(r => ({ ...r, color: "var(--accent)" })), [periodCheckings]);
  const supRating = React.useMemo(() => H.supplierRating(periodCheckings, 6), [periodCheckings]);
  const aging = React.useMemo(() => H.agingBuckets(checkings), [checkings]);
  const distMeio = React.useMemo(() => H.distribution(periodCheckings, "meio", 5), [periodCheckings]);
  const pendingRecent = React.useMemo(() => checkings.filter(c => c.status === "pending").slice(0, 6), [checkings]);
  const heat = React.useMemo(() => H.slaHeatmap(periodCheckings), [periodCheckings]);
  const funnel = React.useMemo(() => H.funnelData(periodCheckings), [periodCheckings]);

  const exportCsv = () => {
    const header = "Status,Cliente,PI,Veículo,Meio,Praça,Arquivos,Recebido,Aprovador\n";
    const rows = checkings.map(c => `"${c.status}","${c.cliente}","${c.n_pi}","${c.veiculo}","${c.meio}","${c.praca}","${c.total_arquivos}","${new Date(c.submittedAt).toLocaleString("pt-BR")}","${c.approval_user}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `dashboard_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  if (loading && checkings.length === 0) return <div className="page fade-in"><Empty title="Carregando dados…" hint="Conectando ao servidor" icon="bolt"/></div>;

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div className="col" style={{ gap: 6, flex: "1 1 340px" }}>
          <div className="eyebrow">Visão operacional</div>
          <h1 className="display-1">{stats.pending} {stats.pending === 1 ? "checking aguarda" : "checkings aguardam"} sua decisão</h1>
        </div>
        <div className="row gap-3" style={{ flex: "0 0 auto" }}>
          <Segmented value={isMonth ? "" : period} onChange={setPeriod} options={[{ value: "7d", label: "7d" }, { value: "30d", label: "30d" }, { value: "90d", label: "90d" }]}/>
          <div className="dash-month-wrap">
            <select className="dash-month" value={isMonth ? period : ""} onChange={e => e.target.value && setPeriod(e.target.value)}>
              <option value="">Mês cheio…</option>
              {months.map(m => <option key={m.value} value={"m:" + m.value}>{m.label}</option>)}
            </select>
          </div>
          <ExportMenu onCsv={exportCsv} onPdf={() => {
            const labels = { pending: "Pendente", approved: "Aprovado", rejected: "Reprovado" };
            H.exportPDF("Resumo operacional", ["Status", "Cliente", "PI", "Veículo", "Meio", "Praça", "Arq.", "Recebido"], checkings.slice(0, 200).map(c => [labels[c.status] || c.status, c.cliente, c.n_pi, c.veiculo, c.meio, c.praca, c.total_arquivos, H.fmtDate(c.submittedAt)]), `${stats.total} checkings`);
          }}/>
          <Button variant="primary" icon="bolt" onClick={() => onStartTriage ? onStartTriage() : onNavigate("approvals")}>Revisar em sequência</Button>
        </div>
      </div>

      {/* Resumido: cockpit compacto */}
      {resumido && (
        <div className="card fade-in" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderBottom: "1px solid var(--rule)" }}>
            {[["Pendentes", stats.pending, "var(--warn)"], ["Aprovados", stats.approved, "var(--accent)"], ["Reprovados", stats.rejected, "var(--alert)"], ["SLA médio", stats.avgSlaHours.toFixed(1) + "h", "var(--ink)"], ["Recebidos hoje", stats.recebidosHoje, "var(--info)"]].map(([l, v, c], i) => (
              <div key={l} style={{ padding: "16px 18px", borderLeft: i ? "1px solid var(--rule)" : "none" }}>
                <div className="kpi-label">{l}</div>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: c, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 14px 4px" }}><div className="eyebrow" style={{ padding: "4px 6px" }}>Volume · {periodLabel}</div><AreaSpark data={series.map(d => ({ v: d.total }))} height={70} color="var(--accent)" animKey={period}/></div>
        </div>
      )}
      {/* KPI Bento */}
      {!resumido && <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: "var(--gap)" }} className="stagger">
        <div className="kpi" style={{ background: "linear-gradient(165deg, #16181d, #0c0d11)", color: "#F5F4EF", border: "none", boxShadow: "var(--shadow-md)" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="kpi-label" style={{ color: "rgba(245,244,239,0.55)" }}>Pendentes agora</div>
            <Pill status="pending">Em fila</Pill>
          </div>
          <div className="kpi-value" style={{ color: "#fff", marginTop: 6, fontSize: 38 }}><CountUp value={stats.pending}/></div>
          <div className="row gap-3" style={{ marginTop: 14, color: "rgba(245,244,239,0.65)", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, whiteSpace: "nowrap" }}><b style={{ color: "#fff" }}>{stats.novos}</b> novos</span>
            <span style={{ width: 4, height: 4, borderRadius: 99, background: "rgba(245,244,239,0.3)" }}/>
            <span style={{ fontSize: 12.5, whiteSpace: "nowrap" }}><b style={{ color: "#fff" }}>{stats.complementos}</b> complementos</span>
            <span style={{ width: 4, height: 4, borderRadius: 99, background: "rgba(245,244,239,0.3)" }}/>
            <span style={{ fontSize: 12.5, whiteSpace: "nowrap" }}><b style={{ color: "#fff" }}>{stats.recebidosHoje}</b> hoje</span>
          </div>
          <div style={{ marginTop: 14 }}><AreaSpark data={sparkPen} height={46} color="#5DD9A1" animKey={period}/></div>
          <div className="eyebrow" style={{ color: "rgba(245,244,239,0.4)", marginTop: 6 }}>volume · últimos 30 dias</div>
        </div>

        <div className="kpi">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="kpi-label">Aprovados</div>
            <Ring pct={stats.taxaAprovacao} size={46} color="var(--accent)" stroke={5}><span style={{ color: "var(--accent)" }}>{stats.taxaAprovacao === 1 ? 100 : Math.min(99.9, Math.round(stats.taxaAprovacao * 1000) / 10)}</span></Ring>
          </div>
          <div className="kpi-value"><CountUp value={stats.approved}/></div>
          <div className="kpi-meta"><strong>{H.fmtPct(stats.taxaAprovacao)}</strong> de taxa de aprovação</div>
          <div style={{ marginTop: 10, height: 34 }}><AreaSpark data={sparkApp} height={34} color="var(--accent)"/></div>
        </div>

        <div className="kpi">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="kpi-label">Reprovados</div>
            <Ring pct={1 - stats.taxaAprovacao} size={46} color="var(--alert)" stroke={5}><span style={{ color: "var(--alert)" }}>{stats.taxaAprovacao === 0 ? 100 : Math.min(99.9, Math.round((1 - stats.taxaAprovacao) * 1000) / 10)}</span></Ring>
          </div>
          <div className="kpi-value"><CountUp value={stats.rejected}/></div>
          <div className="kpi-meta"><strong>{stats.resolved}</strong> decididos no total</div>
          <div style={{ marginTop: 10, height: 34 }}><AreaSpark data={sparkRej} height={34} color="var(--alert)"/></div>
        </div>

        <div className="kpi">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="kpi-label">SLA médio</div>
            <Ring pct={Math.min(1, 4 / (stats.avgSlaHours || 1))} size={46} color={stats.avgSlaHours <= 4 ? "var(--accent)" : "var(--warn)"} stroke={5}><Icon name="clock" size={15}/></Ring>
          </div>
          <div className="kpi-value"><CountUp value={stats.avgSlaHours} format={v => v.toFixed(1)}/><span className="unit">h</span></div>
          <div className="kpi-meta">meta <strong>4h</strong> · <span style={{ color: stats.slaCompliance >= 0.7 ? "var(--accent)" : "var(--warn)" }}>{H.fmtPct(stats.slaCompliance)} dentro</span></div>
          <div style={{ marginTop: 14, height: 4, borderRadius: 99, background: "var(--surface-3)", position: "relative" }}>
            <div className="rank-fill" style={{ width: `${Math.min(100, (4 / (stats.avgSlaHours || 1)) * 100)}%`, height: "100%", borderRadius: 99, background: stats.avgSlaHours <= 4 ? "var(--accent)" : "var(--warn)" }}/>
          </div>
        </div>
      </div>}

      {/* Charts row: trend/volume + donut */}
      {!resumido && <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--gap)", marginTop: "var(--gap)" }}>
        <div className="card">
          <div className="card-head">
            <div className="col" style={{ gap: 2 }}><div className="eyebrow">Fluxo · {periodLabel}</div><div className="h2">Volume de checkings por dia</div></div>
            <div className="row gap-3">
              <Segmented value={chartMode} onChange={setChartMode} options={[{ value: "trend", label: "Tendência" }, { value: "stacked", label: "Empilhado" }]}/>
            </div>
          </div>
          <div style={{ padding: "12px 14px 8px", position: "relative" }}>
            {chartMode === "trend" ? <TrendLine key={period} series={series} height={300}/> : <VolumeChart key={period + "s"} series={series} height={300}/>}
            {chartMode === "stacked" && (
              <div className="row gap-4" style={{ padding: "0 8px 8px", fontSize: 12, color: "var(--ink-2)" }}>
                <span className="row gap-2"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }}/>Aprovado</span>
                <span className="row gap-2"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--alert)" }}/>Reprovado</span>
                <span className="row gap-2"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--warn)" }}/>Pendente</span>
              </div>
            )}
          </div>
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Decisão</div><div className="h2">Taxa de aprovação</div></div><span className="cell-mono muted">{stats.resolved} decididos</span></div>
          <div className="card-pad row gap-6" style={{ alignItems: "center", flex: 1 }}>
            <Donut value={stats.approved} total={stats.approved + stats.rejected} size={150} label="aprovação"/>
            <div className="col gap-4" style={{ flex: 1, fontSize: 13 }}>
              {[["Aprovado", stats.approved, "var(--accent)", stats.taxaAprovacao], ["Reprovado", stats.rejected, "var(--alert)", 1 - stats.taxaAprovacao]].map(([lb, v, c, p]) => (
                <div key={lb} className="col" style={{ gap: 6 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}><span className="row gap-2"><span style={{ width: 6, height: 6, borderRadius: 99, background: c }}/>{lb}</span><b className="tabular">{v}</b></div>
                  <div className="rank-track"><div className="rank-fill" style={{ width: `${p * 100}%`, background: c }}/></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--rule)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[["Pendentes", H.fmtNum(stats.pending), "var(--warn)"], ["SLA no prazo", H.fmtPct(stats.slaCompliance), stats.slaCompliance >= 0.7 ? "var(--accent)" : "var(--warn)"], ["Reincid.", H.fmtNum(checkings.filter(c => c.rejection_count > 0).length), "var(--ink)"]].map(([lb, v, c], i) => (
              <div key={lb} style={{ padding: "15px 14px", borderLeft: i ? "1px solid var(--rule)" : "none", textAlign: "center" }}>
                <div className="tabular" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", color: c }}>{v}</div>
                <div className="eyebrow" style={{ marginTop: 4 }}>{lb}</div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {/* New viz row: SLA heatmap + funnel + calendar */}
      {!resumido && <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: "var(--gap)", marginTop: "var(--gap)" }}>
        <div className="card">
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Performance</div><div className="h2">Heatmap de SLA</div></div><span className="cell-mono muted">dia × hora</span></div>
          <div className="card-pad"><SlaHeatmap data={heat}/></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Jornada</div><div className="h2">Funil de aprovação</div></div><span className="cell-mono muted">{H.fmtNum(stats.total)} PIs enviados</span></div>
          <div className="card-pad"><Funnel steps={funnel}/></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Entrada</div><div className="h2">Recebidos no mês</div></div></div>
          <div className="card-pad"><MiniCalendar checkings={checkings}/></div>
        </div>
      </div>}

      {/* Análise de carga + distribuição (inspirado na Atera) */}
      {!resumido && <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "var(--gap)", marginTop: "var(--gap)" }}>
        <div className="card">
          <div className="card-head">
            <div className="col" style={{ gap: 2 }}><div className="eyebrow">Análise de carga · fila pendente</div><div className="h2">Onde os checkings estão parados</div></div>
            <span className="cell-mono muted">{aging.total} na fila</span>
          </div>
          <div className="card-pad"><LoadAnalysis data={aging} onPick={() => onNavigate("approvals")}/></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Distribuição</div><div className="h2">Checkings por meio</div></div></div>
          <div className="card-pad">{distMeio.rows.length ? <MultiDonut rows={distMeio.rows} total={distMeio.total}/> : <Empty title="Sem dados" icon="info"/>}</div>
        </div>
      </div>}

      {/* Rankings + activity */}
      {!resumido && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: "var(--gap)", marginTop: "var(--gap)" }}>
        <div className="card">
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Ranking</div><div className="h2">Top veículos</div></div><span className="cell-mono muted">{stats.veiculosDistintos} distintos</span></div>
          <div className="card-pad">{topVeic.length ? <RankBars rows={topVeic} total={stats.total}/> : <Empty title="Sem dados" icon="info"/>}</div>
        </div>
        <div className="card">
          <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Ranking</div><div className="h2">Top anunciantes</div></div><span className="cell-mono muted">{stats.clientesDistintos} distintos</span></div>
          <div className="card-pad">{topClientes.length ? <RankBars rows={topClientes} total={stats.total}/> : <Empty title="Sem dados" icon="info"/>}</div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="col" style={{ gap: 2 }}><div className="eyebrow">Atividade · ao vivo</div><div className="h2">Log de operações</div></div>
            <div className="row gap-2"><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)", boxShadow: "0 0 0 4px var(--accent-soft)" }}/><span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>tempo real</span></div>
          </div>
          <div style={{ maxHeight: 332, overflowY: "auto" }}>
            {auditLog.length === 0 && <Empty title="Nenhuma atividade recente" icon="info"/>}
            {auditLog.map((row, i) => (
              <div key={row.id || i} style={{ display: "flex", gap: 12, padding: "12px 24px", borderBottom: i === auditLog.length - 1 ? "none" : "1px solid var(--rule)" }}>
                <Avatar user={{ nome: row.user_name, color: "#0E7490" }} size={26}/>
                <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}><b style={{ fontWeight: 500 }}>{(row.user_name || "Sistema").split(" ")[0]}</b> <span className="muted-2">{row.verb}</span> <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{row.target_pi}</span></div>
                  <div className="row gap-2" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                    <Pill status={row.status === "approved" ? "approved" : "rejected"}>{row.status === "approved" ? "+1 aprovado" : "+1 reprovado"}</Pill>
                    <span style={{ fontFamily: "var(--font-mono)" }}>· {H.fmtRelTime(row.ts)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {/* Ranking de fornecedores por avaliação */}
      {!resumido && supRating.length > 0 && <div className="card" style={{ marginTop: "var(--gap)" }}>
        <div className="card-head">
          <div className="col" style={{ gap: 2 }}><div className="eyebrow">Qualidade · avaliação interna</div><div className="h2">Ranking de fornecedores por estrelas</div></div>
          <span className="cell-mono muted">média ponderada · aprovação + reincidência + nota</span>
        </div>
        <div className="card-pad" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {supRating.map((s, i) => (
            <div key={s.label} className="sup-rank-row" style={{ animation: "rowIn 380ms var(--ease-out) both", animationDelay: (i * 40) + "ms" }}>
              <span className="sup-rank-pos">{i + 1}</span>
              <div className="col" style={{ gap: 3, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                <div className="row gap-2" style={{ alignItems: "center" }}>
                  {s.stars != null ? <>
                    <span className="sup-stars">{[1, 2, 3, 4, 5].map(n => <Icon key={n} name="star" size={13} style={{ color: n <= Math.round(s.stars) ? "var(--warn)" : "var(--ink-4)", fill: n <= Math.round(s.stars) ? "var(--warn)" : "none" }}/>)}</span>
                    <span className="cell-mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.stars.toFixed(1)}</span>
                  </> : <span style={{ fontSize: 11.5, color: "var(--ink-4)", fontStyle: "italic" }}>Sem avaliação</span>}
                </div>
              </div>
              <div className="col" style={{ alignItems: "flex-end", gap: 2 }}>
                <span className="cell-mono" style={{ fontSize: 12 }}>{s.total} PIs</span>
                {s.reinc > 0 && <span className="body-xs" style={{ color: "var(--warn)", fontSize: 11 }}>{s.reinc} reenvios</span>}
              </div>
            </div>
          ))}
        </div>
      </div>}
      {pendingRecent.length > 0 && (
        <div className="card" style={{ marginTop: "var(--gap)" }}>
          <div className="card-head">
            <div className="col" style={{ gap: 2 }}><div className="eyebrow">Fila prioritária</div><div className="h2">{stats.pending} checkings aguardando decisão</div></div>
            <Button variant="ghost" size="sm" iconRight="arrow_right" onClick={() => onNavigate("approvals")}>Ver todas</Button>
          </div>
          <table className="tbl">
            <thead><tr><th style={{ width: 30 }}/><th>Recebido</th><th>Cliente</th><th>PI</th><th>Veículo</th><th>Meio</th><th>Arquivos</th><th style={{ width: 40 }}/></tr></thead>
            <tbody>
              {pendingRecent.map((c, i) => (
                <tr key={c.submission_id} className="row-action row-anim" style={{ animationDelay: (i * 40) + "ms" }} onClick={() => onOpenReview(c)}>
                  <td><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--warn)", display: "inline-block" }}/></td>
                  <td className="cell-time">{H.fmtRelTime(c.submittedAt)} <span style={{ color: "var(--ink-4)" }}>· {H.fmtTime(c.submittedAt)}</span></td>
                  <td style={{ fontWeight: 500 }}>{c.cliente} {c.is_complement === 1 && <span className="pill pill-info" style={{ marginLeft: 6 }}>compl</span>}</td>
                  <td className="cell-pi">{c.n_pi}</td>
                  <td>{c.veiculo}</td>
                  <td className="cell-secondary">{c.meio}</td>
                  <td className="cell-mono">{c.total_arquivos}</td>
                  <td><span className="row-arrow"><Icon name="arrow_right"/></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
window.ScreenDashboard = ScreenDashboard;
