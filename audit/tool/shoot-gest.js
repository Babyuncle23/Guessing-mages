// shoot-gest.js — ✓-ele: armed-rivi + valittu rivi + yhtenäiset kortit
const puppeteer = require('puppeteer-core');
const path = require('path');
const { spawn } = require('child_process');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8487;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(__dirname, '..', 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
    for (let i = 0; i < 20; i++) { try { const r = await fetch(BASE + '/healthz'); if (r.ok) break; } catch (e) {} await sleep(400); }
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('typeof wordsReady !== "undefined"');
    await page.evaluate(() => wordsReady.then(() => 1));
    await sleep(600);

    // Aloitusnäyttö: korttien yhtenäinen pinta
    await page.screenshot({ path: path.join(OUT, 'gest-start-cards.png') });

    // Pakotettu teema -> peli käyntiin -> sanat
    await page.evaluate(() => {
        document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; x.dispatchEvent(new Event('input', { bubbles: true })); });
        const el = document.getElementById('theme-weight-pantomiimi');
        el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => document.getElementById('startGameBtn').click()); await sleep(500);
    await page.evaluate(() => document.getElementById('btn').click()); await sleep(3400);
    await page.screenshot({ path: path.join(OUT, 'gest-wheel-rest-cards.png') });
    // ❓-harmonikka auki: pistetaulu + ohjeet näkyvissä
    await page.evaluate(() => document.getElementById('btnInfoToggle').click()); await sleep(450);
    await page.screenshot({ path: path.join(OUT, 'gest-info-open.png') });
    await page.evaluate(() => document.getElementById('btnInfoToggle').click()); await sleep(350);
    await page.evaluate(() => document.getElementById('btnDisplayWords').click()); await sleep(600);

    // Sumu päällä
    await page.screenshot({ path: path.join(OUT, 'gest-fog.png') });

    // Sormi listalla -> reveal + ✓-rasti armed-rivillä (pidä touch päällä!)
    const c = await page.evaluate(() => {
        const li = document.querySelectorAll('#wordList li')[3];
        const r = li.getBoundingClientRect();
        const el = document.getElementById('wordList');
        const touch = new Touch({ identifier: 1, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 });
        el.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [touch], touches: [touch], bubbles: true }));
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await sleep(250);
    await page.screenshot({ path: path.join(OUT, 'gest-armed-check.png') });

    // Vapautus -> rivi lukittu, sumu takaisin + selGlow
    await page.evaluate((cx, cy) => {
        const el = document.getElementById('wordList');
        const touch = new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy });
        el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch], touches: [], bubbles: true }));
    }, c.x, c.y);
    await sleep(400);
    await page.screenshot({ path: path.join(OUT, 'gest-selected-glow.png') });

    await browser.close(); srv.kill();
    console.log('shots done');
})().catch(e => { console.error(e); process.exit(1); });
