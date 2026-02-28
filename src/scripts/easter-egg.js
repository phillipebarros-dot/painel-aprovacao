/**
 * Easter Egg Module - Snake
 * Classic snake game hidden in the dashboard and login screens.
 */

(function () {
    let clickCount = 0;
    let clickTimer = null;

    // Check for both elements (login page and dashboard pages)
    const loginTrigger = document.getElementById('loginEasterEgg');
    const dashboardTrigger = document.getElementById('painelEasterEgg');

    function attachTrigger(trigger) {
        if (!trigger) return;
        trigger.addEventListener('click', () => {
            clickCount++;
            if (clickTimer) clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 800);
            if (clickCount >= 3) {
                clickCount = 0;
                openSnakeGame();
            }
        });
    }

    attachTrigger(loginTrigger);
    attachTrigger(dashboardTrigger);
})();

function openSnakeGame() {
    if (document.getElementById('snakeOverlay')) return;
    const ov = document.createElement('div');
    ov.id = 'snakeOverlay';
    ov.innerHTML = `
    <style>
        #snakeOverlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;color:#e5e5e5;animation:snkIn .3s ease-out}
        @keyframes snkIn{from{opacity:0}to{opacity:1}}
        #snakeOverlay .sh{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:440px;margin-bottom:12px}
        #snakeOverlay .st{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a3a3a3}
        #snakeOverlay .ss{font-size:13px;font-weight:700;color:#22c55e}
        #snakeOverlay .sc{background:none;border:1px solid #333;color:#737373;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;font-size:14px}
        #snakeOverlay .sc:hover{color:#fff;border-color:#fff}
        #snakeCanvas{border:1px solid #333;display:block;image-rendering:pixelated}
        #snakeOverlay .si{margin-top:12px;font-size:10px;color:#525252;text-transform:uppercase;letter-spacing:1px;text-align:center}
        #snakeOverlay .go{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;display:none}
        #snakeOverlay .go h2{font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:8px}
        #snakeOverlay .go p{font-size:11px;color:#737373;margin-bottom:16px}
        #snakeOverlay .rb{background:#fff;color:#000;border:none;padding:8px 20px;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;cursor:pointer;transition:all .2s}
        #snakeOverlay .rb:hover{background:#e5e5e5}
    </style>
    <div class="sh">
        <span class="st">🐍 Snake // Easter Egg</span>
        <div style="display:flex;align-items:center;gap:12px">
            <span class="ss">SCORE: <span id="snakeScore">0</span></span>
            <button class="sc" onclick="closeSnakeGame()">&times;</button>
        </div>
    </div>
    <div style="position:relative">
        <canvas id="snakeCanvas" width="420" height="420"></canvas>
        <div class="go" id="snakeGameover">
            <h2>Game Over</h2>
            <p>Score: <span id="snakeFinalScore">0</span></p>
            <button class="rb" onclick="restartSnake()">Jogar Novamente</button>
        </div>
    </div>
    <div class="si">← ↑ ↓ → ou WASD para mover  •  ESC para fechar</div>`;
    document.body.appendChild(ov);
    initSnake();
}

function closeSnakeGame() {
    const o = document.getElementById('snakeOverlay');
    if (o) o.remove();
    if (window._snakeInterval) { clearInterval(window._snakeInterval); window._snakeInterval = null; }
    if (window._snakeKeyHandler) { document.removeEventListener('keydown', window._snakeKeyHandler); window._snakeKeyHandler = null; }
}

function restartSnake() {
    if (window._snakeInterval) clearInterval(window._snakeInterval);
    document.getElementById('snakeGameover').style.display = 'none';
    initSnake();
}

function initSnake() {
    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gs = 20, tc = canvas.width / gs;
    let snake = [{ x: 10, y: 10 }], food = spawnFood();
    let dx = 0, dy = 0, score = 0, running = true, speed = 120;

    function spawnFood() {
        let p;
        do {
            p = { x: Math.floor(Math.random() * tc), y: Math.floor(Math.random() * tc) };
        } while (snake.some(s => s.x === p.x && s.y === p.y));
        return p;
    }

    function draw() {
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 0.5;
        for (let i = 0; i <= tc; i++) {
            ctx.beginPath(); ctx.moveTo(i * gs, 0); ctx.lineTo(i * gs, canvas.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * gs); ctx.lineTo(canvas.width, i * gs); ctx.stroke();
        }
        ctx.fillStyle = '#22c55e'; ctx.fillRect(food.x * gs + 1, food.y * gs + 1, gs - 2, gs - 2);
        snake.forEach((s, i) => {
            const b = Math.max(40, 255 - i * 12);
            ctx.fillStyle = i === 0 ? '#ffffff' : `rgb(${b},${b},${b})`;
            ctx.fillRect(s.x * gs + 1, s.y * gs + 1, gs - 2, gs - 2);
        });
        ctx.fillStyle = '#333'; ctx.font = '10px JetBrains Mono, monospace'; ctx.fillText('GRUPO OM // SNAKE', 8, canvas.height - 8);
    }

    function update() {
        if (!running) return;
        if (dx === 0 && dy === 0) { draw(); return; }
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        if (head.x < 0 || head.x >= tc || head.y < 0 || head.y >= tc) { gameOver(); return; }
        if (snake.some(s => s.x === head.x && s.y === head.y)) { gameOver(); return; }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score++; document.getElementById('snakeScore').textContent = score;
            food = spawnFood(); if (speed > 60) speed -= 2;
            clearInterval(window._snakeInterval); window._snakeInterval = setInterval(update, speed);
        } else { snake.pop(); }
        draw();
    }

    function gameOver() {
        running = false; clearInterval(window._snakeInterval);
        document.getElementById('snakeFinalScore').textContent = score;
        document.getElementById('snakeGameover').style.display = 'block';
    }

    if (window._snakeKeyHandler) document.removeEventListener('keydown', window._snakeKeyHandler);
    window._snakeKeyHandler = (e) => {
        if (e.key === 'Escape') { closeSnakeGame(); return; }
        if (!running) return;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': if (dy !== 1) { dx = 0; dy = -1; } break;
            case 'ArrowDown': case 's': case 'S': if (dy !== -1) { dx = 0; dy = 1; } break;
            case 'ArrowLeft': case 'a': case 'A': if (dx !== 1) { dx = -1; dy = 0; } break;
            case 'ArrowRight': case 'd': case 'D': if (dx !== -1) { dx = 1; dy = 0; } break;
        }
    };

    document.addEventListener('keydown', window._snakeKeyHandler);
    document.getElementById('snakeScore').textContent = '0';
    draw();
    window._snakeInterval = setInterval(update, speed);
}
