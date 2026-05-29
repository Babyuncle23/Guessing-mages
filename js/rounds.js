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
        // Приводим к нижнему регистру и меняем пробелы на дефисы
        let formattedTheme = theme.toLowerCase().replace(/\s+/g, '-');
        
        // ОЧИСТКА: Заменяем финские ä и ö на обычные a и o, чтобы совпасть с HTML id
        formattedTheme = formattedTheme.replace(/ä/g, 'a').replace(/ö/g, 'o');
        
        const inputId = `theme-weight-${formattedTheme}`;
        const input = document.getElementById(inputId);
        
        // Если ползунок найден, берем его точное значение, иначе берем 0
        weights[theme] = input ? parseInt(input.value, 10) : 0;
    });
    return weights;
};

const pickWeightedRandom = (pool) => {
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
};

const getWeightedVerbalPool = (weights) => buildWeightedThemePool(weights, VERBAL_THEMES);

const getRandomWeightedVerbalTheme = (weights, forbidden = []) => {
    // Проверяем, есть ли что-то живое среди строго вербальных тем
    const verbalPool = getWeightedVerbalPool(weights).filter(theme => !forbidden.includes(theme));
    if (verbalPool.length > 0) return pickWeightedRandom(verbalPool);
    
    // АВАРИЙНЫЙ РЕЖИМ: Если вербальные темы отключены в 0, 
    // ищем вообще любые темы, включенные пользователем (вес > 0)
    const activeThemes = themes.filter(theme => (weights[theme] > 0) && !forbidden.includes(theme));
    if (activeThemes.length > 0) {
        return activeThemes[Math.floor(Math.random() * activeThemes.length)];
    }
    
    // Если вообще все ползунки в игре скручены в 0
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

    // --- UUSI LOGIIKKA: Haetaan kuvaukset suoraan JS-objektista HTML-asetuksiin ---
    const descContainers = document.querySelectorAll('.theme-desc-container');
    descContainers.forEach(container => {
        const themeKey = container.dataset.theme;
        if (typeof themeDescriptions !== 'undefined' && themeDescriptions[themeKey]) {
            container.textContent = themeDescriptions[themeKey];
        }
    });
};

window.addEventListener('DOMContentLoaded', initializeThemeWeightSliders);

