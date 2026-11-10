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

// Обратное отображение: input id ("theme-weight-nakymaton-muste") -> ключ темы ("näkymätön muste")
const themeKeyForWeightInput = (input) => {
    for (const theme of themes) {
        const formatted = theme.toLowerCase().replace(/\s+/g, '-').replace(/ä/g, 'a').replace(/ö/g, 'o');
        if (`theme-weight-${formatted}` === input.id) return theme;
    }
    return null;
};

const initializeThemeWeightSteppers = () => {
    const stepperCards = document.querySelectorAll('.theme-card');

    // 1. Tallenna oletusarvot sivuun resetointia varten — источник истины: themeWeights из js/themes.js
    const inputs = document.querySelectorAll('.theme-weight-input');
    inputs.forEach(input => {
        const key = themeKeyForWeightInput(input);
        const defaultVal = (key && typeof themeWeights !== 'undefined' && themeWeights[key] !== undefined)
            ? themeWeights[key]
            : input.value;
        input.value = defaultVal;
        input.dataset.defaultValue = defaultVal;
        input.dataset.savedValue = input.value;
    });

    // 2. Yksittäisten teemakorttien logiikka (+ ja -)
    stepperCards.forEach(card => {
        const minusBtn = card.querySelector('.stepper-btn.minus');
        const plusBtn = card.querySelector('.stepper-btn.plus');
        const input = card.querySelector('.theme-weight-input');
        
        if (!minusBtn || !plusBtn || !input) return;

        const updateCardState = () => {
            let val = parseInt(input.value, 10);
            if (isNaN(val) || val < 0) {
                val = 0;
                input.value = 0;
            }
            if (val === 0) {
                card.classList.add('disabled-card');
                card.classList.remove('active-card');
            } else {
                card.classList.remove('disabled-card');
                card.classList.add('active-card');
            }

            // Tarkista kategorian tila automaattisesti! 
            // Jos yksikään teema kategoriassa on > 0, kategoria kytkeytyy visuaalisesti päälle.
            const accordion = card.closest('.accordion-content');
            if (accordion) {
                const header = accordion.previousElementSibling;
                const toggleBtn = header.querySelector('.category-toggle-btn');
                if (toggleBtn) {
                    const allInputs = Array.from(accordion.querySelectorAll('.theme-weight-input'));
                    const anyActive = allInputs.some(inp => parseInt(inp.value, 10) > 0);
                    
                    if (anyActive && !toggleBtn.classList.contains('active')) {
                        toggleBtn.classList.add('active');
                        toggleBtn.textContent = 'Päällä';
                        header.classList.remove('disabled-category');
                    } else if (!anyActive && toggleBtn.classList.contains('active')) {
                        toggleBtn.classList.remove('active');
                        toggleBtn.textContent = 'Pois';
                        header.classList.add('disabled-category');
                    }
                }
            }
        };

        minusBtn.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            let val = parseInt(input.value, 10) || 0;
            if (val > 0) {
                input.value = val - 1;
                updateCardState();
            }
        });

        plusBtn.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            let val = parseInt(input.value, 10) || 0;
            if (val < 99) {
                input.value = val + 1;
                updateCardState();
            }
        });

        input.addEventListener('input', updateCardState);
        input.addEventListener('blur', () => {
            if (input.value === '') input.value = 0;
            updateCardState();
        });

        updateCardState();
    });

    // 3. Kategorioiden Päällä/Pois -kytkimet
    const categoryHeaders = document.querySelectorAll('.accordion-header');
    categoryHeaders.forEach(header => {
        const toggleBtn = header.querySelector('.category-toggle-btn');
        const content = header.nextElementSibling;
        
        if (!toggleBtn || !content) return;

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Estää haitarin sulkeutumisen kytkintä painettaessa
            if (typeof playClickSound === 'function') playClickSound();
            
            const isActive = toggleBtn.classList.contains('active');
            const catInputs = content.querySelectorAll('.theme-weight-input');
            
            if (isActive) {
                // Kytke kategoria POIS
                toggleBtn.classList.remove('active');
                toggleBtn.textContent = 'Pois';
                header.classList.add('disabled-category');
                
                catInputs.forEach(input => {
                    input.dataset.savedValue = input.value; // Tallenna nykyinen asetus muistiin
                    input.value = 0;
                    input.dispatchEvent(new Event('input')); // Päivittää kortin värin harmaaksi
                });
            } else {
                // Kytke kategoria PÄÄLLE
                toggleBtn.classList.add('active');
                toggleBtn.textContent = 'Päällä';
                header.classList.remove('disabled-category');
                
                catInputs.forEach(input => {
                    let valToRestore = parseInt(input.dataset.savedValue, 10);
                    // Jos tallennettu arvo oli 0, palautetaan turvallisuuden vuoksi oletus (jotta jokin menee päälle)
                    if (isNaN(valToRestore) || valToRestore === 0) {
                        valToRestore = parseInt(input.dataset.defaultValue, 10) || 1;
                    }
                    input.value = valToRestore;
                    input.dispatchEvent(new Event('input'));
                });
            }
        });
    });

    // 4. Globaalit Master-painikkeet: Nollaa ja Palauta oletukset
    const btnZeroAll = document.getElementById('btnZeroAll');
    const btnResetDefault = document.getElementById('btnResetDefault');

    if (btnZeroAll) {
        btnZeroAll.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            document.querySelectorAll('.theme-weight-input').forEach(input => {
                input.dataset.savedValue = input.value; 
                input.value = 0;
                input.dispatchEvent(new Event('input'));
            });
        });
    }

    if (btnResetDefault) {
        btnResetDefault.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            document.querySelectorAll('.theme-weight-input').forEach(input => {
                input.value = input.dataset.defaultValue || 1;
                input.dataset.savedValue = input.value;
                input.dispatchEvent(new Event('input'));
            });
        });
    }

    // 5. Säännöt (?) painikkeiden logiikka pysyy ennallaan
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

