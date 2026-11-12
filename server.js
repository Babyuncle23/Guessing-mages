// server.js — Ark-sanum huonepeli-palvelin (Render free tier)
// Express: staattiset tiedostot + /qr.svg — ws: huoneiden hallinta + viestien reititys
const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 8080;
const ROOM_IDLE_MS = 2 * 60 * 60 * 1000; // 2 h
// Grace-aika katkenneelle pelaajalle ennen vuoron ohitusta / isännän siirtoa.
// Env-overridet nopeisiin automaatisiin testeihin.
const GRACE_MS = +(process.env.ARK_GRACE_MS || 90 * 1000);
const HB_MS = +(process.env.ARK_HB_MS || 30 * 1000);

const app = express();
app.use(express.static(__dirname));

// Dynaaminen QR huoneen liittymislinkille: /qr.svg?data=<urlencoded>
app.get('/qr.svg', async (req, res) => {
    try {
        const data = String(req.query.data || '').slice(0, 300);
        const svg = await QRCode.toString(data, { type: 'svg', margin: 1, width: 220 });
        res.type('image/svg+xml').send(svg);
    } catch (e) {
        res.status(500).send('qr error');
    }
});

// Terveystarkistus (Render + keep-alive pingit)
app.get('/healthz', (req, res) => res.send('ok'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// roomCode -> { code, hostId, players: Map<pid,{id,name,char,ws,connected}>, settings, game, lastActivity, grace: Map<pid,{t,until}> }
const rooms = new Map();

const uid = () => Math.random().toString(36).slice(2, 10);
const genCode = () => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // ei I/O — selkeämpi luettavuus
    let c = '';
    for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
    return rooms.has(c) ? genCode() : c;
};

const send = (ws, obj) => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
};

const roster = (room) => [...room.players.values()].map(p => ({
    id: p.id, name: p.name, char: p.char, connected: p.connected, host: p.id === room.hostId,
    waiting: room.grace.has(p.id),
    graceUntil: (room.grace.get(p.id) || {}).until || 0
}));

const broadcast = (room, obj, exceptPid = null) => {
    const msg = JSON.stringify(obj);
    for (const p of room.players.values()) {
        if (p.id !== exceptPid && p.ws && p.ws.readyState === 1) p.ws.send(msg);
    }
};

const touch = (room) => { room.lastActivity = Date.now(); };

// Grace-timeoutin jälkeen: pelaaja ei palannut — ilmoita peliin ja siirrä isäntätarvittaessa
const finalizeDisconnect = (room, pid) => {
    room.grace.delete(pid);
    const p = room.players.get(pid);
    if (!p || p.connected) return;
    if (room.game) {
        broadcast(room, { type: 'EVENT', from: pid, event: { kind: 'PLAYER_DISCONNECTED', playerId: pid } });
    }
    if (room.hostId === pid) {
        const next = [...room.players.values()].find(pl => pl.connected);
        if (next) room.hostId = next.id;
    }
    // ROSTER kaikille — waiting-lippu putoaa pois myös silloin kun isäntä ei vaihdu
    broadcast(room, { type: 'ROSTER', players: roster(room), hostId: room.hostId });
};

// Pelaaja poistuu huoneesta välittömästi (nappi tai uuteen huoneeseen siirtyminen)
const leaveCurrent = (me) => {
    if (!me || !me.room) return;
    const { room, pid } = me;
    clearTimeout((room.grace.get(pid) || {}).t);
    room.grace.delete(pid);
    room.players.delete(pid);
    if (room.game) {
        broadcast(room, { type: 'EVENT', from: pid, event: { kind: 'PLAYER_DISCONNECTED', playerId: pid } });
    }
    if (room.hostId === pid) {
        const next = [...room.players.values()].find(pl => pl.connected);
        if (next) room.hostId = next.id;
    }
    touch(room);
    broadcast(room, { type: 'ROSTER', players: roster(room), hostId: room.hostId });
};

