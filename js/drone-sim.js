/**
 * DRONE COMMAND — Mission Simulation Engine
 * Canvas-based tactical sim. No API. No backend.
 * Triggered by SELECT DRONE on attack / recon / supply pages.
 */
(function () {

  /* ─── INJECT STYLES ─────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('dsim-style')) return;
    const s = document.createElement('style');
    s.id = 'dsim-style';
    s.textContent = `
      #dsim-overlay {
        display: none; position: fixed; inset: 0; z-index: 9999;
        background: rgba(5, 8, 14, 0.96);
        backdrop-filter: blur(10px);
        align-items: center; justify-content: center; flex-direction: column;
        font-family: 'Space Mono', 'Courier New', monospace;
      }
      #dsim-overlay.open { display: flex; }

      #dsim-panel {
        position: relative;
        width: min(860px, 96vw);
        background: #080d15;
        border: 1px solid #1e2d40;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 0 60px rgba(0,180,255,0.08);
      }

      /* header */
      #dsim-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 18px;
        background: #060b12;
        border-bottom: 1px solid #1e2d40;
      }
      #dsim-title { font-size: 11px; letter-spacing: 3px; color: #00d9ff; }
      #dsim-drone-id { font-size: 10px; color: #4a6080; letter-spacing: 2px; }
      #dsim-close {
        background: none; border: none; color: #4a6080;
        font-size: 18px; cursor: pointer; padding: 0 4px;
        transition: color .2s;
      }
      #dsim-close:hover { color: #e8edf4; }

      /* canvas */
      #dsim-canvas {
        display: block; width: 100%;
        image-rendering: crisp-edges;
      }

      /* footer */
      #dsim-footer {
        display: grid; grid-template-columns: repeat(4, 1fr);
        border-top: 1px solid #1e2d40;
        background: #060b12;
      }
      .dsim-stat {
        padding: 10px 14px;
        border-right: 1px solid #1e2d40;
      }
      .dsim-stat:last-child { border-right: none; }
      .dsim-stat-label { font-size: 9px; letter-spacing: 2px; color: #4a6080; margin-bottom: 3px; }
      .dsim-stat-value { font-size: 13px; color: #e8edf4; }
      .dsim-stat-value.green { color: #4ade80; }
      .dsim-stat-value.red   { color: #f43f5e; }
      .dsim-stat-value.amber { color: #fb923c; }

      /* phase badge */
      #dsim-phase {
        position: absolute; top: 52px; left: 18px;
        font-size: 9px; letter-spacing: 3px; color: #00d9ff;
        background: rgba(0,217,255,0.08);
        border: 1px solid rgba(0,217,255,0.2);
        padding: 3px 8px; border-radius: 3px;
        pointer-events: none;
      }
    `;
    document.head.appendChild(s);
  }

  /* ─── INJECT HTML ───────────────────────────────────────── */
  function injectHTML() {
    if (document.getElementById('dsim-overlay')) return;
    const el = document.createElement('div');
    el.id = 'dsim-overlay';
    el.innerHTML = `
      <div id="dsim-panel">
        <div id="dsim-header">
          <span id="dsim-title">◆ MISSION SIMULATION</span>
          <span id="dsim-drone-id">UNIT: —</span>
          <button id="dsim-close">✕</button>
        </div>
        <canvas id="dsim-canvas"></canvas>
        <div id="dsim-phase">INITIALISING</div>
        <div id="dsim-footer">
          <div class="dsim-stat">
            <div class="dsim-stat-label">ALTITUDE</div>
            <div class="dsim-stat-value" id="ds-alt">0 m</div>
          </div>
          <div class="dsim-stat">
            <div class="dsim-stat-label">SPEED</div>
            <div class="dsim-stat-value" id="ds-spd">0 km/h</div>
          </div>
          <div class="dsim-stat">
            <div class="dsim-stat-label">STATUS</div>
            <div class="dsim-stat-value green" id="ds-sta">STANDBY</div>
          </div>
          <div class="dsim-stat">
            <div class="dsim-stat-label">MISSION</div>
            <div class="dsim-stat-value" id="ds-mis">—</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    document.getElementById('dsim-close').onclick = stopSim;
    el.addEventListener('click', e => { if (e.target === el) stopSim(); });
  }

  /* ─── STATE ─────────────────────────────────────────────── */
  let animId = null;
  let ctx, W, H;

  function stopSim() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    document.getElementById('dsim-overlay').classList.remove('open');
  }

  /* ─── PUBLIC API ────────────────────────────────────────── */
  window.DroneSim = {
    trigger(drone) {
      injectStyles();
      injectHTML();

      const canvas = document.getElementById('dsim-canvas');
      // Size canvas to 16:9
      const pw = Math.min(860, window.innerWidth * 0.96);
      W = Math.round(pw); H = Math.round(pw * 9 / 16);
      canvas.width  = W; canvas.height = H;
      canvas.style.height = H + 'px';

      ctx = canvas.getContext('2d');

      document.getElementById('dsim-drone-id').textContent = 'UNIT: ' + (drone.name || '—');
      document.getElementById('ds-mis').textContent = (drone.type || '').toUpperCase();

      document.getElementById('dsim-overlay').classList.add('open');

      if (animId) cancelAnimationFrame(animId);

      switch ((drone.type || '').toLowerCase()) {
        case 'attack':  runAttack(drone);  break;
        case 'supply':  runSupply(drone);  break;
        default:        runRecon(drone);   break;
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     SHARED DRAWING HELPERS
  ═══════════════════════════════════════════════════════════ */

  function drawGrid(color = 'rgba(0,180,255,0.04)', step = 40) {
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  function drawTerrain(seed, color = '#0a1a10') {
    ctx.beginPath(); ctx.moveTo(0, H);
    const pts = 20;
    for (let i = 0; i <= pts; i++) {
      const x = (i / pts) * W;
      const y = H * 0.65 + Math.sin(i * 0.9 + seed) * H * 0.08
                          + Math.sin(i * 1.7 + seed * 2) * H * 0.04;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();

    // ridge line
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const x = (i / pts) * W;
      const y = H * 0.65 + Math.sin(i * 0.9 + seed) * H * 0.08
                          + Math.sin(i * 1.7 + seed * 2) * H * 0.04;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(74,222,128,0.15)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawDroneIcon(x, y, size, color, angle = 0) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;

    // body
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6); ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(0, size * 0.4);  ctx.lineTo(-size * 0.3, 0);
    ctx.closePath(); ctx.stroke();

    // arms
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(sx*size*0.25, sy*size*0.25);
      ctx.lineTo(sx*size*0.55, sy*size*0.55);
      ctx.stroke();
      // rotor
      ctx.beginPath();
      ctx.arc(sx*size*0.55, sy*size*0.55, size*0.14, 0, Math.PI*2);
      ctx.strokeStyle = color; ctx.stroke();
    });
    ctx.restore();
  }

  function drawGlow(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }

  function setPhase(txt) { document.getElementById('dsim-phase').textContent = txt; }
  function setStat(id, val, cls = '') {
    const el = document.getElementById(id);
    el.textContent = val;
    el.className = 'dsim-stat-value ' + cls;
  }

  function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  /* ═══════════════════════════════════════════════════════════
     ATTACK SIMULATION
     Drone streaks across screen, locks on target, strikes.
  ═══════════════════════════════════════════════════════════ */
  function runAttack(drone) {
    const speed = parseInt(drone.range_km) || 300;
    const TARGET = { x: W * 0.75, y: H * 0.58 };
    const START  = { x: W * 0.08, y: H * 0.38 };

    let t = 0, phase = 'approach'; // approach → lock → dive → strike → clear
    let lockTimer = 0, strikeTimer = 0, lockRings = [];
    let droneX = START.x, droneY = START.y;
    let explosionR = 0, explosionAlpha = 1;
    let particles = [];

    function frame() {
      ctx.clearRect(0, 0, W, H);

      // BG
      ctx.fillStyle = '#050a0f'; ctx.fillRect(0, 0, W, H);
      drawGrid('rgba(244,63,94,0.05)', 50);
      drawTerrain(1.2, '#0d0608');

      // approach path (dashed)
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(244,63,94,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(START.x, START.y); ctx.lineTo(TARGET.x, TARGET.y);
      ctx.stroke(); ctx.setLineDash([]);

      // target marker
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.08);
      ctx.strokeStyle = `rgba(244,63,94,${0.5 + pulse * 0.5})`; ctx.lineWidth = 1.5;
      [[16,0],[24,0],[32,0]].forEach(([r]) => {
        ctx.beginPath(); ctx.arc(TARGET.x, TARGET.y, r * (1 + pulse * 0.1), 0, Math.PI*2);
        ctx.stroke();
      });
      // crosshair
      [[-40,0],[40,0],[0,-40],[0,40]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.moveTo(TARGET.x + dx*0.3, TARGET.y + dy*0.3);
        ctx.lineTo(TARGET.x + dx, TARGET.y + dy); ctx.stroke();
      });

      if (phase === 'approach') {
        t++;
        const prog = Math.min(t / 120, 1);
        droneX = START.x + (TARGET.x - START.x - 60) * ease(prog);
        droneY = START.y + (TARGET.y - START.y - 20) * ease(prog);

        const altM = Math.round(800 - prog * 300);
        const spdK = Math.round(speed * 3.2 * (0.6 + prog * 0.4));
        setStat('ds-alt', altM + ' m');
        setStat('ds-spd', spdK + ' km/h', 'red');
        setStat('ds-sta', 'INCOMING', 'red');
        setPhase('PHASE 1 — APPROACH');

        // exhaust trail
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(droneX - 8 - i*4 + (Math.random()-0.5)*4,
                  droneY + (Math.random()-0.5)*4, 2 - i*0.5, 0, Math.PI*2);
          ctx.fillStyle = `rgba(244,63,94,${0.6 - i*0.15})`; ctx.fill();
        }
        drawGlow(droneX, droneY, 30, 'rgba(244,63,94,0.15)');
        drawDroneIcon(droneX, droneY, 14, '#f43f5e', Math.atan2(TARGET.y - START.y, TARGET.x - START.x));

        if (prog >= 1) { phase = 'lock'; lockTimer = 0; }

      } else if (phase === 'lock') {
        lockTimer++;
        droneX = TARGET.x - 60; droneY = TARGET.y - 20;

        // expanding lock rings
        if (lockTimer % 8 === 0) lockRings.push({ r: 10, alpha: 1 });
        lockRings = lockRings.filter(r => r.alpha > 0);
        lockRings.forEach(r => {
          ctx.strokeStyle = `rgba(244,63,94,${r.alpha})`;
          ctx.lineWidth = 1.5; ctx.beginPath();
          ctx.arc(TARGET.x, TARGET.y, r.r, 0, Math.PI*2); ctx.stroke();
          r.r += 2.5; r.alpha -= 0.04;
        });

        setStat('ds-alt', '520 m');
        setStat('ds-spd', '180 km/h', 'amber');
        setStat('ds-sta', 'TARGET LOCK', 'amber');
        setPhase('PHASE 2 — TARGET LOCK');
        drawGlow(droneX, droneY, 25, 'rgba(244,63,94,0.2)');
        drawDroneIcon(droneX, droneY, 14, '#f43f5e', 0.3);

        if (lockTimer > 80) { phase = 'dive'; }

      } else if (phase === 'dive') {
        t++;
        const prog = Math.min((t - 200) / 30, 1);
        droneX = (TARGET.x - 60) + 60 * ease(prog);
        droneY = (TARGET.y - 20) + 20 * ease(prog);
        drawDroneIcon(droneX, droneY, 14, '#f43f5e', 0.6);
        setStat('ds-spd', '650 km/h', 'red');
        setStat('ds-sta', 'STRIKE', 'red');
        setPhase('PHASE 3 — STRIKE RUN');
        if (prog >= 1) {
          phase = 'strike'; strikeTimer = 0;
          // spawn particles
          for (let i = 0; i < 40; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 5;
            particles.push({ x: TARGET.x, y: TARGET.y,
              vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
              life: 1, color: Math.random() > 0.5 ? '#f43f5e' : '#fb923c' });
          }
        }

      } else if (phase === 'strike') {
        strikeTimer++;
        explosionR = Math.min(strikeTimer * 4, 80);
        explosionAlpha = Math.max(1 - strikeTimer / 60, 0);

        drawGlow(TARGET.x, TARGET.y, explosionR * 2, `rgba(244,63,94,${explosionAlpha * 0.6})`);
        ctx.strokeStyle = `rgba(251,146,60,${explosionAlpha})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(TARGET.x, TARGET.y, explosionR, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = `rgba(244,63,94,${explosionAlpha * 0.5})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(TARGET.x, TARGET.y, explosionR * 1.5, 0, Math.PI*2); ctx.stroke();

        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2);
          ctx.fillStyle = p.color.replace(')', `,${p.life})`).replace('rgb', 'rgba'); ctx.fill();
        });
        particles = particles.filter(p => p.life > 0);

        setStat('ds-alt', '0 m');
        setStat('ds-spd', '0 km/h');
        setStat('ds-sta', 'TARGET HIT', 'red');
        setPhase('PHASE 4 — IMPACT');

        if (strikeTimer > 120) { phase = 'done'; setPhase('MISSION COMPLETE'); setStat('ds-sta','COMPLETE','green'); }
      }

      if (phase !== 'done') animId = requestAnimationFrame(frame);
    }
    animId = requestAnimationFrame(frame);
  }

  /* ═══════════════════════════════════════════════════════════
     RECON SIMULATION
     Drone sweeps area with sensor cone, marks waypoints.
  ═══════════════════════════════════════════════════════════ */
  function runRecon(drone) {
    const endurance = parseFloat(drone.endurance_hrs) || 8;
    const WAYPOINTS = [
      { x: W*0.15, y: H*0.35 },
      { x: W*0.38, y: H*0.25 },
      { x: W*0.60, y: H*0.40 },
      { x: W*0.80, y: H*0.28 },
    ];
    let wpIdx = 0, t = 0, droneX = W*0.05, droneY = H*0.45;
    let scanned = [], scanPulses = [], radarAngle = 0;
    const SCAN_R = 60;

    function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#050f08'; ctx.fillRect(0, 0, W, H);
      drawGrid('rgba(74,222,128,0.04)', 45);
      drawTerrain(0.5, '#091208');

      // draw path so far
      ctx.setLineDash([4,8]);
      ctx.strokeStyle = 'rgba(74,222,128,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W*0.05, H*0.45);
      WAYPOINTS.forEach((w,i) => { if(i <= wpIdx) ctx.lineTo(w.x, w.y); });
      ctx.lineTo(droneX, droneY); ctx.stroke(); ctx.setLineDash([]);

      // waypoints
      WAYPOINTS.forEach((w, i) => {
        const done = i < wpIdx;
        ctx.strokeStyle = done ? '#4ade80' : 'rgba(74,222,128,0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w.x - 8, w.y - 8, 16, 16);
        if (done) {
          ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(w.x - 4, w.y); ctx.lineTo(w.x - 1, w.y + 4);
          ctx.lineTo(w.x + 5, w.y - 4); ctx.stroke();
        }
        ctx.fillStyle = done ? 'rgba(74,222,128,0.12)' : 'rgba(74,222,128,0.05)';
        ctx.fillRect(w.x-8,w.y-8,16,16);
      });

      // scanned zones
      scanned.forEach(s => {
        ctx.fillStyle = 'rgba(74,222,128,0.07)';
        ctx.beginPath(); ctx.arc(s.x, s.y, SCAN_R, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(74,222,128,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(s.x, s.y, SCAN_R, 0, Math.PI*2); ctx.stroke();
      });

      // sensor cone
      const coneAngle = Math.PI / 5;
      const targetWp = WAYPOINTS[Math.min(wpIdx, WAYPOINTS.length-1)];
      const fwd = Math.atan2(targetWp.y - droneY, targetWp.x - droneX);
      const cg = ctx.createRadialGradient(droneX, droneY, 0, droneX, droneY, SCAN_R);
      cg.addColorStop(0, 'rgba(74,222,128,0.2)');
      cg.addColorStop(1, 'rgba(74,222,128,0)');
      ctx.beginPath();
      ctx.moveTo(droneX, droneY);
      ctx.arc(droneX, droneY, SCAN_R, fwd - coneAngle, fwd + coneAngle);
      ctx.closePath(); ctx.fillStyle = cg; ctx.fill();

      // scan pulses
      scanPulses = scanPulses.filter(p => p.r < SCAN_R);
      if (t % 20 === 0) scanPulses.push({ r: 0 });
      scanPulses.forEach(p => {
        ctx.strokeStyle = `rgba(74,222,128,${0.4 * (1 - p.r/SCAN_R)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(droneX, droneY, p.r, fwd - coneAngle, fwd + coneAngle);
        ctx.stroke(); p.r += 2;
      });

      // mini radar (top-right)
      const rx = W - 70, ry = 70, rr = 50;
      ctx.fillStyle = 'rgba(5,15,8,0.85)'; ctx.beginPath(); ctx.arc(rx,ry,rr+6,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(74,222,128,0.15)'; ctx.lineWidth = 1;
      [0.33,0.66,1].forEach(f => { ctx.beginPath(); ctx.arc(rx,ry,rr*f,0,Math.PI*2); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(rx-rr,ry); ctx.lineTo(rx+rr,ry); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx,ry-rr); ctx.lineTo(rx,ry+rr); ctx.stroke();
      radarAngle += 0.03;
      const rg = ctx.createConicalGradient ? null : null;
      ctx.save(); ctx.translate(rx,ry);
      ctx.beginPath();
      ctx.moveTo(0,0); ctx.arc(0,0,rr,radarAngle-0.6,radarAngle);
      ctx.closePath();
      ctx.fillStyle = 'rgba(74,222,128,0.18)'; ctx.fill();
      ctx.strokeStyle = 'rgba(74,222,128,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(radarAngle)*rr, Math.sin(radarAngle)*rr); ctx.stroke();
      // drone blip on radar
      const bx = ((droneX/W)*2-1)*rr*0.8, by = ((droneY/H)*2-1)*rr*0.8;
      ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(bx,by,3,0,Math.PI*2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(74,222,128,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(rx,ry,rr+6,0,Math.PI*2); ctx.stroke();

      // move drone
      t++;
      if (wpIdx < WAYPOINTS.length) {
        const wp = WAYPOINTS[wpIdx];
        const dx = wp.x - droneX, dy = wp.y - droneY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const spd = 1.6;
        if (dist < spd + 1) {
          scanned.push({ x: droneX, y: droneY });
          wpIdx++;
          setStat('ds-alt', (Math.round(300 + Math.random()*100)) + ' m');
        } else {
          droneX += (dx/dist)*spd; droneY += (dy/dist)*spd;
        }
        setStat('ds-spd', Math.round(280 + Math.sin(t*0.05)*40) + ' km/h', 'green');
        setStat('ds-sta', `WP ${wpIdx+1}/${WAYPOINTS.length}`, 'green');
        setPhase(`PHASE ${wpIdx+1} — SCANNING ZONE ${wpIdx+1}`);
      } else {
        setPhase('MISSION COMPLETE — ALL ZONES SCANNED');
        setStat('ds-sta', 'COMPLETE', 'green');
        setStat('ds-spd', '0 km/h');
      }

      drawGlow(droneX, droneY, 20, 'rgba(74,222,128,0.2)');
      drawDroneIcon(droneX, droneY, 13, '#4ade80', fwd);

      animId = requestAnimationFrame(frame);
    }
    animId = requestAnimationFrame(frame);
  }

  /* ═══════════════════════════════════════════════════════════
     SUPPLY SIMULATION
     Drone follows cargo route, drops payload at destination.
  ═══════════════════════════════════════════════════════════ */
  function runSupply(drone) {
    const payload = parseInt(drone.payload_kg) || 50;
    const DEPOT = { x: W*0.1, y: H*0.45 };
    const DROP  = { x: W*0.82, y: H*0.55 };
    const MID   = { x: W*0.46, y: H*0.22 }; // climb point

    let t = 0, phase = 'ascend';
    let droneX = DEPOT.x, droneY = DEPOT.y;
    let cargoY = 0, cargoAlpha = 1, cargoDropped = false;
    let dropParticles = [], landingRings = [];
    let pathProgress = 0;

    // bezier helper
    function bezier(t, p0, p1, p2) {
      return {
        x: (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x,
        y: (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y
      };
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#080a05'; ctx.fillRect(0, 0, W, H);
      drawGrid('rgba(251,146,60,0.04)', 48);
      drawTerrain(2.1, '#0e0d06');

      // bezier flight path
      ctx.setLineDash([5,7]);
      ctx.strokeStyle = 'rgba(251,146,60,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const p = bezier(i/40, DEPOT, MID, DROP);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke(); ctx.setLineDash([]);

      // depot
      ctx.fillStyle = 'rgba(251,146,60,0.1)'; ctx.fillRect(DEPOT.x-20, DEPOT.y-12, 40, 24);
      ctx.strokeStyle = 'rgba(251,146,60,0.4)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(DEPOT.x-20, DEPOT.y-12, 40, 24);
      ctx.fillStyle = '#fb923c'; ctx.font = '9px monospace';
      ctx.fillText('BASE', DEPOT.x-10, DEPOT.y+4);

      // drop zone
      ctx.strokeStyle = cargoDropped ? '#4ade80' : 'rgba(251,146,60,0.5)';
      ctx.lineWidth = 1.5;
      [16,28,40].forEach(r => {
        ctx.beginPath(); ctx.arc(DROP.x, DROP.y, r, 0, Math.PI*2); ctx.stroke();
      });
      ctx.fillStyle = cargoDropped ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.08)';
      ctx.beginPath(); ctx.arc(DROP.x, DROP.y, 40, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cargoDropped ? '#4ade80' : '#fb923c';
      ctx.font = '9px monospace'; ctx.fillText('DROP', DROP.x-12, DROP.y+4);

      // landing rings
      landingRings = landingRings.filter(r => r.alpha > 0);
      landingRings.forEach(r => {
        ctx.strokeStyle = `rgba(74,222,128,${r.alpha})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(DROP.x, DROP.y, r.r, 0, Math.PI*2); ctx.stroke();
        r.r += 1.5; r.alpha -= 0.025;
      });

      // cargo box (hangs below drone)
      if (!cargoDropped) {
        const cbx = droneX, cby = droneY + 18 + cargoY;
        ctx.strokeStyle = `rgba(251,146,60,${cargoAlpha})`; ctx.lineWidth = 1.5;
        ctx.strokeRect(cbx - 8, cby - 6, 16, 12);
        // cable
        ctx.beginPath(); ctx.moveTo(cbx, droneY+8); ctx.lineTo(cbx, cby-6);
        ctx.strokeStyle = `rgba(251,146,60,${cargoAlpha * 0.5})`; ctx.lineWidth = 1;
        ctx.stroke();
        // weight label
        ctx.fillStyle = `rgba(251,146,60,${cargoAlpha})`;
        ctx.font = '8px monospace'; ctx.fillText(payload+'kg', cbx-10, cby+4);
      }

      // drop particles
      dropParticles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.life-=0.02;
        ctx.fillStyle=`rgba(251,146,60,${p.life})`; ctx.beginPath();
        ctx.arc(p.x,p.y,2,0,Math.PI*2); ctx.fill();
      });
      dropParticles = dropParticles.filter(p=>p.life>0);

      // move drone along bezier
      t++;
      if (phase === 'ascend' || phase === 'cruise' || phase === 'descend') {
        pathProgress = Math.min(pathProgress + 0.004, 1);
        const pos = bezier(pathProgress, DEPOT, MID, DROP);
        droneX = pos.x; droneY = pos.y;

        const alt = Math.round(100 + Math.sin(pathProgress * Math.PI) * 700);
        const spd = Math.round(180 + Math.sin(pathProgress * Math.PI * 2) * 60);
        setStat('ds-alt', alt + ' m');
        setStat('ds-spd', spd + ' km/h', 'amber');
        setStat('ds-sta', cargoDropped ? 'RETURNING' : 'EN ROUTE', 'amber');

        if (pathProgress < 0.35)      { phase='ascend'; setPhase('PHASE 1 — ASCENDING'); }
        else if (pathProgress < 0.65) { phase='cruise'; setPhase('PHASE 2 — CRUISE ALTITUDE'); }
        else                          { phase='descend'; setPhase('PHASE 3 — FINAL APPROACH'); }

        // exhaust
        ctx.beginPath();
        ctx.arc(droneX - 6, droneY + 2, 2, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(251,146,60,0.5)'; ctx.fill();

        if (pathProgress >= 1 && !cargoDropped) {
          cargoDropped = true;
          phase = 'drop';
          for (let i = 0; i < 20; i++) {
            const a = Math.random()*Math.PI*2, spd = 1+Math.random()*3;
            dropParticles.push({x:DROP.x,y:DROP.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,life:1});
          }
        }
      } else if (phase === 'drop') {
        cargoY += 2; cargoAlpha -= 0.03;
        if (t % 10 === 0) landingRings.push({r:10, alpha:0.8});
        setStat('ds-alt', '0 m');
        setStat('ds-spd', '0 km/h');
        setStat('ds-sta', 'DELIVERED', 'green');
        setPhase('PHASE 4 — PAYLOAD DELIVERED');
        if (cargoAlpha <= 0) phase = 'done';
      }

      drawGlow(droneX, droneY, 22, 'rgba(251,146,60,0.18)');
      const heading = pathProgress < 1
        ? Math.atan2(bezier(Math.min(pathProgress+0.01,1),DEPOT,MID,DROP).y - droneY,
                     bezier(Math.min(pathProgress+0.01,1),DEPOT,MID,DROP).x - droneX)
        : 0;
      drawDroneIcon(droneX, droneY, 14, '#fb923c', heading);
      setStat('ds-mis', drone.type?.toUpperCase() || 'SUPPLY');

      animId = requestAnimationFrame(frame);
    }
    animId = requestAnimationFrame(frame);
  }

})();
