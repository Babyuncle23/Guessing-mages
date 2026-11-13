// audit/tool/verify11.js — megaplan-room-sync: huonepeli synkassa.
// A) CREATE_ROOM sisältää asetukset → vieras saa isännän teemat + lukitus
// B) Yhdistetty rumpu: samat sektorit + sama voittaja ~samaan aikaan
// C) Tulosäänet vieraalla (success/fail/gameWin)
// D) Voittomodaali näkyy MOLEMMILLA puhelimilla
// E) Yhteenveto ilman "—" kun sanaa ei valittu
// Запуск: node verify11.js  (сам поднимает server.js на :8474)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8474;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(__dirname, '..', 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser) {
    const p = await browser.newPage();
    await p.evaluateOnNewDocument(() => {
        // Vakoillaan kaikki äänentoistot (HTMLAudio). WebAudio-klikit eivät näy — ok.
        window.__plays = [];
        const orig = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            try { window.__plays.push(((this.getAttribute('src') || this.src || '') + '').split('/').pop()); } catch (e) {}
            return orig.call(this);
        };
    });
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    p.on('dialog', d => d.accept().catch(() => {}));
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 160)));
    return p;
}
const load = async (p, url) => {
    await p.goto(url || BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 10000 });
    await p.evaluate(() => wordsReady.then(() => window.__w = true));
    await p.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(400);
};
const waitFor = async (p, fn, timeout = 12000, poll = 100) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        const v = await p.evaluate(fn);
        if (v) return v;
        await sleep(poll);
    }
    return null;
};
const drumThemes = (wheelId) => `JSON.stringify([...document.querySelectorAll('#${wheelId} .theme-drum-item')].map(e => e.dataset.theme).sort())`;

