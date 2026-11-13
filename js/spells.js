const calculateSpells = (rounds, basePercent, diceRoll) => {
    let baseAmount = Math.max(1, Math.floor(rounds * basePercent));

    // Noppa muuttaa tulosta vain -1, 0 tai +1, jottei tule epäreilua eroa
    let modifier = 0;
    if (diceRoll <= 2) modifier = -1;
    if (diceRoll >= 5) modifier = 1;

    return Math.max(1, baseAmount + modifier);
};

// Kaksirivinen loitsupainike: nimi + jäljellä olevat käyttökerrat, alapuolella tarkka efekti
const setSpellBtnContent = (btn, name, charges, subText) => {
    btn.innerHTML = `<span class="spell-name">${name} (${charges})</span><span class="spell-sub">${subText}</span>`;
};

const setSpellPhaseTitle = (phase) => {
    const title = document.getElementById('spellZoneTitle');
    if (!title) return;
    title.textContent = phase === 1
        ? "✨ Taikuus (Vaihe 1: Ennen sanojen avaamista)"
        : "✨ Taikuus (Vaihe 2: Sanojen aikana)";
};

// 3 pelaajan pelissä Kirouksenlangettaja valitsee kumman vastustajan hän kiroaa.
// Muissa moodeissa kohde on aina seuraava vastustaja (joukkuepelissä toinen joukkue).
const pickCurseTarget = (spellKey, onPicked) => {
    const castCurse = (targetIdx) => {
        pendingCurses[spellKey] = targetIdx;
        // Huonepeli: kirous on jaettava kaikille — mikä tahansa puhelin voi olla seuraava selittäjä
        if (typeof window.netRelayCursePending === 'function') window.netRelayCursePending(spellKey, targetIdx);
        if (typeof onPicked === 'function') onPicked();
    };

    if (playerMode === 3) {
        const modal = document.getElementById('curseTargetModal');
        const options = document.getElementById('curseTargetOptions');
        if (!modal || !options) {
            castCurse((currentPlayerIndex + 1) % gamePlayers.length);
            return;
        }
        options.innerHTML = '';
        gamePlayers.forEach((pl, idx) => {
            if (idx === currentPlayerIndex) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = `${charImages[pl.name] || '👤'} ${pl.name} (${pl.score}p)`;
            b.onclick = () => {
                modal.style.display = 'none';
                castCurse(idx);
            };
            options.appendChild(b);
        });
        const cancel = document.getElementById('curseTargetCancel');
        if (cancel) cancel.onclick = () => { modal.style.display = 'none'; };
        modal.style.display = 'flex';
    } else {
        castCurse((currentPlayerIndex + 1) % gamePlayers.length);
    }
};

const renderSpellButtonsBeforeWords = () => {
    const p = gamePlayers[currentPlayerIndex];

    // Jos pelaajalla ei ole taikahahmoa, piilotetaan koko säiliö välittömästi!
    if (!["Muodonmuuttaja", "Kirouksenlangettaja", "Yrttitarhuri"].includes(p.name)) {
        spellContainer.style.display = "none";
        return;
    }

    spellContainer.style.display = "flex";
    setSpellPhaseTitle(1);

    // Alustetaan rivit ja painikkeet aina piiloon puhtaasti ilman inline-häiriöitä
    spellRow1.style.display = "none";
    spellRow2.style.display = "none";
    spellBtn1.style.display = "none";
    spellBtn2.style.display = "none";
    if (spellHelpBtn1) spellHelpBtn1.style.display = "none";
    if (spellHelpBtn2) spellHelpBtn2.style.display = "none";
    if (spellInfoBox) spellInfoBox.style.display = "none";

    if (p.name === "Muodonmuuttaja") {
        spellRow1.style.display = "flex";
        spellBtn1.style.display = "flex";
        if (spellHelpBtn1) {
            spellHelpBtn1.style.display = "flex";
            spellHelpBtn1.dataset.spell = "Korttitulva";
        }
        setSpellBtnContent(spellBtn1, "🃏 KORTTITULVA", p.spells.flood, "+2 lisäsanaa tälle kierrokselle");
        spellBtn1.disabled = p.spells.flood <= 0 || currentActiveTheme === "vapaavalintainen" || activeModifiers.extendToEight;
        spellBtn1.onclick = () => {
            if (typeof window.netCanAct === 'function' && !window.netCanAct()) return;
            triggerSpellAnimation('curse'); // Muodonmuuttaja — красная вспышка
            activeModifiers.extendToEight = true;
            isMetamorphosisUsedThisTurn = false;
            p.spells.flood--;
            playAudio(sounds.morph);
            if (typeof window.netRelaySpellCast === 'function') window.netRelaySpellCast('flood');
            renderSpellButtonsBeforeWords();
        };
    } else if (p.name === "Kirouksenlangettaja") {
        spellRow1.style.display = "flex";
        spellRow2.style.display = "flex";
        spellBtn1.style.display = "flex";
        spellBtn2.style.display = "flex";
        if (spellHelpBtn1) {
            spellHelpBtn1.style.display = "flex";
            spellHelpBtn1.dataset.spell = "Korttinälkä";
        }
        if (spellHelpBtn2) {
            spellHelpBtn2.style.display = "flex";
            spellHelpBtn2.dataset.spell = "Sanakaaos";
        }

        setSpellBtnContent(spellBtn1, "🥀 KORTTINÄLKÄ", p.spells.hunger, "Vastustaja saa 2 sanaa vähemmän");
        spellBtn1.disabled = p.spells.hunger <= 0 || pendingCurses.hunger !== -1;
        spellBtn1.onclick = () => {
            if (typeof window.netCanAct === 'function' && !window.netCanAct()) return;
            pickCurseTarget('hunger', () => {
                triggerSpellAnimation('morph'); // Проклятие — фиолетовая вспышка
                p.spells.hunger--;
                playAudio(sounds.curse);
                if (typeof window.netRelaySpellCast === 'function') window.netRelaySpellCast('hunger');
                renderSpellButtonsBeforeWords();
            });
        };
        setSpellBtnContent(spellBtn2, "🌪️ SANAKAAOS", p.spells.chaos, "3 vastustajan sanaa vaikeeksi");
        spellBtn2.disabled = p.spells.chaos <= 0 || pendingCurses.chaos !== -1;
        spellBtn2.onclick = () => {
            if (typeof window.netCanAct === 'function' && !window.netCanAct()) return;
            pickCurseTarget('chaos', () => {
                triggerSpellAnimation('morph'); // Проклятие — фиолетовая вспышка
                p.spells.chaos--;
                playAudio(sounds.curse);
                if (typeof window.netRelaySpellCast === 'function') window.netRelaySpellCast('chaos');
                renderSpellButtonsBeforeWords();
            });
        };
    } else if (p.name === "Yrttitarhuri") {
        spellRow1.style.display = "flex";
        spellBtn1.style.display = "flex";
        if (spellHelpBtn1) {
            spellHelpBtn1.style.display = "flex";
            spellHelpBtn1.dataset.spell = "Kasvupurkaus";
        }
        setSpellBtnContent(spellBtn1, "🌱 KASVUPURKAUS", p.spells.regrowth, "Oikeasta arvauksesta lisävuoro (+50p)");
        spellBtn1.disabled = (p.spells.regrowth <= 0 || p.extraTurnGranted === true || isExtraTurnRound);
        spellBtn1.onclick = () => {
            if (typeof window.netCanAct === 'function' && !window.netCanAct()) return;
            triggerSpellAnimation('druid');
            p.extraTurnGranted = true;
            p.spells.regrowth--;
            playAudio(sounds.druid);
            if (typeof window.netRelaySpellCast === 'function') window.netRelaySpellCast('regrowth');
            playClickSound();
            renderSpellButtonsBeforeWords();
            updateTurnDisplay();
            ruleInstruction.textContent = "Kasvupurkaus aktivoitu!...";
        };
    }
};

