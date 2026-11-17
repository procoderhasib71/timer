// src/components/shared/TopHeader.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Users, Sun, Moon, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useLang } from "@/lib/i18n";
import { useAccountSheet } from "@/app/components/account/AccountSheet";

// বাঁয়ে লোগো আর নাম; ডানে থিম, কমিউনিটি আর সেটিংস (চাপলে সেটিংস শিট, ভেতরে প্রোফাইল এডিট)। ভাষা বদলানো সেটিংসে।
export default function TopHeader() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLang();
  const sheet = useAccountSheet();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard mounted flag for theme UI
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  // যেই পেজগুলোতে এই হেডারটি হাইড থাকবে (নিজেদের হেডার আছে)
  const hiddenPages = ["/login", "/signup", "/community", "/leaderboard", "/analytics", "/settings"];
  const btn = "p-2.5 rounded-full bg-slate-200/60 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-[#2a3850] transition-colors active:scale-95";

  return (
    <header
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      className={`relative z-50 items-center justify-between px-5 pb-3.5 transition-colors duration-300 ${
        hiddenPages.includes(pathname) ? "hidden" : "flex"
      }`}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-xl shadow-sm" />
        <span className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
          Shongi <span className="text-indigo-600 dark:text-indigo-400">Focus</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <button onClick={() => setTheme(dark ? "light" : "dark")} className={btn} aria-label={t("থিম বদলাও", "Toggle dark mode")}>
          {dark ? <Sun size={19} className="text-orange-400" /> : <Moon size={19} className="text-indigo-600" />}
        </button>
        <Link href="/community" className={btn} aria-label={t("কমিউনিটি", "Community")}>
          <Users size={19} />
        </Link>
        {pathname !== "/profile" && (
          <button onClick={() => sheet.open("settings")} aria-label={t("সেটিংস", "Settings")} title={t("সেটিংস", "Settings")} className={btn}>
            <Settings size={19} />
          </button>
        )}
      </div>
    </header>
  );
}
