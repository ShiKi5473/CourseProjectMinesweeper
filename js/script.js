// script.js

// 預設遊戲設定
const DEFAULT_SETTINGS = {
    easy: { rows: 9, cols: 9, mines: 10, name: "簡單" },
    medium: { rows: 16, cols: 16, mines: 40, name: "中等" },
    high: { rows: 16, cols: 30, mines: 99, name: "困難" },
    custom: { rows: 10, cols: 10, mines: 15, name: "自訂" } // 自由模式的預設
};

let CURRENT_GAME_MODE = null; // 'ranked', 'free', 'tutorial' (由頁面決定)
let CURRENT_ROWS, CURRENT_COLS, CURRENT_MINES;
let currentDifficultyName = "";

// 遊戲狀態變數
let board = [];
let revealedCellsCount = 0;
let flagsPlaced = 0;
let gameOver = false;
let firstClick = true;
let playerName = "玩家";

//計時器相關變數 ---
let timerInterval = null;
let startTime = 0;
let elapsedTime = 0;


// DOM 元素選擇 (通用元素)
const alertPlaceholder = document.getElementById('alert-placeholder');
const playerNameInput = document.getElementById('player-name');
const resetButton = document.getElementById('reset-button');

// 遊戲板相關 (如果頁面上有遊戲板)
const gameBoardElement = document.getElementById('game-board');
const minesCountElement = document.getElementById('mines-count');
const timerElement = document.getElementById('timer');

// 模式特定輸入元素 (只在對應頁面獲取)
let rankedDifficultyRadios, rowsInput, colsInput, minesInput;


/**
 * 根據當前 HTML 頁面確定遊戲模式並初始化
 */
function initializePage() {
    const path = window.location.pathname.split("/").pop().toLowerCase();
    console.log('[DEBUG] Initializing page, path:', path);

    if (path.includes("ranked.html")) {
        CURRENT_GAME_MODE = 'ranked';
        currentDifficultyName = DEFAULT_SETTINGS.easy.name;
        rankedDifficultyRadios = document.querySelectorAll('input[name="ranked-difficulty"]');
        const easyRadio = document.getElementById('diff-easy');
        if (easyRadio) easyRadio.checked = true;
        if (rankedDifficultyRadios) {
            rankedDifficultyRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    // 當排名模式的難度改變時，setupGame 會在點擊 "開始遊戲" 按鈕時被調用
                    // 並在 setupGame 內部通過 updateGameSettings 獲取新的難度設定
                    if (radio.checked && CURRENT_GAME_MODE === 'ranked') {
                        console.log(`[DEBUG] Ranked difficulty changed to: ${radio.value}. Updating board.`);
                        // 不需要手動調用 updateGameSettings()，因為 setupGame() 內部會調用它
                        // setupGame 會處理重置遊戲狀態和重新繪製板子
                        setupGame(true); // 傳遞 true 表示這是一個設定變更，而非完整的遊戲開始點擊
                    }
                });
            });
        }
    } else if (path.includes("free.html")) {
        CURRENT_GAME_MODE = 'free';
        console.log('[DEBUG] Game mode set to: free');
        currentDifficultyName = DEFAULT_SETTINGS.custom.name;
        rowsInput = document.getElementById('rows-input');
        colsInput = document.getElementById('cols-input');
        minesInput = document.getElementById('mines-input');
        if (rowsInput) rowsInput.value = DEFAULT_SETTINGS.custom.rows;
        if (colsInput) colsInput.value = DEFAULT_SETTINGS.custom.cols;
        if (minesInput) minesInput.value = DEFAULT_SETTINGS.custom.mines;
        console.log('[DEBUG] Free mode inputs obtained and set to default:', rowsInput, colsInput, minesInput);
    } else if (path.includes("tutorial.html") || path.includes("tutorial_level")) {
        CURRENT_GAME_MODE = 'tutorial';
        console.log('[DEBUG] Game mode set to: tutorial');
        return;
    } else if (path === "" || path === "index.html") {
        CURRENT_GAME_MODE = 'home';
        console.log('[DEBUG] Game mode set to: home');
        return;
    }
    else {
        console.warn('[DEBUG] Unknown page, not initializing game logic for path:', path);
        return;
    }

    if (playerNameInput) playerNameInput.value = playerName;

    if (resetButton) {
        resetButton.addEventListener('click', setupGame);
    }
    setupGame(true); // 傳入 true 表示是初始載入
}


