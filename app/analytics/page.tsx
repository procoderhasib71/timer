// src/app/analytics/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Clock, Flame, Target, Trophy, BarChart3, CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Grid3x3 } from "lucide-react";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

interface Session {
  id: string;
  taskId: string | null;
  taskTitle: string;
  category: string;
  duration: number; // in minutes
  mode: string;
  completed: boolean;
  timestamp: string;
}

type TimeFilter = 'Today' | 'Week' | 'Month' | 'Year';

const RECENT_DAYS = 120;          // streak আর heatmap এর জন্য সব সময় শেষ ১২০ দিন পড়ি
const HEAT_WEEKS = 13;            // heatmap: শেষ ১৩ সপ্তাহ (~৩ মাস)
const isFocus = (s: Session) => !s.mode || s.mode === 'pomodoro';
const dayKey = (d: Date) => d.toLocaleDateString('en-CA');   // স্থানীয় YYYY-MM-DD

// কোন ফিল্টারে কোন সময়ের ঘর: offset 0 = এখনকার, -1 = আগেরটা...
function periodRange(filter: TimeFilter, offset: number) {
  const ref = new Date();
  if (filter === 'Today') ref.setDate(ref.getDate() + offset);
  else if (filter === 'Week') ref.setDate(ref.getDate() + offset * 7);
  else if (filter === 'Month') ref.setMonth(ref.getMonth() + offset, 1);
  else ref.setFullYear(ref.getFullYear() + offset, 0, 1);
  const start = new Date(ref);
  let end = new Date(ref);
  if (filter === 'Today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'Week') {
    start.setDate(ref.getDate() - ((ref.getDay() + 1) % 7)); // শনিবার থেকে
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6); // শুক্রবার পর্যন্ত
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'Month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setMonth(start.getMonth() + 1, 0); // মাসের শেষ দিন
    end.setHours(23, 59, 59, 999);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }
  return { ref, start, end };
}

