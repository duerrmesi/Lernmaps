// Speech & Pronunciation Service for LearnMap
// Combines crystal-clear native human dictionary audio recordings
// with high-definition Neural / Google speech synthesis.

// Audio cache to avoid refetching dictionary recordings
const audioUrlCache = new Map<string, string | null>();
let activeAudio: HTMLAudioElement | null = null;

// Preload & cache browser voices
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Returns available voices, prioritizing cached list or current query
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

/**
 * Score and pick the highest-quality voice for a given language tag.
 * Prioritizes modern Neural, Natural (Edge), Google (Chrome), and Premium voices
 * over old robotic local desktop engines.
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

      // 1. Language matching (Mandatory: must match target language prefix)
      if (vLang === targetLang) {
        score += 40;
      } else if (vLang.startsWith(langPrefix)) {
        score += 25;
      } else {
        // Doesn't match language at all
        return { voice, score: -1000 };
      }

      // 2. High-Definition / Neural / Online voices (Edge & modern systems)
      if (vName.includes('natural') || vName.includes('neural') || vName.includes('online')) {
        score += 100;
      }

      // 3. Google Voices (Chrome)
      if (vName.includes('google')) {
        score += 85;
      }

      // 4. Apple / Siri / Premium / Enhanced
      if (vName.includes('premium') || vName.includes('enhanced') || vName.includes('siri')) {
        score += 70;
      }

      // 5. Prefer regional accents if matching (e.g. US or UK)
      if (targetLang.includes('us') && (vLang.includes('us') || vName.includes('us') || vName.includes('united states'))) {
        score += 20;
      } else if (targetLang.includes('gb') && (vLang.includes('gb') || vName.includes('gb') || vName.includes('uk'))) {
        score += 20;
      }

      // 6. Deprioritize old robotic desktop voices if better ones exist
      if (vName.includes('desktop') || vName.includes('legacy')) {
        score -= 30;
      }

      return { voice, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredVoices[0]?.voice;
}

/**
 * Fetch human studio pronunciation MP3 from Free Dictionary API for English single words.
 */
async function fetchHumanAudioUrl(word: string): Promise<string | null> {
  const clean = word.trim().toLowerCase();
  if (!clean || !/^[a-z'-]+$/i.test(clean)) return null;

  if (audioUrlCache.has(clean)) {
    return audioUrlCache.get(clean) || null;
  }

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      audioUrlCache.set(clean, null);
      return null;
    }

    const data = await res.json();
    if (Array.isArray(data) && data[0]?.phonetics) {
      // Find the first audio that ends with .mp3
      for (const phon of data[0].phonetics) {
        if (phon.audio && typeof phon.audio === 'string' && phon.audio.length > 0) {
          audioUrlCache.set(clean, phon.audio);
          return phon.audio;
        }
      }
    }

    audioUrlCache.set(clean, null);
    return null;
  } catch {
    audioUrlCache.set(clean, null);
    return null;
  }
}

/**
 * Stop any ongoing speech synthesis or audio playback.
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
 * High-quality Text-To-Speech using selected neural/natural voices.
 */
export const speakWithSynth = (text: string, lang = 'de-DE'): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    stopSpeech();

    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    // 0.92 rate sounds distinctly clearer, more natural and well-paced for language learning
    utterance.rate = 0.92;
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
 * Primary pronunciation function:
 * 1. For single English words: plays real native human audio recording (crystal-clear studio quality).
 * 2. If human audio is not available or for sentences/phrases/other languages: falls back
 *    to high-definition neural/Google SpeechSynthesis with natural pacing.
 */
export const speakText = (text: string, lang = 'en-US'): boolean => {
  stopSpeech();

  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanText) return false;

  const isEnglish = lang.toLowerCase().startsWith('en');
  const isSingleWord = !cleanText.includes(' ') && /^[a-z'-]+$/i.test(cleanText);

  // If it's a single English word, try playing the native human recording
  if (isEnglish && isSingleWord) {
    fetchHumanAudioUrl(cleanText)
      .then((audioUrl) => {
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          activeAudio = audio;
          audio.play().catch(() => {
            // If browser autoplay policies block audio, fallback to speech synth
            speakWithSynth(cleanText, lang);
          });
        } else {
          speakWithSynth(cleanText, lang);
        }
      })
      .catch(() => {
        speakWithSynth(cleanText, lang);
      });

    return true;
  }

  // Fallback to high-quality synthesized speech
  return speakWithSynth(cleanText, lang);
};

export const isSpeechActive = (): boolean => {
  if (activeAudio && !activeAudio.paused) return true;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
};
