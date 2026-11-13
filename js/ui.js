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
    Sanametamorfoosi: "🌀 Sanametamorfoosi: Vaihtaa näytöllä olevat sanat uusiin — bonussanat päivittyvät ja sanakaaos torjutaan! Palkinto: 50p + mahdollinen bonus.",
    Korttinälkä: "📉 Korttinälkä: Iskee vastustajan seuraavaan vuoroon. Kutistaa hänen sanalistansa kahdella sanalla, mikä vähentää hänen valinnanvaraansa.",
    Sanakaaos: "☿ Sanakaaos: Iskee vastustajan seuraavaan vuoroon. Korvaa kolme hänen sanaansa kovilla kiroussanoilla — ne eivät anna bonuspisteitä.",
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

// Строка счётчика раундов + индикатор текущей бонусной фазы (виден и
// объясняющему, и угадывающим через #ngRound — «нарастание ставок» к финалу).
const formatRoundCounter = () => {
    const v = (typeof getBonusConfig === 'function') ? getBonusConfig().value : 25;
    return `Kierros: ${currentRound} / ${totalTurns} · ✨+${v}p`;
};

const updateTurnDisplay = () => {
    if (gamePlayers.length < 2) return;

    document.getElementById('roundDisplay').textContent = formatRoundCounter();
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

    // Tiivis tilannekortti (chip): ehto + vuorossa oleva pelaaja
    const chipT = document.getElementById('chipTheme');
    if (chipT) {
        const emoji = (typeof themeImages !== 'undefined' && currentActiveTheme)
            ? (themeImages[currentActiveTheme] || '🎭') : '🎭';
        chipT.textContent = currentActiveTheme ? `${emoji} ${currentActiveTheme.toUpperCase()}` : '🎭 …';
    }
    const chipP = document.getElementById('chipTurn');
    if (chipP) chipP.textContent = `▶ ${gamePlayers[currentPlayerIndex].name}`;
}; // <-- ЗДЕСЬ функция updateTurnDisplay успешно закрылась

// ОТДЕЛЬНАЯ САМОСТОЯТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ВЫЧИСЛЕНИЯ ОЧКОВ НА КНОПКАХ
const updateGuessedButtonsText = () => {
    const mainGuessedBtn = document.getElementById('btnGuessed');
    const modalGuessedBtn = document.getElementById('btnModalGuessed');
    const emojiGuessedBtn = document.getElementById('btnEmojiGuessed');

    // Проверяем, урезана ли награда из-за магии или доп. хода
    const isHalfScore = (typeof isMetamorphosisUsedThisTurn !== 'undefined' && isMetamorphosisUsedThisTurn) ||
                        (typeof isExtraTurnRound !== 'undefined' && isExtraTurnRound);

    // Превью реальной выплаты: если зажато ✨-бонусное слово, показываем сумму
    let bonusPreview = 0;
    if (typeof selectedWordIndex !== 'undefined' && selectedWordIndex >= 0 &&
        typeof generatedWordsList !== 'undefined' && generatedWordsList[selectedWordIndex] &&
        typeof currentBonusWords !== 'undefined' &&
        currentBonusWords.includes(generatedWordsList[selectedWordIndex])) {
        bonusPreview = (typeof getBonusConfig === 'function') ? getBonusConfig().value : 25;
    }

    const base = isHalfScore ? 50 : 100;
    const targetText = `Arvattu oikein (+${base + bonusPreview}p)`;

    if (mainGuessedBtn) mainGuessedBtn.textContent = targetText;
    if (modalGuessedBtn) modalGuessedBtn.textContent = targetText;
    if (emojiGuessedBtn) emojiGuessedBtn.textContent = targetText;
};

