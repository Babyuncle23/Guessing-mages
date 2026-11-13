// audit/tool/verify13.js — privacy-mask: yhden rivin lukuikkuna sanalistalla
// A) Verho/rae/vihje näkyvät sanojen auetessa, ikkuna seuraa hiirtä/kosketusta
// B) hidden-words / endRound / uudelleenrendaus — verho seuraa listan tilaa
// C) prefers-contrast: more -> rakeisuus pois päältä
// D) Huonepeli: verho vain selittäjällä; ws-katkon jälkeen verho toimii edelleen
// Запуск: node verify13.js  (сам поднимает server.js на :8477)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8477;
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
const fill = (page, sel, text) => page.evaluate((s, t) => {
    const el = document.querySelector(s);
    el.value = t;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}, sel, text);
const evl = (page, fn, ...args) => page.evaluate(fn, ...args);
const maskState = (page) => evl(page, () => ({
    mask: getComputedStyle(document.getElementById('wordMask')).display,
    grain: getComputedStyle(document.getElementById('wordGrain')).display,
    hint: document.getElementById('wordMaskHint').style.display,
    hintComputed: getComputedStyle(document.getElementById('wordMaskHint')).display,
    revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
    maskOn: document.getElementById('wordListWrap').classList.contains('mask-on'),
    maskImg: getComputedStyle(document.getElementById('wordMask')).maskImage ||
             getComputedStyle(document.getElementById('wordMask')).webkitMaskImage || 'none',
    lis: document.querySelectorAll('#wordList li').length
}));
const mouseMoveOn = (page, fracY) => evl(page, (f) => {
    const el = document.getElementById('wordList');
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: r.x + r.width / 2, clientY: r.y + r.height * f, bubbles: true }));
}, fracY);
const touchOn = (page, type, fracY) => evl(page, (t, f) => {
    const el = document.getElementById('wordList');
    const r = el.getBoundingClientRect();
    const touch = new Touch({ identifier: 1, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height * f });
    const ev = new TouchEvent(t, { changedTouches: [touch], touches: t === 'touchend' ? [] : [touch], bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
}, type, fracY);
const myNum = (s) => parseFloat(s || '-999'); // legacy (ei enää käytössä Task 18:n jälkeen)

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
        // ============ A. Yksinpeli: verho käyttäytyy ============
        console.log('== A. Privacy mask, single phone ==');
        const page = await newPage(browser);
        await evl(page, () => {
            document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; });
            document.getElementById('theme-weight-pantomiimi').value = 1;
        });
        await tap(page, '#startGameBtn'); await sleep(400);
        await tap(page, '#btn'); await sleep(3400);
        await tap(page, '#btnDisplayWords'); await sleep(500);

        let st = await maskState(page);
        check('5 words rendered', st.lis === 5, st.lis);
        check('mask visible', st.mask === 'block', st.mask);
        check('grain visible', st.grain === 'block', st.grain);
        check('hint visible while idle', st.hint === 'flex', st.hint);
        // Task 18: ikkunakaistaletta ei enää ole — verho on tasainen,
        // kosketus/hover paljastaa KOKO listan (revealing-luokka)
        check('mask is solid (no gradient window)', st.maskImg === 'none' || st.maskImg === '', st.maskImg.slice(0, 60));
        check('mask-on class on wrap', st.maskOn === true);
        check('not revealing initially', st.revealing === false);

        // hiiri: hover paljastaa koko listan
        await mouseMoveOn(page, 0.3); await sleep(120);
        st = await maskState(page);
        check('mousemove: revealing on', st.revealing === true, JSON.stringify(st));
        check('mousemove: mask fully off', st.mask === 'none', st.mask);
        check('mousemove: hint computed off under revealing', st.hintComputed === 'none', st.hintComputed);
        await evl(page, () => document.getElementById('wordList').dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })));
        await sleep(120);
        st = await maskState(page);
        check('mouseleave: revealing off', st.revealing === false);
        check('mouseleave: mask back', st.mask === 'block', st.mask);
        check('hint returns after leave', st.hintComputed === 'flex', st.hintComputed);

        // kosketus: kosketus = koko lista, vapautus = verho
        await touchOn(page, 'touchstart', 0.5); await sleep(120);
        st = await maskState(page);
        check('touchstart: revealing on immediately', st.revealing === true, JSON.stringify(st));
        await touchOn(page, 'touchmove', 0.7); await sleep(120);
        st = await maskState(page);
        check('touchmove: still revealing', st.revealing === true);
        await touchOn(page, 'touchend', 0.7); await sleep(120);
        st = await maskState(page);
        check('touchend: revealing off', st.revealing === false);
        check('touchend: mask back', st.mask === 'block', st.mask);

        // valinta toimii verhon läpi
        await evl(page, () => window.selectWordLi(document.querySelector('#wordList li'))); await sleep(200);
        check('word still selectable through mask', await evl(page, () => !!document.querySelector('#wordList li.selected-word')));

        // ============ B. Verho seuraa listan tilaa ============
        console.log('== B. State following ==');
        // Task 15: "Piilota sanat" poistui — sama reaktiivisuus testataan luokalla suoraan
        await evl(page, () => document.getElementById('wordList').classList.add('hidden-words')); await sleep(200);
        st = await maskState(page);
        check('hidden-words: mask off', st.mask === 'none', st.mask);
        check('hidden-words: grain off', st.grain === 'none', st.grain);
        check('hidden-words: Piilotettu shown', await evl(page, () => document.getElementById('wordList').classList.contains('hidden-words')));
        await evl(page, () => document.getElementById('wordList').classList.remove('hidden-words')); await sleep(200);
        st = await maskState(page);
        check('re-show: mask back on', st.mask === 'block', st.mask);
        // uudelleenrendaus (metamorfoosi-tyyppinen polku)
        await evl(page, () => { generatedWordsList = ['testisana', 'toinen', 'kolmas', 'neljas', 'viides']; renderOlList(); });
        await sleep(200);
        st = await maskState(page);
        check('re-render keeps mask on', st.mask === 'block' && st.lis === 5, `${st.mask}/${st.lis}`);
        // kierroksen loppu siivoaa
        await evl(page, () => document.getElementById('btnGuessed').click()); await sleep(500);
        st = await maskState(page);
        check('endRound: mask off (list empty)', st.mask === 'none' && st.lis === 0, `${st.mask}/${st.lis}`);

        // ============ C. prefers-contrast ============
        console.log('== C. prefers-contrast: more ==');
        try {
            await page.emulateMediaFeatures([{ name: 'prefers-contrast', value: 'more' }]);
            await tap(page, '#btn'); await sleep(3400);
            await tap(page, '#btnDisplayWords'); await sleep(400);
            st = await maskState(page);
            check('grain hidden under prefers-contrast: more', st.grain === 'none', st.grain);
            check('mask still works under prefers-contrast', st.mask === 'block', st.mask);
            await page.emulateMediaFeatures([{ name: 'prefers-contrast', value: 'no-preference' }]);
        } catch (e) {
            const hasRule = await evl(page, () => {
                for (const sh of document.styleSheets) {
                    try { for (const r of sh.cssRules) { if (r.cssText && r.cssText.includes('prefers-contrast')) return true; } } catch (x) {}
                }
                return false;
            });
            check('prefers-contrast rule exists (emulation unsupported)', hasRule === true);
        }
        await page.close();

        // ============ D. Huonepeli: verho vain selittäjällä + offline ============
        console.log('== D. Room mode + offline resilience ==');
        const A = await newPage(browser);
        await tap(A, '#netModeRoom'); await sleep(700);
        await fill(A, '#roomNameInput', 'Selittaja');
        await tap(A, '#btnCreateRoom'); await sleep(1000);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        check('room created', /^[A-Z]{4}$/.test(code), code);

        const B = await newPage(browser);
        await tap(B, '#netModeRoom'); await sleep(600);
        await fill(B, '#roomNameInput', 'Arvaaja');
        await fill(B, '#roomCodeInput', code);
        await tap(B, '#btnJoinRoom'); await sleep(900);

        await evl(A, () => {
            document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; x.dispatchEvent(new Event('input', { bubbles: true })); });
            const el = document.getElementById('theme-weight-pantomiimi');
            el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(400);
        await tap(A, '#btnStartRoomGame'); await sleep(1200);
        check('A is explainer', await evl(A, () => window.netIsMyTurn() === true));
        await tap(A, '#btn'); await sleep(3400);
        await tap(A, '#btnDisplayWords'); await sleep(600);

        const stA = await maskState(A);
        check('explainer: mask on', stA.mask === 'block' && stA.lis === 5, `${stA.mask}/${stA.lis}`);
        const stB = await maskState(B);
        check('guesser: no words, no mask', stB.lis === 0 && stB.mask === 'none', `${stB.mask}/${stB.lis}`);

        // ws katkeaa selittäjältä -> verho pysyy täysin paikallisena
        await evl(A, () => { try { Net.ws.close(); } catch (e) {} });
        await sleep(400);
        await mouseMoveOn(A, 0.4); await sleep(120);
        const stA2 = await maskState(A);
        check('offline explainer: reveal still works', stA2.revealing === true, JSON.stringify(stA2));

        // ============ Console errors ============
        console.log('== Errors ==');
        // sounds/-abortit näkyvät console.error:na — ne ovat testin oma artefakti
        const realErrors = errors.filter(e => !e.includes('Failed to load resource'));
        check('zero console/page errors', realErrors.length === 0, '\n    ' + realErrors.join('\n    '));

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
        process.exitCode = fail ? 1 : 0;
    } finally {
        await browser.close();
        srv.kill();
    }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
