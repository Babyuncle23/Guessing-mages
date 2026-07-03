import { questionsDatabase } from '../data/questions.js';

export class Match {
constructor(playerNames, totalRounds) {
    this.players = playerNames.map((data, index) => {
      const playerName = typeof data === 'string' ? data : data.name;
      const playerEmoji = typeof data === 'string' ? '' : data.emoji;
      return { id: index + 1, name: playerName.toUpperCase(), emoji: playerEmoji, gold: 50 };
    });
    this.totalRounds = totalRounds;
    this.currentRound = 1;
    this.pickerIndex = 0; 
    this.history = [];
    
    // Создаем массив доступных вопросов и перемешиваем его на старте
    this.shuffledQuestions = [];
    this.resetAndShuffleQuestions();
  }

  // Метод, который создает копию вопросов и перемешивает их (Алгоритм Фишера-Йетса)
  resetAndShuffleQuestions() {
    this.shuffledQuestions = [...questionsDatabase];
    for (let i = this.shuffledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledQuestions[i], this.shuffledQuestions[j]] = [this.shuffledQuestions[j], this.shuffledQuestions[i]];
    }
  }

  // ИСПРАВЛЕНО: Теперь достаем уникальный вопрос без риска повторения
  getRandomQuestion() {
    // Если по каким-то причинам вопросы закончились (игра длится дольше, чем есть вопросов)
    if (this.shuffledQuestions.length === 0) {
      this.resetAndShuffleQuestions();
    }
    // Метод .pop() забирает вопрос из конца массива и навсегда удаляет его оттуда
    return this.shuffledQuestions.pop();
  }

  getResponderIndex() {
    return (this.pickerIndex + 1) % this.players.length;
  }

  getOtherGuessersIndices() {
    const indices = [];
    for (let i = 0; i < this.players.length; i++) {
      if (i !== this.pickerIndex && i !== this.getResponderIndex()) {
        indices.push(i);
      }
    }
    return indices;
  }

  saveRoundToHistory(questionText, hintText, input1, input2, finalChoice) {
    this.history.push({
      round: this.currentRound,
      picker: this.players[this.pickerIndex].name,
      responder: this.players[this.getResponderIndex()].name,
      question: questionText,
      hint: hintText,
      words: [input1.toUpperCase(), input2.toUpperCase()],
      chosenByResponder: finalChoice.toUpperCase(),
      resultSentence: "" // Будет заполнено динамически в main.js
    });
  }

  nextTurn() {
    this.pickerIndex = (this.pickerIndex + 1) % this.players.length;
    if (this.pickerIndex === 0) {
      this.currentRound++;
    }
  }

  isGameOver() {
    return this.currentRound > this.totalRounds;
  }
}