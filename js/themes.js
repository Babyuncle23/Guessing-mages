//Pelin teemat, niiden kuvat ja niihin liittyvät uniikit äänitiedostot.
const themes = [
    "pantomiimi", "piirtäminen", "espanja", "ilman verbejä", "ilman substantiiveja", "vastakohdan kautta", "elokuva", "perusvaihtoehto", "vapaavalintainen"
];

const themeWeights = {
    "pantomiimi": 3,
    "piirtäminen": 3,
    "espanja": 1,
    "ilman verbejä": 1,
    "ilman substantiiveja": 1,
    "vastakohdan kautta": 1,
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
    "elokuva": "sounds/Wilhelm_Scream_1.ogg",
    "perusvaihtoehto": "",
    "vapaavalintainen": ""
};

const NON_VERBAL_THEMES = ["pantomiimi", "piirtäminen"];
const VERBAL_THEMES = ["espanja", "ilman verbejä", "ilman substantiiveja", "vastakohdan kautta", "elokuva"];

const themeDescriptions = {
    "pantomiimi": "🎭 Pantomiimi: Sanojen puhuminen ja äänteiden päästäminen on täysin kielletty. Käytä vain kehon kieltä, ilmeitä ja eleitä kuvaillaksesi sanaa.",
    "piirtäminen": "🖌️ Piirtäminen: Selitä sana piirtämällä se alustalle. Et saa puhua, kirjoittaa kirjaimia, numeroita tai käyttää eleitä.",
    "espanja": "Käännä sana suoraan espanjaksi, käytä espanjalaisia lauseita tai selitä käsite espanjan kielellä.",
    "ilman verbejä": "Tekemistä kuvaavat sanat on kielletty. Keskity kuvailemaan asioiden ulkonäköä, värejä, kokoa ja sijaintia.",
    "ilman substantiiveja": "Esineiden ja asioiden nimet on kielletty. Keskity kuvailemaan pelkkää toimintaa – mitä asialla tehdään.",
    "vastakohdan kautta": "↔️ Vastakohdan kautta: Sinun täytyy selittää sana kuvailemalla sen täydellistä vastakohtaa tai kieltämällä vastakohta.",
    "elokuva": "Sido sana johonkin elokuvaan, jonka arvaaja tietää.",
    "perusvaihtoehto": "Vastustaja valitsee arvattavan sanan numeron listalta listaa katsomatta. Sinun täytyy selittää suullisesti juuri se sana.",
    "vapaavalintainen": "Keksi sana kokonaan itse omassa mielessäsi"
};