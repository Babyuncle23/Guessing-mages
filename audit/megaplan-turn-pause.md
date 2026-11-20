# Мегаплан: пауза хода вместо скипа — экран уснул ≠ игрок вышел

Дата: после conn-ux мегаплана (grace-ожидание, `plan-dcb71277a8459f90`,
commit `fdb3320`) и wordlist-UX (Task 18). Контекст: реальный репорт —
«я был хостом на 3-м раунде из 5, у другого игрока автоматически погас
экран, и я сразу перескочил на 4-й раунд без его очереди».

## Исходный баг и корневая причина

Предыдущий мегаплан ввёл grace-ожидание 90 с (`GRACE_MS`): при обрыве
сокета сервер шлёт `PLAYER_WAITING`, клиент показывает баннер с
отсчётом, и только по истечении — `PLAYER_DISCONNECTED` → `netSkipOneTurn()`.

Почему это не спасало:

- **Спящий телефон физически не может вернуться за 90 с.** Экран погас →
  ОС замораживает JS → сокет умирает и не переподключается, пока
  пользователь сам не разбудит устройство. Grace истекал гарантированно.
- **Скип мог быть мгновенным.** Если экран погас во время *чужого* хода,
  grace истекал до наступления очереди отключившегося — и когда она
  приходила, `netEnsureExplainerAvailable()` скипал её немедленно.
  Именно это давало «3-й раунд → сразу 4-й».
- Место в ростере при этом сохранялось (до `ROOM_IDLE_MS` = 2 ч) —
  терялся только ход. Т.е. игрок «есть», а его очередь сгорела.

Ключевой вывод: «socket closed» ≠ «игрок вышел». Телефон с погасшим
экраном — временное состояние; удалить игрока из очереди может только
явный уход из комнаты (кнопка «Poistu») или ручное решение группы.

## Новая семантика — бесконечная пауза

`explainerBlocker()` классифицирует текущего объясняющего:

| Состояние | Условие | Поведение |
|---|---|---|
| `none` | подключён, не away | ход идёт нормально |
| `waiting` | сокет мёртв, grace ещё тикает | баннер `⏳ Odotetaan pelaajan X paluuta… (N s)` |
| `away` | сокет жив, клиент прислал AWAY | баннер `💤 X:n näyttö sammui — odotetaan tai ohitetaan` |
| `gone` | grace истёк, но игрок в ростере | баннер `⏸️ X ei ole pelissä — vuoro odottaa` — **пауза бесконечно** |
| `left` | игрока нет в ростере | авто-скип (единственный автоматический случай) |

`netEnsureExplainerAvailable()` вызывает `netSkipOneTurn()` **только**
для `left`. Для `waiting`/`away`/`gone` — `updateTurnPauseUI()` и ход
ждёт. Grace-таймер остаётся только для UI-отсчёта и статуса, он больше
не причина скипа.

Идемпотентность: функция безопасна при повторных вызовах из
`PLAYER_WAITING`, `PLAYER_BACK`, `PLAYER_DISCONNECTED`, `ROSTER`,
сетевого тика и `ROOM_STATE`/`STATE_SYNC`.

## Ручной скип — «Ohita vuoro»

Пауза не значит тупик: любой **подключённый** игрок видит в баннере
кнопку `.ncb-btn` «Ohita vuoro»:

1. Первый тап → кнопка становится `⚠️ Varmista ohitus?` (арм ~3 с).
2. Второй тап → `forceSkipTurn()` → `netSkipOneTurn(true)` +
   `Net.relay({kind:'TURN_SKIPPED'})` — тот же событийный путь, что и
   rejoin-скип, все клиенты применяют конвергентно.

Покрывает сценарий «уснул сам хост» — скип доступен не только хосту.
`explainerBlocker() === 'none'` → `forceSkipTurn` игнорируется (нельзя
скипать ход игрока на месте).

## Протокол AWAY / BACK

Слепая зона старой схемы: Android отвечает на ws-ping даже при погасшем
экране — сокет «жив», а человек спит. Без сигнала игра висела бы молча.

- `visibilitychange → hidden` (а также `pagehide`/`freeze` где
  поддерживается): клиент шлёт `{type:'AWAY'}` — сервер ставит
  `roster[i].away=true` и рассылает `ROSTER`.
- `visibilitychange → visible` / `pageshow`: `{type:'BACK'}` →
  `away=false` + `ROSTER`; плюс клиент прогоняет reconnect/wake проверки.
