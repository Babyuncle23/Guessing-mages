// verify7.js — ääni- ja reclaim-syuit: rumpu arvaajilla, ääni oletuksena vain
// isännällä + toggle, huonekoodi-chipit, reclaim nimellä.
// Запуск: node verify7.js  (сам поднимает server.js на :8080 с быстрым grace)
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

// Страница со спаем на HTMLMediaElement.play — считаем реальные запуски звуков.
async function newPage(browser, url) {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        window.__plays = [];
        const orig = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            window.__plays.push(this.getAttribute('src') || this.src || '?');
            return orig.apply(this, arguments);
        };
    });
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 900 });
    page.on('dialog', d => d.accept().catch(() => {}));
    page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
    await page.goto(url || BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(300);
    return page;
}
const tap = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); }, sel);
const fill = (page, sel, text) => page.evaluate((s, t) => {
    const el = document.querySelector(s);
    el.value = t;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}, sel, text);
const evl = (page, fn, ...a) => page.evaluate(fn, ...a);
const plays = (page) => evl(page, () => window.__plays || []);
const drumCount = (page) => evl(page, () => (window.__plays || []).filter(s => s.includes('drum.ogg')).length);
const joinViaForm = async (page, name, code) => {
    await tap(page, '#netModeRoom'); await sleep(600);
    await fill(page, '#roomNameInput', name);
    await fill(page, '#roomCodeInput', code);
    await tap(page, '#btnJoinRoom'); await sleep(1000);
};

