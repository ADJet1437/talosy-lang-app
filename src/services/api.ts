const BASE_URL = 'http://localhost:8001/api/v1';
const WS_BASE = 'ws://localhost:8001/api/v1';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type SessionSummary = {
  exchanges: number;
  level: string | null;
  highlights: string[];
  improvements: string[];
};

// ─── Session ──────────────────────────────────────────────────────────────────

export async function createSession(language?: string, level?: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/talkos/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: language ?? 'English', level: level ?? null }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  const data = await res.json();
  return data.session_id;
}

// ─── WebSocket types ──────────────────────────────────────────────────────────

export type WSIncoming =
  | { type: 'ready'; opening_text: string; opening_audio: string | null }
  | { type: 'transcript'; text: string }
  | { type: 'ai_response'; text: string; audio: string; level?: string }
  | { type: 'no_speech' }
  | { type: 'session_end'; summary: SessionSummary }
  | { type: 'error'; message: string };

export type WSHandlers = {
  onReady: (openingText: string, openingAudio: string | null) => void;
  onTranscript: (text: string) => void;
  onAIResponse: (text: string, audio: string, level?: string) => void;
  onNoSpeech: () => void;
  onSessionEnd: (summary: SessionSummary) => void;
  onError: (message: string) => void;
  onClose: () => void;
};

// ─── WebSocket client ─────────────────────────────────────────────────────────

export class TalkosWS {
  private ws: WebSocket;

  constructor(sessionId: string, handlers: WSHandlers) {
    this.ws = new WebSocket(`${WS_BASE}/talkos/ws/${sessionId}`);

    this.ws.onmessage = (event) => {
      let msg: WSIncoming;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'ready':
          handlers.onReady(msg.opening_text, msg.opening_audio);
          break;
        case 'transcript':
          handlers.onTranscript(msg.text);
          break;
        case 'ai_response':
          handlers.onAIResponse(msg.text, msg.audio, msg.level);
          break;
        case 'no_speech':
          handlers.onNoSpeech();
          break;
        case 'session_end':
          handlers.onSessionEnd(msg.summary);
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

  endSession() {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end_session' }));
    }
  }

  close() {
    this.ws.close();
  }
}