/**
 * 從輸入欄位讀取並驗證遊戲設定 (根據當前模式)
 * @returns {boolean} 如果設定有效且不需要顯示警告，則返回 true；如果顯示了警告，則返回 false。
 */
function updateGameSettings() {
    console.log('[DEBUG] updateGameSettings called. CURRENT_GAME_MODE:', CURRENT_GAME_MODE);
    if (playerNameInput && playerNameInput.value.trim() !== "") {
        playerName = playerNameInput.value.trim();
    } else {
        playerName = "匿名玩家";
        if (playerNameInput) playerNameInput.value = playerName;
    }

    let settingsAreGoodAndNoAlertsShown = true;

    if (CURRENT_GAME_MODE === 'ranked') {
        let selectedDifficulty = 'easy';
        if (rankedDifficultyRadios) {
            rankedDifficultyRadios.forEach(radio => {
                if (radio.checked) {
                    selectedDifficulty = radio.value;
                }
            });
        }
        const level = DEFAULT_SETTINGS[selectedDifficulty];
        CURRENT_ROWS = level.rows;
        CURRENT_COLS = level.cols;
        CURRENT_MINES = level.mines;
        currentDifficultyName = level.name;
    } else if (CURRENT_GAME_MODE === 'free') {
        currentDifficultyName = "自訂";
        if (!rowsInput || !colsInput || !minesInput) {
            console.error("[DEBUG] 自由模式輸入框未找到！將使用預設自訂設定。");
            showAlert("無法讀取自訂設定輸入框，已使用預設『自訂』設定。", "danger", 7000);
            CURRENT_ROWS = DEFAULT_SETTINGS.custom.rows;
            CURRENT_COLS = DEFAULT_SETTINGS.custom.cols;
            CURRENT_MINES = DEFAULT_SETTINGS.custom.mines;
            return false;
        }
        let parsedRows = parseInt(rowsInput.value);
        let parsedCols = parseInt(colsInput.value);
        let parsedMines = parseInt(minesInput.value);

        console.log('[DEBUG] Free mode raw values - Rows:', rowsInput.value, 'Cols:', colsInput.value, 'Mines:', minesInput.value);
        console.log('[DEBUG] Free mode parsed values - Rows:', parsedRows, 'Cols:', parsedCols, 'Mines:', parsedMines);

        let localSettingsValid = true;
        let validationMessage = "";

        if (isNaN(parsedRows) || parsedRows < 5 || parsedRows > 24) {
            parsedRows = DEFAULT_SETTINGS.custom.rows;
            if (rowsInput) rowsInput.value = parsedRows;
            validationMessage += `行數無效 (範圍 5-24)，已重設為 ${parsedRows}。<br>`;
            localSettingsValid = false;
        }
        if (isNaN(parsedCols) || parsedCols < 5 || parsedCols > 30) {
            parsedCols = DEFAULT_SETTINGS.custom.cols;
            if (colsInput) colsInput.value = parsedCols;
            validationMessage += `列數無效 (範圍 5-30)，已重設為 ${parsedCols}。<br>`;
            localSettingsValid = false;
        }

        CURRENT_ROWS = parsedRows;
        CURRENT_COLS = parsedCols;
        const currentTotalCells = CURRENT_ROWS * CURRENT_COLS;

        let minSafeCells = 1;
        if (currentTotalCells > 9) {
            minSafeCells = 9;
        } else if (currentTotalCells > 0) {
            minSafeCells = 1;
        } else {
            minSafeCells = 0;
        }

        const maxMines = currentTotalCells > 0 ? currentTotalCells - minSafeCells : 0;
        console.log(`[DEBUG] Calculated for free mode: totalCells=${currentTotalCells}, minSafeCells=${minSafeCells}, maxMines=${maxMines}`);

        if (isNaN(parsedMines) || parsedMines < (currentTotalCells > 0 ? 1 : 0) || (currentTotalCells > 0 && parsedMines > maxMines)) {
            let originalMinesInput = minesInput.value;
            if (currentTotalCells === 0) {
                parsedMines = 0;
            } else {
                parsedMines = Math.min(DEFAULT_SETTINGS.custom.mines, maxMines > 0 ? maxMines : 1);
                if (parsedMines < 1 && currentTotalCells > 0 && maxMines >= 1) parsedMines = 1;
                else if (maxMines < 1 && currentTotalCells > 0) parsedMines = (currentTotalCells > 0 ? 1 : 0);
            }

            if (minesInput) minesInput.value = parsedMines;
            const displayMinMines = currentTotalCells > 0 ? 1 : 0;
            const displayMaxMines = maxMines > 0 ? maxMines : displayMinMines;
            validationMessage += `地雷數 "${originalMinesInput}" 無效 (允許範圍 ${displayMinMines}-${displayMaxMines})，已重設為 ${parsedMines}。<br>`;
            localSettingsValid = false;
        }
        CURRENT_MINES = parsedMines;

        if (!localSettingsValid && validationMessage) {
            showAlert(validationMessage, "warning", 7000);
            settingsAreGoodAndNoAlertsShown = false;
        }
    } else {
        CURRENT_ROWS = DEFAULT_SETTINGS.easy.rows;
        CURRENT_COLS = DEFAULT_SETTINGS.easy.cols;
        CURRENT_MINES = DEFAULT_SETTINGS.easy.mines;
        currentDifficultyName = DEFAULT_SETTINGS.easy.name;
    }
    console.log('[DEBUG] Final settings - Rows:', CURRENT_ROWS, 'Cols:', CURRENT_COLS, 'Mines:', CURRENT_MINES);
    return settingsAreGoodAndNoAlertsShown;
}

