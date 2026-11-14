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

// --- WEB AUDIO: salamanopea UI-palaute ilman seek/decode-viivettä ---
// AudioContext luodaan heti (tila 'suspended' ennen ensimmäistä käyttäjäelettä,
// mutta decodeAudioData toimii silti) → puskurit ovat valmiina ensimmäiseen
// klikkaukseen mennessä. resume() ajetaan pointerdown:issa.
let uiAudioCtx = null;
const uiBuffers = {};
const UI_BUFFER_SOUNDS = ["sounds/click.mp3", "sounds/flip.mp3", "sounds/book.mp3"];

// Resume + ääniputken "lämmitys" äänettömällä puskurilla: eka klikki
// ei myöhästy, koska output-putki on jo hereillä.
let uiPrimed = false;
const resumeUIAudio = () => {
    if (!uiAudioCtx || uiAudioCtx.state !== 'suspended') return;
    uiAudioCtx.resume().then(() => {
        if (uiPrimed || !uiAudioCtx || uiAudioCtx.state !== 'running') return;
        uiPrimed = true;
        try {
            const src = uiAudioCtx.createBufferSource();
            src.buffer = uiAudioCtx.createBuffer(1, 1, 22050);
            src.connect(uiAudioCtx.destination);
            src.start(0);
        } catch (e) {}
    }).catch(() => {});
};

try {
    uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    UI_BUFFER_SOUNDS.forEach(url => {
        fetch(url)
            .then(r => r.arrayBuffer())
            .then(b => uiAudioCtx.decodeAudioData(b))
            .then(buf => { uiBuffers[url] = buf; })
            .catch(() => {});
    });
    document.addEventListener('pointerdown', resumeUIAudio);
    // Capture-vaihe: resume käynnistyy jo eleen alussa → touchend-klikki
    // ehtii toistua viipymättä (mobiilin eka soitto herättää ääniputken).
    document.addEventListener('touchstart', resumeUIAudio, { capture: true, passive: true });
} catch (e) {
    uiAudioCtx = null;
}

// Yrittää toistaa äänen dekoodatusta puskurista (~0 ms latency).
// Palauttaa false jos puskuria ei ole tai ctx ei vielä 'running' → fallback HTMLAudioon.
const tryPlayBuffered = (audioObject) => {
    if (!uiAudioCtx || uiAudioCtx.state !== 'running') return false;
    const buf = uiBuffers[audioObject.getAttribute('src')];
    if (!buf) return false;
    const src = uiAudioCtx.createBufferSource();
    const gain = uiAudioCtx.createGain();
    gain.gain.value = audioObject.volume;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(uiAudioCtx.destination);
    src.start(0);
    return true;
};

// --- ÄÄNEN PÄÄLLÄ/POIS -KYTKIN ---
// Oletus: äänet päällä vain paikallispelissä ja huoneen isännällä —
// vieraan puhelin on oletuksena hiljainen. Käyttäjän valinta säilytetään
// sessionStoragessa (per-välilehti!) — localStorage olisi yhteinen kaikille
// saman selaimen välilehdille ja yhden pelaajan mykistys vaikuttaisi muihin.
const SOUND_PREF_KEY = 'arksanum-sound';
const isSoundOn = () => {
    const pref = sessionStorage.getItem(SOUND_PREF_KEY);
    if (pref !== null) return pref === '1';
    return typeof window.soundDefaultOn === 'function' ? window.soundDefaultOn() : true;
};
window.isSoundOn = isSoundOn;

// Sammuttaa kaiken parhaillaan soivan äänen (myös teemaefektit).
const stopAllSounds = () => {
    Object.values(sounds).forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
    Object.values(themeEffectPool).forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
};

const updateSoundBtn = () => {
    const btn = document.getElementById('soundToggleBtn');
    if (!btn) return;
    const on = isSoundOn();
    btn.textContent = on ? '🔊' : '🔇';
    btn.classList.toggle('muted', !on);
    const label = on ? 'Ääni päällä — poista äänet' : 'Äänet pois — laita äänet päälle';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', String(on));
};
window.updateSoundBtn = updateSoundBtn;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
        const on = !isSoundOn();
        sessionStorage.setItem(SOUND_PREF_KEY, on ? '1' : '0');
        if (!on) stopAllSounds();
        else resumeUIAudio();
        updateSoundBtn();
        if (typeof playClickSound === 'function' && on) playClickSound();
    });
    updateSoundBtn();
});

// Toimintavarma äänirutiini selainestoja vastaan
const playAudio = (audioObject, startTime = 0) => {
    if (!audioObject || !isSoundOn()) return;
    if (startTime === 0 && tryPlayBuffered(audioObject)) return;
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
    if (!audioUrl || !isSoundOn()) return;

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