(async () => {
    const srv = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..', '..'), env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe'
    });
    let up = false;
    for (let i = 0; i < 20; i++) {
        await sleep(500);
        try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {}
        if (up) break;
    }
    if (!up) { console.log('server.js did not start'); srv.kill(); process.exit(1); }

    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: true, protocolTimeout: 120000,
        args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required',
               '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding']
    });

    try {
        // ============ A. Asetukset ennen huonetta → vieras saa ne ============
        console.log('== A. Isännän asetukset saavuttavat vieraan ==');
        const host = await newPage(browser);
        await load(host);
        await host.evaluate(() => localStorage.clear());
        await load(host);

        // Isäntä valitsee AINUTLAATUISET painot: vain elokuva(5) + oma ehto
        await host.evaluate(() => {
            document.querySelector('.tab-button[onclick*="settingsTab"]').click();
            document.querySelectorAll('.theme-weight-input').forEach(i => { i.value = 0; i.dispatchEvent(new Event('input', { bubbles: true })); });
            const e = document.getElementById('theme-weight-elokuva');
            e.value = 5; e.dispatchEvent(new Event('input', { bubbles: true }));
            document.querySelectorAll('.accordion-header').forEach(h => {
                if (h.textContent.includes('Omat ehdot')) {
                    const c = h.nextElementSibling;
                    if (c && !c.classList.contains('open')) h.click();
                }
            });
        });
        await sleep(300);
        await host.evaluate(() => {
            document.getElementById('customThemeName').value = 'huoneen testiteema';
            document.getElementById('customThemeDesc').value = 'Isännän oma sääntö testiin.';
            document.getElementById('customThemeEmoji').value = '🏠';
            document.getElementById('btnAddCustomTheme').click();
        });
        await sleep(300);
        // 2-kierroksen demo + rounds=2 select arvoon
        await host.evaluate(() => { document.getElementById('roundSelect').value = '2'; });

        // Huoneen luonti — asetukset kulkevat CREATE_ROOMin mukana
        const roomCode = await host.evaluate(() => new Promise(res => {
            const t = setTimeout(() => res('timeout'), 15000);
            Net.on('ROOM_CREATED', m => { clearTimeout(t); res(m.roomCode); });
            document.getElementById('netModeRoom').click();
            setTimeout(() => {
                document.getElementById('roomNameInput').value = 'HostV11';
                document.getElementById('btnCreateRoom').click();
            }, 300);
        }));
        check('room created', /^[A-Z]{4}$/.test(roomCode), roomCode);

        // Vieras liittyy — oma localStorage eri (tyhjä) → asetukset vain palvelimelta
        const guest = await newPage(browser);
        await load(guest);
        await guest.evaluate(() => localStorage.clear());
        await load(guest, `${BASE}/?room=${roomCode}`);
        await sleep(600);
        const joined = await guest.evaluate(() => new Promise(res => {
            const t = setTimeout(() => res(false), 15000);
            const done = () => { clearTimeout(t); res(true); };
            Net.on('ROOM_JOINED', done);
            Net.on('ROOM_STATE', done);
            if (Net.roomCode) done();
            else { document.getElementById('roomNameInput').value = 'GuestV11'; document.getElementById('btnJoinRoom').click(); }
        }));
        check('guest joined', joined === true);

        // Vieraan UI: isännän painot + oma ehto näkyvät, mutta lukittuna
        let sync = null;
        for (let i = 0; i < 25 && !sync; i++) {
            await sleep(400);
            sync = await guest.evaluate(() => ({
                elo: document.getElementById('theme-weight-elokuva')?.value,
                panto: document.getElementById('theme-weight-pantomiimi')?.value,
                customCard: !!document.getElementById('card-huoneen-testiteema'),
                inThemes: themes.includes('huoneen testiteema'),
                locked: document.body.classList.contains('room-settings-locked'),
                hint: document.getElementById('settingsLockHint')?.style.display !== 'none' && !!document.getElementById('settingsLockHint'),
            }));
            if (sync && sync.customCard && sync.elo === '5') break;
            sync = null;
        }
        check('guest sees host weight elokuva=5', sync && sync.elo === '5', JSON.stringify(sync));
        check('guest sees host zeroed pantomiimi', sync && sync.panto === '0', JSON.stringify(sync));
        check('guest has custom theme card+registry', sync && sync.customCard && sync.inThemes, JSON.stringify(sync));
        check('guest settings locked + hint', sync && sync.locked && sync.hint, JSON.stringify(sync));
        const hostLocked = await host.evaluate(() => document.body.classList.contains('room-settings-locked'));
        check('host settings NOT locked', hostLocked === false);

        // ============ B. Peli käyntiin + yhdistetty rumpu ============
        console.log('== B. Yhdistetty teemarumpu ==');
        await guest.evaluate(() => sessionStorage.setItem('arksanum-sound', '1')); // vieraalla äänet päälle testiä varten
        await host.evaluate(() => document.getElementById('btnStartRoomGame').click());
        const gStarted = await Promise.all([
            waitFor(host, () => window.isRoomGame && window.isRoomGame(), 8000),
            waitFor(guest, () => window.isRoomGame && window.isRoomGame(), 8000),
        ]);
        check('game started on both phones', gStarted[0] === true && gStarted[1] === true);

        // Vuoro 1 = isäntä selittää (players[0])
        const hostTurn = await host.evaluate(() => window.netIsMyTurn());
        check('host explains turn 1', hostTurn === true);

        // Isäntä pyöräyttää — vieraan rummun tulee pyörähtää SAMOILLA sektoreilla
        await host.evaluate(() => document.getElementById('btn').click());
        const hostSectors = await waitFor(host, () =>
            document.querySelectorAll('#drumWheel .theme-drum-item').length
                ? JSON.stringify([...document.querySelectorAll('#drumWheel .theme-drum-item')].map(e => e.dataset.theme).sort())
                : null, 4000);
        const guestSectors = await waitFor(guest, () =>
            document.querySelectorAll('#ngDrumWheel .theme-drum-item').length
                ? JSON.stringify([...document.querySelectorAll('#ngDrumWheel .theme-drum-item')].map(e => e.dataset.theme).sort())
                : null, 4000);
        check('drum sectors identical on both phones', hostSectors && guestSectors && hostSectors === guestSectors, `host=${hostSectors} guest=${guestSectors}`);
        const sectorList = hostSectors ? JSON.parse(hostSectors) : [];
        check('sectors are host config only (elokuva+custom)', sectorList.length === 2 && sectorList.includes('elokuva') && sectorList.includes('huoneen testiteema'), hostSectors);

        // Sama voittaja ~samaan aikaan: mitataan teeman ilmestyminen kummallekin
        const tHost = Date.now();
        const hostTheme = await waitFor(host, () => document.getElementById('themeDisplay').textContent || null, 8000, 50);
        const tHostTheme = Date.now();
        const guestTheme = await waitFor(guest, () => document.getElementById('ngTheme').textContent || null, 8000, 50);
        const tGuestTheme = Date.now();
        check('same winner on both phones', hostTheme && guestTheme && hostTheme === guestTheme, `host=${hostTheme} guest=${guestTheme}`);
        check('winner is from host config', ['ELOKUVA', 'HUONEEN TESTITEEMA'].includes((hostTheme || '').toUpperCase()), hostTheme);
        check('landing times within 1.2s', hostTheme && guestTheme && Math.abs(tHostTheme - tGuestTheme) < 1200, `dt=${tGuestTheme - tHostTheme}ms`);
        const guestDrumSound = await guest.evaluate(() => window.__plays.includes('drum.ogg'));
        check('guest heard drum sound', guestDrumSound === true);

        // ============ E. Luovutus ilman sanaa → ei "—" ============
        console.log('== E. Ei tiertä kun sanaa ei valittu ==');
        await host.evaluate(() => document.getElementById('btnDisplayWords').click());
        await sleep(500);
        // Isäntä luovuttaa valitsematta sanaa
        await host.evaluate(() => window._devConfirmGiveUp());
        const guestSummary = await waitFor(guest, () => {
            const c = document.getElementById('turnSummaryCard');
            if (c && c.style.display === 'flex') {
                return {
                    wordVisible: document.getElementById('tsWord').style.display !== 'none',
                    labelVisible: document.getElementById('tsWordLabel').style.display !== 'none',
                    word: document.getElementById('tsWord').textContent,
                };
            }
            return null;
        }, 6000);
        check('summary card shown on guest', !!guestSummary);
        check('no dash row when word unselected', guestSummary && guestSummary.wordVisible === false && guestSummary.labelVisible === false, JSON.stringify(guestSummary));
        const failSnd = await guest.evaluate(() => window.__plays.includes('fail.mp3'));
        check('guest heard fail sound', failSnd === true);

        // ============ C. Vuoro 2 vieras selittää → arvattu → success isännällä ============
        console.log('== C. Etä-successsound + synkka toiseen suuntaan ==');
        await sleep(4500); // yhteenvetokortti ehtii pois
        const guestTurn = await guest.evaluate(() => window.netIsMyTurn());
        check('guest explains turn 2', guestTurn === true);
        await host.evaluate(() => sessionStorage.setItem('arksanum-sound', '1')); // isäntäkin ääntää (host on jo oletuksena, varmistus)
        await guest.evaluate(() => document.getElementById('btn').click());
        // Vieraan arvonta käyttää myös isännän konffia (ei vieraan omia painoja)
        const guest2Theme = await waitFor(guest, () => document.getElementById('themeDisplay').textContent || null, 8000, 50);
        const host2Theme = await waitFor(host, () => document.getElementById('ngTheme').textContent || null, 8000, 50);
        check('guest roll also uses host config', ['ELOKUVA', 'HUONEEN TESTITEEMA'].includes((guest2Theme || '').toUpperCase()), guest2Theme);
        check('host sees same theme as guesser', host2Theme && guest2Theme && host2Theme === guest2Theme, `host=${host2Theme} guest=${guest2Theme}`);

        await guest.evaluate(() => document.getElementById('btnDisplayWords').click());
        await sleep(600);
        await guest.evaluate(() => {
            const li = document.querySelector('#wordList li');
            if (li) li.click();
        });
        await sleep(300);
        await guest.evaluate(() => document.getElementById('btnGuessed').click());
        const hostSuccess = await waitFor(host, () => window.__plays.includes('success.mp3'), 5000);
        check('host heard success sound (remote result)', hostSuccess === true);
        const hostSummary2 = await waitFor(host, () => {
            const c = document.getElementById('turnSummaryCard');
            return c && c.style.display === 'flex'
                ? { word: document.getElementById('tsWord').textContent, wordVisible: document.getElementById('tsWord').style.display !== 'none' }
                : null;
        }, 4000);
        check('host summary shows selected word', hostSummary2 && hostSummary2.wordVisible === true && hostSummary2.word.length > 1, JSON.stringify(hostSummary2));

        // ============ Vuorot 3-4: nopeat luovutukset → peli päättyy ============
        console.log('== Vuorot 3-4 → peli loppuu (totalTurns=2 kierrosta × 2 pelaajaa) ==');
        // Vuoro 3: isäntä selittää, luovuttaa
        await sleep(4500);
        const hostTurn3 = await host.evaluate(() => window.netIsMyTurn());
        check('host explains turn 3', hostTurn3 === true);
        await host.evaluate(() => document.getElementById('btn').click());
        await waitFor(host, () => document.getElementById('themeDisplay').textContent || null, 8000, 50);
        await host.evaluate(() => document.getElementById('btnDisplayWords').click());
        await sleep(400);
        await host.evaluate(() => window._devConfirmGiveUp());
        await sleep(4500); // yhteenveto ehtii pois

        // Vuoro 4: vieras selittää, luovuttaa → PELI PÄÄTTYY
        const guestTurn4 = await guest.evaluate(() => window.netIsMyTurn());
        check('guest explains turn 4', guestTurn4 === true);
        await guest.evaluate(() => document.getElementById('btn').click());
        await waitFor(guest, () => document.getElementById('themeDisplay').textContent || null, 8000, 50);
        await guest.evaluate(() => document.getElementById('btnDisplayWords').click());
        await sleep(400);
        await guest.evaluate(() => window._devConfirmGiveUp());

        // ============ D. Voittomodaali kaikilla ============
        console.log('== D. Voittomodaali näkyy molemmilla ==');
        const vHost = await waitFor(host, () =>
            document.getElementById('victoryModal').style.display === 'flex' ? {
                modal: true,
                ng: document.getElementById('netGuesserScreen').style.display,
                gameWin: window.__plays.includes('gameWin.mp3'),
            } : null, 8000);
        const vGuest = await waitFor(guest, () =>
            document.getElementById('victoryModal').style.display === 'flex' ? {
                modal: true,
                ng: document.getElementById('netGuesserScreen').style.display,
                gameWin: window.__plays.includes('gameWin.mp3'),
                summaryShown: document.getElementById('turnSummaryCard').style.display === 'flex',
            } : null, 8000);
        check('victory modal on HOST phone', vHost && vHost.modal === true, JSON.stringify(vHost));
        check('victory modal on GUEST phone', vGuest && vGuest.modal === true, JSON.stringify(vGuest));
        check('guesser screen hidden on game over', vHost && vGuest && vHost.ng === 'none' && vGuest.ng === 'none', JSON.stringify({ vHost, vGuest }));
        check('gameWin sound on guest (remote round end)', vGuest && vGuest.gameWin === true, JSON.stringify(vGuest));
        check('gameWin sound on host too', vHost && vHost.gameWin === true, JSON.stringify(vHost));
        check('no summary card on final round', vGuest && vGuest.summaryShown === false, JSON.stringify(vGuest));

        // ============ Uusintapeli: modaali ei jää tielle ============
        console.log('== Uusintapeli ==');
        await host.evaluate(() => document.getElementById('btnPlayAgain').click());
        await sleep(1500);
        const replay = await Promise.all([
            host.evaluate(() => ({
                game: window.isRoomGame && window.isRoomGame(),
                modal: document.getElementById('victoryModal').style.display,
                round: document.getElementById('roundDisplay').textContent,
            })),
            guest.evaluate(() => ({
                game: window.isRoomGame && window.isRoomGame(),
                modal: document.getElementById('victoryModal').style.display,
                round: currentRound,
            })),
        ]);
        check('replay starts on both phones', replay[0].game === true && replay[1].game === true, JSON.stringify(replay));
        check('victory modal hidden after replay', replay[0].modal === 'none' && replay[1].modal === 'none', JSON.stringify(replay));
        check('round reset', /1\s*\/\s*2/.test(replay[0].round || ''), replay[0].round);

        await host.screenshot({ path: path.join(OUT, 'v11-host-end.png') }).catch(() => {});
        await guest.screenshot({ path: path.join(OUT, 'v11-guest-end.png') }).catch(() => {});
        await host.close();
        await guest.close();
    } catch (err) {
        console.log('SCRIPT ERROR:', err.message);
        fail++;
    }

    await browser.close();
    srv.kill();
    console.log(`\n==== verify11: ${pass} PASS, ${fail} FAIL ====`);
    process.exit(fail ? 1 : 0);
})();
