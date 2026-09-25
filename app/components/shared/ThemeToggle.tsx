// src/components/shared/ThemeToggle.tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // পেজ লোড হওয়ার পর বাটন দেখাবো, নাহলে সার্ভার-ক্লায়েন্ট ক্যাশ কনফ্লিক্ট হবে
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-[44px] h-[44px] rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"></div>;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}