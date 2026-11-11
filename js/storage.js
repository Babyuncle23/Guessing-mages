// js/storage.js — peliasetusten tallennus localStorageen
// Tallennetaan: teemapainot, pelimuoto, taikakytkin, kierrosmäärä, ajastin
(function () {
    const STORAGE_KEY = 'arksanum-settings-v1';

    // --- Ajastin: liukusäädin (0–300) + numerokenttä (0–600), synkassa ---
    // Kaikki lukijat käyttävät getTimerSeconds() — ei enää select-elementtiä.
    window.getTimerSeconds = () => {
        const inp = document.getElementById('timerInput');
        const v = inp ? parseInt(inp.value, 10) : 0;
        return Math.min(600, Math.max(0, isNaN(v) ? 0 : v));
    };
    window.setTimerSeconds = (v) => {
        v = Math.min(600, Math.max(0, parseInt(v, 10) || 0));
        const inp = document.getElementById('timerInput');
        const rng = document.getElementById('timerRange');
        if (inp) inp.value = v;
        if (rng) rng.value = Math.min(300, v);
    };

    const collectSettings = () => {
        const weights = {};
        document.querySelectorAll('.theme-weight-input').forEach(input => {
            weights[input.id] = parseInt(input.value, 10) || 0;
        });

        const magicToggle = document.getElementById('magicToggle');
        const roundSelect = document.getElementById('roundSelect');

        return {
            weights,
            customs: typeof window.customThemesApi !== 'undefined' ? window.customThemesApi.list() : [],
            playerMode: typeof playerMode !== 'undefined' ? playerMode : 2,
            magic: magicToggle ? magicToggle.checked : false,
            rounds: roundSelect ? roundSelect.value : '7',
            timer: String(window.getTimerSeconds()),
            // Valitut hahmot muistetaan myös, jotta taikapeli on nopea aloittaa uudelleen
            setupOrder: typeof setupOrder !== 'undefined' ? [...setupOrder] : []
        };
    };

    window.saveGameSettings = () => {
        // Huonevieraalla isännän asetukset ovat totuus — niitä ei saa tallentaa
        // vieraan omiin asetuksiin (sotkisivat hänen paikallispelinsä).
        if (window.Net && Net.roomCode && !Net.isHost) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings()));
        } catch (e) {
            // localStorage voi olla pois käytöstä (yksityinen selaus) — ohitetaan hiljaa
        }
    };

    const applySavedSettings = () => {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        } catch (e) {
            return;
        }
        if (!saved || typeof saved !== 'object') return;

        // 1. Pelimuoto ensin (vaikuttaa vaadittujen hahmojen määrään)
        if (saved.playerMode && typeof window.setPlayerMode === 'function') {
            window.setPlayerMode(saved.playerMode, false);
        }

        // 1.5 Omat ehdot ENNEN painoja — korttien inputit pitää olla olemassa,
        //     jotta niiden painot voidaan palauttaa seuraavassa askeleessa
        if (Array.isArray(saved.customs) && typeof window.customThemesApi !== 'undefined') {
            window.customThemesApi.setAll(saved.customs);
        }

        // 2. Teemapainot takaisin inputteihin (stepperit ovat jo alustettu,
        //    koska storage.js latautuu rounds.js:n jälkeen)
        if (saved.weights && typeof saved.weights === 'object') {
            Object.entries(saved.weights).forEach(([inputId, val]) => {
                const input = document.getElementById(inputId);
                if (!input) return;
                const v = Math.max(0, parseInt(val, 10) || 0);
                input.value = v;
                input.dataset.savedValue = v;
                input.dispatchEvent(new Event('input'));
            });
        }

        // 3. Taikakytkin — simuloidaan change-tapahtuma, jotta UI päivittyy
        const magicToggle = document.getElementById('magicToggle');
        if (magicToggle && typeof saved.magic === 'boolean' && saved.magic !== magicToggle.checked) {
            magicToggle.checked = saved.magic;
            magicToggle.dispatchEvent(new Event('change'));
        }

        // 4. Kierrosmäärä ja ajastin
        const roundSelect = document.getElementById('roundSelect');
        if (roundSelect && saved.rounds) roundSelect.value = saved.rounds;
        if (saved.timer !== undefined) window.setTimerSeconds(saved.timer);

        // 5. Tallennetut hahmovalinnat takaisin (vain jos taikapeli päällä)
        if (saved.magic && Array.isArray(saved.setupOrder) && typeof setupOrder !== 'undefined') {
            const valid = ["Muodonmuuttaja", "Kirouksenlangettaja", "Yrttitarhuri"];
            setupOrder.length = 0;
            saved.setupOrder.forEach(n => { if (valid.includes(n)) setupOrder.push(n); });
            if (typeof refreshSelectionClasses === 'function') refreshSelectionClasses();
            if (typeof window.refreshStartButton === 'function') window.refreshStartButton();
        }
    };

    // Käynnistetään DOMContentLoaded-vaiheessa muiden alustusten jälkeen.
    // setTimeout takaa, että saman vaiheen muut kuuntelijat (esim. stepperien
    // alustus rounds.js:ssä) ehtivät valmiiksi ensin.
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(applySavedSettings, 0);

        // Automaattinen tallennus asetusmuutoksista
        const save = () => window.saveGameSettings();
        const roundSelect = document.getElementById('roundSelect');
        const magicToggle = document.getElementById('magicToggle');
        if (roundSelect) roundSelect.addEventListener('change', save);
        if (magicToggle) magicToggle.addEventListener('change', save);

        // Ajastimen kaksi ohjainta synkassa: liukusäädin päivittää numerokentän
        // lennosta, numerokenttä liukusäätimen (clamp 300 peukalolle). Tallennus
        // change-vaiheessa (range: vedon lopussa, number: blur/enter).
        const timerRange = document.getElementById('timerRange');
        const timerInput = document.getElementById('timerInput');
        if (timerRange) {
            timerRange.addEventListener('input', () => window.setTimerSeconds(timerRange.value));
            timerRange.addEventListener('change', save);
        }
        if (timerInput) {
            timerInput.addEventListener('input', () => {
                const v = parseInt(timerInput.value, 10);
                if (timerRange && !isNaN(v)) timerRange.value = Math.min(300, v);
            });
            timerInput.addEventListener('change', () => { window.setTimerSeconds(timerInput.value); save(); });
        }

        // Teemapainojen muutokset tallennetaan delegoidusti
        document.addEventListener('input', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('theme-weight-input')) {
                save();
            }
        });
    });
})();
