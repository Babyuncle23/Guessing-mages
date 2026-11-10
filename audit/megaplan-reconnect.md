# Megaplan: Reconnect-resilience (затухание экрана / возврат в игру)

## Проблема
Временное затухание экрана, случайный выход из браузера или обрыв сети
ломали онлайн-игру: зомби-сокеты «вечно connected», мгновенный скип хода
при 5-секундном сне, устаревший снапшот на сервере → рассинхрон после
rejoin, отсутствие UI для возврата, отсутствие миграции хоста.

## Решение (всё реализовано и проверено verify6.js 44/44)

### Сервер (`server.js`)
- **Heartbeat**: `ws.isAlive` ping/pong + sweep `ARK_HB_MS` (default 30 s) —
  спящее устройство перестаёт отвечать → сокет умирает → `close` →
  корректный disconnect вместо вечного «online».
- **Grace-период** `ARK_GRACE_MS` (default **90 s**): при `close` игрок
  помечается offline, всем шлётся `PLAYER_WAITING`. Если вернулся в
  течение grace — `PLAYER_BACK`, таймер скипа отменяется, ход продолжается.
  Если нет — `PLAYER_DISCONNECTED` → клиентский скип.
- **Stale-socket guard**: в `close` проверяем `p.ws === ws` — закрытие
  старого сокета после успешного REJOIN не роняет новую сессию.
- **SESSION_TAKEN**: повторный REJOIN того же playerId закрывает старый
  сокет и шлёт ему `SESSION_TAKEN` (вторая вкладка того же игрока).
- **Миграция хоста**: при уходе хоста (leave или grace-expiry) роль
  переходит первому по joinOrder подключённому игроку; ROSTER с
  `host:true` уходит всем.
- **LEAVE_ROOM** помечает `p.left = true` — явный выход не запускает
  grace, не триггерит WAITING/DISCONNECTED и не подлежит rejoin-сессии.
- Снапшот `room.game` обновляется по входящим `STATE_SYNC` (см. ниже) —
  rejoin всегда получает актуальный ход, а не до-скиповое состояние.

### Клиент (`js/network.js`)
- **Dual-storage сессия**: `arksanum-room-session` в `sessionStorage`
  (per-tab, приоритет) + `localStorage` (переживает закрытие браузера),
  TTL 2 ч (`SESSION_TTL_MS`).
- **Auto-reconnect** при обрыве сокета с экспоненциальной паузой;
  **wake-check** на `visibilitychange`/`online`/`pageshow` — при
  пробуждении проверяется живость ws (`netWakeCheck`), мёртвый сокет
  переподключается. Pong-watchdog на клиенте ловит полумёртвые сокеты.
- **`_resumeIntent`**: auto-REJOIN только при reconnect (был `Net.roomCode`)
  или явном «Palaa peliin» — выбор режима «Huonepeli» сам по себе не
  тащит игрока в старую комнату.
- **`?room=ABCD`**: всегда открывает форму входа с заполненным кодом;
  сессия чужой комнаты затирается (нет авто-затаскивания), сессия той же
  комнаты остаётся — возврат через баннер. Никакого auto-resume по URL:
  shared localStorage на одном браузере иначе крадёт чужую сессию.
- **Снапшот-синк**: `netBuildState()` (seq/idx/round/turns/cursors/phase/
  scoreboard) шлётся с `ROUND_END`/`TURN_SKIPPED`; гость с `heal`-логикой
  принимает более свежий state, сервер хранит последний.
- **Гарды событий**: `isFromExplainer(m)` + `endedIndex ===
  currentPlayerIndex` — проснувшийся старый объясняющий не может
  продвинуть игру дважды устаревшим `ROUND_END`.
- **`netSkipOneTurn`**: точное зеркало `endRound` (включая extra-turn
  Yrttitarhuri и teamCursors для mode 4); `netEnsureExplainerAvailable`
  цепочкой скипает ходы офлайн-игроков (не только текущего объясняющего).
- **`applyNetSnapshot`**: восстановление по `ROOM_STATE` — roster, счёт,
  idx, phase. Вернувшийся объясняющий: если страница жива и слова
  открыты — продолжает; если слов нет (перезагрузка) и фаза
  words/locked — авто-`TURN_SKIPPED` своего хода (слова никогда не
  покидают устройство, восстановить их нельзя); при фазе theme —
  продолжает и открывает новый список.
- **SESSION_TAKEN handler**: вторая вкладка — старая молча уходит
  (toast + сброс).

### UI (`index.html`, `styles.css`)
- **Баннер на стартовом экране**: `♻️ Kesken oleva peli huoneessa ABCD —
  PALAA PELIIN` (`#netResumeBanner`) + ссылка `#roomResumeLink` в панели
  комнаты. Показывается только при валидной сессии.
- **Conn-badge** `#netConnBadge` поверх игры: online/offline/reconnecting
  состояния, aria-live.
- **«Poistu huoneesta»**: `#btnLeaveInGame` (двойной тап-confirm) в игре,
  кнопки выхода в лобби и в victory-модале — чистый LEAVE_ROOM + сброс.
- Стили waiting/disconnected/badge/banner (~160 строк в конце
  `styles.css`).

## Протокол (новые элементы)
- Server→client: `PLAYER_WAITING`, `PLAYER_BACK` (EVENT-виды),
  `SESSION_TAKEN`; `ROOM_STATE.game` содержит полный `state`-снапшот.
- Client→server: `REJOIN` (без изменений), `LEAVE_ROOM` (уже был),
  relay-виды `STATE_SYNC`, `TURN_SKIPPED`; `ROUND_END` теперь несёт
  `endedIndex` + `state`.
- Секретные слова по сети по-прежнему не ходят — только публичный
  phase/state.

## Тестирование
- `audit/tool/verify6.js` — **44/44** (server spawn с
  `ARK_GRACE_MS=4000 ARK_HB_MS=1000`):
  guesser drop→WAITING→BACK без скипа; explainer drop+resume в grace с
  сохранением слов; drop>grace→скип+converged rejoin; reload объясняющего
  со словами→TURN_SKIPPED; reload гостя→баннер→PALAA→guesser-экран;
  stale ROUND_END дропается; миграция хоста в лобби; `?room=` бьёт
  старую сессию; armed double-tap leave.
- Отдельный node-ws smoke (не в репо): heartbeat, SESSION_TAKEN,
  stale-close без ложного DISCONNECTED, host migration.
- Регрессия: verify **39/39**, verify2 **67/67**, verify3 **45/45**,
  verify4 **21/21**, verify5 **36/36**.

## Ограничения (честно)
- Grace хранится в памяти процесса — рестарт сервера теряет и комнаты, и
  ожидающие grace-таймеры (как и раньше).
- Rejoin не восстанавливает промежуточные штрихи/emoji — только
  публичную фазу/счёт/ход (осознанное: payload мал).
- Объясняющий, перезагрузивший страницу в фазе открытых слов, теряет
  свой ход (авто-скип) — слова по сети не восстанавливаются by design.
- `localStorage`-fallback мультивкладочного браузера отдаёт последнюю
  записавшую сессию; per-tab `sessionStorage` имеет приоритет, поэтому
  reload своей вкладки безопасен.
