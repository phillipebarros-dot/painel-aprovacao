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
                {c.rejection_count > 0 && <Pill status="rejected">{c.rejection_count + 1}ª versão</Pill>}
              </div>
              <h2 className="display-2">{c.cliente}</h2>
              <div className="row gap-6" style={{ marginTop: 10, marginBottom: 20, flexWrap: "wrap" }}>
                {[["PI", c.n_pi, true], ["Veículo", c.veiculo], ["Meio", c.meio], ["Praça", c.praca], ["Recebido", H.fmtRelTime(c.submittedAt)], ["Arquivos", c.total_arquivos, true]].map(([k, v, m]) => (
                  <div key={k} className="col" style={{ gap: 2 }}><div className="eyebrow">{k}</div><div style={{ fontSize: 14, color: "var(--ink)", fontFamily: m ? "var(--font-mono)" : "inherit" }}>{v}</div></div>
                ))}
              </div>
              {(() => {
                const totalFiles = assets.reduce((s, g) => s + g.files.length, 0);
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
              {c.observacoes && <div className="card card-pad" style={{ background: "var(--surface-2)", marginTop: 18 }}><div className="eyebrow" style={{ marginBottom: 6 }}>Observação do fornecedor</div><p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)" }}>"{c.observacoes}"</p></div>}
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
      {lightbox && (
        <div className="triage-stage" style={{ background: "rgba(0,0,0,0.88)", zIndex: 9999 }} onClick={() => setLightbox(null)} onKeyDown={e => { if (e.key === 'Escape') setLightbox(null); }}>
          <div style={{ position: "absolute", top: 16, right: 16 }}>
            <button className="icon-btn" onClick={() => setLightbox(null)} style={{ color: "#fff" }}><Icon name="x" size={22}/></button>
          </div>
          <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", padding: 40 }} onClick={e => e.stopPropagation()}>
            {lightbox.isImage || lightbox.thumbnailUrl ? (
              <img src={lightbox.id_imagem ? `https://lh3.googleusercontent.com/d/${lightbox.id_imagem}=w1200` : (lightbox.thumbnailUrl || lightbox.webViewLink)} alt={lightbox.detalhe || ""} referrerPolicy="no-referrer" style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }} onError={(e) => { if (e.target.src.includes('lh3.googleusercontent')) { e.target.src = lightbox.thumbnailUrl || `https://drive.google.com/thumbnail?id=${lightbox.id_imagem}&sz=w800`; } else { e.target.style.display = 'none'; } }}/>
            ) : (lightbox.isPdf || lightbox.isVideo) && (lightbox.previewUrl || lightbox.id_imagem) ? (
              <iframe src={lightbox.previewUrl || `https://drive.google.com/file/d/${lightbox.id_imagem}/preview`} style={{ width: "90vw", height: "85vh", border: "none", borderRadius: 8 }} allow="autoplay" referrerPolicy="no-referrer"/>
            ) : (
              <div className="col" style={{ alignItems: "center", gap: 16 }}>
                <Icon name={lightbox.isPdf ? "pdf" : lightbox.isVideo ? "play" : "image"} size={60} style={{ color: "#fff" }}/>
                <a href={lightbox.viewUrl || lightbox.webViewLink || (lightbox.id_imagem ? `https://drive.google.com/file/d/${lightbox.id_imagem}/view` : '#')} target="_blank" rel="noopener noreferrer" className="btn btn-accent">Abrir no Drive</a>
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
