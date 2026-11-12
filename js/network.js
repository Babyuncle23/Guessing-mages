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
        _wantRoom: false,  // käyttäjä valitsi Useampi puhelin
        _pongTimer: null,  // puoliksi kuolleen socketin vahti
        _offlineSince: 0,  // katkon alkuaika (badge-tila)
        _sessionTaken: false, // toinen laite/välilehti vei istunnon
        _resumeIntent: false, // auto-REJOIN vain kun käyttäjä painoi "Palaa peliin" (tai reconnect huoneessa)
        _waitUntil: {},    // pid -> grace-loppuhetki (ms): pelaaja saattaa vielä palata
        _netTick: null,    // 1 s tikki: wait-laskuri + offline-badgen sekunnit
        _slowT: null       // hidas ensiyhteys -> "herätetään palvelinta" -vihje
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

    const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // sama kuin huoneen idle-aika palvelimella
    const saveSession = () => {
        try {
            const s = JSON.stringify({
                roomCode: Net.roomCode, playerId: Net.playerId, name: Net.myName, savedAt: Date.now()
            });
            sessionStorage.setItem(LS_KEY, s);
            // localStorage selviää selaimen/välileden sulkemisesta — pääpointti:
            // "vahingossa suljin" -tilanteessa pelaaja pääsee takaisin peliin.
            localStorage.setItem(LS_KEY, s);
        } catch (e) {}
    };
    const loadSession = () => {
        try {
            let raw = sessionStorage.getItem(LS_KEY);
            if (!raw) raw = localStorage.getItem(LS_KEY);
            const s = JSON.parse(raw || 'null');
            if (!s || !s.roomCode || !s.playerId) return null;
            if (s.savedAt && Date.now() - s.savedAt > SESSION_TTL_MS) { clearSession(); return null; }
            return s;
        } catch (e) { return null; }
    };
    const clearSession = () => {
        try { sessionStorage.removeItem(LS_KEY); localStorage.removeItem(LS_KEY); } catch (e) {}
    };

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

    // ---------- Yhteysindikaattori (näkyy myös pelin päällä) ----------
    const connBadge = () => {
        let b = $('netConnBadge');
        if (!b) {
            b = document.createElement('div');
            b.id = 'netConnBadge';
            b.style.display = 'none';
            document.body.appendChild(b);
        }
        return b;
    };
    let _badgeState = 'ok'; // ok | warn | err | taken | back
    const updateConnBadge = () => {
        const b = connBadge();
        const inRoom = !!(Net._wantRoom || Net.roomCode);
        if (Net._sessionTaken) {
            b.className = 'err';
            b.innerHTML = `🔁 Huone avattiin toisella laitteella/välilehdellä <button type="button" id="netConnBadgeOk" class="ncb-btn">OK</button>`;
            b.style.display = 'flex';
            $('netConnBadgeOk')?.addEventListener('click', () => { b.style.display = 'none'; });
            return;
        }
        if (!inRoom || Net.connected) {
            if (_badgeState !== 'ok' && inRoom && Net.connected) {
                // Lyhyt "palasi"-välähdys
                b.className = 'ok';
                b.textContent = '✅ Yhteys palautettu';
                b.style.display = 'flex';
                clearTimeout(b._h);
                b._h = setTimeout(() => { b.style.display = 'none'; }, 2000);
            } else {
                b.style.display = 'none';
            }
            _badgeState = 'ok';
            return;
        }
        const offlineFor = Net._offlineSince ? Date.now() - Net._offlineSince : 0;
        const noNet = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (noNet) {
            // Verkko poissa kokonaan — uudelleenyhdistys on turha ennen kuin
            // verkko palaa; 'online'-tapahtuma käynnistää sen automaattisesti.
            _badgeState = 'err';
            b.className = 'err';
            b.textContent = '📵 Ei verkkoyhteyttä — yhdistetään kun verkko palaa';
        } else if (offlineFor > 30000) {
            _badgeState = 'err';
            b.className = 'err';
            b.innerHTML = `❌ Ei yhteyttä palvelimeen <button type="button" id="netConnRetry" class="ncb-btn">Yhdistä uudelleen</button>`;
            $('netConnRetry')?.addEventListener('click', () => {
                if (typeof playClickSound === 'function') playClickSound();
                Net._reconnectDelay = 2000;
                Net.connect().catch(() => updateConnBadge());
            });
        } else {
            _badgeState = 'warn';
            b.className = 'warn';
            b.textContent = `⚠️ Yhteys katkesi (${Math.max(1, Math.floor(offlineFor / 1000))} s) — yhdistetään…`;
        }
        b.style.display = 'flex';
        ensureNetTick();
    };

    // ---------- Grace-odotus (pelaaja saattaa palata) ----------
    // _waitUntil[pid] = paluun määräaika; lähteenä roster.waiting/graceUntil
    // ja PLAYER_WAITING-tapahtumat. Vuoro ei ohitu odotuksen aikana.
    const waitBanner = () => {
        let b = $('netWaitBanner');
        if (!b) {
            b = document.createElement('div');
            b.id = 'netWaitBanner';
            b.style.display = 'none';
            document.body.appendChild(b);
        }
        return b;
    };
    const isWaitingPid = (pid) => !!(pid && Net._waitUntil[pid] > Date.now());
    const clearWaits = () => { Net._waitUntil = {}; updateWaitBanner(); };
    const updateWaitBanner = () => {
        const b = waitBanner();
        const now = Date.now();
        const entries = Object.entries(Net._waitUntil).filter(([, t]) => t > now);
        if (!entries.length || !window.isRoomGame()) {
            b.style.display = 'none';
            return;
        }
        const names = entries.map(([pid, t]) =>
            `${rosterName(pid)} (${Math.max(1, Math.ceil((t - now) / 1000))} s)`);
        b.textContent = `⏳ Odotetaan paluuta: ${names.join(', ')}`;
        b.style.display = 'flex';
        ensureNetTick();
    };
    // Roster on auktoriteetti odotustiloihin (kattaa myös oman reconnectin)
    const syncWaits = (players) => {
        const known = new Set((players || []).map(p => p.id));
        (players || []).forEach(p => {
            if (p.waiting && p.graceUntil) Net._waitUntil[p.id] = p.graceUntil;
            else delete Net._waitUntil[p.id];
        });
        // Huoneesta poistunut pelaaja ei ole enää odotuksessa
        Object.keys(Net._waitUntil).forEach(pid => { if (!known.has(pid)) delete Net._waitUntil[pid]; });
        updateWaitBanner();
    };

    // Yksi 1 s tikki ajaa wait-laskuria, offline-badgen sekunteja ja
    // varmistaa ettei grace-loppu jää huomaamatta jos DISCONNECTED-viesti
    // meni kuolleeseen sockettiin (oma reconnect).
    const ensureNetTick = () => {
        if (Net._netTick) return;
        Net._netTick = setInterval(() => {
            const now = Date.now();
            let expired = false;
            Object.keys(Net._waitUntil).forEach(pid => {
                if (Net._waitUntil[pid] <= now) { delete Net._waitUntil[pid]; expired = true; }
            });
            updateWaitBanner();
            if (expired && window.isRoomGame()) netEnsureExplainerAvailable();
            if ((Net._wantRoom || Net.roomCode) && !Net.connected) updateConnBadge();
            // Itsestään sammuva: ei työtä kun kaikki kunnossa
            if (Net.connected && !Object.keys(Net._waitUntil).length) {
                clearInterval(Net._netTick);
                Net._netTick = null;
            }
        }, 1000);
    };

    // Vuoron toiminnot vaativat yhteyden — muuten paikallinen tila ajaisi
    // erilleen ja seuraava snapshot näyttäisi "nollanneen" pelaajan tekemiset.
    window.netCanAct = () => {
        if (!window.isRoomGame() || Net.connected) return true;
        toast('⚠️ Ei yhteyttä — odota kunnes yhteys palaa');
        return false;
    };

    // Näytön sammumisen jälkeinen herätys- ja elvytystarkistus:
    // mobiililaitteet voivat tappaa socketin hiljaa ilman close-tapahtumaa.
    const netWakeCheck = () => {
        if (Net._sessionTaken) return;
        if (!Net._wantRoom && !Net.roomCode) return;
        if (!Net.ws || Net.ws.readyState !== 1) {
            clearTimeout(Net._reconnectTimer);
            Net.connect().catch(() => updateConnBadge());
            return;
        }
        // Socket näyttää auki — varmistetaan pongin todisteella
        clearTimeout(Net._pongTimer);
        Net.send({ type: 'PING' });
        Net._pongTimer = setTimeout(() => {
            try { if (Net.ws) Net.ws.close(); } catch (e) {}
        }, 5000);
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

        // Hidas ensiyhteys (free-tier cold start): näytä käyttäjälle
        // ymmärrettävä vihje ~4 s jälkeen, älä jätä vain "Yhdistetään…"
        clearTimeout(Net._slowT);
        Net._slowT = setTimeout(() => {
            if (!Net.connected && !Net._hadOpen) {
                setConnStatus('⏳ Herätetään palvelinta — ensimmäinen yhteys voi kestää ~30 s…');
            }
        }, 4000);

        Net.ws.onopen = () => {
            clearTimeout(Net._slowT);
            Net.connected = true;
            Net._hadOpen = true;
            Net._reconnectDelay = 2000;
            Net._offlineSince = 0;
            setConnStatus('');
            updateConnBadge();
            // Uudelleenliittyminen aiempaan huoneeseen — vain kun olimme jo
            // huoneessa (reconnect) tai käyttäjä valitsi "Palaa peliin".
            // Pelkän istunnon olemassaolo ei saa kaapata käyttäjää takaisin
            // vanhaan huoneeseen, kun hän tahtoo tehdä uuden.
            const s = loadSession();
            if (s && s.roomCode && s.playerId && Net._wantRoom && (Net.roomCode || Net._resumeIntent)) {
                Net.send({ type: 'REJOIN', roomCode: s.roomCode, playerId: s.playerId, name: s.name });
            }
            Net._resumeIntent = false;
            // Syke 25 s välein — pitää Renderin free-tien ja yhteyden hereillä.
            // Jokaisen pingin jälkeen vaaditaan pong 8 s sisällä, muuten socket on
            // hiljaa kuollut (esim. laite nukkunut) ja suljetaan -> reconnect.
            clearInterval(Net._hb);
            const hbTick = () => {
                Net.send({ type: 'PING' });
                clearTimeout(Net._pongTimer);
                Net._pongTimer = setTimeout(() => {
                    try { if (Net.ws) Net.ws.close(); } catch (e) {}
                }, 8000);
            };
            Net._hb = setInterval(hbTick, 25000);
            resolve();
        };
        Net.ws.onmessage = (e) => {
            let m;
            try { m = JSON.parse(e.data); } catch (err) { return; }
            emit(m);
        };
        Net.ws.onclose = () => {
            clearTimeout(Net._slowT);
            Net.connected = false;
            clearInterval(Net._hb);
            clearTimeout(Net._pongTimer);
            if (Net._sessionTaken) { updateConnBadge(); return; }
            if (!Net._offlineSince) Net._offlineSince = Date.now();
            if (Net._wantRoom) {
                if (Net._hadOpen) {
                    setConnStatus('Yhdistetään uudelleen…');
                } else {
                    // Palvelin todennäköisesti herää free-tier-unesta — ei hätäistä virhettä
                    setConnStatus('⏳ Herätetään palvelinta — ensimmäinen yhteys voi kestää ~30 s…');
                }
                clearTimeout(Net._reconnectTimer);
                Net._reconnectTimer = setTimeout(() => {
                    Net.connect().catch(() => updateConnBadge());
                }, Net._reconnectDelay);
                Net._reconnectDelay = Math.min(Net._reconnectDelay * 1.6, 15000);
            }
            updateConnBadge();
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
        if (s.timer !== undefined && typeof window.setTimerSeconds === 'function') window.setTimerSeconds(s.timer);
        // Omat ehdot ennen painoja — korttien inputit pitää olla olemassa
        if (Array.isArray(s.customs) && typeof window.customThemesApi !== 'undefined') {
            window.customThemesApi.setAll(s.customs);
        }
        if (s.weights) {
            Object.entries(s.weights).forEach(([id, v]) => {
                const inp = document.getElementById(id);
                if (inp) { inp.value = v; inp.dispatchEvent(new Event('input')); }
            });
        }
        refreshRoomCharPick();
    };

    // Hahmovalinta aulassa: näkyy kun ollaan huoneessa JA taikapeli päällä.
    // Isännän oma magicToggle-kytkentä ei kierrä palvelimen kautta takaisin
    // (SETTINGS lähetetään vain muille) → päivitetään myös paikallisesti.
    const refreshRoomCharPick = () => {
        const cp = $('roomCharPick');
        if (!cp) return;
        const magic = !!($('magicToggle') && $('magicToggle').checked);
        const show = !!(Net.roomCode && magic);
        const wasShown = cp.style.display !== 'none';
        cp.style.display = show ? 'block' : 'none';
        // Taikapeli pois päältä → vapauta oma varattu hahmo rosterista
        if (wasShown && !show && Net.roomCode) Net.send({ type: 'CHAR_PICK', char: null });
    };

    const collectSettings = () => ({
        playerMode,
        magic: !!($('magicToggle') && $('magicToggle').checked),
        rounds: $('roundSelect') ? $('roundSelect').value : '7',
        timer: String(typeof window.getTimerSeconds === 'function' ? window.getTimerSeconds() : 0),
        customs: typeof window.customThemesApi !== 'undefined' ? window.customThemesApi.list() : [],
        weights: Object.fromEntries([...document.querySelectorAll('.theme-weight-input')].map(i => [i.id, parseInt(i.value, 10) || 0]))
    });

    window.netBroadcastSettings = () => {
        if (Net.isHost && Net.roomCode) Net.send({ type: 'SETTINGS', settings: collectSettings() });
        // Isännän omat näkymät (mm. hahmovalinta) eivät saa SETTINGS-echoa —
        // päivitetään paikallisesti.
        refreshRoomCharPick();
    };

    // Vieraan asetusnäkymä on vain luettavaksi — isäntä hallitsee huoneen
    // asetuksia. Lukitus poistuu kun vieras poistuu huoneesta / tulee isännäksi.
    const updateSettingsLock = () => {
        const locked = !!(Net.roomCode && !Net.isHost);
        document.body.classList.toggle('room-settings-locked', locked);
        let hint = $('settingsLockHint');
        if (locked && !hint) {
            const tab = $('settingsTab');
            const h3 = tab ? tab.querySelector('h3') : null;
            if (h3) {
                hint = document.createElement('p');
                hint.id = 'settingsLockHint';
                hint.className = 'room-hint';
                hint.style.marginBottom = '12px';
                hint.textContent = '🔒 Asetuksia hallitsee huoneen isäntä — voit katsoa valintoja, mutta vain isäntä voi muuttaa niitä.';
                h3.insertAdjacentElement('afterend', hint);
            }
        }
        if (hint) hint.style.display = locked ? 'block' : 'none';
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
        updateSettingsLock();
        refreshRoomCharPick();
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
        _netPhase = 'idle';
        _netSpin = null;
        _netRoll = null;
        _victoryFired = false;
        ngStopDrum();
        // Huoneen omat ehdot: isännän lista on totuus — rekisteröidään
        // kaikilla laitteilla ennen ensimmäistä arvontaa.
        if (Array.isArray(cfg.customs) && typeof window.customThemesApi !== 'undefined') {
            window.customThemesApi.setAll(cfg.customs);
        }
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
        // Uusintapeli: edellisen pelin voittomodaali/yhteenveto ei saa jäädä tielle
        const vm = $('victoryModal'); if (vm) vm.style.display = 'none';
        const tsc = $('turnSummaryCard'); if (tsc) tsc.style.display = 'none';
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
        // Pelin päätyttyä arvaajan näyttö ei saa palata peittämään voittomodaalia
        ngShow(!mine && currentRound <= totalTurns);
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

    // ---------- Ruletti arvaajien ruudulla ----------
    let _ngDrumCtx = null;
    const ngSectorsFromUI = () => {
        if (typeof getThemeWeightsFromUI !== 'function') return [{ theme: 'perusvaihtoehto', w: 1 }];
        const w = getThemeWeightsFromUI();
        const s = Object.keys(w).filter(t => w[t] > 0).map(t => ({ theme: t, w: w[t] }));
        return s.length ? s : [{ theme: 'perusvaihtoehto', w: 1 }];
    };
    const ngStartDrum = (spin) => {
        $('ngDrum').style.display = 'block';
        $('ngThemeBlock').style.display = 'none';
        ngStatus('');
        const wheel = $('ngDrumWheel');
        if (!wheel || typeof window.themeDrum !== 'object') return;
        const sectors = (Array.isArray(spin) && spin.length) ? spin : ngSectorsFromUI();
        _ngDrumCtx = themeDrum.mount(wheel, sectors, $('ngDrumHubName'));
        themeDrum.spinInfinite(_ngDrumCtx);
    };
    const ngLandDrum = (theme, cb) => {
        if (_ngDrumCtx) {
            const ctx = _ngDrumCtx;
            _ngDrumCtx = null;
            const ms = themeDrum.land(ctx, theme); // fysiikkajarrutus, palauttaa keston
            setTimeout(cb, 250); // teemakortin data täytetään jo rummun ollessa näkyvissä
            setTimeout(() => {
                themeDrum.destroy(ctx);
                const d = $('ngDrum'); if (d) d.style.display = 'none';
            }, ms + 120); // pyörä piilotetaan vasta kun se on pysähtynyt
        } else cb();
    };
    const ngStopDrum = () => { if (_ngDrumCtx) { themeDrum.destroy(_ngDrumCtx); _ngDrumCtx = null; } };

    // Yhdistetyn pyöräytyksen ajastimet (teemakortti + pyörän tuho)
    let _ngLandT1 = null, _ngLandT2 = null;
    const ngClearLandTimers = () => {
        clearTimeout(_ngLandT1); clearTimeout(_ngLandT2);
        _ngLandT1 = _ngLandT2 = null;
    };

    const ngApplyTheme = (theme) => {
        currentActiveTheme = theme;
        activeCondition1 = theme;
        ngStopDrum(); // no-op jos landaus vielä käynnissä (_ngDrumCtx=null)
        const tb = $('ngThemeBlock');
        tb.style.display = 'block';
        $('ngTheme').textContent = theme.toUpperCase();
        const em = $('ngThemeEmoji');
        em.textContent = (typeof themeImages !== 'undefined' && themeImages[theme]) || '';
        em.style.display = 'block';
        $('ngThemeRule').textContent = (typeof themeDescriptions !== 'undefined' && themeDescriptions[theme]) || '';
        ngStatus('Selittäjä avaa sanoja omalla ruudullaan…');
    };

    // Teemakortti + ääni kun pyörä on pysähtynyt — yhteinen loppuosa
    // sekä vanhalle land-mallille että yhdistetylle pyöräytykselle.
    const applyLandedTheme = (theme) => {
        _netPhase = 'theme';
        ngApplyTheme(theme);
        if (typeof window.playThemeEffect === 'function' && typeof themeSounds !== 'undefined' && themeSounds[theme]) {
            window.playThemeEffect(themeSounds[theme]);
        }
    };

    // Yksi THEME_ROLLING-tapahtuma ajaa koko pyöräytyksen: arvaajan pyörä
    // jarruttaa samaan voittajaan kuin selittäjän — dur on jo vähennetty
    // verkkoviiveellä, joten pysähdys osuu ~samaan aikaan kaikkialla.
    const ngSpinDrumTo = (theme, durMs) => {
        const ctx = _ngDrumCtx;
        if (!ctx || !theme) return;
        const spins = Math.max(0, Math.min(3, Math.floor(durMs / 650)));
        ngClearLandTimers();
        const ms = themeDrum.spinTo(ctx, theme, durMs, spins);
        _ngLandT1 = setTimeout(() => {
            if (_ngDrumCtx === ctx) _ngDrumCtx = null; // ngStopDrum ei tuhkaa vielä
            applyLandedTheme(theme);
        }, Math.max(0, ms - 250));
        _ngLandT2 = setTimeout(() => {
            themeDrum.destroy(ctx);
            if (_ngDrumCtx === ctx) _ngDrumCtx = null;
            const d = $('ngDrum'); if (d) d.style.display = 'none';
        }, ms + 120);
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
        // Jos sanaa ei valittu (luovutus, aikalupa, ohitus) — ei tyhjää riviä
        const hasWord = !!word;
        $('tsWord').textContent = word || '';
        $('tsWord').style.display = hasWord ? 'block' : 'none';
        const lbl = $('tsWordLabel'); if (lbl) lbl.style.display = hasWord ? 'block' : 'none';
        $('tsPoints').innerHTML = linesHtml || '';
        card.style.display = 'flex';
        clearTimeout(tsTimer);
        tsTimer = setTimeout(() => { card.style.display = 'none'; }, 4000);
    };

    // ---------- Lähtevät pelitapahtumat (kutsutaan olemassa olevasta koodista) ----------
    window.netRelayThemeRolling = (spin, theme, dur) => {
        if (!window.isRoomGame()) return;
        _netPhase = 'rolling';
        _netSpin = spin || null;
        // Yksi tapahtuma ajaa koko pyöräytyksen kaikilla puhelimilla: sektorit +
        // voittaja + kesto + lähetysaika (t0-korjauksella vieraat saavuttavat)
        _netRoll = { theme: theme || '', dur: dur || 1950, t0: Date.now() };
        Net.relay({ kind: 'THEME_ROLLING', spin: _netSpin, theme: _netRoll.theme, dur: _netRoll.dur, t0: _netRoll.t0, state: netBuildState() });
    };
    window.netRelayTheme = (theme) => { if (!window.isRoomGame()) return; _netPhase = 'theme'; Net.relay({ kind: 'THEME', theme, state: netBuildState() }); };
    window.netRelayWordsOpen = () => {
        if (!window.isRoomGame()) return;
        _netPhase = 'words';
        Net.relay({ kind: 'WORDS_OPEN', count: generatedWordsList.length, timer: typeof window.getTimerSeconds === 'function' ? window.getTimerSeconds() : 0, state: netBuildState() });
    };
    window.netRelayWordLocked = () => { if (!window.isRoomGame()) return; _netPhase = 'locked'; Net.relay({ kind: 'WORD_LOCKED', state: netBuildState() }); };
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

        _netPhase = 'idle';
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
            state: netBuildState()
        };
        Net.relay(payload);

        // Näytä yhteenveto myös selittäjällä — paitsi viime vuorolla, jolloin
        // kaikki puhelimet menevät suoraan voittomodaaliin
        if (!payload.gameOver) showSummaryForResult(payload);
        netRefreshGuesserScreen();
        // Selittäjän oma laitekin tarkistaa onko seuraava selittäjä paikalla
        netEnsureExplainerAvailable();
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
        _netPhase = 'idle';

        // Tulosäänet kuuluvat kaikille puhelimille — muutkin kuulevat kun
        // selittäjä painaa "Arvattu oikein" omalla ruudullaan. Pelin loppuessa
        // soi vain voittoääni (kuten selittäjälläkin).
        if (!d.gameOver) {
            if (d.result === 'guessed') playAudio(sounds.success);
            else if (d.result === 'stolen') playAudio(sounds.curse);
            else playAudio(sounds.fail);
            if (d.result === 'guessed' && d.isExtraTurnRound) playAudio(sounds.druid);
        }

        netCleanupTurnUI();
        updateTurnDisplay();
        if (!d.gameOver) showSummaryForResult(d);

        if (d.gameOver) {
            netHandleGameOver();
        } else {
            netRefreshGuesserScreen();
            netEnsureExplainerAvailable(); // seuraava selittäjä voi olla offline -> ketjuohitus
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

    // ---------- Tilannekuva & vuoronohitus ----------
    // Yhtenäinen "tilannekuva" joka kulkee relayjen mukana — palvelin säilöö
    // viimeisimmän (m.event.state), joten myöhässä palaava/takana oleva
    // puhelin osaa rakentaa itsensä ajan tasalle.
    const turnSeq = () => currentRound * 1000 + turnsInCurrentRound;
    const turnSig = () => `${currentRound}:${currentPlayerIndex}:${turnsInCurrentRound}:${isExtraTurnRound ? 1 : 0}`;
    let _netPhase = 'idle'; // idle | rolling | theme | words | locked
    let _netSpin = null; // rulettisektorit [{theme,w}] rolling-vaiheessa
    let _netRoll = null; // {theme,dur,t0} käynnissä oleva yhdistetty pyöräytys
    let _victoryFired = false; // voittomodaali jo näytetty tässä pelissä

    // Pelin loppuminen kaikilla puhelimilla — idempotentti. Arvaajan näyttö
    // (z-index 9000) on piilotettava erikseen, muuten se peittää modaalin.
    const netHandleGameOver = () => {
        if (_victoryFired) return;
        _victoryFired = true;
        Net._waitUntil = {};
        updateWaitBanner();
        const ngs = $('netGuesserScreen'); if (ngs) ngs.style.display = 'none';
        const card = $('turnSummaryCard'); if (card) card.style.display = 'none';
        // Varmistetaan ettei edellisen vuoron tulosääni jää kaikumaan voiton päälle
        if (typeof stopAllSounds === 'function') stopAllSounds();
        if (typeof playAudio === 'function' && typeof sounds !== 'undefined') playAudio(sounds.gameWin);
        setTimeout(() => { if (typeof showVictoryModal === 'function') showVictoryModal(); }, 350);
    };

    // Huoneen (isännän) teemapainot ovat totuus — cfg.weights kulkee
    // START_GAMEssa muodossa input-id → paino. Käännetään theme → paino.
    window.netGetThemeWeights = () => {
        const w = (Net.game && Net.game.cfg && Net.game.cfg.weights) || {};
        if (!Object.keys(w).length && typeof getThemeWeightsFromUI === 'function') {
            return getThemeWeightsFromUI(); // varatilanne: vanha isäntä ilman cfg-painoja
        }
        const slugFn = typeof window.themeSlug === 'function' ? window.themeSlug : (t) => t;
        const out = {};
        (typeof themes !== 'undefined' ? themes : []).forEach(t => {
            const v = parseInt(w['theme-weight-' + slugFn(t)], 10);
            out[t] = Math.max(0, isNaN(v) ? 0 : v);
        });
        return out;
    };

    const netBuildState = () => ({
        round: currentRound, idx: currentPlayerIndex, turns: turnsInCurrentRound,
        seq: turnSeq(), sig: turnSig(),
        scores: gamePlayers.map(p => p.score),
        modifiers: { ...activeModifiers },
        curses: { ...pendingCurses },
        extra: isExtraTurnRound,
        cursors: [...teamCursors],
        phase: _netPhase,
        spin: _netPhase === 'rolling' ? _netSpin : null,
        roll: _netPhase === 'rolling' ? _netRoll : null,
        theme: currentActiveTheme || '',
        wordsCount: generatedWordsList.length,
        used: (typeof usedWordsInThisGame !== 'undefined') ? [...usedWordsInThisGame] : []
    });
    const netSyncState = () => { if (window.isRoomGame()) Net.relay({ kind: 'STATE_SYNC', state: netBuildState() }); };

    const pidToPlayerIndex = (pid) => {
        for (let i = 0; i < gamePlayers.length; i++) {
            const pl = gamePlayers[i];
            if (pl.pid === pid) return i;
            if (pl.members && pl.members.includes(pid)) return i;
        }
        return -1;
    };
    const isFromExplainer = (m) => !!m.from && m.from === window.netGetExplainerPid();
    const rosterEntry = (pid) => Net.players.find(p => p.id === pid);
    const rosterName = (pid) => { const e = rosterEntry(pid); return e ? e.name : 'Pelaaja'; };

    // Yhteinen UI-siivous vuoronvaihdossa (ei pisteenlaskua)
    const netCleanupTurnUI = () => {
        window.stopTurnTimer();
        ngTimerStop();
        ngClearLandTimers();
        ngStopDrum();
        _netSpin = null;
        _netRoll = null;
        const ngd = $('ngDrum'); if (ngd) ngd.style.display = 'none';
        const ldr = $('loader'); if (ldr) ldr.style.display = 'none';
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
    };

    // Yhden vuoron siirtymä ilman pisteytystä — peilaa endRoundin siirtymää.
    // announce=false: älä korvaa näkyvää tuloskorttia skip-viestillä.
    const netSkipOneTurn = (announce = true) => {
        activeModifiers.extendToEight = false;
        activeModifiers.reduceToThree = false;
        activeModifiers.chaosFourWords = false;
        const endedIdx = currentPlayerIndex;
        const nextIdx = (endedIdx + 1) % gamePlayers.length;
        if (pendingCurses.hunger === nextIdx) { activeModifiers.reduceToThree = true; pendingCurses.hunger = -1; }
        if (pendingCurses.chaos === nextIdx) { activeModifiers.chaosFourWords = true; pendingCurses.chaos = -1; }
        isExtraTurnRound = false;
        turnsInCurrentRound++;
        if (turnsInCurrentRound >= gamePlayers.length) { turnsInCurrentRound = 0; currentRound++; }
        gamePlayers.forEach(pl => { if (pl.name === 'Yrttitarhuri') pl.extraTurnGranted = false; });
        if (playerMode === 4) teamCursors[endedIdx] = (teamCursors[endedIdx] || 0) + 1;
        currentPlayerIndex = nextIdx;
        _netPhase = 'idle';
        netCleanupTurnUI();
        updateTurnDisplay();
        if (announce) window.netShowSummary(null, '⚠️ Selittäjän yhteys katkesi — vuoro ohitettiin.');
    };

    // Tiimimoodi: pyöräytä selittäjäkursori ensin online-jäseneen vasta sitten ohita vuoro
    const netTryRotateTeamMember = () => {
        const cur = gamePlayers[currentPlayerIndex];
        if (!cur || !cur.members) return false;
        const online = (m) => { const e = rosterEntry(m); return e && e.connected; };
        if (!cur.members.some(online)) return false;
        for (let i = 0; i < cur.members.length; i++) {
            teamCursors[currentPlayerIndex] = (teamCursors[currentPlayerIndex] || 0) + 1;
            if (online(cur.members[teamCursors[currentPlayerIndex] % cur.members.length])) return true;
        }
        return false;
    };

    // Aja peli ohi offline-selittäjien vuorojen — ketjuuntuu turvallisesti.
    // Kattaa: selittäjä katosi, myöhemmän vuoron omistaja katosi aikaisemmin,
    // huoneesta poistunut pelaaja (poissa rosterista kokonaan).
    // POIKKEUS: grace-odotuksessa oleva selittäjä ei ohitu — peli jää
    // odottamaan paluuta (wait-banner + _netTick vapauttaa kun aika loppuu).
    const netEnsureExplainerAvailable = () => {
        if (!window.isRoomGame() || !gamePlayers.length) return;
        let advanced = false, guard = 0;
        // Jos tuloskortti on jo näkyvissä (juuri päättynyt vuoro), älä peitä sitä
        const announce = $('turnSummaryCard')?.style.display !== 'flex';
        while (currentRound <= totalTurns && guard++ < gamePlayers.length + 2) {
            const e = rosterEntry(window.netGetExplainerPid());
            if (e && e.connected) break;
            if (isWaitingPid(window.netGetExplainerPid())) {
                // Vuoro säilyy: odotetaan pelaajan paluuta grace-ajan loppuun.
                updateWaitBanner();
                ensureNetTick();
                break;
            }
            if (playerMode === 4 && netTryRotateTeamMember()) { advanced = true; continue; }
            netSkipOneTurn(announce);
            advanced = true;
        }
        if (currentRound > totalTurns) {
            netCleanupTurnUI();
            netHandleGameOver();
            advanced = true;
        }
        if (advanced) { netRefreshGuesserScreen(); netSyncState(); }
    };

    // Tilannekuvan soveltaminen (ROOM_STATE / STATE_SYNC)
    const netApplyState = (st) => {
        if (!st) return;
        if (st.scores) st.scores.forEach((s, i) => { if (gamePlayers[i]) gamePlayers[i].score = s; });
        if (typeof st.round === 'number') currentRound = st.round;
        if (typeof st.idx === 'number') currentPlayerIndex = st.idx;
        if (typeof st.turns === 'number') turnsInCurrentRound = st.turns;
        if (st.modifiers) Object.assign(activeModifiers, st.modifiers);
        if (st.curses) Object.assign(pendingCurses, st.curses);
        isExtraTurnRound = !!st.extra;
        if (Array.isArray(st.cursors)) st.cursors.forEach((c, i) => { teamCursors[i] = c; });
        if (Array.isArray(st.used) && typeof usedWordsInThisGame !== 'undefined') {
            usedWordsInThisGame.length = 0;
            st.used.forEach(w => usedWordsInThisGame.push(w));
        }
        _netPhase = st.phase || 'idle';
        _netSpin = (st.phase === 'rolling' && Array.isArray(st.spin)) ? st.spin : null;
        _netRoll = (st.phase === 'rolling' && st.roll && st.roll.theme) ? st.roll : null;
        if (st.theme) { currentActiveTheme = st.theme; activeCondition1 = st.theme; }
        updateTurnDisplay();
    };

    // Renderöi näkymä tilan mukaiseksi: selittäjä näkee oman vuoronsa (tai
    // sanalistansa jos sivu ei ehtinyt latautua uudelleen), arvaaja teeman.
    const netRenderPhaseUI = () => {
        const mine = window.netIsMyTurn();
        if (mine) {
            ngShow(false);
            if (_netPhase === 'rolling' || _netPhase === 'idle') {
                // Rejoin kesken rummun: THEME-menetti meni kuolleeseen sockettiin —
                // sivu latautui, joten tulkitaan idleksi ja annetaan rullata uudelleen.
                btn.style.display = 'block';
                btn.disabled = false;
                return;
            }
            if (currentActiveTheme && themeDisplay) {
                themeDisplay.textContent = currentActiveTheme.toUpperCase();
                const im = (typeof themeImages !== 'undefined') ? themeImages[currentActiveTheme] : null;
                if (im) { themeImage.textContent = im; themeImage.style.display = 'block'; }
            }
            btn.style.display = 'none';
            if (generatedWordsList.length && (_netPhase === 'words' || _netPhase === 'locked')) {
                renderOlList();
                wordList.style.display = 'block';
                wordList.classList.remove('hidden-words');
                isWordListHidden = false;
                btnDisplayWords.style.display = 'block';
                btnDisplayWords.textContent = '🙈 Piilota sanat';
                roundControls.style.display = 'flex';
            } else {
                btnDisplayWords.style.display = 'block';
            }
        } else {
            // Peli ohi — älä palauta arvaajan näyttöä voittomodaalin päälle
            if (currentRound > totalTurns) { ngShow(false); return; }
            ngShow(true);
            if (_netPhase === 'rolling') {
                ngStartDrum(_netSpin); // rejoin kesken rummun — sama ruletti pyörii
                if (_netRoll && _netRoll.theme) {
                    const left = _netRoll.dur - (Date.now() - _netRoll.t0);
                    ngSpinDrumTo(_netRoll.theme, Math.max(350, left));
                }
            } else if (_netPhase === 'theme' || _netPhase === 'words' || _netPhase === 'locked') {
                if (currentActiveTheme) ngApplyTheme(currentActiveTheme);
                ngStatus(_netPhase === 'theme' ? 'Selittäjä valmistautuu…' : 'Selittäjä katsoo sanoja — arvatkaa!');
            }
        }
    };

    // ROOM_STATE pelin aikana: rakenna peli tilannekuvasta
    const applyNetSnapshot = (m) => {
        Net.game = m.game;
        const st = (m.game && m.game.state) || {};
        const hadWords = generatedWordsList.length > 0; // sivu ei ehtinyt latautua
        if (m.game.cfg) startRoomGameLocal(m.game.cfg);
        netApplyState(st);
        const wordsOpened = _netPhase === 'words' || _netPhase === 'locked';
        if (window.netIsMyTurn() && wordsOpened && !hadWords) {
            // Sivu ladattiin uudelleen kesken vuoron — sanoja ei voi palauttaa
            // (niitä ei koskaan lähetetä verkkoon). Ohitetaan oma vuoro, jotta peli jatkuu.
            const sigBefore = st.sig || turnSig();
            netSkipOneTurn();
            netEnsureExplainerAvailable();
            Net.relay({ kind: 'TURN_SKIPPED', sigBefore, state: netBuildState() });
            netRefreshGuesserScreen();
            return;
        }
        netRenderPhaseUI();
        netEnsureExplainerAvailable();
        netRefreshGuesserScreen();
    };

    Net.on('EVENT', (m) => {
        const ev = m.event || {};
        switch (ev.kind) {
            case 'STATE_SYNC': {
                const st = ev.state;
                if (!window.isRoomGame() || !st) break;
                if (typeof st.seq === 'number' && st.seq > turnSeq()) {
                    netApplyState(st);
                    netCleanupTurnUI();
                    netRenderPhaseUI();
                    netEnsureExplainerAvailable();
                } else if (st.scores) {
                    st.scores.forEach((s, i) => { if (gamePlayers[i]) gamePlayers[i].score = s; });
                    updateTurnDisplay();
                }
                break;
            }
            case 'TURN_SKIPPED': {
                if (!window.isRoomGame()) break;
                if (ev.sigBefore && turnSig() === ev.sigBefore) {
                    netSkipOneTurn();
                    netEnsureExplainerAvailable();
                    netRefreshGuesserScreen();
                } else if (ev.state && typeof ev.state.seq === 'number' && ev.state.seq > turnSeq()) {
                    netApplyState(ev.state);
                    netCleanupTurnUI();
                    netRenderPhaseUI();
                    netEnsureExplainerAvailable();
                }
                break;
            }
            case 'PLAYER_WAITING':
                Net._waitUntil[ev.playerId] = ev.graceUntil || (Date.now() + 90000);
                toast(`⏳ Pelaajan ${rosterName(ev.playerId)} yhteys katkesi — odotetaan paluuta…`);
                ngStatus(`⏳ Odotetaan pelaajan ${rosterName(ev.playerId)} paluuta…`);
                // Jos kyseessä on vuorossa oleva selittäjä, peli jää odottamaan
                netEnsureExplainerAvailable();
                updateWaitBanner();
                break;
            case 'PLAYER_BACK':
                delete Net._waitUntil[ev.playerId];
                updateWaitBanner();
                toast(`✅ ${rosterName(ev.playerId)} palasi peliin!`);
                netRefreshGuesserScreen();
                break;
            case 'PLAYER_DISCONNECTED':
                delete Net._waitUntil[ev.playerId];
                updateWaitBanner();
                netEnsureExplainerAvailable();
                break;
            case 'THEME_ROLLING':
                if (!isFromExplainer(m)) break;
                _netPhase = 'rolling';
                _netSpin = ev.spin || null;
                _netRoll = ev.theme ? { theme: ev.theme, dur: ev.dur || 1950, t0: ev.t0 || Date.now() } : null;
                playAudio(sounds.drum); // rumpu kuuluu myös arvaajien puhelimista
                ngStartDrum(ev.spin);
                // Yhdistetty pyöräytys: sama voittaja + t0-korjattu kesto →
                // kaikkien puhelimien rummut pysähtyvät ~samaan aikaan.
                if (_netRoll) {
                    const left = _netRoll.dur - (Date.now() - _netRoll.t0);
                    ngSpinDrumTo(_netRoll.theme, Math.max(350, left));
                }
                break;
            case 'THEME':
                if (!isFromExplainer(m)) break;
                _netSpin = null;
                // Yhdistetty pyöräytys sovelsi teeman jo — ei kaksoiskäsittelyä
                if (currentActiveTheme === ev.theme) { _netPhase = 'theme'; break; }
                _netPhase = 'theme';
                ngClearLandTimers(); // hylätä spinin ajastimet — land hoitaa lopun
                // Pyörä hidastuu voittajaan, sitten teemakortti + ääni kuten ennen
                ngLandDrum(ev.theme, () => applyLandedTheme(ev.theme));
                break;
            case 'WORDS_OPEN':
                if (!isFromExplainer(m)) break;
                _netPhase = 'words';
                ngStatus(`Selittäjä katsoo sanoja (${ev.count} kpl) — arvatkaa!`);
                ngTimerStart(ev.timer);
                break;
            case 'WORD_LOCKED':
                if (!isFromExplainer(m)) break;
                _netPhase = 'locked';
                ngStatus('Sana valittu — selitys käynnissä. Arvatkaa!');
                break;
            case 'SPELL_CAST': {
                if (!isFromExplainer(m)) break;
                const flashType = { flood: 'curse', morph: 'curse', regrowth: 'druid', hunger: 'morph', chaos: 'morph' }[ev.spell] || 'curse';
                if (typeof triggerSpellAnimation === 'function') triggerSpellAnimation(flashType);
                ngStatus('✨ Selittäjä loitsi taian!');
                break;
            }
            case 'CURSE_PENDING':
                if (!isFromExplainer(m)) break;
                pendingCurses[ev.key] = ev.target;
                break;
            case 'DRAW':
                if (!isFromExplainer(m)) break;
                if (typeof window.netDrawEvent === 'function') window.netDrawEvent(ev);
                break;
            case 'EMOJI':
                if (!isFromExplainer(m)) break;
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
            case 'ROUND_END': {
                // Hyväksytään vain jos lähettäjä on meidän mielestämme vuorossa oleva
                // selittäjä TAI jos me olemme jäljessä (heidän tilansa on uudempi).
                // Muuten kyseessä on vanhentunut viesti (esim. heränneen laitteen
                // ajastin laukesi myöhässä) — ohitetaan, ettei vuoro hyppää kahdesti.
                const okNow = ev.endedIndex === currentPlayerIndex && pidToPlayerIndex(m.from) === ev.endedIndex;
                const heal = ev.state && typeof ev.state.seq === 'number' && ev.state.seq > turnSeq();
                if (okNow || heal) window.applyNetRoundEnd(ev);
                break;
            }
        }
    });

    // ---------- Äänen oletus + huonekoodi-chipit ----------
    // Äänet päällä oletuksena vain paikallispelissä ja isännällä — vieraan
    // puhelin on hiljainen kunnes käyttäjä itse kytkee äänet päälle.
    window.soundDefaultOn = () => !Net.roomCode || Net.isHost;
    const refreshSoundBtn = () => { if (typeof window.updateSoundBtn === 'function') window.updateSoundBtn(); };
    const updateRoomCodeChips = () => {
        const c = Net.roomCode || '----';
        ['roomCodeChip', 'ngRoomCode'].forEach(id => { const el = $(id); if (el) el.textContent = c; });
    };

    // ---------- Huoneen luonti/liittyminen ----------
    const enterLobby = (isHost, data) => {
        Net.isHost = isHost;
        Net.hostId = data.hostId;
        Net.players = data.players || [];
        if (data.settings) applySettingsToUI(data.settings);
        updateRoomCodeChips();
        refreshSoundBtn();
        showLobby();
    };

    Net.on('ROOM_CREATED', (m) => {
        Net.roomCode = m.roomCode; Net.playerId = m.playerId;
        saveSession();
        updateResumeUI();
        enterLobby(true, m);
        // Varmuudeksi vielä SETTINGS-broadcast — kattaa palvelimet jotka eivät
        // säilö CREATE_ROOMin settings-kenttää (myöhässä liittyvät saavat asetukset)
        window.netBroadcastSettings();
    });
    Net.on('ROOM_JOINED', (m) => {
        Net.roomCode = m.roomCode; Net.playerId = m.playerId;
        Net._reclaimTried = false;
        saveSession();
        updateResumeUI();
        enterLobby(false, m);
    });
    Net.on('ROOM_STATE', (m) => { // rejoin / nimi-claim onnistui
        Net.roomCode = m.roomCode; Net.playerId = m.playerId;
        Net._reclaimTried = false;
        if (!Net.myName) { const s = loadSession(); if (s) Net.myName = s.name || ''; }
        saveSession();
        Net.players = m.players || [];
        Net.isHost = (m.hostId === Net.playerId);
        Net.hostId = m.hostId;
        syncWaits(m.players);
        updateResumeUI();
        updateRoomCodeChips();
        refreshSoundBtn();
        if (m.game && m.game.started && m.game.cfg) {
            applyNetSnapshot(m);
        } else {
            enterLobby(Net.isHost, m);
        }
    });
    Net.on('ROSTER', (m) => {
        Net.players = m.players || [];
        const wasHost = Net.isHost;
        Net.hostId = m.hostId;
        Net.isHost = (m.hostId === Net.playerId);
        syncWaits(m.players);
        renderRoster();
        // Isäntä saattoi vaihtua poissaolon takia — päivitä aulan kontrollit
        if ($('roomLobbyView') && $('roomLobbyView').style.display !== 'none') {
            $('btnStartRoomGame').style.display = Net.isHost ? 'block' : 'none';
            $('roomWaitText').style.display = Net.isHost ? 'none' : 'block';
        }
        if (Net.isHost && !wasHost) toast('👑 Sinusta tuli huoneen isäntä');
        refreshSoundBtn(); // isännän vaihtuessa äänioletus voi muuttua
        updateSettingsLock(); // isännän vaihtuessa asetuslukitus voi muuttua
    });
    Net.on('SETTINGS', (m) => applySettingsToUI(m.settings));
    Net.on('GAME_STARTED', (m) => {
        Net.game = m.game;
        clearWaits(); // uusi peli — odotukset nollataan
        if (m.game && m.game.cfg) startRoomGameLocal(m.game.cfg);
    });
    Net.on('ERROR', (m) => {
        showJoinError(m.msg || 'Virhe');
        if (m.msg) toast('⚠️ ' + m.msg);
        // Istunto vanhentunut (NO_PLAYER) — yritetään palata huoneen nimellä:
        // palvelin claimaa paikan jos saman niminen pelaaja on rosterissa.
        if (m.code === 'NO_PLAYER' && !Net._reclaimTried) {
            const s = loadSession();
            if (s && s.roomCode && s.name) {
                Net._reclaimTried = true;
                Net.send({ type: 'JOIN_ROOM', roomCode: s.roomCode, name: s.name });
                return;
            }
        }
        if (m.code === 'NO_ROOM' || m.code === 'NO_PLAYER' || Net._reclaimTried) {
            Net._reclaimTried = false;
            clearSession();
        }
        updateResumeUI();
    });
    Net.on('PONG', () => { clearTimeout(Net._pongTimer); });
    Net.on('SESSION_TAKEN', () => {
        // Toinen laite/välilehti otti istunnon — ei reconnect-kierteeseen
        Net._sessionTaken = true;
        Net._wantRoom = false;
        clearInterval(Net._hb);
        clearTimeout(Net._reconnectTimer);
        clearTimeout(Net._pongTimer);
        Net.roomCode = null;
        Net._waitUntil = {};
        updateWaitBanner();
        clearSession();
        updateConnBadge();
        updateResumeUI();
        updateRoomCodeChips();
        refreshSoundBtn();
        updateSettingsLock(); // istunto kaapattu — huoneesta poistuttu, lukitus pois
    });

    // ---------- "Palaa peliin" -banneri ----------
    const updateResumeUI = () => {
        const s = loadSession();
        const show = !!(s && s.roomCode && !Net.roomCode && !Net._sessionTaken);
        const b = $('netResumeBanner');
        if (b) {
            b.style.display = show ? 'flex' : 'none';
            if (show) { const c = $('netResumeCode'); if (c) c.textContent = s.roomCode; }
        }
        const l = $('roomResumeLink');
        if (l) {
            l.style.display = show ? 'block' : 'none';
            if (show) { const c = $('roomResumeCode'); if (c) c.textContent = s.roomCode; }
        }
    };
    const resumeIntoRoom = () => {
        const s = loadSession();
        if (!s) { updateResumeUI(); return; }
        Net.myName = s.name || 'Pelaaja';
        Net._wantRoom = true;
        Net._resumeIntent = true; // salli auto-REJOIN kun yhteys aukeaa
        $('netModeRoom')?.classList.add('active');
        $('netModeOne')?.classList.remove('active');
        const p = $('roomPanel'); if (p) p.style.display = 'block';
        showJoinError('');
        Net.connect().catch(() => showJoinError('Palvelimeen ei saada yhteyttä.'));
    };

    // ---------- Huoneesta poistuminen ----------
    // Kaksi painallusta: "Poistu" -> "Varmista?" -> ulos. Tarkoituksellinen
    // poistu poistaa pelaajan rosterista heti (ei grace-odotusta).
    const netLeaveRoom = (btn) => {
        if (!btn) return;
        if (btn.dataset.armed === '1') {
            Net.send({ type: 'LEAVE_ROOM' });
            Net._wantRoom = false;
            clearSession();
            location.assign(location.pathname); // puhdas teardown ilman ?room-parametria
        } else {
            btn.dataset.armed = '1';
            const old = btn.textContent;
            btn.textContent = '⚠️ Varmista poistuminen?';
            setTimeout(() => { if (btn) { btn.dataset.armed = ''; btn.textContent = old; } }, 3000);
        }
    };

    // ---------- DOM-kytkökset ----------
    document.addEventListener('DOMContentLoaded', () => {
        const urlRoom = new URLSearchParams(location.search).get('room');
        // Palaava pelaaja / QR-linkki: herätetään palvelin heti sivunlatauksessa
        if (urlRoom || loadSession()) detectServerBase().then(warmServer);
        updateResumeUI();

        $('netModeOne')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            $('netModeOne').classList.add('active');
            $('netModeRoom').classList.remove('active');
            $('roomPanel').style.display = 'none';
            Net._wantRoom = false;
            document.body.dataset.net = 'local';
            updateResumeUI();
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
            const b = $('btnCreateRoom');
            if (b) b.disabled = true;
            try {
                await Net.connect();
                // Asetukset mukaan huoneen luontiin — myöhässä liittyvät saavat
                // isännän teemat suoraan ilman erillistä SETTINGS-odotusta
                Net.send({ type: 'CREATE_ROOM', name: Net.myName, settings: collectSettings() });
            } catch (e) {
                showJoinError('Palvelimeen ei saada yhteyttä.');
            } finally {
                if (b) b.disabled = false;
            }
        });

        // Huonekoodi-chippi: napautus kopioi koodin leikepöydälle
        ['roomCodeChip', 'ngRoomCode'].forEach(id => {
            $(id)?.addEventListener('click', () => {
                const c = Net.roomCode;
                if (!c) return;
                try { navigator.clipboard?.writeText(c); } catch (e) {}
                const el = $(id);
                if (el) {
                    const old = el.textContent;
                    el.textContent = 'kopioitu';
                    setTimeout(() => { el.textContent = Net.roomCode || old; }, 1200);
                }
            });
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
            const b = $('btnJoinRoom');
            if (b) b.disabled = true;
            try {
                await Net.connect();
                Net.send({ type: 'JOIN_ROOM', roomCode: code, name: Net.myName });
            } catch (e) {
                showJoinError('Palvelimeen ei saada yhteyttä.');
            } finally {
                if (b) b.disabled = false;
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
                customs: s.customs,
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
        ['magicToggle', 'roundSelect', 'timerRange', 'timerInput'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', bc);
        });
        document.addEventListener('input', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('theme-weight-input')) bc();
        });
        document.querySelectorAll('.mode-option').forEach(b => b.addEventListener('click', bc));

        // "Palaa peliin" -banneri ja linkki liittymisnäkymässä
        $('btnResumeGame')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            resumeIntoRoom();
        });
        $('btnDismissResume')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            clearSession();
            updateResumeUI();
        });
        $('roomResumeLink')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            resumeIntoRoom();
        });

        // Poistumispainikkeet (aula, pelinäkymä, arvaajan näyttö, voittomodaali)
        ['btnLeaveRoom', 'btnLeaveInGame', 'ngLeaveBtn', 'btnLeaveVictory'].forEach(id => {
            $(id)?.addEventListener('click', (e) => {
                if (typeof playClickSound === 'function') playClickSound();
                netLeaveRoom(e.currentTarget);
            });
        });

        // Näytön sammuminen / herääminen / verkon palautuminen
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') netWakeCheck();
        });
        window.addEventListener('pageshow', netWakeCheck);
        window.addEventListener('online', () => {
            Net._reconnectDelay = 2000;
            netWakeCheck();
        });
        // Verkon katoaminen → heti selkeä ilmoitus (ei odoteta socket-timeoutia)
        window.addEventListener('offline', () => {
            if (!Net._offlineSince) Net._offlineSince = Date.now();
            updateConnBadge();
            ensureNetTick();
        });

        // ?room=ABCD esitäyttö + automaattinen huonetila + liity-polku auki.
        // Huom: koskaan ei auto-rejoinata — käyttäjä valitsee itse "Liity" tai
        // bannerin "Palaa peliin". Muuten saman selaimen toinen välilehti
        // (jaettu localStorage) voisi kaapata toisen pelaajan istunnon.
        if (urlRoom) {
            const s = loadSession();
            const code = urlRoom.toUpperCase().slice(0, 4);
            // Uusi QR-linkki voittaa vanhan istunnon — muuten REJOIN veisi
            // väärään huoneeseen ja JOIN jättäisi aaveen vanhaan.
            if (s && s.roomCode && s.roomCode !== code) clearSession();
            $('netModeRoom')?.click();
            $('btnPathJoin')?.click();
            const inp = $('roomCodeInput');
            if (inp) inp.value = code;
            updateResumeUI();
        }
    });
})();
