# Megaplan: Online UX — char pick хоста, grace-wait, звук победы, conn UX

## Проблемы
1. **Выбор героя не работал у хоста**: `#roomCharPick` показывался только
   в `applySettingsToUI()`, а `SETTINGS`-бродкаст сервера идёт всем КРОМЕ
   отправителя → хост включал магию, гости видели выбор, хост — нет.
2. **Матч завершался преждевременно** при временном вылете игрока:
   `netEnsureExplainerAvailable()` скипал любого explainer'а с
   `connected=false`, хотя флаг выставляется мгновенно при обрыве сокета,
   а grace-период (90 с) откладывал только `PLAYER_DISCONNECTED`. В 1v1
   ход отсутствующего сгорал мгновенно → игра доигрывалась без него.
3. **success + gameWin звучали одновременно** на последнем ходу:
   `endRound()` играл result-sound до проверки конца игры; `pause()`-хак
   покрывал только success (не curse/fail) и race'ил с async `play()`.
4. **UX соединения**: статичный бейдж, нет реакции на `navigator.onLine`,
   нет индикации «ждём игрока», действия хода молча терялись офлайн.

## Решение (verify12.js 41/41, регрессия verify6 44/44 + verify11 34/34)

### Сервер (`server.js`)
- `room.grace`: `Map<pid,{t,until}>` — хранит и таймер, и дедлайн.
- `roster()` отдаёт `waiting` + `graceUntil` — клиенты всегда знают,
  кто в grace (включая собственный rejoin через ROOM_STATE).
- Grace-таймер ставится **до** ROSTER-бродкаста в `close` → флаг
  `waiting` уезжает в том же флаше. `PLAYER_WAITING` несёт `graceUntil`.
- `finalizeDisconnect` теперь бродкастит ROSTER безусловно —
  `waiting`-флаг снимается у всех, а не только при миграции хоста.

### Клиент (`js/network.js`)
- **`Net._waitUntil`** (pid → timestamp): sync из roster (`syncWaits`) +
  события `PLAYER_WAITING/BACK/DISCONNECTED`. Устаревшие pid, которых
  нет в roster, вычищаются.
- **Пауза вместо скипа**: `netEnsureExplainerAvailable()` при explainer'е
  в grace ставит игру на паузу (баннер + tick) вместо `netSkipOneTurn`.
  Вернулся → ход продолжается; grace истёк → обычный скип. Mode 4:
  ожидающий член команды тоже ждёт, после истечения — старая ротация.
- **`#netWaitBanner`**: закреплённый пилюль сверху с живым обратным
  отсчётом `⏳ Odotetaan paluuta: Nimi (N s)`; виден и над экраном
  угадывающего, и над экраном хода.
- **`_netTick`** (1 с, ленивый, самогаснущий): секунды баннера и бейджа,
  failsafe — если `PLAYER_DISCONNECTED` потерялся в нашем собственном
  reconnect-окне, локальное истечение `graceUntil` запускает тот же
  детерминированный скип (сходимость сохраняется).
- **`window.netCanAct()`**: в комнате и офлайн → toast + `false`.
  Подключён в main.js (btn/btnDisplayWords/btnGuessed/btnGiveUp/
  btnStolen) и spells.js (все 5 spell-onclick) — локальное состояние
  больше не уезжает от сервера молча.
- **Conn-badge**: текст с живыми секундами `Yhteys katkesi (N s)`;
  при `navigator.onLine === false` → `📵 Ei verkkoyhteyttä` без retry
  (listener `offline` → мгновенное обновление).
- **Connect UX**: 4-секундный `_slowT`-таймер → хинт «Herätetään
  palvelinta…» при холодном старте; кнопки Luo/Liity дизейблятся
  на время `Net.connect()`.
- **`refreshRoomCharPick()`**: видимость `#roomCharPick` =
  `Net.roomCode && magicToggle.checked`; вызывается из
  `applySettingsToUI`, `netBroadcastSettings` (любое изменение хоста),
  `showLobby`. При выключении магии хост шлёт `CHAR_PICK null` —
  освобождает зависший char в roster.

### Звук (`js/rounds.js`)
- `endRound` считает `willEndGame` ДО проигрывания: последний ход
  без Yrttitarhuri-extra-turn → result-sound не запускается вообще
  (success/curse/fail покрыты одним гардом; druid-звук недостижим
  на финальном ходу по определению).
- `stopAllSounds()` перед `gameWin` в обоих путях (local `endRound` +
  `netHandleGameOver`) — гасит и звуки предыдущего хода.

## Протокол (изменения)
- roster-entries: `+ waiting, graceUntil`; `PLAYER_WAITING` event:
  `+ graceUntil`. Обратная совместимость: старые клиенты игнорируют
  новые поля (их поведение остаётся прежним — скип по connected=false).

## Ограничения (честно)
- Пауза до 90 с на ожидании — by design (подтверждено); видимый
  отсчёт смягчает ожидание. Ручного «skip now» нет.
- Failsafe-tick полагается на clock skew клиент/сервер < ~секунды.
- `netCanAct` покрывает кнопки хода и спелы; рисование/emoji офлайн
  всё ещё возможны локально (релей молча no-op'ит) — осознанно,
  модалку можно закрыть.
