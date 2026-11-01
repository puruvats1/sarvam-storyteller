import React, { useState } from "react";
import { Users, Globe, Play, Sparkles } from "lucide-react";
import { SUPPORTED_LANGUAGES, PLAYER_COLORS, GENRES, PALETTE } from "../utils/languages";

export default function Lobby({ onStartGame, isStarting = false }) {
  const [playerCount, setPlayerCount] = useState(3);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [players, setPlayers] = useState([
    { id: 1, name: "Aarav", lang: "hi-IN", color: PLAYER_COLORS[0].hex, shadow: PLAYER_COLORS[0].shadow },
    { id: 2, name: "Kavya", lang: "ta-IN", color: PLAYER_COLORS[1].hex, shadow: PLAYER_COLORS[1].shadow },
    { id: 3, name: "Rohan", lang: "mr-IN", color: PLAYER_COLORS[2].hex, shadow: PLAYER_COLORS[2].shadow },
  ]);

  const handlePlayerCountChange = (count) => {
    setPlayerCount(count);
    const updated = [];
    const defaultNames = ["Aarav", "Kavya", "Rohan", "Ananya", "Ishaan", "Meera"];
    const defaultLangs = ["hi-IN", "ta-IN", "mr-IN", "bn-IN", "te-IN", "en-IN"];

    for (let i = 0; i < count; i++) {
      const paletteItem = PLAYER_COLORS[i % PLAYER_COLORS.length];
      if (players[i]) {
        updated.push({
          ...players[i],
          color: paletteItem.hex,
          shadow: paletteItem.shadow,
        });
      } else {
        updated.push({
          id: i + 1,
          name: defaultNames[i] || `Player ${i + 1}`,
          lang: defaultLangs[i] || "hi-IN",
          color: paletteItem.hex,
          shadow: paletteItem.shadow,
        });
      }
    }
    setPlayers(updated);
  };

  const handleNameChange = (index, name) => {
    const updated = [...players];
    updated[index].name = name;
    setPlayers(updated);
  };

  const handleLangChange = (index, lang) => {
    const updated = [...players];
    updated[index].lang = lang;
    setPlayers(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (players.length < 2) return;
    onStartGame({ players, genre: selectedGenre.title });
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6 animate-fadeIn overflow-y-auto max-h-[92vh]">
      {/* Reference Style Header Pill Banner */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="pill-banner px-8 py-2.5 text-base sm:text-lg">
          01 • The Bus-Stop Storyteller
        </div>
        <p className="text-sm text-slate-500 font-bold max-w-md">
          Pass the mic in any Indian language. Sarvam AI translates, summarizes, and speaks into the next player’s ear.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Section 1: Player Count */}
        <div className="card-3d p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7274ED]" />
              <span>Player Count (2 to 6 Players)</span>
            </label>
            <span className="text-xs font-black text-[#7274ED] bg-[#F0F2FD] px-2.5 py-1 rounded-full">
              {playerCount} Players
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            {[2, 3, 4, 5, 6].map((count) => {
              const isSelected = playerCount === count;
              return (
                <button
                  type="button"
                  key={count}
                  onClick={() => handlePlayerCountChange(count)}
                  className={`btn-3d py-2.5 rounded-2xl font-black text-sm border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#7274ED] border-[#7274ED] text-white shadow-[0_4px_0_#5254CD]"
                      : "bg-white border-[#e2edf5] text-slate-600 hover:border-[#cbd5e1] shadow-[0_3px_0_#d0e0ed]"
                  }`}
                >
                  {count}P
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Players & Languages */}
        <div className="card-3d p-5 space-y-3.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#1FA7E1]" />
            <span>Player Lineup & Native Languages</span>
          </label>

          <div className="flex flex-col gap-2.5">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#F8FAFC] border-2 border-[#e2edf5] transition-all"
              >
                {/* 3D Color Swatch Token */}
                <div
                  className="w-5 h-5 rounded-full shrink-0 shadow-sm"
                  style={{
                    backgroundColor: p.color,
                    boxShadow: `0 3px 0 ${p.shadow}`,
                  }}
                />

                {/* Name Input */}
                <input
                  type="text"
                  required
                  value={p.name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  placeholder={`Player ${idx + 1}`}
                  className="w-1/3 bg-white border-2 border-[#e2edf5] rounded-xl px-3 py-1.5 text-sm font-extrabold text-slate-800 focus:outline-none focus:border-[#7274ED] transition-colors"
                />

                {/* Language Select */}
                <select
                  value={p.lang}
                  onChange={(e) => handleLangChange(idx, e.target.value)}
                  className="flex-1 bg-white border-2 border-[#e2edf5] rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#7274ED] transition-colors"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.native} • {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Genre Selection */}
        <div className="card-3d p-5 space-y-3.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB356]" />
            <span>Story Setting & Theme</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GENRES.map((g) => {
              const isSelected = selectedGenre.id === g.id;
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setSelectedGenre(g)}
                  className={`btn-3d p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? "bg-white border-[#6ED1CF] shadow-[0_4px_0_#4DB3B1]"
                      : "bg-[#F8FAFC] border-[#e2edf5] hover:border-[#cbd5e1] shadow-[0_3px_0_#d0e0ed]"
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm text-slate-800">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: g.color.hex }}
                    />
                    <span>{g.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">{g.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Tactile 3D Action Button (Reference "✓ Yes" Pastel Green style) */}
        <button
          type="submit"
          disabled={isStarting}
          className="btn-3d w-full py-4 rounded-2xl font-black text-base text-white bg-[#75D06A] border-2 border-[#75D06A] shadow-[0_5px_0_#56B14B] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isStarting ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Starting Story Circle...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white" />
              <span>Start Story Circle</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
