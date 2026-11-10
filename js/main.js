// Luodaan pelin osallistujat valitun moodin ja asetusten mukaan.
// 2 = Pelaaja 1 vs Pelaaja 2 | 3 = kolmen vapaa peli | 4 = Tiimi 1 vs Tiimi 2
const createPlayers = () => {
    const players = [];

    const BASE_VALUES = { flood: 0.2, metamorphosis: 0.25, curse: 0.18, regrowth: 0.18 };
    const balancedRoll = 3;

    const magicToggle = document.getElementById('magicToggle');
    const isMagicMode = magicToggle && magicToggle.checked;

    const pushMage = (name, prefix = "") => {
        if (name === "Muodonmuuttaja") {
            players.push({
                name: prefix + "Muodonmuuttaja",
                img: charImages["Muodonmuuttaja"],
                score: 0,
                spells: {
                    metamorphosis: calculateSpells(totalTurns, BASE_VALUES.metamorphosis, balancedRoll),
                    flood: calculateSpells(totalTurns, BASE_VALUES.flood, balancedRoll)
                }
            });
        } else if (name === "Kirouksenlangettaja") {
            players.push({
                name: prefix + "Kirouksenlangettaja",
                img: charImages["Kirouksenlangettaja"],
                score: 0,
                spells: {
                    hunger: calculateSpells(totalTurns, BASE_VALUES.curse, balancedRoll),
                    chaos: calculateSpells(totalTurns, BASE_VALUES.flood, balancedRoll)
                }
            });
        } else if (name === "Yrttitarhuri") {
            players.push({
                name: prefix + "Yrttitarhuri",
                img: charImages["Yrttitarhuri"],
                score: 0,
                spells: {
                    regrowth: calculateSpells(totalTurns, BASE_VALUES.regrowth, balancedRoll)
                },
                extraTurnGranted: false
            });
        }
    };

    if (isMagicMode) {
        // Taikapeli: valitut hahmot setupOrder-järjestyksessä (2 tai 3 riippuen moodista)
        if (playerMode === 4) {
            // Joukkuepelissä molemmat joukkueet valitsevat yhden hahmon
            setupOrder.slice(0, 2).forEach((name, i) => pushMage(name, `Tiimi ${i + 1}: `));
        } else {
            setupOrder.forEach((name) => pushMage(name));
        }
    } else {
        // Peruspeli ilman taikuutta
        if (playerMode === 4) {
            players.push({ name: "Tiimi 1", img: "🛡️", score: 0, spells: {} });
            players.push({ name: "Tiimi 2", img: "⚔️", score: 0, spells: {} });
        } else {
            const count = playerMode === 3 ? 3 : 2;
            const icons = ["👤", "👥", "🧑"];
            for (let i = 0; i < count; i++) {
                players.push({
                    name: `Pelaaja ${i + 1}`,
                    img: icons[i] || "👤",
                    score: 0,
                    spells: {}
                });
            }
        }
    }

    return players;
};

// Nollaa koko pelitila uutta peliä varten ilman sivun latausta
const resetCurrentGame = () => {
    currentRound = 1;
    turnsInCurrentRound = 0;
    currentPlayerIndex = 0;
    activeModifiers = { extendToEight: false, reduceToThree: false, chaosFourWords: false };
    pendingCurses = { hunger: -1, chaos: -1 };
    generatedWordsList = [];
    currentActiveTheme = "";
    selectedWordIndex = -1;
    activeCondition1 = "";
    activeCondition2 = "";
    usedWordsInThisGame = [];
    isExtraTurnRound = false;
    isMetamorphosisUsedThisTurn = false;
    currentBonusWordText = "";

    totalTurns = parseInt(document.getElementById('roundSelect').value) || 10;
    gamePlayers = createPlayers();

    document.body.dataset.mode = playerMode;

    // Palautetaan aloitusnäkymä
    wordList.innerHTML = '';
    wordList.style.display = 'none';
    ruleInstruction.textContent = '';
    spellContainer.style.display = 'none';
    roundControls.style.display = 'none';
    btnDisplayWords.style.display = 'none';
    if (themeDisplay) themeDisplay.textContent = '';
    if (themeImage) themeImage.style.display = 'none';
    const curseBannerEl = document.getElementById('curseBanner');
    if (curseBannerEl) curseBannerEl.style.display = 'none';
    if (window.stopTurnTimer) window.stopTurnTimer();

    btn.style.display = 'block';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = 'Aloita kierros';

    updateTurnDisplay();
};
window.resetCurrentGame = resetCurrentGame;

// Перенастраиваем кнопку старта: теперь она СРАЗУ запускает игру на основе настроек
document.getElementById('startGameBtn').addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();

    totalTurns = parseInt(document.getElementById('roundSelect').value) || 10;
    gamePlayers = createPlayers();

    document.body.dataset.mode = playerMode;

    if (typeof usedWordsInThisGame !== 'undefined') {
        usedWordsInThisGame = [];
    }

    document.getElementById('characterModal').style.display = 'none';
    document.getElementById('playerTurn').style.display = 'flex';
    roundControls.style.display = 'none';

    updateTurnDisplay();
});

// --- БЛОКИРОВКА КНОПКИ СТАРТА НА ВРЕМЯ ЗАГРУЗКИ СЛОВАРЕЙ ---
const startGameBtn = document.getElementById('startGameBtn');
let dictionariesReady = false;
let dictionariesFailed = false;

