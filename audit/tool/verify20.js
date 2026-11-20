// verify20.js — megaplan-turn-pause:
// A) Selittäjän katkos -> grace -> PAUSSI (ei autoskip), banner + ohitusnappi
// B) Selittäjä palaa "gone"-tilan jälkeen -> PLAYER_BACK -> banner piiloon, vuoro säilyy
// C) Selittäjä katkeaa uudelleen -> manuaalinen «Ohita vuoro» -> vuoro etenee
// D) AWAY/BACK-signaali -> 💤-banneri + roster.away, paluu piilottaa
// E) Luovutus yhdellä napautuksella (ei enää 1 s holdia)
// F) Wake lock: pyydetään pelin alussa + uudelleen visible-tilassa
// Запуск: node verify20.js  (nostaa server.js :8478 nopealla gracella)
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8478;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser, url) {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        window.__plays = [];
        window.__wlN = 0;
        const orig = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            try { window.__plays.push(((this.getAttribute('src') || this.src || '') + '').split('/').pop()); } catch (e) {}
            return orig.call(this);
        };
        // Wake lock -stubi: laskuri todistaa pyynnöt
        try {
            Object.defineProperty(navigator, 'wakeLock', {
                configurable: true,
                value: {
                    request: () => {
                        window.__wlN = (window.__wlN || 0) + 1;
                        return Promise.resolve({ release: () => Promise.resolve(), addEventListener() {} });
                    }
                }
            });
        } catch (e) {}
        // Headless: toisen sivun bringToFront tekee tästä 'hidden' -> AWAY-artefakti.
        // Pakotetaan 'visible'; testi ohjaa tilaa window.__vs-muuttujalla.
        try {
            Object.defineProperty(document, 'visibilityState', {
                configurable: true,
                get: () => window.__vs || 'visible'
            });
        } catch (e) {}
    });
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 900 });
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => { if (r.url().includes('/sounds/')) r.abort(); else r.continue(); });
    page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 160)));
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
const waitFor = async (p, fn, timeout = 10000, poll = 100) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        const v = await p.evaluate(fn);
        if (v) return v;
        await sleep(poll);
    }
    return null;
};
const joinViaForm = async (page, name, code) => {
    await tap(page, '#netModeRoom'); await sleep(600);
    await fill(page, '#roomNameInput', name);
    await fill(page, '#roomCodeInput', code);
    await tap(page, '#btnJoinRoom'); await sleep(900);
};
const watchEvents = (page) => evl(page, () => {
    window.__evs = window.__evs || [];
    Net.on('EVENT', m => { if (m.event && m.event.kind) window.__evs.push(m.event.kind); });
});
const evs = (page) => evl(page, () => window.__evs || []);
// Koko vuoro UI:n kautta: arvonta -> sanat -> lopetus. Luovutus NYT oikealla
// napautuksella (hold-mekaniikka poistettu) — testaa myös tätä.
const playTurn = async (page, endBtn) => {
    await tap(page, '#btn');
    await waitFor(page, () => document.getElementById('themeDisplay').textContent || null, 8000, 60);
    await tap(page, '#btnDisplayWords');
    await sleep(500);
    await tap(page, endBtn);
    await sleep(700);
};

