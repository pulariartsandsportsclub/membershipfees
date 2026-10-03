/**
 * Pulari Arts & Sports Club – Neon Chrome Dino Runner Arcade
 * 60FPS Parallax Runner, Jump & Duck Physics, Day/Night Cycle, Web Audio Chimes & Supabase Live Top-5 Leaderboard (js/dino-game.js)
 */

(function () {
  'use strict';

  // --- Web Audio Synthesizer ---
  let audioCtx = null;
  let soundMuted = localStorage.getItem('pulari_dino_muted') === 'true';

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

      if (type === 'jump') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'milestone') {
        // Classic high-pitch Chrome Dino milestone beep
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'square';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc1.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);
      } else if (type === 'dodge') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(554, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'gameover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('[Dino Audio Error]', e);
    }
  }

  function haptic(ms = 15) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) { }
    }
  }

  // --- Constants & Physics Settings ---
  const GRAVITY = 0.65;
  const JUMP_FORCE = -11.8;
  const FAST_DROP_FORCE = 1.1;
  const BASE_SPEED = 6.2;
  const MAX_SPEED = 14.5;
  const SPEED_ACCEL = 0.0015;

  // Game State
  const state = {
    playerName: localStorage.getItem('pulari_player_name') || 'Player',
    score: 0,
    highScore: 0,
    distanceMeters: 0,
    cactiDodged: 0,
    speed: BASE_SPEED,
    lastMilestone: 0,

    isPlaying: false,
    isGameOver: false,
    isPaused: false,
    isSyncingScore: false,

    // Dino Physics & State
    dino: {
      x: 55,
      y: 0,
      baseY: 0,
      width: 42,
      height: 46,
      vy: 0,
      isGrounded: true,
      isDucking: false,
      stepTimer: 0,
      stepIndex: 0
    },

    // Parallax & Environment
    groundOffset: 0,
    clouds: [],
    obstacles: [],
    particles: [],
    popups: [],
    nextObstacleDist: 90
  };

  // DOM Elements
  let canvas, ctx;
  let scoreEl, mScoreEl, highScoreEl, mHighEl, distEl, mDistEl, dodgedEl, mDodgedEl;
  let startOverlay, gameoverOverlay, goTitle, goFinalScore, goFinalDist, goFinalDodged, goHighScore, goNewRecordBadge, goSyncStatus;
  let currentPlayerNameEl, changePlayerBtn, startPlayerInput, gameoverPlayerInput;
  let btnStartGame, btnPlayAgain, btnResubmitScore, btnRestartGame, mBtnRestartGame;
  let leaderboardListEl, modalLeaderboardListEl, leaderboardBadge;
  let btnOpenLeaderboardModal, btnCloseLeaderboardModal, mobileLeaderboardModal, btnModalChangeTag, soundBtn;

  function refreshElements() {
    canvas = document.getElementById('dino-canvas');
    ctx = canvas ? canvas.getContext('2d') : null;

    scoreEl = document.getElementById('dino-score');
    mScoreEl = document.getElementById('m-dino-score');
    highScoreEl = document.getElementById('dino-highscore');
    mHighEl = document.getElementById('m-dino-highscore');
    distEl = document.getElementById('dino-dist');
    mDistEl = document.getElementById('m-dino-dist');
    dodgedEl = document.getElementById('dino-dodged');
    mDodgedEl = document.getElementById('m-dino-dodged');

    startOverlay = document.getElementById('dino-start-overlay');
    gameoverOverlay = document.getElementById('dino-gameover-overlay');
    goTitle = document.getElementById('go-title');
    goFinalScore = document.getElementById('go-final-score');
    goFinalDist = document.getElementById('go-final-dist');
    goFinalDodged = document.getElementById('go-final-dodged');
    goHighScore = document.getElementById('go-highscore');
    goNewRecordBadge = document.getElementById('go-new-record');
    goSyncStatus = document.getElementById('go-sync-status');

    currentPlayerNameEl = document.getElementById('current-player-name');
    changePlayerBtn = document.getElementById('btn-change-player');
    startPlayerInput = document.getElementById('start-player-name');
    gameoverPlayerInput = document.getElementById('gameover-player-name');

    btnStartGame = document.getElementById('btn-start-game');
    btnPlayAgain = document.getElementById('btn-play-again');
    btnResubmitScore = document.getElementById('btn-resubmit-score');
    btnRestartGame = document.getElementById('btn-restart-game');
    mBtnRestartGame = document.getElementById('m-btn-restart-game');

    leaderboardListEl = document.getElementById('dino-leaderboard-list');
    modalLeaderboardListEl = document.getElementById('modal-leaderboard-list');
    leaderboardBadge = document.getElementById('leaderboard-badge');

    btnOpenLeaderboardModal = document.getElementById('btn-open-leaderboard-modal');
    btnCloseLeaderboardModal = document.getElementById('btn-close-leaderboard-modal');
    mobileLeaderboardModal = document.getElementById('mobile-leaderboard-modal');
    btnModalChangeTag = document.getElementById('btn-modal-change-tag');
    soundBtn = document.getElementById('btn-sound-toggle');
  }

  // --- Canvas Sizing & Positioning ---
  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const groundY = rect.height - 40;
    state.dino.baseY = groundY - state.dino.height;
    if (state.dino.isGrounded) {
      state.dino.y = state.dino.baseY;
    }
  }

  // --- Cloud & Obstacle Generation ---
  function spawnCloud(canvasWidth) {
    state.clouds.push({
      x: canvasWidth + Math.random() * 80,
      y: 35 + Math.random() * 85,
      speed: 0.8 + Math.random() * 0.7,
      scale: 0.7 + Math.random() * 0.6
    });
  }

  function spawnObstacle(canvasWidth) {
    const types = ['cactus_small', 'cactus_double', 'cactus_large', 'cactus_triple'];
    // Introduce flying pterodactyls after distance > 300
    if (state.distanceMeters > 300 && Math.random() < 0.35) {
      types.push('bird_high', 'bird_low');
    }

    const type = types[Math.floor(Math.random() * types.length)];
    let width = 24;
    let height = 44;
    let y = state.dino.baseY;

    if (type === 'cactus_small') {
      width = 20;
      height = 36;
      y = state.dino.baseY + 10;
    } else if (type === 'cactus_double') {
      width = 38;
      height = 38;
      y = state.dino.baseY + 8;
    } else if (type === 'cactus_large') {
      width = 28;
      height = 48;
      y = state.dino.baseY - 2;
    } else if (type === 'cactus_triple') {
      width = 52;
      height = 42;
      y = state.dino.baseY + 4;
    } else if (type === 'bird_high') {
      width = 40;
      height = 30;
      y = state.dino.baseY - 26; // Must duck or stand underneath
    } else if (type === 'bird_low') {
      width = 40;
      height = 30;
      y = state.dino.baseY + 8; // Must jump over
    }

    state.obstacles.push({
      type,
      x: canvasWidth + 30,
      y,
      width,
      height,
      passed: false,
      wingTimer: 0,
      wingFrame: 0
    });

    // Random spacing for next obstacle
    state.nextObstacleDist = 180 + Math.random() * 160 + (MAX_SPEED - state.speed) * 15;
  }

  // --- Particles & Popups ---
  function createDustParticles(x, y, count = 6, color = '#34d399') {
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + Math.random() * 6,
        vx: -state.speed * 0.4 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2 - 0.5,
        size: Math.random() * 3 + 2,
        color,
        alpha: 0.8
      });
    }
  }

  function addPopup(text, x, y, color = '#fbbf24') {
    state.popups.push({
      text,
      x,
      y,
      vy: -1.2,
      alpha: 1,
      color
    });
  }

  // --- Dino Actions ---
  function jump() {
    if (!state.isPlaying || state.isGameOver || state.isPaused) return;
    if (state.dino.isGrounded) {
      state.dino.vy = JUMP_FORCE;
      state.dino.isGrounded = false;
      playSfx('jump');
      haptic(16);
      createDustParticles(state.dino.x + 10, state.dino.baseY + state.dino.height, 8);
    }
  }

  function setDuck(isDucking) {
    if (!state.isPlaying || state.isGameOver) return;
    state.dino.isDucking = isDucking;

    // Fast-drop downwards if ducking in mid-air
    if (isDucking && !state.dino.isGrounded) {
      state.dino.vy += FAST_DROP_FORCE * 3;
    }
  }

  // --- Physics & Collision Engine ---
  function updatePhysics(rect) {
    if (!state.isPlaying || state.isGameOver || state.isPaused) return;

    const dino = state.dino;

    // 1. Accelerate speed gradually
    if (state.speed < MAX_SPEED) {
      state.speed += SPEED_ACCEL;
    }

    // 2. Update distance & score
    state.distanceMeters += Math.round(state.speed * 0.08);
    state.score += Math.round(state.speed * 0.12);

    // 100-meter milestone chimes
    const currentMilestone = Math.floor(state.score / 100);
    if (currentMilestone > state.lastMilestone) {
      state.lastMilestone = currentMilestone;
      playSfx('milestone');
      addPopup('⚡ +100', dino.x + 30, dino.y - 15, '#38bdf8');
      haptic([30, 40, 30]);
    }

    // 3. Dino Jump Physics
    if (!dino.isGrounded) {
      dino.vy += GRAVITY;
      dino.y += dino.vy;

      if (dino.y >= dino.baseY) {
        dino.y = dino.baseY;
        dino.vy = 0;
        dino.isGrounded = true;
        createDustParticles(dino.x + 10, dino.baseY + dino.height, 6);
      }
    } else {
      // Step running animation timer
      dino.stepTimer += state.speed * 0.05;
      if (dino.stepTimer > 1) {
        dino.stepTimer = 0;
        dino.stepIndex = (dino.stepIndex + 1) % 2;
      }
    }

    // 4. Ground Scrolling
    state.groundOffset = (state.groundOffset + state.speed) % 30;

    // 5. Update Clouds
    if (Math.random() < 0.008 && state.clouds.length < 5) {
      spawnCloud(rect.width);
    }
    for (let i = state.clouds.length - 1; i >= 0; i--) {
      const c = state.clouds[i];
      c.x -= c.speed;
      if (c.x < -100) state.clouds.splice(i, 1);
    }

    // 6. Spawn & Update Obstacles
    const lastObs = state.obstacles[state.obstacles.length - 1];
    const canSpawn = !lastObs || (rect.width - lastObs.x) >= state.nextObstacleDist;
    if (canSpawn) {
      spawnObstacle(rect.width);
    }

    // Hitbox calculation for Dino (Ducking reduces height)
    const dinoHitbox = {
      x: dino.x + 8,
      y: dino.isDucking ? dino.baseY + 20 : dino.y + 6,
      width: dino.isDucking ? 46 : dino.width - 14,
      height: dino.isDucking ? 24 : dino.height - 8
    };

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.x -= state.speed;

      // Animate bird flapping
      if (obs.type.startsWith('bird')) {
        obs.wingTimer += 0.15;
        if (obs.wingTimer > 1) {
          obs.wingTimer = 0;
          obs.wingFrame = (obs.wingFrame + 1) % 2;
        }
      }

      // Check if dodged
      if (!obs.passed && obs.x + obs.width < dino.x) {
        obs.passed = true;
        state.cactiDodged++;
        state.score += 50;
        playSfx('dodge');
      }

      // Precise AABB Collision
      const obsHitbox = {
        x: obs.x + 4,
        y: obs.y + 4,
        width: obs.width - 8,
        height: obs.height - 6
      };

      const hasCollided = (
        dinoHitbox.x < obsHitbox.x + obsHitbox.width &&
        dinoHitbox.x + dinoHitbox.width > obsHitbox.x &&
        dinoHitbox.y < obsHitbox.y + obsHitbox.height &&
        dinoHitbox.y + dinoHitbox.height > obsHitbox.y
      );

      if (hasCollided) {
        triggerGameOver(false);
        return;
      }

      // Remove offscreen
      if (obs.x < -80) {
        state.obstacles.splice(i, 1);
      }
    }

    // 7. Update Particles & Popups
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pop = state.popups[i];
      pop.y += pop.vy;
      pop.alpha -= 0.02;
      if (pop.alpha <= 0) state.popups.splice(i, 1);
    }

    updateUI();
  }

  // --- Rendering Pipeline ---
  function draw(rect) {
    if (!ctx) return;
    ctx.clearRect(0, 0, rect.width, rect.height);

    const groundY = rect.height - 40;

    // 1. Parallax Clouds
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    state.clouds.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 14 * c.scale, 0, Math.PI * 2);
      ctx.arc(c.x + 14 * c.scale, c.y - 6 * c.scale, 18 * c.scale, 0, Math.PI * 2);
      ctx.arc(c.x + 30 * c.scale, c.y, 14 * c.scale, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 2. Ground Line with Dashes & Desert Bumps
    ctx.save();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(rect.width, groundY);
    ctx.stroke();

    // Moving ground specks
    ctx.fillStyle = 'rgba(52, 211, 153, 0.4)';
    for (let x = -state.groundOffset; x < rect.width; x += 32) {
      ctx.fillRect(x, groundY + 6, 6, 2);
      ctx.fillRect(x + 14, groundY + 14, 4, 2);
    }
    ctx.restore();

    // 3. Draw Obstacles (Cacti & Birds)
    state.obstacles.forEach(obs => {
      ctx.save();
      if (obs.type.startsWith('bird')) {
        // Neon Flying Pterodactyl
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 10;

        const wingOffset = obs.wingFrame === 0 ? -8 : 6;
        ctx.beginPath();
        // Body & Beak
        ctx.moveTo(obs.x + 10, obs.y + 12);
        ctx.lineTo(obs.x + 34, obs.y + 14);
        ctx.lineTo(obs.x + 40, obs.y + 10);
        ctx.lineTo(obs.x + 32, obs.y + 18);
        ctx.lineTo(obs.x + 8, obs.y + 16);
        ctx.closePath();
        ctx.fill();

        // Wings
        ctx.beginPath();
        ctx.moveTo(obs.x + 18, obs.y + 14);
        ctx.lineTo(obs.x + 24, obs.y + 14 + wingOffset);
        ctx.lineTo(obs.x + 28, obs.y + 14);
        ctx.fill();
      } else {
        // Neon Glowing Green Cactus
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.7)';
        ctx.shadowBlur = 10;

        if (obs.type === 'cactus_small' || obs.type === 'cactus_large') {
          // Single Main Trunk
          ctx.beginPath();
          ctx.roundRect(obs.x + 6, obs.y, obs.width - 12, obs.height, 4);
          ctx.fill();
          // Left arm
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y + 10, 8, obs.height * 0.45, 3);
          ctx.roundRect(obs.x, obs.y + 10, 14, 6, 2);
          ctx.fill();
          // Right arm
          ctx.beginPath();
          ctx.roundRect(obs.x + obs.width - 8, obs.y + 14, 8, obs.height * 0.4, 3);
          ctx.roundRect(obs.x + obs.width - 14, obs.y + 14, 14, 6, 2);
          ctx.fill();
        } else {
          // Double / Triple Cactus Cluster
          const colCount = obs.type === 'cactus_triple' ? 3 : 2;
          const colW = (obs.width - 4) / colCount;
          for (let c = 0; c < colCount; c++) {
            const h = obs.height - (c % 2) * 6;
            ctx.beginPath();
            ctx.roundRect(obs.x + c * colW, obs.y + (obs.height - h), colW - 3, h, 3);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    });

    // 4. Draw Neon Dino (T-Rex)
    const dino = state.dino;
    ctx.save();
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = 'rgba(52, 211, 153, 0.8)';
    ctx.shadowBlur = 12;

    if (dino.isDucking) {
      // Ducking Dino (Crawling/Low Profile)
      const dY = dino.baseY + 20;
      // Head & Snout
      ctx.beginPath();
      ctx.roundRect(dino.x + 26, dY + 2, 24, 14, 3);
      ctx.fill();
      // Body
      ctx.beginPath();
      ctx.roundRect(dino.x, dY + 6, 32, 16, 4);
      ctx.fill();
      // Eye
      ctx.fillStyle = '#050d09';
      ctx.fillRect(dino.x + 40, dY + 5, 4, 4);
      // Legs
      ctx.fillStyle = '#34d399';
      const legX = dino.stepIndex === 0 ? 8 : 18;
      ctx.fillRect(dino.x + legX, dY + 20, 8, 4);
    } else {
      // Standing / Running / Jumping Dino
      const dY = dino.y;

      // Head & Jaw
      ctx.beginPath();
      ctx.roundRect(dino.x + 14, dY, 26, 18, 3);
      ctx.fill();
      // Eye (or XX if Dead)
      ctx.fillStyle = '#050d09';
      if (state.isGameOver) {
        ctx.fillRect(dino.x + 28, dY + 4, 3, 3);
        ctx.fillRect(dino.x + 33, dY + 4, 3, 3);
      } else {
        ctx.fillRect(dino.x + 30, dY + 4, 4, 4);
      }

      // Torso & Body
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.roundRect(dino.x + 6, dY + 16, 22, 20, 3);
      // Tail
      ctx.roundRect(dino.x, dY + 20, 10, 10, 2);
      // Short Arm
      ctx.roundRect(dino.x + 26, dY + 22, 8, 4, 2);
      ctx.fill();

      // Legs Animation
      if (dino.isGrounded) {
        if (dino.stepIndex === 0) {
          ctx.fillRect(dino.x + 10, dY + 36, 5, 10);
          ctx.fillRect(dino.x + 20, dY + 36, 5, 7);
        } else {
          ctx.fillRect(dino.x + 10, dY + 36, 5, 7);
          ctx.fillRect(dino.x + 20, dY + 36, 5, 10);
        }
      } else {
        // Airborne tuck legs
        ctx.fillRect(dino.x + 10, dY + 36, 5, 6);
        ctx.fillRect(dino.x + 18, dY + 36, 5, 6);
      }
    }
    ctx.restore();

    // 5. Draw Particles
    state.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Draw Popups
    state.popups.forEach(pop => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop.alpha);
      ctx.font = '800 1rem Outfit, sans-serif';
      ctx.fillStyle = pop.color;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    });
  }

  // --- Animation Loop ---
  function gameLoop() {
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      updatePhysics(rect);
      draw(rect);
    }
    requestAnimationFrame(gameLoop);
  }

  // --- UI Update ---
  function updateUI() {
    const s = state.score.toLocaleString();
    if (scoreEl) scoreEl.textContent = s;
    if (mScoreEl) mScoreEl.textContent = s;

    if (distEl) distEl.textContent = `${state.distanceMeters}m`;
    if (mDistEl) mDistEl.textContent = `${state.distanceMeters}m`;

    if (dodgedEl) dodgedEl.textContent = state.cactiDodged;
    if (mDodgedEl) mDodgedEl.textContent = state.cactiDodged;

    if (state.score > state.highScore) {
      state.highScore = state.score;
    }
    if (highScoreEl) highScoreEl.textContent = state.highScore.toLocaleString();
    if (mHighEl) mHighEl.textContent = state.highScore.toLocaleString();
  }

  // --- Game Lifecycle ---
  function startNewGame() {
    state.score = 0;
    state.distanceMeters = 0;
    state.cactiDodged = 0;
    state.speed = BASE_SPEED;
    state.lastMilestone = 0;
    state.obstacles = [];
    state.clouds = [];
    state.particles = [];
    state.popups = [];
    state.isPlaying = true;
    state.isGameOver = false;

    state.dino.y = state.dino.baseY;
    state.dino.vy = 0;
    state.dino.isGrounded = true;
    state.dino.isDucking = false;

    updateUI();

    if (startOverlay) startOverlay.style.display = 'none';
    if (gameoverOverlay) gameoverOverlay.style.display = 'none';

    getAudioContext();
  }

  function triggerGameOver() {
    state.isPlaying = false;
    state.isGameOver = true;

    playSfx('gameover');
    haptic([60, 40, 80]);

    if (goTitle) {
      goTitle.textContent = 'Game Over!';
      goTitle.style.color = '#ef4444';
    }

    if (goFinalScore) goFinalScore.textContent = state.score.toLocaleString();
    if (goFinalDist) goFinalDist.textContent = `${state.distanceMeters}m`;
    if (goFinalDodged) goFinalDodged.textContent = state.cactiDodged;
    if (goHighScore) goHighScore.textContent = state.highScore.toLocaleString();

    const isNewHigh = state.score > 0 && state.score >= state.highScore;
    if (goNewRecordBadge) goNewRecordBadge.style.display = isNewHigh ? 'inline-block' : 'none';

    if (gameoverPlayerInput) gameoverPlayerInput.value = state.playerName;

    if (goSyncStatus) {
      if (state.score > 0) {
        goSyncStatus.textContent = '⏳ Saving score to database...';
        goSyncStatus.style.color = '#fbbf24';
      } else {
        goSyncStatus.textContent = 'ℹ️ Score is 0 (Run to score points)';
        goSyncStatus.style.color = '#94a3b8';
      }
    }

    if (gameoverOverlay) gameoverOverlay.style.display = 'flex';

    // Auto-update and sync score directly to DB whenever game is over
    if (state.score > 0) {
      syncScoreToSupabase(state.score, state.distanceMeters, state.cactiDodged);
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
    const newName = prompt('Enter your Gamer Tag for Dino Leaderboard:', current);
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
        const rows = await supabaseRequest('dino_leaderboard?select=player_name,high_score,distance_meters,cacti_dodged,created_at&order=high_score.desc&limit=5');
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
        console.warn('[Dino Supabase] Fetch error:', err);
      }
    }

    if (leaderboardBadge) {
      leaderboardBadge.textContent = '⚪ Offline';
      leaderboardBadge.className = 'badge';
    }
    renderLeaderboard([]);
  }

  async function syncScoreToSupabase(score, dist, dodged) {
    if (score <= 0 || state.isSyncingScore) return;
    state.isSyncingScore = true;

    if (gameoverPlayerInput && gameoverPlayerInput.value.trim()) {
      setPlayerName(gameoverPlayerInput.value.trim());
    }

    const playerName = state.playerName || 'Player';

    if (typeof supabaseRequest === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      try {
        const existing = await supabaseRequest(
          `dino_leaderboard?select=id,high_score&player_name=eq.${encodeURIComponent(playerName)}&limit=1`
        );

        if (existing && existing.length > 0) {
          if (score > existing[0].high_score) {
            await supabaseRequest(`dino_leaderboard?id=eq.${existing[0].id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                high_score: score,
                distance_meters: dist,
                cacti_dodged: dodged,
                updated_at: new Date().toISOString()
              })
            });
          }
        } else {
          await supabaseRequest('dino_leaderboard', {
            method: 'POST',
            body: JSON.stringify([{
              player_name: playerName,
              high_score: score,
              distance_meters: dist,
              cacti_dodged: dodged
            }])
          });
        }

        if (goSyncStatus) {
          goSyncStatus.textContent = '🟢 Score Synced to Database!';
          goSyncStatus.style.color = '#10b981';
        }
      } catch (err) {
        console.warn('[Dino Supabase] Sync error:', err);
        if (goSyncStatus) {
          goSyncStatus.textContent = '⚠️ Could not reach database (Offline)';
          goSyncStatus.style.color = '#f87171';
        }
      }
    } else {
      if (goSyncStatus) {
        goSyncStatus.textContent = '⚪ Database offline';
        goSyncStatus.style.color = '#94a3b8';
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
                <span class="leaderboard-meta">🌵 ${item.cacti_dodged || 0} Dodged • 🏃 ${item.distance_meters || 0}m</span>
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
  function setupControls() {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        jump();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setDuck(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setDuck(false);
      }
    });

    // Touch & Swipe on Canvas
    if (canvas) {
      let touchStartY = 0;

      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
          jump();
        }
      }, { passive: false });

      canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const dy = e.touches[0].clientY - touchStartY;
          if (dy > 30) {
            setDuck(true);
          }
        }
      }, { passive: false });

      canvas.addEventListener('touchend', () => {
        setDuck(false);
      });

      canvas.addEventListener('mousedown', () => {
        jump();
      });
    }
  }

  function setupButtons() {
    if (btnStartGame) btnStartGame.addEventListener('click', startNewGame);
    if (btnPlayAgain) btnPlayAgain.addEventListener('click', startNewGame);
    if (btnRestartGame) btnRestartGame.addEventListener('click', startNewGame);
    if (mBtnRestartGame) mBtnRestartGame.addEventListener('click', startNewGame);

    if (btnResubmitScore) {
      btnResubmitScore.addEventListener('click', () => {
        if (gameoverPlayerInput && gameoverPlayerInput.value.trim()) {
          setPlayerName(gameoverPlayerInput.value.trim());
          if (state.score > 0) {
            syncScoreToSupabase(state.score, state.distanceMeters, state.cactiDodged);
          }
        }
      });
    }

    if (changePlayerBtn) changePlayerBtn.addEventListener('click', promptChangePlayerName);
    if (btnModalChangeTag) btnModalChangeTag.addEventListener('click', () => {
      if (mobileLeaderboardModal) mobileLeaderboardModal.classList.remove('active');
      promptChangePlayerName();
    });

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
        localStorage.setItem('pulari_dino_muted', soundMuted ? 'true' : 'false');
        updateSoundIcon();
        if (!soundMuted) playSfx('jump');
        haptic(15);
      });
    }
  }

  // --- Initialization ---
  function init() {
    refreshElements();
    setPlayerName(state.playerName);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    fetchTop5Leaderboard();
    setupControls();
    setupButtons();
    updateUI();
    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
