// script.js

// 預設遊戲設定 (如果使用者輸入無效時使用)
const DEFAULT_ROWS = 9; // 改為簡單模式的預設值
const DEFAULT_COLS = 9;
const DEFAULT_MINES = 10;

// 難度設定
const DIFFICULTY_LEVELS = {
    easy: { rows: 9, cols: 9, mines: 10, name: "簡單" },
    medium: { rows: 16, cols: 16, mines: 40, name: "中等" },
    high: { rows: 16, cols: 30, mines: 99, name: "困難" } // 傳統困難是30寬16高
};
let currentDifficultyName = DIFFICULTY_LEVELS.easy.name; // 預設難度名稱

let CURRENT_ROWS = DEFAULT_ROWS;
let CURRENT_COLS = DEFAULT_COLS;
let CURRENT_MINES = DEFAULT_MINES;

// 遊戲狀態變數
let board = [];
let revealedCellsCount = 0;
let flagsPlaced = 0;
let gameOver = false;
let firstClick = true;
let playerName = "玩家";

// 計時器相關變數
let timerInterval = null;
let secondsElapsed = 0;

// DOM 元素選擇
const gameBoardElement = document.getElementById('game-board');
const minesCountElement = document.getElementById('mines-count');
const resetButton = document.getElementById('reset-button');
const alertPlaceholder = document.getElementById('alert-placeholder');
const timerElement = document.getElementById('timer'); // 計時器顯示元素

// 設定輸入欄位的 DOM 元素選擇
const rowsInput = document.getElementById('rows-input');
const colsInput = document.getElementById('cols-input');
const minesInput = document.getElementById('mines-input');
const playerNameInput = document.getElementById('player-name');
const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
const customSettingsToggle = document.getElementById('custom-settings-toggle');
const customSettingsInputsDiv = document.getElementById('custom-settings-inputs');


// 初始化遊戲
window.onload = () => {
    // 初始化玩家名稱
    if (playerNameInput) playerNameInput.value = playerName;
    // 初始化自訂輸入欄位的值
    if (rowsInput) rowsInput.value = DEFAULT_ROWS;
    if (colsInput) colsInput.value = DEFAULT_COLS;
    if (minesInput) minesInput.value = DEFAULT_MINES;
    
    // 預設選中簡單難度
    const easyRadio = document.getElementById('diff-easy');
    if (easyRadio) easyRadio.checked = true;
    
    // 監聽難度選擇變化
    difficultyRadios.forEach(radio => {
        radio.addEventListener('change', handleDifficultyChange);
    });
    // 監聽自訂設定開關
    if (customSettingsToggle) {
        customSettingsToggle.addEventListener('change', handleCustomToggleChange);
    }

    setupGame();
};
resetButton.addEventListener('click', setupGame);

/**
 * 處理自訂設定開關的變化
 */
function handleCustomToggleChange() {
    if (customSettingsToggle.checked) {
        customSettingsInputsDiv.classList.remove('d-none');
        // 取消所有難度選擇的勾選狀態
        difficultyRadios.forEach(radio => radio.checked = false);
    } else {
        customSettingsInputsDiv.classList.add('d-none');
        // 如果關閉自訂，預設選回簡單模式 (或最後選擇的模式)
        let selectedDifficulty = false;
        difficultyRadios.forEach(radio => {
            if (radio.checked) selectedDifficulty = true;
        });
        if (!selectedDifficulty) {
             const easyRadio = document.getElementById('diff-easy');
             if (easyRadio) easyRadio.checked = true;
        }
    }
}

/**
 * 處理難度選擇的變化
 */
function handleDifficultyChange(event) {
    if (event.target.checked && customSettingsToggle.checked) {
        customSettingsToggle.checked = false; // 如果選了預設難度，關閉自訂
        customSettingsInputsDiv.classList.add('d-none');
    }
    // setupGame(); // 選擇難度後可以選擇立即開始，或等待按鈕
}


/**
 * 從輸入欄位讀取並驗證遊戲設定
 */
