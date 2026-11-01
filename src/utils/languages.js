export const SUPPORTED_LANGUAGES = [
  { code: "hi-IN", name: "Hindi", native: "हिंदी" },
  { code: "bn-IN", name: "Bengali", native: "বাংলা" },
  { code: "ta-IN", name: "Tamil", native: "தமிழ்" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు" },
  { code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", name: "Malayalam", native: "മലയാളം" },
  { code: "mr-IN", name: "Marathi", native: "मराठी" },
  { code: "gu-IN", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "od-IN", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "en-IN", name: "English", native: "English" },
];

export const PALETTE = {
  amethyst: { hex: "#9956DE", shadow: "#7B3ABF", name: "Amethyst" },
  slateBlue: { hex: "#7274ED", shadow: "#5254CD", name: "Slate Blue" },
  summerSky: { hex: "#1FA7E1", shadow: "#1486B8", name: "Summer Sky" },
  downy: { hex: "#6ED1CF", shadow: "#4DB3B1", name: "Downy" },
  pastelGreen: { hex: "#75D06A", shadow: "#56B14B", name: "Pastel Green" },
  texasRose: { hex: "#FFB356", shadow: "#D99337", name: "Texas Rose" },
  monaLisa: { hex: "#FF8B8B", shadow: "#D96C6C", name: "Mona Lisa" },
  illusion: { hex: "#FB96BB", shadow: "#D67398", name: "Illusion" },
};

export const PLAYER_COLORS = [
  PALETTE.monaLisa,
  PALETTE.downy,
  PALETTE.texasRose,
  PALETTE.slateBlue,
  PALETTE.pastelGreen,
  PALETTE.amethyst,
  PALETTE.summerSky,
  PALETTE.illusion,
];

export const GENRES = [
  { id: "last-bus", title: "Last Bus Home", color: PALETTE.summerSky, desc: "Midnight mysteries & strange passengers" },
  { id: "hostel-heist", title: "Hostel Heist", color: PALETTE.texasRose, desc: "Maggi raids, locked gates & missing room keys" },
  { id: "monsoon-mystery", title: "Monsoon Mystery", color: PALETTE.downy, desc: "Chai stalls, downpours & an enigmatic traveler" },
  { id: "absurd-scifi", title: "Absurd Sci-Fi", color: PALETTE.amethyst, desc: "Warp-drive auto-rickshaws & cosmic signals" },
];
