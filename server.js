import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { SarvamAIClient } from "sarvamai";

// Load environment variables from .env if present locally
try {
  process.loadEnvFile();
} catch {}

const apiKey = process.env.SARVAM_API_KEY;
if (!apiKey && !process.env.VERCEL) {
  console.warn("WARNING: SARVAM_API_KEY is not defined in environment.");
}

const getClient = () => {
  return new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY,
  });
};
const client = getClient();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Temporary upload directory for audio blobs (compatible with Vercel /tmp and local)
const uploadsDir = path.join(os.tmpdir(), "sarvam_temp_uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

/**
 * 1. GAME START: /api/game/start
 * Generates opening hook via sarvam-105b, translates to Player 1's language via mayura:v1,
 * and synthesizes audio via bulbul:v4-flash.
 */
app.post("/api/game/start", async (req, res) => {
  const startTime = Date.now();
  try {
    const { players, genre = "Last Bus Home" } = req.body;
    if (!players || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: "At least one player is required." });
    }

    const firstPlayer = players[0];
    const targetLang = firstPlayer.lang || "hi-IN";

    // Step A: Generate punchy opening hook in English (< 18 words)
    const t0 = Date.now();
    const chatResponse = await client.chat.completions({
      model: "sarvam-105b",
      messages: [
        {
          role: "system",
          content:
            "You are a master story teller for a fast-paced bus-stop mystery game. Respond ONLY with the requested hook sentence, with NO quotation marks or explanations.",
        },
        {
          role: "user",
          content: `Generate a punchy, one-sentence opening hook for a ${genre} story set in India. Maximum 18 words.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 60,
    });
    const hookEn =
      chatResponse.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "") ||
      "The midnight bus screeched to a sudden halt under flickering streetlamps.";
    const llmMs = Date.now() - t0;

    // Step B: Translate hook to Player 1's language via mayura:v1
    const t1 = Date.now();
    let hookTranslated = hookEn;
    if (targetLang !== "en-IN") {
      const transResponse = await client.text.translate({
        input: hookEn,
        source_language_code: "en-IN",
        target_language_code: targetLang,
        mode: "modern-colloquial",
        model: "mayura:v1",
      });
      hookTranslated = transResponse.translated_text || hookEn;
    }
    const translateMs = Date.now() - t1;

    // Step C: Synthesize TTS via bulbul:v4-flash
    const t2 = Date.now();
    const ttsResponse = await client.textToSpeech.convert({
      text: hookTranslated,
      language_code: targetLang,
      model: "bulbul:v4-flash",
      pace: 1.1,
    });
    const base64Audio = ttsResponse.audios?.[0] || null;
    const ttsMs = Date.now() - t2;

    const initialHistory = [
      {
        speaker: "Story Master",
        role: "ai",
        textEn: hookEn,
        textLocal: hookTranslated,
        lang: targetLang,
        type: "hook",
        timestamp: new Date().toISOString(),
      },
    ];

    res.json({
      hookEn,
      hookTranslated,
      base64Audio,
      storyHistory: initialHistory,
      metrics: {
        llmMs,
        translateMs,
        ttsMs,
        totalMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("Error in /api/game/start:", error);
    res.status(500).json({ error: error.message || "Failed to initialize game" });
  }
});

/**
 * 2. GAME TURN: /api/game/turn
 * Receives recorded audio blob, executes:
 * - Saaras v4 (STT with mode="translate" directly to English)
 * - Sarvam-105B (Bridge summary - skipped if fastMode or short turn < 6s)
 * - Mayura v1 (Localize bridge to next player's language)
 * - Bulbul v4 Flash (Narrator voice audio)
 */
app.post("/api/game/turn", upload.single("audio"), async (req, res) => {
  const startTime = Date.now();
  let tempFilePath = null;

  try {
    const file = req.file;
    const {
      currentLang = "hi-IN",
      currentPlayerName = "Player 1",
      nextLang = "ta-IN",
      nextPlayerName = "Player 2",
      storyHistory: rawHistory = "[]",
      fastMode = "false",
      audioDuration = 0,
    } = req.body;

    let storyHistory = [];
    try {
      storyHistory = typeof rawHistory === "string" ? JSON.parse(rawHistory) : rawHistory;
    } catch {
      storyHistory = [];
    }

    if (!file) {
      return res.status(400).json({ error: "Audio file is required." });
    }

    // Prepare audio file with proper extension
    const ext = path.extname(file.originalname) || ".wav";
    tempFilePath = `${file.path}${ext}`;
    fs.renameSync(file.path, tempFilePath);

    // Step A: Voice Capture & Direct Translation to English via saaras:v4
    const t0 = Date.now();
    const sttResponse = await client.speechToText.transcribe({
      file: fs.createReadStream(tempFilePath),
      model: "saaras:v4",
      mode: "translate", // Direct translation to English in 1 step!
      language_code: currentLang,
    });
    const playerSpokenEn =
      sttResponse.transcript?.trim() || "Someone moved quietly in the shadows.";
    const sttMs = Date.now() - t0;

    // Step B: Summarize & Contextualize (or Latency Shortcut)
    const isFast =
      fastMode === "true" ||
      fastMode === true ||
      (Number(audioDuration) > 0 && Number(audioDuration) < 6 && fastMode !== "false");

    let bridgeEn = playerSpokenEn;
    let llmMs = 0;
    let pipelineUsed = "fast-direct";

    if (!isFast) {
      const t1 = Date.now();
      pipelineUsed = "llm-bridged";
      const recentContext = storyHistory
        .slice(-3)
        .map((h) => `${h.speaker}: ${h.textEn}`)
        .join("\n");

      const promptContext = `Story so far:\n${recentContext}\n${currentPlayerName}: ${playerSpokenEn}\n\nTask: Summarize what just happened in the latest turn in 1 short sentence (under 18 words) so the next player (${nextPlayerName}) knows how to continue the story. Respond ONLY with that sentence.`;

      const chatResponse = await client.chat.completions({
        model: "sarvam-105b",
        messages: [
          {
            role: "system",
            content:
              "You are a concise story bridge narrator. Respond ONLY with the single bridge sentence, with no commentary.",
          },
          {
            role: "user",
            content: promptContext,
          },
        ],
        temperature: 0.6,
        max_tokens: 50,
      });

      bridgeEn =
        chatResponse.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "") ||
        playerSpokenEn;
      llmMs = Date.now() - t1;
    }

    // Step C: Colloquial Translation via mayura:v1
    const t2 = Date.now();
    let bridgeTranslated = bridgeEn;
    if (nextLang !== "en-IN") {
      const transResponse = await client.text.translate({
        input: bridgeEn,
        source_language_code: "en-IN",
        target_language_code: nextLang,
        mode: "modern-colloquial",
        model: "mayura:v1",
      });
      bridgeTranslated = transResponse.translated_text || bridgeEn;
    }
    const translateMs = Date.now() - t2;

    // Step D: Synthesize Narrator Audio via bulbul:v4-flash
    const t3 = Date.now();
    const ttsResponse = await client.textToSpeech.convert({
      text: bridgeTranslated,
      language_code: nextLang,
      model: "bulbul:v4-flash",
      pace: 1.1,
    });
    const base64Audio = ttsResponse.audios?.[0] || null;
    const ttsMs = Date.now() - t3;

    // Append both the player's turn and the narrator's bridge to storyHistory
    const updatedStoryHistory = [
      ...storyHistory,
      {
        speaker: currentPlayerName,
        role: "player",
        textEn: playerSpokenEn,
        lang: currentLang,
        timestamp: new Date().toISOString(),
      },
      {
        speaker: "Story Master",
        role: "ai",
        textEn: bridgeEn,
        textLocal: bridgeTranslated,
        lang: nextLang,
        targetPlayer: nextPlayerName,
        timestamp: new Date().toISOString(),
      },
    ];

    res.json({
      playerSpokenEn,
      bridgeEn,
      bridgeTranslated,
      base64Audio,
      updatedStoryHistory,
      pipelineUsed,
      metrics: {
        sttMs,
        llmMs,
        translateMs,
        ttsMs,
        totalMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("Error in /api/game/turn:", error);
    res.status(500).json({ error: error.message || "Failed to process turn" });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
  }
});

/**
 * 3. GAME FINALIZE: /api/game/finalize
 * Weaves all turns into a cohesive 100-word story via sarvam-105b,
 * then translates in parallel via mayura:v1 for each unique language in the lobby.
 */
app.post("/api/game/finalize", async (req, res) => {
  const startTime = Date.now();
  try {
    const { storyHistory = [], uniqueLanguages = ["hi-IN"] } = req.body;

    const turnsFormatted = storyHistory
      .filter((h) => h.role === "player" || h.type === "hook")
      .map((h, i) => `Turn ${i + 1} (${h.speaker}): ${h.textEn}`)
      .join("\n");

    // Step A: Weave cohesive 100-word story via sarvam-105b
    const t0 = Date.now();
    const chatResponse = await client.chat.completions({
      model: "sarvam-105b",
      messages: [
        {
          role: "system",
          content:
            "You are a master fiction author. Given these multilingual player story turns, weave them into one cohesive, punchy, entertaining 100-word Indian fiction story. Output ONLY the story paragraphs, no headers or extra text.",
        },
        {
          role: "user",
          content: `Player contributions:\n${turnsFormatted}\n\nWrite a polished, cinematic 100-word story summarizing the journey:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 220,
    });

    const fullStoryEn =
      chatResponse.choices?.[0]?.message?.content?.trim() ||
      "On that unforgettable night, our paths crossed at the empty bus stop. What began as whispers soon turned into an adventure that none of us would ever forget.";
    const llmMs = Date.now() - t0;

    // Step B: Parallel translations via mayura:v1 for each unique language
    const t1 = Date.now();
    const translations = {};
    const translationPromises = uniqueLanguages.map(async (lang) => {
      if (lang === "en-IN") {
        translations["en-IN"] = fullStoryEn;
        return;
      }
      try {
        const transResponse = await client.text.translate({
          input: fullStoryEn,
          source_language_code: "en-IN",
          target_language_code: lang,
          mode: "modern-colloquial",
          model: "mayura:v1",
        });
        translations[lang] = transResponse.translated_text || fullStoryEn;
      } catch (err) {
        console.error(`Failed translation for ${lang}:`, err.message);
        translations[lang] = fullStoryEn; // Fallback
      }
    });

    await Promise.all(translationPromises);
    const translateMs = Date.now() - t1;

    res.json({
      fullStoryEn,
      translations,
      metrics: {
        llmMs,
        translateMs,
        totalMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("Error in /api/game/finalize:", error);
    res.status(500).json({ error: error.message || "Failed to finalize story" });
  }
});

/**
 * 4. TTS HELPER: /api/game/tts
 * Synthesize speech for any text and language code (used in the finale deck).
 */
app.post("/api/game/tts", async (req, res) => {
  try {
    const { text, language_code = "hi-IN" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const ttsResponse = await client.textToSpeech.convert({
      text,
      language_code,
      model: "bulbul:v4-flash",
      pace: 1.1,
    });

    res.json({ base64Audio: ttsResponse.audios?.[0] || null });
  } catch (error) {
    console.error("Error in /api/game/tts:", error);
    res.status(500).json({ error: error.message || "Failed to generate speech" });
  }
});

// Serve frontend build if dist folder exists
const distDir = path.resolve("./dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚌 Sarvam Multilingual Storytelling Game server running on http://localhost:${PORT}`);
  });
}

export default app;