function updateGameSettings() {
    // 讀取玩家名稱
    if (playerNameInput && playerNameInput.value.trim() !== "") {
        playerName = playerNameInput.value.trim();
    } else {
        playerName = "匿名玩家"; // 如果名稱為空，設為預設
        if (playerNameInput) playerNameInput.value = playerName;
    }

    // 檢查是否啟用自訂設定
    if (customSettingsToggle && customSettingsToggle.checked) {
        currentDifficultyName = "自訂";
        let newRows = parseInt(rowsInput.value);
        let newCols = parseInt(colsInput.value);
        let newMines = parseInt(minesInput.value);

        let settingsValid = true;
        let validationMessage = "";

        if (isNaN(newRows) || newRows < 5 || newRows > 24) {
            newRows = DEFAULT_ROWS; // 使用自訂模式下的預設值
            if(rowsInput) rowsInput.value = newRows;
            validationMessage += "行數無效 (5-24)，已重設。<br>";
            settingsValid = false;
        }
        if (isNaN(newCols) || newCols < 5 || newCols > 30) {
            newCols = DEFAULT_COLS; // 使用自訂模式下的預設值
            if(colsInput) colsInput.value = newCols;
            validationMessage += "列數無效 (5-30)，已重設。<br>";
            settingsValid = false;
        }
        const maxMines = newRows * newCols - 9;
        if (isNaN(newMines) || newMines < 1 || newMines > maxMines) {
            newMines = Math.min(DEFAULT_MINES, maxMines > 0 ? maxMines : 1);
            if (maxMines <=0 && newRows * newCols > 0) newMines = 1;
            else if (maxMines <=0) newMines = 0;
            if (minesInput) minesInput.value = newMines;
            validationMessage += `地雷數無效 (1-${maxMines > 0 ? maxMines : (newRows * newCols > 0 ? 1: 0) })，已重設。<br>`;
            settingsValid = false;
        }
        CURRENT_ROWS = newRows;
        CURRENT_COLS = newCols;
        CURRENT_MINES = newMines;
        if (!settingsValid && validationMessage) {
            showAlert(validationMessage, "warning", 7000);
        }
    } else {
        // 使用預選的難度設定
        let selectedDifficulty = 'easy'; // 預設
        difficultyRadios.forEach(radio => {
            if (radio.checked) {
                selectedDifficulty = radio.value;
            }
        });
        const level = DIFFICULTY_LEVELS[selectedDifficulty];
        CURRENT_ROWS = level.rows;
        CURRENT_COLS = level.cols;
        CURRENT_MINES = level.mines;
        currentDifficultyName = level.name;
         // 更新自訂輸入框的值以反映當前難度 (可選)
        if (rowsInput) rowsInput.value = CURRENT_ROWS;
        if (colsInput) colsInput.value = CURRENT_COLS;
        if (minesInput) minesInput.value = CURRENT_MINES;
    }
}

/**
 * 設定或重置遊戲
 */
function setupGame() {
    stopTimer(); // 停止舊的計時器
    secondsElapsed = 0; // 重設計時
    updateTimerDisplay(); // 更新計時器顯示為0

    updateGameSettings(); // 讀取並驗證使用者設定

    board = [];
    revealedCellsCount = 0;
    flagsPlaced = 0;
    gameOver = false;
    firstClick = true;

    minesCountElement.textContent = CURRENT_MINES; 
    gameBoardElement.innerHTML = ''; 
    gameBoardElement.style.gridTemplateColumns = `repeat(${CURRENT_COLS}, 32px)`; 

    for (let r = 0; r < CURRENT_ROWS; r++) {
        const row = [];
        for (let c = 0; c < CURRENT_COLS; c++) {
            const cellData = {
                r, c, isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0
            };
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
    // 遊戲設定好後，不自動開始計時，等待第一次點擊
}

/**
 * 開始計時器
 */
function startTimer() {
    if (timerInterval) clearInterval(timerInterval); // 清除已有的計時器
    secondsElapsed = 0; // 從0開始
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDisplay();
    }, 1000); // 每秒更新一次
}

/**
 * 停止計時器
 */
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

/**
 * 更新計時器顯示
 */
function updateTimerDisplay() {
    if (timerElement) {
        timerElement.textContent = `${secondsElapsed}s`;
    }
}

/**
 * 在第一次點擊後佈置地雷 (邏輯與之前類似，使用 CURRENT_ 系列變數)
 */