/**
 * 設定或重置遊戲板 (核心邏輯)
 * @param {boolean} [isInitialLoad=false] - 是否為頁面初始載入時的調用
 */
function setupGame(isInitialLoad = false) {
    if (CURRENT_GAME_MODE === 'tutorial') {
        return;
    }
    if (!gameBoardElement) {
        console.warn('[DEBUG] Game board element not found, skipping setupGame.');
        return;
    }

    stopTimer();
    elapsedTime = 0;
    updateTimerDisplay();

    if (alertPlaceholder && !isInitialLoad) { // 只在非初始載入時主動清除 alert (因為 updateGameSettings 可能已經顯示了)
        alertPlaceholder.innerHTML = '';
    } else if (isInitialLoad && alertPlaceholder) {
        alertPlaceholder.innerHTML = ''; // 初始載入也清除一下，確保乾淨
    }


    const settingsAreGood = updateGameSettings();

    board = [];
    revealedCellsCount = 0;
    flagsPlaced = 0;
    gameOver = false;
    firstClick = true;

    if (minesCountElement) minesCountElement.textContent = CURRENT_MINES;
    gameBoardElement.innerHTML = '';

    const colsForGrid = (typeof CURRENT_COLS === 'number' && CURRENT_COLS > 0) ? CURRENT_COLS : DEFAULT_SETTINGS.custom.cols;
    gameBoardElement.style.gridTemplateColumns = `repeat(${colsForGrid}, 32px)`;

    const rowsToGenerate = (typeof CURRENT_ROWS === 'number' && CURRENT_ROWS > 0) ? CURRENT_ROWS : DEFAULT_SETTINGS.custom.rows;
    const colsToGenerate = (typeof CURRENT_COLS === 'number' && CURRENT_COLS > 0) ? CURRENT_COLS : DEFAULT_SETTINGS.custom.cols;

    for (let r = 0; r < rowsToGenerate; r++) {
        const row = [];
        for (let c = 0; c < colsToGenerate; c++) {
            const cellData = { r, c, isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0 };
            row.push(cellData);
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.row = r;
            cellElement.dataset.col = c;
            cellElement.addEventListener('click', handleCellClick);
            cellElement.addEventListener('contextmenu', handleCellRightClick);
            gameBoardElement.appendChild(cellElement);
        }
        board.push(row);
    }

    if (settingsAreGood && !isInitialLoad && (CURRENT_GAME_MODE === 'ranked' || CURRENT_GAME_MODE === 'free')) {
        showAlert(`${currentDifficultyName} 模式準備就緒！點擊格子開始。`, "info", 3000);
    } else if (!settingsAreGood) {
        console.log("[DEBUG] Settings were not good after updateGameSettings, 'Ready' alert skipped.");
    }
}

