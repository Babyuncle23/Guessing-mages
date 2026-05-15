// UUSI REILU LASKENTAKAAVA (Perustuu pelin pituuteen + nopan tuomaan bonukseen/haittaan)
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
    spellBtn1.style.display = "none";
    spellBtn2.style.display = "none";

    if (p.name === "Muodonmuuttaja") {
        spellBtn1.style.display = "inline-block";
        spellBtn1.innerHTML = `ᛗ Korttitulva (${p.spells.flood})`;
        spellBtn1.disabled = p.spells.flood <= 0 || currentActiveTheme === "vapaavalintainen" || activeModifiers.extendToEight;
        spellBtn1.onclick = () => {
            activeModifiers.extendToEight = true;
            isMetamorphosisUsedThisTurn = false; // <-- VARMISTETAAN, että tämä on false!
            p.spells.flood--;
            playAudio(sounds.morph);
            renderSpellButtonsBeforeWords();
        };
    } else if (p.name === "Kirouksenlankettaja") {
        spellBtn1.style.display = "inline-block";
        spellBtn2.style.display = "inline-block";

        spellBtn1.innerHTML = `ᚎ Korttinälkä (${p.spells.hunger})`;
        spellBtn1.disabled = p.spells.hunger <= 0 || pendingCurses.hunger;
        spellBtn1.onclick = () => {
            pendingCurses.hunger = true;
            p.spells.hunger--;
            playAudio(sounds.curse);
            renderSpellButtonsBeforeWords();
        };

        spellBtn2.innerHTML = `☿ Sanakaaos (${p.spells.chaos})`;
        spellBtn2.disabled = p.spells.chaos <= 0 || pendingCurses.chaos;
        spellBtn2.onclick = () => {
            pendingCurses.chaos = true;
            p.spells.chaos--;
            playAudio(sounds.curse);
            renderSpellButtonsBeforeWords();
        };
    } else if (p.name === "Yrttitarhuri") {
        spellBtn1.style.display = "inline-block";
        spellBtn1.innerHTML = `ᛘ Kasvupurkaus (${p.spells.regrowth})`;
        spellBtn1.disabled = (p.spells.regrowth <= 0 || p.extraTurnGranted === true || isExtraTurnRound);
        spellBtn1.onclick = () => {
            p.extraTurnGranted = true;
            p.spells.regrowth--;
            playAudio(sounds.druid);
            playClickSound();
            renderSpellButtonsBeforeWords();
            updateTurnDisplay();
            ruleInstruction.textContent = "Kasvupurkaus aktivoitu! Jos selität sanan onnistuneesti, saat heti uuden vuoron perään.";
        };
    }
};

const renderSpellButtonsAfterWords = () => {
    const p = gamePlayers[currentPlayerIndex];
    if (p && p.name === "Muodonmuuttaja" && p.spells.metamorphosis > 0) {
        spellContainer.style.display = "flex";
        spellBtn1.style.display = "inline-block";
        spellBtn2.style.display = "none";
        spellBtn1.innerHTML = `🌀 Sanametamorfoosi (${p.spells.metamorphosis})`;
        spellBtn1.disabled = false;
        
 spellBtn1.onclick = () => {
            // Päivitetty varmistusikkuna suoralla yksikköpuheella (sinuttelu)
            const vahvistus = confirm(
                "🧙‍♂️ LOITSUN VAROITUS:\n\n" +
                "Oletko aktivoimassa Sanametamorfoosin?\n" +
                "Tämä muuttaa kierroksen tilaksi: 'Helpotetut sanat — Puolitettu palkinto'.\n\n" +
                "Jos onnistut selityksessä, saat tästä vuorosta vain +0.5 pistettä normaalin 1 pisteen sijaan.\n\n" +
                "Haluatko jatkaa?"
            );

            if (!vahvistus) return;

            // Jos pelaaja hyväksyy (OK), suoritetaan sanojen muutos normaalisti:
            const cleanLetters = new Set();
            let commonCopy = [...commonWords];
            generatedWordsList = generatedWordsList.map(() => {
                let foundWord = "";
                let subAttempts = 0;
                while (commonCopy.length > 0 && subAttempts < 100) {
                    const randIdx = Math.floor(Math.random() * commonCopy.length);
                    const w = capitalize(commonCopy[randIdx]);
                    if (!cleanLetters.has(w.charAt(0).toLowerCase())) {
                        foundWord = w;
                        cleanLetters.add(w.charAt(0).toLowerCase());
                        commonCopy.splice(randIdx, 1);
                        break;
                    }
                    commonCopy.splice(randIdx, 1);
                    subAttempts++;
                }
                if (foundWord === "" && commonWords.length > 0) {
                    foundWord = capitalize(commonWords[Math.floor(Math.random() * commonWords.length)]);
                }
                return foundWord !== "" ? foundWord : "Taikasana";
            });

            playAudio(sounds.morph);
            renderOlList();
            p.spells.metamorphosis--;
            isMetamorphosisUsedThisTurn = true; // Lukitaan puolikkaat pisteet
            spellContainer.style.display = "none";
            
            // Päivitetään myös peliruudun ohjeteksti (Vaihtoehto 4) pitämään tila näkyvissä selittäjälle
            let baseInstruction = (activeCondition1 === "perusvaihtoehto" || activeCondition2 === "perusvaihtoehto") ?
                "Toinen pelaaja valitsee sanan ilman että näkee listaa. Selitä sana normaalisti." :
                "Valitse yksi sana ja selitä se toiselle pelaajalle.";

            ruleInstruction.style.display = "block";
            ruleInstruction.innerHTML = `<span style="color: #e74c3c; font-weight: bold; display: block; margin-bottom: 5px;">⚠️ AKTIIVINEN TILA: Helpotetut sanat — Puolitettu palkinto (+0.5p)</span>` + baseInstruction;
        };
        
    } else {
        spellContainer.style.display = "none";
    }
};