function placeMines(firstClickR, firstClickC) {
    let minesPlacedCount = 0;
    if (CURRENT_MINES >= CURRENT_ROWS * CURRENT_COLS && CURRENT_ROWS * CURRENT_COLS > 0) {
        showAlert("地雷數量過多或等於總格子數，無法開始遊戲！請調整設定。", "danger");
        gameOver = true; 
        stopTimer();
        return;
    }
    if (CURRENT_MINES === 0 && CURRENT_ROWS * CURRENT_COLS > 0) {
         calculateAdjacentMines();
         return;
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
    if(minesPlacedCount < CURRENT_MINES && CURRENT_ROWS * CURRENT_COLS > 1){
        for (let r_fill = 0; r_fill < CURRENT_ROWS && minesPlacedCount < CURRENT_MINES; r_fill++) {
            for (let c_fill = 0; c_fill < CURRENT_COLS && minesPlacedCount < CURRENT_MINES; c_fill++) {
                if (!(r_fill === firstClickR && c_fill === firstClickC) && !board[r_fill][c_fill].isMine) {
                    board[r_fill][c_fill].isMine = true;
                    minesPlacedCount++;
                }
            }
        }
    }
    calculateAdjacentMines(); 
}

/**
 * 計算每個格子周圍的相鄰地雷數量 (邏輯不變)
 */
function calculateAdjacentMines() {
    for (let r = 0; r < CURRENT_ROWS; r++) {
        for (let c = 0; c < CURRENT_COLS; c++) {
            if (board[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue; 
                    const nr = r + dr; 
                    const nc = c + dc; 
                    if (nr >= 0 && nr < CURRENT_ROWS && nc >= 0 && nc < CURRENT_COLS && board[nr][nc].isMine) {
                        count++;
                    }
                }
            }
            board[r][c].adjacentMines = count;
        }
    }
}

/**
 * 計算因擴散效果而需要揭開的所有格子 (邏輯不變)
 */
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
        if (currentCellData.adjacentMines > 0) {
            continue;
        }
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
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

/**
 * 處理格子左鍵點擊事件
 */
function handleCellClick(event) {
    if (gameOver) return; 

    const cellElement = event.target;
    const r = parseInt(cellElement.dataset.row);
    const c = parseInt(cellElement.dataset.col);
    
    if (r < 0 || r >= CURRENT_ROWS || c < 0 || c >= CURRENT_COLS) return;
    const cellData = board[r][c];

    // 第一次有效點擊時開始計時
    if (firstClick && !cellData.isRevealed && !cellData.isFlagged) {
        startTimer(); // 開始計時器
        placeMines(r, c); 
        if (gameOver) { // placeMines 可能因錯誤設定而結束遊戲
             stopTimer();
             return;
        }
        firstClick = false;
    }
    
    // 處理點擊已揭開的數字格子 (Chord/雙擊效果)
    if (cellData.isRevealed && cellData.adjacentMines > 0) {
        let neighborFlagsCount = 0;
        const neighborsToChord = []; 
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < CURRENT_ROWS && nc >= 0 && nc < CURRENT_COLS) {
                    if (board[nr][nc].isFlagged) {
                        neighborFlagsCount++;
                    }
                    if (!board[nr][nc].isRevealed && !board[nr][nc].isFlagged) {
                        neighborsToChord.push({r: nr, c: nc});
                    }
                }
            }
        }

        if (neighborFlagsCount === cellData.adjacentMines) {
            const cellsToEffectivelyReveal = new Set();
            let hitMineInChord = false;
            for (const neighbor of neighborsToChord) {
                const nr = neighbor.r;
                const nc = neighbor.c;
                const neighborCellData = board[nr][nc];
                const neighborCellElement = document.querySelector(`.cell[data-row='${nr}'][data-col='${nc}']`);

                if (neighborCellData.isMine) {
                    neighborCellData.isRevealed = true;
                    if(neighborCellElement) {
                        neighborCellElement.classList.add('revealed', 'mine');
                        neighborCellElement.textContent = '💣';
                    }
                    revealAllMines(false); 
                    showAlert("GAME OVER! 你在擴展時踩到地雷了！ ☠️", "danger");
                    gameOver = true;
                    stopTimer(); // 遊戲結束停止計時
                    hitMineInChord = true;
                    break; 
                }
                if (neighborCellData.adjacentMines === 0) {
                    calculateFloodFillCells(nr, nc, cellsToEffectivelyReveal);
                } else { 
                    cellsToEffectivelyReveal.add(`${nr},${nc}`);
                }
            }
            if (hitMineInChord) return; 
            for (const cellKey of cellsToEffectivelyReveal) {
                const [row, col] = cellKey.split(',').map(Number);
                const currentAffectedCellData = board[row][col];
                const currentAffectedCellElement = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
                if (currentAffectedCellElement && !currentAffectedCellData.isRevealed && !currentAffectedCellData.isFlagged && !currentAffectedCellData.isMine) {
                    currentAffectedCellData.isRevealed = true;
                    currentAffectedCellElement.classList.add('revealed');
                    revealedCellsCount++;
                    if (currentAffectedCellData.adjacentMines > 0) {
                        currentAffectedCellElement.textContent = currentAffectedCellData.adjacentMines;
                        currentAffectedCellElement.dataset.count = currentAffectedCellData.adjacentMines;
                    }
                }
            }
            checkWinCondition();
        }
        return; 
    }

    // 處理點擊未揭開或未插旗的格子
    if (cellData.isRevealed || cellData.isFlagged) return;

    // 如果是第一次點擊，且上面計時器已啟動，這裡的 firstClick 應為 false
    // 但 placeMines 仍需在此處調用 (如果計時器邏輯移到更前面)
    // 目前的 firstClick 邏輯是正確的，因為它在計時器啟動的同一個 if 塊內被設為 false

    if (cellData.isMine) { // 處理第一次點擊就點到雷的情況
        cellData.isRevealed = true; 
        cellElement.classList.add('revealed', 'mine'); 
        cellElement.textContent = '💣';
        revealAllMines(false); 
        showAlert("GAME OVER! 你踩到地雷了！ ☠️", "danger");
        gameOver = true;
        stopTimer(); // 遊戲結束停止計時
        return;
    }
    
    const cellsToEffectivelyReveal = new Set();
    if (cellData.adjacentMines > 0) {
        if (!cellData.isRevealed) { 
             cellsToEffectivelyReveal.add(`${r},${c}`);
        }
    } else {
        calculateFloodFillCells(r, c, cellsToEffectivelyReveal);
    }

    for (const cellKey of cellsToEffectivelyReveal) {
        const [row, col] = cellKey.split(',').map(Number);
        const currentAffectedCellData = board[row][col];
        const currentAffectedCellElement = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
        if (currentAffectedCellElement && !currentAffectedCellData.isRevealed && !currentAffectedCellData.isFlagged && !currentAffectedCellData.isMine) {
            currentAffectedCellData.isRevealed = true;
            currentAffectedCellElement.classList.add('revealed');
            revealedCellsCount++;
            if (currentAffectedCellData.adjacentMines > 0) {
                currentAffectedCellElement.textContent = currentAffectedCellData.adjacentMines;
                currentAffectedCellElement.dataset.count = currentAffectedCellData.adjacentMines;
            }
        }
    }
    checkWinCondition(); 
}

