const input = document.getElementById('todo-input');
const addButton = document.getElementById('add-button');
const undoButton = document.getElementById('undo-button');
const bubbleContainer = document.getElementById('bubble-container');
const movementArea = document.getElementById('movement-area');
const currentMonthDisplay = document.getElementById('current-month');
const calendarDays = document.getElementById('calendar-days');
const themeToggleButton = document.getElementById('theme-toggle');

let currentBubbles = [];
const lastDeletedBubbleByDate = {}; // 日付ごとに削除されたバブルを保持
const bubbleDataByDate = {};
let isComposing = false; // テキストの変換中かどうかを示すフラグ
let currentSizeCategory = null; // 現在のサイズカテゴリ

// 初期テーマをライトモードに設定
document.body.classList.add('light-mode');
themeToggleButton.textContent = 'ダークモード';

// テーマ切り替えボタンのクリックイベント
themeToggleButton.addEventListener('click', () => {
    if (document.body.classList.contains('light-mode')) {
        document.body.classList.replace('light-mode', 'dark-mode');
        themeToggleButton.textContent = 'ライトモード';
    } else {
        document.body.classList.replace('dark-mode', 'light-mode');
        themeToggleButton.textContent = 'ダークモード';
    }
});

// バブルを消去する関数
function removeBubble(bubbleObj) {
    const popSound = new Audio('ポンッ！.mp3');
    popSound.play();

    bubbleObj.element.classList.add('explode');
    bubbleObj.element.addEventListener('animationend', () => {
        bubbleObj.element.remove();
        currentBubbles = currentBubbles.filter(b => b !== bubbleObj); // リストから削除
        lastDeletedBubbleByDate[currentDateKey] = bubbleObj; // 日付ごとに削除したバブルを保存
        saveCurrentBubbles(); // バブル削除後に保存

        renderCalendar(); // カレンダーを再描画してバブルのインジケーターを更新
    });
}

// 日本時間の現在の日付を取得
const now = new Date();
const selectedDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 9 / 24);
let currentDateKey = formatDateKey(selectedDate); // 日本時間の日付を初期選択日として設定

// カレンダーの初期表示
renderCalendar();

// 前月と次月のボタン
document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

// カレンダーの月を変更する関数
function changeMonth(monthOffset) {
    selectedDate.setMonth(selectedDate.getMonth() + monthOffset);
    renderCalendar();
}

// カレンダーのレンダリング関数
function renderCalendar() {
    calendarDays.innerHTML = '';
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    currentMonthDisplay.textContent = `${year}年 ${month + 1}月`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        const placeholder = document.createElement('div');
        calendarDays.appendChild(placeholder);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;

        const dateKey = formatDateKey(new Date(year, month, day));
        if (dateKey === currentDateKey) {
            dayElement.classList.add('selected-day');
        }

        // ボールがある日に印をつける
        if (bubbleDataByDate[dateKey] && bubbleDataByDate[dateKey].length > 0) {
            const indicator = document.createElement('div');
            indicator.classList.add('bubble-indicator');
            dayElement.appendChild(indicator);
        }

        dayElement.addEventListener('click', () => {
            saveCurrentBubbles(); // 日付変更前に現在のバブルを保存
            document.querySelector('.selected-day')?.classList.remove('selected-day');
            dayElement.classList.add('selected-day');
            currentDateKey = dateKey;
            loadBubblesForDate(dateKey);
        });

        calendarDays.appendChild(dayElement);
    }
}

// 日付をキーとしてフォーマットする関数
function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// バブルのデータを日付ごとに保存する関数
function saveCurrentBubbles() {
    bubbleDataByDate[currentDateKey] = currentBubbles.map(bubbleObj => ({
        text: bubbleObj.text,
        x: bubbleObj.x,
        y: bubbleObj.y,
        size: bubbleObj.size,
        fontSize: bubbleObj.fontSize,
        vx: bubbleObj.vx,
        vy: bubbleObj.vy,
    }));
}

