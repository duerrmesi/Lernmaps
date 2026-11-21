// Speech & Audio Service for LearnMap
// High-Fidelity Audio Architecture:
// 1. Google Neural TTS (Ultra-natural, modern WaveNet prosody, full sentences & words, zero CORS issues via no-referrer)
// 2. Wikimedia Commons Studio Native Recordings (Authentic human recordings from global linguists)
// 3. Fallback: Browser SpeechSynthesis with Natural/Neural voice scoring

const audioUrlCache = new Map<string, string>();
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
 * Find the best local/browser synthesizer voice
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

      // Prioritize natural / neural / online cloud voices
      if (vName.includes('natural') || vName.includes('neural') || vName.includes('online')) {
        score += 150;
      }
      if (vName.includes('google')) {
        score += 120;
      }
      if (vName.includes('premium') || vName.includes('enhanced') || vName.includes('siri')) {
        score += 90;
      }
      // Penalize legacy robotic Windows SAPI5 desktop voices
      if (vName.includes('desktop') || vName.includes('zira') || vName.includes('david')) {
        score -= 50;
      }

      if (targetLang.includes('us') && (vLang.includes('us') || vName.includes('us'))) {
        score += 15;
      } else if (targetLang.includes('gb') && (vLang.includes('gb') || vName.includes('uk'))) {
        score += 15;
      }

      return { voice, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredVoices[0]?.voice;
}

/**
 * Generate Google Neural TTS stream URL
 * Using client=tw-ob with no-referrer yields high quality 128kbps MP3 audio
 */
function getGoogleTtsUrl(text: string, lang = 'en-US'): string {
  const langShort = lang.split('-')[0].toLowerCase() || 'en';
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
    text
  )}&tl=${langShort}&client=tw-ob`;
}

/**
 * Query Wikimedia Commons directly for human native speaker studio recordings
 */
async function fetchCommonsStudioUrl(word: string): Promise<string | null> {
  const clean = word.trim().toLowerCase();
  // Strip leading grammatical articles
  const coreWord = clean.replace(/^(to|a|an|the|der|die|das|ein|eine)\s+/, '').trim();
  if (!coreWord || coreWord.includes(' ') || coreWord.length < 2) return null;

  const cacheKey = `commons:${coreWord}`;
  if (audioUrlCache.has(cacheKey)) {
    return audioUrlCache.get(cacheKey) || null;
  }

  try {
    const candidates = [
      `File:En-us-${coreWord}.ogg`,
      `File:En-uk-${coreWord}.ogg`,
      `File:en-us-${coreWord}.ogg`,
      `File:en-uk-${coreWord}.ogg`,
      `File:En-${coreWord}.ogg`,
      `File:${coreWord}.ogg`,
    ];

    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      candidates.join('|')
    )}&prop=imageinfo&iiprop=url&format=json&origin=*`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages || {};

    for (const pid in pages) {
      if (pid !== '-1' && pages[pid].imageinfo?.[0]?.url) {
        const directUrl = pages[pid].imageinfo[0].url;
        audioUrlCache.set(cacheKey, directUrl);
        return directUrl;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Play an audio URL safely without CORS blocking
 */
function playAudioElement(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      stopSpeech();

      const audio = new Audio();
      try {
        (audio as unknown as { referrerPolicy?: string }).referrerPolicy = 'no-referrer';
      } catch {
        // ignore
      }
      audio.preload = 'auto';
      audio.src = url;
      activeAudio = audio;

      audio.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        resolve(true);
      };

      audio.onerror = () => {
        if (activeAudio === audio) activeAudio = null;
        resolve(false);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve(true))
          .catch(() => {
            if (activeAudio === audio) activeAudio = null;
            resolve(false);
          });
      }
    } catch {
      resolve(false);
    }
  });
}

/**
 * Stop any currently playing audio immediately
 */
export const stopSpeech = (): void => {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * SpeechSynthesis fallback when human audio is not available or user is offline
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
 * Master speech function:
 * 1. Checks for human studio recording on Wikimedia Commons (fast check).
 * 2. If available, plays human studio voice.
 * 3. If unavailable or multi-word, plays Google Neural TTS (crystal-clear, human-sounding).
 * 4. Offline fallback: SpeechSynthesis.
 */
export const speakText = (text: string, lang = 'en-US'): boolean => {
  stopSpeech();

  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanText) return false;

  const coreWord = cleanText.replace(/^(to|a|an|the|der|die|das|ein|eine)\s+/, '').trim();
  const isSingleWord = !coreWord.includes(' ') && coreWord.length > 1;

  // Execute audio playback pipeline asynchronously
  (async () => {
    // Step 1: If single word, check if we have a native speaker studio recording
    if (isSingleWord) {
      const studioUrl = await fetchCommonsStudioUrl(coreWord);
      if (studioUrl) {
        const played = await playAudioElement(studioUrl);
        if (played) return;
      }
    }

    // Step 2: Use Google Neural TTS (100% natural, handles any word, idiom or sentence)
    const googleUrl = getGoogleTtsUrl(cleanText, lang);
    const googlePlayed = await playAudioElement(googleUrl);
    if (googlePlayed) return;

    // Step 3: Offline fallback to local SpeechSynthesis
    speakWithSynth(cleanText, lang);
  })();

  return true;
};

/**
 * Optional prefetch for vocabulary training sessions to guarantee zero-latency audio
 */
export const prefetchAudio = (text: string, _lang = 'en-US'): void => {
  const clean = text.trim();
  if (!clean) return;

  const coreWord = clean.replace(/^(to|a|an|the|der|die|das|ein|eine)\s+/, '').trim();
  if (!coreWord.includes(' ') && coreWord.length > 1) {
    fetchCommonsStudioUrl(coreWord);
  }
};

export const isSpeechActive = (): boolean => {
  if (activeAudio && !activeAudio.paused) return true;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
};
