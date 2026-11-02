// src/components/shared/TopHeader.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Settings, Users, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useLang } from "@/lib/i18n";

// থিম next-themes দিয়ে (সেটিংসের Appearance এর সাথে একই), ভাষা বাংলা/ইংরেজি এক চাপে
export default function TopHeader() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  // যেই পেজগুলোতে এই হেডারটি হাইড থাকবে (নিজেদের হেডার আছে)
  const hiddenPages = ["/login", "/signup", "/community", "/leaderboard", "/analytics", "/settings"];
  const titles: Record<string, string> = { "/": t("পড়ার সময়", "Study Session"), "/profile": t("প্রোফাইল", "Profile") };
  const btn = "p-2.5 rounded-full bg-slate-200/60 dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-[#2c2c2e] transition-colors active:scale-95";

  return (
    <header
      className={`sticky top-0 z-50 items-center justify-between p-5 bg-slate-50/80 dark:bg-[#0f172a]/80 backdrop-blur-md transition-colors duration-300 ${
        hiddenPages.includes(pathname) ? "hidden" : "flex"
      }`}
    >
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400">
          Pomodoro BD
        </span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {titles[pathname] || "Pomodoro BD"}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setLang(lang === "bn" ? "en" : "bn")} className={`${btn} min-w-10 text-xs font-extrabold`} aria-label={t("ভাষা বদলাও", "Change language")}>
          {lang === "bn" ? "EN" : "বাং"}
        </button>
        <button onClick={() => setTheme(dark ? "light" : "dark")} className={btn} aria-label={t("থিম বদলাও", "Toggle dark mode")}>
          {dark ? <Sun size={20} className="text-orange-400" /> : <Moon size={20} className="text-indigo-600" />}
        </button>
        <Link href="/community" className={btn} aria-label={t("কমিউনিটি", "Community")}>
          <Users size={20} />
        </Link>
        <Link href="/settings" className={btn} aria-label={t("সেটিংস", "Settings")}>
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}
