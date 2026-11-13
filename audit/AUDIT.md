# Аудит проекта «Guessing-mages» (игра «Ark-sanum»)

> Документ подготовлен как передаваемый контекст для другого ИИ-чата.
> Содержит: обзор проекта, карту кода, механику, список найденных проблем
> (с файлом/строкой и severity) и рекомендации. Скриншоты — в `audit/screenshots/`.

---

## 1. Что это за проект

Статическая браузерная игра-угадайка (party game) на **ванильном HTML/CSS/JS** — без сборки, фреймворков, зависимостей и тестов. Название в UI — **«Ark-sanum»** (фин.), репозиторий — `Guessing-mages`. Язык интерфейса — финский. Опубликована на GitHub Pages (`babyuncle23.github.io/Guessing-mages/`).

**Суть игры:** 2 игрока/команды на одном телефоне по очереди объясняют слова второму игроку. На каждый ход случайно выбирается «условие объяснения» (тема): пантомима, рисование, только эмодзи, без глаголов, наоборот и т.д. Верное угадывание = +100 п (или +125 с бонусным словом). Опциональный режим «таикахахмо» даёт игрокам персонажей-магов с заклинаниями, меняющими правила.

**Запуск локально:** `fetch()` к словарям не работает с `file://` — нужен HTTP-сервер:
```bash
python -m http.server 8080   # затем http://localhost:8080
```

## 2. Карта файлов

| Файл | Строк | Ответственность |
|---|---|---|
| `index.html` | 577 | Вся разметка: стартовая модалка (правила+настройки), игровой экран, модалки рисования/эмодзи/помощи. **88 inline-стилей.** |
| `styles.css` | 1782 | Тёмная «книга заклинаний» тема, золото `--gold`, шрифты Comfortaa+Cinzel через Google Fonts. Адаптив (media 768/480/380px, landscape). |
| `js/utils.js` | 1 | `capitalize()` |
| `js/audio.js` | 47 | `sounds{}` (10 Audio-объектов, preload), `playAudio`, `playClickSound`, `window.playThemeEffect` |
| `js/themes.js` | 63 | Массив `themes` (12 тем), `themeImages` (эмодзи), `themeSounds`, `themeDescriptions`; **мёртвый объект `themeWeights`** |
| `js/words.js` | 811 | `forbiddenWords` (~700 слов-исключений), `parseWords`, `fetch` словарей `kaikkisanat.txt` (1.1 МБ, обрезка до 76000 строк) и `yleisetsanat.txt` |
| `js/state.js` | 15 | Глобальное состояние: `currentRound`, `totalTurns`, `activeModifiers`, `pendingCurses`, `generatedWordsList`, `currentActiveTheme`, `isExtraTurnRound`, `selectedWordIndex`, `currentBonusWordText` |
| `js/ui.js` | 239 | DOM-рефы, `spellDescriptions`, модалка помощи, `updateTurnDisplay`, `updateGuessedButtonsText`, `renderOlList`, `openTab`/`toggleAccordion`, эмодзи-модалка |
| `js/players.js` | 82 | `charImages`, `setupOrder`, `gamePlayers`, выбор 2 персонажей, логика `magicToggle` |
| `js/spells.js` | 203 | `calculateSpells`, рендер кнопок заклинаний до/после показа слов, `triggerSpellAnimation` |
| `js/rounds.js` | 702 | Ядро: веса тем из UI, степперы настроек, `randomizeTheme` (барабан 2.5с), `switchToWords` (генерация списка), `toggleWordVisibility`, `endRound` (очки, бонус, переход хода, конец игры) |
| `js/drawing.js` | 268 | IIFE-модуль canvas-рисовалки: перо/ластик (`destination-out`), тач-события, «невидимые чернила» через `getImageData` каждые 60 мс |
| `js/main.js` | 215 | Старт игры (создание `gamePlayers`), обработчики главных кнопок, генерация favicon на canvas, `initGameDisplay`, открытие рисовалки/эмодзи по клику на блок темы |
| `words/` | — | `kaikkisanat.txt` (93086 слов, 1.1 МБ — редкие), `yleisetsanat.txt` (1332 слова — частотные). Источник: Kotus (LGPL/EUPL/CC BY 3.0) |
| `sounds/` | ~1.5 МБ | mp3/ogg эффекты для тем и событий + папка `not in use/` |
| `pictures/` | ~1.2 МБ | **Нигде не используется** — в коде остались только эмодзи |

Порядок подключения скриптов в `index.html:545-555` критичен — все модули делят глобальную область.

## 3. Игровой поток (state machine)

```
Старт-модалка (Peli/Asetukset)
  → [magicToggle?] выбор 2 персонажей → startGameBtn
  → gamePlayers[] созданы, updateTurnDisplay()
Цикл хода:
  #btn "Aloita kierros" → randomizeTheme()
    → барабан 2.5s + "NYT!" → тема (взвешенный пул из DOM-инпутов)
    → renderSpellButtonsBeforeWords() (только маги)
  → #btnDisplayWords → switchToWords()
    → генерация generatedWordsList: N слов (5 ± модификаторы заклинаний),
      1+ слово из kaikkisanat = бонусное (+25), остальные из yleisetsanat
    → для piirtäminen/näkymätön muste/vain emojit — подсказка-линк на модалку
  → игрок кликает слово (selectedWordIndex) → объясняет
  → #btnGuessed (+100/+50, +25 если нажато бонусное слово)
     или #btnGiveUp → endRound()
  → применение pendingCurses к следующему игроку, смена хода/раунда
Конец: currentRound > totalTurns → alert() + location.reload()
```

**Очки:** базово 100; 50 если использована Sanametamorfoosi или бонусный ход Yrttitarhuri; +25 за объяснение бонусного слова (нужно ткнуть в него — доверительная механика).

**Персонажи (магия):**
- 🐺 Muodonmuuttaja — Korttitulva (+2 слова к своему списку), Sanametamorfoosi (заменить все слова новыми, награда 50)
- 💀 Kirouksenlangettaja — Korttinälkä (−2 слова сопернику), Sanakaaos (3 слова соперника → редкие)
- 🌿 Yrttitarhuri — Kasvupurkaus (бонусный ход за успех, награда 50)

## 4. Найденные проблемы

### 🔴 Критичные / реальные баги

| # | Проблема | Где |
|---|---|---|
| C1 | **Дублирующийся блок `#spellContainer` со всеми дочерними ID** (spellRow1/2, spellBtn1/2, spellHelpBtn1/2, spellInfoBox). `getElementById` берёт первый — второй блок мёртвая разметка, HTML невалиден. | `index.html:423` и `index.html:468` |
| C2 | **Необъявленные глобалы** `activeCondition1`/`activeCondition2` — нет `let/const` нигде; работают только из-за non-strict mode. При этом `activeCondition2` всегда `""` — недоделанная фича «kaksi ehtoa» (два условия), мёртвый код. | `rounds.js:306-307,699-700`, читается в `spells.js:174` |
| C3 | **Гонка загрузки словарей**: можно нажать «Aloita» до завершения `fetch` → пустой/урезанный список слов без ошибки для пользователя. Нет блокировки кнопки старта и лоадера. При фейле fetch — только `console.log`. | `words.js:797-811`, `main.js:2` |
| C4 | **Рассинхрон источников весов тем**: `themeWeights` в `themes.js:6-19` — мёртвый объект, реальные веса читаются из DOM-инпутов, и дефолты **различаются** (pantomiimi 3↔2, piirtäminen 3↔2, perusvaihtoehto 1↔3). | `themes.js`, `index.html` (theme-weight-*) |
| C5 | **Недостижимый код «KÄÄNTEINEN MAGIA»**: проклятия hunger/chaos кастует только Kirouksenlangettaja и бьют по сопернику → он никогда не может быть их жертвой (персонажи уникальны). Сообщение о «отражённом заклинании Muodonmuuttaja» невозможно — механики отражения нет. | `rounds.js:384-394` |
| C6 | **`inkFadeInterval` не очищается в `endRound`**: если раунд завершён при открытой рисовалке через основные кнопки — setInterval продолжает гонять `getImageData` по скрытому canvas. | `rounds.js:576-578` (нет `clearInterval`), `drawing.js:156` |
| C7 | **Конец игры = `alert()` + `location.reload()`**: блокирующий системный диалог вместо экрана результатов; нет рестарта без перезагрузки, весь стейт теряется. | `rounds.js:673-676` |
| C8 | **Неработоспособность с `file://`**: словари грузятся `fetch()` → при двойном клике по index.html игра молча не работает. | `words.js:797,806` |

### 🟡 Средние проблемы

| # | Проблема | Где |
|---|---|---|
| M1 | Все файлы — глобальная область, связность через порядок `<script>`; `updateTurnDisplay` (ui.js:96) вызывает `updateGuessedButtonsText` объявленную ниже в том же файле (работает случайно: вызов происходит после загрузки всех скриптов) | все `js/`, `ui.js:121,125` |
| M2 | Стили размазаны: 88 inline `style=` в HTML + большие инлайн-стили в JS-шаблонах при существующем styles.css на 1782 строки | `index.html`, `rounds.js:198,243,494-515` |
| M3 | `parseWords`: `lines.slice(0, maxLines - 1)` — off-by-one + протухший комментарий «строки с 1 по 36999» (реально режется 76000 из 93086 — эвристика без объяснения) | `words.js:767-800` |
| M4 | «Näkymätön muste»: `getImageData`+`putImageData` по всему canvas (~400×1100px) каждые 60 мс — лишняя нагрузка на CPU/батарею; эффект лучше делать композицией слоёв или перерисовкой штрихов | `drawing.js:155-180` |
| M5 | Кнопка `Näytä sanat (...loitsut vain ennen painamista)` упоминает заклинания (loitsut) и в базовой игре без магии — путает игроков (видно на скриншоте 04) | `rounds.js:353` |
| M6 | Перепутаны цвета вспышек заклинаний: бафф Korttitulva и Sanametamorfoosi вызывают `triggerSpellAnimation('curse')` (красная), а проклятия Korttinälkä/Sanakaaos — `'morph'` (фиолетовая). Комментарии `<-- Поменяли` намекают на копипасту | `spells.js:42,67,76,130` |
| M7 | Внешняя зависимость: QR-код с `api.qrserver.com` и захардкоженный URL GitHub Pages — офлайн не грузится, утечка referrer | `index.html:134` |
| M8 | Мёртвый код/ассеты: `pictures/` ~1.2 МБ (ни одной ссылки), `sounds/not in use/`, `themeWeights`, `rareWordsSet`, `customWordBlock`+`customWordInput` (нигде не включается — недоделанная фича «своё слово»), закомментированный devTestMenu, пустой `<script>`-блок в конце | `index.html:419-421,447-463,558-575`, `words.js:794`, `themes.js:6` |
| M9 | `<script src="js\utils.js">` — обратные слеши в src (работает, но не по спецификации) | `index.html:545-555` |
| M10 | `totalTurns` по факту хранит число **раундов**, а не ходов — имя вводит в заблуждение (в каждом раунде ходит каждый игрок) | `state.js:2`, `main.js:5` |