const renderOlList = () => {
    wordList.style.display = "block";
    const bonusValue = (typeof getBonusConfig === 'function') ? getBonusConfig().value : 25;
    wordList.innerHTML = generatedWordsList.map((w, index) => {
        const isBonus = typeof currentBonusWords !== 'undefined' && currentBonusWords.includes(w);
        const isCursed = typeof currentCursedWords !== 'undefined' && currentCursedWords.includes(w);
// ОБНОВЛЕНО: Текст стал четкой инструкцией
        const bonusTag = isBonus ? `<span class="gold-bonus-badge">✨ +${bonusValue}p (Paina tätä, jos selitit!)</span>` : '';
        const curseTag = isCursed ? `<span class="curse-badge">💀</span>` : '';

        return `<li data-index="${index}" data-rare="${isBonus}" data-cursed="${isCursed}"><strong>${index + 1}.</strong> ${w} ${bonusTag}${curseTag}</li>`;
    }).join('');

    const bonusHint = document.getElementById('bonusHint');
    if (bonusHint) {
        if (typeof currentBonusWords !== 'undefined' && currentBonusWords.length > 0) {
            bonusHint.textContent = currentBonusWords.length === 1
                ? `✨ Yksi sana koko sanakirjasta — usein harvinainen! Selitä se ja saat +${bonusValue}p.`
                : `✨ ${currentBonusWords.length} sanaa koko sanakirjasta — usein harvinaisia! Selitä merkitty ja saat +${bonusValue}p.`;
        } else if (typeof currentCursedWords !== 'undefined' && currentCursedWords.length > 0) {
            bonusHint.textContent = '💀 Kirous: kovat sanat — ei bonussanoja tällä vuorolla.';
        } else {
            bonusHint.textContent = 'Ei bonussanaa tällä vuorolla.';
        }
        bonusHint.style.display = 'block';
    }

    if (typeof updateGuessedButtonsText === 'function') {
        updateGuessedButtonsText();
    }
    // Yksityisyysverho heti päälle — MutationObserver varmistaa myös muut polut
    if (typeof refreshPrivacyMask === 'function') refreshPrivacyMask();
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
    restoreHiddenWords();
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

// --- VUOROPANEELI: harmonikka yläpalkille (sanojen aikana kiinni oletuksena) ---
const turnPanelBody = document.getElementById('turnPanelBody');
const turnChip = document.getElementById('turnChip');
const btnToolCanvas = document.getElementById('btnToolCanvas');

const setTurnPanelCollapsed = (collapsed) => {
    if (!turnPanelBody || !turnChip) return;
    turnPanelBody.classList.toggle('collapsed', collapsed);
    turnChip.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
};
window.setTurnPanelCollapsed = setTurnPanelCollapsed;

if (turnChip) {
    turnChip.addEventListener('click', () => {
        if (typeof playClickSound === 'function') playClickSound();
        setTurnPanelCollapsed(!turnPanelBody.classList.contains('collapsed'));
    });
}

// Piirto-/emoji-työkalun pikapainike — vain kun ehto vaatii työkalun JA sanat auki
const updateToolPill = () => {
    if (!btnToolCanvas) return;
    const needs = !!document.getElementById('themeDrawingHint') &&
                  typeof wordList !== 'undefined' && !!wordList &&
                  wordList.style.display !== 'none' &&
                  wordList.children.length > 0;
    btnToolCanvas.style.display = needs ? 'inline-flex' : 'none';
};
window.updateToolPill = updateToolPill;

// Kun piirto-/emoji-modaali suljetaan, sanalista palaa näkyviin ilman nappia
// ("Piilota sanat" -togglaus poistui — verho peittää muutenkin)
const restoreHiddenWords = () => {
    if (typeof wordList === 'undefined' || !wordList) return;
    if (!wordList.classList.contains('hidden-words')) return;
    if (wordList.style.display === 'none' || wordList.children.length === 0) return;
    wordList.classList.remove('hidden-words');
    isWordListHidden = false;
};
window.restoreHiddenWords = restoreHiddenWords;

// --- PRIVACY MASK: sanat luetaan yhden rivin ikkunasta, muu lista "sumussa" ---
// Puhtaasti paikallinen efekti: ei relay-viestejä, ei asetuksia — toimii myös
// verkkokatkon aikana. Vastakohta satunnaiselle vilkaisulle, ei varsinainen
// salaus (sanat ovat silti DOMissa, kuten ennenkin).
const wordMask = document.getElementById('wordMask');
const wordGrain = document.getElementById('wordGrain');
const wordMaskHint = document.getElementById('wordMaskHint');
const wordListWrap = document.getElementById('wordListWrap');
let privacyPointerInside = false;
let touchActiveUntil = 0;

const setMaskWindowY = (clientY) => {
    if (!wordMask) return;
    const r = wordMask.getBoundingClientRect();
    const y = Math.min(Math.max(clientY - r.top, 0), r.height);
    wordMask.style.setProperty('--my', y + 'px');
};

const hideMaskWindow = () => {
    if (wordMask) wordMask.style.setProperty('--my', '-999px');
};

// Ikkunan korkeus seuraa rivin korkeutta — täysnäytön listalla rivit ovat isompia
const fitWindowToRow = () => {
    if (!wordMask || !wordList) return;
    const li = wordList.querySelector('li');
    if (li && li.offsetHeight > 0) {
        wordMask.style.setProperty('--wh', Math.round(li.offsetHeight * 0.6) + 'px');
    }
};
// Harmonikan 250 ms -animaation aikana listan korkeus muuttuu — mitataan
// sekä heti seuraavalla framella että transitionin jälkeen (debounce).
let _fitTimer = null;
const scheduleFitWindow = () => {
    requestAnimationFrame(fitWindowToRow);
    clearTimeout(_fitTimer);
    _fitTimer = setTimeout(fitWindowToRow, 400);
};

const refreshPrivacyMask = () => {
    if (!wordMask || typeof wordList === 'undefined' || !wordList) return;
    const on = wordList.children.length > 0 &&
               wordList.style.display !== 'none' &&
               !wordList.classList.contains('hidden-words');
    wordMask.style.display = on ? 'block' : 'none';
    if (wordGrain) wordGrain.style.display = on ? 'block' : 'none';
    if (wordMaskHint) wordMaskHint.style.display = (on && !privacyPointerInside) ? 'flex' : 'none';
    if (!on) hideMaskWindow();
    // Rivit venyvät flex-Layoutilla — mitataan vasta piirron jälkeen
    if (on) scheduleFitWindow();
    updateToolPill();
};
window.refreshPrivacyMask = refreshPrivacyMask;

const initPrivacyMask = () => {
    if (!wordMask || !wordList) return;

    // Pidä-pohjassa (350 ms) -> koko lista paljastuu; liuku -> vain ikkunakaistale
    let holdTimer = null;
    let holdStart = null;
    const cancelHold = () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    };
    const startHold = (x, y) => {
        cancelHold();
        holdStart = { x, y };
        holdTimer = setTimeout(() => {
            holdTimer = null;
            if (wordListWrap) wordListWrap.classList.add('revealing');
            if (navigator.vibrate) navigator.vibrate(10);
        }, 350);
    };
    const stopReveal = () => {
        cancelHold();
        holdStart = null;
        if (wordListWrap) wordListWrap.classList.remove('revealing');
    };
    const moveCancelsHold = (x, y) => {
        if (!holdStart) return;
        const dx = x - holdStart.x, dy = y - holdStart.y;
        if (Math.hypot(dx, dy) > 12) { holdStart = null; cancelHold(); }
    };

    // Kosketus: ikkuna hieman sormen yläpuolella (sormi ei peitä sanaa)
    wordList.addEventListener('touchstart', (e) => {
        touchActiveUntil = Date.now() + 700;
        privacyPointerInside = true;
        fitWindowToRow();
        setMaskWindowY(e.changedTouches[0].clientY - 10);
        startHold(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        refreshPrivacyMask();
    }, { passive: true });
    wordList.addEventListener('touchmove', (e) => {
        touchActiveUntil = Date.now() + 700;
        moveCancelsHold(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        setMaskWindowY(e.changedTouches[0].clientY - 10);
    }, { passive: true });
    const touchEnd = () => {
        privacyPointerInside = false;
        hideMaskWindow();
        stopReveal();
        refreshPrivacyMask();
    };
    wordList.addEventListener('touchend', touchEnd, { passive: true });
    wordList.addEventListener('touchcancel', touchEnd, { passive: true });

    // Hiiri: ikkuna seuraa kursoria ilman painallusta; pohjassa pitäminen = koko lista
    wordList.addEventListener('mousedown', (e) => {
        fitWindowToRow();
        startHold(e.clientX, e.clientY);
    });
    wordList.addEventListener('mousemove', (e) => {
        if (Date.now() < touchActiveUntil) return; // synteettiset mouse-tapahtumat touchin jälkeen
        moveCancelsHold(e.clientX, e.clientY);
        privacyPointerInside = true;
        setMaskWindowY(e.clientY);
        refreshPrivacyMask();
    });
    wordList.addEventListener('mouseup', stopReveal);
    wordList.addEventListener('mouseleave', () => {
        privacyPointerInside = false;
        hideMaskWindow();
        stopReveal();
        refreshPrivacyMask();
    });

    // Itsenäinen suoja: verho seuraa listan tilaa riippumatta siitä,
    // mikä koodipolku listaa muutti (metamorfoosi, huonepeli, endRound…)
    const mo = new MutationObserver(refreshPrivacyMask);
    mo.observe(wordList, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
    window.addEventListener('resize', () => requestAnimationFrame(fitWindowToRow));
    refreshPrivacyMask();
};
initPrivacyMask();

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

/* ================= TEEMARULETTI =================
 * Yhteinen rumpupyörä selittäjälle (#loader) ja arvaajille (#ngDrum).
 * Sektorit ovat suhteessa painoihin → sektorikulma vastaa osumisen
 * todennäköisyyttä. Pyörää ajetaan requestAnimationFramella:
 * hub-teksti seuraa osoittimen alla olevaa sektoria reaaliajassa ja
 * osoitin "räpsähtää" aina kun sektoriraja ohittaa sen. Jarrutus näyttää
 * vakiokiihtyvältä + lyhyt vaimeneva jousivärähtely maalissa.
 *   const ctx = themeDrum.mount(wheelEl, [{theme:'piirtäminen', w:2},...], hubNameEl);
 *   themeDrum.spinInfinite(ctx);            // jatkuva pyörintä (arvaaja)
 *   themeDrum.spinTo(ctx, 'elokuva', 1950); // hidastuu voittajaan (selittäjä)
 *   const ms = themeDrum.land(ctx, 'elokuva'); // jarruttaa spinningin voittajaan → kesto ms
 *   themeDrum.destroy(ctx);
 */
window.themeDrum = (() => {
    const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TINTS = ['rgba(229,193,88,0.16)', 'rgba(122,92,220,0.20)'];
    const GAP = 0.7;      // asteen rako sektorien väliin
    const SPIN_V = 640;   // vapaan pyörintänopeus °/s (arvaajan rumpu)
    const SETTLE_MS = 430;// jousivärähtelyn kesto maalissa
    const OVER = 7;       // ylitys ennen takaisinvalkaisua, astetta
    const TICK_MS = 55;   // minimi räpsyväli (kun pyörä on tosi nopea)

    const norm360 = (d) => ((d % 360) + 360) % 360;

    // Sektori osoittimen alla annetulla pyörän kulmalla (0° = ylös).
    const themeAt = (ctx, angle) => {
        const x = norm360(-angle);
        const it = ctx.items.find(i => x >= i.a0 && x < i.a1);
        return it ? it.theme : ctx.items[0].theme;
    };

    // Aseta kulma + synkkaa hub osoittimen alla olevan sektorin kanssa +
    // räpsäytä osoitinta kun sektori vaihtuu (oikean räpynän tuntu).
    const applyAngle = (ctx, angle, v) => {
        ctx.angle = angle;
        if (typeof v === 'number') ctx.v = v;
        ctx.wheelEl.style.transform = `rotate(${angle}deg)`;
        const t = themeAt(ctx, angle);
        if (t !== ctx.hubTheme) {
            ctx.hubTheme = t;
            if (ctx.hubEl) ctx.hubEl.textContent = t;
            const now = performance.now();
            if (ctx.pointerEl && now - ctx.lastTick >= TICK_MS) {
                ctx.lastTick = now;
                ctx.pointerEl.classList.remove('tick');
                void ctx.pointerEl.offsetWidth; // uudelleenkäynnistä animaatio
                ctx.pointerEl.classList.add('tick');
            }
            if (typeof playClickSound === 'function') playClickSound();
        }
    };

    const tickLoop = (ctx) => {
        cancelAnimationFrame(ctx.raf);
        let last = performance.now();
        const step = (now) => {
            const dt = Math.min(64, now - last);
            last = now;
            if (ctx.sim && ctx.sim(dt, now)) ctx.raf = requestAnimationFrame(step);
            else ctx.raf = 0;
        };
        ctx.raf = requestAnimationFrame(step);
    };

    // Rakentaa conic-gradientin + sektoriesimerkit keskipisteilleen.
    // Sektoreille tallennetaan data-a0/a1 (reunat) testejä ja landia varten.
    const mount = (wheelEl, sectors, hubEl) => {
        if (!wheelEl) return null;
        destroy(wheelEl._drum);
        wheelEl.innerHTML = '';
        wheelEl.classList.remove('spinning', 'landed');
        wheelEl.style.transform = '';
        wheelEl.style.transition = '';

        const list = (sectors || []).filter(s => s && s.theme && s.w > 0);
        if (!list.length) list.push({ theme: 'perusvaihtoehto', w: 1 });
        const total = list.reduce((a, s) => a + s.w, 0);
        const R = Math.max(56, Math.round(wheelEl.clientWidth / 2 * 0.68)) || 92;

        let stops = [], items = [], acc = 0;
        list.forEach((s, i) => {
            const span = s.w / total * 360;
            const a0 = acc, a1 = acc + span;
            acc = a1;
            const tint = TINTS[i % TINTS.length];
            if (list.length > 1) stops.push(`${tint} ${a0}deg ${a1 - GAP}deg`, `rgba(0,0,0,0.45) ${a1 - GAP}deg ${a1}deg`);
            else stops.push(`${tint} 0deg 360deg`);
            const el = document.createElement('div');
            el.className = 'theme-drum-item';
            el.dataset.theme = s.theme;
            el.dataset.a0 = a0;
            el.dataset.a1 = a1;
            const mid = (a0 + a1) / 2;
            el.style.transform = `rotate(${mid}deg) translateY(-${R}px) rotate(${-mid}deg)`;
            el.textContent = (typeof themeImages !== 'undefined' && themeImages[s.theme]) || '❓';
            wheelEl.appendChild(el);
            items.push({ el, theme: s.theme, a0, a1, mid });
        });
        wheelEl.style.background = `conic-gradient(${stops.join(', ')})`;

        const drum = wheelEl.closest('.theme-drum');
        const ctx = {
            wheelEl, hubEl, items,
            pointerEl: drum ? drum.querySelector('.theme-drum-pointer') : null,
            raf: 0, sim: null, angle: 0, v: 0,
            landed: false, hubTheme: null, lastTick: 0,
        };
        wheelEl._drum = ctx;
        applyAngle(ctx, 0, 0); // hub näyttää heti sen teeman, joka on osoittimessa
        return ctx;
    };

    // Nykyinen rotaatiokulma (0-360) luettaessa transform-matriisista.
    const currentAngle = (wheelEl) => {
        const t = getComputedStyle(wheelEl).transform;
        if (!t || t === 'none') return 0;
        const m = t.match(/matrix\(([^)]+)\)/);
        if (!m) return 0;
        const [a, b] = m[1].split(',').map(Number);
        return norm360(Math.atan2(b, a) * 180 / Math.PI);
    };

    const finish = (ctx, theme, target) => {
        ctx.landed = true;
        ctx.sim = null;
        ctx.v = 0;
        cancelAnimationFrame(ctx.raf);
        ctx.raf = 0;
        ctx.wheelEl.style.transition = 'none';
        applyAngle(ctx, norm360(target), 0);
        ctx.wheelEl.classList.remove('spinning');
        ctx.wheelEl.classList.add('landed');
        if (ctx.hubEl) ctx.hubEl.textContent = theme;
    };

    // Satunnainen pysähdyspiste voittajasektorin sisällä (ei aina täsmälleen
    // keskipisteessä — näyttää aidolta). Marginaali > OVER+GAP ettei
    // värähtely heitä osoitinta viereiseen sektoriin.
    const aimPoint = (it) => {
        const span = it.a1 - it.a0;
        const margin = Math.min(span * 0.2, 14); // ≥ OVER+GAP turvassa
        const lo = it.a0 + margin, hi = it.a1 - margin;
        return lo + Math.random() * Math.max(0, hi - lo);
    };

    // Vakiokiihtyvän jarrutuksen näköinen pysäytys + vaimeneva värähtely.
    // Palauttaa kokonaiskeston ms (jarrutus + settle).
    const runTo = (ctx, theme, delta, durMs) => {
        const a0 = ctx.angle;
        const target = a0 + delta;
        const t0 = performance.now();
        ctx.sim = (dt, now) => {
            const t = now - t0;
            if (t < durMs) {
                const u = t / durMs;
                // easeOutQuad ≈ lineaainen nopeuden lasku (Coulomb-kitkan tuntu)
                applyAngle(ctx, a0 + (delta + OVER) * (2 * u - u * u), 2 * (delta + OVER) * (1 - u) / durMs * 1000);
                return true;
            }
            const s = (t - durMs) / SETTLE_MS;
            if (s >= 1) { finish(ctx, theme, target); return false; }
            // Vaimeneva jousivärähtely: pieni ylitys rockahtaa takaisin maaliin
            applyAngle(ctx, target + OVER * Math.exp(-5.5 * s) * Math.cos(10 * s), 0);
            return true;
        };
        tickLoop(ctx);
        return durMs + SETTLE_MS;
    };

    // Selittäjä: voittaja tiedossa heti — pitkä ease-out-pyörähdys + settle.
    const spinTo = (ctx, theme, dur = 1950, minSpins = 3) => {
        if (!ctx) return 0;
        const it = ctx.items.find(x => x.theme === theme) || ctx.items[0];
        const point = aimPoint(it);
        const need = norm360(-point - norm360(ctx.angle)); // rotate(R): sektori [a0,a1] → [a0+R,a1+R]; osoitin (0°) osuu pointtiin kun R ≡ -point
        const spins = minSpins + Math.floor(Math.random() * 2); // 3–4 kierrosta
        if (REDUCED) { finish(ctx, theme, ctx.angle + need); return 0; }
        ctx.landed = false;
        return runTo(ctx, theme, need + 360 * spins, dur);
    };

    // Arvaaja: jatkuva spini → jarrutus voittajaan kun THEME saapuu.
    // Kesto johdetaan nykynopeudesta (vakiojarrutus) — max ~1.5 s.
    const land = (ctx, theme, _dur, _minSpins) => {
        if (!ctx) return 0;
        ctx.wheelEl.classList.remove('spinning');
        const it = ctx.items.find(x => x.theme === theme) || ctx.items[0];
        const point = aimPoint(it);
        const need = norm360(-point - norm360(ctx.angle));
        if (REDUCED) { finish(ctx, theme, ctx.angle + need); return 0; }
        ctx.landed = false;
        const v = Math.max(ctx.v || 0, SPIN_V * 0.55); // v käynnissä olevasta simistä
        let delta = need;
        if (2 * delta / v * 1000 < 550) delta += 360; // vähintään reilu jarrutusmatka
        const dur = Math.min(1500, Math.max(550, 2 * delta / v * 1000));
        return runTo(ctx, theme, delta, dur);
    };

    // Arvaajan vapaa pyörintä: pehmeä käynnistys vakionopeuteen.
    const spinInfinite = (ctx) => {
        if (!ctx) return;
        ctx.landed = false;
        ctx.wheelEl.classList.add('spinning');
        let v = 0;
        ctx.sim = (dt) => {
            v = Math.min(SPIN_V, v + dt * 3.2); // kiihdytys ~200 ms täyteen
            applyAngle(ctx, ctx.angle + v * dt / 1000, v);
            return true;
        };
        tickLoop(ctx);
    };

    const destroy = (ctx) => {
        if (!ctx) return;
        ctx.sim = null;
        cancelAnimationFrame(ctx.raf);
        ctx.raf = 0;
        ctx.wheelEl.classList.remove('spinning', 'landed');
        ctx.wheelEl.style.transform = '';
        ctx.wheelEl.style.transition = '';
        ctx.wheelEl.innerHTML = '';
        ctx.wheelEl.style.background = '';
        if (ctx.hubEl) ctx.hubEl.textContent = '?';
        if (ctx.pointerEl) ctx.pointerEl.classList.remove('tick');
        if (ctx.wheelEl._drum === ctx) ctx.wheelEl._drum = null;
    };

    return { mount, spinInfinite, spinTo, land, destroy, currentAngle };
})();
