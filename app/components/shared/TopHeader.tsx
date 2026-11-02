// src/components/shared/TopHeader.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Settings, Users, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopHeader() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // অ্যাপ লোড হলে চেক করবে ডার্ক মোড অন আছে কি না
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark") || 
                     localStorage.getItem("theme") === "dark";
      setIsDarkMode(isDark);
      
      if (isDark) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  // Sun/Moon বাটনে ক্লিক করলে থিম টগল হবে
  const toggleTheme = () => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      if (isDarkMode) {
        root.classList.remove("dark");
        localStorage.setItem("theme", "light");
        setIsDarkMode(false);
      } else {
        root.classList.add("dark");
        localStorage.setItem("theme", "dark");
        setIsDarkMode(true);
      }
    }
  };
  
  // যেই পেজগুলোতে এই হেডারটি হাইড থাকবে
  const hiddenPages = ["/login", "/signup", "/community", "/leaderboard", "/analytics"];
  const isHidden = hiddenPages.includes(pathname);

  return (
    <header 
      className={`sticky top-0 z-50 items-center justify-between p-5 bg-slate-50/80 dark:bg-[#0f172a]/80 backdrop-blur-md transition-colors duration-300 ${
        isHidden ? "hidden" : "flex"
      }`}
    >
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400">
          Pomodoro BD
        </span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Study Session
        </h1>
      </div>
      <div className="flex items-center gap-2">
        
        {/* Theme Toggle Button (Sun/Moon) */}
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-slate-200/60 dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-[#2c2c2e] transition-colors active:scale-95"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun size={20} className="text-orange-400" /> : <Moon size={20} className="text-indigo-600" />}
        </button>

        {/* Group / Community button */}
        <Link 
          href="/community" 
          className="relative p-2.5 rounded-full bg-slate-200/60 dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-[#2c2c2e] transition-colors active:scale-95"
        >
          <Users size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 border-2 border-slate-50 dark:border-[#0f172a] rounded-full"></span>
        </Link>

        {/* Settings button */}
        <Link 
          href="/settings" 
          className="p-2.5 rounded-full bg-slate-200/60 dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-[#2c2c2e] transition-colors active:scale-95"
        >
          <Settings size={20} />
        </Link>
        
      </div>
    </header>
  );
}