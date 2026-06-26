const charImages = {
    "Muodonmuuttaja": "🐺",
    "Kirouksenlangettaja": "💀",
    "Yrttitarhuri": "🌿"
};

let setupOrder = [];
let gamePlayers = [];

// Hahmojen valinta käyttöliittymässä
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        const name = card.dataset.char;
        if (typeof playClickSound === 'function') playClickSound();

        const magicToggle = document.getElementById('magicToggle');
        const isMagicMode = magicToggle && magicToggle.checked;

        if (setupOrder.includes(name)) {
            setupOrder = setupOrder.filter(item => item !== name);
            card.classList.remove('selected-first', 'selected-second');

            setupOrder.forEach((charName, index) => {
                const remainsCard = document.querySelector(`.char-card[data-char="${charName}"]`);
                if (remainsCard) {
                    remainsCard.classList.remove('selected-first', 'selected-second');
                    if (index === 0) remainsCard.classList.add('selected-first');
                }
            });

            if (isMagicMode) {
                document.getElementById('startGameBtn').disabled = true;
                document.getElementById('startGameBtn').textContent = "VALITKAA 2 HAHMOA"; 
                document.getElementById('startGameBtn').style.background = "#5b21b6";
            }
            return;
        }

        if (setupOrder.length < 2) {
            setupOrder.push(name);
            if (setupOrder.length === 1) card.classList.add('selected-first');
            if (setupOrder.length === 2) card.classList.add('selected-second');

            if (setupOrder.length === 2 && isMagicMode) {
                document.getElementById('startGameBtn').disabled = false;
                document.getElementById('startGameBtn').textContent = "ALOITA TAIKAPELI"; 
                document.getElementById('startGameBtn').style.background = "#5b21b6";
            }
        }
    });
});

// UUSI: Taikatilan kytkimen logiikka
window.addEventListener('DOMContentLoaded', () => {
    const magicToggle = document.getElementById('magicToggle');
    const charBlock = document.getElementById('characterSelectionBlock');
    const startBtn = document.getElementById('startGameBtn');

    if (magicToggle && charBlock && startBtn) {
        magicToggle.addEventListener('change', (e) => {
            if (typeof playClickSound === 'function') playClickSound();
            
            if (e.target.checked) {
                charBlock.style.display = 'block';
                // Tarkistetaan onko jo valittu 2 hahmoa
                if (setupOrder.length === 2) {
                    startBtn.disabled = false;
                    startBtn.textContent = "ALOITA TAIKAPELI";
                    startBtn.style.background = "#5b21b6"; 
                } else {
                    startBtn.disabled = true;
                    startBtn.textContent = "VALITKAA 2 HAHMOA";
                    startBtn.style.background = "#5b21b6";
                }
            } else {
                charBlock.style.display = 'none';
                startBtn.disabled = false;
                startBtn.textContent = "ALOITA PERUSPELI";
                startBtn.style.background = "#27ae60"; // Vihreä peruspeliin
            }
        });
    }
});