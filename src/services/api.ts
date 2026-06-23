import Constants from 'expo-constants';

// ─── Host detection ───────────────────────────────────────────────────────────

function getApiHost(): string {
  if (__DEV__) {
    // In Expo Go, debuggerHost is "192.168.x.x:PORT" — strip the port
    const debugHost = (Constants as any).expoGoConfig?.debuggerHost as string | undefined;
    if (debugHost) return debugHost.split(':')[0];
  }
  return 'localhost';
}

const HOST = getApiHost();
const BASE_URL = `http://${HOST}:8000/api/v1`;
const WS_BASE = `ws://${HOST}:8000/api/v1`;

// ─── Types ────────────────────────────────────────────────────────────────────

// Fill-in-blank
export type FillBlankPart =
  | { type: 'text'; value: string }
  | { type: 'blank'; answer: string };

export type FillBlankLevel = { level: number; parts: FillBlankPart[] };

// Lessons
export type LessonItem     = { id: string; sentence: string; completed: boolean; translation?: string };
export type LessonChapter  = { number: number; title: string; items: LessonItem[] };
export type LessonSummary  = {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate';
  total_items: number;
  done_items: number;
};
export type LessonDetail   = LessonSummary & { chapters: LessonChapter[] };
export type LessonCategory = { id: string; name: string; lessons: LessonSummary[] };

// Map app language names to ISO codes used by the backend
const LANG_CODE: Record<string, string> = {
  English:    'en',
  Swedish:    'sv',
  Chinese:    'zh',
  Spanish:    'es',
  French:     'fr',
  German:     'de',
  Japanese:   'ja',
  Korean:     'ko',
  Italian:    'it',
  Portuguese: 'pt',
};

export function langCode(language: string): string {
  return LANG_CODE[language] ?? 'en';
}

export async function fetchLessonCategories(
  language = 'en',
  token?: string | null,
): Promise<LessonCategory[]> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/lessons?language=${language}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch lessons');
  return res.json();
}

export async function fetchLessonDetail(
  lessonId: string,
  language = 'en',
  token?: string | null,
  nativeLang = 'en',
): Promise<LessonDetail> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(
    `${BASE_URL}/lessons/${lessonId}?language=${language}&native_language=${nativeLang}`,
    { headers },
  );
  if (!res.ok) throw new Error('Failed to fetch lesson');
  return res.json();
}