export default function AnalyticsPage() {
  const { t, n, lang } = useLang();
  const loc = lang === "bn" ? "bn-BD" : "en-GB";
  const dur = (min: number) => `${n(Math.floor(min / 60))}${t("ঘ", "h")} ${n(min % 60)}${t("মি", "m")}`;
  const FILTER_LABEL: Record<TimeFilter, string> = { Today: t("আজ", "Today"), Week: t("সপ্তাহ", "Week"), Month: t("মাস", "Month"), Year: t("বছর", "Year") };
  const [uid, setUid] = useState<string | null>(null);
  const [recent, setRecent] = useState<Session[] | null>(null);   // শেষ RECENT_DAYS দিন
  const [older, setOlder] = useState<Session[] | null>(null);     // দেখানো সময় এর চেয়ে পুরনো হলে শুধু সেটুকু
  const [authChecked, setAuthChecked] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('Week');
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ✅ Offset state for Previous/Next navigation (0 = Current, -1 = Previous, etc.)
  const [dateOffset, setDateOffset] = useState<number>(0);

  useEffect(() => onAuthStateChanged(auth, (user) => { setUid(user?.uid ?? null); setAuthChecked(true); }), []);

  const { ref: referenceDate, start: filterStart, end: filterEnd } = periodRange(activeFilter, dateOffset);
  const { start: prevStart, end: prevEnd } = periodRange(activeFilter, dateOffset - 1);
  const recentStart = new Date();
  recentStart.setDate(recentStart.getDate() - RECENT_DAYS);
  recentStart.setHours(0, 0, 0, 0);
  const recentFrom = recentStart.toISOString();
  // আগের সময়সহ পুরোটা শেষ ১২০ দিনের ভেতরে হলে আলাদা করে পড়ার দরকার নেই (খরচ বাঁচে)
  const needOlder = prevStart < recentStart;
  const olderFrom = prevStart.toISOString(), olderTo = filterEnd.toISOString();

  // আগে পুরো জীবনের সব সেশন পড়ত; এখন শুধু যতটুকু দেখাই
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'sessions'), where('timestamp', '>=', recentFrom), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => setRecent(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session))));
  }, [uid, recentFrom]);

  useEffect(() => {
    if (!uid || !needOlder) { setOlder(null); return; }
    const q = query(collection(db, 'users', uid, 'sessions'), where('timestamp', '>=', olderFrom), where('timestamp', '<=', olderTo), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => setOlder(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session))));
  }, [uid, needOlder, olderFrom, olderTo]);

  const sessions = (needOlder ? older : recent) ?? [];
  const loading = !authChecked || (!!uid && (recent === null || (needOlder && older === null)));

  // Filter change handler
  const handleFilterChange = (filter: TimeFilter) => {
    setActiveFilter(filter);
    setDateOffset(0); // Reset to current time when changing tabs
    setSelectedBar(null);
  };
  const shiftOffset = (d: number) => { setDateOffset((prev) => prev + d); setSelectedBar(null); };

  const now = new Date();

  // Filter Sessions Based on calculated Date Range
  const inRange = (s: Session, a: Date, b: Date) => { const d = new Date(s.timestamp); return d >= a && d <= b; };
  const filteredSessions = sessions.filter(s => inRange(s, filterStart, filterEnd));

  // Dynamic Header String
  const getDateDisplayString = () => {
    if (activeFilter === 'Today') {
      if (dateOffset === 0) return t("আজ", "Today");
      if (dateOffset === -1) return t("গতকাল", "Yesterday");
      return referenceDate.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
    } else if (activeFilter === 'Week') {
      if (dateOffset === 0) return t("এই সপ্তাহ", "This Week");
      if (dateOffset === -1) return t("গত সপ্তাহ", "Last Week");
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      return `${filterStart.toLocaleDateString(loc, opts)} - ${filterEnd.toLocaleDateString(loc, opts)}`;
    } else if (activeFilter === 'Month') {
      if (dateOffset === 0) return t("এই মাস", "This Month");
      if (dateOffset === -1) return t("গত মাস", "Last Month");
      return referenceDate.toLocaleDateString(loc, { month: 'long', year: 'numeric' });
    } else if (activeFilter === 'Year') {
      if (dateOffset === 0) return t("এই বছর", "This Year");
      if (dateOffset === -1) return t("গত বছর", "Last Year");
      return n(referenceDate.getFullYear());
    }
  };

  // --- OVERVIEW CALCULATIONS ---
  const focusSessions = filteredSessions.filter(isFocus);
  const totalFocusMinutes = focusSessions.reduce((acc, curr) => acc + curr.duration, 0);
  const totalFocusHours = Math.floor(totalFocusMinutes / 60);
  const remainingMinutes = totalFocusMinutes % 60;
  const completedPomodoros = focusSessions.filter(s => s.completed).length;

  // --- আগের সময়ের সাথে তুলনা ---
  // চলতি সপ্তাহ/মাস এখনো শেষ হয়নি, তাই আগেরটার একই সময় পর্যন্ত মেলাই (মঙ্গলবারে পুরো আগের সপ্তাহের সাথে নয়)
  const prevUntil = dateOffset === 0 ? new Date(Math.min(prevEnd.getTime(), prevStart.getTime() + (now.getTime() - filterStart.getTime()))) : prevEnd;
  const prevFocusMinutes = sessions.filter(s => isFocus(s) && inRange(s, prevStart, prevUntil)).reduce((a, s) => a + s.duration, 0);
  const change = prevFocusMinutes > 0 ? Math.round(((totalFocusMinutes - prevFocusMinutes) / prevFocusMinutes) * 100) : null;
  const soFar = dateOffset === 0;
  const PREV_LABEL: Record<TimeFilter, string> = soFar
    ? { Today: t("গতকালের এই সময়ের", "yesterday so far"), Week: t("গত সপ্তাহের এই সময়ের", "last week so far"), Month: t("গত মাসের এই সময়ের", "last month so far"), Year: t("গত বছরের এই সময়ের", "last year so far") }
    : { Today: t("আগের দিনের", "the day before"), Week: t("আগের সপ্তাহের", "the week before"), Month: t("আগের মাসের", "the month before"), Year: t("আগের বছরের", "the year before") };

  // --- দিনে দিনে মিনিট (streak আর heatmap) ---
  const byDay = new Map<string, number>();
  (recent ?? []).filter(isFocus).forEach(s => {
    const k = dayKey(new Date(s.timestamp));
    byDay.set(k, (byDay.get(k) || 0) + s.duration);
  });
  const studied = (d: Date) => (byDay.get(dayKey(d)) || 0) > 0;
  const todayDone = studied(now);
  // আজ এখনো না পড়লে গতকাল থেকে গুনি: streak আজ রাত পর্যন্ত বেঁচে থাকে
  let streak = 0;
  for (const d = new Date(now); streak <= RECENT_DAYS; d.setDate(d.getDate() - 1)) {
    if (studied(d)) streak++;
    else if (!(streak === 0 && dayKey(d) === dayKey(now))) break;
  }
  let bestStreak = 0, run = 0;
  for (let i = RECENT_DAYS; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    run = studied(d) ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }

  // heatmap: কলাম = সপ্তাহ (শনি→শুক্র), শেষ কলাম এই সপ্তাহ
  const heatStart = new Date(now);
  heatStart.setDate(now.getDate() - ((now.getDay() + 1) % 7) - (HEAT_WEEKS - 1) * 7);
  heatStart.setHours(0, 0, 0, 0);
  const heatWeeks = Array.from({ length: HEAT_WEEKS }, (_, w) => Array.from({ length: 7 }, (_, r) => {
    const d = new Date(heatStart); d.setDate(heatStart.getDate() + w * 7 + r);
    return { key: dayKey(d), date: d, minutes: byDay.get(dayKey(d)) || 0, future: d > now };
  }));
  const heatLevel = (m: number) => m === 0 ? 'bg-slate-100 dark:bg-white/5' : m < 30 ? 'bg-indigo-200 dark:bg-indigo-900' : m < 60 ? 'bg-indigo-300 dark:bg-indigo-700' : m < 120 ? 'bg-indigo-500' : 'bg-indigo-700 dark:bg-indigo-300';
  const heatCells = heatWeeks.flat();
  const heatTotal = heatCells.reduce((a, c) => a + c.minutes, 0);
  const heatDays = heatCells.filter(c => c.minutes > 0).length;
  const pickedDay = heatCells.find(c => c.key === selectedDay);

  // --- CATEGORY BREAKDOWN ---
  const categoryStats = focusSessions.reduce((acc: Record<string, number>, curr) => {
    const c = curr.category || t("অন্যান্য", "Other");   // কাজ ছাড়া বা বট থেকে চালানো সেশনে বিষয় থাকে না
    acc[c] = (acc[c] || 0) + curr.duration;
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);

  // --- DYNAMIC CHART GENERATOR ---
  let chartLabels: string[] = [];
  let chartData: number[] = [];
  let currentHighlightIndex = -1;

  if (activeFilter === 'Today') {
    chartLabels = [t('রাত', 'Night'), t('সকাল', 'Morning'), t('দুপুর', 'Afternoon'), t('সন্ধ্যা', 'Evening')];
    chartData = [0, 0, 0, 0];
    if (dateOffset === 0) {
      const currentHour = now.getHours();
      currentHighlightIndex = currentHour < 6 ? 0 : currentHour < 12 ? 1 : currentHour < 18 ? 2 : 3;
    }

    focusSessions.forEach(s => {
      const hour = new Date(s.timestamp).getHours();
      if (hour < 6) chartData[0] += s.duration;
      else if (hour < 12) chartData[1] += s.duration;
      else if (hour < 18) chartData[2] += s.duration;
      else chartData[3] += s.duration;
    });
  } 
  else if (activeFilter === 'Week') {
    chartLabels = [t('শনি', 'Sat'), t('রবি', 'Sun'), t('সোম', 'Mon'), t('মঙ্গল', 'Tue'), t('বুধ', 'Wed'), t('বৃহ', 'Thu'), t('শুক্র', 'Fri')];
    chartData = [0, 0, 0, 0, 0, 0, 0];
    const col = (d: Date) => (d.getDay() + 1) % 7;   // শনিবার = ০
    if (dateOffset === 0) currentHighlightIndex = col(now);

    focusSessions.forEach(s => {
      chartData[col(new Date(s.timestamp))] += s.duration;
    });
  } 
  else if (activeFilter === 'Month') {
    chartLabels = [1, 2, 3, 4, 5].map(i => t(`${n(i)}ম`, `W${i}`));
    chartData = [0, 0, 0, 0, 0];
    if (dateOffset === 0) currentHighlightIndex = Math.floor((now.getDate() - 1) / 7);

    focusSessions.forEach(s => {
      const weekIndex = Math.floor((new Date(s.timestamp).getDate() - 1) / 7);
      if (weekIndex >= 0 && weekIndex <= 4) {
        chartData[weekIndex] += s.duration;
      }
    });
  } 
  else if (activeFilter === 'Year') {
    chartLabels = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleDateString(loc, { month: 'short' }));
    chartData = new Array(12).fill(0);
    if (dateOffset === 0) currentHighlightIndex = now.getMonth();

    focusSessions.forEach(s => {
      chartData[new Date(s.timestamp).getMonth()] += s.duration;
    });
  }

  const maxChartValue = Math.max(...chartData, 60);

  // লোড হওয়ার সময় পাতার আকারের ধূসর ঘর (skeleton), যাতে হঠাৎ লাফ না দেয়
  if (loading) {
    return (
      <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] px-5 pt-24 space-y-6">
        <div className="h-10 rounded-2xl bg-slate-200/70 dark:bg-[#1e293b] animate-pulse" />
        <div className="h-12 rounded-2xl bg-white dark:bg-[#1e293b] animate-pulse" />
        <div className="grid grid-cols-2 gap-4"><div className="h-36 rounded-3xl bg-indigo-200/60 dark:bg-indigo-500/20 animate-pulse" /><div className="h-36 rounded-3xl bg-white dark:bg-[#1e293b] animate-pulse" /></div>
        <div className="h-64 rounded-3xl bg-white dark:bg-[#1e293b] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 pb-32">
      
      {/* Header */}
      <div className="px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between relative z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t("পড়ার হিসাব", "Analytics")}</h1>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><CalendarDays size={12}/> {t("তোমার ফোকাস সেশন", "Study Sessions")}</p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-6 mt-2">
        

        {/* STREAK: টানা কত দিন পড়েছ */}
        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-orange-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20 dark:from-orange-500/25 dark:via-orange-500/15 dark:to-rose-500/20 dark:text-orange-50 dark:shadow-none dark:ring-1 dark:ring-inset dark:ring-orange-300/15 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="absolute -right-6 -bottom-8 opacity-20"><Flame size={130} /></div>
          <div className="relative flex items-center gap-4">
            <div className={`w-14 h-14 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center ${todayDone ? '' : 'opacity-70'}`}>
              <Flame size={30} className={todayDone ? 'fill-white/40' : ''} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold tracking-wider uppercase opacity-90">{t("টানা পড়া", "Streak")}</p>
              <h2 className="text-3xl font-extrabold leading-tight">{n(streak)} <span className="text-base font-bold opacity-90">{t("দিন", streak === 1 ? "day" : "days")}</span></h2>
              <p className="text-xs font-semibold opacity-90 mt-0.5">
                {streak === 0
                  ? t("আজ একটা ফোকাস সেশন করলেই শুরু", "Finish one focus session today to start")
                  : todayDone
                    ? t("আজকের পড়া হয়ে গেছে, দারুণ!", "Today is done, great job!")
                    : t("আজ একটা সেশন করলে streak থাকবে", "Do one session today to keep it")}
              </p>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-[10px] font-extrabold tracking-wider uppercase opacity-80">{t("সেরা", "Best")}</p>
              <p className="text-xl font-extrabold">{n(bestStreak)}</p>
            </div>
          </div>
        </div>

        {/* TIME FILTER TABS */}
        <div className="bg-slate-200/50 dark:bg-[#1e293b] p-1 rounded-2xl flex items-center justify-between">
          {(['Today', 'Week', 'Month', 'Year'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
                activeFilter === filter 
                  ? 'bg-white dark:bg-[#2a3850] text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {FILTER_LABEL[filter]}
            </button>
          ))}
        </div>

        {/* ✅ DYNAMIC DATE NAVIGATOR */}
        <div className="flex items-center justify-between bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-2xl p-1 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button 
            onClick={() => shiftOffset(-1)} 
            className="p-3 hover:bg-slate-100 dark:hover:bg-[#2a3850] rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {getDateDisplayString()}
          </span>
          
          <button
            onClick={() => shiftOffset(1)}
            disabled={dateOffset >= 0}
            className={`p-3 rounded-xl transition-colors ${
              dateOffset >= 0 
                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                : 'hover:bg-slate-100 dark:hover:bg-[#2a3850] text-slate-500 dark:text-slate-400'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* OVERVIEW CARDS */}
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-500 rounded-3xl p-5 text-white shadow-lg shadow-indigo-500/20 dark:from-indigo-500/25 dark:to-violet-500/20 dark:shadow-none dark:ring-1 dark:ring-inset dark:ring-indigo-300/15 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-20">
              <Clock size={80} />
            </div>
            <div className="mb-4">
              <span className="bg-white/20 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-sm">
                {t("ফোকাস সময়", "Focus Time")}
              </span>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                {n(totalFocusHours)}<span className="text-lg font-medium opacity-80 ml-0.5">{t("ঘ", "h")}</span> {n(remainingMinutes)}<span className="text-lg font-medium opacity-80 ml-0.5">{t("মি", "m")}</span>
              </h2>
              {/* আগের সপ্তাহ/মাসের সাথে তুলনা */}
              <p className="mt-2 text-[11px] font-bold leading-snug flex items-start gap-1 opacity-95">
                {change === null ? (
                  totalFocusMinutes > 0 ? <span>{t(`${PREV_LABEL[activeFilter]} চেয়ে নতুন শুরু ✨`, `A fresh start vs ${PREV_LABEL[activeFilter]}`)}</span> : <span className="opacity-80">{t("এখনো কোনো ফোকাস নেই", "No focus yet")}</span>
                ) : (
                  <>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md shrink-0 ${change >= 0 ? 'bg-emerald-400/30' : 'bg-rose-400/35'}`}>
                      {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{n(Math.abs(change))}%
                    </span>
                    <span>{change >= 0 ? t(`${PREV_LABEL[activeFilter]} চেয়ে বেশি`, `more than ${PREV_LABEL[activeFilter]}`) : t(`${PREV_LABEL[activeFilter]} চেয়ে কম`, `less than ${PREV_LABEL[activeFilter]}`)}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-rows-2 gap-4">
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02]">
              <div className="p-3 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-xl">
                <Flame size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">{t("সেশন", "Sessions")}</p>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">
                  {n(focusSessions.length)}
                </h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02]">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Target size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">{t("পুরো পোমোডোরো", "Pomodoros")}</p>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{n(completedPomodoros)}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* DYNAMIC CHART */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500"/> {t("কখন কতটা পড়েছ", "Focus Trend")}
              </h3>
              <p className="text-[11px] font-medium text-slate-400 mt-1">{t("মোট", "Total")} {dur(totalFocusMinutes)} · {t("বারে চাপলে সময় দেখাবে", "Tap a bar for details")}</p>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-1.5 pt-6 pb-2 border-b border-slate-100 dark:border-white/5 relative">
            {chartLabels.map((label, index) => {
              const value = chartData[index];
              const heightPercent = value > 0 ? (value / maxChartValue) * 100 : 4;
              const isHighlight = index === currentHighlightIndex;

              return (
                <button type="button" key={label + index} onClick={() => setSelectedBar(selectedBar === index ? null : index)} className="flex flex-col items-center w-full group relative h-full justify-end">
                  
                  {/* Tooltip: ফোনে চাপলে, কম্পিউটারে মাউস রাখলে */}
                  <div className={`${selectedBar === index ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 absolute -top-8 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-2 py-1 rounded-md transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg`}>
                    {dur(value)}
                  </div>
                  
                  {/* Bar */}
                  <div className="w-full flex justify-center h-full items-end mb-2">
                    <div 
                      className={`w-full max-w-[2.5rem] rounded-t-lg transition-all duration-700 ease-out ${
                        isHighlight || selectedBar === index
                          ? 'bg-gradient-to-t from-indigo-500 to-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)] dark:shadow-none' 
                          : value > 0 
                            ? 'bg-slate-200 dark:bg-[#2a3850] group-hover:bg-indigo-300 dark:group-hover:bg-indigo-500/50' 
                            : 'bg-slate-100 dark:bg-white/5'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>
                  <span className={`text-[10px] font-bold ${isHighlight || selectedBar === index ? 'text-indigo-500' : 'text-slate-400'}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CATEGORY BREAKDOWN */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
            <Trophy size={18} className="text-amber-500"/> {t("কোন বিষয়ে বেশি", "Top Categories")}
          </h3>
          
          <div className="space-y-5">
            {sortedCategories.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-transparent">
                <p className="text-sm font-medium text-slate-400">{t("এই সময়ে কোনো সেশন নেই। একটা ফোকাস সেশন শেষ করলে এখানে দেখাবে।", "No sessions in this period. Finish a focus session and it shows up here.")}</p>
              </div>
            ) : (
              sortedCategories.slice(0, 5).map(([category, duration], index) => {
                const percentage = totalFocusMinutes > 0 ? (duration / totalFocusMinutes) * 100 : 0;
                const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-rose-500', 'bg-blue-500'];
                const bgColor = colors[index % colors.length];

                return (
                  <div key={category} className="w-full group">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${bgColor}`}></span>
                        {category}
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-[#2a3850] px-2 py-1 rounded-md group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors">
                        {dur(duration)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-[#2a3850] h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${bgColor}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* HEATMAP: শেষ ৩ মাসের প্রতিদিন */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-500 delay-300">
          <div className="flex justify-between items-start mb-4 gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <Grid3x3 size={18} className="text-indigo-500" /> {t("শেষ ৩ মাস", "Last 3 months")}
              </h3>
              <p className="text-[11px] font-medium text-slate-400 mt-1">{t(`${n(heatDays)} দিন পড়েছ · মোট ${dur(heatTotal)}`, `Studied ${heatDays} days · ${dur(heatTotal)} total`)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-[9px] font-bold text-slate-400 py-0.5">
              {[t('শনি', 'Sat'), t('সোম', 'Mon'), t('বুধ', 'Wed'), t('শুক্র', 'Fri')].map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${HEAT_WEEKS}, minmax(0, 1fr))` }}>
              {heatWeeks.map((week, w) => (
                <div key={w} className="grid grid-rows-7 gap-1">
                  {week.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      disabled={c.future}
                      onClick={() => setSelectedDay(selectedDay === c.key ? null : c.key)}
                      aria-label={`${c.date.toLocaleDateString(loc, { day: 'numeric', month: 'short' })}: ${dur(c.minutes)}`}
                      className={`aspect-square w-full rounded-[4px] transition-transform ${c.future ? 'opacity-0' : heatLevel(c.minutes)} ${selectedDay === c.key ? 'ring-2 ring-orange-400 scale-110' : ''} ${c.key === dayKey(now) ? 'outline outline-1 outline-indigo-400/60' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 min-h-[1rem]">
              {pickedDay
                ? `${pickedDay.date.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' })}: ${pickedDay.minutes > 0 ? dur(pickedDay.minutes) : t('পড়া হয়নি', 'no focus')}`
                : <span className="text-slate-400 font-medium">{t("ঘরে চাপলে সেই দিনের সময়", "Tap a day to see its time")}</span>}
            </p>
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 shrink-0">
              {t("কম", "Less")}
              {[0, 20, 45, 90, 150].map((m) => <span key={m} className={`w-2.5 h-2.5 rounded-[3px] ${heatLevel(m)}`} />)}
              {t("বেশি", "More")}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}