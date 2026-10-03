/**
 * Pulari Arts & Sports Club – Retro Neon Snake Arcade Game
 * HTML5 Canvas 60FPS Engine, Web Audio Synthesizer, Supabase Live Top-5 Leaderboard (js/snake-game.js)
 */

(function () {
  'use strict';

  // --- Audio Synthesizer (Web Audio API) ---
  let audioCtx = null;
  let soundMuted = localStorage.getItem('pulari_snake_muted') === 'true';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSfx(type) {
    if (soundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'eat') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'golden') {
        [659.25, 880, 1046.5, 1318.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          gain.gain.setValueAtTime(0.25, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.2);
        });
      } else if (type === 'turn') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'gameover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('[Snake Audio Error]', e);
    }
  }

  function haptic(ms = 15) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) { }
    }
  }

  // --- Game State & Constants ---
  const GRID_SIZE = 20; // 20x20 grid
  const BASE_SPEED = 120; // ms per tick

  const state = {
    playerName: localStorage.getItem('pulari_player_name') || 'Player',
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 15, y: 10, type: 'apple' },
    goldenFood: null,
    goldenTimer: 0,
    score: 0,
    highScore: 0,
    applesEaten: 0,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    speedLevel: 'Normal',
    speedMs: BASE_SPEED,
    lastTick: 0,
    particles: [],
    isSyncingScore: false
  };

  // DOM Elements
  const canvas = document.getElementById('snake-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  const scoreEl = document.getElementById('snake-score');
  const mScoreEl = document.getElementById('m-snake-score');
  const highScoreEl = document.getElementById('snake-highscore');
  const mHighEl = document.getElementById('m-snake-highscore');
  const applesEl = document.getElementById('snake-apples');
  const mApplesEl = document.getElementById('m-snake-apples');
  const lengthEl = document.getElementById('snake-length');
  const mLengthEl = document.getElementById('m-snake-length');

  const startOverlay = document.getElementById('snake-start-overlay');
  const pauseOverlay = document.getElementById('snake-pause-overlay');
  const gameoverOverlay = document.getElementById('snake-gameover-overlay');
  const goFinalScore = document.getElementById('go-final-score');
  const goFinalApples = document.getElementById('go-final-apples');
  const goFinalLength = document.getElementById('go-final-length');
  const goHighScore = document.getElementById('go-highscore');
  const goNewRecordBadge = document.getElementById('go-new-record');

  const currentPlayerNameEl = document.getElementById('current-player-name');
  const changePlayerBtn = document.getElementById('btn-change-player');
  const startPlayerInput = document.getElementById('start-player-name');
  const gameoverPlayerInput = document.getElementById('gameover-player-name');
  const speedSelect = document.getElementById('snake-speed-select');

  const leaderboardListEl = document.getElementById('snake-leaderboard-list');
  const modalLeaderboardListEl = document.getElementById('modal-leaderboard-list');
  const leaderboardBadge = document.getElementById('leaderboard-badge');

  const btnOpenLeaderboardModal = document.getElementById('btn-open-leaderboard-modal');
  const btnCloseLeaderboardModal = document.getElementById('btn-close-leaderboard-modal');
  const mobileLeaderboardModal = document.getElementById('mobile-leaderboard-modal');
  const btnModalChangeTag = document.getElementById('btn-modal-change-tag');
  const soundBtn = document.getElementById('btn-sound-toggle');

  // --- Food Placement ---
  function spawnFood() {
    let newX, newY, onSnake;
    do {
      newX = Math.floor(Math.random() * GRID_SIZE);
      newY = Math.floor(Math.random() * GRID_SIZE);
      onSnake = state.snake.some(segment => segment.x === newX && segment.y === newY);
    } while (onSnake);

    state.food = { x: newX, y: newY, type: 'apple' };

    // Chance to spawn Golden Apple every ~5 apples
    if (!state.goldenFood && state.applesEaten > 0 && state.applesEaten % 5 === 0 && Math.random() < 0.8) {
      let gX, gY, gOnSnake;
      do {
        gX = Math.floor(Math.random() * GRID_SIZE);
        gY = Math.floor(Math.random() * GRID_SIZE);
        gOnSnake = state.snake.some(s => s.x === gX && s.y === gY) || (gX === newX && gY === newY);
      } while (gOnSnake);

      state.goldenFood = { x: gX, y: gY, type: 'golden', expiresAt: Date.now() + 8000 };
    }
  }

  // --- Particles & Visual FX ---
  function createEatParticles(x, y, color = '#10b981') {
    if (!canvas) return;
    const cellSize = canvas.width / GRID_SIZE;
    const px = (x + 0.5) * cellSize;
    const py = (y + 0.5) * cellSize;

    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      state.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: color,
        alpha: 1,
        life: 1
      });
    }
  }

  function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;
      if (p.alpha <= 0) {
        state.particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    if (!ctx) return;
    state.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // --- Game Control & Direction ---
  function changeDirection(newDir) {
    if (!state.isPlaying || state.isPaused || state.isGameOver) return;
    // Disallow 180-degree turns
    if (newDir.x === -state.dir.x && newDir.y === -state.dir.y) return;
    if (newDir.x === state.dir.x && newDir.y === state.dir.y) return;

    state.nextDir = newDir;
    playSfx('turn');
    haptic(10);
  }

  // --- Speed & Difficulty Config ---
  function setDifficulty(level) {
    if (!level) level = 'Normal';
    state.speedLevel = level;
    if (level === 'Casual') state.speedMs = 150;
    else if (level === 'Turbo') state.speedMs = 85;
    else state.speedMs = 115; // Normal

    if (speedSelect) speedSelect.value = level;
    try {
      localStorage.setItem('pulari_snake_diff', level);
    } catch (e) { }

    document.querySelectorAll('.diff-btn').forEach(btn => {
      if (btn.getAttribute('data-diff') === level) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function updateSpeedMs() {
    const level = speedSelect ? speedSelect.value : state.speedLevel;
    setDifficulty(level);
  }

  // --- Game Loop & Logic ---
  function updateGame(timestamp) {
    if (!state.isPlaying || state.isPaused || state.isGameOver) return;

    if (!state.lastTick) state.lastTick = timestamp;
    const delta = timestamp - state.lastTick;

    if (delta >= state.speedMs) {
      state.lastTick = timestamp;
      tick();
    }
  }

  function tick() {
    state.dir = state.nextDir;
    const head = state.snake[0];
    const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };

    // 1. Wall Collision Check
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      triggerGameOver();
      return;
    }

    // 2. Self Collision Check
    if (state.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      triggerGameOver();
      return;
    }

    // Move Snake
    state.snake.unshift(newHead);

    // 3. Apple Eating Check
    let ateFood = false;
    if (newHead.x === state.food.x && newHead.y === state.food.y) {
      ateFood = true;
      state.score += 100;
      state.applesEaten++;
      createEatParticles(state.food.x, state.food.y, '#10b981');
      playSfx('eat');
      haptic(18);
      spawnFood();
    }

    // 4. Golden Apple Check
    if (state.goldenFood) {
      if (Date.now() > state.goldenFood.expiresAt) {
        state.goldenFood = null;
      } else if (newHead.x === state.goldenFood.x && newHead.y === state.goldenFood.y) {
        ateFood = true;
        state.score += 350;
        createEatParticles(state.goldenFood.x, state.goldenFood.y, '#f59e0b');
        playSfx('golden');
        haptic(30);
        state.goldenFood = null;
      }
    }

    // If no food was eaten this tick, remove tail segment
    if (!ateFood) {
      state.snake.pop();
    }

    updateUI();
  }

  function updateUI() {
    if (scoreEl) scoreEl.textContent = state.score.toLocaleString();
    if (mScoreEl) mScoreEl.textContent = state.score.toLocaleString();
    if (applesEl) applesEl.textContent = state.applesEaten;
    if (mApplesEl) mApplesEl.textContent = state.applesEaten;
    if (lengthEl) lengthEl.textContent = state.snake.length;
    if (mLengthEl) mLengthEl.textContent = state.snake.length;

    if (state.score > state.highScore) {
      state.highScore = state.score;
    }

    if (highScoreEl) highScoreEl.textContent = state.highScore.toLocaleString();
    if (mHighEl) mHighEl.textContent = state.highScore.toLocaleString();
  }

  // --- Rendering ---
  function render() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cellSize = canvas.width / GRID_SIZE;

    // Draw Subtle Grid Background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw Regular Apple (Food)
    if (state.food) {
      const fx = (state.food.x + 0.5) * cellSize;
      const fy = (state.food.y + 0.5) * cellSize;
      const r = cellSize * 0.42;

      ctx.save();
      ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();

      // Leaf
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(fx + r * 0.4, fy - r * 0.7, r * 0.3, r * 0.15, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Golden Apple
    if (state.goldenFood) {
      const gx = (state.goldenFood.x + 0.5) * cellSize;
      const gy = (state.goldenFood.y + 0.5) * cellSize;
      const gr = cellSize * 0.46;
      const pulse = Math.sin(Date.now() / 150) * 2;

      ctx.save();
      ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(gx, gy, gr + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Star sparkle
      ctx.fillStyle = '#ffffff';
      ctx.font = `${cellSize * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', gx, gy);
      ctx.restore();
    }

    // Draw Snake
    state.snake.forEach((segment, idx) => {
      const sx = segment.x * cellSize;
      const sy = segment.y * cellSize;
      const pad = 1.5;
      const radius = 6;

      ctx.save();
      if (idx === 0) {
        // Snake Head
        ctx.shadowColor = 'rgba(16, 185, 129, 0.7)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#34d399';
        drawRoundedRect(ctx, sx + pad, sy + pad, cellSize - pad * 2, cellSize - pad * 2, radius);
        ctx.fill();

        // Eyes
        const eyeR = cellSize * 0.12;
        ctx.fillStyle = '#0f172a';
        let e1x = sx + cellSize * 0.3;
        let e1y = sy + cellSize * 0.3;
        let e2x = sx + cellSize * 0.7;
        let e2y = sy + cellSize * 0.3;

        if (state.dir.x === 1) { // moving right
          e1x = sx + cellSize * 0.7; e1y = sy + cellSize * 0.3;
          e2x = sx + cellSize * 0.7; e2y = sy + cellSize * 0.7;
        } else if (state.dir.x === -1) { // moving left
          e1x = sx + cellSize * 0.3; e1y = sy + cellSize * 0.3;
          e2x = sx + cellSize * 0.3; e2y = sy + cellSize * 0.7;
        } else if (state.dir.y === 1) { // moving down
          e1x = sx + cellSize * 0.3; e1y = sy + cellSize * 0.7;
          e2x = sx + cellSize * 0.7; e2y = sy + cellSize * 0.7;
        }

        ctx.beginPath();
        ctx.arc(e1x, e1y, eyeR, 0, Math.PI * 2);
        ctx.arc(e2x, e2y, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(e1x, e1y, eyeR * 0.4, 0, Math.PI * 2);
        ctx.arc(e2x, e2y, eyeR * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Snake Body gradient
        const alpha = Math.max(0.4, 1 - idx / (state.snake.length + 8));
        ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
        drawRoundedRect(ctx, sx + pad, sy + pad, cellSize - pad * 2, cellSize - pad * 2, radius);
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw Particles
    updateParticles();
    drawParticles();
  }

  function drawRoundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function gameLoop(timestamp) {
    updateGame(timestamp);
    render();
    requestAnimationFrame(gameLoop);
  }

  // --- Game Flow Controls ---
  function startGame() {
    if (startPlayerInput && startPlayerInput.value.trim()) {
      setPlayerName(startPlayerInput.value.trim());
    }

    state.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    state.dir = { x: 1, y: 0 };
    state.nextDir = { x: 1, y: 0 };
    state.score = 0;
    state.applesEaten = 0;
    state.goldenFood = null;
    state.particles = [];
    state.isPlaying = true;
    state.isPaused = false;
    state.isGameOver = false;
    state.lastTick = 0;

    updateSpeedMs();
    spawnFood();
    updateUI();

    if (startOverlay) startOverlay.style.display = 'none';
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    if (gameoverOverlay) gameoverOverlay.style.display = 'none';

    getAudioContext();
    playSfx('turn');
    haptic(20);
  }

  function togglePause() {
    if (!state.isPlaying || state.isGameOver) return;
    state.isPaused = !state.isPaused;
    if (pauseOverlay) pauseOverlay.style.display = state.isPaused ? 'flex' : 'none';
  }

  function resumeGame() {
    if (!state.isPlaying || state.isGameOver) return;
    state.isPaused = false;
    if (pauseOverlay) pauseOverlay.style.display = 'none';
  }

  async function triggerGameOver() {
    state.isPlaying = false;
    state.isGameOver = true;
    playSfx('gameover');
    haptic([50, 50, 80]);

    if (goFinalScore) goFinalScore.textContent = state.score.toLocaleString();
    if (goFinalApples) goFinalApples.textContent = state.applesEaten;
    if (goFinalLength) goFinalLength.textContent = state.snake.length;
    if (goHighScore) goHighScore.textContent = state.highScore.toLocaleString();

    const isNewHigh = state.score > 0 && state.score >= state.highScore;
    if (goNewRecordBadge) goNewRecordBadge.style.display = isNewHigh ? 'inline-block' : 'none';

    if (gameoverPlayerInput) gameoverPlayerInput.value = state.playerName;
    if (gameoverOverlay) gameoverOverlay.style.display = 'flex';

    if (state.score > 0) {
      await syncScoreToSupabase(state.score, state.applesEaten, state.snake.length, state.speedLevel);
    }
  }

  // --- Player Gamer Tag Management ---
  function setPlayerName(name) {
    if (!name || !name.trim()) return;
    state.playerName = name.trim().slice(0, 18);
    localStorage.setItem('pulari_player_name', state.playerName);
    if (currentPlayerNameEl) currentPlayerNameEl.textContent = state.playerName;
    if (startPlayerInput) startPlayerInput.value = state.playerName;
    if (gameoverPlayerInput) gameoverPlayerInput.value = state.playerName;
  }

  function promptChangePlayerName() {
    const current = state.playerName || 'Player';
    const newName = prompt('Enter your Gamer Tag for the Leaderboard:', current);
    if (newName && newName.trim()) {
      setPlayerName(newName);
      fetchTop5Leaderboard();
      haptic(20);
    }
  }

  // --- Supabase Top 5 Leaderboard Engine ---
  async function fetchTop5Leaderboard() {
    if (typeof supabaseRequest === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      try {
        const rows = await supabaseRequest('snake_leaderboard?select=player_name,high_score,apples_eaten,length,speed_level,created_at&order=high_score.desc&limit=5');
        if (Array.isArray(rows)) {
          if (leaderboardBadge) {
            leaderboardBadge.textContent = '🟢 Live';
            leaderboardBadge.className = 'badge live';
          }
          if (rows.length > 0 && rows[0] && rows[0].high_score != null) {
            state.highScore = Number(rows[0].high_score);
            if (highScoreEl) highScoreEl.textContent = state.highScore.toLocaleString();
            if (mHighEl) mHighEl.textContent = state.highScore.toLocaleString();
          } else {
            state.highScore = 0;
            if (highScoreEl) highScoreEl.textContent = '0';
            if (mHighEl) mHighEl.textContent = '0';
          }
          renderLeaderboard(rows);
          return;
        }
      } catch (err) {
        console.warn('[Snake Supabase] Fetch error:', err);
      }
    }

    if (leaderboardBadge) {
      leaderboardBadge.textContent = '⚪ Offline';
      leaderboardBadge.className = 'badge';
    }
    renderLeaderboard([]);
  }

  async function syncScoreToSupabase(score, apples, length, speedLevel) {
    if (score <= 0 || state.isSyncingScore) return;
    state.isSyncingScore = true;

    if (gameoverPlayerInput && gameoverPlayerInput.value.trim()) {
      setPlayerName(gameoverPlayerInput.value.trim());
    }

    const playerName = state.playerName || 'Player';

    if (typeof supabaseRequest === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      try {
        const existing = await supabaseRequest(
          `snake_leaderboard?select=id,high_score&player_name=eq.${encodeURIComponent(playerName)}&limit=1`
        );

        if (existing && existing.length > 0) {
          if (score > existing[0].high_score) {
            await supabaseRequest(`snake_leaderboard?id=eq.${existing[0].id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                high_score: score,
                apples_eaten: apples,
                length: length,
                speed_level: speedLevel,
                updated_at: new Date().toISOString()
              })
            });
          }
        } else {
          await supabaseRequest('snake_leaderboard', {
            method: 'POST',
            body: JSON.stringify([{
              player_name: playerName,
              high_score: score,
              apples_eaten: apples,
              length: length,
              speed_level: speedLevel
            }])
          });
        }
      } catch (err) {
        console.warn('[Snake Supabase] Sync error:', err);
      }
    }

    state.isSyncingScore = false;
    await fetchTop5Leaderboard();
  }

  function renderLeaderboard(rows) {
    const htmlContent = (!rows || rows.length === 0)
      ? `<li style="color: #64748b; font-size: 0.75rem; text-align: center; padding: 0.5rem 0;">No top scores recorded yet!</li>`
      : rows.map((item, idx) => {
        const rankIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const currentName = (state.playerName || '').trim().toLowerCase();
        const isYou = currentName && (item.player_name || '').trim().toLowerCase() === currentName;
        const topClass = idx === 0 ? 'top-1' : idx === 1 ? 'top-2' : idx === 2 ? 'top-3' : '';
        const youClass = isYou ? 'is-you' : '';
        const score = Number(item.high_score || 0);

        return `
            <li class="leaderboard-item ${topClass} ${youClass}">
              <span class="leaderboard-rank">${rankIcons[idx] || '#' + (idx + 1)}</span>
              <div class="leaderboard-name-wrap">
                <span class="leaderboard-name">
                  ${escapeHtml(item.player_name || 'Player')}
                  ${isYou ? '<span class="you-tag">YOU</span>' : ''}
                </span>
                <span class="leaderboard-meta">🍎 ${item.apples_eaten || 0} Apples • Len ${item.length || 3}</span>
              </div>
              <span class="leaderboard-score">${score.toLocaleString()}</span>
            </li>
          `;
      }).join('');

    if (leaderboardListEl) leaderboardListEl.innerHTML = htmlContent;
    if (modalLeaderboardListEl) modalLeaderboardListEl.innerHTML = htmlContent;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Keyboard & Touch Controls ---
  function setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      // Ignore keybindings if typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection({ x: 1, y: 0 });
          break;
        case ' ':
        case 'p':
        case 'P':
          e.preventDefault();
          togglePause();
          break;
      }
    });
  }

  function setupTouchControls() {
    const btnUp = document.getElementById('snake-btn-up');
    const btnDown = document.getElementById('snake-btn-down');
    const btnLeft = document.getElementById('snake-btn-left');
    const btnRight = document.getElementById('snake-btn-right');

    const bindTouch = (el, dir) => {
      if (!el) return;
      const handler = (e) => {
        e.preventDefault();
        changeDirection(dir);
      };
      el.addEventListener('touchstart', handler, { passive: false });
      el.addEventListener('click', handler);
    };

    bindTouch(btnUp, { x: 0, y: -1 });
    bindTouch(btnDown, { x: 0, y: 1 });
    bindTouch(btnLeft, { x: -1, y: 0 });
    bindTouch(btnRight, { x: 1, y: 0 });

    // Swipe gesture support on canvas
    if (canvas) {
      let touchStartX = 0;
      let touchStartY = 0;

      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      canvas.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const dx = e.changedTouches[0].clientX - touchStartX;
          const dy = e.changedTouches[0].clientY - touchStartY;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (Math.max(absDx, absDy) > 25) {
            if (absDx > absDy) {
              changeDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
            } else {
              changeDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
            }
          }
        }
      }, { passive: true });
    }
  }

  function setupButtons() {
    const startBtn = document.getElementById('btn-start-game');
    const pauseBtn = document.getElementById('btn-pause-game');
    const resumeBtn = document.getElementById('btn-resume-game');
    const restartBtn = document.getElementById('btn-restart-game');
    const playAgainBtn = document.getElementById('btn-play-again');

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
    if (restartBtn) restartBtn.addEventListener('click', startGame);
    if (playAgainBtn) playAgainBtn.addEventListener('click', startGame);

    if (changePlayerBtn) changePlayerBtn.addEventListener('click', promptChangePlayerName);
    if (btnModalChangeTag) btnModalChangeTag.addEventListener('click', () => {
      if (mobileLeaderboardModal) mobileLeaderboardModal.classList.remove('active');
      promptChangePlayerName();
    });

    if (speedSelect) {
      speedSelect.addEventListener('change', () => {
        updateSpeedMs();
      });
    }

    // Hook up all difficulty selector buttons (Mobile & Overlays)
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const diff = btn.getAttribute('data-diff');
        setDifficulty(diff);
        haptic(15);
      });
    });

    // Leaderboard Modal Toggles
    if (btnOpenLeaderboardModal && mobileLeaderboardModal) {
      btnOpenLeaderboardModal.addEventListener('click', () => {
        fetchTop5Leaderboard();
        mobileLeaderboardModal.classList.add('active');
        haptic(15);
      });
    }

    if (btnCloseLeaderboardModal && mobileLeaderboardModal) {
      btnCloseLeaderboardModal.addEventListener('click', () => {
        mobileLeaderboardModal.classList.remove('active');
        haptic(10);
      });
    }

    if (mobileLeaderboardModal) {
      mobileLeaderboardModal.addEventListener('click', (e) => {
        if (e.target === mobileLeaderboardModal) {
          mobileLeaderboardModal.classList.remove('active');
        }
      });
    }

    if (soundBtn) {
      const updateSoundIcon = () => {
        soundBtn.textContent = soundMuted ? '🔇' : '🔊';
        soundBtn.style.color = soundMuted ? '#94a3b8' : '#34d399';
      };
      updateSoundIcon();

      soundBtn.addEventListener('click', () => {
        soundMuted = !soundMuted;
        localStorage.setItem('pulari_snake_muted', soundMuted ? 'true' : 'false');
        updateSoundIcon();
        if (!soundMuted) playSfx('eat');
        haptic(15);
      });
    }
  }

  // --- Initialization ---
  function init() {
    setPlayerName(state.playerName);
    const savedDiff = localStorage.getItem('pulari_snake_diff') || 'Normal';
    setDifficulty(savedDiff);
    updateUI();
    fetchTop5Leaderboard();
    setupKeyboardControls();
    setupTouchControls();
    setupButtons();

    gameLoop(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
