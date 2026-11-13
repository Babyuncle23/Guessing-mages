# Мегаплан: компактный UX списка слов — гармошка, полный экран, большое раскрытие

Дата: после privacy-вуали (Task 13) и динамической бонусной экономики (Task 14). Контекст: текущее однострочное «окошко под пальцем» слишком маленькое, над словами слишком много интерфейса, кнопка «Piilota sanat» дублирует вуаль. Цель — максимум места словам и удобное раскрытие.

## Решения пользователя (уточняющие вопросы)

- Раскрытие пальцем: **полоса + удержание = весь список** (быстрый свайп = адаптивная полоса ~1.2 строки; hold 350мс = весь список пока держишь).
- Рисовалка/эмодзи: **кнопка 🎨 рядом с чипом** — видна только для piirtäminen / näkymätön muste / vain emojit.
- Видимое над словами: **чип + тонкий таймер-бар + кнопки заклинаний фазы 2 + баннер проклятия + roundControls**. Под гармошку: скорборд (`#playerTurn`), большая карточка темы (`#themeBlock`), инструкция (`#ruleInstruction`), подсказка бонусов (`#bonusHint`).
- Формат: **этот мегаплан + реализация**.

## Что прячем / не прячем под гармошкой — обоснование

| Блок | Куда | Почему |
|---|---|---|
| `#turnTimer` + `turnTimerSec` | Виден | Время — активный стресс-индикатор хода, нельзя прятать |
| `#spellContainer` (фаза 2) | Виден | Заклинания — интерактивные действия во время слов |
| `#curseBanner` | Виден | Транзиентный алерт, важно не пропустить |
| `#roundControls` | Виден | Обязательные действия завершения хода |
| `#btnDisplayWords` (до открытия) | Виден | CTA «открыть слова»; после открытия исчезает полностью |
| Чип + 🎨-пилюля | Виден | Компактное условие (emoji+тема+игрок) — то, что просили оставить |
| `#playerTurn` | Гармошка | Счёт/аватар/код комнаты — справочно, раз в ход не нужно |
| `#themeBlock` | Гармошка | Большая карточка нужна при раскрытии темы; во время слов — нет |
| `#ruleInstruction` | Гармошка | Инструкцию читают один раз; для draw/emoji заменяет 🎨-пилюля |
| `#bonusHint` | Гармошка | Бонусные ✨ видны бейджами на самих словах |

## Отвергнутые/отложенные варианты

- «Только удержание = весь список» — отвергнуто: без полосы нельзя читать часть списка, не открывая всё.
- «Тап по чипу открывает модалку» — отвергнуто: одна зона = две функции, двусмысленно.
- Оставить `playerTurn` видимым — отвергнуто пользователем (набор «рекомендованный»).

## Архитектурные факты (для реализации)

- `#btnDisplayWords` = одна кнопка: до открытия «Näytä sanat» (`switchToWords`), после — «🙈 Piilota sanat» (`toggleWordVisibility`). Убираем только второе состояние — CTA остаётся.
- `hidden-words` + `isWordListHidden` держат модалки (drawing/emoji). Сейчас после закрытия модалки слова скрыты до нажатия кнопки → при удалении кнопки нужен **авто-анхайд в closeModal**.
- `#themeBlock` кликабелен → открывает модалку (main.js:388). Под гармошкой недоступен → заменяется 🎨-пилюлей (та же логика).
- `network.js:1078` rejoin explainer показывает «Piilota sanat» → display:none.
- Flex order: turnTimer(0) → turnPanel(1) → spellContainer(3) → btnDisplayWords(4) → wordListWrap(5) → roundControls(6) → btn(7).
- `#wordList` конфликты: `max-height:210px` (моб.) / `42vh` (позднее) / `display:flex` — под `.words-active` всё переопределяем на fill.
- Маска: `--my` + жёсткие ±24/±36px → заменить на `var(--wh)`; `.revealing` → mask/grain off.
- `#btnDisplayWords` имеет глобальный `button { margin-top:8px }` и `@media 768px` blanket-правила — новым кнопкам (chip, 🎨) могут понадобиться `!important`-исключения.

## Реализация (кратко)