wss.on('connection', (ws) => {
    let me = null; // { room, pid }
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Yhteinen logiikka REJOINille ja nimellä tehtävälle reclaimille:
    // vanha yhteys pois tieltä, grace perutaan, ROOM_STATE takaisin.
    const attachPlayer = (room, p, name) => {
        // Sama pelaaja toisella välilehdellä/laitteella — vanha yhteys pois tieltä
        if (p.ws && p.ws !== ws && p.ws.readyState === 1) {
            send(p.ws, { type: 'SESSION_TAKEN' });
            try { p.ws.close(4000); } catch (e) {}
        }
        // Grace-odotus perutaan — pelaaja palasi ajoissa
        clearTimeout((room.grace.get(p.id) || {}).t);
        room.grace.delete(p.id);
        p.ws = ws;
        p.connected = true;
        if (name) p.name = String(name).slice(0, 20) || p.name;
        touch(room);
        me = { room, pid: p.id };
        send(ws, { type: 'ROOM_STATE', roomCode: room.code, playerId: p.id, hostId: room.hostId, players: roster(room), settings: room.settings, game: room.game });
        broadcast(room, { type: 'ROSTER', players: roster(room), hostId: room.hostId }, p.id);
        if (room.game) {
            broadcast(room, { type: 'EVENT', from: p.id, event: { kind: 'PLAYER_BACK', playerId: p.id } }, p.id);
        }
    };

    ws.on('message', (raw) => {
        let m;
        try { m = JSON.parse(raw); } catch (e) { return; }

        switch (m.type) {
            case 'PING':
                send(ws, { type: 'PONG' });
                return;

            case 'CREATE_ROOM': {
                if (me) leaveCurrent(me); // älä jätä aavepelaajaa vanhaan huoneeseen
                const code = genCode();
                const pid = uid();
                const room = {
                    code, hostId: pid,
                    players: new Map([[pid, { id: pid, name: String(m.name || 'Pelaaja').slice(0, 20) || 'Pelaaja', char: null, ws, connected: true }]]),
                    settings: m.settings || null, game: null, grace: new Map(),
                    lastActivity: Date.now()
                };
                rooms.set(code, room);
                me = { room, pid };
                send(ws, { type: 'ROOM_CREATED', roomCode: code, playerId: pid, hostId: pid, players: roster(room) });
                break;
            }

            case 'JOIN_ROOM': {
                const room = rooms.get(String(m.roomCode || '').toUpperCase());
                if (!room) { send(ws, { type: 'ERROR', code: 'NO_ROOM', msg: 'Huonetta ei löydy. Tarkista koodi!' }); return; }
                if (me && me.room === room) return; // jo huoneessa — käytä REJOINia
                const name = String(m.name || 'Pelaaja').slice(0, 20) || 'Pelaaja';
                // RECLAIM: samanniminen pelaaja löytyy jo rosterista → paluu omalle
                // paikalleen (säilyy playerId → pelitila pysyy ehjänä). Koskee myös
                // jo alkaneen pelin huonetta — tämä on ainoa tie takaisin.
                const claim = [...room.players.values()].find(
                    p => p.name.trim().toLowerCase() === name.trim().toLowerCase()
                );
                if (claim && (!claim.connected || room.game)) {
                    // Paikka vapaa (pelaaja poissa) TAI peli käynnissä → sama
                    // henkilö toiselta laitteelta: vanha yhteys saa SESSION_TAKENin.
                    // Aulassa yhteydessä oleva nimikaima saa jäädä — kaksi
                    // samannimistä pelaajaa on sallittua.
                    if (me) leaveCurrent(me);
                    attachPlayer(room, claim, name);
                    break;
                }
                if (room.game) { send(ws, { type: 'ERROR', code: 'STARTED', msg: 'Peli on jo alkanut — palaathan samalla nimellä kuin pelissäsi.' }); return; }
                if (room.players.size >= 10) { send(ws, { type: 'ERROR', code: 'FULL', msg: 'Huone on täynnä.' }); return; }
                if (me) leaveCurrent(me); // älä jätä aavepelaajaa vanhaan huoneeseen
                const pid = uid();
                room.players.set(pid, { id: pid, name, char: null, ws, connected: true });
                touch(room);
                me = { room, pid };
                send(ws, { type: 'ROOM_JOINED', roomCode: room.code, playerId: pid, hostId: room.hostId, players: roster(room), settings: room.settings });
                broadcast(room, { type: 'ROSTER', players: roster(room), hostId: room.hostId }, pid);
                break;
            }

            case 'REJOIN': {
                const room = rooms.get(String(m.roomCode || '').toUpperCase());
                if (!room) { send(ws, { type: 'ERROR', code: 'NO_ROOM', msg: 'Huone on suljettu.' }); return; }
                const p = room.players.get(String(m.playerId || ''));
                if (!p) { send(ws, { type: 'ERROR', code: 'NO_PLAYER', msg: 'Pelaajaa ei löydy huoneesta.' }); return; }
                attachPlayer(room, p, m.name);
                break;
            }

            case 'SETTINGS': { // vain isäntä
                if (!me || me.room.hostId !== me.pid) return;
                me.room.settings = m.settings || null;
                touch(me.room);
                broadcast(me.room, { type: 'SETTINGS', settings: me.room.settings }, me.pid);
                break;
            }

            case 'CHAR_PICK': {
                if (!me) return;
                const p = me.room.players.get(me.pid);
                if (p) p.char = m.char || null;
                touch(me.room);
                broadcast(me.room, { type: 'ROSTER', players: roster(me.room), hostId: me.room.hostId });
                break;
            }

            case 'START_GAME': { // vain isäntä
                if (!me || me.room.hostId !== me.pid) return;
                me.room.game = m.game || { started: true };
                touch(me.room);
                broadcast(me.room, { type: 'GAME_STARTED', game: me.room.game });
                send(ws, { type: 'GAME_STARTED', game: me.room.game }); // isännälle myös
                break;
            }

            case 'RELAY': { // pelitapahtumat: lähetetään muille huoneen jäsenille
                if (!me || !me.room.game) return;
                touch(me.room);
                if (m.event && m.event.state) me.room.game.state = m.event.state; // viimeisin tilannekuva
                broadcast(me.room, { type: 'EVENT', from: me.pid, event: m.event }, me.pid);
                break;
            }

            case 'LEAVE_ROOM': {
                if (me) {
                    leaveCurrent(me); // pelaaja poistuu heti — ei grace-aikaa
                    me = null;
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        if (!me) return;
        const { room, pid } = me;
        const p = room.players.get(pid);
        me = null;
        // Vain pelaajan oma tuorein socket saa merkitä hänet poissaolevaksi —
        // vanha kuollut socket ei saa kaataa jo tehtyä REJOINia.
        if (!p || p.ws !== ws) return;
        p.connected = false;
        p.ws = null;
        touch(room);
        // Grace-aika: ruudun sammuminen / hetkellinen katkos ei kaada vuoroa.
        // Asetetaan ENNEN roster-lähetystä, jotta waiting-lippu näkyy heti.
        const until = Date.now() + GRACE_MS;
        clearTimeout((room.grace.get(pid) || {}).t);
        room.grace.set(pid, { t: setTimeout(() => finalizeDisconnect(room, pid), GRACE_MS), until });
        broadcast(room, { type: 'ROSTER', players: roster(room), hostId: room.hostId });
        // Peliin ilmoitetaan odotuksesta + määräaika (countdown-UI); jos pelaaja ei
        // ehdi takaisin, finalizeDisconnect lähettää PLAYER_DISCONNECTEDin.
        if (room.game) {
            broadcast(room, { type: 'EVENT', from: pid, event: { kind: 'PLAYER_WAITING', playerId: pid, graceUntil: until } });
        }
    });
});

// Heartbeat: tappaa hiljaisuuteen jääneet socketit (nukkunut laite ei aina
// sulje TCP:tä). Ilman tätä pelaaja näkyisi ikuisesti "paikalla".
setInterval(() => {
    for (const ws of wss.clients) {
        if (!ws.isAlive) { ws.terminate(); continue; }
        ws.isAlive = false;
        try { ws.ping(); } catch (e) {}
    }
}, HB_MS);

// Siivoa yli 2 h toimimattomat huoneet 10 min välein
setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
        const anyConnected = [...room.players.values()].some(p => p.connected);
        if (!anyConnected && now - room.lastActivity > ROOM_IDLE_MS) {
            for (const g of room.grace.values()) clearTimeout(g.t);
            rooms.delete(code);
        }
    }
}, 10 * 60 * 1000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ark-sanum server running on http://0.0.0.0:${PORT}`);
});