// Единая точка обновления кнопки старта: учитывает загрузку словарей,
// режим магии и количество выбранных персонажей.
const refreshStartButton = () => {
    const magicToggle = document.getElementById('magicToggle');
    const isMagicMode = magicToggle && magicToggle.checked;

    if (dictionariesFailed) {
        startGameBtn.disabled = true;
        startGameBtn.textContent = "⚠️ SANAKIRJAT PUUTTUVAT";
        return;
    }

    if (!dictionariesReady) {
        startGameBtn.disabled = true;
        startGameBtn.textContent = "⏳ Ladataan sanakirjoja...";
        return;
    }

    if (isMagicMode) {
        const need = (typeof requiredPicks === 'function') ? requiredPicks() : 2;
        const charsReady = setupOrder.length === need;
        startGameBtn.disabled = !charsReady;
        startGameBtn.textContent = charsReady ? "ALOITA TAIKAPELI" : `VALITKAA ${need} HAHMOA`;
        startGameBtn.style.background = "#5b21b6";
    } else {
        startGameBtn.disabled = false;
        startGameBtn.textContent = "ALOITA PERUSPELI";
        startGameBtn.style.background = "#27ae60";
    }
};
window.refreshStartButton = refreshStartButton;

const showDictionaryError = (err) => {
    console.error("Sanakirjojen lataus epäonnistui:", err);
    dictionariesFailed = true;
    const modalContent = document.querySelector('#characterModal .modal-content');
    if (modalContent && !document.getElementById('dictionaryErrorBanner')) {
        const banner = document.createElement('div');
        banner.id = 'dictionaryErrorBanner';
        banner.style.cssText = 'background: rgba(192, 57, 43, 0.25); border: 1px solid rgba(192, 57, 43, 0.6); color: #ff9d94; padding: 12px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5; margin-bottom: 15px; text-align: left;';
        banner.innerHTML = '⚠️ <strong>Sanakirjoja ei voitu ladata.</strong><br>' +
            'Peli ei toimi avattuna suoraan tiedostona (file://). Käynnistä se paikallisella palvelimella ' +
            '(esim. <code>python -m http.server</code>) ja avaa osoitteessa <code>http://localhost:8000</code>.';
        modalContent.insertBefore(banner, modalContent.children[1] || null);
    }
    startGameBtn.disabled = true;
    startGameBtn.textContent = "⚠️ SANAKIRJAT PUUTTUVAT";
};

if (typeof wordsReady !== 'undefined') {
    refreshStartButton(); // Показывает состояние загрузки
    wordsReady
        .then(() => {
            dictionariesReady = true;
            refreshStartButton();
        })
        .catch(showDictionaryError);
} else {
    // js/words.js не загрузился вообще — словарей не будет
    showDictionaryError(new Error("words.js is not loaded"));
}

// 3. Pelin pääpainikkeiden tapahtumakuuntelijat (Event Listeners)
btn.addEventListener("click", () => {
    playClickSound();
    // Huonepelissä vain vuorossa oleva selittäjä voi arpoa teeman
    if (typeof window.isRoomGame === 'function' && window.isRoomGame() && !window.netIsMyTurn()) return;
    randomizeTheme();
});

btnDisplayWords.addEventListener("click", () => {
    playClickSound();
    if (typeof window.isRoomGame === 'function' && window.isRoomGame() && !window.netIsMyTurn()) return;
    if (wordList.style.display === "none") {
        switchToWords();
    } else {
        toggleWordVisibility();
    }
});

btnGuessed.addEventListener("click", () => {
    playClickSound();

    const finishGuessed = (guesserIdx) => {
        // Очищаем HTML и скрываем список, чтобы следующий игрок не видел старые слова
        wordList.innerHTML = '';
        wordList.style.display = "none";
        window.hideBonusHint && window.hideBonusHint();
        endRound(true, guesserIdx);
    };

    // 3 pelaajan vapaa peli: kysytään kuka kahdesta arvaajasta sai sanan
    if (playerMode === 3 && gamePlayers.length === 3 && typeof window.openWhoGuessedModal === 'function') {
        window.openWhoGuessedModal((guesserIdx) => {
            if (guesserIdx >= 0) finishGuessed(guesserIdx);
            // Peruutettaessa ei lopeteta vuoroa — pelaaja jatkaa
        });
    } else {
        finishGuessed(-1);
    }
});

btnGiveUp.addEventListener("click", () => {
    playClickSound();

    // Очищаем HTML и скрываем список, чтобы следующий игрок не видел старые слова
    wordList.innerHTML = '';
    wordList.style.display = "none";
    window.hideBonusHint && window.hideBonusHint();

    endRound(false);
});

// RYÖSTÖ: vastustaja arvasi ensin (4+ joukkuemoodi)
const handleStealClick = () => {
    if (typeof playClickSound === 'function') playClickSound();
    const stealIdx = (currentPlayerIndex + 1) % gamePlayers.length;
    wordList.innerHTML = '';
    wordList.style.display = "none";
    endRound(false, -1, stealIdx);
};

document.getElementById('btnStolen')?.addEventListener('click', handleStealClick);

// Voittomodaalin painikkeet
document.getElementById('btnPlayAgain')?.addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();
    document.getElementById('victoryModal').style.display = 'none';
    // Huonepelissä vain isäntä voi käynnistää uuden pelin
    if (typeof window.isRoomGame === 'function' && window.isRoomGame()) {
        if (typeof window.netReplayRequest === 'function') window.netReplayRequest();
        return;
    }
    resetCurrentGame();
});

document.getElementById('btnChangeSettings')?.addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();
    document.getElementById('victoryModal').style.display = 'none';
    document.getElementById('characterModal').style.display = 'flex';
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

    // Huonepeli: kerro muille että sana on lukittu (sisältöä ei paljasteta)
    if (typeof window.netRelayWordLocked === 'function') window.netRelayWordLocked();
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