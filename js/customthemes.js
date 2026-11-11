// js/customthemes.js — pelaajien omat selitysehdot ("Omat ehdot").
// Oma ehto = nimi + sääntö + valinnainen emoji + painostepperi.
// Rekisteröityy samaan themes/themeImages/themeDescriptions-pooliin kuin
// sisäänrakennetut teemat → toimii arvonnassa, rummussa ja arvaajan näytöllä
// ilman erikoislogiikkaa. Persistenssi: localStorage (storage.js) ja
// huonesynkka isännän SETTINGS-viestillä (network.js).
window.customThemesApi = (() => {
    const MAX_CUSTOM = 15;
    const customs = [];            // [{name, desc, emoji}]
    const customSet = new Set();   // nimet O(1)-tarkistuksiin (customThemesApi.has)

    // Sama slug kuin getThemeWeightsFromUI — muuten paino-input ei löydy
    const slug = (t) => (typeof window.themeSlug === 'function')
        ? window.themeSlug(t)
        : t.toLowerCase().replace(/\s+/g, '-').replace(/ä/g, 'a').replace(/ö/g, 'o');

    const sanitizeName = (raw) => (raw || '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N} \-]/gu, '')   // kirjaimet (åäö ok), numerot, välit, viiva
        .slice(0, 24);                        // rummun hub ja kortti eivät siedä pitkää

    // Sääntö ja emoji ovat pelkkää tekstiä — kulmassulut pois, koska
    // themeDescriptions renderöidään innerHTML:llä apumodaalissa (myös verkon yli)
    const stripMarkup = (s) => String(s || '').replace(/[<>]/g, '');

    const firstGrapheme = (s) => {
        const v = stripMarkup(s).trim();
        if (!v) return '✨';
        try {
            if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                const it = new Intl.Segmenter('fi', { granularity: 'grapheme' }).segment(v)[Symbol.iterator]().next();
                if (!it.done) return it.value.segment;
            }
        } catch (e) {}
        return Array.from(v)[0] || '✨';
    };

    const grid = () => document.getElementById('customThemesGrid');

    // Avoin haitari laskee maxHeightn avaushetkellä — päivitetään, kun kortteja
    // tulee/menee, ettei uusi sisältö leikkaundu
    const refreshAccordion = () => {
        const g = grid();
        const acc = g && g.closest('.accordion-content');
        if (acc && acc.classList.contains('open')) {
            acc.style.maxHeight = acc.scrollHeight + 'px';
        }
    };

    const showError = (msg) => {
        const el = document.getElementById('customThemeError');
        if (!el) return;
        el.textContent = msg || '';
        if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3200);
    };

    const afterChange = () => {
        if (typeof window.saveGameSettings === 'function') window.saveGameSettings();
        if (typeof window.netBroadcastSettings === 'function') window.netBroadcastSettings();
    };

    // --- Rekisteri: oma teema elää samoissa rakenteissa kuin sisäänrakennetut ---
    const register = (ct) => {
        if (!themes.includes(ct.name)) themes.push(ct.name);
        themeImages[ct.name] = ct.emoji || '✨';
        themeDescriptions[ct.name] = ct.desc || `✨ ${ct.name}`;
        customSet.add(ct.name);
    };

    const unregister = (name) => {
        const i = themes.indexOf(name);
        if (i >= 0) themes.splice(i, 1);
        delete themeImages[name];
        delete themeDescriptions[name];
        customSet.delete(name);
        const j = customs.findIndex(c => c.name === name);
        if (j >= 0) customs.splice(j, 1);
        document.getElementById('card-' + slug(name))?.remove();
    };

    // --- Kortin rakentaja: sama .theme-card-rakenne + poisto-✕ ---
    const buildCard = (ct) => {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.id = 'card-' + slug(ct.name);
        card.innerHTML = `
            <div class="theme-card-info">
                <span class="theme-card-emoji">${ct.emoji || '✨'}</span>
                <span class="theme-card-name"></span>
                <span class="theme-setting-help" data-theme-key="">Säännöt (?)</span>
                <button type="button" class="custom-theme-del" title="Poista ehto" aria-label="Poista ehto">✕</button>
            </div>
            <div class="stepper-controls">
                <button type="button" class="stepper-btn minus">−</button>
                <input type="number" class="theme-weight-input" min="0" max="99">
                <button type="button" class="stepper-btn plus">+</button>
            </div>`;
        card.querySelector('.theme-card-name').textContent = ct.name;
        const help = card.querySelector('.theme-setting-help');
        help.dataset.themeKey = ct.name;
        const input = card.querySelector('.theme-weight-input');
        input.id = 'theme-weight-' + slug(ct.name);
        input.value = 1;
        input.dataset.defaultValue = 1;   // Palauta oletukset → oma ehto palaa painoon 1
        input.dataset.savedValue = 1;
        card.querySelector('.custom-theme-del').addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof playClickSound === 'function') playClickSound();
            api.removeTheme(ct.name);
        });
        if (typeof window.bindThemeStepperCard === 'function') window.bindThemeStepperCard(card);
        if (typeof window.bindThemeHelpBtn === 'function') window.bindThemeHelpBtn(help);
        return card;
    };

    const validate = (name) => {
        if (name.length < 2) return 'Nimi puuttuu tai on liian lyhyt';
        if (customs.length >= MAX_CUSTOM) return `Enintään ${MAX_CUSTOM} omaa ehtoa`;
        const nameTaken = themes.some(t => t.toLowerCase() === name.toLowerCase())
            || !!document.getElementById('theme-weight-' + slug(name)); // slug-kolliisiö
        if (nameTaken) return 'Ehto on jo listalla';
        if (typeof forbiddenSet !== 'undefined' && forbiddenSet.has(name.toLowerCase()))
            return 'Ei sallittu sana';
        return null;
    };

    const api = {
        has: (name) => customSet.has(name),
        list: () => customs.map(c => ({ name: c.name, desc: c.desc, emoji: c.emoji })),

        addTheme(raw) {
            const name = sanitizeName(raw && raw.name);
            const err = validate(name);
            if (err) { showError(err); return false; }
            const ct = {
                name,
                desc: stripMarkup(raw && raw.desc).trim().slice(0, 160),
                emoji: firstGrapheme(raw && raw.emoji)
            };
            customs.push(ct);
            register(ct);
            const g = grid();
            if (g) g.appendChild(buildCard(ct));
            refreshAccordion();
            if (typeof playClickSound === 'function') playClickSound();
            afterChange();
            return true;
        },

        removeTheme(name) {
            if (!customSet.has(name)) return;
            unregister(name);
            refreshAccordion();
            afterChange();
        },

        // Täysi korvaus listalla — localStorage-restore ja SETTINGS-synkka
        setAll(list) {
            [...customs].forEach(c => unregister(c.name));
            const g = grid();
            (Array.isArray(list) ? list : []).forEach(raw => {
                const name = sanitizeName(raw && raw.name);
                if (name.length < 2 || customSet.has(name) || customs.length >= MAX_CUSTOM) return;
                const ct = {
                    name,
                    desc: stripMarkup(raw && raw.desc).trim().slice(0, 160),
                    emoji: firstGrapheme(raw && raw.emoji)
                };
                customs.push(ct);
                register(ct);
                if (g) g.appendChild(buildCard(ct));
            });
            refreshAccordion();
        }
    };
    return api;
})();

// --- Lomake: Lisää ehto ---
window.addEventListener('DOMContentLoaded', () => {
    const nameEl = document.getElementById('customThemeName');
    const descEl = document.getElementById('customThemeDesc');
    const emojiEl = document.getElementById('customThemeEmoji');
    const btn = document.getElementById('btnAddCustomTheme');
    if (!btn || !nameEl) return;

    const submit = () => {
        const ok = window.customThemesApi.addTheme({
            name: nameEl.value,
            desc: descEl ? descEl.value : '',
            emoji: emojiEl ? emojiEl.value : ''
        });
        if (ok) {
            nameEl.value = '';
            if (descEl) descEl.value = '';
            if (emojiEl) emojiEl.value = '';
            nameEl.focus();
        }
    };
    btn.addEventListener('click', submit);
    [nameEl, descEl, emojiEl].forEach(el => el && el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
    }));
});