1. `index.html`: `#turnPanel` > `#turnChipRow` (`#turnChip` + `#btnToolCanvas`) + `#turnPanelBody` (4 блока); хинт маски обновлён.
2. `styles.css`: accordion + chip + pill; `.words-active` fill (`min-height:100dvh`, `flex:1`, `li flex:1 1 0 / min-height:44px`); `--wh` + `.revealing`; компактность body.
3. `js/ui.js`: `setTurnPanelCollapsed`, chip-текст, `updateToolPill`, `--wh` по `li.offsetHeight`, hold-350мс → `.revealing`, emoji-close unhide.
4. `js/rounds.js`: switchToWords → кнопка off + collapse + pill; reset → expand.
5. `js/main.js`: кнопка = open-only; `#btnToolCanvas` click → модалка.
6. `js/drawing.js` + `js/network.js`: авто-анхайд / rejoin-правки.

## Проверка — verify15.js

См. план: Piilota off, collapsed default, chip content, 🎨-пилюля по теме, auto-unhide, hold=reveal-all, адаптивное окно, высота списка ≥60% контейнера / все слова без скролла при 390×844, скролл-фолбэк + трекинг, выбор слова, a11y, room explainer/guesser. Правка verify2: «emoji modal closed» → auto-unhide (намеренная смена поведения).

## Результат (verify15.js — 41/41, регрессия 309 PASS / 0 FAIL)

- Гармошка `#turnPanel` (order:1): чип `emoji+ТЕМА · ▶ игрок ▾` + `#turnPanelBody`
  (playerTurn + themeBlock + bonusHint + ruleInstruction), collapsed на
  `switchToWords`, expanded на раздаче темы.
- «Piilota sanat» удалён полностью; модалки сами снимают `hidden-words` при
  закрытии (`restoreHiddenWords`).
- Список: `.words-active` → `min-height:100dvh-34px`, li `flex:1 1 0` — на
  390×844 все 5 слов видны без скролла (строки ~123px); переполнение →
  page-scroll (маска едет со списком).
- Раскрытие: `--wh = liH×0.6` (полоса ~1.2 строки) + hold 350мс → `.revealing`
  (весь список) до отпускания; работает и мышью.
- 🎨-пилюля `#btnToolCanvas` — только piirtäminen/emoji темы, открывает модалку.
- Пойманы: глобальный `button{width:100%}` раздувал пилюлю (`width:auto`),
  замер `--wh` до конца анимации гармошки (rAF + debounce 400мс),
  `themeDrawingHint` создаётся после render → `updateToolPill` в конце
  `switchToWords`.
- Скриншоты: `wl-collapsed`, `wl-expanded`, `wl-strip-window`,
  `wl-reveal-all`, `wl-tool-pill`.

## Статус
✅ Реализовано и проверено

---

# Task 16: остановившееся колесо на фазе темы

Запрос: «на этой фазе показывало просто где остановилась колесо и оно
убиралось бы только тогда когда игрок нажимал бы näytä sanat».

## Решения (уточняющие вопросы)
- Экран фазы: **чип + остановившееся колесо + кнопка «Näytä sanat»**
  (пользователь делегировал выбор — чип оставлен: тема+игрок+тап=скорборд).
- Комната: **зеркалить** — `#ngDrum` у гостя висит до `WORDS_OPEN`,
  затем `#ngThemeBlock` (карточка) как раньше во время слов.
- `vapaavalintainen`: **колесо тоже остаётся** (списка нет — висит до
  конца хода; панель разворачивается, т.к. инструкция обязательна).

## Реализация
- `rounds.js`: `#loader` не прячется после лендинга; `drum-rest` (выкл.
  pulse) + caption=тема; collapse при спине; expand только для
  vapaavalintainen; `switchToWords`/`endRound` скрывают+destroy.
- `network.js`: `_ngWheelRest`-флаг — `ngApplyTheme` прячет карточку пока
  колесо на сцене; `WORDS_OPEN` меняет колесо на карточку; rejoin →
  `mount`+`spinTo(0)` замороженное колесо.
- Попутный фикс: `else` затирал инструкцию vapaavalintainen.

## Проверка
verify16.js — 37/37; verify15 — 41/41 (ожидание expanded→collapsed,
намеренная смена); регрессия 268 PASS / 0 FAIL.
Скриншоты `wr-wheel-rest.png`, `wr-words-open.png` (`shoot-wr.js`).

## Статус
✅ Реализовано и проверено

---

# Task 17: «немое» колесо за правым краем + аудит дублей

Запрос: убрать текст с колеса (хаб+подпись), сделать его больше и частично
за правым краем; выпавший вариант виден на колесе без текста; заодно аудит
дублей (на скрине «perusvaihtoehto» ×3).

## Решения пользователя
- Подсветка: **клин + эмодзи с кольцом** (оба).
- Текст темы: **только в чипе**.
- Вылет: **~75% колеса видно**.

## Реализация
- `.theme-drum`: `min(150vw,500px)` + `margin-right:-12%` → обрезка
  `.container{overflow:hidden}`; указатель на левом крае (9 часов, `▶`).
