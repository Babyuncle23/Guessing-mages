const charImages = {
    "Muodonmuuttaja": "🐺",
    "Kirouksenlangettaja": "💀",
    "Yrttitarhuri": "🌿"
};

let setupOrder = [];
let gamePlayers = [];

// Сколько персонажей нужно выбрать при включённой магии
const requiredPicks = () => (playerMode === 3 ? 3 : 2);

const refreshSelectionClasses = () => {
    document.querySelectorAll('.char-card').forEach(c => {
        c.classList.remove('selected-first', 'selected-second', 'selected-third');
    });
    setupOrder.forEach((charName, index) => {
        const card = document.querySelector(`.char-card[data-char="${charName}"]`);
        if (!card) return;
        if (index === 0) card.classList.add('selected-first');
        else if (index === 1) card.classList.add('selected-second');
        else card.classList.add('selected-third');
    });
};

const updateCharSelectHint = () => {
    const hint = document.getElementById('charSelectHint');
    if (!hint) return;
    hint.textContent = playerMode === 3
        ? "Valitkaa kolme hahmoa. Valintajärjestys on vuorojärjestys — ensimmäiseksi valittu aloittaa!"
        : "Valitkaa kaksi eri hahmoa. Ensimmäiseksi valittu aloittaa pelin!";
};

// Pelimuodon valinta (2 / 3 / 4+). save=false kun palautetaan localStoragesta.
const setPlayerMode = (mode, save = true) => {
    playerMode = parseInt(mode, 10) || 2;
    document.body.dataset.mode = playerMode;
    document.querySelectorAll('.mode-option').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.mode, 10) === playerMode);
    });

    // Jos valittuja hahmoja on enemmän kuin moodi sallii, pudota ylimääräiset
    const magicToggle = document.getElementById('magicToggle');
    const maxPicks = (magicToggle && magicToggle.checked) ? requiredPicks() : Infinity;
    while (setupOrder.length > maxPicks) {
        setupOrder.pop();
    }
    refreshSelectionClasses();
    updateCharSelectHint();

    if (typeof window.refreshStartButton === 'function') window.refreshStartButton();
    if (save && typeof window.saveGameSettings === 'function') window.saveGameSettings();
};
window.setPlayerMode = setPlayerMode;

// Pelimuoto-painikkeiden kuuntelijat
document.querySelectorAll('.mode-option').forEach(btn => {
    btn.addEventListener('click', () => {
        if (typeof playClickSound === 'function') playClickSound();
        setPlayerMode(btn.dataset.mode);
    });
});

// Hahmojen valinta käyttöliittymässä
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        const name = card.dataset.char;
        if (typeof playClickSound === 'function') playClickSound();

        const magicToggle = document.getElementById('magicToggle');
        const isMagicMode = magicToggle && magicToggle.checked;
        if (!isMagicMode) return; // Hahmoja voi valita vain taikatilassa

        if (setupOrder.includes(name)) {
            setupOrder = setupOrder.filter(item => item !== name);
        } else if (setupOrder.length < requiredPicks()) {
            setupOrder.push(name);
        }
        refreshSelectionClasses();

        if (typeof window.refreshStartButton === 'function') window.refreshStartButton();
        if (typeof window.saveGameSettings === 'function') window.saveGameSettings();
    });
});

// Taikatilan kytkimen logiikka + oppaan automaattinen avaus
window.addEventListener('DOMContentLoaded', () => {
    const magicToggle = document.getElementById('magicToggle');
    const charBlock = document.getElementById('characterSelectionBlock');
    const startBtn = document.getElementById('startGameBtn');
    const guide = document.getElementById('magicGuide');
    const guideBtn = document.getElementById('magicGuideBtn');

    updateCharSelectHint();

    if (magicToggle && charBlock && startBtn) {
        magicToggle.addEventListener('change', (e) => {
            if (typeof playClickSound === 'function') playClickSound();
            charBlock.style.display = e.target.checked ? 'block' : 'none';

            // Avaa taikaopas automaattisesti kun taikahahmot kytketään päälle
            if (e.target.checked && guide && guideBtn && !guide.classList.contains('open')) {
                guide.classList.add('open');
                guideBtn.classList.add('active');
                guide.style.maxHeight = guide.scrollHeight + "px";
            }

            // Jos hahmoja on valittu enemmän kuin moodi vaatii, pudota ylimääräiset
            while (setupOrder.length > requiredPicks()) {
                setupOrder.pop();
            }
            refreshSelectionClasses();

            if (typeof window.refreshStartButton === 'function') window.refreshStartButton();
            if (typeof window.saveGameSettings === 'function') window.saveGameSettings();
        });
    }
});
