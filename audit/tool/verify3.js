// Verification for Task 3: multi-phone room mode via Node + WebSockets
// NOTE: all input is synthetic (el.click / dispatchEvent) — real CDP mouse
// events can hang in this headless environment (mouseMoved ACK never arrives).
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080/index.html';
const ROOT = 'http://127.0.0.1:8080';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

const errors = [];
async function newPage(browser, url) {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 900 });
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => { if (r.url().includes('/sounds/')) r.abort(); else r.continue(); });
    page.on('response', r => { if (r.status() >= 400) console.log('  [HTTP' + r.status() + ']', r.url()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await page.goto(url || BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
const evl = (page, fn) => page.evaluate(fn);
const joinViaForm = async (page, name, code) => {
    await tap(page, '#netModeRoom'); await sleep(600);
    await fill(page, '#roomNameInput', name);
    await fill(page, '#roomCodeInput', code);
    await tap(page, '#btnJoinRoom'); await sleep(800);
};
const inkOn = async (pg, id) => pg.evaluate((i) => {
    const c = document.getElementById(i);
    if (!c) return -1;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 0) n++;
    return n;
}, id);

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), stdio: 'pipe' });
    srv.stdout.on('data', d => process.env.VERBOSE && console.log('[srv]', String(d)));
    // Ждём готовности сервера по /healthz (до 10 с), а не фиксированный слип
    {
        const t0 = Date.now();
        let up = false;
        while (Date.now() - t0 < 10000 && !up) {
            try { const r = await fetch('http://127.0.0.1:8080/healthz'); up = r.ok; } catch (e) { /* ещё не поднялся */ }
            if (!up) await sleep(250);
        }
        if (!up) throw new Error('server.js did not start within 10s');
    }

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 30000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] });
    try {
        // ============ A. Lobby ============
        console.log('== A. Lobby ==');
        const A = await newPage(browser);
        await tap(A, '#netModeRoom'); await sleep(800);
        check('room panel visible', await evl(A, () => document.getElementById('roomPanel').style.display === 'block'));
        await fill(A, '#roomNameInput', 'Isanta');
        await tap(A, '#btnCreateRoom'); await sleep(1000);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        check('4-letter room code', /^[A-Z]{4}$/.test(code), code);
        check('lobby view shown', await evl(A, () => document.getElementById('roomLobbyView').style.display === 'block'));
        check('QR image loaded', await evl(A, () => {
            const img = document.getElementById('roomQrImg');
            return img.src.includes('/qr.svg?data=') && img.complete;
        }));
        check('host sees start btn', await evl(A, () => document.getElementById('btnStartRoomGame').style.display === 'block'));

        const B = await newPage(browser);
        await joinViaForm(B, 'Vieras2', code);
        const C = await newPage(browser, ROOT + '/?room=' + code); // ?room= autofill
        await sleep(600);
        check('?room= autofills code', await C.evaluate((c) => document.getElementById('roomCodeInput').value === c, code));
        await fill(C, '#roomNameInput', 'Vieras3');
        await tap(C, '#btnJoinRoom'); await sleep(900);
        check('B in lobby', await evl(B, () => document.getElementById('roomLobbyView').style.display === 'block'));
        check('C in lobby', await evl(C, () => document.getElementById('roomLobbyView').style.display === 'block'));
        check('roster = 3 on host', await evl(A, () => document.querySelectorAll('#roomPlayerList .room-player-row').length) === 3);
        check('guest sees wait text, no start btn', await evl(B, () =>
            document.getElementById('btnStartRoomGame').style.display === 'none' &&
            document.getElementById('roomWaitText').style.display !== 'none'));

        // ============ B. Start 3-player game ============
        console.log('== B. Game start ==');
        await A.evaluate(() => {
            document.querySelector('.mode-option[data-mode="3"]').click();
            document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; x.dispatchEvent(new Event('input', { bubbles: true })); });
            const el = document.getElementById('theme-weight-piirtaminen');
            el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(400);
        check('settings broadcast to guest', await evl(B, () => playerMode === 3));
        check('weights broadcast to guest', await evl(C, () => parseInt(document.getElementById('theme-weight-piirtaminen').value, 10) === 1));
        await tap(A, '#btnStartRoomGame'); await sleep(1200);
        check('A: game started, 3 players', await evl(A, () => window.isRoomGame() && gamePlayers.length === 3));
        check('B: game started', await evl(B, () => window.isRoomGame() && gamePlayers.length === 3));
        check('C: game started', await evl(C, () => window.isRoomGame() && gamePlayers.length === 3));
        check('A is explainer (player 0)', await evl(A, () => window.netIsMyTurn() === true));
        check('B sees guesser screen', await evl(B, () => window.netIsMyTurn() === false && document.getElementById('netGuesserScreen').style.display === 'block'));
        check('C sees guesser screen', await evl(C, () => document.getElementById('netGuesserScreen').style.display === 'block'));

        // ============ C. Theme roll + words secrecy ============
        console.log('== C. Turn sync ==');
        await tap(A, '#btn'); await sleep(3400);
        check('B got theme PIIRTÄMINEN', await evl(B, () => document.getElementById('ngTheme').textContent.toUpperCase().includes('PIIRT')) &&
                                     await evl(C, () => document.getElementById('ngTheme').textContent.toUpperCase().includes('PIIRT')));
        check('B guesser screen: explainer only via ngScore ▶ (no dup)', await evl(B, () =>
            document.getElementById('ngExplainer') === null &&
            /▶\s*Isanta/.test(document.getElementById('ngScore').textContent)));
        await tap(A, '#btnDisplayWords'); await sleep(600);
        check('A sees 5 words', await evl(A, () => document.querySelectorAll('#wordList li').length) === 5);
        check('B NEVER receives word list', await evl(B, () => document.querySelectorAll('#wordList li').length === 0));
        check('C NEVER receives word list', await evl(C, () => document.querySelectorAll('#wordList li').length === 0));
        check('B status updates on words open', await evl(B, () => document.getElementById('ngStatus').textContent.includes('sanoja')));

        // ============ D. Drawing stream ============
        console.log('== D. Drawing stream ==');
        // sniff B's incoming events for diagnosis
        await B.evaluate(() => {
            window.__evlog = [];
            Net.on('EVENT', m => window.__evlog.push(m.event.kind + ':' + (m.event.action || '-')));
        });
        await C.evaluate(() => {
            window.__evlog = [];
            Net.on('EVENT', m => window.__evlog.push(m.event.kind + ':' + (m.event.action || '-')));
        });
        // lock a NON-bonus word so scoring is deterministic
        await A.evaluate(() => document.querySelector('#wordList li[data-rare="false"]').click()); await sleep(300);
        await tap(A, '#themeBlock'); await sleep(700);
        check('A drawing modal open', await evl(A, () => document.getElementById('drawingModalOverlay').style.display === 'flex'));
        check('B guesser canvas opened', await evl(B, () => document.getElementById('ngCanvas').style.display === 'block'));
        await A.evaluate(() => {
            const c = document.getElementById('drawingModalCanvas');
            const r = c.getBoundingClientRect();
            const ev = (t, x, y) => c.dispatchEvent(new MouseEvent(t, { clientX: r.x + r.width * x, clientY: r.y + r.height * y, bubbles: true }));
            ev('mousedown', 0.2, 0.8);
            [[0.35, 0.5], [0.5, 0.2], [0.65, 0.5], [0.8, 0.8]].forEach(([x, y]) => ev('mousemove', x, y));
            ev('mouseup', 0.8, 0.8);
        });
        await sleep(600);
        const bInk = await inkOn(B, 'ngCanvas');
        const cInk = await inkOn(C, 'ngCanvas');
        const bDiag = await evl(B, () => {
            const c = document.getElementById('ngCanvas');
            const r = c.getBoundingClientRect();
            return { w: c.width, h: c.height, rectW: Math.round(r.width), rectH: Math.round(r.height), disp: c.style.display };
        });
        console.log('    [diag] B canvas:', JSON.stringify(bDiag), 'C ink:', cInk);
        console.log('    [diag] B evlog:', await evl(B, () => window.__evlog.join(', ')));
        console.log('    [diag] C evlog:', await evl(C, () => window.__evlog.join(', ')));
        const bVis = await Promise.race([
            evl(B, () => new Promise(res => {
                const st = document.visibilityState;
                requestAnimationFrame(() => res(st + ' +raf-fired'));
                setTimeout(() => res(st + ' +RAF-DEAD'), 1500);
            })),
            sleep(3000).then(() => 'eval-timeout')
        ]);
        console.log('    [diag] B visibility/raf:', bVis);
        console.log('    [diag] C visibility:', await evl(C, () => document.visibilityState));
        check('B canvas streamed ink', bInk > 50, 'ink=' + bInk);
        check('C canvas streamed ink', cInk > 50, 'ink=' + cInk);
        const before = bInk;
        await tap(A, '#btnUndoStroke'); await sleep(600);
        check('B canvas undo applied', (await inkOn(B, 'ngCanvas')) < before);
        await tap(A, '#btnModalGuessed'); await sleep(800);

        // ============ E. 3P whoGuessed + scores + summary ============
        console.log('== E. Scoring & summary ==');
        check('whoGuessed modal on A', await evl(A, () => document.getElementById('whoGuessedModal').style.display === 'flex'));
        await A.evaluate(() => document.querySelector('#whoGuessedOptions button').click()); await sleep(600);
        const scoresA = await evl(A, () => gamePlayers.map(p => p.score));
        const scoresB = await evl(B, () => gamePlayers.map(p => p.score));
        const scoresC = await evl(C, () => gamePlayers.map(p => p.score));
        check('A explainer +100, B guesser +50, C 0', scoresA[0] === 100 && scoresA[1] === 50 && scoresA[2] === 0, JSON.stringify(scoresA));
        check('scores synced on B', JSON.stringify(scoresB) === JSON.stringify(scoresA), JSON.stringify(scoresB));
        check('scores synced on C', JSON.stringify(scoresC) === JSON.stringify(scoresA), JSON.stringify(scoresC));
        const bSum = await evl(B, () => ({
            disp: document.getElementById('turnSummaryCard').style.display,
            word: document.getElementById('tsWord').textContent
        }));
        console.log('    [diag] B summary:', JSON.stringify(bSum));
        check('summary card on B shows word', bSum.disp === 'flex' && bSum.word.length > 1);
        check('summary card on A too', await evl(A, () => document.getElementById('turnSummaryCard').style.display === 'flex'));

        // ============ F. Turn passes to B + emoji stream ============
        console.log('== F. Next turn + emoji ==');
        await sleep(4200); // wait out summary
        check('B is now explainer', await evl(B, () => window.netIsMyTurn() === true));
        check('A sees guesser screen', await evl(A, () => document.getElementById('netGuesserScreen').style.display === 'block'));
        check('B guesser screen hidden', await evl(B, () => document.getElementById('netGuesserScreen').style.display === 'none'));
        await B.evaluate(() => {
            document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
            const el = document.getElementById('theme-weight-vain-emojit');
            if (el) el.value = 1;
        });
        await tap(B, '#btn'); await sleep(3400);
        check('A got emoji theme', await evl(A, () => document.getElementById('ngTheme').textContent.toUpperCase().includes('EMOJI')));
        await tap(B, '#btnDisplayWords'); await sleep(500);
        await B.evaluate(() => document.querySelector('#wordList li').click()); await sleep(300);
        await tap(B, '#themeBlock'); await sleep(600);
        check('A emoji view opened', await evl(A, () => document.getElementById('ngEmojiView').style.display === 'block'));
        await B.evaluate(() => {
            const ta = document.getElementById('emojiInputArea');
            ta.value = '😀👍🔥';
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(500);
        check('A sees streamed emojis', await evl(A, () => document.getElementById('ngEmojiView').textContent.includes('😀')));
        check('C sees streamed emojis', await evl(C, () => document.getElementById('ngEmojiView').textContent.includes('🔥')));

        // ============ G. Reconnect ============
        console.log('== G. Reconnect ==');
        await B.evaluate(() => Net.ws.close());
        await sleep(3500); // reconnect fires at ~2s
        check('B reconnected', await evl(B, () => Net.connected === true));
        check('B still in game', await evl(B, () => window.isRoomGame() === true));

        console.log('\n== Console errors ==');
        const rel = errors.filter(e => !/net::ERR|WebSocket|favicon|Autoplay|Sanakirjojen/.test(e));
        check('zero app console errors', rel.length === 0, '\n    ' + rel.slice(0, 6).join('\n    '));

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
        process.exitCode = fail ? 1 : 0;
    } finally {
        await browser.close();
        srv.kill();
    }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
