// verify12.js — megaplan-conn-ux:
// A) Isäntä näkee hahmovalinnan kun taikapeli kytketään päälle (SETTINGS ei palaa lähettäjälle)
// B) Selittäjän grace-odotus: vuoro EI ohitu, wait-banner + countdown
// C) Grace umpeutuu -> PLAYER_DISCONNECTED -> vuoro ohituu
// D) Viimeinen vuoro: vain gameWin, ei success/fail
// E) netCanAct: offline-selittäjä ei voi toimia; navigator.onLine=false -> 📵-badge
// Запуск: node verify12.js  (сам поднимает server.js на :8476 с быстрым grace)
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8476;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser, url) {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        window.__plays = [];
        const orig = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            try { window.__plays.push(((this.getAttribute('src') || this.src || '') + '').split('/').pop()); } catch (e) {}
            return orig.call(this);
        };
    });
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 900 });
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => { if (r.url().includes('/sounds/')) r.abort(); else r.continue(); });
    page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 160)));
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
const waitFor = async (p, fn, timeout = 10000, poll = 100) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        const v = await p.evaluate(fn);
        if (v) return v;
        await sleep(poll);
    }
    return null;
};
const joinViaForm = async (page, name, code) => {
    await tap(page, '#netModeRoom'); await sleep(600);
    await fill(page, '#roomNameInput', name);
    await fill(page, '#roomCodeInput', code);
    await tap(page, '#btnJoinRoom'); await sleep(900);
};
const watchEvents = (page) => evl(page, () => {
    window.__evs = window.__evs || [];
    Net.on('EVENT', m => { if (m.event && m.event.kind) window.__evs.push(m.event.kind); });
});
const evs = (page) => evl(page, () => window.__evs || []);
// Selittäjän täysi vuoro UI:n kautta: arvonta -> sanat -> lopetus
const playTurn = async (page, endBtn) => {
    await tap(page, '#btn');
    await waitFor(page, () => document.getElementById('themeDisplay').textContent || null, 8000, 60);
    await tap(page, '#btnDisplayWords');
    await sleep(500);
    // Task 18: luovutus vaatii 1 s pohjassapidon — testipolku ohittaa UI-holdin
    if (endBtn === '#btnGiveUp') await evl(page, () => window._devConfirmGiveUp());
    else await tap(page, endBtn);
    await sleep(700);
};

