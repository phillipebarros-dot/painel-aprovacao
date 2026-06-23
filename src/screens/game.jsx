// screen-game.jsx — Easter egg: jogo de luta retrô (canvas) -> window.FightGame
function FightGame({ onClose }) {
  const canvasRef = React.useRef(null);
  const [status, setStatus] = React.useState("fight"); // fight | win | lose
  const [round, setRound] = React.useState(1);
  const stateRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 760, H = 360, GROUND = 300;
    canvas.width = W; canvas.height = H;

    const mkFighter = (x, color, name, face) => ({ x, y: GROUND, vx: 0, vy: 0, w: 46, h: 96, color, name, face, hp: 100, onGround: true, attack: 0, attackType: null, block: false, hitCooldown: 0, flash: 0, anim: 0 });
    const P = mkFighter(150, "#5DD9A1", "VOCÊ", 1);
    const E = mkFighter(W - 196, "#E36268", "RIVAL", -1);
    stateRef.current = { P, E, keys: {}, over: false, aiTimer: 0 };
    const S = stateRef.current;

    const onKey = (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) e.preventDefault();
      S.keys[e.key.toLowerCase()] = e.type === "keydown";
      if (e.key === " ") S.keys[" "] = e.type === "keydown";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    const hit = (a, b, reach, dmg) => {
      if (Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) < reach && Math.abs(a.y - b.y) < 60) {
        if (b.block) { dmg = Math.max(1, dmg * 0.2); }
        b.hp = Math.max(0, b.hp - dmg); b.flash = 8; b.vx += a.face * 6; b.hitCooldown = 18; return true;
      }
      return false;
    };

    let raf;
    const step = () => {
      if (S.over) return;
      const k = S.keys;
      // Player controls: A/D move, W jump, J punch, K kick, S/Shift block
      P.block = !!(k["s"] || k["shift"]);
      const speed = P.block ? 1.5 : 3.6;
      if (k["a"]) { P.vx = -speed; P.face = E.x > P.x ? 1 : -1; } else if (k["d"]) { P.vx = speed; } else P.vx *= 0.6;
      P.face = E.x + E.w / 2 > P.x + P.w / 2 ? 1 : -1;
      if ((k["w"] || k["arrowup"]) && P.onGround) { P.vy = -13; P.onGround = false; }
      if ((k["j"] || k[" "]) && P.attack <= 0 && P.hitCooldown <= 0) { P.attack = 14; P.attackType = "punch"; if (hit(P, E, 78, 7)) {} }
      if (k["k"] && P.attack <= 0 && P.hitCooldown <= 0) { P.attack = 18; P.attackType = "kick"; if (hit(P, E, 92, 11)) {} }

      // Enemy AI
      S.aiTimer--;
      const dist = (E.x + E.w / 2) - (P.x + P.w / 2);
      E.face = dist > 0 ? -1 : 1;
      if (E.hitCooldown <= 0) {
        if (Math.abs(dist) > 90) { E.vx = dist > 0 ? -2.6 : 2.6; E.block = false; }
        else { E.vx *= 0.6; if (S.aiTimer <= 0 && E.attack <= 0) { const r = Math.random(); if (r < 0.5) { E.attack = 16; E.attackType = "punch"; hit(E, P, 80, 6); E.block = false; } else if (r < 0.72) { E.attack = 20; E.attackType = "kick"; hit(E, P, 94, 10); E.block = false; } else { E.block = true; } S.aiTimer = 22 + Math.floor(Math.random() * 26); } }
        if (E.onGround && Math.random() < 0.012) { E.vy = -12; E.onGround = false; }
      } else E.vx *= 0.7;

      [P, E].forEach(f => {
        f.x += f.vx; f.vy += 0.8; f.y += f.vy;
        if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; f.onGround = true; }
        f.x = Math.max(10, Math.min(W - f.w - 10, f.x));
        if (f.attack > 0) f.attack--; else f.attackType = null;
        if (f.hitCooldown > 0) f.hitCooldown--;
        if (f.flash > 0) f.flash--;
        f.anim += Math.abs(f.vx) > 0.5 ? 0.3 : 0.08;
      });

      if (P.hp <= 0 || E.hp <= 0) { S.over = true; setStatus(E.hp <= 0 ? "win" : "lose"); }
      draw();
      raf = requestAnimationFrame(step);
    };

    const drawFighter = (f) => {
      const cx = f.x + f.w / 2;
      ctx.save();
      if (f.flash > 0 && f.flash % 2 === 0) ctx.globalAlpha = 0.5;
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(cx, GROUND + f.h, 26, 6, 0, 0, 7); ctx.fill();
      const top = f.y + f.h - f.h; const bodyY = f.y;
      // legs
      ctx.strokeStyle = f.color; ctx.lineWidth = 9; ctx.lineCap = "round";
      const stride = Math.sin(f.anim) * 10;
      ctx.beginPath(); ctx.moveTo(cx, bodyY + 50); ctx.lineTo(cx - 10 + stride, bodyY + f.h); ctx.moveTo(cx, bodyY + 50); ctx.lineTo(cx + 10 - stride, bodyY + f.h); ctx.stroke();
      // body
      ctx.beginPath(); ctx.moveTo(cx, bodyY + 20); ctx.lineTo(cx, bodyY + 52); ctx.stroke();
      // arms / attack
      ctx.lineWidth = 7;
      if (f.attackType === "punch") { ctx.beginPath(); ctx.moveTo(cx, bodyY + 30); ctx.lineTo(cx + f.face * 44, bodyY + 30); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, bodyY + 30); ctx.lineTo(cx - f.face * 12, bodyY + 44); ctx.stroke(); }
      else if (f.attackType === "kick") { ctx.beginPath(); ctx.moveTo(cx, bodyY + 50); ctx.lineTo(cx + f.face * 50, bodyY + 40); ctx.stroke(); }
      else if (f.block) { ctx.beginPath(); ctx.moveTo(cx, bodyY + 30); ctx.lineTo(cx + f.face * 14, bodyY + 26); ctx.lineTo(cx + f.face * 14, bodyY + 46); ctx.stroke(); }
      else { const sw = Math.sin(f.anim) * 8; ctx.beginPath(); ctx.moveTo(cx, bodyY + 30); ctx.lineTo(cx - 14, bodyY + 44 + sw); ctx.moveTo(cx, bodyY + 30); ctx.lineTo(cx + 14, bodyY + 44 - sw); ctx.stroke(); }
      // head
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(cx, bodyY + 8, 13, 0, 7); ctx.fill();
      ctx.fillStyle = "#06121b"; ctx.fillRect(cx + f.face * 2, bodyY + 4, 4, 4);
      ctx.restore();
    };

    const draw = () => {
      // bg
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1a2433"); g.addColorStop(1, "#0c1118"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // sun + grid floor
      ctx.fillStyle = "rgba(93,217,161,0.12)"; ctx.beginPath(); ctx.arc(W / 2, 120, 70, 0, 7); ctx.fill();
      ctx.fillStyle = "#0a0f16"; ctx.fillRect(0, GROUND + 96, W, H - GROUND);
      ctx.strokeStyle = "rgba(93,217,161,0.25)"; ctx.lineWidth = 1;
      for (let i = 0; i <= W; i += 38) { ctx.beginPath(); ctx.moveTo(i, GROUND + 96); ctx.lineTo(W / 2 + (i - W / 2) * 3, H); ctx.stroke(); }
      drawFighter(P); drawFighter(E);
      const hpp = document.getElementById("hp-p"); if (hpp) hpp.style.width = P.hp + "%";
      const hpe = document.getElementById("hp-e"); if (hpe) hpe.style.width = E.hp + "%";
    };

    draw();
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); S.over = true; window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, [round]);

  const restart = () => { setStatus("fight"); setRound(r => r + 1); };
  const hp = stateRef.current;

  return (<>
    <div className="scrim" onClick={onClose} style={{ zIndex: 99998, background: "rgba(0,0,0,0.85)" }}/>
    <div className="game-shell">
      <div className="game-bar">
        <span className="game-title">OM FIGHTER <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>· easter egg</span></span>
        <button className="icon-btn" onClick={onClose} style={{ color: "#fff" }}><Icon name="x" size={15}/></button>
      </div>
      <div className="game-hud">
        <div className="game-hud-side"><div className="game-name">VOCÊ</div><div className="game-bar-bg"><div className="game-bar-fill p" id="hp-p"/></div></div>
        <div className="game-vs">VS</div>
        <div className="game-hud-side r"><div className="game-name">RIVAL</div><div className="game-bar-bg"><div className="game-bar-fill e" id="hp-e"/></div></div>
      </div>
      <div className="game-stage">
        <canvas ref={canvasRef} className="game-canvas"/>
        {status !== "fight" && (
          <div className="game-over">
            <div className="game-over-title" style={{ color: status === "win" ? "var(--accent)" : "var(--alert)" }}>{status === "win" ? "VOCÊ VENCEU" : "VOCÊ PERDEU"}</div>
            <Button variant="accent" icon="refresh" onClick={restart}>Lutar de novo</Button>
          </div>
        )}
      </div>
      <div className="game-controls">
        <span><b>A</b> <b>D</b> mover</span><span><b>W</b> pular</span><span><b>J</b> soco</span><span><b>K</b> chute</span><span><b>S</b> defesa</span>
      </div>
    </div>
  </>);
}
window.FightGame = FightGame;
