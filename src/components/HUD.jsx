import React from "react";
import { Zap, Clock, StopCircle, Activity } from "lucide-react";

export default function HUD({
  secondsLeft = 120,
  genreTitle = "Last Bus Home",
  fastMode = false,
  onToggleFastMode,
  onEndGame,
  onOpenExplorer,
  gameState,
}) {
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.floor(Math.max(0, totalSeconds) % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isLowTime = secondsLeft <= 30;

  return (
    <header className="w-full max-w-4xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-3">
      {/* Left: Genre Pill & Pipeline Mode (Styled after reference Pill Banners) */}
      <div className="flex items-center gap-2.5">
        <div className="pill-banner px-4 py-1.5 flex items-center gap-2 text-xs uppercase tracking-wider font-extrabold text-[#1a928f]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#75D06A]" />
          <span>{genreTitle}</span>
        </div>

        {/* 3D Tactile Pipeline Switch */}
        <button
          onClick={onToggleFastMode}
          title="Toggle between Fast Direct Pipeline (~1.1s) and LLM-Bridged Pipeline (~2.2s)"
          className={`btn-3d px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
            fastMode
              ? "bg-[#FFB356] border-[#FFB356] text-white shadow-[0_3.5px_0_#D99337]"
              : "bg-[#7274ED] border-[#7274ED] text-white shadow-[0_3.5px_0_#5254CD]"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {fastMode ? "Fast Mode (1.1s)" : "LLM Bridge (2.2s)"}
          </span>
        </button>
      </div>

      {/* Center: Global 120-second countdown timer */}
      <div
        className={`px-4 py-1.5 rounded-full border-2 font-black text-sm tracking-wider flex items-center gap-2 transition-all ${
          isLowTime
            ? "bg-[#FF8B8B] border-[#FF8B8B] text-white shadow-[0_3.5px_0_#D96C6C] animate-pulse"
            : "bg-white border-[#6ED1CF] text-[#1FA7E1] shadow-[0_3.5px_0_#4DB3B1]"
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>{formatTime(secondsLeft)}</span>
      </div>

      {/* Right: Explorer & Finish Story */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenExplorer}
          className="btn-3d px-3.5 py-1.5 rounded-full bg-white border-2 border-[#e2edf5] text-slate-600 hover:text-slate-800 shadow-[0_3.5px_0_#d0e0ed] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-[#1FA7E1]" />
          <span className="hidden md:inline">Telemetry</span>
        </button>

        {gameState !== "STATE_FINALE" && (
          <button
            onClick={onEndGame}
            className="btn-3d px-4 py-1.5 rounded-full bg-[#FF8B8B] border-2 border-[#FF8B8B] text-white shadow-[0_3.5px_0_#D96C6C] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Finish</span>
          </button>
        )}
      </div>
    </header>
  );
}
