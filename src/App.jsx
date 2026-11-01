import React, { useState, useEffect, useRef } from "react";
import HUD from "./components/HUD";
import OrbCanvas from "./components/OrbCanvas";
import TurnQueue from "./components/TurnQueue";
import Lobby from "./components/Lobby";
import Finale from "./components/Finale";
import PipelineExplorer from "./components/PipelineExplorer";
import { audioEngine } from "./utils/audioEngine";
import { SUPPORTED_LANGUAGES, PALETTE } from "./utils/languages";
import { Mic, Volume2, Sparkles, Check } from "lucide-react";

export default function App() {
  // Game states: STATE_LOBBY | STATE_INIT_ROUND | STATE_AI_SPEAKING | STATE_LISTENING | STATE_BRIDGING | STATE_FINALE
  const [gameState, setGameState] = useState("STATE_LOBBY");
  const [players, setPlayers] = useState([]);
  const [genre, setGenre] = useState("Last Bus Home");
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);

  // Global 120-second game countdown
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [gameTimerActive, setGameTimerActive] = useState(false);

  // Turn 15-second countdown progress (1 to 0)
  const [turnProgress, setTurnProgress] = useState(1);

  // Story history and current transcript ribbon
  const [storyHistory, setStoryHistory] = useState([]);
  const [currentRibbonText, setCurrentRibbonText] = useState("");
  const [currentRibbonSub, setCurrentRibbonSub] = useState("");

  // Latency & pipeline controls
  const [fastMode, setFastMode] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [latestMetrics, setLatestMetrics] = useState({});
  const [pipelineUsed, setPipelineUsed] = useState("llm-bridged");

  // Finale data
  const [finaleStoryEn, setFinaleStoryEn] = useState("");
  const [finaleTranslations, setFinaleTranslations] = useState({});
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Loading states
  const [isStartingGame, setIsStartingGame] = useState(false);

  // Refs for audio and timers
  const turnIntervalRef = useRef(null);
  const turnStartTimeRef = useRef(0);
  const hasPendingFinaleRef = useRef(false);

  const activePlayer = players[activePlayerIndex] || {
    name: "Player 1",
    lang: "hi-IN",
    color: PALETTE.monaLisa.hex,
    shadow: PALETTE.monaLisa.shadow,
  };

  const nextPlayerIndex = (activePlayerIndex + 1) % (players.length || 1);
  const nextPlayer = players[nextPlayerIndex] || activePlayer;

  // 1. GLOBAL 120-SECOND COUNTDOWN TIMER
  useEffect(() => {
    let timer = null;
    if (gameTimerActive && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            hasPendingFinaleRef.current = true;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameTimerActive, secondsLeft]);

  const getLangNative = (code) => {
    const l = SUPPORTED_LANGUAGES.find((item) => item.code === code);
    return l ? l.native : code;
  };

  // 2. START GAME TRIGGER
  const handleStartGame = async ({ players: selectedPlayers, genre: selectedGenre }) => {
    try {
      setIsStartingGame(true);
      setPlayers(selectedPlayers);
      setGenre(selectedGenre);
      setActivePlayerIndex(0);
      setSecondsLeft(120);
      hasPendingFinaleRef.current = false;
      setGameState("STATE_INIT_ROUND");

      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: selectedPlayers,
          genre: selectedGenre,
        }),
      });

      if (!res.ok) throw new Error("Failed to start game");
      const data = await res.json();

      setStoryHistory(data.storyHistory || []);
      setLatestMetrics(data.metrics || {});
      setPipelineUsed("sarvam-105b");

      setGameTimerActive(true);
      setIsStartingGame(false);

      triggerAiSpeakingState(data.hookTranslated, data.hookEn, data.base64Audio);
    } catch (err) {
      console.error("Game start failed:", err);
      setIsStartingGame(false);
      setGameState("STATE_LOBBY");
      alert("Failed to initialize game with Sarvam AI: " + err.message);
    }
  };

  // 3. AI SPEAKING STATE
  const triggerAiSpeakingState = (spokenText, englishSub, base64Audio) => {
    setGameState("STATE_AI_SPEAKING");
    setCurrentRibbonText(spokenText || "");
    setCurrentRibbonSub(englishSub !== spokenText ? englishSub : "");

    if (base64Audio) {
      audioEngine.playBase64Audio(base64Audio, () => {
        triggerListeningState();
      });
    } else {
      setTimeout(() => {
        triggerListeningState();
      }, 3500);
    }
  };

  // 4. PLAYER MIC CAPTURE (STATE_LISTENING)
  const triggerListeningState = async () => {
    if (hasPendingFinaleRef.current) {
      triggerFinaleState();
      return;
    }

    setGameState("STATE_LISTENING");
    setCurrentRibbonText(`Pass mic to ${activePlayer.name}`);
    setCurrentRibbonSub(`Speak in ${getLangNative(activePlayer.lang)} (${activePlayer.lang})`);
    setTurnProgress(1);

    await audioEngine.playChime();
    turnStartTimeRef.current = Date.now();

    if (turnIntervalRef.current) clearInterval(turnIntervalRef.current);
    turnIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - turnStartTimeRef.current;
      const progress = Math.max(0, 1 - elapsed / 15000);
      setTurnProgress(progress);
      if (progress <= 0) {
        clearInterval(turnIntervalRef.current);
      }
    }, 100);

    const micStarted = await audioEngine.startMicRecording({
      onSilenceDetected: () => {
        finishPlayerTurn();
      },
      onTurnTimeout: () => {
        finishPlayerTurn();
      },
    });

    if (!micStarted) {
      console.warn("Microphone not available; using fallback test audio.");
    }
  };

  // 5. FINISH PLAYER TURN -> STATE_BRIDGING
  const finishPlayerTurn = async () => {
    if (turnIntervalRef.current) clearInterval(turnIntervalRef.current);
    if (gameState !== "STATE_LISTENING") return;

    setGameState("STATE_BRIDGING");
    setCurrentRibbonText(`Bridging ${activePlayer.name} ➔ ${nextPlayer.name}...`);
    setCurrentRibbonSub("Saaras:v4 translating & Sarvam-105B synthesizing context");

    const { blob, duration } = await audioEngine.stopMicRecording();

    try {
      const formData = new FormData();
      if (blob && blob.size > 0) {
        formData.append("audio", blob, "turn.webm");
      } else {
        const emptyWav = new Uint8Array(44);
        formData.append("audio", new Blob([emptyWav], { type: "audio/wav" }), "turn.wav");
      }

      formData.append("currentLang", activePlayer.lang);
      formData.append("currentPlayerName", activePlayer.name);
      formData.append("nextLang", nextPlayer.lang);
      formData.append("nextPlayerName", nextPlayer.name);
      formData.append("storyHistory", JSON.stringify(storyHistory));
      formData.append("fastMode", String(fastMode));
      formData.append("audioDuration", String(duration));

      const res = await fetch("/api/game/turn", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Turn handoff failed");
      const data = await res.json();

      setStoryHistory(data.updatedStoryHistory || []);
      setLatestMetrics(data.metrics || {});
      setPipelineUsed(data.pipelineUsed || "llm-bridged");

      setActivePlayerIndex(nextPlayerIndex);

      if (hasPendingFinaleRef.current || secondsLeft <= 0) {
        triggerFinaleState(data.updatedStoryHistory);
        return;
      }

      triggerAiSpeakingState(data.bridgeTranslated, data.bridgeEn, data.base64Audio);
    } catch (err) {
      console.error("Turn processing error:", err);
      setActivePlayerIndex(nextPlayerIndex);
      triggerListeningState();
    }
  };

  // 6. FINALE TRIGGER
  const triggerFinaleState = async (historyToFinalize = storyHistory) => {
    setGameTimerActive(false);
    audioEngine.stopAudioPlayback();
    setGameState("STATE_FINALE");
    setIsFinalizing(true);
    setCurrentRibbonText("Weaving Multilingual Story Finale...");
    setCurrentRibbonSub("Sarvam-105B creating 100-word cohesive story & Mayura:v1 translating");

    const uniqueLanguages = Array.from(new Set(players.map((p) => p.lang)));

    try {
      const res = await fetch("/api/game/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyHistory: historyToFinalize,
          uniqueLanguages,
        }),
      });

      if (!res.ok) throw new Error("Failed to finalize story");
      const data = await res.json();

      setFinaleStoryEn(data.fullStoryEn);
      setFinaleTranslations(data.translations || {});
      setLatestMetrics(data.metrics || {});
      setIsFinalizing(false);
    } catch (err) {
      console.error("Finale compilation error:", err);
      setIsFinalizing(false);
      setFinaleStoryEn("The journey ended at dawn as the first morning bus arrived.");
      setFinaleTranslations({});
    }
  };

  const handleOrbClick = () => {
    if (gameState === "STATE_LISTENING") {
      finishPlayerTurn();
    }
  };

  const handleResetGame = () => {
    audioEngine.stopAudioPlayback();
    setGameState("STATE_LOBBY");
    setStoryHistory([]);
    setSecondsLeft(120);
    setGameTimerActive(false);
    hasPendingFinaleRef.current = false;
  };

  return (
    <div className="relative w-screen h-screen bg-[#F0F6FA] text-slate-800 flex flex-col justify-between overflow-hidden select-none font-['Nunito',sans-serif]">
      {/* Top HUD */}
      {gameState !== "STATE_LOBBY" && (
        <HUD
          secondsLeft={secondsLeft}
          genreTitle={genre}
          fastMode={fastMode}
          onToggleFastMode={() => setFastMode(!fastMode)}
          onEndGame={() => triggerFinaleState()}
          onOpenExplorer={() => setIsExplorerOpen(true)}
          gameState={gameState}
        />
      )}

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center w-full px-4 relative">
        {gameState === "STATE_LOBBY" ? (
          <Lobby onStartGame={handleStartGame} isStarting={isStartingGame} />
        ) : gameState === "STATE_FINALE" ? (
          isFinalizing ? (
            <div className="card-3d p-8 flex flex-col items-center gap-4 text-center max-w-md">
              <div className="w-12 h-12 border-4 border-[#75D06A] border-t-transparent rounded-full animate-spin" />
              <div className="text-lg font-black text-slate-800">
                Sarvam-105B is Weaving Your Story...
              </div>
              <div className="text-xs font-bold text-slate-400">
                Translating with Mayura:v1
              </div>
            </div>
          ) : (
            <Finale
              fullStoryEn={finaleStoryEn}
              translations={finaleTranslations}
              players={players}
              storyHistory={storyHistory}
              onPlayAgain={handleResetGame}
            />
          )
        ) : (
          /* GAMEPLAY CENTER STAGE: THE BOUNCY ORB SOUND CREATURE */
          <div className="flex flex-col items-center justify-center gap-5 max-w-xl text-center">
            {/* The Audio-Reactive Character Orb */}
            <div className="relative flex items-center justify-center">
              <OrbCanvas
                gameState={gameState}
                activeColor={activePlayer.color}
                activeShadow={activePlayer.shadow}
                nextColor={nextPlayer.color}
                turnProgress={turnProgress}
                onOrbClick={handleOrbClick}
              />
            </div>

            {/* Speaker Badge */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="text-xl sm:text-2xl font-black tracking-wide transition-colors"
                style={{ color: activePlayer.color }}
              >
                {activePlayer.name} • {getLangNative(activePlayer.lang)}
              </div>

              <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                {gameState === "STATE_AI_SPEAKING" && (
                  <span className="flex items-center gap-1.5 text-[#7274ED]">
                    <Volume2 className="w-4 h-4 animate-bounce" />
                    <span>Story Master Speaking ({activePlayer.lang})</span>
                  </span>
                )}
                {gameState === "STATE_LISTENING" && (
                  <span className="flex items-center gap-1.5 text-[#FF8B8B]">
                    <Mic className="w-4 h-4 animate-pulse" />
                    <span>Listening to {activePlayer.name}...</span>
                  </span>
                )}
                {gameState === "STATE_BRIDGING" && (
                  <span className="flex items-center gap-1.5 text-[#1FA7E1]">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Handoff to {nextPlayer.name}...</span>
                  </span>
                )}
                {gameState === "STATE_INIT_ROUND" && (
                  <span>Initializing with Sarvam AI...</span>
                )}
              </div>
            </div>

            {/* Tactile 3D Transcript / Speech Card */}
            <div className="card-3d px-6 py-4 max-w-lg w-full min-h-[76px] flex flex-col justify-center gap-1 shadow-sm">
              <div className="text-sm sm:text-base font-extrabold text-slate-800 leading-snug">
                "{currentRibbonText}"
              </div>
              {currentRibbonSub && (
                <div className="text-xs text-slate-400 font-bold italic">
                  ({currentRibbonSub})
                </div>
              )}
            </div>

            {/* Tactile 3D Pass Turn Button */}
            {gameState === "STATE_LISTENING" && (
              <button
                onClick={finishPlayerTurn}
                className="btn-3d px-6 py-2.5 rounded-2xl text-xs font-black text-white flex items-center gap-2 cursor-pointer transition-all shadow-md"
                style={{
                  backgroundColor: activePlayer.color,
                  boxShadow: `0 4px 0 ${activePlayer.shadow || "rgba(0,0,0,0.2)"}`,
                }}
              >
                <Check className="w-4 h-4" />
                <span>Done Speaking ➔ Pass to {nextPlayer.name}</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Bottom Turn Queue */}
      {gameState !== "STATE_LOBBY" && gameState !== "STATE_FINALE" && (
        <TurnQueue players={players} activePlayerIndex={activePlayerIndex} />
      )}

      {/* Telemetry Explorer Drawer */}
      <PipelineExplorer
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        metrics={latestMetrics}
        pipelineUsed={pipelineUsed}
        fastMode={fastMode}
        onToggleFastMode={() => setFastMode(!fastMode)}
        storyHistory={storyHistory}
        currentState={gameState}
      />
    </div>
  );
}
