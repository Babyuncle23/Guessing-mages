// audit/tool/verify18.js — «Kasvavat bonussanat»-kytkin (bonus-scaling toggle)
// A) Oletus: kytkin settingsTabissa, päällä, bonusScalingEnabled=true, skaala toimii
// B) Persistenssi: OFF → localStorage → reload → OFF + sääntötekstit vaihtuneet
// C) OFF-peli: vaihe 2 → 1 ✨-sana, +25p-badgi, payout +125 (kuten ennen)
// D) ON-regressio: vaihe 2 → 3 ✨-sanaa, +100p-badgi, payout +200
// E) Kytkin kesken pelin EI vaikuta (lukittu pelin alussa) → uusi peli ottaa uuden arvon
// F) Huone: isännän OFF synkkaa vieraalle + cfg.bonusScaling → bonusScalingEnabled=false
// G) Sanakaaos OFF-tilassa: 3 💀, 0 ✨ — uusi counter-play säilyy
// Запуск: node verify18.js  (сам поднимает server.js на :8487)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8487;
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
const setPhaseAndRegen = (page, round, total) => evl(page, (r, t) => {
    currentRound = r; totalTurns = t;
    switchToWords();
}, round, total);
const listStats = (page) => evl(page, () => ({
    total: document.querySelectorAll('#wordList li').length,
    rare: document.querySelectorAll('#wordList li[data-rare="true"]').length,
    cursed: document.querySelectorAll('#wordList li[data-cursed="true"]').length,
    badge: (document.querySelector('#wordList .gold-bonus-badge') || {}).textContent || '',
    bonusArr: (typeof currentBonusWords !== 'undefined') ? [...currentBonusWords] : null,
}));
const waitFor = async (p, fn, timeout = 12000, poll = 100) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        const v = await p.evaluate(fn);
        if (v) return v;
        await sleep(poll);
    }
    return null;
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

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] });
    try {
        // ============ A. Oletus: päällä, uusi systeemi ============
        console.log('== A. Defaults ==');
        let page = await newPage(browser);
        await evl(page, () => localStorage.clear());
        page = await newPage(browser); // puhdas lataus ilman tallennuksia
        const def = await evl(page, () => {
            const t = document.getElementById('bonusScalingToggle');
            return {
                exists: !!t,
                inSettings: !!(t && t.closest('#settingsTab')),
                checked: t ? t.checked : null,
                flag: (typeof bonusScalingEnabled !== 'undefined') ? bonusScalingEnabled : null,
                cfgPhase2: (() => { currentRound = 9; totalTurns = 10; return { ...getBonusConfig() }; })(),
            };
        });
        check('toggle exists inside #settingsTab', def.exists && def.inSettings);
        check('default ON', def.checked === true, JSON.stringify(def));
        check('bonusScalingEnabled default true', def.flag === true);
        check('scaling active: phase2 = {3,+100}', def.cfgPhase2.count === 3 && def.cfgPhase2.value === 100, JSON.stringify(def.cfgPhase2));
        const defRules = await evl(page, () => document.getElementById('rulesBonusText').innerHTML);
        check('rules text = scaling variant', defRules.includes('+25p → +50p → +100p'), defRules.slice(0, 90));

        // ============ B. Persistenssi + sääntötekstit ============
        console.log('== B. Persistence ==');
        await tap(page, '#bonusScalingToggle'); await sleep(300);
        const saved = await evl(page, () => JSON.parse(localStorage.getItem('arksanum-settings-v1') || '{}').bonusScaling);
        check('OFF saved to localStorage', saved === false, JSON.stringify(saved));
        const fixedRules = await evl(page, () => ({
            rules: document.getElementById('rulesBonusText').innerHTML,
            guide: document.getElementById('magicGuideBonusText').innerHTML,
        }));
        check('rules text swapped to fixed +25p', fixedRules.rules.includes('Bonussana:') && fixedRules.rules.includes('+25p') && !fixedRules.rules.includes('→'), fixedRules.rules.slice(0, 90));
        check('magicGuide text swapped to fixed +25p', fixedRules.guide.includes('Bonussana (+25p)') && !fixedRules.guide.includes('1–3'), fixedRules.guide.slice(0, 90));
        // reload → OFF palautuu
        await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
        await page.evaluate(() => wordsReady.then(() => window.__w2 = true));
        await page.waitForFunction('window.__w2 === true', { timeout: 20000 });
        await sleep(600);
        const afterReload = await evl(page, () => ({
            checked: document.getElementById('bonusScalingToggle').checked,
            rules: document.getElementById('rulesBonusText').innerHTML,
        }));
        check('OFF persists across reload', afterReload.checked === false);
        check('rules text stays fixed after reload', afterReload.rules.includes('Bonussana:') && !afterReload.rules.includes('→'), afterReload.rules.slice(0, 90));

        // ============ C. OFF-peli: 1 ✨ / +25p / +125 ============
        console.log('== C. Fixed economy game ==');
        await forceTheme(page, 'theme-weight-pantomiimi');
        await evl(page, () => { document.getElementById('roundSelect').value = '10'; setPlayerMode(2); });
        await tap(page, '#startGameBtn'); await sleep(400);
        check('flag captured OFF at game start', await evl(page, () => bonusScalingEnabled === false));
        await tap(page, '#btn'); await sleep(3400);
        await tap(page, '#btnDisplayWords'); await sleep(400);
        // Форсируем финальную фазу — конфиг всё равно {1,25}
        const cfgOff = await evl(page, () => { currentRound = 9; totalTurns = 10; return { ...getBonusConfig() }; });
        check('OFF: phase2 still {1,+25}', cfgOff.count === 1 && cfgOff.value === 25, JSON.stringify(cfgOff));
        await setPhaseAndRegen(page, 9, 10); await sleep(300);
        let st = await listStats(page);
        check('OFF: exactly 1 ✨-word at phase 2', st.rare === 1 && st.total === 5, `${st.rare}/${st.total}`);
        check('OFF: badge shows +25p', st.badge.includes('+25p') && !st.badge.includes('+100p'), st.badge);
        const sBefore = await evl(page, () => gamePlayers[currentPlayerIndex].score);
        const curIdxC = await evl(page, () => currentPlayerIndex);
        await evl(page, () => window.selectWordLi(document.querySelector('#wordList li[data-rare="true"]'))); await sleep(250);
        await tap(page, '#btnGuessed'); await sleep(500);
        const sAfter = await evl(page, (i) => gamePlayers[i].score, curIdxC);
        check('OFF: bonus word pays +125 (100+25)', sAfter - sBefore === 125, `${sBefore}→${sAfter}`);

        // ============ G. Sanakaaos OFF-tilassa: uusi counter-play säilyy ============
        console.log('== G. Sanakaaos under OFF ==');
        await evl(page, () => { activeModifiers.chaosFourWords = true; switchToWords(); });
        await sleep(400);
        st = await listStats(page);
        check('OFF+chaos: 3 💀 cursed, 0 ✨ bonus', st.cursed === 3 && st.rare === 0, `${st.cursed}/${st.rare}`);

        // ============ E. Kytkin kesken pelin ei vaikuta ============
        console.log('== E. Mid-game toggle immunity ==');
        page = await newPage(browser);
        await evl(page, () => localStorage.clear());
        page = await newPage(browser);
        await forceTheme(page, 'theme-weight-pantomiimi');
        await evl(page, () => { document.getElementById('roundSelect').value = '10'; setPlayerMode(2); });
        await tap(page, '#startGameBtn'); await sleep(400);
        check('game started ON', await evl(page, () => bonusScalingEnabled === true));
        // Säädä kytkin pois kesken peliä — flag pysyy (seuraavaan peliin asti)
        await tap(page, '#bonusScalingToggle'); await sleep(200);
        await setPhaseAndRegen(page, 9, 10); await sleep(300);
        st = await listStats(page);
        check('mid-game OFF does NOT affect running game (3 ✨ +100p)', st.rare === 3 && st.badge.includes('+100p'), `${st.rare}/${st.badge}`);
        // Uusi peli ottaa uuden arvon
        await evl(page, () => resetCurrentGame()); await sleep(200);
        check('flag re-read on new game → false', await evl(page, () => bonusScalingEnabled === false));
        await setPhaseAndRegen(page, 9, 10); await sleep(300);
        st = await listStats(page);
        check('new game uses OFF: 1 ✨ +25p', st.rare === 1 && st.badge.includes('+25p'), `${st.rare}/${st.badge}`);
        await tap(page, '#bonusScalingToggle'); await sleep(200); // takaisin ON siistiksi

        // ============ D. ON-regressio: 3 ✨ / +100p / +200 ============
        console.log('== D. Scaling regression (ON) ==');
        page = await newPage(browser);
        await evl(page, () => localStorage.clear());
        page = await newPage(browser);
        await forceTheme(page, 'theme-weight-pantomiimi');
        await evl(page, () => { document.getElementById('roundSelect').value = '10'; setPlayerMode(2); });
        await tap(page, '#startGameBtn'); await sleep(400);
        await tap(page, '#btn'); await sleep(3400);
        await tap(page, '#btnDisplayWords'); await sleep(400);
        await setPhaseAndRegen(page, 9, 10); await sleep(300);
        st = await listStats(page);
        check('ON: 3 ✨-words at phase 2', st.rare === 3, st.rare);
        check('ON: badge +100p', st.badge.includes('+100p'), st.badge);
        const sB2 = await evl(page, () => gamePlayers[currentPlayerIndex].score);
        const curIdxD = await evl(page, () => currentPlayerIndex);
        await evl(page, () => window.selectWordLi(document.querySelector('#wordList li[data-rare="true"]'))); await sleep(250);
        await tap(page, '#btnGuessed'); await sleep(500);
        const sA2 = await evl(page, (i) => gamePlayers[i].score, curIdxD);
        check('ON: bonus word pays +200 (100+100)', sA2 - sB2 === 200, `${sB2}→${sA2}`);

        // ============ F. Huonesynkka: isännän OFF → vieras ============
        console.log('== F. Room sync ==');
        const host = await newPage(browser);
        await evl(host, () => localStorage.clear());
        await host.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
        await host.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 15000 });
        await host.evaluate(() => wordsReady.then(() => window.__w = true));
        await host.waitForFunction('window.__w === true', { timeout: 20000 });
        await sleep(400);
        await tap(host, '#bonusScalingToggle'); await sleep(300); // host OFF

        const roomCode = await evl(host, () => new Promise(res => {
            const t = setTimeout(() => res('timeout'), 15000);
            Net.on('ROOM_CREATED', m => { clearTimeout(t); res(m.roomCode); });
            document.getElementById('netModeRoom').click();
            setTimeout(() => {
                document.getElementById('roomNameInput').value = 'HostV18';
                document.getElementById('btnCreateRoom').click();
            }, 300);
        }));
        check('room created', /^[A-Z]{4}$/.test(roomCode), roomCode);

        // Vieras: tyhjä localStorage (sama origin jakaa storen!) → OFF tulee
        // vain palvelimen kautta, ei tallennetuista asetuksista.
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
            else { document.getElementById('roomNameInput').value = 'GuestV18'; document.getElementById('btnJoinRoom').click(); }
        }));
        check('guest joined', joined === true);

        const gSync = await waitFor(guest, () => ({
            checked: document.getElementById('bonusScalingToggle')?.checked,
            locked: document.body.classList.contains('room-settings-locked'),
        }), 8000, 200);
        // Odotetaan kunnes checked=false saapuu
        let gChecked = gSync && gSync.checked;
        for (let i = 0; i < 25 && gChecked !== false; i++) {
            await sleep(300);
            gChecked = await evl(guest, () => document.getElementById('bonusScalingToggle')?.checked);
        }
        check('guest sees host OFF setting', gChecked === false, JSON.stringify(gChecked));
        check('guest settings locked', await evl(guest, () => document.body.classList.contains('room-settings-locked')));
        const gRules = await evl(guest, () => document.getElementById('rulesBonusText').innerHTML);
        check('guest rules text swapped too', gRules.includes('Bonussana:') && !gRules.includes('→'), gRules.slice(0, 90));

        // Live-broadcast: host ON → guest ON → host OFF → guest OFF
        await tap(host, '#bonusScalingToggle');
        await waitFor(guest, () => document.getElementById('bonusScalingToggle')?.checked === true, 6000, 150);
        check('guest follows host ON via SETTINGS broadcast', await evl(guest, () => document.getElementById('bonusScalingToggle').checked === true));
        await tap(host, '#bonusScalingToggle');
        await waitFor(guest, () => document.getElementById('bonusScalingToggle')?.checked === false, 6000, 150);
        check('guest follows host OFF via SETTINGS broadcast', await evl(guest, () => document.getElementById('bonusScalingToggle').checked === false));

        // START_GAME: cfg.bonusScaling → flag vieraalla
        await evl(host, () => { document.getElementById('roundSelect').value = '2'; });
        await sleep(200);
        await evl(host, () => document.getElementById('btnStartRoomGame').click());
        const started = await Promise.all([
            waitFor(host, () => window.isRoomGame && window.isRoomGame(), 8000),
            waitFor(guest, () => window.isRoomGame && window.isRoomGame(), 8000),
        ]);
        check('room game started both sides', started[0] === true && started[1] === true);
        check('guest flag=false from cfg', await evl(guest, () => bonusScalingEnabled === false));
        check('host flag=false from cfg', await evl(host, () => bonusScalingEnabled === false));
        await host.close();
        await guest.close();

        // ============ Errors ============
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
