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
let startTime = 0; // 儲存計時開始的時間戳 (毫秒) - New
let elapsedTime = 0; // 儲存經過的毫秒數 - New (取代 secondsElapsed)


// DOM 元素選擇 (通用元素)
const alertPlaceholder = document.getElementById('alert-placeholder');
const playerNameInput = document.getElementById('player-name');
const resetButton = document.getElementById('reset-button'); // "開始遊戲" 按鈕

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

    if (path.includes("ranked.html")) {
        CURRENT_GAME_MODE = 'ranked';
        currentDifficultyName = DEFAULT_SETTINGS.easy.name; // 預設
        rankedDifficultyRadios = document.querySelectorAll('input[name="ranked-difficulty"]');
        const easyRadio = document.getElementById('diff-easy');
        if (easyRadio) easyRadio.checked = true; // 預設選中簡單
        // 監聽排名模式難度選擇變化
        if (rankedDifficultyRadios) {
            rankedDifficultyRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    // 選擇難度後可以選擇立即重設遊戲板預覽，或等待"開始遊戲"按鈕
                    updateGameSettings(); // 如果希望即時更新設定
                    setupGame(); // 如果希望立即重設遊戲
                });
            });
        }
    } else if (path.includes("free.html")) {
        CURRENT_GAME_MODE = 'free';
        currentDifficultyName = DEFAULT_SETTINGS.custom.name;
        rowsInput = document.getElementById('rows-input');
        colsInput = document.getElementById('cols-input');
        minesInput = document.getElementById('mines-input');
        if (rowsInput) rowsInput.value = DEFAULT_SETTINGS.custom.rows;
        if (colsInput) colsInput.value = DEFAULT_SETTINGS.custom.cols;
        if (minesInput) minesInput.value = DEFAULT_SETTINGS.custom.mines;
    } else if (path.includes("tutorial.html")) {
        CURRENT_GAME_MODE = 'tutorial';
        // 教學模式目前無特殊JS初始化
        return; // 教學模式不執行後續遊戲設定
    } else {
        // 可能在 index.html 或未知頁面，不執行遊戲邏輯
        return;
    }

    if (playerNameInput) playerNameInput.value = playerName;

    if (resetButton) { // 只有遊戲頁面有重設按鈕
        resetButton.addEventListener('click', setupGame);
    }
    setupGame(); // 頁面載入時準備好遊戲板 (但不開始計時)
}


/**
 * 從輸入欄位讀取並驗證遊戲設定 (根據當前模式)
 */
function updateGameSettings() {
    // 讀取玩家名稱 (所有遊戲模式共用)
    if (playerNameInput && playerNameInput.value.trim() !== "") {
        playerName = playerNameInput.value.trim();
    } else {
        playerName = "匿名玩家";
        if (playerNameInput) playerNameInput.value = playerName;
    }

    if (CURRENT_GAME_MODE === 'ranked') {
        let selectedDifficulty = 'easy'; // 預設
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
        let newRows = parseInt(rowsInput.value);
        let newCols = parseInt(colsInput.value);
        let newMines = parseInt(minesInput.value);
        let settingsValid = true;
        let validationMessage = "";

        if (isNaN(newRows) || newRows < 5 || newRows > 24) {
            newRows = DEFAULT_SETTINGS.custom.rows;
            if (rowsInput) rowsInput.value = newRows;
            validationMessage += "行數無效 (5-24)，已重設。<br>";
            settingsValid = false;
        }
        if (isNaN(newCols) || newCols < 5 || newCols > 30) {
            newCols = DEFAULT_SETTINGS.custom.cols;
            if (colsInput) colsInput.value = newCols;
            validationMessage += "列數無效 (5-30)，已重設。<br>";
            settingsValid = false;
        }
        const maxMines = newRows * newCols - 9;
        if (isNaN(newMines) || newMines < 1 || newMines > maxMines) {
            newMines = Math.min(DEFAULT_SETTINGS.custom.mines, maxMines > 0 ? maxMines : 1);
            if (maxMines <= 0 && newRows * newCols > 0) newMines = 1;
            else if (maxMines <= 0) newMines = 0;
            if (minesInput) minesInput.value = newMines;
            validationMessage += `地雷數無效 (1-${maxMines > 0 ? maxMines : (newRows * newCols > 0 ? 1 : 0)})，已重設。<br>`;
            settingsValid = false;
        }
        CURRENT_ROWS = newRows;
        CURRENT_COLS = newCols;
        CURRENT_MINES = newMines;
        if (!settingsValid && validationMessage) {

            console.log('Free mode validation - settingsValid:', settingsValid, 'validationMessage:', validationMessage); // 新增日誌

            showAlert(validationMessage, "warning", 7000);
        }
    } else { // 預設情況或未知模式
        CURRENT_ROWS = DEFAULT_SETTINGS.easy.rows;
        CURRENT_COLS = DEFAULT_SETTINGS.easy.cols;
        CURRENT_MINES = DEFAULT_SETTINGS.easy.mines;
        currentDifficultyName = DEFAULT_SETTINGS.easy.name;
    }
}