// --- 計時器函數 ---
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = performance.now();
    elapsedTime = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        if (!gameOver) {
            elapsedTime = performance.now() - startTime;
        }
        updateTimerDisplay();
    }, 47);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    if (startTime > 0) {
        elapsedTime = performance.now() - startTime;
    }
    updateTimerDisplay();
}

function updateTimerDisplay() {
    if (timerElement) {
        const seconds = (elapsedTime / 1000).toFixed(3);
        timerElement.textContent = `${seconds}s`;
    }
}

// --- 佈雷與計算邏輯 ---
function placeMines(firstClickR, firstClickC) {
    let minesPlacedCount = 0;
    const totalCells = CURRENT_ROWS * CURRENT_COLS;

    if (totalCells > 0 && CURRENT_MINES >= totalCells) {
        showAlert(`地雷數量 (${CURRENT_MINES}) 等於或超過總格子數 (${totalCells})，遊戲無法開始。請重新設定。`, "danger", 7000);
        gameOver = true; stopTimer(); return;
    }
    if (totalCells === 1 && CURRENT_MINES > 0) {
        showAlert(`無法在 1x1 的遊戲板上為第一次點擊保留安全格來放置 ${CURRENT_MINES} 個地雷。`, "danger", 7000);
        gameOver = true; stopTimer(); return;
    }
    if (CURRENT_MINES === 0) {
        if (totalCells > 0) calculateAdjacentMines();
        return;
    }

    const possibleMineLocations = [];
    for (let r = 0; r < CURRENT_ROWS; r++) {
        for (let c = 0; c < CURRENT_COLS; c++) {
            if (r !== firstClickR || c !== firstClickC) {
                possibleMineLocations.push({ r, c });
            }
        }
    }

    if (possibleMineLocations.length < CURRENT_MINES) {
        showAlert(`可佈雷的位置 (${possibleMineLocations.length}) 少於設定的地雷數 (${CURRENT_MINES})。這通常發生在極小的遊戲板。請調整設定。`, "danger", 7000);
        gameOver = true; stopTimer(); return;
    }

    for (let i = possibleMineLocations.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [possibleMineLocations[i], possibleMineLocations[j]] = [possibleMineLocations[j], possibleMineLocations[i]];
    }

    for (let i = 0; i < CURRENT_MINES; i++) {
        const loc = possibleMineLocations[i];
        if (board[loc.r] && board[loc.r][loc.c]) {
            board[loc.r][loc.c].isMine = true;
            minesPlacedCount++;
        } else {
            console.error(`[ERROR] placeMines: Attempted to place mine at invalid board location: (${loc.r}, ${loc.c})`);
        }
    }

    if (minesPlacedCount < CURRENT_MINES) {
        console.error(`[嚴重錯誤] 未能放置所有地雷。預期: ${CURRENT_MINES}, 實際放置: ${minesPlacedCount}. 這不應該發生，請檢查佈雷邏輯。`);
        showAlert(`佈雷時發生內部錯誤，未能放置所有地雷。遊戲可能無法正常進行。`, "danger", 7000);
        // gameOver = true; // 考慮是否在此結束遊戲
        // stopTimer();
        // return; // 根據遊戲設計決定是否因佈雷不完整而停止
    }

    calculateAdjacentMines();
}

