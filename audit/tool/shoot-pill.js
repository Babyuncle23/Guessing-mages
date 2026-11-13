const puppeteer = require('puppeteer-core');
const path = require('path');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = 8488, BASE = `http://127.0.0.1:${PORT}`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
    const t0 = Date.now(); let up = false;
    while (Date.now() - t0 < 10000 && !up) { try { const r = await fetch(BASE + '/healthz'); up = r.ok; } catch (e) {} if (!up) await sleep(200); }
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
        document.querySelectorAll('.theme-weight-input').forEach(x => { x.value = 0; x.dispatchEvent(new Event('input', { bubbles: true })); });
        const el = document.getElementById('theme-weight-pantomiimi');
        el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => document.getElementById('startGameBtn').click());
    await sleep(500);
    await page.evaluate(() => document.getElementById('btn').click());
    await sleep(3900);
    await page.screenshot({ path: 'audit/pill-rest.png' });
    await browser.close(); srv.kill();
    console.log('done');
})();
