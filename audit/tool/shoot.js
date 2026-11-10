// Screenshot tool for the Ark-sanum / Guessing-mages audit.
// Usage: node shoot.js  (requires: npm i puppeteer-core, local server on :8471, Chrome installed)
const puppeteer = require('puppeteer-core');
const path = require('path');

const BASE = 'http://127.0.0.1:8471/index.html';
const OUT = path.resolve(__dirname, '..', 'screenshots');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function newPage(browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2 });
    page.on('dialog', d => d.accept().catch(() => {}));
    return page;
}

async function load(page) {
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
    // Wait until word lists have been fetched and parsed
    await page.waitForFunction('typeof allWords !== "undefined" && allWords.length > 1000 && commonWords.length > 100', { timeout: 20000 });
    await sleep(400);
}

// Force a single theme by zeroing all weight inputs except the chosen one.
async function forceTheme(page, themeInputId) {
    await page.evaluate((id) => {
        document.querySelectorAll('.theme-weight-input').forEach(i => { i.value = 0; });
        const t = document.getElementById(id);
        if (t) t.value = 1;
    }, themeInputId);
}

async function rollTheme(page) {
    await page.click('#btn');              // "Aloita kierros"
    await sleep(3400);                     // drum 2500ms + 400ms + margin
}

async function shot(page, name) {
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('saved', name);
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: true,
        args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']
    });

    try {
        // ---------- 1. Start modal — game rules (Peli tab) ----------
        let page = await newPage(browser);
        await load(page);
        await shot(page, '01-rules-modal.png');
        await page.close();

        // ---------- 2. Magic mode — character selection ----------
        page = await newPage(browser);
        await load(page);
        await page.click('#magicToggle');
        await sleep(250);
        await page.click('.char-card[data-char="Muodonmuuttaja"]');
        await page.click('.char-card[data-char="Kirouksenlangettaja"]');
        await sleep(300);
        // scroll modal content so cards + start button are visible
        await page.evaluate(() => {
            const m = document.querySelector('.modal-content');
            m.scrollTop = m.scrollHeight;
        });
        await sleep(200);
        await shot(page, '02-character-selection.png');
        await page.close();

        // ---------- 3. Settings tab — theme weights ----------
        page = await newPage(browser);
        await load(page);
        await page.click('.tab-button[onclick*="settingsTab"]');
        await sleep(300);
        await shot(page, '03-settings-weights.png');
        await page.close();

        // ---------- 4 & 5. Basic game: theme rolled + word list ----------
        page = await newPage(browser);
        await load(page);
        await forceTheme(page, 'theme-weight-pantomiimi');
        await page.click('#startGameBtn');
        await sleep(400);
        await rollTheme(page);
        await shot(page, '04-theme-rolled.png');      // theme + "Näytä sanat" button
        await page.click('#btnDisplayWords');
        await sleep(400);
        await page.click('#wordList li');             // lock first word (selected highlight)
        await sleep(250);
        await shot(page, '05-word-list.png');
        await page.close();

        // ---------- 6. Drawing canvas (piirtäminen) ----------
        page = await newPage(browser);
        await load(page);
        await forceTheme(page, 'theme-weight-piirtaminen');
        await page.click('#startGameBtn');
        await sleep(400);
        await rollTheme(page);
        await page.click('#btnDisplayWords');
        await sleep(400);
        await page.click('#themeBlock');              // opens drawing modal
        await sleep(600);
        // draw a quick house-like figure
        const cv = await page.$('#drawingModalCanvas');
        const box = await cv.boundingBox();
        const px = (x) => box.x + box.width * x;
        const py = (y) => box.y + box.height * y;
        const stroke = async (pts) => {
            await page.mouse.move(px(pts[0][0]), py(pts[0][1]));
            await page.mouse.down();
            for (const [x, y] of pts.slice(1)) await page.mouse.move(px(x), py(y), { steps: 8 });
            await page.mouse.up();
        };
        await stroke([[0.3, 0.6], [0.3, 0.35], [0.5, 0.2], [0.7, 0.35], [0.7, 0.6], [0.3, 0.6]]);
        await stroke([[0.45, 0.6], [0.45, 0.45], [0.55, 0.45], [0.55, 0.6]]);
        await stroke([[0.38, 0.42], [0.44, 0.42], [0.44, 0.48], [0.38, 0.48], [0.38, 0.42]]);
        await sleep(300);
        await shot(page, '06-drawing-canvas.png');
        await page.close();

        // ---------- 7. Emoji modal (vain emojit) ----------
        page = await newPage(browser);
        await load(page);
        await forceTheme(page, 'theme-weight-vain-emojit');
        await page.click('#startGameBtn');
        await sleep(400);
        await rollTheme(page);
        await page.click('#btnDisplayWords');
        await sleep(400);
        await page.click('#themeBlock');              // opens emoji modal
        await sleep(600);
        await page.click('#emojiInputArea');
        await page.type('#emojiInputArea', '🏠🌳🚪🪟', { delay: 60 });
        await sleep(200);
        await shot(page, '07-emoji-modal.png');
        await page.close();

        // ---------- 8. Magic game — spell bar before words ----------
        page = await newPage(browser);
        await load(page);
        await forceTheme(page, 'theme-weight-elokuva');
        await page.click('#magicToggle');
        await sleep(200);
        await page.click('.char-card[data-char="Muodonmuuttaja"]');
        await page.click('.char-card[data-char="Kirouksenlangettaja"]');
        await sleep(200);
        await page.click('#startGameBtn');
        await sleep(400);
        await rollTheme(page);
        await shot(page, '08-spells-muodonmuuttaja.png'); // Korttitulva spell visible
        await page.close();

        // ---------- 9. Scoring — after "Arvattu oikein" ----------
        page = await newPage(browser);
        await load(page);
        await forceTheme(page, 'theme-weight-perusvaihtoehto');
        await page.click('#startGameBtn');
        await sleep(400);
        await rollTheme(page);
        await page.click('#btnDisplayWords');
        await sleep(400);
        // lock the bonus word (gold badge) if present, else first word
        await page.evaluate(() => {
            const rare = document.querySelector('#wordList li[data-rare="true"]');
            (rare || document.querySelector('#wordList li')).click();
        });
        await sleep(200);
        await page.click('#btnGuessed');
        await sleep(400);
        await shot(page, '09-score-after-guess.png');
        await page.close();

        console.log('ALL DONE');
    } finally {
        await browser.close();
    }
})().catch(e => { console.error(e); process.exit(1); });
