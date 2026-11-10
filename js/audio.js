// Kaikki ääniin liittyvä alustus ja soittorutiinit.

// Äänenvoimakkuudet normalisoitu per tiedosto (mitattu RMS ~ -22 dB tavoite;
// kuumimmat tehosteet vaimennettu, hiljempiä ei vahvisteta).
const SOUND_VOLUMES = {
    "sounds/scream.ogg": 0.49,        // rms -15.7 dB → -6.3 dB
    "sounds/drawingGhost.ogg": 0.53,  // -16.5 → -5.5
    "sounds/shh.mp3": 0.54,           // -16.7 → -5.3
    "sounds/curse.mp3": 0.66,         // -18.4 → -3.6
    "sounds/buzzerNoNouns.mp3": 0.66, // -18.4 → -3.6
    "sounds/reverse.mp3": 0.79,       // -19.9 → -2.1
    "sounds/throat.mp3": 0.90,        // -21.1 → -0.9
    "sounds/drum.ogg": 0.92,          // -21.2 → -0.8
    "sounds/spanish.mp3": 0.96,       // -21.6 → -0.4
    "sounds/buzzerNoVerbs.mp3": 0.98, // -21.8 → -0.2
    "sounds/harp.mp3": 0.99           // -21.9 → -0.1
};

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

// Asetetaan per-tiedosto voimakkuudet
Object.values(sounds).forEach(audio => {
    const url = audio.getAttribute('src');
    if (url in SOUND_VOLUMES) audio.volume = SOUND_VOLUMES[url];
});

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
// Пул переиспользуемых Audio-инстансов: по одному на URL, перематываем в начало вместо new Audio().
const themeEffectPool = {};

window.playThemeEffect = (audioUrl) => {
    if (!audioUrl) return;

    let effect = themeEffectPool[audioUrl];
    if (!effect) {
        effect = new Audio(audioUrl);
        effect.volume = SOUND_VOLUMES[audioUrl] ?? 1.0;
        effect.preload = "auto";
        themeEffectPool[audioUrl] = effect;
    }

    effect.currentTime = 0;
    effect.play().catch(err => console.log("Audio play error:", err));
};