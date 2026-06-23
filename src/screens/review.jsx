// screen-review.jsx -> window.ScreenReview
function AssetCard({ file: f, index, group, onOpen, onDelete }) {
  const typeLabel = f.isVideo ? "MP4" : f.isPdf ? "PDF" : "JPG";
  const typeClass = f.isVideo ? "video" : f.isPdf ? "pdf" : "img";
  const thumb = f.thumbnailUrl || null;
  const [imgError, setImgError] = React.useState(false);
  const hue = (index * 47 + (f.id_imagem?.length || f.id?.length || 3) * 13) % 360;
  const fallbackBg = `linear-gradient(135deg, hsl(${hue},22%,28%), hsl(${(hue + 40) % 360},26%,18%))`;
  return (
    <div className="asset-card" onClick={() => onOpen({ ...f, address: group.endereco })}>
      <div className={"asset-thumb " + typeClass} style={{ background: (f.isImage && (!thumb || imgError)) ? fallbackBg : undefined, position: "relative", overflow: "hidden" }}>
        {f.isImage && thumb && !imgError ? (
          <img src={thumb} alt={f.detalhe} onError={() => setImgError(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" referrerPolicy="no-referrer"/>
        ) : f.isVideo ? (
          <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", position: "relative" }}>
            {thumb && !imgError ? <img src={thumb} alt="" onError={() => setImgError(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4, filter: "blur(1px)" }} loading="lazy" referrerPolicy="no-referrer"/> : null}
            <div style={{ width: 44, height: 44, borderRadius: 99, background: "rgba(255,255,255,0.14)", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.2)", zIndex: 1 }}><Icon name="play" size={18} style={{ color: "#fff", marginLeft: 2 }}/></div>
          </div>
        ) : f.isPdf ? (
          <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><Icon name="pdf" size={30}/></div>
        ) : (
          <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><div style={{ fontSize: 32, fontWeight: 600, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>{String(index + 1).padStart(2, "0")}</div></div>
        )}
        <span className="tag">{f.tag}</span>
        {onDelete && <button className="asset-del" title="Excluir arquivo" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Icon name="x" size={13} strokeWidth={2.4}/></button>}
        <div className="asset-overlay"><span className="label">Visualizar</span></div>
      </div>
      <div className="asset-meta"><span>{f.detalhe}</span><span className="muted-2">{typeLabel}</span></div>
    </div>
  );
}


function ScreenReview({ checking, currentUser, onBack, onDecide }) {
  const H = window.H;
  const isViewer = currentUser?.role === "viewer";
  const [decision, setDecision] = React.useState(null);
  const [reason, setReason] = React.useState("");
  const [ackPhotos, setAckPhotos] = React.useState(false);
  const [lateReason, setLateReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [lightbox, setLightbox] = React.useState(null);

  const [filesLoading, setFilesLoading] = React.useState(true);
  const [assets, setAssets] = React.useState([]);
  const ckey = "painel_notes_" + checking.submission_id;
  const [notes, setNotes] = React.useState(() => { try { return JSON.parse(localStorage.getItem(ckey) || "[]"); } catch { return []; } });
  const [draft, setDraft] = React.useState("");
  const [tag, setTag] = React.useState("nota");
  React.useEffect(() => { try { setNotes(JSON.parse(localStorage.getItem(ckey) || "[]")); } catch { setNotes([]); } setDraft(""); }, [checking.submission_id]);
  const addNote = () => {
    if (!draft.trim()) return;
    const n = { id: Date.now(), text: draft.trim(), tag, author: currentUser?.nome || currentUser?.name || "Equipe", color: currentUser?.color || "#0E7490", ts: Date.now() };
    const next = [n, ...notes]; setNotes(next); localStorage.setItem(ckey, JSON.stringify(next)); setDraft("");
  };
  const delNote = (id) => { const next = notes.filter(n => n.id !== id); setNotes(next); localStorage.setItem(ckey, JSON.stringify(next)); };
  const rkey = "painel_rating_" + (checking.email_contato || checking.nome_contato || "x");
  const [rating, setRating] = React.useState(() => Number(localStorage.getItem(rkey) || 0));
  React.useEffect(() => { setRating(Number(localStorage.getItem(rkey) || 0)); }, [checking.submission_id]);
  const setStars = (n) => { setRating(n); localStorage.setItem(rkey, String(n)); };

  // Uso interno: links de Drive + reenvios anexados pelo painel (persistidos por PI)
  const lkey = "painel_links_" + checking.submission_id;
  const [links, setLinks] = React.useState(() => { try { return JSON.parse(localStorage.getItem(lkey) || "[]"); } catch { return []; } });
  React.useEffect(() => { try { setLinks(JSON.parse(localStorage.getItem(lkey) || "[]")); } catch { setLinks([]); } }, [checking.submission_id]);
  const [linkDraft, setLinkDraft] = React.useState("");
  const addLink = () => {
    const url = linkDraft.trim(); if (!url) return;
    const author = currentUser?.nome || currentUser?.name || "Equipe";
    const item = { id: Date.now(), url, kind: "link", author, ts: Date.now() };
    const next = [item, ...links]; setLinks(next); localStorage.setItem(lkey, JSON.stringify(next)); setLinkDraft("");
    // Persiste no backend como comentário + link
    window.PainelAPI?.addComment(checking.submission_id, `[DRIVE] ${url}`, author).catch(() => {});
  };
  const addReupload = (kind, detail) => {
    // Abre file picker nativo com validação MIME por tipo
    const acceptMap = {
      foto: ".jpg,.jpeg,.png,.heic,.webp",
      pdf: ".pdf",
      video: ".mp4,.mov,.avi,.webm",
    };
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = acceptMap[kind] || "*/*";
    inp.multiple = true;
    inp.onchange = async () => {
      if (!inp.files?.length) return;
      const base = { foto: "Foto reenviada", pdf: "PDF reenviado", video: "Vídeo reenviado" }[kind];
      const label = detail ? base + " (" + detail + ")" : base;
      const author = currentUser?.nome || currentUser?.name || "Equipe";
      const fileNames = Array.from(inp.files).map(f => f.name).join(", ");
      const item = { id: Date.now(), kind, label: label + ": " + fileNames, author, ts: Date.now(), uploading: true };
      const next = [item, ...links]; setLinks(next); localStorage.setItem(lkey, JSON.stringify(next));
      // Upload real via FormData
      try {
        const fd = new FormData();
        fd.append("action", "upload_supplement");
        fd.append("submission_id", checking.submission_id);
        fd.append("n_pi", checking.n_pi || "");
        fd.append("category", kind);
        fd.append("detail", detail || "");
        fd.append("uploaded_by", author);
        Array.from(inp.files).forEach(f => fd.append("files", f));
        const uploadRes = await window.PainelAPI?.uploadSupplement?.(checking.submission_id, fd);
        // Marca como concluído
        const done = { ...item, uploading: false, success: true };
        const updated = [done, ...links.filter(l => l.id !== item.id)];
        setLinks(updated); localStorage.setItem(lkey, JSON.stringify(updated));
      } catch (err) {
        // Fallback: registra como comentário se endpoint não existe
        const failed = { ...item, uploading: false, success: false };
        const updated = [failed, ...links.filter(l => l.id !== item.id)];
        setLinks(updated); localStorage.setItem(lkey, JSON.stringify(updated));
      }
      window.PainelAPI?.addComment?.(checking.submission_id, `[REUPLOAD] ${label}: ${fileNames}`, author).catch(() => {});
    };
    inp.click();
  };
  const delLink = (id) => { const next = links.filter(l => l.id !== id); setLinks(next); localStorage.setItem(lkey, JSON.stringify(next)); };

  React.useEffect(() => {
    setFilesLoading(true); setAssets([]);
    let alive = true;
    window.MOCK.loadFiles(checking.submission_id).then(fs => { if (alive) { setAssets(fs); setFilesLoading(false); } });
    return () => { alive = false; };
  }, [checking.submission_id]);

  // Keyboard A / R / ESC
  React.useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape" && lightbox) { setLightbox(null); return; }
      if (e.key === "Escape" && decision) { setDecision(null); return; }
      if (checking.status !== "pending" || isViewer) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (decision || lightbox) return;
      if (e.key.toLowerCase() === "a") setDecision("approve");
      if (e.key.toLowerCase() === "r") setDecision("reject");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [checking, decision, lightbox, isViewer]);

  const totalAssets = assets.reduce((s, e) => s + (e.files?.length || 0), 0);
  const onlyPhotos = !filesLoading && totalAssets > 0 && assets.every(g => (g.files || []).every(f => f.isImage));
  const slaProfile = React.useMemo(() => (window.AI && window.AI.loadProfile) ? window.AI.loadProfile() : { slaWarnH: 4 }, []);
  const ageH = (Date.now() - checking.submittedAt) / 3600000;
  const isLate = H.norm(checking.status) === "pending" && ageH >= (slaProfile.slaWarnH || 4);
  const hasLateNote = notes.some(n => n.tag === "atraso");
  const needLate = isLate && !hasLateNote;
  const confirm = () => {
    if (needLate && lateReason.trim()) {
      const n = { id: Date.now(), text: lateReason.trim(), tag: "atraso", author: currentUser?.nome || currentUser?.name || "Equipe", color: currentUser?.color || "#0E7490", ts: Date.now() };
      const next = [n, ...notes]; setNotes(next); localStorage.setItem(ckey, JSON.stringify(next));
    }
    setSubmitting(true); setTimeout(() => onDecide(checking, decision, reason), 400);
  };  const removeFile = (group, file) => {
    if (!window.confirm(`Excluir "${file.detalhe}" deste checking?`)) return;
    setAssets(prev => prev.map(g => g.endereco === group.endereco ? { ...g, files: g.files.filter(x => x !== file) } : g).filter(g => g.files.length > 0));
  };

  const events = React.useMemo(() => {
    const evs = [{ ts: checking.submittedAt, label: "Recebido", detail: `${checking.nome_contato || ""} enviou via fornecedor`, icon: "upload" }];
    if (checking.is_complement === 1) evs.push({ ts: checking.submittedAt + 3600000, label: "Complemento", detail: "Arquivos adicionais", icon: "folder" });
    if (checking.status === "approved") evs.push({ ts: checking.approvedAt, label: "Aprovado", detail: `por ${checking.approval_user}`, icon: "check", status: "approved" });
    if (checking.status === "rejected") evs.push({ ts: checking.rejectedAt, label: "Reprovado", detail: `por ${checking.approval_user}`, icon: "x", status: "rejected" });
    return evs;
  }, [checking]);

  return (
    <div className="page fade-in">
      <div className="row gap-3" style={{ marginBottom: 18, fontSize: 12.5 }}>
        <button className="row gap-2 btn-quiet sm btn" onClick={onBack} style={{ padding: "5px 9px", marginLeft: -8 }}><Icon name="chevron_left" size={14}/>Voltar</button>
        <span className="muted">/</span><span className="cell-mono" style={{ color: "var(--ink-2)" }}>{checking.n_pi}</span>
        <span className="muted">/</span><span className="muted-2">{checking.cliente}</span>
        <span className="spacer"/>
        <a className="row gap-2 btn-quiet sm btn" href={"https://drive.google.com/drive/search?q=" + encodeURIComponent(checking.n_pi)} target="_blank" rel="noreferrer" title="Abrir a pasta deste PI no Google Drive"><Icon name="folder" size={13}/>Abrir pasta no Drive</a>

      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: 32, paddingBottom: 24, borderBottom: "1px solid var(--rule)", marginBottom: 32 }}>
        <div className="col" style={{ gap: 14, flex: 1 }}>
          <div className="row gap-3">
            <Pill status={checking.status}>{checking.status === "pending" ? "Aguardando decisão" : checking.decision_label ? checking.decision_label : checking.status === "approved" ? "Aprovado" : "Reprovado"}</Pill>
            {checking.is_complement === 1 && <Pill status="info">Complemento</Pill>}
            {checking.rejection_count > 0 && <Pill status="rejected">{checking.rejection_count + 1}ª versão</Pill>}
          </div>
          <h1 className="display-1" style={{ marginTop: 4 }}>{checking.cliente}<span style={{ color: "var(--ink-3)", fontWeight: 500 }}> · {checking.veiculo}</span></h1>
          <div className="row gap-6" style={{ marginTop: 8, color: "var(--ink-2)", fontSize: 13, flexWrap: "wrap" }}>
            {[["PI", checking.n_pi, true], ["Meio", checking.meio], ["Praça", checking.praca], ["Submarca", checking.submarca], ["Recebido", `${H.fmtDateLong(checking.submittedAt)} · ${H.fmtTime(checking.submittedAt)}`]].map(([k, v, mono]) => (
              <div key={k} className="col" style={{ gap: 2 }}><div className="eyebrow">{k}</div><div style={{ fontSize: 14, color: "var(--ink)", fontFamily: mono ? "var(--font-mono)" : "inherit" }}>{v}</div></div>
            ))}
          </div>
        </div>
        {checking.status === "pending" && !isViewer && (
          <div className="col gap-3" style={{ width: 280 }}>
            <Button variant="accent" size="lg" icon="check" onClick={() => setDecision("approve")}>Aprovar checking</Button>
            <Button variant="ghost" size="lg" icon="x" onClick={() => setDecision("reject")}>Reprovar e notificar</Button>
            <button className="btn btn-quiet sm" onClick={() => setDecision("sem_checking")}>Liberar sem checking (uso interno)</button>
            <div className="row gap-2" style={{ justifyContent: "center", marginTop: 2, color: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}><span className="kbd">A</span> aprovar <span className="muted">·</span> <span className="kbd">R</span> reprovar</div>
          </div>
        )}
        {checking.status !== "pending" && !isViewer && (
          <div className="col gap-2" style={{ width: 280 }}>
            <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 11, border: "1px solid var(--rule)" }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Alterar status</div>
              <div className="col gap-2">
                {checking.status !== "approved" && <Button variant="accent" size="sm" icon="check" onClick={() => setDecision("approve")}>Mudar para aprovado</Button>}
                {checking.status !== "rejected" && <Button variant="ghost" size="sm" icon="x" onClick={() => setDecision("reject")}>Mudar para reprovado</Button>}
                <Button variant="quiet" size="sm" icon="refresh" onClick={() => setDecision("revert")}>Reabrir (voltar a pendente)</Button>
              </div>
              <div className="body-xs muted" style={{ marginTop: 8 }}>Corrige decisão tomada por engano. Fica registrado no histórico.</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
        <div className="col gap-6">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <div className="col" style={{ gap: 4 }}><div className="eyebrow">Arquivos do drive</div><h2 className="h1">{filesLoading ? "Carregando…" : `${totalAssets} assets · ${assets.length} endereços`}</h2></div>
            {!filesLoading && totalAssets > 0 && <span className="pill pill-neutral" style={{ cursor: "default" }} title="Estes arquivos são de uso interno: reaproveitados em e-mails e materiais de apoio"><Icon name="folder" size={12}/> Uso interno</span>}
          </div>
          {!filesLoading && totalAssets > 0 && assets.every(g => g.files.every(f => f.isImage)) && (
            <div className="card card-pad" style={{ background: "var(--warn-soft)", border: "1px solid color-mix(in srgb, var(--warn) 30%, var(--rule))", padding: "12px 16px" }}>
              <div className="row gap-2" style={{ alignItems: "center" }}><Icon name="warn" size={15} style={{ color: "var(--warn-ink)" }}/><span style={{ fontSize: 13, color: "var(--warn-ink)" }}><b>Atenção:</b> este checking tem apenas fotos. Exija o comprovante de veiculação (mapa ou PDF) antes de aprovar.</span></div>
            </div>
          )}
          {filesLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel" style={{ aspectRatio: "4/3", borderRadius: 11 }}/>)}
            </div>
          )}
          {assets.map((group, gi) => (
            <div key={gi} className="col gap-3">
              <div className="row gap-3" style={{ alignItems: "baseline" }}>
                <span style={{ fontSize: 22, lineHeight: 1, fontWeight: 600, color: "var(--ink-3)" }}>{String(gi + 1).padStart(2, "0")}</span>
                <div className="col" style={{ gap: 2 }}><div className="eyebrow">Endereço</div><div style={{ fontSize: 15, fontWeight: 500 }}>{group.endereco}</div></div>
                <div className="spacer"/><span className="cell-mono muted">{group.files.length} arquivos</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {group.files.map((f, fi) => <AssetCard key={f.id_imagem || f.id || fi} file={f} index={fi} group={group} onOpen={setLightbox} onDelete={!isViewer ? () => removeFile(group, f) : null}/>)}
              </div>
            </div>
          ))}
          {!filesLoading && assets.length === 0 && <Empty title="Nenhum arquivo encontrado" hint="Verifique a pasta no Drive" icon="folder"/>}
          {checking.observacoes && (
            <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Observação do fornecedor</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>"{checking.observacoes}"</p>
            </div>
          )}
          {checking.rejection_reason && (
            <div className="card card-pad" style={{ background: "var(--alert-soft)", border: "1px solid color-mix(in srgb, var(--alert) 30%, var(--rule))" }}>
              <div className="row gap-2" style={{ marginBottom: 8 }}><Icon name="warn" size={16} style={{ color: "var(--alert-ink)" }}/><div className="eyebrow" style={{ color: "var(--alert-ink)" }}>Motivo da reprovação</div></div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--alert-ink)" }}>"{checking.rejection_reason}"</p>
            </div>
          )}
          {!filesLoading && (
            <div className="card card-pad">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
                <div className="eyebrow">Histórico e anotações</div>
                {notes.length > 0 && <span className="numdot">{notes.length}</span>}
              </div>
              {!isViewer && (
                <div className="col gap-2" style={{ marginBottom: notes.length ? 16 : 0 }}>
                  <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                    {[["nota", "Nota"], ["atraso", "Motivo do atraso"], ["pendencia", "Pendência"], ["contato", "Contato feito"]].map(([v, l]) => (
                      <button key={v} className={"pill " + (tag === v ? "pill-approved" : "pill-neutral")} style={{ cursor: "pointer" }} onClick={() => setTag(v)}>{l}</button>
                    ))}
                  </div>
                  <textarea className="input" rows={2} placeholder="Ex: SLA estourado porque o veículo ainda não reenviou o comprovante da 2ª quinzena. Cobrado em 14/06." value={draft} onChange={(e) => setDraft(e.target.value)} style={{ fontSize: 13 }}/>
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <Button variant="primary" size="sm" icon="plus" disabled={!draft.trim()} onClick={addNote}>Registrar no histórico</Button>
                  </div>
                </div>
              )}
              {notes.length === 0 ? (
                isViewer ? <div className="body-xs muted" style={{ marginTop: 4 }}>Nenhuma anotação registrada.</div> : null
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px", marginTop: 4 }}>
                  {notes.map((n, i) => {
                    const tagLabel = { nota: "Nota", atraso: "Motivo do atraso", pendencia: "Pendência", contato: "Contato feito" }[n.tag] || "Nota";
                    return (
                      <div key={n.id} className="note-item" style={{ borderTop: i < 2 ? "none" : "1px solid var(--rule)" }}>
                        <Avatar user={{ nome: n.author, color: n.color }} size={26}/>
                        <div className="col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
                          <div className="row gap-2" style={{ alignItems: "baseline" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{n.author.split(" ")[0]}</span>
                            <span className={"pill " + (n.tag === "atraso" ? "pill-pending" : n.tag === "pendencia" ? "pill-rejected" : "pill-neutral")} style={{ fontSize: 10 }}>{tagLabel}</span>
                            <span className="cell-time" style={{ marginLeft: "auto" }}>{H.fmtRelTime(n.ts)}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{n.text}</div>
                        </div>
                        {!isViewer && n.author === (currentUser?.nome || currentUser?.name) && <button className="note-del" title="Remover" onClick={() => delNote(n.id)}><Icon name="x" size={12} strokeWidth={2.2}/></button>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {(() => {
            const RA = window.RULES_API; if (!RA) return null;
            const { codes, isUninter } = RA.rulesForChecking(checking);
            if (!codes.length) return null;
            return (
              <div className="card card-pad">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div className="eyebrow">Regras de checking · {checking.meio}</div>
                  {isUninter && <span className="pill pill-info">Regra Uninter</span>}
                </div>
                <p className="body-xs muted" style={{ margin: "0 0 12px" }}>Arquivos exigidos do veículo para este meio. Use como referência ao conferir o que foi enviado.</p>
                <div className="col" style={{ gap: 14 }}>
                  {codes.map(rule => {
                    const fields = (isUninter && rule.uninter) ? rule.uninter : rule.generico;
                    return (
                      <div key={rule.code} className="rule-meio">
                        <div className="row gap-2" style={{ alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                          <span className="rule-code">{rule.code}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{rule.nome}</span>
                          {rule.periodo && <span className="pill pill-neutral">exige período</span>}
                          {rule.sample && <span className="pill pill-neutral">amostral {rule.sample}</span>}
                        </div>
                        <div className="col" style={{ gap: 6 }}>
                          {fields.map((f, i) => (
                            <div key={i} className="rule-field">
                              <Icon name={f.req ? "check" : "info"} size={13} style={{ color: f.req ? "var(--accent)" : "var(--ink-3)", flexShrink: 0, marginTop: 2 }}/>
                              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                                <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{f.label} {f.req ? <b style={{ color: "var(--accent-ink)" }}>· obrigatório</b> : <span className="muted">· opcional</span>}{f.bug && <span className="pill pill-rejected" style={{ marginLeft: 6 }}>bug: obrigatório</span>}</span>
                                <span className="body-xs muted" style={{ fontFamily: "var(--font-mono)" }}>{f.fmt} · máx {f.max}{f.mult ? " · múltiplos" : ""}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {rule.nota && <div className="rule-note"><Icon name="warn" size={13} style={{ color: "var(--alert-ink)", flexShrink: 0, marginTop: 1 }}/><span>{rule.nota}</span></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {!filesLoading && !isViewer && (
            <div className="card card-pad">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div className="eyebrow">Uso interno e reenvios</div>
                {links.length > 0 && <span className="numdot">{links.length}</span>}
              </div>
              <p className="body-xs muted" style={{ margin: "0 0 12px" }}>Registre o link da pasta do Drive (material de apoio interno) ou reanexe um arquivo que o fornecedor mandou por WhatsApp/e-mail, sem retrabalho de reenvio.</p>
              <div className="row gap-2" style={{ marginBottom: 10 }}>
                <input className="input" placeholder="Colar link do Drive (pasta do PI)…" value={linkDraft} onChange={e => setLinkDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()} style={{ flex: 1, fontSize: 13 }}/>
                <Button variant="primary" size="sm" icon="plus" disabled={!linkDraft.trim()} onClick={addLink}>Registrar link</Button>
              </div>
              <div className="row gap-2" style={{ marginBottom: links.length ? 14 : 0, flexWrap: "wrap" }}>
                <span className="tb-view-lbl" style={{ alignSelf: "center" }}>Reanexar:</span>
                {(() => {
                  // Regras de reanexar dinâmicas conforme tipo de mídia (meio) do checking
                  const meio = (checking.meio || "").trim().toUpperCase();
                  const REUPLOAD_MAP = {
                    OD: [["foto","de perto"],["foto","de longe"],["foto","noturna"]],
                    FL: [["foto","de perto"],["foto","de longe"],["foto","noturna"]],
                    DO: [["foto","de perto"],["foto","de longe"],["video","diurno"],["pdf","relatorio exibicoes"]],
                    BD: [["foto","frota"],["pdf","relatorio"]],
                    TV: [["pdf","relatorio veiculacao"]],
                    RD: [["pdf","relatorio veiculacao"],["foto",""],["video",""]],
                    JO: [["pdf","pagina escaneada"],["foto",""]],
                    RV: [["pdf","revista digital"],["foto","capa + pagina"]],
                    CI: [["pdf","relatorio exibicao"]],
                    CS: [["video","campanha"],["pdf","fotos datadas"],["pdf","relatorio"]],
                    IN: [["pdf","relatorio veiculacao"],["foto","prints"]],
                    AT: [["pdf","relatorio fotografico"],["video",""],["foto",""]],
                    PY: [["foto","material produzido"],["pdf","nota fiscal"]],
                    MA: [["foto","relatorio fotografico"],["pdf","descricao acao"]],
                    MT: [["pdf","relatorio estacoes"],["foto","amostrais"]],
                    ME: [["pdf","relatorio pontos"],["foto","diurnas"],["foto","noturnas"]],
                    MN: [["foto","todos pontos"],["pdf","relacao locais"]],
                    AS: [["pdf","clipping midia"],["pdf","relatorio resultados"]],
                  };
                  const rules = REUPLOAD_MAP[meio] || [["foto","de perto"],["foto","de longe"],["pdf",""],["video",""]];
                  const allowAudio = meio === "RD";
                  const iconMap = { foto: "image", pdf: "pdf", video: "play" };
                  const labelMap = { foto: "Foto", pdf: "PDF", video: "Vídeo" };
                  return <>
                    {rules.map(([kind, detail], i) => (
                      <button key={i} className="pill pill-neutral" style={{ cursor: "pointer" }} onClick={() => addReupload(kind, detail)}>
                        <Icon name={iconMap[kind] || "image"} size={12}/> {labelMap[kind]}{detail ? ` ${detail}` : ""}
                      </button>
                    ))}
                    {allowAudio && <button className="pill pill-neutral" style={{ cursor: "pointer" }} onClick={() => addReupload("foto", "audio")}><Icon name="play" size={12}/> Áudio</button>}
                    {!allowAudio && <span className="body-xs muted" style={{ alignSelf: "center" }}>áudio não permitido</span>}
                  </>;
                })()}
              </div>
              {links.length > 0 && (
                <div className="col" style={{ gap: 0 }}>
                  {links.map((l, i) => (
                    <div key={l.id} className="row gap-2" style={{ padding: "9px 0", borderTop: i ? "1px solid var(--rule)" : "none", alignItems: "center" }}>
                      <span className="rule-ic" style={{ width: 26, height: 26, background: "var(--accent-soft)", color: "var(--accent)" }}><Icon name={l.kind === "link" ? "folder" : l.kind === "pdf" ? "pdf" : l.kind === "video" ? "play" : "image"} size={13}/></span>
                      {l.kind === "link"
                        ? <a href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--accent-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontFamily: "var(--font-mono)" }}>{l.url}</a>
                        : <span style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>}
                      {l.uploading && <span className="pill pill-blue" style={{ fontSize: 10, padding: "2px 8px" }}>enviando...</span>}
                      {l.success === true && !l.uploading && <span style={{ color: "var(--ok)", fontSize: 13 }} title="Enviado">✓</span>}
                      {l.success === false && !l.uploading && <span style={{ color: "var(--alert)", fontSize: 11 }} title="Falha no upload (registrado como comentario)">falhou</span>}
                      <span className="cell-time">{H.fmtRelTime(l.ts)}</span>
                      <button className="note-del" title="Remover" onClick={() => delLink(l.id)}><Icon name="x" size={12} strokeWidth={2.2}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="col gap-4">
          {checking.status === "pending" && <CopilotPanel checking={checking} isViewer={isViewer} onApprove={() => setDecision("approve")} onReject={() => setDecision("reject")}/>}
          <div className="card card-pad">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Contato fornecedor</div>
            <div className="col gap-3">
              <div><div className="eyebrow" style={{ fontSize: 9.5 }}>Nome</div><div style={{ fontSize: 13.5, fontWeight: 500 }}>{checking.nome_contato}</div></div>
              <div><div className="eyebrow" style={{ fontSize: 9.5 }}>Email</div><div style={{ fontSize: 12.5, color: "var(--ink-2)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{checking.email_contato}</div></div>
              <div><div className="eyebrow" style={{ fontSize: 9.5 }}>Telefone</div>
                {checking.telefone_contato ? (
                  <div className="row gap-2" style={{ alignItems: "center", marginTop: 2 }}>
                    <a href={`tel:${checking.telefone_contato.replace(/\D/g, "")}`} style={{ fontSize: 12.5, color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>{checking.telefone_contato}</a>
                    <a className="btn btn-quiet sm" href={`https://wa.me/55${checking.telefone_contato.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ padding: "3px 9px", fontSize: 11 }} title="Abrir conversa no WhatsApp"><Icon name="bolt" size={11}/> WhatsApp</a>
                  </div>
                ) : <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>-</div>}
              </div>
              <div>
                <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 5 }}>Classificação interna</div>
                <div className="row gap-2" style={{ alignItems: "center" }}>
                  <div className="row" style={{ gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className="star-btn" disabled={isViewer} onClick={() => setStars(n === rating ? 0 : n)} title={`${n} estrela${n > 1 ? "s" : ""}`}>
                        <Icon name="star" size={17} style={{ color: n <= rating ? "var(--warn)" : "var(--ink-4)", fill: n <= rating ? "var(--warn)" : "none" }}/>
                      </button>
                    ))}
                  </div>
                  <span className="body-xs muted">{rating ? `${rating}/5` : "sem nota"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Histórico</div>
            <div className="col" style={{ gap: 16, position: "relative" }}>
              <div style={{ position: "absolute", left: 10, top: 6, bottom: 6, width: 1, background: "var(--rule)" }}/>
              {events.map((ev, i) => (
                <div key={i} className="row gap-3" style={{ alignItems: "flex-start", position: "relative" }}>
                  <div style={{ width: 21, height: 21, borderRadius: 99, background: ev.status === "approved" ? "var(--accent-soft)" : ev.status === "rejected" ? "var(--alert-soft)" : "var(--surface-2)", color: ev.status === "approved" ? "var(--accent)" : ev.status === "rejected" ? "var(--alert)" : "var(--ink-2)", border: "2px solid var(--bg)", display: "grid", placeItems: "center", zIndex: 1, flexShrink: 0 }}><Icon name={ev.icon} size={11} strokeWidth={2}/></div>
                  <div className="col" style={{ gap: 2, lineHeight: 1.4, paddingTop: 2 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{ev.label}</div><div style={{ fontSize: 12, color: "var(--ink-2)" }}>{ev.detail}</div><div className="cell-time" style={{ marginTop: 2 }}>{H.fmtDate(ev.ts)} · {H.fmtTime(ev.ts)}</div></div>
                </div>
              ))}
              {checking.status === "pending" && (
                <div className="row gap-3" style={{ alignItems: "center", position: "relative" }}>
                  <div style={{ width: 21, height: 21, borderRadius: 99, border: "1.5px dashed var(--rule-strong)", background: "var(--bg)", display: "grid", placeItems: "center", zIndex: 1, flexShrink: 0 }}><div style={{ width: 5, height: 5, borderRadius: 99, background: "var(--warn)" }}/></div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)", fontStyle: "italic" }}>Aguardando decisão · {H.fmtRelTime(checking.submittedAt)}</div>
                </div>
              )}
            </div>
          </div>
          <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Metadados</div>
            <div className="col" style={{ gap: 6, fontSize: 12 }}>
              {[["submission_id", checking.submission_id.slice(0, 18) + "…"], ["submarca", checking.submarca], ["total_arquivos", checking.total_arquivos], ["is_complement", checking.is_complement]].map(([k, v]) => (
                <div key={k} className="row" style={{ justifyContent: "space-between" }}><span className="muted">{k}</span><span className="cell-mono" style={{ fontSize: 11 }}>{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Approve modal */}
      {decision === "approve" && (<>
        <div className="scrim" onClick={() => setDecision(null)}/>
        <div className="modal content"><div className="card-pad">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Confirmar aprovação</div>
          <h2 className="display-3" style={{ marginBottom: 8 }}>Aprovar <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{checking.n_pi}</span>?</h2>
          <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 18 }}>Registrado em audit_log. Fornecedor será notificado.</p>
          {onlyPhotos && (
            <label className="row gap-2" style={{ alignItems: "flex-start", padding: "11px 13px", marginBottom: 16, borderRadius: 9, background: "var(--warn-soft)", border: "1px solid color-mix(in srgb, var(--warn) 30%, var(--rule))", cursor: "pointer" }}>
              <input type="checkbox" checked={ackPhotos} onChange={e => setAckPhotos(e.target.checked)} style={{ marginTop: 2 }}/>
              <span style={{ fontSize: 12.5, color: "var(--warn-ink)" }}>Este checking tem <b>apenas fotos</b>. Confirmo que o comprovante documental de veiculação foi exigido ou já consta.</span>
            </label>
          )}
          {needLate && (
            <div style={{ marginBottom: 16 }}>
              <div className="row gap-2" style={{ alignItems: "center", marginBottom: 6 }}><Icon name="clock" size={13} style={{ color: "var(--warn-ink)" }}/><span className="eyebrow" style={{ color: "var(--warn-ink)" }}>Justificativa do atraso (obrigatória)</span></div>
              <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 8px" }}>Este PI está em fila há {H.fmtDur(ageH)}, acima do limite de {slaProfile.slaWarnH}h. Registre o motivo no histórico antes de decidir.</p>
              <textarea className="input" rows={2} placeholder="Ex: veículo reenviou comprovante 2 vezes; aguardava mapa de mídia." value={lateReason} onChange={e => setLateReason(e.target.value)}/>
            </div>
          )}
          <div className="row gap-3" style={{ justifyContent: "flex-end" }}><Button variant="ghost" onClick={() => setDecision(null)}>Cancelar</Button><Button variant="accent" icon="check" loading={submitting} disabled={(onlyPhotos && !ackPhotos) || (needLate && !lateReason.trim())} onClick={confirm}>Confirmar</Button></div>
        </div></div>
      </>)}
      {/* Reject modal */}
      {decision === "reject" && (<>
        <div className="scrim" onClick={() => setDecision(null)}/>
        <div className="modal content" style={{ width: "min(560px, 92vw)" }}><div className="card-pad">
          <div className="eyebrow" style={{ marginBottom: 8, color: "var(--alert)" }}>Reprovar checking</div>
          <h2 className="display-3" style={{ marginBottom: 4 }}>Por que <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{checking.n_pi}</span> está sendo reprovado?</h2>
          <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 16 }}>O motivo será enviado ao fornecedor.</p>
          <textarea className="input" rows={4} placeholder="Ex: faltam fotos…" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus/>
          <div className="row gap-2" style={{ marginTop: 10, flexWrap: "wrap" }}>
            {["Arquivo de complemento", "Baixa resolução", "Data inconsistente", "Sem assinatura"].map(s => <button key={s} className="pill pill-neutral" style={{ cursor: "pointer" }} onClick={() => setReason(reason ? reason + " " + s : s)}>+ {s}</button>)}
          </div>
          {needLate && (
            <div style={{ marginTop: 16 }}>
              <div className="row gap-2" style={{ alignItems: "center", marginBottom: 6 }}><Icon name="clock" size={13} style={{ color: "var(--warn-ink)" }}/><span className="eyebrow" style={{ color: "var(--warn-ink)" }}>Justificativa do atraso (obrigatória)</span></div>
              <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 8px" }}>Este PI está em fila há {H.fmtDur(ageH)}, acima do limite de {slaProfile.slaWarnH}h. Registre o motivo no histórico antes de decidir.</p>
              <textarea className="input" rows={2} placeholder="Ex: veículo reenviou comprovante 2 vezes; aguardava mapa de mídia." value={lateReason} onChange={e => setLateReason(e.target.value)}/>
            </div>
          )}
          <div className="row gap-3" style={{ justifyContent: "flex-end", marginTop: 20 }}><Button variant="ghost" onClick={() => setDecision(null)}>Cancelar</Button><Button variant="danger" icon="x" loading={submitting} disabled={!reason.trim() || (needLate && !lateReason.trim())} onClick={confirm}>Reprovar</Button></div>
        </div></div>
      </>)}
      {/* Revert modal */}
      {decision === "revert" && (<>
        <div className="scrim" onClick={() => setDecision(null)}/>
        <div className="modal content"><div className="card-pad">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Reabrir checking</div>
          <h2 className="display-3" style={{ marginBottom: 8 }}>Voltar <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{checking.n_pi}</span> para pendente?</h2>
          <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 18 }}>A decisão anterior será desfeita e o checking volta para a fila. Use quando aprovou ou reprovou por engano.</p>
          <div className="row gap-3" style={{ justifyContent: "flex-end" }}><Button variant="ghost" onClick={() => setDecision(null)}>Cancelar</Button><Button variant="primary" icon="refresh" loading={submitting} onClick={confirm}>Reabrir</Button></div>
        </div></div>
      </>)}
      {/* Sem checking modal */}
      {decision === "sem_checking" && (<>
        <div className="scrim" onClick={() => setDecision(null)}/>
        <div className="modal content"><div className="card-pad">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Sem checking</div>
          <h2 className="display-3" style={{ marginBottom: 8 }}>Marcar <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{checking.n_pi}</span> como sem checking?</h2>
          <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginBottom: 18 }}>Equivale ao "sem checking" do publ: não há comprovação válida de veiculação. O fornecedor é notificado.</p>
          <div className="row gap-3" style={{ justifyContent: "flex-end" }}><Button variant="ghost" onClick={() => setDecision(null)}>Cancelar</Button><Button variant="primary" loading={submitting} onClick={confirm}>Confirmar sem checking</Button></div>
        </div></div>
      </>)}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", cursor: "pointer" }} onClick={() => setLightbox(null)}>
          <div style={{ width: "min(1180px,94vw)", height: "min(860px,90vh)", background: "#0a0a0c", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", animation: "modalIn 360ms var(--ease-out)", cursor: "default" }} onClick={e => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between", padding: "14px 18px", background: "rgba(255,255,255,0.05)" }}>
              <div><span style={{ color: "#fff", fontSize: 15, fontWeight: 500 }}>{lightbox.detalhe}</span><span style={{ color: "#999", fontSize: 12.5, marginLeft: 8 }}>{lightbox.address}</span></div>
              <div className="row gap-2">
                <a href={lightbox.viewUrl || lightbox.previewUrl || `https://drive.google.com/file/d/${lightbox.id_imagem}/view`} target="_blank" rel="noreferrer" style={{ color: "#6e7681", fontSize: 12, textDecoration: "none", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }}>Abrir no Drive ↗</a>
                <button onClick={() => setLightbox(null)} style={{ color: "#fff", fontSize: 22, padding: "2px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 8, border: "none", cursor: "pointer" }} title="Fechar (ESC)">✕</button>
              </div>
            </div>
            <div style={{ flex: 1, display: "grid", placeItems: "center", background: `radial-gradient(circle at 50% 40%, #16181d, #060708)`, overflow: "hidden" }}>
              {lightbox.isImage && (lightbox.thumbnailUrl || lightbox.id_imagem) ? (
                lightbox.thumbnailUrl ? <img src={lightbox.thumbnailUrl} alt={lightbox.detalhe} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} referrerPolicy="no-referrer"/> : <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", color: "var(--ink-3)", fontSize: 16 }}><span>Visualizar no Drive</span><a href={`https://drive.google.com/file/d/${lightbox.id_imagem}/view`} target="_blank" rel="noreferrer" className="btn btn-accent sm" style={{ marginTop: 12 }}>Abrir no Drive</a></div>
              ) : (lightbox.isPdf || lightbox.isVideo) && lightbox.id_imagem ? (
                <iframe src={lightbox.previewUrl || `https://drive.google.com/file/d/${lightbox.id_imagem}/preview`} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay" referrerPolicy="no-referrer"/>
              ) : (
                <div style={{ textAlign: "center", color: "#b0b5be", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <Icon name={lightbox.isPdf ? "pdf" : lightbox.isVideo ? "play" : "image"} size={72}/>
                  <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{lightbox.detalhe || "Arquivo"}</p>
                  <a href={lightbox.viewUrl || lightbox.previewUrl || `https://drive.google.com/file/d/${lightbox.id_imagem}/view`} target="_blank" rel="noreferrer" className="btn btn-accent" style={{ marginTop: 8, fontSize: 14, padding: "10px 24px" }}><Icon name="folder" size={15}/> Abrir no Google Drive ↗</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
window.ScreenReview = ScreenReview;
window.AssetCard = AssetCard;
