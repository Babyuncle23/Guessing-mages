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
// Seurataan nopanheittojen tuloksia pelitilassa
let playerRolls = { p1: 3, p2: 3 }; 
let isMetamorphosisUsedThisTurn = false; 
let druidShieldActivated = false;
let isExtraTurnRound = false;
let morferReflectedCurseNotice = "";
let morferCopiedTurnNotice = "";