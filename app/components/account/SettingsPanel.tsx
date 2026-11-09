// সেটিংস: অ্যাকাউন্ট শিটে (AccountSheet) আর /settings পাতায় একই জিনিস
"use client";

import React, { useState, useEffect } from "react";
import {
  X, ChevronRight, Music, Clock, Coffee,
  RotateCcw, PlayCircle, FastForward, PauseCircle,
  Palette, AppWindow, Check, LogOut, Languages, Trophy
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { readSettings } from "@/lib/settings";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { playRingtone } from "@/lib/alarm";
import { useLang } from "@/lib/i18n";
import { setHidden } from "@/lib/leaderboard";

interface ListItemProps {
  icon: React.ElementType;
  title: string;
  value?: string | number;
  isToggle?: boolean;
  toggleState?: boolean;
  onToggle?: () => void;
  href?: string;
  onClick?: () => void;
}

type ModalType = 'pomodoro' | 'shortBreak' | 'longBreak' | 'rounds' | 'ringtone' | null;

export default function SettingsPanel() {
  const router = useRouter();

  const { theme, setTheme } = useTheme();
  const { lang, setLang, t, n } = useLang();
  const [mounted, setMounted] = useState(false);
  const [showOnBoard, setShowOnBoard] = useState(true);

  const [autoStartNext, setAutoStartNext] = useState(false);
  const [autoStartBreak, setAutoStartBreak] = useState(true);
  const [disableBreak, setDisableBreak] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = useState(false);

  const [pomodoroLength, setPomodoroLength] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [longBreakInterval, setLongBreakInterval] = useState(4);
  const [ringtone, setRingtone] = useState("Default");

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const fbSettings = settingsSnap.data();

          if (fbSettings.autoStartNext !== undefined) setAutoStartNext(fbSettings.autoStartNext);
          if (fbSettings.autoStartBreak !== undefined) setAutoStartBreak(fbSettings.autoStartBreak);
          if (fbSettings.disableBreak !== undefined) setDisableBreak(fbSettings.disableBreak);
          if (fbSettings.keepScreenOn !== undefined) setKeepScreenOn(fbSettings.keepScreenOn);

          if (fbSettings.pomodoroLength !== undefined) setPomodoroLength(fbSettings.pomodoroLength);
          if (fbSettings.shortBreak !== undefined) setShortBreak(fbSettings.shortBreak);
          if (fbSettings.longBreak !== undefined) setLongBreak(fbSettings.longBreak);
          if (fbSettings.longBreakInterval !== undefined) setLongBreakInterval(fbSettings.longBreakInterval);
          if (fbSettings.ringtone !== undefined) setRingtone(fbSettings.ringtone);
          if (fbSettings.showOnLeaderboard !== undefined) setShowOnBoard(fbSettings.showOnLeaderboard);

          localStorage.setItem("pomodoro_settings", JSON.stringify(fbSettings));
        } else {
          const localSettings = readSettings();

          if (localSettings.autoStartNext !== undefined) setAutoStartNext(localSettings.autoStartNext);
          if (localSettings.autoStartBreak !== undefined) setAutoStartBreak(localSettings.autoStartBreak);
          if (localSettings.disableBreak !== undefined) setDisableBreak(localSettings.disableBreak);
          if (localSettings.keepScreenOn !== undefined) setKeepScreenOn(localSettings.keepScreenOn);

          if (localSettings.pomodoroLength !== undefined) setPomodoroLength(localSettings.pomodoroLength);
          if (localSettings.shortBreak !== undefined) setShortBreak(localSettings.shortBreak);
          if (localSettings.longBreak !== undefined) setLongBreak(localSettings.longBreak);
          if (localSettings.longBreakInterval !== undefined) setLongBreakInterval(localSettings.longBreakInterval);
          if (localSettings.ringtone !== undefined) setRingtone(localSettings.ringtone);
          if (localSettings.showOnLeaderboard !== undefined) setShowOnBoard(localSettings.showOnLeaderboard);

          await setDoc(settingsRef, localSettings, { merge: true });
        }

        setMounted(true);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ✅ Updated UpdateSettings Logic
  const updateSetting = async (key: string, value: any) => {
    // 1. Save Locally
    const currentSettings = readSettings();
    localStorage.setItem("pomodoro_settings", JSON.stringify({ ...currentSettings, [key]: value }));

    // 2. 🚨 FIRE EVENT SO TIMER UPDATES INSTANTLY
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event('settings_updated'));
    }

    // 3. Sync to Firebase
    const user = auth.currentUser;
    if (user) {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      try {
        await setDoc(settingsRef, { [key]: value }, { merge: true });
      } catch (error) {
        console.error("Error saving setting to Firebase:", error);
      }
    }
  };

  const handleToggleAutoNext = () => {
    setAutoStartNext(!autoStartNext);
    updateSetting("autoStartNext", !autoStartNext);
  };
  const handleToggleAutoBreak = () => {
    setAutoStartBreak(!autoStartBreak);
    updateSetting("autoStartBreak", !autoStartBreak);
  };
  const handleToggleDisableBreak = () => {
    setDisableBreak(!disableBreak);
    updateSetting("disableBreak", !disableBreak);
  };

  // লিডারবোর্ডে নাম দেখানো/লুকানো: পরের সেশন থেকে নয়, এখনই দুই বোর্ডে বদলাই
  const handleToggleShowOnBoard = () => {
    setShowOnBoard(!showOnBoard);
    updateSetting("showOnLeaderboard", !showOnBoard);
    if (auth.currentUser) setHidden(auth.currentUser.uid, showOnBoard).catch(() => undefined);
  };

  const handleToggleKeepScreenOn = () => {
    setKeepScreenOn(!keepScreenOn);
    updateSetting("keepScreenOn", !keepScreenOn);
  };

  const handleSaveTimerConfig = (key: string, value: any) => {
    if (key === 'ringtone') playRingtone(value);   // বাছাইয়ের সময় শুনিয়ে দিই
    if (key === 'pomodoroLength') setPomodoroLength(value);
    if (key === 'shortBreak') setShortBreak(value);
    if (key === 'longBreak') setLongBreak(value);
    if (key === 'longBreakInterval') setLongBreakInterval(value);
    if (key === 'ringtone') setRingtone(value);

    updateSetting(key, value);
    setActiveModal(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  const ListItem = ({
    icon: Icon, title, value, isToggle = false, toggleState = false, onToggle = () => {}, href = "", onClick
  }: ListItemProps) => {

    const content = (
      <div className="flex items-center justify-between py-3.5 px-2 group cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-4 pl-1">
          <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800/50 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
            <Icon size={18} />
          </div>
          <span className="text-[15px] font-medium text-slate-800 dark:text-slate-200">{title}</span>
        </div>

        <div className="flex items-center gap-3 pr-1">
          {value !== undefined && <span className="text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1 rounded-lg capitalize">{value}</span>}

          {isToggle ? (
            <div
              className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ease-in-out flex items-center shadow-inner ${
                toggleState ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
                toggleState ? "translate-x-5" : "translate-x-0"
              }`} />
            </div>
          ) : (
            <ChevronRight size={18} className="text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
          )}
        </div>
      </div>
    );

    if (href) return <Link href={href} className="block w-full">{content}</Link>;

    return (
      <div onClick={isToggle ? onToggle : onClick} className="block w-full">
        {content}
      </div>
    );
  };

  const MIN = t("মিনিট", "Min");
  const ROUNDS = t("সেশন", "Rounds");
  const RINGTONE_LABEL: Record<string, string> = { Default: t("সাধারণ", "Default"), Bell: t("ঘণ্টা", "Bell"), Digital: t("ডিজিটাল", "Digital"), Bird: t("পাখি", "Bird"), None: t("শব্দ নেই", "None") };
  const THEME_LABEL: Record<string, string> = { dark: t("ডার্ক", "Dark"), light: t("লাইট", "Light"), system: t("ফোনের মতো", "System") };
  const modalConfigs = {
    pomodoro: { title: t("ফোকাসের সময়", "Pomodoro Length"), options: [15, 20, 25, 30, 45, 50, 60, 90], suffix: MIN, stateKey: "pomodoroLength", currentValue: pomodoroLength },
    shortBreak: { title: t("ছোট বিরতি", "Short Break"), options: [3, 5, 10, 15], suffix: MIN, stateKey: "shortBreak", currentValue: shortBreak },
    longBreak: { title: t("লম্বা বিরতি", "Long Break"), options: [10, 15, 20, 25, 30], suffix: MIN, stateKey: "longBreak", currentValue: longBreak },
    rounds: { title: t("লম্বা বিরতি কয় সেশন পর", "Long Break After"), options: [2, 3, 4, 5, 6, 8], suffix: ROUNDS, stateKey: "longBreakInterval", currentValue: longBreakInterval },
    ringtone: { title: t("টাইমারের শব্দ", "Timer Ringtone"), options: ["Default", "Bell", "Digital", "Bird", "None"], suffix: "", stateKey: "ringtone", currentValue: ringtone },
  };

  return (
    <div className="text-slate-900 dark:text-slate-200 relative">
      <div className="space-y-5">

        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl p-3 shadow-sm dark:shadow-none backdrop-blur-sm">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-2 pt-2">{t("টাইমার", "Timer Configuration")}</h2>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ListItem icon={Music} title={modalConfigs.ringtone.title} value={RINGTONE_LABEL[ringtone] || ringtone} onClick={() => setActiveModal('ringtone')} />
            <ListItem icon={Clock} title={modalConfigs.pomodoro.title} value={`${n(pomodoroLength)} ${MIN}`} onClick={() => setActiveModal('pomodoro')} />
            <ListItem icon={Coffee} title={modalConfigs.shortBreak.title} value={`${n(shortBreak)} ${MIN}`} onClick={() => setActiveModal('shortBreak')} />
            <ListItem icon={Coffee} title={modalConfigs.longBreak.title} value={`${n(longBreak)} ${MIN}`} onClick={() => setActiveModal('longBreak')} />
            <ListItem icon={RotateCcw} title={modalConfigs.rounds.title} value={`${n(longBreakInterval)} ${ROUNDS}`} onClick={() => setActiveModal('rounds')} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl p-3 shadow-sm dark:shadow-none backdrop-blur-sm">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-2 pt-2">{t("নিজে থেকে", "Automation")}</h2>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ListItem icon={PlayCircle} title={t("বিরতির পর ফোকাস নিজে শুরু", "Auto-Start Pomodoro")} isToggle toggleState={autoStartNext} onToggle={handleToggleAutoNext} />
            <ListItem icon={FastForward} title={t("ফোকাসের পর বিরতি নিজে শুরু", "Auto-Start Break")} isToggle toggleState={autoStartBreak} onToggle={handleToggleAutoBreak} />
            <ListItem icon={PauseCircle} title={t("বিরতি বন্ধ", "Disable Breaks")} isToggle toggleState={disableBreak} onToggle={handleToggleDisableBreak} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl p-3 shadow-sm dark:shadow-none backdrop-blur-sm">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-2 pt-2">{t("অ্যাপ", "System")}</h2>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ListItem icon={Languages} title={t("ভাষা", "Language")} value={lang === "bn" ? "বাংলা" : "English"} onClick={() => setLang(lang === "bn" ? "en" : "bn")} />
            <ListItem
              icon={Palette}
              title={t("রং", "Appearance")}
              value={THEME_LABEL[mounted ? theme || "system" : "system"]}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
            <ListItem icon={AppWindow} title={t("টাইমার চলার সময় স্ক্রিন জ্বালিয়ে রাখো", "Keep Screen On")} isToggle toggleState={keepScreenOn} onToggle={handleToggleKeepScreenOn} />
            <ListItem icon={Trophy} title={t("লিডারবোর্ডে আমার নাম দেখাও", "Show me on leaderboard")} isToggle toggleState={showOnBoard} onToggle={handleToggleShowOnBoard} />
          </div>
        </div>

        <div className="pt-2 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 font-bold transition-all active:scale-95 border border-red-100 dark:border-red-500/20 shadow-sm"
          >
            <LogOut size={20} />
            {t("লগআউট", "Sign Out")}
          </button>
        </div>

      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="fixed inset-0" onClick={() => setActiveModal(null)} />
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-white/5">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {modalConfigs[activeModal].title}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-100 dark:bg-[#2a3850] rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto scrollbar-hide pb-2">
              {modalConfigs[activeModal].options.map((opt) => {
                const isSelected = modalConfigs[activeModal].currentValue === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSaveTimerConfig(modalConfigs[activeModal].stateKey, opt)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm'
                        : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#2a3850] text-slate-700 dark:text-slate-300 hover:border-indigo-200 dark:hover:border-white/10'
                    }`}
                  >
                    <span className="font-bold text-base">{typeof opt === "number" ? n(opt) : RINGTONE_LABEL[opt] || opt} <span className="text-xs font-medium opacity-70">{modalConfigs[activeModal].suffix}</span></span>
                    {isSelected && <Check size={18} className="text-indigo-500" />}
                  </button>
                )
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}