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
      // ১. bottom-[calc(1rem+...)] দিয়ে নিচ থেকে ভাসিয়ে দেওয়া হয়েছে।
      // ২. w-[92%] max-w-[400px] দিয়ে সাইড থেকে গ্যাপ রাখা হয়েছে ফ্লোটিং লুকের জন্য।
      // ৩. rounded-2xl দিয়ে কোণাগুলো সুন্দর গোল করা হয়েছে।
      // ৪. bg-white/30 এবং backdrop-blur-xl দিয়ে একদম ট্রান্সপারেন্ট গ্লাস ইফেক্ট দেওয়া হয়েছে।
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] z-50 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-2xl shadow-lg shadow-slate-200/20 dark:shadow-black/40 ${
        isAuthPage ? "hidden" : "block"
      }`}
    >
      {/* হাইট কমানোর জন্য py-1.5 দেওয়া হয়েছে */}
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.label} 
              href={item.href} 
              className="flex flex-col items-center gap-1 p-1 min-w-[4rem] transition-all active:scale-95"
            >
              <div className={`transition-colors duration-300 ${
                isActive 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}>
                {/* আইকনের সাইজ ২২ করে হাইট আরও কমানো হয়েছে */}
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] tracking-wide transition-colors duration-300 ${
                isActive 
                  ? "font-bold text-indigo-600 dark:text-indigo-400" 
                  : "font-medium text-slate-500 dark:text-slate-400"
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