import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';

// Note: In Vite, we can reference workers via URL like this:
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export interface Topic {
  id: string;
  title: string;
  selected: boolean;
  children: Topic[];
}

export interface GeneratedMindmap {
  id: string;
  title: string;
  parentId: string | null;
  topicId?: string;
  sourcePage?: number;
}

export interface GeneratedNote {
  id: string;
  title: string;
  content: string;
  topicId: string;
  sourcePage?: number;
}

export interface GeneratedFlashcard {
  id: string;
  front: string;
  back: string;
  topicId: string;
  sourcePage?: number;
}

export interface GeneratedTaskcard {
  id: string;
  title: string;
  content: string;
  topicId: string;
  sourcePage?: number;
}

export interface GeneratedTimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  category?: string;
  color?: string;
  importance?: 'low' | 'medium' | 'high';
}

export interface GeneratedTimeline {
  id: string;
  title: string;
  description?: string;
  events: GeneratedTimelineEvent[];
}

export interface DocumentAnalysisResult {
  fileId: string;
  fileName: string;
  suggestedTitle: string;
  topics: Topic[];
}

export interface ExamAnalysisResult {
  title: string;
  subject: string;
  durationMinutes: number;
  totalPoints: number;
  topics: {
    id: string;
    title: string;
  }[];
  questions: {
    id: string;
    question: string;
    answer: string;
    type: string;
    difficulty: string;
    points: number;
    topicId: string;
  }[];
}

export interface GenerationResult {
  mindmapNodes: GeneratedMindmap[];
  notes: GeneratedNote[];
  flashcards: GeneratedFlashcard[];
  taskcards: GeneratedTaskcard[];
  timelines: GeneratedTimeline[];
}

