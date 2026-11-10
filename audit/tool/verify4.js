// audit/tool/verify4.js — проверки UX-ясности: два пути в хуруме, подпись бонус-слова,
// регрессия profanity-фильтра и капа 76000, горизонтальный скролл.
// Запуск: node verify4.js   (нужен статик-сервер на :8472 — python -m http.server 8472)
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8472';

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('PASS', '-', name); } else { fail++; console.log('FAIL', '-', name); } };

const checkOverflow = async (p, label) => {
    const res = await p.evaluate(() => {
        const doc = document.documentElement, vw = doc.clientWidth, bad = [];
        document.querySelectorAll('body *').forEach(el => {
            const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
            if (r.right > vw + 1 || r.left < -1) bad.push(el.id || el.className || el.tagName);
        });
        return { overflow: doc.scrollWidth - vw, bad: bad.slice(0, 6) };
    });
    ok(`no overflow/clipping: ${label}` + (res.bad.length ? ` [${res.bad}]` : ''), res.overflow <= 0 && res.bad.length === 0);
};

(async () => {
    const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

    // ---------- A. Room join: два пути ----------
    let p = await b.newPage();
    await p.setViewport({ width: 390, height: 844 });
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await p.evaluate(() => wordsReady.catch(() => {}));
    await new Promise(r => setTimeout(r, 900));

    await p.evaluate(() => document.getElementById('netModeRoom').click());
    await new Promise(r => setTimeout(r, 400));

    let st = await p.evaluate(() => ({
        codeRowVisible: getComputedStyle(document.getElementById('roomCodeRow')).display !== 'none',
        createVisible: getComputedStyle(document.getElementById('btnCreateRoom')).display !== 'none',
        hint: document.querySelector('#roomJoinView .room-hint').textContent,
    }));
    ok('A1 code row hidden by default', !st.codeRowVisible);
    ok('A2 create-room button visible', st.createVisible);
    ok('A3 hint explains code appears automatically', /automaattisesti/.test(st.hint));

    await p.evaluate(() => document.getElementById('btnPathJoin').click());
    st = await p.evaluate(() => ({
        codeRowVisible: document.getElementById('roomCodeRow').style.display === 'flex',
        pathActive: document.getElementById('btnPathJoin').classList.contains('active'),
    }));
    ok('A4 code row appears after Liity-path', st.codeRowVisible);
    ok('A5 join path button marked active', st.pathActive);
    await checkOverflow(p, '390px room join (two-path)');

    // deep link ?room=ABCD
    const p2 = await b.newPage();
    await p2.setViewport({ width: 390, height: 844 });
    await p2.goto(BASE + '/?room=KOTI', { waitUntil: 'networkidle2' });
    await p2.evaluate(() => wordsReady.catch(() => {}));
    await new Promise(r => setTimeout(r, 900));
    st = await p2.evaluate(() => ({
        roomPanelShown: document.getElementById('roomPanel').style.display !== 'none',
        codeRowOpen: document.getElementById('roomCodeRow').style.display === 'flex',
        codeVal: document.getElementById('roomCodeInput').value,
    }));
    ok('A6 ?room= opens room panel', st.roomPanelShown);
    ok('A7 ?room= auto-opens join path', st.codeRowOpen);
    ok('A8 ?room= prefills code', st.codeVal === 'KOTI');
    await p2.close();

    // create-room click still reaches the ws (Render fallback on static host)
    const wsOk = await p.evaluate(() => new Promise(res => {
        const t = setTimeout(() => res('timeout'), 20000);
        Net.on('ROOM_CREATED', m => { clearTimeout(t); res(m.roomCode); });
        document.getElementById('roomNameInput').value = 'V4';
        document.getElementById('btnCreateRoom').click();
    }));
    ok('A9 CREATE_ROOM works via fallback (code=' + wsOk + ')', /^[A-Z]{4}$/.test(wsOk));
    await p.close();

    // ---------- B. bonusHint жизненный цикл ----------
    p = await b.newPage();
    await p.setViewport({ width: 390, height: 844 });
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await p.evaluate(() => wordsReady.catch(() => {}));
    await new Promise(r => setTimeout(r, 900));
    st = await p.evaluate(() => getComputedStyle(document.getElementById('bonusHint')).display);
    ok('B1 bonusHint hidden before words', st === 'none');

    await p.evaluate(() => { setPlayerMode(2); document.getElementById('startGameBtn').click(); });
    await new Promise(r => setTimeout(r, 700));
    await p.evaluate(() => document.getElementById('btn').click());
    await new Promise(r => setTimeout(r, 3600));
    await p.evaluate(() => document.getElementById('btnDisplayWords').click());
    await new Promise(r => setTimeout(r, 600));
    st = await p.evaluate(() => {
        const h = document.getElementById('bonusHint');
        return { disp: getComputedStyle(h).display, txt: h.textContent, rare: !!document.querySelector('#wordList li[data-rare="true"]') };
    });
    ok('B2 bonusHint visible with words', st.disp !== 'none');
    ok('B3 hint mentions koko sanakirjasta + +25p', /koko sanakirjasta/.test(st.txt) && /\+25p/.test(st.txt));
    ok('B4 rare word marked in list', st.rare);
    await checkOverflow(p, '390px words open + bonusHint');

    // hint hides when words cleared / turn ends
    await p.evaluate(() => { const g = document.getElementById('btnGuessed'); if (g) g.click(); });
    await new Promise(r => setTimeout(r, 800));
    st = await p.evaluate(() => getComputedStyle(document.getElementById('bonusHint')).display);
    ok('B5 bonusHint hidden after turn ends', st === 'none');

    // ---------- C. profanity-фильтр + кап 76000 ----------
    const c = await p.evaluate(async () => {
        const text = await (await fetch('words/kaikkisanat.txt')).text();
        const all = text.split('\n').join('\n').split(/[,\n]/).map(w => w.trim().toLowerCase()).filter(w => w.length >= 3);
        const first76000 = new Set(text.split('\n').slice(0, 76000).join('\n').split(/[,\n]/).map(w => w.trim().toLowerCase()).filter(w => w.length >= 3));
        const beyondLeak = allWords.filter(w => !first76000.has(w.toLowerCase()));
        const forbiddenSamples = ['paskapää', 'syfilis', 'abortti', 'eutanasia', 'raiskaus', 'pornoa'];
        const forbiddenHits = forbiddenSamples.filter(w => allWords.some(x => x.toLowerCase() === w));
        // sanity: бонус-слова реально из kaikkisanat-секции
        return { total: all.length, first76000: first76000.size, allWords: allWords.length, beyondLeak: beyondLeak.length, forbiddenHits };
    });
    ok('C1 allWords ⊆ first 76000 lines (leak=' + c.beyondLeak + ')', c.beyondLeak === 0);
    ok('C2 forbidden samples absent from allWords', c.forbiddenHits.length === 0);
    ok('C3 allWords non-trivial size (' + c.allWords + ')', c.allWords > 50000);
    await p.close();

    // ---------- D. mobile widths sanity ----------
    for (const W of [320, 390]) {
        const q = await b.newPage();
        await q.setViewport({ width: W, height: 844 });
        await q.goto(BASE + '/', { waitUntil: 'networkidle2' });
        await q.evaluate(() => wordsReady.catch(() => {}));
        await new Promise(r => setTimeout(r, 800));
        await q.evaluate(() => { document.getElementById('netModeRoom').click(); document.getElementById('btnPathJoin').click(); });
        await new Promise(r => setTimeout(r, 400));
        await checkOverflow(q, W + 'px join path open');
        await q.close();
    }

    await b.close();
    console.log(`\n=== verify4: ${pass} PASS, ${fail} FAIL ===`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e); process.exit(1); });
