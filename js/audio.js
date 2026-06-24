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
    fail: new Audio("sounds/soundshelfstudio-ui-loading-end-fail-522858.mp3"),
    gameWin: new Audio("sounds/puyopuyomegafan1234-winner-game-sound-404167.mp3")
};

sounds.drum.volume = 0.3;

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

// --- УМНЫЙ ПЛЕЕР ДЛЯ ЗВУКОВ ТЕМ (с затиханием и таймерами) ---
window.playThemeEffect = (audioUrl) => {
    if (!audioUrl) return;

    const effect = new Audio(audioUrl);
    let maxVolume = 1.0;
    let startTime = 0; // в секундах

    // Условие 1: Сделать buzzer в два раза тише и начать на 0.5 сек раньше
    if (audioUrl.includes("eritnhut1992-buzzer-or-wrong-answer-20582")) {
        maxVolume = 0.5;
        startTime = 0.5;
    } 
    // Условие 2: Сделать ding начать на 0.5 сек раньше
    else if (audioUrl.includes("freesound_community-ding-idea-40142")) {
        startTime = 0.5;
    }

    effect.volume = maxVolume;

    // Запускаем звук и мгновенно перематываем его, если задан startTime
    effect.play().then(() => {
        if (startTime > 0) effect.currentTime = startTime;
    }).catch(err => console.log("Audio play error:", err));

    // Условие 3 & 4: Лимит 3 секунд и плавное затихание (fade-out)
    const maxDuration = 3000;  // 3 секунд максимум
    const fadeDuration = 1000; // Последние 1 секунды звук будет затихать

    setTimeout(() => {
        const steps = 20; // Количество шагов затихания
        const volumeStep = maxVolume / steps;

        const fadeInterval = setInterval(() => {
            if (effect.volume > volumeStep) {
                effect.volume -= volumeStep;
            } else {
                effect.volume = 0; // Полная тишина
                effect.pause();    // Останавливаем файл
                clearInterval(fadeInterval);
            }
        }, fadeDuration / steps);
    }, maxDuration - fadeDuration);
};
