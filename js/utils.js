//Tänne sijoitetaan yleiskäyttöiset pikkufunktiot, jotka eivät riipu pelin tilasta.
const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

const checkThemesIncompatible = (c1, c2) => {
    if (c1 === c2) return true;
    if (NON_VERBAL_THEMES.includes(c1) && NON_VERBAL_THEMES.includes(c2)) return true;
    if (NON_VERBAL_THEMES.includes(c1) && VERBAL_THEMES.includes(c2)) return true;
    if (NON_VERBAL_THEMES.includes(c2) && VERBAL_THEMES.includes(c1)) return true;
    if ((c1 === "ilman verbejä" && c2 === "ilman substantiiveja") || (c1 === "ilman substantiiveja" && c2 === "ilman verbejä")) return true;
    if (c1 === "espanja" && (c2 === "ilman verbejä" || c2 === "ilman substantiiveja")) return true;
    if (c2 === "espanja" && (c1 === "ilman verbejä" || c1 === "ilman substantiiveja")) return true;
    return false;
};