/**
 * 設定或重置遊戲板 (核心邏輯)
 */
function setupGame() {
    if (CURRENT_GAME_MODE === 'tutorial') {
        // 教學模式不執行實際的遊戲設定
        // showAlert("教學內容準備中...", "info"); // 這個提示可以在 tutorial.html 中靜態顯示
        return;
    }
    if (!gameBoardElement) return; // 如果頁面上沒有遊戲板元素，則不繼續

    stopTimer();
    elapsedTime = 0; // 重設 elapsedTime
    updateTimerDisplay(); // 更新計時器顯示為0

    if (alertPlaceholder) alertPlaceholder.innerHTML = '';

    updateGameSettings();

    board = [];
    revealedCellsCount = 0;
    flagsPlaced = 0;
    gameOver = false;
    firstClick = true;

    if (minesCountElement) minesCountElement.textContent = CURRENT_MINES;
    gameBoardElement.innerHTML = '';
    gameBoardElement.style.gridTemplateColumns = `repeat(${CURRENT_COLS}, 32px)`;

    for (let r = 0; r < CURRENT_ROWS; r++) {
        const row = [];
        for (let c = 0; c < CURRENT_COLS; c++) {
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
    if (CURRENT_GAME_MODE === 'ranked' || CURRENT_GAME_MODE === 'free') {
        showAlert(`${currentDifficultyName} 模式準備就緒！點擊格子開始。`, "info", 3000);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = performance.now(); // 使用 performance.now() 獲取高精度起始時間
    elapsedTime = 0;
    updateTimerDisplay(); // 立即顯示 0.000s
    timerInterval = setInterval(() => {
        if (!gameOver) { // 只有在遊戲未結束時才更新 elapsedTime
            elapsedTime = performance.now() - startTime; // 計算經過的毫秒數
        }
        updateTimerDisplay();
    }, 47); // 更新顯示的頻率，例如約每秒20次 (不需要太頻繁，以免影響效能)
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    if (startTime > 0) { // 只有在計時器啟動後才更新最終 elapsedTime
        elapsedTime = performance.now() - startTime;
    }
    updateTimerDisplay();
}

function updateTimerDisplay() {
    if (timerElement) {
        // 將毫秒轉換為秒，並保留3位小數
        const seconds = (elapsedTime / 1000).toFixed(3);
        timerElement.textContent = `${seconds}s`;
    }
}

// --- 佈雷與計算邏輯 (與之前版本類似，使用 CURRENT_ 變數) ---
function placeMines(firstClickR, firstClickC) {
    let minesPlacedCount = 0;
    if (CURRENT_MINES >= CURRENT_ROWS * CURRENT_COLS && CURRENT_ROWS * CURRENT_COLS > 0) {
        showAlert("地雷數量過多，無法開始遊戲！", "danger");
        gameOver = true; stopTimer(); return;
    }
    if (CURRENT_MINES === 0 && CURRENT_ROWS * CURRENT_COLS > 0) {
        calculateAdjacentMines(); return;
    }
    let attempts = 0;
    const maxAttempts = CURRENT_ROWS * CURRENT_COLS * 5;
    while (minesPlacedCount < CURRENT_MINES && attempts < maxAttempts) {
        const r = Math.floor(Math.random() * CURRENT_ROWS);
        const c = Math.floor(Math.random() * CURRENT_COLS);
        attempts++;
        if (!(r === firstClickR && c === firstClickC) && !board[r][c].isMine) {
            board[r][c].isMine = true;
            minesPlacedCount++;
        }
    }
    if (minesPlacedCount < CURRENT_MINES && CURRENT_ROWS * CURRENT_COLS > 1) {
        for (let r_fill = 0; r_fill < CURRENT_ROWS && minesPlacedCount < CURRENT_MINES; r_fill++) {
            for (let c_fill = 0; c_fill < CURRENT_COLS && minesPlacedCount < CURRENT_MINES; c_fill++) {
                if (!(r_fill === firstClickR && c_fill === firstClickC) && !board[r_fill][c_fill].isMine) {
                    board[r_fill][c_fill].isMine = true; minesPlacedCount++;
                }
            }
        }
    }
    calculateAdjacentMines();
}

function calculateAdjacentMines() {
    for (let r = 0; r < CURRENT_ROWS; r++) {
        for (let c = 0; c < CURRENT_COLS; c++) {
            if (board[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr; const nc = c + dc;
                    if (nr >= 0 && nr < CURRENT_ROWS && nc >= 0 && nc < CURRENT_COLS && board[nr][nc].isMine) {
                        count++;
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
    const startCellData = board[startR][startC];
    if (startCellData.isRevealed || startCellData.isFlagged || startCellData.isMine) return;
    queue.push({ r: startR, c: startC });
    visitedInThisCalc.add(`${startR},${startC}`);
    while (queue.length > 0) {
        const { r, c } = queue.shift();
        const cellKey = `${r},${c}`;
        cellsToRevealSet.add(cellKey);
        const currentCellData = board[r][c];
        if (currentCellData.adjacentMines > 0) continue;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr; const nc = c + dc;
                const neighborKey = `${nr},${nc}`;
                if (nr >= 0 && nr < CURRENT_ROWS && nc >= 0 && nc < CURRENT_COLS && !visitedInThisCalc.has(neighborKey)) {
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

// --- 事件處理函數 (handleCellClick, handleCellRightClick) ---
function handleCellClick(event) {
    if (gameOver || CURRENT_GAME_MODE === 'tutorial' || !gameBoardElement) return;

    const cellElement = event.target;
    const r = parseInt(cellElement.dataset.row);
    const c = parseInt(cellElement.dataset.col);
    if (r < 0 || r >= CURRENT_ROWS || c < 0 || c >= CURRENT_COLS) return;
    const cellData = board[r][c];

    if (firstClick && !cellData.isRevealed && !cellData.isFlagged) {
        startTimer();
        placeMines(r, c);
        if (gameOver) { // gameOver 可能在 placeMines 中因地雷過多而設為 true
            // stopTimer() 已在 placeMines 的 gameOver 條件中呼叫
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
    const r = parseInt(cellElement.dataset.row);
    const c = parseInt(cellElement.dataset.col);
    if (r < 0 || r >= CURRENT_ROWS || c < 0 || c >= CURRENT_COLS) return;
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
    if (CURRENT_MINES === 0 && revealedCellsCount === CURRENT_ROWS * CURRENT_COLS && CURRENT_ROWS * CURRENT_COLS > 0) {
        won = true;
    } else if (CURRENT_MINES > 0 && revealedCellsCount === (CURRENT_ROWS * CURRENT_COLS) - CURRENT_MINES) {
        won = true;
    }

    if (won) {
        gameOver = true;
        stopTimer();
        if (minesCountElement) minesCountElement.textContent = '🎉';

        const finalTimeSeconds = (elapsedTime / 1000).toFixed(3); // 獲取最終的精確時間 (秒)
        const message = `恭喜 ${playerName}！您以 ${finalTimeSeconds} 秒完成了 ${currentDifficultyName} 模式！ 🎉`;

        showAlert(message, "success");
        revealAllMines(true);
        if (CURRENT_GAME_MODE === 'ranked') {
            const finalTimeMilliseconds = Math.round(elapsedTime); // elapsedTime 已經是毫秒，取整確保是整數
            submitScoreToBackend(playerName, finalTimeMilliseconds, currentDifficultyName);
        }
    }
}

/**
 * 將分數提交到後端 (實際應用中需要替換為 fetch API 請求)
 * @param {string} name 玩家名稱
 * @param {number} time 遊玩時間 (秒，可能帶小數) /
 * @param {string} difficulty 難度名稱
 */
async function submitScoreToBackend(name, time, difficulty) {
    console.log('submitScoreToBackend received time:', time);
    const scoreData = {
        playerName: name,
        timeTaken: time, // timeTaken 現在是總毫秒 (整數)
        difficultyLevel: difficulty,
        timestamp: new Date().toISOString()
    };

    console.log("準備提交分數 (排名模式):", scoreData);
     const timeInSecondsForDisplay = (time / 1000).toFixed(3);
    showAlert(`正在嘗試提交分數: ${name} - ${timeInSecondsForDisplay}s (${difficulty})...`, "info");

    const backendUrl = 'http://localhost:3000/api/submit-score';

    try {
        const response = await fetch(backendUrl, {
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
// function showAlert(message, type = 'info', duration = 0) {
//     if (!alertPlaceholder) return;
//     alertPlaceholder.innerHTML = '';
//     const wrapper = document.createElement('div');
//     wrapper.innerHTML = [
//         `<div class="alert alert-${type} alert-dismissible fade show" role="alert">`,
//         `   <div>${message}</div>`,
//         '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
//         '</div>'
//     ].join('');
//     alertPlaceholder.append(wrapper);
//     if (duration > 0) {
//         setTimeout(() => {
//             const alertElement = wrapper.firstChild;
//             if (alertElement && alertElement.classList && alertElement.classList.contains('alert')) {
//                 const alertInstance = bootstrap.Alert.getInstance(alertElement);
//                 if (alertInstance) { alertInstance.close(); }
//                 else { alertElement.classList.remove('show'); setTimeout(() => { if (alertElement.parentNode) { alertElement.parentNode.removeChild(alertElement); } }, 150); }
//             }
//         }, duration);
//     }
// }

function showAlert(message, type = 'info', duration = 0) {
    console.log('[DEBUG] showAlert CALLED. Message:', message, 'Type:', type, 'Duration:', duration);
    if (!alertPlaceholder) {
        console.error('[DEBUG] showAlert: alertPlaceholder is NULL or UNDEFINED in the current HTML page. Cannot display alert.');
        return;
    }
    console.log('[DEBUG] showAlert: alertPlaceholder found:', alertPlaceholder);

    // 為了最大相容性和簡潔性，先嘗試用簡單的 innerHTML 插入，確保元素本身可見
    // alertPlaceholder.innerHTML = `<div style="padding: 15px; margin-bottom: 20px; border: 1px solid transparent; border-radius: .25rem; color: #0c5460; background-color: #d1ecf1; border-color: #bee5eb;">${message}</div>`;
    // console.log('[DEBUG] showAlert: innerHTML of alertPlaceholder set with basic div.');
    // return; // 如果只想測試這個基本 div，在這裡返回

    // 使用 Bootstrap Alert
    alertPlaceholder.innerHTML = ''; // 清除舊的 alerts
    const wrapper = document.createElement('div');
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // 確保 ID 唯一
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('');
    alertPlaceholder.appendChild(wrapper); // 使用 appendChild 而不是 append，後者在某些舊環境可能不被完全支援
    console.log(`[DEBUG] showAlert: Bootstrap alert HTML appended to alertPlaceholder. Alert ID: ${alertId}`);

    // 手動觸發 Bootstrap Alert 的 'show' 事件，以確保它被正確初始化 (如果 Bootstrap JS 已載入)
    const alertElementForBootstrap = document.getElementById(alertId);
    if (alertElementForBootstrap && typeof bootstrap !== 'undefined' && bootstrap.Alert) {
        try {
            // 嘗試獲取實例，如果不存在則創建一個
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
                        // Fallback if getInstance is null (e.g., element removed or BS not fully init)
                        alertToDismiss.classList.remove('show');
                        // 為了安全，也手動移除 DOM 元素
                        setTimeout(() => {
                            if (alertToDismiss.parentNode) {
                                alertToDismiss.parentNode.removeChild(alertToDismiss);
                                console.log(`[DEBUG] showAlert: Alert ${alertId} removed from DOM (fallback).`);
                            }
                        }, 150); // Bootstrap fade duration
                    }
                } else {
                     // 如果 Bootstrap JS 不可用，手動移除
                    alertToDismiss.style.display = 'none'; // 或者直接移除
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

// 根據當前頁面初始化
document.addEventListener('DOMContentLoaded', initializePage);

