// Catch the stuck stack: enable Debugger, pause when page hangs, print callFrames
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
        await cdp.send('Debugger.enable');
        await cdp.send('Inspector.enable').catch(()=>{});
        let paused = null;
        cdp.on('Debugger.paused', (ev) => { paused = ev; });
        cdp.on('Inspector.targetCrashed', () => console.log('[A] *** RENDERER CRASHED ***'));
        A.on('error', e => console.log('[A page error/crash]', e.message));

        await A.click('#netModeRoom'); await sleep(600);
        await A.type('#roomNameInput', 'Isanta');
        await A.click('#btnCreateRoom'); await sleep(900);
        const code = await A.evaluate(() => document.getElementById('roomCodeBig').textContent.trim());

        const B = await mk('B');
        await B.click('#netModeRoom'); await sleep(600);
        await B.type('#roomNameInput', 'Vieras');
        await B.type('#roomCodeInput', code);
        await B.click('#btnJoinRoom'); await sleep(900);
        await A.evaluate(() => { document.getElementById('btnStartRoomGame').click(); });
        await sleep(1200);
        console.log('game started');

        // BISECT: stub native calls + kill all future timers/rAF on A
        await A.evaluate(() => {
            HTMLMediaElement.prototype.play = () => Promise.resolve();
            navigator.vibrate = () => false;
            window.setTimeout = () => 0;
            window.setInterval = () => 0;
            window.requestAnimationFrame = () => 0;
        });
        console.log('timers+rAF killed on A, firing btn.click');
        A.evaluate(() => { document.getElementById('btn').click(); }).catch(e => console.log('btn click eval:', e.message.slice(0,80)));
        await sleep(3600);
        await cdp.send('Debugger.pause');
        await sleep(1500);
        if (paused) {
            console.log('=== PAUSED — call stack ===');
            paused.callFrames.slice(0, 15).forEach(f =>
                console.log(`  ${f.functionName || '(anon)'} @ ${f.url.split('/').slice(-2).join('/')}:${f.location.lineNumber}`));
            await cdp.send('Debugger.resume').catch(()=>{});
        } else {
            console.log('not paused — raw Runtime.evaluate probe (bypasses puppeteer mutex)');
            await sleep(3000);
            const raw = await Promise.race([
                cdp.send('Runtime.evaluate', { expression: '({theme: currentActiveTheme, t: performance.now()})', returnByValue: true }).then(r => JSON.stringify(r.result && r.result.value)),
                sleep(5000).then(() => 'RAW-EVAL-TIMEOUT (main thread truly blocked)')
            ]);
            console.log('raw eval:', raw);
            await cdp.send('Runtime.terminateExecution').catch(e => console.log('term err:', e.message));
            await sleep(800);
            const r = await Promise.race([
                A.evaluate(() => ({ theme: currentActiveTheme, myTurn: window.netIsMyTurn(), room: window.isRoomGame(), ws: Net.ws && Net.ws.readyState })),
                sleep(6000).then(() => 'STILL-BLOCKED (not JS loop)')
            ]);
            console.log('state:', JSON.stringify(r));
        }
        // also probe B
        const rb = await Promise.race([B.evaluate(() => ({ theme: currentActiveTheme, ng: document.getElementById('netGuesserScreen').style.display })), sleep(5000).then(()=>'B-TIMEOUT')]);
        console.log('B:', JSON.stringify(rb));
    } finally {
        await browser.close();
        srv.kill();
    }
})().catch(e => console.error('FATAL', e.message));
