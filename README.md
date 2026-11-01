# 🚌 The Bus-Stop Storyteller

An interactive multilingual party storytelling game powered by the **Sarvam AI** full Indic intelligence stack.

Players sit in a circle, pass the microphone, and speak in their own native Indian languages. Sarvam AI translates, summarizes, and synthesizes speech into the next player’s ear in real time, weaving turns into a cohesive multilingual story.

---

## ⚡ The Sarvam AI Stack

| Layer | Model ID | Endpoint | Function |
| :--- | :--- | :--- | :--- |
| **Voice Capture (STT)** | `saaras:v4` | `POST /speech-to-text` (`mode="translate"`) | Direct speech-to-English translation in ~430ms. |
| **Story Master & Bridge** | `sarvam-105b` | `POST /v2/chat/completions` | Generates opening hooks, context summaries, and the 100-word finale. |
| **Colloquial Localization**| `mayura:v1` | `POST /translate` (`mode="modern-colloquial"`) | Localizes story turns into the next speaker's language with spoken slang. |
| **Narrator Voice (TTS)** | `bulbul:v4-flash` | `POST /text-to-speech` (`pace=1.1`) | Rapid speech synthesis for browser playback. |

---

## 🎮 Game Rules & State Machine

1. **Lobby (`STATE_LOBBY`)**: Register 2–6 players, pick their native Indic languages (`hi-IN`, `bn-IN`, `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `gu-IN`, `pa-IN`, `od-IN`, `en-IN`), and choose a story genre.
2. **Opening Hook (`STATE_INIT_ROUND`)**: Starts the 120-second global countdown. `sarvam-105b` writes a punchy one-sentence opening hook, localized to Player 1's language.
3. **AI Narration (`STATE_AI_SPEAKING`)**: The central audio-reactive character orb animates and speaks in Player 1's language.
4. **Player Mic Capture (`STATE_LISTENING`)**: Acoustic chime sounds and the mic opens. The character reacts to real-time voice frequencies. Auto-ends on **1.8s silence (VAD)** or tapping the orb.
5. **Bridge Summary & Handoff (`STATE_BRIDGING`)**:
   - `saaras:v4` translates speech directly to English.
   - `sarvam-105b` produces a 1-sentence bridge summary (bypassed in Fast Direct mode).
   - `mayura:v1` localizes into Player 2's language.
   - `bulbul:v4-flash` synthesizes audio and hands the turn to Player 2.
6. **Multilingual Story Finale (`STATE_FINALE`)**:
   - `sarvam-105b` weaves all turns into a cohesive, entertaining 100-word story.
   - Parallel `mayura:v1` translations create a deck of native script story cards with inline TTS playback.

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
SARVAM_API_KEY=your_sarvam_api_key_here
PORT=3000
```

### 3. Build & Run
```bash
# Build the Vite frontend
npm run build

# Start the full-stack server
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deploying on Vercel

1. Push this repository to GitHub.
2. Import the project into your Vercel Dashboard.
3. Add the `SARVAM_API_KEY` Environment Variable under **Settings ➔ Environment Variables**.
4. Deploy!