const renderSpellButtonsAfterWords = () => {
    const p = gamePlayers[currentPlayerIndex];
    if (spellInfoBox) spellInfoBox.style.display = "none";

    // Кнопка снова доступна в любой теме!
    if (p && p.name === "Muodonmuuttaja" && p.spells.metamorphosis > 0) {
        spellContainer.style.display = "flex";
        setSpellPhaseTitle(2);

        spellRow1.style.display = "flex";
        spellBtn1.style.display = "flex";
        if (spellHelpBtn1) {
            spellHelpBtn1.style.display = "flex";
            spellHelpBtn1.dataset.spell = "Sanametamorfoosi";
        }

        spellRow2.style.display = "none";
        spellBtn2.style.display = "none";
        if (spellHelpBtn2) {
            spellHelpBtn2.style.display = "none";
        }

        setSpellBtnContent(spellBtn1, "🔄 SANAMETAMORFOOSI", p.spells.metamorphosis, "Vaihda kaikki sanat uusiin (50p + bonus)");
        spellBtn1.disabled = false;

        spellBtn1.onclick = () => {
            if (typeof window.netCanAct === 'function' && !window.netCanAct()) return;

            triggerSpellAnimation('curse'); // Muodonmuuttaja — красная вспышка

            // Перегенерация через единый генератор БЕЗ проклятий:
            // метаморфоза «очищает» список от Sanakaaos (контр-плей в 3p),
            // бонусные слова пересоздаются по текущей фазе игры.
            const gen = generateWordList(false);
            generatedWordsList = gen.words;
            currentBonusWords = gen.bonusWords;
            currentCursedWords = [];
            if (activeModifiers.chaosFourWords) {
                activeModifiers.chaosFourWords = false;
                const curseBannerEl = document.getElementById('curseBanner');
                if (curseBannerEl) curseBannerEl.style.display = 'none';
            }

            generatedWordsList.forEach(w => {
                if (!usedWordsInThisGame.includes(w)) {
                    usedWordsInThisGame.push(w);
                }
            });

            playAudio(sounds.morph);

            p.spells.metamorphosis--;
            isMetamorphosisUsedThisTurn = true;
            if (typeof window.netRelaySpellCast === 'function') window.netRelaySpellCast('morph');
            renderOlList();
            spellContainer.style.display = "none";

            let baseInstruction = (activeCondition1 === "perusvaihtoehto" || activeCondition2 === "perusvaihtoehto") ?
                "Toinen pelaaja valitsee sanan ilman että näkee listaa. Selitä sana normaalisti." :
                "Valitse yksi sana ja selitä se toiselle pelaajalle.";

            ruleInstruction.style.display = "block";
            ruleInstruction.innerHTML = `<span style="color: #e74c3c; font-weight: bold; display: block; margin-bottom: 5px;">AKTIIVINEN TILA: Sanat vaihdettu — peruspalkinto 50p, bonussanat voimassa</span>` + baseInstruction;

            if (typeof updateGuessedButtonsText === 'function') updateGuessedButtonsText();
        };

    } else {
        spellContainer.style.display = "none";
        spellRow1.style.display = "none";
        spellRow2.style.display = "none";
    }
};

const triggerSpellAnimation = (type) => {
    const container = document.querySelector('.container');
    if (!container) return;

    const flash = document.createElement('div');
    flash.className = `spell-flash-overlay flash-${type}`;
    container.appendChild(flash);

    setTimeout(() => {
        flash.remove();
    }, 1200);
};