### 🟢 Минорные / косметика

| # | Проблема | Где |
|---|---|---|
| L1 | Длинные имена персонажей рвутся посередине слова: «KIROUKSENLANGETTA/JA» (скриншот 02) — `word-break: break-word` на узкой карточке | `index.html:101` |
| L2 | Смешение языков: UI/идентификаторы финские, комментарии русские и финские, часть английских; игра «Ark-sanum» ≠ репо «Guessing-mages» | везде |
| L3 | Правила описывают режимы 3 и 4+ игроков, но `updateTurnDisplay` жёстко показывает только 2 счётчика — мультиплеер чисто «на честности» | `ui.js:96-108` |
| L4 | `getElementById("gameContainer").classList.remove("words-active")` вызван дважды в endRound | `rounds.js:634,702` |
| L5 | Accessibility: div-кнопки без `role/tabindex` (`.spell-help-icon`, `#themeInfoHelpBtn`), инлайн-onclick, `alert()` для результата, контраст muted-текста | `index.html`, `ui.js` |
| L6 | `new Audio()` на каждый theme-эффект, все 10 звуков preload — ~1.5 МБ + kaikkisanat 1.1 МБ при первой загрузке | `audio.js` |
| L7 | Нет `localStorage`: настройки весов и выбранные персонажи сбрасываются при reload | — |
| L8 | Google Fonts через CSS `@import` (блокирует рендер при офлайне); favicon генерируется рисованием эмодзи на canvas рантайм — костыль | `styles.css:1`, `main.js:134-183` |
| L9 | `innerHTML`-шаблоны с интерполяцией — сейчас данные статичны и безопасны, но при подключении `customWordInput` появится реальный XSS-вектор | `ui.js:37-42`, `rounds.js:197-204` |

## 5. Рекомендации (приоритет)

1. Удалить дублирующийся `#spellContainer` (C1) и объявить `activeCondition*` (C2) — одновременно решить, докручивать ли «два условия» или вычистить остатки.
2. Заблокировать старт до загрузки словарей (флаг `wordsLoaded` + disabled-кнопка + сообщение об ошибке) (C3, C8).
3. Заменить `alert+reload` на нормальный экран результатов с кнопкой «Новая игра» (C7).
4. Убрать/починить недостижимый блок «Käänenteinen magia» — либо реализовать отражение, либо удалить (C5).
5. Единый источник весов тем (генерировать инпуты из `themeWeights` или удалить объект) (C4).
6. Чистка: `pictures/`, `not in use/`, `customWordBlock`, `rareWordsSet`, devTestMenu (M8); `clearInterval` в `endRound` (C6).
7. Персистентность настроек в `localStorage`; исправить текст кнопки для базового режима (M5); починить цвета вспышек (M6).
8. Среднесрочно: собрать модули (ES modules или хотя бы один IIFE-неймспейс), вынести inline-стили в CSS, добавить ESLint+Prettier, `package.json` с `serve`-скриптом.

## 6. Что сделано хорошо

- Понятное разделение файлов по ответственности (state/ui/rounds/spells/drawing/words).
- Живые механики: взвешенный пул тем с редактируемыми весами и категорийными тумблерами с «памятью» (`savedValue`), бонусное редкое слово, заклинания, меняющие правила.
- Рисовалка: сглаживание `quadraticCurveTo`, ластик через `destination-out`, корректный пересчёт тач-координат с учётом масштаба canvas.
- Фильтр `forbiddenWords` для редких слов (возрастной рейтинг 12+).
- Мобильный-first: `touch-action`, `navigator.vibrate`, `safe-area-inset`, адаптивные media-запросы.

## 7. Скриншоты (audit/screenshots/)

| Файл | Что показывает |
|---|---|
| `01-rules-modal.png` | Стартовая модалка, вкладка Peli — правила игры |
| `02-character-selection.png` | Режим магии: выбор 2 персонажей (виден баг переноса «KIROUKSENLANGETTA/JA») |
| `03-settings-weights.png` | Вкладка Asetukset: длина игры, веса тем, категорийные тумблеры |
| `04-theme-rolled.png` | Выпавшая тема «PANTOMIIMI», шапка с раундом/очками, кнопка показа слов (виден баг текста «loitsut» в базовой игре) |
| `05-word-list.png` | Список из 5 слов, выбранное слово, бейдж «+25p» на бонусном, кнопки исхода |
| `06-drawing-canvas.png` | Модалка рисования: перо/ластик/очистка, нарисованный домик |
| `07-emoji-modal.png` | Модалка «Vain emojit» с введёнными эмодзи |
| `08-spells-muodonmuuttaja.png` | Магический режим: тема ELOKUVA + кнопка заклинания Korttitulva |
| `09-score-after-guess.png` | После «Arvattu oikein»: Pelaaja 1 получил 125p (100+25 бонус), ход перешёл к Pelaaja 2 |

Скрипт для воспроизведения скриншотов: `audit/tool/shoot.js` (puppeteer-core + локальный сервер).

---

## 8. Исправлено (Task 1 — критические баги, DOM-ID, гонка словарей, canvas)

Реализовано и проверено 39 автотестами (`audit/tool/verify.js` — все зелёные):

- **C1**: удалён дублирующийся `#spellContainer` и все дубли дочерних ID; удалены `devTestMenu` и пустой `<script>`; слэши в `<script src>` → прямые.
- **C2**: `activeCondition1/2` объявлены в `js/state.js`.
- **C3**: словари грузятся через `Promise.all` → `wordsReady`; `#startGameBtn` заблокирован (`⏳ Ladataan sanakirjoja...`) до загрузки, текст восстанавливается через `window.refreshStartButton()` (учитывает маг-режим и выбор персонажей); при ошибке — красный баннер `#dictionaryErrorBanner` внутри `#characterModal` (в т.ч. подсказка про `file://`).
- **C4**: `themeWeights` в `js/themes.js` — единственный источник дефолтных весов (синхронизирован с HTML); `#btnResetDefault` и инициализация степперов берут значения из него.
- **C5/C6**: в `endRound` вызывается `window.stopDrawingIntervals()`; `getImageData`-цикл заменён на **векторную историю штрихов** + `requestAnimationFrame` — штрихи плавно гаснут за 3.5 с, ластик не исчезает; добавлена кнопка **«↩️ Kumoa»** (undo последнего штриха); точки хранятся в нормализованных координатах → canvas переживает resize без потерь.
- **C7**: `alert+reload` пока оставлен (в плане на следующий таск).
- **M4**: см. C6 — попиксельная обработка удалена.
- **M5**: текст `#btnDisplayWords` без «loitsut» при выключенной магии (`👁️ NÄYTÄ SANAT (VAIN SELITTÄJÄLLE)`).
- **M6**: цвета вспышек исправлены — баффы (Korttitulva, Sanametamorfoosi) → `flash-morph` (фиолет.), проклятия (Korttinälkä, Sanakaaos) → `flash-curse` (красн.).
- **M8/M9**: удалены `pictures/` и `sounds/not in use/`, `rareWordsSet`, `devTestMenu`, пустой `<script>`; слэши исправлены.
- **Аудио**: `playThemeEffect` использует пул `Audio`-инстансов с `currentTime = 0` вместо `new Audio()` на каждый вызов.
- **parseWords**: исправлен off-by-one (`slice(0, maxLines)`), комментарий обновлён.

---

## 9. Исправлено / добавлено (Task 2 — онбординг, 3/4+ режимы, победа, UX)

Реализовано и проверено 67 автотестами (`audit/tool/verify2.js` — все зелёные, регрессия Task 1: 39/39):

### Магический онбординг
- `.char-card` переработаны: эмодзи слева + колонка с именем, описанием и **spell-pills** — каждое заклинание с зарядом `(1x/2x)`, бейджем тайминга (`Ennen sanoja` / `Sanojen aikana` / `Milloin vain`) и точным эффектом. Карточки теперь всегда row-layout, фиксированные высоты убраны.
- Под `#magicToggle` добавлен collapsible-гид `#magicGuide` («🪄 Miten loitsut ja bonussanat toimivat?») с тремя шагами — авто-раскрывается при включении магии.
- Кнопки заклинаний двухстрочные: `.spell-name` (имя + заряды) + `.spell-sub` (эффект). `#spellZoneTitle` динамически меняется: `Vaihe 1: Ennen sanojen avaamista` ↔ `Vaihe 2: Sanojen aikana`.

### Мультиплеер
- `playerMode` (state.js): `2` / `3` / `4`. Интерактивный `.mode-selector` на вкладке Peli вместо статичного текста.
- **3 игрока (FFA)**: три слота игроков; в маг-режиме выбираются все 3 мага, порядок кликов = порядок ходов (`.selected-third`). `Arvattu oikein` → модалка `#whoGuessedModal` «Kuka arvasi sanan?»: объясняющий +100p (или +50p), угадавший +50p.
- `pendingCurses` теперь хранит **индекс цели** (`-1` = нет). В 3p маг-режиме `#curseTargetModal` «Valitse kirouksen kohde» при касте; проклятие висит до хода именно цели.
- **4+ команды**: `Tiimi 1` vs `Tiimi 2` (в маг-режиме — `Tiimi N: <маг>`). `#btnStolen`/`#btnModalStolen`/`#btnEmojiStolen` — «⚡ Vastustaja arvasi ensin! (+50p heille)»: +50p чужой команде, 0 объясняющей. Видимость через `body[data-mode="4"]` CSS-гейтинг.
- `#curseBanner` — анимированный баннер «💀 KIROUS AKTIVOITUI: …» над списком слов при активации проклятия; мёртвый блок `KÄÄNTEINEN MAGIA` удалён.
- `updateTurnDisplay` — N-игровой скорборд с маркером `▶` у текущего.

### Секретность слов, peek, эмодзи
- Обе модалки (рисование/эмодзи) скрывают `#wordList` при открытии и не показывают при закрытии (уже было — подтверждено тестами).
- `#btnPeekDraw`/`#btnPeekEmoji` + `#peekWordPill` — hold-to-peek: mousedown/touchstart показывает `generatedWordsList[selectedWordIndex]`, отпускание прячет. `contextmenu` заблокирован.
- `#emojiInputArea`: `autocomplete/autocorrect/autocapitalize/spellcheck` off + input-фильтр — только эмодзи и пробелы (регулярка `\p{L}\p{N}\p{P}\p{Sm}\p{Sc}\p{Sk}` с `u`-флагом; ZWJ-последовательности и VS16 сохраняются).
- `#btnEmojiGuessed` синхронизирован с `updateGuessedButtonsText()`.