- `themeDrum`: `POINTER_DEG=270` (themeAt/spinTo/land); `finish()` →
  `.theme-drum-wedge` (conic-gradient по a0..a1) + `.winner` на эмодзи
  (52px + кольцо), остальные `.landed` → .35.
- Хаб и `.drum-caption` → `display:none`; JS caption-записи удалены.
- Математика: `need = norm360(270 - point - angle)`; `themeAt` —
  `norm360(270 - angle)`; wedge рисуется после `applyAngle` (сектор под
  указателем = winner — verify8 подтверждает).

## Аудит дублей (итог)
Единственное нарушение — имя темы ×4 (хаб/подпись/чип/карточка):
исправлено этим таском. Остальные «повторы» — паттерн summary↔detail
(чип↔карточка, чип↔скорборд, бейджи↔bonusHint) — осознанно оставлены.

## Проверка
verify16 — 46/46 (bleed, hub/caption hidden, wedge/winner, указатель);
verify8 — 20/20 (формула 270° + гость до WORDS_OPEN); регрессия 264 PASS / 0 FAIL.
Скриншоты `wr-wheel-rest.png`, `wr-wedge-multi.png`, `wr-words-open.png`.

## Статус
✅ Реализовано и проверено

## Task 18 (решения пользователя + правки по ходу)

### Принято
| Фича | Решение |
|---|---|
| Sticky-кнопки | Панель поверх списка — `position:fixed` у низа при `.words-active` |
| Защита сдачи | Удержание 1 с + `gp-fill`; быстрый тап → `.hold-hint`, не сдача |
| Лок слова | **Только свечение**: `#selGlow` (radial-blur, z:4) над туманом — текст НЕ читается |
| Раунд в чипе | Бейдж `#chipRound` «3/7» слева |
| Онбординг | Одно облачко `#veilCoach` один раз (`localStorage.veilCoachV1`) |
| Хинт вуали | `.hint-dim` → opacity .4 после первого жеста |
| Жест вуали | **Смена механики**: убраны полоса/`--my`/`--wh`/hold-350 ms. Коснулся/навёл = весь список, убрал = туман |

### Отклонено
- Handoff-строка «Anna puhelin ▶ X» между ходами
- ⚙-настройки (звук/таймер) в чип-ряду

### Приватность
Любое касание открывает весь список — осознанный компромисс (игра на
честности, защита от случайного взгляда, не от подглядывания). selGlow
показывает только ПОЗИЦИЮ выбранной строки, не текст.

---

# Task 19: радиальные подписи на секторах (эмодзи поменьше + текст)

Запрос: «хочу чтобы там где эмоджи был и текст, а эмодзи поменьше»;
плюс «не надо странного кольца — достаточно подсветки».

## Решения пользователя
- Ориентация текста: **радиально вдоль спицы** (как на настоящих колесах).
- Подписи на **всех** секторах; у победителя — золотая + горизонтальная.
- Кольцо `.winner::after` — **удалить**; акцент только клин-подсветкой.

## Ключевая математика
Трансформ якоря `rotate(mid) translateY(-R) rotate(90°)`: повороты
складываются (`mid+90`), +X тега лежит вдоль спицы rim→hub. При лендинге
`θ = 270 − point` → экранный поворот подписи победителя = `point − mid`
(≈0 для узких секторов). Для `span ≥ 120°` `aimPoint` = середина сектора
→ подпись строго горизонтальна; иначе — случайная точка (реализм).

## Итог
Эмодзи 18–24px + `drum-label` 9–12px uppercase вдоль спицы; у победителя
золотая подпись + emoji 30px, кольца нет. Текст темы теперь: чип + сектор
(дубль приемлем — сектор-лейбл само колесо). verify16 52/52.

---

# Task 20: ehto ×3 — тема только на колесе во время wheel-rest

После Task 19 имя темы дублировалось: сектор-победитель + чип +
«Selityksen ehto» в карточке. Решение пользователя: **пока колесо на
экране — тема только на нём** (колесо и есть объявление результата).

## Реализация
Чистый CSS: `body:has(.drum-rest) #chipTheme / #themeBlock → display:none`.
Снятие `.drum-rest` возвращает всё само — ни одной строки JS.
Pelaaja 1 ×3 (чип/Vuoro/скорборд) — **оставлено осознанно**: summary↔detail.

## Проверка
verify16 58/58 (новые проверки дубля), verify15 41, verify17 42, verify8 20.
Скриншоты wr-wheel-rest.png / wr-wheel-rest-expanded.png — тема ×1.

