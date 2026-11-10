// js/network.js — Huonepeli (multi-phone room mode): WebSocket-asiakas, aula, synkronointi
// Palvelin on tietämätön rele: kaikki pelilogiikka pysyy asiakkailla.
(function () {
    const $ = (id) => document.getElementById(id);
    const LS_KEY = 'arksanum-room-session';

    // ---------- Yhteys ----------
    const Net = {
        ws: null,
        connected: false,
        roomCode: null,
        playerId: null,
        myName: '',
        isHost: false,
        hostId: null,
        players: [],       // aulan pelaajalista (roster)
        game: null,        // huoneen pelitilannekuva palvelimelta
        _handlers: {},
        _hb: null,
        _reconnectTimer: null,
        _reconnectDelay: 2000,
        _hadOpen: false,   // onko yhteys koskaan auennut (vs. palvelin vasta heräämässä)
        _wantRoom: false   // käyttäjä valitsi Useampi puhelin
    };
    window.Net = Net;

    // Staattisella hostauksella (esim. GitHub Pages) ei ole WS-palvelinta —
    // silloin käytetään tuotantopalvelinta. WebSocket ei ole CORS-rajoitettu.
    const SERVER_FALLBACK = 'https://ark-sanum.onrender.com';
    let _serverBase = null;
    const detectServerBase = async () => {
        if (_serverBase) return _serverBase;
        try {
            const r = await fetch(location.origin + '/healthz', { cache: 'no-store' });
            if (r.ok && (await r.text()).trim().toLowerCase() === 'ok') {
                _serverBase = location.origin;
                return _serverBase;
            }
        } catch (e) {}
        _serverBase = SERVER_FALLBACK;
        return _serverBase;
    };
    const pageUrl = () => location.origin + location.pathname; // toimii myös GitHub Pagesin alipolussa

    // Herätetään nukkuva free-tier-palvelin HTTP-pyynnöllä ennen WS-yhteyttä.
    // no-cors: pyyntö menee perille vaikka vastausta ei voi lukea.
    const warmServer = () => {
        if (!_serverBase || _serverBase === location.origin) return;
        try { fetch(_serverBase + '/healthz', { mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (e) {}
    };

    const saveSession = () => {
        try {
            sessionStorage.setItem(LS_KEY, JSON.stringify({
                roomCode: Net.roomCode, playerId: Net.playerId, name: Net.myName
            }));
        } catch (e) {}
    };
    const loadSession = () => {
        try { return JSON.parse(sessionStorage.getItem(LS_KEY)) || null; } catch (e) { return null; }
    };
    const clearSession = () => { try { sessionStorage.removeItem(LS_KEY); } catch (e) {} };

    const toast = (msg, ms = 2500) => {
        let t = $('netReconnectToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'netReconnectToast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.display = 'block';
        clearTimeout(t._h);
        t._h = setTimeout(() => { t.style.display = 'none'; }, ms);
    };

    const setConnStatus = (msg) => {
        const el = $('roomConnStatus');
        if (el) el.textContent = msg;
    };

    Net.on = (type, fn) => { (Net._handlers[type] = Net._handlers[type] || []).push(fn); };
    const emit = (m) => { (Net._handlers[m.type] || []).forEach(fn => fn(m)); };

    Net.connect = () => new Promise((resolve, reject) => {
        if (Net.ws && Net.ws.readyState === 1) return resolve();
        setConnStatus('Yhdistetään palvelimeen…');
        detectServerBase().then((base) => {
            warmServer();
            try {
                Net.ws = new WebSocket(base.replace(/^http/, 'ws'));
            } catch (e) { return reject(e); }

        Net.ws.onopen = () => {
            Net.connected = true;
            Net._hadOpen = true;
            Net._reconnectDelay = 2000;
            setConnStatus('');
            // Automaattinen uudelleenliittyminen aiempaan huoneeseen
            const s = loadSession();
            if (s && s.roomCode && s.playerId && Net._wantRoom) {
                Net.send({ type: 'REJOIN', roomCode: s.roomCode, playerId: s.playerId, name: s.name });
            }
            // Syke 25 s välein — pitää Renderin free-tien ja yhteyden hereillä
            clearInterval(Net._hb);
            Net._hb = setInterval(() => Net.send({ type: 'PING' }), 25000);
            resolve();
        };
        Net.ws.onmessage = (e) => {
            let m;
            try { m = JSON.parse(e.data); } catch (err) { return; }
            emit(m);
        };
        Net.ws.onclose = () => {
            Net.connected = false;
            clearInterval(Net._hb);
            if (Net._wantRoom) {
                if (Net._hadOpen) {
                    toast('⚠️ Yhteys katkesi — yhdistetään uudelleen…');
                    setConnStatus('Yhdistetään uudelleen…');
                } else {
                    // Palvelin todennäköisesti herää free-tier-unesta — ei hätäistä virhettä
                    setConnStatus('⏳ Herätetään palvelinta — ensimmäinen yhteys voi kestää ~30 s…');
                }
                clearTimeout(Net._reconnectTimer);
                Net._reconnectTimer = setTimeout(() => {
                    Net.connect().catch(() => {});
                }, Net._reconnectDelay);
                Net._reconnectDelay = Math.min(Net._reconnectDelay * 1.6, 15000);
            }
        };
        Net.ws.onerror = () => {
            // Kovaa virhettä näytetään vain jos yhteys on jo ehtinyt aueta —
            // muuten kyseessä on todennäköisesti heräävä free-tier-instanssi.
            if (Net.ws.readyState !== 1 && Net._hadOpen) {
                setConnStatus('Huonepalvelimeen (' + String(_serverBase || '').replace(/^https?:\/\//, '') + ') ei saada yhteyttä.');
            }
        };
        });
    });

    Net.send = (obj) => {
        if (Net.ws && Net.ws.readyState === 1) Net.ws.send(JSON.stringify(obj));
    };
    Net.relay = (event) => Net.send({ type: 'RELAY', event });

    // ---------- Pelitilan apurit ----------
    window.isRoomGame = () => !!(Net.game && Net.game.started);
    const myPid = () => Net.playerId;

    // Joukkueiden selittäjäkursorit: monesko joukkueen jäsen selittää kulloinkin
    let teamCursors = [0, 0];

    window.netGetExplainerPid = () => {
        if (!window.isRoomGame() || !gamePlayers.length) return null;
        const cur = gamePlayers[currentPlayerIndex];
        if (playerMode === 4 && cur && cur.members && cur.members.length) {
            return cur.members[teamCursors[currentPlayerIndex] % cur.members.length];
        }
        return cur ? cur.pid : null;
    };
    window.netIsMyTurn = () => !window.isRoomGame() || window.netGetExplainerPid() === myPid();

    // ---------- Aula-UI ----------
    const showJoinError = (msg) => {
        const el = $('roomError');
        if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
    };

    const renderRoster = () => {
        const list = $('roomPlayerList');
        if (!list) return;
        list.innerHTML = Net.players.map(p => `
            <div class="room-player-row">
                <span>${p.host ? '👑' : '🙂'} <strong>${p.name}</strong> ${p.host ? '<span class="rp-host">(isäntä)</span>' : ''}</span>
                ${p.char ? `<span style="margin-left:6px;">${charImages[p.char] || ''} ${p.char}</span>` : ''}
                ${!p.connected ? '<span class="rp-off">poissa</span>' : ''}
            </div>`).join('');

        // Hahmovalinta: estä jo varatut hahmot
        const optBox = $('roomCharOptions');
        if (optBox) {
            const taken = new Set(Net.players.filter(p => p.id !== Net.playerId && p.char).map(p => p.char));
            optBox.querySelectorAll('.room-char-opt').forEach(b => {
                const c = b.dataset.char;
                b.classList.toggle('taken', taken.has(c));
                const mine = Net.players.find(p => p.id === Net.playerId);
                b.classList.toggle('picked', !!(mine && mine.char === c));
            });
        }
    };

    const applySettingsToUI = (s) => {
        if (!s) return;
        if (typeof window.setPlayerMode === 'function' && s.playerMode) window.setPlayerMode(s.playerMode, false);
        const magicToggle = $('magicToggle');
        if (magicToggle && typeof s.magic === 'boolean' && magicToggle.checked !== s.magic) {
            magicToggle.checked = s.magic;
            magicToggle.dispatchEvent(new Event('change'));
        }
        if (s.rounds && $('roundSelect')) $('roundSelect').value = s.rounds;
        if (s.timer && $('timerSelect')) $('timerSelect').value = s.timer;
        if (s.weights) {
            Object.entries(s.weights).forEach(([id, v]) => {
                const inp = document.getElementById(id);
                if (inp) { inp.value = v; inp.dispatchEvent(new Event('input')); }
            });
        }
        // Hahmovalinta näkyviin jos taikapeli
        const cp = $('roomCharPick');
        if (cp) cp.style.display = s.magic ? 'block' : 'none';
    };

    const collectSettings = () => ({
        playerMode,
        magic: !!($('magicToggle') && $('magicToggle').checked),
        rounds: $('roundSelect') ? $('roundSelect').value : '7',
        timer: $('timerSelect') ? $('timerSelect').value : '0',
        weights: Object.fromEntries([...document.querySelectorAll('.theme-weight-input')].map(i => [i.id, parseInt(i.value, 10) || 0]))
    });

    window.netBroadcastSettings = () => {
        if (Net.isHost && Net.roomCode) Net.send({ type: 'SETTINGS', settings: collectSettings() });
    };

    const showLobby = () => {
        $('roomJoinView').style.display = 'none';
        $('roomLobbyView').style.display = 'block';
        $('roomCodeBig').textContent = Net.roomCode || '----';
        const qr = $('roomQrImg');
        if (qr) qr.src = (_serverBase || location.origin) + '/qr.svg?data=' + encodeURIComponent(pageUrl() + '?room=' + Net.roomCode);
        $('btnStartRoomGame').style.display = Net.isHost ? 'block' : 'none';
        $('roomWaitText').style.display = Net.isHost ? 'none' : 'block';
        document.body.dataset.net = Net.isHost ? 'room-host' : 'room-guest';
        renderRoster();
    };

    // ---------- Pelin käynnistys ----------
    const buildRoomPlayers = (cfg) => {
        const BASE = { flood: 0.2, metamorphosis: 0.25, curse: 0.18, regrowth: 0.18 };
        const roll = 3;
        const mageSpells = (char) => {
            if (char === 'Muodonmuuttaja') return { metamorphosis: calculateSpells(cfg.rounds, BASE.metamorphosis, roll), flood: calculateSpells(cfg.rounds, BASE.flood, roll) };
            if (char === 'Kirouksenlangettaja') return { hunger: calculateSpells(cfg.rounds, BASE.curse, roll), chaos: calculateSpells(cfg.rounds, BASE.flood, roll) };
            if (char === 'Yrttitarhuri') return { regrowth: calculateSpells(cfg.rounds, BASE.regrowth, roll) };
            return {};
        };

        const out = [];
        if (cfg.mode === 4) {
            const t1 = { name: 'Tiimi 1', img: '🛡️', score: 0, spells: {}, members: [], pids: [] };
            const t2 = { name: 'Tiimi 2', img: '⚔️', score: 0, spells: {}, members: [], pids: [] };
            cfg.players.forEach((pl, i) => (i % 2 === 0 ? t1 : t2).members.push(pl.id));
            // Joukkueen hahmo = ensimmäisen jäsenen valitsema hahmo
            const firstOf = (t) => cfg.players.find(pl => t.members.includes(pl.id));
            [t1, t2].forEach((t, i) => {
                const rep = firstOf(t);
                if (cfg.magic && rep && rep.char) {
                    t.name = `Tiimi ${i + 1}: ${rep.char}`;
                    t.img = charImages[rep.char] || t.img;
                    t.spells = mageSpells(rep.char);
                    if (rep.char === 'Yrttitarhuri') t.extraTurnGranted = false;
                }
            });
            out.push(t1, t2);
        } else {
            cfg.players.forEach((pl, i) => {
                const isMage = cfg.magic && pl.char;
                out.push({
                    pid: pl.id,
                    name: isMage ? pl.char : (pl.name || `Pelaaja ${i + 1}`),
                    displayName: pl.name,
                    img: isMage ? (charImages[pl.char] || '🙂') : '🙂',
                    score: 0,
                    spells: cfg.magic ? mageSpells(pl.char) : {},
                    extraTurnGranted: pl.char === 'Yrttitarhuri' ? false : undefined
                });
            });
        }
        return out;
    };

    const startRoomGameLocal = (cfg) => {
        playerMode = cfg.mode;
        totalTurns = parseInt(cfg.rounds, 10) || 10;
        teamCursors = [0, 0];
        gamePlayers = buildRoomPlayers(cfg);
        currentRound = 1;
        turnsInCurrentRound = 0;
        currentPlayerIndex = 0;
        activeModifiers = { extendToEight: false, reduceToThree: false, chaosFourWords: false };
        pendingCurses = { hunger: -1, chaos: -1 };
        usedWordsInThisGame = [];
        isExtraTurnRound = false;
        isMetamorphosisUsedThisTurn = false;
        document.body.dataset.mode = playerMode;

        const cm = $('characterModal');
        if (cm) cm.style.display = 'none';
        $('playerTurn').style.display = 'flex';
        roundControls.style.display = 'none';
        btn.textContent = 'Aloita kierros';
        btn.disabled = false;
        btn.style.display = 'block';
        updateTurnDisplay();
        netRefreshGuesserScreen();
    };

    // ---------- Arvaajan näyttö ----------
    const ngShow = (v) => { $('netGuesserScreen').style.display = v ? 'block' : 'none'; };

    window.netRefreshGuesserScreen = () => {
        if (!window.isRoomGame()) { ngShow(false); return; }
        const mine = window.netIsMyTurn();
        ngShow(!mine);
        if (mine) {
            // Oman vuoron normaalinakyma: varmista etta kontrollit nakyvat oikein
            btn.style.display = currentActiveTheme ? 'none' : 'block';
        }
        const cur = gamePlayers[currentPlayerIndex];
        if (cur) {
            $('ngExplainer').textContent = `🗣️ Selittää: ${cur.displayName || cur.name}`;
        }
        $('ngRound').textContent = `Kierros: ${currentRound} / ${totalTurns}`;
        $('ngScore').innerHTML = gamePlayers.map((pl, i) =>
            `<span>${i === currentPlayerIndex ? '▶ ' : ''}${pl.displayName || pl.name}: <strong>${pl.score}p</strong></span>`
        ).join('<br>');
    };

    let ngTimerInt = null;
    const ngTimerStart = (secs) => {
        clearInterval(ngTimerInt);
        const bar = $('ngTimer'), fill = $('ngTimerFill'), sec = $('ngTimerSec');
        if (!secs || !bar || !fill) return;
        bar.style.display = 'block';
        if (sec) sec.style.display = 'block';
        fill.classList.remove('warn', 'danger');
        const end = performance.now() + secs * 1000;
        ngTimerInt = setInterval(() => {
            const left = end - performance.now();
            const pct = Math.max(0, left / (secs * 1000) * 100);
            fill.style.width = pct + '%';
            fill.classList.toggle('warn', pct <= 50 && pct > 25);
            fill.classList.toggle('danger', pct <= 25);
            if (sec) sec.textContent = Math.max(0, Math.ceil(left / 1000)) + ' s';
            if (left <= 0) { clearInterval(ngTimerInt); bar.style.display = 'none'; if (sec) sec.style.display = 'none'; }
        }, 100);
    };
    const ngTimerStop = () => {
        clearInterval(ngTimerInt);
        if ($('ngTimer')) $('ngTimer').style.display = 'none';
        if ($('ngTimerSec')) $('ngTimerSec').style.display = 'none';
    };

    const ngStatus = (txt) => { const el = $('ngStatus'); if (el) el.innerHTML = txt; };

    const ngApplyTheme = (theme) => {
        currentActiveTheme = theme;
        activeCondition1 = theme;
        $('ngDrum').style.display = 'none';
        const tb = $('ngThemeBlock');
        tb.style.display = 'block';
        $('ngTheme').textContent = theme.toUpperCase();
        const em = $('ngThemeEmoji');
        em.textContent = (typeof themeImages !== 'undefined' && themeImages[theme]) || '';
        em.style.display = 'block';
        $('ngThemeRule').textContent = (typeof themeDescriptions !== 'undefined' && themeDescriptions[theme]) || '';
        ngStatus('Selittäjä avaa sanoja omalla ruudullaan…');
    };

    const ngCurseBanner = (notices) => {
        const b = $('ngCurseBanner');
        if (!b) return;
        if (notices && notices.length) {
            b.innerHTML = `💀 KIROUS AKTIVOITUI: ${notices.join(' ')}`;
            b.style.display = 'block';
        } else {
            b.style.display = 'none';
        }
    };

    // ---------- Vuoron yhteenveto (4 s) ----------
    let tsTimer = null;
    window.netShowSummary = (word, linesHtml) => {
        const card = $('turnSummaryCard');
        if (!card) return;
        $('tsWord').textContent = word || '—';
        $('tsPoints').innerHTML = linesHtml || '';
        card.style.display = 'flex';
        clearTimeout(tsTimer);
        tsTimer = setTimeout(() => { card.style.display = 'none'; }, 4000);
    };

    // ---------- Lähtevät pelitapahtumat (kutsutaan olemassa olevasta koodista) ----------
    window.netRelayThemeRolling = () => { if (window.isRoomGame()) Net.relay({ kind: 'THEME_ROLLING' }); };
    window.netRelayTheme = (theme) => { if (window.isRoomGame()) Net.relay({ kind: 'THEME', theme }); };
    window.netRelayWordsOpen = () => {
        if (!window.isRoomGame()) return;
        const timerSel = $('timerSelect');
        Net.relay({ kind: 'WORDS_OPEN', count: generatedWordsList.length, timer: timerSel ? parseInt(timerSel.value, 10) || 0 : 0 });
    };
    window.netRelayWordLocked = () => { if (window.isRoomGame()) Net.relay({ kind: 'WORD_LOCKED' }); };
    window.netRelaySpellCast = (spell) => { if (window.isRoomGame()) Net.relay({ kind: 'SPELL_CAST', spell }); };
    window.netRelayCursePending = (key, target) => { if (window.isRoomGame()) Net.relay({ kind: 'CURSE_PENDING', key, target }); };
    window.netRelayDraw = (payload) => { if (window.isRoomGame()) Net.relay({ kind: 'DRAW', ...payload }); };
    window.netRelayEmoji = (payload) => { if (window.isRoomGame()) Net.relay({ kind: 'EMOJI', ...payload }); };

    // Kutsutaan endRound()ista selittäjän koneella — muodostaa lopputuloksen muille
    window.netAfterEndRound = (info) => {
        if (!window.isRoomGame()) return;
        const endedIndex = info.endingIndex;
        const appliedCurses = [];
        if (info.consumedHunger) appliedCurses.push('hunger');
        if (info.consumedChaos) appliedCurses.push('chaos');

        if (playerMode === 4 && !isExtraTurnRound) teamCursors[endedIndex] = (teamCursors[endedIndex] || 0) + 1;

        const payload = {
            kind: 'ROUND_END',
            result: info.isGuessed ? 'guessed' : (info.stolenIndex >= 0 ? 'stolen' : 'giveup'),
            timeout: !!info.timeout,
            guesserIndex: info.guesserIndex,
            stolenIndex: info.stolenIndex,
            word: info.word,
            endedIndex,
            appliedCurses,
            scores: gamePlayers.map(p => p.score),
            currentPlayerIndex, currentRound, turnsInCurrentRound,
            isExtraTurnRound,
            modifiers: { ...activeModifiers },
            gameOver: currentRound > totalTurns,
            state: { currentRound, currentPlayerIndex, scores: gamePlayers.map(p => p.score) }
        };
        Net.relay(payload);

        // Näytä yhteenveto myös selittäjällä
        showSummaryForResult(payload);
        netRefreshGuesserScreen();
    };

    const showSummaryForResult = (d) => {
        let lines = '';
        const name = (i) => gamePlayers[i] ? (gamePlayers[i].displayName || gamePlayers[i].name) : '?';
        if (d.result === 'guessed') {
            lines = `✅ <strong>${name(d.endedIndex)}</strong> ansaitsi pisteet.`;
            if (d.guesserIndex >= 0) lines += `<br>🎯 <strong>${name(d.guesserIndex)}</strong> arvasi (+50p)!`;
        } else if (d.result === 'stolen') {
            lines = `⚡ <strong>${name(d.stolenIndex)}</strong> arvasi ensin ja ryösti +50p!`;
        } else if (d.timeout) {
            lines = `⏱️ Aika loppui — ei pisteitä.`;
        } else {
            lines = `❌ Vuoro luovutettiin — ei pisteitä.`;
        }
        window.netShowSummary(d.word, lines);
    };

    // ---------- Saapuvat pelitapahtumat ----------
    window.applyNetRoundEnd = (d) => {
        // Sovella selittäjän laskema tila — etäkoneet eivät laske pisteitä uudelleen
        d.scores.forEach((s, i) => { if (gamePlayers[i]) gamePlayers[i].score = s; });
        currentPlayerIndex = d.currentPlayerIndex;
        currentRound = d.currentRound;
        turnsInCurrentRound = d.turnsInCurrentRound;
        isExtraTurnRound = d.isExtraTurnRound;
        Object.assign(activeModifiers, d.modifiers);
        d.appliedCurses.forEach(k => { pendingCurses[k] = -1; });
        if (playerMode === 4 && !d.isExtraTurnRound) teamCursors[d.endedIndex] = (teamCursors[d.endedIndex] || 0) + 1;

        // UI-siivous kuten endRoundin lopussa (ilman pisteenlaskua)
        window.stopTurnTimer();
        ngTimerStop();
        if (window.hidePeekWord) window.hidePeekWord();
        const cb = $('curseBanner'); if (cb) cb.style.display = 'none';
        ngCurseBanner(null);
        wordList.innerHTML = '';
        wordList.style.display = 'none';
        isWordListHidden = true;
        btnDisplayWords.style.display = 'none';
        ruleInstruction.textContent = '';
        spellContainer.style.display = 'none';
        if (themeDisplay) themeDisplay.textContent = '';
        if (themeImage) themeImage.style.display = 'none';
        document.getElementById('gameContainer').classList.remove('words-active');
        const oldHint = $('themeDrawingHint'); if (oldHint) oldHint.remove();
        const oldInfo = $('themeInfoHelpBtn'); if (oldInfo) oldInfo.remove();
        if (window.clearGameCanvas) window.clearGameCanvas();
        if (window.stopDrawingIntervals) window.stopDrawingIntervals();
        const do1 = $('drawingModalOverlay'); if (do1) do1.style.display = 'none';
        const eo1 = $('emojiModalOverlay'); if (eo1) eo1.style.display = 'none';
        const ngc = $('ngCanvas'); if (ngc) ngc.style.display = 'none';
        const nge = $('ngEmojiView'); if (nge) nge.style.display = 'none';
        if (window.netDrawStop) window.netDrawStop();
        $('ngThemeBlock').style.display = 'none';

        roundControls.style.display = 'none';
        btn.style.display = 'block';
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = 'Aloita kierros';
        currentActiveTheme = '';
        activeCondition1 = '';
        activeCondition2 = '';
        isMetamorphosisUsedThisTurn = false;
        selectedWordIndex = -1;

        updateTurnDisplay();
        showSummaryForResult(d);

        if (d.gameOver) {
            setTimeout(() => { if (typeof showVictoryModal === 'function') showVictoryModal(); }, 350);
        } else {
            netRefreshGuesserScreen();
        }
    };

    // Uusi peli huoneessa: vain isäntä voi käynnistää
    window.netReplayRequest = () => {
        if (Net.isHost && Net.game && Net.game.cfg) {
            Net.send({ type: 'START_GAME', game: { started: true, cfg: Net.game.cfg } });
        } else {
            toast('⏳ Vain isäntä voi aloittaa uuden pelin.');
            // Vieras palaa odottamaan — näytetään voittomodaali piilossa kunnes isäntä aloittaa
        }
    };

    // Vuoron ohitus jos selittäjä katosi verkosta
    const netSkipTurn = () => {
        turnsInCurrentRound++;
        if (turnsInCurrentRound >= gamePlayers.length) { turnsInCurrentRound = 0; currentRound++; }
        const nextIdx = (currentPlayerIndex + 1) % gamePlayers.length;
        if (pendingCurses.hunger === nextIdx) { activeModifiers.reduceToThree = true; pendingCurses.hunger = -1; }
        if (pendingCurses.chaos === nextIdx) { activeModifiers.chaosFourWords = true; pendingCurses.chaos = -1; }
        if (playerMode === 4) teamCursors[currentPlayerIndex] = (teamCursors[currentPlayerIndex] || 0) + 1;
        currentPlayerIndex = nextIdx;
        if (currentRound > totalTurns) {
            if (typeof showVictoryModal === 'function') showVictoryModal();
            return;
        }
        updateTurnDisplay();
        window.netShowSummary('—', '⚠️ Selittäjän yhteys katkesi — vuoro ohitettiin.');
        netRefreshGuesserScreen();
    };

    Net.on('EVENT', (m) => {
        const ev = m.event || {};
        switch (ev.kind) {
            case 'THEME_ROLLING':
                $('ngDrum').style.display = 'block';
                $('ngThemeBlock').style.display = 'none';
                ngStatus('');
                break;
            case 'THEME':
                ngApplyTheme(ev.theme);
                if (typeof window.playThemeEffect === 'function' && typeof themeSounds !== 'undefined' && themeSounds[ev.theme]) {
                    window.playThemeEffect(themeSounds[ev.theme]);
                }
                break;
            case 'WORDS_OPEN':
                ngStatus(`Selittäjä katsoo sanoja (${ev.count} kpl) — arvatkaa!`);
                ngTimerStart(ev.timer);
                break;
            case 'WORD_LOCKED':
                ngStatus('Sana valittu — selitys käynnissä. Arvatkaa!');
                break;
            case 'SPELL_CAST': {
                const flashType = { flood: 'curse', morph: 'curse', regrowth: 'druid', hunger: 'morph', chaos: 'morph' }[ev.spell] || 'curse';
                if (typeof triggerSpellAnimation === 'function') triggerSpellAnimation(flashType);
                ngStatus('✨ Selittäjä loitsi taian!');
                break;
            }
            case 'CURSE_PENDING':
                pendingCurses[ev.key] = ev.target;
                break;
            case 'DRAW':
                if (typeof window.netDrawEvent === 'function') window.netDrawEvent(ev);
                break;
            case 'EMOJI':
                if (ev.action === 'open') {
                    $('ngEmojiView').style.display = 'block';
                    $('ngEmojiView').textContent = '';
                    ngStatus('Selittäjä kirjoittaa emojeja…');
                } else if (ev.action === 'update') {
                    $('ngEmojiView').textContent = ev.text || '';
                } else if (ev.action === 'close') {
                    // jätä sisältö näkyviin vuoron loppuun
                }
                break;
            case 'ROUND_END':
                window.applyNetRoundEnd(ev);
                break;
            case 'PLAYER_DISCONNECTED':
                if (ev.playerId === window.netGetExplainerPid() && window.isRoomGame()) {
                    netSkipTurn();
                }
                break;
        }
    });

    // ---------- Huoneen luonti/liittyminen ----------
    const enterLobby = (isHost, data) => {
        Net.isHost = isHost;
        Net.hostId = data.hostId;
        Net.players = data.players || [];
        if (data.settings) applySettingsToUI(data.settings);
        showLobby();
    };

    Net.on('ROOM_CREATED', (m) => {
        Net.roomCode = m.roomCode; Net.playerId = m.playerId;
        saveSession();
        enterLobby(true, m);
    });
    Net.on('ROOM_JOINED', (m) => {
        Net.roomCode = m.roomCode; Net.playerId = m.playerId;
        saveSession();
        enterLobby(false, m);
    });
    Net.on('ROOM_STATE', (m) => { // rejoin onnistui
        Net.roomCode = m.roomCode; Net.playerId = m.playerId;
        saveSession();
        Net.players = m.players || [];
        Net.isHost = (m.hostId === Net.playerId);
        Net.hostId = m.hostId;
        if (m.game && m.game.started) {
            Net.game = m.game;
            // Palauta pelitila tilannekuvasta
            if (m.game.cfg) startRoomGameLocal(m.game.cfg);
            if (m.game.state) {
                const st = m.game.state;
                currentRound = st.currentRound; currentPlayerIndex = st.currentPlayerIndex;
                (st.scores || []).forEach((s, i) => { if (gamePlayers[i]) gamePlayers[i].score = s; });
                updateTurnDisplay();
            }
            netRefreshGuesserScreen();
        } else {
            enterLobby(Net.isHost, m);
        }
    });
    Net.on('ROSTER', (m) => { Net.players = m.players || []; renderRoster(); });
    Net.on('SETTINGS', (m) => applySettingsToUI(m.settings));
    Net.on('GAME_STARTED', (m) => {
        Net.game = m.game;
        if (m.game && m.game.cfg) startRoomGameLocal(m.game.cfg);
    });
    Net.on('ERROR', (m) => {
        showJoinError(m.msg || 'Virhe');
        if (m.code === 'NO_ROOM' || m.code === 'NO_PLAYER') clearSession();
    });
    Net.on('PONG', () => {});

    // ---------- DOM-kytkökset ----------
    document.addEventListener('DOMContentLoaded', () => {
        const urlRoom = new URLSearchParams(location.search).get('room');
        // Palaava pelaaja / QR-linkki: herätetään palvelin heti sivunlatauksessa
        if (urlRoom || loadSession()) detectServerBase().then(warmServer);

        $('netModeOne')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            $('netModeOne').classList.add('active');
            $('netModeRoom').classList.remove('active');
            $('roomPanel').style.display = 'none';
            Net._wantRoom = false;
            document.body.dataset.net = 'local';
        });

        $('netModeRoom')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            $('netModeRoom').classList.add('active');
            $('netModeOne').classList.remove('active');
            $('roomPanel').style.display = 'block';
            Net._wantRoom = true;
            Net.connect().catch(() => setConnStatus('Yhteysvirhe'));
        });

        $('btnCreateRoom')?.addEventListener('click', async () => {
            if (typeof playClickSound === 'function') playClickSound();
            Net.myName = ($('roomNameInput').value || 'Pelaaja').trim() || 'Pelaaja';
            showJoinError('');
            try {
                await Net.connect();
                Net.send({ type: 'CREATE_ROOM', name: Net.myName });
            } catch (e) {
                showJoinError('Palvelimeen ei saada yhteyttä.');
            }
        });

        $('btnPathJoin')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            const row = $('roomCodeRow');
            const open = row && row.style.display !== 'flex';
            if (row) row.style.display = open ? 'flex' : 'none';
            $('btnPathJoin').classList.toggle('active', open);
            if (open) $('roomCodeInput')?.focus();
        });

        $('btnJoinRoom')?.addEventListener('click', async () => {
            if (typeof playClickSound === 'function') playClickSound();
            const code = ($('roomCodeInput').value || '').trim().toUpperCase();
            if (code.length !== 4) { showJoinError('Anna 4-kirjaiminen huonekoodi.'); return; }
            Net.myName = ($('roomNameInput').value || 'Pelaaja').trim() || 'Pelaaja';
            showJoinError('');
            try {
                await Net.connect();
                Net.send({ type: 'JOIN_ROOM', roomCode: code, name: Net.myName });
            } catch (e) {
                showJoinError('Palvelimeen ei saada yhteyttä.');
            }
        });

        $('roomCodeInput')?.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
        });

        $('btnStartRoomGame')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            const s = collectSettings();
            const cfg = {
                mode: s.playerMode, magic: s.magic,
                rounds: parseInt(s.rounds, 10) || 10, timer: parseInt(s.timer, 10) || 0,
                weights: s.weights,
                players: Net.players.filter(p => p.connected).map(p => ({ id: p.id, name: p.name, char: p.char }))
            };
            const need = cfg.mode === 3 ? 3 : 2;
            if (cfg.players.length < need) {
                showJoinError(`Tähän pelimuotoon tarvitaan vähintään ${need} pelaajaa.`);
                return;
            }
            Net.send({ type: 'START_GAME', game: { started: true, cfg } });
        });

        // Hahmovalinnat aulassa (jos taikapeli päällä)
        const optBox = $('roomCharOptions');
        if (optBox) {
            Object.keys(charImages).forEach(c => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'room-char-opt';
                b.dataset.char = c;
                b.textContent = charImages[c];
                b.title = c;
                b.addEventListener('click', () => {
                    if (typeof playClickSound === 'function') playClickSound();
                    Net.send({ type: 'CHAR_PICK', char: c });
                });
                optBox.appendChild(b);
            });
        }

        // Isännän asetusmuutokset välitetään huoneeseen
        const bc = () => window.netBroadcastSettings();
        ['magicToggle', 'roundSelect', 'timerSelect'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', bc);
        });
        document.addEventListener('input', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('theme-weight-input')) bc();
        });
        document.querySelectorAll('.mode-option').forEach(b => b.addEventListener('click', bc));

        // ?room=ABCD esitäyttö + automaattinen huonetila + liity-polku auki
        if (urlRoom) {
            $('netModeRoom')?.click();
            $('btnPathJoin')?.click();
            const inp = $('roomCodeInput');
            if (inp) inp.value = urlRoom.toUpperCase().slice(0, 4);
        }
    });
})();
