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

    document.getElementById('roundDisplay').textContent = `Kierros: ${currentRound} / ${totalTurns}`;
    const avatarEl = document.getElementById('currentAvatar');
    if (avatarEl) avatarEl.textContent = gamePlayers[currentPlayerIndex].img || '';

    document.getElementById('currentName').innerHTML = `Vuoro:<br><span>${gamePlayers[currentPlayerIndex].name}</span>`;

    // Tulostaulu: kaikki pelaajat/joukkueet (2, 3 tai tiimit)
    document.getElementById('scoreDisplay').innerHTML = gamePlayers
        .map((pl, idx) => {
            const marker = idx === currentPlayerIndex ? '▶ ' : '';
            return `<span>${marker}${pl.name}: <strong>${pl.score}p</strong></span>`;
        })
        .join('<br>');

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
    const emojiGuessedBtn = document.getElementById('btnEmojiGuessed');

    // Проверяем, урезана ли награда из-за магии или доп. хода
    const isHalfScore = (typeof isMetamorphosisUsedThisTurn !== 'undefined' && isMetamorphosisUsedThisTurn) ||
                        (typeof isExtraTurnRound !== 'undefined' && isExtraTurnRound);

    const targetText = isHalfScore ? "Arvattu oikein (+50p)" : "Arvattu oikein (+100p)";

    if (mainGuessedBtn) mainGuessedBtn.textContent = targetText;
    if (modalGuessedBtn) modalGuessedBtn.textContent = targetText;
    if (emojiGuessedBtn) emojiGuessedBtn.textContent = targetText;
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
// ОБНОВЛЕНО: Текст стал четкой инструкцией
        const bonusTag = isRare ? `<span class="gold-bonus-badge">✨ +25p (Paina tätä, jos selitit!)</span>` : '';
        
        return `<li data-index="${index}" data-rare="${isRare}"><strong>${index + 1}.</strong> ${w} ${bonusTag}</li>`;
    }).join('');

    const bonusHint = document.getElementById('bonusHint');
    if (bonusHint) {
        const meta = (typeof isMetamorphosisUsedThisTurn !== 'undefined' && isMetamorphosisUsedThisTurn === true);
        bonusHint.textContent = meta
            ? 'Ei bonussanaa tällä vuorolla.'
            : '✨-merkitty sana arvotaan koko sanakirjasta — usein harvinainen! Selitä se ja saat +25p.';
        bonusHint.style.display = 'block';
    }

    if (typeof updateGuessedButtonsText === 'function') {
        updateGuessedButtonsText();
    }
};

window.hideBonusHint = () => {
    const h = document.getElementById('bonusHint');
    if (h) h.style.display = 'none';
};

const clearWordsBeforeTurn = () => {
    if (typeof wordList !== 'undefined') {
        wordList.innerHTML = '';
        wordList.style.display = "none";
    }
    window.hideBonusHint();
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

    // Huonepeli: ilmoita arvaajien puhelimille että emoji-taulu avautui
    if (typeof window.netRelayEmoji === 'function') window.netRelayEmoji({ action: 'open' });
};

document.getElementById('btnCloseEmojiModalX')?.addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();
    emojiOverlay.style.display = 'none';
    if (typeof window.netRelayEmoji === 'function') window.netRelayEmoji({ action: 'close' });
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

// Ryöstö-painike emoji-modaalissa (4+ joukkuemoodi)
document.getElementById('btnEmojiStolen')?.addEventListener('click', () => {
    if (typeof playClickSound === 'function') playClickSound();
    emojiOverlay.style.display = 'none';
    document.getElementById('btnStolen')?.click();
});

// --- EMOJI-SUODATUS: vain emojit ja välilyönnit sallitaan ---
// Poistaa kirjaimet, numerot, välimerkit ja matemaattiset/valuutta-/muunnosymbolit.
// Jäljelle jäävät So-symbolit (emojit), yhdistävät merkit (VS16, ihonvärit),
// ZWJ-sekvenssien ohjausmerkit ja välilyönnit.
if (emojiInput) {
    const nonEmojiPattern = /[\p{L}\p{N}\p{P}\p{Sm}\p{Sc}\p{Sk}]/gu;
    let lastEmojiSend = 0;
    emojiInput.addEventListener('input', () => {
        const filtered = emojiInput.value.replace(nonEmojiPattern, '');
        if (filtered !== emojiInput.value) {
            emojiInput.value = filtered;
        }
        // Huonepeli: striimaa emoji-sisältö arvaajille (~120 ms välein)
        const now = performance.now();
        if (now - lastEmojiSend > 120 && typeof window.netRelayEmoji === 'function') {
            lastEmojiSend = now;
            window.netRelayEmoji({ action: 'update', text: emojiInput.value });
        }
    });
}

// --- HOLD-TO-PEEK: pidä pohjassa nähdäksesi oman sanasi ---
const peekPill = document.getElementById('peekWordPill');

const showPeekWord = () => {
    if (!peekPill) return;
    const word = (typeof selectedWordIndex !== 'undefined' && selectedWordIndex >= 0 &&
                  typeof generatedWordsList !== 'undefined')
        ? generatedWordsList[selectedWordIndex]
        : null;
    peekPill.textContent = word ? `🤫 ${word}` : '⚠️ Valitse ensin sana listasta';
    peekPill.style.display = 'block';
};

const hidePeekWord = () => {
    if (peekPill) peekPill.style.display = 'none';
};
window.hidePeekWord = hidePeekWord;

const bindHoldToPeek = (btnEl) => {
    if (!btnEl) return;
    const start = (e) => {
        if (e.cancelable) e.preventDefault();
        showPeekWord();
    };
    const stop = () => hidePeekWord();

    // Hiirituki
    btnEl.addEventListener('mousedown', start);
    btnEl.addEventListener('mouseup', stop);
    btnEl.addEventListener('mouseleave', stop);
    // Kosketustuki
    btnEl.addEventListener('touchstart', start, { passive: false });
    btnEl.addEventListener('touchend', stop);
    btnEl.addEventListener('touchcancel', stop);
    // Estä kontekstivalikko pitkästä painalluksesta mobiilissa
    btnEl.addEventListener('contextmenu', (e) => e.preventDefault());
};

document.addEventListener('DOMContentLoaded', () => {
    bindHoldToPeek(document.getElementById('btnPeekDraw'));
    bindHoldToPeek(document.getElementById('btnPeekEmoji'));
});

// --- "KUKA ARVASI?" -MODAALI (3 pelaajan vapaa kaikkien peli) ---
// callback(guesserIndex) kutsutaan valinnan jälkeen; Peruuta -> callback(-1)
window.openWhoGuessedModal = (callback) => {
    const modal = document.getElementById('whoGuessedModal');
    const options = document.getElementById('whoGuessedOptions');
    if (!modal || !options) {
        callback(-1);
        return;
    }
    options.innerHTML = '';
    gamePlayers.forEach((pl, idx) => {
        if (idx === currentPlayerIndex) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = `${pl.img || '👤'} ${pl.name} (+50p)`;
        b.onclick = () => {
            modal.style.display = 'none';
            callback(idx);
        };
        options.appendChild(b);
    });
    const cancel = document.getElementById('whoGuessedCancel');
    if (cancel) cancel.onclick = () => {
        modal.style.display = 'none';
        callback(-1);
    };
    modal.style.display = 'flex';
};
