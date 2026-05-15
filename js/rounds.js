const randomizeTheme = () => {
    const p = gamePlayers[currentPlayerIndex];
    druidShieldActivated = false; 
    isMetamorphosisUsedThisTurn = false;

    // --- MATKIMINEN PROSENTEILLA: KIROUSTEN HEIJASTAMINEN (50% Mahdollisuus) ---
    if (p && p.name === "Muodonmuuttaja" && !isExtraTurnRound) {
        if (pendingCurses.hunger || pendingCurses.chaos || activeModifiers.reduceToThree || activeModifiers.chaosFourWords) {
            
            // MUUTETTU: 0.50 -> 0.35 (35% mahdollisuus)
            if (Math.random() < 0.35) { 
                playAudio(sounds.morph);
                
                morferReflectedCurseNotice = "reflected";
                
                if (activeModifiers.reduceToThree) pendingCurses.hunger = true;
                if (activeModifiers.chaosFourWords) pendingCurses.chaos = true;
            } else {
                morferReflectedCurseNotice = "failed";
            }
        }
    }

    // Druidin suojamekaniikka (60% mahdollisuus)
    if (p && p.name === "Yrttitarhuri" && !isExtraTurnRound) {
        if (pendingCurses.hunger || pendingCurses.chaos || activeModifiers.reduceToThree || activeModifiers.chaosFourWords) {
            if (Math.random() < 0.60) {
                druidShieldActivated = true; 
                pendingCurses.hunger = false;
                pendingCurses.chaos = false;
                activeModifiers.reduceToThree = false;
                activeModifiers.chaosFourWords = false;
                playAudio(sounds.druid);
                ruleInstruction.style.display = "block";
                ruleInstruction.innerHTML = `<span style="color: #2ecc71; font-weight: bold; display: block; margin-bottom: 10px;">🛡️ Luonnon suojelu onnistui! Druidi torjui vastustajan kiroukset (60% mahdollisuus)!</span>`;
            } else {
                ruleInstruction.style.display = "block";
                ruleInstruction.innerHTML = `<span style="color: #e74c3c; font-weight: bold; display: block; margin-bottom: 10px;">💥 Luonnon suojelu petti! Vastustajan kirous murskasi Druidin puolustuksen!</span>`;
            }
        }
    }

    btn.disabled = true;
    btn.style.opacity = "0.7";
    btnDisplayWords.style.display = "none";
    roundControls.style.display = 'none';
    wordList.style.display = "none";
    
    // TYHJENNETÄÄN OHJETEKSTI VAIN JOS SIITÄ EI OLE SUOJAVIESTIÄ (Tämä estää ylikirjoituksen alussa)
    if (!druidShieldActivated && !ruleInstruction.innerHTML.includes("murskasi")) {
        ruleInstruction.textContent = "";
    }
    
    themeDisplay.textContent = "";
    themeImage.style.display = "none";
    spellContainer.style.display = "none";
    currentActiveTheme = "";
    activeCondition1 = "";
    activeCondition2 = "";

    drumAnim.style.display = "block";
    playAudio(sounds.drum, 3);

    // СОЗДАЕМ И ФИЛЬТРУЕМ СПИСОК ТЕМ ДЛЯ ТЕКУЩЕГО РАУНДА
    let currentThemesList = [...themes];

    // Если стоит галочка "Убрать испанский", удаляем его из пула доступных тем
    const disableSpanishCheckbox = document.getElementById("disableSpanishCheckbox");
    if (disableSpanishCheckbox && disableSpanishCheckbox.checked) {
        currentThemesList = currentThemesList.filter(t => t !== "espanja");
    }

    // Страховка: если список почему-то пуст, добавляем базовый вариант
    if (currentThemesList.length === 0) {
        currentThemesList = ["perusvaihtoehto"];
    }

    setTimeout(() => {
        drumAnim.style.display = "none";
        const nyt = document.createElement('div');
        nyt.className = 'flash-now';
        nyt.textContent = 'NYT!';
        container.appendChild(nyt);
        if (navigator.vibrate) navigator.vibrate(100);

         setTimeout(() => {
            nyt.remove();
            const devSelect = document.getElementById("devThemeSelect");
            
            let randomTheme = (devSelect && devSelect.value !== "RANDOM") ? devSelect.value : currentThemesList[Math.floor(Math.random() * currentThemesList.length)];

            if (randomTheme === "kaksi ehtoa") {
                let cond1 = "", cond2 = "", safetyAttempts = 0;
                do {
                    cond1 = VERBAL_THEMES[Math.floor(Math.random() * VERBAL_THEMES.length)];
                } while (cond1 === "kaksi ehtoa" || cond1 === "vapaavalintainen" || cond1 === "perusvaihtoehto");

                do {
                    cond2 = VERBAL_THEMES[Math.floor(Math.random() * VERBAL_THEMES.length)];
                    safetyAttempts++;
                } while (
                    (cond2 === "kaksi ehtoa" || cond2 === cond1 || cond2 === "vapaavalintainen" || cond2 === "perusvaihtoehto" || checkThemesIncompatible(cond1, cond2)) && safetyAttempts < 100
                );

                activeCondition1 = cond1;
                activeCondition2 = cond2;
                currentActiveTheme = "kaksi ehtoa_combined";

                themeDisplay.style.display = "block";
                themeDisplay.textContent = `2 Ehtoa: ${cond1.toUpperCase()} + ${cond2.toUpperCase()}`;

                const imageUrl = themeImages[cond1];
                if (imageUrl) { 
                    if (cond1 === "ilman verbejä" && document.getElementById("sfwModeCheckbox") && document.getElementById("sfwModeCheckbox").checked) {
                        themeImage.style.display = "none";
                    } else {
                        themeImage.src = imageUrl; 
                        themeImage.style.display = "block"; 
                    }
                }
                
                const soundUrl = themeSounds[cond1];
                if (soundUrl) playAudio(new Audio(soundUrl));
            } else {
                activeCondition1 = randomTheme;
                activeCondition2 = "";
                currentActiveTheme = randomTheme;

                themeDisplay.style.display = "block";
                themeDisplay.textContent = randomTheme.toUpperCase();

                const imageUrl = themeImages[randomTheme];
                if (imageUrl) { 
                    if (randomTheme === "ilman verbejä" && document.getElementById("sfwModeCheckbox") && document.getElementById("sfwModeCheckbox").checked) {
                        themeImage.style.display = "none";
                    } else {
                        themeImage.src = imageUrl; 
                        themeImage.style.display = "block"; 
                    }
                }

                const soundUrl = themeSounds[randomTheme];
                if (soundUrl) playAudio(new Audio(soundUrl));
            }

            btn.style.display = "none";
            btnDisplayWords.style.display = "block";
            btnDisplayWords.textContent = "Näytä sanat (vain selittäjälle)";
            roundControls.style.display = 'none';
            renderSpellButtonsBeforeWords();
            updateTurnDisplay();

            const activePlayer = gamePlayers[currentPlayerIndex];
            
            // 1. ILMOITUKSET MUODONMUUTTAJALLE HÄNEN OMAN VUORONSA ALUSSA
            if (activePlayer && activePlayer.name === "Muodonmuuttaja") {
                if (morferReflectedCurseNotice === "reflected") {
                    ruleInstruction.style.display = "block";
                    ruleInstruction.innerHTML = `<span style="color: #9b59b6; font-weight: bold; display: block; margin-bottom: 10px;">🧬 ULKOKUOREN MATKIMINEN: Heijastit vastustajan kirouksen takaisin lähettäjälle! Se iskee häneen ensi vuorolla!</span>`;
                } else if (morferReflectedCurseNotice === "failed") {
                    ruleInstruction.style.display = "block";
                    ruleInstruction.innerHTML = `<span style="color: #e74c3c; font-weight: bold; display: block; margin-bottom: 10px;">💥 ULKOKUOREN MATKIMINEN: Ulkokuoresi petti! Vastustajan kirous iski puolustuksesi läpi!</span>`;
                }
                morferReflectedCurseNotice = ""; // Nollataan luetuksi
                
                // Näytetään myös lisävuorouutiset jos niitä on
                if (morferCopiedTurnNotice === "success") {
                    ruleInstruction.style.display = "block";
                    ruleInstruction.innerHTML += `<span style="color: #9b59b6; font-weight: bold; display: block; margin-bottom: 10px;">🧬 SOLUMATKIMINEN: Onnistuit matkimaan lisävuoroa! Saat tämän kierroksen jälkeen oman lisävuorosi!</span>`;
                } else if (morferCopiedTurnNotice === "fail") {
                    ruleInstruction.style.display = "block";
                    ruleInstruction.innerHTML += `<span style="color: #e74c3c; font-weight: bold; display: block; margin-bottom: 10px;">💥 SOLUMATKIMINEN: Yritit matkia lisävuoroa, mutta kopiointi epäonnistui.</span>`;
                }
                morferCopiedTurnNotice = ""; // Nollataan luetuksi
            }
            
            // 2. ILMOITUS UHRILLA (Kiroksenlankettajalle), KUN HÄNEN VUORONSA ALKAA JA HEIJASTETTU KIROUS ISKEE
            if (activePlayer && activePlayer.name === "Kirouksenlankettaja") {
                if (activeModifiers.reduceToThree || activeModifiers.chaosFourWords) {
                    ruleInstruction.style.display = "block";
                    ruleInstruction.innerHTML = `<span style="color: #e74c3c; font-weight: bold; display: block; margin-bottom: 10px;">☠️ KÄÄNTEINEN MAGIA: Muodonmuuttaja heijasti aiemman kirouksesi takaisin! Kärsit nyt omasta taiastasi tällä vuorolla!</span>`;
                }
            }

        }, 400);
    }, 2500);
};

