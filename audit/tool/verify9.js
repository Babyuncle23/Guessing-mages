// audit/tool/verify9.js — megaplan-canvas-space: канвасу больше, кнопкам меньше.
// Замеряет хедер/канвас/низ drawingModalOverlay и emojiModalOverlay
// на 360×800, 320×720 и landscape 780×360 + скриншоты.
// Запуск: node verify9.js  (сам поднимает server.js на свой порт)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8485';
const OUT = path.join(__dirname, '..', 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser, w, h) {
    const p = await browser.newPage();
    await p.bringToFront();
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    p.on('dialog', d => d.accept().catch(() => {}));
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
    await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 10000 });
    await p.evaluate(() => wordsReady.then(() => window.__w = true));
    await p.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(300);
    return p;
}

// Замеры: высоты хедера/контента/низа + все кнопки внутри оверлея
const measure = (p, overlayId, contentId) => p.evaluate((ov, c) => {
    const overlay = document.getElementById(ov);
    const hdr = overlay.querySelector('.modal-header-container').getBoundingClientRect();
    const bot = overlay.querySelector('.modal-bottom-row').getBoundingClientRect();
    const content = document.getElementById(c).getBoundingClientRect();
    return {
        vw: document.documentElement.clientWidth,
        vh: document.documentElement.clientHeight,
        scrollW: document.documentElement.scrollWidth,
        header: hdr.height,
        bottom: bot.height,
        bottomEdge: bot.bottom,
        content: content.height,
        buttons: [...overlay.querySelectorAll('button')]
            .filter(b => b.getBoundingClientRect().width > 0)
            .map(b => { const x = b.getBoundingClientRect(); return { id: b.id, w: Math.round(x.width), h: Math.round(x.height), right: Math.round(x.right), bottom: Math.round(x.bottom) }; })
    };
}, overlayId, contentId);

const shot = async (p, f) => {
    await p.bringToFront(); await sleep(300);
    await p.screenshot({ path: path.join(OUT, f) });
    console.log('  shot:', f);
};

