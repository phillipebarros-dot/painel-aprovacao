// screen-reports.jsx -> window.ScreenReports
function ScreenReports({ checkings, currentUser, onToast }) {
  const H = window.H;
  const isViewer = currentUser?.role === "viewer";
  const fmt = d => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const [startDate, setStartDate] = React.useState(fmt(new Date(Date.now() - 30 * 86400000)));
  const [endDate, setEndDate] = React.useState(fmt(new Date()));
  const [cliente, setCliente] = React.useState("all");
  const [veiculo, setVeiculo] = React.useState("all");
  const [meio, setMeio] = React.useState("all");
  const [genLoading, setGenLoading] = React.useState(null);

  const clientes = React.useMemo(() => H.extractList(checkings, "cliente"), [checkings]);
  const veiculos = React.useMemo(() => H.extractList(checkings, "veiculo"), [checkings]);

  const rows = React.useMemo(() => checkings.filter(c => (cliente === "all" || c.cliente === cliente) && (meio === "all" || c.meio === meio) && (veiculo === "all" || c.veiculo === veiculo)), [checkings, cliente, meio, veiculo]);
  const localStats = React.useMemo(() => H.computeStats(rows), [rows]);
  const series = React.useMemo(() => H.buildVolumeSeries(rows, 90), [rows]);
  const funnel = React.useMemo(() => H.funnelData(rows), [rows]);
  const submarcas = React.useMemo(() => H.topRanking(rows, "submarca", 6).map(r => ({ ...r, color: "var(--ink)" })), [rows]);
  const byMeio = React.useMemo(() => H.topRanking(rows, "meio", 6).map(r => ({ ...r, color: "var(--accent)" })), [rows]);

  const gen = (kind) => { setGenLoading(kind); setTimeout(() => { setGenLoading(null); onToast?.({ type: "success", message: kind === "pptx" ? "Slides PPTX gerados. Abrindo…" : "PDF exportado com sucesso." }); }, 1600); };

  return (
    <div className="page fade-in">
      <div className="page-head"><div className="col" style={{ gap: 10 }}><div className="eyebrow">Análise · exportação</div><h1 className="display-1">Relatórios</h1></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 32 }}>
        <div className="card" style={{ alignSelf: "start", position: "sticky", top: 20 }}>
          <div className="card-pad">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Configurar relatório</div>
            <div className="col gap-3">
              <div className="col" style={{ gap: 6 }}>
                <label className="eyebrow" style={{ fontSize: 10 }}>Período</label>
                <div className="row gap-2"><input className="input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1 }}/><span className="muted">→</span><input className="input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1 }}/></div>
                <div className="row gap-2" style={{ marginTop: 4, flexWrap: "wrap" }}>
                  {[["7d", 7], ["30d", 30], ["Trimestre", 90], ["Ano", 365]].map(([l, d]) => <button key={l} className="pill pill-neutral" style={{ cursor: "pointer" }} onClick={() => { setStartDate(fmt(new Date(Date.now() - d * 86400000))); setEndDate(fmt(new Date())); }}>{l}</button>)}
                </div>
              </div>
              {[["Cliente", cliente, setCliente, clientes], ["Veículo", veiculo, setVeiculo, veiculos], ["Meio", meio, setMeio, window.MOCK.meios]].map(([lb, val, set, opts]) => (
                <div key={lb} className="col" style={{ gap: 6 }}>
                  <label className="eyebrow" style={{ fontSize: 10 }}>{lb}</label>
                  <select className="input" value={val} onChange={e => set(e.target.value)}><option value="all">Todos os {lb.toLowerCase()}s</option>{opts.map(o => <option key={o}>{o}</option>)}</select>
                </div>
              ))}
            </div>
            <div className="hr" style={{ margin: "20px 0" }}/>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Formato</div>
            <div className="col gap-2">
              <Button variant="primary" icon="upload" disabled={isViewer} loading={genLoading === "pptx"} onClick={() => gen("pptx")}>Gerar slides (PPTX)</Button>
              <Button variant="ghost" icon="download" disabled={isViewer} loading={genLoading === "pdf"} onClick={() => gen("pdf")}>Exportar PDF</Button>
              {isViewer && <div style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 4 }}>Somente visualização</div>}
            </div>
          </div>
          <div style={{ padding: "12px 22px", background: "var(--surface-2)", borderTop: "1px solid var(--rule)", fontSize: 11.5, color: "var(--ink-3)" }}><div className="row gap-2"><Icon name="info" size={13}/><span>Slides via Cloud Function. ~30s.</span></div></div>
        </div>

        <div className="col gap-4">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <div className="col" style={{ gap: 4 }}><div className="eyebrow">Pré-visualização</div><div className="h2">{startDate} → {endDate}</div><div className="muted-2" style={{ fontSize: 13 }}>{H.fmtNum(rows.length)} checkings no recorte</div></div>
            <Pill status="info">Auto-atualizado</Pill>
          </div>
          <div className="grid-cols-4 stagger">
            {[["Total", localStats.total, "var(--ink)"], ["Aprovados", localStats.approved, "var(--accent)"], ["Reprovados", localStats.rejected, "var(--alert)"], ["SLA médio", null, "var(--ink)"]].map(([lb, v, c], i) => (
              <div key={lb} className="kpi" style={{ padding: "18px 20px" }}>
                <div className="kpi-label">{lb}</div>
                <div className="kpi-value" style={{ fontSize: 38, color: c }}>{v != null ? <CountUp value={v}/> : <><CountUp value={localStats.avgSlaHours || 0} format={x => (Number(x) || 0).toFixed(1)}/><span className="unit">h</span></>}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Fluxo no período</div><div className="h2">Volume diário</div></div></div>
            <div style={{ padding: "12px 14px 8px" }}><TrendLine key={rows.length} series={series} height={250}/></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
            <div className="card"><div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Jornada</div><div className="h2">Funil de aprovação</div></div></div><div className="card-pad"><Funnel steps={funnel}/></div></div>
            <div className="card"><div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Distribuição</div><div className="h2">Por meio</div></div></div><div className="card-pad">{byMeio.length ? <RankBars rows={byMeio} total={localStats.total}/> : <Empty title="Sem dados" icon="info"/>}</div></div>
          </div>
          {submarcas.length > 0 && (
            <div className="card"><div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">Distribuição</div><div className="h2">Por submarca</div></div></div><div className="card-pad"><RankBars rows={submarcas} total={localStats.total}/></div></div>
          )}
        </div>
      </div>
    </div>
  );
}
window.ScreenReports = ScreenReports;
