import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Volume2, VolumeX, RotateCcw, Sparkles } from "lucide-react";
import { SUPPORTED_LANGUAGES, PALETTE } from "../utils/languages";
import { audioEngine } from "../utils/audioEngine";

export default function Finale({
  fullStoryEn = "",
  translations = {},
  players = [],
  storyHistory = [],
  onPlayAgain,
}) {
  const [playingLang, setPlayingLang] = useState(null);
  const [loadingAudioLang, setLoadingAudioLang] = useState(null);

  useEffect(() => {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: [
        PALETTE.monaLisa.hex,
        PALETTE.downy.hex,
        PALETTE.texasRose.hex,
        PALETTE.slateBlue.hex,
        PALETTE.pastelGreen.hex,
        PALETTE.amethyst.hex,
      ],
    });
  }, []);

  const handlePlayCard = async (langCode, text) => {
    if (playingLang === langCode) {
      audioEngine.stopAudioPlayback();
      setPlayingLang(null);
      return;
    }

    try {
      setLoadingAudioLang(langCode);
      const res = await fetch("/api/game/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language_code: langCode,
        }),
      });

      const data = await res.json();
      setLoadingAudioLang(null);

      if (data.base64Audio) {
        setPlayingLang(langCode);
        audioEngine.playBase64Audio(data.base64Audio, () => {
          setPlayingLang(null);
        });
      }
    } catch (err) {
      console.error("Failed to generate speech for card:", err);
      setLoadingAudioLang(null);
      setPlayingLang(null);
    }
  };

  const getLangDetails = (code) => {
    return (
      SUPPORTED_LANGUAGES.find((l) => l.code === code) || {
        name: code,
        native: code,
      }
    );
  };

  const uniqueLanguages = Array.from(new Set(players.map((p) => p.lang)));

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6 animate-fadeIn overflow-y-auto max-h-[88vh]">
      {/* Header Pill Banner */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="pill-banner px-8 py-2.5 text-base sm:text-lg">
          02 • Multilingual Story Finale
        </div>
        <p className="text-sm text-slate-500 font-bold max-w-md">
          Collaboratively woven by Sarvam-105B into a cohesive story and localized with Mayura:v1.
        </p>
      </div>

      {/* Story Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {uniqueLanguages.map((langCode) => {
          const langInfo = getLangDetails(langCode);
          const localizedText = translations[langCode] || fullStoryEn;
          const associatedPlayers = players.filter((p) => p.lang === langCode);
          const primaryColor = associatedPlayers[0]?.color || PALETTE.downy.hex;
          const primaryShadow = associatedPlayers[0]?.shadow || PALETTE.downy.shadow;
          const isPlaying = playingLang === langCode;
          const isLoading = loadingAudioLang === langCode;

          return (
            <div
              key={langCode}
              className="card-3d p-6 flex flex-col justify-between gap-4 transition-all duration-200"
              style={{
                borderColor: isPlaying ? primaryColor : "#e2edf5",
                boxShadow: isPlaying
                  ? `0 6px 0 ${primaryShadow}`
                  : "0 6px 0 #d0e0ed",
              }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div className="font-black text-sm tracking-wide text-slate-800">
                    {langInfo.native} • <span className="text-xs text-slate-500 font-bold">{langInfo.name}</span>
                  </div>
                </div>

                <div className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#F0F6FA] text-slate-600 border border-[#e2edf5]">
                  {associatedPlayers.map((p) => p.name).join(", ")}
                </div>
              </div>

              {/* Story Text */}
              <p className="text-slate-700 text-sm leading-relaxed font-bold whitespace-pre-line">
                {localizedText}
              </p>

              {/* Card Footer */}
              <div className="pt-3 border-t-2 border-[#f0f6fa] flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-400">
                  bulbul:v4-flash narration
                </div>

                {/* Tactile 3D Listen Button */}
                <button
                  onClick={() => handlePlayCard(langCode, localizedText)}
                  disabled={isLoading}
                  className="btn-3d flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black text-white cursor-pointer"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 3.5px 0 ${primaryShadow}`,
                  }}
                >
                  {isLoading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-center pt-2">
        <button
          onClick={onPlayAgain}
          className="btn-3d flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#7274ED] border-2 border-[#7274ED] text-white font-black text-sm shadow-[0_5px_0_#5254CD] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Again</span>
        </button>
      </div>
    </div>
  );
}