function calculateAdjacentMines() {
    for (let r = 0; r < CURRENT_ROWS; r++) {
        for (let c = 0; c < CURRENT_COLS; c++) {
            if (!board[r] || !board[r][c] || board[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr; const nc = c + dc;
                    if (nr >= 0 && nr < CURRENT_ROWS && nc >= 0 && nc < CURRENT_COLS) {
                        if (board[nr] && board[nr][nc] && board[nr][nc].isMine) {
                            count++;
                        }
                    }
                }
            }
            board[r][c].adjacentMines = count;
        }
    }
}

function calculateFloodFillCells(startR, startC, cellsToRevealSet) {
    const queue = [];
    const visitedInThisCalc = new Set();
    if (startR < 0 || startR >= CURRENT_ROWS || startC < 0 || startC >= CURRENT_COLS) return;
    if (!board[startR] || !board[startR][startC]) {
        console.error(`[FloodFill] 無效的起始座標或 board 未初始化: (${startR}, ${startC})`);
        return;
    }
    const startCellData = board[startR][startC];

    if (startCellData.isRevealed || startCellData.isFlagged || startCellData.isMine) return;
    queue.push({ r: startR, c: startC });
    visitedInThisCalc.add(`${startR},${startC}`);
    while (queue.length > 0) {
        const { r, c } = queue.shift();
        const cellKey = `${r},${c}`;
        cellsToRevealSet.add(cellKey);
        if (!board[r] || !board[r][c]) continue;
        const currentCellData = board[r][c];
        if (currentCellData.adjacentMines > 0) continue;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr; const nc = c + dc;
                const neighborKey = `${nr},${nc}`;
                if (nr >= 0 && nr < CURRENT_ROWS && nc >= 0 && nc < CURRENT_COLS && !visitedInThisCalc.has(neighborKey)) {
                    if (!board[nr] || !board[nr][nc]) continue;
                    const neighborCellData = board[nr][nc];
                    if (!neighborCellData.isRevealed && !neighborCellData.isFlagged && !neighborCellData.isMine) {
                        visitedInThisCalc.add(neighborKey);
                        if (neighborCellData.adjacentMines === 0) {
                            queue.push({ r: nr, c: nc });
                        } else {
                            cellsToRevealSet.add(neighborKey);
                        }
                    }
                }
            }
        }
    }
}

