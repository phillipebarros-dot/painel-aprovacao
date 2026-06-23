// screen-fornecedores.jsx -> window.ScreenFornecedores
// Diretório de fornecedores (veículos), inspirado na página Customers da Atera.
function aggregateSuppliers(checkings) {
  const H = window.H;
  // Pré-cachear ratings do localStorage UMA VEZ (não 1768x dentro do loop)
  const ratingCache = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("painel_rating_")) ratingCache[k] = Number(localStorage.getItem(k) || 0);
    }
  } catch {}
  const m = {};
  checkings.forEach(c => {
    const k = c.veiculo; if (!k) return;
    const s = m[k] || (m[k] = { veiculo: k, total: 0, approved: 0, rejected: 0, pending: 0, rej: 0, slaSum: 0, slaN: 0, last: 0, clientes: new Set(), pracas: new Set(), manual: 0, manualN: 0 });
    s.total++;
    const st = H.norm(c.status);
    if (st === "approved") s.approved++; else if (st === "rejected") s.rejected++; else s.pending++;
    s.rej += (c.rejection_count || 0);
    const end = c.approvedAt || c.rejectedAt;
    if (end) { s.slaSum += (end - c.submittedAt) / 3600000; s.slaN++; }
    s.last = Math.max(s.last, c.submittedAt || 0);
    if (c.cliente) s.clientes.add(c.cliente);
    if (c.praca) s.pracas.add(c.praca);
    const rkey = "painel_rating_" + (c.email_contato || c.nome_contato || "x");
    const r = ratingCache[rkey] || 0;
    if (r) { s.manual += r; s.manualN++; }
  });
  return Object.values(m).map(s => {
    const decided = s.approved + s.rejected;
    const appRate = decided ? s.approved / decided : null;
    const stars = s.manualN > 0 ? Math.round((s.manual / s.manualN) * 10) / 10 : null;
    return { ...s, stars, appRate, avgSla: s.slaN ? s.slaSum / s.slaN : 0, clientes: s.clientes.size, pracas: s.pracas.size };
  });
}

function Stars({ value, size = 13 }) {
  if (value == null) return <span className="sup-stars" style={{ fontSize: size * 0.85, color: "var(--ink-4)", fontStyle: "italic" }}>Sem avaliação</span>;
  return <span className="sup-stars">{[1, 2, 3, 4, 5].map(n => <Icon key={n} name="star" size={size} style={{ color: n <= Math.round(value) ? "var(--warn)" : "var(--ink-4)", fill: n <= Math.round(value) ? "var(--warn)" : "none" }}/>)}</span>;
}

