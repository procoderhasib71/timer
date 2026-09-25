// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { 
  X, ChevronRight, Music, Clock, Coffee, 
  RotateCcw, PlayCircle, FastForward, PauseCircle, 
  Palette, AppWindow, UserCircle, Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface ListItemProps {
  icon: React.ElementType;
  title: string;
  value?: string;
  isToggle?: boolean;
  toggleState?: boolean;
  onToggle?: () => void;
  href?: string;
  onClick?: () => void;
}

export default function SettingsPage() {
  const router = useRouter();
  
  // Theme & User state
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Student");

  // Toggle states
  const [autoStartNext, setAutoStartNext] = useState(false);
  const [autoStartBreak, setAutoStartBreak] = useState(true);
  const [disableBreak, setDisableBreak] = useState(false);

  // ১. ইউজার প্রোফাইল ফেচ করা
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
      }
    });
    return () => unsubscribe();
  }, []);

  // ২. LocalStorage থেকে অটোমেশন সেটিংস লোড করা
  useEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem("pomodoro_settings") || "{}");
    if (savedSettings.autoStartNext !== undefined) setAutoStartNext(savedSettings.autoStartNext);
    if (savedSettings.autoStartBreak !== undefined) setAutoStartBreak(savedSettings.autoStartBreak);
    if (savedSettings.disableBreak !== undefined) setDisableBreak(savedSettings.disableBreak);
    setMounted(true);
  }, []);

  // ৩. সেটিংস আপডেট করা এবং LocalStorage-এ সেভ করা
  const updateSetting = (key: string, value: boolean) => {
    const currentSettings = JSON.parse(localStorage.getItem("pomodoro_settings") || "{}");
    localStorage.setItem("pomodoro_settings", JSON.stringify({ ...currentSettings, [key]: value }));
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

  const ListItem = ({ 
    icon: Icon, title, value, isToggle = false, toggleState = false, onToggle = () => {}, href = "", onClick 
  }: ListItemProps) => {
    
    const content = (
      <div 
        className="flex items-center justify-between py-4 px-1 group cursor-pointer"
        onClick={!isToggle && !href ? onClick : undefined}
      >
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800/50 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
            <Icon size={18} />
          </div>
          <span className="text-[15px] font-medium text-slate-800 dark:text-slate-200 transition-colors">{title}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {value && <span className="text-sm font-medium text-slate-600 dark:text-slate-500 bg-slate-200 dark:bg-slate-800/50 px-3 py-1 rounded-lg capitalize">{value}</span>}
          
          {isToggle ? (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
              className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ease-in-out flex items-center shadow-inner ${
                toggleState ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
                toggleState ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          ) : (
            <ChevronRight size={18} className="text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
          )}
        </div>
      </div>
    );

    return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-200 pb-20 px-5 pt-6 transition-colors duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()} 
          className="p-2.5 rounded-full bg-slate-200 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
        >
          <X size={20} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-bold tracking-wide">Preferences</h1>
        <div className="w-10"></div>
      </div>

      <div className="space-y-6">
        
        {/* Dynamic Profile Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/60 dark:to-purple-900/40 border border-indigo-200 dark:border-indigo-500/20 p-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl"></div>
          
          <Link href="/profile" className="relative flex items-center justify-between p-4 rounded-[1.3rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm transition-colors">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30 overflow-hidden">
                  {/* ইউজারের নামের প্রথম অংশ দিয়ে অটোমেটিক অ্যাভাটার জেনারেট হবে */}
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName.split(' ')[0]}&backgroundColor=b6e3f4`} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                  <Sparkles size={10} className="text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                {/* ইউজারের আসল নাম ডায়নামিকালি দেখাবে */}
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

        {/* Timer Config Card */}
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-4 shadow-sm dark:shadow-none backdrop-blur-sm">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">Timer Configuration</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            <ListItem icon={Music} title="Timer Ringtone" value="Default" />
            <ListItem icon={Clock} title="Pomodoro Length" value="25 Min" />
            <ListItem icon={Coffee} title="Short Break" value="5 Min" />
            <ListItem icon={Coffee} title="Long Break" value="15 Min" />
            <ListItem icon={RotateCcw} title="Long Break After" value="4 Rounds" />
          </div>
        </div>

        {/* Automation Card */}
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-4 shadow-sm dark:shadow-none backdrop-blur-sm">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">Automation</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            <ListItem icon={PlayCircle} title="Auto-Start Pomodoro" isToggle toggleState={autoStartNext} onToggle={handleToggleAutoNext} />
            <ListItem icon={FastForward} title="Auto-Start Break" isToggle toggleState={autoStartBreak} onToggle={handleToggleAutoBreak} />
            <ListItem icon={PauseCircle} title="Disable Breaks" isToggle toggleState={disableBreak} onToggle={handleToggleDisableBreak} />
          </div>
        </div>

        {/* System Card */}
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-4 shadow-sm dark:shadow-none backdrop-blur-sm mb-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">System</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            <ListItem 
              icon={Palette} 
              title="Appearance" 
              value={mounted ? theme : "system"} 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
            />
            <ListItem icon={AppWindow} title="App Badge" />
            <ListItem icon={UserCircle} title="Account Settings" href="/profile" />
          </div>
        </div>

      </div>
    </div>
  );
}