export async function generateFillBlank(
  sentence: string,
  language: string,
  token: string,
): Promise<FillBlankLevel[]> {
  const res = await fetch(`${BASE_URL}/lessons/fill-blank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sentence, language }),
  });
  if (!res.ok) throw new Error(`fill-blank failed: ${res.status}`);
  return res.json();
}

export async function completeLessonItem(token: string, itemId: string): Promise<void> {
  await fetch(`${BASE_URL}/lessons/items/${itemId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type WordLookupResult = {
  explanation: string;
  example: string;
  example_translation: string;
  pronunciation: string | null;
};


// Conversation history
export type ConversationSummary = {
  id: string;
  language: string;
  native_language: string;
  exchange_count: number;
  level_detected: string | null;
  started_at: string;
};

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
};

export async function fetchConversationHistory(token: string): Promise<ConversationSummary[]> {
  const res = await fetch(`${BASE_URL}/talkos/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function fetchConversationMessages(sessionId: string, token: string): Promise<ConversationMessage[]> {
  const res = await fetch(`${BASE_URL}/talkos/sessions/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function deleteConversation(sessionId: string, token: string): Promise<void> {
  await fetch(`${BASE_URL}/talkos/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type WSIncoming =
  | { type: 'ready' }
  | { type: 'transcript'; text: string }
  | { type: 'ai_response'; text: string; audio: string; translation?: string; suggestion?: string }
  | { type: 'no_speech' }
  | { type: 'session_end' }
  | { type: 'error'; message: string };

export type WSHandlers = {
  onReady: () => void;
  onTranscript: (text: string) => void;
  onAIResponse: (text: string, audio: string, translation?: string, suggestion?: string) => void;
  onNoSpeech: () => void;
  onSessionEnd: () => void;
  onError: (message: string) => void;
  onClose: () => void;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

// ─── Streak ───────────────────────────────────────────────────────────────────

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  active_days: string[];
};

export type ConversationGrowthPoint = { date: string; total: number };

export async function fetchConversationGrowth(
  token: string,
  range: '7d' | '30d' | '90d' = '7d',
): Promise<ConversationGrowthPoint[]> {
  const res = await fetch(`${BASE_URL}/talkos/conversation-growth?range=${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch conversation growth');
  const body: { data: ConversationGrowthPoint[] } = await res.json();
  return body.data;
}

export async function fetchStreak(token: string): Promise<StreakData> {
  const res = await fetch(`${BASE_URL}/talkos/streak`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch streak');
  return res.json();
}

export async function getMobileGoogleAuthUrl(
  deepLink: string,
): Promise<{ authorization_url: string; state: string }> {
  const res = await fetch(
    `${BASE_URL}/auth/google/mobile?deep_link=${encodeURIComponent(deepLink)}`,
  );
  if (!res.ok) throw new Error(`Failed to get Google auth URL: ${res.status}`);
  return res.json();
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function createSession(
  language: string,
  nativeLanguage: string,
  token?: string | null,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/talkos/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ language, native_language: nativeLanguage }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  const data = await res.json();
  return data.session_id;
}


// ArrayBuffer-based TTS fetch — reliable on React Native / Hermes (no FileReader)
export async function fetchTTSArrayBuffer(text: string, speed = 1.0): Promise<string> {
  const res = await fetch(`${BASE_URL}/talkos/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speed }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...(bytes.subarray(i, i + chunk) as unknown as number[]));
  }
  return btoa(binary);
}

export async function fetchTTSBase64(text: string, speed: number): Promise<string> {
  const res = await fetch(`${BASE_URL}/talkos/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speed }),
  });
  if (!res.ok) throw new Error('TTS failed');
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function fetchWordLookup(
  word: string,
  context: string,
  targetLanguage: string,
  nativeLanguage: string,
): Promise<WordLookupResult> {
  const res = await fetch(`${BASE_URL}/talkos/word-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word,
      context,
      target_language: targetLanguage,
      native_language: nativeLanguage,
    }),
  });
  if (!res.ok) throw new Error('Word lookup failed');
  return res.json();
}

// ─── WebSocket client ─────────────────────────────────────────────────────────

export class TalkosWS {
  private ws: WebSocket;

  constructor(sessionId: string, language: string, nativeLanguage: string, handlers: WSHandlers) {
    const params = new URLSearchParams({ language, native_language: nativeLanguage });
    this.ws = new WebSocket(`${WS_BASE}/talkos/ws/${sessionId}?${params}`);

    this.ws.onmessage = (event) => {
      let msg: WSIncoming;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'ready':
          handlers.onReady();
          break;
        case 'transcript':
          handlers.onTranscript(msg.text);
          break;
        case 'ai_response':
          handlers.onAIResponse(msg.text, msg.audio, msg.translation, msg.suggestion);
          break;
        case 'no_speech':
          handlers.onNoSpeech();
          break;
        case 'session_end':
          handlers.onSessionEnd();
          break;
        case 'error':
          handlers.onError(msg.message);
          break;
      }
    };

    this.ws.onerror = () => handlers.onError('Connection error');
    this.ws.onclose = handlers.onClose;
  }

  get readyState() {
    return this.ws.readyState;
  }

  sendSpeech(base64Audio: string) {
    this.ws.send(JSON.stringify({ type: 'speech', data: base64Audio }));
  }

  sendPracticeLesson(text: string, sentences?: string[]) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'practice_lesson', text, sentences }));
    }
  }

  endSession() {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end_session' }));
    }
  }

  close() {
    this.ws.close();
  }
}
