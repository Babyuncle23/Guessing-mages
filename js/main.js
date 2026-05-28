// ==========================================
// main.js - PELIN ALUSTUS JA PÄÄPAINIKKEET
// ==========================================

// 1. Kun hahmovalinnan jälkeen painetaan "Jatkakoon nopanheittoon →", avataan uusi nopparuutu
document.getElementById('startGameBtn').addEventListener('click', () => {
    playClickSound(); // 🔊 Äänipalaute klikkauksesta
    
    // Nollataan uuden nopparuudun pikkutekstit ja painikkeet uutta peliä varten
    document.getElementById('p1DiceResultText').textContent = "";
    document.getElementById('p2DiceResultText').textContent = "";
    document.getElementById('p1DiceBtn').textContent = "Heitä noppaa";
    document.getElementById('p2DiceBtn').textContent = "Heitä noppaa";
    
    // 🎲 ALUSTUS: Valmistellaan digitaaliset nopat kysymysmerkeillä ilman Unicode-venymistä
    const p1Visual = document.getElementById('p1DiceVisual');
    const p2Visual = document.getElementById('p2DiceVisual');
    if (p1Visual && p2Visual) {
        p1Visual.className = "dice-graphic empty";
        p2Visual.className = "dice-graphic empty";
        p1Visual.textContent = "?";
        p2Visual.textContent = "?";
        p1Visual.removeAttribute('data-roll');
        p2Visual.removeAttribute('data-roll');
    }
    
    // Asetetaan valittujen hahmojen nimet noppalaatikoihin
    document.getElementById('p1DiceName').textContent = `${setupOrder[0]}`;
    document.getElementById('p2DiceName').textContent = `${setupOrder[1]}`;
    
    // Valmistellaan ensimmäisen pelaajan noppakortti aktiiviseksi
    document.getElementById('p1DiceCard').style.opacity = "1";
    document.getElementById('p2DiceCard').style.opacity = "0.4";
    document.getElementById('p1DiceBtn').disabled = false;
    document.getElementById('p2DiceBtn').disabled = true;
    document.getElementById('confirmDiceMatchBtn').style.display = "none";
    
    // Ohjeteksti vuorosta
    document.getElementById('diceStatusText').textContent = `Vuoro hahmolla: ${setupOrder[0]} – Heitä noppaa!`;

    // Vaihdetaan näkymä hahmovalinnasta nopparuutuun
    document.querySelector('.character-options').style.display = 'none';
    document.getElementById('startGameBtn').style.display = 'none';
    document.getElementById('diceBlock').style.display = 'block';
});

// 2. Kun kumpikin on heittänyt noppaa, käynnistetään varsinainen peli maagisilla voimilla
document.getElementById('confirmDiceMatchBtn').addEventListener('click', () => {
    playClickSound(); // 🔊 Äänipalaute klikkauksesta
    
    totalTurns = parseInt(document.getElementById('roundSelect').value);
    gamePlayers = [];

    const BASE_VALUES = { flood: 0.2, metamorphosis: 0.25, curse: 0.18, regrowth: 0.18 };

    // Luodaan hahmo-objektit ja lasketaan loitsujen määrät nopanheittojen perusteella
    setupOrder.forEach((name, idx) => {
        const rollResult = (idx === 0) ? playerRolls.p1 : playerRolls.p2;

        if (name === "Muodonmuuttaja") {
            gamePlayers.push({
                name: "Muodonmuuttaja",
                img: charImages["Muodonmuuttaja"],
                score: 0,
                spells: { 
                    metamorphosis: calculateSpells(totalTurns, BASE_VALUES.metamorphosis, rollResult),
                    flood: calculateSpells(totalTurns, BASE_VALUES.flood, rollResult)
                }
            });
        } else if (name === "Kirouksenlangettaja") {
            gamePlayers.push({
                name: "Kirouksenlangettaja",
                img: charImages["Kirouksenlangettaja"],
                score: 0,
                spells: { 
                    hunger: calculateSpells(totalTurns, BASE_VALUES.curse, rollResult),
                    chaos: calculateSpells(totalTurns, BASE_VALUES.flood, rollResult)
                }
            });
        } else if (name === "Yrttitarhuri") {
            const selectedImg = charImages["Yrttitarhuri"];

            gamePlayers.push({
                name: "Yrttitarhuri",
                img: selectedImg,
                score: 0,
                spells: { 
                    regrowth: calculateSpells(totalTurns, BASE_VALUES.regrowth, rollResult)
                },
                extraTurnGranted: false
            });
        }
    });

    // Tyhjennetään käytettyjen sanojen muisti uutta peliä varten
    if (typeof usedWordsInThisGame !== 'undefined') {
        usedWordsInThisGame = [];
    }

    // Suljetaan asetusikkuna ja avapan peliruutu
    document.getElementById('characterModal').style.display = 'none';
    document.getElementById('playerTurn').style.display = 'flex';
    roundControls.style.display = 'none';
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

    // Jos teemana on perusvaihtoehto (sokea valinta), klikkaus estetään
    if (currentActiveTheme.includes("perusvaihtoehto") || activeCondition1 === "perusvaihtoehto") {
        return; 
    }

    playClickSound(); // 🔊 Äänipalaute sanan valinnasta
    
    // Poistetaan vanha valinta kaikilta ja lisätään korostus klikatulle sanalle
    wordList.querySelectorAll('li').forEach(el => el.classList.remove('selected-word'));
    li.classList.add('selected-word');
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
            ctx.textBaseline = 'top';    // Привязка к верху
            ctx.textAlign = 'left';      // Привязка к левому краю

            const textX = -2; // Прижимаем к левому краю
            const textY = -2; // Прижимаем к верхнему краю

            // Плотный темный контур (на него тоже ляжет свечение)
            ctx.strokeStyle = '#000000';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 6; 
            ctx.strokeText('S', textX, textY);

            // Накладываем сверху золотой цвет
            ctx.fillStyle = '#e5c158'; 
            ctx.fillText('S', textX, textY);

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
};

// Запустите её при старте
initGameDisplay();