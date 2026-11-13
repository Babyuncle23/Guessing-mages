// audit/tool/verify19.js — способности НАД колесом (megaplan-spells-above-wheel)
// A) Колесо остановлено: все видимые spell-ряды хит-тестятся в себя (не пилюля),
//    spellContainer целиком над #loader
// B) Пилюля «Näytä sanat» живая и кликабельна над нижним краем колеса
// C) Фаза 2: spellContainer над #wordListWrap, метаморфоза кликабельна, пилюли нет
// D) Без магии: пилюля работает, спеллов нет (регрессия)
// E) Комната: на устройстве объясняющего спеллы тоже над колесом
// F) Zero console errors
// Запуск: node verify19.js  (сам поднимает server.js на :8488)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8488;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

const errors = [];
async function newPage(browser, url) {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => { if (r.url().includes('/sounds/')) r.abort(); else r.continue(); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await page.goto(url || BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(300);
    return page;
}
const tap = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); }, sel);
const evl = (page, fn, ...args) => page.evaluate(fn, ...args);
const forceTheme = (page, id) => evl(page, (i) => {
    document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; });
    document.getElementById(i).value = 1;
}, id);
const pickTwoMages = (page) => evl(page, async () => {
    document.getElementById('magicToggle').click();
    await new Promise(r => setTimeout(r, 250));
    document.querySelector('.char-card[data-char="Muodonmuuttaja"]').click();
    document.querySelector('.char-card[data-char="Kirouksenlangettaja"]').click();
});
// Замеры перекрытий: позиции пилюли, спелл-зоны, колеса + хит-тесты
const measure = (page) => evl(page, () => {
    const hit = (el, fx, fy) => {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        const t = document.elementFromPoint(x, y);
        return t ? (t.id ? '#' + t.id : (t.className || t.tagName)) : 'OFFSCREEN';
    };
    const pill = document.getElementById('btnDisplayWords');
    const sc = document.getElementById('spellContainer');
    const loader = document.getElementById('loader');
    const rows = [...document.querySelectorAll('.spell-action-row')]
        .filter(r => r.offsetParent)
        .map(r => { const b = r.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), hit: hit(r, .5, .5) }; });
    const pr = pill.getBoundingClientRect(), sr = sc.getBoundingClientRect(), lr = loader.getBoundingClientRect();
    return {
        pill: { display: getComputedStyle(pill).display, top: Math.round(pr.top), bottom: Math.round(pr.bottom), hit: pr.height ? hit(pill, .5, .5) : 'hidden' },
        spellBox: { display: getComputedStyle(sc).display, top: Math.round(sr.top), bottom: Math.round(sr.bottom) },
        rows,
        loader: { display: getComputedStyle(loader).display, top: Math.round(lr.top), bottom: Math.round(lr.bottom) },
    };
});
const startMagicGame = async (page, themeId, rounds) => {
    await forceTheme(page, themeId);
    await evl(page, (r) => { document.getElementById('roundSelect').value = String(r); setPlayerMode(2); }, rounds || 7);
    await pickTwoMages(page); await sleep(200);
    await tap(page, '#startGameBtn'); await sleep(400);
};
const rollAndRest = async (page) => { await tap(page, '#btn'); await sleep(3400); };

