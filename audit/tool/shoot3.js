// Task 3 screenshots — retry-resilient: headless renderer freezes randomly on
// this machine; each attempt skips shots already on disk and rebuilds state.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080/index.html';
const OUT = path.join(__dirname, '..', 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const done = (f) => fs.existsSync(path.join(OUT, f));
const tap = (p, sel) => p.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); }, sel);
const fill = (p, sel, t) => p.evaluate((s, v) => {
    const el = document.querySelector(s); el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}, sel, t);

const ALL_SHOTS = [
    't3-01-room-join.png', 't3-02-room-lobby-host.png', 't3-03-room-lobby-guest.png',
    't3-04-explainer-start.png', 't3-05-guesser-waiting.png', 't3-06-guesser-theme.png',
    't3-07-explainer-words.png', 't3-08-guesser-words-open.png', 't3-09-explainer-drawing.png',
    't3-10-guesser-live-canvas.png', 't3-11-guesser-summary.png', 't3-12-explainer-summary.png'
];

async function newPage(browser) {
    const p = await browser.newPage();
    await p.setViewport({ width: 430, height: 920, deviceScaleFactor: 2 });
    p.on('dialog', d => d.accept().catch(() => {}));
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction('typeof wordsReady !== "undefined"');
    await p.evaluate(() => wordsReady.then(() => window.__w = true));
    await p.waitForFunction('window.__w === true');
    await sleep(250);
    return p;
}

async function attempt(browser, which) {
    const shot = async (p, f, flag) => {
        if (!flag.includes(f) && done(f)) return;
        // Piilotetut headless-sivut eivät tuota frameja — tuo etualle ennen kuvaa
        await p.bringToFront(); await sleep(400);
        const p1 = p.screenshot({ path: path.join(OUT, f) });
        p1.catch(() => {});
        await Promise.race([p1, sleep(20000).then(() => { throw new Error('shot timeout ' + f); })]);
        console.log('shot:', f);
    };

    const A = await newPage(browser);
    await tap(A, '#netModeRoom'); await sleep(700);
    await shot(A, 't3-01-room-join.png', which);
    await fill(A, '#roomNameInput', 'Emma');
    await tap(A, '#btnCreateRoom'); await sleep(1200);

    const B = await newPage(browser);
    await tap(B, '#netModeRoom'); await sleep(600);
    await fill(B, '#roomNameInput', 'Leevi');
    const code = await A.evaluate(() => document.getElementById('roomCodeBig').textContent.trim());
    await fill(B, '#roomCodeInput', code);
    await tap(B, '#btnJoinRoom'); await sleep(900);
    const C = await newPage(browser);
    await tap(C, '#netModeRoom'); await sleep(600);
    await fill(C, '#roomNameInput', 'Aino');
    await fill(C, '#roomCodeInput', code);
    await tap(C, '#btnJoinRoom'); await sleep(1000);

    await shot(A, 't3-02-room-lobby-host.png', which);
    await shot(B, 't3-03-room-lobby-guest.png', which);

    await A.evaluate(() => {
        document.querySelector('.mode-option[data-mode="3"]').click();
        document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; x.dispatchEvent(new Event('input', { bubbles: true })); });
        const el = document.getElementById('theme-weight-piirtaminen');
        el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(400);
    await tap(A, '#btnStartRoomGame'); await sleep(1300);

    await shot(A, 't3-04-explainer-start.png', which);
    await shot(B, 't3-05-guesser-waiting.png', which);

    await tap(A, '#btn'); await sleep(3400);
    await shot(B, 't3-06-guesser-theme.png', which);

    await tap(A, '#btnDisplayWords'); await sleep(700);
    await shot(A, 't3-07-explainer-words.png', which);
    await shot(C, 't3-08-guesser-words-open.png', which);

    await A.evaluate(() => window.selectWordLi(document.querySelector('#wordList li[data-rare="false"]'))); await sleep(300);
    await tap(A, '#themeBlock'); await sleep(700);
    await A.evaluate(() => {
        const c = document.getElementById('drawingModalCanvas');
        const r = c.getBoundingClientRect();
        const ev = (t, x, y) => c.dispatchEvent(new MouseEvent(t, { clientX: r.x + r.width * x, clientY: r.y + r.height * y, bubbles: true }));
        const line = (pts) => { ev('mousedown', pts[0][0], pts[0][1]); pts.forEach(([x, y]) => ev('mousemove', x, y)); ev('mouseup', pts[pts.length - 1][0], pts[pts.length - 1][1]); };
        line([[0.3, 0.6], [0.3, 0.3], [0.7, 0.3], [0.7, 0.6], [0.3, 0.6]]);
        line([[0.25, 0.3], [0.5, 0.12], [0.75, 0.3]]);
        line([[0.45, 0.6], [0.45, 0.45], [0.55, 0.45], [0.55, 0.6]]);
    });
    await sleep(800);
    await shot(A, 't3-09-explainer-drawing.png', which);
    await shot(B, 't3-10-guesser-live-canvas.png', which);

    await tap(A, '#btnModalGuessed'); await sleep(700);
    await A.evaluate(() => document.querySelector('#whoGuessedOptions button').click()); await sleep(900);
    await shot(B, 't3-11-guesser-summary.png', which);
    await shot(A, 't3-12-explainer-summary.png', which);
}

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), stdio: 'pipe' });
    await sleep(1200);
    for (let att = 1; att <= 6; att++) {
        const missing = ALL_SHOTS.filter(f => !done(f));
        if (!missing.length) break;
        console.log(`\n=== ATTEMPT ${att} — missing ${missing.length} shots ===`);
        const browser = await puppeteer.launch({
            executablePath: CHROME, headless: true, protocolTimeout: 20000,
            args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding']
        });
        try { await attempt(browser, missing); }
        catch (e) { console.log('attempt failed:', e.message.slice(0, 100)); }
        await browser.close().catch(() => {});
    }
    srv.kill();
    const still = ALL_SHOTS.filter(f => !done(f));
    console.log(still.length ? `\nMISSING: ${still.join(', ')}` : '\nALL SHOTS DONE');
})();
