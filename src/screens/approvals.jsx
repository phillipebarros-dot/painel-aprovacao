// screen-approvals.jsx -> window.ScreenApprovals
// Status de checking (coluna Status da pauta do Camilo) com as cores oficiais da planilha
const CHECK_STATUS = { "Solicitado": "#6d5a93", "Em revisão": "#1163e3", "Divergência": "#e0202c", "Não recebido": "#ff7100", "Ok": "#0a7a2e" };
const CHECK_STATUS_LIST = ["Solicitado", "Em revisão", "Divergência", "Não recebido", "Ok"];
function ScreenApprovals({ currentUser, checkings, stats, onOpenReview, onRefresh, onToast, onDecide, onStartTriage, viewMode, onSetCheckStatus, onSetComentario, onSetResponsavel }) {
  const H = window.H;
  const isViewer = currentUser?.role === "viewer";
  const [copilotOn, setCopilotOn] = React.useState(() => localStorage.getItem("painel_copilot") !== "off");
  const view = viewMode || "table";
  const [tab, setTab] = React.useState("pending");
  const [search, setSearch] = React.useState("");
  const [filterClient, setFilterClient] = React.useState("all");
  const [filterMeio, setFilterMeio] = React.useState("all");
  const [sort, setSort] = React.useState({ key: "submittedAt", dir: "desc" });
  const [selected, setSelected] = React.useState(new Set());
  const [page, setPage] = React.useState(0);
  const [compareMode, setCompareMode] = React.useState(false);
  const [picks, setPicks] = React.useState([]);
  const [saved, setSaved] = React.useState(() => { try { return JSON.parse(localStorage.getItem("painel_saved_filters") || "[]"); } catch { return []; } });
  const [planAccount, setPlanAccount] = React.useState("all");
  const perPage = view === "cards" ? 12 : 15;

  const clientes = React.useMemo(() => H.extractList(checkings, "cliente"), [checkings]);
  const contas = React.useMemo(() => {
    const m = {}; checkings.forEach(c => { if (c.conta) m[c.conta] = (m[c.conta] || 0) + 1; });
    return Object.keys(m).sort().map(k => ({ name: k, count: m[k] }));
  }, [checkings]);
  const team = React.useMemo(() => (window.MOCK?.users || []).filter(u => u.role !== "viewer").map(u => u.nome || u.name), []);

  const filtered = React.useMemo(() => {
    let rows = checkings.slice();
    if (tab !== "all") rows = rows.filter(r => r.status === tab);
    if (search) { const q = search.toLowerCase(); rows = rows.filter(r => r.cliente?.toLowerCase().includes(q) || r.n_pi?.toLowerCase().includes(q) || r.veiculo?.toLowerCase().includes(q) || r.praca?.toLowerCase().includes(q)); }
    if (filterClient !== "all") rows = rows.filter(r => r.cliente === filterClient);
    if (filterMeio !== "all") rows = rows.filter(r => r.meio === filterMeio);
    if (view === "planilha" && planAccount !== "all") rows = rows.filter(r => r.conta === planAccount);
    const dir = sort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let va = a[sort.key], vb = b[sort.key];
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
      if (va < vb) return -dir; if (va > vb) return dir; return 0;
    });
    return rows;
  }, [checkings, tab, search, filterClient, filterMeio, sort, view, planAccount]);

  React.useEffect(() => { setPage(0); setSelected(new Set()); }, [tab, search, filterClient, filterMeio, viewMode]);

  const pageRows = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const tabCounts = { all: checkings.length, pending: stats.pending, approved: stats.approved, rejected: stats.rejected };

  const activeChips = [];
  if (search) activeChips.push({ k: "search", label: "Busca", val: search, clear: () => setSearch("") });
  if (filterClient !== "all") activeChips.push({ k: "client", label: "Cliente", val: filterClient, clear: () => setFilterClient("all") });
  if (filterMeio !== "all") activeChips.push({ k: "meio", label: "Meio", val: filterMeio, clear: () => setFilterMeio("all") });

  const toggleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  const toggleSel = (id) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
  const toggleAll = () => {
    if (pageRows.every(r => selected.has(r.submission_id))) { const n = new Set(selected); pageRows.forEach(r => n.delete(r.submission_id)); setSelected(n); }
    else { const n = new Set(selected); pageRows.forEach(r => n.add(r.submission_id)); setSelected(n); }
  };

  const onRowClick = (c) => {
    if (compareMode) {
      setPicks(p => p.find(x => x.submission_id === c.submission_id) ? p.filter(x => x.submission_id !== c.submission_id) : (p.length >= 2 ? [p[1], c] : [...p, c]));
    } else onOpenReview(c);
  };

  const saveFilter = () => {
    if (!activeChips.length && tab === "all") { onToast?.({ type: "info", message: "Defina filtros antes de salvar." }); return; }
    const name = prompt("Nome do filtro salvo:", `${tab !== "all" ? tab : ""} ${filterClient !== "all" ? filterClient : ""} ${filterMeio !== "all" ? filterMeio : ""}`.trim() || "Filtro");
    if (!name) return;
    const f = { id: Date.now(), name, tab, filterClient, filterMeio, search };
    const next = [...saved, f]; setSaved(next); localStorage.setItem("painel_saved_filters", JSON.stringify(next));
    onToast?.({ type: "success", message: `Filtro "${name}" salvo.` });
  };
  const applyFilter = (f) => { setTab(f.tab); setFilterClient(f.filterClient); setFilterMeio(f.filterMeio); setSearch(f.search || ""); };
  const delFilter = (id) => { const next = saved.filter(f => f.id !== id); setSaved(next); localStorage.setItem("painel_saved_filters", JSON.stringify(next)); };

  const bulkApprove = () => {
    const who = currentUser.nome || currentUser.name;
    const ids = [...selected];
    ids.forEach(id => window.PainelAPI?.approve(id, who).catch(e => onToast?.({ type: "error", message: `Falha ao aprovar ${id}: ${e.message || ""}` })));
    onToast?.({ type: "success", message: `${ids.length} checkings aprovados em lote.` });
    setSelected(new Set()); onRefresh?.();
  };
  const bulkReject = () => {
    const r = prompt("Motivo da reprovação em lote:"); if (!r) return;
    const who = currentUser.nome || currentUser.name;
    const ids = [...selected];
    ids.forEach(id => window.PainelAPI?.reject(id, who, r).catch(e => onToast?.({ type: "error", message: `Falha ao reprovar ${id}: ${e.message || ""}` })));
    onToast?.({ type: "success", message: `${ids.length} checkings reprovados.` });
    setSelected(new Set()); onRefresh?.();
  };

  const exportPdf = () => {
    const cols = ["Status", "Cliente", "PI", "Veículo", "Meio", "Praça", "Arq.", "Recebido", "Responsável"];
    const labels = { pending: "Pendente", approved: "Aprovado", rejected: "Reprovado" };
    const rows = filtered.map(c => [labels[c.status] || c.status, c.cliente, c.n_pi, c.veiculo, c.meio, c.praca, c.total_arquivos, H.fmtDate(c.submittedAt), c.approval_user || "-"]);
    H.exportPDF("Aprovações", cols, rows, `Filtro: ${tab === "all" ? "todos" : tab}`);
  };
  const exportCsv = () => {
    const header = "Status,Cliente,PI,Veículo,Meio,Praça,Arquivos,Recebido,Aprovador\n";
    const rows = filtered.map(c => `"${c.status}","${c.cliente}","${c.n_pi}","${c.veiculo}","${c.meio}","${c.praca}","${c.total_arquivos}","${new Date(c.submittedAt).toLocaleString("pt-BR")}","${c.approval_user}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `aprovacoes_${tab}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const SortHead = ({ k, children, style }) => (
    <th className={"sortable " + (sort.key === k ? "sorted " + sort.dir : "")} style={style} onClick={() => toggleSort(k)}>
      {children}<span className="sort-ico"><Icon name="arrow_up" size={11} strokeWidth={2}/></span>
    </th>
  );
  const statusColor = (s) => s === "pending" ? "var(--warn)" : s === "approved" ? "var(--accent)" : "var(--alert)";

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div className="col" style={{ gap: 10 }}><div className="eyebrow">Fila de aprovação</div><h1 className="display-1">Aprovações</h1></div>
        <div className="row gap-3">
          {!isViewer && tab === "pending" && stats.pending > 0 && onStartTriage && <Button variant="accent" icon="bolt" onClick={onStartTriage}>Revisar em sequência</Button>}
          {!isViewer && <Button variant={compareMode ? "accent" : "ghost"} icon="columns" onClick={() => { setCompareMode(m => !m); setPicks([]); }}>{compareMode ? "Comparando" : "Comparar"}</Button>}
          <ExportMenu onCsv={exportCsv} onPdf={exportPdf}/>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[{ v: "all", label: "Todos" }, { v: "pending", label: "Pendentes", badge: true }, { v: "approved", label: "Aprovados" }, { v: "rejected", label: "Reprovados" }].map(t => (
          <button key={t.v} className={"tab-btn " + (tab === t.v ? "on" : "")} onClick={() => setTab(t.v)}>
            {t.label} <NumDot n={tabCounts[t.v]} accent={t.badge && tabCounts[t.v] > 0}/>
          </button>
        ))}
      </div>

      {!isViewer && copilotOn && (tab === "pending" || tab === "all") && stats.pending > 0 && (
        <AutoTriagePanel checkings={checkings} onStartTriage={onStartTriage} onOpenReview={onOpenReview} onToast={onToast}/>
      )}

      {/* Toolbar */}
      <div className="row gap-3" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Cliente, PI, veículo ou praça…" style={{ flex: "1 1 260px", maxWidth: 340 }}/>
        <select className="input" value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ width: "auto" }}>
          <option value="all">Todos os clientes</option>{clientes.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input" value={filterMeio} onChange={e => setFilterMeio(e.target.value)} style={{ width: "auto" }}>
          <option value="all">Todos os meios</option>{window.MOCK.meios.map(m => <option key={m}>{m}</option>)}
        </select>
        <Button variant="ghost" size="sm" icon="bolt" onClick={saveFilter}>Salvar filtro</Button>
        <button className={"btn sm " + (copilotOn ? "btn-ghost" : "btn-quiet")} onClick={() => { const n = !copilotOn; setCopilotOn(n); localStorage.setItem("painel_copilot", n ? "on" : "off"); }} title="Mostrar score do co-piloto"><Icon name="target"/>Co-piloto {copilotOn ? "on" : "off"}</button>
        <div className="spacer"/>
        <span className="row gap-2" style={{ fontSize: 12.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}><Icon name="info" size={13}/> {H.fmtNum(filtered.length)} resultados</span>
      </div>

      {/* Active filter chips + saved */}
      {(activeChips.length > 0 || saved.length > 0) && (
        <div className="row gap-2" style={{ marginBottom: 14, flexWrap: "wrap" }}>
          {activeChips.map(c => (
            <span key={c.k} className="chip">{c.label}: <b>{c.val}</b><span className="chip-x" onClick={c.clear}><Icon name="x" size={11} strokeWidth={2}/></span></span>
          ))}
          {activeChips.length > 0 && <button className="btn-quiet sm btn" onClick={() => { setSearch(""); setFilterClient("all"); setFilterMeio("all"); }}>Limpar tudo</button>}
          {saved.length > 0 && <div className="divider-v" style={{ margin: "0 4px" }}/>}
          {saved.map(f => (
            <span key={f.id} className="chip" style={{ background: "var(--info-soft)", borderColor: "rgba(37,99,235,0.2)", cursor: "pointer" }} onClick={() => applyFilter(f)}>
              <Icon name="bolt" size={11}/> {f.name}<span className="chip-x" onClick={(e) => { e.stopPropagation(); delFilter(f.id); }}><Icon name="x" size={11} strokeWidth={2}/></span>
            </span>
          ))}
        </div>
      )}

      {/* Compare bar */}
      {compareMode && (
        <div className="bulk-bar row gap-3" style={{ padding: "12px 16px", background: "var(--info-soft)", border: "1px solid rgba(37,99,235,0.25)", borderRadius: 11, marginBottom: 14 }}>
          <Icon name="columns" size={16} style={{ color: "var(--info)" }}/>
          <span style={{ fontSize: 13 }}>Selecione <b>2 checkings</b> para comparar lado a lado · {picks.length}/2</span>
          {picks.map(p => <span key={p.submission_id} className="chip">{p.cliente} <span className="chip-x" onClick={() => setPicks(picks.filter(x => x !== p))}><Icon name="x" size={11}/></span></span>)}
          <div className="spacer"/>
          <button className="btn-quiet sm btn" onClick={() => { setCompareMode(false); setPicks([]); }}>Cancelar</button>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && !isViewer && !compareMode && (
        <div className="bulk-bar row gap-3" style={{ padding: "12px 16px", background: "linear-gradient(180deg,#16181d,#0c0d11)", color: "#F5F4EF", borderRadius: 11, marginBottom: 14 }}>
          <span style={{ fontSize: 13 }}><b className="tabular">{selected.size}</b> selecionados</span>
          <div className="divider-v" style={{ background: "rgba(245,244,239,0.2)" }}/>
          <button className="btn btn-accent sm" onClick={bulkApprove}><Icon name="check"/>Aprovar em lote</button>
          <button className="btn sm" style={{ background: "transparent", color: "#F5F4EF", borderColor: "rgba(245,244,239,0.3)" }} onClick={bulkReject}><Icon name="x"/>Reprovar em lote</button>
          <div className="spacer"/>
          <button className="btn-quiet sm btn" style={{ color: "rgba(245,244,239,0.7)" }} onClick={() => setSelected(new Set())}>Limpar</button>
        </div>
      )}

      {/* TABLE view */}
      {view === "table" && (
        <div className="card">
          {pageRows.length === 0 ? <Empty title="Nenhum checking encontrado" hint="Ajuste os filtros" icon="search"/> : (
            <table className="tbl">
              <thead><tr>
                {!isViewer && !compareMode && <th style={{ width: 38, paddingLeft: 18 }}><button onClick={toggleAll} className={"checkbox " + (pageRows.length && pageRows.every(r => selected.has(r.submission_id)) ? "on" : "")}>{pageRows.length && pageRows.every(r => selected.has(r.submission_id)) && <Icon name="check" size={10} strokeWidth={2.2}/>}</button></th>}
                <th style={{ width: 54 }}>Status</th>
                <SortHead k="submittedAt">Recebido</SortHead>
                <SortHead k="cliente">Cliente</SortHead>
                <SortHead k="n_pi">PI</SortHead>
                <SortHead k="veiculo">Veículo</SortHead>
                <SortHead k="meio">Meio</SortHead>
                <SortHead k="praca">Praça</SortHead>
                <SortHead k="total_arquivos" style={{ width: 70, textAlign: "right" }}>Arq.</SortHead>
                {copilotOn && <th style={{ width: 96 }}>Confiança</th>}
                <th style={{ width: 130 }}>Responsável</th>
                {!isViewer && !compareMode && <th style={{ width: 150 }}/>}
                <th style={{ width: 40 }}/>
              </tr></thead>
              <tbody>
                {pageRows.map((c, i) => {
                  const isSel = selected.has(c.submission_id);
                  const isPick = picks.find(p => p.submission_id === c.submission_id);
                  return (
                    <tr key={c.submission_id} className={"row-action row-anim " + (isSel ? "is-selected " : "") + (isPick ? "compare-pick" : "")} style={{ animationDelay: (i * 22) + "ms" }} onClick={() => onRowClick(c)}>
                      {!isViewer && !compareMode && <td onClick={(e) => { e.stopPropagation(); toggleSel(c.submission_id); }} style={{ paddingLeft: 18 }}><button className={"checkbox " + (isSel ? "on" : "")}>{isSel && <Icon name="check" size={10} strokeWidth={2.2}/>}</button></td>}
                      <td><span title={c.status} style={{ width: 8, height: 8, borderRadius: 99, display: "inline-block", background: statusColor(c.status) }}/></td>
                      <td className="cell-time">{H.fmtRelTime(c.submittedAt)} <span style={{ color: "var(--ink-4)" }}>· {H.fmtTime(c.submittedAt)}</span></td>
                      <td style={{ fontWeight: 500 }}>{c.cliente}{c.is_complement === 1 && <span className="pill pill-info" style={{ marginLeft: 6 }}>compl</span>}{c.rejection_count > 0 && c.status !== "approved" && <span className="pill pill-rejected" style={{ marginLeft: 6 }}>×{c.rejection_count + 1}</span>}</td>
                      <td className="cell-pi"><span className="row gap-2" style={{ alignItems: "center" }}><PubliFlag sit={c.sit_publi} compact/>{c.n_pi}</span></td>
                      <td>{c.veiculo}</td>
                      <td className="cell-secondary">{c.meio}</td>
                      <td className="cell-secondary" style={{ fontSize: 12 }}>{c.praca}</td>
                      <td className="cell-mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{c.total_arquivos}</td>
                      {copilotOn && <td>{c.status === "pending" ? <CopilotBadge checking={c} size="sm"/> : <span className="muted" style={{ fontSize: 12 }}>·</span>}</td>}
                      <td>{c.approval_user ? <div className="row gap-2"><Avatar user={{ nome: c.approval_user, color: "#0E7490" }} size={22}/><span className="cell-secondary" style={{ fontSize: 12.5 }}>{c.approval_user.split(" ")[0]}</span></div> : <span className="row gap-2" style={{ fontSize: 12, color: "var(--ink-4)" }}><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--warn)", display: "inline-block", opacity: 0.6 }}/>Pendente</span>}</td>
                      {!isViewer && !compareMode && <td onClick={(e) => e.stopPropagation()}>{c.status === "pending" ? <div className="row gap-2 inline-act"><button className="btn btn-accent sm" title="Aprovar" onClick={() => onDecide(c, "approve")}><Icon name="check"/></button><button className="btn btn-ghost sm" title="Reprovar" onClick={() => { const r = prompt("Motivo da reprovação:"); if (r) onDecide(c, "reject", r); }}><Icon name="x"/></button></div> : null}</td>}
                      <td><span className="row-arrow"><Icon name={compareMode ? "plus" : "arrow_right"}/></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <Pager page={page} totalPages={totalPages} filtered={filtered} perPage={perPage} setPage={setPage}/>
        </div>
      )}



      {/* CARDS view */}
      {view === "cards" && (
        pageRows.length === 0 ? <div className="card"><Empty title="Nenhum checking encontrado" hint="Ajuste os filtros" icon="search"/></div> : (<>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
            {pageRows.map((c, i) => {
              const isPick = picks.find(p => p.submission_id === c.submission_id);
              return (
                <div key={c.submission_id} className={"check-card " + (isPick ? "is-selected" : "")} style={{ animationDelay: (i * 30) + "ms" }} onClick={() => onRowClick(c)}>
                  <div className="check-card-top">
                    <Pill status={c.status}/>
                    <span className="check-time">{H.fmtRelTime(c.submittedAt)}</span>
                  </div>
                  <div className="check-client">{c.cliente}{c.is_complement === 1 && <span className="pill pill-info" style={{ marginLeft: 8, verticalAlign: "middle" }}>compl</span>}</div>
                  <div className="check-pi"><span className="cell-pi">{c.n_pi}</span> · {c.veiculo}</div>
                  <div className="check-meta">{c.meio} · {c.praca} · {c.total_arquivos} arquivos</div>
                  {copilotOn && c.status === "pending" && (() => {
                    const s = window.AI.copilotScore(c);
                    const col = s.level === "high" ? "var(--accent)" : s.level === "mid" ? "var(--warn)" : "var(--alert)";
                    return (
                      <div className="check-conf">
                        <div className="check-conf-row"><span>Confiança do co-piloto</span><b style={{ color: col }}>{s.conf}%</b></div>
                        <div className="rank-track"><div className="rank-fill" style={{ width: s.conf + "%", background: col }}/></div>
                      </div>
                    );
                  })()}
                  {!isViewer && !compareMode && c.status === "pending" && (
                    <div className="check-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-accent sm" style={{ flex: 1 }} onClick={() => onDecide(c, "approve")}><Icon name="check"/>Aprovar</button>
                      <button className="btn btn-ghost sm" onClick={() => { const r = prompt("Motivo da reprovação:"); if (r) onDecide(c, "reject", r); }}><Icon name="x"/>Reprovar</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="card" style={{ marginTop: 14 }}><Pager page={page} totalPages={totalPages} filtered={filtered} perPage={perPage} setPage={setPage}/></div>
        </>)
      )}

      {/* KANBAN view */}
      {view === "kanban" && (
        <div className="kanban">
          {[["pending", "Pendentes", "var(--warn)"], ["approved", "Aprovados", "var(--accent)"], ["rejected", "Reprovados", "var(--alert)"]].map(([st, label, col]) => {
            const colRows = filtered.filter(c => c.status === st);
            return (
              <div key={st} className="kanban-col" onDragOver={(e) => { if (!isViewer) { e.preventDefault(); e.currentTarget.classList.add("kanban-over"); } }} onDragLeave={(e) => e.currentTarget.classList.remove("kanban-over")} onDrop={(e) => {
                e.preventDefault(); e.currentTarget.classList.remove("kanban-over");
                const id = e.dataTransfer.getData("text/plain"); const c = checkings.find(x => x.submission_id === id);
                if (!c || isViewer || c.status === st) return;
                if (st === "rejected") { const rr = prompt("Motivo da reprovação:"); if (rr) onDecide(c, "reject", rr); }
                else if (st === "approved") onDecide(c, "approve");
                else onDecide(c, "revert");
              }}>
                <div className="kanban-col-head">
                  <span className="row gap-2" style={{ alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 99, background: col }}/><span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span></span>
                  <span className="numdot">{colRows.length}</span>
                </div>
                <div className="kanban-col-body">
                  {colRows.length === 0 && <div className="kanban-empty">Vazio</div>}
                  {colRows.slice(0, 40).map((c, i) => (
                    <div key={c.submission_id} className="kanban-card" draggable={!isViewer} onDragStart={(e) => e.dataTransfer.setData("text/plain", c.submission_id)} style={{ animationDelay: (i * 18) + "ms" }} onClick={() => onRowClick(c)}>
                      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                        <span className="pi-strong" style={{ fontSize: 12 }}>{c.n_pi}</span>
                        <span className="check-time">{H.fmtRelTime(c.submittedAt)}</span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{c.cliente}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{c.veiculo} · {c.meio}</div>
                      <div className="row gap-2" style={{ marginTop: 9, alignItems: "center" }}>
                        {st === "pending" && copilotOn && (() => { const s = window.AI.copilotScore(c); const cc = s.level === "high" ? "var(--accent)" : s.level === "mid" ? "var(--warn)" : "var(--alert)"; return <span className="copilot-chip" style={{ background: "transparent", color: cc, padding: 0 }}><span className="copilot-dot" style={{ background: cc }}/>{s.conf}%</span>; })()}
                        {c.approval_user && st !== "pending" && <span className="row gap-2" style={{ fontSize: 11.5, color: "var(--ink-3)" }}><Avatar user={{ nome: c.approval_user, color: "#0E7490" }} size={18}/>{c.approval_user.split(" ")[0]}</span>}
                        <span className="spacer"/>
                        {!isViewer && st === "pending" && <button className="btn btn-accent sm" style={{ padding: "4px 8px" }} onClick={(e) => { e.stopPropagation(); onDecide(c, "approve"); }} title="Aprovar"><Icon name="check"/></button>}
                      </div>
                    </div>
                  ))}
                  {colRows.length > 40 && <div className="kanban-more">+{colRows.length - 40} mais</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compare overlay */}
      {compareMode && picks.length === 2 && <CompareView a={picks[0]} b={picks[1]} onClose={() => setPicks([])} onOpenReview={onOpenReview}/>}
    </div>
  );
}

function Pager({ page, totalPages, filtered, perPage, setPage }) {
  return (
    <div className="row" style={{ padding: "14px 22px", justifyContent: "space-between", borderTop: "1px solid var(--rule)" }}>
      <span style={{ color: "var(--ink-3)", fontSize: 12.5, fontFamily: "var(--font-mono)" }}>{filtered.length ? page * perPage + 1 : 0}–{Math.min(filtered.length, (page + 1) * perPage)} de {filtered.length}</span>
      <div className="row gap-2">
        <Button variant="ghost" size="sm" icon="chevron_left" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Anterior</Button>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)", padding: "0 8px" }}>{page + 1} / {totalPages}</span>
        <Button variant="ghost" size="sm" iconRight="chevron_right" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Próxima</Button>
      </div>
    </div>
  );
}

function CompareView({ a, b, onClose, onOpenReview }) {
  const H = window.H;
  const Field = ({ label, va, vb, mono }) => {
    const diff = String(va) !== String(vb);
    const cell = (v) => ({ padding: "10px 16px", fontSize: 13, color: diff ? "var(--ink)" : "var(--ink-2)", fontFamily: mono ? "var(--font-mono)" : "inherit", fontWeight: diff ? 600 : 400, background: diff ? "var(--warn-soft)" : "transparent" });
    return (
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", borderBottom: "1px solid var(--rule)", alignItems: "center" }}>
        <div className="eyebrow" style={{ padding: "10px 16px", fontSize: 10 }}>{label}</div>
        <div style={{ ...cell(va), borderLeft: "1px solid var(--rule)" }}>{va}{diff && <Icon name="warn" size={11} style={{ marginLeft: 6, color: "var(--warn)", verticalAlign: "middle" }}/>}</div>
        <div style={{ ...cell(vb), borderLeft: "1px solid var(--rule)" }}>{vb}</div>
      </div>
    );
  };
  const rows = [
    ["PI", a.n_pi, b.n_pi, true], ["Veículo", a.veiculo, b.veiculo], ["Meio", a.meio, b.meio], ["Praça", a.praca, b.praca],
    ["Submarca", a.submarca, b.submarca], ["Arquivos", a.total_arquivos, b.total_arquivos, true],
    ["Recebido", H.fmtDate(a.submittedAt), H.fmtDate(b.submittedAt), true], ["Contato", a.nome_contato, b.nome_contato],
  ];
  return (<>
    <div className="scrim" onClick={onClose} style={{ zIndex: 120 }}/>
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(820px, 94vw)", maxHeight: "88vh", overflowY: "auto", background: "var(--surface)", borderRadius: 16, zIndex: 121, boxShadow: "var(--shadow-lg)", border: "1px solid var(--rule-strong)", animation: "modalIn 360ms var(--ease-out)" }} className="content">
      <div className="row" style={{ justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--rule)" }}>
        <div className="row gap-2"><Icon name="columns" size={16}/><h3 className="h2">Comparar checkings</h3></div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={15}/></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr" }}>
        <div style={{ background: "var(--bg)" }}/>
        {[a, b].map((c, i) => (
          <div key={i} style={{ padding: "16px 18px", borderLeft: "1px solid var(--rule)" }}>
            <Pill status={c.status}/>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 8 }}>{c.cliente}</div>
            <Button variant="ghost" size="sm" iconRight="arrow_right" style={{ marginTop: 10 }} onClick={() => { onClose(); onOpenReview(c); }}>Abrir review</Button>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--rule)" }}>
        {rows.map((r, i) => <Field key={i} label={r[0]} va={r[1]} vb={r[2]} mono={r[3]}/>)}
      </div>
    </div>
  </>);
}
window.ScreenApprovals = ScreenApprovals;
window.CHECK_STATUS = CHECK_STATUS;
window.CHECK_STATUS_LIST = CHECK_STATUS_LIST;