// Вспомогательная функция для рендера красивой пульсирующей кнопки правил темы
const renderThemeRulesHelpButton = () => {
    const liveThemeBlock = document.getElementById('themeBlock');
    if (!liveThemeBlock) return;

    // Сначала чистим старую кнопку, чтобы они не дублировались
    const oldInfoBtn = document.getElementById('themeInfoHelpBtn');
    if (oldInfoBtn) oldInfoBtn.remove();

    // УДАЛЕНО: Проверка isDrawingActive больше не блокирует создание значка!

    // Создаем компактный круглый значок, только если для текущей темы есть описание в js/themes.js
    if (typeof themeDescriptions !== 'undefined' && themeDescriptions[currentActiveTheme]) {
        const infoBtn = document.createElement('div');
        infoBtn.id = "themeInfoHelpBtn";
        infoBtn.className = "theme-rules-badge-btn"; // Наш CSS класс круглого значка
        infoBtn.textContent = "i"; // Латинская маленькая "i"

        // Логика клика по значку
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Защита, чтобы клик не улетал на плашку темы
            if (typeof playClickSound === 'function') playClickSound();
            
            const modal = document.getElementById('spellHelpModal');
            const modalBody = document.getElementById('spellHelpModalBody');
            
            if (modal && modalBody) {
                modalBody.innerHTML = `
                    <div class="spell-info-title" style="color: var(--gold); font-family: 'Cinzel', serif; margin-bottom: 12px; font-size: 1.1rem; text-align: center;">
                        <strong>EHDON SÄÄNNÖT</strong>
                    </div>
                    <p style="line-height: 1.6; font-size: 14.5px; color: #fff; text-align: left; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border-left: 3px solid var(--gold); margin: 0;">
                        ${themeDescriptions[currentActiveTheme]}
                    </p>
                `;
                modal.style.display = "flex";
                document.body.classList.add("spell-help-modal-open");
            }
        });

        liveThemeBlock.appendChild(infoBtn);
    }
};
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

                       // === НАЧАЛО ТОЧЕЧНОЙ ЗАМЕНЫ ===
            activeCondition1 = randomTheme;
            activeCondition2 = "";
            currentActiveTheme = randomTheme;

            // Выводим название темы на экран (всегда крупными буквами)
            if (themeDisplay) {
                themeDisplay.style.display = "block";
                themeDisplay.textContent = randomTheme.toUpperCase();
            }

            // Показываем соответствующий теме эмодзи
            const imageUrl = themeImages[randomTheme];
            if (imageUrl && themeImage) { 
                themeImage.textContent = imageUrl;
                themeImage.style.display = "block"; 
            }

            // Воспроизводим уникальный звук темы (например, Unknown_Crayon_Drawing_Sound.ogg для рисования)
            const soundUrl = themeSounds[randomTheme];
            if (soundUrl) playAudio(new Audio(soundUrl));
            // === КОНЕЦ ТОЧЕЧНОЙ ЗАМЕНЫ ===

            // Ajetaan painikkeen luonti heti arvonnan jälkeen kaikille teemoille
            renderThemeRulesHelpButton();

            btn.style.display = "none";
            updateTurnDisplay();

            if (randomTheme === "vapaavalintainen") {
                ruleInstruction.style.display = "block";
                ruleInstruction.textContent = "✨ Keksi täysin oma sana mielessäsi ja selitä se toiselle pelaajalle ilman valmista listaa.";
                
                btnDisplayWords.style.display = "none";
                roundControls.style.display = 'flex';
                
                if (typeof renderSpellButtonsAfterWords === 'function') {
                    renderSpellButtonsAfterWords();
                }

                renderThemeRulesHelpButton();
            } else {
                // ДЛЯ ВСЕХ ОСТАЛЬНЫХ ТЕМ:
                btnDisplayWords.style.display = "block";
                btnDisplayWords.textContent = "👁️ Näytä sanat (vain selittäjälle, loitsut vain ennen painamista)";
                wordList.classList.remove("hidden-words");
                isWordListHidden = true;
                roundControls.style.display = 'none';
                renderSpellButtonsBeforeWords();

                // === НОВОЕ ИСПРАВЛЕНИЕ: Выводим текст для рисования СРАЗУ при старте раунда ===
                if (randomTheme === "piirtäminen") {
                    ruleInstruction.style.display = "block";
                    ruleInstruction.textContent = "🖌️ Piirtäminen: Selitä sana piirtämällä se alustalle. Et saa puhua, kirjoittaa kirjaimia tai numeroita.";
                }
            }


            const activeSpellsLog = [];
            if (activeModifiers.extendToEight) activeSpellsLog.push("Korttitulva: lista kasvaa kahdella sanalla");
            if (activeModifiers.reduceToThree) activeSpellsLog.push("Korttinälkä: lista supistuu kolmella sanalla");
            if (activeModifiers.chaosFourWords) activeSpellsLog.push("Sanakaaos: korvaa kolme sanaa vaikeammilla");

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
    
    document.getElementById("gameContainer").classList.add("words-active");
    roundControls.style.display = 'flex';
    spellContainer.style.display = "none";
    
    // --- ДОБАВЬТЕ ЭТУ СТРОЧКУ СЮДА ---
    ruleInstruction.textContent = ""; // Полностью очищаем старый текст перед выводом новых правил раунда
    // ---------------------------------
    
    generatedWordsList = [];
    wordList.classList.remove("hidden-words");

    // Делаем слова заглавными СРАЗУ при создании копий массивов для раунда
    let filteredAllWords = allWords
        .map(w => capitalize(w))
        .filter(w => !usedWordsInThisGame.includes(w));
        
    let filteredCommonWords = commonWords
        .map(w => capitalize(w))
        .filter(w => !usedWordsInThisGame.includes(w));

    let targetCount = 5;
    let activeSpellsLog = [];

    if (activeModifiers.extendToEight) { targetCount += 2; activeSpellsLog.push("Korttitulva: lista kasvaa kahdella sanalla"); }
    if (activeModifiers.reduceToThree) { targetCount -= 2; activeSpellsLog.push("Korttinälkä: lista supistuu 3 sanaan"); }
    if (activeModifiers.chaosFourWords) { activeSpellsLog.push("Sanakaaos: korvaa 3 sanaa vaikeammilla"); }

    targetCount = Math.max(1, targetCount);

    // === ИСПРАВЛЕННЫЙ ВАРИАНТ (БЕЗ ДУБЛИРОВАНИЯ ТЕКСТА) ===
    if (activeSpellsLog.length > 0 && !isMetamorphosisUsedThisTurn) {
        // Если активированы магические заклинания, выводим только их, не трогая основной текст темы
        const spellsBadge = document.createElement('div');
        spellsBadge.style.cssText = "color: #e5c158; font-weight: bold; margin-bottom: 8px; font-size: 13px;";
        spellsBadge.innerHTML = `🔮 Aktiiviset taiat: ${activeSpellsLog.join(', ')} (${targetCount} sanaa)`;
        
        // Вставляем плашку заклинаний в самое начало блока инструкций, не затирая старый текст
        ruleInstruction.insertBefore(spellsBadge, ruleInstruction.firstChild);
    }
    // Если заклинаний нет, мы просто ничего не делаем. Старый текст раунда остается чистым и не двоится!

    const usedFirstLetters = new Set();

    // 1. Haetaan ensimmäinen sana (harvinaisemmista sanoista jos mahdollista)
    if (filteredAllWords.length > 0) {
        const randIdx = Math.floor(Math.random() * filteredAllWords.length);
        const w = filteredAllWords[randIdx]; // Уже с большой буквы
        generatedWordsList.push(w);
        usedFirstLetters.add(w.charAt(0).toLowerCase());
        filteredAllWords.splice(randIdx, 1); // Удаляем, чтобы не было дубликатов в Sanakaaos
    }

    // 2. Täytetään lista uniikeilla yleisillä sanoilla (eri alkukirjaimet)
    let attempts = 0;
    while (generatedWordsList.length < targetCount && filteredCommonWords.length > 0 && attempts < 500) {
        const randIdx = Math.floor(Math.random() * filteredCommonWords.length);
        const w = filteredCommonWords[randIdx]; // Уже с большой буквы
        const firstLetter = w.charAt(0).toLowerCase();
        
        if (!usedFirstLetters.has(firstLetter)) {
            generatedWordsList.push(w);
            usedFirstLetters.add(firstLetter);
            filteredCommonWords.splice(randIdx, 1); // Удаляем из доступных на раунд
        }
        attempts++;
    }

    // Varajärjestelmä, jos uniikit alkukirjaimet loppuvat kesken
    let fallbackAttempts = 0;
    while (generatedWordsList.length < targetCount && filteredCommonWords.length > 0 && fallbackAttempts < 200) {
        const randIdx = Math.floor(Math.random() * filteredCommonWords.length);
        const w = filteredCommonWords[randIdx]; // Уже с большой буквы
        if (!generatedWordsList.includes(w)) {
            generatedWordsList.push(w);
            filteredCommonWords.splice(randIdx, 1);
        }
        fallbackAttempts++;
    }

    // 3. Sanakaaos-loitsun mekaaninen korvaus (без дубликатов и лишнего забивания истории)
    if (activeModifiers.chaosFourWords && filteredAllWords.length > 0) {
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
                const w = filteredAllWords[randIdx]; // Уже с большой буквы
                generatedWordsList[idx] = w; // Заменяем старое слово в отображаемом списке раунда
                filteredAllWords.splice(randIdx, 1); // Безопасно удаляем из массива доступных трудных слов
            }
        });
    }

    // Вносим в глобальную историю игры только те слова, которые РЕАЛЬНО отобразились игроку
    generatedWordsList.forEach(w => {
        if (!usedWordsInThisGame.includes(w)) {
            usedWordsInThisGame.push(w);
        }
    });

    // Алгоритм Фишера-Йетса для гарантированно случайного перемешивания в любом браузере
    for (let i = generatedWordsList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [generatedWordsList[i], generatedWordsList[j]] = [generatedWordsList[j], generatedWordsList[i]];
    }

    renderOlList();
    btnDisplayWords.style.display = "block";
    btnDisplayWords.textContent = "🙈 Piilota sanat";
    isWordListHidden = false;
    renderSpellButtonsAfterWords();

    // === ИСПРАВЛЕННЫЙ БЛОК В КОНЦЕ switchToWords ===
    const liveThemeBlock = document.getElementById('themeBlock');
    if (liveThemeBlock) {
        // Чистим старые элементы, чтобы они не размножались при кликах
        const oldHint = document.getElementById('themeDrawingHint');
        if (oldHint) oldHint.remove();

        // Проверяем, активна ли тема рисования
        const isDrawingActive = currentActiveTheme.includes("piirtäminen") || 
                                activeCondition1 === "piirtäminen" || 
                                activeCondition2 === "piirtäminen";

        if (isDrawingActive) {
            liveThemeBlock.style.cursor = "pointer";

            // ВОЗВРАЩАЕМ ЗОЛОТУЮ НАДПИСЬ НА ЭКРАН (Текст правил сверху мы НЕ трогаем, чтобы не было дублирования)
            const hintSpan = document.createElement('small');
            hintSpan.id = "themeDrawingHint";
            hintSpan.style.cssText = "display:block; color: var(--gold); font-size:11px; margin-top:5px; font-weight: bold; animation: pulse 2s infinite;";
            hintSpan.textContent = "➔ 🎨 Klikkaa tästä avataksesi piirtoalustan!";
            liveThemeBlock.appendChild(hintSpan);
        }

        // Универсальная логика создания аккуратной круглой иконки «i»
        const existingBtn = document.getElementById('themeInfoHelpBtn');
        if (!existingBtn) {
            renderThemeRulesHelpButton();
        }
    }
}; 