function SupplierDrawer({ sup, checkings, onClose, onOpenReview }) {
  const H = window.H;
  const list = React.useMemo(() => checkings.filter(c => c.veiculo === sup.veiculo).sort((a, b) => b.submittedAt - a.submittedAt), [checkings, sup]);
  return (<>
    <div className="scrim" onClick={onClose} style={{ zIndex: 130 }}/>
    <div className="user-drawer content">
      <div className="row" style={{ justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--rule)" }}>
        <div className="eyebrow">Fornecedor</div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={15}/></button>
      </div>
      <div style={{ padding: 22, overflowY: "auto" }}>
        <div className="row gap-3" style={{ alignItems: "center", marginBottom: 16 }}>
          <span className="sup-logo" style={{ width: 48, height: 48, fontSize: 18 }}>{sup.veiculo.slice(0, 2).toUpperCase()}</span>
          <div className="col" style={{ gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{sup.veiculo}</span>
            <div className="row gap-2" style={{ alignItems: "center" }}><Stars value={sup.stars}/>{sup.stars != null && <span className="cell-mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{sup.stars.toFixed(1)}</span>}</div>
          </div>
        </div>
        <div className="grid-cols-3" style={{ marginBottom: 14 }}>
          <div className="kpi" style={{ padding: "13px 15px" }}><div className="kpi-label">PIs totais</div><div className="kpi-value" style={{ fontSize: 23 }}>{sup.total}</div></div>
          <div className="kpi" style={{ padding: "13px 15px" }}><div className="kpi-label">Aprovação</div><div className="kpi-value" style={{ fontSize: 23, color: "var(--accent)" }}>{sup.appRate != null ? Math.round(sup.appRate * 100) : "–"}<span style={{ fontSize: 13 }}>{sup.appRate != null ? "%" : ""}</span></div></div>
          <div className="kpi" style={{ padding: "13px 15px" }}><div className="kpi-label">SLA médio</div><div className="kpi-value" style={{ fontSize: 23 }}>{sup.avgSla ? sup.avgSla.toFixed(1) + "h" : "·"}</div></div>
        </div>
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="row gap-3" style={{ flexWrap: "wrap", fontSize: 12.5, color: "var(--ink-2)" }}>
            <span className="row gap-2"><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--warn)" }}/>{sup.pending} pendentes</span>
            <span>·</span><span>{sup.rej} reenvios</span>
            <span>·</span><span>{sup.clientes} clientes</span>
            <span>·</span><span>{sup.pracas} praças</span>
            <span>·</span><span>último envio {H.fmtRelTime(sup.last)}</span>
          </div>
        </div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Checkings deste fornecedor · {list.length}</div>
        <div className="col" style={{ gap: 0 }}>
          {list.slice(0, 14).map((c, i) => (
            <div key={c.submission_id} className="row gap-2 row-action" style={{ padding: "9px 4px", borderTop: i ? "1px solid var(--rule)" : "none", alignItems: "center", cursor: "pointer", borderRadius: 6 }} onClick={() => { onClose(); onOpenReview(c); }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, flexShrink: 0, background: H.norm(c.status) === "pending" ? "var(--warn)" : H.norm(c.status) === "approved" ? "var(--accent)" : "var(--alert)" }}/>
              <span className="cell-pi" style={{ fontSize: 12 }}>{c.n_pi}</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cliente}</span>
              <span className="spacer"/><span className="cell-time">{H.fmtRelTime(c.submittedAt)}</span>
            </div>
          ))}
          {list.length > 14 && <div className="body-xs muted" style={{ paddingTop: 8 }}>+{list.length - 14} outros</div>}
        </div>
      </div>
    </div>
  </>);
}

function ScreenFornecedores({ checkings = [], onOpenReview, viewMode, onToast, preSuppliers }) {
  const H = window.H;
  const view = viewMode || "cards";
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("stars");
  const [detail, setDetail] = React.useState(null);
  const all = React.useMemo(() => preSuppliers && preSuppliers.length ? preSuppliers : aggregateSuppliers(checkings), [checkings, preSuppliers]);
  const filtered = React.useMemo(() => {
    let r = all.filter(s => !search || s.veiculo.toLowerCase().includes(search.toLowerCase()));
    const cmp = { stars: (a, b) => b.stars - a.stars, volume: (a, b) => b.total - a.total, reinc: (a, b) => b.rej - a.rej, sla: (a, b) => b.avgSla - a.avgSla, nome: (a, b) => a.veiculo.localeCompare(b.veiculo) };
    return r.sort(cmp[sort] || cmp.stars);
  }, [all, search, sort]);
  const avg = all.length ? all.reduce((s, x) => s + x.stars, 0) / all.length : 0;
  const top = all.length ? [...all].sort((a, b) => b.stars - a.stars)[0] : null;
  const risk = all.filter(s => s.stars < 3).length;

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div className="col" style={{ gap: 6, flex: "1 1 340px" }}>
          <div className="eyebrow">Qualidade · diretório interno</div>
          <h1 className="display-1">Fornecedores</h1>
        </div>
      </div>

      <div className="grid-cols-4 stagger" style={{ marginBottom: "var(--gap)" }}>
        <div className="kpi"><div className="kpi-label">Fornecedores ativos</div><div className="kpi-value"><CountUp value={all.length}/></div><div className="kpi-meta">veículos com PIs no período</div></div>
        <div className="kpi"><div className="kpi-label">Nota média</div><div className="kpi-value">{avg.toFixed(1)}<span className="unit">/5</span></div><div className="kpi-meta"><Stars value={avg} size={12}/></div></div>
        <div className="kpi"><div className="kpi-label">Melhor avaliado</div><div className="kpi-value" style={{ fontSize: 18, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{top ? top.veiculo : "·"}</div><div className="kpi-meta">{top && top.stars != null ? top.stars.toFixed(1) + " estrelas" : ""}</div></div>
        <div className="kpi"><div className="kpi-label">Em atenção</div><div className="kpi-value" style={{ color: risk ? "var(--warn)" : "var(--ink)" }}><CountUp value={risk}/></div><div className="kpi-meta">abaixo de 3 estrelas</div></div>
      </div>

      <div className="row gap-3" style={{ marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar fornecedor…" style={{ flex: "1 1 280px", maxWidth: 360 }}/>
        <span className="tb-view-lbl" style={{ alignSelf: "center" }}>Ordenar</span>
        <Segmented value={sort} onChange={setSort} options={[{ value: "stars", label: "Estrelas" }, { value: "volume", label: "Volume" }, { value: "reinc", label: "Reenvios" }, { value: "sla", label: "SLA" }]}/>
        <div className="spacer"/><span className="muted-2" style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", alignSelf: "center" }}>{filtered.length} fornecedores</span>
      </div>

      {filtered.length === 0 && <Empty title="Nenhum fornecedor" hint="Sem checkings no período" icon="store"/>}

      {filtered.length > 0 && view === "lista" && (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Fornecedor</th><th>Avaliação</th><th style={{ textAlign: "right" }}>PIs</th><th style={{ textAlign: "right" }}>Pendentes</th><th style={{ textAlign: "right" }}>Reenvios</th><th style={{ textAlign: "right" }}>SLA médio</th><th>Último envio</th><th style={{ width: 40 }}/></tr></thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.veiculo} className="row-action row-anim" style={{ animationDelay: (i * 22) + "ms" }} onClick={() => setDetail(s)}>
                  <td><div className="row gap-2"><span className="sup-logo">{s.veiculo.slice(0, 2).toUpperCase()}</span><span style={{ fontWeight: 500 }}>{s.veiculo}</span></div></td>
                  <td><div className="row gap-2" style={{ alignItems: "center" }}><Stars value={s.stars}/><span className="cell-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.stars.toFixed(1)}</span></div></td>
                  <td className="cell-mono" style={{ textAlign: "right" }}>{s.total}</td>
                  <td className="cell-mono" style={{ textAlign: "right", color: s.pending ? "var(--warn)" : "var(--ink-3)" }}>{s.pending}</td>
                  <td className="cell-mono" style={{ textAlign: "right", color: s.rej ? "var(--alert)" : "var(--ink-3)" }}>{s.rej}</td>
                  <td className="cell-mono" style={{ textAlign: "right" }}>{s.avgSla ? s.avgSla.toFixed(1) + "h" : "·"}</td>
                  <td className="cell-time">{H.fmtRelTime(s.last)}</td>
                  <td><span className="row-arrow"><Icon name="arrow_right"/></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filtered.map((s, i) => (
            <div key={s.veiculo} className="card card-hover" style={{ animation: "rowIn 400ms var(--ease-out) both", animationDelay: (i * 30) + "ms", cursor: "pointer" }} onClick={() => setDetail(s)}>
              <div style={{ padding: "18px 20px 14px" }}>
                <div className="row gap-3" style={{ alignItems: "flex-start" }}>
                  <span className="sup-logo" style={{ width: 40, height: 40, fontSize: 15 }}>{s.veiculo.slice(0, 2).toUpperCase()}</span>
                  <div className="col" style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.veiculo}</span>
                    <div className="row gap-2" style={{ alignItems: "center" }}><Stars value={s.stars}/>{s.stars != null && <span className="cell-mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{s.stars.toFixed(1)}</span>}</div>
                  </div>
                  {s.stars < 3 && <span className="pill pill-warn" style={{ flexShrink: 0 }}>atenção</span>}
                </div>
                <div className="sup-meter" style={{ marginTop: 14 }}><span style={{ width: (s.appRate != null ? s.appRate * 100 : 0) + "%" }}/></div>
                <div className="row gap-2" style={{ justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--ink-3)" }}><span>aprovação</span><span className="cell-mono">{s.appRate != null ? Math.round(s.appRate * 100) + "%" : "–"}</span></div>
              </div>
              <div className="row" style={{ borderTop: "1px solid var(--rule)", background: "var(--bg)" }}>
                <div className="sup-stat"><b>{s.total}</b><span>PIs</span></div>
                <div className="sup-stat"><b style={{ color: s.pending ? "var(--warn)" : undefined }}>{s.pending}</b><span>pend.</span></div>
                <div className="sup-stat"><b style={{ color: s.rej ? "var(--alert)" : undefined }}>{s.rej}</b><span>reenvios</span></div>
                <div className="sup-stat"><b>{s.avgSla ? s.avgSla.toFixed(1) + "h" : "·"}</b><span>SLA</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && <SupplierDrawer sup={detail} checkings={checkings} onClose={() => setDetail(null)} onOpenReview={onOpenReview}/>}
    </div>
  );
}
window.ScreenFornecedores = ScreenFornecedores;
window.aggregateSuppliers = aggregateSuppliers;
