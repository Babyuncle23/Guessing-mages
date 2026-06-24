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
    Sanametamorfoosi: "🌀 Sanametamorfoosi: Vaihtaa näytöllä olevat sanat uusiin. Rajoitus: Tästä kierroksesta ansaitset 50 pistettä 100 pisteen sijaan.",
    Korttinälkä: "📉 Korttinälkä: Iskee vastustajan seuraavaan vuoroon. Kutistaa hänen sanalistansa kahdella sanalla, mikä vähentää hänen valinnanvaraansa.",
    Sanakaaos: "☿ Sanakaaos: Iskee vastustajan seuraavaan vuoroon. Korvaa osan hänen sanoistaan todennäköisesti oudoimilla sanoilla, joita on vaikeampi selittää.",
    Kasvupurkaus: "🌱 Kasvupurkaus: Jos vastustaja arvaa sanasi oikein, saat heti perään ylimääräisen bonusvuoron! Bonusvuoron onnistumisesta saa 50 pistettä."
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
    const p1 = gamePlayers[0]; 
    const p2 = gamePlayers[1]; 

    document.getElementById('roundDisplay').textContent = `Kierros: ${currentRound} / ${totalTurns}`;
    const avatarEl = document.getElementById('currentAvatar');
    if (avatarEl) avatarEl.textContent = gamePlayers[currentPlayerIndex].img || '';
    
    document.getElementById('currentName').innerHTML = `Vuoro:<br><span>${gamePlayers[currentPlayerIndex].name}</span>`;
    
    // Перевели отображение на целые числа (100, 50, 25)
    document.getElementById('scoreDisplay').innerHTML = `<span>${p1.name}: <strong>${p1.score}p</strong></span><br><span>${p2.name}: <strong>${p2.score}p</strong></span>`;

    const debuffContainer = document.getElementById('debuffIcons');
    debuffContainer.innerHTML = '';
    
    if (activeModifiers.reduceToThree || activeModifiers.chaosFourWords) {
        debuffContainer.innerHTML += `<div class="debuff-badge" title="Kirous aktiivisena">☠️</div>`;
    }
    if (activeModifiers.extendToEight) {
        debuffContainer.innerHTML += `<div class="debuff-badge buff" title="Korttitulva aktiivisena">🌟</div>`;
    }

    // Вызываем функцию обновления текста, так как она теперь объявлена снаружи
    updateGuessedButtonsText();
}; // <-- ЗДЕСЬ функция updateTurnDisplay успешно закрылась

// ОТДЕЛЬНАЯ САМОСТОЯТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ВЫЧИСЛЕНИЯ ОЧКОВ НА КНОПКАХ
const updateGuessedButtonsText = () => {
    const mainGuessedBtn = document.getElementById('btnGuessed');
    const modalGuessedBtn = document.getElementById('btnModalGuessed');
    
    // Проверяем, урезана ли награда из-за магии или доп. хода
    const isHalfScore = (typeof isMetamorphosisUsedThisTurn !== 'undefined' && isMetamorphosisUsedThisTurn) || 
                        (typeof isExtraTurnRound !== 'undefined' && isExtraTurnRound);
    
    const targetText = isHalfScore ? "Arvattu oikein (+50p)" : "Arvattu oikein (+100p)";
    
    if (mainGuessedBtn) mainGuessedBtn.textContent = targetText;
    if (modalGuessedBtn) modalGuessedBtn.textContent = targetText;
};

const renderOlList = () => {
    wordList.style.display = "block";
    wordList.innerHTML = generatedWordsList.map((w, index) => {
        let isRare = false;
        if (typeof currentBonusWordText !== 'undefined' && currentBonusWordText !== "" && w === currentBonusWordText) {
            isRare = true;
        }

        if (typeof isMetamorphosisUsedThisTurn !== 'undefined' && isMetamorphosisUsedThisTurn === true) {
            isRare = false;
        }

        const bonusTag = isRare ? `<span class="gold-bonus-badge">+25p</span>` : '';
        return `<li data-index="${index}" data-rare="${isRare}"><strong>${index + 1}.</strong> ${w} ${bonusTag}</li>`;
    }).join('');

    // ВОТ ЭТУ СТРОЧКУ ДОБАВЬТЕ СЮДА:
    if (typeof updateGuessedButtonsText === 'function') {
        updateGuessedButtonsText();
    }
};

const clearWordsBeforeTurn = () => {
    if (typeof wordList !== 'undefined') {
        wordList.innerHTML = '';
        wordList.style.display = "none";
    }
};

// Family-friendly toggle removed; images replaced by emojis.


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

// --- EMOJI MODAL LOGIC ---
const emojiOverlay = document.getElementById('emojiModalOverlay');
const emojiInput = document.getElementById('emojiInputArea');

window.openEmojiModal = () => {
    if (!emojiOverlay || !emojiInput) return;
    
// Piilotetaan sanalista turvallisesti, aivan kuten piirtoalustassa
if (typeof wordList !== 'undefined' && typeof btnDisplayWords !== 'undefined') {
    wordList.classList.add("hidden-words");
    btnDisplayWords.textContent = "👁️ Näytä sanat (vain selittäjälle)";
    isWordListHidden = true;
}

    emojiInput.value = ""; 
    emojiOverlay.style.display = 'flex';
    setTimeout(() => emojiInput.focus(), 100); // Fokus viiveellä mobiililaitteille
};

document.getElementById('btnCloseEmojiModalX')?.addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();
    emojiOverlay.style.display = 'none';
});

document.getElementById('btnEmojiGuessed')?.addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();
    emojiOverlay.style.display = 'none';
    document.getElementById('btnGuessed')?.click(); 
});

document.getElementById('btnEmojiGiveUp')?.addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();
    emojiOverlay.style.display = 'none';
    document.getElementById('btnGiveUp')?.click(); 
});
