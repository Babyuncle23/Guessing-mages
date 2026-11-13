// audit/tool/verify16.js — Task 16: pysähtynyt pyörä jää näkyviin
// A) Selittäjä: pyörä lepää tuloksessaan kunnes "Näytä sanat" painetaan
// B) vapaavalintainen: pyörä jää (ei sanalistaa), harmonikka auki ohjeen vuoksi,
//    endRound (luovutus) siivoaa pyörän
// C) Huone: arvaajan #ngDrum lepää kunnes WORDS_OPEN → teemakortti tilalle
// Запуск: node verify16.js  (сам поднимает server.js на :8479)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8479;
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
    page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push('console.error: ' + m.text()); });
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
const wheelState = (page, loaderId, wheelId, hubId) => evl(page, (l, w, h) => {
    const ld = document.getElementById(l);
    const wh = document.getElementById(w);
    const hub = document.getElementById(h);
    const cap = ld ? ld.querySelector('.drum-caption') : null;
    const wedge = wh ? wh.querySelector('.theme-drum-wedge') : null;
    const winEl = wh ? wh.querySelector('.theme-drum-item.winner') : null;
    const winLab = winEl ? winEl.querySelector('.drum-label') : null;
    const winLabRect = winLab ? winLab.getBoundingClientRect() : null;
    const winTag = winEl ? winEl.querySelector('.drum-tag') : null;
    const winTagRect = winTag ? winTag.getBoundingClientRect() : null;
    const ptr = ld ? ld.querySelector('.theme-drum-pointer') : null;
    const wr = wh ? wh.getBoundingClientRect() : null;
    const pr = ptr ? ptr.getBoundingClientRect() : null;
    const tags = wh ? [...wh.querySelectorAll('.theme-drum-item')].map(el => ({
        theme: el.dataset.theme,
        label: el.querySelector('.drum-label') ? el.querySelector('.drum-label').textContent : null,
        emoji: el.querySelector('.drum-emoji') ? el.querySelector('.drum-emoji').textContent : null
    })) : [];
    return {
        loader: ld ? getComputedStyle(ld).display : 'MISSING',
        rest: ld ? ld.classList.contains('drum-rest') : false,
        landed: wh ? wh.classList.contains('landed') : false,
        hub: hub ? hub.textContent : '',
        hubHidden: hub ? getComputedStyle(hub.closest('.theme-drum-hub')).display === 'none' : false,
        captionHidden: cap ? getComputedStyle(cap).display === 'none' : false,
        wedge: wedge ? getComputedStyle(wedge).opacity : 'none',
        winnerTheme: winEl ? winEl.dataset.theme : null,
        winnerRing: winEl ? getComputedStyle(winEl, '::after').content : 'n/a',
        winnerLabelColor: winLab ? getComputedStyle(winLab).color : null,
        winnerLabelHorizontal: winLabRect ? winLabRect.width > winLabRect.height : null,
        tagClear: winTagRect && pr ? winTagRect.left > pr.right : null,
        tags,
        tagsInside: wh ? [...wh.querySelectorAll('.theme-drum-item')].every(el => {
            const m = (el.style.transform || '').match(/translateY\(-?([\d.]+)px\)/);
            const tag = el.querySelector('.drum-tag');
            if (!m || !tag) return false;
            return parseFloat(m[1]) + tag.offsetWidth / 2 <= wh.clientWidth / 2 - 1;
        }) : null,
        pointerLeft: pr && wr ? (pr.x + pr.width / 2) < (wr.x + wr.width / 2) : null,
        wheelBleeds: wr ? wr.right > document.documentElement.clientWidth : null
    };
}, loaderId, wheelId, hubId);
const panelState = (page) => evl(page, () => ({
    collapsed: document.getElementById('turnPanelBody').classList.contains('collapsed'),
    aria: (document.getElementById('btnInfoToggle') || { getAttribute: () => null }).getAttribute('aria-expanded'),
    infoBtnAriaControls: (document.getElementById('btnInfoToggle') || { getAttribute: () => null }).getAttribute('aria-controls'),
    infoBtnDisplay: (document.getElementById('btnInfoToggle') ? getComputedStyle(document.getElementById('btnInfoToggle')).display : 'MISSING'),
    chipTurnDisplay: getComputedStyle(document.getElementById('chipTurn')).display,
    btnDisplay: getComputedStyle(document.getElementById('btnDisplayWords')).display,
    btnPos: getComputedStyle(document.getElementById('btnDisplayWords')).position,
    ruleVisible: getComputedStyle(document.getElementById('ruleInstruction')).display,
    ruleText: document.getElementById('ruleInstruction').textContent.slice(0, 60),
    roundCtl: getComputedStyle(document.getElementById('roundControls')).display,
    chipThemeDisplay: getComputedStyle(document.getElementById('chipTheme')).display,
    chipRoundVisible: getComputedStyle(document.getElementById('chipRound')).display !== 'none',
    chipRoundNoBorder: getComputedStyle(document.getElementById('chipRound')).borderTopWidth === '0px',
    chipTurnText: document.getElementById('chipTurn').textContent,
    chipScoreEl: !!document.querySelector('#chipTurn .chip-score'),
    chipScoreColor: document.querySelector('#chipTurn .chip-score') ? getComputedStyle(document.querySelector('#chipTurn .chip-score')).color : 'none',
    btnMainDisplay: getComputedStyle(document.getElementById('btn')).display,
    vapaaCardDisplay: (document.getElementById('vapaaRuleCard') ? getComputedStyle(document.getElementById('vapaaRuleCard')).display : 'MISSING'),
    vapaaCardText: (document.getElementById('vapaaRuleCard') ? document.getElementById('vapaaRuleCard').textContent.slice(0, 60) : ''),
    themeBlockDisplay: getComputedStyle(document.getElementById('themeBlock')).display,
    scoreMarker: /▶/.test(document.getElementById('scoreDisplay').textContent),
    sparkleGone: !document.getElementById('roundDisplay') && !document.getElementById('bonusHint') && !document.querySelector('.gold-bonus-badge')
}));

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
        // ============ A. Pyörä lepää kunnes Näytä sanat ============
        console.log('== A. Wheel rests until Näytä sanat (local) ==');
        let page = await newPage(browser);
        await forceTheme(page, 'theme-weight-pantomiimi');
        await tap(page, '#startGameBtn'); await sleep(400);
        await tap(page, '#btn'); await sleep(500); // kesken pyörityksen
        const mid = await evl(page, () => ({
            btn: getComputedStyle(document.getElementById('btn')).display,
            loader: getComputedStyle(document.getElementById('loader')).display,
            btnText: document.getElementById('btn').textContent
        }));
        check('no Aloita kierros while spinning', mid.btn === 'none' && mid.loader === 'block', JSON.stringify(mid));
        await sleep(3400); // anna pyörän laskeutua

        let ws = await wheelState(page, 'loader', 'drumWheel', 'drumHubName');
        check('wheel stays visible after landing', ws.loader === 'block', ws.loader);
        check('wheel has .landed', ws.landed === true);
        check('loader has .drum-rest', ws.rest === true);
        check('wheel bleeds off right edge', ws.wheelBleeds === true);
        check('hub hidden (no center text)', ws.hubHidden === true);
        check('caption hidden (no duplicate text)', ws.captionHidden === true);
        check('hub textContent still tracks theme', ws.hub === 'pantomiimi', ws.hub);
        check('winner wedge shown', ws.wedge === '1', ws.wedge);
        check('winner item = rolled theme', ws.winnerTheme === 'pantomiimi', String(ws.winnerTheme));
        check('every sector has emoji+label', ws.tags.length > 0 && ws.tags.every(t => t.label === t.theme && t.emoji && t.emoji.length > 0), JSON.stringify(ws.tags));
        check('no winner ring (::after none)', ws.winnerRing === 'none', ws.winnerRing);
        check('winner label golden', ws.winnerLabelColor === 'rgb(229, 193, 88)', String(ws.winnerLabelColor));
        check('winner label horizontal under pointer', ws.winnerLabelHorizontal === true);
        check('winner tag not under pointer', ws.tagClear === true);
        check('all sector tags inside wheel rim', ws.tagsInside === true);
        check('pointer at wheel left edge', ws.pointerLeft === true);

        let ps = await panelState(page);
        check('info accordion collapsed by default (❓)', ps.collapsed === true && ps.aria === 'false', JSON.stringify(ps));
        check('❓ controls turnPanelBody', ps.infoBtnAriaControls === 'turnPanelBody');
        check('Näytä sanat CTA visible while wheel rests', ps.btnDisplay !== 'none', ps.btnDisplay);
        check('Näytä sanat sticky at bottom', ps.btnPos === 'fixed', ps.btnPos);
        check('chip visible', await evl(page, () => document.getElementById('turnChip').getBoundingClientRect().height > 0));
        check('chip theme hidden during rest (only on wheel)', ps.chipThemeDisplay === 'none', ps.chipThemeDisplay);
        check('chip keeps round badge + compact score right', ps.chipRoundVisible === true && /▶/.test(ps.chipTurnText), JSON.stringify(ps));
        check('compact score format "Nimi: Np"', /▶ .+: \d+p · .+: \d+p/.test(ps.chipTurnText), ps.chipTurnText);
        check('chip-score element + gold', ps.chipScoreEl === true && ps.chipScoreColor === 'rgb(229, 193, 88)', ps.chipScoreColor);
        check('no Aloita kierros during wheel rest', ps.btnMainDisplay === 'none', ps.btnMainDisplay);
        check('vapaa card hidden for normal theme', ps.vapaaCardDisplay === 'none', ps.vapaaCardDisplay);
        check('chipRound plain text (no pill border)', ps.chipRoundNoBorder === true);
        check('no ❓ on wheel screen (score is out)', ps.infoBtnDisplay === 'none', ps.infoBtnDisplay);
        check('all ✨-bonus UI removed', ps.sparkleGone === true);

        await tap(page, '#btnDisplayWords'); await sleep(600);
        ws = await wheelState(page, 'loader', 'drumWheel', 'drumHubName');
        check('wheel gone after Näytä sanat', ws.loader === 'none', ws.loader);
        check('drum-rest cleared', ws.rest === false);
        check('words visible', await evl(page, () => document.getElementById('wordList').children.length > 0 && getComputedStyle(document.getElementById('wordList')).display !== 'none'));
        ps = await panelState(page);
        check('panel still collapsed after words open', ps.collapsed === true && ps.aria === 'false');
        check('❓ appears during words (accordion available)', ps.infoBtnDisplay !== 'none', ps.infoBtnDisplay);
        check('compact score hidden during words (in ❓)', ps.chipTurnDisplay === 'none', ps.chipTurnDisplay);
        // ❓-гармошка: тап раскрывает счёт и объяснения
        await tap(page, '#btnInfoToggle'); await sleep(350);
        ps = await panelState(page);
        check('❓ opens info accordion', ps.collapsed === false && ps.aria === 'true', JSON.stringify(ps));
        check('scoreboard has ▶ turn marker', ps.scoreMarker === true);
        await tap(page, '#btnInfoToggle'); await sleep(350);
        ps = await panelState(page);
        check('❓ closes info accordion', ps.collapsed === true && ps.aria === 'false');
        check('btnDisplayWords gone', ps.btnDisplay === 'none');
        check('chip theme back after wheel gone', ps.chipThemeDisplay !== 'none', ps.chipThemeDisplay);
        check('themeBlock hidden during words (theme in chip only)', ps.themeBlockDisplay === 'none', ps.themeBlockDisplay);
        await page.close();

        // ============ B. vapaavalintainen ============
        console.log('== B. vapaavalintainen: wheel stays, panel open, giveup clears ==');
        page = await newPage(browser);
        await startGameAndRoll(page, 'theme-weight-vapaavalintainen');

        ws = await wheelState(page, 'loader', 'drumWheel', 'drumHubName');
        check('wheel stays for vapaavalintainen', ws.loader === 'block' && ws.rest === true, JSON.stringify(ws));
        check('hub textContent = vapaavalintainen', ws.hub === 'vapaavalintainen', ws.hub);
        check('winner = vapaavalintainen', ws.winnerTheme === 'vapaavalintainen', String(ws.winnerTheme));
        ps = await panelState(page);
        check('panel collapsed for vapaavalintainen (❓ always closed)', ps.collapsed === true && ps.aria === 'false', JSON.stringify(ps));
        check('themeBlock hidden while wheel rests (no ehto dup)', ps.themeBlockDisplay === 'none', ps.themeBlockDisplay);
        check('chip theme hidden for vapaavalintainen', ps.chipThemeDisplay === 'none', ps.chipThemeDisplay);
        check('instruction populated behind ❓', /Keksi/i.test(ps.ruleText), ps.ruleText);
        check('vapaa rule card visible under wheel', ps.vapaaCardDisplay !== 'none' && /Keksi/i.test(ps.vapaaCardText), JSON.stringify({ d: ps.vapaaCardDisplay, t: ps.vapaaCardText }));
        check('vapaa card below wheel, above controls', await evl(page, () => {
            const card = document.getElementById('vapaaRuleCard').getBoundingClientRect();
            const wheel = document.getElementById('loader').getBoundingClientRect();
            const ctl = document.getElementById('roundControls').getBoundingClientRect();
            return card.top >= wheel.bottom - 4 && card.bottom <= ctl.top + 4;
        }));
        check('no Näytä sanat button', ps.btnDisplay === 'none', ps.btnDisplay);
        check('no Aloita kierros (vapaa)', ps.btnMainDisplay === 'none', ps.btnMainDisplay);
        check('round controls visible', ps.roundCtl !== 'none', ps.roundCtl);

        await evl(page, () => window._devConfirmGiveUp()); await sleep(800);
        ws = await wheelState(page, 'loader', 'drumWheel', 'drumHubName');
        check('wheel cleared after give up', ws.loader === 'none', ws.loader);
        check('drum-rest cleared after giveup', ws.rest === false);
        check('vapaa card cleared after giveup', await evl(page, () => getComputedStyle(document.getElementById('vapaaRuleCard')).display === 'none'));
        check('next-round button back', await evl(page, () => document.getElementById('btn').style.display === 'block'));
        await page.close();

        // ============ C. Huone: arvaajan rumpu peilaa ============
        console.log('== C. Room: guest drum mirrors until WORDS_OPEN ==');
        const A = await newPage(browser);
        await tap(A, '#netModeRoom'); await sleep(800);
        await fill(A, '#roomNameInput', 'Isanta');
        await tap(A, '#btnCreateRoom'); await sleep(1000);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        check('room created', /^[A-Z]{4}$/.test(code), code);

        const B = await newPage(browser);
        await tap(B, '#netModeRoom'); await sleep(600);
        await fill(B, '#roomNameInput', 'Vieras');
        await fill(B, '#roomCodeInput', code);
        await tap(B, '#btnJoinRoom'); await sleep(1000);
        const C = await newPage(browser);
        await tap(C, '#netModeRoom'); await sleep(600);
        await fill(C, '#roomNameInput', 'Vieras3');
        await fill(C, '#roomCodeInput', code);
        await tap(C, '#btnJoinRoom'); await sleep(1000);
        check('guests joined (3 players)', await evl(A, () => document.querySelectorAll('#roomPlayerList .room-player-row').length) === 3);

        await A.evaluate(() => {
            document.querySelector('.mode-option[data-mode="3"]').click();
            document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; x.dispatchEvent(new Event('input', { bubbles: true })); });
            const el = document.getElementById('theme-weight-pantomiimi');
            el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(400);
        await tap(A, '#btnStartRoomGame'); await sleep(1200);
        check('A is explainer', await evl(A, () => window.netIsMyTurn() === true));
        check('B is guesser', await evl(B, () => window.netIsMyTurn() === false));

        await tap(A, '#btn'); await sleep(3800); // spin 1950 + settle + relay
        // rAF taukoaa taustavälilehdillä — tuo sivu eteen jotta laskutus valmistuu
        await A.bringToFront();
        await A.waitForFunction(() => document.getElementById('drumWheel').classList.contains('landed'), { timeout: 8000 }).catch(() => {});
        ws = await wheelState(A, 'loader', 'drumWheel', 'drumHubName');
        check('A: wheel rests', ws.loader === 'block' && ws.rest === true && ws.landed === true, JSON.stringify(ws));

        await B.bringToFront(); await sleep(300);
        await B.waitForFunction(() => document.getElementById('ngDrumWheel').classList.contains('landed'), { timeout: 8000 }).catch(() => {});
        const gs = await wheelState(B, 'ngDrum', 'ngDrumWheel', 'ngDrumHubName');
        check('B: guest drum visible + rested', gs.loader === 'block' && gs.rest === true, JSON.stringify(gs));
        check('B: guest wheel landed', gs.landed === true);
        check('B: guest hub tracks theme', gs.hub === 'pantomiimi', gs.hub);
        check('B: guest caption hidden', gs.captionHidden === true);
        check('B: guest winner wedge', gs.wedge === '1', gs.wedge);
        check('B: guest winner = pantomiimi', gs.winnerTheme === 'pantomiimi', String(gs.winnerTheme));
        check('B: guest sectors labeled', gs.tags.length > 0 && gs.tags.every(t => t.label === t.theme && t.emoji), JSON.stringify(gs.tags));
        check('B: guest sector tags inside wheel rim', gs.tagsInside === true);
        check('B: guest no winner ring', gs.winnerRing === 'none', gs.winnerRing);
        check('B: guest pointer at left edge', gs.pointerLeft === true);
        check('B: theme card hidden while drum rests', await evl(B, () => getComputedStyle(document.getElementById('ngThemeBlock')).display === 'none'));

        await tap(A, '#btnDisplayWords'); await sleep(1200);
        const gs2 = await wheelState(B, 'ngDrum', 'ngDrumWheel', 'ngDrumHubName');
        check('B: drum gone at WORDS_OPEN', gs2.loader === 'none', gs2.loader);
        check('B: theme card appears at WORDS_OPEN', await evl(B, () => getComputedStyle(document.getElementById('ngThemeBlock')).display === 'block'));
        check('B: theme card shows PANTOMIIMI', await evl(B, () => /PANTOMIIMI/.test(document.getElementById('ngTheme').textContent)));
        await A.close(); await B.close(); await C.close();

        // ============ Raportti ============
        const errs = errors.filter(e => !/favicon/.test(e));
        check('no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
    } finally {
        await browser.close();
        srv.kill();
    }
    console.log(`\n=== verify16: ${pass} passed, ${fail} failed ===`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
