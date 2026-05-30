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

const initializeThemeWeightSliders = () => {
    // 1. Инициализация ползунков и динамическое обновление цифр веса
    const sliders = document.querySelectorAll('.theme-weight-slider');
    sliders.forEach(slider => {
        const valueId = slider.dataset.valueId;
        const valueDisplay = document.getElementById(valueId);
        if (!valueDisplay) return;
        
        valueDisplay.textContent = slider.value;
        
        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
            
            // Если игрок вручную увёл ползунок в 0 — выключаем тумблер. Если > 0 — включаем.
            const rowWrapper = slider.closest('.slider-control-wrapper');
            if (rowWrapper) {
                const themeId = rowWrapper.id.replace('wrapper-', '');
                const checkbox = document.getElementById(`toggle-${themeId}`);
                if (checkbox) {
                    if (parseInt(slider.value, 10) === 0) {
                        checkbox.checked = false;
                        rowWrapper.classList.add('disabled');
                    } else {
                        checkbox.checked = true;
                        rowWrapper.classList.remove('disabled');
                    }
                }
            }
        });
    });

    // 2. Логика работы умных тумблеров (включение/выключение одним кликом)
    const checkboxes = document.querySelectorAll('.theme-toggle-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (typeof playClickSound === 'function') playClickSound();
            
            const themeId = checkbox.dataset.themeId;
            const defaultValue = parseInt(checkbox.dataset.default, 10);
            
            const slider = document.getElementById(`theme-weight-${themeId}`);
            const wrapper = document.getElementById(`wrapper-${themeId}`);
            
            // Корректно сопоставляем ID текстового поля (защита для финской 'ä')
            let displayThemeId = themeId;
            if (themeId === 'piirtaminen') displayThemeId = 'piirtäminen';
            const valueDisplay = document.getElementById(`themeWeightValue-${displayThemeId}`);

            if (!slider || !wrapper) return;

            if (checkbox.checked) {
                // Возвращаем дефолтное значение из HTML, а если оно было 0 — ставим минимум (1)
                const targetValue = defaultValue > 0 ? defaultValue : 1;
                slider.value = targetValue;
                if (valueDisplay) valueDisplay.textContent = targetValue;
                wrapper.classList.remove('disabled');
            } else {
                // Сбрасываем в ноль и визуально приглушаем строку
                slider.value = 0;
                if (valueDisplay) valueDisplay.textContent = 0;
                wrapper.classList.add('disabled');
            }
        });
    });

    // 3. Вызов справок условий "?" внутри вкладок настроек через игровое модальное окно
    const helpButtons = document.querySelectorAll('.theme-setting-help');
    helpButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof playClickSound === 'function') playClickSound();

            const themeKey = btn.dataset.themeKey;
            const modal = document.getElementById('spellHelpModal');
            const modalBody = document.getElementById('spellHelpModalBody');

            if (modal && modalBody && typeof themeDescriptions !== 'undefined' && themeDescriptions[themeKey]) {
                modalBody.innerHTML = `
                    <div class="spell-info-title" style="color: var(--gold); font-family: 'Cinzel', serif; margin-bottom: 12px; font-size: 1.1rem; text-align: center;">
                        <strong>${themeKey.toUpperCase()}</strong>
                    </div>
                    <p style="line-height: 1.6; font-size: 14.5px; color: #fff; text-align: left; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border-left: 3px solid var(--gold); margin: 0;">
                        ${themeDescriptions[themeKey]}
                    </p>
                `;
                modal.style.display = "flex";
                document.body.classList.add("spell-help-modal-open");
            }
        });
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
    selectedWordIndex = -1;
    const p = gamePlayers[currentPlayerIndex];
    isMetamorphosisUsedThisTurn = false;
    if (typeof updateGuessedButtonsText === 'function') updateGuessedButtonsText();


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
    
    // ИСПРАВЛЕНИЕ: вызываем функцию ДО открытия слов, чтобы магия магов отобразилась на экране!
    if (typeof renderSpellButtonsBeforeWords === 'function') {
        renderSpellButtonsBeforeWords();
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
    
     // === НАЧАЛО БЛОКА ГЕНЕРАЦИИ СЛОВ ===
  generatedWordsList = [];
    currentBonusWordText = ""; // Сбрасываем бонусное слово раунда

    // Перемешиваем копии оригинальных массивов
    let allWordsCopy = [...allWords].sort(() => Math.random() - 0.5);
    let commonWordsCopy = [...commonWords].sort(() => Math.random() - 0.5);

    // Массив для временного хранения слов, которые берутся из kaikkisanat
    let kaikkiCandidates = [];

    // Вычисляем целевое количество слов на раунд
    let targetCount = 5;
    if (activeModifiers.extendToEight) targetCount += 2;
    if (activeModifiers.reduceToThree) targetCount -= 2;
    targetCount = Math.max(1, targetCount);

    if (activeModifiers.chaosFourWords) {
        // 1. РЕЖИМ ХАОСА: Берем 3 уникальных слова из kaikkisanat
        let idx = 0;
        while (kaikkiCandidates.length < 3 && idx < allWordsCopy.length) {
            let w = capitalize(allWordsCopy[idx]);
            if (!kaikkiCandidates.includes(w)) {
                kaikkiCandidates.push(w);
            }
            idx++;
        }
    } else {
        // 2. ОБЫЧНЫЙ РЕЖИМ: Берем ровно 1 слово из kaikkisanat
        if (allWordsCopy.length > 0) {
            kaikkiCandidates.push(capitalize(allWordsCopy[0]));
        }
    }

    // Добавляем эти слова в основной список раунда
    generatedWordsList = [...kaikkiCandidates];

    // Добираем оставшиеся карточки из yleisetsanat, следя, чтобы слова не дублировались в раунде
    let commonIdx = 0;
    while (generatedWordsList.length < targetCount && commonIdx < commonWordsCopy.length) {
        let w = capitalize(commonWordsCopy[commonIdx]);
        if (!generatedWordsList.includes(w)) {
            generatedWordsList.push(w);
        }
        commonIdx++;
    }

    // СЛУЧАЙНЫЙ ВЫБОР ЕДИНСТВЕННОГО БОНУСНОГО СЛОВА
    // Из всех слов, прилетевших из kaikkisanat, выбираем ровно ОДНО случайное
    if (kaikkiCandidates.length > 0) {
        let randomChoice = kaikkiCandidates[Math.floor(Math.random() * kaikkiCandidates.length)];
        currentBonusWordText = randomChoice; // Запоминаем его текст в память!
    }

    // Сохраняем слова в глобальную историю игры, чтобы они не повторялись в следующих раундах
    generatedWordsList.forEach(w => {
        if (!usedWordsInThisGame.includes(w)) {
            usedWordsInThisGame.push(w);
        }
    });

    // Перемешиваем Фишером-Йетсом итоговый список из 5 слов.
    // Текст бонусного слова сохранен в памяти, так что перемешивание теперь абсолютно безопасно!
    for (let i = generatedWordsList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [generatedWordsList[i], generatedWordsList[j]] = [generatedWordsList[j], generatedWordsList[i]];
    }

    renderOlList();
    btnDisplayWords.style.display = "block";
    btnDisplayWords.textContent = "🙈 Piilota sanat";
    isWordListHidden = false;
    renderSpellButtonsAfterWords();

    // ВЫВОД КОМПАКТНЫХ ПОДСКАЗОК ДЛЯ ИГРОКОВ
if (ruleInstruction) {
        ruleInstruction.style.display = "block";
        ruleInstruction.style.marginTop = "10px";
        ruleInstruction.style.marginBottom = "10px";

        // 1. TARKISTETAAN ENSIN ONKO KYSEESSÄ YRTTITARHURIN BONUSVUORO
        if (typeof isExtraTurnRound !== 'undefined' && isExtraTurnRound) {
            ruleInstruction.innerHTML = `
                <div style="color: #e74c3c; font-weight: bold; text-align: center; margin-bottom: 10px; font-size: 13.5px; line-height: 1.4;">
                    🌱 BONUSVUORO: Kasvupurkaus aktiivinen — Puolitettu palkinto (+50p)
                </div>
                <div style="font-size: 13px; color: #fff; font-weight: bold; text-align: center; line-height: 1.4;">
                    ☝️ Selittäjä: Valitse <span style="color: var(--gold);">yksi mikä tahansa</span> sana listalta ja kuvaile se!<br>
                    <span style="color: var(--text-muted); font-weight: normal; font-size: 11.5px;">Paina sanaa lukitaksesi sen ennen kuin aloitat.</span>
                </div>`;
        } 
        // 2. JOS EI OLE BONUSVUORO, TOIMITAAN NORMAALISTI EHTOJEN MUKAAN
        else if (currentActiveTheme === "perusvaihtoehto") {
            ruleInstruction.innerHTML = `
                <div style="font-size: 13px; color: var(--gold); font-weight: bold; text-align: center; line-height: 1.4;">
                    👉 Arvaaja: Valitse numero 1–${generatedWordsList.length} listaa katsomatta!<br>
                    <span style="color: var(--text-muted); font-weight: normal; font-size: 11.5px;">Selittäjä kuvailee vain tämän numeron sanan.</span>
                </div>`;
        } else {
            ruleInstruction.innerHTML = `
                <div style="font-size: 13px; color: #fff; font-weight: bold; text-align: center; line-height: 1.4;">
                    ☝️ Selittäjä: Valitse <span style="color: var(--gold);">yksi mikä tahansa</span> sana listalta ja kuvaile se!<br>
                    <span style="color: var(--text-muted); font-weight: normal; font-size: 11.5px;">Paina sanaa lukitaksesi sen ennen kuin aloitat.</span>
                </div>`;
        }
    }

    const liveThemeBlock = document.getElementById('themeBlock');
    if (liveThemeBlock) {
        const oldHint = document.getElementById('themeDrawingHint');
        if (oldHint) oldHint.remove();

        const isDrawingActive = currentActiveTheme.includes("piirtäminen");

        if (isDrawingActive) {
            liveThemeBlock.style.cursor = "pointer";

            const hintSpan = document.createElement('small');
            hintSpan.id = "themeDrawingHint";
            hintSpan.style.cssText = "display:block; color: var(--gold); font-size:11px; margin-top:5px; font-weight: bold; animation: pulse 2s infinite;";
            hintSpan.textContent = "➔ 🎨 Klikkaa tästä avataksesi piirtoalustan!";
            liveThemeBlock.appendChild(hintSpan);
        }

        const existingBtn = document.getElementById('themeInfoHelpBtn');
        if (!existingBtn) {
            renderThemeRulesHelpButton();
        }
    }
}; 
// === КОНЕЦ ОБНОВЛЕННОГО ФИНАЛА switchToWords ===

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
        
        // 1. Базовые очки за раунд (100 или 50)
        let roundBaseScore = 100;
        if (isMetamorphosisUsedThisTurn || isExtraTurnRound) {
            roundBaseScore = 50; 
        }
        p.score += roundBaseScore;

        // 2. БОНУС ЗА СЛОЖНОЕ СЛОВО (Строго один раз за раунд!)
if (selectedWordIndex !== -1 && !isMetamorphosisUsedThisTurn && currentBonusWordText !== "") {
            const selectedWordText = generatedWordsList[selectedWordIndex];
            
            // Если текст зажатого игроком слова в точности совпал с бонусным текстом текущего раунда
            if (selectedWordText === currentBonusWordText) {
                p.score += 25; // Начисляем +25 очков
                console.log(`[УСПЕХ] Начислено +25 очков за угаданное бонусное слово: ${selectedWordText}`);
            }
        }

        // Логика доп. хода (Yrttitarhuri)
        if (p.name === "Yrttitarhuri" && p.extraTurnGranted) {
            triggersExtraTurnNext = true;
            playAudio(sounds.druid);
            p.extraTurnGranted = false;
        }

    } else {
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