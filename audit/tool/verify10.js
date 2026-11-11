// audit/tool/verify10.js — megaplan-custom-themes: pelaajan omat selitysehdot.
// A) lomake+rekisteri  B) validointi  C) Säännöt-modaali  D) stepperi
// E) ehto poolissa & rummussa  F) poisto  G) localStorage-persistenssi
// H) huonesynkka: isäntä on totuus (lisäys, paino, poisto → vieras)
// Запуск: node verify10.js  (сам поднимает server.js на :8473)
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8473;
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
    await p.bringToFront();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    p.on('dialog', d => d.accept().catch(() => {}));
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 140)));
    return p;
}
const load = async (p, url) => {
    await p.goto(url || BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 10000 });
    await p.evaluate(() => wordsReady.then(() => window.__w = true));
    await p.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(400);
};

// Открыть вкладку Asetukset и развернуть аккордеон «Omat ehdot»
const openOwnSection = async (p) => {
    await p.evaluate(() => {
        document.querySelector('.tab-button[onclick*="settingsTab"]').click();
        document.querySelectorAll('.accordion-header').forEach(h => {
            if (h.textContent.includes('Omat ehdot')) {
                const c = h.nextElementSibling;
                if (c && !c.classList.contains('open')) h.click();
            }
        });
    });
    await sleep(300);
};

