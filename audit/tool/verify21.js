// audit/tool/verify21.js — динамическое исчезновение скиллов + стрелки скролла
// A) Фаза 1: каст Korttitulva → строка spell-out → контейнер скрыт (единственный спелл)
// B) Фаза 2: метаморфоза → контейнер скрыт после анимации
// C) Kirouksenlangettaja: каст одного проклятия → его строка исчезает, вторая остаётся;
//    каст второго → весь spellContainer скрыт
// D) vapaavalintainen: у Muodonmuuttaja зона полностью скрыта (контекстная блокировка)
// E) 0 зарядов → скилл не отображается вовсе (на новом ходу)
// F) Стрелки: скрыты без переполнения; видны при переполнении; dir-hidden у краёв;
//    удержание = скролл + reveal; тап = шаг; нажатие не выбирает слово; выбор жестом работает
// G) Zero console errors
// Запуск: node verify21.js  (сам поднимает server.js на :8490)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8490;
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
const pickMages = (page, chars) => evl(page, async (ch) => {
    document.getElementById('magicToggle').click();
    await new Promise(r => setTimeout(r, 250));
    ch.forEach(c => document.querySelector(`.char-card[data-char="${c}"]`).click());
}, chars);
const startMagicGame = async (page, themeId, chars, rounds) => {
    await forceTheme(page, themeId);
    await evl(page, (r) => { document.getElementById('roundSelect').value = String(r); setPlayerMode(2); }, rounds || 7);
    await pickMages(page, chars); await sleep(200);
    await tap(page, '#startGameBtn'); await sleep(400);
};
const rollAndRest = async (page) => { await tap(page, '#btn'); await sleep(3400); };
const openWords = async (page) => { await tap(page, '#btnDisplayWords'); await sleep(500); };

