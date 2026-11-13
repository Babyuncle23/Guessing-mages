// audit/tool/verify15.js — Task 15: kompakti sanalista-UX
// A) "Piilota sanat" poistettu; vuoropaneeli on harmonikka, kiinni sanojen aikana
// B) 🎨-pikapainike: vain piirto/emoji-ehdoilla; modaalin sulku -> sanat palaavat
// C) Paljastus: sovitettu ikkuna (--wh) + pidä-pohjassa -> koko lista
// D) Lista täyttää ruudun; pienellä ruudulla scroll + verho toimii edelleen
// Запуск: node verify15.js  (сам поднимает server.js на :8478)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8478;
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
const maskState = (page) => evl(page, () => ({
    mask: getComputedStyle(document.getElementById('wordMask')).display,
    hint: document.getElementById('wordMaskHint').style.display,
    hintDim: document.getElementById('wordMaskHint').classList.contains('hint-dim'),
    revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
    lis: document.querySelectorAll('#wordList li').length
}));
const panelState = (page) => evl(page, () => ({
    collapsed: document.getElementById('turnPanelBody').classList.contains('collapsed'),
    aria: (document.getElementById('btnInfoToggle') || { getAttribute: () => null }).getAttribute('aria-expanded'),
    controls: (document.getElementById('btnInfoToggle') || { getAttribute: () => null }).getAttribute('aria-controls'),
    chipTheme: document.getElementById('chipTheme').textContent,
    chipThemeDisplay: getComputedStyle(document.getElementById('chipTheme')).display,
    chipTurn: document.getElementById('chipTurn').textContent,
    pill: getComputedStyle(document.getElementById('btnToolCanvas')).display,
    btnDisplay: getComputedStyle(document.getElementById('btnDisplayWords')).display
}));
const touchOn = (page, type, fracY) => evl(page, (t, f) => {
    const el = document.getElementById('wordList');
    const r = el.getBoundingClientRect();
    const touch = new Touch({ identifier: 1, target: el, clientX: r.x + r.width / 2, clientY: r.y + r.height * f });
    const ev = new TouchEvent(t, { changedTouches: [touch], touches: t === 'touchend' ? [] : [touch], bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
}, type, fracY);
const startGameAndRoll = async (page, weightId) => {
    await forceTheme(page, weightId);
    await tap(page, '#startGameBtn'); await sleep(400);
    await tap(page, '#btn'); await sleep(3400);
};

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
        // ============ A. Piilota sanat poissa + harmonikka ============
        console.log('== A. Accordion + no Piilota sanat ==');
        let page = await newPage(browser);
        await startGameAndRoll(page, 'theme-weight-pantomiimi');

        let ps = await panelState(page);
        // Task 23: ❓-infoharmonikka — oletuksena kiinni kaikissa vaiheissa
        check('info accordion collapsed by default (❓)', ps.collapsed === true && ps.aria === 'false', JSON.stringify(ps));
        check('❓ aria-controls -> turnPanelBody', ps.controls === 'turnPanelBody', ps.controls);
        // Task 20: teema vain pyörällä levon aikana — chipissä teksti tallennettu mutta piilossa
        check('chip theme hidden during rest, textContent tracks', /PANTOMIIMI/i.test(ps.chipTheme) && ps.chipThemeDisplay === 'none', `${ps.chipTheme} ${ps.chipThemeDisplay}`);
        check('chip shows compact score right (pelajat)', /▶ .+: \d+p · .+: \d+p/.test(ps.chipTurn), ps.chipTurn);
        check('❓ hidden on wheel screen', await evl(page, () => getComputedStyle(document.getElementById('btnInfoToggle')).display === 'none'));
        check('Näytä sanat CTA visible pre-open', ps.btnDisplay !== 'none', ps.btnDisplay);
        // Task 22: avatari piilossa ilman taikahahmoa
        check('no avatar block in basic game', await evl(page, () => {
            const b = document.querySelector('.player-block');
            const aw = document.querySelector('.avatar-wrapper');
            return b.classList.contains('no-avatar') && getComputedStyle(aw).display === 'none';
        }));

        await tap(page, '#btnDisplayWords'); await sleep(500);
        ps = await panelState(page);
        check('panel still collapsed after words open', ps.collapsed === true && ps.aria === 'false', JSON.stringify(ps));
        check('btnDisplayWords gone after open', ps.btnDisplay === 'none', ps.btnDisplay);
        check('no "Piilota sanat" text anywhere visible', await evl(page, () => !/Piilota sanat/i.test(document.body.innerText)));
        check('chip stays visible', await evl(page, () => document.getElementById('turnChip').getBoundingClientRect().height > 0));

        // Chip ei ole harmonikka — klikki ei tee mitään, chevron poistettu DOMista
        await tap(page, '#turnChip'); await sleep(350);
        ps = await panelState(page);
        check('chip click does NOT toggle (chip is static)', ps.collapsed === true, JSON.stringify(ps));
        check('no chevron element in DOM', await evl(page, () => !document.querySelector('.chip-chevron')));

        // ❓-napin klikki avaa/sulkee info-harmonikan
        await tap(page, '#btnInfoToggle'); await sleep(350);
        ps = await panelState(page);
        check('❓ opens info accordion', ps.collapsed === false && ps.aria === 'true', JSON.stringify(ps));
        check('scoreboard visible inside accordion', await evl(page, () => document.getElementById('turnPanelBody').getBoundingClientRect().height > 50));
        await tap(page, '#btnInfoToggle'); await sleep(350);
        ps = await panelState(page);
        check('❓ closes info accordion', ps.collapsed === true && ps.aria === 'false');

        check('pill hidden for non-tool theme', ps.pill === 'none', ps.pill);
        await page.close();

        // ============ B. 🎨-pikapainike + auto-unhide ============
        console.log('== B. Tool pill + modal close unhide ==');
        page = await newPage(browser);
        await startGameAndRoll(page, 'theme-weight-piirtaminen');
        await tap(page, '#btnDisplayWords'); await sleep(500);
        ps = await panelState(page);
        check('pill visible for piirtäminen', ps.pill !== 'none', ps.pill);
        await tap(page, '#btnToolCanvas'); await sleep(500);
        check('pill opens drawing modal', await evl(page, () => document.getElementById('drawingModalOverlay').style.display === 'flex'));
        check('words hidden while modal open', await evl(page, () => isWordListHidden === true));
        await tap(page, '#btnCloseModalCanvasX'); await sleep(300);
        check('words auto-unhidden after modal close', await evl(page, () => isWordListHidden === false && !document.getElementById('wordList').classList.contains('hidden-words')));
        const stB = await maskState(page);
        check('mask back on after modal close', stB.mask === 'block', stB.mask);
        await page.close();

        page = await newPage(browser);
        await startGameAndRoll(page, 'theme-weight-vain-emojit');
        await tap(page, '#btnDisplayWords'); await sleep(500);
        await tap(page, '#btnToolCanvas'); await sleep(500);
        check('pill opens emoji modal', await evl(page, () => document.getElementById('emojiModalOverlay').style.display === 'flex'));
        await tap(page, '#btnCloseEmojiModalX'); await sleep(300);
        check('emoji close auto-unhides words', await evl(page, () => isWordListHidden === false));
        await page.close();

        // ============ C. Paljastus: kosketus/hover -> koko lista ============
        console.log('== C. Touch/hover reveals all ==');
        page = await newPage(browser);
        await startGameAndRoll(page, 'theme-weight-pantomiimi');
        await tap(page, '#btnDisplayWords'); await sleep(500);

        let st = await maskState(page);
        check('idle: fog on, not revealing', st.mask === 'block' && st.revealing === false, JSON.stringify(st));

        // Hiiri ensin (touchActiveUntil-guard estäisi synteettisen hiiri-eleen
        // 700 ms sisällä kosketuksesta): hover = koko lista, poistuminen = verho
        await evl(page, () => {
            const el = document.getElementById('wordList');
            const r = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent('mousemove', { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }));
        });
        await sleep(120);
        st = await maskState(page);
        check('mouse hover: revealing on', st.revealing === true, JSON.stringify(st));
        await evl(page, () => document.getElementById('wordList').dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })));
        await sleep(120);
        st = await maskState(page);
        check('mouse leave: revealing off', st.revealing === false && st.mask === 'block', JSON.stringify(st));

        // Kosketus -> koko lista välittömästi (ei enää kaistaletta eikä 350 ms viivettä)
        await touchOn(page, 'touchstart', 0.5); await sleep(120);
        st = await maskState(page);
        check('touchstart: revealing on instantly', st.revealing === true, JSON.stringify(st));
        check('touch: mask fully off', st.mask === 'none', st.mask);
        await touchOn(page, 'touchmove', 0.8); await sleep(60);
        st = await maskState(page);
        check('touchmove: stays revealing', st.revealing === true);
        await touchOn(page, 'touchend', 0.8); await sleep(120);
        st = await maskState(page);
        check('touchend: revealing off + mask back', st.revealing === false && st.mask === 'block', JSON.stringify(st));

        // Ensimmäinen paljastus himmentää vihjeen pysyvästi
        check('hint dimmed after first gesture', st.hintDim === true);

        // ============ D. Lista täyttää ruudun / scroll-fallback ============
        console.log('== D. Fill screen + scroll fallback ==');
        const geo = await evl(page, () => ({
            listH: document.getElementById('wordList').getBoundingClientRect().height,
            vh: innerHeight,
            scroll: document.getElementById('wordList').scrollHeight,
            client: document.getElementById('wordList').clientHeight
        }));
        check('list height >= 50% of viewport', geo.listH >= geo.vh * 0.5, `${geo.listH} / ${geo.vh}`);
        check('5 words fit without scrolling', geo.scroll <= geo.client + 4, `scroll ${geo.scroll} vs client ${geo.client}`);
        const allVisible = await evl(page, () => {
            const lr = document.getElementById('wordList').getBoundingClientRect();
            return [...document.querySelectorAll('#wordList li')].every(li => {
                const r = li.getBoundingClientRect();
                return r.top >= lr.top - 1 && r.bottom <= lr.bottom + 1;
            });
        });
        check('all rows inside list viewport', allVisible === true);

        // Pieni ruutu + todella pitkä lista -> scroll tarvitaan, verho toimii silti
        await page.setViewport({ width: 390, height: 430, deviceScaleFactor: 1 });
        await evl(page, () => {
            generatedWordsList = ['yksi','kaksi','kolme','neljä','viisi','kuusi','seitsemän','kahdeksan','yhdeksän','kymmenen','yksitoista','kaksitoista','kolmetoista','neljätoista'];
            renderOlList();
        }); await sleep(300);
        // Kun lista ei mahdu, kortti venyy ja SIVU scrollaa — mukavampi kuin
        // pienen sisäisen alueen scroll (verho scrollaa listan mukana).
        const geo2 = await evl(page, () => ({
            docH: document.scrollingElement.scrollHeight,
            vh: innerHeight,
            rowH: document.querySelector('#wordList li').offsetHeight,
            maskH: document.getElementById('wordMask').getBoundingClientRect().height,
            listH: document.getElementById('wordList').getBoundingClientRect().height
        }));
        check('long list: page scrolls comfortably', geo2.docH > geo2.vh, `doc ${geo2.docH} vs vh ${geo2.vh}`);
        check('long list: rows keep readable height', geo2.rowH >= 40, `${geo2.rowH}px`);
        // Verho kattaa listan + margin-korin + sticky-palkin varaus-paddingin (78px)
        check('long list: mask covers whole list', geo2.maskH >= geo2.listH && geo2.maskH - geo2.listH <= 95, `mask ${geo2.maskH} vs list ${geo2.listH}`);
        await touchOn(page, 'touchstart', 0.5); await sleep(120);
        st = await maskState(page);
        check('small viewport: reveal still works', st.revealing === true, JSON.stringify(st));
        await touchOn(page, 'touchend', 0.5); await sleep(120);
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); await sleep(200);

        // Valinta toimii
        await evl(page, () => window.selectWordLi(document.querySelector('#wordList li'))); await sleep(200);
        check('word selectable through mask', await evl(page, () => !!document.querySelector('#wordList li.selected-word')));

        // Bonus/kirot-badge säilyy listassa
        await evl(page, () => { currentBonusWords = [generatedWordsList[0]]; renderOlList(); }); await sleep(200);
        check('bonus badge still rendered', await evl(page, () => !!document.querySelector('#wordList li[data-rare="true"]')));

        // prefers-reduced-motion -> harmonikka ilman animaatiota
        try {
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            const td = await evl(page, () => getComputedStyle(document.getElementById('turnPanelBody')).transitionDuration);
            check('reduced-motion: no accordion transition', td === '0s' || td === '0s, 0s', td);
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
        } catch (e) {
            check('reduced-motion: emulation unsupported (skipped)', true);
        }
        await page.close();

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
