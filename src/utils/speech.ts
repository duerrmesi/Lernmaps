// Speech & Audio Service for LearnMap
// 1. Primary: Genuine human native speaker studio recordings from Wikimedia Commons & Wiktionary.
//    (100% real human audio, CORS enabled via origin=*, works on GitHub Pages, iPad, mobile & desktop).
// 2. Fallback: High-quality client-side SpeechSynthesis with optimized pacing.

const audioUrlCache = new Map<string, string | null>();
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
 * Fetch human studio pronunciation URL from Wikimedia Commons / Wiktionary.
 * Completely free, zero API key, no CORS restriction (origin=*), and works offline once cached.
 */
async function fetchHumanAudioUrl(word: string, lang = 'en'): Promise<string | null> {
  const clean = word.trim().toLowerCase();
  if (!clean || clean.length < 2) return null;

  const cacheKey = `${lang}:${clean}`;
  if (audioUrlCache.has(cacheKey)) {
    return audioUrlCache.get(cacheKey) || null;
  }

  try {
    const langPrefix = lang.split('-')[0].toLowerCase();
    // Query Wiktionary for media attached to the word entry
    const apiUrl = `https://${langPrefix === 'en' ? 'en' : 'en'}.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(
      clean
    )}&prop=images&format=json&origin=*`;

    const res = await fetch(apiUrl, { cache: 'force-cache' });
    if (!res.ok) {
      audioUrlCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    const pages = data.query?.pages || {};

    let audioFileName: string | null = null;

    for (const pid in pages) {
      const imgs: Array<{ title: string }> = pages[pid]?.images || [];
      const audioFiles = imgs
        .map((img) => img.title)
        .filter((t) => /\.(ogg|mp3|wav|oga)$/i.test(t));

      if (audioFiles.length > 0) {
        // Prioritize US English, then UK English, or first matching audio
        const matched =
          audioFiles.find((f) => /en-us/i.test(f)) ||
          audioFiles.find((f) => /en-uk/i.test(f)) ||
          audioFiles.find((f) => /eng/i.test(f)) ||
          audioFiles[0];

        if (matched) {
          audioFileName = matched.replace(/^File:/i, '');
          break;
        }
      }
    }

    if (audioFileName) {
      // Wikimedia Special:FilePath redirects directly to the audio stream with Access-Control-Allow-Origin: *
      const directAudioUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
        audioFileName
      )}`;
      audioUrlCache.set(cacheKey, directAudioUrl);
      return directAudioUrl;
    }

    audioUrlCache.set(cacheKey, null);
    return null;
  } catch {
    audioUrlCache.set(cacheKey, null);
    return null;
  }
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
 * 1. Checks Wiktionary/Wikimedia Commons for a genuine human native-speaker audio recording.
 * 2. If available, plays the human recording instantly in crisp studio quality.
 * 3. If unavailable (e.g. multi-word phrases or offline), seamlessly falls back to SpeechSynthesis.
 */
export const speakText = (text: string, lang = 'en-US'): boolean => {
  stopSpeech();

  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanText) return false;

  const isSingleWordOrHyphenated = !cleanText.includes(' ') && cleanText.length > 1;

  if (isSingleWordOrHyphenated) {
    fetchHumanAudioUrl(cleanText, lang)
      .then((audioUrl) => {
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audio.crossOrigin = 'anonymous';
          activeAudio = audio;

          audio.onended = () => {
            if (activeAudio === audio) activeAudio = null;
          };

          audio.play().catch(() => {
            // If browser autoplay policies block media, fallback to synth
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

  return speakWithSynth(cleanText, lang);
};

export const isSpeechActive = (): boolean => {
  if (activeAudio && !activeAudio.paused) return true;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
};
