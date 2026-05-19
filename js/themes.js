//Pelin teemat, niiden kuvat ja niihin liittyvät uniikit äänitiedostot.
const themes = [
    "pantomiimi", "piirtäminen", "espanja", "ilman verbejä", "ilman substantiiveja", "vastakohdan kautta", "kaksi ehtoa", "elokuva", "perusvaihtoehto", "vapaavalintainen"
];

const themeWeights = {
    "pantomiimi": 3,
    "piirtäminen": 3,
    "espanja": 1,
    "ilman verbejä": 1,
    "ilman substantiiveja": 1,
    "vastakohdan kautta": 1,
    "kaksi ehtoa": 1,
    "elokuva": 1,
    "perusvaihtoehto": 1,
    "vapaavalintainen": 1
};

const themeImages = {
    "pantomiimi": "🎭",
    "piirtäminen": "🖌️",
    "espanja": "🇪🇸",
    "ilman verbejä": "🚫🔁",
    "ilman substantiiveja": "🚫📦",
    "vastakohdan kautta": "↔️",
    "kaksi ehtoa": "2️⃣",
    "elokuva": "🎬",
    "perusvaihtoehto": "❓",
    "vapaavalintainen": "✳️"
};

const themeSounds = {
    "pantomiimi": "",
    "piirtäminen": "sounds/Unknown_Crayon_Drawing_Sound.ogg",
    "espanja": "",
    "ilman verbejä": "",
    "ilman substantiiveja": "",
    "vastakohdan kautta": "",
    "kaksi ehtoa": "sounds/Bruh_Sound_Effect.ogg",
    "elokuva": "sounds/Wilhelm_Scream_1.ogg",
    "perusvaihtoehto": "",
    "vapaavalintainen": ""
};

const NON_VERBAL_THEMES = ["pantomiimi", "piirtäminen"];
const VERBAL_THEMES = ["espanja", "ilman verbejä", "ilman substantiiveja", "vastakohdan kautta", "elokuva"];

