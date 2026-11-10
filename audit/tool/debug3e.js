// Is A's JS thread alive after GAME_STARTED (compositor-only freeze?) at 2x DSF
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), stdio: 'pipe' });
    await sleep(1200);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', protocolTimeout: 20000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    try {
        const mk = async () => {
            const p = await browser.newPage();
            await p.setViewport({ width: 430, height: 920, deviceScaleFactor: 2 });
            p.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));
            await p.goto(BASE, { waitUntil: 'domcontentloaded' });
            await p.waitForFunction('typeof wordsReady !== "undefined"');
            await p.evaluate(() => wordsReady.then(() => window.__w = true));
            await p.waitForFunction('window.__w === true');
            return p;
        };
        const tap = (p, s) => p.evaluate(x => { const el = document.querySelector(x); if (el) el.click(); }, s);
        const fill = (p, s, t) => p.evaluate((x, v) => { const el = document.querySelector(x); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, s, t);

        const A = await mk();
        await tap(A, '#netModeRoom'); await sleep(700);
        await fill(A, '#roomNameInput', 'Emma');
        await tap(A, '#btnCreateRoom'); await sleep(1200);
        const code = await A.evaluate(() => document.getElementById('roomCodeBig').textContent.trim());
        const B = await mk();
        await tap(B, '#netModeRoom'); await sleep(600);
        await fill(B, '#roomNameInput', 'Leevi'); await fill(B, '#roomCodeInput', code);
        await tap(B, '#btnJoinRoom'); await sleep(1000);

        await tap(A, '#btnStartRoomGame'); await sleep(1300);
        const probe = async (tag) => {
            const r = await Promise.race([
                A.evaluate(() => ({ t: performance.now() | 0, room: window.isRoomGame(), players: gamePlayers.length })),
                sleep(5000).then(() => 'BLOCKED')
            ]);
            console.log('A probe', tag, JSON.stringify(r));
        };
        await probe('t+0');
        await sleep(1500); await probe('t+1.5');
        await sleep(1500); await probe('t+3');

        console.log('A visibility:', await A.evaluate(() => document.visibilityState));
        await A.bringToFront();
        await sleep(300);
        console.log('A visibility after bringToFront:', await A.evaluate(() => document.visibilityState));
        const s = await Promise.race([
            A.screenshot({ path: 'x.png' }).then(() => 'shot-ok').catch(e => 'shot-err ' + e.message.slice(0, 50)),
            sleep(8000).then(() => 'SHOT-TIMEOUT')
        ]);
        console.log('screenshot after bringToFront →', s);
        await probe('after-shot');
    } finally {
        await browser.close();
        srv.kill();
    }
})().catch(e => console.error('FATAL', e.message));
