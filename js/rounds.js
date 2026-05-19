const buildWeightedThemePool = (weights, themeKeys = themes) => {
    const pool = [];
    themeKeys.forEach(theme => {
        const count = Math.max(0, Math.round(weights[theme] || 0));
        for (let i = 0; i < count; i++) {
            pool.push(theme);
        }
    });
    return pool;
};

const getThemeWeightsFromUI = () => {
    const weights = {};
    themes.forEach(theme => {
        const inputId = `theme-weight-${theme.replace(/\s+/g, '-')}`;
        const input = document.getElementById(inputId);
        weights[theme] = input ? parseInt(input.value, 10) || 0 : (themeWeights[theme] || 1);
    });
    return weights;
};

const pickWeightedRandom = (pool) => {
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
};

const getWeightedVerbalPool = (weights) => buildWeightedThemePool(weights, VERBAL_THEMES);

const getRandomWeightedVerbalTheme = (weights, forbidden = []) => {
    const verbalPool = getWeightedVerbalPool(weights).filter(theme => !forbidden.includes(theme));
    if (verbalPool.length > 0) return pickWeightedRandom(verbalPool);
    const fallback = VERBAL_THEMES.filter(theme => !forbidden.includes(theme));
    return fallback[Math.floor(Math.random() * fallback.length)];
};

const initializeThemeWeightSliders = () => {
    const sliders = document.querySelectorAll('.theme-weight-slider');
    sliders.forEach(slider => {
        const valueId = slider.dataset.valueId;
        const valueDisplay = document.getElementById(valueId);
        if (!valueDisplay) return;
        valueDisplay.textContent = slider.value;
        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
        });
    });
};

window.addEventListener('DOMContentLoaded', initializeThemeWeightSliders);

const randomizeTheme = () => {
    const p = gamePlayers[currentPlayerIndex];
    isMetamorphosisUsedThisTurn = false;


    btn.disabled = true;
    btn.style.opacity = "0.7";
    btnDisplayWords.style.display = "none";
    roundControls.style.display = 'none';
    wordList.style.display = "none";
    
    // TYHJENNETÄÄN OHJETEKSTI VAIN JOS SIITÄ EI OLE SUOJAVIESTIÄ (Tämä estää ylikirjoituksen alussa)
    ruleInstruction.textContent = "";
    
    themeDisplay.textContent = "";
    themeImage.style.display = "none";
    spellContainer.style.display = "none";
    currentActiveTheme = "";
    activeCondition1 = "";
    activeCondition2 = "";

    drumAnim.style.display = "block";
    playAudio(sounds.drum, 3);

    // Luodaan teemapooli käyttäjän tekemien painotusten perusteella
    const weights = getThemeWeightsFromUI();
    let currentThemesList = buildWeightedThemePool(weights);

    // Varotoimi: jos kaikkea on säädetty nollaan, varmista perusvaihtoehto
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
                    cond1 = getRandomWeightedVerbalTheme(weights);
                } while (cond1 === "kaksi ehtoa" || cond1 === "vapaavalintainen" || cond1 === "perusvaihtoehto");

                do {
                    cond2 = getRandomWeightedVerbalTheme(weights, [cond1]);
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
                if (imageUrl && themeImage) {
                    themeImage.textContent = imageUrl;
                    themeImage.style.display = "block";
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
                if (imageUrl && themeImage) { 
                    themeImage.textContent = imageUrl;
                    themeImage.style.display = "block"; 
                }

                const soundUrl = themeSounds[randomTheme];
                if (soundUrl) playAudio(new Audio(soundUrl));
            }

            btn.style.display = "none";
            btnDisplayWords.style.display = "block";
            btnDisplayWords.textContent = "👁️ Näytä sanat (vain selittäjälle, loitsut vain ennen painamista)";
            wordList.classList.remove("hidden-words");
            isWordListHidden = true;
            roundControls.style.display = 'none';
            renderSpellButtonsBeforeWords();
            updateTurnDisplay();

            const activeSpellsLog = [];
            if (activeModifiers.extendToEight) activeSpellsLog.push("Korttitulva: lista kasvaa kahdella sanalla");
            if (activeModifiers.reduceToThree) activeSpellsLog.push("Korttinälkä: lista supistuu 3 sanaan");
            if (activeModifiers.chaosFourWords) activeSpellsLog.push("Sanakaaos: korvaa 3 sanaa vaikeammilla");

            if (activeSpellsLog.length > 0 && !isMetamorphosisUsedThisTurn) {
                ruleInstruction.style.display = "block";
                ruleInstruction.innerHTML = `<span style="color: #e5c158; font-weight: bold; display: block; margin-bottom: 10px;">Aktiiviset taiat: ${activeSpellsLog.join(', ')}</span>`;
            } else {
                ruleInstruction.textContent = "";
            }

            const activePlayer = gamePlayers[currentPlayerIndex];
            
            // 1. ILMOITUKSET MUODONMUUTTAJALLE HÄNEN OMAN VUORONSA ALUSSA
            
            // 2. ILMOITUS UHRILLA (Kirouksenlangettajalle), KUN HÄNEN VUORONSA ALKAA JA HEIJASTETTU KIROUS ISKEE
            if (activePlayer && activePlayer.name === "Kirouksenlangettaja") {
                if (activeModifiers.reduceToThree || activeModifiers.chaosFourWords) {
                    const reversedMessage = `<span style="color: #e74c3c; font-weight: bold; display: block; margin-bottom: 10px;">☠️ KÄÄNTEINEN MAGIA: Muodonmuuttaja heijasti aiemman kirouksesi takaisin! Kärsit nyt omasta taiastasi tällä vuorolla!</span>`;
                    if (ruleInstruction.innerHTML) {
                        ruleInstruction.innerHTML += reversedMessage;
                    } else {
                        ruleInstruction.style.display = "block";
                        ruleInstruction.innerHTML = reversedMessage;
                    }
                }
            }

        }, 400);
    }, 2500);
};

