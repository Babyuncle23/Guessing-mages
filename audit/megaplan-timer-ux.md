# Мегаплан: опциональный таймер — UX-доработка

Дата: после edee357.

## Что уже есть (аудит фактов)

Таймер **уже опционален и настраиваем**:
- `#timerSelect` в настройках: `Ei ajastinta` / 60 / 90 / 120 с (index.html:237–243)
- Полоса `#turnTimer` у объясняющего после открытия слов, warn/danger градиенты на 50%/25%
- По истечении → `endRound(false)` автоматически (rounds.js:618–647)
- Персист через localStorage; включён в SETTINGS-бродкаст хост→гости (network.js:202/218)
- Угадывающие в комнате получают длительность в `WORDS_OPEN` и видят `#ngTimer` (network.js:331, 548–551)

## Найденные UX-щели

1. Только 60/90/120 с — для быстрых раундов не хватает 30/45 с.
2. Полоса без цифр — нельзя понять, сколько секунд осталось, «на глаз».
3. Таймаут молча завершает ход `sounds.fail` — непонятно, что произошло. В комнате summary говорит «Vuoro luovutettiin», что неверно по смыслу (никто не сдавался).
4. У угадывающих полоса без warn/danger-цветов и без цифр — беднее, чем у объясняющего.

## Реализация

### 1. index.html
- `timerSelect`: добавить `30 sekuntia`, `45 sekuntia` (порядок: Ei / 30 / 45 / 60 / 90 / 120)
- `#turnTimerSec` — маленький числовой счётчик под полосой объясняющего
- `#ngTimerSec` — то же на `#netGuesserScreen`

### 2. js/rounds.js
- `startTurnTimer`: обновлять `turnTimerSec` (`Math.ceil(left/1000) + ' s'`), показывать/прятать вместе с полосой
- `endRound(isGuessed, guesserIndex, stolenIndex, timedOut)`: новый параметр; таймаут вызывает `endRound(false,-1,-1,true)`
- `timedOut` прокидывается в `netAfterEndRound({... timeout: timedOut})`; `endedWord` хойстится и переиспользуется
- Соло-режим: при таймауте показать `netShowSummary(word, '⏱️ Aika loppui — ei pisteitä.')` — игроки видят и причину, и слово

### 3. js/network.js
- `netAfterEndRound`: `timeout: !!info.timeout` в ROUND_END-пayload
- `showSummaryForResult`: `d.timeout` → `⏱️ Aika loppui — ei pisteitä.` (вместо «luovutettiin»)
- `ngTimerStart`: warn/danger-классы на `#ngTimerFill` + цифры в `#ngTimerSec`

### 4. styles.css
- `#ngTimerFill.warn/.danger` — те же градиенты, что у `#turnTimerFill`

## Проверка (verify5.js — 26/26)
- [x] Опции 0/30/45/60/90/120; `Ei ajastinta` → ни полосы, ни цифр
- [x] Полоса + `turnTimerSec` тикают вниз, warn/danger-цвета
- [x] Таймаут → авто-конец хода + карточка «⏱️ Aika loppui — ei pisteitä.» + раскрытие слова (соло)
- [x] Комната: у угадывающего `ngTimer`+`ngTimerSec`+цвета синхронно; таймаут → summary на всех
- [x] Персист после reload (45 с); SETTINGS-синк хост→гость
- [x] Регрессия: 39 + 67 + 45 + 21 = 172 PASS

## Заметки
- `<select>.value` молча отвергает значения без option — в тестах быстрый таймаут ставится через временную `new Option` (`setTimer`).
- Поле `timeout` добавлено в `ROUND_END`-payload; `endRound` получил 4-й параметр `timedOut`.

## Статус
✅ Реализовано и проверено