// --- 事件處理函數 ---
function handleCellClick(event) {
    if (gameOver || CURRENT_GAME_MODE === 'tutorial' || !gameBoardElement) return;

    const cellElement = event.target;
    if (!cellElement.classList.contains('cell')) return;

    const r = parseInt(cellElement.dataset.row);
    const c = parseInt(cellElement.dataset.col);
    if (isNaN(r) || isNaN(c) || r < 0 || r >= CURRENT_ROWS || c < 0 || c >= CURRENT_COLS || !board[r] || !board[r][c]) {
        console.error("無效的格子座標或 board 資料錯誤:", r, c);
        return;
    }
    const cellData = board[r][c];

    if (firstClick && !cellData.isRevealed && !cellData.isFlagged) {
        startTimer();
        placeMines(r, c);
        if (gameOver) {
            return;
        }
        firstClick = false;
    }

    if (cellData.isRevealed && cellData.adjacentMines > 0) { // Chord
        let neighborFlagsCount = 0;
        const neighborsToChord = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr; const nc = c + dc;
                if (nr >= 0 && nr < CURRENT_ROWS && nc >= 0 && nc < CURRENT_COLS) {
                    if (!board[nr] || !board[nr][nc]) continue;
                    if (board[nr][nc].isFlagged) neighborFlagsCount++;
                    if (!board[nr][nc].isRevealed && !board[nr][nc].isFlagged) neighborsToChord.push({ r: nr, c: nc });
                }
            }
        }
        if (neighborFlagsCount === cellData.adjacentMines) {
            const cellsToEffectivelyReveal = new Set();
            let hitMineInChord = false;
            for (const neighbor of neighborsToChord) {
                const nr = neighbor.r; const nc = neighbor.c;
                if (!board[nr] || !board[nr][nc]) continue;
                const neighborCellData = board[nr][nc];
                const neighborCellElement = document.querySelector(`.cell[data-row='${nr}'][data-col='${nc}']`);
                if (neighborCellData.isMine) {
                    neighborCellData.isRevealed = true;
                    if (neighborCellElement) { neighborCellElement.classList.add('revealed', 'mine'); neighborCellElement.textContent = '💣'; }
                    revealAllMines(false); showAlert(`GAME OVER! ${playerName} 在擴展時踩到地雷了！ ☠️`, "danger");
                    gameOver = true;
                    stopTimer();
                    hitMineInChord = true; break;
                }
                if (neighborCellData.adjacentMines === 0) calculateFloodFillCells(nr, nc, cellsToEffectivelyReveal);
                else cellsToEffectivelyReveal.add(`${nr},${nc}`);
            }
            if (hitMineInChord) return;
            for (const cellKey of cellsToEffectivelyReveal) {
                const [row, col] = cellKey.split(',').map(Number);
                if (!board[row] || !board[row][col]) continue;
                const currentAffectedCellData = board[row][col];
                const currentAffectedCellElement = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
                if (currentAffectedCellElement && !currentAffectedCellData.isRevealed && !currentAffectedCellData.isFlagged && !currentAffectedCellData.isMine) {
                    currentAffectedCellData.isRevealed = true; currentAffectedCellElement.classList.add('revealed'); revealedCellsCount++;
                    if (currentAffectedCellData.adjacentMines > 0) { currentAffectedCellElement.textContent = currentAffectedCellData.adjacentMines; currentAffectedCellElement.dataset.count = currentAffectedCellData.adjacentMines; }
                }
            }
            checkWinCondition();
        }
        return;
    }

    if (cellData.isRevealed || cellData.isFlagged) return;

    if (cellData.isMine) {
        cellData.isRevealed = true; cellElement.classList.add('revealed', 'mine'); cellElement.textContent = '💣';
        revealAllMines(false); showAlert(`GAME OVER! ${playerName} 踩到地雷了！ ☠️`, "danger");
        gameOver = true;
        stopTimer();
        return;
    }
    const cellsToEffectivelyReveal = new Set();
    if (cellData.adjacentMines > 0) {
        if (!cellData.isRevealed) cellsToEffectivelyReveal.add(`${r},${c}`);
    } else {
        calculateFloodFillCells(r, c, cellsToEffectivelyReveal);
    }
    for (const cellKey of cellsToEffectivelyReveal) {
        const [row, col] = cellKey.split(',').map(Number);
        if (!board[row] || !board[row][col]) continue;
        const currentAffectedCellData = board[row][col];
        const currentAffectedCellElement = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
        if (currentAffectedCellElement && !currentAffectedCellData.isRevealed && !currentAffectedCellData.isFlagged && !currentAffectedCellData.isMine) {
            currentAffectedCellData.isRevealed = true; currentAffectedCellElement.classList.add('revealed'); revealedCellsCount++;
            if (currentAffectedCellData.adjacentMines > 0) { currentAffectedCellElement.textContent = currentAffectedCellData.adjacentMines; currentAffectedCellElement.dataset.count = currentAffectedCellData.adjacentMines; }
        }
    }
    checkWinCondition();
}

