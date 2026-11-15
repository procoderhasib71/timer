// চ্যাটের থিম: প্রকৃতি, বই, পড়াশোনা ইত্যাদি। ব্যাকগ্রাউন্ড ছবি কোডেই আঁকা (SVG), আলাদা ফাইল লাগে না।
// থিম বাছলে হেডার, ট্যাব আর মেসেজ লেখার বারও থিমের রঙে বদলে যায় (আলো/অন্ধকার মোড যাই হোক)।
import type { CSSProperties } from "react";

const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

// নরম পাহাড়ের সারি (নিচে বসে)
const hills = (a: string, b: string, c: string) => svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" preserveAspectRatio="none">
    <path d="M0 110 Q70 60 150 100 T300 90 T400 80 V160 H0Z" fill="${a}"/>
    <path d="M0 130 Q90 90 190 125 T400 115 V160 H0Z" fill="${b}"/>
    <path d="M0 148 Q120 120 240 146 T400 140 V160 H0Z" fill="${c}"/>
  </svg>`);

const trees = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax slice">
    ${[20, 70, 120, 250, 310, 365].map((x, i) => `<g transform="translate(${x} ${i % 2 ? 22 : 8})"><rect x="9" y="52" width="4" height="14" fill="#7c4a2d"/><path d="M11 6 L25 32 H18 L28 52 H-6 L4 32 H-3Z" fill="${i % 2 ? "#15803d" : "#166534"}"/></g>`).join("")}
  </svg>`);

const spines = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="96" viewBox="0 0 180 96">
    <g opacity=".26">
      <rect x="6" y="20" width="14" height="60" rx="2" fill="#b45309"/><rect x="22" y="12" width="12" height="68" rx="2" fill="#0f766e"/>
      <rect x="36" y="26" width="16" height="54" rx="2" fill="#9f1239"/><rect x="54" y="16" width="11" height="64" rx="2" fill="#1d4ed8"/>
      <rect x="67" y="24" width="15" height="56" rx="2" fill="#a16207"/><rect x="84" y="10" width="13" height="70" rx="2" fill="#4d7c0f"/>
      <rect x="99" y="22" width="12" height="58" rx="2" fill="#7e22ce"/><rect x="113" y="14" width="16" height="66" rx="2" fill="#be123c"/>
      <rect x="131" y="26" width="12" height="54" rx="2" fill="#0369a1"/><rect x="145" y="18" width="14" height="62" rx="2" fill="#b45309"/>
      <rect x="161" y="24" width="13" height="56" rx="2" fill="#0f766e"/>
    </g>
    <rect x="0" y="80" width="180" height="6" fill="#92400e" opacity=".25"/>
  </svg>`);

const doodles = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".22">
    <path d="M30 40 l22 -12 l22 12 l-22 12z M38 46 v10 q14 8 28 0 v-10"/>
    <path d="M130 30 l16 16 M124 52 l-6 14 l14 -6 l24 -24 l-8 -8z"/>
    <circle cx="48" cy="140" r="14"/><path d="M48 132 v8 l6 4"/>
    <path d="M140 130 h26 v34 h-26z M146 138 h14 M146 146 h14 M146 154 h8"/>
  </svg>`);

const stars = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" fill="#fff">
    ${[[20, 30, 1.6], [90, 12, 1], [160, 48, 1.8], [200, 120, 1.1], [60, 90, 1.2], [130, 150, 1.6], [30, 180, 1], [180, 200, 1.4], [105, 205, 1.1], [75, 140, .9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity=".85"/>`).join("")}
  </svg>`);

const moon = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><path d="M52 14a31 31 0 1 0 24 48 25 25 0 0 1-24-48z" fill="#fef9c3"/></svg>`);

const waves = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" preserveAspectRatio="none">
    <path d="M0 50 Q50 20 100 50 T200 50 T300 50 T400 50 V120 H0Z" fill="#38bdf8" opacity=".35"/>
    <path d="M0 72 Q50 44 100 72 T200 72 T300 72 T400 72 V120 H0Z" fill="#0ea5e9" opacity=".4"/>
    <path d="M0 96 Q50 70 100 96 T200 96 T300 96 T400 96 V120 H0Z" fill="#0369a1" opacity=".45"/>
  </svg>`);

const sun = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="54" fill="#fde68a" opacity=".5"/><circle cx="70" cy="70" r="36" fill="#fbbf24"/></svg>`);

