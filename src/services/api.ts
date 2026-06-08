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

// Lessons
export type LessonItem     = { id: string; sentence: string };
export type LessonChapter  = { number: number; title: string; items: LessonItem[] };
export type LessonSummary  = {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate';
};
export type LessonDetail   = LessonSummary & { chapters: LessonChapter[] };
export type LessonCategory = { id: string; name: string; lessons: LessonSummary[] };

export async function fetchLessonCategories(): Promise<LessonCategory[]> {
  const res = await fetch(`${BASE_URL}/lessons`);
  if (!res.ok) throw new Error('Failed to fetch lessons');
  return res.json();
}

export async function fetchLessonDetail(lessonId: string): Promise<LessonDetail> {
  const res = await fetch(`${BASE_URL}/lessons/${lessonId}`);
  if (!res.ok) throw new Error('Failed to fetch lesson');
  return res.json();
}

export type WordLookupResult = {
  explanation: string;
  example: string;
  example_translation: string;
  pronunciation: string | null;
};


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

// ─── API calls ────────────────────────────────────────────────────────────────

export async function createSession(language: string, nativeLanguage: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/talkos/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, native_language: nativeLanguage }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  const data = await res.json();
  return data.session_id;
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

  sendSetTopic(text: string) {
    this.ws.send(JSON.stringify({ type: 'set_topic', text }));
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
