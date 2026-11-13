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