---

# Task 21: дедуп имени/раунда везде + стрелка за ободом

Ранее (Task 20) Pelaaja ×3 оставили осознанно — пользователь пересмотрел:
«везде должно быть только по одному».

## Каноничные места
| Инфо | Единственное место |
|---|---|
| Имя игрока + чей ход | скорборд `▶` (`scoreDisplay` / `ngScore`) |
| Раунд `X/Y` | `#chipRound` (локал) / `#ngRound` (гость, полный формат) |
| Бонус-ставка | `✨+Zp` в панели (`#roundDisplay`) и `#ngRound` |
| Тема (wheel-rest) | сектор-победитель на колесе |
| Аватар/дебаффы | левый блок панели (без текста) |

Удалено: `#chipTurn`, `Vuoro: имя`, `Kierros:` в панели, `#ngExplainer`.
Стрелка указателя — за ободом (`left:-12px`): эмодзи/подписи не перекрываются.

## Проверка
verify16 61/61, verify15 41, verify14 37, verify17 42, verify8 20,
verify3 43+2(старое). Скриншоты обновлены.

---

# Task 22: ✓-жест выбора, единые карточки, статичная панель, сетевой аудит

## ✓-жест (выбор слова)
- Тап-выбор **отключён** (`window.TAP_SELECT_ENABLED=false`), код
  оставлен как бэкап — вернуть = поставить `true` (файл или консоль).
- Жест: зажал → весь список + ✓ на строке под пальцем → ведёшь →
  ✓ перепрыгивает → отпустил на строке = выбор. Отмена: увести палец
  со строк/касание отменено.
- **`touch-action:none`**: раньше вертикальный драг скроллил список
  (контент едет с пальцем — ✓ стоит на месте). Теперь ✓ ездит по
  строкам; скролл — **edge autoscroll**: палец у края → список течёт
  под палец, нижние слова достижимы одним жестом.
- Галочки: все строки 28% ✓ при reveal (зоны выбора видны), armed —
  яркая увеличенная ✓ + золотой фон, selected — стабильная ✓.

## Единый визуал (infocard)
Канон `0.03/soft-border/12px` применён ко всем: themeBlock (фиолет убран),
ruleInstruction (была дыра), bonusHint (голый текст), char/theme/mode
карточки, ngThemeBlock, i-бейдж. Стартовый экран однороден.

## Панель: без аккордеона, аватар только магам, над колесом
- Аккордеон удалён — панель всегда открыта, шеврон скрыт.
- `.player-block.no-avatar` прячет `.avatar-wrapper` если `img ∉ charImages`
  (дебаффы — только магия, прячутся вместе с блоком).
- `.turn-panel` — единая карточка (chip=шапка, тело без внутренних карт),
  `#loader{order:2}` → панель всегда над колесом.
- `#themeBlock` скрыт и во время слов (тема в чипе).

## Сетевой аудит
- verify6 падал 8/44 — **не игра, а конфликт портов**: тест ждал grace 4с,
  но :8080 занят дев-сервером (grace 90с). Разведены порты 8481-8486.
- Lobby/join/roll/wheel-mirror/WORDS_OPEN/WORD_LOCKED/drawing+emoji
  stream/scoring/summary/next-turn/reconnect/grace-skip/host-migration —
  всё проверено автотестами; слова гостям не утекают (только lock-флаг).

## Проверка
Все наборы зелёные (см. AUDIT Task 22); verify3 — 43 + 2 старых
emoji-фейла (дрейф, не регрессия).

# Task 23: ❓-гармошка, весь ✨-UI убран, sticky «Näytä sanat», chip-текст, теги в ободе

## ❓-гармошка (имена игроков + объяснения скрыты)
- `#turnChip` — `<div>` (не кнопка): aria и шеврон удалены.
- `#btnInfoToggle` — круглый `?` (`aria-expanded`/`aria-controls`),
  `setTurnPanelCollapsed` — настоящий сеттер; все программные вызовы
  держат панель **закрытой** (vapaavalintainen-авто-открытие убрано).
- Под гармошкой: `.player-block` (счёт+аватар), `#themeBlock`, `#ruleInstruction`.
- `roomCodeChip`+`btnLeaveInGame` вынесены в `#turnChipRow` — видимы
  без открытия гармошки. Текст `🚪🏃 Poistu` (бежит К двери).
  `ngLeaveBtn` → `🚪🏃`.

