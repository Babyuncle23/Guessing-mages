// Tekstikatkoskannaus: etsii kovaa leikkausta (ei ellipsis-designia) kaikilta
// näytöiltä. Aja: node probe-textclip.js   (serveri :8471, Chrome asennettuna)
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8471/index.html';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Skannaa sivu: palauttaa listan "kovasti katkaistuista" elementeistä.
// Kova katkaisu = sisältö ylittää laatikon vaakasuunnassa EIKÄ elementillä
// ole ellipsis-mekanismia (text-overflow + nowrap) eikä rullausmahdollisuutta.
const SCAN_FN = `(() => {
    const out = [];
    const clipX = (cs) => ['hidden','clip','scroll','auto'].includes(cs.overflowX);
    const ellipsized = (cs) => cs.textOverflow === 'ellipsis' && cs.whiteSpace !== 'normal' && cs.overflow !== 'visible';
    document.querySelectorAll('body *').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        const txt = (el.innerText || el.textContent || '').trim();
        if (!txt) return;
        const overflow = el.scrollWidth - el.clientWidth;
        if (overflow > 2 && clipX(cs) && !ellipsized(cs)) {
            // jos vanhempi elliptoi itse — ohitetaan
            let p = el.parentElement, skip = false;
            while (p && p !== document.body) {
                const pcs = getComputedStyle(p);
                if (ellipsized(pcs)) { skip = true; break; }
                p = p.parentElement;
            }
            if (!skip) out.push({ who: el.id || el.className || el.tagName, over: overflow, txt: txt.slice(0, 70) });
        }
        // elementin reunat näytön ulkopuolella (leikkaus reunassa)
        if (r.right > window.innerWidth + 1 || r.left < -1) {
            // sallitaan jos joku esi-isä leikkaa tarkoituksellisesti (rumpu!)
            let p = el.parentElement, clippedByAncestor = false;
            while (p && p !== document.body) {
                const pcs = getComputedStyle(p);
                if (pcs.overflow === 'hidden' || pcs.overflowX === 'hidden') { clippedByAncestor = true; break; }
                p = p.parentElement;
            }
            if (!clippedByAncestor)
                out.push({ who: (el.id || el.className || el.tagName) + ' [offscreen]', over: Math.round(r.right - window.innerWidth), txt: txt.slice(0, 70) });
        }
    });
    return out;
})()`;

// Kuulapainikkeen päällekkäisyys tekstin kanssa
const SOUND_OVERLAP = `(() => {
    const s = document.getElementById('soundToggleBtn');
    if (!s || getComputedStyle(s).display === 'none') return [];
    const sr = s.getBoundingClientRect();
    const out = [];
    document.querySelectorAll('button, li, .score-display, .chip-tool-btn').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none') return;
        const r = el.getBoundingClientRect();
        if (r.width < 2) return;
        const ix = Math.min(sr.right, r.right) - Math.max(sr.left, r.left);
        const iy = Math.min(sr.bottom, r.bottom) - Math.max(sr.top, r.top);
        if (ix > 4 && iy > 4) out.push({ who: el.id || el.className, txt: (el.innerText || '').slice(0, 50) });
    });
    return out;
})()`;

async function newPage(browser, w, h) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    page.on('dialog', d => d.accept().catch(() => {}));
    return page;
}
async function load(page) {
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForFunction('typeof allWords !== "undefined" && allWords.length > 1000', { timeout: 20000 });
    await sleep(300);
}
async function scan(page, label, problems) {
    const bad = await page.evaluate(SCAN_FN);
    bad.forEach(b => problems.push(`${label} :: ${b.who} :: +${b.over}px :: "${b.txt}"`));
    return bad.length;
}
async function soundScan(page, label, problems) {
    const bad = await page.evaluate(SOUND_OVERLAP);
    bad.forEach(b => problems.push(`${label} :: SOUND-ICON OVERLAP :: ${b.who} :: "${b.txt}"`));
}

