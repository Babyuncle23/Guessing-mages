// Find exact block-start moment: poll raw Runtime.evaluate on A every 250ms
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), stdio: 'pipe' });
    await sleep(1200);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 20000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    try {
        const mk = async (tag) => {
            const p = await browser.newPage();
            p.on('pageerror', e => console.log(`[${tag} pageerror]`, e.message.slice(0, 250)));
            p.on('dialog', d => { console.log(`[${tag} DIALOG]`, d.message()); d.accept().catch(()=>{}); });
            await p.goto(BASE, { waitUntil: 'domcontentloaded' });
            await p.waitForFunction('typeof wordsReady !== "undefined"');
            await p.evaluate(() => wordsReady.then(() => window.__w = true));
            await p.waitForFunction('window.__w === true');
            return p;
        };
        const A = await mk('A');
        const cdp = await A.createCDPSession();
        const rawPing = async () => Promise.race([
            cdp.send('Runtime.evaluate', { expression: 'performance.now()|0', returnByValue: true }).then(() => 'ok'),
            sleep(1200).then(() => 'BLOCKED')
        ]);
        const poll = async (label, n, gapMs) => {
            for (let i = 0; i < n; i++) {
                const r = await rawPing();
                console.log(`  ${label} +${i * gapMs}ms: ${r}`);
                if (r === 'BLOCKED') return false;
                await sleep(gapMs);
            }
            return true;
        };

        await A.click('#netModeRoom'); await sleep(600);
        await A.type('#roomNameInput', 'Isanta');
        await A.click('#btnCreateRoom'); await sleep(900);
        const code = await A.evaluate(() => document.getElementById('roomCodeBig').textContent.trim());
        const B = await mk('B');
        await B.click('#netModeRoom'); await sleep(600);
        await B.type('#roomNameInput', 'Vieras');
        await B.type('#roomCodeInput', code);
        await B.click('#btnJoinRoom'); await sleep(900);
        console.log('--- GAME_STARTED ---');
        await A.evaluate(() => { document.getElementById('btnStartRoomGame').click(); });
        if (!(await poll('afterStart', 8, 250))) { console.log('A blocked right after GAME_STARTED'); return; }

        console.log('--- raw Input.dispatchMouseEvent on #btn ---');
        const box = await A.evaluate(() => { const r = document.getElementById('btn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        const rawClick = (type) => Promise.race([
            cdp.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 }).then(() => type + '-ack'),
            sleep(4000).then(() => type + '-TIMEOUT')
        ]);
        console.log('move:', await rawClick('mouseMoved'));
        console.log('down:', await rawClick('mousePressed'));
        console.log('up:', await rawClick('mouseReleased'));
        await poll('afterRawClick', 16, 250);
    } finally {
        await browser.close();
        srv.kill();
    }
})().catch(e => console.error('FATAL', e.message));
