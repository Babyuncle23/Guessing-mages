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

            // Если убрали выделение и осталось меньше 2 персонажей — пишем крупно:
            document.getElementById('startGameBtn').disabled = true;
            document.getElementById('startGameBtn').textContent = "VALITKAA 2 HAHMOA"; 
            return;
        }

        if (setupOrder.length < 2) {
            setupOrder.push(name);
            if (setupOrder.length === 1) card.classList.add('selected-first');
            if (setupOrder.length === 2) card.classList.add('selected-second');

            // Только когда выбрано ровно 2 персонажа, текст меняется на запуск игры:
            if (setupOrder.length === 2) {
                document.getElementById('startGameBtn').disabled = false;
                document.getElementById('startGameBtn').textContent = "ALOITA PELI"; 
            }
        }
    });
});