const spellState = (page) => evl(page, () => ({
    container: document.getElementById('spellContainer').style.display,
    r1: document.getElementById('spellRow1').style.display,
    r2: document.getElementById('spellRow2').style.display,
    r1out: document.getElementById('spellRow1').classList.contains('spell-out'),
    r2out: document.getElementById('spellRow2').classList.contains('spell-out'),
    b1txt: document.getElementById('spellBtn1').textContent,
    b2txt: document.getElementById('spellBtn2').textContent,
    title: document.getElementById('spellZoneTitle').textContent,
}));
const railState = (page) => evl(page, () => ({
    rail: document.getElementById('wordScrollRail').style.display,
    upHidden: document.getElementById('wordScrollUp').classList.contains('dir-hidden'),
    downHidden: document.getElementById('wordScrollDown').classList.contains('dir-hidden'),
    scrollTop: document.getElementById('wordList').scrollTop,
    revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
}));
const touchBtn = (page, id, type) => evl(page, (i, t) => {
    const el = document.getElementById(i);
    const r = el.getBoundingClientRect();
    const touch = new Touch({ identifier: 9, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 });
    const ev = new TouchEvent(t, { changedTouches: [touch], touches: t === 'touchend' || t === 'touchcancel' ? [] : [touch], bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
}, id, type);
const touchAt = (page, type, x, y) => evl(page, (t, cx, cy) => {
    const el = document.getElementById('wordList');
    const touch = new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy });
    const ev = new TouchEvent(t, { changedTouches: [touch], touches: t === 'touchend' || t === 'touchcancel' ? [] : [touch], bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
}, type, x, y);
const rowCenter = (page, i) => evl(page, (idx) => {
    const li = document.querySelectorAll('#wordList li')[idx];
    const r = li.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, idx: li.getAttribute('data-index') };
}, i);

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
        // ============ A. Фаза 1: скилл исчезает после каста ============
        console.log('== A. Spell disappears after cast (phase 1) ==');
        let page = await newPage(browser);
        await evl(page, () => localStorage.clear());
        await startMagicGame(page, 'theme-weight-pantomiimi', ['Muodonmuuttaja', 'Kirouksenlangettaja'], 7);
        await rollAndRest(page);

        let st = await spellState(page);
        check('P1 spell zone visible', st.container === 'flex', st.container);
        check('P1 Korttitulva shown', /KORTTITULVA/.test(st.b1txt), st.b1txt);
        await tap(page, '#spellBtn1');
        await sleep(80);
        st = await spellState(page);
        check('row1 collapsing after cast (spell-out)', st.r1out === true);
        check('extendToEight applied', await evl(page, () => activeModifiers.extendToEight === true));
        await sleep(450);
        st = await spellState(page);
        check('spell zone fully hidden (single spell used)', st.container === 'none', st.container);

        // ============ B. Фаза 2: метаморфоза исчезает ============
        console.log('== B. Phase 2 metamorphosis ==');
        await openWords(page);
        st = await spellState(page);
        check('morph button shown in phase 2', st.container === 'flex' && /SANAMETAMORFOOSI/.test(st.b1txt), `${st.container}|${st.b1txt}`);
        check('phase title = Vaihe 2', st.title.includes('Vaihe 2'), st.title);
        await tap(page, '#spellBtn1');
        await sleep(450);
        st = await spellState(page);
        check('spell zone hidden after morph', st.container === 'none', st.container);
        check('morph flag applied', await evl(page, () => isMetamorphosisUsedThisTurn === true));

        // ============ C. Kirouksenlangettaja: по одной строке ============
        console.log('== C. Curser: per-row disappearance ==');
        await tap(page, '#btnGuessed'); await sleep(500);
        check('turn -> Kirouksenlangettaja', await evl(page, () => gamePlayers[currentPlayerIndex].name === 'Kirouksenlangettaja'));
        await rollAndRest(page);
        st = await spellState(page);
        check('curser: two rows visible', st.r1 === 'flex' && st.r2 === 'flex', `${st.r1}/${st.r2}`);
        check('row1 = KORTTINÄLKÄ', /KORTTIN/.test(st.b1txt), st.b1txt);
        check('row2 = SANAKAAOS', /SANAKAAOS/.test(st.b2txt), st.b2txt);
        await tap(page, '#spellBtn1');
        await sleep(450);
        st = await spellState(page);
        check('hunger cast → row1 hidden', st.r1 === 'none', st.r1);
        check('chaos row still visible', st.r2 === 'flex', st.r2);
        check('container still visible (one spell left)', st.container === 'flex', st.container);
        check('hunger pending on P1', await evl(page, () => pendingCurses.hunger === 0));
        await tap(page, '#spellBtn2');
        await sleep(450);
        st = await spellState(page);
        check('container hidden after both curses', st.container === 'none', st.container);
        check('chaos pending on P1', await evl(page, () => pendingCurses.chaos === 0));

        // Заканчиваем ход: у проклятого P1 (0 зарядов) зоны нет совсем
        await evl(page, () => window._devConfirmGiveUp()); await sleep(400);
        check('turn -> Muodonmuuttaja (cursed)', await evl(page, () => gamePlayers[currentPlayerIndex].name === 'Muodonmuuttaja'));
        check('curses landed on P1', await evl(page, () => activeModifiers.reduceToThree === true && activeModifiers.chaosFourWords === true));
        await rollAndRest(page);
        st = await spellState(page);
        check('0 charges → spell zone absent entirely', st.container === 'none', st.container);
        await openWords(page);
        check('curse banner shown', await evl(page, () => document.getElementById('curseBanner').style.display === 'block'));
        check('hunger curse → 3 words', await evl(page, () => document.querySelectorAll('#wordList li').length) === 3);
        await page.close();

        // ============ D. vapaavalintainen: контекстная блокировка ============
        console.log('== D. Context-blocked spell hidden (vapaavalintainen) ==');
        page = await newPage(browser);
        await startMagicGame(page, 'theme-weight-vapaavalintainen', ['Muodonmuuttaja', 'Kirouksenlangettaja'], 7);
        await rollAndRest(page);
        st = await spellState(page);
        check('vapaa: flood unusable → zone hidden for P1', st.container === 'none', st.container);
        await page.close();

        // ============ E. Стрелки скролла ============
        console.log('== E. Scroll arrows ==');
        page = await newPage(browser);
        await evl(page, () => localStorage.clear());
        await forceTheme(page, 'theme-weight-pantomiimi');
        await evl(page, () => { document.getElementById('roundSelect').value = '7'; setPlayerMode(2); });
        await tap(page, '#startGameBtn'); await sleep(400);
        await rollAndRest(page);
        await openWords(page);
        check('5 words open', await evl(page, () => document.querySelectorAll('#wordList li').length) === 5);

        let rs = await railState(page);
        check('rail hidden when no overflow', rs.rail === 'none', rs.rail);

        // Искусственное переполнение: жёсткий max-height (в words-active стоит
        // max-height:none !important — побеждаем setProperty с приоритетом)
        await evl(page, () => {
            document.getElementById('wordList').style.setProperty('max-height', '150px', 'important');
            window.updateWordScrollRail();
        });
        rs = await railState(page);
        check('rail visible on overflow', rs.rail === 'flex', rs.rail);
        check('▲ hidden at top edge', rs.upHidden === true);
        check('▼ visible at top edge', rs.downHidden === false);

        // Удержание ▼: reveal + непрерывный скролл
        await touchBtn(page, 'wordScrollDown', 'touchstart'); await sleep(500);
        rs = await railState(page);
        check('hold ▼ scrolls list', rs.scrollTop > 20, `scrollTop=${rs.scrollTop}`);
        check('hold ▼ reveals veil', rs.revealing === true);
        check('arrow press does not select a word', await evl(page, () => selectedWordIndex === -1));
        await touchBtn(page, 'wordScrollDown', 'touchend'); await sleep(300);
        rs = await railState(page);
        check('veil returns after release', rs.revealing === false);
        check('▲ appeared after scrolling down', rs.upHidden === false);

        // Докручиваем в самый низ — ▼ гаснет
        await evl(page, () => { document.getElementById('wordList').scrollTop = 99999; });
        await sleep(150);
        rs = await railState(page);
        check('▼ hidden at bottom edge', rs.downHidden === true);
        const deepTop = rs.scrollTop;

        // Тап ▲ — плавный шаг вверх
        await touchBtn(page, 'wordScrollUp', 'touchstart'); await sleep(60);
        await touchBtn(page, 'wordScrollUp', 'touchend'); await sleep(700);
        rs = await railState(page);
        check('tap ▲ scrolls up by ~2 rows', rs.scrollTop < deepTop, `${deepTop}→${rs.scrollTop}`);
        check('▼ visible again', rs.downHidden === false);

        // Выбор жестом после скролла по-прежнему работает
        const c = await rowCenter(page, 0);
        await touchAt(page, 'touchstart', c.x, c.y); await sleep(80);
        await touchAt(page, 'touchend', c.x, c.y); await sleep(200);
        check('word selection works after scrolling', await evl(page, () =>
            document.querySelector('#wordList li.selected-word') !== null && selectedWordIndex >= 0));

        // Убираем переполнение — rail исчезает
        await evl(page, () => { document.getElementById('wordList').style.removeProperty('max-height'); window.updateWordScrollRail(); });
        rs = await railState(page);
        check('rail hidden again without overflow', rs.rail === 'none', rs.rail);
        await page.close();

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
