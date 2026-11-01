import React from "react";

export default function TurnQueue({
  players = [],
  activePlayerIndex = 0,
}) {
  if (!players || players.length === 0) return null;

  return (
    <footer className="w-full max-w-md mx-auto px-4 pb-6 flex flex-col items-center gap-3">
      {/* 3D Tactile Turn Dots / Active Pill */}
      <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white border-2 border-[#e2edf5] shadow-[0_5px_0_#d0e0ed]">
        {players.map((p, idx) => {
          const isActive = idx === activePlayerIndex;

          if (isActive) {
            return (
              <div
                key={p.id || idx}
                className="btn-3d flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide text-white transition-all shadow-md"
                style={{
                  backgroundColor: p.color,
                  boxShadow: `0 3.5px 0 ${p.shadow || "rgba(0,0,0,0.2)"}`,
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <span className="uppercase text-xs font-black">
                  {p.name}
                </span>
              </div>
            );
          }

          return (
            <div
              key={p.id || idx}
              title={`${p.name} (${p.lang})`}
              className="w-4 h-4 rounded-full transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: p.color,
                boxShadow: `0 3px 0 ${p.shadow || "rgba(0,0,0,0.15)"}`,
                opacity: 0.65,
              }}
            />
          );
        })}
      </div>
    </footer>
  );
}