const addViaForm = async (p, name, desc, emoji) => {
    await p.evaluate((n, d, e) => {
        document.getElementById('customThemeName').value = n;
        document.getElementById('customThemeDesc').value = d;
        document.getElementById('customThemeEmoji').value = e;
        document.getElementById('btnAddCustomTheme').click();
    }, name, desc, emoji);
    await sleep(250);
};

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
        executablePath: CHROME, headless: true, protocolTimeout: 60000,
        args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required',
               '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding']
    });

    try {
        // ============ A. Lomake + rekisteri ============
        console.log('== A. Lomake + rekisteri ==');
        let p = await newPage(browser);
        await load(p);
        check('customThemesApi exposed', await p.evaluate(() => typeof window.customThemesApi === 'object'));
        check('form fields exist', await p.evaluate(() =>
            !!document.getElementById('customThemeName') &&
            !!document.getElementById('customThemeDesc') &&
            !!document.getElementById('customThemeEmoji') &&
            !!document.getElementById('btnAddCustomTheme') &&
            !!document.getElementById('customThemesGrid')));
        await openOwnSection(p);
        check('Omat ehdot accordion opens', await p.evaluate(() => {
            const h = [...document.querySelectorAll('.accordion-header')].find(x => x.textContent.includes('Omat ehdot'));
            return h && h.nextElementSibling.classList.contains('open');
        }));
        const vis = await p.evaluate(() => {
            const r = document.getElementById('customThemeName').getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        });
        check('form visible after accordion open', vis);

        await addViaForm(p, 'vain yksi sana', 'Selitä käyttäen vain yhtä sanaa.', '🌙');
        const a = await p.evaluate(() => ({
            card: !!document.getElementById('card-vain-yksi-sana'),
            inThemes: themes.includes('vain yksi sana'),
            input: document.getElementById('theme-weight-vain-yksi-sana')?.value,
            desc: themeDescriptions['vain yksi sana'],
            emoji: themeImages['vain yksi sana'],
            active: document.getElementById('card-vain-yksi-sana')?.classList.contains('active-card'),
            delBtn: !!document.querySelector('#card-vain-yksi-sana .custom-theme-del'),
            helpBtn: !!document.querySelector('#card-vain-yksi-sana .theme-setting-help'),
        }));
        check('card rendered', a.card);
        check('registered in themes[]', a.inThemes);
        check('weight input created (=1)', a.input === '1', a.input);
        check('desc registered', a.desc === 'Selitä käyttäen vain yhtä sanaa.', a.desc);
        check('emoji registered', a.emoji === '🌙', a.emoji);
        check('card active (weight>0)', a.active === true);
        check('delete ✕ on card', a.delBtn);
        check('Säännöt (?) on card', a.helpBtn);

        // ============ B. Validointi ============
        console.log('== B. Validointi ==');
        await addViaForm(p, '', 'x', '');
        check('empty name rejected', await p.evaluate(() =>
            document.getElementById('customThemeError').textContent.length > 0 &&
            !document.querySelector('#customThemesGrid .theme-card:nth-child(2)')));
        await addViaForm(p, 'x', '', '');
        check('1-char name rejected', await p.evaluate(() =>
            document.getElementById('customThemeError').textContent.length > 0));
        await addViaForm(p, 'VAIN YKSI SANA', 'dup', '');
        check('duplicate (case-insensitive) rejected', await p.evaluate(() =>
            document.querySelectorAll('#customThemesGrid .theme-card').length === 1 &&
            /jo listalla/i.test(document.getElementById('customThemeError').textContent)));
        await addViaForm(p, 'pantomiimi', 'dup', '');
        check('built-in name rejected', await p.evaluate(() =>
            document.querySelectorAll('#customThemesGrid .theme-card').length === 1 &&
            /jo listalla/i.test(document.getElementById('customThemeError').textContent)));
        await addViaForm(p, 'slug-testi', '<b>bold</b> & <img>', '<x>');
        const b = await p.evaluate(() => ({
            desc: themeDescriptions['slug-testi'],
            emoji: themeImages['slug-testi'],
        }));
        check('no <> survives in desc', b.desc && !/[<>]/.test(b.desc) && /bold/.test(b.desc), b.desc);
        check('no <> survives in emoji', b.emoji && !/[<>]/.test(b.emoji), b.emoji);
        await p.evaluate(() => window.customThemesApi.removeTheme('slug-testi'));
        await sleep(150);

        // ============ C. Säännöt-modaali ============
        console.log('== C. Säännöt-modaali ==');
        await p.evaluate(() => document.querySelector('#card-vain-yksi-sana .theme-setting-help').click());
        await sleep(250);
        const c = await p.evaluate(() => ({
            open: document.getElementById('spellHelpModal').style.display === 'flex',
            body: document.getElementById('spellHelpModalBody').textContent,
        }));
        check('help modal opens', c.open);
        check('modal shows custom rule', /vain yhtä sanaa/i.test(c.body), c.body.slice(0, 80));
        await p.evaluate(() => { document.getElementById('spellHelpModal').style.display = 'none'; document.body.classList.remove('spell-help-modal-open'); });

        // ============ D. Stepperi ============
        console.log('== D. Stepperi ==');
        await p.evaluate(() => document.querySelector('#card-vain-yksi-sana .stepper-btn.plus').click());
        await sleep(120);
        check('plus → 2', await p.evaluate(() => document.getElementById('theme-weight-vain-yksi-sana').value === '2'));
        await p.evaluate(() => { const i = document.getElementById('theme-weight-vain-yksi-sana'); i.value = 0; i.dispatchEvent(new Event('input', { bubbles: true })); });
        check('0 → disabled-card', await p.evaluate(() => document.getElementById('card-vain-yksi-sana').classList.contains('disabled-card')));
        await p.evaluate(() => document.querySelector('#card-vain-yksi-sana .stepper-btn.plus').click());
        await sleep(120);

        // ============ E. Pooli + rumpu ============
        console.log('== E. Ehto poolissa & rummussa ==');
        await p.evaluate(() => {
            document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
            document.getElementById('theme-weight-vain-yksi-sana').value = 1;
        });
        const pool = await p.evaluate(() => buildWeightedThemePool(getThemeWeightsFromUI()));
        check('custom in weighted pool', pool.length === 1 && pool[0] === 'vain yksi sana', JSON.stringify(pool));
        await p.evaluate(() => { document.querySelector('.tab-button[onclick*="gameTab"]').click(); document.getElementById('startGameBtn').click(); });
        await sleep(500);
        await p.evaluate(() => document.getElementById('btn').click());
        await sleep(3400);
        const e = await p.evaluate(() => ({
            theme: document.getElementById('themeDisplay').textContent,
            rule: document.getElementById('ruleInstruction').textContent,
        }));
        check('drum lands on custom theme', /vain yksi sana/i.test(e.theme), e.theme);
        check('custom rule shown to explainer', /vain yhtä sanaa/i.test(e.rule), e.rule.slice(0, 80));

        // ============ F. Poisto ============
        console.log('== F. Poisto ==');
        await p.evaluate(() => { document.querySelector('.tab-button[onclick*="settingsTab"]').click(); });
        await openOwnSection(p);
        await p.evaluate(() => document.querySelector('#card-vain-yksi-sana .custom-theme-del').click());
        await sleep(250);
        const f = await p.evaluate(() => ({
            card: !!document.getElementById('card-vain-yksi-sana'),
            inThemes: themes.includes('vain yksi sana'),
            desc: 'vain yksi sana' in themeDescriptions,
            input: !!document.getElementById('theme-weight-vain-yksi-sana'),
        }));
        check('card removed', !f.card);
        check('unregistered from themes[]', !f.inThemes);
        check('desc cleaned', !f.desc);
        check('weight input removed', !f.input);

        // ============ G. localStorage-persistenssi ============
        console.log('== G. Persistenssi ==');
        await addViaForm(p, 'salainen ääni', 'Kuiskaa koko ajan.', '🔇');
        await p.evaluate(() => {
            const i = document.getElementById('theme-weight-salainen-aani');
            i.value = 4; i.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(300);
        const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('arksanum-settings-v1')));
        check('customs in localStorage', saved && Array.isArray(saved.customs) && saved.customs.some(c => c.name === 'salainen ääni'), JSON.stringify(saved && saved.customs));
        check('weight in localStorage', saved && saved.weights && saved.weights['theme-weight-salainen-aani'] === 4);
        await load(p); // reload
        await sleep(300);
        const g = await p.evaluate(() => ({
            card: !!document.getElementById('card-salainen-aani'),
            val: document.getElementById('theme-weight-salainen-aani')?.value,
            inThemes: themes.includes('salainen ääni'),
        }));
        check('card restored after reload', g.card);
        check('weight restored (=4)', g.val === '4', g.val);
        check('in themes[] after reload', g.inThemes);

        // ============ H. Huonesynkka — isäntä on totuus ============
        console.log('== H. Huonesynkka ==');
        // Puhdista localStorage + lataa uudelleen, jotta SETTINGS on ainoa lähde
        const host = p;
        await host.evaluate(() => localStorage.clear());
        await load(host);
        const roomCode = await host.evaluate(() => new Promise(res => {
            const t = setTimeout(() => res('timeout'), 15000);
            Net.on('ROOM_CREATED', m => { clearTimeout(t); res(m.roomCode); });
            document.getElementById('roomNameInput').value = 'HostV10';
            document.getElementById('btnCreateRoom').click();
        }));
        check('room created', /^[A-Z]{4}$/.test(roomCode), roomCode);

        const guest = await newPage(browser);
        await guest.evaluate(() => {}).catch(() => {});
        await load(guest);
        await guest.evaluate(() => localStorage.clear());
        await load(guest, `${BASE}/?room=${roomCode}`);
        const joined = await guest.evaluate(() => new Promise(res => {
            const t = setTimeout(() => res(false), 15000);
            Net.on('ROOM_JOINED', () => { clearTimeout(t); res(true); });
            Net.on('ROOM_STATE', () => { clearTimeout(t); res(true); });
            document.getElementById('roomNameInput').value = 'GuestV10';
            document.getElementById('btnJoinRoom').click();
        }));
        check('guest joined', joined === true);

        // Isäntä lisää ehdon → vieraalle kortti
        await openOwnSection(host);
        await addViaForm(host, 'huoneen ehto', 'Isännän luoma sääntö.', '🏠');
        let okSync = false;
        for (let i = 0; i < 30; i++) {
            await sleep(400);
            okSync = await guest.evaluate(() => !!document.getElementById('card-huoneen-ehto'));
            if (okSync) break;
        }
        check('guest receives custom card via SETTINGS', okSync);
        if (okSync) {
            const gs = await guest.evaluate(() => ({
                inThemes: themes.includes('huoneen ehto'),
                desc: themeDescriptions['huoneen ehto'],
                emoji: themeImages['huoneen ehto'],
            }));
            check('guest registry updated', gs.inThemes && gs.desc === 'Isännän luoma sääntö.' && gs.emoji === '🏠', JSON.stringify(gs));
        }

        // Isännän painomuutos → vieraalla sama arvo
        await host.evaluate(() => {
            const i = document.getElementById('theme-weight-huoneen-ehto');
            i.value = 5; i.dispatchEvent(new Event('input', { bubbles: true }));
        });
        let wSync = false;
        for (let i = 0; i < 30; i++) {
            await sleep(400);
            wSync = await guest.evaluate(() => document.getElementById('theme-weight-huoneen-ehto')?.value === '5');
            if (wSync) break;
        }
        check('guest receives weight=5', wSync);

        // Isännän poisto → vieraalta katoaa
        await host.evaluate(() => document.querySelector('#card-huoneen-ehto .custom-theme-del').click());
        let delSync = false;
        for (let i = 0; i < 30; i++) {
            await sleep(400);
            delSync = await guest.evaluate(() => !document.getElementById('card-huoneen-ehto') && !themes.includes('huoneen ehto'));
            if (delSync) break;
        }
        check('guest card removed on host delete', delSync);

        // Screenshot
        await openOwnSection(guest);
        await guest.evaluate(() => {
            const h = [...document.querySelectorAll('.accordion-header')].find(x => x.textContent.includes('Omat ehdot'));
            h?.scrollIntoView({ block: 'start' });
        });
        await guest.bringToFront(); await sleep(300);
        await guest.screenshot({ path: path.join(OUT, 'ct-settings-390.png') });
        console.log('  shot: ct-settings-390.png');
        await guest.close();
        await host.close();
    } catch (err) {
        console.log('SCRIPT ERROR:', err.message);
        fail++;
    }

    await browser.close();
    srv.kill();
    console.log(`\n==== verify10: ${pass} PASS, ${fail} FAIL ====`);
    process.exit(fail ? 1 : 0);
})();
