// src/components/shared/BottomNav.tsx
"use client";

import { Timer, BarChart2, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const navItems = [
    { icon: Timer, label: "Focus", href: "/" },
    { icon: BarChart2, label: "Stats", href: "/analytics" },
    { icon: Trophy, label: "Rank", href: "/leaderboard" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <nav 
      // isAuthPage সত্য হলে 'hidden' ক্লাস অ্যাড হবে, নাহলে 'block'
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe ${
        isAuthPage ? "hidden" : "block"
      }`}
    >
      <div className="max-w-xl mx-auto flex items-center justify-around p-3 pb-6 sm:pb-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 p-2">
              <div className={`p-2 rounded-xl transition-all ${
                isActive 
                  ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}>
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold ${
                isActive 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-500 dark:text-slate-400"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}