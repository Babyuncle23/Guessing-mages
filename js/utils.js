//Tänne sijoitetaan yleiskäyttöiset pikkufunktiot, jotka eivät riipu pelin tilasta.
const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

// --- SCREEN WAKE LOCK: näyttö ei sammu itsestään pelin aikana ---
// wakeKeep=true kun peli käynnissä → requestWakeLock() hakee lukon
// (selain vapauttaa sen automaattisesti kun sivu menee piiloon —
// visibilitychange visible -käsittelijä pyytää sen uudelleen).
// Ei tuettu vanhoilla Safari-/selaimilla tai ilman HTTPS:ää → hiljainen no-op.
let _wakeLock = null;
window.wakeKeep = false;
window.requestWakeLock = async () => {
    if (!('wakeLock' in navigator) || _wakeLock) return;
    try {
        _wakeLock = await navigator.wakeLock.request('screen');
        _wakeLock.addEventListener('release', () => { _wakeLock = null; });
    } catch (e) {}
};
window.releaseWakeLock = () => {
    try { if (_wakeLock) _wakeLock.release(); } catch (e) {}
    _wakeLock = null;
};