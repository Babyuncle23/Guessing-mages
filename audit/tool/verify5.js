// verify5.js — сьют опционального таймера: настройка, тик, таймаут, room-синк
// Запуск: node verify5.js  (сам поднимает server.js на :8080)
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080';
let pass = 0, fail = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const check = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser, url) {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 900 });
    page.on('dialog', d => d.accept().catch(() => {}));
    page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
    await page.goto(url || BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
const evl = (page, fn, ...a) => page.evaluate(fn, ...a);
const roll = async (page) => { await tap(page, '#btn'); await sleep(3400); };
// setTimerSeconds + change-tapahtuma timerInputiin (tallennus + broadcast kuuntelijat)
const setTimer = (page, secs) => page.evaluate((s) => {
    window.setTimerSeconds(s);
    document.getElementById('timerInput').dispatchEvent(new Event('change', { bubbles: true }));
}, secs);

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), stdio: 'pipe' });
    {
        const t0 = Date.now(); let up = false;
        while (Date.now() - t0 < 10000 && !up) {
            try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
            if (!up) await sleep(250);
        }
        if (!up) throw new Error('server.js did not start within 10s');
    }
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 30000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

    try {
        // ============ A. Solo: гибкий контрол + «нет таймера» ============
        console.log('== A. Solo: controls + Ei ajastinta ==');
        let p = await newPage(browser);
        check('range+number controls exist', await evl(p, () => !!document.getElementById('timerRange') && !!document.getElementById('timerInput')));
        check('range bounds 0-300 step15', await evl(p, () => { const r = document.getElementById('timerRange'); return r.min === '0' && r.max === '300' && r.step === '15'; }));
        check('input bounds 0-600', await evl(p, () => { const i = document.getElementById('timerInput'); return i.min === '0' && i.max === '600'; }));
        await setTimer(p, 240);
        check('arbitrary 240s accepted (>120)', await evl(p, () => window.getTimerSeconds() === 240));
        check('slider follows to 240', await evl(p, () => document.getElementById('timerRange').value === '240'));
        await setTimer(p, 450);
        check('450s accepted, slider clamps 300, input keeps 450', await evl(p, () =>
            window.getTimerSeconds() === 450 && document.getElementById('timerRange').value === '300' && document.getElementById('timerInput').value === '450'));
        await setTimer(p, 0);
        await evl(p, () => {
            document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
            document.getElementById('theme-weight-perusvaihtoehto').value = 1;
        });
        await tap(p, '#startGameBtn'); await sleep(400);
        await roll(p);
        await tap(p, '#btnDisplayWords'); await sleep(500);
        check('timer=0 -> bar hidden after words', await evl(p, () => document.getElementById('turnTimer').style.display === 'none'));
        check('timer=0 -> sec hidden', await evl(p, () => document.getElementById('turnTimerSec').style.display === 'none'));
        await p.close();

        // ============ B. Solo: тик + таймаут ============
        console.log('== B. Solo: tick + timeout ==');
        p = await newPage(browser);
        await evl(p, () => {
            document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
            document.getElementById('theme-weight-perusvaihtoehto').value = 1;
            window.setTimerSeconds(30);
        });
        await tap(p, '#startGameBtn'); await sleep(400);
        await roll(p);
        await tap(p, '#btnDisplayWords'); await sleep(600);
        check('timer=30 -> bar visible', await evl(p, () => document.getElementById('turnTimer').style.display === 'block'));
        const sec1 = await evl(p, () => document.getElementById('turnTimerSec').textContent);
        check('sec label shows seconds', /^\d+ s$/.test(sec1), sec1);
        const w1 = await evl(p, () => parseFloat(document.getElementById('turnTimerFill').style.width));
        await sleep(2000);
        const sec2 = await evl(p, () => document.getElementById('turnTimerSec').textContent);
        const w2 = await evl(p, () => parseFloat(document.getElementById('turnTimerFill').style.width));
        check('sec counting down', parseInt(sec1) > parseInt(sec2), `${sec1} -> ${sec2}`);
        check('bar shrinking', w2 < w1 && w2 < 100, `${w1} -> ${w2}`);
        // ускоренный таймаут: временная option со значением 3
        await setTimer(p, 3);
        await tap(p, '#btnGiveUp'); await sleep(900); // завершить текущий ход
        check('giveup -> Aloita kierros back', await evl(p, () => document.getElementById('btn').style.display === 'block'));
        await roll(p);
        await tap(p, '#btnDisplayWords'); await sleep(400);
        check('3s timer armed again', await evl(p, () => document.getElementById('turnTimer').style.display === 'block'));
        const whoWas = await evl(p, () => currentPlayerIndex);
        await sleep(4000);
        check('timeout auto-ends turn', await evl(p, (w) => currentPlayerIndex !== w, whoWas), '');
        check('timeout -> summary card', await evl(p, () => document.getElementById('turnSummaryCard').style.display === 'flex'));
        check('summary says Aika loppui', await evl(p, () => document.getElementById('tsPoints').textContent.includes('Aika loppui')));
        check('summary reveals the word', await evl(p, () => document.getElementById('tsWord').textContent.trim().length > 0));
        check('bar hidden after timeout', await evl(p, () => document.getElementById('turnTimer').style.display === 'none'));
        // персист
        await setTimer(p, 45);
        await sleep(300);
        await p.reload({ waitUntil: 'domcontentloaded' });
        await p.evaluate(() => wordsReady.then(() => window.__w = true));
        await p.waitForFunction('window.__w === true', { timeout: 20000 });
        check('timer=45 persisted after reload', await evl(p, () => document.getElementById('timerInput').value === '45'));
        await p.close();

        // ============ C. Комната: синк у угадывающих ============
        console.log('== C. Room: guesser timer sync + timeout summary ==');
        const A = await newPage(browser);
        await tap(A, '#netModeRoom'); await sleep(800);
        await fill(A, '#roomNameInput', 'Isanta');
        await tap(A, '#btnCreateRoom'); await sleep(1000);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        const B = await newPage(browser);
        await tap(B, '#netModeRoom'); await sleep(600);
        await fill(B, '#roomNameInput', 'Vieras');
        await fill(B, '#roomCodeInput', code);
        await tap(B, '#btnJoinRoom'); await sleep(900);
        check('B in lobby', await evl(B, () => document.getElementById('roomLobbyView').style.display === 'block'));
        // Broadcast-проверка реальной опцией, потом быстрый 4-сек таймер у хоста
        await setTimer(A, 30); await sleep(400);
        check('timer setting broadcast to guest', await evl(B, () => document.getElementById('timerInput').value === '30'));
        await setTimer(A, 4); await sleep(300);
        await tap(A, '#btnStartRoomGame'); await sleep(1200);
        check('B guesser screen up', await evl(B, () => document.getElementById('netGuesserScreen').style.display === 'block'));
        await tap(A, '#btn'); await sleep(3400);
        await tap(A, '#btnDisplayWords'); await sleep(800);
        check('A: own timer visible', await evl(A, () => document.getElementById('turnTimer').style.display === 'block'));
        check('B: ngTimer visible', await evl(B, () => document.getElementById('ngTimer').style.display === 'block'));
        const gsec1 = await evl(B, () => document.getElementById('ngTimerSec').textContent);
        check('B: ngTimerSec ticking', /^\d+ s$/.test(gsec1), gsec1);
        await sleep(1200);
        const cls = await evl(B, () => document.getElementById('ngTimerFill').className);
        check('B: warn/danger color late', /warn|danger/.test(cls), cls);
        await sleep(3200); // 4s + запас
        check('A: turn auto-ended', await evl(A, () => currentPlayerIndex !== 0 || document.getElementById('btn').style.display === 'block'));
        check('B: summary card shown', await evl(B, () => document.getElementById('turnSummaryCard').style.display === 'flex'));
        check('B: summary says Aika loppui', await evl(B, () => document.getElementById('tsPoints').textContent.includes('Aika loppui')));
        check('B: ngTimer hidden after end', await evl(B, () => document.getElementById('ngTimer').style.display === 'none'));
        await A.close(); await B.close();

        // ============ D. Audio: мгновенный путь для UI-звуков ============
        console.log('== D. Audio: buffered UI sounds ==');
        p = await newPage(browser);
        await sleep(900); // декодирование буферов
        check('ui AudioContext exists', await evl(p, () => typeof uiAudioCtx === 'object' && uiAudioCtx !== null));
        check('ui ctx running (no silence on play)', await evl(p, () => uiAudioCtx && uiAudioCtx.state === 'running'));
        check('click buffer decoded', await evl(p, () => typeof uiBuffers === 'object' && !!uiBuffers['sounds/click.mp3'] && uiBuffers['sounds/click.mp3'].duration > 0));
        check('flip+book buffers decoded', await evl(p, () => !!uiBuffers['sounds/flip.mp3'] && !!uiBuffers['sounds/book.mp3']));
        check('buffered click plays instantly', await evl(p, () => typeof tryPlayBuffered === 'function' && tryPlayBuffered(sounds.click) === true));
        await p.close();
        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    } finally {
        browser.close().catch(() => {});
        srv.kill();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
