// Quick visual check shots for Task 2 features
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8471/index.html';
const OUT = require('path').join(__dirname, '..', 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const p = await b.newPage();
    await p.setViewport({ width: 430, height: 930, deviceScaleFactor: 1 });
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
    await p.evaluate(() => wordsReady.then(() => window.__w = true));
    await p.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(500);

    // 1: mode selector + magic guide + char cards
    await p.click('#magicToggle'); await sleep(400);
    await p.evaluate(() => document.getElementById('characterSelectionBlock').scrollIntoView({ block: 'start' }));
    await sleep(300);
    await p.screenshot({ path: OUT + '/t2-01-onboarding.png' });

    // 2: 3-player magic game — pick 3 mages, spell buttons + scoreboard
    await p.click('.mode-option[data-mode="3"]'); await sleep(200);
    await p.click('.char-card[data-char="Muodonmuuttaja"]'); await sleep(100);
    await p.click('.char-card[data-char="Kirouksenlangettaja"]'); await sleep(100);
    await p.click('.char-card[data-char="Yrttitarhuri"]'); await sleep(200);
    await p.evaluate(() => {
        document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
        document.getElementById('theme-weight-pantomiimi').value = 1;
    });
    await p.click('#startGameBtn'); await sleep(400);
    await p.click('#btn'); await sleep(3400);
    await p.screenshot({ path: OUT + '/t2-02-spellbuttons-phase1.png' });
    await p.click('#btnDisplayWords'); await sleep(500);
    await p.screenshot({ path: OUT + '/t2-03-3p-words.png' });

    // 3: whoGuessed modal
    await p.click('#btnGuessed'); await sleep(400);
    await p.screenshot({ path: OUT + '/t2-04-whoguessed.png' });
    await p.click('#whoGuessedOptions button'); await sleep(400);

    // 4: 4+ steal button — new page
    const p2 = await b.newPage();
    await p2.setViewport({ width: 430, height: 930, deviceScaleFactor: 1 });
    await p2.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p2.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
    await p2.evaluate(() => wordsReady.then(() => window.__w2 = true));
    await p2.waitForFunction('window.__w2 === true', { timeout: 20000 });
    await sleep(400);
    await p2.click('.mode-option[data-mode="4"]'); await sleep(200);
    await p2.evaluate(() => {
        document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
        document.getElementById('theme-weight-pantomiimi').value = 1;
    });
    await p2.click('#startGameBtn'); await sleep(400);
    await p2.click('#btn'); await sleep(3400);
    await p2.click('#btnDisplayWords'); await sleep(500);
    await p2.evaluate(() => document.getElementById('roundControls').scrollIntoView({ block: 'end' }));
    await sleep(300);
    await p2.screenshot({ path: OUT + '/t2-05-steal-btn.png' });

    // 5: victory modal — force end state
    await p2.evaluate(() => {
        gamePlayers[0].score = 150; gamePlayers[1].score = 100;
        currentRound = 99; endRound(false);
    });
    await sleep(800);
    await p2.screenshot({ path: OUT + '/t2-06-victory.png' });

    await b.close();
    console.log('done');
})();
