//Pelin teemat, niiden kuvat ja niihin liittyvät uniikit äänitiedostot.
const themes = [
    "pantomiimi", "piirtäminen", "näkymätön muste", "espanja", "englanniksi", "ilman verbejä", "ilman substantiiveja", "vastakohdan kautta", "elokuva", "perusvaihtoehto", "vapaavalintainen", "vain emojit"
];

const themeWeights = {
    "pantomiimi": 3,
    "piirtäminen": 3,
    "espanja": 1,
    "englanniksi": 1,
    "ilman verbejä": 1,
    "ilman substantiiveja": 1,
    "vastakohdan kautta": 1,
    "elokuva": 1,
    "perusvaihtoehto": 1,
    "vapaavalintainen": 1,
    "näkymätön muste": 0,
    "vain emojit": 1
};

const themeImages = {
    "pantomiimi": "🎭",
    "piirtäminen": "🖌️",
    "espanja": "🇪🇸",
    "englanniksi": "🇬🇧",
    "ilman verbejä": "🚫🔁",
    "ilman substantiiveja": "🚫📦",
    "vastakohdan kautta": "↔️",
    "elokuva": "🎬",
    "perusvaihtoehto": "❓",
    "vapaavalintainen": "✳️",
    "näkymätön muste": "👻", // <-- ДОБАВИТЬ ЭТО
    "vain emojit": "📱"      // <-- И ЭТО
};

const themeSounds = {
    "pantomiimi": "sounds/shh.mp3",
    "piirtäminen": "sounds/drawing.ogg",
    "espanja": "sounds/spanish.mp3",
    "englanniksi": "sounds/english.mp3",
    "ilman verbejä": "sounds/buzzerNoVerbs.mp3",
    "ilman substantiiveja": "sounds/buzzerNoNouns.mp3",
    "vastakohdan kautta": "sounds/reverse.mp3",
    "elokuva": "sounds/scream.ogg",
    "perusvaihtoehto": "sounds/throat.mp3",
    "vapaavalintainen": "sounds/harp.mp3",
    "näkymätön muste": "sounds/drawingGhost.ogg", 
    "vain emojit": "sounds/typing.mp3"
};

const themeDescriptions = {
    "pantomiimi": "🎭 Pantomiimi: Sanojen puhuminen ja äänteiden päästäminen on täysin kielletty. Käytä vain kehon kieltä, ilmeitä ja eleitä kuvaillaksesi sanaa.",
    "piirtäminen": "🖌️ Piirtäminen: Selitä sana piirtämällä se alustalle. Et saa puhua, kirjoittaa kirjaimia, numeroita tai käyttää eleitä.",
    "espanja": "Käännä sana suoraan espanjaksi, käytä espanjalaisia lauseita tai selitä käsite espanjan kielellä.",
    "englanniksi": "Selitä sana käyttämällä vain englannin kieltä.",
    "ilman verbejä": "Tekemistä kuvaavat sanat on kielletty. Keskity kuvailemaan asioiden ulkonäköä, värejä, kokoa ja sijaintia.",
    "ilman substantiiveja": "Esineiden ja asioiden nimet on kielletty. Keskity kuvailemaan pelkkää toimintaa – mitä asialla tehdään.",
    "vastakohdan kautta": "↔️ Vastakohdan kautta: Sinun täytyy selittää sana kuvailemalla sen täydellistä vastakohtaa tai kieltämällä vastakohta.",
    "elokuva": "Sido sana johonkin elokuvaan, jonka arvaaja tietää.",
    "perusvaihtoehto": "Vastustaja valitsee arvattavan sanan numeron listalta listaa katsomatta. Sinun täytyy selittää suullisesti juuri se sana.",
    "vapaavalintainen": "Keksi sana kokonaan itse omassa mielessäsi",
    "näkymätön muste": "👻 Näkymätön muste: Piirrä sana alustalle, mutta varo – muste katoaa hetken kuluttua!",
    "vain emojit": "📱 Vain emojit: Kirjoita puhelimen näppäimistöllä pelkkiä emojeita kuvaillaksesi sanaa."
};