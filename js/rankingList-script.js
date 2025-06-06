// ranking-script.js

document.addEventListener('DOMContentLoaded', () => {
    const leaderboardBody = document.getElementById('leaderboard-body');
    const difficultyButtons = document.querySelectorAll('.difficulty-selector .btn');
    const alertPlaceholderRanking = document.getElementById('alert-placeholder-ranking');
    const backendBaseUrl = 'https://minesweeperproject0606-hcemaga7hqf9h9cf.eastasia-01.azurewebsites.net'; // 您的後端伺服器位址
    /**tcpping minesweeperproject0606-hcemaga7hqf9h9cf.eastasia-01.azurewebsites.net:1433
     * nc -zv minesweeperproject0606-hcemaga7hqf9h9cf.eastasia-01.azurewebsites.net 1433
     * curl -v telnet://minesweeperproject0606-hcemaga7hqf9h9cf.eastasia-01.azurewebsites.net:1433
     * 顯示提示訊息
     * @param {string} message - 要顯示的訊息
     * @param {string} [type='info'] - 提示類型 (success, danger, warning, info)
     * @param {number} [duration=0] - 自動關閉的延遲時間(毫秒)，0表示不自動關閉
     */
    function showRankingAlert(message, type = 'info', duration = 0) {
        if (!alertPlaceholderRanking) return;
        alertPlaceholderRanking.innerHTML = ''; // 清除舊提示
        const wrapper = document.createElement('div');
        wrapper.innerHTML = [
            `<div class="alert alert-${type} alert-dismissible fade show mt-3" role="alert">`,
            `   <div>${message}</div>`,
            '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
            '</div>'
        ].join('');
        alertPlaceholderRanking.append(wrapper);
        if (duration > 0) {
            setTimeout(() => {
                const alertElement = wrapper.firstChild;
                if (alertElement && alertElement.classList && alertElement.classList.contains('alert')) {
                    const alertInstance = bootstrap.Alert.getInstance(alertElement);
                    if (alertInstance) {
                        alertInstance.close();
                    } else {
                        // Fallback if getInstance is null (e.g., element removed before timeout)
                        alertElement.classList.remove('show');
                        setTimeout(() => {
                            if (alertElement.parentNode) {
                                alertElement.parentNode.removeChild(alertElement);
                            }
                        }, 150); // Bootstrap fade duration
                    }
                }
            }, duration);
        }
    }

    /**
     * 從後端獲取排行榜資料
     * @param {string} difficulty - 難度級別 ('簡單', '中等', '困難')
     */
    async function fetchLeaderboard(difficulty) {
        if (!leaderboardBody) {
            console.error('排行榜表格主體元素未找到 (leaderboard-body)。');
            return;
        }
        leaderboardBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">載入中...</span>
                    </div>
                    <p class="mt-2">正在載入 ${difficulty} 難度排行榜...</p>
                </td>
            </tr>`;

        try {
            const response = await fetch(`${backendBaseUrl}/api/get-leaderboard?difficulty=${encodeURIComponent(difficulty)}`);

            if (!response.ok) {
                let errorData = '無法讀取錯誤詳情';
                try {
                    errorData = await response.text();
                } catch (e) { /* ignore */ }
                throw new Error(`無法獲取排行榜資料 (狀態: ${response.status}): ${errorData}`);
            }
            const data = await response.json();
            renderLeaderboard(data, difficulty);
        } catch (error) {
            console.error('獲取排行榜時發生錯誤:', error);
            leaderboardBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger p-3">無法載入排行榜資料：${error.message}</td></tr>`;
            showRankingAlert(`無法載入排行榜：${error.message}`, 'danger', 7000);
        }
    }

    /**
     * 將排行榜資料渲染到 HTML 表格中
     * @param {Array} scores - 從後端獲取的分數陣列
     * @param {string} difficulty - 當前選擇的難度
     */
    function renderLeaderboard(scores, difficulty) {
        if (!leaderboardBody) return;
        leaderboardBody.innerHTML = ''; // 清空現有內容

        if (!scores || scores.length === 0) {
            leaderboardBody.innerHTML = `<tr><td colspan="4" class="text-center p-3">此難度 (${difficulty}) 目前尚無排名記錄。</td></tr>`;
            return;
        }

        scores.forEach((score, index) => {
            const row = leaderboardBody.insertRow();
            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            rankCell.classList.add('text-center');

            const playerCell = row.insertCell();
            playerCell.textContent = score.playerName;

            const timeCell = row.insertCell();
            // 後端應返回 timeTakenSeconds (已是秒，帶小數)
            timeCell.textContent = parseFloat(score.timeTakenSeconds).toFixed(3);
            timeCell.classList.add('text-center');

            const dateCell = row.insertCell();
            try {
                const date = new Date(score.timestamp);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const seconds = date.getSeconds().toString().padStart(2, '0');
                dateCell.textContent = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
            } catch (e) {
                console.warn("解析日期時發生錯誤:", score.timestamp, e);
                dateCell.textContent = '無效日期';
            }
            dateCell.classList.add('text-center');
        });
    }

    // 為難度選擇按鈕添加事件監聽器
    if (difficultyButtons) {
        difficultyButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                difficultyButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                const selectedDifficulty = event.target.dataset.difficulty;
                fetchLeaderboard(selectedDifficulty);
            });
        });
    } else {
        console.error("難度選擇按鈕群組未找到。");
    }

    // 頁面載入時，預設獲取並顯示「簡單」難度的排行榜
    const defaultDifficultyButton = document.querySelector('.difficulty-selector .btn[data-difficulty="簡單"]');
    if (defaultDifficultyButton) {
        defaultDifficultyButton.classList.add('active'); // 確保預設按鈕是 active
        fetchLeaderboard('簡單');
    } else {
        // 如果找不到預設按鈕，可以選擇一個預設值或顯示錯誤
        console.warn("找不到預設的 '簡單' 難度按鈕，仍嘗試載入 '簡單' 模式排行榜。");
        fetchLeaderboard('簡單'); // 仍然嘗試載入簡單模式
    }
});
