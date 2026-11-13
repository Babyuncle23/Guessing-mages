// Verification script for Task 2: onboarding, 3/4+ modes, peek, victory modal, timer, storage
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8471/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function newPage(browser, errors) {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 1 });
    page.on('dialog', d => d.accept().catch(() => {}));
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await page.evaluateOnNewDocument(() => {
        try {
            // Älä tyhjennä localStoragea jos testi pyytää säilyttämistä reloadin yli
            if (!sessionStorage.getItem('__keepLS')) localStorage.clear();
        } catch (e) {}
    });
    return page;
}
const load = async (page) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 10000 });
    await page.evaluate(() => wordsReady.then(() => window.__w = true));
    await page.waitForFunction('window.__w === true', { timeout: 20000 });
    await sleep(400);
};
const forceTheme = (page, id) => page.evaluate((i) => {
    document.querySelectorAll('.theme-weight-input').forEach(x => x.value = 0);
    document.getElementById(i).value = 1;
}, id);
const roll = async (page) => { await page.click('#btn'); await sleep(3400); };
const startBasicGame = async (page) => { await page.click('#startGameBtn'); await sleep(400); };
const revealWords = async (page) => { await page.click('#btnDisplayWords'); await sleep(400); };

(async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    const errors = [];
    try {
        // ============ A. Onboarding: cards, guide, mode selector ============
        console.log('== A. Magic onboarding ==');
        let page = await newPage(browser, errors);
        await load(page);

        check('mode selector: 3 options', await page.evaluate(() => document.querySelectorAll('.mode-option').length) === 3);
        check('default mode = 2', await page.evaluate(() => playerMode === 2));
        check('magic guide button exists', await page.evaluate(() => !!document.getElementById('magicGuideBtn')));

        // Character cards list all spells with timing badges
        const cards = await page.evaluate(() => {
            const out = {};
            document.querySelectorAll('.char-card').forEach(c => {
                out[c.dataset.char] = {
                    pills: c.querySelectorAll('.spell-pill').length,
                    text: c.textContent
                };
            });
            return out;
        });
        check('Muodonmuuttaja: 2 spell pills', cards['Muodonmuuttaja'].pills === 2);
        check('Muodonmuuttaja: Korttitulva + Ennen sanoja', cards['Muodonmuuttaja'].text.includes('Korttitulva') && cards['Muodonmuuttaja'].text.includes('Ennen sanoja'));
        check('Muodonmuuttaja: Sanametamorfoosi + Sanojen aikana', cards['Muodonmuuttaja'].text.includes('Sanametamorfoosi') && cards['Muodonmuuttaja'].text.includes('Sanojen aikana'));
        check('Kirouksenlangettaja: 2 pills, Milloin vain', cards['Kirouksenlangettaja'].pills === 2 && cards['Kirouksenlangettaja'].text.includes('Milloin vain'));
        check('Yrttitarhuri: Kasvupurkaus pill', cards['Yrttitarhuri'].pills === 1 && cards['Yrttitarhuri'].text.includes('Kasvupurkaus'));

        // Guide auto-expands when magic toggled on
        check('guide closed before toggle', await page.evaluate(() => !document.getElementById('magicGuide').classList.contains('open')));
        await page.click('#magicToggle'); await sleep(300);
        check('guide auto-opens on magic ON', await page.evaluate(() => document.getElementById('magicGuide').classList.contains('open')));
        check('guide has 3 steps', await page.evaluate(() => document.querySelectorAll('#magicGuide .guide-step').length) === 3);
        await page.click('#magicToggle'); await sleep(300); // toggle back off
        await page.close();

        // ============ B. 3-player free-for-all ============
        console.log('== B. 3-player FFA ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-pantomiimi');
        await page.click('.mode-option[data-mode="3"]'); await sleep(200);
        check('playerMode = 3', await page.evaluate(() => playerMode === 3));
        await startBasicGame(page);
        check('3 players created', await page.evaluate(() => gamePlayers.length === 3));
        check('scoreboard lists 3 players', await page.evaluate(() => {
            const t = document.getElementById('scoreDisplay').textContent;
            return t.includes('Pelaaja 1') && t.includes('Pelaaja 2') && t.includes('Pelaaja 3');
        }));
        await roll(page);
        await revealWords(page);
        await page.click('#btnGuessed'); await sleep(400);
        check('whoGuessed modal opens', await page.evaluate(() => document.getElementById('whoGuessedModal').style.display === 'flex'));
        check('2 guesser options (not explainer)', await page.evaluate(() => document.querySelectorAll('#whoGuessedOptions button').length) === 2);
        // Pick Pelaaja 2 as guesser
        await page.click('#whoGuessedOptions button'); await sleep(400);
        const s3 = await page.evaluate(() => gamePlayers.map(p => p.score));
        check('explainer got 100, guesser got 50', s3[0] === 100 && s3[1] === 50, JSON.stringify(s3));
        check('turn advanced to Pelaaja 2', await page.evaluate(() => gamePlayers[currentPlayerIndex].name === 'Pelaaja 2'));
        await page.close();

        // ============ C. 3-player magic: 3 mages + curse target ============
        console.log('== C. 3-player magic ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-elokuva');
        await page.click('.mode-option[data-mode="3"]'); await sleep(200);
        await page.click('#magicToggle'); await sleep(300);
        await page.click('.char-card[data-char="Muodonmuuttaja"]'); await sleep(100);
        await page.click('.char-card[data-char="Kirouksenlangettaja"]'); await sleep(100);
        await page.click('.char-card[data-char="Yrttitarhuri"]'); await sleep(200);
        check('3 picks accepted', await page.evaluate(() => setupOrder.length === 3));
        check('magic start enabled', await page.evaluate(() => !document.getElementById('startGameBtn').disabled));
        await startBasicGame(page);
        check('3 mages in game', await page.evaluate(() => gamePlayers.length === 3 && gamePlayers.every(p => p.name.includes('a'))));
        // P1 = Muodonmuuttaja: spell btn two-line + phase title
        await roll(page);
        const sp = await page.evaluate(() => ({
            inner: document.getElementById('spellBtn1').innerHTML,
            title: document.getElementById('spellZoneTitle').textContent
        }));
        check('spell btn has name+sub spans', sp.inner.includes('spell-name') && sp.inner.includes('spell-sub'), sp.inner);
        check('phase title = Vaihe 1', sp.title.includes('Vaihe 1'), sp.title);
        // finish P1 turn
        await revealWords(page);
        await page.click('#btnGuessed'); await sleep(300);
        check('whoGuessed modal in 3P magic', await page.evaluate(() => document.getElementById('whoGuessedModal').style.display === 'flex'));
        await page.click('#whoGuessedOptions button'); await sleep(400);
        check('turn -> Kirouksenlangettaja', await page.evaluate(() => gamePlayers[currentPlayerIndex].name === 'Kirouksenlangettaja'));
        // P2 casts Korttinälkä -> target modal
        await roll(page);
        check('phase title Vaihe 1 for curser', await page.evaluate(() => document.getElementById('spellZoneTitle').textContent.includes('Vaihe 1')));
        await page.click('#spellBtn1'); await sleep(300);
        check('curse target modal opens', await page.evaluate(() => document.getElementById('curseTargetModal').style.display === 'flex'));
        check('2 curse targets offered', await page.evaluate(() => document.querySelectorAll('#curseTargetOptions button').length) === 2);
        // curse the SECOND target (Yrttitarhuri, index 2)
        await page.evaluate(() => document.querySelectorAll('#curseTargetOptions button')[1].click());
        await sleep(300);
        check('curse targets Yrttitarhuri (idx 2)', await page.evaluate(() => pendingCurses.hunger === 2));
        // P2 gives up turn -> P3 (Yrttitarhuri) is cursed
        await revealWords(page);
        await page.evaluate(() => window._devConfirmGiveUp()); await sleep(400);
        check('turn -> Yrttitarhuri', await page.evaluate(() => gamePlayers[currentPlayerIndex].name === 'Yrttitarhuri'));
        check('hunger consumed -> reduceToThree', await page.evaluate(() => pendingCurses.hunger === -1 && activeModifiers.reduceToThree === true));
        await roll(page);
        check('curse banner shown', await page.evaluate(() => {
            const b = document.getElementById('curseBanner');
            return b.style.display === 'block' && b.textContent.includes('KIROUS AKTIVOITUI') && b.textContent.includes('Korttinälkä');
        }));
        await revealWords(page);
        check('cursed list = 3 words', await page.evaluate(() => document.querySelectorAll('#wordList li').length) === 3);
        await page.evaluate(() => window._devConfirmGiveUp()); await sleep(300);
        check('curse banner hidden next turn', await page.evaluate(() => document.getElementById('curseBanner').style.display === 'none'));
        await page.close();

        // ============ D. 4+ team mode: steal ============
        console.log('== D. 4+ team steal ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-pantomiimi');
        // steal btn hidden in mode 2
        check('steal btn hidden in 2P', await page.evaluate(() => getComputedStyle(document.getElementById('btnStolen')).display === 'none'));
        await page.click('.mode-option[data-mode="4"]'); await sleep(200);
        check('playerMode = 4', await page.evaluate(() => playerMode === 4));
        await startBasicGame(page);
        check('teams created', await page.evaluate(() => gamePlayers.length === 2 && gamePlayers[0].name === 'Tiimi 1' && gamePlayers[1].name === 'Tiimi 2'));
        await roll(page);
        await revealWords(page);
        check('steal btn visible in 4P', await page.evaluate(() => getComputedStyle(document.getElementById('btnStolen')).display !== 'none'));
        await page.click('#btnStolen'); await sleep(400);
        const st = await page.evaluate(() => gamePlayers.map(p => p.score));
        check('steal: T1=0, T2=+50', st[0] === 0 && st[1] === 50, JSON.stringify(st));
        check('turn -> Tiimi 2', await page.evaluate(() => gamePlayers[currentPlayerIndex].name === 'Tiimi 2'));
        await page.close();

        // ============ E. Peek + emoji filter + secret protection ============
        console.log('== E. Peek & emoji ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-piirtaminen');
        await startBasicGame(page);
        await roll(page);
        await revealWords(page);
        // select a word
        await page.click('#wordList li'); await sleep(200);
        const selWord = await page.evaluate(() => generatedWordsList[selectedWordIndex]);
        check('word selected', selWord !== undefined && selWord.length > 0, selWord);
        await page.click('#btnToolCanvas'); await sleep(500);
        check('drawing modal open', await page.evaluate(() => document.getElementById('drawingModalOverlay').style.display === 'flex'));
        check('words hidden while modal open', await page.evaluate(() => isWordListHidden === true));
        // Hold-to-peek via mouse
        const pb = await (await page.$('#btnPeekDraw')).boundingBox();
        await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
        await page.mouse.down(); await sleep(200);
        const peek = await page.evaluate(() => ({ d: document.getElementById('peekWordPill').style.display, t: document.getElementById('peekWordPill').textContent }));
        check('peek pill shows while held', peek.d === 'block', peek.d);
        check('peek pill shows selected word', peek.t.includes(selWord), `${peek.t} vs ${selWord}`);
        await page.mouse.up(); await sleep(200);
        check('peek pill hides on release', await page.evaluate(() => document.getElementById('peekWordPill').style.display === 'none'));
        await page.click('#btnCloseModalCanvasX'); await sleep(300);

        // Emoji modal + filter
        await forceTheme(page, 'theme-weight-vain-emojit');
        // need a fresh round with emoji theme — give up this turn, roll again
        await page.evaluate(() => window._devConfirmGiveUp()); await sleep(300);
        await roll(page);
        const th = await page.evaluate(() => currentActiveTheme);
        check('emoji theme rolled', th === 'vain emojit', th);
        await revealWords(page);
        await page.click('#wordList li'); await sleep(200);
        await page.click('#btnToolCanvas'); await sleep(400);
        check('emoji modal open', await page.evaluate(() => document.getElementById('emojiModalOverlay').style.display === 'flex'));
        // type mixed input -> letters/digits stripped
        await page.evaluate(() => {
            const ta = document.getElementById('emojiInputArea');
            ta.value = 'abc123 😀👍 x';
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const filtered = await page.evaluate(() => document.getElementById('emojiInputArea').value);
        check('emoji filter strips letters/digits', !/[a-zA-Z0-9]/.test(filtered) && filtered.includes('😀') && filtered.includes('👍'), JSON.stringify(filtered));
        // emoji peek
        const pe = await (await page.$('#btnPeekEmoji')).boundingBox();
        await page.mouse.move(pe.x + pe.width / 2, pe.y + pe.height / 2);
        await page.mouse.down(); await sleep(200);
        check('emoji peek shows word', await page.evaluate(() => document.getElementById('peekWordPill').style.display === 'block'));
        await page.mouse.up(); await sleep(200);
        check('emoji guessed btn has score text', await page.evaluate(() => /Arvattu oikein \(\+\d+p\)/.test(document.getElementById('btnEmojiGuessed').textContent)));
        await page.click('#btnCloseEmojiModalX'); await sleep(300);
        // Task 15: "Piilota sanat" poistettu — modaalin sulkeminen palauttaa sanat automaattisesti
        check('emoji modal closed, words auto-unhidden', await page.evaluate(() => isWordListHidden === false));
        await page.close();

        // ============ F. Victory modal + replay (2-round demo) ============
        console.log('== F. Victory modal ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-perusvaihtoehto');
        await page.select('#roundSelect', '2'); await sleep(100);
        await startBasicGame(page);
        // 2 rounds * 2 players = 4 turns -> guessed each time
        for (let i = 0; i < 4; i++) {
            await roll(page);
            // perusvaihtoehto shows words
            await revealWords(page).catch(() => {});
            await sleep(200);
            const hasWords = await page.evaluate(() => document.querySelectorAll('#wordList li').length > 0);
            if (hasWords) { await page.click('#btnGuessed'); }
            else { await page.evaluate(() => window._devConfirmGiveUp()); }
            await sleep(500);
        }
        await sleep(600);
        check('victory modal opens', await page.evaluate(() => document.getElementById('victoryModal').style.display === 'flex'));
        check('rankings rendered', await page.evaluate(() => document.querySelectorAll('#victoryRankings .victory-row').length === 2));
        check('winner row marked', await page.evaluate(() => document.querySelectorAll('#victoryRankings .victory-row.winner').length >= 1));
        check('no page reload (players still in DOM)', await page.evaluate(() => gamePlayers.length === 2));
        await page.click('#btnPlayAgain'); await sleep(400);
        check('scores reset after replay', await page.evaluate(() => gamePlayers.every(p => p.score === 0)));
        check('round reset to 1', await page.evaluate(() => currentRound === 1));
        check('game continues without reload', await page.evaluate(() => document.getElementById('victoryModal').style.display === 'none'));
        await page.close();

        // ============ G. Timer + localStorage persistence ============
        console.log('== G. Timer & storage ==');
        page = await newPage(browser, errors);
        await load(page);
        await forceTheme(page, 'theme-weight-pantomiimi');
        await page.evaluate(() => { window.setTimerSeconds(60); document.getElementById('timerInput').dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(200);
        await page.select('#roundSelect', '5'); await sleep(200);
        check('settings saved to localStorage', await page.evaluate(() => {
            const s = JSON.parse(localStorage.getItem('arksanum-settings-v1') || 'null');
            return s && s.timer === '60' && s.rounds === '5';
        }));
        await startBasicGame(page);
        await roll(page);
        check('timer hidden before words', await page.evaluate(() => document.getElementById('turnTimer').style.display === 'none'));
        await revealWords(page);
        check('timer bar visible after words', await page.evaluate(() => document.getElementById('turnTimer').style.display === 'block'));
        await sleep(1200);
        const fillW = await page.evaluate(() => parseFloat(document.getElementById('turnTimerFill').style.width));
        check('timer counting down', fillW < 99 && fillW > 50, fillW);
        await page.evaluate(() => window._devConfirmGiveUp()); await sleep(400);
        check('timer stops after turn', await page.evaluate(() => document.getElementById('turnTimer').style.display === 'none'));

        // Persistence across reload (merkitse että localStorage säilytetään)
        await page.evaluate(() => sessionStorage.setItem('__keepLS', '1'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction('typeof wordsReady !== "undefined"', { timeout: 10000 });
        await page.evaluate(() => wordsReady.then(() => window.__w2 = true));
        await page.waitForFunction('window.__w2 === true', { timeout: 20000 });
        await sleep(600);
        check('timer restored after reload', await page.evaluate(() => document.getElementById('timerInput').value === '60'));
        check('rounds restored after reload', await page.evaluate(() => document.getElementById('roundSelect').value === '5'));
        await page.close();

        // ============ Console errors ============
        console.log('== Console errors ==');
        check('zero console/page errors', errors.length === 0, '\n    ' + errors.join('\n    '));

        console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
        process.exitCode = fail ? 1 : 0;
    } finally {
        await browser.close();
    }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
