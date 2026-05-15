// DOM Viittaukset
const btn = document.getElementById("btn");
const themeDisplay = document.getElementById("themeDisplay");
const themeImage = document.getElementById("img");
const drumAnim = document.getElementById("loader");
const btnDisplayWords = document.getElementById("btnDisplayWords");
const container = document.querySelector(".container");
const wordList = document.getElementById("wordList");
const ruleInstruction = document.getElementById("ruleInstruction");
const roundControls = document.getElementById("roundControls");
const btnGuessed = document.getElementById("btnGuessed");
const btnGiveUp = document.getElementById("btnGiveUp");
const spellContainer = document.getElementById("spellContainer");
const spellBtn1 = document.getElementById("spellBtn1");
const spellBtn2 = document.getElementById("spellBtn2");

const updateTurnDisplay = () => {
    if (gamePlayers.length < 2) return;
    const p1 = gamePlayers[0]; // Ensimmäinen pelaaja
    const p2 = gamePlayers[1]; // Toinen pelaaja

    document.getElementById('roundDisplay').textContent = `Kierros: ${currentRound} / ${totalTurns}`;
    document.getElementById('currentAvatar').src = gamePlayers[currentPlayerIndex].img;
    document.getElementById('currentName').textContent = `Vuoro: ${gamePlayers[currentPlayerIndex].name}`;
    document.getElementById('scoreDisplay').innerHTML = `<span>${p1.name}: <strong>${p1.score}p</strong></span> &nbsp;&nbsp;⚡&nbsp;&nbsp; <span>${p2.name}: <strong>${p2.score}p</strong></span>`;

    const debuffContainer = document.getElementById('debuffIcons');
    debuffContainer.innerHTML = '';
    
    if (activeModifiers.reduceToThree || activeModifiers.chaosFourWords) {
        debuffContainer.innerHTML += `<div class="debuff-badge" title="Kirous aktiivisena">☠️</div>`;
    }
    if (activeModifiers.extendToEight) {
        debuffContainer.innerHTML += `<div class="debuff-badge buff" title="Korttitulva aktiivisena">🌟</div>`;
    }
    if (gamePlayers[currentPlayerIndex].name === "Yrttitarhuri" && druidShieldActivated) {
        debuffContainer.innerHTML += `<div class="debuff-badge buff-druid" title="Luonnon suojelu: Kirous torjuttu! 🎉">🌿</div>`;
    }
};

const renderOlList = () => {
    wordList.style.display = "block";
    wordList.innerHTML = generatedWordsList.map((w, index) =>
        `<li data-index="${index}"><strong>${index + 1}.</strong> ${w}</li>`
    ).join('');
};

