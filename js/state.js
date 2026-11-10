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
let currentBonusWordText = "";
let activeCondition1 = "";
let activeCondition2 = "";