(async () => {
    const problems = [];
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    try {
        for (const vp of [{ w: 320, h: 800 }, { w: 390, h: 844 }, { w: 280, h: 653 }]) {
            const tag = `${vp.w}x${vp.h}`;
            // --- 1) Aloitusmodaali Peli-välilehti ---
            let page = await newPage(browser, vp.w, vp.h);
            await load(page);
            await scan(page, `${tag}/start`, problems);
            // --- 2) Asetukset-välilehti (avataan kaikki harmonikat) ---
            await page.click('.tab-button[onclick*="settingsTab"]');
            await sleep(250);
            await page.evaluate(() => document.querySelectorAll('#settingsTab .accordion-header').forEach(h => h.click()));
            await sleep(400);
            await scan(page, `${tag}/settings`, problems);
            // --- 3) Peli: rumpu + sana-avustaja ---
            await page.click('.tab-button[onclick*="gameTab"]');
            await sleep(150);
            await page.evaluate(() => {
                document.querySelectorAll('.theme-weight-input').forEach(i => i.value = 0);
                const t = document.getElementById('theme-weight-pantomiimi'); if (t) t.value = 1;
            });
            await page.click('#startGameBtn');
            await sleep(400);
            await scan(page, `${tag}/pre-round`, problems);
            await page.click('#btn');
            await sleep(3400);
            await scan(page, `${tag}/drum`, problems);
            await page.click('#btnDisplayWords');
            await sleep(500);
            // pitkä sana + bonusbadge ekalle riville
            await page.evaluate(() => {
                generatedWordsList[0] = 'pyyhkäisyelektronimikroskooppi';
                if (typeof currentBonusWords !== 'undefined') { currentBonusWords.length = 0; currentBonusWords.push('pyyhkäisyelektronimikroskooppi'); }
                renderOlList();
            });
            await sleep(300);
            await page.evaluate(() => document.getElementById('wordListWrap').classList.add('revealing'));
            await sleep(200);
            await scan(page, `${tag}/words-long`, problems);
            await soundScan(page, `${tag}/words`, problems);
            // --- 4) Kiinteät palkit: wait-banner, conn-badge, peek-pill, toast ---
            await page.evaluate(() => {
                const mk = (id, cls, html) => {
                    let b = document.getElementById(id);
                    if (!b) { b = document.createElement('div'); b.id = id; document.body.appendChild(b); }
                    if (cls) b.className = cls;
                    b.innerHTML = html;
                    b.style.display = 'flex';
                    return b;
                };
                mk('netWaitBanner', '', '<span>💤 Pelaajan HostV11 näyttö sammui — odotetaan tai ohitetaan</span><button type="button" class="ncb-btn">Ohita vuoro</button>');
                mk('netConnBadge', 'err', '❌ Ei yhteyttä palvelimeen <button type="button" class="ncb-btn">Yhdistä uudelleen</button>');
                const p = document.getElementById('peekWordPill');
                p.textContent = '🤫 pyyhkäisyelektronimikroskooppi'; p.style.display = 'block';
                const t = document.getElementById('netReconnectToast') || (() => { const d = document.createElement('div'); d.id = 'netReconnectToast'; document.body.appendChild(d); return d; })();
                t.textContent = '⏳ Pelaajan PitkäniminenPelaaja yhteys katkesi — odotetaan paluuta…';
                t.style.display = 'block';
            });
            await sleep(200);
            await scan(page, `${tag}/bars`, problems);
            await page.evaluate(() => {
                ['netWaitBanner','netConnBadge','peekWordPill','netReconnectToast'].forEach(id => {
                    const e = document.getElementById(id); if (e) e.style.display = 'none';
                });
            });
            // --- 5) Voittomodaali pitkällä nimellä ---
            await page.evaluate(() => {
                const m = document.getElementById('victoryModal');
                document.getElementById('victoryRankings').innerHTML =
                    '<div class="victory-row winner"><span class="v-rank">1.</span><span class="v-name">KirouksenlangettajaAbc</span><span class="v-score">1250p</span></div>' +
                    '<div class="victory-row"><span class="v-rank">2.</span><span class="v-name">AAAAAAAAAAAAAAAAAAAA</span><span class="v-score">30p</span></div>';
                m.style.display = 'flex';
            });
            await sleep(150);
            await scan(page, `${tag}/victory`, problems);
            await page.evaluate(() => document.getElementById('victoryModal').style.display = 'none');
            // --- 6) Arvaajan näyttö ---
            await page.evaluate(() => {
                const g = document.getElementById('netGuesserScreen');
                g.style.display = 'block';
                document.getElementById('ngScore').innerHTML = '<span>▶ AAAAAAAAAAAAAAAAAAAA: <strong>1250p</strong></span><br><span>BBBBBBBBBBBBBBBBBBBB: <strong>30p</strong></span>';
                document.getElementById('ngStatus').textContent = '⏳ Odotetaan pelaajan PitkäniminenPelaaja paluuta…';
                const tb = document.getElementById('ngThemeBlock'); tb.style.display = 'block';
                document.getElementById('ngTheme').textContent = 'ILMAN SUBSTANTIIVEJA';
            });
            await sleep(150);
            await scan(page, `${tag}/guesser`, problems);
            await page.evaluate(() => document.getElementById('netGuesserScreen').style.display = 'none');
            // --- 7) Piirtomodaali ---
            await page.evaluate(() => document.getElementById('drawingModalOverlay').style.display = 'flex');
            await sleep(150);
            await scan(page, `${tag}/drawmodal`, problems);
            await page.evaluate(() => document.getElementById('drawingModalOverlay').style.display = 'none');
            // --- 8) Emojimodaali ---
            await page.evaluate(() => document.getElementById('emojiModalOverlay').style.display = 'flex');
            await sleep(150);
            await scan(page, `${tag}/emojimodal`, problems);
            await page.evaluate(() => document.getElementById('emojiModalOverlay').style.display = 'none');
            await page.close();
        }
    } finally { await browser.close(); }

    console.log('==== TEXT-CLIP REPORT ====');
    if (!problems.length) console.log('CLEAN: ei kovia tekstikatkaisuja löytynyt.');
    else problems.forEach(p => console.log('CLIP:', p));
})();
