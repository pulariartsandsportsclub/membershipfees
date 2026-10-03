/**
 * Pulari Arts & Sports Club – Balloon Pop 30s Blitz Mini-Game
 * HTML5 Canvas Physics Engine, Realistic Pop SFX, Supabase Live Top-5 Leaderboard (js/balloon-game.js)
 */

(function () {
  'use strict';

  // --- Audio Synthesizer (Web Audio API) ---
  let audioCtx = null;
  let soundMuted = localStorage.getItem('pulari_balloon_muted') === 'true';

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

      if (type === 'pop') {
        // High-speed white noise burst + frequency snap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450 + Math.random() * 200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'golden') {
        [587.33, 880, 1174.66, 1760].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.25, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.18);
        });
      } else if (type === 'time') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'bomb') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'gameover') {
        [0, 0.18, 0.36].forEach((offset, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(idx === 2 ? 1600 : 2000, now + offset);
          gain.gain.setValueAtTime(0.3, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + offset + (idx === 2 ? 0.4 : 0.15));
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + (idx === 2 ? 0.4 : 0.15));
        });
      }
    } catch (e) {
      console.warn('[Balloon Audio Error]', e);
    }
  }

  function haptic(ms = 15) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) { }
    }
  }

  // --- Balloon Types & Palettes ---
  const BALLOON_COLORS = [
    { name: 'red', hex: '#ef4444', highlight: '#fca5a5' },
    { name: 'blue', hex: '#3b82f6', highlight: '#93c5fd' },
    { name: 'green', hex: '#10b981', highlight: '#6ee7b7' },
    { name: 'purple', hex: '#a855f7', highlight: '#d8b4fe' },
    { name: 'pink', hex: '#ec4899', highlight: '#fbcfe8' },
    { name: 'amber', hex: '#f59e0b', highlight: '#fde68a' },
    { name: 'cyan', hex: '#06b6d4', highlight: '#a5f3fc' }
  ];

  // --- Game State ---
  const GAME_DURATION = 30.0; // 30 seconds

  const state = {
    playerName: localStorage.getItem('pulari_player_name') || 'Player',
    score: 0,
    highScore: 0,
    balloonsPopped: 0,
    totalTaps: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: GAME_DURATION,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    lastTime: 0,
    lastSpawn: 0,
    spawnInterval: 480, // ms between balloon spawns
    balloons: [],
    particles: [],
    floatingTexts: [],
    lastTickSoundSec: 0,
    isSyncingScore: false
  };

  // DOM Elements
  const canvas = document.getElementById('balloon-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  const scoreEl = document.getElementById('balloon-score');
  const mScoreEl = document.getElementById('m-balloon-score');
  const highScoreEl = document.getElementById('balloon-highscore');
  const mHighEl = document.getElementById('m-balloon-highscore');
  const timerEl = document.getElementById('balloon-timer');
  const mTimerEl = document.getElementById('m-balloon-timer');
  const poppedEl = document.getElementById('balloon-popped');
  const mPoppedEl = document.getElementById('m-balloon-popped');
  const timeBarEl = document.getElementById('balloon-time-bar');

  const startOverlay = document.getElementById('balloon-start-overlay');
  const pauseOverlay = document.getElementById('balloon-pause-overlay');
  const gameoverOverlay = document.getElementById('balloon-gameover-overlay');
  const goFinalScore = document.getElementById('go-final-score');
  const goFinalPopped = document.getElementById('go-final-popped');
  const goFinalAccuracy = document.getElementById('go-final-accuracy');
  const goHighScore = document.getElementById('go-highscore');
  const goNewRecordBadge = document.getElementById('go-new-record');

  const currentPlayerNameEl = document.getElementById('current-player-name');
  const changePlayerBtn = document.getElementById('btn-change-player');
  const startPlayerInput = document.getElementById('start-player-name');
  const gameoverPlayerInput = document.getElementById('gameover-player-name');

  const leaderboardListEl = document.getElementById('balloon-leaderboard-list');
  const modalLeaderboardListEl = document.getElementById('modal-leaderboard-list');
  const leaderboardBadge = document.getElementById('leaderboard-badge');

  const btnOpenLeaderboardModal = document.getElementById('btn-open-leaderboard-modal');
  const btnCloseLeaderboardModal = document.getElementById('btn-close-leaderboard-modal');
  const mobileLeaderboardModal = document.getElementById('mobile-leaderboard-modal');
  const btnModalChangeTag = document.getElementById('btn-modal-change-tag');
  const soundBtn = document.getElementById('btn-sound-toggle');

  // --- Responsive Canvas Sizing ---
  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }

  // --- Balloon Factory ---
  function spawnBalloon() {
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    const radius = Math.random() * 7 + 24; // 24px - 31px radius
    const x = Math.random() * (w - radius * 2.5) + radius * 1.25;
    const y = h + radius + 10;

    // Determine type
    const roll = Math.random();
    let type = 'regular';
    let pts = 1;
    let colorObj = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];

    if (roll < 0.08) {
      type = 'golden';
      pts = 3;
      colorObj = { name: 'gold', hex: '#fbbf24', highlight: '#fef08a' };
    } else if (roll < 0.14) {
      type = 'time';
      pts = 1;
      colorObj = { name: 'time', hex: '#06b6d4', highlight: '#cffafe' };
    } else if (roll < 0.20) {
      type = 'bomb';
      pts = -2;
      colorObj = { name: 'bomb', hex: '#334155', highlight: '#94a3b8' };
    }

    const speed = (Math.random() * 1.4 + 1.8) * (h / 520);
    const swingSpeed = Math.random() * 0.04 + 0.02;
    const swingAmp = Math.random() * 25 + 10;

    state.balloons.push({
      x, y,
      baseX: x,
      radius,
      type,
      pts,
      color: colorObj.hex,
      highlight: colorObj.highlight,
      speed,
      swingSpeed,
      swingAmp,
      swingOffset: Math.random() * Math.PI * 2,
      popped: false
    });
  }

  // --- Pop Particles & Floating Score Text ---
  function createPopParticles(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: Math.random() * 3.5 + 2,
        color,
        alpha: 1,
        gravity: 0.12
      });
    }
  }

  function addFloatingText(x, y, text, color = '#34d399') {
    state.floatingTexts.push({
      x, y,
      text,
      color,
      alpha: 1,
      vy: -1.8
    });
  }

  // --- Balloon Tap Detection ---
  function handleCanvasTap(clientX, clientY) {
    if (!state.isPlaying || state.isPaused || state.isGameOver || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    state.totalTaps++;
    let hit = false;

    // Check top-most balloon first (iterate in reverse)
    for (let i = state.balloons.length - 1; i >= 0; i--) {
      const b = state.balloons[i];
      if (b.popped) continue;

      const dx = clickX - b.x;
      const dy = clickY - (b.y - b.radius * 0.1); // Slightly higher touch center for oval
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= b.radius * 1.25) { // Generous hit area
        b.popped = true;
        hit = true;
        state.balloons.splice(i, 1);

        if (b.type === 'golden') {
          state.score += b.pts;
          state.balloonsPopped++;
          state.combo++;
          playSfx('golden');
          haptic(30);
          createPopParticles(b.x, b.y, '#fbbf24', 26);
          addFloatingText(b.x, b.y, `+${b.pts} 🌟`, '#fbbf24');
        } else if (b.type === 'time') {
          state.score += b.pts;
          state.balloonsPopped++;
          state.timeLeft = Math.min(GAME_DURATION, state.timeLeft + 2.0);
          playSfx('time');
          haptic(25);
          createPopParticles(b.x, b.y, '#06b6d4', 22);
          addFloatingText(b.x, b.y, `+2s ⏱️`, '#38bdf8');
        } else if (b.type === 'bomb') {
          state.score = Math.max(0, state.score - 2);
          state.combo = 0;
          playSfx('bomb');
          haptic([40, 40, 60]);
          createPopParticles(b.x, b.y, '#ef4444', 24);
          addFloatingText(b.x, b.y, `-2 💣`, '#ef4444');
        } else {
          state.score += b.pts;
          state.balloonsPopped++;
          state.combo++;
          playSfx('pop');
          haptic(15);
          createPopParticles(b.x, b.y, b.color, 16);
          addFloatingText(b.x, b.y, `+1`, '#34d399');
        }

        if (state.combo > state.maxCombo) {
          state.maxCombo = state.combo;
        }

        updateUI();
        break; // One tap hits one balloon
      }
    }

    if (!hit) {
      state.combo = 0;
    }
  }

  // --- Physics & Game Loop ---
  function update(timestamp) {
    if (!state.isPlaying || state.isPaused || state.isGameOver) return;

    if (!state.lastTime) state.lastTime = timestamp;
    const deltaMs = timestamp - state.lastTime;
    state.lastTime = timestamp;
    const deltaSec = deltaMs / 1000;

    // 1. Update Timer
    state.timeLeft -= deltaSec;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateUI();
      triggerGameOver();
      return;
    }

    // Ticking audio in final 5 seconds
    const currentSec = Math.ceil(state.timeLeft);
    if (currentSec <= 5 && currentSec !== state.lastTickSoundSec) {
      state.lastTickSoundSec = currentSec;
      playSfx('tick');
      haptic(10);
    }

    // 2. Spawn Balloons
    state.lastSpawn += deltaMs;
    // Faster spawn rate as timer ticks down
    const dynamicInterval = Math.max(260, state.spawnInterval - (GAME_DURATION - state.timeLeft) * 6);
    if (state.lastSpawn >= dynamicInterval) {
      state.lastSpawn = 0;
      spawnBalloon();
      // Occasionally spawn a pair of balloons
      if (Math.random() < 0.25) spawnBalloon();
    }

    // 3. Update Balloons
    for (let i = state.balloons.length - 1; i >= 0; i--) {
      const b = state.balloons[i];
      b.y -= b.speed;
      b.x = b.baseX + Math.sin(b.y * b.swingSpeed + b.swingOffset) * b.swingAmp;

      // Remove balloon if it escaped off top
      if (b.y < -b.radius * 2) {
        state.balloons.splice(i, 1);
      }
    }

    // 4. Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // 5. Update Floating Texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;
      if (ft.alpha <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }

    updateUI();
  }

  function render() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Balloons
    state.balloons.forEach(b => {
      ctx.save();

      // Balloon string
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.radius * 1.1);
      ctx.quadraticCurveTo(b.x + Math.sin(b.y * 0.1) * 6, b.y + b.radius * 1.6, b.x, b.y + b.radius * 2.2);
      ctx.stroke();

      // Balloon Oval Body
      ctx.shadowColor = b.type === 'golden' ? 'rgba(251, 191, 36, 0.7)' : 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = b.type === 'golden' ? 16 : 8;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.radius * 0.85, b.radius * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Balloon Knot
      ctx.beginPath();
      ctx.moveTo(b.x - 3, b.y + b.radius * 1.08);
      ctx.lineTo(b.x + 3, b.y + b.radius * 1.08);
      ctx.lineTo(b.x, b.y + b.radius * 1.15);
      ctx.closePath();
      ctx.fill();

      // Shiny Highlight
      ctx.fillStyle = b.highlight;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(b.x - b.radius * 0.35, b.y - b.radius * 0.45, b.radius * 0.25, b.radius * 0.42, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Icon on Special Balloons
      if (b.type === 'golden') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = `${b.radius * 0.85}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', b.x, b.y);
      } else if (b.type === 'time') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = `${b.radius * 0.8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏱️', b.x, b.y);
      } else if (b.type === 'bomb') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = `${b.radius * 0.8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', b.x, b.y);
      }

      ctx.restore();
    });

    // Draw Particles
    state.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Floating Texts
    state.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = `bold 16px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  function gameLoop(timestamp) {
    update(timestamp);
    render();
    requestAnimationFrame(gameLoop);
  }

  // --- UI Updates ---
  function updateUI() {
    const formattedScore = state.score.toLocaleString();
    if (scoreEl) scoreEl.textContent = formattedScore;
    if (mScoreEl) mScoreEl.textContent = formattedScore;

    const formattedTime = `${Math.max(0, state.timeLeft).toFixed(1)}s`;
    if (timerEl) timerEl.textContent = formattedTime;
    if (mTimerEl) mTimerEl.textContent = formattedTime;

    if (poppedEl) poppedEl.textContent = state.balloonsPopped;
    if (mPoppedEl) mPoppedEl.textContent = state.balloonsPopped;

    if (timeBarEl) {
      const pct = (state.timeLeft / GAME_DURATION) * 100;
      timeBarEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      if (state.timeLeft <= 5) {
        timeBarEl.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
      } else {
        timeBarEl.style.background = 'linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)';
      }
    }

    if (state.score > state.highScore) {
      state.highScore = state.score;
    }

    if (highScoreEl) highScoreEl.textContent = state.highScore.toLocaleString();
    if (mHighEl) mHighEl.textContent = state.highScore.toLocaleString();
  }

  // --- Game Flow Controls ---
  function startGame() {
    resizeCanvas();
    if (startPlayerInput && startPlayerInput.value.trim()) {
      setPlayerName(startPlayerInput.value.trim());
    }

    state.score = 0;
    state.balloonsPopped = 0;
    state.totalTaps = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.timeLeft = GAME_DURATION;
    state.balloons = [];
    state.particles = [];
    state.floatingTexts = [];
    state.isPlaying = true;
    state.isPaused = false;
    state.isGameOver = false;
    state.lastTime = 0;
    state.lastSpawn = 0;
    state.lastTickSoundSec = 0;

    // Initial batch of balloons
    for (let i = 0; i < 4; i++) {
      spawnBalloon();
    }

    updateUI();

    if (startOverlay) startOverlay.style.display = 'none';
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    if (gameoverOverlay) gameoverOverlay.style.display = 'none';

    getAudioContext();
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
    state.lastTime = performance.now();
    if (pauseOverlay) pauseOverlay.style.display = 'none';
  }

  async function triggerGameOver() {
    state.isPlaying = false;
    state.isGameOver = true;
    playSfx('gameover');
    haptic([50, 50, 80]);

    const acc = state.totalTaps > 0 ? Math.round((state.balloonsPopped / state.totalTaps) * 100) : 100;

    if (goFinalScore) goFinalScore.textContent = state.score.toLocaleString();
    if (goFinalPopped) goFinalPopped.textContent = state.balloonsPopped;
    if (goFinalAccuracy) goFinalAccuracy.textContent = `${acc}%`;
    if (goHighScore) goHighScore.textContent = state.highScore.toLocaleString();

    const isNewHigh = state.score > 0 && state.score >= state.highScore;
    if (goNewRecordBadge) goNewRecordBadge.style.display = isNewHigh ? 'inline-block' : 'none';

    if (gameoverPlayerInput) gameoverPlayerInput.value = state.playerName;
    if (gameoverOverlay) gameoverOverlay.style.display = 'flex';

    if (state.score > 0) {
      await syncScoreToSupabase(state.score, state.balloonsPopped, acc, state.maxCombo);
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
        const rows = await supabaseRequest('balloon_leaderboard?select=player_name,high_score,balloons_popped,accuracy,max_combo,created_at&order=high_score.desc&limit=5');
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
        console.warn('[Balloon Supabase] Fetch error:', err);
      }
    }

    if (leaderboardBadge) {
      leaderboardBadge.textContent = '⚪ Offline';
      leaderboardBadge.className = 'badge';
    }
    renderLeaderboard([]);
  }

  async function syncScoreToSupabase(score, popped, accuracy, maxCombo) {
    if (score <= 0 || state.isSyncingScore) return;
    state.isSyncingScore = true;

    if (gameoverPlayerInput && gameoverPlayerInput.value.trim()) {
      setPlayerName(gameoverPlayerInput.value.trim());
    }

    const playerName = state.playerName || 'Player';

    if (typeof supabaseRequest === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      try {
        const existing = await supabaseRequest(
          `balloon_leaderboard?select=id,high_score&player_name=eq.${encodeURIComponent(playerName)}&limit=1`
        );

        if (existing && existing.length > 0) {
          if (score > existing[0].high_score) {
            await supabaseRequest(`balloon_leaderboard?id=eq.${existing[0].id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                high_score: score,
                balloons_popped: popped,
                accuracy: accuracy,
                max_combo: maxCombo,
                updated_at: new Date().toISOString()
              })
            });
          }
        } else {
          await supabaseRequest('balloon_leaderboard', {
            method: 'POST',
            body: JSON.stringify([{
              player_name: playerName,
              high_score: score,
              balloons_popped: popped,
              accuracy: accuracy,
              max_combo: maxCombo
            }])
          });
        }
      } catch (err) {
        console.warn('[Balloon Supabase] Sync error:', err);
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
                <span class="leaderboard-meta">🎈 ${item.balloons_popped || 0} Popped • ${item.accuracy || 100}% Acc</span>
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

  // --- Touch & Mouse Events ---
  function setupInteraction() {
    if (!canvas) return;

    // Direct click handler
    canvas.addEventListener('mousedown', (e) => {
      handleCanvasTap(e.clientX, e.clientY);
    });

    // Touch handler
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handleCanvasTap(t.clientX, t.clientY);
      }
    }, { passive: false });

    // Window resize
    window.addEventListener('resize', resizeCanvas);
  }

  function setupButtons() {
    const startBtn = document.getElementById('btn-start-game');
    const pauseBtn = document.getElementById('btn-pause-game');
    const resumeBtn = document.getElementById('btn-resume-game');
    const playAgainBtn = document.getElementById('btn-play-again');

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
    if (playAgainBtn) playAgainBtn.addEventListener('click', startGame);

    if (changePlayerBtn) changePlayerBtn.addEventListener('click', promptChangePlayerName);
    if (btnModalChangeTag) btnModalChangeTag.addEventListener('click', () => {
      if (mobileLeaderboardModal) mobileLeaderboardModal.classList.remove('active');
      promptChangePlayerName();
    });

    // Space to pause
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
      }
    });

    // Modal Toggles
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
        soundBtn.style.color = soundMuted ? '#94a3b8' : '#ec4899';
      };
      updateSoundIcon();

      soundBtn.addEventListener('click', () => {
        soundMuted = !soundMuted;
        localStorage.setItem('pulari_balloon_muted', soundMuted ? 'true' : 'false');
        updateSoundIcon();
        if (!soundMuted) playSfx('pop');
        haptic(15);
      });
    }
  }

  // --- Initialization ---
  function init() {
    resizeCanvas();
    setPlayerName(state.playerName);
    updateUI();
    fetchTop5Leaderboard();
    setupInteraction();
    setupButtons();

    gameLoop(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
