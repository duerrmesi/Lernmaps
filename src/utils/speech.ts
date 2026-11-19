// Speech Synthesis (Text-to-Speech) helper for LearnMap
// 100% client-side, zero external API costs, works offline

export const speakText = (text: string, lang = 'de-DE'): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    // Strip HTML tags if HTML is passed
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 1.0;

    // Try finding a German voice if possible
    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find((v) => v.lang.startsWith('de'));
    if (deVoice) {
      utterance.voice = deVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    console.warn('Speech synthesis error:', e);
    return false;
  }
};

export const stopSpeech = (): void => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

export const isSpeechActive = (): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
};
