# MEGAPLAN: переключатель «Kasvavat bonussanat» — отключение прогрессивной бонусной экономики

> **Статус: РЕАЛИЗОВАНО** (после `bd08fb1`). Проверки: `audit/tool/verify18.js`; регрессия `verify14.js`, `verify4.js`.

## Контекст и цель

**Проблема:** динамическая бонусная экономика (`bd08fb1`, 1✨/+25p → 3✨/+100p) необратимо заменила старую фиксированную. Нужна возможность играть «как раньше» — 1 бонусное слово, +25p — при этом новая система остаётся дефолтом.

**Решение (согласовано):** чекбокс `#bonusScalingToggle` во вкладке `Asetukset`. Откат — **только экономика** (count/value); новое поведение Sanakaaos (💀 без бонуса), Sanametamorfoosi (бонусы + снятие каоса) и фикс `usedWordsInThisGame` сохраняются в обоих режимах. Настройка читается **только при старте игры** — переключение посреди партии действует со следующей игры.

## Механика

| Режим | ✨-слов | Награда | Условие |
|---|---|---|---|
| ON (дефолт) | 1→2→3 | +25→+50→+100p | `BONUS_PHASES[getBonusPhase()]` |
| OFF | 1 | +25p | фикс `{count:1, value:25}` |

- Флаг `bonusScalingEnabled` (`js/state.js`, default `true`) захватывается на старте:
  - локально — в `startGameBtn`-хендлере и `resetCurrentGame` (`js/main.js`);
  - в комнате — в `startRoomGameLocal` из `cfg.bonusScaling` сообщения `START_GAME` (`js/network.js`) — единая истина хоста, консистентна на всех устройствах.
- `getBonusConfig()` — единственная точка чтения экономики — возвращает фикс-конфиг при `bonusScalingEnabled === false`. Покрывает: число ✨ в `generateWordList`, выплату в `endRound`, бейдж `+Vp` в `renderOlList`.
- Тексты правил: `#rulesBonusText` и `#magicGuideBonusText` (id добавлены в `index.html`) переписываются `window.refreshBonusTexts()` (`js/ui.js`) по состоянию чекбокса — оригинальные финские формулировки до `bd08fb1` для OFF-режима.

## Архитектура

- `index.html`: карточка-чекбокс в `#settingsTab` после блока таймера (стиль `#magicToggle`), `checked` по умолчанию; `id` на двух бонусных абзацах.
- `js/state.js`: `+bonusScalingEnabled = true`.
- `js/rounds.js`: `getBonusConfig` — ветка на флаге.
- `js/main.js`: захват флага из чекбокса при старте и в `resetCurrentGame` (Pelaa uudelleen).
- `js/storage.js`: ключ `bonusScaling` в `arksanum-settings-v1`; восстановление через `checked` + dispatch `change`; autosave по `change`.
- `js/network.js`: `bonusScaling` в `collectSettings`; `applySettingsToUI` выставляет чекбокс + dispatch `change`; `'bonusScalingToggle'` в списке id для `netBroadcastSettings`; `cfg.bonusScaling` в `btnStartRoomGame`; `startRoomGameLocal` применяет `cfg.bonusScaling !== false`.
- `js/ui.js`: `refreshBonusTexts` — своп текстов правил/magicGuide.

## Сетевой аспект

- Поле `bonusScaling` едет в существующих `SETTINGS`/`CREATE_ROOM`-настройках — протокол без изменений, сервер-слепой.
- В `START_GAME.cfg` — снапшот на старте: мид-гейм изменение хоста синкает только чекбокс гостей, не флаг.
- Гостю настройка залочена бесплатно: `.room-settings-locked` гасит весь `#settingsTab` (`pointer-events: none`).
- Поздний joiner/реконнект: `ROOM_STATE.game.cfg` → `startRoomGameLocal` — флаг корректен и для объясняющего-реконнектёра.

## Проверка

- `audit/tool/verify18.js`: A) дефолт ON; B) персист + своп текстов после reload; C) OFF-игра — 1✨/+25p/+125 при форс-фазе 2; D) ON-регрессия — 3✨/+100p/+200; E) мид-гейм иммунитет — флаг не меняется до новой игры; F) комната — OFF хоста доезжает до гостя (чекбокс+тексты+лок), live-broadcast ON/OFF, `cfg` → флаг `false` на обоих; G) Sanakaaos при OFF — 3💀/0✨ (новый контр-плей сохранён); zero console errors.
- Регрессия: `verify14.js` (дефолт ON — та же экономика), `verify4.js` B3 (бейдж +25p на 1-м раунде).

## Подводные камни

- `applySavedSettings`/`applySettingsToUI` обязаны диспатчить `change` — иначе тексты правил не перепишутся при восстановленном OFF.
- Отсутствующий ключ `bonusScaling` (старые saves, старые хосты) → `true` — новая система остаётся дефолтом.
- Объясняющий в комнате берёт флаг из `cfg`, а не из локального чекбокса — при рассинхроне SETTINGS истина у хоста на момент старта.
- `refreshBonusTexts` читает чекбокс, а не флаг: тексты показывают будущий режим (игра уже идёт — флаг зафиксирован на старте).
