// server.js — Ark-sanum huonepeli-palvelin (Render free tier)
// Express: staattiset tiedostot + /qr.svg — ws: huoneiden hallinta + viestien reititys
const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 8080;
const ROOM_IDLE_MS = 2 * 60 * 60 * 1000; // 2 h

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

// roomCode -> { code, hostId, players: Map<pid,{id,name,char,ws,connected}>, settings, game, lastActivity }
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
    id: p.id, name: p.name, char: p.char, connected: p.connected, host: p.id === room.hostId
}));

const broadcast = (room, obj, exceptPid = null) => {
    const msg = JSON.stringify(obj);
    for (const p of room.players.values()) {
        if (p.id !== exceptPid && p.ws && p.ws.readyState === 1) p.ws.send(msg);
    }
};

const touch = (room) => { room.lastActivity = Date.now(); };

wss.on('connection', (ws) => {
    let me = null; // { room, pid }

    ws.on('message', (raw) => {
        let m;
        try { m = JSON.parse(raw); } catch (e) { return; }

        switch (m.type) {
            case 'PING':
                send(ws, { type: 'PONG' });
                return;

            case 'CREATE_ROOM': {
                const code = genCode();
                const pid = uid();
                const room = {
                    code, hostId: pid,
                    players: new Map([[pid, { id: pid, name: String(m.name || 'Pelaaja').slice(0, 20) || 'Pelaaja', char: null, ws, connected: true }]]),
                    settings: null, game: null,
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
                if (room.game) { send(ws, { type: 'ERROR', code: 'STARTED', msg: 'Peli on jo alkanut tässä huoneessa.' }); return; }
                if (room.players.size >= 10) { send(ws, { type: 'ERROR', code: 'FULL', msg: 'Huone on täynnä.' }); return; }
                const pid = uid();
                room.players.set(pid, { id: pid, name: String(m.name || 'Pelaaja').slice(0, 20) || 'Pelaaja', char: null, ws, connected: true });
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
                p.ws = ws;
                p.connected = true;
                touch(room);
                me = { room, pid: p.id };
                send(ws, { type: 'ROOM_STATE', roomCode: room.code, playerId: p.id, hostId: room.hostId, players: roster(room), settings: room.settings, game: room.game });
                broadcast(room, { type: 'ROSTER', players: roster(room), hostId: room.hostId }, p.id);
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
                    me.room.players.delete(me.pid);
                    broadcast(me.room, { type: 'ROSTER', players: roster(me.room), hostId: me.room.hostId });
                    me = null;
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        if (!me) return;
        const p = me.room.players.get(me.pid);
        if (p) {
            p.connected = false;
            p.ws = null;
            broadcast(me.room, { type: 'ROSTER', players: roster(me.room), hostId: me.room.hostId });
            if (me.room.game) {
                broadcast(me.room, { type: 'EVENT', from: me.pid, event: { kind: 'PLAYER_DISCONNECTED', playerId: me.pid } });
            }
        }
        me = null;
    });
});

// Siivoa yli 2 h toimimattomat huoneet 10 min välein
setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
        const anyConnected = [...room.players.values()].some(p => p.connected);
        if (!anyConnected && now - room.lastActivity > ROOM_IDLE_MS) {
            rooms.delete(code);
        }
    }
}, 10 * 60 * 1000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ark-sanum server running on http://0.0.0.0:${PORT}`);
});
