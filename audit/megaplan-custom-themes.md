# Мегаплан: свои условия (Omat ehdot) — пользовательские темы в пуле условий

Дата: после megaplan-canvas-space. Контекст: пользователь попросил возможность
добавлять свои условия через настройки в общий пул условий. Решения,
подтверждённые пользователем: поля = **имя + правило + опциональный эмодзи**;
кастомные условия — текстовые устные правила (как `vastakohdan kautta`), без
особых механик; источник истины в комнате — **хост**; удаление — `✕` на
карточке **без подтверждения**.

## Диагноз

Система тем оказалась почти plug-and-play:

- `js/themes.js`: `themes[]` (имена), `themeImages{}` (эмодзи), `themeDescriptions{}` (правила) — мутабельные глобалы.
- `js/rounds.js`: веса = DOM-инпуты `theme-weight-<slug>`; `buildWeightedThemePool` читает `getThemeWeightsFromUI()` по `themes[]`.
- `js/storage.js`: `collectSettings` автособирает все `.theme-weight-input` по id; restore ставит значения по id.
- `js/network.js`: SETTINGS-пакет собирается тем же `.theme-weight-input`-сканом; сервер — слепой ретранслятор.
- Угадывающие получают `ngTheme/ngThemeEmoji/ngThemeRule` из тех же мап → кастомная тема отображается везде бесплатно.

**Чего не хватало:** механизма динамического добавления карточек — биндинги
степперов и «Säännöt (?)» были замкнуты на статичный `querySelectorAll` при
`DOMContentLoaded`, slug-форматтер жил локально в `getThemeWeightsFromUI`.

## Реализация

### 1. js/rounds.js — рефакторинг под динамические карты
- `window.themeSlug(t)` — единый slug (lowercase → whitespace→`-` → `ä→a`, `ö→o`);
  им пользуются и встроенные, и кастомные карты — совпадение обязательно.
- `window.bindThemeStepperCard(card)` — весь степпер-биндинг одной карты
  (−/+/input/blur, active/disabled, статус категории).
- `window.bindThemeHelpBtn(btn)` — открытие `spellHelpModal` по `data-theme-key`.
- `initializeThemeWeightSteppers` теперь вызывает хелперы; инициализация
  `dataset.defaultValue` для встроенных берётся из `themeWeights` (как раньше).
- **`randomizeTheme`**: если выпала кастомная тема и нет активных заклинаний —
  `#ruleInstruction` показывает правило (`textContent`, без innerHTML).
- **Фикс по ходу**: клики −/+ и blur-коррекция теперь диспатчат
  `new Event('input', {bubbles:true})` — раньше делегированный save/broadcast
  (storage.js:136, network.js:1248) не ловил степперы вовсе (веса степперами
  не персистились и не синкались — скрытый баг и у встроенных тем).

### 2. js/customthemes.js (новый)
`window.customThemesApi`:
- `addTheme({name, desc, emoji})` — валидация (имя ≥2, ≤15 кастомных,
  case-insensitive дубликаты и slug-коллизии с встроенными → отказ,
  `forbiddenSet`), регистрация в `themes/themeImages/themeDescriptions`,
  рендер карты, `playClickSound`, `saveGameSettings` + `netBroadcastSettings`.
- `removeTheme(name)` — дерегистрация + удаление карты + save/broadcast.
- `setAll(list)` — полная замена (localStorage restore и SETTINGS-синк).
- `has(name)`, `list()` — для randomizeTheme и collectSettings.
- Санитизация: имя — только `\p{L}\p{N} -` (≤24); desc ≤160, `<>` вырезаются
  (рендерится через innerHTML в help-модале — закрывает XSS-вектор, в т.ч.
  от чужого хоста по сети); emoji — первый графем кластер (Intl.Segmenter),
  дефолт `✨`.
- `refreshAccordion()` — пересчёт `maxHeight` открытого аккордеона при
  add/remove/setAll, иначе контент обрезался бы (аккордеоны работают через
  `.open` + maxHeight, не display).