function handleCellRightClick(event) {
    event.preventDefault();
    if (gameOver || firstClick || CURRENT_GAME_MODE === 'tutorial' || !gameBoardElement) return;

    const cellElement = event.target;
    if (!cellElement.classList.contains('cell')) return;

    const r = parseInt(cellElement.dataset.row);
    const c = parseInt(cellElement.dataset.col);
    if (isNaN(r) || isNaN(c) || r < 0 || r >= CURRENT_ROWS || c < 0 || c >= CURRENT_COLS || !board[r] || !board[r][c]) return;
    const cellData = board[r][c];
    if (cellData.isRevealed) return;

    if (cellData.isFlagged) {
        cellData.isFlagged = false; cellElement.classList.remove('flagged'); cellElement.textContent = ''; flagsPlaced--;
    } else {
        if (flagsPlaced < CURRENT_MINES) {
            cellData.isFlagged = true; cellElement.classList.add('flagged'); flagsPlaced++;
        } else {
            showAlert("旗子數量已達上限！", "warning", 2000);
        }
    }
    if (minesCountElement) minesCountElement.textContent = CURRENT_MINES - flagsPlaced;
}

// --- 遊戲結束與分數提交 ---
function revealAllMines(isWin) {
    if (!gameBoardElement) return;
    for (let r_idx = 0; r_idx < CURRENT_ROWS; r_idx++) {
        for (let c_idx = 0; c_idx < CURRENT_COLS; c_idx++) {
            if (!board[r_idx] || !board[r_idx][c_idx]) continue;
            const cellData = board[r_idx][c_idx];
            const cellElement = document.querySelector(`.cell[data-row='${r_idx}'][data-col='${c_idx}']`);
            if (cellElement) {
                if (cellData.isMine) {
                    if (cellData.isFlagged) { cellElement.classList.add('revealed'); }
                    else { cellElement.classList.add('revealed', 'mine'); cellElement.textContent = '💣'; }
                } else if (cellData.isFlagged && !cellData.isMine) {
                    cellElement.classList.add('revealed', 'wrong-flag'); cellElement.classList.remove('flagged'); cellElement.textContent = '❌';
                } else if (!cellData.isRevealed) {
                    cellElement.classList.add('revealed');
                    if (cellData.adjacentMines > 0) { cellElement.textContent = cellData.adjacentMines; cellElement.dataset.count = cellData.adjacentMines; }
                }
            }
        }
    }
}
function checkWinCondition() {
    if (!gameBoardElement) return;
    let won = false;
    const totalCells = CURRENT_ROWS * CURRENT_COLS;

    // 確保 totalCells 大於 0 才進行後續判斷，避免 0/0 的情況
    if (totalCells === 0) {
        // 如果是 0x0 的板子，可以視為立即勝利或不處理 (取決於遊戲設計)
        // 目前，如果 totalCells 為 0，下面的條件都不會滿足 won
        // 可以考慮如果 totalCells === 0 && CURRENT_MINES === 0，則 won = true;
        if (CURRENT_MINES === 0) {
            // won = true; // 0x0 板子，0個雷，可以視為勝利
        }
    } else if (CURRENT_MINES === 0 && revealedCellsCount === totalCells) { // 無雷模式
        won = true;
    } else if (CURRENT_MINES > 0 && revealedCellsCount === (totalCells - CURRENT_MINES)) { // 有雷模式
        won = true;
    }


    if (won) {
        gameOver = true;
        stopTimer();
        if (minesCountElement) minesCountElement.textContent = '🎉';

        const finalTimeMilliseconds = Math.round(elapsedTime);
        const finalTimeSecondsDisplay = (elapsedTime / 1000).toFixed(3);
        const message = `恭喜 ${playerName}！您以 ${finalTimeSecondsDisplay} 秒完成了 ${currentDifficultyName} 模式！ 🎉`;

        showAlert(message, "success");
        revealAllMines(true);
        if (CURRENT_GAME_MODE === 'ranked') {
            submitScoreToBackend(playerName, finalTimeMilliseconds, currentDifficultyName);
        }
    }
}

