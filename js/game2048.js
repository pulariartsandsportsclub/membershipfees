/**
 * Pulari Arts & Sports Club – 2048 Neon Puzzle Mini-Game
 * Smooth CSS Grid Animation, Web Audio Chimes, 1-Step Undo & Supabase Live Top-5 Leaderboard (js/game2048.js)
 */

(function () {
  'use strict';

  // --- Web Audio Synthesizer ---
  let audioCtx = null;
  let soundMuted = localStorage.getItem('pulari_2048_muted') === 'true';

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

  function playSfx(type, value = 0) {
    if (soundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'slide') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'merge') {
        const baseFreq = 260 + Math.min(12, Math.log2(value || 4)) * 65;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.09);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.25, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.25);
        });
      } else if (type === 'gameover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('[2048 Audio Error]', e);
    }
  }

  function haptic(ms = 15) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) { }
    }
  }

  // --- Game State ---
  const SIZE = 4;

  const state = {
    playerName: localStorage.getItem('pulari_player_name') || 'Player',
    grid: Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)),
    score: 0,
    highScore: 0,
    highestTile: 2,
    movesCount: 0,
    isWon: false,
    hasContinued: false,
    isGameOver: false,
    previousState: null,
    isSyncingScore: false
  };

  // DOM Elements
  const gridContainer = document.getElementById('grid-container');
  const scoreEl = document.getElementById('game-score');
  const mScoreEl = document.getElementById('m-game-score');
  const highScoreEl = document.getElementById('game-highscore');
  const mHighEl = document.getElementById('m-game-highscore');
  const movesEl = document.getElementById('game-moves');
  const mMovesEl = document.getElementById('m-game-moves');
  const bestTileEl = document.getElementById('game-best-tile');
  const mBestTileEl = document.getElementById('m-game-best-tile');

  const gameoverOverlay = document.getElementById('game-gameover-overlay');
  const winOverlay = document.getElementById('game-win-overlay');
  const goTitle = document.getElementById('go-title');
  const goFinalScore = document.getElementById('go-final-score');
  const goFinalTile = document.getElementById('go-final-tile');
  const goFinalMoves = document.getElementById('go-final-moves');
  const goHighScore = document.getElementById('go-highscore');
  const goNewRecordBadge = document.getElementById('go-new-record');
  const goSyncStatus = document.getElementById('go-sync-status');

  const currentPlayerNameEl = document.getElementById('current-player-name');
  const changePlayerBtn = document.getElementById('btn-change-player');
  const gameoverPlayerInput = document.getElementById('gameover-player-name');
  const winPlayerInput = document.getElementById('win-player-name');

  const btnUndo = document.getElementById('btn-undo');
  const mBtnUndo = document.getElementById('m-btn-undo');
  const btnRestart = document.getElementById('btn-restart');
  const mBtnRestart = document.getElementById('m-btn-restart');
  const btnEndGame = document.getElementById('btn-end-game');
  const mBtnEndGame = document.getElementById('m-btn-end-game');
  const btnResubmitScore = document.getElementById('btn-resubmit-score');

  const btnKeepGoing = document.getElementById('btn-keep-going');
  const btnWinPlayAgain = document.getElementById('btn-win-play-again');
  const btnPlayAgain = document.getElementById('btn-play-again');

  const leaderboardListEl = document.getElementById('game2048-leaderboard-list');
  const modalLeaderboardListEl = document.getElementById('modal-leaderboard-list');
  const leaderboardBadge = document.getElementById('leaderboard-badge');

  const btnOpenLeaderboardModal = document.getElementById('btn-open-leaderboard-modal');
  const btnCloseLeaderboardModal = document.getElementById('btn-close-leaderboard-modal');
  const mobileLeaderboardModal = document.getElementById('mobile-leaderboard-modal');
  const btnModalChangeTag = document.getElementById('btn-modal-change-tag');
  const soundBtn = document.getElementById('btn-sound-toggle');

  // --- Grid Operations & Logic ---
  function emptyCells() {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (state.grid[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  }

  function addRandomTile() {
    const cells = emptyCells();
    if (cells.length === 0) return null;
    const randomCell = cells[Math.floor(Math.random() * cells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    state.grid[randomCell.r][randomCell.c] = value;
    return { ...randomCell, value, isNew: true };
  }

  function savePreviousState() {
    state.previousState = {
      grid: state.grid.map(row => [...row]),
      score: state.score,
      highestTile: state.highestTile,
      movesCount: state.movesCount
    };
    if (btnUndo) btnUndo.disabled = false;
    if (mBtnUndo) mBtnUndo.disabled = false;
  }

  function undoMove() {
    if (!state.previousState || state.isGameOver) return;
    state.grid = state.previousState.grid.map(row => [...row]);
    state.score = state.previousState.score;
    state.highestTile = state.previousState.highestTile;
    state.movesCount = state.previousState.movesCount;
    state.previousState = null;

    if (btnUndo) btnUndo.disabled = true;
    if (mBtnUndo) mBtnUndo.disabled = true;
    updateUI();
    renderGrid();
    haptic(15);
  }

  // Row slide & merge logic
  function slideRow(row) {
    let arr = row.filter(val => val !== 0);
    let scoreGained = 0;
    let maxMerged = 0;

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        scoreGained += arr[i];
        if (arr[i] > maxMerged) maxMerged = arr[i];
        arr.splice(i + 1, 1);
      }
    }

    while (arr.length < SIZE) {
      arr.push(0);
    }

    return { row: arr, scoreGained, maxMerged };
  }

  function move(direction) {
    if (state.isGameOver || (state.isWon && !state.hasContinued)) return;

    let moved = false;
    let totalScore = 0;
    let highestMerged = 0;
    const oldGrid = state.grid.map(row => [...row]);

    savePreviousState();

    if (direction === 'left') {
      for (let r = 0; r < SIZE; r++) {
        const { row, scoreGained, maxMerged } = slideRow(state.grid[r]);
        state.grid[r] = row;
        totalScore += scoreGained;
        if (maxMerged > highestMerged) highestMerged = maxMerged;
      }
    } else if (direction === 'right') {
      for (let r = 0; r < SIZE; r++) {
        const reversed = [...state.grid[r]].reverse();
        const { row, scoreGained, maxMerged } = slideRow(reversed);
        state.grid[r] = row.reverse();
        totalScore += scoreGained;
        if (maxMerged > highestMerged) highestMerged = maxMerged;
      }
    } else if (direction === 'up') {
      for (let c = 0; c < SIZE; c++) {
        const col = [state.grid[0][c], state.grid[1][c], state.grid[2][c], state.grid[3][c]];
        const { row, scoreGained, maxMerged } = slideRow(col);
        for (let r = 0; r < SIZE; r++) state.grid[r][c] = row[r];
        totalScore += scoreGained;
        if (maxMerged > highestMerged) highestMerged = maxMerged;
      }
    } else if (direction === 'down') {
      for (let c = 0; c < SIZE; c++) {
        const col = [state.grid[3][c], state.grid[2][c], state.grid[1][c], state.grid[0][c]];
        const { row, scoreGained, maxMerged } = slideRow(col);
        const reversed = row.reverse();
        for (let r = 0; r < SIZE; r++) state.grid[r][c] = reversed[r];
        totalScore += scoreGained;
        if (maxMerged > highestMerged) highestMerged = maxMerged;
      }
    }

    // Check if board changed
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (oldGrid[r][c] !== state.grid[r][c]) {
          moved = true;
          break;
        }
      }
    }

    if (moved) {
      state.movesCount++;
      state.score += totalScore;

      // Update highest tile
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (state.grid[r][c] > state.highestTile) {
            state.highestTile = state.grid[r][c];
          }
        }
      }

      addRandomTile();

      if (highestMerged > 0) {
        playSfx('merge', highestMerged);
        haptic(22);
      } else {
        playSfx('slide');
        haptic(10);
      }

      updateUI();
      renderGrid();

      // Check Win condition (reached 2048)
      if (!state.isWon && !state.hasContinued && state.highestTile >= 2048) {
        triggerWin();
      } else if (checkGameOver()) {
        triggerGameOver();
      }
    } else {
      // Revert previous state if move did nothing
      state.previousState = null;
      if (btnUndo) btnUndo.disabled = true;
    }
  }

  function checkGameOver() {
    // 1. Any empty cell?
    if (emptyCells().length > 0) return false;

    // 2. Any adjacent horizontal merges?
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE - 1; c++) {
        if (state.grid[r][c] === state.grid[r][c + 1]) return false;
      }
    }

    // 3. Any adjacent vertical merges?
    for (let c = 0; c < SIZE; c++) {
      for (let r = 0; r < SIZE - 1; r++) {
        if (state.grid[r][c] === state.grid[r + 1][c]) return false;
      }
    }

    return true;
  }

  function triggerWin() {
    state.isWon = true;
    playSfx('win');
    haptic([40, 40, 80]);
    if (winOverlay) winOverlay.style.display = 'flex';
    syncScoreToSupabase(state.score, state.highestTile, state.movesCount);
  }

  function triggerGameOver(isManual = false) {
    state.isGameOver = true;
    playSfx('gameover');
    haptic([60, 40, 80]);

    if (goTitle) {
      goTitle.textContent = isManual ? 'Game Ended' : 'Game Over!';
      goTitle.style.color = isManual ? '#f97316' : '#ef4444';
    }

    if (goFinalScore) goFinalScore.textContent = state.score.toLocaleString();
    if (goFinalTile) goFinalTile.textContent = state.highestTile;
    if (goFinalMoves) goFinalMoves.textContent = state.movesCount;
    if (goHighScore) goHighScore.textContent = state.highScore.toLocaleString();

    const isNewHigh = state.score > 0 && state.score >= state.highScore;
    if (goNewRecordBadge) goNewRecordBadge.style.display = isNewHigh ? 'inline-block' : 'none';

    if (gameoverPlayerInput) gameoverPlayerInput.value = state.playerName;

    if (goSyncStatus) {
      if (state.score > 0) {
        goSyncStatus.textContent = '⏳ Saving score to database...';
        goSyncStatus.style.color = '#fbbf24';
      } else {
        goSyncStatus.textContent = 'ℹ️ Score is 0 (Play moves to submit)';
        goSyncStatus.style.color = '#94a3b8';
      }
    }

    if (gameoverOverlay) gameoverOverlay.style.display = 'flex';

    if (state.score > 0) {
      syncScoreToSupabase(state.score, state.highestTile, state.movesCount);
    }
  }

  // --- Rendering Grid Tiles ---
  function renderGrid() {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = state.grid[r][c];
        const tile = document.createElement('div');
        tile.className = `tile tile-${val}`;
        tile.textContent = val > 0 ? val : '';
        gridContainer.appendChild(tile);
      }
    }
  }

  function updateUI() {
    const s = state.score.toLocaleString();
    if (scoreEl) scoreEl.textContent = s;
    if (mScoreEl) mScoreEl.textContent = s;

    if (movesEl) movesEl.textContent = state.movesCount;
    if (mMovesEl) mMovesEl.textContent = state.movesCount;

    if (bestTileEl) bestTileEl.textContent = state.highestTile;
    if (mBestTileEl) mBestTileEl.textContent = state.highestTile;

    if (state.score > state.highScore) {
      state.highScore = state.score;
    }

    if (highScoreEl) highScoreEl.textContent = state.highScore.toLocaleString();
    if (mHighEl) mHighEl.textContent = state.highScore.toLocaleString();
  }

  // --- Game Flow & Reset ---
  function initNewGame() {
    state.grid = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
    state.score = 0;
    state.highestTile = 2;
    state.movesCount = 0;
    state.isWon = false;
    state.hasContinued = false;
    state.isGameOver = false;
    state.previousState = null;

    if (btnUndo) btnUndo.disabled = true;
    if (mBtnUndo) mBtnUndo.disabled = true;

    addRandomTile();
    addRandomTile();

    updateUI();
    renderGrid();

    if (gameoverOverlay) gameoverOverlay.style.display = 'none';
    if (winOverlay) winOverlay.style.display = 'none';

    getAudioContext();
  }

  // --- Player Gamer Tag Management ---
  function setPlayerName(name) {
    if (!name || !name.trim()) return;
    state.playerName = name.trim().slice(0, 18);
    localStorage.setItem('pulari_player_name', state.playerName);
    if (currentPlayerNameEl) currentPlayerNameEl.textContent = state.playerName;
    if (gameoverPlayerInput) gameoverPlayerInput.value = state.playerName;
    if (winPlayerInput) winPlayerInput.value = state.playerName;
  }

  function promptChangePlayerName() {
    const current = state.playerName || 'Player';
    const newName = prompt('Enter your Gamer Tag for 2048 Leaderboard:', current);
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
        const rows = await supabaseRequest('game2048_leaderboard?select=player_name,high_score,highest_tile,moves_count,created_at&order=high_score.desc&limit=5');
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
        console.warn('[2048 Supabase] Fetch error:', err);
      }
    }

    if (leaderboardBadge) {
      leaderboardBadge.textContent = '⚪ Offline';
      leaderboardBadge.className = 'badge';
    }
    renderLeaderboard([]);
  }

  async function syncScoreToSupabase(score, bestTile, moves) {
    if (score <= 0 || state.isSyncingScore) return;
    state.isSyncingScore = true;

    if (gameoverPlayerInput && gameoverPlayerInput.value.trim()) {
      setPlayerName(gameoverPlayerInput.value.trim());
    }

    const playerName = state.playerName || 'Player';

    if (typeof supabaseRequest === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      try {
        const existing = await supabaseRequest(
          `game2048_leaderboard?select=id,high_score&player_name=eq.${encodeURIComponent(playerName)}&limit=1`
        );

        if (existing && existing.length > 0) {
          if (score > existing[0].high_score) {
            await supabaseRequest(`game2048_leaderboard?id=eq.${existing[0].id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                high_score: score,
                highest_tile: bestTile,
                moves_count: moves,
                updated_at: new Date().toISOString()
              })
            });
          }
        } else {
          await supabaseRequest('game2048_leaderboard', {
            method: 'POST',
            body: JSON.stringify([{
              player_name: playerName,
              high_score: score,
              highest_tile: bestTile,
              moves_count: moves
            }])
          });
        }
        if (goSyncStatus) {
          goSyncStatus.textContent = '🟢 Score Synced to Database!';
          goSyncStatus.style.color = '#10b981';
        }
      } catch (err) {
        console.warn('[2048 Supabase] Sync error:', err);
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
                <span class="leaderboard-meta">Tile ${item.highest_tile || 2} • ${item.moves_count || 0} Moves</span>
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

  // --- Controls: Keyboard, Touch & Gestures ---
  function setupControls() {
    // Keyboard listener
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          move('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          move('right');
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          move('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          move('down');
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undoMove();
          }
          break;
      }
    });

    // Touch swipe gestures on board
    let startX = 0, startY = 0;
    const board = document.getElementById('game-board');

    if (board) {
      board.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }
      }, { passive: true });

      board.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const dx = e.changedTouches[0].clientX - startX;
          const dy = e.changedTouches[0].clientY - startY;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (Math.max(absDx, absDy) > 30) {
            if (absDx > absDy) {
              move(dx > 0 ? 'right' : 'left');
            } else {
              move(dy > 0 ? 'down' : 'up');
            }
          }
        }
      }, { passive: true });
    }
  }

  function setupButtons() {
    if (btnRestart) btnRestart.addEventListener('click', initNewGame);
    if (mBtnRestart) mBtnRestart.addEventListener('click', initNewGame);
    if (btnUndo) btnUndo.addEventListener('click', undoMove);
    if (mBtnUndo) mBtnUndo.addEventListener('click', undoMove);
    if (btnEndGame) btnEndGame.addEventListener('click', () => triggerGameOver(true));
    if (mBtnEndGame) mBtnEndGame.addEventListener('click', () => triggerGameOver(true));
    if (btnPlayAgain) btnPlayAgain.addEventListener('click', initNewGame);
    if (btnWinPlayAgain) btnWinPlayAgain.addEventListener('click', initNewGame);

    if (btnResubmitScore) {
      btnResubmitScore.addEventListener('click', () => {
        if (gameoverPlayerInput && gameoverPlayerInput.value.trim()) {
          setPlayerName(gameoverPlayerInput.value.trim());
          if (state.score > 0) {
            syncScoreToSupabase(state.score, state.highestTile, state.movesCount);
          }
        }
      });
    }

    if (btnKeepGoing) {
      btnKeepGoing.addEventListener('click', () => {
        state.hasContinued = true;
        if (winOverlay) winOverlay.style.display = 'none';
      });
    }

    if (changePlayerBtn) changePlayerBtn.addEventListener('click', promptChangePlayerName);
    if (btnModalChangeTag) btnModalChangeTag.addEventListener('click', () => {
      if (mobileLeaderboardModal) mobileLeaderboardModal.classList.remove('active');
      promptChangePlayerName();
    });

    // Modals
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
        soundBtn.style.color = soundMuted ? '#94a3b8' : '#f59e0b';
      };
      updateSoundIcon();

      soundBtn.addEventListener('click', () => {
        soundMuted = !soundMuted;
        localStorage.setItem('pulari_2048_muted', soundMuted ? 'true' : 'false');
        updateSoundIcon();
        if (!soundMuted) playSfx('slide');
        haptic(15);
      });
    }
  }

  // --- Initialization ---
  function init() {
    setPlayerName(state.playerName);
    fetchTop5Leaderboard();
    setupControls();
    setupButtons();
    initNewGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
