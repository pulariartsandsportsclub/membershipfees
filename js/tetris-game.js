/**
 * Pulari Arts & Sports Club - Tetris Arcade Mini-Game
 * Mobile-First Ergonomic UI, Touch Haptic Feedback, Turbo DAS Repeat,
 * Supabase Live Top-5 Leaderboard, Authentic SRS Rotation, 7-Bag Randomizer (js/tetris-game.js)
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const COLS = 10;
  const ROWS = 20;
  const LOGICAL_WIDTH = 300;
  const LOGICAL_HEIGHT = 600;
  const BLOCK_SIZE = 30;

  // Neon Cyberpunk Tetromino Colors
  const COLORS = {
    I: { main: '#06b6d4', glow: 'rgba(6, 182, 212, 0.6)', light: '#67e8f9', dark: '#0e7490' },
    J: { main: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)', light: '#93c5fd', dark: '#1d4ed8' },
    L: { main: '#f97316', glow: 'rgba(249, 115, 22, 0.6)', light: '#fdba74', dark: '#c2410c' },
    O: { main: '#eab308', glow: 'rgba(234, 179, 8, 0.6)', light: '#fef08a', dark: '#a16207' },
    S: { main: '#10b981', glow: 'rgba(16, 185, 129, 0.6)', light: '#6ee7b7', dark: '#047857' },
    T: { main: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)', light: '#d8b4fe', dark: '#7e22ce' },
    Z: { main: '#ef4444', glow: 'rgba(239, 68, 68, 0.6)', light: '#fca5a5', dark: '#b91c1c' }
  };

  // Tetromino Matrix Shapes (0 degree default orientation)
  const TETROMINOES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    O: [
      [1, 1],
      [1, 1]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  };

  // Standard SRS Wall Kick Data
  const JLSTZ_KICKS = {
    '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };

  const I_KICKS = {
    '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };

  // Drop Speeds by level (ms per step)
  function getDropSpeed(level) {
    const speeds = [
      800, 715, 630, 550, 470, 390, 310, 240, 180, 130,
      100, 80, 65, 50, 40, 30
    ];
    return speeds[Math.min(level - 1, speeds.length - 1)] || 30;
  }

  // --- Haptic Feedback ---
  function haptic(ms) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) { }
    }
  }

  // --- Web Audio Synthesizer ---
  let audioCtx = null;
  let soundMuted = localStorage.getItem('pulari_tetris_muted') === 'true';

  function getAudioCtx() {
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
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'move') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'rotate') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'soft_drop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'hard_drop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'hold') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(390, now + 0.04);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'clear1' || type === 'clear2' || type === 'clear3') {
        const freqs = type === 'clear1' ? [523, 659] : type === 'clear2' ? [523, 659, 784] : [523, 659, 784, 1046];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.18, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.18);
        });
      } else if (type === 'tetris') {
        const chord = [523, 659, 784, 1046, 1318];
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(0.22, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.35);
        });
      } else if (type === 'levelup') {
        const melody = [523, 659, 784, 1046];
        melody.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          gain.gain.setValueAtTime(0.1, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.12);
        });
      } else if (type === 'gameover') {
        const tones = [466, 440, 415, 370];
        tones.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.14);
          gain.gain.setValueAtTime(0.15, now + i * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.14);
          osc.stop(now + i * 0.14 + 0.25);
        });
      }
    } catch (e) { }
  }

  // --- Game State Object ---
  const state = {
    playerName: localStorage.getItem('pulari_player_name') || 'Player',
    grid: createGrid(),
    currentPiece: null,
    currentPos: { x: 0, y: 0 },
    currentRotation: 0,
    heldPiece: null,
    canHold: true,
    bag: [],
    nextQueue: [],
    score: 0,
    lines: 0,
    level: 1,
    highScore: 0,
    combo: -1,
    backToBack: false,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    dropTimer: 0,
    lastTime: 0,
    lockDelay: 500,
    lockTimer: 0,
    isLocking: false,
    lockMoves: 0,
    maxLockMoves: 15,
    clearingRows: [],
    clearAnimationProgress: 0,
    isSyncingScore: false
  };

  // Particles & Animations
  let particles = [];
  let animFrameId = null;

  // DOM Elements
  const canvas = document.getElementById('tetris-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const fxCanvas = document.getElementById('fx-canvas');
  const fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;

  const holdCanvas = document.getElementById('hold-canvas');
  const holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;
  const mHoldCanvas = document.getElementById('m-hold-canvas');
  const mHoldCtx = mHoldCanvas ? mHoldCanvas.getContext('2d') : null;

  const nextCanvases = [
    document.getElementById('next-canvas-1'),
    document.getElementById('next-canvas-2'),
    document.getElementById('next-canvas-3')
  ];
  const nextContexts = nextCanvases.map(c => c ? c.getContext('2d') : null);
  const mNextCanvas = document.getElementById('m-next-canvas');
  const mNextCtx = mNextCanvas ? mNextCanvas.getContext('2d') : null;

  // Stats Elements
  const scoreEl = document.getElementById('score-val');
  const mScoreEl = document.getElementById('m-score-val');
  const highScoreEl = document.getElementById('high-score-val');
  const mHighEl = document.getElementById('m-high-val');
  const linesEl = document.getElementById('lines-val');
  const mLinesEl = document.getElementById('m-lines-val');
  const levelEl = document.getElementById('level-val');
  const mLevelEl = document.getElementById('m-level-val');
  const bannerEl = document.getElementById('tetris-banner');
  const boardFrameEl = document.getElementById('tetris-board-frame');
  const currentPlayerNameEl = document.getElementById('current-player-name');
  const startPlayerInput = document.getElementById('start-player-input');
  const gameoverPlayerInput = document.getElementById('gameover-player-input');
  const changePlayerBtn = document.getElementById('btn-change-player');
  const leaderboardListEl = document.getElementById('tetris-leaderboard-list');
  const modalLeaderboardListEl = document.getElementById('modal-leaderboard-list');
  const leaderboardBadge = document.getElementById('leaderboard-badge');

  // Overlays & Modal
  const overlayStart = document.getElementById('overlay-start');
  const overlayPause = document.getElementById('overlay-pause');
  const overlayGameOver = document.getElementById('overlay-gameover');
  const goFinalScore = document.getElementById('go-final-score');
  const goFinalLines = document.getElementById('go-final-lines');
  const goFinalLevel = document.getElementById('go-final-level');
  const goHighScore = document.getElementById('go-high-score');
  const newHighBadgeContainer = document.getElementById('new-high-badge-container');
  const soundBtn = document.getElementById('btn-sound-toggle');
  const mobileLeaderboardModal = document.getElementById('mobile-leaderboard-modal');
  const btnOpenLeaderboardModal = document.getElementById('btn-open-leaderboard-modal');
  const btnCloseLeaderboardModal = document.getElementById('btn-close-leaderboard-modal');
  const btnModalChangeTag = document.getElementById('btn-modal-change-tag');

  function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  // --- 7-Bag Random Generator ---
  function refillBag() {
    const pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    state.bag.push(...pieces);
  }

  function getNextPieceFromQueue() {
    while (state.bag.length < 7) {
      refillBag();
    }
    while (state.nextQueue.length < 4) {
      state.nextQueue.push(state.bag.shift());
    }
    return state.nextQueue.shift();
  }

  // --- Matrix Operations ---
  function rotateMatrix(matrix, dir) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (dir > 0) {
          result[x][N - 1 - y] = matrix[y][x];
        } else {
          result[N - 1 - x][y] = matrix[y][x];
        }
      }
    }
    return result;
  }

  function getMatrixForPiece(type, rotation = 0) {
    let mat = TETROMINOES[type];
    for (let i = 0; i < (rotation % 4 + 4) % 4; i++) {
      mat = rotateMatrix(mat, 1);
    }
    return mat;
  }

  // --- Collision Detection ---
  function checkCollision(pieceType, matrix, pos) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          const boardX = pos.x + x;
          const boardY = pos.y + y;

          if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
            return true;
          }
          if (boardY >= 0 && state.grid[boardY][boardX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // --- Ghost Piece Projection ---
  function getGhostPosition() {
    if (!state.currentPiece) return state.currentPos;
    const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
    let ghostY = state.currentPos.y;
    while (!checkCollision(state.currentPiece, mat, { x: state.currentPos.x, y: ghostY + 1 })) {
      ghostY++;
    }
    return { x: state.currentPos.x, y: ghostY };
  }

  // --- Spawning Pieces ---
  function spawnPiece() {
    const type = getNextPieceFromQueue();
    state.currentPiece = type;
    state.currentRotation = 0;
    const mat = getMatrixForPiece(type, 0);

    state.currentPos = {
      x: Math.floor((COLS - mat.length) / 2),
      y: type === 'I' ? -1 : 0
    };

    state.canHold = true;
    state.isLocking = false;
    state.lockTimer = 0;
    state.lockMoves = 0;

    if (checkCollision(state.currentPiece, mat, state.currentPos)) {
      triggerGameOver();
    }

    renderHoldPreview();
    renderNextPreviews();
  }

  // --- Piece Movement & Rotation ---
  function moveLeft() {
    if (!state.isPlaying || state.isPaused || state.isGameOver) return;
    const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
    const newPos = { x: state.currentPos.x - 1, y: state.currentPos.y };
    if (!checkCollision(state.currentPiece, mat, newPos)) {
      state.currentPos = newPos;
      onPieceAdjusted();
      playSfx('move');
      haptic(10);
    }
  }

  function moveRight() {
    if (!state.isPlaying || state.isPaused || state.isGameOver) return;
    const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
    const newPos = { x: state.currentPos.x + 1, y: state.currentPos.y };
    if (!checkCollision(state.currentPiece, mat, newPos)) {
      state.currentPos = newPos;
      onPieceAdjusted();
      playSfx('move');
      haptic(10);
    }
  }

  function softDrop() {
    if (!state.isPlaying || state.isPaused || state.isGameOver) return;
    const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
    const newPos = { x: state.currentPos.x, y: state.currentPos.y + 1 };
    if (!checkCollision(state.currentPiece, mat, newPos)) {
      state.currentPos = newPos;
      state.score += 1;
      updateScoreUI();
      playSfx('soft_drop');
      haptic(8);
      state.dropTimer = 0;
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!state.isPlaying || state.isPaused || state.isGameOver) return;
    const ghost = getGhostPosition();
    const dropDistance = ghost.y - state.currentPos.y;
    state.currentPos = ghost;
    state.score += dropDistance * 2;
    updateScoreUI();
    playSfx('hard_drop');
    haptic(45);
    triggerScreenShake();
    createHardDropSparks(ghost);
    lockPiece();
  }

  function rotatePiece(direction) {
    if (!state.isPlaying || state.isPaused || state.isGameOver) return;
    if (state.currentPiece === 'O') return;

    const fromRot = state.currentRotation;
    const toRot = (fromRot + direction + 4) % 4;
    const targetMat = getMatrixForPiece(state.currentPiece, toRot);

    const kickTable = state.currentPiece === 'I' ? I_KICKS : JLSTZ_KICKS;
    const kickKey = `${fromRot}->${toRot}`;
    const kicks = kickTable[kickKey] || [[0, 0]];

    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i];
      const testPos = {
        x: state.currentPos.x + kx,
        y: state.currentPos.y - ky
      };

      if (!checkCollision(state.currentPiece, targetMat, testPos)) {
        state.currentRotation = toRot;
        state.currentPos = testPos;
        onPieceAdjusted();
        playSfx('rotate');
        haptic(15);
        return;
      }
    }
  }

  function holdPiece() {
    if (!state.isPlaying || state.isPaused || state.isGameOver || !state.canHold) return;

    playSfx('hold');
    haptic(20);
    const prevHeld = state.heldPiece;
    state.heldPiece = state.currentPiece;
    state.canHold = false;

    if (prevHeld) {
      state.currentPiece = prevHeld;
      state.currentRotation = 0;
      const mat = getMatrixForPiece(state.currentPiece, 0);
      state.currentPos = {
        x: Math.floor((COLS - mat.length) / 2),
        y: state.currentPiece === 'I' ? -1 : 0
      };
      state.isLocking = false;
      state.lockTimer = 0;
      state.lockMoves = 0;
    } else {
      spawnPiece();
    }

    renderHoldPreview();
  }

  function onPieceAdjusted() {
    if (state.isLocking && state.lockMoves < state.maxLockMoves) {
      state.lockTimer = 0;
      state.lockMoves++;
    }
  }

  // --- Lock Piece & Line Clears ---
  function lockPiece() {
    const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[y].length; x++) {
        if (mat[y][x]) {
          const boardX = state.currentPos.x + x;
          const boardY = state.currentPos.y + y;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            state.grid[boardY][boardX] = state.currentPiece;
          }
        }
      }
    }

    checkLineClears();
  }

  function checkLineClears() {
    const fullRows = [];
    for (let y = 0; y < ROWS; y++) {
      if (state.grid[y].every(cell => cell !== 0)) {
        fullRows.push(y);
      }
    }

    if (fullRows.length > 0) {
      state.clearingRows = fullRows;
      state.clearAnimationProgress = 1.0;
      createLineClearExplosion(fullRows);

      const lineCount = fullRows.length;
      state.combo++;

      let baseScore = 0;
      if (lineCount === 1) {
        baseScore = 100 * state.level;
        playSfx('clear1');
        haptic([30, 40, 50]);
        showBanner('+100', 'rgba(56, 189, 248, 0.9)');
        state.backToBack = false;
      } else if (lineCount === 2) {
        baseScore = 300 * state.level;
        playSfx('clear2');
        haptic([40, 40, 60]);
        showBanner('DOUBLE! +300', 'rgba(16, 185, 129, 0.9)');
        state.backToBack = false;
      } else if (lineCount === 3) {
        baseScore = 500 * state.level;
        playSfx('clear3');
        haptic([50, 40, 80]);
        showBanner('TRIPLE! +500', 'rgba(249, 115, 22, 0.9)');
        state.backToBack = false;
      } else if (lineCount === 4) {
        baseScore = 800 * state.level;
        if (state.backToBack) {
          baseScore = Math.floor(baseScore * 1.5);
          showBanner('B2B TETRIS! +' + baseScore, 'rgba(168, 85, 247, 1)');
        } else {
          showBanner('TETRIS! +800', 'rgba(168, 85, 247, 1)');
        }
        state.backToBack = true;
        playSfx('tetris');
        haptic([60, 50, 80, 50, 120]);
        triggerScreenShake();
      }

      if (state.combo > 0) {
        const comboBonus = 50 * state.combo * state.level;
        baseScore += comboBonus;
      }

      state.score += baseScore;
      state.lines += lineCount;

      const newLevel = Math.floor(state.lines / 10) + 1;
      if (newLevel > state.level) {
        state.level = newLevel;
        playSfx('levelup');
        haptic([80, 50, 100, 50, 120]);
        showBanner(`LEVEL ${state.level}!`, 'rgba(250, 204, 21, 1)');
      }

      updateScoreUI();

      setTimeout(() => {
        fullRows.forEach(y => {
          state.grid.splice(y, 1);
          state.grid.unshift(Array(COLS).fill(0));
        });
        state.clearingRows = [];
        spawnPiece();
      }, 120);

    } else {
      state.combo = -1;
      spawnPiece();
    }
  }

  // --- UI & Feedback Updates ---
  function updateScoreUI() {
    if (scoreEl) scoreEl.textContent = state.score.toLocaleString();
    if (mScoreEl) mScoreEl.textContent = state.score.toLocaleString();
    if (linesEl) linesEl.textContent = state.lines;
    if (mLinesEl) mLinesEl.textContent = state.lines;
    if (levelEl) levelEl.textContent = state.level;
    if (mLevelEl) mLevelEl.textContent = state.level;

    if (state.score > state.highScore) {
      state.highScore = state.score;
    }

    if (highScoreEl) highScoreEl.textContent = state.highScore.toLocaleString();
    if (mHighEl) mHighEl.textContent = state.highScore.toLocaleString();
  }

  let bannerTimeout = null;
  function showBanner(text, color) {
    if (!bannerEl) return;
    if (bannerTimeout) clearTimeout(bannerTimeout);
    bannerEl.textContent = text;
    bannerEl.style.color = color || '#ffffff';
    bannerEl.classList.add('show');
    bannerTimeout = setTimeout(() => {
      bannerEl.classList.remove('show');
    }, 1100);
  }

  function triggerScreenShake() {
    if (!boardFrameEl) return;
    boardFrameEl.classList.remove('shake');
    void boardFrameEl.offsetWidth;
    boardFrameEl.classList.add('shake');
    setTimeout(() => {
      boardFrameEl.classList.remove('shake');
    }, 250);
  }

  // --- Drawing Functions ---
  function drawCell(targetContext, x, y, type, isGhost = false, size = BLOCK_SIZE) {
    const colorInfo = COLORS[type];
    if (!colorInfo) return;

    targetContext.save();

    if (isGhost) {
      targetContext.fillStyle = 'rgba(255, 255, 255, 0.04)';
      targetContext.strokeStyle = colorInfo.main;
      targetContext.lineWidth = 1.5;
      targetContext.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);
      targetContext.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
    } else {
      const gradient = targetContext.createLinearGradient(
        x * size, y * size,
        x * size + size, y * size + size
      );
      gradient.addColorStop(0, colorInfo.light);
      gradient.addColorStop(0.5, colorInfo.main);
      gradient.addColorStop(1, colorInfo.dark);

      targetContext.fillStyle = gradient;
      targetContext.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);

      targetContext.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      targetContext.lineWidth = 1.5;
      targetContext.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);

      targetContext.strokeStyle = colorInfo.dark;
      targetContext.lineWidth = 1;
      targetContext.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
    }

    targetContext.restore();
  }

  function drawGrid() {
    if (!ctx) return;
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK_SIZE, 0);
      ctx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK_SIZE);
      ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
      ctx.stroke();
    }

    // Draw Locked Grid Cells
    for (let y = 0; y < ROWS; y++) {
      if (state.clearingRows.includes(y)) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, y * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
        continue;
      }

      for (let x = 0; x < COLS; x++) {
        const cell = state.grid[y][x];
        if (cell) {
          drawCell(ctx, x, y, cell);
        }
      }
    }

    // Draw Ghost Piece
    if (state.currentPiece && !state.isGameOver) {
      const ghost = getGhostPosition();
      const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[y].length; x++) {
          if (mat[y][x]) {
            const gx = ghost.x + x;
            const gy = ghost.y + y;
            if (gy >= 0 && gy < ROWS) {
              drawCell(ctx, gx, gy, state.currentPiece, true);
            }
          }
        }
      }
    }

    // Draw Active Piece
    if (state.currentPiece && !state.isGameOver) {
      const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[y].length; x++) {
          if (mat[y][x]) {
            const px = state.currentPos.x + x;
            const py = state.currentPos.y + y;
            if (py >= 0 && py < ROWS) {
              drawCell(ctx, px, py, state.currentPiece);
            }
          }
        }
      }
    }
  }

  // --- Previews Rendering ---
  function renderMiniPiece(targetContext, pieceType, targetWidth, targetHeight) {
    if (!targetContext) return;
    targetContext.clearRect(0, 0, targetWidth, targetHeight);
    if (!pieceType) return;

    const mat = TETROMINOES[pieceType];
    const cellSize = targetWidth < 80 ? (pieceType === 'I' ? 10 : 12) : (pieceType === 'I' ? 16 : 18);
    const pieceWidth = mat[0].length * cellSize;
    const pieceHeight = mat.length * cellSize;

    const offsetX = Math.floor((targetWidth - pieceWidth) / 2);
    const offsetY = Math.floor((targetHeight - pieceHeight) / 2);

    targetContext.save();
    targetContext.translate(offsetX, offsetY);

    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[y].length; x++) {
        if (mat[y][x]) {
          drawCell(targetContext, x, y, pieceType, false, cellSize);
        }
      }
    }
    targetContext.restore();
  }

  function renderHoldPreview() {
    if (holdCtx && holdCanvas) {
      renderMiniPiece(holdCtx, state.heldPiece, holdCanvas.width, holdCanvas.height);
      holdCanvas.style.opacity = !state.canHold ? '0.45' : '1';
    }

    if (mHoldCtx && mHoldCanvas) {
      renderMiniPiece(mHoldCtx, state.heldPiece, mHoldCanvas.width, mHoldCanvas.height);
      mHoldCanvas.style.opacity = !state.canHold ? '0.45' : '1';
    }
  }

  function renderNextPreviews() {
    for (let i = 0; i < 3; i++) {
      const nextPiece = state.nextQueue[i];
      if (nextContexts[i] && nextCanvases[i]) {
        renderMiniPiece(nextContexts[i], nextPiece, nextCanvases[i].width, nextCanvases[i].height);
      }
    }

    if (mNextCtx && mNextCanvas) {
      renderMiniPiece(mNextCtx, state.nextQueue[0], mNextCanvas.width, mNextCanvas.height);
    }
  }

  // --- Particles & FX Engine ---
  function createLineClearExplosion(rows) {
    const burstColors = ['#06b6d4', '#a855f7', '#facc15', '#ffffff', '#10b981', '#f97316'];
    rows.forEach(y => {
      const py = y * BLOCK_SIZE + BLOCK_SIZE / 2;
      for (let i = 0; i < 35; i++) {
        particles.push({
          x: Math.random() * (COLS * BLOCK_SIZE),
          y: py + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 8 - 2,
          size: Math.random() * 4 + 2,
          color: burstColors[Math.floor(Math.random() * burstColors.length)],
          alpha: 1,
          decay: Math.random() * 0.03 + 0.02
        });
      }
    });
  }

  function createHardDropSparks(ghostPos) {
    const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[y].length; x++) {
        if (mat[y][x]) {
          const px = (ghostPos.x + x) * BLOCK_SIZE + BLOCK_SIZE / 2;
          const py = (ghostPos.y + y) * BLOCK_SIZE + BLOCK_SIZE;
          for (let i = 0; i < 3; i++) {
            particles.push({
              x: px,
              y: py,
              vx: (Math.random() - 0.5) * 5,
              vy: -Math.random() * 4 - 1,
              size: Math.random() * 3 + 1.5,
              color: '#ffffff',
              alpha: 0.9,
              decay: 0.05
            });
          }
        }
      }
    }
  }

  function updateAndDrawParticles() {
    if (!fxCtx || !fxCanvas) return;
    fxCtx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      fxCtx.save();
      fxCtx.globalAlpha = p.alpha;
      fxCtx.fillStyle = p.color;
      fxCtx.shadowColor = p.color;
      fxCtx.shadowBlur = 6;
      fxCtx.fillRect(p.x, p.y, p.size, p.size);
      fxCtx.restore();
    }
  }

  // --- Main Game Loop ---
  function gameLoop(time = 0) {
    const deltaTime = time - state.lastTime;
    state.lastTime = time;

    if (state.isPlaying && !state.isPaused && !state.isGameOver) {
      state.dropTimer += deltaTime;
      const speed = getDropSpeed(state.level);

      const mat = getMatrixForPiece(state.currentPiece, state.currentRotation);
      const isGrounded = checkCollision(state.currentPiece, mat, {
        x: state.currentPos.x,
        y: state.currentPos.y + 1
      });

      if (isGrounded) {
        if (!state.isLocking) {
          state.isLocking = true;
          state.lockTimer = 0;
        } else {
          state.lockTimer += deltaTime;
          if (state.lockTimer >= state.lockDelay) {
            lockPiece();
          }
        }
      } else {
        state.isLocking = false;
        state.lockTimer = 0;

        if (state.dropTimer >= speed) {
          state.currentPos.y++;
          state.dropTimer = 0;
        }
      }
    }

    drawGrid();
    updateAndDrawParticles();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  // --- Game State Flow ---
  function startGame() {
    if (startPlayerInput && startPlayerInput.value.trim()) {
      setPlayerName(startPlayerInput.value.trim());
    }

    state.grid = createGrid();
    state.bag = [];
    state.nextQueue = [];
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.heldPiece = null;
    state.canHold = true;
    state.combo = -1;
    state.backToBack = false;
    state.isGameOver = false;
    state.isPaused = false;
    state.isPlaying = true;
    state.dropTimer = 0;
    state.lastTime = performance.now();
    particles = [];

    if (overlayStart) overlayStart.classList.add('hidden');
    if (overlayPause) overlayPause.classList.add('hidden');
    if (overlayGameOver) overlayGameOver.classList.add('hidden');

    updateScoreUI();
    spawnPiece();
    getAudioCtx();
    haptic(30);
  }

  function pauseGame() {
    if (!state.isPlaying || state.isGameOver) return;
    state.isPaused = true;
    if (overlayPause) overlayPause.classList.remove('hidden');
    haptic(15);
  }

  function resumeGame() {
    if (!state.isPlaying || state.isGameOver) return;
    state.isPaused = false;
    state.lastTime = performance.now();
    if (overlayPause) overlayPause.classList.add('hidden');
    haptic(15);
  }

  function togglePause() {
    if (state.isPaused) resumeGame();
    else pauseGame();
  }

  async function triggerGameOver() {
    state.isGameOver = true;
    state.isPlaying = false;
    playSfx('gameover');
    haptic([100, 50, 150]);

    const isNewHigh = state.score > 0 && state.score >= state.highScore;

    if (goFinalScore) goFinalScore.textContent = state.score.toLocaleString();
    if (goFinalLines) goFinalLines.textContent = state.lines;
    if (goFinalLevel) goFinalLevel.textContent = state.level;
    if (goHighScore) goHighScore.textContent = state.highScore.toLocaleString();
    if (gameoverPlayerInput) gameoverPlayerInput.value = state.playerName;

    if (newHighBadgeContainer) {
      if (isNewHigh && state.score > 0) {
        newHighBadgeContainer.innerHTML = '<div class="new-high-badge">👑 NEW HIGH SCORE!</div>';
      } else {
        newHighBadgeContainer.innerHTML = '';
      }
    }

    if (overlayGameOver) overlayGameOver.classList.remove('hidden');

    if (state.score > 0) {
      await syncScoreToSupabase(state.score, state.lines, state.level);
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
        const rows = await supabaseRequest('tetris_leaderboard?select=player_name,high_score,lines,level,created_at&order=high_score.desc&limit=5');
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
        console.warn('[Tetris Supabase] Fetch error:', err);
      }
    }

    if (leaderboardBadge) {
      leaderboardBadge.textContent = '⚪ Offline';
      leaderboardBadge.className = 'badge';
    }
    renderLeaderboard([]);
  }

  async function syncScoreToSupabase(score, lines, level) {
    if (score <= 0 || state.isSyncingScore) return;
    state.isSyncingScore = true;

    if (gameoverPlayerInput && gameoverPlayerInput.value.trim()) {
      setPlayerName(gameoverPlayerInput.value.trim());
    }

    const playerName = state.playerName || 'Player';

    if (typeof supabaseRequest === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      try {
        const existing = await supabaseRequest(
          `tetris_leaderboard?select=id,high_score&player_name=eq.${encodeURIComponent(playerName)}&limit=1`
        );

        if (existing && existing.length > 0) {
          if (score > existing[0].high_score) {
            await supabaseRequest(`tetris_leaderboard?id=eq.${existing[0].id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                high_score: score,
                lines: lines,
                level: level,
                updated_at: new Date().toISOString()
              })
            });
          }
        } else {
          await supabaseRequest('tetris_leaderboard', {
            method: 'POST',
            body: JSON.stringify([{
              player_name: playerName,
              high_score: score,
              lines: lines,
              level: level
            }])
          });
        }
      } catch (err) {
        console.warn('[Tetris Supabase] Sync error:', err);
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
                <span class="leaderboard-meta">Lvl ${item.level || 1} • ${item.lines || 0} Lines</span>
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

  // --- Turbo DAS Touch Button Handling ---
  function setupTurboTouchButton(btnId, action) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    let repeatTimer = null;
    let initialDelayTimer = null;

    const startAction = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('active-touch');

      action();

      // Delayed Auto Shift (DAS): wait 160ms, then auto-repeat every 50ms
      initialDelayTimer = setTimeout(() => {
        repeatTimer = setInterval(() => {
          action();
        }, 50);
      }, 160);
    };

    const stopAction = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      btn.classList.remove('active-touch');
      if (initialDelayTimer) clearTimeout(initialDelayTimer);
      if (repeatTimer) clearInterval(repeatTimer);
      initialDelayTimer = null;
      repeatTimer = null;
    };

    btn.addEventListener('touchstart', startAction, { passive: false });
    btn.addEventListener('touchend', stopAction, { passive: false });
    btn.addEventListener('touchcancel', stopAction, { passive: false });

    // Fallback mouse clicks for testing on desktop
    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('mouseup', stopAction);
    btn.addEventListener('mouseleave', stopAction);
  }

  function setupMobileControls() {
    setupTurboTouchButton('m-btn-left', moveLeft);
    setupTurboTouchButton('m-btn-right', moveRight);
    setupTurboTouchButton('m-btn-down', softDrop);

    // Single-press action buttons
    const bindSingleTouch = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
      };
      btn.addEventListener('touchstart', handler, { passive: false });
      btn.addEventListener('click', handler);
    };

    bindSingleTouch('m-btn-rot-cw', () => rotatePiece(1));
    bindSingleTouch('m-btn-rot-ccw', () => rotatePiece(-1));
    bindSingleTouch('m-btn-hard-drop', hardDrop);
    bindSingleTouch('m-btn-hold', holdPiece);
    bindSingleTouch('m-btn-hold-wing', holdPiece);

    // Touch Gestures on Board Canvas
    if (canvas) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;

      canvas.addEventListener('touchstart', (e) => {
        if (!state.isPlaying || state.isPaused) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
      }, { passive: true });

      canvas.addEventListener('touchend', (e) => {
        if (!state.isPlaying || state.isPaused) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const duration = Date.now() - touchStartTime;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Tap to rotate
        if (absDx < 15 && absDy < 15 && duration < 240) {
          rotatePiece(1);
          return;
        }

        // Horizontal Swipe
        if (absDx > absDy && absDx > 25) {
          if (dx > 0) moveRight();
          else moveLeft();
        }
        // Vertical Swipe
        else if (absDy > absDx && absDy > 30) {
          if (dy > 0) {
            if (absDy > 65) hardDrop();
            else softDrop();
          } else {
            holdPiece(); // Swipe Up to Hold
          }
        }
      }, { passive: true });
    }
  }

  // --- Keyboard Controls ---
  function setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          softDrop();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyX':
          e.preventDefault();
          rotatePiece(1);
          break;
        case 'KeyZ':
          e.preventDefault();
          rotatePiece(-1);
          break;
        case 'Space':
          e.preventDefault();
          hardDrop();
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          holdPiece();
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          togglePause();
          break;
        case 'KeyR':
          e.preventDefault();
          startGame();
          break;
      }
    });
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

    // Mobile Leaderboard Modal Toggles
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
        soundBtn.style.color = soundMuted ? '#94a3b8' : '#38bdf8';
      };
      updateSoundIcon();

      soundBtn.addEventListener('click', () => {
        soundMuted = !soundMuted;
        localStorage.setItem('pulari_tetris_muted', soundMuted ? 'true' : 'false');
        updateSoundIcon();
        if (!soundMuted) playSfx('rotate');
        haptic(15);
      });
    }
  }

  // --- Initialization ---
  function init() {
    try {
      localStorage.removeItem('pulari_tetris_highscore');
      localStorage.removeItem('pulari_tetris_hall');
    } catch (e) { }
    setPlayerName(state.playerName);
    updateScoreUI();
    fetchTop5Leaderboard();
    setupKeyboardControls();
    setupMobileControls();
    setupButtons();

    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
