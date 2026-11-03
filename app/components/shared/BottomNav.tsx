// src/components/shared/BottomNav.tsx
"use client";

import { Timer, BarChart2, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { useAccountSheet } from "@/app/components/account/AccountSheet";
import { tap } from "@/lib/haptics";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();
  const sheet = useAccountSheet();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const navItems = [
    { icon: Timer, label: t("ফোকাস", "Focus"), href: "/" },
    { icon: BarChart2, label: t("হিসাব", "Stats"), href: "/analytics" },
    { icon: Trophy, label: t("র‍্যাঙ্ক", "Rank"), href: "/leaderboard" },
    { icon: User, label: t("প্রোফাইল", "Profile"), href: "/profile", sheet: true },
  ];

  const activeIdx = navItems.findIndex((i) => !i.sheet && i.href === pathname);

  return (
    <nav
      // নিচ থেকে ভাসানো মেনু; বাছা জায়গার পেছনে নরম পিল, অন্যটায় চাপলে মসৃণভাবে সরে যায়
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] z-50 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/[0.07] rounded-[22px] shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] dark:shadow-black/40 ${
        isAuthPage ? "hidden" : "block"
      }`}
    >
      <div className="relative grid grid-cols-4 p-1.5">
        {activeIdx >= 0 && (
          <span aria-hidden className="absolute top-1.5 bottom-1.5 left-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{ width: "calc((100% - 0.75rem) / 4)", transform: `translateX(${activeIdx * 100}%)` }} />
        )}
        {navItems.map((item, i) => {
          const isActive = i === activeIdx;
          return (
            // প্রোফাইল আলাদা পাতা নয়, শিট খোলে
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => { tap(); if (item.sheet) { e.preventDefault(); sheet.open("profile"); } }}
              className="relative flex flex-col items-center gap-0.5 py-1.5 press"
            >
              <item.icon size={21} strokeWidth={isActive ? 2.4 : 1.9}
                className={`transition-colors duration-300 ${isActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"}`} />
              <span className={`text-[10px] tracking-wide transition-colors duration-300 ${isActive ? "font-extrabold text-indigo-600 dark:text-indigo-300" : "font-semibold text-slate-500 dark:text-slate-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