### Типографика, QR, победа, таймер, хранилище
- `hyphens: auto` + `clamp()` для `.char-name`, `.theme-text`, заголовков модалок — «KIROUKSENLANGETTAJA» больше не рвётся.
- `qr-code.svg` — офлайн SVG-QR (segno, error-level M, золото на тёмном) вместо внешнего `api.qrserver.com`.
- `#victoryModal` — заменён `alert()+location.reload()`: рейтинг с медалями/подсветкой победителя, «🔄 Pelaa uudelleen» → `resetCurrentGame()` (полный сброс без reload), «⚙️ Muuta asetuksia» → `#characterModal`.
- `#timerSelect` (0/60/90/120с) + прогресс-бар `#turnTimer`/`#turnTimerFill` над блоком темы; warn/danger-цвета; при таймауте — авто-`endRound(false)`. Старт при открытии слов, стоп в `endRound`.
- `js/storage.js` — `localStorage` (`arksanum-settings-v1`): веса тем, playerMode, magicToggle, bonusScalingToggle (`bonusScaling`, фикс. 1✨/+25p когда выкл), roundSelect, timerSelect, setupOrder. Автосохранение по change/input, восстановление при загрузке.
- Багфикс по ходу: `refreshStartButton` больше не затирает состояние ошибки словарей (`dictionariesFailed`); `.steal-btn`-гейтинг поднят по специфике выше `.round-controls-block button { display:flex !important }`.

### Новые скриншоты (audit/screenshots/t2-*.png)
| Файл | Что показывает |
|---|---|
| `t2-01-onboarding.png` | Карточки персонажей со spell-pills и бейджами тайминга |
| `t2-02-spellbuttons-phase1.png` | 3p-магия: скорборд 3 игроков, двухстрочная кнопка + фаза «Vaihe 1» |
| `t2-04-whoguessed.png` | Модалка «Kuka arvasi sanan?» с двумя оппонентами |
| `t2-05-steal-btn.png` | 4+ режим: оранжевая кнопка «Vastustaja arvasi ensin!» |
| `t2-06-victory.png` | `#victoryModal`: рейтинг, победитель, кнопки replay/settings |

Скрипты: `audit/tool/verify2.js`, `audit/tool/shoot2.js`.

## 10. Добавлено (Task 3 — мультителефонный режим «Useampi puhelin / Huonepeli» через Node.js + WebSockets)

### Архитектура
- `server.js` (~190 строк) — Express (статика + `/qr.svg?data=` генерация QR + `/healthz`) и `ws` на одном HTTP-сервере. Порт `process.env.PORT || 8080`, хост `0.0.0.0` (Render free tier). Хурум-коды — 4 заглавные буквы без I/O (`ARKX`). Хурумы в памяти; сборка >2 ч без подключений (интервал 10 мин). Лимит 10 игроков/комнату.
- `js/network.js` (~700 строк) — ws-клиент: `wss://`/`ws://` по схеме страницы, PING каждые 25 с (→ PONG), авто-reconnect через 2 с, сессия `{roomCode, playerId, name}` в `sessionStorage` (`arksanum-room-session`), автозаполнение кода из `?room=ABCD`.
- Сервер — «слепой ретранслятор»: вся игровая логика остаётся на клиентах; сервер хранит roster, settings и последний `game.state` для снапшота реконнекта.

### Протокол (JSON)
Клиент → сервер: `CREATE_ROOM`, `JOIN_ROOM`, `REJOIN`, `SETTINGS` (только хост), `CHAR_PICK`, `START_GAME` (только хост), `RELAY` (произвольные игровые события), `PING`, `LEAVE_ROOM`.
Сервер → клиент: `ROOM_CREATED`/`ROOM_JOINED`/`ROOM_STATE` (rejoin-снапшот: roster+settings+game), `ROSTER`, `SETTINGS`, `GAME_STARTED`, `EVENT` (обёртка relay), `PONG`, `ERROR` (`NO_ROOM`/`NO_PLAYER`/`STARTED`/`FULL`).

RELAY-события (kind): `THEME_ROLLING`, `THEME`, `WORDS_OPEN` (только количество слов + таймер — **сами слова НИКОГДА не уходят в сеть**), `WORD_LOCKED`, `SPELL_CAST`, `CURSE_PENDING`, `DRAW` (open/live/stroke/undo/clear/close), `EMOJI` (open/update/close), `ROUND_END` (результат + счёт + индексы хода + gameOver), `PLAYER_DISCONNECTED` (авто-пропуск хода отвалившегося объясняющего).

### Асимметрия экранов
- Объясняющий (`window.netIsMyTurn()`): обычный UI + выбор слова. Угадывающие: `#netGuesserScreen` — скорборд, «Selittää: X», барабан/тема/правило, статусы, `#ngTimer`, read-only `#ngCanvas` (прямая отрисовка каждого события + rAF для fade «näkymätön muste»), `#ngEmojiView` для emojit.
- `#turnSummaryCard` на 4 с на всех телефонах: слово + кто заработал очки.
- Гости в лобби не видят одиночные настройки (`body[data-net]` CSS-гейтинг); хост широковещательно рассылает режим/магию/раунды/таймер/веса при изменении.
- Победа: host может перезапустить игру (`netReplayRequest` → `START_GAME` с тем же cfg).
- Команды (mode 4): игроки чередуются в tiimit 1/2; объясняющий внутри команды — `teamCursors`.

### Файлы
Новые: `server.js`, `js/network.js`, `package.json` (express, ws, qrcode; `npm start`). Правленые: `index.html` (mode-switcher, лобби, guesser-экран, summary-карточка), `styles.css` (lobby/guesser/summary/net-draw стили), `js/main.js` (turn-гарды, replay в комнате, word-lock relay), `js/rounds.js` (theme/words/round_end релеи), `js/spells.js` (broadcast заклинаний/проклятий), `js/drawing.js` (стрим штрихов + read-only replay), `js/ui.js` (emoji-стрим).

### Проверка
- `audit/tool/verify3.js` — **45/45**: лобби (код/QR/roster/`?room=`), broadcast настроек, старт 3p, асимметрия экранов, секретность слов (0 li у угадывающих), стрим рисунка+undo, `whoGuessed` +50, синхр. очков, summary со словом, переход хода, emoji-стрим, reconnect→ROOM_STATE, 0 ошибок консоли.
- Регрессия: `verify.js` **39/39**, `verify2.js` **67/67** — одиночный режим не сломан.
- `audit/tool/shoot3.js` — 12 скриншотов `t3-*.png`.

### Подводные камни тестирования (важно для следующего ИИ!)
1. **Headless multi-page: скрытые страницы = `visibilityState:'hidden'`** → у них мёртв `requestAnimationFrame` и НЕ производятся кадры → `page.screenshot` виснет вечно, а `Input.dispatchMouseEvent` (`page.click`/`page.mouse`) может зависнуть без ACK. Лечение в тестах: `page.bringToFront()` перед скриншотом и `el.click()`/`dispatchEvent` вместо реального ввода.
2. Поэтому же **в `drawing.js` рендер делается немедленно на каждом DRAW-событии** (не только в rAF-цикле) — иначе телефон «в фоне» показал бы пустой холст. rAF остался только для fade-анимации.
3. `verify3.js`/`shoot3.js` перехватывают и абортируют `/sounds/*` — headless-медиапайплайн на Windows шелушится.

### Ограничения (честно)
- Хурумы в памяти одного процесса: рестарт сервера = потеря комнат; горизонтальное масштабирование невозможно без внешнего брокера. Для Render free tier — норм.
- Нет авторства действий: любой клиент в комнате может слать RELAY-события (доверяем игрокам — party game, не соревновательная игра).
- Rejoin mid-turn восстанавливает roster/счёт/ход, но не промежуточные штрихи/emoji на экране угадывающего.
- `netSkipTurn` при отключении объясняющего копирует упрощённую логику перехода хода (без спец-режимов extra-turn edge cases).

### Скриншоты Task 3 (audit/screenshots/t3-*.png)
| Файл | Что показывает |
|---|---|
| `t3-01-room-join.png` | Панель «Useampi puhelin»: имя, Luo/Liity, поле кода |
| `t3-02-room-lobby-host.png` | Лобби хоста: код TEYX, QR, roster с 👑, «Aloita huonepeli» |
| `t3-03-room-lobby-guest.png` | Лобби гостя: «Odota isäntää…», без старт-кнопки |
| `t3-04-explainer-start.png` | Телефон объясняющего: «Vuoro: Emma», «Aloita kierros» |
| `t3-05-guesser-waiting.png` | Экран угадывающего: скорборд + «Selittää: Emma» |
| `t3-06-guesser-theme.png` | Угадывающий: PIIRTÄMINEN + правило + статус |
| `t3-07-explainer-words.png` | Объясняющий: секретный список слов (+25p бонус) |
| `t3-08-guesser-words-open.png` | Угадывающий: «Selittäjä katsoo sanoja (5 kpl)» — БЕЗ слов |
| `t3-09-explainer-drawing.png` | Объясняющий рисует домик в модалке |
| `t3-10-guesser-live-canvas.png` | Угадывающий: тот же домик лайвом на read-only canvas |
| `t3-11-guesser-summary.png` | Summary-карточка: «Bataatti», Emma +очки, Leevi +50p |
| `t3-12-explainer-summary.png` | Та же карточка на телефоне объясняющего |

---

## Task 4: Reconnect-resilience (megaplan-reconnect)

Цель: затухание экрана / случайный выход / обрыв сети не ломают игру, а
вышедший игрок имеет удобный путь назад. Подробности в
`megaplan-reconnect.md`.

### Архитектура
- `server.js`: `ws.isAlive` heartbeat sweep (`ARK_HB_MS`, default 30 s) —
  зомби-сокеты спящих устройств умирают вместо вечного «connected»;
  grace `ARK_GRACE_MS` (default **90 s**) — `PLAYER_WAITING` →
  `PLAYER_BACK` при возврате или `PLAYER_DISCONNECTED` → клиентский скип;
  stale-guard `p.ws === ws` в `close`; `SESSION_TAKEN` при повторном
  REJOIN; миграция хоста первому онлайн-игроку; `LEAVE_ROOM` помечает
  `p.left` и обходит grace; `room.game` обновляется по `STATE_SYNC`.
- `js/network.js`: сессия `arksanum-room-session` в sessionStorage
  (per-tab приоритет) + localStorage (переживает закрытие браузера),
  TTL 2 ч; auto-reconnect + `netWakeCheck` на
  `visibilitychange`/`online`/`pageshow` + pong-watchdog; `_resumeIntent`
  — auto-REJOIN только при reconnect или явном «Palaa peliin»;
  `?room=ABCD` открывает join-форму (без auto-resume — защита от кражи
  сессии shared localStorage), сессия другой комнаты затирается;
  `netBuildState`-снапшот в `ROUND_END`/`TURN_SKIPPED` + heal-логика;
  гарды `isFromExplainer`/`endedIndex` против двойного хода от
  проснувшихся клиентов; `netSkipOneTurn` зеркалит `endRound` (extra-turn
  Yrttitarhuri, teamCursors); `netEnsureExplainerAvailable` скипает
  цепочку офлайн-игроков; `applyNetSnapshot` восстанавливает
  roster/счёт/idx/phase — вернувшийся объясняющий без слов авто-скипает
  свой ход (слова по сети не ходят).
