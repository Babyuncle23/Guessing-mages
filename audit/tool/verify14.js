// audit/tool/verify14.js — динамическая бонусная экономика («финальный спринт»)
// A) getBonusConfig: границы фаз 50%/80% (1/25 → 2/50 → 3/100)
// B) Phase 0: 1 ✨-слово, бейдж +25p, индикатор раунда, хинт (verify4-parity)
// C) Phase 2: 3 ✨-слова, бейдж +100p, хинт и индикатор +100p
// D) Sanakaaos: 3 💀-проклятых слова, 0 бонусов, хинт «ei bonussanoja», +0 бонуса
// E) Sanametamorfoosi: новый список с бонусными словами, каос снят, база 50p
// F) endRound: бонусное слово +125 (фаза 0) и +200 (фаза 2), превью на кнопке
// Запуск: node verify14.js  (сам поднимает server.js на :8478)
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
const forceTheme = (page, id) => evl(page, (i) => {
    document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; });
    document.getElementById(i).value = 1;
}, id);
// Принудительно установить фазу игры (round/total) и перегенерировать список
const setPhaseAndRegen = (page, round, total) => evl(page, (r, t) => {
    currentRound = r; totalTurns = t;
    switchToWords();
}, round, total);
const listStats = (page) => evl(page, () => ({
    total: document.querySelectorAll('#wordList li').length,
    rare: document.querySelectorAll('#wordList li[data-rare="true"]').length,
    notRare: document.querySelectorAll('#wordList li[data-rare="false"]').length,
    cursed: document.querySelectorAll('#wordList li[data-cursed="true"]').length,
    badge: (document.querySelector('#wordList .gold-bonus-badge') || {}).textContent || '',
    hint: (document.getElementById('bonusHint') || {}).textContent || '',
    roundLabel: (document.getElementById('roundDisplay') || {}).textContent || '',
    bonusArr: (typeof currentBonusWords !== 'undefined') ? [...currentBonusWords] : null,
    cursedArr: (typeof currentCursedWords !== 'undefined') ? [...currentCursedWords] : null,
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

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] });
    try {
        // ============ A. getBonusConfig: границы фаз ============
        console.log('== A. Phase boundaries ==');
        let page = await newPage(browser);
        const phases = await evl(page, () => {
            const at = (r, t) => { currentRound = r; totalTurns = t; return { ...getBonusConfig() }; };
            return {
                p0_lo: at(1, 10),   // 0.1
                p0_edge: at(5, 10), // 0.5 ровно → фаза 0
                p1_lo: at(6, 10),  // 0.6
                p1_edge: at(8, 10),// 0.8 ровно → фаза 1
                p2_hi: at(9, 10),  // 0.9
                p2_last: at(10, 10),
                demo1: at(1, 2),   // 0.5 → фаза 0
                demo2: at(2, 2),   // 1.0 → фаза 2
            };
        });
        check('p<=0.5 -> 1 слово +25', phases.p0_lo.count === 1 && phases.p0_lo.value === 25, JSON.stringify(phases.p0_lo));
        check('p=0.5 -> всё ещё фаза 0', phases.p0_edge.count === 1 && phases.p0_edge.value === 25, JSON.stringify(phases.p0_edge));
        check('0.5<p<=0.8 -> 2 слова +50', phases.p1_lo.count === 2 && phases.p1_lo.value === 50, JSON.stringify(phases.p1_lo));
        check('p=0.8 -> всё ещё фаза 1', phases.p1_edge.count === 2 && phases.p1_edge.value === 50, JSON.stringify(phases.p1_edge));
        check('p>0.8 -> 3 слова +100', phases.p2_hi.count === 3 && phases.p2_hi.value === 100, JSON.stringify(phases.p2_hi));
        check('последний раунд -> фаза 2', phases.p2_last.count === 3 && phases.p2_last.value === 100);
        check('демо 2 раунда: r1 -> фаза 0, r2 -> фаза 2', phases.demo1.count === 1 && phases.demo2.count === 3);

        // ============ B. Phase 0 UI ============
        console.log('== B. Phase 0 (early game) ==');
        await forceTheme(page, 'theme-weight-pantomiimi');
        await evl(page, () => { document.getElementById('roundSelect').value = '10'; setPlayerMode(2); });
        await tap(page, '#startGameBtn'); await sleep(400);
        await tap(page, '#btn'); await sleep(3400);
        await tap(page, '#btnDisplayWords'); await sleep(500);

        let st = await listStats(page);
        check('5 слов в списке', st.total === 5, st.total);
        check('ровно 1 ✨-слово (фаза 0)', st.rare === 1, st.rare);
        check('минимум 1 небонусное слово', st.notRare >= 1, st.notRare);
        check('бейдж +25p', st.badge.includes('+25p'), st.badge);
        check('хинт: koko sanakirjasta + +25p (verify4-parity)', /koko sanakirjasta/.test(st.hint) && /\+25p/.test(st.hint), st.hint);
        check('индикатор раунда · ✨+25p', st.roundLabel.includes('· ✨+25p'), st.roundLabel);
        check('currentBonusWords ⊆ списка', await evl(page, () =>
            currentBonusWords.length === 1 && currentBonusWords.every(w =>
                [...document.querySelectorAll('#wordList li')].some(li => li.textContent.includes(w)))),
            JSON.stringify(st.bonusArr));

        // ============ C. Phase 2 UI ============
        console.log('== C. Phase 2 (final stretch) ==');
        await setPhaseAndRegen(page, 9, 10); await sleep(400);
        st = await listStats(page);
        check('3 ✨-слова (фаза 2)', st.rare === 3, st.rare);
        check('≥1 лёгкое слово остаётся', st.notRare >= 1, st.notRare);
        check('бейдж +100p', st.badge.includes('+100p'), st.badge);
        check('хинт +100p', /\+100p/.test(st.hint), st.hint);
        check('индикатор раунда · ✨+100p', st.roundLabel.includes('· ✨+100p'), st.roundLabel);

        // Phase 1 для полноты
        await setPhaseAndRegen(page, 6, 10); await sleep(400);
        st = await listStats(page);
        check('фаза 1: 2 ✨-слова +50p', st.rare === 2 && st.badge.includes('+50p'), `${st.rare}/${st.badge}`);

        // ============ D. Sanakaaos: проклятые слова без бонуса ============
        console.log('== D. Sanakaaos ==');
        await evl(page, () => { activeModifiers.chaosFourWords = true; switchToWords(); });
        await sleep(400);
        st = await listStats(page);
        check('3 💀-проклятых слова', st.cursed === 3, st.cursed);
        check('0 ✨-бонусных слов при каосе', st.rare === 0 && st.bonusArr.length === 0, `${st.rare}/${JSON.stringify(st.bonusArr)}`);
        check('хинт «ei bonussanoja»', /ei bonussanoja/.test(st.hint), st.hint);
        // Проклятое слово угадано → только базовые 100, без бонуса
        const curIdxD = await evl(page, () => currentPlayerIndex);
        const sBeforeD = await evl(page, () => gamePlayers[currentPlayerIndex].score);
        await evl(page, () => document.querySelector('#wordList li[data-cursed="true"]').click()); await sleep(250);
        await tap(page, '#btnGuessed'); await sleep(500);
        const sAfterD = await evl(page, (i) => gamePlayers[i].score, curIdxD);
        check('проклятое слово: +100 без бонуса', sAfterD - sBeforeD === 100, `${sBeforeD}→${sAfterD}`);

        // ============ E. Sanametamorfoosi: бонусные слова сохраняются ============
        console.log('== E. Sanametamorfoosi ==');
        page = await newPage(browser);
        await forceTheme(page, 'theme-weight-elokuva');
        await evl(page, () => { document.getElementById('roundSelect').value = '7'; setPlayerMode(2); });
        await tap(page, '#magicToggle'); await sleep(300);
        await tap(page, '.char-card[data-char="Muodonmuuttaja"]'); await sleep(100);
        await tap(page, '.char-card[data-char="Kirouksenlangettaja"]'); await sleep(200);
        await tap(page, '#startGameBtn'); await sleep(400);
        await tap(page, '#btn'); await sleep(3400);
        await tap(page, '#btnDisplayWords'); await sleep(500);

        // P1 = Muodonmuuttaja: накладываем на него каос и проверяем, что метаморфоза очищает
        await evl(page, () => { activeModifiers.chaosFourWords = true; switchToWords(); });
        await sleep(300);
        st = await listStats(page);
        check('до морфа: каос активен (0 бонусов)', st.rare === 0 && st.cursed === 3, `${st.rare}/${st.cursed}`);

        const morph = await evl(page, () => ({
            visible: document.getElementById('spellBtn1').style.display !== 'none',
            txt: document.getElementById('spellBtn1').textContent
        }));
        check('кнопка метаморфозы видна', morph.visible && /SANAMETAMORFOOSI/i.test(morph.txt), morph.txt);
        await tap(page, '#spellBtn1'); await sleep(400);

        st = await listStats(page);
        check('после морфа: бонусные слова вернулись (фаза 0 → 1)', st.rare === 1, st.rare);
        check('после морфа: проклятых слов нет', st.cursed === 0, st.cursed);
        check('флаг каоса снят метаморфозой', await evl(page, () => activeModifiers.chaosFourWords === false));
        check('isMetamorphosisUsedThisTurn = true', await evl(page, () => isMetamorphosisUsedThisTurn === true));

        // Кнопка угадывания: база 50p; зажимаем бонусное слово → превью 50+25=75
        await evl(page, () => { selectedWordIndex = -1; updateGuessedButtonsText(); });
        const btnTxt50 = await evl(page, () => document.getElementById('btnGuessed').textContent);
        check('кнопка после морфа: +50p база', btnTxt50.includes('+50p'), btnTxt50);
        await evl(page, () => document.querySelector('#wordList li[data-rare="true"]').click()); await sleep(250);
        const btnTxtBonus = await evl(page, () => document.getElementById('btnGuessed').textContent);
        check('превью выплаты с бонусом: +75p (50+25)', btnTxtBonus.includes('+75p'), btnTxtBonus);

        // ============ F. endRound: выплаты по фазам ============
        console.log('== F. Scoring ==');
        const p1Before = await evl(page, () => gamePlayers[0].score);
        await tap(page, '#btnGuessed'); await sleep(500);
        const p1After = await evl(page, () => gamePlayers[0].score);
        check('морф + бонусное слово фазы 0: 50+25=75', p1After - p1Before === 75, `${p1Before}→${p1After}`);

        // Новый ход, принудительно фаза 2: бонусное слово → 100+100=200
        page = await newPage(browser);
        await forceTheme(page, 'theme-weight-pantomiimi');
        await evl(page, () => { document.getElementById('roundSelect').value = '10'; setPlayerMode(2); });
        await tap(page, '#startGameBtn'); await sleep(400);
        await tap(page, '#btn'); await sleep(3400);
        await tap(page, '#btnDisplayWords'); await sleep(400);
        await setPhaseAndRegen(page, 9, 10); await sleep(300);
        const sBefore = await evl(page, () => gamePlayers[0].score);
        await evl(page, () => document.querySelector('#wordList li[data-rare="true"]').click()); await sleep(250);
        const btnTxt200 = await evl(page, () => document.getElementById('btnGuessed').textContent);
        check('фаза 2: превью +200p на кнопке', btnTxt200.includes('+200p'), btnTxt200);
        await tap(page, '#btnGuessed'); await sleep(500);
        const sAfter = await evl(page, () => gamePlayers[0].score);
        check('фаза 2: бонусное слово = +200 (100+100)', sAfter - sBefore === 200, `${sBefore}→${sAfter}`);

        // Небонусное слово → только база 100
        await evl(page, () => { switchToWords(); }); await sleep(300);
        const sBefore2 = await evl(page, () => gamePlayers[currentPlayerIndex].score);
        const curIdx = await evl(page, () => currentPlayerIndex);
        await evl(page, () => document.querySelector('#wordList li[data-rare="false"]').click()); await sleep(250);
        await tap(page, '#btnGuessed'); await sleep(500);
        const sAfter2 = await evl(page, (i) => gamePlayers[i].score, curIdx);
        check('небонусное слово = +100 без бонуса', sAfter2 - sBefore2 === 100, `${sBefore2}→${sAfter2}`);

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
