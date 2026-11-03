// src/components/shared/TopHeader.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Users, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useLang } from "@/lib/i18n";
import { useAccount } from "@/app/components/shared/AuthGate";
import { useAccountSheet } from "@/app/components/account/AccountSheet";
// @ts-ignore: Bypassing implicit any error for production build
import { auth } from "@/lib/firebaseClient";

// বাঁয়ে লোগো আর নাম; ডানে থিম, কমিউনিটি আর নিজের ছবি (চাপলে প্রোফাইল/সেটিংস শিট)। ভাষা বদলানো সেটিংসে।
export default function TopHeader() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLang();
  const { account } = useAccount();
  const sheet = useAccountSheet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const initial = (account?.name || auth.currentUser?.displayName || "?").charAt(0).toUpperCase();

  // যেই পেজগুলোতে এই হেডারটি হাইড থাকবে (নিজেদের হেডার আছে)
  const hiddenPages = ["/login", "/signup", "/community", "/leaderboard", "/analytics", "/settings"];
  const btn = "p-2.5 rounded-full bg-slate-200/60 dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-[#2c2c2e] transition-colors active:scale-95";

  return (
    <header
      className={`sticky top-[env(safe-area-inset-top)] z-50 items-center justify-between px-5 py-3.5 bg-slate-50/80 dark:bg-[#0f172a]/80 backdrop-blur-md transition-colors duration-300 ${
        hiddenPages.includes(pathname) ? "hidden" : "flex"
      }`}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-xl shadow-sm" />
        <span className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
          Pomodoro <span className="text-indigo-600 dark:text-indigo-400">BD</span>
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
          <button onClick={() => sheet.open("settings")} aria-label={t("প্রোফাইল ও সেটিংস", "Profile and settings")}
            className="ml-0.5 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-extrabold flex items-center justify-center shadow-md shadow-indigo-500/25 ring-2 ring-white dark:ring-[#0f172a] active:scale-95 transition-transform">
            {initial}
          </button>
        )}
      </div>
    </header>
  );
}