// 選択された日付のバブルを読み込む関数
function loadBubblesForDate(dateKey) {
    clearCurrentBubbles();
    const bubblesForDate = bubbleDataByDate[dateKey] || [];
    currentBubbles = bubblesForDate.map(data => createBubble(data.text, data.x, data.y, data.size, data.fontSize, data.vx, data.vy));
    renderCalendar(); // カレンダーを再描画してバブルのインジケーターを更新
}

// 他のバブルをクリアする関数
function clearCurrentBubbles() {
    currentBubbles.forEach(bubbleObj => bubbleObj.element.remove());
    currentBubbles = [];
}

// タスクを追加する関数
function addTask() {
    const text = input.value.trim();
    if (text) {
        createBubble(text);
        const addBubbleSound = new Audio('決定ボタンを押す42.mp3');
        addBubbleSound.play(); // バブル追加サウンドを再生
        input.value = ''; // 入力フィールドをクリア
        saveCurrentBubbles(); // バブルデータを保存
        renderCalendar(); // カレンダーを再描画してバブルのインジケーターを更新
    }
}

// タスク追加: Enterキーで送信、Shift + Enterで改行
input.addEventListener('compositionstart', () => {
    isComposing = true;
});
input.addEventListener('compositionend', () => {
    isComposing = false;
});
input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
        event.preventDefault();
        addTask();
    }
});
addButton.addEventListener('click', addTask);

// ウィンドウ幅に応じたバブルのサイズとフォントサイズを取得する関数
function getBubbleSizeAndFontSize() {
    const windowWidth = window.innerWidth;
    let minSize, maxSize, minFontSize, maxFontSize;

    if (windowWidth > 1024) {
        minSize = 180;
        maxSize = 220;
        minFontSize = 16;
        maxFontSize = 20;
        currentSizeCategory = 'large';
    } else if (windowWidth > 768) {
        minSize = 60;
        maxSize = 120;
        minFontSize = 14;
        maxFontSize = 18;
        currentSizeCategory = 'medium';
    } else {
        minSize = 40;
        maxSize = 80;
        minFontSize = 12;
        maxFontSize = 16;
        currentSizeCategory = 'small';
    }

    return { minSize, maxSize, minFontSize, maxFontSize };
}

// 新しいバブルを作成する関数（位置とサイズ指定が可能）
function createBubble(text, x = null, y = null, size = null, fontSize = null, vx = null, vy = null) {
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.textContent = text;

    const { minSize, maxSize, minFontSize, maxFontSize } = getBubbleSizeAndFontSize();
    size = size || Math.random() * (maxSize - minSize) + minSize;
    fontSize = fontSize || Math.random() * (maxFontSize - minFontSize) + minFontSize;

    x = x !== null ? x : Math.random() * (movementArea.clientWidth - size) + movementArea.offsetLeft;
    y = y !== null ? y : Math.random() * (movementArea.clientHeight - size) + movementArea.offsetTop;

    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.fontSize = `${fontSize}px`;

    // ライトモード・ダークモードどちらでも見やすい中間的なパステルカラーを設定
    const hue = Math.floor(Math.random() * 360); // 色相をランダムに設定
    bubble.style.backgroundColor = `hsl(${hue}, 40%, 70%)`; // 彩度と明度を固定して見やすい色に

    bubbleContainer.appendChild(bubble);

    const bubbleObj = {
        element: bubble,
        text,
        x,
        y,
        size,
        fontSize,
        vx: vx || Math.random() * 2 - 1,
        vy: vy || -Math.random() * 2 - 1,
    };

    // バブルの消去処理
    bubble.addEventListener('click', () => removeBubble(bubbleObj));

    currentBubbles.push(bubbleObj);
    return bubbleObj;
}

