// Перенастраиваем кнопку старта: теперь она СРАЗУ запускает игру на основе настроек
document.getElementById('startGameBtn').addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();
    
    // Считываем количество раундов из настроек
    totalTurns = parseInt(document.getElementById('roundSelect').value) || 10;
    gamePlayers = [];

    // Базовые коэффициенты баланса заклинаний (остаются прежними)
    const BASE_VALUES = { flood: 0.2, metamorphosis: 0.25, curse: 0.18, regrowth: 0.18 };
    
    // ФИКСИРОВАННЫЙ БАЛАНС: вместо кубика передаем среднее стабильное значение 3.5 (округлим до 3)
    const balancedRoll = 3; 

    // Создаем объекты игроков напрямую на основе выбранных в setupOrder харонов
    setupOrder.forEach((name) => {
        if (name === "Muodonmuuttaja") {
            gamePlayers.push({
                name: "Muodonmuuttaja",
                img: charImages["Muodonmuuttaja"],
                score: 0,
                spells: { 
                    metamorphosis: calculateSpells(totalTurns, BASE_VALUES.metamorphosis, balancedRoll),
                    flood: calculateSpells(totalTurns, BASE_VALUES.flood, balancedRoll)
                }
            });
        } else if (name === "Kirouksenlangettaja") {
            gamePlayers.push({
                name: "Kirouksenlangettaja",
                img: charImages["Kirouksenlangettaja"],
                score: 0,
                spells: { 
                    hunger: calculateSpells(totalTurns, BASE_VALUES.curse, balancedRoll),
                    chaos: calculateSpells(totalTurns, BASE_VALUES.flood, balancedRoll)
                }
            });
        } else if (name === "Yrttitarhuri") {
            gamePlayers.push({
                name: "Yrttitarhuri",
                img: charImages["Yrttitarhuri"],
                score: 0,
                spells: { 
                    regrowth: calculateSpells(totalTurns, BASE_VALUES.regrowth, balancedRoll)
                },
                extraTurnGranted: false
            });
        }
    });

    // Очищаем историю слов для новой игры
    if (typeof usedWordsInThisGame !== 'undefined') {
        usedWordsInThisGame = [];
    }

    // Закрываем модалку настроек/персонажей и сразу открываем игровое поле
    document.getElementById('characterModal').style.display = 'none';
    document.getElementById('playerTurn').style.display = 'flex';
    roundControls.style.display = 'none';
    
    // Обновляем UI под первый ход
    updateTurnDisplay();
});

// 3. Pelin pääpainikkeiden tapahtumakuuntelijat (Event Listeners)
btn.addEventListener("click", () => { 
    playClickSound(); 
    randomizeTheme(); 
});

btnDisplayWords.addEventListener("click", () => { 
    playClickSound(); 
    if (wordList.style.display === "none") {
        switchToWords();
    } else {
        toggleWordVisibility();
    }
});

btnGuessed.addEventListener("click", () => { 
    playClickSound(); 
    
    // ИСПРАВЛЕНИЕ: Очищаем HTML и скрываем список, чтобы следующий игрок не видел старые слова
    wordList.innerHTML = '';
    wordList.style.display = "none";
    
    endRound(true); 
});

btnGiveUp.addEventListener("click", () => { 
    playClickSound(); 
    
    // ИСПРАВЛЕНИЕ: Очищаем HTML и скрываем список, чтобы следующий игрок не видел старые слова
    wordList.innerHTML = '';
    wordList.style.display = "none";
    
    endRound(false); 
});
// 4. Sanakorttien klikkauskuuntelija (Lukitsee valitun sanan)
wordList.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;

    if (typeof playClickSound === 'function') playClickSound();
    
    // 1. Сбрасываем стили у всех элементов списка
    wordList.querySelectorAll('li').forEach(el => {
        el.classList.remove('selected-word');
        el.style.setProperty('background', 'rgba(255, 255, 255, 0.03)', 'important');
        el.style.setProperty('border', '1px solid var(--soft-border)', 'important');
    });
    
    // 2. Визуально зажимаем текущее слово (фиолетовый фон + золотая рамка)
    li.classList.add('selected-word');
    li.style.setProperty('background', 'rgba(91, 33, 182, 0.35)', 'important');
    li.style.setProperty('border', '1px solid var(--gold)', 'important');
    
    // 3. ЗАПИСЫВАЕМ ИНДЕКС СЛОВА В ПАМЯТЬ
    selectedWordIndex = parseInt(li.getAttribute('data-index'), 10);
    console.log("Зажато слово с индексом:", selectedWordIndex); // Для проверки в консоли браузера
});

window.addEventListener('DOMContentLoaded', () => {
    document.fonts.ready.then(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.imageSmoothingEnabled = false;

            // 1. РИСУЕМ ВОЛШЕБНИКА (Внизу справа, как основа композиции)
            ctx.font = '44px sans-serif';
            ctx.textBaseline = 'bottom'; // Привязка к низу
            ctx.textAlign = 'right';
            // Сажаем мага в правый нижний угол
            ctx.fillText('🧙‍♂️', 68, 66); 

            // 2. НАСТРОЙКА МАГИЧЕСКОГО СВЕЧЕНИЯ ДЛЯ БУКВЫ S
            ctx.shadowColor = '#00ffff'; // Бирюзовое/голубое магическое свечение (можно заменить на #f1c40f для золотого)
            ctx.shadowBlur = 10;          // Радиус размытия свечения
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // 3. РИСУЕМ БУКВУ S (Крупная, в левом верхнем углу)
            ctx.font = '900 42px "Arial Black", "Impact", sans-serif'; 
            ctx.textBaseline = 'top';    
            ctx.textAlign = 'left';      

            const textX = -2; 
            const textY = -2; 

            ctx.strokeStyle = '#000000';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 6; 
            ctx.strokeText('A', textX, textY); // ИСПРАВЛЕНО НА 'A'

            ctx.fillStyle = '#e5c158'; 
            ctx.fillText('A', textX, textY);    // ИСПРАВЛЕНО НА 'A'

            // Сбрасываем тень, чтобы она не влияла на другие элементы в будущем
            ctx.shadowBlur = 0;
        }

        // 4. Записываем готовую картинку в тег фавиконки
        const favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = canvas.toDataURL('image/png');
        }
    });
});

const initGameDisplay = () => {
    btn.style.display = "block";           // Только кнопка "Aloita kierros" должна быть видна
    btnDisplayWords.style.display = "none"; // Прячем показ слов
    roundControls.style.display = "none";   // Прячем кнопки правильно/неправильно
    wordList.style.display = "none";        // Прячем список слов
    spellContainer.style.display = "none";  // Прячем магию

    // Очищаем и скрываем блок темы при первом старте игры
    if (document.getElementById("themeDisplay")) document.getElementById("themeDisplay").textContent = "";
    if (document.getElementById("img")) document.getElementById("img").style.display = "none";
};

// Запустите её при старте
initGameDisplay();

const targetThemeBlock = document.getElementById('themeBlock');
if (targetThemeBlock) {
    targetThemeBlock.addEventListener('click', () => {
        const hasDrawingHint = document.getElementById('themeDrawingHint');
        if (!hasDrawingHint) return;

        if (!generatedWordsList || generatedWordsList.length === 0 || wordList.style.display === "none") return;
        
        if (typeof playClickSound === 'function') playClickSound();
        
        if (currentActiveTheme === "vain emojit") {
            if (typeof window.openEmojiModal === 'function') window.openEmojiModal();
        } else {
            if (typeof window.openDrawingModal === 'function') window.openDrawingModal();
        }
    });
}