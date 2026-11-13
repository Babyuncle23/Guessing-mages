// verify6.js — сьют reconnect-resilience: grace-период, resume-баннер,
// stale-сокеты, миграция хоста, гард на устаревший ROUND_END, ?room= конфликт.
// Запуск: node verify6.js  (сам поднимает server.js на :8080 с быстрым grace)
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8481';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser, url) {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 900 });
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => { if (r.url().includes('/sounds/')) r.abort(); else r.continue(); });
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
const reloadWait = async (page) => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.bringToFront();
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(400);
};

(async () => {
    const srv = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..', '..'),
        env: { ...process.env, ARK_GRACE_MS: '4000', ARK_HB_MS: '1000', PORT: '8481' },
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
        console.log('== A. Setup room+game (A=host/explainer, B=guest) ==');
        const A = await newPage(browser);
        await tap(A, '#netModeRoom'); await sleep(800);
        await fill(A, '#roomNameInput', 'Anna');
        await tap(A, '#btnCreateRoom'); await sleep(1000);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        check('room code shown', /^[A-Z]{4}$/.test(code), code);
        const B = await newPage(browser);
        await joinViaForm(B, 'Ben', code);
        check('B in lobby', await evl(B, () => document.getElementById('roomLobbyView').style.display === 'block'));
        await watchEvents(A); await watchEvents(B);
        await tap(A, '#btnStartRoomGame'); await sleep(1200);
        check('B guesser screen up', await evl(B, () => document.getElementById('netGuesserScreen').style.display === 'block'));
        check('A is explainer', await evl(A, () => window.netIsMyTurn() === true));

        // ============ B. Guesser drop -> WAITING -> auto-rejoin -> BACK ============
        console.log('== B. Guesser ws drop: WAITING then BACK, no skip ==');
        await B.evaluate(() => Net.ws.close());
        await sleep(700);
        check('A sees PLAYER_WAITING', (await evs(A)).includes('PLAYER_WAITING'));
        await sleep(2500); // авто-reconnect ~2s < grace 4s
        check('B auto-reconnected', await evl(B, () => Net.connected === true));
        check('B still in room game', await evl(B, () => window.isRoomGame() === true));
        check('A sees PLAYER_BACK', (await evs(A)).includes('PLAYER_BACK'));
        check('no DISCONNECTED (grace held)', !(await evs(A)).includes('PLAYER_DISCONNECTED'));
        check('turn did NOT skip (idx still 0)', await evl(A, () => currentPlayerIndex === 0));

        // ============ C. Explainer drop+resume in grace: vuoro jatkuu ============
        console.log('== C. Explainer transient drop mid-turn: resume keeps turn+words ==');
        await tap(A, '#btn'); await sleep(3400); // тема-барабан
        await tap(A, '#btnDisplayWords'); await sleep(700);
        check('A words open', await evl(A, () => document.getElementById('wordList').children.length > 0));
        check('B sees words-open status', await evl(B, () => document.getElementById('ngStatus').textContent.includes('sanoja')));
        await A.evaluate(() => Net.ws.close());
        await sleep(700);
        check('B sees PLAYER_WAITING', (await evs(B)).filter(k => k === 'PLAYER_WAITING').length >= 1);
        await sleep(2500); // A auto-reconnects in grace
        check('A reconnected', await evl(A, () => Net.connected === true));
        check('A still explainer (idx 0)', await evl(A, () => window.netIsMyTurn() === true));
        check('A words still open (page intact)', await evl(A, () => document.getElementById('wordList').children.length > 0));
        check('B sees PLAYER_BACK', (await evs(B)).includes('PLAYER_BACK'));
        check('still no DISCONNECTED', !(await evs(B)).includes('PLAYER_DISCONNECTED'));

        // ============ D. Explainer drop past grace: скип + converged rejoin ============
        console.log('== D. Explainer drop > grace: turn skips, rejoin sees new turn ==');
        await A.evaluate(() => { Net._wantRoom = false; Net.ws.close(); });
        await sleep(700);
        check('A conn badge visible while offline', await evl(A, () => document.getElementById('netConnBadge').style.display === 'flex'));
        await sleep(4000); // grace 4s истекает -> DISCONNECTED -> skip
        check('B sees PLAYER_DISCONNECTED', (await evs(B)).includes('PLAYER_DISCONNECTED'));
        check('B advanced to idx 1', await evl(B, () => currentPlayerIndex === 1));
        check('B became explainer', await evl(B, () => window.netIsMyTurn() === true));
        // A возвращается — видит уже новый ход (idx 1), а не свой сгоревший
        await evl(A, () => { Net._wantRoom = true; Net._resumeIntent = true; Net.connect(); });
        await sleep(1500);
        check('A rejoined to idx 1 (snapshot fresh)', await evl(A, () => currentPlayerIndex === 1));
        check('A sees guesser screen (не свой ход)', await evl(A, () => document.getElementById('netGuesserScreen').style.display === 'block'));

        // ============ E. Reloaded explainer mid-words -> TURN_SKIPPED ============
        console.log('== E. Reloaded explainer (words lost) auto-skips ==');
        await tap(B, '#btn'); await sleep(3400);
        await tap(B, '#btnDisplayWords'); await sleep(700);
        check('B words open', await evl(B, () => document.getElementById('wordList').children.length > 0));
        await reloadWait(B);
        check('B: resume banner visible after reload', await evl(B, () => document.getElementById('netResumeBanner').style.display === 'flex'));
        await tap(B, '#btnResumeGame'); await sleep(1800);
        check('B rejoined', await evl(B, () => Net.connected === true && !!Net.roomCode));
        await sleep(700); // TURN_SKIPPED долетает до A
        check('A sees TURN_SKIPPED or advanced', (await evs(A)).includes('TURN_SKIPPED') || await evl(A, () => currentPlayerIndex === 0));
        check('A turn back to idx 0', await evl(A, () => currentPlayerIndex === 0));

        // ============ F. Reload guesser (не его ход) -> banner + guesser screen ============
        console.log('== F. Guest reload: banner -> PALAA -> guesser screen ==');
        await evl(B, () => sessionStorage.clear()); // localStorage-fallback под тест
        await reloadWait(B);
        check('B: banner shows from localStorage', await evl(B, () => document.getElementById('netResumeBanner').style.display === 'flex'));
        check('B: banner code matches', await evl(B, (c) => document.getElementById('netResumeCode').textContent === c, code));
        await tap(B, '#btnResumeGame'); await sleep(1800);
        check('B back in room game', await evl(B, () => window.isRoomGame() === true));
        check('B guesser screen restored', await evl(B, () => document.getElementById('netGuesserScreen').style.display === 'block'));
        check('B scoreboard non-empty', await evl(B, () => document.getElementById('ngScore').children.length > 0 || document.getElementById('ngScore').textContent.length > 0));

        // ============ G. Stale ROUND_END guard ============
        // B слал бы свой (уже завершённый, idx 1) ход — endedIndex!==current → drop
        console.log('== G. Stale ROUND_END dropped ==');
        const idxBefore = await evl(B, () => currentPlayerIndex);
        await evl(B, () => Net.relay({ kind: 'ROUND_END', endedIndex: 1, result: 'guessed', scores: [999, 0], currentPlayerIndex: 0, currentRound: 1, turnsInCurrentRound: 1, appliedCurses: [], modifiers: {}, isExtraTurnRound: false, gameOver: false }));
        await sleep(600);
        check('A idx unchanged after stale ROUND_END', await evl(A, (i) => currentPlayerIndex === i, idxBefore));
        check('A scores unchanged', await evl(A, () => gamePlayers[0].score !== 999));

        // ============ H. Миграция хоста в лобби ============
        console.log('== H. Host migration in lobby ==');
        const C = await newPage(browser);
        await tap(C, '#netModeRoom'); await sleep(600);
        await fill(C, '#roomNameInput', 'Cecil');
        await tap(C, '#btnCreateRoom'); await sleep(900);
        const code2 = await evl(C, () => document.getElementById('roomCodeBig').textContent.trim());
        const D = await newPage(browser);
        await joinViaForm(D, 'Dana', code2);
        await evl(C, () => { Net._wantRoom = false; Net.ws.close(); }); // host ушёл без возврата
        await sleep(5000); // grace expiry + migration ROSTER
        check('D promoted to host', await evl(D, () => Net.isHost === true));
        check('D sees start button', await evl(D, () => document.getElementById('btnStartRoomGame').style.display === 'block'));

        // ============ I. ?room= конфликт со старой сессией ============
        console.log('== I. ?room=NEW wins over stale session ==');
        const E = await newPage(browser, BASE + '/?room=' + code2);
        await evl(E, (c) => { // имитируем старую сессию комнаты `code` (room1)
            const s = JSON.stringify({ roomCode: c, playerId: 'fakepid123', name: 'Esa', savedAt: Date.now() });
            sessionStorage.setItem('arksanum-room-session', s);
            localStorage.setItem('arksanum-room-session', s);
        }, code);
        await reloadWait(E); // ?room=code2 сохраняется в URL
        await sleep(800);
        check('E: stale session cleared', await evl(E, () => !sessionStorage.getItem('arksanum-room-session') && !localStorage.getItem('arksanum-room-session')));
        check('E: code input prefilled with code2', await evl(E, (c2) => document.getElementById('roomCodeInput').value === c2, code2));
        check('E: not auto-dragged to old room', await evl(E, () => Net.roomCode === null && document.getElementById('roomLobbyView').style.display === 'none'));

        // ============ J. Явный выход из комнаты ============
        console.log('== J. Leave room button ==');
        await tap(B, '#btnLeaveInGame'); // первый тап — arm
        await sleep(300);
        check('B: leave button armed', await evl(B, () => document.getElementById('btnLeaveInGame').dataset.armed === '1'));
        await tap(B, '#btnLeaveInGame'); // второй — выход
        await sleep(1500);
        check('B left room (reloaded to menu)', await evl(B, () => !Net.roomCode && !window.isRoomGame()));
        check('A sees B gone from roster or offline', await evl(A, () => {
            const p = Net.players.find(x => x.name === 'Ben');
            return !p || p.connected === false;
        }));

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    } finally {
        await browser.close().catch(() => {});
        srv.kill();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
