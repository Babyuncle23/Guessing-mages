let currentRound = 1;
let totalTurns = 10;
let turnsInCurrentRound = 0;
let currentPlayerIndex = 0;
let activeModifiers = { extendToEight: false, reduceToThree: false, chaosFourWords: false };
let pendingCurses = {
    hunger: false,
    chaos: false
};
let generatedWordsList = [];
let currentActiveTheme = "";
let activeCondition1 = "";
let activeCondition2 = "";
let isWordListHidden = true;
let isMetamorphosisUsedThisTurn = false; 
let isExtraTurnRound = false;
let selectedWordIndex = -1;
let currentBonusWordText = "";