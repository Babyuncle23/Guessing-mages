# Мегаплан: динамическое исчезновение скиллов + sticky-плашка условия

Дата: после «спеллы над колесом» (megaplan-spells-above-wheel). Контекст: (1) использованные заклинания оставались в интерфейсе disabled-мертвецами — визуальный мусор; (2) скролл списка слов на экране выбора неудобен (`touch-action:none` нужен жесту «удержать→вести→отпустить», поэтому нативного скролла нет).

## История решения

- v1: добавлены стрелки-скроллера ▲▼ на краю списка — реализовано, выкачено (commit `0a0201f`, доработка привязки к карточке `9a6e2e9`).
- v2 (текущее): пользователь передумал — **стрелки убраны полностью**, вместо них элегантный вариант: верхняя плашка с условием (`#turnPanel` — чип «1/7 🎭 PANTOMIIMI» + ❓-гармошка) **всегда приклеена к верху** экрана слов.

## Решения пользователя

- Скиллы: скрывать **всё ненажимаемое** — использованные, 0 зарядов, висящие проклятия, контекстно-заблокированные. Пустая зона исчезает целиком (вместе с заголовком «✨ Taikuus»).
- Стрелки: **убрать**.
- Плашка условия: **приклеена к верху**, но **только там где она уже есть** (`#gameContainer.words-active` — экран слов). В новые места её не добавлять — новых DOM-элементов не создано вообще.

## UX-дизайн

### Скиллы

- После успешного каста строка «схлопывается»: `opacity→0`, `translateY(-6px)`, `max-height→0` (~300мс, `.spell-out`), затем рендер.
- Видимы только **нажимаемые прямо сейчас** спеллы. Если ни одного — `#spellContainer` целиком `display:none`.
- Скилл с оставшимися зарядами возвращается на следующем ходу.
- `prefers-reduced-motion` → `SPELL_ANIM_MS = 0`, исчезновение мгновенное.

### Sticky-плашка

- `#gameContainer.words-active .turn-panel` → `position:fixed; top:0; left:50%; translateX(-50%); width:100%; max-width:600px` — тот же паттерн, что у существующей нижней панели `.round-controls-block` (fixed, z20).
- Фон: `linear-gradient(to bottom, rgba(13,10,24,.97) 62%, transparent)` — верх плотный, низ растворяется: контент «входит» под плашку без жёсткой кромки.
- `#gameContainer.words-active` получает `padding-top:62px` — место под плашку, контент не прячется под неё.
- `max-height:80dvh; overflow-y:auto` — если пользователь развернёт ❓-гармошку, плашка не уедет за экран.
- Чип с условием (`#chipTheme`), ❓-кнопка, 🎨-кнопка и room-чипы остаются всегда наверху — в любой точке списка видно условие раунда.
- `env(safe-area-inset-top)` учтён, зеркально `safe-area-inset-bottom` у нижней панели.
- Вне `words-active` плашка в обычном потоке — «только там где она уже есть».

## Архитектурные факты

- Заряды: `gamePlayers[i].spells.{flood,hunger,chaos,regrowth,metamorphosis}`.
- Контекстные блоки: flood нельзя в `vapaavalintainen` и при активном `extendToEight`; hunger/chaos — пока `pendingCurses[key] !== -1`; regrowth — при `extraTurnGranted`/`isExtraTurnRound`.
- `.container` не имеет transform/filter → `position:fixed` дочерних элементов привязан к вьюпорту (иначе бы к карточке).
- У `position:fixed` элементов `offsetParent === null` → видимость проверять через `getBoundingClientRect().width` (урок из v1).
- `padding-top` на `#gameContainer.words-active`: конкурирующие правила `.container{padding}` — решается `!important` + специфичностью id-селектора; дублирующее `padding-top:14px` из старого ruleset'а убрано.
- `#btnInfoToggle` виден только в `words-active` (CSS-гейтинг) — внутри приклеенной плашки он всегда достижим.

## Реализация (кратко)

1. `index.html`: разметка `#wordScrollRail`/`#wordScrollUp`/`#wordScrollDown` **удалена**.
2. `styles.css`: блок `.word-scroll-btn`/`.dir-hidden`/`#wordScrollRail` **удалён**; добавлен `#gameContainer.words-active .turn-panel{position:fixed…}` + `padding-top:62px` на контейнере; `.spell-action-row{transition,max-height:140px,overflow:hidden}` + `.spell-out`.
3. `js/spells.js`: `spellUsable(p,key)` — единое правило «нажимаемости»; `animateSpellUse(row,done)` — spell-out + deferred re-render; `renderBeforeWordsIfPhase1` — страж против гонки фаз; оба рендера показывают только usable-спеллы, пустую зону прячут.
4. `js/ui.js`: модуль стрелок, экспорты `wlRevealOn/wlRevealOff/wlIsAiming`, хук `updateWordScrollRail` и `mouseleave`-проверка rail **удалены** — код вуали вернулся к виду до v1.
5. `audit/tool/verify21.js`: исчезновение спеллов + sticky-плашка (fixed-позиция, верх вьюпорта, ширина карточки, неподвижность при скролле списка, резерв padding-top, ❓-гармошка, выбор жестом).
