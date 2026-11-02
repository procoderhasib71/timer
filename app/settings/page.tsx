// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { 
  X, ChevronRight, Music, Clock, Coffee, 
  RotateCcw, PlayCircle, FastForward, PauseCircle, 
  Palette, AppWindow, UserCircle, Sparkles, Check, LogOut
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { playRingtone } from "@/lib/alarm";

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

export default function SettingsPage() {
  const router = useRouter();
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Student");

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
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserName(data.displayName || data.name || "Student");
        } else if (user.displayName) {
          setUserName(user.displayName);
        }

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

          localStorage.setItem("pomodoro_settings", JSON.stringify(fbSettings));
        } else {
          const localSettings = JSON.parse(localStorage.getItem("pomodoro_settings") || "{}");
          
          if (localSettings.autoStartNext !== undefined) setAutoStartNext(localSettings.autoStartNext);
          if (localSettings.autoStartBreak !== undefined) setAutoStartBreak(localSettings.autoStartBreak);
          if (localSettings.disableBreak !== undefined) setDisableBreak(localSettings.disableBreak);
          if (localSettings.keepScreenOn !== undefined) setKeepScreenOn(localSettings.keepScreenOn);

          if (localSettings.pomodoroLength !== undefined) setPomodoroLength(localSettings.pomodoroLength);
          if (localSettings.shortBreak !== undefined) setShortBreak(localSettings.shortBreak);
          if (localSettings.longBreak !== undefined) setLongBreak(localSettings.longBreak);
          if (localSettings.longBreakInterval !== undefined) setLongBreakInterval(localSettings.longBreakInterval);
          if (localSettings.ringtone !== undefined) setRingtone(localSettings.ringtone);

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
    const currentSettings = JSON.parse(localStorage.getItem("pomodoro_settings") || "{}");
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

  const modalConfigs = {
    pomodoro: { title: "Pomodoro Length", options: [15, 20, 25, 30, 45, 50, 60, 90], suffix: "Min", stateKey: "pomodoroLength", currentValue: pomodoroLength },
    shortBreak: { title: "Short Break", options: [3, 5, 10, 15], suffix: "Min", stateKey: "shortBreak", currentValue: shortBreak },
    longBreak: { title: "Long Break", options: [10, 15, 20, 25, 30], suffix: "Min", stateKey: "longBreak", currentValue: longBreak },
    rounds: { title: "Long Break After", options: [2, 3, 4, 5, 6, 8], suffix: "Rounds", stateKey: "longBreakInterval", currentValue: longBreakInterval },
    ringtone: { title: "Timer Ringtone", options: ["Default", "Bell", "Digital", "Bird", "None"], suffix: "", stateKey: "ringtone", currentValue: ringtone },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-200 pb-20 px-5 pt-6 transition-colors duration-300 relative">
      
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()} 
          className="p-2.5 rounded-full bg-slate-200 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all active:scale-95"
        >
          <X size={20} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-bold tracking-wide">Preferences</h1>
        <div className="w-10"></div>
      </div>

      <div className="space-y-6">
        
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/60 dark:to-purple-900/40 border border-indigo-200 dark:border-indigo-500/20 p-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl"></div>
          
          <Link href="/profile" className="relative flex items-center justify-between p-4 rounded-[1.3rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm transition-colors hover:bg-white/80 dark:hover:bg-slate-900/60">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30 overflow-hidden shadow-sm">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName.split(' ')[0]}&backgroundColor=b6e3f4`} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                  <Sparkles size={10} className="text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight uppercase truncate max-w-[150px]">
                  {userName}
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">Pro Member • Synced</span>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-white transition-colors">
              Edit
            </div>
          </Link>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-3xl p-3 shadow-sm dark:shadow-none backdrop-blur-sm">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-2 pt-2">Timer Configuration</h2>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ListItem icon={Music} title="Timer Ringtone" value={ringtone} onClick={() => setActiveModal('ringtone')} />
            <ListItem icon={Clock} title="Pomodoro Length" value={`${pomodoroLength} Min`} onClick={() => setActiveModal('pomodoro')} />
            <ListItem icon={Coffee} title="Short Break" value={`${shortBreak} Min`} onClick={() => setActiveModal('shortBreak')} />
            <ListItem icon={Coffee} title="Long Break" value={`${longBreak} Min`} onClick={() => setActiveModal('longBreak')} />
            <ListItem icon={RotateCcw} title="Long Break After" value={`${longBreakInterval} Rounds`} onClick={() => setActiveModal('rounds')} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-3xl p-3 shadow-sm dark:shadow-none backdrop-blur-sm">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-2 pt-2">Automation</h2>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ListItem icon={PlayCircle} title="Auto-Start Pomodoro" isToggle toggleState={autoStartNext} onToggle={handleToggleAutoNext} />
            <ListItem icon={FastForward} title="Auto-Start Break" isToggle toggleState={autoStartBreak} onToggle={handleToggleAutoBreak} />
            <ListItem icon={PauseCircle} title="Disable Breaks" isToggle toggleState={disableBreak} onToggle={handleToggleDisableBreak} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-3xl p-3 shadow-sm dark:shadow-none backdrop-blur-sm">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-2 pt-2">System</h2>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ListItem 
              icon={Palette} 
              title="Appearance" 
              value={mounted ? theme : "system"} 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
            />
            <ListItem icon={AppWindow} title="Keep Screen On" isToggle toggleState={keepScreenOn} onToggle={handleToggleKeepScreenOn} />
            <ListItem icon={UserCircle} title="Account Settings" href="/profile" />
          </div>
        </div>

        <div className="pt-2 pb-6">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 font-bold transition-all active:scale-95 border border-red-100 dark:border-red-500/20 shadow-sm"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>

      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="fixed inset-0" onClick={() => setActiveModal(null)} />
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-white/5">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {modalConfigs[activeModal].title}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
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
                        : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 hover:border-indigo-200 dark:hover:border-white/10'
                    }`}
                  >
                    <span className="font-bold text-base">{opt} <span className="text-xs font-medium opacity-70">{modalConfigs[activeModal].suffix}</span></span>
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