(async () => {
    const srv = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..', '..'),
        env: { ...process.env, ARK_GRACE_MS: '4000', ARK_HB_MS: '1000', PORT: '8080' },
        stdio: 'pipe'
    });
    {
        const t0 = Date.now(); let up = false;
        while (Date.now() - t0 < 10000 && !up) {
            try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
            if (!up) await sleep(250);
        }
        if (!up) throw new Error('server.js did not start');
    }
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

    try {
        // ============ A. Setup: huone + peli ============
        console.log('== A. Setup: room+game ==');
        const A = await newPage(browser);
        await tap(A, '#netModeRoom'); await sleep(800);
        await fill(A, '#roomNameInput', 'Anna');
        await tap(A, '#btnCreateRoom'); await sleep(1000);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        check('room code shown', /^[A-Z]{4}$/.test(code), code);
        const B = await newPage(browser);
        await joinViaForm(B, 'Ben', code);
        check('B in lobby', await evl(B, () => document.getElementById('roomLobbyView').style.display === 'block'));

        // ============ B. Äänen oletus + toggle ============
        console.log('== B. Sound defaults: host on, guest off + toggle ==');
        check('no stored pref initially', await evl(B, () => sessionStorage.getItem('arksanum-sound') === null));
        check('host default ON', await evl(A, () => window.isSoundOn() === true));
        check('guest default OFF', await evl(B, () => window.isSoundOn() === false));
        check('A: toggle shows 🔊', await evl(A, () => document.getElementById('soundToggleBtn').textContent === '🔊'));
        check('B: toggle shows 🔇', await evl(B, () => document.getElementById('soundToggleBtn').textContent === '🔇'));
        await tap(B, '#soundToggleBtn'); await sleep(200);
        check('B: toggle turns sound ON', await evl(B, () => window.isSoundOn() === true));
        check('B: pref stored', await evl(B, () => sessionStorage.getItem('arksanum-sound') === '1'));
        check('B: icon flips to 🔊', await evl(B, () => document.getElementById('soundToggleBtn').textContent === '🔊'));
        await tap(B, '#soundToggleBtn'); await sleep(200);
        check('B: toggle back OFF', await evl(B, () => window.isSoundOn() === false && sessionStorage.getItem('arksanum-sound') === '0'));
        await tap(B, '#soundToggleBtn'); await sleep(200); // jätä päälle drum-testiä varten

        // ============ C. Peli käyntiin — chipit näkyvät ============
        console.log('== C. Game start + room code chips ==');
        await tap(A, '#btnStartRoomGame'); await sleep(1200);
        check('B guesser screen up', await evl(B, () => document.getElementById('netGuesserScreen').style.display === 'block'));
        check('A: roomCodeChip visible+code', await evl(A, (c) => {
            const el = document.getElementById('roomCodeChip');
            return getComputedStyle(el).display !== 'none' && el.textContent === c;
        }, code));
        check('B: ngRoomCode visible+code', await evl(B, (c) => {
            const el = document.getElementById('ngRoomCode');
            return getComputedStyle(el).display !== 'none' && el.textContent === c;
        }, code));

        // ============ D. Rumpu molemmista puhelimista ============
        console.log('== D. Drum plays on explainer AND guesser ==');
        // deterministinen teema → sanalista → give-up palauttaa rullan
        await evl(A, () => {
            document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
            const t = document.getElementById('theme-weight-perusvaihtoehto');
            if (t) t.value = 1;
        });
        await tap(A, '#btn'); await sleep(3400); // teemarumpu pyörii
        check('A: drum.ogg played', (await drumCount(A)) >= 1);
        check('B: drum.ogg played', (await drumCount(B)) >= 1);
        check('B: theme effect also played', await evl(B, () => (window.__plays || []).filter(s => !s.includes('drum.ogg') && !s.includes('click') && !s.includes('flip') && !s.includes('book')).length >= 1), JSON.stringify(await plays(B)));

        // B mykistetään → B:n vuoro rullaa: omistaja ei kuule, A kuulee relayn
        await evl(B, () => { window.__plays = []; sessionStorage.setItem('arksanum-sound', '0'); window.updateSoundBtn(); });
        const aDrums = await drumCount(A);
        await tap(A, '#btnDisplayWords'); await sleep(500);
        await tap(A, '#btnGiveUp'); await sleep(1500); // A:n vuoro loppuu → B selittää
        await tap(B, '#btn'); await sleep(3400); // B rullaa omalla ruudullaan
        check('muted B (explainer): no local drum', (await drumCount(B)) === 0, JSON.stringify(await plays(B)));
        check('muted B: icon back to 🔇', await evl(B, () => document.getElementById('soundToggleBtn').textContent === '🔇'));
        check('unmuted A: remote drum from B roll', (await drumCount(A)) > aDrums);

        // ============ E. Reclaim nimellä (mid-game, istunto kadonnut) ============
        console.log('== E. Reclaim by name mid-game ==');
        const bPid = await evl(B, () => Net.playerId);
        await evl(B, () => { Net._wantRoom = false; Net.ws.close(); }); // B katosi
        await sleep(5200); // grace 4s + marginaali → DISCONNECTED
        const C = await newPage(browser);
        await joinViaForm(C, 'Ben', code); // sama nimi → reclaim
        await sleep(1500);
        check('C reclaimed same playerId', await evl(C, (p) => Net.playerId === p, bPid));
        check('C in room game (not lobby)', await evl(C, () => window.isRoomGame() === true));
        check('roster still 2 players on A', await evl(A, () => Net.players.length === 2), JSON.stringify(await evl(A, () => Net.players.map(p => p.name))));
        check('C sees B as connected again', await evl(A, (p) => {
            const pl = Net.players.find(x => x.id === p);
            return pl && pl.connected === true;
        }, bPid));

        // ============ F. Vieras nimi mid-game → STARTED-vihje ============
        console.log('== F. Different name mid-game -> STARTED hint ==');
        const E = await newPage(browser);
        await tap(E, '#netModeRoom'); await sleep(600);
        await fill(E, '#roomNameInput', 'Mallu');
        await fill(E, '#roomCodeInput', code);
        await tap(E, '#btnJoinRoom'); await sleep(1200);
        const err = await evl(E, () => document.getElementById('roomError').textContent);
        check('STARTED error with name hint', /samalla nimell/i.test(err), err);
        check('E not dragged into game', await evl(E, () => !Net.roomCode && !window.isRoomGame()));

        // ============ G. Reclaim aulassa (lobby, disconnected) ============
        console.log('== G. Reclaim in lobby ==');
        const F = await newPage(browser);
        await tap(F, '#netModeRoom'); await sleep(600);
        await fill(F, '#roomNameInput', 'Cecil');
        await tap(F, '#btnCreateRoom'); await sleep(900);
        const code2 = await evl(F, () => document.getElementById('roomCodeBig').textContent.trim());
        const Gp = await newPage(browser);
        await joinViaForm(Gp, 'Dana', code2);
        const gPid = await evl(Gp, () => Net.playerId);
        await evl(Gp, () => { Net._wantRoom = false; Net.ws.close(); });
        await sleep(2000); // grace ei lopu mutta paikka disconnected heti
        const H = await newPage(browser);
        await joinViaForm(H, 'Dana', code2);
        await sleep(1200);
        check('H reclaimed Dana seat in lobby', await evl(H, (p) => Net.playerId === p, gPid));
        check('lobby roster still 2', await evl(F, () => Net.players.length === 2));

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    } finally {
        await browser.close().catch(() => {});
        srv.kill();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