/**
 * 處理格子右鍵點擊事件 (邏輯不變)
 */
function handleCellRightClick(event) {
    event.preventDefault(); 
    if (gameOver || firstClick) return; // 遊戲未開始或已結束不能插旗

    const cellElement = event.target;
    const r = parseInt(cellElement.dataset.row);
    const c = parseInt(cellElement.dataset.col);

    if (r < 0 || r >= CURRENT_ROWS || c < 0 || c >= CURRENT_COLS) return;
    const cellData = board[r][c];

    if (cellData.isRevealed) return; 

    if (cellData.isFlagged) {
        cellData.isFlagged = false;
        cellElement.classList.remove('flagged');
        cellElement.textContent = ''; 
        flagsPlaced--;
    } else {
        if (flagsPlaced < CURRENT_MINES) { // 限制旗子數量不能超過地雷數
            cellData.isFlagged = true;
            cellElement.classList.add('flagged');
            flagsPlaced++;
        } else {
            showAlert("旗子數量已達上限！", "warning", 2000);
        }
    }
    minesCountElement.textContent = CURRENT_MINES - flagsPlaced; 
}

/**
 * 遊戲結束時揭開所有地雷 (邏輯不變)
 */
function revealAllMines(isWin) {
    for (let r_idx = 0; r_idx < CURRENT_ROWS; r_idx++) {
        for (let c_idx = 0; c_idx < CURRENT_COLS; c_idx++) {
            const cellData = board[r_idx][c_idx];
            const cellElement = document.querySelector(`.cell[data-row='${r_idx}'][data-col='${c_idx}']`);
            if (cellElement) { 
                if (cellData.isMine) {
                    if (cellData.isFlagged) { 
                        cellElement.classList.add('revealed'); 
                    } else { 
                        cellElement.classList.add('revealed', 'mine');
                        cellElement.textContent = '💣';
                    }
                } else if (cellData.isFlagged && !cellData.isMine) { 
                    cellElement.classList.add('revealed', 'wrong-flag'); 
                    cellElement.classList.remove('flagged'); 
                    cellElement.textContent = '❌';
                } else if (!cellData.isRevealed) { 
                     cellElement.classList.add('revealed');
                     if (cellData.adjacentMines > 0) {
                        cellElement.textContent = cellData.adjacentMines;
                        cellElement.dataset.count = cellData.adjacentMines;
                     }
                }
            }
        }
    }
}

