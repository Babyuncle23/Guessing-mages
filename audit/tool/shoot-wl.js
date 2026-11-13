// audit/tool/shoot-wl.js — скриншоты Task 18: sticky-бар, selGlow, coach, hold-сдача
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

    // 1) Perusvaihtoehto: sanat auki — coach-pilvi näkyy ekan kerran
    await boot('theme-weight-perusvaihtoehto');
    await page.evaluate(() => document.getElementById('btnDisplayWords').click()); await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'wl-coach.png') });

    // Coach pois -> sumu + sticky-palkki
    await page.evaluate(() => {
        const c = document.getElementById('veilCoach');
        if (c) { c.classList.add('veil-coach-out'); c.style.display = 'none'; }
    });
    await sleep(200);
    await page.screenshot({ path: path.join(OUT, 'wl-collapsed.png') });

    // 2) Harmonikka auki (chipRound-badge näkyy chipissä)
    await page.evaluate(() => document.getElementById('btnInfoToggle').click()); await sleep(450);
    await page.screenshot({ path: path.join(OUT, 'wl-expanded.png') });
    await page.evaluate(() => document.getElementById('btnInfoToggle').click()); await sleep(450);

    // 3) Lukittu sana: kultainen hehku verhon läpi (teksti piilossa)
    await page.evaluate(() => window.selectWordLi(document.querySelectorAll('#wordList li')[2])); await sleep(300);
    await page.screenshot({ path: path.join(OUT, 'wl-selglow.png') });

    // 4) Hover -> koko lista näkyy (+ sticky-palkki alhaalla)
    await page.evaluate(() => {
        const el = document.getElementById('wordList');
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('mousemove', { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }));
    });
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, 'wl-reveal-hover.png') });
    await page.evaluate(() => document.getElementById('wordList').dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })));
    await sleep(200);

    // 5) Luovutus: pohjassapito kesken (~50% täyttö)
    await page.evaluate(() => {
        document.getElementById('btnGiveUp').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'wl-giveup-hold.png') });
    await page.evaluate(() => {
        const b = document.getElementById('btnGiveUp');
        b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await sleep(300);

    // 6) Piirtäminen: 🎨-pikapainike näkyy
    await boot('theme-weight-piirtaminen');
    await page.evaluate(() => document.getElementById('btnDisplayWords').click()); await sleep(600);
    await page.screenshot({ path: path.join(OUT, 'wl-tool-pill.png') });

    await browser.close();
    console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