// Undoボタンのクリックイベント
undoButton.addEventListener('click', () => {
    if (lastDeletedBubbleByDate[currentDateKey]) {
        const bubbleObj = lastDeletedBubbleByDate[currentDateKey];

        // 最後に削除したバブルを復元し、位置をランダムに再設定
        const { minSize, maxSize, minFontSize, maxFontSize } = getBubbleSizeAndFontSize();
        bubbleObj.size = Math.random() * (maxSize - minSize) + minSize;
        bubbleObj.fontSize = Math.random() * (maxFontSize - minFontSize) + minFontSize;
        bubbleObj.x = Math.random() * (movementArea.clientWidth - bubbleObj.size) + movementArea.offsetLeft;
        bubbleObj.y = Math.random() * (movementArea.clientHeight - bubbleObj.size) + movementArea.offsetTop;

        // スタイルを更新
        bubbleObj.element.style.width = `${bubbleObj.size}px`;
        bubbleObj.element.style.height = `${bubbleObj.size}px`;
        bubbleObj.element.style.fontSize = `${bubbleObj.fontSize}px`;
        bubbleObj.element.style.left = `${bubbleObj.x}px`;
        bubbleObj.element.style.top = `${bubbleObj.y}px`;
        bubbleObj.element.classList.remove('explode'); // explodeクラスを削除して再表示

        // バブルをコンテナに追加
        bubbleContainer.appendChild(bubbleObj.element);
        currentBubbles.push(bubbleObj);

        const undoSound = new Audio('キャンセル4.mp3');
        undoSound.play(); // Undoサウンドを再生
        lastDeletedBubbleByDate[currentDateKey] = null; // 復元後にリセット
        saveCurrentBubbles(); // 復元後の状態を保存
        renderCalendar(); // カレンダーを再描画してバブルのインジケーターを更新
    }
});

// ウィンドウリサイズ時に特定の幅に到達したときだけ既存バブルのサイズとフォントサイズを調整
window.addEventListener('resize', () => {
    const windowWidth = window.innerWidth;
    let newSizeCategory;

    if (windowWidth > 1024) {
        newSizeCategory = 'large';
    } else if (windowWidth > 768) {
        newSizeCategory = 'medium';
    } else {
        newSizeCategory = 'small';
    }

    // サイズカテゴリが変更された場合のみバブルのサイズとフォントサイズを更新
    if (newSizeCategory !== currentSizeCategory) {
        currentSizeCategory = newSizeCategory;
        const { minSize, maxSize, minFontSize, maxFontSize } = getBubbleSizeAndFontSize();

        currentBubbles.forEach(bubbleObj => {
            const newSize = Math.random() * (maxSize - minSize) + minSize;
            const newFontSize = Math.random() * (maxFontSize - minFontSize) + minFontSize;
            bubbleObj.size = newSize;
            bubbleObj.fontSize = newFontSize;
            bubbleObj.element.style.width = `${newSize}px`;
            bubbleObj.element.style.height = `${newSize}px`;
            bubbleObj.element.style.fontSize = `${newFontSize}px`;
        });
    }
});

// バブル同士の衝突を判定し、重ならないように調整する関数
function handleCollisions() {
    for (let i = 0; i < currentBubbles.length; i++) {
        for (let j = i + 1; j < currentBubbles.length; j++) {
            const bubbleA = currentBubbles[i];
            const bubbleB = currentBubbles[j];

            const dx = bubbleB.x - bubbleA.x;
            const dy = bubbleB.y - bubbleA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (bubbleA.size + bubbleB.size) / 2;

            if (distance < minDistance) {
                // 重なり解消のための位置修正
                const overlap = minDistance - distance;
                const angle = Math.atan2(dy, dx);
                const offsetX = Math.cos(angle) * overlap / 2;
                const offsetY = Math.sin(angle) * overlap / 2;

                // バブルAとBの位置をそれぞれずらす
                bubbleA.x -= offsetX;
                bubbleA.y -= offsetY;
                bubbleB.x += offsetX;
                bubbleB.y += offsetY;

                // 速度を衝突方向に応じて反転させる
                bubbleA.vx = -Math.cos(angle) * 0.8;
                bubbleA.vy = -Math.sin(angle) * 0.8;
                bubbleB.vx = Math.cos(angle) * 0.8;
                bubbleB.vy = Math.sin(angle) * 0.8;
            }
        }
    }
}

