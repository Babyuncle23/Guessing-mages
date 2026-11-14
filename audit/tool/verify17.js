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
    const ev = new TouchEvent(t, { changedTouches: [touch], touches: t === 'touchend' || t === 'touchcancel' ? [] : [touch], bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
}, type, fracY);
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
const dragSelect = async (page, i) => {
    const c = await rowCenter(page, i);
    await touchAt(page, 'touchstart', c.x, c.y); await sleep(80);
    await touchAt(page, 'touchend', c.x, c.y); await sleep(140);
    return c;
};
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
        check('hint teaches release-gesture', await evl(page, () => /vapauta|valitse/i.test(document.getElementById('wordMaskHint').textContent)));

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
            mask: getComputedStyle(document.getElementById('wordMask')).display,
            maskOpacity: getComputedStyle(document.getElementById('wordMask')).opacity
        }));
        check('touchstart: revealing instantly', mst.revealing === true, JSON.stringify(mst));
        check('touch: mask fully transparent', mst.mask === 'block' && parseFloat(mst.maskOpacity) === 0, JSON.stringify(mst));
        await touchOn(page, 'touchcancel', 0.5); await sleep(120); // cancel = ei valintaa
        check('touchcancel armed nothing', await evl(page, () => !document.querySelector('#wordList li.selected-word')));
        mst = await evl(page, () => ({
            revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
            mask: getComputedStyle(document.getElementById('wordMask')).display
        }));
        check('touch end: fog back', mst.revealing === false && mst.mask === 'block', JSON.stringify(mst));

        // ============ C. selGlow ============
        console.log('== C. selGlow ==');
        let gs = await glowState(page);
        check('no glow before selection', gs.d === 'none', gs.d);
        await evl(page, () => window.selectWordLi(document.querySelectorAll('#wordList li')[2])); await sleep(250);
        gs = await glowState(page);
        check('glow appears after lock', gs.d === 'block', gs.d);
        check('glow aligned to selected row', gs.selIdx === '2' && Math.abs(gs.top - gs.liTop) < 2 && Math.abs(gs.h - gs.liH) < 2, `top=${gs.top} vs ${gs.liTop}, h=${gs.h} vs ${gs.liH}`);
        // Toisen rivin valinta siirtää hehkun
        await evl(page, () => window.selectWordLi(document.querySelectorAll('#wordList li')[4])); await sleep(250);
        gs = await glowState(page);
        check('glow follows new selection', gs.selIdx === '4' && Math.abs(gs.top - gs.liTop) < 3, `top=${gs.top} vs ${gs.liTop}`);
        // Paljastuksen aikana hehku piilossa (kaikki näkyy joka tapauksessa)
        await touchOn(page, 'touchstart', 0.5); await sleep(100);
        gs = await glowState(page);
        check('glow hidden while revealing', gs.computed === 'none', gs.computed);
        await touchOn(page, 'touchcancel', 0.5); await sleep(120);
        gs = await glowState(page);
        check('glow back after reveal ends', gs.computed === 'block', gs.computed);
        // Teksti EI näy: maskin computed edelleen block -> rivi verhon alla, vain hehku päällä
        mst = await evl(page, () => getComputedStyle(document.getElementById('wordMask')).display);
        check('text stays under fog (mask solid over list)', mst === 'block', mst);
        // Hehku poistuu kun lista tyhjennetään (endRound polku)
        const glowZ = await evl(page, () => getComputedStyle(document.getElementById('selGlow')).zIndex);
        const maskZ = await evl(page, () => getComputedStyle(document.getElementById('wordMask')).zIndex);
        check('glow above mask layer', parseInt(glowZ) > parseInt(maskZ), `${glowZ} vs ${maskZ}`);

        // ============ C2. Vedä sormella = violetti kortti, vapauta = valinta ============
        console.log('== C2. Card-gesture: arm/move/commit ==');
        // Nyt rivi 4 on lukittuna — ele siirtää valinnan riviin 1
        let c0 = await rowCenter(page, 0), c1 = await rowCenter(page, 1);
        await touchAt(page, 'touchstart', c0.x, c0.y); await sleep(120);
        let arm = await evl(page, () => ({
            armed: [...document.querySelectorAll('#wordList li')].findIndex(l => l.classList.contains('check-armed')),
            revealing: document.getElementById('wordListWrap').classList.contains('revealing'),
            armedBorder: (document.querySelector('#wordList li.check-armed') ? getComputedStyle(document.querySelector('#wordList li.check-armed')).borderColor : 'none'),
            armedBefore: getComputedStyle(document.querySelector('#wordList li.check-armed') || document.body, '::before').content
        }));
        check('touchstart arms row under finger', arm.armed === 0, `armed=${arm.armed}`);
        check('armed = violet card (no ✓)', arm.armedBorder === 'rgb(155, 89, 182)' && arm.armedBefore === 'none', JSON.stringify(arm));
        check('revealing while armed', arm.revealing === true);

        // Sormi liikkuu -> violetti kortti hyppää toiselle riville
        await touchAt(page, 'touchmove', c1.x, c1.y); await sleep(100);
        arm = await evl(page, () => [...document.querySelectorAll('#wordList li')].findIndex(l => l.classList.contains('check-armed')));
        check('card style jumps to row under finger', arm === 1, `armed=${arm}`);

        // Vapautus rivillä = sana lukittuu (valinta VASTA irrottaessa)
        await touchAt(page, 'touchend', c1.x, c1.y); await sleep(160);
        let sel = await evl(page, () => ({
            idx: selectedWordIndex,
            armedLeft: document.querySelectorAll('#wordList li.check-armed').length,
            selRow: [...document.querySelectorAll('#wordList li')].findIndex(l => l.classList.contains('selected-word')),
            revealed: document.getElementById('wordListWrap').classList.contains('revealing'),
            maskOpacity: parseFloat(getComputedStyle(document.getElementById('wordMask')).opacity),
            maskDur: getComputedStyle(document.getElementById('wordMask')).transitionDuration
        }));
        check('release commits row under finger', sel.idx === parseInt(c1.idx) && sel.selRow === 1, JSON.stringify(sel));
        check('armed class cleared after release', sel.armedLeft === 0);
        check('fog back after release', sel.revealed === false);
        check('fog fades back over ~1.2s', sel.maskOpacity > 0 && sel.maskOpacity < 0.75 && /1\.2s/.test(sel.maskDur), `op=${sel.maskOpacity} dur=${sel.maskDur}`);

        // Tavalinen tap/click EI valitse (TAP_SELECT_ENABLED=false)
        await evl(page, () => document.querySelectorAll('#wordList li')[0].click()); await sleep(120);
        sel = await evl(page, () => [...document.querySelectorAll('#wordList li')].findIndex(l => l.classList.contains('selected-word')));
        check('plain click does NOT select (tap backup off)', sel === 1, `selRow=${sel}`);

        // Varaus: flag päälle -> vanha click-polku toimii jälleen
        await evl(page, () => { window.TAP_SELECT_ENABLED = true; document.querySelectorAll('#wordList li')[2].click(); }); await sleep(120);
        sel = await evl(page, () => [...document.querySelectorAll('#wordList li')].findIndex(l => l.classList.contains('selected-word')));
        check('backup flag restores tap-select', sel === 2, `selRow=${sel}`);
        await evl(page, () => { window.TAP_SELECT_ENABLED = false; });

        // touch-action:none — veto ei scrollaa listaa, vaan liikuttaa rastia
        check('native scroll disabled during aim (touch-action)', await evl(page, () => getComputedStyle(document.getElementById('wordList')).touchAction === 'none'));

        // Reunavieritys: sormi alareunan reunavyöhykkeessä -> lista vierii,
        // rasti pysyy sormen alla olevan rivin kohdalla, vapautus lukitsee sen
        await evl(page, () => { document.getElementById('wordList').style.flex = '0 0 160px'; });
        await sleep(80);
        const canScroll = await evl(page, () => document.getElementById('wordList').scrollHeight > document.getElementById('wordList').clientHeight + 10);
        if (canScroll) {
            await evl(page, () => { document.getElementById('wordList').scrollTop = 0; });
            const aimY = await evl(page, () => {
                const wl = document.getElementById('wordList').getBoundingClientRect();
                const rc = document.getElementById('roundControls').getBoundingClientRect();
                return Math.min(wl.bottom, rc.top) - 12;
            });
            const wlX = await evl(page, () => document.getElementById('wordList').getBoundingClientRect().x + 60);
            const st0 = await evl(page, () => document.getElementById('wordList').scrollTop); // ~0 ennen elettä
            await touchAt(page, 'touchstart', wlX, aimY); await sleep(80);
            await touchAt(page, 'touchmove', wlX, aimY); await sleep(80);
            await sleep(600); // rAF reunavieritys käy
            const st1 = await evl(page, () => document.getElementById('wordList').scrollTop);
            check('edge auto-scroll moves list', st1 > st0, `${st0} -> ${st1}`);
            const armedIdx = await evl(page, () => document.querySelector('#wordList li.check-armed')?.getAttribute('data-index') ?? null);
            check('edge scroll keeps an armed row', armedIdx !== null);
            await touchAt(page, 'touchend', wlX, aimY); await sleep(140);
            const selAfterEdge = await evl(page, () => selectedWordIndex);
            check('edge-scroll release commits armed row', armedIdx === null || selAfterEdge === parseInt(armedIdx), `armed=${armedIdx} sel=${selAfterEdge}`);

            // Työntöskrolli: sormi ylimmällä näkyvällä rivillä -> veto
            // ylös vierittää listaa sormen tahdissa (helppo scrollaus)
            await evl(page, () => { document.getElementById('wordList').scrollTop = 80; });
            const topRow = await evl(page, () => {
                const wl = document.getElementById('wordList');
                const lr = wl.getBoundingClientRect();
                const first = [...wl.querySelectorAll('li')].find(li => li.getBoundingClientRect().bottom > lr.top + 4);
                const r = first.getBoundingClientRect();
                return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
            });
            await touchAt(page, 'touchstart', topRow.x, topRow.y); await sleep(80);
            const stPush0 = await evl(page, () => document.getElementById('wordList').scrollTop);
            await touchAt(page, 'touchmove', topRow.x, topRow.y - 14); await sleep(60);
            await touchAt(page, 'touchmove', topRow.x, topRow.y - 28); await sleep(60);
            const stPush1 = await evl(page, () => document.getElementById('wordList').scrollTop);
            check('push past top row scrolls list up', stPush1 < stPush0, `${stPush0} -> ${stPush1}`);
            await touchAt(page, 'touchcancel', topRow.x, topRow.y - 28); await sleep(80);
        } else {
            console.log('  (list not scrollable — edge checks skipped)');
        }

        // Palauta lista + valitse rivi uudelleen D-osiota varten
        await evl(page, () => { document.getElementById('wordList').style.flex = ''; });

        // ============ D. veilCoach + hint-dim ============
        console.log('== D. Coach once + hint dim ==');
        const coach = await evl(page, () => ({
            d: document.getElementById('veilCoach').style.display,
            flag: localStorage.getItem('veilCoachV3')
        }));
        check('coach dismissed by earlier gesture', coach.d === 'none' && coach.flag === '1', JSON.stringify(coach));
        check('hint dimmed (veilUsed)', await evl(page, () => document.getElementById('wordMaskHint').classList.contains('hint-dim')));

        // Uusi sivu: localStorage on jaettu origin-tasolla — nollataan flag,
        // jotta "ekaa kertaa" -polku testataan aidosti.
        const p2 = await newPage(browser);
        await evl(p2, () => localStorage.removeItem('veilCoachV3'));
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
            flag: localStorage.getItem('veilCoachV3'),
            hintDim: document.getElementById('wordMaskHint').classList.contains('hint-dim')
        }));
        check('coach dismissed on first gesture', (coach3.d === 'none' || coach3.out === true) && coach3.flag === '1', JSON.stringify(coach3));
        check('hint dimmed after first gesture', coach3.hintDim === true);
        await touchOn(p2, 'touchend', 0.5); await sleep(100);

        // Uusi sivu flagin kanssa -> coach EI näy enää
        await evl(p2, () => localStorage.setItem('veilCoachV3', '1'));
        const p3 = await newPage(browser);
        await evl(p3, () => localStorage.setItem('veilCoachV3', '1'));
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