const switchToWords = () => {
    playClickSound();
    playAudio(sounds.flip);
    
    btnDisplayWords.style.display = "none";
    // Teeman kuvat ja tekstit jätetään päälle, uusi CSS (words-active) hoitaa asettelun
    document.getElementById("gameContainer").classList.add("words-active");
    roundControls.style.display = 'flex';
    spellContainer.style.display = "none";
    
    generatedWordsList = [];

    if (activeCondition1 === "vapaavalintainen" || activeCondition2 === "vapaavalintainen") {
        ruleInstruction.textContent = "Keksi oma sana ja selitä se toiselle pelaajalle ilman listaa. Paina sen jälkeen 'Arvattu!' tai 'Luovuta'.";
        return; 
    }

    // Suodatetaan pelin sanalistoista pois sanat, jotka on jo käytetty tässä pelissä
    let filteredAllWords = allWords.filter(w => !usedWordsInThisGame.includes(capitalize(w)));
    let filteredCommonWords = commonWords.filter(w => !usedWordsInThisGame.includes(capitalize(w)));

    let targetCount = 5;
    let activeSpellsLog = [];

    if (activeModifiers.extendToEight) { targetCount += 3; activeSpellsLog.push("Korttitulva (+3)"); }
    if (activeModifiers.reduceToThree) { targetCount -= 3; activeSpellsLog.push("Korttinälkä (-2)"); }
    if (activeModifiers.chaosFourWords) { activeSpellsLog.push("Sanakaaos (Kaaossanat)"); }

    targetCount = Math.max(1, targetCount);

    let baseInstruction = (activeCondition1 === "perusvaihtoehto" || activeCondition2 === "perusvaihtoehto") ?
        "Toinen pelaaja valitsee sanan ilman että näkee listaa. Selitä sana normaalisti." :
        "Valitse yksi sana ja selitä se toiselle pelaajalle.";

    if (activeSpellsLog.length > 0) {
        if (!isMetamorphosisUsedThisTurn) {
            ruleInstruction.innerHTML = `<span style="color: #e5c158; font-weight: bold; display: block; margin-bottom: 5px;">Aktiiviset taiat: ${activeSpellsLog.join(', ')} (${targetCount} korttia)</span>` + baseInstruction;
        }
    } else if (!isMetamorphosisUsedThisTurn) {
        ruleInstruction.textContent = baseInstruction;
    }

    const usedFirstLetters = new Set();

    // 1. Haetaan ensimmäinen sana (harvinaisemmista sanoista jos mahdollista)
    if (filteredAllWords.length > 0) {
        const randIdx = Math.floor(Math.random() * filteredAllWords.length);
        const w = capitalize(filteredAllWords[randIdx]);
        generatedWordsList.push(w);
        usedWordsInThisGame.push(w); // Tallennetaan globaaliin pelimuistiin
        usedFirstLetters.add(w.charAt(0).toLowerCase());
    }

    // 2. Täytetään lista uniikeilla yleisillä sanoilla (eri alkukirjaimet)
    let attempts = 0;
    let commonCopy = [...filteredCommonWords];
    while (generatedWordsList.length < targetCount && commonCopy.length > 0 && attempts < 500) {
        const randIdx = Math.floor(Math.random() * commonCopy.length);
        const w = capitalize(commonCopy[randIdx]);
        const firstLetter = w.charAt(0).toLowerCase();
        
        if (!usedFirstLetters.has(firstLetter)) {
            generatedWordsList.push(w);
            usedWordsInThisGame.push(w); // Tallennetaan globaaliin pelimuistiin
            usedFirstLetters.add(firstLetter);
        }
        commonCopy.splice(randIdx, 1);
        attempts++;
    }

    // Varajärjestelmä, jos uniikit alkukirjaimet loppuvat kesken
    let fallbackAttempts = 0;
    while (generatedWordsList.length < targetCount && filteredCommonWords.length > 0 && fallbackAttempts < 200) {
        const randIdx = Math.floor(Math.random() * filteredCommonWords.length);
        const w = capitalize(filteredCommonWords[randIdx]);
        if (!generatedWordsList.includes(w)) {
            generatedWordsList.push(w);
            usedWordsInThisGame.push(w); // Tallennetaan globaaliin pelimuistiin
        }
        fallbackAttempts++;
    }

    // 3. Sanakaaos-loitsun mekaaninen korvaus (vaikeat sanat tilalle)
// 3. KORJATTU Sanakaaos: Toimii aina kun sanoja on vähintään 1 jäljellä
    if (activeModifiers.chaosFourWords && filteredAllWords.length > 0) {
        // Korvataan aivan kaikki listalla olevat sanat vaikeilla sanoilla
        const maxToReplace = generatedWordsList.length; 
        
        for (let idx = 0; idx < maxToReplace; idx++) {
            // Jos vaikeat sanat sattuisivat loppumaan kesken pelin, käytetään yleisiä sanoja turvaverkona
            if (filteredAllWords.length > 0) {
                const randIdx = Math.floor(Math.random() * filteredAllWords.length);
                const w = capitalize(filteredAllWords[randIdx]);
                generatedWordsList[idx] = w;
                usedWordsInThisGame.push(w);
                // Poistetaan sana heti tästä paikallisesta arvonnasta, ettei sama sana tule kahdesti samalle kortille
                filteredAllWords.splice(randIdx, 1); 
            }
        }
    }

    generatedWordsList.sort(() => Math.random() - 0.5);
    renderOlList();
    renderSpellButtonsAfterWords();
};