const switchToWords = () => {
    playClickSound();
    playAudio(sounds.flip);
    
    // Teeman kuvat ja tekstit jätetään päälle, uusi CSS (words-active) hoitaa asettelun
    document.getElementById("gameContainer").classList.add("words-active");
    roundControls.style.display = 'flex';
    spellContainer.style.display = "none";
    
    generatedWordsList = [];
    wordList.classList.remove("hidden-words");

    if (activeCondition1 === "vapaavalintainen" || activeCondition2 === "vapaavalintainen") {
        ruleInstruction.textContent = "Keksi oma sana ja selitä se toiselle pelaajalle ilman listaa. Paina sen jälkeen 'Arvattu!' tai 'Luovuta'.";
        btnDisplayWords.style.display = "none";
        isWordListHidden = true;
        return; 
    }

    // Suodatetaan pelin sanalistoista pois sanat, jotka on jo käytetty tässä pelissä
    let filteredAllWords = allWords.filter(w => !usedWordsInThisGame.includes(capitalize(w)));
    let filteredCommonWords = commonWords.filter(w => !usedWordsInThisGame.includes(capitalize(w)));

    let targetCount = 5;
    let activeSpellsLog = [];

    if (activeModifiers.extendToEight) { targetCount += 2; activeSpellsLog.push("Korttitulva: lista kasvaa kahdella sanalla"); }
    if (activeModifiers.reduceToThree) { targetCount -= 2; activeSpellsLog.push("Korttinälkä: lista supistuu 3 sanaan"); }
    if (activeModifiers.chaosFourWords) { activeSpellsLog.push("Sanakaaos: korvaa 3 sanaa vaikeammilla"); }

    targetCount = Math.max(1, targetCount);

    let baseInstruction = (activeCondition1 === "perusvaihtoehto" || activeCondition2 === "perusvaihtoehto") ?
        "Toinen pelaaja valitsee sanan ilman että näkee listaa. Selitä sana normaalisti." :
        "Valitse yksi sana ja selitä se toiselle pelaajalle.";

    if (activeSpellsLog.length > 0) {
        if (!isMetamorphosisUsedThisTurn) {
            ruleInstruction.innerHTML = `<span style="color: #e5c158; font-weight: bold; display: block; margin-bottom: 5px;">Aktiiviset taiat: ${activeSpellsLog.join(', ')} (${targetCount} sanaa)</span>` + baseInstruction;
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
        // Korvataan kolme satunnaista sanaa vaikeilla sanoilla
        const maxToReplace = Math.min(3, generatedWordsList.length);
        const replaceIndices = [];

        while (replaceIndices.length < maxToReplace) {
            const idx = Math.floor(Math.random() * generatedWordsList.length);
            if (!replaceIndices.includes(idx)) {
                replaceIndices.push(idx);
            }
        }

        replaceIndices.forEach(idx => {
            if (filteredAllWords.length > 0) {
                const randIdx = Math.floor(Math.random() * filteredAllWords.length);
                const w = capitalize(filteredAllWords[randIdx]);
                generatedWordsList[idx] = w;
                usedWordsInThisGame.push(w);
                filteredAllWords.splice(randIdx, 1);
            }
        });
    }

    generatedWordsList.sort(() => Math.random() - 0.5);
    renderOlList();
    btnDisplayWords.style.display = "block";
    btnDisplayWords.textContent = "🙈 Piilota sanat";
    isWordListHidden = false;
    renderSpellButtonsAfterWords();
};

const toggleWordVisibility = () => {
    if (wordList.style.display === "none" || wordList.children.length === 0) {
        switchToWords();
        return;
    }

    if (isWordListHidden) {
        wordList.classList.remove("hidden-words");
        btnDisplayWords.textContent = "🙈 Piilota sanat";
        isWordListHidden = false;
    } else {
        wordList.classList.add("hidden-words");
        btnDisplayWords.textContent = "👁️ Näytä sanat (vain selittäjälle)";
        isWordListHidden = true;
    }
};

const endRound = (isGuessed) => {
    const p = gamePlayers[currentPlayerIndex];
    let triggersExtraTurnNext = false;

    if (isGuessed) {
        playAudio(sounds.success);
        
        if (isMetamorphosisUsedThisTurn || isExtraTurnRound) {
            p.score += 0.5; 
        } else {
            p.score += 1;   
        }

        // 🧬 MATKIMINEN PROSENTEILLA: LISÄVUORON KOPIOINTI (50% Mahdollisuus)
        if (p.name === "Yrttitarhuri" && p.extraTurnGranted) {
        triggersExtraTurnNext = true;
        playAudio(sounds.druid);
        p.extraTurnGranted = false;
    }

    } else {
        // Family-friendly toggle removed — always play failure (fart) sound on fail
        playAudio(sounds.fail);
        
        if (p.name === "Yrttitarhuri") {
            p.extraTurnGranted = false;
        }
    }

    wordList.style.display = "none";
    wordList.classList.remove("hidden-words");
    isWordListHidden = true;
    btnDisplayWords.style.display = "none";
    btnDisplayWords.textContent = "Näytä sanat (vain selittäjälle)";
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