- `index.html`/`styles.css`: баннер `#netResumeBanner`
  («♻️ Kesken oleva peli huoneessa ABCD — PALAA PELIIN») +
  `#roomResumeLink`; `#netConnBadge` со статусом соединения;
  `#btnLeaveInGame` (armed double-tap) и выходы в лобби/victory-модале.

### Протокол
Новое: EVENT-виды `PLAYER_WAITING`/`PLAYER_BACK`, сообщение
`SESSION_TAKEN`, relay-виды `STATE_SYNC`/`TURN_SKIPPED`, `state` в
`ROUND_END`, полный `state`-снапшот в `ROOM_STATE.game`.

### Проверка
- `audit/tool/verify6.js` — **44/44** (spawn server с
  `ARK_GRACE_MS=4000 ARK_HB_MS=1000`): grace WAITING→BACK без скипа;
  resume объясняющего в grace с сохранением слов; drop>grace→скип+
  converged rejoin; reload объясняющего со словами→TURN_SKIPPED; reload
  гостя→баннер→guesser-экран; stale `ROUND_END` дропается; миграция
  хоста; `?room=` бьёт старую сессию; armed leave.
- Node-ws smoke: heartbeat, SESSION_TAKEN, stale-close без ложного
  DISCONNECTED, host migration.
- Регрессия: verify **39/39**, verify2 **67/67**, verify3 **45/45**,
  verify4 **21/21**, verify5 **36/36**.

### Подводный камень тестирования
Все вкладки одного puppeteer-браузера делят `localStorage` → страница с
`?room=CODE` для комнаты из сохранённой сессии НЕ должна auto-resume
(иначе крадёт playerId другой тестовой страницы). Поэтому `?room=`
всегда открывает форму, а возврат — только через явный «Palaa peliin».

### Ограничения
- Grace/комнаты в памяти процесса: рестарт сервера всё теряет (как раньше).
- Rejoin не восстанавливает штрихи/emoji — только фазу/счёт/ход.
- Перезагрузившийся объясняющий в фазе открытых слов теряет ход —
  секретные слова по сети не восстанавливаются.

---

## Task 5: Ääni kaikilla puhelimilla, host-oletus, huonekoodi pelissä, reclaim nimellä

### Ääni
- `js/audio.js`: `window.isSoundOn()` — käyttäjän valinta
  `sessionStorage['arksanum-sound']` (per-välilehti! localStorage olisi
  yhteinen saman selaimen välilehdille ja mykistys vuotaisi toiselle
  pelaajalle — löydettiin verify7-testillä) ?? `window.soundDefaultOn()`
  (`network.js`: `!Net.roomCode || Net.isHost` — vieras oletuksena
  hiljainen). Gate `playAudio()` + `playThemeEffect()` — kaikki äänet.
  Mute myös pysäyttää jo soivat (`sounds.*` + `themeEffectPool` pause+rewind).
- `#soundToggleBtn` (index.html) — fixed oikea alanurkka, z 9600, 🔊/🔇,
  näkyy kaikilla näytöillä; päivittyy `enterLobby`/`ROOM_STATE`/`ROSTER`/
  `SESSION_TAKEN` -käsittelijöistä (`refreshSoundBtn`).
- Rumpu kuuluu myös arvaajilla: `THEME_ROLLING` → `playAudio(sounds.drum)`
  (network.js) — sama 2.5 s rytmi kuin selittäjällä.

### Huonekoodi pelin aikana
- `#roomCodeChip` (selittäjä, scoreDisplay-rivillä) + `#ngRoomCode`
  (guesser-header) — näkyvät vain `body[data-net^="room-"]`, tap →
  `navigator.clipboard.writeText(code)` + "kopioitu"-vahvistus.

### Reclaim nimellä (server.js)
- `attachPlayer(room, p, name)` — yhteinen REJOIN/claim-logiikka
  (SESSION_TAKEN vanhalle socketille, grace-cancel, ROOM_STATE, ROSTER,
  PLAYER_BACK).
- `JOIN_ROOM` hakee samannimisen pelaajan (trim, case-insensitive):
  disconnected → reclaim (sama playerId → pelitila ehye); connected +
  peli käynnissä → SESSION_TAKEN-takeover; connected + aula → duplikaatti
  sallittu (kaksi nimikaimaa); ei osumaa + peli → `STARTED` vihjeellä
  "palaathan samalla nimellä"; ei osumaa + aula → normaali join.
- Client: `ERROR NO_PLAYER` auto-REJOINista → fallback `JOIN_ROOM`
  sessio-nimellä (`_reclaimTried`-lippu estää loopin); `ROOM_STATE`
  -polku palauttaa pelin kuten ennenkin.

### Проверка
- `audit/tool/verify7.js` — **28/28**: äänen oletukset (host 🔊/vieras 🔇),
  toggle+persist, rumpu molemmilla, mute-gate (mykistetty selittäjä ei
  soita, arvaaja kuulee relayn), koodi-chipit, reclaim mid-game samalla
  playerId:llä (roster ei kasva), reclaim aulassa, STARTED-vihje.
- Регрессия: verify 39, verify2 67, verify3 45, verify4 21, verify5 36,
  verify6 44 — kaikki vihreät (280 yhteensä).

## 9. Teemaruletti (teemarumpu)

Selitysvaiheen 2,5 s rummutuksen aikana kaikilla puhelimilla pyörii
rulettipyörä, jonka sektorit vastaavat asetuksissa päällä olevia teemoja.

### Rakenne (`js/ui.js` → `window.themeDrum`)
- `mount(wheelEl, sectors, hubEl)` — rakentaa sektorit `conic-gradient`-
  taustalla + teemoemoji keskellä sektoria; sektorin kulma =
  `w/Σw × 360°` eli tasan suhteessa todennäköisyyteen.
- `spinTo(ctx, theme, 2100)` — selittäjä: voittaja tiedossa heti, pyörä
  hidastuu pointteriin (0° = ylös) voittajasektorin keskipisteessä,
  ~3 kierrosta ease-outilla.
- `spinInfinite(ctx)` — arvaaja: jatkuva CSS-animaatio kunnes `THEME`
  saapuu; `land(ctx, theme, 400)` nappaa nykykulman ja hidastuu
  voittajaan.
- Hub (`#drumHubName`/`#ngDrumHubName`) näyttää lopuksi voittaneen
  teeman nimen; `prefers-reduced-motion` → suora maaliin ilman
  animaatiota.

### Synkronointi
- `THEME_ROLLING` kantaa `spin`-taulukon (selittäjän rakentamat
  sektorit `{theme, w}`) → kaikilla sama pyörä, myös `ngSectorsFromUI`
  -fallbackilla jos spin puuttuu.
- `THEME` → `ngLandDrum` → teemakortti + teemasound ~250 ms myöhemmin
  (pyörä vielä näkyvissä hidastumassa).
- `netBuildState`/`applyNetSnapshot` pitävät `phase:'rolling'` +
  `_netSpin` → rejoin rummun aikana rakentaa saman pyörän.
- Rejoin selittäjänä mid-roll: vaihe tulkitaan `idle`-tilaksi eikä
  `#btn` jää piiloon (ei deadlockia).

### Edge-caset
- Yksi teema päällä → yksi 360°-sektori, pyörä "pyörii" tyhjyyttään.
- Kaikki painot 0 → fallback `perusvaihtoehto` (kuten ennen).
- `vapaavalintainen` / devThemeSelect-valinta lisätään sektoriin
  vaikka paino olisi 0.
- `netCleanupTurnUI` + `mount`-sisäinen `destroy` siivoavat
  edellisen pyörän — ei jääntekiloja seuraavaan rullaan.

### Проверка
- `audit/tool/verify8.js` — **18/18**: pyörä mountattu, Σ=360°,
  elokuva w1/4=90°, perus w3/4=270°, conic-gradient, landed-luokka,
  hub-nimi = arvottu teema, pointteri voittajasektorin sisällä,
  yksi teema = 360°, vieras näkee saman pyörän + sektorit,
  ngDrum piiloutuu ja tyhjenee revealin jälkeen.
- Регрессия после рулетки: 39+67+45+21+36+44+28+18 = **298 PASS**.

---

## Task: Omat ehdot — пользовательские условия в пуле (megaplan-custom-themes)

Игроки могут создавать свои условия объяснения: **имя + правило + опциональный
эмодзи**. Кастомы регистрируются в существующих `themes/themeImages/
themeDescriptions` → автоматически попадают во взвешенный пул, барабан,
экран объясняющего и guesser-экраны без особой логики.

### Архитектура
- `js/rounds.js`: глобальные `window.themeSlug`, `bindThemeStepperCard(card)`,
  `bindThemeHelpBtn(btn)` — вынесены из `initializeThemeWeightSteppers` для
  динамических карт. `randomizeTheme` показывает правило кастома в
  `#ruleInstruction` (textContent). Фикс: степперы −/+/blur диспатчат
  `input` с `bubbles:true` — раньше делегированные save/broadcast их не видели.
- `js/customthemes.js` (новый): `customThemesApi` —
  `addTheme/removeTheme/setAll/has/list`, санитизация (имя `\p{L}\p{N} -`≤24,
  desc ≤160 без `<>`, emoji = 1 графем-кластер), ≤15 кастомов, дубликаты/
  slug-коллизии, `forbiddenSet`, `refreshAccordion` для maxHeight.
- `index.html`: аккордеон «✨ Omat ehdot» — форма + `#customThemesGrid`
  (те же `.themes-grid`/`.theme-card` → визуально неотличимы от встроенных).
- `js/storage.js`: `customs[]` в payload, `setAll` до восстановления весов.
- `js/network.js`: `customs[]` в SETTINGS от хоста; на госте `setAll` до
  применения весов. Хост — источник истины (сервер пропускает SETTINGS
  только от хоста). `✕` удаляет мгновенно, без подтверждения.

### Проверка
- `audit/tool/verify10.js` — **40/40**: форма/реестр/валидация/help-модалка/
  степпер/выпадение кастома в барабане с показом правила/удаление/
  localStorage-persist/полный host→guest синк (add, вес, delete).
- Регрессия: verify 39 + verify2 67 + verify3 45 + verify4 21 + verify9 26
  = **198 PASS**.
- Скриншот: `ct-settings-390.png`.

### Подводные камни
- `new Event('input')` без `{bubbles:true}` не доходит до делегированных
  слушателей — веса, выставленные скриптом, молча не сохранялись/не синкались.
- Аккордеон `.open`+`maxHeight` (не display) — пересчёт после изменения
  содержимого обязателен.
- `themeDescriptions` → innerHTML в help-модале — сетевые/пользовательские
  строки без стрипа `<>` туда нельзя.

---

## Task 13: Yksityisyysverho — «privacy-туман» на списке слов

Цифровой аналог экрана-приватника (как у врачей): список слов объясняющего
всегда покрыт «туманом», читается через полноширинную полосу-«линейку» под
пальцем/курсором + тонкий стиппл-слой, дробящий буквы на дистанции. Модель
угроз — СЛУЧАЙНЫЙ взгляд (игра на честности); слова по-прежнему в DOM.
Режим всегда включён — без тумблера, настроек и сетевых сообщений.

