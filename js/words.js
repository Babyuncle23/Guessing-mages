const forbiddenWords = ["eivät", "kuin", "kasvattajaseura", "syksymmäksi"];
let allWords = [];
let commonWords = [];
let usedWordsInThisGame = [];

const parseWords = (text) =>
    text.split(/[,\n]/).map(w => w.trim()).filter(w => w.length >= 3 && !forbiddenWords.includes(w.toLowerCase()));

fetch('words/kaikkisanat.txt').then(res => res.text()).then(d => allWords = parseWords(d)).catch(e => console.log("kaikkisanat.txt failed:", e));
fetch('words/yleisetsanat.txt').then(res => res.text()).then(d => commonWords = parseWords(d)).catch(e => console.log("yleisetsanat.txt failed:", e));

