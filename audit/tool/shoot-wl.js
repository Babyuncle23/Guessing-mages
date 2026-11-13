// audit/tool/shoot-wl.js — скриншоты Task 15: harmonikka + täysnäytön lista + reveal
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8471/index.html';
const OUT = path.join(__dirname, '..', 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.setRequestInterception(true);
    page.on('request', r => { if (r.url().includes('/sounds/')) r.abort(); else r.continue(); });

    const boot = async (weightId) => {
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
        await page.evaluate(() => wordsReady.then(() => window.__w = true));
        await page.waitForFunction('window.__w === true', { timeout: 20000 });
        await sleep(300);
        await page.evaluate((id) => {
            document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
            document.getElementById(id).value = 1;
        }, weightId);
        await page.evaluate(() => document.getElementById('startGameBtn').click()); await sleep(400);
        await page.evaluate(() => document.getElementById('btn').click()); await sleep(3400);
    };

    // 1) Perusvaihtoehto: sanat auki, harmonikka kiinni, sumu
    await boot('theme-weight-perusvaihtoehto');
    await page.evaluate(() => document.getElementById('btnDisplayWords').click()); await sleep(600);
    await page.screenshot({ path: path.join(OUT, 'wl-collapsed.png') });

    // 2) Harmonikka auki
    await page.evaluate(() => document.getElementById('turnChip').click()); await sleep(450);
    await page.screenshot({ path: path.join(OUT, 'wl-expanded.png') });
    await page.evaluate(() => document.getElementById('turnChip').click()); await sleep(450);

    // 3) Sovitettu kaistale kursorin alla (~1.2 riviä)
    await page.evaluate(() => {
        const el = document.getElementById('wordList');
        const li = el.children[2];
        const r = li.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('mousemove', { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }));
    });
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, 'wl-strip-window.png') });
    await page.evaluate(() => document.getElementById('wordList').dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })));
    await sleep(150);

    // 4) Pidä pohjassa -> koko lista (simuloidaan revealing-tila touch-holdilla)
    await page.evaluate(() => {
        const el = document.getElementById('wordList');
        const r = el.getBoundingClientRect();
        const t = new Touch({ identifier: 1, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 });
        el.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [t], touches: [t], bubbles: true }));
    });
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'wl-reveal-all.png') });
    await page.evaluate(() => {
        const el = document.getElementById('wordList');
        const r = el.getBoundingClientRect();
        const t = new Touch({ identifier: 1, target: el, clientX: r.x + 10, clientY: r.y + 10 });
        el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t], touches: [], bubbles: true }));
    });
    await sleep(200);

    // 5) Piirtäminen: 🎨-pikapainike näkyy
    await boot('theme-weight-piirtaminen');
    await page.evaluate(() => document.getElementById('btnDisplayWords').click()); await sleep(600);
    await page.screenshot({ path: path.join(OUT, 'wl-tool-pill.png') });

    await browser.close();
    console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
