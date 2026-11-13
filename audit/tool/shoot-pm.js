// audit/tool/shoot-pm.js — скриншоты privacy-маски: idle, окно под пальцем, Piilotettu
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
        document.getElementById('theme-weight-perusvaihtoehto').value = 1;
    });
    await page.evaluate(() => document.getElementById('startGameBtn').click()); await sleep(400);
    await page.evaluate(() => document.getElementById('btn').click()); await sleep(3400);
    await page.evaluate(() => document.getElementById('btnDisplayWords').click()); await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'pm-words-masked.png') });

    // Окно под пальцем (второе слово) + выбранное третье
    await page.evaluate(() => {
        const el = document.getElementById('wordList');
        const li = el.children[1];
        const r = li.getBoundingClientRect();
        const t = new Touch({ identifier: 1, target: li, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 + 10 });
        el.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [t], touches: [t], bubbles: true }));
    });
    await sleep(300);
    await page.screenshot({ path: path.join(OUT, 'pm-finger-window.png') });
    await page.evaluate(() => {
        const el = document.getElementById('wordList');
        const r = el.getBoundingClientRect();
        const t = new Touch({ identifier: 1, target: el, clientX: r.x + 10, clientY: r.y + 10 });
        el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t], touches: [], bubbles: true }));
    });
    await sleep(200);
    // выбранное слово сквозь туман + окно мышью
    await page.evaluate(() => window.selectWordLi(document.querySelectorAll('#wordList li')[2]));
    await sleep(150);
    await page.evaluate(() => {
        const el = document.getElementById('wordList');
        const li = el.children[2];
        const r = li.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('mousemove', { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }));
    });
    await sleep(200);
    await page.screenshot({ path: path.join(OUT, 'pm-selected-window.png') });

    // Piilotettu-состояние
    await page.evaluate(() => document.getElementById('wordList').dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })));
    await page.evaluate(() => document.getElementById('btnDisplayWords').click()); await sleep(300);
    await page.screenshot({ path: path.join(OUT, 'pm-hidden-state.png') });

    await browser.close();
    console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