- Форма биндится на `DOMContentLoaded`: click + Enter в любом поле.

### 3. index.html
- Аккордеон **«✨ Omat ehdot»** после «Rajoitukset»: форма (emoji-поле 46px,
  имя, правило, кнопка `+ Lisää ehto`, `#customThemeError`) +
  `#customThemesGrid` (тот же `.themes-grid` → карты pixel-идентичны).
- `<script src="js/customthemes.js">` между `rounds.js` и `drawing.js` —
  после `themes.js/words.js` (нужны `themes`, `themeImages`, `forbiddenSet`),
  до `storage.js` (нужен при restore).

### 4. js/storage.js
- `collectSettings` → `customs: customThemesApi.list()`.
- `applySavedSettings`: `setAll(saved.customs)` **перед** восстановлением
  весов — инпуты должны существовать, чтобы веса легли.

### 5. js/network.js
- `collectSettings` (хост) → `customs`.
- `applySettingsToUI` (гость) → `setAll(s.customs)` перед применением весов.
- Хост = источник истины: SETTINGS слушает только `Net.isHost`
  (network.js:336) + сервер отдаёт SETTINGS только от хоста. add/remove/
  веса на хосте → broadcast. Локальные правки на госте теоретически
  возможны, но не уходят в сеть и затираются полным `setAll` при
  следующем SETTINGS от хоста — расхождения не живут.

### 6. styles.css
- `#customThemeForm` (+Row/поля/#btnAddCustomTheme/#customThemeError),
  `.custom-theme-del` — красный 22px круг `✕` в карточке.
- Исключение внутри `@media (max-width:768px)` под blanket-правилом кнопок:
  `.custom-theme-del` и `#btnAddCustomTheme` — тот же приём, что у модалок.

## Проверка (audit/tool/verify10.js — 40/40 PASS)

- **A** lomake+rekisteri: api/поля/аккордеон/карта/регистрация/input=1/активность/✕/help
- **B** validointi: пустое/1-симв./дубликат/ci-дубликат встроенной/стрип `<>` в desc+emoji
- **C** «Säännöt (?)» открывает модалку с правилом кастома
- **D** степпер +/−, disabled-card на 0
- **E** пул: custom в `buildWeightedThemePool`; форс-вес → барабан падает на
  кастомную тему; правило показано объясняющему
- **F** ✕: карта/реестр/desc/инпут удалены
- **G** localStorage: customs+веса сохранены, после reload карта и вес=4 на месте
- **H** комната: host создаёт, гость входит → кастом-карта/реестр на госте;
  вес=5 синхронизируется; удаление хостом → карта исчезает у гостя

Скриншот: `ct-settings-390.png`.

Регрессия: verify **39** + verify2 **67** + verify3 **45** + verify4 **21** +
verify9 **26** = **198 PASS**, +verify10 40 = **238 PASS**.

## Подводные камни (важно для следующего ИИ)
1. `new Event('input')` **не всплывает по умолчанию** — делегированные
   `document.addEventListener('input', …)` его не видят. Любой код, меняющий
   `.theme-weight-input` скриптом, для save/broadcast должен диспатчить
   `{bubbles:true}` (или это реальный ввод пользователя).
2. Аккордеон открыт через `.open`+`maxHeight`, не `display` — после
   изменения содержимого `maxHeight` надо пересчитывать (`refreshAccordion`).
3. `themeDescriptions` рендерится через `innerHTML` — любые пользовательские/
   сетевые строки туда допускать нельзя без стрипа `<>` (или эскейпа).
4. Slug-функция едина — `theme-weight-<slug>` является связкой карта↔тема↔
   хранилище↔SETTINGS. Ломать `themeSlug` = сломать всё сразу.
5. Гость тоже дергает `setAll` → его локальный `localStorage` перезаписывается
   настройками хоста — осознанно: настройки комнаты едины.

## Статус
✅ Реализовано и проверено (verify10 40/40 + регрессия 198 PASS)
