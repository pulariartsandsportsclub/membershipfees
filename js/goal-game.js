/**
 * Pulari Arts & Sports Club - Penalty Shootout Mini-Game
 * Smart Goalkeeper AI, 5-Save Limit, Supabase Highscore Leaderboard & Web Audio (js/goal-game.js)
 */

(function () {
  // Game State
  const GameState = {
    isOpen: false,
    soundEnabled: true,
    isShooting: false,
    isGameOver: false,
    maxSaves: 5,
    playerName: localStorage.getItem('pulari_player_name') || '',
    score: 0,
    saves: 0,
    streak: 0,
    bestStreakInMatch: 0,
    globalHighScore: 0,
    globalHighScorer: 'Loading...',
    totalShots: 0
  };

  // Zones for shooting and keeper diving
  const ZONES = [
    { id: 'top-left', label: 'Top Left', x: 20, y: 22 },
    { id: 'top-center', label: 'Top Center', x: 50, y: 18 },
    { id: 'top-right', label: 'Top Right', x: 80, y: 22 },
    { id: 'bottom-left', label: 'Bottom Left', x: 22, y: 68 },
    { id: 'bottom-center', label: 'Bottom Center', x: 50, y: 72 },
    { id: 'bottom-right', label: 'Bottom Right', x: 78, y: 68 }
  ];

  // Web Audio Synthesizer (No external audio files needed)
  let audioCtx = null;
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

  function playSound(type) {
    if (!GameState.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'kick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.14);
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'goal') {
        // Whistle
        const whistle = ctx.createOscillator();
        const wGain = ctx.createGain();
        whistle.type = 'triangle';
        whistle.frequency.setValueAtTime(2400, now);
        whistle.frequency.setValueAtTime(2800, now + 0.08);
        whistle.frequency.setValueAtTime(2400, now + 0.16);
        wGain.gain.setValueAtTime(0.3, now);
        wGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        whistle.connect(wGain);
        wGain.connect(ctx.destination);
        whistle.start(now);
        whistle.stop(now + 0.35);

        // Fanfare triad chords
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + 0.1 + i * 0.08);
          gain.gain.setValueAtTime(0.2, now + 0.1 + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + 0.1 + i * 0.08);
          osc.stop(now + 0.9 + i * 0.08);
        });
      } else if (type === 'save') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'gameover') {
        // Referee 3-blast final whistle
        [0, 0.22, 0.44].forEach((offset, idx) => {
          const whistle = ctx.createOscillator();
          const gain = ctx.createGain();
          whistle.type = 'triangle';
          whistle.frequency.setValueAtTime(2200, now + offset);
          gain.gain.setValueAtTime(0.35, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + offset + (idx === 2 ? 0.45 : 0.18));
          whistle.connect(gain);
          gain.connect(ctx.destination);
          whistle.start(now + offset);
          whistle.stop(now + offset + (idx === 2 ? 0.45 : 0.18));
        });
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // DOM Elements
  let modalEl = null;
  let keeperEl = null;
  let ballEl = null;
  let confettiCanvas = null;
  let confettiCtx = null;
  let confettiParticles = [];
  let confettiAnimId = null;

  function initGoalGame() {
    createGameModal();
    attachGlobalTriggers();
    fetchGlobalHighScore();
  }

  function attachGlobalTriggers() {
    const triggerBtn = document.getElementById('btn-open-game');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', openGameModal);
    }
  }

  /**
   * Supabase DB Sync for High Score Leaderboard (Single-row table)
   */
  async function fetchGlobalHighScore() {
    try {
      if (typeof supabaseRequest === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        const rows = await supabaseRequest('goal_highscore?select=*&limit=1');
        if (rows && rows.length > 0) {
          GameState.globalHighScore = Number(rows[0].high_score || 0);
          GameState.globalHighScorer = rows[0].player_name || 'Champion';
          updateScoreboardUI();
        } else {
          await supabaseRequest('goal_highscore', {
            method: 'POST',
            body: JSON.stringify([{ id: 1, player_name: 'Pulari Striker', high_score: 0 }])
          });
          GameState.globalHighScore = 0;
          GameState.globalHighScorer = 'Pulari Striker';
          updateScoreboardUI();
        }
      }
    } catch (err) {
      console.warn('Highscore fetch notice:', err);
    }
  }

  async function syncGlobalHighScoreToDb(score, playerName) {
    try {
      if (typeof supabaseRequest === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        await supabaseRequest('goal_highscore?on_conflict=id', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify([{
            id: 1,
            player_name: playerName || 'Champion',
            high_score: score,
            updated_at: new Date().toISOString()
          }])
        });
        console.log(`🏆 Global Highscore updated: ${score} by ${playerName}`);
      }
    } catch (err) {
      console.warn('Could not update highscore in DB:', err);
    }
  }

  function createGameModal() {
    if (document.getElementById('goal-game-modal')) return;

    const modalHtml = `
      <div class="goal-modal-overlay" id="goal-game-modal">
        <div class="goal-game-container">
          
          <!-- Stadium Header -->
          <div class="goal-game-header">
            <div class="goal-header-title">
              <span class="game-ball-icon">⚽</span>
              <div>
                <h3>Pulari Penalty Shootout</h3>
                <span id="game-player-display">Striker: ${GameState.playerName || 'Guest'}</span>
              </div>
            </div>
            <div class="goal-header-controls">
              <button type="button" class="game-btn-icon" id="game-edit-name-btn" title="Change Player Name">
                ✏️
              </button>
              <button type="button" class="game-btn-icon" id="game-sound-toggle" title="Toggle Sound">
                🔊
              </button>
              <button type="button" class="game-btn-icon game-close-btn" id="game-close-btn" title="Close Game">
                &times;
              </button>
            </div>
          </div>

          <!-- Scoreboard Banner -->
          <div class="goal-scoreboard">
            <div class="score-card">
              <span class="score-label">YOUR GOALS</span>
              <strong class="score-val text-green" id="game-score-goals">0</strong>
            </div>
            <div class="score-card saved-card" title="Maximum 5 saves allowed per match">
              <span class="score-label">SAVED (MAX 5)</span>
              <strong class="score-val text-red" id="game-score-saves">0 / 5</strong>
              <div class="saves-dots-track" id="game-saves-dots">
                <span class="save-dot"></span>
                <span class="save-dot"></span>
                <span class="save-dot"></span>
                <span class="save-dot"></span>
                <span class="save-dot"></span>
              </div>
            </div>
            <div class="score-card highlight">
              <span class="score-label">STREAK</span>
              <strong class="score-val text-amber" id="game-score-streak">🔥 0</strong>
            </div>
            <div class="score-card highscore-card" title="All-time Highest Score">
              <span class="score-label">ALL-TIME HIGH</span>
              <strong class="score-val text-highlight" id="game-score-best">🏆 ${GameState.globalHighScore}</strong>
              <small class="highscore-holder" id="game-highscore-holder">${GameState.globalHighScorer}</small>
            </div>
          </div>

          <!-- Stadium Field & Goal Post View -->
          <div class="goal-pitch" id="goal-pitch">
            
            <!-- Confetti Canvas -->
            <canvas id="goal-confetti-canvas" class="goal-confetti-canvas"></canvas>

            <!-- Stadium Lights -->
            <div class="stadium-lights">
              <div class="stadium-floodlight left"></div>
              <div class="stadium-floodlight right"></div>
            </div>

            <!-- Goal Post Frame with Net -->
            <div class="goal-frame">
              <div class="goal-crossbar"></div>
              <div class="goal-post-left"></div>
              <div class="goal-post-right"></div>
              <div class="goal-net" id="goal-net"></div>

              <!-- Interactive Shooting Target Zones -->
              <div class="goal-targets-grid" id="goal-targets-grid">
                ${ZONES.map(z => `
                  <button type="button" class="goal-target-spot" data-zone="${z.id}" title="Shoot here">
                    <span class="target-crosshair"></span>
                  </button>
                `).join('')}
              </div>

              <!-- Goalkeeper Character -->
              <div class="goalkeeper" id="goalkeeper">
                <div class="keeper-body">
                  <div class="keeper-head">
                    <div class="keeper-hair"></div>
                    <div class="keeper-face">
                      <div class="keeper-eyes"></div>
                    </div>
                  </div>
                  <div class="keeper-torso">
                    <div class="keeper-jersey">1</div>
                  </div>
                  <div class="keeper-arms">
                    <div class="keeper-arm arm-left">
                      <div class="keeper-glove glove-left">🧤</div>
                    </div>
                    <div class="keeper-arm arm-right">
                      <div class="keeper-glove glove-right">🧤</div>
                    </div>
                  </div>
                  <div class="keeper-legs">
                    <div class="keeper-leg leg-left"></div>
                    <div class="keeper-leg leg-right"></div>
                  </div>
                </div>
                <div class="keeper-shadow"></div>
              </div>
            </div>

            <!-- Grass Pitch & Penalty Spot -->
            <div class="pitch-ground">
              <div class="pitch-lines">
                <div class="penalty-box-line"></div>
                <div class="penalty-arc"></div>
              </div>
              <div class="penalty-spot">
                <div class="ball-wrapper" id="game-ball-wrapper">
                  <div class="game-ball" id="game-ball">
                    <div class="ball-pattern"></div>
                  </div>
                  <div class="ball-shadow" id="game-ball-shadow"></div>
                </div>
              </div>
            </div>

            <!-- Outcome Notification Overlay -->
            <div class="goal-banner-overlay" id="game-banner-overlay">
              <div class="goal-banner-content" id="game-banner-content">
                <div class="banner-emoji" id="banner-emoji">⚽</div>
                <h2 class="banner-text" id="banner-text">GOAL!</h2>
                <p class="banner-sub" id="banner-sub">Brilliant strike!</p>
              </div>
            </div>

            <!-- Game Over / Strike Chances Over Overlay -->
            <div class="goal-gameover-overlay" id="game-gameover-overlay">
              <div class="goal-gameover-card">
                <div class="gameover-whistle-icon">🛑⚽</div>
                <h2 class="gameover-title">STRIKE CHANCES OVER!</h2>
                <p class="gameover-desc">The goalkeeper blocked <strong>5 penalties</strong>! Your match has concluded.</p>
                
                <div class="gameover-stats-grid">
                  <div class="gstat-item">
                    <span class="gstat-lbl">Final Goals</span>
                    <strong class="gstat-val text-green" id="gameover-final-goals">0</strong>
                  </div>
                  <div class="gstat-item">
                    <span class="gstat-lbl">Total Shots</span>
                    <strong class="gstat-val" id="gameover-total-shots">0</strong>
                  </div>
                  <div class="gstat-item">
                    <span class="gstat-lbl">Best Streak</span>
                    <strong class="gstat-val text-amber" id="gameover-best-streak">0</strong>
                  </div>
                  <div class="gstat-item">
                    <span class="gstat-lbl">Accuracy</span>
                    <strong class="gstat-val text-highlight" id="gameover-accuracy">0%</strong>
                  </div>
                </div>

                <div class="gameover-highscore-banner" id="gameover-highscore-banner" style="display:none;">
                  🌟 <strong>NEW CLUB RECORD SET!</strong> You are the top striker!
                </div>

                <div class="gameover-actions">
                  <button type="button" class="btn btn-primary btn-play-again" id="btn-play-again">
                    Play Again 🔄
                  </button>
                </div>
              </div>
            </div>

            <!-- In-Game Name Entry Prompt Overlay -->
            <div class="goal-name-overlay ${!GameState.playerName ? 'active' : ''}" id="game-name-overlay">
              <div class="goal-name-card">
                <div class="name-card-icon">⚽⚡</div>
                <h3>Enter Striker Name</h3>
                <p>Your goals and high scores will be broadcasted live on the club leaderboard!</p>
                <form id="game-name-form" class="goal-name-form">
                  <input type="text" id="game-player-input" class="form-control game-input" placeholder="e.g. Muhammed Ali" maxlength="25" required autofocus>
                  <button type="submit" class="btn btn-primary btn-kickoff">Kick Off! 🚀</button>
                </form>
              </div>
            </div>

          </div>

          <!-- Bottom Footer -->
          <div class="goal-game-footer">
            <span class="goal-hint">🎯 Tap any crosshair on the net to shoot! (5 saves max)</span>
            <button type="button" class="btn btn-outline btn-sm" id="btn-reset-game">New Match</button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Cache elements
    modalEl = document.getElementById('goal-game-modal');
    keeperEl = document.getElementById('goalkeeper');
    ballEl = document.getElementById('game-ball-wrapper');
    confettiCanvas = document.getElementById('goal-confetti-canvas');
    if (confettiCanvas) confettiCtx = confettiCanvas.getContext('2d');

    // Attach internal event listeners
    modalEl.querySelector('#game-close-btn').addEventListener('click', closeGameModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeGameModal();
    });

    const soundBtn = modalEl.querySelector('#game-sound-toggle');
    soundBtn.addEventListener('click', () => {
      GameState.soundEnabled = !GameState.soundEnabled;
      soundBtn.textContent = GameState.soundEnabled ? '🔊' : '🔇';
      soundBtn.classList.toggle('muted', !GameState.soundEnabled);
    });

    const editNameBtn = modalEl.querySelector('#game-edit-name-btn');
    if (editNameBtn) {
      editNameBtn.addEventListener('click', () => {
        showNamePrompt();
      });
    }

    modalEl.querySelector('#btn-reset-game').addEventListener('click', resetScoreboard);
    modalEl.querySelector('#btn-play-again').addEventListener('click', resetScoreboard);

    // Name prompt form submit
    const nameForm = modalEl.querySelector('#game-name-form');
    if (nameForm) {
      nameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('game-player-input');
        const val = input ? input.value.trim() : '';
        if (val) {
          GameState.playerName = val;
          localStorage.setItem('pulari_player_name', val);
          hideNamePrompt();
          updateScoreboardUI();
        }
      });
    }

    // Target zones click listeners
    const targetBtns = modalEl.querySelectorAll('.goal-target-spot');
    targetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (GameState.isGameOver) {
          showGameOverScreen();
          return;
        }
        if (!GameState.playerName) {
          showNamePrompt();
          return;
        }
        const zoneId = btn.getAttribute('data-zone');
        takeShot(zoneId, btn);
      });
    });
  }

  function showNamePrompt() {
    const overlay = document.getElementById('game-name-overlay');
    const input = document.getElementById('game-player-input');
    if (overlay) overlay.classList.add('active');
    if (input) {
      input.value = GameState.playerName || '';
      input.focus();
    }
  }

  function hideNamePrompt() {
    const overlay = document.getElementById('game-name-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function openGameModal() {
    if (!modalEl) createGameModal();
    modalEl.classList.add('active');
    GameState.isOpen = true;
    resetPitchState();
    fetchGlobalHighScore();
    updateScoreboardUI();
    getAudioContext();

    if (!GameState.playerName) {
      showNamePrompt();
    } else {
      hideNamePrompt();
    }
  }

  function closeGameModal() {
    if (modalEl) modalEl.classList.remove('active');
    GameState.isOpen = false;
    stopConfetti();
  }

  function resetScoreboard() {
    GameState.score = 0;
    GameState.saves = 0;
    GameState.streak = 0;
    GameState.bestStreakInMatch = 0;
    GameState.totalShots = 0;
    GameState.isGameOver = false;

    const gameoverOverlay = document.getElementById('game-gameover-overlay');
    if (gameoverOverlay) gameoverOverlay.classList.remove('active');

    updateScoreboardUI();
    resetPitchState();
  }

  function updateScoreboardUI() {
    const goalsEl = document.getElementById('game-score-goals');
    const savesEl = document.getElementById('game-score-saves');
    const streakEl = document.getElementById('game-score-streak');
    const bestEl = document.getElementById('game-score-best');
    const holderEl = document.getElementById('game-highscore-holder');
    const playerDisplay = document.getElementById('game-player-display');
    const dotsTrack = document.getElementById('game-saves-dots');

    if (goalsEl) goalsEl.textContent = GameState.score;
    if (savesEl) savesEl.textContent = `${GameState.saves} / ${GameState.maxSaves}`;
    if (streakEl) streakEl.textContent = `🔥 ${GameState.streak}`;
    if (bestEl) bestEl.textContent = `🏆 ${GameState.globalHighScore}`;
    if (holderEl) holderEl.textContent = GameState.globalHighScorer ? `by ${GameState.globalHighScorer}` : '';
    if (playerDisplay) playerDisplay.textContent = `Striker: ${GameState.playerName || 'Guest'}`;

    // Update dots indicator
    if (dotsTrack) {
      const dots = dotsTrack.querySelectorAll('.save-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('filled', idx < GameState.saves);
      });
    }
  }

  function showGameOverScreen() {
    GameState.isGameOver = true;
    playSound('gameover');

    const overlay = document.getElementById('game-gameover-overlay');
    const goalsEl = document.getElementById('gameover-final-goals');
    const shotsEl = document.getElementById('gameover-total-shots');
    const streakEl = document.getElementById('gameover-best-streak');
    const accuracyEl = document.getElementById('gameover-accuracy');
    const hsBanner = document.getElementById('gameover-highscore-banner');

    if (goalsEl) goalsEl.textContent = GameState.score;
    if (shotsEl) shotsEl.textContent = GameState.totalShots;
    if (streakEl) streakEl.textContent = GameState.bestStreakInMatch;
    
    const acc = GameState.totalShots > 0 ? Math.round((GameState.score / GameState.totalShots) * 100) : 0;
    if (accuracyEl) accuracyEl.textContent = `${acc}%`;

    if (hsBanner) {
      const isNewRecord = GameState.score >= GameState.globalHighScore && GameState.score > 0;
      hsBanner.style.display = isNewRecord ? 'block' : 'none';
    }

    if (overlay) overlay.classList.add('active');
  }

  function resetPitchState() {
    GameState.isShooting = false;
    if (keeperEl) {
      keeperEl.className = 'goalkeeper idle';
      keeperEl.style.transform = '';
    }
    if (ballEl) {
      ballEl.className = 'ball-wrapper';
      ballEl.style.transform = '';
      ballEl.style.opacity = '1';
    }
    const netEl = document.getElementById('goal-net');
    if (netEl) netEl.classList.remove('net-bulge');

    const banner = document.getElementById('game-banner-overlay');
    if (banner) banner.classList.remove('show');
  }

  /**
   * Smart Goalkeeper AI
   */
  function determineKeeperDive(playerZoneId) {
    const correctGuessChance = Math.min(0.65, 0.35 + GameState.streak * 0.05);

    if (Math.random() < correctGuessChance) {
      return playerZoneId; // Keeper makes the right guess!
    } else {
      const otherZones = ZONES.filter(z => z.id !== playerZoneId);
      const randomChoice = otherZones[Math.floor(Math.random() * otherZones.length)];
      return randomChoice.id;
    }
  }

  /**
   * Execute Shot Action with Responsive Target Alignment
   */
  function takeShot(zoneId, targetBtnElement) {
    if (GameState.isShooting || GameState.isGameOver) return;
    GameState.isShooting = true;

    const targetZone = ZONES.find(z => z.id === zoneId) || ZONES[0];
    const keeperDiveZoneId = determineKeeperDive(zoneId);
    const isGoal = keeperDiveZoneId !== zoneId;

    // 1. Kick Sound
    playSound('kick');

    // 2. Animate Goalkeeper Dive
    animateKeeperDive(keeperDiveZoneId);

    // 3. Animate Ball Flight Path
    animateBallFlight(targetZone, isGoal, targetBtnElement);

    // 4. Resolve Outcome
    setTimeout(() => {
      resolveOutcome(isGoal, targetZone);
    }, 620);
  }

  function animateKeeperDive(diveZoneId) {
    if (!keeperEl) return;
    keeperEl.className = `goalkeeper diving dive-${diveZoneId}`;
  }

  function animateBallFlight(targetZone, isGoal, targetBtnElement) {
    if (!ballEl) return;
    
    if (targetBtnElement) {
      const ballRect = ballEl.getBoundingClientRect();
      const targetRect = targetBtnElement.getBoundingClientRect();
      
      const deltaX = (targetRect.left + targetRect.width / 2) - (ballRect.left + ballRect.width / 2);
      const deltaY = (targetRect.top + targetRect.height / 2) - (ballRect.top + ballRect.height / 2);
      
      ballEl.style.transition = 'all 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
      ballEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${isGoal ? 0.44 : 0.54}) rotate(720deg)`;
      return;
    }

    const isMobile = window.innerWidth <= 600;
    const factorX = isMobile ? 2.8 : 3.8;
    const factorY = isMobile ? -145 : -180;
    const targetX = (targetZone.x - 50) * factorX;
    const targetY = factorY + (targetZone.y * (isMobile ? 0.9 : 1.2));

    ballEl.style.transition = 'all 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
    ballEl.style.transform = `translate(${targetX}px, ${targetY}px) scale(${isGoal ? 0.44 : 0.54}) rotate(720deg)`;
  }

  function resolveOutcome(isGoal, targetZone) {
    GameState.totalShots++;
    const netEl = document.getElementById('goal-net');
    const banner = document.getElementById('game-banner-overlay');
    const emojiEl = document.getElementById('banner-emoji');
    const textEl = document.getElementById('banner-text');
    const subEl = document.getElementById('banner-sub');

    if (isGoal) {
      // GOAL!
      GameState.score++;
      GameState.streak++;
      if (GameState.streak > GameState.bestStreakInMatch) {
        GameState.bestStreakInMatch = GameState.streak;
      }

      // Check if global highscore is beaten!
      if (GameState.score > GameState.globalHighScore) {
        GameState.globalHighScore = GameState.score;
        GameState.globalHighScorer = GameState.playerName || 'Champion';
        syncGlobalHighScoreToDb(GameState.globalHighScore, GameState.globalHighScorer);
      }

      if (netEl) netEl.classList.add('net-bulge');
      playSound('goal');
      startConfetti();

      if (emojiEl) emojiEl.textContent = '⚽🔥';
      if (textEl) {
        if (GameState.score === GameState.globalHighScore && GameState.score > 1) {
          textEl.textContent = 'NEW HIGH SCORE!';
          textEl.className = 'banner-text text-highscore';
        } else {
          textEl.textContent = 'GOAAAL!';
          textEl.className = 'banner-text text-goal';
        }
      }
      if (subEl) {
        const goalPhrases = [
          'Unstoppable strike into the top corner!',
          'Clean finish past the keeper!',
          'What a world-class goal!',
          'Clinical penalty!',
          'Right into the back of the net!'
        ];
        subEl.textContent = goalPhrases[Math.floor(Math.random() * goalPhrases.length)];
      }

      updateScoreboardUI();
      if (banner) banner.classList.add('show');

      setTimeout(() => {
        resetPitchState();
      }, 1800);

    } else {
      // SAVED!
      GameState.saves++;
      GameState.streak = 0;
      playSound('save');

      if (emojiEl) emojiEl.textContent = '🧤🛑';
      if (textEl) {
        textEl.textContent = 'SAVED!';
        textEl.className = 'banner-text text-save';
      }
      if (subEl) {
        const remaining = GameState.maxSaves - GameState.saves;
        if (remaining > 0) {
          subEl.textContent = `Keeper saved it! (${remaining} strike chance${remaining === 1 ? '' : 's'} remaining)`;
        } else {
          subEl.textContent = `Keeper blocked 5 penalties! Strike chances over.`;
        }
      }

      if (ballEl) {
        ballEl.style.transition = 'transform 0.4s ease-out';
        ballEl.style.transform += ' translate(20px, 30px) scale(0.4)';
      }

      updateScoreboardUI();
      if (banner) banner.classList.add('show');

      // Check if 5 saves limit reached
      if (GameState.saves >= GameState.maxSaves) {
        setTimeout(() => {
          resetPitchState();
          showGameOverScreen();
        }, 1500);
      } else {
        setTimeout(() => {
          resetPitchState();
        }, 1800);
      }
    }
  }

  // Confetti Physics
  function startConfetti() {
    if (!confettiCanvas || !confettiCtx) return;
    confettiCanvas.width = confettiCanvas.parentElement.clientWidth;
    confettiCanvas.height = confettiCanvas.parentElement.clientHeight;

    confettiParticles = [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ffffff', '#e11d48'];

    for (let i = 0; i < 70; i++) {
      confettiParticles.push({
        x: confettiCanvas.width * (0.2 + Math.random() * 0.6),
        y: confettiCanvas.height * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    animateConfetti();
  }

  function animateConfetti() {
    if (!confettiCtx || confettiParticles.length === 0) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.vx *= 0.98;
      p.rotation += p.rSpeed;
      p.opacity -= 0.012;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.globalAlpha = Math.max(0, p.opacity);
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    });

    confettiParticles = confettiParticles.filter(p => p.opacity > 0 && p.y < confettiCanvas.height);

    if (confettiParticles.length > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  function stopConfetti() {
    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    if (confettiCtx && confettiCanvas) {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
    confettiParticles = [];
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoalGame);
  } else {
    initGoalGame();
  }

  window.openGoalGame = openGameModal;
})();