const handleDiceRoll = (playerKey, btnId, visualId, nextBtnId, nextCardId, isLast) => {
    const rollBtn = document.getElementById(btnId);
    const diceVisual = document.getElementById(visualId);
    const diceCard = rollBtn.closest('.dice-holder-card');
    const resultText = diceCard.querySelector('.dice-result-subtext');
    const diceBox = diceCard.querySelector('.dice-box-wrapper');
    
    playClickSound();
    rollBtn.disabled = true;
    
    // Запускаем тряску только самого кубика и включаем звук
    diceBox.classList.add('shake-animation');
    resultText.textContent = "Heitetään...";
    
    if (sounds.diceRollSound) {
        sounds.diceRollSound.currentTime = 0;
        sounds.diceRollSound.play().catch(e => console.warn("Äänen toisto estetty:", e));
    }
    
    // ИСПРАВЛЕННАЯ ФУНКЦИЯ: Генерирует ровно 7 пустых HTML-блоков для точек.
    // Новый CSS сам выберет и покрасит нужные точки в зависимости от data-roll!
    const renderDiceDots = (targetElement, num) => {
        targetElement.classList.remove('empty');
        targetElement.textContent = ""; // Полностью стираем старый текстовый "?" или "1"
        targetElement.setAttribute('data-roll', num);
        
        // Создаем 7 пустых заготовок (dice-dot), которые встанут по абсолютной сетке
        let dotsHtml = '';
        for (let i = 0; i < 7; i++) {
            dotsHtml += '<div class="dice-dot"></div>';
        }
        targetElement.innerHTML = dotsHtml;
    };

    let shuffleCount = 0;
    const shuffleInterval = setInterval(() => {
        // Во время анимации крутим случайные значения
        const tempRoll = Math.floor(Math.random() * 6) + 1;
        renderDiceDots(diceVisual, tempRoll);
        shuffleCount++;
        
        if (shuffleCount >= 12) { 
            clearInterval(shuffleInterval);
            
            // Останавливаем тряску и звук
            diceBox.classList.remove('shake-animation');
            
            if (sounds.diceRollSound) {
                sounds.diceRollSound.pause();
                sounds.diceRollSound.currentTime = 0;
            }
            
            const roll = Math.floor(Math.random() * 6) + 1;
            playerRolls[playerKey] = roll; // Записываем итоговый результат
            
            // Отрисовываем финальные круглые точки по сетке
            renderDiceDots(diceVisual, roll);
            
            let luckText = "Normaali mana";
            if (roll <= 2) luckText = "Matala mana 📉";
            if (roll >= 5) luckText = "Korkea mana! 📈";
            
            resultText.textContent = `Tulos: ${roll}`;
            rollBtn.textContent = luckText;
            
            if (!isLast) {
                document.getElementById('diceStatusText').textContent = `Seuraavaksi heittää: ${setupOrder[1]}`;
                if (nextCardId) document.getElementById(nextCardId).style.opacity = "1";
                if (nextBtnId) document.getElementById(nextBtnId).disabled = false;
            } else {
                document.getElementById('diceStatusText').textContent = "🔮 Molemmat maagit ovat määrittäneet voimansa!";
                document.getElementById('confirmDiceMatchBtn').style.display = "block"; 
            }
        }
    }, 80);
};

const spellHelpBtn = document.getElementById("spellHelpBtn");
const spellHelpModal = document.getElementById("spellHelpModal");
const closeSpellHelpBtn = document.getElementById("closeSpellHelpBtn");

if (spellHelpBtn && spellHelpModal) {
    spellHelpBtn.addEventListener("click", (e) => {
        e.preventDefault();
        playAudio(sounds.book);
        spellHelpModal.style.display = "flex";
    });
}

if (closeSpellHelpBtn && spellHelpModal) {
    closeSpellHelpBtn.addEventListener("click", (e) => {
        e.preventDefault();
        playClickSound();
        spellHelpModal.style.display = "none";
    });
}

if (spellHelpModal) {
    spellHelpModal.addEventListener("click", (e) => {
        if (e.target === spellHelpModal) {
            playClickSound();
            spellHelpModal.style.display = "none";
        }
    });
}

if (sfwModeCheckbox) {
    sfwModeCheckbox.addEventListener('change', () => {
        const druidCard = document.querySelector('.char-card[data-char="Yrttitarhuri"]');
        const druidCardImg = druidCard ? druidCard.querySelector('img') : null;
        const sfwDesc = document.getElementById("sfwDescription");
        
        if (druidCardImg) {
            if (sfwModeCheckbox.checked) {
                // Когда SFW включен: показываем SFW-картинку Друида и полностью скрываем описание
                druidCardImg.src = "pictures/worgen_druid_by_direbrow_deznfqq-fullview.jpg";
                if (sfwDesc) sfwDesc.innerHTML = "";
            } else {
                // КОРРЕКТНОЕ ОПИСАНИЕ НА ФИНСКОМ ПРИ СНЯТИИ ГАЛОЧКИ:
                druidCardImg.src = "pictures/d84f78_e78d7b66397d4bab934bee701b9aa427~mv2.jpg";
                if (sfwDesc) {
                    sfwDesc.innerHTML = "Sensuroi pieruäänen, piilottaa teemojen kuvat ja vaihtaa Druidin kuvan.";
                }
            }
            // Обновляем глобальный объект картинок, чтобы в самой игре у Друида был правильный аватар
            charImages["Yrttitarhuri"] = druidCardImg.src;
        }
    });
}

document.getElementById('p1DiceBtn').addEventListener('click', () => {
    handleDiceRoll('p1', 'p1DiceBtn', 'p1DiceVisual', 'p2DiceBtn', 'p2DiceCard', false);
});

document.getElementById('p2DiceBtn').addEventListener('click', () => {
    handleDiceRoll('p2', 'p2DiceBtn', 'p2DiceVisual', null, null, true);
});