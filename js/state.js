let currentRound = 1;
let totalTurns = 10;
let turnsInCurrentRound = 0;
let currentPlayerIndex = 0;
let playerMode = 2; // 2 = kaksinpeli, 3 = kaikki vastaan kaikki, 4 = kaksi joukkuetta + ryöstö
let activeModifiers = { extendToEight: false, reduceToThree: false, chaosFourWords: false };
// Индекс целевого игрока (-1 = нет проклятия). Применяется когда начинается ход цели.
let pendingCurses = {
    hunger: -1,
    chaos: -1
};
let generatedWordsList = [];
let currentActiveTheme = "";
let isWordListHidden = true;
let isMetamorphosisUsedThisTurn = false; 
let isExtraTurnRound = false;
let selectedWordIndex = -1;
// ✨-помеченные бонусные слова хода (из kaikkisanat). Награда и количество
// зависят от фазы игры — см. getBonusConfig() в rounds.js.
let currentBonusWords = [];
// 💀-проклятые слова Sanakaaos: сложные, но НЕ дают бонусных очков.
let currentCursedWords = [];
// Прогрессивная бонусная экономика вкл/выкл (#bonusScalingToggle).
// Захватывается при СТАРТЕ игры — переключение посреди партии на неё не влияет.
let bonusScalingEnabled = true;
let activeCondition1 = "";
let activeCondition2 = "";