// Varmistetaan, että kuuntelija on yhä paikallaan
window.addEventListener('DOMContentLoaded', initializeThemeWeightSteppers);

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

    // Huonepeli: ilmoita muille puhelimille että rumpu pyörii
    if (typeof window.netRelayThemeRolling === 'function') window.netRelayThemeRolling();


    btn.disabled = true;
    btn.style.opacity = "0.7";
    btnDisplayWords.style.display = "none";
    roundControls.style.display = 'none';
    wordList.style.display = "none";
    window.hideBonusHint && window.hideBonusHint();
    
    // TYHJENNETÄÄN OHJETEKSTI VAIN JOS SIITÄ EI OLE SUOJAVIESTIÄ (Tämä estää ylikirjoituksen alussa)
    ruleInstruction.textContent = "";
    
    themeDisplay.textContent = "";
    themeImage.style.display = "none";
    spellContainer.style.display = "none";
    currentActiveTheme = "";

    drumAnim.style.display = "block";
    playAudio(sounds.drum);

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

            // Huonepeli: lähetä arvottu teema kaikille puhelimille
            if (typeof window.netRelayTheme === 'function') window.netRelayTheme(randomTheme);

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

// Воспроизводим уникальный звук темы с помощью умного плеера
const soundUrl = themeSounds[randomTheme];
if (soundUrl) {
    if (typeof window.playThemeEffect === 'function') {
        window.playThemeEffect(soundUrl);
    }
}

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
                const isMagicModeOn = document.getElementById('magicToggle') && document.getElementById('magicToggle').checked;
                btnDisplayWords.style.display = "block";
                btnDisplayWords.textContent = isMagicModeOn
                    ? "👁️ Näytä sanat (vain selittäjälle, loitsut vain ennen painamista)"
                    : "👁️ NÄYTÄ SANAT (VAIN SELITTÄJÄLLE)";
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

            // KIROUSBANNERI: näytä selvä ilmoitus kun vastustajan loitsu iskee tähän vuoroon
            const curseBanner = document.getElementById('curseBanner');
            if (curseBanner) {
                const notices = [];
                if (activeModifiers.reduceToThree) {
                    notices.push("Korttinälkä! Vastustaja kavensi sanalistaasi 2 sanalla.");
                }
                if (activeModifiers.chaosFourWords) {
                    notices.push("Sanakaaos! 3 ensi vuoron sanaasi muutettiin vaikeiksi.");
                }
                if (notices.length > 0) {
                    curseBanner.innerHTML = `💀 KIROUS AKTIVOITUI: ${notices.join(' ')}`;
                    curseBanner.style.display = 'block';
                } else {
                    curseBanner.style.display = 'none';
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

    // Käynnistä vuoron ajastin kun sanat on paljastettu
    if (typeof window.startTurnTimer === 'function') window.startTurnTimer();

    // Huonepeli: ilmoita arvaajille että sanat ovat auki (sisältöä ei lähetetä!)
    if (typeof window.netRelayWordsOpen === 'function') window.netRelayWordsOpen();

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

const isDrawingActive = currentActiveTheme === "piirtäminen" || currentActiveTheme === "näkymätön muste";
        const isEmojiActive = currentActiveTheme === "vain emojit";

        if (isDrawingActive) {
            liveThemeBlock.style.cursor = "pointer";
            const hintSpan = document.createElement('small');
            hintSpan.id = "themeDrawingHint";
            hintSpan.style.cssText = "display:block; color: var(--gold); font-size:11px; margin-top:5px; font-weight: bold; animation: pulse 2s infinite;";
            hintSpan.textContent = "➔ 🎨 Klikkaa tästä avataksesi piirtoalustan!";
            liveThemeBlock.appendChild(hintSpan);
        } else if (isEmojiActive) {
            liveThemeBlock.style.cursor = "pointer";
            const hintSpan = document.createElement('small');
            hintSpan.id = "themeDrawingHint";
            hintSpan.style.cssText = "display:block; color: var(--gold); font-size:11px; margin-top:5px; font-weight: bold; animation: pulse 2s infinite;";
            hintSpan.textContent = "➔ 📱 Klikkaa tästä avataksesi emoji-taulun!";
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

// --- VUORON AJASTIN ---
let turnTimerInterval = null;

window.stopTurnTimer = () => {
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }
    const bar = document.getElementById('turnTimer');
    const fill = document.getElementById('turnTimerFill');
    const sec = document.getElementById('turnTimerSec');
    if (bar) bar.style.display = 'none';
    if (sec) sec.style.display = 'none';
    if (fill) {
        fill.style.width = '100%';
        fill.classList.remove('warn', 'danger');
    }
};

window.startTurnTimer = () => {
    window.stopTurnTimer();
    const total = (typeof window.getTimerSeconds === 'function') ? window.getTimerSeconds() : 0;
    if (total <= 0) return;

    const bar = document.getElementById('turnTimer');
    const fill = document.getElementById('turnTimerFill');
    const sec = document.getElementById('turnTimerSec');
    if (!bar || !fill) return;

    bar.style.display = 'block';
    if (sec) sec.style.display = 'block';
    const endTime = performance.now() + total * 1000;

    turnTimerInterval = setInterval(() => {
        const left = endTime - performance.now();
        const pct = Math.max(0, (left / (total * 1000)) * 100);
        fill.style.width = pct + '%';
        if (sec) sec.textContent = Math.max(0, Math.ceil(left / 1000)) + ' s';

        fill.classList.toggle('warn', pct <= 50 && pct > 25);
        fill.classList.toggle('danger', pct <= 25);

        if (left <= 0) {
            window.stopTurnTimer();
            // Aika loppui — vuoro menetetään automaattisesti
            const emojiOv = document.getElementById('emojiModalOverlay');
            if (emojiOv) emojiOv.style.display = 'none';
            endRound(false, -1, -1, true);
        }
    }, 100);
};

// --- VOITTO-MODAALI ---
const showVictoryModal = () => {
    const modal = document.getElementById('victoryModal');
    const rankings = document.getElementById('victoryRankings');
    if (!modal || !rankings) return;

    const sorted = [...gamePlayers].sort((a, b) => b.score - a.score);
    const topScore = sorted[0].score;
    const medals = ['🥇', '🥈', '🥉', '🎖️'];
    const isTie = sorted.length > 1 && sorted[0].score === sorted[1].score;

    rankings.innerHTML = sorted.map((pl, i) => {
        const isWinner = pl.score === topScore;
        const medal = isTie ? '🤝' : (medals[i] || '🎖️');
        return `<div class="victory-row${isWinner ? ' winner' : ''}">
            <span class="v-rank">${medal}</span>
            <span class="v-name">${pl.img || ''} ${pl.name}${isWinner && !isTie ? ' — VOITTAJA!' : ''}</span>
            <span class="v-score">${pl.score}p</span>
        </div>`;
    }).join('');

    if (isTie) {
        rankings.insertAdjacentHTML('afterbegin',
            `<p style="color: var(--gold); font-weight: bold; margin-bottom: 12px;">Peli päättyi tasan!</p>`);
    }

    modal.style.display = 'flex';
};

// isGuessed: selittäjän onnistuminen
// guesserIndex: 3 pelaajan moodissa arvaajan indeksi (+50p bonusta)
// stolenIndex: 4+ moodissa ryöstävän joukkueen indeksi (+50p, selittäjä 0p)
const endRound = (isGuessed, guesserIndex = -1, stolenIndex = -1, timedOut = false) => {
    const p = gamePlayers[currentPlayerIndex];
    const endingIndex = currentPlayerIndex; // tämän vuoron selittäjä (huonepeliä varten)
    const endedWord = (typeof selectedWordIndex !== 'undefined' && selectedWordIndex >= 0) ? generatedWordsList[selectedWordIndex] : null;
    let triggersExtraTurnNext = false;
    let consumedHunger = false;
    let consumedChaos = false;

    window.stopTurnTimer();
    if (window.hidePeekWord) window.hidePeekWord();
    const curseBannerEl = document.getElementById('curseBanner');
    if (curseBannerEl) curseBannerEl.style.display = 'none';

    const overlay = document.getElementById('drawingModalOverlay');
    if (overlay) overlay.style.display = 'none';
    const emojiOv = document.getElementById('emojiModalOverlay');
    if (emojiOv) emojiOv.style.display = 'none';
    if (window.clearGameCanvas) window.clearGameCanvas();
    if (window.stopDrawingIntervals) window.stopDrawingIntervals();

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

        // 3 pelaajan moodi: arvaaja saa +50p omalle tililleen
        if (guesserIndex >= 0 && guesserIndex < gamePlayers.length && guesserIndex !== currentPlayerIndex) {
            gamePlayers[guesserIndex].score += 50;
        }

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

    } else if (stolenIndex >= 0 && stolenIndex < gamePlayers.length) {
        // Ryöstö: vastustaja arvasi ensin — heille +50p, selittäjälle 0p
        playAudio(sounds.curse);
        gamePlayers[stolenIndex].score += 50;
        if (p.name === "Yrttitarhuri") {
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
    window.hideBonusHint && window.hideBonusHint();
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

        // Kiroukset aktivoituvat vain niiden kohteen vuorolla (3p-moodissa kohde voi olla kauempana)
        const nextIdx = (currentPlayerIndex + 1) % gamePlayers.length;
        if (pendingCurses.hunger === nextIdx) { activeModifiers.reduceToThree = true; pendingCurses.hunger = -1; consumedHunger = true; }
        if (pendingCurses.chaos === nextIdx) { activeModifiers.chaosFourWords = true; pendingCurses.chaos = -1; consumedChaos = true; }

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

        // 3. Näytetään tyylitelty voittomodaali alertin sijaan
        setTimeout(() => {
            showVictoryModal();
        }, 350);

        // Huonepeli: lähetä lopputulos muille (gameOver)
        if (typeof window.netAfterEndRound === 'function') {
            window.netAfterEndRound({
                isGuessed, guesserIndex, stolenIndex, endingIndex,
                word: endedWord,
                timeout: timedOut,
                consumedHunger, consumedChaos
            });
        }
        if (timedOut && (!window.isRoomGame || !window.isRoomGame()) && typeof window.netShowSummary === 'function') {
            window.netShowSummary(endedWord || '—', '⏱️ Aika loppui — ei pisteitä.');
        }

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

    // Huonepeli: lähetä lopputulos muille puhelimille
    if (typeof window.netAfterEndRound === 'function') {
        window.netAfterEndRound({
            isGuessed, guesserIndex, stolenIndex, endingIndex,
            word: endedWord,
            timeout: timedOut,
            consumedHunger, consumedChaos
        });
    }
    // Yksinpeli: ajan loputtua näytä pieni yhteenvetokortti (huonepelissä hoitaa ROUND_END)
    if (timedOut && (!window.isRoomGame || !window.isRoomGame()) && typeof window.netShowSummary === 'function') {
        window.netShowSummary(endedWord || '—', '⏱️ Aika loppui — ei pisteitä.');
    }
};