const peaks = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" preserveAspectRatio="none">
    <path d="M0 160 V90 L70 30 L120 85 L180 20 L250 95 L310 40 L400 110 V160Z" fill="#64748b" opacity=".55"/>
    <path d="M0 160 V120 L60 75 L130 120 L200 70 L280 125 L350 85 L400 115 V160Z" fill="#334155" opacity=".6"/>
    <path d="M70 30 L58 44 L70 40 L82 46Z M180 20 L166 38 L180 34 L194 40Z M310 40 L298 54 L310 50 L322 56Z" fill="#fff" opacity=".8"/>
  </svg>`);

export type ChatTheme = {
  id: string; bn: string; en: string;
  tone: "light" | "dark";
  area: CSSProperties;          // মেসেজের জায়গার পেছন
  bar: string;                  // হেডার আর নিচের বারের রং
  line: string;                 // বারের কিনারা
  ink: string; sub: string;     // লেখার রং (প্রধান / হালকা)
  accent: string;               // নিজের মেসেজ আর পাঠানোর বোতাম
  other: string; otherInk: string; // অন্যের মেসেজ
  chip: string;                 // বোতাম/ঘরের হালকা পেছন
};

export const CHAT_THEMES: ChatTheme[] = [
  { id: "plain", bn: "সাদামাটা", en: "Plain", tone: "light", area: {}, bar: "", line: "", ink: "", sub: "", accent: "", other: "", otherInk: "", chip: "" },
  { id: "forest", bn: "প্রকৃতি", en: "Nature", tone: "light",
    area: { backgroundColor: "#d9f5e3", backgroundImage: `${trees}, ${hills("#86d9a3", "#4cba78", "#2f9e5c")}, linear-gradient(180deg, #e0f7fa 0%, #d9f5e3 55%, #bbf0cf 100%)`, backgroundRepeat: "no-repeat", backgroundPosition: "bottom, bottom, 0 0", backgroundSize: "100% 90px, 100% 130px, 100% 100%" },
    bar: "rgba(236,253,245,.9)", line: "rgba(5,150,105,.2)", ink: "#064e3b", sub: "#3f7a60", accent: "#059669", other: "rgba(255,255,255,.92)", otherInk: "#14532d", chip: "rgba(5,150,105,.12)" },
  { id: "books", bn: "বই", en: "Books", tone: "light",
    area: { backgroundColor: "#fbf1dd", backgroundImage: `${spines}, linear-gradient(180deg, #fff7e6, #f7e7c6)`, backgroundRepeat: "repeat, no-repeat", backgroundSize: "180px 96px, 100% 100%" },
    bar: "rgba(255,247,230,.92)", line: "rgba(180,83,9,.22)", ink: "#5b3410", sub: "#8a6238", accent: "#b45309", other: "rgba(255,255,255,.94)", otherInk: "#4a2c0b", chip: "rgba(180,83,9,.12)" },
  { id: "study", bn: "পড়াশোনা", en: "Study", tone: "light",
    area: { backgroundColor: "#f3f6ff", backgroundImage: `${doodles}, linear-gradient(90deg, transparent 38px, rgba(244,63,94,.35) 38px, rgba(244,63,94,.35) 40px, transparent 40px), repeating-linear-gradient(180deg, transparent 0 27px, rgba(99,102,241,.22) 27px 28px)`, backgroundRepeat: "repeat, no-repeat, repeat", backgroundSize: "200px 200px, 100% 100%, 100% 28px" },
    bar: "rgba(238,242,255,.94)", line: "rgba(99,102,241,.22)", ink: "#1e1b4b", sub: "#5457a6", accent: "#4f46e5", other: "rgba(255,255,255,.95)", otherInk: "#1e1b4b", chip: "rgba(99,102,241,.12)" },
  { id: "night", bn: "রাতের আকাশ", en: "Night sky", tone: "dark",
    area: { backgroundColor: "#0b1026", backgroundImage: `${moon}, ${stars}, linear-gradient(180deg, #0b1026 0%, #1a1b4b 100%)`, backgroundRepeat: "no-repeat, repeat, no-repeat", backgroundPosition: "right 18px top 14px, 0 0, 0 0", backgroundSize: "90px 90px, 220px 220px, 100% 100%" },
    bar: "rgba(11,16,38,.97)", line: "rgba(255,255,255,.1)", ink: "#e0e7ff", sub: "#94a3d8", accent: "#6366f1", other: "rgba(30,41,82,.92)", otherInk: "#e0e7ff", chip: "rgba(255,255,255,.1)" },
  { id: "ocean", bn: "সাগর", en: "Ocean", tone: "light",
    area: { backgroundColor: "#e0f2fe", backgroundImage: `${waves}, linear-gradient(180deg, #f0f9ff 0%, #bae6fd 100%)`, backgroundRepeat: "no-repeat", backgroundPosition: "bottom, 0 0", backgroundSize: "100% 120px, 100% 100%" },
    bar: "rgba(240,249,255,.92)", line: "rgba(2,132,199,.22)", ink: "#0c4a6e", sub: "#3b7ba3", accent: "#0284c7", other: "rgba(255,255,255,.94)", otherInk: "#0c4a6e", chip: "rgba(2,132,199,.12)" },
  { id: "sunrise", bn: "ভোর", en: "Sunrise", tone: "light",
    area: { backgroundColor: "#ffe9d6", backgroundImage: `${sun}, ${hills("#fdba74", "#fb923c", "#ea580c")}, linear-gradient(180deg, #fff1e0 0%, #ffd7b5 60%, #fdba94 100%)`, backgroundRepeat: "no-repeat", backgroundPosition: "right 24px top 28px, bottom, 0 0", backgroundSize: "140px 140px, 100% 130px, 100% 100%" },
    bar: "rgba(255,244,230,.92)", line: "rgba(234,88,12,.22)", ink: "#7c2d12", sub: "#a8643c", accent: "#ea580c", other: "rgba(255,255,255,.94)", otherInk: "#7c2d12", chip: "rgba(234,88,12,.12)" },
  { id: "mountain", bn: "পাহাড়", en: "Mountains", tone: "light",
    area: { backgroundColor: "#e2e8f0", backgroundImage: `${peaks}, linear-gradient(180deg, #eaf2ff 0%, #cbd5e1 100%)`, backgroundRepeat: "no-repeat", backgroundPosition: "bottom, 0 0", backgroundSize: "100% 150px, 100% 100%" },
    bar: "rgba(241,245,249,.92)", line: "rgba(71,85,105,.22)", ink: "#1e293b", sub: "#64748b", accent: "#475569", other: "rgba(255,255,255,.94)", otherInk: "#1e293b", chip: "rgba(71,85,105,.12)" },
];