(async () => {
    const srv = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..', '..'),
        env: { ...process.env, ARK_GRACE_MS: '4000', ARK_HB_MS: '1000', PORT: String(PORT) },
        stdio: 'pipe'
    });
    let up = false;
    for (let i = 0; i < 30 && !up; i++) {
        try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
        if (!up) await sleep(300);
    }
    if (!up) { console.log('server.js did not start'); srv.kill(); process.exit(1); }
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: true, protocolTimeout: 120000,
        args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required',
               '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding']
    });

    try {
        // ============ A. Isäntäkin näkee hahmovalinnan ============
        console.log('== A. Host char pick visibility ==');
        const A = await newPage(browser);
        await evl(A, () => { localStorage.clear(); document.getElementById('roundSelect').value = '2'; });
        await tap(A, '#netModeRoom'); await sleep(700);
        await fill(A, '#roomNameInput', 'Anna');
        await tap(A, '#btnCreateRoom'); await sleep(1200);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        check('room created', /^[A-Z]{4}$/.test(code), code);
        const B = await newPage(browser);
        await joinViaForm(B, 'Ben', code);
        check('B in lobby', await evl(B, () => document.getElementById('roomLobbyView').style.display === 'block'));

        // Molemmilla magic pois -> valinta piilossa
        check('charPick hidden initially (host)', await evl(A, () => document.getElementById('roomCharPick').style.display === 'none'));
        check('charPick hidden initially (guest)', await evl(B, () => document.getElementById('roomCharPick').style.display === 'none'));

        // Isäntä kytkee taikapelin päälle — SETTINGS ei palaa lähettäjälle,
        // joten ennen korjausta isännän rivi jäi piiloon.
        await evl(A, () => {
            const t = document.getElementById('magicToggle');
            t.checked = true;
            t.dispatchEvent(new Event('change'));
        });
        await sleep(900);
        check('charPick visible on HOST after magic on', await evl(A, () => document.getElementById('roomCharPick').style.display === 'block'));
        check('charPick visible on GUEST after magic on', await evl(B, () => document.getElementById('roomCharPick').style.display === 'block'));
        check('host sees 3 char options', await evl(A, () => document.querySelectorAll('#roomCharOptions .room-char-opt').length === 3));

        // Isäntä valitsee hahmon — päätyy rosteriin molemmilla
        await evl(A, () => document.querySelector('#roomCharOptions .room-char-opt[data-char="Muodonmuuttaja"]').click());
        await sleep(800);
        check('host pick marked picked', await evl(A, () => document.querySelector('#roomCharOptions .room-char-opt[data-char="Muodonmuuttaja"]').classList.contains('picked')));
        check('guest sees host char in roster', await evl(B, () => {
            const h = Net.players.find(p => p.name === 'Anna');
            return h && h.char === 'Muodonmuuttaja';
        }));
        // Vieras valitsee toisen hahmon — ei "taken"-lukittuna
        await evl(B, () => document.querySelector('#roomCharOptions .room-char-opt[data-char="Yrttitarhuri"]').click());
        await sleep(800);
        check('host sees guest char in roster', await evl(A, () => {
            const g = Net.players.find(p => p.name === 'Ben');
            return g && g.char === 'Yrttitarhuri';
        }));
        check('guest pick marked picked', await evl(B, () => document.querySelector('#roomCharOptions .room-char-opt[data-char="Yrttitarhuri"]').classList.contains('picked')));

        // ============ Peli käyntiin (2 kierrosta) ============
        await watchEvents(A); await watchEvents(B);
        await evl(B, () => sessionStorage.setItem('arksanum-sound', '1'));
        await evl(A, () => sessionStorage.setItem('arksanum-sound', '1'));
        await tap(A, '#btnStartRoomGame');
        await Promise.all([
            waitFor(A, () => window.isRoomGame && window.isRoomGame(), 8000),
            waitFor(B, () => window.isRoomGame && window.isRoomGame(), 8000)
        ]);
        check('game started', await evl(A, () => window.netIsMyTurn() === true));

        // Vuoro 1 (A selittää): luovutus -> siirtyy B:lle
        await playTurn(A, '#btnGiveUp');
        await sleep(800);
        check('turn moved to B (idx 1)', await evl(A, () => currentPlayerIndex === 1));
        check('B is explainer', await evl(B, () => window.netIsMyTurn() === true));

        // ============ B. Selittäjän grace-odotus: ei ohitusta ============
        console.log('== B. Explainer transient drop: WAIT + banner, no skip ==');
        await evl(B, () => Net.ws.close()); // _wantRoom jää -> auto-reconnect ~2 s
        await sleep(900);
        check('A still on B turn (no instant skip)', await evl(A, () => currentPlayerIndex === 1));
        check('A sees PLAYER_WAITING', (await evs(A)).includes('PLAYER_WAITING'));
        check('wait banner visible on A', await evl(A, () => {
            const b = document.getElementById('netWaitBanner');
            return b && b.style.display === 'flex' && /Ben/.test(b.textContent);
        }), await evl(A, () => (document.getElementById('netWaitBanner') || {}).textContent));
        check('banner shows countdown seconds', await evl(A, () => /\(\d+ s\)/.test(document.getElementById('netWaitBanner').textContent)));
        await sleep(2800); // B ehtii takaisin ennen gracea (4 s)
        check('B auto-reconnected', await evl(B, () => Net.connected === true));
        check('A sees PLAYER_BACK', (await evs(A)).includes('PLAYER_BACK'));
        check('B still explainer after return', await evl(B, () => window.netIsMyTurn() === true));
        check('wait banner hidden after return', await evl(A, () => document.getElementById('netWaitBanner').style.display === 'none'));

        // Vuoro 2 (B selittää): arvattu -> vuoro 3, kierros 2
        await playTurn(B, '#btnGuessed');
        await sleep(900);
        check('back to A (idx 0, round 2)', await evl(A, () => currentPlayerIndex === 0 && currentRound === 2));

        // Vuoro 3 (A selittää): luovutus -> viimeinen vuoro B:lle
        await playTurn(A, '#btnGiveUp');
        await sleep(900);
        check('turn 4 = B (idx 1)', await evl(B, () => window.netIsMyTurn() === true));

        // ============ D. Viimeinen vuoro: vain voittoääni ============
        console.log('== D. Final turn: only gameWin sound ==');
        const playsBefore = await evl(B, () => window.__plays.length);
        await playTurn(B, '#btnGuessed');
        await sleep(2500);
        const tailB = await evl(B, (n) => window.__plays.slice(n), playsBefore);
        const tailA = await evl(A, () => window.__plays.slice(-4));
        check('gameWin played on explainer B', tailB.includes('gameWin.mp3'), JSON.stringify(tailB));
        check('NO success on final turn (B)', !tailB.includes('success.mp3'), JSON.stringify(tailB));
        check('gameWin on remote A', tailA.includes('gameWin.mp3'), JSON.stringify(tailA));
        check('NO success on remote A', !tailA.includes('success.mp3'), JSON.stringify(tailA));
        check('victory modal on both', await evl(A, () => document.getElementById('victoryModal').style.display === 'flex')
            && await evl(B, () => document.getElementById('victoryModal').style.display === 'flex'));

        // ============ Uusintapeli C-testiä varten ============
        await tap(A, '#btnPlayAgain');
        await sleep(1500);
        check('replay started', await evl(A, () => window.isRoomGame() === true && currentRound === 1));

        // ============ C. Grace umpeutuu -> skip ============
        console.log('== C. Drop past grace -> PLAYER_DISCONNECTED -> skip ==');
        // Vuoro 1 uudessa pelissä = A; siirretään B:lle
        await playTurn(A, '#btnGiveUp');
        await sleep(800);
        check('turn moved to B again', await evl(A, () => currentPlayerIndex === 1));
        await evl(B, () => { Net._wantRoom = false; Net.ws.close(); }); // B ei palaa
        await sleep(700);
        check('wait banner during grace (B gone)', await evl(A, () => document.getElementById('netWaitBanner').style.display === 'flex'));
        check('no skip yet during grace', await evl(A, () => currentPlayerIndex === 1));
        await sleep(4200); // grace 4 s + marginaali
        check('A sees PLAYER_DISCONNECTED', (await evs(A)).includes('PLAYER_DISCONNECTED'));
        check('B turn skipped after grace', await evl(A, () => currentPlayerIndex === 0));
        check('A is explainer after skip', await evl(A, () => window.netIsMyTurn() === true));
        check('wait banner gone after expiry', await evl(A, () => document.getElementById('netWaitBanner').style.display === 'none'));

        // ============ E. netCanAct + navigator.onLine ============
        console.log('== E. Offline action guard + offline badge ==');
        await evl(A, () => { Net._wantRoom = false; Net.ws.close(); });
        await sleep(600);
        check('netCanAct false while offline', await evl(A, () => window.netCanAct() === false));
        await tap(A, '#btn'); // yritetään arpoa teemaa ilman yhteyttä
        await sleep(800);
        check('no roll started offline', await evl(A, () =>
            document.getElementById('btn').disabled === false && currentActiveTheme === ''));
        // navigator.onLine=false -> 📵-badge
        await evl(A, () => {
            Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
            window.dispatchEvent(new Event('offline'));
        });
        await sleep(400);
        check('badge shows offline state', await evl(A, () => {
            const b = document.getElementById('netConnBadge');
            return b.style.display === 'flex' && b.textContent.includes('verkkoyhteytt');
        }), await evl(A, () => (document.getElementById('netConnBadge') || {}).textContent));
        await evl(A, () => {
            Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
            window.dispatchEvent(new Event('online'));
        });
        await evl(A, () => { Net._wantRoom = true; Net._resumeIntent = true; Net.connect(); });
        await sleep(1800);
        check('A back online', await evl(A, () => Net.connected === true));

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    } finally {
        await browser.close().catch(() => {});
        srv.kill();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
