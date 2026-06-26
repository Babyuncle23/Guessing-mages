// Kaikki ääniin liittyvä alustus ja soittorutiinit.

// Äänijärjestelmä (uudet yksinkertaiset nimet)
const sounds = {
    flip: new Audio("sounds/flip.mp3"),
    drum: new Audio("sounds/drum.ogg"),
    druid: new Audio("sounds/druid.mp3"),
    click: new Audio("sounds/click.mp3"),
    book: new Audio("sounds/book.mp3"),
    morph: new Audio("sounds/morph.mp3"),
    curse: new Audio("sounds/curse.mp3"),
    success: new Audio("sounds/success.mp3"),
    fail: new Audio("sounds/fail.mp3"),
    gameWin: new Audio("sounds/gameWin.mp3")
};

// Esiladataan kaikki äänitiedostot
Object.values(sounds).forEach(audio => {
    audio.preload = "auto";
    audio.load();
});

// Toimintavarma äänirutiini selainestoja vastaan
const playAudio = (audioObject, startTime = 0) => {
    if (!audioObject) return;
    audioObject.currentTime = startTime;
    const playPromise = audioObject.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("Selain estää äänentoiston. Odottaa klikkausta ruutuun.", error);
        });
    }
};

const playClickSound = () => {
    playAudio(sounds.click);
};

// --- YKSINKERTAISTETTU SOITIN TEEMOILLE ---
// Kaikki feidaukset ja äänenvoimakkuudet on säädetty valmiiksi audiotiedostoissa (Studio One)
window.playThemeEffect = (audioUrl) => {
    if (!audioUrl) return;

    const effect = new Audio(audioUrl);
    effect.volume = 1.0; 

    effect.play().catch(err => console.log("Audio play error:", err));
};