async function submitScoreToBackend(name, time, difficulty) {
    console.log('submitScoreToBackend received time (ms):', time);
    const scoreData = {
        playerName: name,
        timeTaken: time,
        difficultyLevel: difficulty,
        timestamp: new Date().toISOString()
    };

    console.log("準備提交分數 (排名模式):", scoreData);
    const timeInSecondsForDisplay = (time / 1000).toFixed(3);
    showAlert(`正在嘗試提交分數: ${name} - ${timeInSecondsForDisplay}s (${difficulty})...`, "info");

    const backendUrl = 'https://minesweeperproject0606-hcemaga7hqf9h9cf.eastasia-01.azurewebsites.net';
    try {
        const response = await fetch(`${backendUrl}/api/submit-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scoreData),
        });

        if (response.ok) {
            const result = await response.json();
            console.log('分數提交成功:', result);
            showAlert('分數已成功上傳到排行榜！', 'success', 5000);
        } else {
            const errorData = await response.text();
            console.error('分數提交失敗 - HTTP 錯誤:', response.status, errorData);
            showAlert(`分數上傳失敗 (錯誤碼: ${response.status})。請稍後再試。`, 'danger', 7000);
        }
    } catch (error) {
        console.error('分數提交時發生網路或執行錯誤:', error);
        showAlert('分數上傳時發生錯誤，請檢查您的網路連線或稍後再試。', 'danger', 7000);
    }
}


// --- 提示訊息函數 ---
function showAlert(message, type = 'info', duration = 0) {
    console.log('[DEBUG] showAlert CALLED. Message:', message, 'Type:', type, 'Duration:', duration);
    if (!alertPlaceholder) {
        console.error('[DEBUG] showAlert: alertPlaceholder is NULL or UNDEFINED in the current HTML page. Cannot display alert.');
        return;
    }
    console.log('[DEBUG] showAlert: alertPlaceholder found:', alertPlaceholder);

    alertPlaceholder.innerHTML = '';
    const wrapper = document.createElement('div');
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('');
    alertPlaceholder.appendChild(wrapper);
    console.log(`[DEBUG] showAlert: Bootstrap alert HTML appended to alertPlaceholder. Alert ID: ${alertId}`);

    const alertElementForBootstrap = document.getElementById(alertId);
    if (alertElementForBootstrap && typeof bootstrap !== 'undefined' && bootstrap.Alert) {
        try {
            let alertInstance = bootstrap.Alert.getInstance(alertElementForBootstrap);
            if (!alertInstance) {
                console.log('[DEBUG] showAlert: No Bootstrap alert instance found, creating new one.');
                alertInstance = new bootstrap.Alert(alertElementForBootstrap);
            } else {
                console.log('[DEBUG] showAlert: Existing Bootstrap alert instance found.');
            }
        } catch (e) {
            console.error('[DEBUG] showAlert: Error initializing Bootstrap alert instance:', e);
        }
    } else {
        console.warn('[DEBUG] showAlert: Bootstrap JS or bootstrap.Alert not available, or alertElementForBootstrap not found. Dismiss button might not work via JS.');
    }

    if (duration > 0) {
        setTimeout(() => {
            const alertToDismiss = document.getElementById(alertId);
            if (alertToDismiss) {
                console.log(`[DEBUG] showAlert: Attempting to dismiss alert ${alertId} after ${duration}ms`);
                if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                    const alertInstance = bootstrap.Alert.getInstance(alertToDismiss);
                    if (alertInstance) {
                        alertInstance.close();
                        console.log(`[DEBUG] showAlert: Bootstrap alert ${alertId} closed via instance.`);
                    } else {
                        alertToDismiss.classList.remove('show');
                        setTimeout(() => {
                            if (alertToDismiss.parentNode) {
                                alertToDismiss.parentNode.removeChild(alertToDismiss);
                                console.log(`[DEBUG] showAlert: Alert ${alertId} removed from DOM (fallback).`);
                            }
                        }, 150);
                    }
                } else {
                    alertToDismiss.style.display = 'none';
                    if (alertToDismiss.parentNode) {
                        alertToDismiss.parentNode.removeChild(alertToDismiss);
                        console.log(`[DEBUG] showAlert: Alert ${alertId} hidden/removed (Bootstrap JS not available).`);
                    }
                }
            } else {
                console.warn(`[DEBUG] showAlert: Alert ${alertId} not found for dismissal.`);
            }
        }, duration);
    }
}

document.addEventListener('DOMContentLoaded', initializePage);
