# Talosy Lang App

An AI-powered language learning mobile app built with **Expo** and **React Native**. Practice speaking, reading, and listening in a new language through structured lessons and real-time AI conversation.

## Features

- **AI Conversation** — Live voice conversations with a GPT-4o tutor that adapts to your level
- **Structured Lessons** — Sentences organised by topic (food, travel, work, health, social) with chapter progression
- **Fill-in-the-Blank** — 3-level LLM-generated exercises with inline text input and strike-based feedback
- **Speaking Practice** — Record yourself speaking a sentence, get instant AI pronunciation feedback via Whisper
- **TTS Playback** — Hear every sentence pronounced correctly with OpenAI TTS
- **Topic Radar** — Visual radar chart showing your lesson completion across all topics
- **Streak Tracking** — Daily streak and longest streak with progress visualisation
- **Google Sign-In** — OAuth login with deep link redirect

## Tech Stack

- [Expo](https://expo.dev) (SDK 56)
- React Native + TypeScript
- `expo-audio` for recording and playback
- GPT-4o + Whisper via backend API
- React Navigation (native stack)

## Getting Started

### Prerequisites

- Node.js 20+
- Xcode (iOS) or Android Studio
- A running [talosy backend](https://github.com/zijieliang/talosy-backend-api)

### Install

```bash
npm install
```

### Configure

Create a `.env` file in the root:

```env
EXPO_PUBLIC_BACKEND_HOST=http://<your-local-ip>:8000
```

### Run

```bash
# iOS
npx expo run:ios --device

# Android
npx expo run:android
```

## Project Structure

```
src/
├── screens/        # Full-screen views (Main, Lessons, SentenceDetail, SpeakingPractice…)
├── components/     # Reusable UI (ChatTab, ProfileTab, LessonRadarChart…)
├── navigation/     # React Navigation stack + route types
├── services/       # API client and WebSocket wrapper (api.ts)
├── context/        # Auth context
└── theme.ts        # Colour tokens
```

## License

MIT