const toggleWordVisibility = () => {
    if (wordList.children.length === 0) {
        switchToWords();
        return;
    }

    if (wordList.style.display === "none") {
        wordList.style.display = "block";
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

    const overlay = document.getElementById('drawingModalOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window.clearGameCanvas) window.clearGameCanvas();

    const oldHint = document.getElementById('themeDrawingHint');
    if (oldHint) oldHint.remove();

    const oldInfoBtn = document.getElementById('themeInfoHelpBtn');
    if (oldInfoBtn) oldInfoBtn.remove();
    
    const themeBlockEl = document.getElementById('themeBlock');
    if (themeBlockEl) themeBlockEl.style.cursor = "default";

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

    if (currentRound > totalTurns) {
        // 1. Принудительно останавливаем звук success, если он всё ещё играет
        if (sounds.success) {
            sounds.success.pause();
            sounds.success.currentTime = 0; // Сбрасываем дорожку в начало
        }

        // 2. Включаем главный звук победы в игре
        playAudio(sounds.gameWin);

        const sortedPlayers = [...gamePlayers].sort((a, b) => b.score - a.score);
        const winnerText = sortedPlayers[0].score === sortedPlayers[1].score ?
            "Peli päättyi tasan!" : `Voittaja on ${sortedPlayers[0].name}!`;
        const scoreSummary = gamePlayers.map(pl => `${pl.name}: ${pl.score}p`).join('\n');
        
        // 3. Даем звуку победы красиво проиграться, прежде чем заморозить страницу алертом
        setTimeout(() => {
            alert(`Peli ohi!\n${winnerText}\n\nLopulliset pisteet:\n${scoreSummary}`);
            location.reload();
        }, 2000); // 2000 миллисекунд (2 секунды) задержки
        
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

