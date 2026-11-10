// Minimal repro: 2 pages, create+join+start, find blocking page
const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8080/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const probe = async (page, label) => {
    try {
        const r = await Promise.race([
            page.evaluate(() => ({ ok: 1, players: gamePlayers.length, mode: playerMode, room: window.isRoomGame && window.isRoomGame() })),
            sleep(5000).then(() => 'TIMEOUT')
        ]);
        console.log(label, JSON.stringify(r));
    } catch (e) { console.log(label, 'ERR', e.message.slice(0, 120)); }
};

(async () => {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..', '..'), stdio: 'pipe' });
    srv.stdout.on('data', d => console.log('[srv]', String(d).trim()));
    srv.stderr.on('data', d => console.log('[srv-err]', String(d).trim()));
    await sleep(1200);

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 15000, args: ['--no-sandbox'] });
    try {
        const mk = async (tag) => {
            const p = await browser.newPage();
            p.on('pageerror', e => console.log(`[${tag} pageerror]`, e.message.slice(0, 200)));
            p.on('console', m => { if (m.type() === 'error') console.log(`[${tag} err]`, m.text().slice(0, 160)); });
            await p.goto(BASE, { waitUntil: 'domcontentloaded' });
            await p.waitForFunction('typeof wordsReady !== "undefined"');
            await p.evaluate(() => wordsReady.then(() => window.__w = true));
            await p.waitForFunction('window.__w === true');
            return p;
        };
        const A = await mk('A');
        console.log('A ready');
        await A.click('#netModeRoom'); await sleep(600);
        await A.type('#roomNameInput', 'Isanta');
        await A.click('#btnCreateRoom'); await sleep(900);
        const code = await A.evaluate(() => document.getElementById('roomCodeBig').textContent.trim());
        console.log('code', code);
        await probe(A, 'A after create');

        const B = await mk('B');
        console.log('B ready');
        await B.click('#netModeRoom'); await sleep(600);
        await B.type('#roomNameInput', 'Vieras');
        await B.type('#roomCodeInput', code);
        await B.click('#btnJoinRoom'); await sleep(900);
        await probe(A, 'A after join'); await probe(B, 'B after join');

        console.log('--- start game (2p, magic off) ---');
        await A.evaluate(() => { document.getElementById('btnStartRoomGame').click(); });
        await sleep(1500);
        await probe(A, 'A after start'); await probe(B, 'B after start');

        // click Aloita kierros on whoever is explainer
        for (const [tag, p] of [['A', A], ['B', B]]) {
            const mine = await Promise.race([p.evaluate(() => window.netIsMyTurn()), sleep(4000).then(() => 'T')]);
            console.log(tag, 'isMyTurn:', mine);
            if (mine === true) {
                await p.click('#btn');
                console.log(tag, 'clicked btn');
                await sleep(3400);
            }
        }
        await probe(A, 'A after theme'); await probe(B, 'B after theme');
    } finally {
        await browser.close();
        srv.kill();
    }
})().catch(e => console.error('FATAL', e));
