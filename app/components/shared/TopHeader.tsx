// src/components/shared/TopHeader.tsx
"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopHeader() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <header 
      className={`sticky top-0 z-50 items-center justify-between p-5 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md ${
        isAuthPage ? "hidden" : "flex"
      }`}
    >
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
          Pomodoro BD
        </span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Study Session
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {/* Settings button ekhon Link hisebe kaj korbe */}
        <Link 
          href="/settings" 
          className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}