function parseJSONFromText(text: string): any {
  let cleaned = text.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  } else {
    const firstBrace = cleaned.search(/[{[]/);
    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }
  return JSON.parse(cleaned);
}

export class AIService {
  static async extractTextFromFile(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + "\n";
      }
      return fullText;
    } else {
      return await file.text();
    }
  }

  static async callAI(prompt: string, provider: 'gemini' | 'openrouter' | 'ollama', apiKeyString: string, model: string, systemInstruction?: string) {
    const rawKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
    if (rawKeys.length === 0) throw new Error('No API key provided');
    
    // Shuffle keys to distribute load
    const keys = [...rawKeys].sort(() => Math.random() - 0.5);
    
    let lastError: any = null;

    for (let i = 0; i < keys.length; i++) {
      const apiKey = keys[i];
      try {
        if (provider === 'gemini') {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const body: any = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          };
          if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction }] };
          }

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.statusText} - ${text}`);
          }

          const data = await response.json();
          const contentParts = data.candidates?.[0]?.content?.parts || [];
          // Filter out thoughts (e.g. Gemini 2.5 / 3.8 thinking models)
          const answerPart = contentParts.find((p: any) => !p.thought && p.text) || contentParts[contentParts.length - 1];
          const rawText = answerPart?.text || '';
          if (!rawText) {
            throw new Error('Gemini hat keine Textantwort geliefert.');
          }
          return parseJSONFromText(rawText);
        }

        if (provider === 'openrouter') {
          const url = `https://openrouter.ai/api/v1/chat/completions`;
          const messages = [];
          if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
          }
          messages.push({ role: 'user', content: prompt });

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model,
              messages,
              response_format: { type: 'json_object' }
            })
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.statusText} - ${text}`);
          }

          const data = await response.json();
          const rawText = data.choices?.[0]?.message?.content || '';
          return parseJSONFromText(rawText);
        }

        if (provider === 'ollama') {
          const url = `${apiKey.replace(/\/$/, '')}/api/chat`; // apiKey is base URL
          const messages = [];
          if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
          }
          messages.push({ role: 'user', content: prompt });

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              messages,
              format: 'json',
              stream: false
            })
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.statusText} - ${text}`);
          }

          const data = await response.json();
          const rawText = data.message?.content || '';
          return parseJSONFromText(rawText);
        }

        throw new Error('Unknown provider');
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || '';
        // Retry on rate limit (429) or temporary server errors (503, 500, 502, 504)
        if (
          errMsg.includes('429') || 
          errMsg.includes('RESOURCE_EXHAUSTED') || 
          errMsg.includes('rate limit') ||
          errMsg.includes('503') || 
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('500') ||
          errMsg.includes('502') ||
          errMsg.includes('504')
        ) {
          console.warn(`Key ${i + 1}/${keys.length} failed with temporary error/rate limit, trying next...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        // Stop retrying on other errors (e.g., 400 Bad Request, 404 Not Found)
        throw err;
      }
    }
    
    // If all keys failed with rate limit
    throw lastError;
  }

  static async analyzeDocument(file: File, provider: 'gemini' | 'openrouter' | 'ollama', apiKey: string, model: string): Promise<DocumentAnalysisResult> {
    const text = await this.extractTextFromFile(file);
    // Limit text to roughly 30000 chars to avoid very long prompts for the prototype
    const truncatedText = text.substring(0, 30000); 
    
    // For now we will keep it in memory
    (window as any)._lastExtractedText = truncatedText;

    const prompt = `Analyze the following document and extract a hierarchical structure of topics.
Return a JSON object with this exact structure:
{
  "suggestedTitle": "Overall Title",
  "topics": [
    {
      "id": "t1",
      "title": "Main Topic",
      "selected": true,
      "children": [
         { "id": "t1-1", "title": "Subtopic", "selected": true, "children": [] }
      ]
    }
  ]
}
Make sure IDs are unique strings like "t1", "t1-1", "t2". Maximum 3 levels of depth.

CRITICAL INSTRUCTION: ALL EXTRACTED TITLES AND CONTENT MUST BE TRANSLATED TO AND WRITTEN IN GERMAN (DEUTSCH) LANGUAGE.

Document text:
${truncatedText}
`;

    const result = await this.callAI(prompt, provider, apiKey, model);
    
    return {
      fileId: uuidv4(),
      fileName: file.name,
      suggestedTitle: result.suggestedTitle,
      topics: result.topics
    };
  }

  static async generateMaterials(
    analysis: DocumentAnalysisResult, 
    selectedTopicIds: string[], 
    options: { mindmap: boolean; notes: boolean; flashcards: boolean; taskcards: boolean; timelines?: boolean },
    provider: 'gemini' | 'openrouter' | 'ollama',
    apiKey: string,
    model: string
  ): Promise<GenerationResult> {
    const text = (window as any)._lastExtractedText || "No text available.";
    const includeTimelines = options.timelines ?? true;
    
    const prompt = `You are an expert learning materials creator. Based on the following document (Title: "${analysis.suggestedTitle}"), generate high-quality learning materials for the selected topic IDs.

CRITICAL INSTRUCTION: ALL GENERATED CONTENT (TITLES, NOTES, FLASHCARDS, QUESTIONS, EXPLANATIONS, TIMELINES) MUST BE WRITTEN IN GERMAN (DEUTSCH) LANGUAGE. DO NOT USE ENGLISH UNLESS IT'S A TECHNICAL TERM.

Selected topic IDs: ${selectedTopicIds.join(', ')}

CRITICAL: Return ONLY a valid JSON object with exactly this structure. No markdown, no explanation, just JSON:
{
  "mindmapNodes": [
    { "id": "m1", "title": "Root Topic", "parentId": null, "topicId": "t1" },
    { "id": "m2", "title": "Child Topic", "parentId": "m1", "topicId": "t1-1" }
  ],
  "notes": [
    { "id": "n1", "title": "Topic Title", "content": "<h2>Heading</h2><p>Detailed paragraph...</p><h3>Subheading</h3><ul><li>Point one</li><li>Point two</li></ul>", "topicId": "t1" }
  ],
  "flashcards": [
    { "id": "f1", "front": "Precise, exam-style question about a specific concept?", "back": "<p>Complete answer with definition, explanation, and if applicable: formula, example or mnemonic.</p>", "topicId": "t1" }
  ],
  "taskcards": [
    { "id": "tc1", "title": "DEFINITION: Term", "content": "Full definition in 2-3 sentences.", "topicId": "t1" },
    { "id": "tc2", "title": "MERKSATZ: Key rule", "content": "The complete rule or law stated precisely.", "topicId": "t1" }
  ],
  "timelines": [
    {
      "id": "tl1",
      "title": "Titel des Zeitstrahls (z.B. Chronologie der Ereignisse)",
      "description": "Kurzer Überblick über die zeitliche Entwicklung",
      "events": [
        {
          "id": "tle1",
          "title": "Kurzer Ereignistitel",
          "description": "Erklärung des Ereignisses oder Meilensteins (2-4 Sätze)",
          "date": "1789",
          "endDate": "",
          "category": "Wendepunkt",
          "color": "rose",
          "importance": "high"
        }
      ]
    }
  ]
}

RULES FOR EACH TYPE:

MINDMAP NODES (if mindmap=${options.mindmap}):
- Each node MUST have a "topicId" that matches one of the selected topic IDs
- Build a clear hierarchy where parentId references another node's id (null for root)
- Use concise titles (2-5 words max per node)
- ${!options.mindmap ? 'mindmapNodes MUST be empty array []' : 'Create at least one node per selected topic'}

NOTES (if notes=${options.notes}):
- ${!options.notes ? 'notes MUST be empty array []' : 'Create one comprehensive note per selected topic'}
- Content MUST be rich HTML: use <h2>, <h3>, <p>, <ul><li>, <ol><li>, <strong>, <em>, <table>
- Each note should be 300-600 words minimum, covering definitions, explanations, examples, and context
- "topicId" MUST match a selected topic ID

FLASHCARDS (if flashcards=${options.flashcards}):
- ${!options.flashcards ? 'flashcards MUST be empty array []' : 'Create 3-6 flashcards per topic'}
- "front": Write as a precise, exam-style question. NOT "What is X?" but "Explain the mechanism of X and its significance in Y"
- "back": Full answer in HTML (<p>, <ul> etc.) – not just one word but a complete explanation
- Target different cognitive levels: definition, comparison, application, cause/effect
- "topicId" MUST match a selected topic ID

TASKCARDS (if taskcards=${options.taskcards}):
- ${!options.taskcards ? 'taskcards MUST be empty array []' : 'Create 3-5 taskcards per topic'}
- Each taskcard is a standalone learning card with a category prefix in title: DEFINITION, MERKSATZ, FORMEL, BEISPIEL, VERGLEICH, ABLAUF
- "content": Detailed, self-contained text (3-6 sentences) – no "see page X", explain it fully
- "topicId" MUST match a selected topic ID

TIMELINES (if timelines=${includeTimelines}):
- Analysiere, ob das Dokument oder die ausgewählten Themen historische, chronologische, entwicklungsgeschichtliche, prozedurale oder meilensteinbasierte Abläufe enthalten (z. B. Epochen, Entdeckungen, Werdegänge, Phasenabläufe, Projektstadien).
- ${!includeTimelines ? 'timelines MUST be empty array []' : 'WENN ES ZEITLICH/HISTORISCH/PROZEDURAL SINN MACHT: Erstelle 1-2 Zeitstrahlen mit je 5 bis 12 präzisen, chronologisch geordneten Ereignissen. WENN ES KEINEN ZEITLICHEN SINN MACHT (z. B. reine Formeln, reine Definitionen): "timelines" MUST be empty array [].'}
- Ereignisse müssen präzise "date" (z.B. "1789", "1848", "Phase 1: Prophase", "1914-1918"), "importance" ("low", "medium", "high"), "category" (z.B. "Politik", "Wissenschaft", "Meilenstein", "Entdeckung"), "color" ("blue", "emerald", "amber", "rose", "purple", "indigo") und beschreibenden Text haben.

Document text:
${text.substring(0, 25000)}
`;

    const result = await this.callAI(prompt, provider, apiKey, model);
    
    return {
      mindmapNodes: result.mindmapNodes || [],
      notes: result.notes || [],
      flashcards: result.flashcards || [],
      taskcards: result.taskcards || [],
      timelines: Array.isArray(result.timelines) ? result.timelines : [],
    };
  }

  static async generateTimeline(
    topicOrText: string,
    options: { count?: number; focus?: string } = {},
    provider: 'gemini' | 'openrouter' | 'ollama',
    apiKey: string,
    model: string
  ): Promise<GeneratedTimeline> {
    const eventCount = options.count || 8;
    const focus = options.focus || 'wichtigste Meilensteine, Wendepunkte und Entwicklungsphasen';

    const prompt = `Du bist ein Fachexperte und Pädagoge. Erstelle einen strukturierten, chronologisch geordneten und lehrreichen Zeitstrahl zum folgenden Thema bzw. Text.

Thema / Kontext:
${topicOrText}

Fokus: ${focus}
Anzahl der Ereignisse: ca. ${eventCount} Ereignisse

CRITICAL INSTRUCTION: ALL TITLES, DATES, CATEGORIES AND DESCRIPTIONS MUST BE WRITTEN IN GERMAN (DEUTSCH).
Sort the events strictly in chronological order!

Return ONLY a valid JSON object matching this structure:
{
  "id": "tl_ai",
  "title": "Prägnanter Titel des Zeitstrahls",
  "description": "1-3 Sätze Zusammenfassung des geschichtlichen/zeitlichen Ablaufs",
  "events": [
    {
      "id": "tle_1",
      "title": "Titel des Ereignisses (prägnant, 2-6 Wörter)",
      "description": "Präzise Erklärung was passiert ist, Hintergründe, Bedeutung oder Folgen (2-4 Sätze in deutscher Sprache)",
      "date": "Datum oder Epoche (z.B. '1789', '14.07.1789', '1914 - 1918', '44 v. Chr.', 'Phase 1: Beginn')",
      "endDate": "",
      "category": "Kategorie (z.B. Politik, Wissenschaft, Entdeckung, Meilenstein, Kultur, Krise, Wende)",
      "color": "eine der Farben: 'blue', 'emerald', 'amber', 'rose', 'purple', 'indigo'",
      "importance": "'high', 'medium' oder 'low'"
    }
  ]
}
`;

    const result = await this.callAI(prompt, provider, apiKey, model);
    return {
      id: result.id || 'tl_' + Date.now(),
      title: result.title || 'Zeitstrahl: ' + topicOrText.substring(0, 40),
      description: result.description || '',
      events: Array.isArray(result.events) ? result.events : [],
    };
  }

  static async generateTimelineEvents(
    timelineTitle: string,
    existingEvents: { title: string; date: string }[],
    options: { count?: number; focus?: string } = {},
    provider: 'gemini' | 'openrouter' | 'ollama',
    apiKey: string,
    model: string
  ): Promise<GeneratedTimelineEvent[]> {
    const eventCount = options.count || 5;
    const focus = options.focus || 'weitere relevante Ereignisse und Meilensteine, die noch fehlen';

    const prompt = `Du bist ein Fachexperte. Ergänze einen bestehenden Zeitstrahl mit dem Titel "${timelineTitle}" um ca. ${eventCount} zusätzliche, bedeutsame Ereignisse.

Bereits vorhandene Ereignisse auf dem Zeitstrahl:
${existingEvents.map(e => `- [${e.date}] ${e.title}`).join('\n')}

Fokus für neue Ereignisse: ${focus}
WICHTIG: Die neuen Ereignisse dürfen die bereits vorhandenen NICHT doppeln!

CRITICAL INSTRUCTION: ALL TITLES, DATES, CATEGORIES AND DESCRIPTIONS MUST BE WRITTEN IN GERMAN (DEUTSCH).

Return ONLY a valid JSON object matching this structure:
{
  "events": [
    {
      "id": "tle_new_1",
      "title": "Titel des neuen Ereignisses",
      "description": "Erklärung des Ereignisses und seiner Bedeutung (2-3 Sätze)",
      "date": "Datum oder Epoche (z.B. '1804', '18.10.1813', 'Phase 2')",
      "endDate": "",
      "category": "Kategorie (z.B. Politik, Wissenschaft, Entdeckung, Meilenstein)",
      "color": "eine der Farben: 'blue', 'emerald', 'amber', 'rose', 'purple', 'indigo'",
      "importance": "'high', 'medium' oder 'low'"
    }
  ]
}
`;

    const result = await this.callAI(prompt, provider, apiKey, model);
    return Array.isArray(result.events) ? result.events : [];
  }

  static async generateExamQuestions(
    topicTitles: { id: string, title: string }[],
    provider: 'gemini' | 'openrouter' | 'ollama',
    apiKey: string,
    model: string
  ): Promise<any[]> {
    const prompt = `You are an expert examiner. Generate 2 exam questions for each of the following topics.
Topics:
${topicTitles.map(t => `- [ID: ${t.id}] ${t.title}`).join('\n')}

CRITICAL INSTRUCTION: ALL GENERATED QUESTIONS AND ANSWERS MUST BE WRITTEN IN GERMAN (DEUTSCH) LANGUAGE.

CRITICAL: Return ONLY a valid JSON object with exactly this structure:
{
  "questions": [
    {
      "knowledgeNodeId": "ID of the topic",
      "type": "free-text",
      "difficulty": "medium",
      "question": "The question text here",
      "answer": "The expected answer or grading rubric",
      "points": 5
    }
  ]
}

- "type" should be "free-text"
- "difficulty" can be "easy", "medium", or "hard"
- "points" should be an integer between 1 and 10 based on difficulty
`;

    const result = await this.callAI(prompt, provider, apiKey, model);
    return result.questions || [];
  }
  static async analyzeOldExam(
    file: File, 
    provider: 'gemini' | 'openrouter' | 'ollama', 
    apiKey: string, 
    model: string
  ): Promise<ExamAnalysisResult> {
    const text = await this.extractTextFromFile(file);
    
    const prompt = `You are an AI that extracts exam structure from an old exam paper.
Analyze the following exam document and extract its metadata and all questions.

CRITICAL INSTRUCTION: ALL EXTRACTED CONTENT MUST BE IN GERMAN (DEUTSCH).
If the document is in another language, translate the output to German.

CRITICAL: Return ONLY a valid JSON object matching this TypeScript interface exactly:
{
  title: string; // The title of the exam
  subject: string; // The subject (e.g. "Biologie", "Informatik")
  durationMinutes: number; // Estimated or stated duration in minutes
  totalPoints: number; // Total points possible
  topics: {
    id: string; // generate a random unique string like "topic_1"
    title: string; // name of the topic this question belongs to
  }[];
  questions: {
    id: string; // generate a random unique string like "q_1"
    question: string; // The full text of the question
    answer: string; // The correct answer or model solution. If not in the exam, generate a plausible, correct expert model answer.
    type: string; // e.g. "offene Frage", "Multiple Choice", "Anwendung"
    difficulty: "easy" | "medium" | "hard";
    points: number; // points for this question (estimate if not present)
    topicId: string; // references topics[].id
  }[];
}

Extract every single question found in the exam.
If points are not explicitly stated, estimate them based on complexity (1-10 points).
If answers are not present in the document, you MUST generate a high-quality expert model answer for the question.
Group questions under logical overarching topics.

Document text:
${text.substring(0, 25000)}
`;

    const result = await this.callAI(prompt, provider, apiKey, model);
    return result as ExamAnalysisResult;
  }
}
