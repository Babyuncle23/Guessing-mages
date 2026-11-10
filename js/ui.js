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

/* ================= TEEMARULETTI =================
 * Yhteinen rumpupyörä selittäjälle (#loader) ja arvaajille (#ngDrum).
 * Sektorit ovat suhteessa painoihin → sektorikulma vastaa osumisen
 * todennäköisyyttä. Käyttö:
 *   const ctx = themeDrum.mount(wheelEl, [{theme:'piirtäminen', w:2},...], hubNameEl);
 *   themeDrum.spinInfinite(ctx);         // jatkuva pyörintä (arvaaja)
 *   themeDrum.spinTo(ctx, 'elokuva', 2100); // hidastuu voittajaan (selittäjä)
 *   themeDrum.land(ctx, 'elokuva', 700); // pysäyttää spinningin voittajaan
 *   themeDrum.destroy(ctx);
 */
window.themeDrum = (() => {
    const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TINTS = ['rgba(229,193,88,0.16)', 'rgba(122,92,220,0.20)'];
    const GAP = 0.7; // asteen rako sektorien väliin

    const norm360 = (d) => ((d % 360) + 360) % 360;

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

        const ctx = { wheelEl, hubEl, items, hubTimer: null, landed: false };
        wheelEl._drum = ctx;
        // Hub-vilkutus: nimet vilisevat pyörimisen aikana
        if (hubEl) {
            let i = 0;
            ctx.hubTimer = setInterval(() => {
                if (ctx.landed) return;
                hubEl.textContent = items[i % items.length].theme;
                i++;
            }, 110);
        }
        return ctx;
    };

    // Nykyinen rotaatiokulma (0-360) luettaessa CSS-animaation kesken.
    const currentAngle = (wheelEl) => {
        const t = getComputedStyle(wheelEl).transform;
        if (!t || t === 'none') return 0;
        const m = t.match(/matrix\(([^)]+)\)/);
        if (!m) return 0;
        const [a, b] = m[1].split(',').map(Number);
        return norm360(Math.atan2(b, a) * 180 / Math.PI);
    };

    // Kohdekulma: voittajasektorin keskipiste osoittajaan (0° = ylös).
    const targetRotation = (ctx, theme, fromAngle, minSpins) => {
        const it = ctx.items.find(x => x.theme === theme) || ctx.items[0];
        const need = norm360(-it.mid - norm360(fromAngle));
        return fromAngle + need + 360 * minSpins;
    };

    const spinInfinite = (ctx) => { if (ctx && !REDUCED) ctx.wheelEl.classList.add('spinning'); };

    // Selittäjä: voittaja tiedossa heti — pitkä ease-out-pyörähdys alusta.
    const spinTo = (ctx, theme, dur = 2100, minSpins = 3) => {
        if (!ctx) return;
        ctx.landed = false;
        const from = currentAngle(ctx.wheelEl);
        const target = targetRotation(ctx, theme, from, minSpins);
        ctx.wheelEl.style.transform = `rotate(${from}deg)`;
        void ctx.wheelEl.offsetWidth; // reflow ennen transitionia
        if (REDUCED) { finish(ctx, theme, target); return; }
        ctx.wheelEl.style.transition = `transform ${dur}ms cubic-bezier(0.12, 0.8, 0.15, 1)`;
        ctx.wheelEl.style.transform = `rotate(${target}deg)`;
        setTimeout(() => finish(ctx, theme, target), dur);
    };

    // Arvaaja: jatkuva spini → lyhyt hidastus voittajaan kun THEME saapuu.
    const land = (ctx, theme, dur = 700, minSpins = 1) => {
        if (!ctx) return;
        ctx.wheelEl.classList.remove('spinning');
        const from = currentAngle(ctx.wheelEl);
        const target = targetRotation(ctx, theme, from, minSpins);
        ctx.wheelEl.style.transform = `rotate(${from}deg)`;
        void ctx.wheelEl.offsetWidth;
        if (REDUCED) { finish(ctx, theme, target); return; }
        ctx.wheelEl.style.transition = `transform ${dur}ms cubic-bezier(0.2, 0.85, 0.25, 1)`;
        ctx.wheelEl.style.transform = `rotate(${target}deg)`;
        setTimeout(() => finish(ctx, theme, target), dur);
    };

    const finish = (ctx, theme, target) => {
        ctx.landed = true;
        clearInterval(ctx.hubTimer);
        ctx.hubTimer = null;
        ctx.wheelEl.style.transition = 'none';
        ctx.wheelEl.style.transform = `rotate(${norm360(target)}deg)`;
        ctx.wheelEl.classList.add('landed');
        if (ctx.hubEl) ctx.hubEl.textContent = theme;
    };

    const destroy = (ctx) => {
        if (!ctx) return;
        clearInterval(ctx.hubTimer);
        ctx.hubTimer = null;
        ctx.wheelEl.classList.remove('spinning', 'landed');
        ctx.wheelEl.style.transform = '';
        ctx.wheelEl.style.transition = '';
        ctx.wheelEl.innerHTML = '';
        ctx.wheelEl.style.background = '';
        if (ctx.hubEl) ctx.hubEl.textContent = '?';
        if (ctx.wheelEl._drum === ctx) ctx.wheelEl._drum = null;
    };

    return { mount, spinInfinite, spinTo, land, destroy, currentAngle };
})();
