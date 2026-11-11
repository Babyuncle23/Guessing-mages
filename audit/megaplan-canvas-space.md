# Мегаплан: больше места канвасу рисования, меньше — кнопкам управления

Дата: после megaplan-mobile-width. Контекст: пользователь попросил отдать канвасу больше высоты за счёт кнопок управления. Выбранный вариант: компактные кнопки **с подписями**, умеренное ужатие нижних кнопок, те же стили для emoji-модалки.

## Диагноз (замерено puppeteer на 360×800)

`#drawingModalOverlay` — fullscreen flex-column: `.modal-header-container` → `#drawingModalCanvas` (`flex:1`) → `.modal-bottom-row`.

| Элемент | Было | Причина |
|---|---|---|
| padding overlay + gaps | ~30px | `padding:10px`, `gap:5px`, `margin-bottom:2px` |
| хедер | **~150px** | 5 кнопок с подписями + `min-width:70px` + `flex-wrap:wrap` → **3 ряда** |
| скрытый отступ | +8px/ряд | базовый `button { margin-top:8px }` (styles.css:308) добивал каждый ряд и нижние кнопки |
| canvas | ~555px | остаток |
| нижний ряд | ~54px | `padding:10px`, `font-size:12px` |

### Главный подводный камень

В `@media (max-width: 768px)` есть blanket-правило (styles.css:918): `button, .spell-btn, .start-game-btn { padding: 10px 14px !important; font-size: 13.5px !important }` — оно **перебивает любые инлайн-стили** кнопок на мобильных. Компактные инлайн-значения работали только ≥769px (в landscape 780×360 кнопки сразу стали 22px). Без `!important`-исключения ужать кнопки на телефоне невозможно — только через CSS с бо́льшей специфичностью.

## Реализация

### 1. styles.css
- `.modal-header-container button, .modal-bottom-row > button { margin-top: 0 }` (~строка 1428) — убирает скрытые 8px от базового `button`.
- Внутри `@media (max-width: 768px)` сразу после blanket-правила — исключение для модалок: `.modal-tools-row > button, .modal-header-container > button { padding: 5px 9px !important; font-size: 10px !important }` и `.modal-bottom-row > button { padding: 7px 8px !important; font-size: 11px !important }`. Специфичность (0,1,1) > (0,0,1) — исключение побеждает.

### 2. index.html — `#drawingModalOverlay` (671–704)
- Overlay: `padding 10→6px`, `gap 5→3px`; хедер `margin-bottom 2→0`, `gap 8→6`; tools-row `gap 5→4`.
- Кнопки инструментов (`btnPeekDraw`, `btnToolDraw`, `btnToolErase`, `btnUndoStroke`, `btnClearModalCanvas`): `padding → 5px 9–10px`, `font-size → 10px`, убран `min-width:70px` у Kynä/Kumi.
- `btnCloseModalCanvasX`: 28→26px, font 12→11px.
- Нижние кнопки (`btnModalGuessed/Stolen/GiveUp`): `padding 10px→7px 8px`, `font 12→11px`. Тексты и id не тронуты (verify2 чекает `Arvattu oikein \(\+\d+p\)`).

### 3. index.html — `#emojiModalOverlay` (705–728)
- Те же compact-значения overlay/хедера/низа; заголовок «Vain Emojit» 16→14px; `btnPeekEmoji` и X — как в рисовалке.
- `#emojiInputArea`: `height:73vh; flex-shrink:0` → `flex:1; min-height:0` — как `#drawingModalCanvas` в megaplan-mobile-width; иначе освободившееся место уходило в пустые отступы (justify-content: space-between).

### Landscape
Блок `@media (orientation: landscape) and (max-height: 500px)` не трогали — его `!important`-значения применяются поверх новых и дают ещё компактнее.

## Проверка (verify9.js — 26/26 PASS)

| Метрика | Было | Стало |
|---|---|---|
| Хедер 360×800 | ~150px (3 ряда) | **56px (2 ряда)** |
| Canvas 360×800 | ~555px | **697px (+142, 87% экрана)** |
| Низ 360×800 | ~54px | 29px |
| Хедер 320×720 | ~128px | 56px → canvas 617px |
| Landscape 780×360 | — | хедер 26px (1 ряд), canvas 292px |
| Emoji 360×800 | textarea 73vh | **727px (flex-fill)** |

- [x] Все кнопки внутри вьюпорта, touch-targets ≥24px, нет горизонтального overflow на 320/360/780
- [x] Штрих рисуется, undo стирает, переключение ластика работает, буфер canvas = css-размеру
- [x] Скриншоты: `cv-draw-360.png`, `cv-draw-320.png`, `cv-emoji-360.png`, `cv-draw-land-780.png`
- [x] Регрессия: verify.js 39 + verify2.js 67 + verify3.js 45 + verify4.js 21 = **172 PASS**

## Заметки
- Touch-targets инструментов ~25–26px — ниже WCAG 44px, но сознательный трейд-офф ради высоты канваса (подтверждён пользователем); нижние кнопки ~29px.
- В игре текст `btnModalGuessed` получает суффикс `(+100p)` → нижний ряд ~42px на 2 строках — всё равно компактнее прежних ~54.
- На ≥769px действуют инлайн-стили (те же значения) — десктоп консистентен.

## Статус
✅ Реализовано и проверено
