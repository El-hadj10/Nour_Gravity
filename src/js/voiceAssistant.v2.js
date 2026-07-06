// Assistant vocal Nour_Gravity v2.1
// Reconnaissance et synthèse vocale (Web Speech API).
// Module JS autonome et non-intrusif.
//
// v2.1 — Mode "vraiment" continu :
//   Le navigateur (Chrome / Edge) coupe la session SpeechRecognition
//   après ~1s de silence ou après chaque énoncé final. En v2.0, on
//   laissait la session mourir, ce qui éteignait le micro. En v2.1,
//   on redémarre automatiquement la session tant que l'utilisateur n'a
//   pas explicitement demandé l'arrêt via stop().

class VoiceAssistant {
  constructor({ onTranscript, onStart, onEnd, onListeningChange, lang = 'fr-FR' } = {}) {
    this.recognition = null;
    this.synth = window.speechSynthesis;
    this.onTranscript = onTranscript;
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.onListeningChange = onListeningChange;
    this.lang = lang;
    this.isListening = false;          // session de reconnaissance active
    this._shouldBeListening = false;    // intention utilisateur
    this._restartTimer = null;          // debounce des redémarrages
    this._init();
  }

  _init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Reconnaissance vocale non supportée sur ce navigateur.');
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang;
    this.recognition.interimResults = false;
    this.recognition.continuous = true;
    this.recognition.onresult = (event) => {
      // En mode continu, on doit itérer sur TOUS les résultats
      // (les indexes < resultIndex ont déjà été délivrés).
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (this.onTranscript) this.onTranscript(transcript);
        }
      }
    };
    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
    };
    this.recognition.onerror = (event) => {
      // 'no-speech' / 'aborted' / 'audio-capture' ne sont pas fatals :
      //   on laisse le onend qui suit déclencher un redémarrage.
      // 'not-allowed' / 'service-not-allowed' sont fatals : on abandonne.
      const fatal = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      if (fatal) {
        this._shouldBeListening = false;
        this.isListening = false;
        if (this.onListeningChange) this.onListeningChange(false);
        if (this.onEnd) this.onEnd();
      }
      console.warn(
        'VoiceAssistant: recognition error',
        event.error,
        fatal ? '(fatal — abandon)' : '(non-fatal — onend va relancer)'
      );
    };
    this.recognition.onend = () => {
      // Le navigateur coupe la session après ~1s de silence ou après
      // chaque énoncé final. Si l'utilisateur veut toujours écouter,
      // on programme un redémarrage.
      this.isListening = false;
      if (this._shouldBeListening) {
        this._scheduleRestart();
      } else if (this.onEnd) {
        this.onEnd();
      }
    };
  }

  _scheduleRestart() {
    if (this._restartTimer) return;
    this._restartTimer = setTimeout(() => {
      this._restartTimer = null;
      if (!this._shouldBeListening || !this.recognition) return;
      try {
        this.recognition.start();
      } catch (e) {
        // InvalidStateError si on tente de redémarrer alors que la
        // session n'est pas encore complètement fermée — retente une fois.
        setTimeout(() => {
          if (this._shouldBeListening) {
            try { this.recognition.start(); }
            catch (_) { /* abandon silencieux — un nouveau listen() rattrapera */ }
          }
        }, 250);
      }
    }, 200);
  }

  listen() {
    if (!this.recognition) return;
    // Ne pas relancer si on écoute déjà ou si un restart est en attente.
    if (this.isListening || this._restartTimer) return;
    if (!this._shouldBeListening) {
      this._shouldBeListening = true;
      if (this.onListeningChange) this.onListeningChange(true);
    }
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('VoiceAssistant: listen failed', e);
    }
  }

  // État "logique" du micro (intention utilisateur).
  // Distinct de `isListening` (état réel de la session reconnaissance)
  // qui peut osciller pendant les redémarrages silencieux.
  get isActive() {
    return this._shouldBeListening;
  }

  stop() {
    if (!this.recognition) return;
    if (this._shouldBeListening) {
      this._shouldBeListening = false;
      if (this.onListeningChange) this.onListeningChange(false);
    }
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
      this._restartTimer = null;
    }
    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('VoiceAssistant: stop failed', e);
      }
    }
  }

  speak(text, { lang = this.lang, pitch = 1, rate = 1, volume = 1 } = {}) {
    if (!this.synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.pitch = pitch;
    utter.rate = rate;
    utter.volume = volume;
    this.synth.speak(utter);
  }
}

// Usage minimal (à intégrer dans main.js ou un bouton du HUD)
// const va = new VoiceAssistant({
//   onTranscript: (txt) => console.log('Vous avez dit :', txt),
// });
// va.listen();
// va.speak('Bonjour, je suis Nour Gravity.');

window.VoiceAssistant = VoiceAssistant;
