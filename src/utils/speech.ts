// Speech & High-Definition Pronunciation Service for LearnMap
// Uses high-fidelity studio neural audio via local backend proxy (/api/tts)
// with client-side SpeechSynthesis fallback.

let activeAudio: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

/**
 * Score and find the best local/browser synthesizer voice
 */
function findBestVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = getAvailableVoices();
  if (voices.length === 0) return undefined;

  const targetLang = lang.toLowerCase();
  const langPrefix = targetLang.split('-')[0];

  const scoredVoices = voices
    .map((voice) => {
      const vLang = voice.lang.toLowerCase();
      const vName = voice.name.toLowerCase();
      let score = 0;

      if (vLang === targetLang) {
        score += 40;
      } else if (vLang.startsWith(langPrefix)) {
        score += 25;
      } else {
        return { voice, score: -1000 };
      }

      if (vName.includes('natural') || vName.includes('neural') || vName.includes('online')) {
        score += 100;
      }
      if (vName.includes('google')) {
        score += 85;
      }
      if (vName.includes('premium') || vName.includes('enhanced') || vName.includes('siri')) {
        score += 70;
      }
      if (targetLang.includes('us') && (vLang.includes('us') || vName.includes('us'))) {
        score += 20;
      } else if (targetLang.includes('gb') && (vLang.includes('gb') || vName.includes('uk'))) {
        score += 20;
      }

      return { voice, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredVoices[0]?.voice;
}

/**
 * Stop any ongoing speech or audio immediately
 */
export const stopSpeech = (): void => {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Client-side SpeechSynthesis fallback
 */
export const speakWithSynth = (text: string, lang = 'en-US'): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    stopSpeech();

    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 0.92; // Clear, intelligible learner pacing
    utterance.pitch = 1.0;

    const bestVoice = findBestVoice(lang);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    console.warn('Speech synthesis error:', e);
    return false;
  }
};

/**
 * Main pronunciation function:
 * 1. Streams high-definition Google Neural audio via /api/tts proxy (100% natural, human sounding).
 * 2. Seamlessly falls back to client SpeechSynthesis if offline or blocked.
 */
export const speakText = (text: string, lang = 'en-US'): boolean => {
  stopSpeech();

  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanText) return false;

  const langCode = lang.split('-')[0].toLowerCase();
  const ttsUrl = `/api/tts?q=${encodeURIComponent(cleanText)}&lang=${langCode}`;

  try {
    const audio = new Audio(ttsUrl);
    activeAudio = audio;

    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
    };

    audio.onerror = () => {
      // If server endpoint unreachable or error, fallback to speech synth
      speakWithSynth(cleanText, lang);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Autoplay policy or media load error
        console.warn('Neural audio playback fallback:', err);
        speakWithSynth(cleanText, lang);
      });
    }

    return true;
  } catch {
    return speakWithSynth(cleanText, lang);
  }
};

export const isSpeechActive = (): boolean => {
  if (activeAudio && !activeAudio.paused) return true;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
};