const endRound = (isGuessed) => {
    const p = gamePlayers[currentPlayerIndex];
    let triggersExtraTurnNext = false;
    druidShieldActivated = false;
    isExtraTurnRound = false; // KORJATTU: 'let' poistettu, jotta päivittää globaalin muuttujan!

    if (isGuessed) {
        playAudio(sounds.success);
        
        if (isMetamorphosisUsedThisTurn) {
            p.score += 0.5; 
        } else {
            p.score += 1;   
        }

        // 🧬 MATKIMINEN PROSENTEILLA: LISÄVUORON KOPIOINTI (50% Mahdollisuus)
        if (p.name === "Yrttitarhuri" && p.extraTurnGranted) {
            triggersExtraTurnNext = true;
            playAudio(sounds.druid);
            p.extraTurnGranted = false;

            const morferi = gamePlayers.find(pl => pl.name === "Muodonmuuttaja");
            
            if (morferi && Math.random() < 0.50) {
                morferi.extraTurnGranted = true; 
                morferCopiedTurnNotice = "success"; 
            } else if (morferi) {
                morferCopiedTurnNotice = "fail";
            }
        }

    } else {
        if (document.getElementById("sfwModeCheckbox") && document.getElementById("sfwModeCheckbox").checked) {
            playAudio(sounds.flip);
        } else {
            playAudio(sounds.fail); 
        }
        
        if (p.name === "Yrttitarhuri") {
            p.extraTurnGranted = false;
        }
    }

    wordList.style.display = "none";
    ruleInstruction.textContent = "";
    spellContainer.style.display = "none";

    if (themeDisplay) themeDisplay.textContent = "";
    if (themeImage) themeImage.style.display = "none";
    document.getElementById("gameContainer").classList.remove("words-active");

    if (!triggersExtraTurnNext) {
        activeModifiers.extendToEight = false;
        activeModifiers.reduceToThree = false;
        activeModifiers.chaosFourWords = false;

        if (pendingCurses.hunger) { activeModifiers.reduceToThree = true; pendingCurses.hunger = false; }
        if (pendingCurses.chaos) { activeModifiers.chaosFourWords = true; pendingCurses.chaos = false; }

        isExtraTurnRound = false; 

        turnsInCurrentRound++;
        if (turnsInCurrentRound >= gamePlayers.length) {
            turnsInCurrentRound = 0;
            currentRound++;
            
            if (currentRound === (totalTurns - 1)) {
                const cursemage = gamePlayers.find(pl => pl.name === "Kirouksenlankettaja");
                if (cursemage && Math.random() < 0.666) {
                    const spellKeys = ["hunger", "chaos"];
                    const randomSpell = spellKeys[Math.floor(Math.random() * spellKeys.length)];
                    
                    cursemage.spells[randomSpell]++;
                    
                    setTimeout(() => {
                        ruleInstruction.style.display = "block";
                        ruleInstruction.innerHTML = `<span style="color: #9b59b6; font-weight: bold; display: block; margin-bottom: 10px;">🔮 Kaaoksen paluu! Kirouksenlankettajan synkkä passiivi aktivoitui toiseksi viimeisellä kierroksella: +1 ${randomSpell === 'hunger' ? 'Korttinälkä' : 'Sanakaaos'}!</span>`;
                    }, 500);
                }
            }
        }
    } else {
        activeModifiers.extendToEight = false; 
        isExtraTurnRound = true; 
    }

    // KORJATTU PISTELASKU JA LOPPURUUTU:
    if (currentRound > totalTurns) {
        const sortedPlayers = [...gamePlayers].sort((a, b) => b.score - a.score);
        const winnerText = sortedPlayers[0].score === sortedPlayers[1].score ?
            "Peli päättyi tasan!" : `Voittaja on ${sortedPlayers[0].name}!`;
        const scoreSummary = gamePlayers.map(pl => `${pl.name}: ${pl.score}p`).join('\n');
        alert(`Peli ohi!\n${winnerText}\n\nLopulliset pisteet:\n${scoreSummary}`);
        location.reload();
        return;
    }

    gamePlayers.forEach(pl => {
        if (pl.name === "Yrttitarhuri" && !triggersExtraTurnNext) {
            pl.extraTurnGranted = false; 
        }
    });

    if (!triggersExtraTurnNext) {
        currentPlayerIndex = (currentPlayerIndex + 1) % gamePlayers.length;
    } else {
        ruleInstruction.textContent = "🌱 Kasvupurkaus: saat uuden vuoron, koska arvaus onnistui!";
    }

    updateTurnDisplay();
    roundControls.style.display = 'none';
    btn.style.display = "block";
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.textContent = "Aloita kierros";
    currentActiveTheme = "";
    activeCondition1 = "";
    activeCondition2 = "";
    isMetamorphosisUsedThisTurn = false;
    document.getElementById("gameContainer").classList.remove("words-active");
};