// バブルの位置を更新する関数
function updateBubbles() {
    currentBubbles.forEach(bubbleObj => {
        let { x, y, vx, vy, size } = bubbleObj;

        // 上向きの加速度を加える
        vy -= 0.05;

        // 横方向の速度に減衰を加える
        vx *= 0.99;

        // 左右の壁との衝突判定
        if (x <= movementArea.offsetLeft) {
            x = movementArea.offsetLeft; // 左端で固定
            vx = Math.abs(vx) * 0.8; // 右向きに反転し、減衰
        } else if (x + size >= movementArea.offsetLeft + movementArea.clientWidth) {
            x = movementArea.offsetLeft + movementArea.clientWidth - size; // 右端で固定
            vx = -Math.abs(vx) * 0.8; // 左向きに反転し、減衰
        }

        // 上下の壁との衝突判定
        if (y <= movementArea.offsetTop) {
            y = movementArea.offsetTop; // 上端で固定
            vy = 0; // 上方向の速度を0にする
        } else if (y + size >= movementArea.offsetTop + movementArea.clientHeight) {
            y = movementArea.offsetTop + movementArea.clientHeight - size; // 下端で固定
            vy = -Math.abs(vy) * 0.8; // 上向きに反転し、減衰
        }

        // 位置を更新
        x += vx;
        y += vy;

        // バブルの位置を反映
        bubbleObj.x = x;
        bubbleObj.y = y;
        bubbleObj.vx = vx;
        bubbleObj.vy = vy;
        bubbleObj.element.style.left = `${x}px`;
        bubbleObj.element.style.top = `${y}px`;
    });

    // バブル同士の衝突判定を行う
    handleCollisions();

    requestAnimationFrame(updateBubbles);
}

// 初回の更新処理を開始
updateBubbles();


document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('theme-toggle');
    const guideButton = document.getElementById('guide-button');
    const guideModal = document.getElementById('guide-modal');
    const closeModal = document.querySelector('.close');

    document.addEventListener('DOMContentLoaded', () => {
        const themeToggleButton = document.getElementById('theme-toggle');
    
        // 初期テーマの設定（デフォルトはライトモード）
        if (!localStorage.getItem('theme')) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.add(localStorage.getItem('theme'));
            themeToggleButton.textContent = localStorage.getItem('theme') === 'dark-mode' ? 'ライトモード' : 'ダークモード';
        }
    
        // ダークモード切り替えボタンのクリックイベント
        themeToggleButton.addEventListener('click', () => {
            if (document.body.classList.contains('light-mode')) {
                document.body.classList.replace('light-mode', 'dark-mode');
                themeToggleButton.textContent = 'ライトモード';
                localStorage.setItem('theme', 'dark-mode');
            } else {
                document.body.classList.replace('dark-mode', 'light-mode');
                themeToggleButton.textContent = 'ダークモード';
                localStorage.setItem('theme', 'light-mode');
            }
        });
    });
    

});
document.addEventListener('DOMContentLoaded', () => {
    const guideButton = document.getElementById('guide-button');
    const guideModal = document.getElementById('guide-modal');
    const closeModal = document.querySelector('.close');
    const modalContent = guideModal.querySelector('.modal-content');

    // 使い方ガイドボタンのクリックイベント
    guideButton.addEventListener('click', () => {
        guideModal.style.display = 'block';
        // アニメーションを開始
        requestAnimationFrame(() => {
            modalContent.classList.add('show');
        });
    });

    // モーダルの「×」ボタンで閉じる処理
    closeModal.addEventListener('click', closeGuideModal);

    // モーダルの外側をクリックして閉じる処理
    window.addEventListener('click', (event) => {
        if (event.target === guideModal) {
            closeGuideModal();
        }
    });

    // モーダルを閉じる関数
    function closeGuideModal() {
        modalContent.classList.remove('show');
        setTimeout(() => {
            guideModal.style.display = 'none';
        }, 200); // アニメーションが終わるまで待機
    }
});
