// Verification script for megaplan Task 1 fixes.
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8471/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser, errors) {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 1 });
    page.on('dialog', d => d.accept().catch(() => {}));
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    return page;
}
const load = async (page) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 10000 });
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(300);
};
const forceTheme = (page, id) => page.evaluate((i) => {
    document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
    document.getElementById(i).value = 1;
}, id);
const roll = async (page) => { await page.click('#btn'); await sleep(3400); };

const canvasInk = (page) => page.evaluate(() => {
    const c = document.getElementById('drawingModalCanvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
});
// Max alpha любого пикселя — меряет реальный fade (alpha-рамп), а не бинарное наличие чернил
const canvasMaxAlpha = (page) => page.evaluate(() => {
    const c = document.getElementById('drawingModalCanvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let m = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > m) m = d[i];
    return m;
});
const drawStroke = async (page, pts) => {
    const box = await (await page.$('#drawingModalCanvas')).boundingBox();
    await page.mouse.move(box.x + box.width * pts[0][0], box.y + box.height * pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 6 });
    await page.mouse.up();
};

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    const errors = [];
    try {
        // ============ A. DOM cleanliness + loading lock ============
        console.log('== A. DOM & dictionary loading ==');
        let page = await newPage(browser, errors);
        // Delay dictionary responses so the loading lock is observable
        await page.setRequestInterception(true);
        page.on('request', async r => {
            if (r.url().includes('/words/')) { await sleep(1200); r.continue(); }
            else r.continue();
        });
        await page.goto(BASE, { waitUntil: 'domcontentloaded' });
        await sleep(400); // still inside the artificial delay window
        const earlyBtn = await page.evaluate(() => ({ d: document.getElementById('startGameBtn').disabled, t: document.getElementById('startGameBtn').textContent }));
        check('startGameBtn disabled while loading', earlyBtn.d === true);
        check('startGameBtn shows loading text', earlyBtn.t.includes('Ladataan'), earlyBtn.t);
        await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 10000 });
        await page.evaluate(() => wordsReady.then(() => window.__w = true));
        await page.waitForFunction('window.__w === true', { timeout: 20000 });
        await sleep(300);
        check('single #spellContainer', await page.evaluate(() => document.querySelectorAll('#spellContainer').length) === 1);
        check('single #spellBtn1', await page.evaluate(() => document.querySelectorAll('#spellBtn1').length) === 1);
        check('btn enabled after load', await page.evaluate(() => !document.getElementById('startGameBtn').disabled));
        check('btn text ALOITA PERUSPELI', (await page.evaluate(() => document.getElementById('startGameBtn').textContent)).includes('ALOITA PERUSPELI'));
        check('dictionaries non-empty', await page.evaluate(() => allWords.length > 1000 && commonWords.length > 100));
        check('Undo button exists', await page.evaluate(() => !!document.getElementById('btnUndoStroke')));

        // ============ B. btnResetDefault -> themeWeights ============
        console.log('== B. themeWeights reset ==');
        await page.click('.tab-button[onclick*="settingsTab"]'); // open Asetukset tab
        await sleep(300);
        await page.evaluate(() => { document.querySelectorAll('.theme-weight-input').forEach(i => i.value = 0); });
        await page.click('#btnResetDefault');
        const w = await page.evaluate(() => ({
            perus: +document.getElementById('theme-weight-perusvaihtoehto').value,
            panto: +document.getElementById('theme-weight-pantomiimi').value,
            esp: +document.getElementById('theme-weight-espanja').value,
            nak: +document.getElementById('theme-weight-nakymaton-muste').value
        }));
        check('perusvaihtoehto=3', w.perus === 3, w.perus);
        check('pantomiimi=2', w.panto === 2, w.panto);
        check('espanja=0', w.esp === 0, w.esp);
        check('nakymaton=0', w.nak === 0, w.nak);

        // ============ C. Basic game: theme, button text, words ============
        console.log('== C. Basic round ==');
        await forceTheme(page, 'theme-weight-pantomiimi');
        await page.click('.tab-button[onclick*="gameTab"]'); // back to Peli tab
        await sleep(200);
        await page.click('#startGameBtn');
        await sleep(400);
        await roll(page);
        check('theme PANTOMIIMI rolled', (await page.evaluate(() => document.getElementById('themeDisplay').textContent)).toUpperCase().includes('PANTOMIIMI'));
        const btnTxt = await page.evaluate(() => document.getElementById('btnDisplayWords').textContent);
        check('basic mode: no "loitsut" in btn text', !/loitsut/i.test(btnTxt) && /SELITT/.test(btnTxt.toUpperCase()), btnTxt);
        await page.click('#btnDisplayWords');
        await sleep(400);
        check('5 words rendered', await page.evaluate(() => document.querySelectorAll('#wordList li').length) === 5);
        await page.click('#btnGuessed'); await sleep(400);
        check('score 100+', await page.evaluate(() => gamePlayers[0].score >= 100), await page.evaluate(() => gamePlayers[0].score));
        await page.close();

        // ============ D. Drawing + Undo ============
        console.log('== D. Drawing & undo ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-piirtaminen');
        await page.click('#startGameBtn'); await sleep(400);
        await roll(page);
        await page.click('#btnDisplayWords'); await sleep(400);
        await page.click('#themeBlock'); await sleep(500);
        check('drawing modal open', await page.evaluate(() => document.getElementById('drawingModalOverlay').style.display === 'flex'));
        await drawStroke(page, [[0.3, 0.6], [0.3, 0.35], [0.5, 0.2], [0.7, 0.35], [0.7, 0.6], [0.3, 0.6]]);
        await sleep(300);
        const ink1 = await canvasInk(page);
        await drawStroke(page, [[0.1, 0.9], [0.9, 0.9]]);
        await sleep(300);
        const ink2 = await canvasInk(page);
        check('stroke 1 drawn', ink1 > 100, ink1);
        check('stroke 2 drawn', ink2 > ink1, `${ink1} -> ${ink2}`);
        await page.click('#btnUndoStroke'); await sleep(300);
        const ink3 = await canvasInk(page);
        check('undo removes last stroke', ink3 < ink2 && ink3 > 0, `${ink2} -> ${ink3}`);
        await page.click('#btnClearModalCanvas'); await sleep(300);
        check('clear empties canvas', (await canvasInk(page)) === 0);
        await page.click('#btnCloseModalCanvasX'); await sleep(300);
        await page.close();

        // ============ E. Ghost mode fade + interval cleanup ============
        console.log('== E. näkymätön muste ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-nakymaton-muste');
        await page.click('#startGameBtn'); await sleep(400);
        await roll(page);
        await page.click('#btnDisplayWords'); await sleep(400);
        await page.click('#themeBlock'); await sleep(500);
        await drawStroke(page, [[0.3, 0.5], [0.7, 0.5]]);
        await sleep(400);
        const g1 = await canvasMaxAlpha(page);
        check('ghost stroke visible', g1 > 50, g1);
        await sleep(2000);
        const g2 = await canvasMaxAlpha(page);
        check('ghost fading (partial)', g2 < g1 && g2 > 0, `${g1} -> ${g2}`);
        await sleep(2000);
        const g3 = await canvasMaxAlpha(page);
        check('ghost fully faded after ~4s', g3 === 0, g3);
        // endRound while modal open -> stopDrawingIntervals + cleared
        await page.click('#btnModalGuessed'); await sleep(500);
        check('modal closed after guessed', await page.evaluate(() => document.getElementById('drawingModalOverlay').style.display === 'none'));
        await page.close();

        // ============ F. Magic mode: spells, flash colors, btn text ============
        console.log('== F. Magic mode ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-elokuva');
        await page.click('#magicToggle'); await sleep(200);
        await page.click('.char-card[data-char="Muodonmuuttaja"]');
        await page.click('.char-card[data-char="Kirouksenlangettaja"]');
        await sleep(200);
        const mb = await page.evaluate(() => ({ d: document.getElementById('startGameBtn').disabled, t: document.getElementById('startGameBtn').textContent }));
        check('magic btn ready', !mb.d && mb.t.includes('TAIKAPELI'), JSON.stringify(mb));
        await page.click('#startGameBtn'); await sleep(400);
        await roll(page);
        check('spell btn Korttitulva', /KORTTITULVA/i.test(await page.evaluate(() => document.getElementById('spellBtn1').textContent)));
        await page.click('#spellBtn1'); await sleep(300);
        check('Korttitulva flash = flash-morph', await page.evaluate(() => !!document.querySelector('.spell-flash-overlay.flash-morph')));
        check('extendToEight applied', await page.evaluate(() => activeModifiers.extendToEight === true));
        const mbtnTxt = await page.evaluate(() => document.getElementById('btnDisplayWords').textContent);
        check('magic mode: "loitsut" in btn text', /loitsut/i.test(mbtnTxt), mbtnTxt);
        await page.click('#btnDisplayWords'); await sleep(400);
        check('7 words after flood', await page.evaluate(() => document.querySelectorAll('#wordList li').length) === 7);
        await page.click('#btnGuessed'); await sleep(500);
        // now Kirouksenlangettaja's turn
        check('turn -> Kirouksenlangettaja', await page.evaluate(() => gamePlayers[currentPlayerIndex].name === 'Kirouksenlangettaja'));
        await roll(page);
        check('spell btn Korttinälkä', /KORTTIN/i.test(await page.evaluate(() => document.getElementById('spellBtn1').textContent)));
        await page.click('#spellBtn1'); await sleep(300);
        check('Korttinälkä flash = flash-curse', await page.evaluate(() => !!document.querySelector('.spell-flash-overlay.flash-curse')));
        check('pendingCurses.hunger targets P1', await page.evaluate(() => pendingCurses.hunger === 0));
        await page.close();

        // ============ Console errors (sections A-F) ============
        console.log('== Console errors (A-F) ==');
        check('zero console/page errors', errors.length === 0, '\n    ' + errors.join('\n    '));
        errors.length = 0; // section G intentionally triggers network errors

        // ============ G. Dictionary error banner ============
        console.log('== G. fetch failure banner ==');
        page = await newPage(browser, errors);
        await page.setRequestInterception(true);
        page.on('request', r => r.url().includes('/words/') ? r.abort() : r.continue());
        await page.goto(BASE, { waitUntil: 'domcontentloaded' });
        await sleep(1500);
        check('error banner shown', await page.evaluate(() => !!document.getElementById('dictionaryErrorBanner')));
        check('btn stays disabled+error', await page.evaluate(() => {
            const b = document.getElementById('startGameBtn');
            return b.disabled && /SANAKIRJAT/.test(b.textContent);
        }));
        check('no uncaught pageerror in failure path', !errors.some(e => e.startsWith('pageerror')), '\n    ' + errors.join('\n    '));
        await page.close();

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
        process.exitCode = fail ? 1 : 0;
    } finally {
        await browser.close();
    }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
