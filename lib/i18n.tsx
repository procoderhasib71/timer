"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// বাংলা/ইংরেজি: t("বাংলা", "English") — AdMCQ এর মতো। পছন্দ এই ফোনে থাকে (localStorage), শুরুতে বাংলা।
// n(): বাংলায় সংখ্যাও বাংলা অঙ্কে।
export type Lang = "bn" | "en";
const KEY = "pomodoro_lang";
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (bn: string, en: string) => string; n: (v: number | string) => string };
const LangContext = createContext<Ctx>({ lang: "bn", setLang: () => undefined, t: (bn) => bn, n: (v) => String(v) });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    try { if (localStorage.getItem(KEY) === "en") setLangState("en"); } catch { /* প্রাইভেট মোড */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* প্রাইভেট মোড */ }
  }, []);
  const t = useCallback((bn: string, en: string) => (lang === "en" ? en : bn), [lang]);
  const n = useCallback((v: number | string) => (lang === "en" ? String(v) : String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)])), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t, n }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** ঘণ্টা-মিনিট: "২ঘ ১৫মি" / "2h 15m" */
export function useDuration() {
  const { t, n } = useLang();
  return (minutes: number) => `${n(Math.floor(minutes / 60))}${t("ঘ", "h")} ${n(minutes % 60)}${t("মি", "m")}`;
}