### Архитектура
- `index.html`: `#wordListWrap {position:relative}` вокруг `#wordList`;
  сиблинги `#wordMask` (туман+окно), `#wordGrain` (зерно), `#wordMaskHint`
  («🤫 Vedä sormella — vain yksi sana näkyy»), все `pointer-events:none`.
- `styles.css`: окно = `mask-image`/`-webkit-mask-image` `linear-gradient`
  через `var(--my)` — `black` снаружи (туман), `transparent` внутри
  (полоса ±24px + фейд ±12px); `--my:-999px` = окна нет. `#wordGrain` —
  inline SVG-точки, `opacity:.12`; отключается при `prefers-contrast: more` /
  `prefers-reduced-transparency`. `#wordList` получил `user-select:none`.
- `js/ui.js`: `initPrivacyMask()` — touch (`-10px` сдвиг выше пальца) и
  mouse (hover) ставят `--my` относительно ректа МАСКИ; `touchend`/
  `mouseleave` → `-999px`; синтетические mouse после тача гасит флаг
  `touchActiveUntil` (700 мс). MutationObserver на `#wordList`
  (style/class/childList) → `refreshPrivacyMask()` синхронизирует видимость
  трёх слоёв со ВСЕМИ путями изменения списка (renderOlList, clearWordsBeforeTurn,
  endRound, toggleWordVisibility, network.js, метаморфоза, Sanakaaos).

### Сетевой аспект
Ноль зависимостей от сети/протокола: маска живёт на устройстве объясняющего
рядом со словами — при обрыве ws продолжает работать; у угадывающих слоёв
нет в принципе (слова и раньше не уходили в сеть).

