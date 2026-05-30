const calculateSpells = (rounds, basePercent, diceRoll) => {
    let baseAmount = Math.max(1, Math.floor(rounds * basePercent));
    
    // Noppa muuttaa tulosta vain -1, 0 tai +1, jottei tule epäreilua eroa
    let modifier = 0;
    if (diceRoll <= 2) modifier = -1; 
    if (diceRoll >= 5) modifier = 1;  

    return Math.max(1, baseAmount + modifier);
};

const renderSpellButtonsBeforeWords = () => {
    const p = gamePlayers[currentPlayerIndex];
    spellContainer.style.display = "flex";
    
    // Alustetaan rivit ja painikkeet aina piiloon puhtaasti ilman inline-häiriöitä
    spellRow1.style.display = "none";
    spellRow2.style.display = "none";
    spellBtn1.style.display = "none";
    spellBtn2.style.display = "none";
    if (spellHelpBtn1) spellHelpBtn1.style.display = "none";
    if (spellHelpBtn2) spellHelpBtn2.style.display = "none";
    if (spellInfoBox) spellInfoBox.style.display = "none";

    if (p.name === "Muodonmuuttaja") {
        spellRow1.style.display = "flex"; // Avaa rivin siistinä flex-laatikkona
        spellBtn1.style.display = "block";
        if (spellHelpBtn1) {
            spellHelpBtn1.style.display = "flex";
            spellHelpBtn1.dataset.spell = "Korttitulva";
        }
        spellBtn1.innerHTML = `ᛗ Korttitulva (${p.spells.flood})`;
        spellBtn1.disabled = p.spells.flood <= 0 || currentActiveTheme === "vapaavalintainen" || activeModifiers.extendToEight;
        spellBtn1.onclick = () => {
            triggerSpellAnimation('curse'); // <-- Поменяли на 'curse' (Красный)
            activeModifiers.extendToEight = true;
            isMetamorphosisUsedThisTurn = false;
            p.spells.flood--;
            playAudio(sounds.morph);
            renderSpellButtonsBeforeWords();
        };
    } else if (p.name === "Kirouksenlangettaja") {
        // Kirouksenlangettajalla on kaksi eri loitsua eri riveillä, avataan molemmat flex-muotoon
        spellRow1.style.display = "flex";
        spellRow2.style.display = "flex";
        spellBtn1.style.display = "block";
        spellBtn2.style.display = "block";
        if (spellHelpBtn1) {
            spellHelpBtn1.style.display = "flex";
            spellHelpBtn1.dataset.spell = "Korttinälkä";
        }
        if (spellHelpBtn2) {
            spellHelpBtn2.style.display = "flex";
            spellHelpBtn2.dataset.spell = "Sanakaaos";
        }

        spellBtn1.innerHTML = `ᚎ Korttinälkä (${p.spells.hunger})`;
        spellBtn1.disabled = p.spells.hunger <= 0 || pendingCurses.hunger;
        spellBtn1.onclick = () => {
            triggerSpellAnimation('morph'); // <-- Поменяли на 'morph' (Фиолетовый)
            pendingCurses.hunger = true;
            p.spells.hunger--;
            playAudio(sounds.curse);
            renderSpellButtonsBeforeWords();
        };
        spellBtn2.innerHTML = `☿ Sanakaaos (${p.spells.chaos})`;
        spellBtn2.disabled = p.spells.chaos <= 0 || pendingCurses.chaos;
        spellBtn2.onclick = () => {
            triggerSpellAnimation('morph'); // <-- Поменяли на 'morph' (Фиолетовый)
            pendingCurses.chaos = true;
            p.spells.chaos--;
            playAudio(sounds.curse);
            renderSpellButtonsBeforeWords();
        };
    } else if (p.name === "Yrttitarhuri") {
        spellRow1.style.display = "flex"; // Avaa rivin siistinä flex-laatikkona
        spellBtn1.style.display = "block";
        if (spellHelpBtn1) {
            spellHelpBtn1.style.display = "flex";
            spellHelpBtn1.dataset.spell = "Kasvupurkaus";
        }
        spellBtn1.innerHTML = `ᛘ Kasvupurkaus (${p.spells.regrowth})`;
        spellBtn1.disabled = (p.spells.regrowth <= 0 || p.extraTurnGranted === true || isExtraTurnRound);
        spellBtn1.onclick = () => {
            triggerSpellAnimation('druid'); // <-- LISÄTTY TÄMÄ
            p.extraTurnGranted = true;
            p.spells.regrowth--;
            playAudio(sounds.druid);
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
        
        spellRow1.style.display = "flex";
        spellBtn1.style.display = "block";
        if (spellHelpBtn1) {
            spellHelpBtn1.style.display = "flex";
            spellHelpBtn1.dataset.spell = "Sanametamorfoosi";
        }
        
        spellRow2.style.display = "none";
        spellBtn2.style.display = "none";
        if (spellHelpBtn2) {
            spellHelpBtn2.style.display = "none";
        }
        
        spellBtn1.innerHTML = `🌀 Sanametamorfoosi (${p.spells.metamorphosis})`;
        spellBtn1.disabled = false;
        
        spellBtn1.onclick = () => {
            const vahvistus = confirm(
                "VAROITUS:\n\n" +
                "Oletko aktivoimassa Sanametamorfoosin?\n" +
                "Jos onnistut selityksessä, saat tästä vuorosta 50 pistettä 100 pisteen sijaan.\n\n" +
                "Haluatko jatkaa?"
            );

            if (!vahvistus) return;

            triggerSpellAnimation('curse');

            const cleanLetters = new Set();
            
            // ИСПРАВЛЕНО: Фильтруем слова, исключая уже использованные в этой игре
            let commonCopy = commonWords
                .map(w => capitalize(w))
                .filter(w => !usedWordsInThisGame.includes(w));
            
            generatedWordsList = generatedWordsList.map(() => {
                let foundWord = "";
                let subAttempts = 0;
                while (commonCopy.length > 0 && subAttempts < 100) {
                    const randIdx = Math.floor(Math.random() * commonCopy.length);
                    const w = commonCopy[randIdx]; // Уже с большой буквы благодаря .map()
                    if (!cleanLetters.has(w.charAt(0).toLowerCase())) {
                        foundWord = w;
                        cleanLetters.add(w.charAt(0).toLowerCase());
                        commonCopy.splice(randIdx, 1);
                        break;
                    }
                    commonCopy.splice(randIdx, 1);
                    subAttempts++;
                }
                if (foundWord === "" && commonCopy.length > 0) {
                    const randIdx = Math.floor(Math.random() * commonCopy.length);
                    foundWord = commonCopy[randIdx];
                    commonCopy.splice(randIdx, 1);
                }
                return foundWord !== "" ? foundWord : "Taikasana";
            });

            // ИСПРАВЛЕНО: Записываем новые трансформированные слова в глобальную историю игры
            generatedWordsList.forEach(w => {
                if (w !== "Taikasana" && !usedWordsInThisGame.includes(w)) {
                    usedWordsInThisGame.push(w);
                }
            });

            playAudio(sounds.morph);
            
            p.spells.metamorphosis--;
            isMetamorphosisUsedThisTurn = true; 
            renderOlList();
            spellContainer.style.display = "none";
            
            let baseInstruction = (activeCondition1 === "perusvaihtoehto" || activeCondition2 === "perusvaihtoehto") ?
                "Toinen pelaaja valitsee sanan ilman että näkee listaa. Selitä sana normaalisti." :
                "Valitse yksi sana ja selitä se toiselle pelaajalle.";

            ruleInstruction.style.display = "block";
            ruleInstruction.innerHTML = `<span style="color: #e74c3c; font-weight: bold; display: block; margin-bottom: 5px;">AKTIIVINEN TILA: Sanat ovat vaihdettu — Puolitettu palkinto (+50p)</span>` + baseInstruction;
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

    // ИЗМЕНЕНО: Удаляем элемент через 1200мс, чтобы анимация успела плавно завершиться
    setTimeout(() => {
        flash.remove();
    }, 1200); 
};