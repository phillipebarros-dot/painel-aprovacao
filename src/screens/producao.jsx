// screen-producao.jsx — Produção: divisão de demanda + produtividade por pessoa -> window.ScreenProducao
function ScreenProducao({ checkings, currentUser, onOpenReview, onToast, viewMode, onAssign, onSetCheckStatus, onSetComentario }) {
  const H = window.H;
  const isManager = currentUser?.role === "admin";
  const pview = viewMode || "tabela";
  const [period, setPeriod] = React.useState("mes");
  const [divOpen, setDivOpen] = React.useState(false);
  const [divMonth, setDivMonth] = React.useState("all");
  const [divConta, setDivConta] = React.useState(null);
  const [divPage, setDivPage] = React.useState(50);
  const [customFrom, setCustomFrom] = React.useState("");
  const [filterConta, setFilterConta] = React.useState("all");
  const [filterCliente, setFilterCliente] = React.useState("all");
  const [filterMeio, setFilterMeio] = React.useState("all");
  const [customTo, setCustomTo] = React.useState("");
  // REQ 1 (01/07): filtros estilo Sheets na divisao
  const colFDiv = window.useColumnFilters("producao_div");
  // REQ 4 (01/07): divisao automatica
  const [autoPreview, setAutoPreview] = React.useState(null);
  // REQ Reuniao (02/jul): card de PIs por colaborador ao clicar no membro
  const [selectedMember, setSelectedMember] = React.useState(null);
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

  // ── Carregar total de PIs atribuidos por pessoa (pi_responsaveis) ──
  // A Marlene precisa ver TODOS os PIs da pauta, nao so os recebidos
  const [responsaveisData, setResponsaveisData] = React.useState([]);
  React.useEffect(() => {
    window.PainelAPI?.getResponsaveis('').then(r => {
      const rows = Array.isArray(r) ? r : (r?.responsaveis || r?.rows || []);
      setResponsaveisData(rows);
    }).catch(() => {});
  }, []);
  // Totais da pauta por pessoa (nome): { "Rose": 85, "Brenda": 92, ... }
  const pautaTotals = React.useMemo(() => {
    const map = {};
    responsaveisData.forEach(r => {
      const nome = r.responsavel_nome || r.responsavel || "";
      if (!nome) return;
      if (!map[nome]) map[nome] = 0;
      map[nome]++;
    });
    return map;
  }, [responsaveisData]);

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

  // Opcoes unicas para filtros (filtrado por grupo)
  const contaOptions = React.useMemo(() => {
    const s = new Set(); checkings.forEach(c => { if (c.conta) s.add(c.conta); });
    return [...s].sort();
  }, [checkings]);
  const clienteOptions = React.useMemo(() => {
    const s = new Set(); checkings.forEach(c => { if (c.cliente) s.add(c.cliente); });
    return [...s].sort();
  }, [checkings]);
  const meioOptions = React.useMemo(() => {
    const s = new Set(); checkings.forEach(c => { if (c.meio) s.add(c.meio); });
    return [...s].sort();
  }, [checkings]);

  const filteredCheckings = React.useMemo(() => {
    let list = checkings;
    if (filterConta !== "all") list = list.filter(c => (c.conta || "") === filterConta);
    if (filterCliente !== "all") list = list.filter(c => (c.cliente || "") === filterCliente);
    if (filterMeio !== "all") list = list.filter(c => (c.meio || "") === filterMeio);
    if (period !== "custom" || (!customFrom && !customTo)) return list;
    return list.filter(c => {
      const t = c.submittedAt || c.ingestion_time;
      return (!customFrom || t >= sinceTs) && (!customTo || t <= untilTs);
    });
  }, [checkings, filterConta, filterCliente, filterMeio, period, sinceTs, untilTs, customFrom, customTo]);

  // B3 fix (01/jul): passar nomes cadastrados para separar pessoas reais de fantasma
  const registeredNames = React.useMemo(() => (window.MOCK?.users || []).filter(u => u.role !== "viewer").map(u => u.nome || u.name), []);
  const prod = React.useMemo(() => H.teamProductivity(filteredCheckings, period === "custom" ? 0 : sinceTs, registeredNames), [filteredCheckings, sinceTs, period, registeredNames]);
  const maxBaixados = Math.max(1, ...prod.rows.map(r => r.baixados));
  const periodLabel = period === "custom" ? (customFrom && customTo ? `${new Date(customFrom).toLocaleDateString("pt-BR")} – ${new Date(customTo).toLocaleDateString("pt-BR")}` : "período personalizado") : { hoje: "hoje", semana: "últimos 7 dias", mes: "últimos 30 dias", tudo: "todo o período" }[period];

  // colaborador: minha fila
  const myName = currentUser?.nome || currentUser?.name;
  // B4 fix (01/jul): usar H.sameUser centralizado
  const mine = React.useMemo(() => {
    return checkings.filter(c => {
      const a = c.assigned_to || '';
      return a && (H.sameUser(a, myName) || (currentUser?.email && H.sameUser(a, currentUser.email)));
    });
  }, [checkings, myName, currentUser]);
  // B4 fix: myStats com sameUser
  const myStats = prod.rows.find(r => H.sameUser(r.name, myName));
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

  // REQ EQUIPE: derive equipe do grupo do usuario logado
  // BUG 2 fix (01/jul Marlene): admin com grupo="todos" precisa ver membros de TODOS os grupos
  const equipe = React.useMemo(() => {
    const grupo = currentUser?.grupo || "boticario";
    let membros;
    if (grupo === "todos" && isManager) {
      // Admin "todos": agregar membros de todos os grupos conhecidos
      const seen = new Set();
      membros = [];
      ["boticario", "kauana"].forEach(g => {
        (window.MOCK?.teamMembers?.(g) || []).forEach(u => {
          const key = u.email || u.nome || u.name;
          if (!seen.has(key)) { seen.add(key); membros.push(u); }
        });
      });
    } else {
      membros = window.MOCK?.teamMembers?.(grupo) || [];
    }
    // B4 fix (01/jul): usar H.sameUser centralizado
    return membros.map(u => {
      const uName = u.nome || u.name || "";
      const uEmail = u.email || "";
      const meus = checkings.filter(c => {
        const a = c.assigned_to || "";
        return a && (H.sameUser(a, uName) || (uEmail && H.sameUser(a, uEmail)));
      });
      const baixados = meus.filter(c => c.approvedAt || c.rejectedAt).length;
      // Pauta total: PIs atribuidos em pi_responsaveis (inclui aguardando recebimento)
      const pt = pautaTotals[uName] || 0;
      return { ...u, carga: meus.length, baixados, pendentes: meus.filter(c => H.norm(c.status) === "pending").length, pautaTotal: pt };
    });
  }, [checkings, currentUser, pautaTotals]);
  const equipePautaTotal = equipe.reduce((s, m) => s + (m.pautaTotal || 0), 0);
  const equipeTotal = equipePautaTotal > 0 ? equipePautaTotal : equipe.reduce((s, m) => s + m.carga, 0);
  const equipeAlvo = equipe.length ? equipeTotal / equipe.length : 0;

  // Divisão por conta (espelha as abas da planilha da Marlene): agrupa PIs por conta
  const team = React.useMemo(() => (window.MOCK?.users || []).filter(u => u.role !== "viewer").map(u => u.nome || u.name), []);
  // V1 fix (01/jul): contaAgg e divRows agora nao filtram por conta ativa.
  // A conta aparece como coluna filtravel (ColumnFilter), sem abas no rodape.
  const contaAgg = React.useMemo(() => {
    const m = {};
    // REQ (01/jul 00:22:06 Phillipe): filtros compartilhados entre todos os modos de visualizacao
    const src = divMonth === "all" ? filteredCheckings : filteredCheckings.filter(c => { const d = new Date(c.submittedAt); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === divMonth; });
    src.forEach(c => {
      const k = c.conta || "Sem conta";
      if (!m[k]) m[k] = { conta: k, total: 0, pend: 0, resp: {} };
      m[k].total++;
      if (H.norm(c.status) === "pending") m[k].pend++;
      if (c.assigned_to) m[k].resp[c.assigned_to] = (m[k].resp[c.assigned_to] || 0) + 1;
    });
    var fixas = window.MOCK?.CONTAS_BOTICARIO || [];
    var arr = Object.values(m);
    arr.sort(function (a, b) {
      var ia = fixas.indexOf(a.conta), ib = fixas.indexOf(b.conta);
      if (ia === -1 && ib === -1) return b.total - a.total;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return arr;
  }, [filteredCheckings, divMonth]);
  // REQ 5 (01/07): mes fechado como seletor principal. 12 meses.
  const divMonths = React.useMemo(() => H.recentMonths(12), []);
  const divTotalPIs = React.useMemo(() => contaAgg.reduce((s, r) => s + r.total, 0), [contaAgg]);
  // V1 fix: divRows agora mostra TODOS os PIs (sem filtro por conta ativa),
  // conta vira coluna filtravel via ColumnFilter.
  const divRowsPreFilter = React.useMemo(() => {
    const src = divMonth === "all" ? filteredCheckings : filteredCheckings.filter(c => { const d = new Date(c.submittedAt); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === divMonth; });
    return src;
  }, [filteredCheckings, divMonth]);
  const divRows = React.useMemo(() => {
    // REQ 1 (01/07): aplicar filtros por coluna (inclui conta como filtro)
    return window.applyColumnFilters(divRowsPreFilter, colFDiv.filters);
  }, [divRowsPreFilter, colFDiv.filters]);
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
        <div className="row gap-3" style={{ flex: "0 0 auto", flexWrap: "wrap" }}>
          {isManager && contaOptions.length > 1 && (
            <select className="input sm" value={filterConta} onChange={e => setFilterConta(e.target.value)} style={{ width: 160, fontSize: 12, height: 32 }}>
              <option value="all">Conta: Todas</option>
              {contaOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {isManager && clienteOptions.length > 1 && (
            <select className="input sm" value={filterCliente} onChange={e => setFilterCliente(e.target.value)} style={{ width: 160, fontSize: 12, height: 32 }}>
              <option value="all">Cliente: Todos</option>
              {clienteOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {isManager && meioOptions.length > 1 && (
            <select className="input sm" value={filterMeio} onChange={e => setFilterMeio(e.target.value)} style={{ width: 120, fontSize: 12, height: 32 }}>
              <option value="all">Meio: Todos</option>
              {meioOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <Segmented value={period} onChange={changePeriod} options={[{ value: "hoje", label: "Hoje" }, { value: "semana", label: "7d" }, { value: "mes", label: "30d" }, { value: "tudo", label: "Tudo" }, { value: "custom", label: "Período" }]}/>
          {(filterConta !== "all" || filterCliente !== "all" || filterMeio !== "all") && (
            <button className="btn btn-quiet sm" onClick={() => { setFilterConta("all"); setFilterCliente("all"); setFilterMeio("all"); }} style={{ fontSize: 11 }}>Limpar filtros</button>
          )}
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
        {/* Totais — Bug 1 fix (01/jul): separar distribuidos vs total */}
        <div className="grid-cols-4 stagger" style={{ marginBottom: "var(--gap)" }}>
          <div className="kpi"><div className="kpi-label">Distribuídos</div><div className="kpi-value"><CountUp value={equipePautaTotal || filteredCheckings.filter(c => c.assigned_to).length}/></div><div className="kpi-meta">de <strong>{filteredCheckings.length}</strong> total · entre <strong>{prod.rows.length}</strong> pessoas</div></div>
          <div className="kpi"><div className="kpi-label">Baixados · {periodLabel}</div><div className="kpi-value" style={{ color: "var(--accent)" }}><CountUp value={prod.totals.baixados}/></div><div className="kpi-meta"><strong>{prod.totals.approved}</strong> aprovados · <strong>{prod.totals.rejected}</strong> reprovados</div></div>
          <div className="kpi"><div className="kpi-label">Pendentes</div><div className="kpi-value" style={{ color: prod.totals.pendentes ? "var(--warn)" : "var(--ink)" }}><CountUp value={prod.totals.pendentes}/></div><div className="kpi-meta">aguardando baixa</div></div>
          <div className="kpi"><div className="kpi-label">Conclusão</div><div className="kpi-value"><CountUp value={prod.totals.demanda ? Math.round((prod.totals.baixados / prod.totals.demanda) * 100) : 0}/><span className="unit">%</span></div><div className="kpi-meta">da demanda distribuída</div></div>
        </div>

        {/* REQ Marlene (02/jul reuniao): admin precisa ver sua propria demanda de checking */}
        {mine.length > 0 && (
          <div className="card card-pad" style={{ marginBottom: "var(--gap)", border: "1px solid var(--accent-soft, rgba(14,116,144,0.15))" }}>
            <div className="row gap-3" style={{ alignItems: "center" }}>
              <Avatar user={currentUser} size={32}/>
              <div className="col" style={{ gap: 2, flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Minha demanda</span>
                <span className="muted" style={{ fontSize: 12 }}>PIs atribuidos a mim ({myName})</span>
              </div>
              <div className="row gap-4" style={{ fontSize: 13 }}>
                <span><b style={{ color: "var(--ink)" }}>{mine.length}</b> total</span>
                <span><b style={{ color: "var(--warn)" }}>{myPending.length}</b> pendentes</span>
                <span><b style={{ color: "var(--accent)" }}>{myDone.length}</b> baixados</span>
              </div>
              <button className="btn btn-accent sm" onClick={() => setSelectedMember({ nome: myName, name: myName, email: currentUser?.email, avatar: currentUser?.avatar, color: currentUser?.color })}>Ver meus PIs</button>
            </div>
          </div>
        )}

        {/* REQ EQUIPE 1.2: bloco equipe do periodo (admin only) */}
        {equipe.length > 0 && (
          <div className="card card-pad" style={{ marginBottom: "var(--gap)" }}>
            <div className="row gap-2" style={{ alignItems: "center", marginBottom: 14 }}>
              <Icon name="users" size={15} style={{ color: "var(--accent)" }}/>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Equipe do periodo</span>
              <span className="spacer"/>
              <span className="cell-mono muted" style={{ fontSize: 12 }}>{equipeTotal} PIs distribuidos entre {equipe.length}</span>
            </div>
            {/* Chips por membro */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
              {equipe.map(m => {
                const base = m.pautaTotal || m.carga;
                const pct = base ? (m.baixados / base) : 0;
                const acima = equipeAlvo > 0 && (m.pautaTotal || m.carga) > equipeAlvo * 1.15;
                // R1 fix (01/jul): clicar no membro filtra divisao por assigned_to
                const drillDown = () => {
                  setSelectedMember(m);
                };
                return (
                  <div key={m.email || m.nome} className="card card-pad card-hover" style={{ padding: "12px 14px", border: acima ? "1px solid var(--warn)" : undefined, cursor: "pointer" }} onClick={drillDown} title={`Ver PIs de ${(m.nome || m.name || '').split(' ')[0]}`}>
                    <div className="row gap-2" style={{ alignItems: "center", marginBottom: 8 }}>
                      <Avatar user={m} size={28}/>
                      <div className="col" style={{ gap: 1, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nome || m.name}</span>
                        <span className="cell-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.pautaTotal ? `${m.pautaTotal} atribuidos` : `${m.carga} PIs`}{m.carga > 0 && m.pautaTotal ? ` · ${m.carga} recebidos` : ''}</span>
                      </div>
                      <div className="col" style={{ alignItems: "flex-end", gap: 1 }}>
                        <span className="cell-mono" style={{ fontSize: 16, fontWeight: 700, color: pct >= 0.8 ? "var(--accent)" : pct >= 0.5 ? "var(--warn)" : "var(--ink-3)" }}>{Math.round(pct * 100)}%</span>
                        {m.pautaTotal > 0 && <span className="cell-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>{m.baixados}/{m.pautaTotal} baixados</span>}
                      </div>
                    </div>
                    <div className="rank-track" style={{ height: 5 }}><div className="rank-fill" style={{ width: `${(m.pautaTotal ? (m.baixados / m.pautaTotal) : pct) * 100}%`, height: "100%", background: acima ? "var(--warn)" : "var(--accent)" }}/></div>
                    {acima && <div style={{ fontSize: 10.5, color: "var(--warn)", marginTop: 4 }}>acima do equilibrio (+{Math.round((((m.pautaTotal || m.carga) / equipeAlvo) - 1) * 100)}%)</div>}
                  </div>
                );
              })}
            </div>
            {/* Barra de equilibrio empilhada */}
            {equipeTotal > 0 && (
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>Distribuicao da carga</div>
                <div className="rank-track" style={{ height: 18, display: "flex", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  {equipe.map((m, i) => {
                    const mTotal = m.pautaTotal || m.carga;
                    const w = (mTotal / equipeTotal) * 100;
                    const acima = equipeAlvo > 0 && mTotal > equipeAlvo * 1.15;
                    const colors = ["var(--accent)", "#7E22CE", "#C2410C", "#0E7490", "#15803D", "#B45309"];
                    return <div key={m.email || i} title={`${m.nome || m.name}: ${mTotal} PIs${m.pautaTotal ? ` (${m.carga} recebidos)` : ''}`} style={{ width: w + "%", height: "100%", background: acima ? "var(--warn)" : colors[i % colors.length], transition: "width 600ms var(--ease-out)" }}/>;
                  })}
                  {/* Linha alvo (total/N) */}
                  {equipe.length > 1 && <div style={{ position: "absolute", left: (100 / equipe.length) + "%", top: 0, bottom: 0, width: 1.5, background: "var(--ink)", opacity: 0.3 }}/>}
                </div>
                <div className="row gap-3" style={{ marginTop: 6, flexWrap: "wrap" }}>
                  {equipe.map((m, i) => {
                    const colors = ["var(--accent)", "#7E22CE", "#C2410C", "#0E7490", "#15803D", "#B45309"];
                    const mTotal = m.pautaTotal || m.carga;
                    return <span key={m.email || i} className="row gap-2" style={{ fontSize: 11, color: "var(--ink-3)" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: (equipeAlvo > 0 && mTotal > equipeAlvo * 1.15) ? "var(--warn)" : colors[i % colors.length] }}/>{(m.nome || m.name || "").split(" ")[0]} ({mTotal})</span>;
                  })}
                  <span className="muted" style={{ fontSize: 11 }}>| alvo: {Math.round(equipeAlvo)} cada</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REQ Reuniao (02/jul): Modal de PIs do membro selecionado */}
        {selectedMember && (() => {
          const mName = selectedMember.nome || selectedMember.name || "";
          const mEmail = selectedMember.email || "";
          const memberPIs = checkings.filter(c => {
            const a = c.assigned_to || "";
            return a && (H.sameUser(a, mName) || (mEmail && H.sameUser(a, mEmail)));
          });
          const pending = memberPIs.filter(c => H.norm(c.status) === "pending").length;
          const done = memberPIs.filter(c => c.approvedAt || c.rejectedAt).length;
          return (<>
            <div className="scrim" onClick={() => setSelectedMember(null)}/>
            <div className="modal content" style={{ width: "min(840px, 94vw)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
              <div className="card-pad" style={{ borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
                <div className="row gap-3" style={{ alignItems: "center", marginBottom: 8 }}>
                  <Avatar user={selectedMember} size={36}/>
                  <div className="col" style={{ gap: 2, flex: 1 }}>
                    <span className="display-3">{mName}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{mEmail}</span>
                  </div>
                  <button className="btn btn-ghost sm" onClick={() => setSelectedMember(null)} style={{ fontSize: 18, padding: 4 }}>&times;</button>
                </div>
                <div className="row gap-4" style={{ fontSize: 13 }}>
                  <span><b style={{ color: "var(--ink)" }}>{memberPIs.length}</b> PIs total</span>
                  <span><b style={{ color: "var(--warn)" }}>{pending}</b> pendentes</span>
                  <span><b style={{ color: "var(--accent)" }}>{done}</b> baixados</span>
                </div>
              </div>
              <div className="card-pad" style={{ overflowY: "auto", flex: 1 }}>
                {memberPIs.length === 0 ? <Empty title="Sem PIs atribuidos" hint={`${mName.split(" ")[0]} nao tem PIs atribuidos neste periodo.`} icon="layers"/> : (
                  <table className="tbl" style={{ fontSize: 12.5 }}>
                    <thead><tr><th>No PI</th><th>Conta</th><th>Cliente</th><th>Veiculo</th><th>Meio</th><th>Vencimento</th><th>Status</th></tr></thead>
                    <tbody>
                      {memberPIs.map((c, i) => {
                        const SC = window.CHECK_STATUS || {};
                        return (
                          <tr key={c.submission_id} className={i < 20 ? "row-anim" : ""} style={i < 20 ? { animationDelay: (i * 12) + "ms", cursor: "pointer" } : { cursor: "pointer" }} onClick={() => { setSelectedMember(null); onOpenReview(c); }}>
                            <td className="cell-pi">{c.n_pi}</td>
                            <td style={{ fontWeight: 500 }}>{c.conta || "-"}</td>
                            <td>{c.cliente || "-"}</td>
                            <td className="cell-secondary">{c.veiculo || "-"}</td>
                            <td className="cell-secondary">{c.meio || "-"}</td>
                            <td className="cell-secondary" style={{ whiteSpace: "nowrap" }}>{c.vencimento ? new Date(c.vencimento).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "-"}</td>
                            <td><span className="plan-status-tag" style={{ "--sc": SC[c.statusCheck] || "var(--ink-3)" }}>{c.statusCheck || H.norm(c.status)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="card-pad" style={{ borderTop: "1px solid var(--rule)", flexShrink: 0 }}>
                <div className="row gap-3" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost sm" onClick={() => { colFDiv.setColumnFilter('assigned_to', [mName]); setSelectedMember(null); }}>Ver na divisao</button>
                  <button className="btn btn-accent sm" onClick={() => setSelectedMember(null)}>Fechar</button>
                </div>
              </div>
            </div>
          </>);
        })()}

        {/* Produtividade por pessoa */}
        <div className="card" style={{ display: pview === "tabela" ? undefined : "none" }}>
          <div className="card-head">
            <div className="col" style={{ gap: 2 }}><div className="eyebrow">Por login · {periodLabel}</div><div className="h2">Baixas por pessoa</div></div>
            <ExportMenu label="Relatório" onCsv={() => {
              const head = "Pessoa,Demanda,Baixados,Aprovados,Reprovados,Pendentes,Conclusao %,SLA medio h\n";
              const rows = prod.rows.map(r => `"${r.name}",${r.demanda},${r.baixados},${r.approved},${r.rejected},${r.pendentes},${Math.round((r.pct || 0) * 100)},${(Number(r.avgSla) || 0).toFixed(1)}`).join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([head + rows], { type: "text/csv" })); a.download = `producao_${period}.csv`; a.click(); URL.revokeObjectURL(a.href);
            }} onXlsx={() => {
              const cols = ["Pessoa", "Demanda", "Baixados", "Aprovados", "Reprovados", "Pendentes", "Conclusao %", "SLA medio h"];
              const rows = prod.rows.map(r => [r.name, r.demanda, r.baixados, r.approved, r.rejected, r.pendentes, Math.round((r.pct || 0) * 100), Number((Number(r.avgSla) || 0).toFixed(1))]);
              H.exportXLSX("Producao", cols, rows, `producao_${period}`);
            }} onPdf={() => H.exportPDF("Produtividade por pessoa", ["Pessoa", "Demanda", "Baixados", "Aprovados", "Reprovados", "Pendentes", "Conclusão", "SLA médio"], prod.rows.map(r => [r.name, r.demanda, r.baixados, r.approved, r.rejected, r.pendentes, Math.round((r.pct || 0) * 100) + "%", ((Number(r.avgSla) || 0).toFixed(1) + "h")]), periodLabel, [
              { label: "Demanda total", value: String(prod.totals.demanda) },
              { label: "Baixados", value: String(prod.totals.baixados) },
              { label: "Pendentes", value: String(prod.totals.pendentes) },
              { label: "Conclusao", value: Math.round(prod.totals.demanda ? (prod.totals.baixados / prod.totals.demanda) * 100 : 0) + "%" },
              { label: "Equipe", value: String(prod.rows.length) },
            ])}/>
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
                  <td className="cell-mono" style={{ textAlign: "right", color: (Number(r.avgSla) || 0) > 4 ? "var(--warn)" : "var(--ink-2)" }}>{(Number(r.avgSla) || 0) ? (Number(r.avgSla) || 0).toFixed(1) + "h" : "·"}</td>
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
                  <span>SLA <b style={{ color: "var(--ink)" }}>{(Number(r.avgSla) || 0) ? (Number(r.avgSla) || 0).toFixed(1) + "h" : "·"}</b></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {pview === "divisao" && (
          <div className="card">
            <div className="card-head">
              <div className="col" style={{ gap: 2 }}><div className="eyebrow">Divisao de demanda por conta</div><div className="h2">Atribua o responsavel por PI</div></div>
              <div className="row gap-3" style={{ alignItems: "center" }}>
                {/* REQ 4 (01/07): botao de divisao automatica (so admin) */}
                {isManager && <button className="btn btn-accent sm" onClick={() => {
                  // UXP: usar SOMENTE membros da equipe do grupo logado (sem fallback que mistura equipes)
                  var membros = window.MOCK?.teamMembers?.(currentUser?.grupo || "boticario") || [];
                  var teamNames = membros.map(u => u.nome || u.name);
                  if (teamNames.length < 2) { onToast?.({ type: "info", message: "Precisa de pelo menos 2 responsaveis cadastrados." }); return; }
                  var src = divMonth === "all" ? checkings : checkings.filter(c => { var d = new Date(c.submittedAt); return (d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")) === divMonth; });
                  var unassigned = src.filter(c => !c.assigned_to);
                  if (!unassigned.length) { onToast?.({ type: "info", message: "Todos os PIs deste periodo ja tem responsavel." }); return; }
                  // REQ EQUIPE: distribuicao respeita REGIAO quando possivel.
                  // Heuristica: agrupar contas por regiao inferida. Distribuir contas
                  // inteiras por membro (round-robin de regioes). Depois balancear
                  // excedente por quantidade, garantindo equilibrio.
                  var inferR = window.MOCK?.inferRegiao || function() { return ""; };
                  var byConta = {};
                  unassigned.forEach(c => { var k = c.conta || "Sem conta"; if (!byConta[k]) byConta[k] = []; byConta[k].push(c); });
                  var map = {}, counts = {}, contaMembro = {};
                  teamNames.forEach(t => { counts[t] = 0; });
                  // Agrupar contas por regiao
                  var regioes = {};
                  Object.keys(byConta).forEach(conta => {
                    var r = inferR(conta) || "_geral";
                    if (!regioes[r]) regioes[r] = [];
                    regioes[r].push(conta);
                  });
                  // Distribuir contas inteiras por round-robin dentro de cada regiao
                  var idx = 0;
                  Object.keys(regioes).sort().forEach(regiao => {
                    regioes[regiao].forEach(conta => {
                      var who = teamNames[idx % teamNames.length];
                      contaMembro[conta] = contaMembro[conta] || {};
                      byConta[conta].forEach(c => {
                        map[c.submission_id] = who;
                        counts[who] = (counts[who] || 0) + 1;
                        contaMembro[conta][who] = (contaMembro[conta][who] || 0) + 1;
                      });
                      idx++;
                    });
                  });
                  setAutoPreview({ map: map, counts: counts, total: unassigned.length, byConta: byConta, activeTeam: teamNames, contaMembro: contaMembro });
                }}><Icon name="sparkles" size={12}/>Dividir automaticamente</button>}
                <select className="dash-month" value={divMonth} onChange={e => setDivMonth(e.target.value)}>
                  <option value="all">Todos os meses</option>
                  {divMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <span className="cell-mono muted">{divRows.length} PIs</span>
              </div>
            </div>
            {/* A2 fix (01/jul): FilterChipsBar FORA do table (HTML valido) */}
            <FilterChipsBar filters={colFDiv.filters} onClear={(k) => colFDiv.setColumnFilter(k, [])} onClearAll={colFDiv.clearAll} total={divRowsPreFilter.length} shown={divRows.length} labels={{ conta: "Conta", cliente: "Cliente", veiculo: "Veiculo", meio: "Meio", assigned_to: "Responsavel" }}/>
            <div>
              <table className="tbl tbl-planilha" style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: "7%" }}/>
                  <col style={{ width: "11%" }}/>
                  <col style={{ width: "13%" }}/>
                  <col style={{ width: "13%" }}/>
                  <col style={{ width: "5%" }}/>
                  <col style={{ width: "8%" }}/>
                  <col style={{ width: "10%" }}/>
                  <col style={{ width: "12%" }}/>
                  <col style={{ width: "16%" }}/>
                  <col style={{ width: "5%" }}/>
                </colgroup>
                {/* V1 fix (01/jul): conta como coluna filtravel, sem abas no rodape */}
                <thead><tr>
                  <th>No PI</th>
                  <ColumnFilter colKey="conta" label="Conta" rows={divRowsPreFilter} selected={colFDiv.filters.conta || []} onSelect={colFDiv.setColumnFilter}>Conta</ColumnFilter>
                  <ColumnFilter colKey="cliente" label="Cliente" rows={divRowsPreFilter} selected={colFDiv.filters.cliente || []} onSelect={colFDiv.setColumnFilter}>Cliente</ColumnFilter>
                  <ColumnFilter colKey="veiculo" label="Veiculo" rows={divRowsPreFilter} selected={colFDiv.filters.veiculo || []} onSelect={colFDiv.setColumnFilter}>Veiculo</ColumnFilter>
                  <ColumnFilter colKey="meio" label="Meio" rows={divRowsPreFilter} selected={colFDiv.filters.meio || []} onSelect={colFDiv.setColumnFilter}>Meio</ColumnFilter>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <ColumnFilter colKey="assigned_to" label="Responsavel" rows={divRowsPreFilter} selected={colFDiv.filters.assigned_to || []} onSelect={colFDiv.setColumnFilter}>Responsavel</ColumnFilter>
                  <th>Comentario</th><th>Arq.</th>
                </tr></thead>
                <tbody>
                  {divRows.length === 0
                    ? <tr><td colSpan={10}><div style={{ padding: 28 }}><Empty title="Sem PIs com esses filtros" hint="Limpe os filtros ou troque o mes" icon="layers"/></div></td></tr>
                    : divRows.slice(0, divPage).map((c, i) => {
                      const SC = window.CHECK_STATUS || {}; const SCL = window.CHECK_STATUS_LIST || [];
                      const per = c.periodo_ini && c.periodo_fim ? `${new Date(c.periodo_ini).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}–${new Date(c.periodo_fim).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : "";
                      const tip = [c.campanha, per, c.valor_liquido ? Number(c.valor_liquido || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null, c.praca].filter(Boolean).join(" · ");
                      return (
                      <tr key={c.submission_id} className={i < 20 ? "row-anim" : ""} style={i < 20 ? { animationDelay: (i * 12) + "ms" } : undefined} title={tip}>
                        {/* R2 fix (01/jul): clicar no PI abre Review */}
                        <td className="cell-pi" style={{ cursor: "pointer" }} onClick={() => onOpenReview(c)}>{c.n_pi}</td>
                        <td style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.conta || "Sem conta"}</td>
                        <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cliente}</td>
                        <td className="cell-secondary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.veiculo}</td>
                        <td className="cell-secondary">{c.meio}</td>
                        <td className="cell-secondary" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{(() => { if (!c.vencimento) return "-"; const d = new Date(c.vencimento); if (isNaN(d.getTime())) return "-"; const now = new Date(); const diff = (d - now) / 86400000; const color = diff < 0 ? "var(--alert)" : diff < 3 ? "var(--warn)" : undefined; return React.createElement("span", { style: { color, fontWeight: diff < 3 ? 600 : 400 } }, d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })); })()}</td>
                        <td className="plan-edit" onClick={e => e.stopPropagation()}>
                          <div className="plan-status" style={{ "--sc": SC[c.statusCheck] || "var(--ink-3)" }}>
                            {/* REQ Marlene (02/jul): Status editavel pra TODOS (nao so admin) */}
                            <select value={c.statusCheck || ""} onChange={e => { onSetCheckStatus && onSetCheckStatus(c.submission_id, e.target.value); onToast?.({ type: "success", message: `Status: ${e.target.value}` }); }}>
                              {!c.statusCheck && <option value="">-</option>}
                              {SCL.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="plan-edit" onClick={e => e.stopPropagation()}>
                          {!isManager ? <span className="cell-secondary" style={{ fontSize: 12 }}>{c.assigned_to || "Sem resp."}</span> : (
                            <select className="plan-select" value={c.assigned_to || ""} onChange={e => { assignOne(c.submission_id, e.target.value); }} style={{ fontSize: 12 }}>
                              <option value="">Sem resp.</option>
                              {equipe.map(m => <option key={m.email || m.nome} value={m.nome || m.name}>{(m.nome || m.name || "").split(" ")[0]}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="plan-edit" onClick={e => e.stopPropagation()}>
                          {/* REQ Marlene (02/jul): Comentario editavel pra TODOS (nao so admin) */}
                          <input className="plan-input" defaultValue={c.comentario || ""} placeholder="Comentário…" onBlur={e => { if (e.target.value !== (c.comentario || "")) { onSetComentario && onSetComentario(c.submission_id, e.target.value); onToast?.({ type: "success", message: "Comentário salvo." }); } }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}/>
                        </td>
                        <td className="cell-secondary" style={{ textAlign: "center" }}>{c.total_arquivos || 0}</td>
                      </tr>
                    );})
                    }
                    {divRows.length > divPage && (
                      <tr><td colSpan={10} style={{ textAlign: "center", padding: 12 }}>
                        <button className="btn btn-quiet sm" onClick={() => setDivPage(p => p + 50)}>Mostrar mais {Math.min(50, divRows.length - divPage)} de {divRows.length - divPage} restantes</button>
                      </td></tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {divOpen && <DividirDemanda checkings={checkings} team={equipe.map(m => m.nome || m.name)} onClose={() => setDivOpen(false)} onAssign={onAssign} onToast={onToast}/>}
        {/* REQ 4 (01/07): modal de preview da divisao automatica com distribuicao regional */}
        {autoPreview && (<>
          <div className="scrim" onClick={() => setAutoPreview(null)}/>
          <div className="modal content" style={{ width: "min(720px, 94vw)" }}><div className="card-pad">
            <div className="eyebrow" style={{ marginBottom: 8 }}>Divisao automatica</div>
            <h2 className="display-3" style={{ marginBottom: 6 }}>{divMonth !== "all" ? divMonths.find(m => m.value === divMonth)?.label || divMonth : "Todos os meses"}: {autoPreview.total} PIs</h2>
            <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>Distribuidos entre {autoPreview.activeTeam.length} membro{autoPreview.activeTeam.length !== 1 ? "s" : ""}. Contas agrupadas por regiao.</div>
            {/* Cards por membro */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              {autoPreview.activeTeam.map(name => (
                <div key={name} className="card card-pad" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{autoPreview.counts[name] || 0}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>{name.split(" ")[0]}</div>
                </div>
              ))}
            </div>
            {/* Preview conta x membro (tabela) */}
            <div className="eyebrow" style={{ marginBottom: 6 }}>Distribuicao por conta e membro</div>
            <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 16 }}>
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr><th>Conta</th><th>Regiao</th>{autoPreview.activeTeam.map(n => <th key={n} style={{ textAlign: "right" }}>{n.split(" ")[0]}</th>)}<th style={{ textAlign: "right" }}>Total</th></tr></thead>
                <tbody>
                  {Object.keys(autoPreview.byConta).sort().map(conta => {
                    const row = autoPreview.contaMembro?.[conta] || {};
                    return (
                      <tr key={conta}>
                        <td style={{ fontWeight: 500 }}>{conta}</td>
                        <td className="cell-secondary">{window.MOCK?.inferRegiao?.(conta) || "-"}</td>
                        {autoPreview.activeTeam.map(n => <td key={n} className="cell-mono" style={{ textAlign: "right" }}>{row[n] || 0}</td>)}
                        <td className="cell-mono" style={{ textAlign: "right", fontWeight: 600 }}>{autoPreview.byConta[conta].length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="row gap-3" style={{ justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={() => setAutoPreview(null)}>Cancelar</Button>
              <Button variant="accent" icon="check" onClick={() => {
                onAssign && onAssign(autoPreview.map);
                onToast?.({ type: "success", message: autoPreview.total + " PIs divididos entre " + autoPreview.activeTeam.length + " responsaveis." });
                setAutoPreview(null);
              }}>Aplicar divisao</Button>
            </div>
          </div></div>
        </>)}
      </>) : (<>
        {/* Colaborador: minhas métricas + minha fila */}
        <div className="grid-cols-4 stagger" style={{ marginBottom: "var(--gap)" }}>
          <div className="kpi"><div className="kpi-label">Minha demanda</div><div className="kpi-value"><CountUp value={myStats?.demanda || 0}/></div><div className="kpi-meta">PIs sob minha responsabilidade</div></div>
          <div className="kpi"><div className="kpi-label">Baixei · {periodLabel}</div><div className="kpi-value" style={{ color: "var(--accent)" }}><CountUp value={myStats?.baixados || 0}/></div><div className="kpi-meta"><strong>{myStats?.approved || 0}</strong> aprov. · <strong>{myStats?.rejected || 0}</strong> reprov.</div></div>
          <div className="kpi"><div className="kpi-label">Na minha fila</div><div className="kpi-value" style={{ color: myPending.length ? "var(--warn)" : "var(--ink)" }}><CountUp value={myPending.length}/></div><div className="kpi-meta">aguardando minha baixa</div></div>
          {/* FIX B1: guard toFixed contra undefined */}
          <div className="kpi"><div className="kpi-label">Meu ritmo</div><div className="kpi-value"><CountUp value={myStats?.avgSla || 0} format={v => (Number(v) || 0).toFixed(1)}/><span className="unit">h</span></div><div className="kpi-meta">SLA médio das minhas baixas</div></div>
        </div>

        {/* Dashboard pessoal do analista */}
        <div className="grid-cols-3 stagger" style={{ marginBottom: "var(--gap)" }}>
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
                <span>Meu SLA <b style={{ color: (myStats?.avgSla || 0) <= (Number(teamAvgSla) || 0) ? "var(--accent)" : "var(--warn)" }}>{(myStats?.avgSla || 0).toFixed(1)}h</b></span>
                <span>Média do time <b style={{ color: "var(--ink-2)" }}>{(Number(teamAvgSla) || 0).toFixed(1)}h</b></span>
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
  const monthOpts = React.useMemo(() => { const a = []; const now = new Date(); for (let i = 0; i < 3; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); a.push({ v: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) }); } return a; }, []);
  const [mes, setMes] = React.useState(monthOpts[0].v);
  // BUG 3 fix: admin pode escolher qual equipe dividir (evita UNINTER no modal do Boticario)
  const [grupoDiv, setGrupoDiv] = React.useState("boticario");
  const botiSet = React.useMemo(() => new Set((window.MOCK?.CONTAS_BOTICARIO || []).map(s => s.toLowerCase())), []);
  const kauanaSet = React.useMemo(() => new Set((window.MOCK?.CONTAS_KAUANA || []).map(s => s.toLowerCase())), []);

  // ── Carregar dados da pauta cruzada (BigQuery) ──
  // FONTE UNICA: pis_clientes LEFT JOIN checking_logs LEFT JOIN pi_responsaveis
  // Retorna TODOS os PIs planejados, com status de recebimento do formulario
  const [pautaData, setPautaData] = React.useState([]);
  const [pautaLoading, setPautaLoading] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  React.useEffect(() => {
    const API = window.PainelAPI;
    if (!API?.getPautaCruzada) return;
    setPautaLoading(true);
    API.getPautaCruzada(mes).then(res => {
      if (res?.success && res?.pauta) setPautaData(res.pauta);
      else if (Array.isArray(res)) setPautaData(res);
      else setPautaData([]);
    }).catch(() => setPautaData([])).finally(() => setPautaLoading(false));
  }, [mes, refreshKey]);

  const poolAll = React.useMemo(() => {
    if (!pautaData.length) return [];
    if (grupoDiv === "todos") return pautaData;
    if (grupoDiv === "boticario") {
      return pautaData.filter(p => { const ct = (p.conta || "").toLowerCase(); return ct && botiSet.has(ct); });
    }
    // Kauana: filtra por lista explicita de contas
    return pautaData.filter(p => { const ct = (p.conta || "").toLowerCase(); return ct && kauanaSet.has(ct); });
  }, [pautaData, grupoDiv]);

  // ── Stats da pauta cruzada (o que a Marlene pediu) ──
  const pautaStats = React.useMemo(() => {
    if (!poolAll.length) return null;
    const total = poolAll.length;
    const recebidos = poolAll.filter(p => p.status_formulario === "recebido").length;
    const aguardando = poolAll.filter(p => p.status_formulario === "aguardando").length;
    const baixados = poolAll.filter(p => p.status_checking === "approved").length;
    const pendentes = poolAll.filter(p => p.status_checking === "pending").length;
    return { total, recebidos, aguardando, baixados, pendentes };
  }, [poolAll]);

  // ── Por conta: agrupa PIs da pauta por conta (Eudora, Boti SP, etc) ──
  const contasGrupo = React.useMemo(() => {
    const m = {};
    poolAll.forEach(p => {
      const k = p.conta || "Sem conta";
      if (!m[k]) m[k] = { conta: k, pis: [], pracas: new Set(), recebidos: 0, aguardando: 0 };
      m[k].pis.push(p);
      if (p.praca) m[k].pracas.add(p.praca);
      if (p.status_formulario === "recebido") m[k].recebidos++;
      else m[k].aguardando++;
    });
    return Object.values(m).sort((a, b) => b.pis.length - a.pis.length);
  }, [poolAll]);

  // contaSplit: { "BOT SP": [{ name: "Marlene", qty: 76 }, { name: "Brenda", qty: 41 }] }
  const [contaSplit, setContaSplit] = React.useState({});
  const [contaSearch, setContaSearch] = React.useState("");
  const [showLimit, setShowLimit] = React.useState(30);
  React.useEffect(() => {
    const init = {};
    contasGrupo.forEach(g => {
      const counts = {};
      // Usa responsavel da pauta (pi_responsaveis), nao assigned_to do formulario
      g.pis.forEach(p => { if (p.responsavel) counts[p.responsavel] = (counts[p.responsavel] || 0) + 1; });
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      init[g.conta] = entries.length ? entries.map(([name, qty]) => ({ name, qty })) : [{ name: "", qty: g.pis.length }];
    });
    setContaSplit(init);
  }, [contasGrupo]);
  const addPerson = (conta) => setContaSplit(p => ({ ...p, [conta]: [...(p[conta] || []), { name: "", qty: 0 }] }));
  const rmPerson = (conta, idx) => setContaSplit(p => ({ ...p, [conta]: (p[conta] || []).filter((_, i) => i !== idx) }));
  const setPerson = (conta, idx, field, val) => setContaSplit(p => ({ ...p, [conta]: (p[conta] || []).map((x, i) => i === idx ? { ...x, [field]: field === "qty" ? Math.max(0, Number(val) || 0) : val } : x) }));
  const contasAtribuidas = contasGrupo.filter(g => (contaSplit[g.conta] || []).some(s => s.name && s.qty > 0)).length;
  const pisAtribuidos = contasGrupo.reduce((s, g) => s + (contaSplit[g.conta] || []).filter(x => x.name).reduce((a, x) => a + x.qty, 0), 0);

  // Confirmar: usa bulk_assign_responsible (1 request, MERGE unico).
  // Fallback: se o n8n nao tiver o endpoint bulk, faz individual em batches.
  const [saving, setSaving] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState({ done: 0, total: 0, errors: 0 });

  const confirm = async () => {
    const API = window.PainelAPI;

    // ── Validacao de overflow ──
    // Se a soma dos PIs atribuidos excede o total disponivel na conta, bloquear
    const overflows = [];
    contasGrupo.forEach(g => {
      const splits = (contaSplit[g.conta] || []).filter(s => s.name && s.qty > 0);
      if (!splits.length) return;
      const totalAssigned = splits.reduce((s, x) => s + x.qty, 0);
      if (totalAssigned > g.pis.length) {
        overflows.push(`${g.conta}: ${totalAssigned} atribuidos, mas so tem ${g.pis.length} PIs`);
      }
    });
    if (overflows.length > 0) {
      onToast?.({ type: "warn", message: `Ajuste as quantidades:\n${overflows.join('\n')}` });
      return;
    }

    // ── Montar lista de atribuicoes ──
    const jobs = [];
    contasGrupo.forEach(g => {
      const splits = (contaSplit[g.conta] || []).filter(s => s.name && s.qty > 0);
      if (!splits.length) return;
      let idx = 0;
      splits.forEach(s => {
        for (let i = 0; i < s.qty && idx < g.pis.length; i++, idx++) {
          jobs.push({ n_pi: g.pis[idx].n_pi, responsavel: s.name, mes_referencia: mes, conta: g.conta, submission_id: g.pis[idx].submission_id });
        }
      });
    });
    if (!jobs.length) { onToast?.({ type: "info", message: "Nenhum PI para atribuir." }); return; }

    setSaving(true);
    setSaveProgress({ done: 0, total: jobs.length, errors: 0, eta: '' });

    // ── LOTES SEQUENCIAIS de 150: evita timeout do proxy (60s) ──
    // Cada lote faz 1 MERGE com UNNEST no BigQuery (~3-8s para 150 PIs).
    // Antes: 1 bulk de 594 podia estourar o timeout → 502.
    // Antes disso: 594 requests individuais → 594 MERGEs → serialização.
    const BATCH_SIZE = 150;
    let done = 0;
    let batchErrors = 0;

    try {
      for (let b = 0; b < jobs.length; b += BATCH_SIZE) {
        const batch = jobs.slice(b, b + BATCH_SIZE);
        const assignments = batch.map(j => ({
          n_pi: j.n_pi,
          responsavel: j.responsavel,
          mes_referencia: mes,
          conta: j.conta
        }));

        try {
          await API.bulkAssignResponsible(assignments);
          done += batch.length;
          setSaveProgress({ done, total: jobs.length, errors: batchErrors, eta: '' });
        } catch (batchErr) {
          batchErrors++;
          console.error(`[Divisao] Lote ${Math.floor(b / BATCH_SIZE) + 1} falhou:`, batchErr);
          // Parar no primeiro erro — os lotes anteriores já salvaram
          setSaving(false);
          onToast?.({ type: "error", message: `${done} de ${jobs.length} PIs salvos. Lote ${Math.floor(b / BATCH_SIZE) + 1} falhou: ${batchErr?.message || 'erro'}. Recarregue e reenvie o restante.` });
          // Aplicar update otimista parcial (só os que salvaram)
          if (done > 0) {
            const partialMap = {};
            jobs.slice(0, done).forEach(j => { if (j.submission_id) partialMap[j.submission_id] = j.responsavel; });
            if (Object.keys(partialMap).length > 0) onAssign && onAssign(partialMap);
            setRefreshKey(k => k + 1);
          }
          return;
        }
      }

      // Todos os lotes OK — update otimista completo
      const assignMap = {};
      jobs.forEach(j => { if (j.submission_id) assignMap[j.submission_id] = j.responsavel; });
      if (Object.keys(assignMap).length > 0) onAssign && onAssign(assignMap);

      setSaving(false);
      onToast?.({ type: "success", message: `${jobs.length} PIs de ${contasAtribuidas} contas atribuidos com sucesso. Recarregando...` });
      setRefreshKey(k => k + 1);
    } catch (err) {
      setSaving(false);
      console.error('[Divisao] Bulk assign failed:', err);
      onToast?.({ type: "error", message: `Falha ao salvar: ${err?.message || 'erro desconhecido'}. ${done} de ${jobs.length} PIs foram salvos.` });
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
        {/* Seletores: mes + equipe na mesma row, com min-width pra nao truncar */}
        <div className="row gap-3" style={{ flexWrap: "wrap" }}>
          <div className="col" style={{ gap: 6, minWidth: 180 }}>
            <label className="eyebrow" style={{ fontSize: 10 }}>Mês da demanda</label>
            <select className="input" value={mes} onChange={e => setMes(e.target.value)} style={{ textTransform: "capitalize", width: "100%" }}>{monthOpts.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}</select>
          </div>
          {/* BUG 3 fix: seletor de equipe pra admin nao misturar Boticario com Uninter */}
          <div className="col" style={{ gap: 6, minWidth: 140 }}>
            <label className="eyebrow" style={{ fontSize: 10 }}>Equipe</label>
            <select className="input" value={grupoDiv} onChange={e => { setGrupoDiv(e.target.value); setShowLimit(30); }} style={{ width: "100%" }}>
              <option value="boticario">Boticario</option>
              <option value="kauana">Kauana</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>

        {/* Stats da pauta cruzada (visão Marlene/Anne) - row separada */}
        {pautaLoading && <p className="body-xs muted" style={{ margin: 0 }}>Carregando dados da pauta...</p>}
        {pautaStats && (
          <div className="row gap-3" style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 8, flexWrap: "wrap" }}>
            <div className="col" style={{ gap: 0, alignItems: "center", flex: 1, minWidth: 60 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{pautaStats.total}</span>
              <span className="body-xs muted">Total pauta</span>
            </div>
            <div className="col" style={{ gap: 0, alignItems: "center", flex: 1, minWidth: 60 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{pautaStats.recebidos}</span>
              <span className="body-xs muted">Recebidos</span>
            </div>
            <div className="col" style={{ gap: 0, alignItems: "center", flex: 1, minWidth: 60 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--warn)" }}>{pautaStats.aguardando}</span>
              <span className="body-xs muted">Aguardando</span>
            </div>
            <div className="col" style={{ gap: 0, alignItems: "center", flex: 1, minWidth: 60 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>{pautaStats.baixados}</span>
              <span className="body-xs muted">Baixados</span>
            </div>
            <div className="col" style={{ gap: 0, alignItems: "center", flex: 1, minWidth: 60 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--alert)" }}>{pautaStats.pendentes}</span>
              <span className="body-xs muted">Pendentes</span>
            </div>
          </div>
        )}

        <p className="body-sm" style={{ margin: 0 }}>Cada conta pode ser dividida entre multiplas pessoas. Defina a quantidade de PIs para cada responsavel.</p>
          {/* REQ (01/jul 00:18:38 Phillipe): busca para filtrar contas no modal */}
          <input className="input" placeholder="Buscar conta..." value={contaSearch} onChange={e => setContaSearch(e.target.value)} style={{ marginBottom: 8, fontSize: 13 }}/>
          {pautaLoading ? <p className="body-xs muted" style={{ margin: 0, textAlign: "center", padding: 20 }}>Carregando pauta do BigQuery...</p> : contasGrupo.length === 0 ? <Empty title="Sem PIs na pauta deste mes" hint="Verifique o mes selecionado ou se a pauta foi importada." icon="layers"/> : (() => {
            const searched = contasGrupo.filter(g => !contaSearch || g.conta.toLowerCase().includes(contaSearch.toLowerCase()));
            const visible = contaSearch ? searched : searched.slice(0, showLimit);
            const hasMore = !contaSearch && searched.length > showLimit;
            return (
            <div className="div-conta-list">
              {visible.map(g => {
                const splits = contaSplit[g.conta] || [];
                const totalAssigned = splits.reduce((s, x) => s + (x.qty || 0), 0);
                const remaining = g.pis.length - totalAssigned;
                return (
                <div key={g.conta} className={"div-conta-row " + (splits.some(s => s.name && s.qty > 0) ? "set" : "")} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{g.conta}</span>
                      <span className="body-xs muted">{g.pis.length} PIs · {g.recebidos} recebidos{g.aguardando > 0 && <span style={{ color: "var(--warn)" }}> · {g.aguardando} aguardando</span>} {remaining !== 0 && <span style={{ color: remaining > 0 ? "var(--warn)" : "var(--alert)" }}>({remaining > 0 ? `${remaining} sem responsavel` : `${Math.abs(remaining)} a mais`})</span>}</span>
                    </div>
                    <button className="btn btn-quiet sm" onClick={() => addPerson(g.conta)} style={{ flexShrink: 0 }}><Icon name="plus" size={12}/> Pessoa</button>
                  </div>
                  {splits.map((s, si) => (
                    <div key={si} className="row gap-2" style={{ alignItems: "center" }}>
                      <select className="input" value={s.name} onChange={e => setPerson(g.conta, si, "name", e.target.value)} style={{ flex: 1, height: 32, fontSize: 12 }}>
                        <option value="">Selecionar</option>
                        {team.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <input type="number" className="input" value={s.qty} min={0} max={g.pis.length} onChange={e => setPerson(g.conta, si, "qty", e.target.value)} style={{ width: 64, height: 32, fontSize: 12, textAlign: "center" }} title="Quantidade de PIs"/>
                      <span className="body-xs muted" style={{ width: 20 }}>PIs</span>
                      {splits.length > 1 && <button className="icon-btn" onClick={() => rmPerson(g.conta, si)} title="Remover" style={{ flexShrink: 0 }}><Icon name="x" size={12}/></button>}
                    </div>
                  ))}
                </div>
              );})}
              {hasMore && <button className="btn btn-quiet" onClick={() => setShowLimit(l => l + 30)} style={{ width: "100%", padding: 10, fontSize: 12, marginTop: 4 }}>Mostrar mais ({searched.length - showLimit} restantes)</button>}
            </div>
          );})()}
      </div>
      <div className="row gap-3" style={{ justifyContent: "space-between", padding: "14px 22px", borderTop: "1px solid var(--rule)" }}>
        <span className="body-xs muted">{saving ? `Salvando ${saveProgress.done}/${saveProgress.total} PIs...${saveProgress.errors ? ` (${saveProgress.errors} erros)` : ''}` : `${contasAtribuidas}/${contasGrupo.length} contas · ${pisAtribuidos} PIs`}</span>
        <div className="row gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" icon={saving ? "hourglass_empty" : "check"} disabled={!contasAtribuidas || saving} onClick={confirm}>{saving ? `Salvando... ${saveProgress.done}/${saveProgress.total}` : "Confirmar divisão"}</Button>
        </div>
      </div>
    </div>
  </>);
}
window.ScreenProducao = ScreenProducao;