## Весь ✨-UI удалён (механика жива — молча)
- `#roundDisplay` (✨+25p), `#bonusHint`, `formatBonusCounter`,
  `hideBonusHint`, `.gold-bonus-badge` со слов, bonusPreview на кнопке,
  `· ✨+Zp` в formatRoundCounter (ngRound тоже), `✨ Bonussana!` в summary.
- `currentBonusWords`/`data-rare`/начисление очков — не тронуты.

## Мелочи
- `.chip-round` без рамки-пилюли — `1/7` просто текст.
- `#btnDisplayWords` — клейкий нижний бар (fixed, градиент+blur+safe-area);
  `#gameContainer:not(.words-active)` получает `padding-bottom:80px`.
- `themeDrum.mount.fitTags()` — тег сектора зажат внутрь обода:
  `Ri ≤ wheelR−tagW/2−18px`, длинные имена ужимают шрифт (min 7px).
  Покрывает и гостевое `#ngDrumWheel`.

## Порты тестов
- verify5: spawn без `PORT` — сервер никогда не вставал на 8483 → env fix.
- verify3: 8080→8484 — независимость от dev-сервера.

## Проверка
verify16 **67/67** · 15 **42** · 14 **34** · 4 **21** · 17 **56** ·
11 **34** · 5 **36**; verify3: 43 + 2 старых emoji (не регрессия).

### Task 23 — уточнение (фидбек)
- **❓ убран с экрана колеса**: `#gameContainer:not(.words-active)
  #btnInfoToggle{display:none}` — во время колеса гармошки нет.
  Вместо неё `#chipTurn` показывает **компактный счёт справа**
  (`▶ Pelaaja 1 0p · Pelaaja 2 0p`, `margin-left:auto`) — видно чей ход.
  Во время слов chipTurn скрыт, данные под ❓.
- **`+25p`-бейдж возвращён на строки слов** — из списка убирать не надо
  было. CSS + keyframes + hidden-words-гашение восстановлены. Остальные
  ✨-удаления сохранены (строка в панели, хинт, превью, ngRound, summary).
- **`🎭 …` плейсхолдер убран**: `chipTheme` скрыт пока нет
  `currentActiveTheme` — стартовый экран без лишнего эмодзи.
- Тесты: verify16 **70/70**, verify15 **43/43**, verify14 **34/34**,
  verify4 **21/21**.

### Task 24 — кнопка при спине, счёт с двоеточием, vapaa-карточка
- **«Aloita kierros» во время спина**: `#btn` скрывался только после
  остановки колеса (setTimeout) — теперь `btn.style.display='none'`
  сразу в начале `randomizeTheme` (rounds.js ~393): swap кнопка→колесо
  в одном кадре. В `network.js:576` добавлен `drumUp`-guard — раньше
  `netRefreshGuesserScreen` мог вернуть кнопку в середине спина.
- **Счёт в чипе**: `Pelaaja 1 200p` читался как «1 200». Теперь
  `▶ Pelaaja 1: ` + золотой `<b class="chip-score">200p</b>` —
  DOM-узлами (имена пользовательские, без innerHTML).
- **vapaavalintainen**: инструкция «keksi oma sana» была в ❓-гармошке,
  но ❓ скрыт на экране колеса, а `words-active` для этой темы не
  наступает — инструкция была недостижима весь ход. Добавлена
  `#vapaaRuleCard` (info-card) — показывается только для этой темы.
  **order:4** — flex-карта контейнера: panel(1)→loader(2)→spells(3)→
  карточка(4)→wordList(5)→controls(6)→btn(7): под колесом, над
  кнопками Arvattu/Luovutan.
- Тесты: verify16 **79/79** (+9 чеков), verify17 **56/56**,
  verify15 **43/43**, verify14 **34/34**, verify4 **21/21**.
- Скрины: `audit/vapaa-spin.png` (спин без кнопки),
  `vapaa-rest.png` (колесо→карточка→кнопки).

### Task 24b — «Näytä sanat» als schwebende Pille
- Problem: fixierte Vollbreiten-Bar am unteren Rand (`bottom:0`) →
  Daumen/Jest-Gestenzone, unbequem und optisch am Rand geklebt.
- Jetzt: `bottom:calc(60px+safe-area)`, `border-radius:999px`,
  `width:calc(100%-40px)`, Gold-Border + Schatten+Blur — schwebt
  ~25px über dem unteren Radbogen (margin-top:auto drückt das Rad
  ans Containerende), voll sichtbar und nicht vom Rand abgeschnitten.
- Reserve-Padding 80→20px, damit das Rad unter die Pille reichen kann.
- verify16 weiterhin **79/79** (`btnPos=fixed` unverändert).
- Screenshot: `audit/pill-rest.png`.
