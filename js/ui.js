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
const spellHelpBtn1 = document.getElementById("spellHelpBtn1");
const spellHelpBtn2 = document.getElementById("spellHelpBtn2");
const spellRow1 = document.getElementById("spellRow1");
const spellRow2 = document.getElementById("spellRow2");
const spellInfoBox = document.getElementById("spellInfoBox");
const spellHelpModal = document.getElementById("spellHelpModal");
const spellHelpModalBody = document.getElementById("spellHelpModalBody");
const closeSpellHelpModal = document.getElementById("closeSpellHelpModal");

const spellDescriptions = {
    Korttitulva: "🐺 Korttitulva: Laajentaa sanalistaasi kahdella lisäsanalla. Antaa enemmän valinnanvaraa, jos selityksen ehto tuntuu vaikealta.",
    Sanametamorfoosi: "🌀 Sanametamorfoosi: Vaihtaa näytöllä olevat sanat uusiin. Rajoitus: Tästä kierroksesta voi ansaita vain 0,5 pistettä.",
    Korttinälkä: "📉 Korttinälkä: Iskee vastustajan seuraavaan vuoroon. Kutistaa hänen sanalistansa kahdella sanalla, mikä vähentää hänen valinnanvaraansa.",
    Sanakaaos: "☿ Sanakaaos: Iskee vastustajan seuraavaan vuoroon. Korvaa osan hänen sanoistaan todennäköisesti oudoimilla sanoilla, joita on vaikeampi selittää.",
    Kasvupurkaus: "🌱 Kasvupurkaus: Jos vastustaja arvaa sanasi oikein, saat heti perään ylimääräisen bonusvuoron! Bonusvuoron onnistumisesta saa 0,5 pistettä."
};

const showSpellInfo = (spellKey) => {
    const description = spellDescriptions[spellKey];
    if (!description || !spellHelpModal || !spellHelpModalBody) return;

    spellHelpModalBody.innerHTML = `
        <div class="spell-info-title">
            <strong>${spellKey}</strong>
        </div>
        <p>${description}</p>
    `;
    spellHelpModal.dataset.visibleSpell = spellKey;
    spellHelpModal.style.display = "flex";
    document.body.classList.add("spell-help-modal-open");
};

const hideSpellHelpModal = () => {
    if (!spellHelpModal) return;
    spellHelpModal.style.display = "none";
    document.body.classList.remove("spell-help-modal-open");
};

const toggleSpellInfo = (spellKey) => {
    if (!spellHelpModal) return;
    const isOpen = spellHelpModal.style.display === "flex";
    const sameSpell = spellHelpModal.dataset.visibleSpell === spellKey;
    if (isOpen && sameSpell) {
        hideSpellHelpModal();
        return;
    }
    showSpellInfo(spellKey);
};

if (spellHelpBtn1) {
    spellHelpBtn1.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = spellHelpBtn1.dataset.spell || "Korttitulva";
        toggleSpellInfo(key);
    });
}
if (spellHelpBtn2) {
    spellHelpBtn2.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = spellHelpBtn2.dataset.spell || "Korttinälkä";
        toggleSpellInfo(key);
    });
}

if (closeSpellHelpModal) {
    closeSpellHelpModal.addEventListener("click", (e) => {
        e.stopPropagation();
        hideSpellHelpModal();
    });
}

document.addEventListener("click", (e) => {
    if (!spellHelpModal || spellHelpModal.style.display !== "flex") return;
    const content = spellHelpModal.querySelector(".spell-help-modal-content");
    if (content && content.contains(e.target)) return;
    hideSpellHelpModal();
});

const updateTurnDisplay = () => {
    if (gamePlayers.length < 2) return;
    const p1 = gamePlayers[0]; // Ensimmäinen pelaaja
    const p2 = gamePlayers[1]; // Toinen pelaaja

    document.getElementById('roundDisplay').textContent = `Kierros: ${currentRound} / ${totalTurns}`;
    const avatarEl = document.getElementById('currentAvatar');
    if (avatarEl) avatarEl.textContent = gamePlayers[currentPlayerIndex].img || '';
    
    // MUUTOS: Lisätty <br> ja laitettu hahmon nimi <span> sisään, jotta CSS voi muokata sitä erikseen
    document.getElementById('currentName').innerHTML = `Vuoro:<br><span>${gamePlayers[currentPlayerIndex].name}</span>`;
    
    // MUUTOS: Poistettu salama ja laitettu tiimit omiksi riveikseen <br>-tagilla
    document.getElementById('scoreDisplay').innerHTML = `<span>${p1.name}: <strong>${p1.score}p</strong></span><br><span>${p2.name}: <strong>${p2.score}p</strong></span>`;

    const debuffContainer = document.getElementById('debuffIcons');
    debuffContainer.innerHTML = '';
    
    if (activeModifiers.reduceToThree || activeModifiers.chaosFourWords) {
        debuffContainer.innerHTML += `<div class="debuff-badge" title="Kirous aktiivisena">☠️</div>`;
    }
    if (activeModifiers.extendToEight) {
        debuffContainer.innerHTML += `<div class="debuff-badge buff" title="Korttitulva aktiivisena">🌟</div>`;
    }
};

const renderOlList = () => {
    wordList.style.display = "block";
    wordList.innerHTML = generatedWordsList.map((w, index) =>
        `<li data-index="${index}"><strong>${index + 1}.</strong> ${w}</li>`
    ).join('');
};

const clearWordsBeforeTurn = () => {
    if (typeof wordList !== 'undefined') {
        wordList.innerHTML = '';
        wordList.style.display = "none";
    }
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
            
            let luckText = "Normaali 😐";
            if (roll <= 2) luckText = "Minimi 🙁";
            if (roll >= 5) luckText = "Maksimi 🙂";
            
            resultText.textContent = `Tulos: ${roll}`;
            rollBtn.textContent = luckText;
            
            if (!isLast) {
                document.getElementById('diceStatusText').textContent = `Seuraavaksi heittää: ${setupOrder[1]}`;
                if (nextCardId) document.getElementById(nextCardId).style.opacity = "1";
                if (nextBtnId) document.getElementById(nextBtnId).disabled = false;
            } else {
                document.getElementById('diceStatusText').textContent = "🔮 Molemmat taikurit ovat määrittäneet voimansa!";
                document.getElementById('confirmDiceMatchBtn').style.display = "block"; 
            }
        }
    }, 80);
};

// Family-friendly toggle removed; images replaced by emojis.

document.getElementById('p1DiceBtn').addEventListener('click', () => {
    handleDiceRoll('p1', 'p1DiceBtn', 'p1DiceVisual', 'p2DiceBtn', 'p2DiceCard', false);
});

document.getElementById('p2DiceBtn').addEventListener('click', () => {
    handleDiceRoll('p2', 'p2DiceBtn', 'p2DiceVisual', null, null, true);
});

// Добавили аргумент evt на первое место
function openTab(evt, tabId) {
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));

  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach(button => button.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  
  // Теперь используем переданный аргумент evt вместо глобального event
  evt.currentTarget.classList.add('active');
}

function toggleAccordion(button) {
    button.classList.toggle('active');
    const content = button.nextElementSibling;
    
    // Tarkistetaan onko akkordioni jo auki
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        content.style.maxHeight = null; // Suljetaan nollaan
    } else {
        content.classList.add('open');
        // Laskee tarkan korkeuden lennosta puhelimen ruudun mukaan:
        content.style.maxHeight = content.scrollHeight + "px"; 
    }

    // Ääniefekti säilyy ennallaan
    if (typeof playClickSound === 'function') {
        playClickSound();
    }
}
