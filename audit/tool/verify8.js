// verify8.js — teemaruletti: sektorit suhteessa painoihin, pyörä pysähtyy
// voittajaan, sama ruletti näkyy arvaajalla.
// Запуск: node verify8.js  (сам поднимает server.js на свой порт)
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8484';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser, url) {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 900 });
    page.on('dialog', d => d.accept().catch(() => {}));
    page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
    await page.goto(url || BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(300);
    return page;
}
const tap = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); }, sel);
const fill = (page, sel, text) => page.evaluate((s, t) => {
    const el = document.querySelector(s);
    el.value = t;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}, sel, text);
const evl = (page, fn, ...a) => page.evaluate(fn, ...a);
const drumInfo = (page, wheelId) => evl(page, (id) => {
    const w = document.getElementById(id);
    if (!w) return null;
    const items = [...w.querySelectorAll('.theme-drum-item')].map(el => ({ theme: el.dataset.theme, a0: +el.dataset.a0, a1: +el.dataset.a1 }));
    return { items, angle: window.themeDrum ? themeDrum.currentAngle(w) : null, landed: w.classList.contains('landed'), spinning: w.classList.contains('spinning') };
}, wheelId);
const setWeights = (page, map) => evl(page, (m) => {
    document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
    Object.entries(m).forEach(([id, v]) => { const el = document.getElementById('theme-weight-' + id); if (el) el.value = v; });
}, map);

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), env: { ...process.env, PORT: '8484' }, stdio: 'pipe' });
    {
        const t0 = Date.now(); let up = false;
        while (Date.now() - t0 < 10000 && !up) {
            try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
            if (!up) await sleep(250);
        }
        if (!up) throw new Error('server.js did not start');
    }
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

    try {
        // ============ A. Solo: sektorit suhteessa painoihin ============
        console.log('== A. Solo: sectors proportional to weights ==');
        const p = await newPage(browser);
        await setWeights(p, { 'perusvaihtoehto': 3, 'elokuva': 1 });
        await tap(p, '#startGameBtn'); await sleep(400);
        await tap(p, '#btn'); await sleep(600); // rumpu pyörii
        const d1 = await drumInfo(p, 'drumWheel');
        check('drum wheel mounted with items', !!d1 && d1.items.length === 2, JSON.stringify(d1 && d1.items));
        const spans = d1.items.map(i => i.a1 - i.a0);
        check('total span = 360', Math.abs(spans.reduce((a, b) => a + b, 0) - 360) < 0.01, JSON.stringify(spans));
        const elok = d1.items.find(i => i.theme === 'elokuva');
        const perus = d1.items.find(i => i.theme === 'perusvaihtoehto');
        check('elokuva sector = 90deg (w1/4)', elok && Math.abs(elok.a1 - elok.a0 - 90) < 0.01, JSON.stringify(elok));
        check('perus sector = 270deg (w3/4)', perus && Math.abs(perus.a1 - perus.a0 - 270) < 0.01, JSON.stringify(perus));
        check('conic-gradient set', await evl(p, () => document.getElementById('drumWheel').style.background.includes('conic-gradient')));

        // ============ B. Pyörä pysähtyy voittajaan ============
        console.log('== B. Wheel lands on the winner ==');
        // Lue kulma ENNEN kuin #loader piiloutuu (display:none → transform 'none')
        await p.waitForFunction('document.getElementById("drumWheel").classList.contains("landed")', { timeout: 4000 });
        const d2 = await drumInfo(p, 'drumWheel');
        check('wheel has landed class', d2.landed === true);
        check('hub shows a theme name', await evl(p, () => {
            const t = document.getElementById('drumHubName').textContent.trim();
            return t.length > 0 && t !== '?';
        }));
        // Osoitin vasemmalla laidalla (270°): sektori sen alla on norm360(270-angle)
        const x = (((270 - (d2.angle % 360)) % 360) + 360) % 360;
        const winner = d2.items.find(i => x > i.a0 + 0.5 && x < i.a1 - 0.5);
        check('pointer stopped inside a sector', !!winner, `angle=${d2.angle} x=${x}`);
        await p.waitForFunction('document.getElementById("themeDisplay").textContent.trim().length > 0', { timeout: 4000 });
        await sleep(300);
        const rolled = await evl(p, () => currentActiveTheme);
        check('landed theme == rolled theme', winner && winner.theme === rolled, `pointer=${winner && winner.theme} rolled=${rolled}`);
        check('hub name == rolled theme', await evl(p, (r) => document.getElementById('drumHubName').textContent.trim() === r, rolled));

        // ============ C. Yksi teema → yksi sektori ============
        console.log('== C. Single theme -> single 360deg sector ==');
        const p2 = await newPage(browser);
        await setWeights(p2, { 'perusvaihtoehto': 1 });
        await tap(p2, '#startGameBtn'); await sleep(400);
        await tap(p2, '#btn'); await sleep(600);
        const d3 = await drumInfo(p2, 'drumWheel');
        check('one sector only', d3.items.length === 1, JSON.stringify(d3.items));
        check('sector spans 360', Math.abs(d3.items[0].a1 - d3.items[0].a0 - 360) < 0.01);
        await p2.close();

        // ============ D. Huonepeli: sama ruletti arvaajalla ============
        console.log('== D. Room: guesser sees same drum + lands on theme ==');
        const A = await newPage(browser);
        await tap(A, '#netModeRoom'); await sleep(800);
        await fill(A, '#roomNameInput', 'Anna');
        await tap(A, '#btnCreateRoom'); await sleep(1000);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        const B = await newPage(browser);
        await tap(B, '#netModeRoom'); await sleep(600);
        await fill(B, '#roomNameInput', 'Ben');
        await fill(B, '#roomCodeInput', code);
        await tap(B, '#btnJoinRoom'); await sleep(900);
        await setWeights(A, { 'perusvaihtoehto': 3, 'piirtaminen': 1 });
        await sleep(400); // settings broadcast ehtii B:lle
        await tap(A, '#btnStartRoomGame'); await sleep(1200);
        await tap(A, '#btn'); await sleep(700);
        const dB = await drumInfo(B, 'ngDrumWheel');
        check('B: drum spinning with sectors', !!dB && dB.items.length === 2 && dB.spinning, JSON.stringify(dB));
        check('B: same sectors as A (90/270)', dB.items.some(i => i.theme === 'piirtäminen' && Math.abs(i.a1 - i.a0 - 90) < 0.01), JSON.stringify(dB.items));
        check('B: ngDrum visible', await evl(B, () => document.getElementById('ngDrum').style.display === 'block'));
        await sleep(4000); // reveal + land — pyörä jää lepäämään (Task 16/17)
        const aTheme = await evl(A, () => currentActiveTheme);
        check('B: ngDrum stays resting after land', await evl(B, () => document.getElementById('ngDrum').style.display === 'block'));
        check('B: ngDrumWheel landed + keeps items', await evl(B, () =>
            document.getElementById('ngDrumWheel').classList.contains('landed') &&
            document.getElementById('ngDrumWheel').children.length > 0));
        check('B: theme card hidden while drum rests', await evl(B, () => getComputedStyle(document.getElementById('ngThemeBlock')).display === 'none'));
        // WORDS_OPEN: rumpu väistyy, teemakortti tulee
        await tap(A, '#btnDisplayWords'); await sleep(1200);
        check('B: theme card shows rolled theme after WORDS_OPEN', await evl(B, (t) => document.getElementById('ngTheme').textContent.trim().toLowerCase() === t, aTheme), aTheme);
        check('B: ngDrum hidden after WORDS_OPEN', await evl(B, () => document.getElementById('ngDrum').style.display === 'none'));
        await A.close(); await B.close();

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    } finally {
        await browser.close().catch(() => {});
        srv.kill();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