- `attachPlayer` (join/rejoin/reclaim) и `close` приводят `away` в
  согласованное состояние; стейл-сокеты защищены проверкой `p.ws !== ws`.
- В лобби игрок с `away` помечается значком 💤.

## Screen Wake Lock — профилактика

Чтобы экран вообще не гас в игре (как при видео), `js/utils.js` держит
менеджер `navigator.wakeLock`:

- `wakeKeep = true` ставится на старте/рестарте игры; `requestWakeLock()`
  берёт блокировку, `releaseWakeLock()` отпускает.
- Перевзятие на `visibilitychange → visible`, пока `wakeKeep` — браузер
  сам отпускает блокировку при скрытии вкладки.
- Отпускается: конец игры (victory), выход из комнаты, возврат в
  настройки/сетап.
- Нет `navigator.wakeLock` (старые iOS, не-secure context) — тихий
  фолбэк, всё остальное работает.

Ограничения: блокировку можно снять только явным выключением экрана
пользователем; iOS поддерживает Wake Lock с 16.4+, на старых — AWAY-путь
всё равно покрывает сценарий сном.

## Сдача хода — один тап

«Luovutan vuoron / laiminlöin ehdon» требовал удержания 1 с
(`.gp-fill`/`holding`/`hold-hint`). По запросу — как «Arvattu oikein»:

- `btnGiveUp` = обычный `click → doGiveUp()` (без модалки подтверждения).
- Удалены: `startGiveUpHold`, `cancelGiveUpHold`, title «Pidä pohjassa
  1 s…», `<span class="gp-fill">`, CSS `gp-fill`/`holding`/`hold-hint`/
  `giveupShake` (включая reduced-motion правила).
- `window._devConfirmGiveUp = doGiveUp` сохранён — используется
  модалками рисования/эмодзи и тестами.

## Team mode

Если в командном режиме текущий объясняющий ушёл/уснул, но в его команде
есть другой онлайн-игрок не-away — ход команды сохраняется ротацией на
него (`netTryRotateTeamMember`). Пауза — только когда в команде объяснять
некому. Одиночный режим поведения не меняется.

## Файлы

- `server.js` — `AWAY`/`BACK` кейсы, `away` в roster-выдаче, очистка на
  attach/close.
- `js/utils.js` — wake lock менеджер (`requestWakeLock`/`releaseWakeLock`/
  `wakeKeep`).
- `js/network.js` — `explainerBlocker`, `updateTurnPauseUI` (обёртка
  `updateWaitBanner` сохранена), `forceSkipTurn`, 💤 в ростере,
  visibility/page-lifecycle хуки, пауза вместо скипа.
- `js/main.js` — one-tap give-up, wake-хуки старт/выход.
- `js/rounds.js` — release на game-over.
- `index.html` — `gp-fill` удалён из `#btnGiveUp`.
- `styles.css` — hold-CSS удалён, `.ncb-btn` в баннере.

## Тесты

- `audit/tool/verify20.js` — **новый** (29 проверок): AWAY/BACK +
  roster.away, wake lock request/re-request, drop past grace → пауза
  (не скип) → return → ход продолжается, away-пауза, двухтаповый ручной
  скип, поздний rejoin, one-tap give-up.
- `verify12` — кейс C переписан: grace-expiry → пауза + баннер +
  ручной скип (45/45).
- `verify6` — кейс D: drop past grace → пауза, rejoin продолжает тот же
  ход; кейс E дополнен переходом хода к B (48/48).
- `verify17` — кейс E переписан под single-tap (54/54).
- Регрессия: verify7 (28), verify11 (34) — 0 FAIL.
- Headless-нюанс: `bringToFront` прячет остальные вкладки → во всех
  комнатных сьютах `document.visibilityState` застаблен геттером
  `window.__vs || 'visible'`.

Запуск: `node audit/tool/verify20.js` (и 6/7/11/12/17). Все сьюты сами
поднимают `server.js` с `ARK_GRACE_MS=4000`.

## Известные ограничения

- Wake Lock не работает на iOS <16.4 и в не-secure контексте — там
  остаётся AWAY-путь.
- Пауза бесконечна: если игрок забыл игру, кто-то должен нажать «Ohita
  vuoro» или игрок выйдет по `ROOM_IDLE_MS` чистке (2 ч).
- `TURN_SKIPPED` от перезагрузившегося объясняющего без слов остаётся —
  слова не передаются по сети, продолжить ход нельзя. Это намеренно.