/**
 * 檢查勝利條件
 */
function checkWinCondition() {
    let won = false;
    if (CURRENT_MINES === 0 && revealedCellsCount === CURRENT_ROWS * CURRENT_COLS && CURRENT_ROWS * CURRENT_COLS > 0) {
        won = true;
    } else if (CURRENT_MINES > 0 && revealedCellsCount === (CURRENT_ROWS * CURRENT_COLS) - CURRENT_MINES) {
        won = true;
    }

    if (won) {
        gameOver = true;
        stopTimer();
        minesCountElement.textContent = '🎉'; 
        const message = `恭喜 ${playerName}！你以 ${secondsElapsed} 秒完成了 ${currentDifficultyName} 難度！ 🎉`;
        showAlert(message, "success");
        revealAllMines(true); 
        submitScoreToBackend(playerName, secondsElapsed, currentDifficultyName);
    }
}

/**
 * 模擬提交分數到後端
 * @param {string} name 玩家名稱
 * @param {number} time 遊玩時間 (秒)
 * @param {string} difficulty 難度名稱
 */
function submitScoreToBackend(name, time, difficulty) {
    const scoreData = {
        playerName: name,
        timeTaken: time,
        difficultyLevel: difficulty,
        timestamp: new Date().toISOString()
    };

    console.log("準備提交分數:", scoreData);
    showAlert(`分數已記錄 (模擬): ${name} - ${time}s (${difficulty})`, "info", 5000);

    // ** 重要提示 **
    // 在實際應用中，您需要將以下程式碼替換為對您後端 API 的 fetch 請求
    // 例如:
    // fetch('/api/submit-score', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(scoreData),
    // })
    // .then(response => response.json())
    // .then(data => {
    //     console.log('分數提交成功:', data);
    //     showAlert('分數已成功上傳到排行榜！', 'success');
    // })
    // .catch((error) => {
    //     console.error('分數提交失敗:', error);
    //     showAlert('分數上傳失敗，請檢查網路連線或稍後再試。', 'danger');
    // });
}


/**
 * 顯示 Bootstrap Alert 提示訊息 (邏輯不變)
 */
function showAlert(message, type = 'info', duration = 0) {
    alertPlaceholder.innerHTML = ''; 
    const wrapper = document.createElement('div');
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible fade show" role="alert">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('');
    alertPlaceholder.append(wrapper);
    if (duration > 0) {
        setTimeout(() => {
            const alertElement = wrapper.firstChild;
            if (alertElement && alertElement.classList && alertElement.classList.contains('alert')) { 
                 const alertInstance = bootstrap.Alert.getInstance(alertElement);
                 if (alertInstance) {
                    alertInstance.close();
                 } else { 
                    alertElement.classList.remove('show');
                    setTimeout(() => { 
                        if (alertElement.parentNode) {
                           alertElement.parentNode.removeChild(alertElement);
                        }
                    }, 150); 
                 }
            }
        }, duration);
    }
}
