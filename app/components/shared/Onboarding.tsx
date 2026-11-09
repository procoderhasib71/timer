"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccountSheet } from "@/app/components/account/AccountSheet";
import { Coffee, Send, Timer, Trophy } from "lucide-react";
import { useLang } from "@/lib/i18n";

// প্রথমবার অ্যাপ খুললে ৩ পাতার পরিচিতি: ভাষা বাছাই, Pomodoro কীভাবে চলে, আর বট/লিডারবোর্ড।
// একবার দেখা বা Skip করা হলে এই ফোনে আর আসে না।
const KEY = "pomodoro_onboarded";
const HIDDEN_ON = ["/login", "/profile"];

export default function Onboarding() {
  const { lang, setLang, t, n } = useLang();
  const pathname = usePathname();
  const sheet = useAccountSheet();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only, read after mount
    try { setOpen(!localStorage.getItem(KEY)); } catch { setOpen(false); }
  }, []);

  if (!open || HIDDEN_ON.includes(pathname)) return null;

  const finish = (goProfile = false) => {
    try { localStorage.setItem(KEY, "1"); } catch { /* প্রাইভেট মোড */ }
    setOpen(false);
    if (goProfile) sheet.open("profile");
  };

  const slides = [
    {
      icon: <Timer size={40} />,
      title: t("Shonghi Focus এ স্বাগতম", "Welcome to Shonghi Focus"),
      body: t("মন দিয়ে পড়ার টাইমার আর পড়ার পরিকল্পনা, এক জায়গায়।", "A focus timer and study planner, all in one place."),
      extra: (
        <div className="flex gap-2 justify-center mt-6">
          {([["bn", "বাংলা"], ["en", "English"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setLang(id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${lang === id ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: <Coffee size={40} />,
      title: t("কীভাবে কাজ করে", "How it works"),
      body: t(`${n(25)} মিনিট মন দিয়ে পড়ো, তারপর ${n(5)} মিনিট বিরতি। ${n(4)}টা সেশনের পর লম্বা বিরতি। সময় সেটিংসে বদলানো যায়।`,
              "Focus for 25 minutes, then take a 5 minute break. After 4 sessions, take a long break. You can change the times in Settings."),
      extra: (
        <div className="flex items-center justify-center gap-2 mt-6 text-xs font-bold">
          {[t("ফোকাস", "Focus"), t("বিরতি", "Break"), t("ফোকাস", "Focus"), t("বিরতি", "Break")].map((x, i) => (
            <span key={i} className={`px-3 py-1.5 rounded-lg ${i % 2 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"}`}>{x}</span>
          ))}
        </div>
      ),
    },
    {
      icon: <Trophy size={40} />,
      title: t("সাথে থাকো", "Stay on track"),
      body: t("লিডারবোর্ডে অন্যদের সাথে তুলনা করো। মাছরাঙা বট যুক্ত করলে টাইমার শেষ আর টাস্কের রিমাইন্ডার Telegram এ আসবে।",
              "Compare with others on the leaderboard. Link the Machranga bot to get timer and task reminders on Telegram."),
      extra: (
        <button onClick={() => finish(true)} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-600 dark:text-sky-400">
          <Send size={16} /> {t("প্রোফাইলে গিয়ে বট যুক্ত করো", "Link the bot in Profile")}
        </button>
      ),
    },
  ];
  const s = slides[step];
  const last = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#1e293b] rounded-t-[2rem] sm:rounded-[2rem] p-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-end">
          {!last && <button onClick={() => finish()} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">{t("এড়িয়ে যাও", "Skip")}</button>}
        </div>
        <div key={step} className="text-center animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">{s.icon}</div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">{s.body}</p>
          {s.extra}
        </div>
        <div className="flex justify-center gap-1.5 mt-8 mb-5">
          {slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-indigo-600" : "w-1.5 bg-slate-300 dark:bg-slate-600"}`} />)}
        </div>
        <button onClick={() => (last ? finish() : setStep(step + 1))}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all active:scale-[0.98]">
          {last ? t("শুরু করি", "Get started") : t("পরের ধাপ", "Next")}
        </button>
      </div>
    </div>
  );
}
