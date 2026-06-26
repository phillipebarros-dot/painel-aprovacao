// viz.jsx — Visualizações animadas -> window
const { useState: vUseState, useRef: vUseRef, useEffect: vUseEffect, useMemo: vUseMemo } = React;

function useWidth(initial = 600) {
  const ref = vUseRef(null);
  const [w, setW] = vUseState(initial);
  vUseEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Floating tooltip
function VizTip({ tip }) {
  if (!tip) return null;
  return <div className="viz-tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div>;
}

// ── Area sparkline (animated draw) ──
// Inclui TODOS os pontos — zeros ficam na baseline (sem gaps visuais)
const AreaSpark = ({ data, height = 100, color = "var(--accent)", animKey = 0 }) => {
  const [ref, w] = useWidth();
  // TODOS os hooks ANTES de qualquer return condicional (regra do React)
  const gid = (React.useId || (() => "ag" + Math.random().toString(36).slice(2)))();
  if (!data || !data.length) return <div ref={ref} style={{ height }}/>;
  const max = Math.max(1, ...data.map(d => d.v));
  const stepX = w / (data.length - 1 || 1);
  const yOf = (v) => height - 5 - ((v || 0) / max) * (height - 14);
  const allPts = data.map((d, i) => ({ x: (i * stepX).toFixed(1), y: yOf(d.v).toFixed(1) }));
  const pts = allPts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M ${allPts[0].x},${height} L ${pts} L ${allPts[allPts.length - 1].x},${height} Z`;
  const len = w * 1.4;
  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <svg width={w} height={height} className="spark">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient></defs>
        <path key={"a" + animKey} className="area-rise" d={area} fill={`url(#${gid})`}/>
        <polyline key={"l" + animKey} className="line-draw" style={{ "--len": len }} points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
    </div>
  );
};

// ── Trend line (volume total, animated, hover) ──
// Linha unica continua conectando somente dias com dados (total > 0).
// Dias sem dados sao pulados, sem cair para zero e sem criar gaps.
const TrendLine = ({ series, height = 280 }) => {
  const [ref, w] = useWidth(800);
  const [hover, setHover] = vUseState(null);
  if (!series || !series.length) return <div ref={ref} style={{ width: "100%", height }}/>;
  const padL = 38, padR = 14, padT = 14, padB = 28;
  const innerW = Math.max(0, w - padL - padR), innerH = height - padT - padB;
  const max = Math.max(2, ...series.map(d => d.total));
  const xOf = (i) => padL + (i / (series.length - 1 || 1)) * innerW;
  const yOf = (v) => padT + innerH - (v / max) * innerH;
  const bottom = padT + innerH;

  // Incluir TODOS os dias — zeros ficam na baseline (sem gaps na linha)
  const allPts = series.map((d, i) => ({ i, x: xOf(i).toFixed(1), y: yOf(d.total).toFixed(1) }));
  const pts = allPts.map(p => `${p.x},${p.y}`).join(" ");
  const area = allPts.length ? `M ${allPts[0].x},${bottom} L ${pts} L ${allPts[allPts.length - 1].x},${bottom} Z` : "";

  const len = innerW * 1.5;
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - rect.left - padL;
    const i = Math.round((rel / innerW) * (series.length - 1));
    if (i >= 0 && i < series.length) setHover({ i, cx: rect.left + xOf(i), cy: rect.top + yOf(series[i].total) });
  };
  return (
    <div ref={ref} style={{ width: "100%", height, position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={height} className="spark" onMouseMove={onMove}>
        <defs><linearGradient id="trendg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22"/><stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient></defs>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padT + innerH * (1 - p);
          return <g key={i}><line className="grid-line" x1={padL} x2={w - padR} y1={y} y2={y}/><text className="axis-text" x={padL - 8} y={y + 3} textAnchor="end">{Math.round(max * p)}</text></g>;
        })}
        {area && <path className="area-rise" d={area} fill="url(#trendg)"/>}
        {pts && <polyline className="line-draw" style={{ "--len": len }} points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>}
        {series.map((d, i) => i % Math.ceil(series.length / 8) === 0 && (
          <text key={"x" + i} className="axis-text" x={xOf(i)} y={height - 9} textAnchor="middle">
            {new Date(d.ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
          </text>
        ))}
        {hover && (<g>
          <line x1={xOf(hover.i)} x2={xOf(hover.i)} y1={padT} y2={padT + innerH} stroke="var(--rule-strong)" strokeWidth="1"/>
          <circle cx={xOf(hover.i)} cy={yOf(series[hover.i].total)} r="4.5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2"/>
        </g>)}
      </svg>
      {hover && <VizTip tip={{ x: hover.cx, y: hover.cy - 4, content: <span><b>{series[hover.i].total}</b> checkings · {new Date(series[hover.i].ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span> }}/>}
    </div>
  );
};

// ── Stacked volume bars (animated, hover) ──
const VolumeChart = ({ series, height = 280 }) => {
  const [ref, w] = useWidth(800);
  const [hover, setHover] = vUseState(null);
  if (!series || !series.length) return <div ref={ref} style={{ width: "100%", height }}/>;
  const padL = 36, padR = 12, padT = 12, padB = 26;
  const innerW = Math.max(0, w - padL - padR), innerH = height - padT - padB;
  const max = Math.max(1, ...series.map(d => d.approved + d.rejected + d.pending));
  const slot = innerW / series.length;
  const barW = Math.max(1.5, slot - 2);
  return (
    <div ref={ref} style={{ width: "100%", height, position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={height} className="spark">
        {[0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padT + innerH * (1 - p);
          return <g key={i}><line className="grid-line" x1={padL} x2={w - padR} y1={y} y2={y}/><text className="axis-text" x={padL - 8} y={y + 3} textAnchor="end">{Math.round(max * p)}</text></g>;
        })}
        {series.map((d, i) => {
          const x = padL + i * slot;
          const hA = (d.approved / max) * innerH, hR = (d.rejected / max) * innerH, hP = (d.pending / max) * innerH;
          const isH = hover === i;
          let y = padT + innerH;
          return (
            <g key={i} className="bar-grow" style={{ animationDelay: (i * 6) + "ms" }} onMouseEnter={(e) => setHover(i)} onMouseMove={(e) => setHover(i)}>
              <rect x={x} y={padT} width={slot} height={innerH} fill="transparent"/>
              {hA > 0 && <rect x={x} y={(y -= hA)} width={barW} height={hA} fill="var(--accent)" opacity={isH ? 1 : 0.88} rx="1"/>}
              {hR > 0 && <rect x={x} y={(y -= hR)} width={barW} height={hR} fill="var(--alert)" opacity={isH ? 1 : 0.78} rx="1"/>}
              {hP > 0 && <rect x={x} y={(y -= hP)} width={barW} height={hP} fill="var(--warn)" opacity={isH ? 1 : 0.62} rx="1"/>}
            </g>
          );
        })}
        {series.map((d, i) => i % Math.ceil(series.length / 7) === 0 && (
          <text key={"x" + i} className="axis-text" x={padL + i * slot + barW / 2} y={height - 8} textAnchor="middle">
            {new Date(d.ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
          </text>
        ))}
      </svg>
      {hover != null && series[hover] && (
        <div className="viz-tip" style={{ left: padL + hover * slot + barW / 2, top: padT + 10, transform: "translate(-50%, -100%)" }}>
          <div style={{ fontWeight: 600, marginBottom: 3 }}>{new Date(series[hover].ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
          <div className="row gap-3" style={{ fontSize: 11 }}>
            <span style={{ color: "var(--accent)" }}>● {series[hover].approved}</span>
            <span style={{ color: "var(--alert)" }}>● {series[hover].rejected}</span>
            <span style={{ color: "var(--warn)" }}>● {series[hover].pending}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Rank bars (animated) ──
const RankBars = ({ rows, max, total }) => {
  const m = max || Math.max(1, ...rows.map(r => r.v));
  return (
    <div className="col gap-3">
      {rows.map((r, i) => (
        <div key={i} className="col" style={{ gap: 6 }}>
          <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{r.label}</span>
            <span className="cell-mono" style={{ color: "var(--ink-2)" }}>{r.v}{total ? <span style={{ color: "var(--ink-3)" }}> · {Math.round((r.v / total) * 100)}%</span> : null}</span>
          </div>
          <div className="rank-track"><div className="rank-fill" style={{ width: `${(r.v / m) * 100}%`, background: r.color || "var(--ink)", transitionDelay: (i * 70) + "ms" }}/></div>
        </div>
      ))}
    </div>
  );
};

// ── Donut (animated) ──
const Donut = ({ value, total, size = 120, color = "var(--accent)", label }) => {
  const stroke = 11, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  const [off, setOff] = vUseState(c);
  vUseEffect(() => { const t = setTimeout(() => setOff(c * (1 - pct)), 80); return () => clearTimeout(t); }, [pct, c]);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}/>
        <circle className="ring-fill" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 32, lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 600 }}><CountUp value={pct === 1 ? 100 : Math.min(99.9, Math.round(pct * 1000) / 10)} dur={1100}/><span style={{ fontSize: 16, color: "var(--ink-3)" }}>%</span></div>
          {label && <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>}
        </div>
      </div>
    </div>
  );
};

// ── Multi-segment donut (distribuição por categoria, animado, hover) ──
const MultiDonut = ({ rows, total, size = 150 }) => {
  const stroke = 16, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const [grow, setGrow] = vUseState(0);
  const [hover, setHover] = vUseState(null);
  vUseEffect(() => { const t = setTimeout(() => setGrow(1), 80); return () => clearTimeout(t); }, []);
  let acc = 0;
  const segs = rows.map(row => { const frac = total ? row.v / total : 0; const seg = { ...row, frac, offset: acc }; acc += frac; return seg; });
  const hv = hover != null ? segs[hover] : null;
  return (
    <div className="row gap-4" style={{ alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}/>
          {segs.map((s, i) => (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={hover === i ? stroke + 3 : stroke}
              strokeDasharray={`${c * s.frac * grow} ${c}`} strokeDashoffset={-c * s.offset * grow}
              style={{ transition: "stroke-dasharray 900ms var(--ease-out), stroke-dashoffset 900ms var(--ease-out), stroke-width 150ms var(--ease)", cursor: "pointer" }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}/>
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{hv ? hv.v : total}</div>
            <div className="eyebrow" style={{ marginTop: 3, maxWidth: size - 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hv ? hv.label : "total"}</div>
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 7, flex: 1, minWidth: 0 }}>
        {segs.map((s, i) => (
          <div key={i} className="row gap-2" style={{ alignItems: "center", cursor: "pointer", opacity: hover == null || hover === i ? 1 : 0.5, transition: "opacity 150ms" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }}/>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.label}</span>
            <span className="cell-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{Math.round(s.frac * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Análise de carga (Load Analysis: PIs pendentes por faixa de idade) ──
const LoadAnalysis = ({ data, onPick }) => {
  const { buckets, total } = data;
  const [grow, setGrow] = vUseState(false);
  vUseEffect(() => { const t = setTimeout(() => setGrow(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div className="col gap-4">
      <div className="load-bar">
        {buckets.map((b, i) => b.v > 0 && (
          <div key={i} className="load-seg" title={`${b.label}: ${b.v}`} onClick={() => onPick && onPick(b)}
            style={{ width: (grow ? (total ? (b.v / total) * 100 : 0) : 0) + "%", background: b.color }}>
            {(total ? b.v / total : 0) > 0.08 && <span>{b.v}</span>}
          </div>
        ))}
        {total === 0 && <div className="load-seg" style={{ width: "100%", background: "var(--rule)" }}/>}
      </div>
      <div className="load-legend">
        {buckets.map((b, i) => (
          <button key={i} className="load-leg-item" onClick={() => onPick && onPick(b)}>
            <span className="load-leg-dot" style={{ background: b.color }}/>
            <div className="col" style={{ gap: 1, alignItems: "flex-start" }}>
              <span className="row gap-2" style={{ alignItems: "baseline" }}><b style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{b.v}</b><span style={{ fontSize: 12, color: "var(--ink-2)" }}>{b.label}</span></span>
              <span className="body-xs muted" style={{ fontSize: 10.5 }}>{b.hint}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── KPI progress ring (small, animated) ──
const Ring = ({ pct, size = 56, color = "var(--accent)", stroke = 6, children }) => {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const [off, setOff] = vUseState(c);
  vUseEffect(() => { const t = setTimeout(() => setOff(c * (1 - Math.min(1, pct))), 100); return () => clearTimeout(t); }, [pct, c]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}/>
        <circle className="ring-fill" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{children}</div>
    </div>
  );
};

// ── SLA Heatmap (dia x faixa horária) ──
const SlaHeatmap = ({ data }) => {
  const [tip, setTip] = vUseState(null);
  const { grid, max } = data;
  const dows = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hbLabels = ["0-4", "4-8", "8-12", "12-16", "16-20", "20-24"];
  const colorFor = (avg, n) => {
    if (!n) return "var(--surface-2)";
    const t = Math.min(1, avg / (max || 1));
    // green (fast) -> amber -> red (slow)
    const hue = 150 - t * 150;
    return `hsl(${hue}, 62%, ${62 - t * 16}%)`;
  };
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "grid", gridTemplateColumns: "44px repeat(6, 1fr)", gap: 4, alignItems: "center" }}>
        <div/>
        {hbLabels.map(h => <div key={h} className="cal-dow" style={{ paddingBottom: 4 }}>{h}h</div>)}
        {dows.map((d, di) => (
          <React.Fragment key={d}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", textAlign: "right", paddingRight: 6 }}>{d}</div>
            {grid[di].map((cell, hi) => (
              <div key={hi} className="heat-cell" style={{ background: colorFor(cell.avg, cell.n), animationDelay: ((di * 6 + hi) * 12) + "ms", aspectRatio: "auto", height: 30 }}
                onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top, content: cell.n ? <span><b>{(Number(cell.avg) || 0).toFixed(1)}h</b> SLA médio · {cell.n} checkings</span> : "sem dados" }); }}
                onMouseLeave={() => setTip(null)}/>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="row gap-3" style={{ marginTop: 14, fontSize: 11, color: "var(--ink-3)" }}>
        <span>Rápido</span>
        <div style={{ flex: 1, maxWidth: 160, height: 6, borderRadius: 3, background: "linear-gradient(90deg, hsl(150,62%,62%), hsl(75,62%,54%), hsl(0,62%,46%))" }}/>
        <span>Lento</span>
      </div>
      <VizTip tip={tip}/>
    </div>
  );
};

// ── Funnel (horizontal, animated) ──
const Funnel = ({ steps }) => {
  const maxV = Math.max(1, ...steps.map(s => s.v));
  return (
    <div className="col gap-3">
      {steps.map((s, i) => {
        const pct = (s.v / maxV) * 100;
        const conv = i > 0 && steps[i - 1].v ? Math.round((s.v / steps[i - 1].v) * 100) : 100;
        return (
          <div key={i} className="funnel-step" style={{ animationDelay: (i * 110) + "ms" }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>{s.label}</span>
              <span className="cell-mono" style={{ color: "var(--ink-2)" }}>{s.v}{i > 0 && <span style={{ color: "var(--ink-3)" }}> · {conv}%</span>}</span>
            </div>
            <div style={{ height: 26, borderRadius: 8, background: "var(--surface-2)", overflow: "hidden" }}>
              <div className="funnel-bar" style={{ width: pct + "%", background: s.color, transitionDelay: (i * 110) + "ms" }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Mini calendar (received checkings heat) ──
const MiniCalendar = ({ checkings }) => {
  const [offset, setOffset] = vUseState(0);
  const data = vUseMemo(() => window.H.calendarData(checkings, offset), [checkings, offset]);
  const [tip, setTip] = vUseState(null);
  const dows = ["D", "S", "T", "Q", "Q", "S", "S"];
  const colorFor = (cnt) => {
    if (!cnt) return "var(--surface-2)";
    const t = cnt / (data.max || 1);
    return `color-mix(in srgb, var(--accent) ${20 + t * 70}%, transparent)`;
  };
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{data.label}</span>
        <div className="row gap-2">
          <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setOffset(o => o - 1)}><Icon name="chevron_left" size={13}/></button>
          <button className="icon-btn" style={{ width: 26, height: 26 }} disabled={offset >= 0} onClick={() => setOffset(o => Math.min(0, o + 1))}><Icon name="chevron_right" size={13}/></button>
        </div>
      </div>
      <div className="cal-grid" style={{ marginBottom: 5 }}>{dows.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}</div>
      <div className="cal-grid">
        {data.cells.map((c, i) => c ? (
          <div key={i} className="cal-cell" style={{ background: colorFor(c.count), color: c.count > data.max * 0.6 ? "#06251A" : "var(--ink-3)", animationDelay: (i * 6) + "ms" }}
            onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top, content: <span><b>{c.count}</b> recebidos · {new Date(c.ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span> }); }}
            onMouseLeave={() => setTip(null)}>{c.day}</div>
        ) : <div key={i}/>)}
      </div>
      <div className="row gap-2" style={{ marginTop: 12, justifyContent: "flex-end", fontSize: 11, color: "var(--ink-3)" }}>
        menos {[0, 0.3, 0.6, 1].map((t, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 3, background: t ? `color-mix(in srgb, var(--accent) ${20 + t * 70}%, transparent)` : "var(--surface-2)" }}/>)} mais
      </div>
      <VizTip tip={tip}/>
    </div>
  );
};

Object.assign(window, { AreaSpark, TrendLine, VolumeChart, RankBars, Donut, MultiDonut, LoadAnalysis, Ring, SlaHeatmap, Funnel, MiniCalendar, VizTip });
