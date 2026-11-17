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

// Messenger এর মতো থিমের নকশা: ছোট হার্ট, বিন্দু, ঝিকিমিকি
const hearts = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="#f43f5e" opacity=".14">
    <path d="M30 40c-4-8-16-6-16 3 0 7 9 12 16 18 7-6 16-11 16-18 0-9-12-11-16-3z"/>
    <path d="M90 90c-3-6-12-4.5-12 2 0 5 7 9 12 13 5-4 12-8 12-13 0-6.5-9-8-12-2z"/>
    <path d="M92 26c-2-4-8-3-8 1.5 0 3.5 4.5 6 8 9 3.5-3 8-5.5 8-9 0-4.5-6-5.5-8-1.5z"/>
  </svg>`);

const dots = (c: string) => svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="4" cy="4" r="1.6" fill="${c}"/></svg>`);

const sparkles = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" fill="#fff">
    <path d="M30 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity=".5"/><path d="M120 60l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" opacity=".4"/>
    <path d="M70 120l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".35"/><circle cx="140" cy="140" r="1.2" opacity=".6"/><circle cx="10" cy="90" r="1" opacity=".6"/>
  </svg>`);

export type ChatTheme = {
  id: string; bn: string; en: string;
  tone: "light" | "dark";
  area: CSSProperties;          // মেসেজের জায়গার পেছন
  bar: string;                  // হেডার আর নিচের বারের রং
  line: string;                 // বারের কিনারা
  ink: string; sub: string;     // লেখার রং (প্রধান / হালকা)
  accent: string;               // নিজের মেসেজ আর পাঠানোর বোতাম (রং বা gradient)
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

  // ── Messenger এর মতো: নিজের মেসেজ রঙিন gradient বাবলে ──
  { id: "love", bn: "ভালোবাসা", en: "Love", tone: "light",
    area: { backgroundColor: "#fff1f4", backgroundImage: `${hearts}, linear-gradient(180deg, #fff5f7 0%, #ffe0e8 100%)`, backgroundRepeat: "repeat, no-repeat", backgroundSize: "120px 120px, 100% 100%" },
    bar: "rgba(255,241,244,.94)", line: "rgba(244,63,94,.2)", ink: "#881337", sub: "#be4b6b", accent: "linear-gradient(135deg, #ff6b9a, #f0185a)", other: "rgba(255,255,255,.95)", otherInk: "#881337", chip: "rgba(244,63,94,.12)" },
  { id: "berry", bn: "বেরি", en: "Berry", tone: "dark",
    area: { backgroundColor: "#2a0f3d", backgroundImage: "radial-gradient(circle at 15% 10%, rgba(236,72,153,.35), transparent 45%), radial-gradient(circle at 90% 85%, rgba(168,85,247,.4), transparent 50%), linear-gradient(180deg, #2a0f3d, #3b0d36)" },
    bar: "rgba(42,15,61,.96)", line: "rgba(255,255,255,.1)", ink: "#fce7f3", sub: "#d8a8d0", accent: "linear-gradient(135deg, #a855f7, #ec4899)", other: "rgba(255,255,255,.12)", otherInk: "#fce7f3", chip: "rgba(255,255,255,.1)" },
  { id: "lofi", bn: "সন্ধ্যা", en: "Lo-fi", tone: "dark",
    area: { backgroundColor: "#1e1b4b", backgroundImage: `${sparkles}, linear-gradient(180deg, #312e81 0%, #6d28d9 55%, #f97316 130%)`, backgroundRepeat: "repeat, no-repeat", backgroundSize: "160px 160px, 100% 100%" },
    bar: "rgba(30,27,75,.95)", line: "rgba(255,255,255,.12)", ink: "#ede9fe", sub: "#c4b5fd", accent: "linear-gradient(135deg, #8b5cf6, #f97316)", other: "rgba(255,255,255,.14)", otherInk: "#f5f3ff", chip: "rgba(255,255,255,.12)" },
  { id: "tiedye", bn: "রংধনু", en: "Tie-dye", tone: "light",
    area: { backgroundColor: "#f5f3ff", backgroundImage: "radial-gradient(circle at 0% 0%, rgba(6,182,212,.35), transparent 40%), radial-gradient(circle at 100% 30%, rgba(236,72,153,.3), transparent 45%), radial-gradient(circle at 20% 100%, rgba(250,204,21,.35), transparent 45%), radial-gradient(circle at 90% 100%, rgba(139,92,246,.3), transparent 40%)" },
    bar: "rgba(250,245,255,.9)", line: "rgba(139,92,246,.2)", ink: "#3b0764", sub: "#7e5aa8", accent: "linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)", other: "rgba(255,255,255,.92)", otherInk: "#3b0764", chip: "rgba(139,92,246,.12)" },
  { id: "citrus", bn: "লেবু", en: "Citrus", tone: "light",
    area: { backgroundColor: "#fefce8", backgroundImage: `${dots("rgba(132,204,22,.35)")}, linear-gradient(180deg, #fefce8 0%, #ecfccb 100%)`, backgroundRepeat: "repeat, no-repeat", backgroundSize: "28px 28px, 100% 100%" },
    bar: "rgba(254,252,232,.94)", line: "rgba(132,204,22,.25)", ink: "#365314", sub: "#6b8a2e", accent: "linear-gradient(135deg, #f59e0b, #84cc16)", other: "rgba(255,255,255,.95)", otherInk: "#365314", chip: "rgba(132,204,22,.15)" },
  { id: "aurora", bn: "মেরুজ্যোতি", en: "Aurora", tone: "dark",
    area: { backgroundColor: "#04121f", backgroundImage: `${stars}, radial-gradient(ellipse at 30% 0%, rgba(16,185,129,.45), transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(6,182,212,.4), transparent 50%), linear-gradient(180deg, #052e2b, #04121f)`, backgroundRepeat: "repeat, no-repeat, no-repeat, no-repeat", backgroundSize: "220px 220px, 100% 100%, 100% 100%, 100% 100%" },
    bar: "rgba(4,18,31,.96)", line: "rgba(255,255,255,.1)", ink: "#d1fae5", sub: "#8cc7b5", accent: "linear-gradient(135deg, #10b981, #06b6d4)", other: "rgba(255,255,255,.1)", otherInk: "#ecfdf5", chip: "rgba(255,255,255,.1)" },
  { id: "candy", bn: "ক্যান্ডি", en: "Candy", tone: "light",
    area: { backgroundColor: "#fdf2f8", backgroundImage: `${dots("rgba(96,165,250,.35)")}, linear-gradient(135deg, #fce7f3 0%, #e0f2fe 100%)`, backgroundRepeat: "repeat, no-repeat", backgroundSize: "28px 28px, 100% 100%" },
    bar: "rgba(253,242,248,.92)", line: "rgba(236,72,153,.2)", ink: "#701a75", sub: "#a35c9e", accent: "linear-gradient(135deg, #f472b6, #60a5fa)", other: "rgba(255,255,255,.95)", otherInk: "#4a1d5c", chip: "rgba(236,72,153,.12)" },
  { id: "midnight", bn: "মাঝরাত", en: "Midnight", tone: "dark",
    area: { backgroundColor: "#000000" },
    bar: "rgba(0,0,0,.96)", line: "rgba(255,255,255,.1)", ink: "#f1f5f9", sub: "#94a3b8", accent: "linear-gradient(135deg, #2563eb, #9333ea)", other: "#1c1c1e", otherInk: "#f1f5f9", chip: "rgba(255,255,255,.1)" },
];
