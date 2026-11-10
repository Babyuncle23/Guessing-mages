const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function newPage(browser) {
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
    page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 140)));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('window.__w === true || typeof wordsReady !== "undefined"', { timeout: 20000 });
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(300);
    return page;
}
const tap = (p, s) => p.evaluate(x => { const el = document.querySelector(x); if (el) el.click(); }, s);
const evl = (p, fn, ...a) => p.evaluate(fn, ...a);

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), env: { ...process.env, PORT: '8080' }, stdio: 'pipe' });
    const t0 = Date.now(); let up = false;
    while (Date.now() - t0 < 10000 && !up) {
        try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
        if (!up) await sleep(250);
    }
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    try {
        const A = await newPage(browser);
        await tap(A, '#netModeRoom'); await sleep(700);
        await evl(A, () => { document.getElementById('roomNameInput').value = 'Anna'; });
        await tap(A, '#btnCreateRoom'); await sleep(900);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        const B = await newPage(browser);
        await tap(B, '#netModeRoom'); await sleep(600);
        await evl(B, (c) => { document.getElementById('roomNameInput').value = 'Ben'; document.getElementById('roomCodeInput').value = c; }, code);
        await tap(B, '#btnJoinRoom'); await sleep(900);
        await evl(A, () => {
            document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
            const t = document.getElementById('theme-weight-perusvaihtoehto'); if (t) t.value = 1;
        });
        await tap(A, '#btnStartRoomGame'); await sleep(1200);
        await tap(A, '#btn'); await sleep(3400);
        await tap(A, '#btnDisplayWords'); await sleep(500);
        await tap(A, '#btnGiveUp'); await sleep(1500);
        console.log('A idx:', await evl(A, () => currentPlayerIndex), 'B idx:', await evl(B, () => currentPlayerIndex));
        console.log('B netIsMyTurn:', await evl(B, () => window.netIsMyTurn && window.netIsMyTurn()));
        console.log('B isRoomGame:', await evl(B, () => window.isRoomGame && window.isRoomGame()));
        console.log('B connected:', await evl(B, () => Net.connected));
        console.log('B explainerPid:', await evl(B, () => window.netGetExplainerPid && window.netGetExplainerPid()), 'B pid:', await evl(B, () => Net.playerId));
        await tap(B, '#btn'); await sleep(1200);
        console.log('B phase after tap:', await evl(B, () => document.getElementById('loader').style.display));
        await sleep(2600);
        console.log('A plays:', await evl(A, () => window.__plays));
        console.log('B plays:', await evl(B, () => window.__plays));
    } finally {
        await browser.close().catch(() => {});
        srv.kill();
    }
    process.exit(0);
})().catch(e => { console.log('FATAL', e); process.exit(1); });
