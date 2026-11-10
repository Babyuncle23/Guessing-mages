// Isolate the randomizeTheme block on explainer page
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), stdio: 'pipe' });
    await sleep(1200);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 8000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    try {
        const A = await browser.newPage();
        A.on('pageerror', e => console.log('[A pageerror]', e.message.slice(0, 300)));
        A.on('dialog', d => { console.log('[A DIALOG]', d.message()); d.accept().catch(()=>{}); });
        await A.goto(BASE, { waitUntil: 'domcontentloaded' });
        await A.waitForFunction('typeof wordsReady !== "undefined"');
        await A.evaluate(() => wordsReady.then(() => window.__w = true));
        await A.waitForFunction('window.__w === true');

        // Simulate a started room game WITHOUT the server-side ws dance:
        // set the globals directly as startRoomGameLocal would
        console.log('step1: set fake room state');
        const r1 = await Promise.race([
            A.evaluate(() => {
                Net.game = { started: true, cfg: { mode: 2 } };
                Net.playerId = 'p1';
                playerMode = 2; totalTurns = 5;
                gamePlayers = [
                    { pid: 'p1', name: 'A', displayName: 'A', img: '🙂', score: 0, spells: {} },
                    { pid: 'p2', name: 'B', displayName: 'B', img: '🙂', score: 0, spells: {} }
                ];
                currentRound = 1; currentPlayerIndex = 0;
                return { myTurn: window.netIsMyTurn(), room: window.isRoomGame() };
            }),
            sleep(6000).then(() => 'T1-TIMEOUT')
        ]);
        console.log('r1', JSON.stringify(r1));

        console.log('step2: call randomizeTheme sync part');
        const r2 = await Promise.race([
            A.evaluate(() => { randomizeTheme(); return 'ok'; }),
            sleep(6000).then(() => 'T2-TIMEOUT (randomizeTheme sync blocks)')
        ]);
        console.log('r2', JSON.stringify(r2));

        await sleep(3400); // let the 2.5s drum timeout fire
        const r3 = await Promise.race([
            A.evaluate(() => ({ theme: currentActiveTheme, alive: 1 })),
            sleep(6000).then(() => 'T3-TIMEOUT (theme-timeout callback blocks)')
        ]);
        console.log('r3', JSON.stringify(r3));
    } finally {
        await browser.close();
        srv.kill();
    }
})().catch(e => console.error('FATAL', e.message));
