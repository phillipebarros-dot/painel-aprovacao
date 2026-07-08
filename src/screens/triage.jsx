// screen-triage.jsx — Modo Revisão em sequência (triagem rápida) -> window.ScreenTriage
function ScreenTriage({ queue, currentUser, onDecide, onClose }) {
  const H = window.H;
  const [idx, setIdx] = React.useState(0);
  const [reasonOpen, setReasonOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [tally, setTally] = React.useState({ approved: 0, rejected: 0, skipped: 0 });
  const [done, setDone] = React.useState(false);
  const [anim, setAnim] = React.useState("in");
  const [assets, setAssets] = React.useState([]);
  const [loadingFiles, setLoadingFiles] = React.useState(true);
  const [lightbox, setLightbox] = React.useState(null);
  const [noteDraft, setNoteDraft] = React.useState("");
  const total = queue.length;
  const c = queue[idx];

  // Regras e alertas (mesma logica do Review)
  const RA = window.RULES_API;
  const rInfo = React.useMemo(() => RA && c ? RA.rulesForChecking(c) : { codes: [], isUninter: false }, [c]);
  const meio = (c?.meio || "").trim().toUpperCase();
  const isOOH = ["OD", "FL", "DO"].includes(meio);
  const totalFiles = assets.reduce((s, g) => s + g.files.length, 0);
  const onlyPhotos = !loadingFiles && totalFiles > 0 && assets.every(g => g.files.every(f => f.isImage));
  const ageH = c ? H.slaAgeH(c) : 0;
  const isLate = c ? H.norm(c.status) === "pending" && ageH >= 4 : false;

  React.useEffect(() => {
    if (!c) return;
    setLoadingFiles(true); setAssets([]); setReasonOpen(false); setReason("");
    let alive = true;
    window.MOCK.loadFiles(c.submission_id).then(fs => { if (alive) { setAssets(fs); setLoadingFiles(false); } });
    return () => { alive = false; };
  }, [idx, c?.submission_id]);

  const advance = React.useCallback(() => {
    setAnim("out");
    setTimeout(() => {
      if (idx + 1 >= total) setDone(true);
      else { setIdx(i => i + 1); setAnim("in"); }
    }, 200);
  }, [idx, total]);

  const approve = React.useCallback(() => {
    if (!c) return;
    onDecide(c, "approve");
    setTally(t => ({ ...t, approved: t.approved + 1 }));
    advance();
  }, [c, onDecide, advance]);

  const doReject = React.useCallback(() => {
    if (!c || !reason.trim()) return;
    onDecide(c, "reject", reason.trim());
    setTally(t => ({ ...t, rejected: t.rejected + 1 }));
    advance();
  }, [c, reason, onDecide, advance]);

  const skip = React.useCallback(() => { setTally(t => ({ ...t, skipped: t.skipped + 1 })); advance(); }, [advance]);
  const prev = React.useCallback(() => { if (idx > 0) { setAnim("out"); setTimeout(() => { setIdx(i => i - 1); setAnim("in"); }, 150); } }, [idx]);

  React.useEffect(() => {
    const h = (e) => {
      if (done) { if (e.key === "Escape") onClose(); return; }
      const typing = e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT";
      if (e.key === "Escape") { if (lightbox) { setLightbox(null); } else if (reasonOpen) { setReasonOpen(false); } else onClose(); return; }
      if (reasonOpen) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); doReject(); } return; }
      if (typing) return;
      const k = e.key.toLowerCase();
      if (k === "a") { e.preventDefault(); approve(); }
      else if (k === "r") { e.preventDefault(); setReasonOpen(true); }
      else if (k === "s") { e.preventDefault(); skip(); }
      else if (e.key === "ArrowRight") skip();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [done, reasonOpen, approve, doReject, skip, prev, onClose]);

  const processed = tally.approved + tally.rejected + tally.skipped;
  const pct = total ? Math.round((Math.min(idx, total) / total) * 100) : 0;

  return (
    <div className="triage-stage content" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="triage-shell">
        {/* Header */}
        <div className="triage-head">
          <div className="row gap-3">
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}><Icon name="bolt" size={17}/></div>
            <div className="col" style={{ gap: 1 }}><div className="h2">Revisão em sequência</div><div className="body-xs">Fila de pendentes · decida rápido pelo teclado</div></div>
          </div>
          <div className="spacer"/>
          {!done && <div className="row gap-3" style={{ marginRight: 8 }}>
            <span className="triage-tally ok"><Icon name="check" size={12}/> {tally.approved}</span>
            <span className="triage-tally no"><Icon name="x" size={12}/> {tally.rejected}</span>
            <span className="triage-tally sk">pulados {tally.skipped}</span>
          </div>}
          <button className="icon-btn" onClick={onClose} title="Sair (Esc)"><Icon name="x" size={16}/></button>
        </div>
        {/* Progress */}
        {!done && <div className="triage-progress"><div className="triage-progress-fill" style={{ width: pct + "%" }}/></div>}

        {done ? (
          <div className="triage-done">
            <div className="triage-done-badge"><Icon name="check" size={34} strokeWidth={2.2}/></div>
            <h2 className="display-1" style={{ marginTop: 18 }}>Fila revisada</h2>
            <p style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 6 }}>Você processou {processed} {processed === 1 ? "checking" : "checkings"} nesta sessão.</p>
            <div className="row gap-4" style={{ marginTop: 26 }}>
              <div className="triage-done-stat"><div className="kpi-value" style={{ color: "var(--accent)" }}>{tally.approved}</div><div className="eyebrow">aprovados</div></div>
              <div className="triage-done-stat"><div className="kpi-value" style={{ color: "var(--alert)" }}>{tally.rejected}</div><div className="eyebrow">reprovados</div></div>
              <div className="triage-done-stat"><div className="kpi-value" style={{ color: "var(--ink-3)" }}>{tally.skipped}</div><div className="eyebrow">pulados</div></div>
            </div>
            <Button variant="primary" size="lg" iconRight="arrow_right" style={{ marginTop: 28 }} onClick={onClose}>Concluir</Button>
          </div>
        ) : c ? (
          <div className={"triage-body " + (anim === "out" ? "swipe-out" : "swipe-in")} key={c.submission_id}>
            {/* Main: meta + assets */}
            <div className="triage-main">
              <div className="row gap-3" style={{ marginBottom: 4 }}>
                <span className="cell-mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>{idx + 1} / {total}</span>
                {c.is_complement === 1 && <Pill status="info">Complemento</Pill>}
                {c.rejection_count > 0 && <Pill status="rejected">Reprovado {c.rejection_count}×</Pill>}
              </div>
              <h2 className="display-2">{c.cliente}</h2>
              <div className="row gap-6" style={{ marginTop: 10, marginBottom: 20, flexWrap: "wrap" }}>
                {[["PI", c.n_pi, true], ["Veículo", c.veiculo], ["Meio", c.meio], ["Praça", c.praca], ["Recebido", H.fmtRelTime(c.submittedAt)], ["Arquivos", c.total_arquivos, true]].map(([k, v, m]) => (
                  <div key={k} className="col" style={{ gap: 2 }}><div className="eyebrow">{k}</div><div style={{ fontSize: 14, color: "var(--ink)", fontFamily: m ? "var(--font-mono)" : "inherit" }}>{v}</div></div>
                ))}
              </div>
              {(() => {
                return <>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>{loadingFiles ? "Carregando arquivos…" : `${totalFiles || c.total_arquivos || 0} assets do Drive`}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                    {loadingFiles && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel" style={{ aspectRatio: "4/3", borderRadius: 11 }}/>)}
                    {!loadingFiles && totalFiles === 0 && (c.total_arquivos > 0 || c.webViewLink) && (
                      <div className="card card-pad" style={{ gridColumn: "1/-1", textAlign: "center", padding: 24 }}>
                        <Icon name="folder" size={28} style={{ color: "var(--ink-3)", marginBottom: 8 }}/>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>Arquivos não carregaram. Verifique no Drive:</p>
                        <a href={c.webViewLink || (c.drive_folder_id ? `https://drive.google.com/drive/folders/${c.drive_folder_id}` : `https://drive.google.com/drive/search?q=${encodeURIComponent(c.n_pi)}`)} target="_blank" rel="noreferrer" className="btn btn-accent sm" style={{ marginTop: 10 }}>Abrir pasta no Drive ↗</a>
                      </div>
                    )}
                    {assets.flatMap((g, gi) => g.files.map((f, fi) => <AssetCard key={f.id_imagem || f.id || fi} file={f} index={fi} group={g} onOpen={(file) => setLightbox(file)}/>))}
                  </div>
                </>;
              })()}
              {/* REQ 2 (01/07): removida exibicao de c.observacoes (Publi). */}
              {/* Alertas */}
              {/* FIX B1.2: blindar toFixed contra NaN */}
              {isLate && <div className="card card-pad" style={{ background: "var(--alert-soft)", border: "1px solid color-mix(in srgb, var(--alert) 30%, var(--rule))", padding: "10px 14px", marginTop: 12 }}><div className="row gap-2" style={{ alignItems: "center" }}><Icon name="warn" size={14} style={{ color: "var(--alert-ink)" }}/><span style={{ fontSize: 12.5, color: "var(--alert-ink)" }}><b>SLA {(Number(ageH) || 0).toFixed(0)}h</b> desde o fim da veiculacao. Priorize a decisao.</span></div></div>}
              {onlyPhotos && <div className="card card-pad" style={{ background: "var(--warn-soft)", border: "1px solid color-mix(in srgb, var(--warn) 30%, var(--rule))", padding: "10px 14px", marginTop: 12 }}><div className="row gap-2" style={{ alignItems: "center" }}><Icon name="warn" size={14} style={{ color: "var(--warn-ink)" }}/><span style={{ fontSize: 12.5, color: "var(--warn-ink)" }}><b>Atencao:</b> apenas fotos. Exija comprovante de veiculacao (PDF/mapa).</span></div></div>}
              {/* Chips completude Uninter */}
              {isOOH && rInfo.isUninter && !loadingFiles && assets.map((group, gi) => {
                const imgCount = group.files.filter(f => f.isImage).length;
                const vidCount = group.files.filter(f => f.isVideo).length;
                const tags = [{ key: "perto", label: "Foto perto", need: 1, have: imgCount >= 1 }, { key: "longe", label: "Foto longe", need: 1, have: imgCount >= 2 }];
                if (meio === "FL") tags.push({ key: "noturna", label: "Noturna", need: 1, have: imgCount >= 3 });
                if (meio === "DO") tags.push({ key: "video", label: "Video", need: 0, have: vidCount > 0, optional: true });
                const allOk = tags.filter(t => !t.optional).every(t => t.have);
                return <div key={gi} className="row gap-2" style={{ flexWrap: "wrap", marginTop: gi === 0 ? 12 : 4 }}>
                  <span className="eyebrow" style={{ fontSize: 10, width: "100%" }}>{group.endereco || `Endereco ${gi + 1}`}</span>
                  {tags.map(t => <span key={t.key} className={"pill " + (t.have ? "pill-ok" : t.optional ? "pill-neutral" : "pill-alert")} style={{ fontSize: 10 }}>{t.have ? "\u2713" : "\u2717"} {t.label}</span>)}
                  {!allOk && <span style={{ fontSize: 11, color: "var(--alert)", fontWeight: 600 }}>Faltam arquivos</span>}
                </div>;
              })}
            </div>

            {/* Decision rail */}
            <div className="triage-rail">
              {!reasonOpen ? (
                <div className="col gap-3">
                  <button className="triage-big-btn approve" onClick={approve}><Icon name="check" size={20} strokeWidth={2.2}/><span>Aprovar</span><span className="kbd">A</span></button>
                  <button className="triage-big-btn reject" onClick={() => setReasonOpen(true)}><Icon name="x" size={20} strokeWidth={2.2}/><span>Reprovar</span><span className="kbd">R</span></button>
                  <button className="triage-big-btn skip" onClick={skip}><Icon name="arrow_right" size={18}/><span>Pular</span><span className="kbd">S</span></button>
                </div>
              ) : (
                <div className="col gap-3">
                  <div className="eyebrow" style={{ color: "var(--alert)" }}>Motivo da reprovação</div>
                  <textarea className="input" rows={4} autoFocus placeholder="Ex: faltam fotos do período…" value={reason} onChange={e => setReason(e.target.value)}/>
                  <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                    {["Arquivos incompletos", "Baixa resolução", "Data inconsistente", "Sem assinatura"].map(s => <button key={s} className="pill pill-neutral" style={{ cursor: "pointer" }} onClick={() => setReason(reason ? reason + " " + s : s)}>+ {s}</button>)}
                  </div>
                  <Button variant="danger" icon="x" disabled={!reason.trim()} onClick={doReject}>Reprovar e notificar</Button>
                  <Button variant="quiet" onClick={() => { setReasonOpen(false); setReason(""); }}>Cancelar</Button>
                  <div className="body-xs muted" style={{ textAlign: "center" }}>⌘+Enter para confirmar</div>
                </div>
              )}
              <div className="hr" style={{ margin: "18px 0" }}/>
              {/* Card de regras compacto */}
              {(() => {
                if (!rInfo.codes.length) return null;
                return <div className="col gap-2">
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div className="eyebrow">Regras · {c.meio}</div>
                    {rInfo.isUninter && <span className="pill pill-info" style={{ fontSize: 9 }}>Uninter</span>}
                  </div>
                  {rInfo.codes.map(rule => {
                    const fields = (rInfo.isUninter && rule.uninter) ? rule.uninter : rule.generico;
                    return <div key={rule.code} style={{ fontSize: 12, color: "var(--ink-2)" }}>
                      {fields.map((f, i) => <div key={i} className="row gap-2" style={{ alignItems: "center", padding: "2px 0" }}>
                        <Icon name={f.req ? "check" : "info"} size={11} style={{ color: f.req ? "var(--accent)" : "var(--ink-3)", flexShrink: 0 }}/>
                        <span>{f.label} {f.req ? <b style={{ color: "var(--accent-ink)", fontSize: 10 }}>obr.</b> : <span className="muted" style={{ fontSize: 10 }}>opc.</span>}</span>
                      </div>)}
                    </div>;
                  })}
                </div>;
              })()}
              <div className="col gap-3">
                <div className="eyebrow">Contato</div>
                <div className="row gap-2"><Avatar user={{ nome: c.nome_contato, email: c.email_contato, avatar: c.avatar, color: "#0E7490" }} size={26}/><div className="col" style={{ minWidth: 0 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{c.nome_contato || "—"}</span><span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email_contato || "—"}</span></div></div>
              </div>
              <div className="hr" style={{ margin: "14px 0" }}/>
              <div className="col gap-2">
                <div className="eyebrow">Nota interna</div>
                <div className="row gap-2">
                  <input className="input" style={{ flex: 1, fontSize: 12.5 }} placeholder="Anotar observacao interna..." value={noteDraft} onChange={e => setNoteDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && noteDraft.trim()) { const ckey = 'painel_notes_' + c.submission_id; const existing = JSON.parse(localStorage.getItem(ckey) || '[]'); const note = { id: Date.now(), text: noteDraft.trim(), tag: 'nota', author: currentUser?.nome || 'Equipe', color: currentUser?.color || '#0E7490', ts: Date.now() }; localStorage.setItem(ckey, JSON.stringify([note, ...existing])); window.PainelAPI?.addComment?.(c.submission_id, noteDraft.trim(), currentUser?.nome || 'Equipe').catch(() => {}); setNoteDraft(''); } }}/>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer nav */}
        {!done && <div className="triage-foot">
          <Button variant="ghost" size="sm" icon="chevron_left" onClick={prev} disabled={idx === 0}>Anterior</Button>
          <div className="row gap-3" style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            <span className="row gap-2"><span className="kbd">A</span> aprovar</span><span className="row gap-2"><span className="kbd">R</span> reprovar</span><span className="row gap-2"><span className="kbd">S</span> pular</span><span className="row gap-2"><span className="kbd">←</span><span className="kbd">→</span></span>
          </div>
          <Button variant="ghost" size="sm" iconRight="chevron_right" onClick={skip} disabled={idx >= total - 1 && false}>Próximo</Button>
        </div>}
      </div>
      {/* FIX Roseli: lightbox preto puro -> navy */}
      {lightbox && (
        <div className="triage-stage" style={{ background: "rgba(8,16,30,0.90)", zIndex: 9999 }} onClick={() => setLightbox(null)} onKeyDown={e => { if (e.key === 'Escape') setLightbox(null); }}>
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
            <button className="icon-btn" onClick={() => setLightbox(null)} style={{ color: "#fff" }}><Icon name="x" size={22}/></button>
          </div>
          <div style={{ position: "absolute", top: 16, left: 16, zIndex: 2 }}>
            {/* FIX Roseli: botao drive preto -> navy */}
            <a href={lightbox.viewUrl || lightbox.webViewLink || (lightbox.id_imagem ? `https://drive.google.com/file/d/${lightbox.id_imagem}/view` : '#')} target="_blank" rel="noreferrer" style={{ color: "#6e7681", fontSize: 12, textDecoration: "none", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(150,190,255,0.15)", background: "rgba(8,16,30,0.5)" }}>Abrir no Drive</a>
          </div>
          <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", padding: 40 }} onClick={e => e.stopPropagation()}>
            {lightbox.id_imagem ? (
              <div style={{ width: "90vw", height: "85vh" }}><LightboxEmbed file={lightbox}/></div>
            ) : (
              <div className="col" style={{ alignItems: "center", gap: 16 }}>
                <Icon name={lightbox.isPdf ? "pdf" : lightbox.isVideo ? "play" : "image"} size={60} style={{ color: "#fff" }}/>
                <a href={lightbox.viewUrl || lightbox.webViewLink || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-accent">Abrir no Drive</a>
              </div>
            )}
            <div style={{ color: "#fff", fontSize: 13, marginTop: 12, opacity: 0.7, textAlign: "center" }}>{lightbox.detalhe || lightbox.address || ""}</div>
          </div>
        </div>
      )}
    </div>
  );
}
window.ScreenTriage = ScreenTriage;
