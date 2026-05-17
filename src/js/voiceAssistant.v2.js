// Assistant vocal Nour_Gravity v2.0
// Ajoute la reconnaissance et la synthèse vocale (Web Speech API)
// Ce module JS est autonome et non-intrusif

class VoiceAssistant {
  constructor({ onTranscript, onStart, onEnd, lang = 'fr-FR' } = {}) {
    this.recognition = null;
    this.synth = window.speechSynthesis;
    this.onTranscript = onTranscript;
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.lang = lang;
    this.isListening = false;
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
    this.recognition.continuous = false;
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (this.onTranscript) this.onTranscript(transcript);
    };
    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
    };
    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    };
  }

  listen() {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
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
