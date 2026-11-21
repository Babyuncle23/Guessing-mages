// Kuvia korjatuista tiloista: bannerit, peek-pilleri, pitkä sana, ääninappi.
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8471/index.html';
const OUT = path.resolve(__dirname, '..', 'screenshots');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 320, height: 800, deviceScaleFactor: 2 });
        page.on('dialog', d => d.accept().catch(() => {}));
        await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForFunction('typeof allWords !== "undefined" && allWords.length > 1000', { timeout: 20000 });
        await sleep(300);

        // Peli käyntiin -> sanat auki
        await page.evaluate(() => {
            document.querySelectorAll('.theme-weight-input').forEach(i => i.value = 0);
            document.getElementById('theme-weight-pantomiimi').value = 1;
        });
        await page.click('#startGameBtn');
        await sleep(400);
        await page.click('#btn');
        await sleep(3400);
        await page.click('#btnDisplayWords');
        await sleep(500);
        await page.evaluate(() => {
            generatedWordsList[0] = 'pyyhkäisyelektronimikroskooppi';
            if (typeof currentBonusWords !== 'undefined') { currentBonusWords.length = 0; currentBonusWords.push('pyyhkäisyelektronimikroskooppi'); }
            renderOlList();
            document.getElementById('wordListWrap').classList.add('revealing');
        });
        await sleep(300);
        await page.screenshot({ path: path.join(OUT, 'fix-01-words-long-320.png') });
        console.log('words-active:', await page.evaluate(() => document.getElementById('gameContainer').className));
        console.log('sound display:', await page.evaluate(() => getComputedStyle(document.getElementById('soundToggleBtn')).display));

        // Bannerit + peek + toast päälle
        await page.evaluate(() => {
            const mk = (id, cls, html) => {
                let b = document.getElementById(id);
                if (!b) { b = document.createElement('div'); b.id = id; document.body.appendChild(b); }
                if (cls) b.className = cls;
                b.innerHTML = html; b.style.display = 'flex'; return b;
            };
            mk('netWaitBanner', '', '<span>💤 Pelaajan HostV11 näyttö sammui — odotetaan tai ohitetaan</span><button type="button" class="ncb-btn">Ohita vuoro</button>');
            mk('netConnBadge', 'err', '❌ Ei yhteyttä palvelimeen <button type="button" class="ncb-btn">Yhdistä uudelleen</button>');
            const t = document.getElementById('netReconnectToast') || (() => { const d = document.createElement('div'); d.id = 'netReconnectToast'; document.body.appendChild(d); return d; })();
            t.textContent = '⏳ Pelaajan PitkäniminenPelaaja yhteys katkesi — odotetaan paluuta…';
            t.style.display = 'block';
        });
        await sleep(200);
        await page.screenshot({ path: path.join(OUT, 'fix-02-bars-320.png') });

        // Peek-pilleri piirtomodaalissa
        await page.evaluate(() => {
            ['netWaitBanner','netConnBadge','netReconnectToast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
            document.getElementById('drawingModalOverlay').style.display = 'flex';
            const p = document.getElementById('peekWordPill');
            p.textContent = '🤫 pyyhkäisyelektronimikroskooppi'; p.style.display = 'block';
        });
        await sleep(200);
        await page.screenshot({ path: path.join(OUT, 'fix-03-peek-320.png'), clip: { x: 0, y: 0, width: 320, height: 200 } });
        console.log('DONE');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
