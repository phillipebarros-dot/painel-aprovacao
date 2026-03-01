(function () {
    // Top Gear 16-Bit Engine Replica - V4 (Authentic Palette + Finish Banner)

    // The 4 iconic SNES Top Gear colors mapped creatively:
    // Cannibal (Red), Sidewinder (White), Weasel (Teal/Greenish), Bayside (Purple)
    // We have 6 agencies, we'll map the closest authentic colors.
    const agencies = [
        { name: 'GRUPO OM', color: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'], logo: '../assets/img/logo-grupoom.png' }, // Gradient
        { name: 'AMERICAS', color: ['#3b82f6', '#fbbf24'], logo: '../assets/img/logo-americas.png' }, // Americas name, Blue & Yellow
        { name: 'DOM', color: '#FF0000', logo: '../assets/img/logo-dom.png' },      // Red
        { name: 'OPUS MULTIPLA', color: '#FFFFFF', logo: '../assets/img/logo-opus.png' },     // Opus name -> Opus Multipla, White
        { name: 'TAILOR MEDIA', color: '#ccff00', logo: '../assets/img/Marca TailorMedia vertical s_tagline - RGB.png' }, // Tailor Media - AMRELA LIMÃO
        { name: 'BRAIN BOX', color: '#FFFF00', logo: '../assets/img/logo-pixel.png' },    // Pixel name -> Brain Box, Yellow
        { name: 'SENSENO', color: '#00FFFF', logo: '../assets/img/logo-senso.png' }     // Senso name -> Senseno, Cyan
    ];

    let gameContainer = null;
    let canvas, ctx;
    let width = 1024, height = 768;

    let selectedPlayerIndex = -1;
    let animationFrameId = null;

    // Racing Core Variables
    let fps = 60;
    let step = 1 / fps;
    let dt = 0, lastTime = 0;

    let trackLength = null;
    let segmentLength = 200;
    let rumLength = 3;
    let trackWidth = 2400;
    let cameraHeight = 1200;
    let cameraDepth = 1 / Math.tan((100 * Math.PI / 180) / 2);
    let drawDistance = 350;

    let segments = [];
    let position = 0;
    let playerX = 0;
    let playerZ = cameraHeight * cameraDepth;
    let speed = 0;
    let maxSpeed = segmentLength / step;
    let accel = maxSpeed / 6;
    let breaking = -maxSpeed / 1.2;
    let decel = -maxSpeed / 6;
    let offRoadDecel = -maxSpeed / 2;
    let offRoadLimit = maxSpeed / 4;
    let centrifugalForce = 0.35;

    let cars = [];
    let isRacing = false;
    let isStartingGrid = true;
    let startDelay = 0;
    let raceFinished = false;

    let keyLeft = false, keyRight = false, keyFaster = false, keySlower = false;

    // --- Audio System ---
    let ytPlayerContainer = null;
    function initYouTubeMusic() {
        if (document.getElementById('retroYtPlayerCont')) return;
        ytPlayerContainer = document.createElement('div');
        ytPlayerContainer.id = 'retroYtPlayerCont';
        ytPlayerContainer.style.cssText = 'position: absolute; bottom: 10px; right: 10px; width: 250px; height: 140px; border: 4px solid #444; background: black; z-index: 10005; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; opacity: 0.7; transition: opacity 0.3s;';
        ytPlayerContainer.onmouseover = () => ytPlayerContainer.style.opacity = '1';
        ytPlayerContainer.onmouseout = () => ytPlayerContainer.style.opacity = '0.7';

        ytPlayerContainer.innerHTML = `
            <div style="background: #222; color: #4ade80; font-size: 10px; padding: 6px; text-align: center; border-bottom: 2px solid #444;">CASSETE MOTOR (SOM)</div>
            <iframe id="carMusicPlayer" width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/xpUZYWX2BoY?autoplay=1&loop=1&playlist=xpUZYWX2BoY&controls=1&mute=0&enablejsapi=1" frameborder="0" allow="autoplay; encrypted-media"></iframe>
        `;
        gameContainer.appendChild(ytPlayerContainer);
    }

    // --- Core UI & Lifecycle ---
    function start16BitEasterEgg() {
        if (document.getElementById('retroGameContainer')) return;

        gameContainer = document.createElement('div');
        gameContainer.id = 'retroGameContainer';
        gameContainer.style.cssText = `
            position: fixed; inset: 0; background: #000; z-index: 9999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: white; font-family: 'Press Start 2P', 'Courier New', monospace;
        `;
        document.body.appendChild(gameContainer);
        showSelectionScreen();
    }

    function showSelectionScreen() {
        gameContainer.innerHTML = `
            <div style="text-align: center; max-width: 900px; width: 100%;">
                <h1 style="color: #FF0000; font-size: 56px; margin-bottom: 10px; text-shadow: 4px 4px 0px #000, 0 0 20px rgba(255,0,0,0.8); font-style: italic;">TOP GEAR OM</h1>
                <h2 style="color: #fff; font-size: 12px; margin-bottom: 50px;">CHOOSE YOUR RACING AGENCY</h2>
                
                <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; margin-bottom: 40px;">
                    ${agencies.map((l, i) => `
                        <div class="retro-selector" data-index="${i}" style="padding: 10px; width: 180px; height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: space-around; background: #111; border: 4px solid #333; border-bottom-color: ${Array.isArray(l.color) ? l.color[0] : l.color}; cursor: pointer; transition: all 0.1s; image-rendering: pixelated;">
                            <img src="${l.logo}" style="max-height: 40px; max-width: 120px; filter: invert(1); pointer-events: none;" />
                            <div style="width: 100%; height: 24px; background: ${Array.isArray(l.color) ? 'linear-gradient(90deg, ' + l.color.join(',') + ')' : l.color}; margin-top: 10px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: ${l.color === '#FFFFFF' ? '#000' : '#fff'}; text-shadow: 1px 1px 0px ${l.color === '#FFFFFF' ? 'transparent' : '#000'}; border: 2px solid #222;">${l.name}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="font-size: 12px; color: #888; margin-bottom: 30px; line-height: 2;">
                    [ CIMA / ESPAÇO ] Acelerar | [ BAIXO ] Frear | [ LADOS ] Virar
                </div>
                <button id="closeRetroGame" style="padding: 15px 30px; background: transparent; border: 2px solid #555; color: #aaa; cursor: pointer; font-family: 'Press Start 2P'; font-size: 14px; transition: all 0.2s;">SAIR DO JOGO</button>
            </div>
        `;

        const selectors = gameContainer.querySelectorAll('.retro-selector');
        selectors.forEach(sel => {
            sel.addEventListener('mouseover', () => {
                sel.style.borderColor = '#fff';
                sel.style.transform = 'translateY(-10px)';
                sel.style.background = '#222';
            });
            sel.addEventListener('mouseout', () => {
                sel.style.borderColor = '#333';
                let idx = sel.getAttribute('data-index');
                let color = agencies[idx].color;
                sel.style.borderBottomColor = Array.isArray(color) ? color[0] : color;
                sel.style.transform = 'none';
                sel.style.background = '#111';
            });
            sel.addEventListener('click', () => {
                selectedPlayerIndex = parseInt(sel.getAttribute('data-index'));
                // Force play command after user interaction to bypass autoplay blocks
                const iframe = document.getElementById('carMusicPlayer');
                if (iframe) {
                    iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                }
                initRace();
            });
        });

        document.getElementById('closeRetroGame').addEventListener('click', () => {
            document.body.removeChild(gameContainer);
        });
    }

    // --- Track Building ---
    function resetTrack() {
        segments = [];
        const numSegments = 3000;

        let currentY = 0;
        for (let n = 0; n < numSegments; n++) {
            let curve = 0;
            let targetY = 0;

            // Track layout
            if (n > 200 && n < 600) curve = 4; // Right
            if (n > 700 && n < 1000) curve = -5; // Left
            if (n > 1100 && n < 1500) { curve = 3; targetY = 2000; } // Big Hill up
            if (n > 1500 && n < 1800) { targetY = 0; } // Downhill Fast
            if (n > 1900 && n < 2300) curve = -6; // Hairpin left
            if (n > 2400 && n < 2600) { curve = 4; targetY = 1000; }
            if (n > 2600 && n < 2900) { targetY = 0; } // Flat to finish

            let isFinish = n >= numSegments - 120 && n <= numSegments - 100;

            // Interpolate Y 
            currentY = currentY + (targetY - currentY) * 0.05;

            // Classic Top Gear Daytime Track Colors
            let colorDark = { road: '#6b7280', grass: '#228B22', rumble: '#ef4444', lane: '#6b7280' };
            let colorLight = { road: '#858c97', grass: '#32CD32', rumble: '#fff', lane: '#fff' };

            let segColor = Math.floor(n / rumLength) % 2 ? colorLight : colorDark;
            if (isFinish) {
                segColor = { road: '#1e293b', grass: segColor.grass, rumble: '#fff', lane: '#fff' };
                if (n === numSegments - 110) segColor.isFinishLine = true;
            }

            segments.push({
                index: n,
                p1: { world: { x: 0, y: n === 0 ? 0 : segments[n - 1].p2.world.y, z: n * segmentLength }, camera: {}, screen: {} },
                p2: { world: { x: 0, y: currentY, z: (n + 1) * segmentLength }, camera: {}, screen: {} },
                curve: curve,
                color: segColor,
                cars: []
            });
        }
        trackLength = segments.length * segmentLength;
    }

    function resetCars() {
        cars = [];
        // Opponents Grid Setup - Just like Top Gear. 
        let gridZ = 800;

        for (let i = 0; i < agencies.length; i++) {
            if (i === selectedPlayerIndex) continue;
            let car = {
                agencyIndex: i,
                offset: (i % 2 === 0 ? -0.5 : 0.5),
                z: gridZ,
                percent: 0,
                speed: 0,
                maxSpeed: maxSpeed * (Math.random() * 0.35 + 0.65),
                color: agencies[i].color
            };
            gridZ += 600;

            let segment = findSegment(car.z);
            if (segment) {
                segment.cars.push(car);
                cars.push(car);
            }
        }
    }

    function findSegment(z) {
        return segments[Math.floor((z || 0) / segmentLength) % segments.length] || segments[0];
    }

    // --- Game Logic ---
    function initRace() {
        gameContainer.innerHTML = '';
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.cssText = "width: 100%; max-width: 1200px; max-height: 100vh; image-rendering: pixelated; border: 4px solid #fff; box-shadow: 0 0 50px rgba(0,0,0,0.8); background: #000;";
        gameContainer.appendChild(canvas);
        ctx = canvas.getContext('2d', { alpha: false });

        initYouTubeMusic();

        resetTrack();
        resetCars();

        speed = 0;
        position = 0;
        playerX = 0;
        raceFinished = false;

        isStartingGrid = true;
        startDelay = 6.0;

        const onKeyDown = (e) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyS", "KeyA", "KeyD"].includes(e.code)) e.preventDefault();
            if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') keyFaster = true;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') keySlower = true;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyLeft = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keyRight = true;
        };
        const onKeyUp = (e) => {
            if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') keyFaster = false;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') keySlower = false;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyLeft = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keyRight = false;
            if (e.code === 'Escape') quitRace();
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        gameContainer._onKeyDown = onKeyDown;
        gameContainer._onKeyUp = onKeyUp;

        lastTime = performance.now();
        isRacing = true;
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function quitRace() {
        isRacing = false;
        cancelAnimationFrame(animationFrameId);
        document.removeEventListener('keydown', gameContainer._onKeyDown);
        document.removeEventListener('keyup', gameContainer._onKeyUp);
        if (gameContainer && gameContainer.parentNode) {
            document.body.removeChild(gameContainer);
        }
    }

    // --- Update Physics & AI ---
    function gameLoop(now) {
        if (!document.getElementById('retroGameContainer')) return quitRace();

        dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 0.1;

        update(dt);
        render();

        if (isRacing && !raceFinished) {
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    function update(dt) {
        if (isStartingGrid) {
            startDelay -= dt;
            if (startDelay <= 0) {
                isStartingGrid = false;
            } else {
                return;
            }
        }

        let playerSegment = findSegment(position + playerZ);
        let speedPercent = speed / maxSpeed;

        let dx = dt * 2 * speedPercent;
        playerX = playerX - (dx * speedPercent * playerSegment.curve * centrifugalForce);

        let turnSpeed = dx * 1.5;
        if (keyLeft) playerX -= turnSpeed;
        else if (keyRight) playerX += turnSpeed;

        position = Util.increase(position, dt * speed, trackLength);

        if (keyFaster) speed = Util.accelerate(speed, accel, dt);
        else if (keySlower) speed = Util.accelerate(speed, breaking, dt);
        else speed = Util.accelerate(speed, decel, dt);

        if (((playerX < -1.1) || (playerX > 1.1)) && (speed > offRoadLimit)) {
            speed = Util.accelerate(speed, offRoadDecel, dt);
            playerX += (Math.random() * 0.04) - 0.02;
        }

        playerX = Util.limit(playerX, -0.9, 0.9);
        speed = Util.limit(speed, 0, maxSpeed);

        cars.forEach(car => {
            let oldSegment = findSegment(car.z);

            if (!isStartingGrid && car.speed < car.maxSpeed) {
                car.speed = Util.accelerate(car.speed, accel * 0.8, dt);
            }

            car.z = Util.increase(car.z, dt * car.speed, trackLength);
            let newSegment = findSegment(car.z);

            let dz = car.z - position;
            let targetOffset = (car.agencyIndex % 2 === 0 ? -0.4 : 0.4);

            let upcomingSeg = findSegment(car.z + 1000);
            if (upcomingSeg.curve > 2) targetOffset = 0.6;
            else if (upcomingSeg.curve < -2) targetOffset = -0.6;

            if (dz > 0 && dz < 2000) {
                if (Math.abs(car.offset - playerX) < 0.6) {
                    if (car.offset < playerX) targetOffset = playerX - 0.7;
                    else targetOffset = playerX + 0.7;
                }
            }

            if (car.offset < targetOffset) car.offset += 0.015 * speedPercent;
            else if (car.offset > targetOffset) car.offset -= 0.015 * speedPercent;

            car.offset = Util.limit(car.offset, -0.85, 0.85);

            if (oldSegment !== newSegment) {
                let index = oldSegment.cars.indexOf(car);
                if (index > -1) oldSegment.cars.splice(index, 1);
                newSegment.cars.push(car);
            }
        });

        playerSegment.cars.forEach(car => {
            let playerW = 0.35;
            let carW = 0.35;
            if (speed > car.speed) {
                if (Math.abs(playerX - car.offset) < (playerW + carW)) {
                    speed = car.speed * 0.5;
                    playerX += (playerX > car.offset ? 0.1 : -0.1);
                }
            }
        });

        if (position > trackLength - (segmentLength * 5) && !raceFinished) {
            raceFinished = true;
            let finalPlace = 1;
            cars.forEach(car => {
                if (car.z > position && car.z < position + 100000) finalPlace++;
            });
            drawFinishOverlay(finalPlace);
        }
    }

    function render() {
        ctx.clearRect(0, 0, width, height);

        let baseSegment = findSegment(position);
        let basePercent = Util.percentRemaining(position, segmentLength);
        let playerSegment = findSegment(position + playerZ);
        let playerPercent = Util.percentRemaining(position + playerZ, segmentLength);

        let playerY = Util.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
        let maxy = height;

        let x = 0;
        let dx = - (baseSegment.curve * basePercent);

        let grad = ctx.createLinearGradient(0, 0, 0, height / 2);
        grad.addColorStop(0, '#55AAFF');
        grad.addColorStop(1, '#AADDFF');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height / 2);

        let curveSum = 0;
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].curve !== 0 && i < baseSegment.index) curveSum += segments[i].curve;
        }
        let texOffset = -curveSum * 2 - (playerX * 200);

        ctx.fillStyle = '#888';
        for (let m = 0; m < 8; m++) {
            let px = ((m * 250) + (texOffset % 250));
            if (px < -250) px += 2000;
            if (px > width + 250) px -= 2000;

            ctx.beginPath();
            ctx.moveTo(px, height / 2);
            ctx.lineTo(px + 125, height / 2 - 100 + (Math.sin(m) * 20));
            ctx.lineTo(px + 250, height / 2);
            ctx.fill();
            ctx.fillStyle = '#eee';
            ctx.beginPath();
            ctx.moveTo(px + 83, height / 2 - 66 + (Math.sin(m) * 13));
            ctx.lineTo(px + 125, height / 2 - 100 + (Math.sin(m) * 20));
            ctx.lineTo(px + 166, height / 2 - 66 + (Math.sin(m) * 13));
            ctx.fill();
            ctx.fillStyle = '#888';
        }

        let n, segment;
        for (n = 0; n < drawDistance; n++) {
            segment = segments[(baseSegment.index + n) % segments.length];
            segment.looped = segment.index < baseSegment.index;
            segment.fog = Util.exponentialFog(n / drawDistance, 4.0);
            segment.clip = maxy;

            Util.project(segment.p1, (playerX * trackWidth) - x, playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, trackWidth);
            Util.project(segment.p2, (playerX * trackWidth) - x - dx, playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, trackWidth);

            x += dx;
            dx += segment.curve;

            if (
                segment.p1.camera.z <= cameraDepth ||
                segment.p2.screen.y >= segment.p1.screen.y ||
                segment.p2.screen.y >= maxy
            ) continue;

            Render.segment(ctx, width,
                segment.color.grass, segment.color.road, segment.color.rumble, segment.color.lane,
                segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.w,
                segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.w
            );

            if (segment.color.isFinishLine) {
                let archHeight = 4000 * segment.p1.screen.scale;
                let archThickness = 800 * segment.p1.screen.scale;
                let postWidth = 400 * segment.p1.screen.scale;

                ctx.fillStyle = '#fff';
                ctx.fillRect(segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y - archHeight, segment.p1.screen.w * 2, archThickness);

                ctx.fillStyle = '#000';
                for (let check = 0; check < 20; check++) {
                    if (check % 2 === 0) {
                        ctx.fillRect(segment.p1.screen.x - segment.p1.screen.w + (check * segment.p1.screen.w * 0.1), segment.p1.screen.y - archHeight, segment.p1.screen.w * 0.1, archThickness);
                    }
                }

                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${Math.floor(600 * segment.p1.screen.scale)}px "Press Start 2P"`;
                ctx.textAlign = 'center';
                ctx.fillText("FINISH", segment.p1.screen.x, segment.p1.screen.y - archHeight + (archThickness * 0.8));
                ctx.textAlign = 'left';

                ctx.fillStyle = '#fff';
                ctx.fillRect(segment.p1.screen.x - segment.p1.screen.w - postWidth, segment.p1.screen.y - archHeight, postWidth, archHeight);
                ctx.fillRect(segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y - archHeight, postWidth, archHeight);
            }

            maxy = segment.p1.screen.y;
        }

        for (n = (drawDistance - 1); n > 0; n--) {
            segment = segments[(baseSegment.index + n) % segments.length];
            segment.cars.forEach(car => {
                let spriteScale = segment.p1.screen.scale;
                let spriteX = segment.p1.screen.x + (spriteScale * car.offset * trackWidth * width / 2);
                let spriteY = segment.p1.screen.y;

                let scaleFactor = spriteScale * 1920;
                Render.carSprite(ctx, spriteX, spriteY, scaleFactor, car.color, false, 0);

                ctx.fillStyle = '#fff';
                ctx.font = `${Math.floor(12 * scaleFactor)}px "Press Start 2P"`;
                ctx.fillText(agencies[car.agencyIndex].name, spriteX - (30 * scaleFactor), spriteY - (60 * scaleFactor));
            });
        }

        let pScale = 1.6;
        let pY = height - 20;
        let pX = width / 2;

        let steerAngle = 0;
        if (keyLeft) steerAngle = -1;
        if (keyRight) steerAngle = 1;

        if (Math.abs(playerX) > 1.1 && speed > 50) pY += (Math.random() * 6) - 3;

        Render.carSprite(ctx, pX, pY, pScale, agencies[selectedPlayerIndex].color, true, steerAngle);

        ctx.fillStyle = '#fff';
        ctx.font = '24px "Press Start 2P", monospace';
        ctx.shadowColor = '#000';
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        const displaySpeed = Math.floor(speed / maxSpeed * 280);
        ctx.fillText(`SPEED ${displaySpeed} KMH`, 40, 60);

        const progress = Math.min(100, Math.floor((position / trackLength) * 100));
        ctx.fillText(`TRACK ${progress}%`, width - 360, 60);

        if (isStartingGrid) {
            drawTrafficLights(ctx, width, startDelay);
        }

        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    function drawTrafficLights(ctx, width, delay) {
        let lx = width / 2 - 100;
        let ly = 150;
        ctx.fillStyle = '#222';
        ctx.fillRect(lx, ly, 200, 70);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeRect(lx, ly, 200, 70);

        let states = [];
        if (delay > 4) states = ['#330000', '#330000', '#330000'];
        else if (delay > 3) states = ['#ff0000', '#330000', '#330000'];
        else if (delay > 2) states = ['#ff0000', '#ff0000', '#330000'];
        else if (delay > 1) states = ['#ff0000', '#ff0000', '#ff0000'];
        else states = ['#330000', '#330000', '#00ff00'];

        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(lx + 40 + (i * 60), ly + 35, 20, 0, Math.PI * 2);
            ctx.fillStyle = states[i];
            ctx.fill();
            if (states[i] !== '#330000') {
                ctx.shadowColor = states[i];
                ctx.shadowBlur = 30;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    function drawFinishOverlay(place) {
        let msg = place === 1 ? 'QUALIFIED!' : `GAME OVER - ${place}TH PLACE`;
        let subMsg = place === 1 ? 'TOP GEAR CHAMPION' : 'TRY AGAIN';
        let color = place === 1 ? '#FDE047' : '#EF4444';

        const overlay = document.createElement('div');
        overlay.style.cssText = "position: absolute; inset: 0; pointer-events: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; z-index: 10006; background: rgba(0,0,0,0.85); animation: fadein 1s forwards;";
        gameContainer.appendChild(overlay);

        overlay.innerHTML = `
            <style>@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }</style>
            <div style="background: #111; padding: 60px 100px; border: 8px solid ${color}; box-shadow: 0 0 50px ${color}88, inset 0 0 30px #000; font-family: 'Press Start 2P', monospace; position: relative;">
                
                <h1 style="font-size: 54px; color: ${color}; margin-bottom: 30px; text-shadow: 4px 4px 0px #000, 0 0 15px ${color};">${msg}</h1>
                <h2 style="font-size: 24px; color: #fff; margin-bottom: 50px;">${subMsg}</h2>
                <div style="display: flex; gap: 40px; justify-content: center;">
                    <button id="endRetry" style="padding: 20px 40px; background: #fff; color: #000; border: 4px solid #fff; font-family: 'Press Start 2P'; font-size: 16px; cursor: pointer;">RETRY</button>
                    <button id="endQuit" style="padding: 20px 40px; background: #222; color: #fff; border: 4px solid #fff; font-family: 'Press Start 2P'; font-size: 16px; cursor: pointer;">EXIT</button>
                </div>
            </div>
        `;

        document.getElementById('endRetry').onclick = () => {
            if (gameContainer && gameContainer.parentNode) {
                document.body.removeChild(gameContainer);
            }
            start16BitEasterEgg();
        };
        document.getElementById('endQuit').onclick = quitRace;
    }

    const Util = {
        limit: (value, min, max) => Math.max(min, Math.min(value, max)),
        increase: (start, increment, max) => {
            let result = start + increment;
            while (result >= max) result -= max;
            while (result < 0) result += max;
            return result;
        },
        accelerate: (v, accel, dt) => v + (accel * dt),
        percentRemaining: (n, total) => (n % total) / total,
        interpolate: (a, b, percent) => a + (b - a) * percent,
        project: (p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) => {
            p.camera.x = (p.world.x || 0) - cameraX;
            p.camera.y = (p.world.y || 0) - cameraY;
            p.camera.z = (p.world.z || 0) - cameraZ;
            p.screen.scale = cameraDepth / p.camera.z;
            p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
            p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
            p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
        },
        exponentialFog: (distance, density) => 1 / (Math.exp((distance * distance * density))),
    };

    const Render = {
        polygon: (ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
            ctx.closePath();
            ctx.fill();
        },
        segment: (ctx, width, grass, road, rumble, lane, x1, y1, w1, x2, y2, w2) => {
            let r1 = w1 / 10; let r2 = w2 / 10;
            let l1 = w1 / 40; let l2 = w2 / 40;
            ctx.fillStyle = grass;
            ctx.fillRect(0, y2, width, y1 - y2);
            Render.polygon(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, rumble);
            Render.polygon(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, rumble);
            Render.polygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, road);
            if (lane) {
                let laneX1 = x1 - w1 / 3;
                let laneX2 = x2 - w2 / 3;
                Render.polygon(ctx, laneX1 - l1 / 2, y1, laneX1 + l1 / 2, y1, laneX2 + l2 / 2, y2, laneX2 - l2 / 2, y2, lane);
                laneX1 = x1 + w1 / 3;
                laneX2 = x2 + w2 / 3;
                Render.polygon(ctx, laneX1 - l1 / 2, y1, laneX1 + l1 / 2, y1, laneX2 + l2 / 2, y2, laneX2 - l2 / 2, y2, lane);
            }
        },
        carSprite: (ctx, x, y, scale, color, isPlayer, steer) => {
            let w = 200 * scale;
            let h = w * 0.35;
            x = x - w / 2;
            y = y - h;
            let sway = steer * (w * 0.15);
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(x + sway, y + h - (h * 0.3), w * 0.25, h * 0.4);
            ctx.fillRect(x + w - (w * 0.25) + sway, y + h - (h * 0.3), w * 0.25, h * 0.4);
            ctx.fillStyle = '#444';
            ctx.fillRect(x + sway + (w * 0.05), y + h - (h * 0.2), w * 0.15, h * 0.2);
            ctx.fillRect(x + w - (w * 0.2) + sway, y + h - (h * 0.2), w * 0.15, h * 0.2);
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.moveTo(x + sway - (w * 0.02), y + (h * 0.65));
            ctx.lineTo(x + w + sway + (w * 0.02), y + (h * 0.65));
            ctx.lineTo(x + w + (w * 0.02), y + h);
            ctx.lineTo(x - (w * 0.02), y + h);
            ctx.fill();
            ctx.fillStyle = '#aaa';
            ctx.fillRect(x + (w * 0.1), y + (h * 0.8), w * 0.12, h * 0.2);
            ctx.fillRect(x + (w * 0.78), y + (h * 0.8), w * 0.12, h * 0.2);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + (w * 0.12), y + (h * 0.85), w * 0.08, h * 0.1);
            ctx.fillRect(x + (w * 0.80), y + (h * 0.85), w * 0.08, h * 0.1);
            if (Array.isArray(color)) {
                let paintGrad = ctx.createLinearGradient(x + sway - (w * 0.15), 0, x + w + sway + (w * 0.15), 0);
                for (let i = 0; i < color.length; i++) paintGrad.addColorStop(i / (color.length - 1), color[i]);
                ctx.fillStyle = paintGrad;
            } else ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x + sway - (w * 0.15), y + (h * 0.45));
            ctx.lineTo(x + w + sway + (w * 0.15), y + (h * 0.45));
            ctx.lineTo(x + w + sway + (w * 0.05), y + (h * 0.7));
            ctx.lineTo(x + sway - (w * 0.05), y + (h * 0.7));
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + sway - (w * 0.05), y + (h * 0.45), w * 1.1, h * 0.05);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + sway - (w * 0.1), y + (h * 0.5), w * 1.2, h * 0.2);
            let lightColor = isPlayer && keySlower ? '#FF0000' : '#770000';
            ctx.fillStyle = lightColor;
            ctx.fillRect(x + sway - (w * 0.08), y + (h * 0.53), w * 0.35, h * 0.12);
            ctx.fillRect(x + sway + w - (w * 0.27), y + (h * 0.53), w * 0.35, h * 0.12);
            if (isPlayer && keySlower) {
                ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 10;
                ctx.fillRect(x + sway - (w * 0.08), y + (h * 0.53), w * 0.35, h * 0.12);
                ctx.fillRect(x + sway + w - (w * 0.27), y + (h * 0.53), w * 0.35, h * 0.12);
                ctx.shadowBlur = 0;
            }
            ctx.fillStyle = '#ddd';
            ctx.fillRect(x + sway + (w * 0.12), y + (h * 0.55), w * 0.1, h * 0.08);
            ctx.fillRect(x + sway + w - (w * 0.22), y + (h * 0.55), w * 0.1, h * 0.08);
            if (Array.isArray(color)) {
                let roofGrad = ctx.createLinearGradient(x + (w * 0.15), 0, x + (w * 0.85), 0);
                for (let i = 0; i < color.length; i++) roofGrad.addColorStop(i / (color.length - 1), color[i]);
                ctx.fillStyle = roofGrad;
            } else ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x + (w * 0.15), y + (h * 0.45));
            ctx.lineTo(x + (w * 0.3) - sway * 0.5, y);
            ctx.lineTo(x + (w * 0.7) - sway * 0.5, y);
            ctx.lineTo(x + (w * 0.85), y + (h * 0.45));
            ctx.fill();
            ctx.fillStyle = '#050505';
            ctx.beginPath();
            ctx.moveTo(x + (w * 0.18), y + (h * 0.42));
            ctx.lineTo(x + (w * 0.32) - sway * 0.4, y + (h * 0.05));
            ctx.lineTo(x + (w * 0.68) - sway * 0.4, y + (h * 0.05));
            ctx.lineTo(x + (w * 0.82), y + (h * 0.42));
            ctx.fill();
            if (Array.isArray(color)) {
                let spGrad = ctx.createLinearGradient(x + sway - (w * 0.2), 0, x + w + sway + (w * 0.2), 0);
                for (let i = 0; i < color.length; i++) spGrad.addColorStop(i / (color.length - 1), color[i]);
                ctx.fillStyle = spGrad;
            } else ctx.fillStyle = color;
            ctx.fillRect(x + sway - (w * 0.2), y + (h * 0.2), w * 1.4, h * 0.1);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(x + sway - (w * 0.2), y + (h * 0.2), w * 1.4, h * 0.03);
            ctx.fillStyle = '#111';
            ctx.fillRect(x + sway + (w * 0.15), y + (h * 0.3), w * 0.08, h * 0.15);
            ctx.fillRect(x + sway + w - (w * 0.23), y + (h * 0.3), w * 0.08, h * 0.15);
            if (isPlayer) {
                ctx.fillStyle = '#FBBF24';
                ctx.fillRect(x + (w * 0.4) + sway * 0.5, y + (h * 0.75), w * 0.2, h * 0.15);
                ctx.fillStyle = '#000';
                ctx.font = `bold ${Math.floor(11 * scale)}px "Courier New"`;
                ctx.fillText("CEO", x + (w * 0.43) + sway * 0.5, y + (h * 0.86));
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(x + (w * 0.4) + sway * 0.5, y + (h * 0.75), w * 0.2, h * 0.08);
            }
            ctx.restore();
        }
    };

    function initTrigger() {
        const logos = document.querySelectorAll('.partner-logos img');
        const clickedLogos = new Set();

        if (logos.length === 0) {
            setTimeout(initTrigger, 500);
            return;
        }

        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        logos.forEach((logo, index) => {
            logo.style.cursor = 'pointer';
            logo.style.pointerEvents = 'auto';
            logo.style.position = 'relative';
            logo.style.zIndex = '100';

            logo.addEventListener('mouseenter', () => {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const glowColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';
                logo.style.filter = `brightness(1.2) drop-shadow(0 0 12px ${glowColor})`;
                logo.style.transform = 'scale(1.05)';
            });

            logo.addEventListener('mouseleave', () => {
                logo.style.filter = '';
                logo.style.transform = 'scale(1)';
            });

            logo.addEventListener('click', () => {
                clickedLogos.add(index);
                logo.style.transition = 'all 0.2s';
                logo.style.transform = 'scale(1.2)';

                // Theme-aware glow logic (Click)
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const glowColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)';
                logo.style.filter = `brightness(2) drop-shadow(0 0 15px ${glowColor})`;

                setTimeout(() => {
                    logo.style.transform = 'scale(1.05)';
                    const hoverGlow = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';
                    logo.style.filter = `brightness(1.2) drop-shadow(0 0 12px ${hoverGlow})`;
                }, 200);

                if (clickedLogos.size === 7) {
                    setTimeout(start16BitEasterEgg, 500);
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTrigger);
    } else {
        initTrigger();
    }
})();