(async () => {
    const srv = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..', '..'), env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe'
    });
    srv.stdout.on('data', d => process.env.VERBOSE && console.log('[srv]', String(d)));
    {
        const t0 = Date.now(); let up = false;
        while (Date.now() - t0 < 10000 && !up) {
            try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
            if (!up) await sleep(250);
        }
        if (!up) throw new Error('server.js did not start within 10s');
    }

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] });
    try {
        // ============ A. Спеллы над колесом после остановки ============
        console.log('== A. Spells above wheel ==');
        const page = await newPage(browser);
        await evl(page, () => localStorage.clear());
        await startMagicGame(page, 'theme-weight-pantomiimi', 7);
        await rollAndRest(page);

        let m = await measure(page);
        check('spell zone visible', m.spellBox.display !== 'none');
        check('at least one spell row visible', m.rows.length >= 1, JSON.stringify(m.rows));
        check('spell zone above wheel', m.spellBox.bottom <= m.loader.top, `spell ${m.spellBox.top}-${m.spellBox.bottom} vs loader ${m.loader.top}`);
        check('no spell row covered by pill', m.rows.every(r => !String(r.hit).includes('btnDisplayWords')), JSON.stringify(m.rows));
        check('spell rows hit-test to own content', m.rows.every(r => /spell|row/.test(String(r.hit))), JSON.stringify(m.rows));

        // ============ B. Пилюля живая над нижним краем колеса ============
        console.log('== B. Pill still works ==');
        check('pill visible', m.pill.display !== 'none');
        check('pill hit-tests to itself', String(m.pill.hit).includes('btnDisplayWords'), m.pill.hit);
        check('pill floats over wheel lower edge', m.pill.top < m.loader.bottom && m.pill.top > m.loader.top, `pill ${m.pill.top}, loader ${m.loader.top}-${m.loader.bottom}`);

        // ============ C. Фаза 2: спеллы над списком слов ============
        console.log('== C. Phase 2 (words open) ==');
        await tap(page, '#btnDisplayWords'); await sleep(600);
        m = await measure(page);
        const wlw = await evl(page, () => {
            const r = document.getElementById('wordListWrap').getBoundingClientRect();
            return { top: Math.round(r.top) };
        });
        check('words open: pill gone', m.pill.display === 'none', m.pill.display);
        check('spell zone above word list', m.spellBox.bottom <= wlw.top, `spell ${m.spellBox.bottom} vs words ${wlw.top}`);
        const morphHit = await evl(page, () => {
            const b = document.getElementById('spellBtn1');
            if (!b || b.offsetParent === null) return 'hidden';
            const r = b.getBoundingClientRect();
            const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return t ? (t.id ? '#' + t.id : (t.className || t.tagName)) : 'none';
        });
        check('metamorphosis button clickable (hit-test)', /spellBtn|spell/.test(String(morphHit)), morphHit);

        // ============ D. Без магии: спеллов нет, пилюля работает ============
        console.log('== D. No-magic regression ==');
        const p2 = await newPage(browser);
        // localStorage общий с тестом A (магия вкл) — чистим и перезагружаем
        await evl(p2, () => localStorage.clear());
        await p2.reload({ waitUntil: 'domcontentloaded' });
        await p2.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
        await p2.evaluate(() => wordsReady.then(() => window.__w = true));
        await p2.waitForFunction('window.__w === true', { timeout: 20000 });
        await sleep(300);
        await forceTheme(p2, 'theme-weight-pantomiimi');
        await evl(p2, () => { document.getElementById('roundSelect').value = '7'; setPlayerMode(2); });
        await tap(p2, '#startGameBtn'); await sleep(400);
        await rollAndRest(p2);
        m = await measure(p2);
        check('no spell zone without magic', m.spellBox.display === 'none');
        check('pill works without magic', m.pill.display !== 'none' && String(m.pill.hit).includes('btnDisplayWords'), m.pill.hit);
        await tap(p2, '#btnDisplayWords'); await sleep(500);
        const opened = await evl(p2, () => document.querySelectorAll('#wordList li').length);
        check('words open normally', opened === 5, opened);
        await p2.close();

        // ============ E. Комната: спеллы над колесом у объясняющего ============
        console.log('== E. Room explainer ==');
        const host = await newPage(browser);
        await evl(host, () => localStorage.clear());
        await host.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
        await host.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
        await host.evaluate(() => wordsReady.then(() => window.__w = true));
        await host.waitForFunction('window.__w === true', { timeout: 20000 });
        await sleep(400);
        await forceTheme(host, 'theme-weight-pantomiimi');
        await evl(host, () => { document.getElementById('roundSelect').value = '2'; document.getElementById('magicToggle').click(); });
        await sleep(300);

        const roomCode = await evl(host, () => new Promise(res => {
            const t = setTimeout(() => res('timeout'), 15000);
            Net.on('ROOM_CREATED', m => { clearTimeout(t); res(m.roomCode); });
            document.getElementById('netModeRoom').click();
            setTimeout(() => {
                document.getElementById('roomNameInput').value = 'HostV19';
                document.getElementById('btnCreateRoom').click();
            }, 300);
        }));
        check('room created', /^[A-Z]{4}$/.test(roomCode), roomCode);

        const guest = await newPage(browser);
        await evl(guest, () => localStorage.clear());
        await guest.goto(`${BASE}/?room=${roomCode}`, { waitUntil: 'domcontentloaded' });
        await guest.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
        await guest.evaluate(() => wordsReady.then(() => window.__w = true));
        await guest.waitForFunction('window.__w === true', { timeout: 20000 });
        await sleep(400);
        const joined = await evl(guest, () => new Promise(res => {
            const t = setTimeout(() => res(false), 15000);
            const done = () => { clearTimeout(t); res(true); };
            Net.on('ROOM_JOINED', done);
            Net.on('ROOM_STATE', done);
            if (Net.roomCode) done();
            else { document.getElementById('roomNameInput').value = 'GuestV19'; document.getElementById('btnJoinRoom').click(); }
        }));
        check('guest joined', joined === true);

        // Хост выбирает hahmo в лобби (roomCharPick), гость тоже — затем старт
        await evl(host, () => {
            const b = document.querySelector('#roomCharOptions .room-char-opt[data-char="Muodonmuuttaja"]') ||
                      document.querySelector('#roomCharOptions .room-char-opt');
            if (b) b.click();
        });
        await evl(guest, () => {
            const b = document.querySelector('#roomCharOptions .room-char-opt[data-char="Kirouksenlangettaja"]') ||
                      [...document.querySelectorAll('#roomCharOptions .room-char-opt')].pop();
            if (b) b.click();
        });
        await sleep(400);
        await evl(host, () => document.getElementById('btnStartRoomGame').click());
        const started = await Promise.all([
            (async () => { const t0 = Date.now(); while (Date.now() - t0 < 8000) { if (await evl(host, () => window.isRoomGame && window.isRoomGame())) return true; await sleep(150); } return false; })(),
            (async () => { const t0 = Date.now(); while (Date.now() - t0 < 8000) { if (await evl(guest, () => window.isRoomGame && window.isRoomGame())) return true; await sleep(150); } return false; })(),
        ]);
        check('room game started both sides', started[0] && started[1]);

        // Объясняющий (хост, ход 1) крутит — проверяем его раскладку
        const hostTurn = await evl(host, () => window.netIsMyTurn());
        check('host explains turn 1', hostTurn === true);
        await evl(host, () => document.getElementById('btn').click()); await sleep(3400);
        m = await measure(host);
        check('room: spell zone above wheel', m.spellBox.display !== 'none' && m.spellBox.bottom <= m.loader.top, `spell ${m.spellBox.bottom} vs loader ${m.loader.top}`);
        check('room: no spell row covered by pill', m.rows.every(r => !String(r.hit).includes('btnDisplayWords')), JSON.stringify(m.rows));
        await host.close();
        await guest.close();

        // ============ F. Errors ============
        console.log('== Errors ==');
        const realErrors = errors.filter(e => !e.includes('Failed to load resource'));
        check('zero console/page errors', realErrors.length === 0, '\n    ' + realErrors.join('\n    '));

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
        process.exitCode = fail ? 1 : 0;
    } finally {
        await browser.close();
        srv.kill();
    }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