### Проверка
- `audit/tool/verify13.js` — **29/29**: видимость слоёв, градиент, --my по
  touch/mouse (учёт сдвига −10 и margin-коробки wrapper'а), выбор слова
  сквозь маску, hidden-words, перерендер, endRound, prefers-contrast,
  room-режим (маска только у объясняющего), оффлайн-устойчивость, 0 ошибок.
- Скриншоты `audit/screenshots/pm-*.png` (shoot-pm.js).
- Регрессия: verify 39 + verify2 67 + verify4 21 + verify6 44 + verify7 28 +
  verify8 18 + verify9 26 + verify10 40 + verify11 34 + verify12 41 = все зелёные.
  **Известные предсуществующие провалы** (не связаны с задачей, дрейф после
  Task 11): verify3 — 2 FAIL (emoji-тема у гостя: `netGetThemeWeights` теперь
  берёт cfg.weights хоста, а не DOM гостя); verify5 — 1 FAIL («summary reveals
  the word»: Task 11 намеренно прячет слово при отсутствии выбора).
  Подтверждено прогоном на чистом HEAD (git stash).

### Подводные камни
- `mask-image` градиент: `black` = туман виден, `transparent` = дырка —
  полярность легко перепутать (поймано скриншотом, не тестами).
- `--my` отсчитывается от ректа `#wordMask` (= `#wordListWrap`), который
  включает margin-коробку `<ol>` — flex-item не пропускает margin-collapse
  наружу; координаты считать строго от `maskRect`.
- `touchmove` passive + без preventDefault — список скроллится, полоса
  остаётся под пальцем; `pointercancel`-проблем обходимся без Pointer Events.
- MutationObserver-колбэки отрабатывают до следующего кадра — мигания нет;
  прямой вызов `refreshPrivacyMask()` в `renderOlList` — подстраховка.

---

## Task 14: Динамическая бонусная экономика — «финальный спринт» (megaplan-bonus-scaling)

Цель: у отстающего игрока появляется реальный рычаг камбэка — бонусные слова
дорожают и множатся к финалу игры. Подробности в `megaplan-bonus-scaling.md`.

### Механика
- Прогресс `p = currentRound / totalTurns` делит игру на 3 фазы:
  **p ≤ 0.5** → 1 ✨-слово +25p; **0.5 < p ≤ 0.8** → 2 ✨-слова +50p;
  **p > 0.8** → 3 ✨-слова +100p. Кап `targetCount − 1` оставляет ≥1 лёгкое.
- `BONUS_PHASES` + `getBonusPhase()`/`getBonusConfig()` в `js/rounds.js`.
- `currentBonusWordText` → массивы `currentBonusWords` (✨) и
  `currentCursedWords` (💀) в `state.js`.
- Единый `generateWordList(withChaos)` — генерация списка и для обычного
  хода, и для метаморфозы. Попутный фикс: `usedWordsInThisGame` наконец
  реально фильтрует словари (раньше массив только писался — повторы были
  возможны; метаморфоза фильтровала, обычная генерация — нет).

### Ребаланс магов
- **Sanakaaos**: 3 слова цели — 💀-проклятые из kaikkisanat, сложные и БЕЗ
  бонуса (блокирует бонус-экономику хода — контр-плей поздней игрой).
- **Sanametamorfoosi**: новый список по тем же фазовым правилам — бонусные
  слова сохраняются (база 50p + бонус). Снимает Sanakaaos; Korttinälkä нет.
- Бонусы +50 (3p-угадавший, 4p-ryöstö) и тема `vapaavalintainen` — без изменений.

### UI/тексты
- Мульти-✨-бейджи `+{V}p` по фазе, 💀-бейджи проклятых (`data-cursed`);
  `bonusHint` динамический (бонус/каос/пусто); `formatRoundCounter()` →
  `Kierros: X / Y · ✨+Vp` в `#roundDisplay` и `#ngRound`;
  `updateGuessedButtonsText` — превью выплаты (`+200p` в финале);
  `ROUND_END` несёт `bonus` → строка «✨ Bonussana! +Vp» в сводке;
  правила/magicGuide/char-pills обновлены.

### Проверка
- `audit/tool/verify14.js` — **37/37**: границы фаз, 1/2/3 ✨-слова, бейджи,
  Sanakaaos (3 💀/0 ✨/+0), метаморфоза (бонусы живы, каос снят, 50+25=75),
  скоринг +125/+200/+100, превью, индикатор, демо-игра 2 раунда.
- Регрессия: verify4 **21/21** (B3 «+25p» не сломан — фаза 0 идентична),
  verify2 **67/67**, verify3 **43+2** (предсуществующие фейлы emoji у гостя).

### Подводные камни
- `getBonusConfig()` живо читает `currentRound` — начисление в `endRound`
  идёт ДО инкремента раунда → фаза верная.
- Метаморфоза снимает `chaosFourWords` (обмен заряд на заряд) — осознанно.
- `data-rare="false"` у 💀-слов — verify3 берёт их для детерминированного
  счёта; очков нет — корректно.
- Хинт на 1-м раунде содержит «koko sanakirjasta» и «+25p» — совместимость
  verify4 B3 сохранена специально.

## Task 15: Компактный UX списка слов — гармошка, полный экран, большое раскрытие (megaplan-wordlist-ux)

Цель: убрать дублирующую кнопку «Piilota sanat» (верх вуали достаточно скрывает),
освободить максимум места словам и сделать раскрытие удобнее.
Решения пользователя: полоса + холд=весь список; 🎨-пилюля у чипа;
под гармошку — скорборд/карточка темы/инструкция/bonusHint.

### Что сделано
- **`#turnPanel`-гармошка** (`index.html`, `styles.css`, `js/ui.js`):
  `#playerTurn` + `#themeBlock` + `#bonusHint` + `#ruleInstruction` перенесены
  внутрь `#turnPanelBody` (collapsed → `max-height:0`). Всегда видимый чип:
  `emoji + ТЕМА · ▶ игрок ▾` — `aria-expanded`/`aria-controls`, тоггл по клику,
  `prefers-reduced-motion` → без анимации. По умолчанию развёрнута при
  раскрытии темы, авто-сворачивается в `switchToWords` / rejoin explainer.
- **«Piilota sanat» удалён**: после открытия `#btnDisplayWords` скрывается
  полностью (`rounds.js`, `main.js` — кнопка только «Näytä sanat»; `toggleWordVisibility`
  больше не вызывается из UI). Сеть: rejoin explainer тоже прячет кнопку.
- **Авто-анхайд модалок**: закрытие рисовалки/эмодзи снимает `hidden-words`
  само — раньше требовалась повторная кнопка (`restoreHiddenWords`,
  `drawing.js closeModal`, `btnCloseEmojiModalX`).
- **🎨-пилюля** `#btnToolCanvas` у чипа: видна только на piirtäminen /
  näkymätön muste / vain emojit при открытых словах (`updateToolPill`,
  вызывается из `refreshPrivacyMask` + конца `switchToWords`) — открывает
  модалку вместо спрятанного `#themeBlock`.
- **Список на весь экран** (`.words-active`): контейнер `min-height:
  calc(100dvh - 34px)`, gap 20→8px, `#wordListWrap {flex:1}`,
  `#wordList {flex:1; max-height:none; overflow-y:auto}`,
  li `flex:1 1 0; min-height:44px` — строки равномерно заполняют высоту;
  при переполнении карточка растёт → скроллит **страница** (удобнее крошечного
  внутреннего скролла; маска скроллится вместе со списком).
- **Адаптивное окно**: `--wh = li.offsetHeight × 0.6` (замер rAF + debounce
  400мс после transition гармошки + на старте жеста + resize) — полоса
  ~1.2 строки независимо от высоты строк.
- **Холд = весь список**: 350мс удержание (сдвиг <12px не отменяет) →
  `.revealing` прячет mask+grain+hint до отпускания; mouse hold аналогично;
  `vibrate(10)` тик. Хинт обновлён: «Vedä — yksi sana · pidä — kaikki».

### Подводные камни
- Глобальный `button { width:100% }` (styles.css:307) раздувал 🎨-пилюлю на
  всю строку → `width:auto !important` на обеих кнопках чипа.
- `--wh` нельзя мерить синхронно при рендере — во время 250мс-анимации
  гармошки высота li растёт (flex-перераспределение) → rAF + отложенный замер.
- `themeDrawingHint` создаётся после `renderOlList` → `updateToolPill`
  вызван и в конце `switchToWords` (иначе пилюля опаздывает).
- Переполнение списка = page-scroll по дизайну (не inner-scroll).

### Проверка
- `audit/tool/verify15.js` — **41/41**: отсутствие Piilota sanat, collapsed
  по умолчанию + aria + тоггл, чип (тема/игрок), 🎨-пилюля по теме +
  открытие модалки + auto-unhide, hold=reveal-all (touch+mouse), адаптивный
  --wh, список ≥50% вьюпорта / 5 слов без скролла, page-scroll фолбэк +
  трекинг, выбор слова, бонус-бейдж, reduced-motion.
- `verify2`: ожидание «emoji close → words hidden» заменено на auto-unhide
  (намеренная смена поведения); `verify.js`/`verify2.js`/`verify3` клики по
  `#themeBlock` → `#btnToolCanvas`.
- Регрессия: verify **39**, verify2 **67**, verify3 (evaluate-тапы совместимы),
  verify4 **21**, verify11 **34**, verify12 **41**, verify13 **29**,
  verify14 **37** — **0 FAIL**.
- Скриншоты: `audit/screenshots/wl-collapsed.png`, `wl-expanded.png`,
  `wl-strip-window.png`, `wl-reveal-all.png`, `wl-tool-pill.png`.

## Task 16: Остановившееся колесо вместо карточки темы до «Näytä sanat»

Цель: на фазе «тема выбрана, слова ещё закрыты» показывать просто, где
остановилось колесо — без развёрнутой гармошки/карточки. Колесо уходит
только при нажатии «Näytä sanat». Гость в комнате — зеркально до `WORDS_OPEN`.

### Что сделано
- **Селиттёря (`js/rounds.js`)**: `randomizeTheme` больше не прячет `#loader`
  после лендинга — колесо остаётся замороженным на результате (`.landed`,
  хаб = тема). При старте спина `setTurnPanelCollapsed(true)` + caption
  «Noniin...» → после лендинга caption = имя темы, класс `.drum-rest`
  (выключает бесконечный `pulse`, `styles.css`). Панель разворачивается
  **только для vapaavalintainen** — её инструкция «keksi oma sana» обязательна.
- **`switchToWords`**: `#loader` скрывается + `themeDrum.destroy(drumWheel._drum)`
  — колесо уходит ровно при открытии слов. `endRound` — страховочное скрытие
  (vapaavalintainen/досрочный конец хода).
- **Гость (`js/network.js`)**: `ngSpinDrumTo`/`ngLandDrum` больше не прячут
  `#ngDrum` после лендинга — замороженное колесо + `.drum-rest` + caption.
  Флаг `_ngWheelRest`: пока колесо на сцене, `ngApplyTheme` наполняет
  `#ngThemeBlock` данными, но держит скрытым. `WORDS_OPEN` → `ngDrum`
  скрывается, карточка темы появляется. Rejoin гостя в theme-фазу →
  замороженное колесо (`mount` + `spinTo(ctx, theme, 0, 0)`).
- **Попутный фикс**: цепочка `else` в конце `randomizeTheme` затирала
  инструкцию vapaavalintainen (`textContent=""` после её установки) —
  теперь очистка только для прочих тем. Баг был скрытым, всплыл тестом.
- **Cleanup**: `netCleanupTurnUI`/`netSkipOneTurn`/rejoin уже прячут
  `#loader`/`#ngDrum` — добавлен сброс `drum-rest`/`_ngWheelRest` рядом.

### Проверка
- `audit/tool/verify16.js` — **37/37**: колесо видно+`.landed`+`.drum-rest`+
  хаб+caption=тема; панель collapsed + CTA; «Näytä sanat» → колесо скрыто;
  vapaavalintainen — колесо+панель expanded+инструкция+нет CTA, giveup чистит;
  комната — у гостя `ngDrum` lepää до `WORDS_OPEN` → карточка темы.
- `verify15.js`: ожидание «expanded at theme reveal» → «collapsed при
  wheel-rest» (намеренная смена). **41/41**.
- Регрессия: verify **39**, verify2 **67**, verify4 **21**, verify11 **34**,
  verify12 **41**, verify13 **29**, verify14 **37** — **0 FAIL**.
- Скриншоты: `audit/screenshots/wr-wheel-rest.png`,
  `wr-wheel-rest-expanded.png`, `wr-words-open.png` (`shoot-wr.js`).

### Нюансы
- rAF на фоновой вкладке приостанавливает спин — на реальном устройстве
  экран на переднем плане, проблемы нет (в тестах обходится `bringToFront`).
- Rejoin селиттяги в theme-фазу показывает чип+CTA без колеса (состояние
  барабана не восстановить — приемлемая деградация).

## Task 17: «Немое» большое колесо за правым краем + аудит дублей

Цель: на wheel-rest фазе имя темы дублировалось 3 раза (хаб + подпись + чип).
Теперь колесо — чисто визуальный индикатор: большое, уходит за правый край,
без текста; выпавший сектор подсвечен. Имя темы — один раз в чипе.

### Что сделано
- **Колесо больше + вылет** (`styles.css`): `.theme-drum` `min(150vw,500px)`,
  `margin-right:-12%` — ~75% видно, обрезает `.container{overflow:hidden}`.
- **Указатель слева**: `.theme-drum-pointer` на 9 часах (`left:4px; top:50%`),
  glyph `▼`→`▶` (`index.html` ×2), `drumTick`-анимация под новый transform.
- **Текст убран**: `.theme-drum-hub` и `.drum-caption` → `display:none`;
  caption-записи в JS удалены (мёртвый код Task 16). Hub-`textContent`
  продолжает писаться — скрытый источник истины для тестов.
- **Подсветка сектора** (`themeDrum.finish`): `.theme-drum-wedge` —
  conic-gradient по `a0..a1` выпавшего сектора (золото 42%); у победного
  `.theme-drum-item` `.winner` — font-size 52px + `::after` кольцо-свечение;
  остальные эмодзи `opacity:.35` на `.landed`.
- **Геометрия указателя**: `POINTER_DEG=270` в `themeAt`/`spinTo`/`land`
  — приземление целит под левый край колеса.
- **Зеркально у гостя** — общие классы `.theme-drum`, тот же `finish`.

### Аудит дублей по всей игре
| Место | Вердикт |
|---|---|
| Тема: хаб+подпись+чип+карточка (×4) | **Исправлено** → чип + карточка по тапу |
| Эмодзи темы: колесо/карточка/чип | Разные роли — оставлено |
| `▶ игрок` чип vs `Vuoro:` скорборд | summary↔detail — оставлено |
| `ngTheme` vs `ngStatus` | Разное содержимое — оставлено |
| `ruleInstruction` vs `ⓘ`-модалка | Инлайн-фаза vs справочник — оставлено |
| `+25P` vs `bonusHint` vs ✨-бейджи | Механика vs объекты — оставлено |
| Таймер бар+секунды | Один виджет — ок |

### Проверка
- `verify16.js` — **46/46**: bleed справа, hub/caption `display:none`,
  wedge + winner=тема + указатель слева, локал+vapaavalintainen+комната.
- `verify8.js` — **20/20**: обновлены формула указателя (270°) и ожидания
  гостя (колесо до WORDS_OPEN — intended change Task 16/17).
- Регрессия: verify **39**, verify2 **67**, verify4 **21**, verify11 **34**,
  verify12 **41**, verify13 **29**, verify14 **37**, verify15 **41** — 0 FAIL.
- Скриншоты: `wr-wheel-rest.png`, `wr-wedge-multi.png`, `wr-words-open.png`.

## Task 18: UX-пакет — sticky-бар, hold-сдача, «коснулся=весь список», свечение выбора

Цель: продолжение UX-мегаплана по выбору пользователя. Четыре нововведения +
смена жеста вуали; handoff-строка и ⚙-настройки отклонены.

### Что сделано
- **Sticky-панель действий** (`styles.css`): при `.words-active` блок
  `roundControls` (Arvattu / Luovutan / steal) — `position:fixed` у нижнего
  края, градиентный фон, `env(safe-area-inset-bottom)`, z-index 20;
  `#wordListWrap` получает `padding-bottom:78px`, чтобы последняя строка
  не пряталась под панелью.
- **Сдача по удержанию 1 с** (`js/main.js`): `doGiveUp()` вынесена из
  click-handler; `pointerdown`/`keydown(Enter|Space)` запускают
  `.holding` + `gp-fill` (scaleX 0→1 за 1 с), отпуск раньше — отмена.
  Обычный `click` → `.hold-hint` встряска ~1.4 с, ход НЕ завершается.
  `window._devConfirmGiveUp` — осознанный обход для модалок/тестов;
  `btnEmojiGiveUp` и `btnModalGiveUp` вызывают его напрямую.
- **Вуаль упрощена** (`js/ui.js`): удалены полоса-окно (`--my`/`--wh`),
  hold-350 ms и fitWindowToRow. Теперь `touchstart`/`touchmove` или
  `mouseenter`/`mousemove` → `.revealing` = весь список; `touchend`/
  `mouseleave` → туман обратно. Маска — сплошная (без mask-image).
  Хинт → «🤫 Kosketa — näet sanat».
- **Свечение выбора** (`#selGlow` + `updateSelGlow`): золотой
  radial-blur элемент (z-index:4, над туманом z:3) на позиции
  `li.selected-word` — видна только локация строки, текст остаётся
  под вуалью. Прячется при `.revealing`/`mask off`; обновляется по
  MutationObserver (subtree:true), scroll/resize и явному вызову из
  обработчика выбора.
- **Бейдж раунда**: `#chipRound` в чипе (`3/7`) из `formatRoundCounter()`.
- **Онбординг**: `#veilCoach` — одно облачко один раз (localStorage
  `veilCoachV1`), fade за 4 с или первый жест.
- **Хинт тускнеет**: `.hint-dim` (opacity .4, 11px) после первого жеста.

### Тест-правки (intended changes)
- Все `.click()` по `btnGiveUp` в verify2/5/7/11/12/16 →
  `window._devConfirmGiveUp()` (в verify12 — внутри `playTurn`).
- `verify13`/`verify15`: проверки полосы/`--wh` переписаны на мгновенный
  reveal-all; добавлены `hint-dim`, `mask-on`, solid-mask проверки.
- `verify5`: `summary reveals the word` — добавлен `li.click()` перед
  таймаутом (протухшее ожидание: без выбранного слова `tsWord` намеренно
  скрыт — см. verify11 «no dash when unselected»).

### Проверка
- `verify17.js` — **42/42**: sticky-бар (fixed/bottom/z/padding), chipRound,
  мгновенный reveal (touch+mouse), selGlow (позиция/переход/скрытие),
  coach once + localStorage-флаг, hint-dim, hold-сдача
  (click≠сдача + hold-hint, <1 с≠сдача, 1 с=endRound).
- Регрессия: verify **39**, verify2 **67**, verify4 **21**, verify5 **36**,
  verify7 **28**, verify8 **20**, verify11 **34**, verify12 **41**,
  verify13 **32**, verify14 **37**, verify15 **41**, verify16 **46** — 0 FAIL.
- verify3: 43+2 предсуществующих (emoji у гостя — дрейф, не связано).
- Скриншоты: `wl-coach.png`, `wl-collapsed.png`, `wl-expanded.png`,
  `wl-selglow.png`, `wl-reveal-hover.png`, `wl-giveup-hold.png`,
  `wl-tool-pill.png`.

## Task 19 — радиальные подписи на секторах колеса

**Запрос**: на секторах колеса показывать и эмодзи (меньше), и текст темы;
«странное кольцо» вокруг эмодзи-победителя убрать — достаточно подсветки.

### Реализация (`js/ui.js` `themeDrum.mount`, `styles.css`)
- `.theme-drum-item` — якорь 0×0 на спице `mid`; внутри `.drum-tag`
  = `[.drum-emoji][.drum-label]` (эмодзи у края, название к центру).
- Трансформ `rotate(mid) translateY(-R) rotate(90°)` → сумма поворотов
  `mid+90` кладёт ось +X тега вдоль спицы, чтение rim→hub. При лендинге
  (`θ = 270 − point`) победная подпись выходит горизонтальной под левым
  указателем при любом секторе; остальные — наклонные, как на настоящем колесе.
- `aimPoint`: при `span ≥ 120°` цель = середина сектора (для 1–2 секторов
  центрированный вид и горизонтальная подпись; узкие сектора — случайная
  точка как раньше, «реалистичность» сохранена).
- Эмодзи: `clamp(18–24px)` (было 24–34/52); label `clamp(9–12px)` uppercase.
- Winner: `.winner::after` кольцо удалено, `font-size:52px` убран;
  акцент = клин + `label` золотой (`var(--gold)` + glow) + emoji 30px.
- `data-theme`/`a0`/`a1` сохранены на якоре — verify8 не тронут.

### Проверка
- verify16 — **52/52** (+ проверки: label на каждом секторе, нет кольца,
  золотая подпись, горизонтальность у победителя; то же у гостя).
- verify8 — **20/20**; verify15 **41**, verify17 **42** — регрессия зелёная.
- Скриншоты: `wr-wheel-rest.png` (1 сектор — подпись горизонтальна),
  `wr-wedge-multi.png` (5 секторов — радиальные подписи, winner золотой).

## Task 20 — имя темы только на колесе во время wheel-rest

**Запрос**: после Task 19 имя темы снова ×3 (сектор + чип + «Selityksen ehto»).
Решение: пока колесо на экране — тема живёт только на нём.

### Реализация (styles.css, чистый CSS, 0 строк JS)
```css
body:has(.drum-rest) #chipTheme  { display: none; }
body:has(.drum-rest) #themeBlock { display: none; }
```
- `.drum-rest` ставится на `#loader` (локально, rounds.js:407) и `#ngDrum`
  (гость, network.js) — один селектор покрывает оба случая.
- Колесо ушло (Näytä sanat / endRound / giveup) → `.drum-rest` снимается →
  чип и карточка возвращают тему автоматически.
- vapaavalintainen: колесо весь ход → тема только на колесе весь ход;
  `#ruleInstruction` вне `#themeBlock` — «keksi oma sana» остаётся.
- textContent элементов не трогаем — скрыто только отображение.
- Pelaaja 1 ×3 (chip ▶ / Vuoro: / скорборд ▶) — оставлено осознанно
  (summary↔detail паттерн, подтверждено пользователем).

### Проверка
- verify16 — **58/58** (+6: chipTheme display:none при rest + возврат,
  themeBlock hidden для vapaavalintainen, round+player в чипе остаются).
- verify15 — **41/41** (чек обновлён: textContent трекает, display:none).
- verify17 — **42/42**, verify8 — **20/20** — регрессия зелёная.
- Скриншот `wr-wheel-rest-expanded.png`: тема ровно ×1 (золотая подпись
  на секторе), чип «1/7 · ▶ Pelaaja 1», в панели нет «Selityksen ehto».

## Task 21 — дедуп Pelaaja/1-7 везде + стрелка за ободом

**Запрос**: имя игрока ×3 (чип `▶`, `Vuoro:`, скорборд `▶`), раунд ×2
(чип-бейдж + `Kierros:`), стрелка перекрывает эмодзи-подпись победителя.

### Каноничные места (решения пользователя)
- Имя игрока → **только скорборд** (`scoreDisplay ▶`, `ngScore ▶`).
- Раунд → **только `#chipRound`** (локал) и **`#ngRound`** (гость — его
  единственная копия, полный `Kierros: X/Y · ✨+Zp` сохранён).
- `Vuoro:`-блок → аватар + дебаффы (без текста).
- `#ngExplainer` («🗣️ Selittää: …») — удалён полностью.

### Реализация
- `js/ui.js`: `formatBonusCounter()` → `✨+Zp` для `#roundDisplay`
  (без `Kierros:`); удалены записи `currentName` и `chipTurn`.
- `js/network.js` + `index.html`: блок `#ngExplainer` удалён вместе
  с сеттером.
- `styles.css`: `.theme-drum-pointer { left:-12px }` — стрелка снаружи
  обода, остриё у края; теги секторов не перекрываются (и в спине).
- Чип при wheel-rest = `1/7 ▾` (тема на колесе, игрок в скорборде).

### Проверка
- verify16 — **61/61** (+3: tag не под стрелкой, ▶ в скорборде,
  roundDisplay=✨-only; чип — round badge без игрока).
- verify3 — 43 + 2 предсуществующих; новый чек: `ngScore ▶ Isanta` +
  `ngExplainer` отсутствует.
- verify14 — **37/37** (`✨+25p`/`✨+100p` без Kierros), verify15 — **41/41**,
  verify17 — **42/42**, verify8 — **20/20**.
- Скриншоты: `wr-wheel-rest-expanded.png` (имя ×1, 1/7 ×1, аватар-only),
  `wr-wedge-multi.png` (стрелка за ободом).

## Task 22 — ✓-жест вместо тапа, единые карточки, статичная панель, аватар только у магов, сетевой аудит

**Запрос**: выбор слова жестом (✓ под пальцем перепрыгивает по строкам,
отпускание = выбор), тап убрать с бэкапом в файлах; унифицировать вид
карточек (themeBlock/i/✨-hint/ruleInstruction + стартовый экран);
полный баг-чек сети; затем — аватары только при taikahahmot, секцию
без аккордеона, вся инфа одним контейнером над колесом.

### ✓-жест (замена тап-выбора)
- `js/main.js`: `window.selectWordLi(li)` — общий коммит-путь
  (selectedWordIndex, стили, selGlow, выплата, `netRelayWordLocked`).
  `window.TAP_SELECT_ENABLED = false` — бэкап-флаг: при `true` старый
  click-обработчик снова активен (в файле или в консоли).
- `js/ui.js` `initPrivacyMask`: aim-автомат — touchstart/move/end,
  `elementFromPoint` → `.check-armed` на строке под пальцем, touchend
  коммитит, touchcancel/выход наружу — нет. Мышь: mousedown+drag.
- **`touch-action:none` на `#wordList`** — вертикальный драг двигает
  ✓ по строкам, а не скроллит список (источник «сложно достать нижние
  слова»). Скролл во время жеста = edge autoscroll: палец у верхнего/
  нижнего края (46px) → rAF-скролл 2–9px/кадр, строки текут под палец,
  ✓ перепрыгивает; нижний край считается от верха sticky-бара.
- `li::before` = ✓ справа (28% при reveal, яркая+увеличенная на
  armed, стабильная на selected). `li::after` занят «Piilotettu».
- Подсказки: hint «🤫 Pidä + vedä ✓ — valitset sanan», coach v2
  (localStorage `veilCoachV2`, старый ключ заменён).

### Единый info-card + статичная панель
- Канон: `rgba(255,255,255,0.03)` + `1px var(--soft-border)` + `12px`.
  Переведены: `#themeBlock` (фиолет убран), `.rule-instruction`
  (была «дыра»), `.bonus-hint` (был голый текст), `.char-card`,
  `.mode-option`, `.theme-card`, `#ngThemeBlock`, `.theme-rules-badge-btn`.
- **Аккордеон удалён полностью**: панель всегда развёрнута, шеврон
  скрыт, `setTurnPanelCollapsed` — no-op-expand для старых вызовов.
- **Аватар только при taikahahmot**: `hasChar = img ∈ charImages`
  (🐺💀🌿); без персонажа `.player-block.no-avatar` прячет
  `.avatar-wrapper` (debuff-иконки живут только в магии).
- **Один контейнер над колесом**: `.turn-panel` — карточка (chip =
  шапка без рамки, тело без внутренней карты), `#loader{order:2}`.
- `#themeBlock` скрыт и в `words-active` (тема в чипе — дедуп);
  в words-active ужаты паддинги контейнера и панели.

### Сетевой аудит — найденный баг был в тесте
- **verify6 (8 фейлов reconnect/host-migration)**: тест поднимал
  server.js на :8080 с `ARK_GRACE_MS=4000`, но порт занят дев-сервером
  (grace 90с) → DISCONNECTED не приходил. Не баг игры — конфликт
  портов. Разведены порты: verify6→8481, 7→8482, 5→8483, 8→8484,
  9→8485, 14→8486 (14 делил 8478 с 15). После фикса **verify6 44/44**.
- verify11: `li.click()` → `selectWordLi` + `round reset` читал
  `roundDisplay` (теперь ✨-only) → переведён на `chipRound`. 34/34.
- Все клики выбора слова в тестах/шутерах → `window.selectWordLi`.

### Проверка
- verify17 — **56/56** (+14: arm/move/commit, tap off, бэкап-флаг,
  touch-action:none, edge autoscroll + armed-коммит).
- Полная регрессия зелёная: verify 39, 2 — 67, 4 — 21, 5 — 36, 6 — 44,
  7 — 28, 8 — 20, 9 — 26, 10 — 40, 11 — 34, 12 — 41, 13 — 32, 14 — 37,
  15 — 41, 16 — 60, 17 — 56. verify3: 43 + 2 предсуществующих emoji.
- Скриншоты `gest-*.png`: fog+coach, armed ✓ под пальцем, selGlow,
  единый контейнер над колесом, стартовый экран.

## Task 23 — ❓-infoharmonikka, ✨-UI pois, sticky «Näytä sanat», chip-teksti, rumpu-tagit reunojen sisällä

### ❓-infoharmonikka (pelaajat + ohjeet piilossa)
- `#turnChipRow` on nyt staattinen otsikkorivi: `#turnChip` ei ole enää
  nappi (`<button>`→`<div>`; aria/▾-chevron poistettu DOMista).
- `#btnInfoToggle` — pyöreä ❓-ikoni (`aria-expanded`, `aria-controls=
  turnPanelBody`) chip-rivin lopussa; `setTurnPanelCollapsed(c)` on taas
  oikea setteri, ja KAIKKI ohjelmalliset kutsut pitävät paneelin kiinni
  (vapaavalintainen-autoavaus poistettu — käyttäjä halusi aina kiinni).
- Paneelin sisällä: `.player-block` (pistetaulu+avatar), `#themeBlock`,
  `#ruleInstruction` — näkyvät vain ❓-tapilla.
- Huoneen chipit (`roomCodeChip` + `btnLeaveInGame`) siirretty
  `.player-block`ista `#turnChipRow`hin — näkyvät AINA huonepelissä
  ilman harmonikan avausta. Poistu-teksti `🚪🏃 Poistu` (juoksee
  oveen päin). `ngLeaveBtn` sama `🚪🏃`.
- `#turnChipRow` `flex-wrap:wrap` — ei ahtaudu 320px-ruuduilla.

### ✨-bonus-UI poistettu kokonaan (mekaniikka jää — pisteet lasketaan hiljaa)
- Poistettu: `#roundDisplay` (`✨+25p`-rivi), `#bonusHint`, `formatBonusCounter`,
  `hideBonusHint`, `.gold-bonus-badge`-span sanariveiltä, bonusPreview
  `updateGuessedButtonsText`issä (nappi aina `+100p`/`+50p` peruspanos),
  `· ✨+Zp`-loppu `formatRoundCounter`ista (→ `#ngRound` menetti senkin),
  `✨ Bonussana!`-rivi huonesummarystä.
- `.gold-bonus-badge`-CSS + keyframet poistettu; `.bonus-hint`-säännöt pois.
- `currentBonusWords`/`data-rare`/scoring (`p.score += bonusValue`) —
  koskemattomia: bonus maksetaan "hiljaa" kuten käyttäjä valitsi.

### Pienemmät siistimiset
- `.chip-round` menetti pilleri-reunansa — `1/7` on pelkkää tekstiä
  chipin osana (ei nappia napin sisällä).
- `#btnDisplayWords` → `position:fixed; bottom:0` alapalkki (sama
  gradientti/blur/safe-area kuin `.round-controls-block`), kortin
  alareunaan. `#gameContainer:not(.words-active){padding-bottom:80px}`
  varaa tilaa. `#gameContainer`-etuliite (spec 200) voittaa
  "himmennetty nappi" -ryhmän (spec 100) riippumatta järjestyksestä.
- `themeDrum.mount` → `fitTags()`: rAF-luupissa (kunnes pyörä näkyvä)
  mitataan jokaisen `.drum-tag`in leveys ja siirretään ankkuria kohti
  napaa (`Ri = min(R, wheelR−tagW/2−18px)`); liian pitkälle tekstille
  fontti kutistuu (min 7px). Ulkoreuna ei koskaan ylitä vannetta —
  ei leikkaantuvia emojeja/tekstejä. Koskee myös `#ngDrumWheel`-vierasta.
- `#turnChipRow`-pienet chipit: huonekoodi+Poistu aina rivissä.

### Porttijako jatkettu
- `verify5`: spawn ilman `PORT`ia → palvelin ei koskaan noussut 8483:lle
  (meni oletukselle). Lisätty `PORT: '8483'` — syy miksi verify5
  "yhtäkkiä" kaatui.
- `verify3`: `8080`→`8484` + `PORT`-env (riippuvuus dev-palvelimesta pois).

### Проверка
- verify16 — **67/67** (+7 uutta: ❓-toggle, sticky, chipRound-border,
  sparkleGone, tagsInside myös vieraalla).
- verify15 — **42/42**, verify14 — **34/34**, verify4 — **21/21**,
  verify17 — **56/56**, verify11 — **34/34**, verify5 — **36/36**.
- verify3: 43 + samat 2 vanhaa emoji-virhettä (ei regressio,
  oma portti 8484 vahvistaa).
- Kuvat: `gest-wheel-rest-cards.png` (chip+❓+sticky), `gest-info-open.png`
  (pistetaulu auki), `gest-fog.png` (lista+sticky-ohjaimet).

### Task 23 — tarkennus (käyttäjän palaute)
- **❓-nappi ei kuulu rumpunäyttöön**: `#gameContainer:not(.words-active)
  #btnInfoToggle { display:none }` — pyörän aikana ei harmonikkaa.
  Sen sijaan `#chipTurn` näyttää **kompaktin pistetaulun oikeassa
  reunassa** (`▶ Pelaaja 1 0p · Pelaaja 2 0p`, `margin-left:auto`) —
  "mitä pelaajaa" näkyy aina. Sanojen aikana chipTurn piilotetaan
  (`words-active #chipTurn{display:none}`) ja tiedot ovat ❓-takana.
- **`+25p`-boksi palautettu sanariveille** — käyttäjä: sitä ei pitänyt
  poistaa *listasta*. `.gold-bonus-badge`-span + CSS + keyframet +
  `.hidden-words`-himmennyssääntö palautettu. Muut ✨-poistot säilyvät
  (rivi paneelissa, hint, preview, ngRound-loppu, summary-rivi).
- **`🎭 …`-paikkamerkki pois ennen arvontaa**: `chipTheme` on
  `display:none` kun `currentActiveTheme` on tyhjä — ei enää
  "pantomiimi-ikoni ja kaksoispiste" aloitusnäytöllä.
- Testit: verify16 **70/70**, verify15 **43/43**, verify14 **34/34**,
  verify4 **21/21**.

## Task 24 — "Aloita kierros" pois pyörityksestä, luettava pistetaulu, vapaa-kortti

### Ongelmat
- `#btn` ("Aloita kierros") piiloutui vasta `setTimeout`:ssä pyörän
  pysähdyttyä (`rounds.js` ~447) — koko pyörityksen (~2 s) + lepohetken
  alussa napin teksti roikkui pyörän alla.
- Kompakti pistetaulu `Pelaaja 1 200p` — nimen numero ja pisteet
  sulautuivat yhdeksi luvuksi ("1 200").
- **vapaavalintainen**: ohje "Keksi oma sana…" oli ❓-harmonikan sisällä,
  mutta ❓ piilotetaan rumpunäytöllä — eikä `words-active` koskaan
  tule → ohje oli tavoittamaton koko vuoron ajan.
- `#vapaaRuleCard` tarvitsi flex-orderin: `#gameContainer` on
  order-järjestetty (paneli 1 → loader 2 → spells 3 → wordList 5 →
  controls 6 → #btn 7) — order:0-elementti hyppäsi näytön yläreunaan.

### Toteutus
- `js/rounds.js`: `btn.style.display='none'` siirretty `randomizeTheme`n
  alkuun (heti kun `drumAnim` näytetään) — nappi↔pyörä-vaihto samassa
  framessa, ei nytkähdystä. Nappi palaa vain vuoron päättyessä.
- `js/network.js:576`: `netRefreshGuesserScreen` sai palauttaa napin
  kesken pyörityksen (`currentActiveTheme` vielä tyhjä). Lisätty
  `drumUp`-vahti: `btn` piilossa kun `currentActiveTheme` TAI rumpu näkyy.
- `js/ui.js`: `#chipTurn` rakennetaan DOM-solmuina (ei innerHTML —
  nimet ovat käyttäjän syöttämiä): `▶ Pelaaja 1: ` +
  `<b class="chip-score">0p</b>`. Kaksoispiste erottaa nimen numeron.
- `styles.css`: `.chip-score { color:var(--gold); font-weight:700 }`;
  `#vapaaRuleCard { order:4 }` — pyörän alla, nappien (order 6) yläpuolella.
- `index.html`: `#vapaaRuleCard` (`.rule-instruction`-info-kortti) —
  täytetään vain vapaavalintainen-haarassa, piilotetaan kaikissa
  reset-poluissa (`_vrc0/_vrc1/_vrc2`).

### Tarkistus
- verify16 — **79/79** (+9: nappi pois spinin ajaksi JA levossa,
  `Nimi: Np`-muoto, kultainen chip-score, vapaa-kortti näkyy/sijainti
  pyörän alla/poistuu luovutuksessa, ei napin duplikaattia).
- verify17 — **56/56**, verify15 — **43/43**, verify14 — **34/34**,
  verify4 — **21/21**.
- Kuvat: `vapaa-spin.png` (ei nappia pyörityksessä), `vapaa-rest.png`
  (pyörä → vapaa-kortti → Arvattu/Luovutan-napit).

## Task 25 — способности над колесом (order-фикс пилюли)

### Ongelma
`#btnDisplayWords` (`fixed; bottom:60px; z-20`) перекрывал кнопки
фазы-1 спеллов: `#spellContainer` имел `order:3` и рендерился ПОД
колесом (order 2) — прямо в зону пилюли. Измерено: spell row 720–765px
vs pill 722–784px, `elementFromPoint` → пилюля.

### Toteutus
- `styles.css`: `#spellContainer { order: 3 → 1 }` — зона входит в
  «над колесом»-группу; по DOM-порядку (turnPanel → themeBlock →
  spellContainer) встаёт ровно над `#loader`. Колесо не дёргается
  при появлении спеллов (`#loader { margin-top:auto }`).
- Инвариант зафиксирован комментарием: spellContainer должен быть в
  DOM после themeBlock, иначе order:1 не сработает.
- Новая order-карта: paneli/theme/spells 1 → loader 2 → vapaa 4 →
  wordList 5 → controls 6 → #btn 7.
- **Встречный фикс (pre-existing)**: `#selGlow` измерял `li` в момент
  class-мутации — `transition: all .2s` ещё шёл → hehku vanheni 2px.
  `updateSelGlow` вызывается теперь и по `transitionend` выбранной
  строки (`initPrivacyMask`); раньше verify17 падал детерминированно
  (`h=123 vs 121`), теперь 56/56.

### Tarkistus
- verify19 — **21/21** (хит-тесты спеллов над колесом, пилюля
  кликабельна над нижним краем, фаза 2, без-магии, комната).
- Регрессия: verify16 — **80/80**, verify17 — **56/56**,
  verify18 — **34/34**.

## Task 26 — kortti-ele: ✓ pois, violetti kortti sormen alla, pehmeä sumu
- ✓-rasti poistettu kokonaan (pseudo-elementit, padding-varaus). Sen
  tilalla `li.check-armed` = violetti "valittu kortti" (paletti
  `#9b59b6`, sama kuin `.char-card.selected-second`); `selected-word`
  ja `#selGlow` samassa violetissa — yksi visuaalinen kieli.
- Valinta VAIN vapautuksessa (touchend/mouseup) — entinen malli säilyi.
- `touch-action:none` säilyy: natiivi veto-scroll on pois päältä.
  Ylösvieritys onnistuu nyt **työntöskrollilla**: kun osoitettu rivi
  on näkyvän listan reunalla ja sormi työntää ohi, lista vierii
  sormen tahdissa (`aimMove` dy-siirto scrollTop:iin) + entinen
  reunavyöhykkeen auto-scroll toimii yhä.
- Verho ei katoa enää välittömästi vapautuksen jälkeen:
  `.mask-on:not(.revealing)` → `opacity:1; transition: 1.8s` —
  sumu drippaa takaisin tyylikkäästi ~2 s aikana. Reveal on edelleen
  välitön (`opacity:0 + transition:none`).
- **Inline-style bugi (root cause)**: `selectWordLi` kirjoitti
  `el.style.border = 'var(--soft-border)' !important` JOKAISEEN li:hin
  ja `var(--gold)` valittuun — inline !important voittaa kaiken CSS:n,
  joten armed-kortti näytti kultaiselta. Nyt resetointi
  `removeProperty`:llä; värit tulevat luokista.
- `.check-armed { transition:none }` — kortti napsahtaa sormen alle
  välittömästi (li `transition:all` viivytti border-väriä ~0.2 s).
- coach-avain V2→V3 (teksti uusittu, näkyy kerran uudestaan).
- Hintit: "Pidä + vedä — vapauta valitaksesi" / "Vedä sanalle —
  vapauta valitaksesi" (ei ✓-mainintaa).

### Tarkistus
- verify17 — **58/58** (+2: push-scroll ylös, violetti kortti / ei ✓).
- verify16 — **80/80**, verify15 — **43/43**, verify14 — **34/34**,
  verify4 — **21/21**.
- Kuvat: `gest-armed-card.png` (violetti kortti sormen alla),
  `gest-selected-glow.png` (violetti hehku + sumu himmenee takaisin).