const noOverflow = (m, label) => {
    check(`no h-overflow: ${label}`, m.scrollW <= m.vw + 1, `scrollW=${m.scrollW} vw=${m.vw}`);
    const bad = m.buttons.filter(b => b.right > m.vw + 1 || b.bottom > m.vh + 1);
    check(`buttons inside viewport: ${label}`, bad.length === 0, JSON.stringify(bad));
    const thin = m.buttons.filter(b => b.h < 24);
    check(`touch targets >=24px: ${label}`, thin.length === 0, JSON.stringify(thin));
};

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), env: { ...process.env, PORT: '8485' }, stdio: 'pipe' });
    let up = false;
    for (let i = 0; i < 20; i++) {
        await sleep(500);
        try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
        if (up) break;
    }
    if (!up) { console.log('server.js did not start'); srv.kill(); process.exit(1); }

    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: true, protocolTimeout: 30000,
        args: ['--no-sandbox', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding']
    });

    try {
        // ===== 360×800 portrait — основной кейс =====
        console.log('== Drawing modal 360x800 ==');
        let p = await newPage(browser, 360, 800);
        await p.evaluate(() => window.openDrawingModal()); await sleep(400);
        let m = await measure(p, 'drawingModalOverlay', 'drawingModalCanvas');
        console.log('  header:', m.header, 'canvas:', m.content, 'bottom:', m.bottom, 'vh:', m.vh);
        check('header <= 65px (was ~150)', m.header <= 65, m.header);
        check('canvas >= 660px (was ~555)', m.content >= 660, m.content);
        check('bottom row <= 48px', m.bottom <= 48, m.bottom);
        check('canvas takes >=82% viewport', m.content / m.vh >= 0.82, (m.content / m.vh).toFixed(2));
        noOverflow(m, 'draw-360');
        await shot(p, 'cv-draw-360.png');

        // ===== Emoji modal 360×800 =====
        console.log('== Emoji modal 360x800 ==');
        await p.click('#btnCloseModalCanvasX'); await sleep(200);
        await p.evaluate(() => window.openEmojiModal()); await sleep(400);
        m = await measure(p, 'emojiModalOverlay', 'emojiInputArea');
        console.log('  header:', m.header, 'textarea:', m.content, 'bottom:', m.bottom);
        check('emoji header <= 50px', m.header <= 50, m.header);
        check('emoji textarea >= 640px (fills freed space)', m.content >= 640, m.content);
        noOverflow(m, 'emoji-360');
        await shot(p, 'cv-emoji-360.png');
        await p.evaluate(() => document.getElementById('btnCloseEmojiModalX').click()); await sleep(200);
        await p.close();

        // ===== 320×720 — узкий экран =====
        console.log('== Drawing modal 320x720 ==');
        p = await newPage(browser, 320, 720);
        await p.evaluate(() => window.openDrawingModal()); await sleep(400);
        m = await measure(p, 'drawingModalOverlay', 'drawingModalCanvas');
        console.log('  header:', m.header, 'canvas:', m.content, 'bottom:', m.bottom);
        check('header <= 90px on 320', m.header <= 90, m.header);
        check('canvas >= 540px on 320', m.content >= 540, m.content);
        noOverflow(m, 'draw-320');
        await shot(p, 'cv-draw-320.png');
        await p.close();

        // ===== Landscape 780×360 =====
        console.log('== Drawing modal 780x360 landscape ==');
        p = await newPage(browser, 780, 360);
        await p.evaluate(() => window.openDrawingModal()); await sleep(400);
        m = await measure(p, 'drawingModalOverlay', 'drawingModalCanvas');
        console.log('  header:', m.header, 'canvas:', m.content, 'bottom:', m.bottom);
        check('landscape header <= 45px', m.header <= 45, m.header);
        check('landscape canvas >= 230px', m.content >= 230, m.content);
        noOverflow(m, 'draw-land');
        await shot(p, 'cv-draw-land-780.png');
        await p.close();

        // ===== Рисование работает после ресайза =====
        console.log('== Stroke still works ==');
        p = await newPage(browser, 360, 800);
        await p.evaluate(() => window.openDrawingModal()); await sleep(400);
        await p.evaluate(() => {
            const c = document.getElementById('drawingModalCanvas');
            const r = c.getBoundingClientRect();
            const ev = (t, x, y) => c.dispatchEvent(new MouseEvent(t, { clientX: r.x + r.width * x, clientY: r.y + r.height * y, bubbles: true }));
            ev('mousedown', 0.3, 0.5); ev('mousemove', 0.5, 0.3); ev('mousemove', 0.7, 0.5); ev('mouseup', 0.7, 0.5);
        });
        await sleep(300);
        const ink = await p.evaluate(() => {
            const c = document.getElementById('drawingModalCanvas');
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
            return n;
        });
        check('stroke draws pixels', ink > 100, ink);
        check('canvas buffer matches css size', await p.evaluate(() => {
            const c = document.getElementById('drawingModalCanvas');
            const r = c.getBoundingClientRect();
            return Math.abs(c.width - r.width) < 2 && Math.abs(c.height - r.height) < 2;
        }));
        // Undo / clear / tool-switch кнопки живы
        await p.click('#btnUndoStroke'); await sleep(200);
        const ink2 = await p.evaluate(() => {
            const c = document.getElementById('drawingModalCanvas');
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
            return n;
        });
        check('undo removes stroke', ink2 === 0, ink2);
        await p.click('#btnToolErase'); await sleep(150);
        check('erase tool activates', await p.evaluate(() => getComputedStyle(document.getElementById('btnToolErase')).background.includes('rgb') && document.getElementById('btnToolErase').style.color === 'rgb(0, 0, 0)'));
        await p.close();
    } finally {
        await browser.close().catch(() => {});
        srv.kill();
    }

    console.log(`\n${pass} PASS, ${fail} FAIL`);
    process.exit(fail ? 1 : 0);
})();
