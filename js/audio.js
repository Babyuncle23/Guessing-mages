// Kaikki ääniin liittyvä alustus ja soittorutiinit.

// Äänijärjestelmä
const sounds = {
    flip: new Audio("sounds/freesound_community-flipcard-91468.mp3"),
    drum: new Audio("sounds/Hollywoodedge,_Snare_Drum_Roll_End_CRT042801.ogg"),
    druid: new Audio("sounds/universfield-magic-03-278824.mp3"),
    click: new Audio("sounds/freesound_community-ui-click-43196.mp3"),
    book: new Audio("sounds/creatorshome-turn-a-page-336933.mp3"),
    morph: new Audio("sounds/universfield-horror-liquid-splash-352472.mp3"),
    curse: new Audio("sounds/yodguard-dark-spell-chant-3-533018.mp3"),
    success: new Audio("sounds/universfield-game-level-complete-143022.mp3"),
    fail: new Audio("sounds/freesound_community-fart-83471.mp3"),
    diceRollSound: new Audio("sounds/u_qpfzpydtro-dice-142528.mp3")
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
