// audit/tool/shoot-wr.js — скриншоты Task 16: pysähtynyt pyörä lepää
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

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(300);

    await page.evaluate(() => {
        document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
        document.getElementById('theme-weight-pantomiimi').value = 1;
    });
    await page.evaluate(() => document.getElementById('startGameBtn').click()); await sleep(400);
    await page.evaluate(() => document.getElementById('btn').click()); await sleep(3400);

    // 1) Pyörä lepää: chip + pysähtynyt rumpu + Näytä sanat
    await page.screenshot({ path: path.join(OUT, 'wr-wheel-rest.png') });

    // 2) Harmonikka auki pyörän alla — kortti näkyy edelleen tappauksella
    await page.evaluate(() => document.getElementById('btnInfoToggle').click()); await sleep(450);
    await page.screenshot({ path: path.join(OUT, 'wr-wheel-rest-expanded.png') });
    await page.evaluate(() => document.getElementById('btnInfoToggle').click()); await sleep(450);

    // 3) Sanat auki — pyörä poissa, tuttu näkymä
    await page.evaluate(() => document.getElementById('btnDisplayWords').click()); await sleep(600);
    await page.screenshot({ path: path.join(OUT, 'wr-words-open.png') });

    // 4) Moni sektori: voittajakiila + himmennettyt häviäjät
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(300);
    await page.evaluate(() => {
        document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
        ['perusvaihtoehto', 'pantomiimi', 'piirtaminen', 'elokuva', 'vain-emojit'].forEach(id => {
            const el = document.getElementById('theme-weight-' + id); if (el) el.value = 2;
        });
        document.getElementById('devThemeSelect') && (document.getElementById('devThemeSelect').value = 'piirtäminen');
    });
    await page.evaluate(() => document.getElementById('startGameBtn').click()); await sleep(400);
    await page.evaluate(() => document.getElementById('btn').click()); await sleep(3400);
    await page.screenshot({ path: path.join(OUT, 'wr-wedge-multi.png') });

    await browser.close();
    console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
