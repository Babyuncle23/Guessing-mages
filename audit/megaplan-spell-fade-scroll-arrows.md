# Мегаплан: динамическое исчезновение скиллов + стрелки скролла списка слов

Дата: после «спеллы над колесом» (megaplan-spells-above-wheel). Контекст: (1) использованные заклинания остаются в интерфейсе disabled-мертвецами — визуальный мусор; (2) у `#wordList` стоит `touch-action:none` (нужен для жеста выбора «удержать→вести→отпустить»), поэтому нативного скролла на телефоне нет вовсе — докрутить можно только тянув палец к краю в середине жеста выбора.

## Решения пользователя (уточняющие вопросы)

- Скрывать **всё ненажимаемое**: использованные, 0 зарядов, висящие проклятия, контекстно-заблокированные. Пустая зона исчезает целиком (вместе с заголовком «✨ Taikuus»).
- Стрелки: **компактная пара ▲▼** на правом краю списка по центру.
- Стрелки **только когда есть что скроллить** — авто-скрытие при влезающем списке.

## UX-дизайн

### Скиллы

- После успешного каста строка «схлопывается»: `opacity→0`, `translateY(-6px)`, `max-height→0` (~300мс, `.spell-out`), затем рендер.
- Видимы только **нажимаемые прямо сейчас** спеллы. Если ни одного — `#spellContainer` целиком `display:none` (заголовок фазы тоже исчезает — чистый экран).
- Скилл с оставшимися зарядами возвращается на следующем ходу (рендер на каждый ход пересчитывает доступность).
- `prefers-reduced-motion` → `SPELL_ANIM_MS = 0`, исчезновение мгновенное.

### Стрелки

- `#wordScrollRail` внутри `#wordListWrap` (position:relative): absolute `right:6px`, `top:0`, `bottom` = wrap'ов `padding-bottom` (JS синхронизирует) → вертикально по центру списка.
- Виден только при `scrollHeight - clientHeight > 4px`.
- Кнопки 34×34, приглушённое золото `rgba(212,175,55,.55)` на тёмном полупрозрачном фоне — минималистично, не спорит со словами.
- У края своя стрелка гаснет (`.dir-hidden`: `opacity:0`, `scale(0.7)`, `pointer-events:none`).
- **Тап** (<220мс) = `scrollBy` на ~2 строки с `behavior:'smooth'`.
- **Холд** (>220мс) = непрерывный скролл ~240px/с через `requestAnimationFrame` + `wlRevealOn()` — вуаль приоткрывается, слова видны при скролле одним пальцем.
- Отпускание = `wlRevealOff()` → вуаль возвращается штатным 1.2s-fade'ом; если другой палец ещё тянет жест выбора (`wlIsAiming()`), вуаль остаётся.
- `contextmenu` suppressed, `preventDefault`/`stopPropagation` на press → стрелка никогда не триггерит выбор слова.
- Между кнопками `pointer-events:none` на rail → промахи не глотаются.
- Второй палец может жать стрелки во время drag-выбора — kortti следует за скроллом через существующий scroll-апдейт.

## Архитектурные факты

- Заряды: `gamePlayers[i].spells.{flood,hunger,chaos,regrowth,metamorphosis}`.
- Контекстные блоки: flood нельзя в `vapaavalintainen` и при активном `extendToEight`; hunger/chaos — пока `pendingCurses[key] !== -1`; regrowth — при `extraTurnGranted`/`isExtraTurnRound`.
- `#gameContainer.words-active #wordList` имеет `max-height:none !important` → программный лимит только через `setProperty(...,'important')`.
- Глобальный `button { width:100%; margin-top:8px; padding:10px 20px }` → у `.word-scroll-btn` все геометрические свойства под `!important`.
- `button:disabled` имеет `!important`-стили → edge-состояние стрелок делаем классом, не `disabled`.
- Слои врапа: mask z3 < grain z4 < hint z5 < coach z6 < rail z7.
- `wordListWrap` в words-active имеет `padding-bottom:78px` (место под palkki) → rail вешаем `bottom:<computed>`.

## Реализация (кратко)

1. `index.html`: `#wordScrollRail` + `#wordScrollUp`/`#wordScrollDown` внутри `#wordListWrap`, после `#veilCoach`.
2. `styles.css`: `.spell-action-row{transition,max-height:140px,overflow:hidden}` + `.spell-out`; `#wordScrollRail`/`.word-scroll-btn`/`.dir-hidden` + reduced-motion.
3. `js/spells.js`: `spellUsable(p,key)` — единое правило «нажимаемости»; `animateSpellUse(row,done)` — spell-out + deferred re-render; `renderBeforeWordsIfPhase1` — страж против гонки фаз; оба рендера показывают только usable-спеллы, пустую зону прячут.
4. `js/ui.js`: `window.wlRevealOn/wlRevealOff/wlIsAiming`; `refreshPrivacyMask` → `updateWordScrollRail`; `mouseleave` не гасит вуаль при переходе курсора на rail; модуль `updateWordScrollRail` + `bindWordScrollBtn` (tap/hold, touch+mouse, reveal).
5. `audit/tool/verify21.js`: исчезновение по одному спеллу и целиком, контекстные блоки, 0 зарядов, rail on-overflow/edges, tap/hold скролл + reveal, выбор жестом после скролла.
