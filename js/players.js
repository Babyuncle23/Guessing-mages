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
        playClickSound();

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

            document.getElementById('startGameBtn').disabled = true;
            document.getElementById('startGameBtn').textContent = "Valitse hahmot";
            return;
        }

        if (setupOrder.length < 2) {
            setupOrder.push(name);
            if (setupOrder.length === 1) card.classList.add('selected-first');
            if (setupOrder.length === 2) card.classList.add('selected-second');

            if (setupOrder.length === 2) {
                document.getElementById('startGameBtn').disabled = false;
                document.getElementById('startGameBtn').textContent = "Määritä loitsujesi määrä";
            }
        }
    });
});