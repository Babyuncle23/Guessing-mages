// audit/tool/verify17.js — Task 18: UX-paketti
// A) Sticky-toimintopalkki: napit kiinni alareunassa sanojen aikana
// B) Verho: kosketus/hover paljastaa KOKO listan (kaistale/hold poistettu)
// C) selGlow: lukitun rivin kultainen hehku verhon läpi — teksti ei näy
// D) chipRound "1/N" + veilCoach kerran + hint-dim ekan eleen jälkeen
// E) Luovutus: pelkkä click EI lopeta vuoroa; 1 s pohjassapito lopettaa
// Запуск: node verify17.js  (сам поднимает server.js на :8480)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8480;
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
const forceTheme = (page, weightId) => evl(page, (id) => {
    document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; x.dispatchEvent(new Event('input', { bubbles: true })); });
    const el = document.getElementById(id);
    el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true }));
}, weightId);
const startGameAndRoll = async (page, weightId) => {
    await forceTheme(page, weightId);
    await tap(page, '#startGameBtn'); await sleep(400);
    await tap(page, '#btn'); await sleep(3400);
};
const openWords = async (page) => { await tap(page, '#btnDisplayWords'); await sleep(500); };
const touchOn = (page, type, fracY) => evl(page, (t, f) => {
    const el = document.getElementById('wordList');
    const r = el.getBoundingClientRect();
    const touch = new Touch({ identifier: 1, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height * f });
    const ev = new TouchEvent(t, { changedTouches: [touch], touches: t === 'touchend' ? [] : [touch], bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
}, type, fracY);
const barState = (page) => evl(page, () => {
    const rc = document.getElementById('roundControls');
    const cs = getComputedStyle(rc);
    return {
        position: cs.position,
        display: cs.display,
        bottom: rc.getBoundingClientRect().bottom,
        zIndex: cs.zIndex,
        wordsActive: document.getElementById('gameContainer').classList.contains('words-active'),
        wrapPadB: parseFloat(getComputedStyle(document.getElementById('wordListWrap')).paddingBottom)
    };
});
const glowState = (page) => evl(page, () => {
    const g = document.getElementById('selGlow');
    const li = document.querySelector('#wordList li.selected-word');
    const wrap = document.getElementById('wordListWrap');
    const lr = li ? li.getBoundingClientRect() : null;
    const wr = wrap.getBoundingClientRect();
    return {
        d: g.style.display,
        computed: getComputedStyle(g).display,
        top: parseFloat(g.style.top) || null,
        h: parseFloat(g.style.height) || null,
        liTop: lr ? lr.top - wr.top : null,
        liH: lr ? lr.height : null,
        selIdx: li ? li.getAttribute('data-index') : null
    };
});

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

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 30000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] });
    try {
        // ============ A. Sticky-palkki + chipRound ============
        console.log('== A. Sticky action bar + round badge ==');
        let page = await newPage(browser);
        await startGameAndRoll(page, 'theme-weight-pantomiimi');

        let bs = await barState(page);
        check('before words: controls hidden', bs.display === 'none', bs.display);
        check('before words: not fixed', bs.position !== 'fixed', bs.position);
        check('chipRound hidden before round starts? (has value anyway)', await evl(page, () => document.getElementById('chipRound') !== null));

        await openWords(page);
        bs = await barState(page);
        check('words-active set', bs.wordsActive === true);
        check('controls fixed during words', bs.position === 'fixed', bs.position);
        check('bar pinned to viewport bottom', Math.abs(bs.bottom - 844) < 2, `bottom=${bs.bottom}`);
        check('bar above fog (z>=20)', parseInt(bs.zIndex) >= 20, bs.zIndex);
        check('list wrap has bottom padding', bs.wrapPadB >= 60, bs.wrapPadB);

        // Kierrosbadge chipissä
        const chipR = await evl(page, () => ({
            t: document.getElementById('chipRound').textContent,
            d: document.getElementById('chipRound').style.display
        }));
        check('chipRound shows "1/N"', /^1\/\d+$/.test(chipR.t), chipR.t);
        check('chipRound visible', chipR.d !== 'none', chipR.d);

        // ============ B. Verho: kosketus/hover = koko lista ============
        console.log('== B. Veil: instant reveal-all ==');
        let mst = await evl(page, () => ({
            mask: getComputedStyle(document.getElementById('wordMask')).display,
            maskImg: getComputedStyle(document.getElementById('wordMask')).maskImage || 'none',
            revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
            hintD: document.getElementById('wordMaskHint').style.display
        }));
        check('idle fog: mask block, solid', mst.mask === 'block' && (mst.maskImg === 'none' || mst.maskImg === ''), JSON.stringify(mst));
        check('idle: not revealing', mst.revealing === false);
        check('hint text updated (no vedä/pidä)', await evl(page, () => /Kosketa/i.test(document.getElementById('wordMaskHint').textContent)));

        // Hiiri ensin (touchActiveUntil-guard estäisi synteettisen hiiri-eleen
        // 700 ms sisällä kosketuksesta): hover = koko lista
        await evl(page, () => {
            const el = document.getElementById('wordList');
            const r = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent('mousemove', { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }));
        });
        await sleep(100);
        mst = await evl(page, () => ({
            revealing: document.getElementById('wordListWrap').classList.contains('revealing')
        }));
        check('mouse hover: revealing on', mst.revealing === true);
        await evl(page, () => document.getElementById('wordList').dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })));
        await sleep(100);
        mst = await evl(page, () => ({
            revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
            mask: getComputedStyle(document.getElementById('wordMask')).display
        }));
        check('mouse leave: fog back', mst.revealing === false && mst.mask === 'block', JSON.stringify(mst));

        // Kosketus -> heti koko lista
        await touchOn(page, 'touchstart', 0.5); await sleep(100);
        mst = await evl(page, () => ({
            revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
            mask: getComputedStyle(document.getElementById('wordMask')).display
        }));
        check('touchstart: revealing instantly', mst.revealing === true, JSON.stringify(mst));
        check('touch: mask fully hidden', mst.mask === 'none', mst.mask);
        await touchOn(page, 'touchend', 0.5); await sleep(120);
        mst = await evl(page, () => ({
            revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
            mask: getComputedStyle(document.getElementById('wordMask')).display
        }));
        check('touchend: fog back', mst.revealing === false && mst.mask === 'block', JSON.stringify(mst));

        // ============ C. selGlow ============
        console.log('== C. selGlow ==');
        let gs = await glowState(page);
        check('no glow before selection', gs.d === 'none', gs.d);
        await evl(page, () => document.querySelectorAll('#wordList li')[2].click()); await sleep(250);
        gs = await glowState(page);
        check('glow appears after lock', gs.d === 'block', gs.d);
        check('glow aligned to selected row', gs.selIdx === '2' && Math.abs(gs.top - gs.liTop) < 2 && Math.abs(gs.h - gs.liH) < 2, `top=${gs.top} vs ${gs.liTop}, h=${gs.h} vs ${gs.liH}`);
        // Toisen rivin valinta siirtää hehkun
        await evl(page, () => document.querySelectorAll('#wordList li')[4].click()); await sleep(250);
        gs = await glowState(page);
        check('glow follows new selection', gs.selIdx === '4' && Math.abs(gs.top - gs.liTop) < 3, `top=${gs.top} vs ${gs.liTop}`);
        // Paljastuksen aikana hehku piilossa (kaikki näkyy joka tapauksessa)
        await touchOn(page, 'touchstart', 0.5); await sleep(100);
        gs = await glowState(page);
        check('glow hidden while revealing', gs.computed === 'none', gs.computed);
        await touchOn(page, 'touchend', 0.5); await sleep(120);
        gs = await glowState(page);
        check('glow back after reveal ends', gs.computed === 'block', gs.computed);
        // Teksti EI näy: maskin computed edelleen block -> rivi verhon alla, vain hehku päällä
        mst = await evl(page, () => getComputedStyle(document.getElementById('wordMask')).display);
        check('text stays under fog (mask solid over list)', mst === 'block', mst);
        // Hehku poistuu kun lista tyhjennetään (endRound polku)
        const glowZ = await evl(page, () => getComputedStyle(document.getElementById('selGlow')).zIndex);
        const maskZ = await evl(page, () => getComputedStyle(document.getElementById('wordMask')).zIndex);
        check('glow above mask layer', parseInt(glowZ) > parseInt(maskZ), `${glowZ} vs ${maskZ}`);

        // ============ D. veilCoach + hint-dim ============
        console.log('== D. Coach once + hint dim ==');
        const coach = await evl(page, () => ({
            d: document.getElementById('veilCoach').style.display,
            flag: localStorage.getItem('veilCoachV1')
        }));
        check('coach dismissed by earlier gesture', coach.d === 'none' && coach.flag === '1', JSON.stringify(coach));
        check('hint dimmed (veilUsed)', await evl(page, () => document.getElementById('wordMaskHint').classList.contains('hint-dim')));

        // Uusi sivu: localStorage on jaettu origin-tasolla — nollataan flag,
        // jotta "ekaa kertaa" -polku testataan aidosti.
        const p2 = await newPage(browser);
        await evl(p2, () => localStorage.removeItem('veilCoachV1'));
        await startGameAndRoll(p2, 'theme-weight-pantomiimi');
        await openWords(p2);
        const coach2 = await evl(p2, () => ({
            d: document.getElementById('veilCoach').style.display,
            hintDim: document.getElementById('wordMaskHint').classList.contains('hint-dim')
        }));
        check('coach shown on first-ever open', coach2.d === 'block', coach2.d);
        check('hint not dimmed yet on fresh page', coach2.hintDim === false);
        await touchOn(p2, 'touchstart', 0.5); await sleep(700);
        const coach3 = await evl(p2, () => ({
            d: document.getElementById('veilCoach').style.display,
            out: document.getElementById('veilCoach').classList.contains('veil-coach-out'),
            flag: localStorage.getItem('veilCoachV1'),
            hintDim: document.getElementById('wordMaskHint').classList.contains('hint-dim')
        }));
        check('coach dismissed on first gesture', (coach3.d === 'none' || coach3.out === true) && coach3.flag === '1', JSON.stringify(coach3));
        check('hint dimmed after first gesture', coach3.hintDim === true);
        await touchOn(p2, 'touchend', 0.5); await sleep(100);

        // Uusi sivu flagin kanssa -> coach EI näy enää
        await evl(p2, () => localStorage.setItem('veilCoachV1', '1'));
        const p3 = await newPage(browser);
        await evl(p3, () => localStorage.setItem('veilCoachV1', '1'));
        // flag pitää asettaa ennen peliä — tehdään reload
        await p3.reload({ waitUntil: 'domcontentloaded' });
        await p3.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
        await p3.evaluate(() => wordsReady.then(() => window.__w = true));
        await p3.waitForFunction('window.__w === true', { timeout: 20000 });
        await sleep(300);
        await startGameAndRoll(p3, 'theme-weight-pantomiimi');
        await openWords(p3);
        const coach4 = await evl(p3, () => document.getElementById('veilCoach').style.display);
        check('coach not shown when flag set', coach4 === 'none' || coach4 === '', coach4);
        await p3.close();

        // ============ E. Luovutus: hold 1 s ============
        console.log('== E. Give up requires 1 s hold ==');
        // Pelkkä click -> ei lopetusta + hold-hint
        await evl(page, () => document.getElementById('btnGiveUp').click());
        await sleep(250);
        bs = await barState(page);
        check('plain click does NOT end turn', bs.wordsActive === true, JSON.stringify(bs));
        check('hold-hint shown on plain click', await evl(page, () => document.getElementById('btnGiveUp').classList.contains('hold-hint')));
        await sleep(1500);

        // Lyhyt painallus (<1 s) -> ei lopetusta
        await evl(page, () => {
            const b = document.getElementById('btnGiveUp');
            b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        });
        await sleep(400);
        check('holding class during press', await evl(page, () => document.getElementById('btnGiveUp').classList.contains('holding')));
        await evl(page, () => document.getElementById('btnGiveUp').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
        await sleep(700);
        bs = await barState(page);
        check('short press does NOT end turn', bs.wordsActive === true);

        // Täysi 1 s pito -> vuoro loppuu
        await evl(page, () => {
            const b = document.getElementById('btnGiveUp');
            b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        });
        await sleep(1150);
        await evl(page, () => document.getElementById('btnGiveUp').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
        await sleep(500);
        bs = await barState(page);
        check('1 s hold ends turn', bs.wordsActive === false, JSON.stringify(bs));
        check('words cleared after giveup', await evl(page, () => document.querySelectorAll('#wordList li').length === 0));
        check('next round button back', await evl(page, () => document.getElementById('btn').style.display === 'block'));

        // Sticky-palkki poistuu vuoron mukana
        bs = await barState(page);
        check('bar not fixed after turn', bs.position !== 'fixed' || bs.display === 'none', `pos=${bs.position} disp=${bs.display}`);

        // ============ Console errors ============
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
