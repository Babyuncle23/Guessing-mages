export class AudioManager {
  constructor() {
    this.audioPool = {};
    this.volume = 0.5; 
    this.enabled = true;
    this.isScreenReaderMode = false; // Режим доступности
    this.isVoiceWarmedUp = false;    // Прогрев TTS
    this.cancelQueue = false;        // Флаг прерывания очереди TTS
    
    this.audioPool.click = this.createAudioPool('src/audio/click.mp3', 3);
    this.audioPool.win = this.createAudioPool('src/audio/win.mp3', 2);
    this.audioPool.lose = this.createAudioPool('src/audio/lose.ogg', 2);
    
    // Пул для фанфар (одного инстанса достаточно)
    this.audioPool.fanfare = this.createAudioPool('src/audio/fanfare.mp3', 1);
    
    this.loadSettings();
    
    this.audioCtx = null;
    this.typewriterBuffer = null;
    this.flapBuffer = null;
    this.isPreloaded = false;
  }

  createAudioPool(src, count) {
    const pool = [];
    for (let i = 0; i < count; i++) {
      // Ищем уже существующий элемент в DOM (полезно для предзагрузки)
      let audio = document.querySelector(`audio[src="${src}"]`);
      if (!audio) {
        audio = new Audio(src);
      }
      audio.volume = this.volume;
      pool.push(audio);
    }
    return pool;
  }

  getPooledAudio(type) {
    const pool = this.audioPool[type];
    if (!pool) return null;
    const startTime = (type === 'click') ? 0.10 : 0;
    
    for (let audio of pool) {
      if (audio.paused || audio.ended) {
        audio.currentTime = startTime;
        return audio;
      }
    }
    const audio = pool[0];
    audio.currentTime = startTime;
    return audio;
  }

  play(type, volumeOverride = null) {
    if (!this.enabled) return;
    const audio = this.getPooledAudio(type);
    if (!audio) return;
    
    audio.volume = volumeOverride !== null ? volumeOverride : this.volume;
    audio.play().catch(err => console.debug(`Audio prevented: ${err.message}`));
  }

  // Асинхронное проигрывание эффекта (для ожидания завершения фанфар)
  playAsync(type, volumeOverride = null) {
    return new Promise((resolve) => {
      if (!this.enabled || this.cancelQueue) {
        resolve();
        return;
      }
      const audio = this.getPooledAudio(type);
      if (!audio) {
        resolve();
        return;
      }
      
      audio.volume = volumeOverride !== null ? volumeOverride : this.volume;
      audio.onended = () => resolve();
      audio.play().catch(err => {
        console.debug(`Audio prevented: ${err.message}`);
        resolve();
      });
    });
  }

  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
    Object.values(this.audioPool).forEach(pool => {
      pool.forEach(audio => audio.volume = this.volume);
    });
    this.saveSettings();
  }

  getVolume() { return this.volume; }

  toggleEnabled() {
    this.enabled = !this.enabled;
    this.saveSettings();
    return this.enabled;
  }

  isEnabled() { return this.enabled; }

  setScreenReaderMode(isSR) {
    this.isScreenReaderMode = isSR;
    if (isSR) this.stopSpeech();
  }

  saveSettings() {
    localStorage.setItem('audioVolume', this.volume.toString());
    localStorage.setItem('audioEnabled', this.enabled.toString());
  }

  loadSettings() {
    const savedVolume = localStorage.getItem('audioVolume');
    const savedEnabled = localStorage.getItem('audioEnabled');
    if (savedVolume !== null) this.volume = parseFloat(savedVolume);
    if (savedEnabled !== null) this.enabled = savedEnabled === 'true';
  }

  async preloadRevealSounds() {
    if (this.isPreloaded || !this.enabled) return;
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const loadBuffer = async (url) => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioCtx.decodeAudioData(arrayBuffer);
      };
      const [typewriter, flap] = await Promise.all([
        loadBuffer('src/audio/typewriter.mp3'),
        loadBuffer('src/audio/flap.mp3')
      ]);
      this.typewriterBuffer = typewriter;
      this.flapBuffer = flap;
      this.isPreloaded = true;
    } catch (err) { console.debug("Preloading failed:", err.message); }
  }

  async playRevealCombo() {
    if (!this.enabled) return;
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
      if (!this.isPreloaded) await this.preloadRevealSounds();
      if (!this.typewriterBuffer || !this.flapBuffer) return;

      const now = this.audioCtx.currentTime;
      const flapSource = this.audioCtx.createBufferSource();
      flapSource.buffer = this.flapBuffer;
      const flapGain = this.audioCtx.createGain();
      flapGain.gain.value = this.volume;
      flapSource.connect(flapGain);
      flapGain.connect(this.audioCtx.destination);
      flapSource.start(now);

      const typewriterSource = this.audioCtx.createBufferSource();
      typewriterSource.buffer = this.typewriterBuffer;
      const typewriterGain = this.audioCtx.createGain();
      typewriterGain.gain.value = Math.min(1.0, this.volume * 1.6);
      typewriterSource.connect(typewriterGain);
      typewriterGain.connect(this.audioCtx.destination);
      typewriterSource.start(now, 1.0, 2.0);
    } catch (err) { console.debug("Instant audio combo failed:", err.message); }
  }

  // Обычный вызов с колбэком onstart (для лоадера)
speak(text, onStartCallback = null) {
    if (!this.enabled || !window.speechSynthesis || this.isScreenReaderMode) {
      if (onStartCallback) onStartCallback();
      return;
    }
    
    window.speechSynthesis.cancel();
    this.cancelQueue = false;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = this.volume;
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    
    if (onStartCallback) {
      let hasFired = false;
      const fireCallback = () => {
        if (!hasFired) {
          hasFired = true;
          onStartCallback();
        }
      };

      // Лоадер исчезнет строго в момент начала произношения
      utterance.onstart = fireCallback;
      utterance.onerror = fireCallback;
      
      // Даем браузеру до 4 секунд на первую загрузку голоса, 
      // вместо прежних 500 миллисекунд, которые ломали логику.
      setTimeout(fireCallback, 4000); 
    }
    
    window.speechSynthesis.speak(utterance);
  }

  // Promise-обертка для управления очередью на финальном экране
  speakAsync(text) {
    return new Promise((resolve) => {
      if (!this.enabled || !window.speechSynthesis || this.isScreenReaderMode || this.cancelQueue) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      window.speechSynthesis.speak(utterance);
    });
  }

  stopSpeech() {
    this.cancelQueue = true;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}