(async () => {
    const srv = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..', '..'),
        env: { ...process.env, ARK_GRACE_MS: '4000', ARK_HB_MS: '1000', PORT: String(PORT) },
        stdio: 'pipe'
    });
    let up = false;
    for (let i = 0; i < 30 && !up; i++) {
        try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
        if (!up) await sleep(300);
    }
    if (!up) { console.log('server.js did not start'); srv.kill(); process.exit(1); }
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: true, protocolTimeout: 120000,
        args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required',
               '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding']
    });

    try {
        // ============ Setup: huone + peli (2 kierrosta) ============
        console.log('== Setup: room + game ==');
        const A = await newPage(browser);
        await evl(A, () => { localStorage.clear(); document.getElementById('roundSelect').value = '3'; });
        await tap(A, '#netModeRoom'); await sleep(700);
        await fill(A, '#roomNameInput', 'Anna');
        await tap(A, '#btnCreateRoom'); await sleep(1200);
        const code = await evl(A, () => document.getElementById('roomCodeBig').textContent.trim());
        check('room created', /^[A-Z]{4}$/.test(code), code);
        const B = await newPage(browser);
        await joinViaForm(B, 'Ben', code);
        check('B in lobby', await evl(B, () => document.getElementById('roomLobbyView').style.display === 'block'));
        await watchEvents(A); await watchEvents(B);
        await tap(A, '#btnStartRoomGame');
        await Promise.all([
            waitFor(A, () => window.isRoomGame && window.isRoomGame(), 8000),
            waitFor(B, () => window.isRoomGame && window.isRoomGame(), 8000)
        ]);
        check('game started, A explainer', await evl(A, () => window.netIsMyTurn() === true));

        // ============ F. Wake lock pyydetty pelin alussa ============
        console.log('== F. Wake lock ==');
        check('wake lock requested on game start (A)', await evl(A, () => window.__wlN >= 1), await evl(A, () => window.__wlN));

        // ============ E + siirtymä B:lle: luovutus oikealla tapilla ============
        console.log('== E. Give-up via single tap ==');
        await playTurn(A, '#btnGiveUp'); // tap() = tavallinen click — holdia ei enää ole
        await sleep(800);
        check('single tap gave up turn -> B', await evl(A, () => currentPlayerIndex === 1));
        check('B is explainer', await evl(B, () => window.netIsMyTurn() === true));

        // ============ A. Katkos -> grace -> PAUSSI (ei autoskip) ============
        console.log('== A. Drop past grace -> pause ==');
        await evl(B, () => { Net._wantRoom = false; Net.ws.close(); });
        await sleep(700);
        check('A still on B turn during grace', await evl(A, () => currentPlayerIndex === 1));
        check('wait banner during grace', await evl(A, () => document.getElementById('netWaitBanner').style.display === 'flex'));
        await sleep(4200); // grace 4 s + marginaali
        check('A sees PLAYER_DISCONNECTED', (await evs(A)).includes('PLAYER_DISCONNECTED'));
        check('B turn NOT auto-skipped after grace', await evl(A, () => currentPlayerIndex === 1));
        check('pause banner shows gone-state', await evl(A, () => {
            const b = document.getElementById('netWaitBanner');
            return b.style.display === 'flex' && /ei ole pelissä/.test(b.textContent);
        }), await evl(A, () => (document.getElementById('netWaitBanner') || {}).textContent));
        check('skip button offered to A', await evl(A, () => !!document.querySelector('#netWaitBanner .ncb-btn')));

        // ============ B. Paluu "gone"-tilan jälkeen -> vuoro jatkuu ============
        console.log('== B. Return after gone -> turn resumes ==');
        await evl(B, () => { Net._wantRoom = true; Net.connect().catch(() => {}); });
        await waitFor(B, () => Net.connected === true, 8000);
        await sleep(1200);
        check('B reconnected', await evl(B, () => Net.connected === true));
        check('A sees PLAYER_BACK', (await evs(A)).includes('PLAYER_BACK'));
        check('B still explainer after return', await evl(B, () => window.netIsMyTurn() === true));
        check('pause banner hidden after return', await evl(A, () => document.getElementById('netWaitBanner').style.display === 'none'));

        // ============ D. AWAY-signaali -> 💤-banneri ============
        console.log('== D. AWAY/BACK signal ==');
        await evl(B, () => {
            window.__vs = 'hidden';
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await sleep(900);
        check('A sees B marked away', await evl(A, () => {
            const b = Net.players.find(p => p.name === 'Ben');
            return b && b.away === true;
        }));
        check('pause banner shows sleep state', await evl(A, () => {
            const b = document.getElementById('netWaitBanner');
            return b.style.display === 'flex' && /näyttö sammui/.test(b.textContent);
        }), await evl(A, () => (document.getElementById('netWaitBanner') || {}).textContent));
        check('B turn NOT skipped while away', await evl(A, () => currentPlayerIndex === 1));
        await evl(B, () => {
            window.__vs = 'visible';
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await sleep(900);
        check('B away flag cleared', await evl(A, () => {
            const b = Net.players.find(p => p.name === 'Ben');
            return b && b.away === false;
        }));
        check('banner hidden after wake', await evl(A, () => document.getElementById('netWaitBanner').style.display === 'none'));
        check('wake lock re-requested after visible (B)', await evl(B, () => window.__wlN >= 1), await evl(B, () => window.__wlN));

        // ============ C. Katkos uudelleen -> manuaalinen ohitus ============
        console.log('== C. Drop again -> manual skip ==');
        await evl(B, () => { Net._wantRoom = false; Net.ws.close(); });
        await sleep(4900); // grace 4 s + marginaali -> gone
        check('pause banner before manual skip', await evl(A, () => {
            const b = document.getElementById('netWaitBanner');
            return b.style.display === 'flex' && /ei ole pelissä|Odotetaan/.test(b.textContent);
        }), await evl(A, () => (document.getElementById('netWaitBanner') || {}).textContent));
        await tap(A, '#netWaitBanner .ncb-btn'); await sleep(250);
        check('skip button armed (confirm)', await evl(A, () => {
            const s = document.querySelector('#netWaitBanner .ncb-btn');
            return s && /Varmista/.test(s.textContent);
        }));
        await tap(A, '#netWaitBanner .ncb-btn'); await sleep(900);
        check('B turn skipped manually', await evl(A, () => currentPlayerIndex === 0));
        check('A is explainer after manual skip', await evl(A, () => window.netIsMyTurn() === true));
        check('banner hidden after skip', await evl(A, () => document.getElementById('netWaitBanner').style.display === 'none'));

        // ============ B2. Myöhästynyt paluu skipin jälkeen — peli jatkuu ehyenä ============
        await evl(B, () => { Net._wantRoom = true; Net.connect().catch(() => {}); });
        await waitFor(B, () => Net.connected === true, 8000);
        await sleep(1200);
        check('B back in game after skip', await evl(B, () => window.isRoomGame() === true));
        check('B sees A turn', await evl(B, () => currentPlayerIndex === 0));

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    } finally {
        await browser.close().catch(() => {});
        srv.kill();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
