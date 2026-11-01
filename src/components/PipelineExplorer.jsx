import React from "react";
import { X, Activity, Zap } from "lucide-react";

export default function PipelineExplorer({
  isOpen = false,
  onClose,
  metrics = {},
  pipelineUsed = "llm-bridged",
  fastMode = false,
  onToggleFastMode,
  storyHistory = [],
  currentState = "STATE_AI_SPEAKING",
}) {
  if (!isOpen) return null;

  const {
    sttMs = 0,
    llmMs = 0,
    translateMs = 0,
    ttsMs = 0,
    totalMs = 0,
  } = metrics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/30 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md h-full bg-white border-l-2 border-[#e2edf5] p-6 flex flex-col gap-5 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#f0f6fa]">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1FA7E1]" />
            <h3 className="font-black text-base text-slate-800">
              Sarvam AI Telemetry Explorer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-[#F0F6FA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Mode Switch */}
        <div className="card-3d p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400">
              Pipeline Routing
            </span>
            <span
              className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                fastMode
                  ? "bg-[#FFF4E5] text-[#D99337]"
                  : "bg-[#F0F2FD] text-[#5254CD]"
              }`}
            >
              {fastMode ? "Fast Direct (~1.1s)" : "LLM-Bridged (~2.2s)"}
            </span>
          </div>

          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            {fastMode
              ? "⚡ Fast Direct mode skips Sarvam-105B summarization and routes saaras:v4 English output straight into mayura:v1 to cut ~1.1s latency."
              : "🧠 LLM-Bridged mode prompts Sarvam-105B to compress the latest player turn into an engaging bridge hook for the next player."}
          </p>

          <button
            onClick={onToggleFastMode}
            className={`btn-3d w-full py-2.5 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              fastMode
                ? "bg-[#FFB356] border-[#FFB356] text-white shadow-[0_3.5px_0_#D99337]"
                : "bg-[#7274ED] border-[#7274ED] text-white shadow-[0_3.5px_0_#5254CD]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Switch to {fastMode ? "LLM-Bridged Pipeline" : "Fast Direct Pipeline"}</span>
          </button>
        </div>

        {/* Live Stage Latency Cards */}
        <div className="space-y-2.5">
          <span className="text-xs font-black uppercase text-slate-400">
            Latest Turn Latency
          </span>

          {/* Total Latency Meter */}
          <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border-2 border-[#BBF7D0] flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800">Total Turnaround Latency</span>
            <span className="text-base font-black text-emerald-600 font-mono">
              {totalMs > 0 ? `${(totalMs / 1000).toFixed(2)}s` : "Waiting for turn..."}
            </span>
          </div>

          {/* Stage 1: STT */}
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border-2 border-[#e2edf5] space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700">1. Voice Capture (STT)</span>
              <span className="font-mono text-[#1FA7E1] font-black">{sttMs}ms</span>
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              Model: <code className="text-[#1FA7E1]">saaras:v4</code> • mode: "translate"
            </div>
          </div>

          {/* Stage 2: LLM */}
          <div
            className={`p-3 rounded-2xl border-2 space-y-1 ${
              pipelineUsed === "fast-direct"
                ? "bg-[#F8FAFC] border-[#e2edf5] opacity-50"
                : "bg-[#F8FAFC] border-[#e2edf5]"
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700">2. Story Master Bridge (LLM)</span>
              <span className="font-mono text-[#7274ED] font-black">
                {pipelineUsed === "fast-direct" ? "BYPASSED" : `${llmMs}ms`}
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              Model: <code className="text-[#7274ED]">sarvam-105b</code>
            </div>
          </div>

          {/* Stage 3: Translation */}
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border-2 border-[#e2edf5] space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700">3. Modern Localization</span>
              <span className="font-mono text-[#FFB356] font-black">{translateMs}ms</span>
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              Model: <code className="text-[#FFB356]">mayura:v1</code> • mode: "modern-colloquial"
            </div>
          </div>

          {/* Stage 4: TTS */}
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border-2 border-[#e2edf5] space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700">4. Narrator Speech (TTS)</span>
              <span className="font-mono text-[#75D06A] font-black">{ttsMs}ms</span>
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              Model: <code className="text-[#75D06A]">bulbul:v4-flash</code> • pace: 1.1
            </div>
          </div>
        </div>

        {/* State Machine Status */}
        <div className="card-3d p-4 space-y-1">
          <span className="text-xs font-black uppercase text-slate-400">
            Active Game State
          </span>
          <div className="font-mono text-xs text-[#75D06A] font-black flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#75D06A] animate-ping" />
            <span>{currentState}</span>
          </div>
        </div>

        {/* Story History Log */}
        <div className="card-3d p-4 space-y-2 flex-1">
          <span className="text-xs font-black uppercase text-slate-400">
            Turn Log ({storyHistory.length} events)
          </span>
          <div className="space-y-2 max-h-44 overflow-y-auto text-xs text-slate-600 font-bold">
            {storyHistory.slice(-5).map((h, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#e2edf5]">
                <span className="text-[#7274ED] font-black">{h.speaker}: </span>
                <span>{h.textEn}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
