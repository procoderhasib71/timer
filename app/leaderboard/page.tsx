// src/app/leaderboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Crown, Timer } from "lucide-react";
import Link from "next/link";
// @ts-ignore: Bypassing implicit any error for production build
import { auth } from "@/lib/firebaseClient";
import { useAccount } from "@/app/components/shared/AuthGate";
import { Board, Entry, ensureEntry, myEntry, topEntries } from "@/lib/leaderboard";
import { useDuration, useLang } from "@/lib/i18n";

// আসল লিডারবোর্ড: প্রত্যেকের ফোকাস মিনিট (lib/leaderboard.ts)। যে নাম লুকিয়েছে তাকে "A student" দেখাই।

export default function LeaderboardPage() {
  const { account } = useAccount();
  const { t, n } = useLang();
  const formatTime = useDuration();
  const TABS: [Board, string][] = [["week", t("এই সপ্তাহ", "This Week")], ["all", t("সব সময়", "All Time")]];
  const you = t("তুমি", "You");
  const shown = (e: Entry, me: boolean) => (me ? `${e.name || you} (${you})` : e.hidden || !e.name ? t("একজন ছাত্র", "A student") : e.name);
  const [board, setBoard] = useState<Board>("week");
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [mine, setMine] = useState<{ entry: Entry; rank: number } | null>(null);
  const [error, setError] = useState(false);
  const uid = auth.currentUser?.uid || "";

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    setRows(null);
    setError(false);
    ensureEntry(uid, account?.name || auth.currentUser?.displayName || "")
      .catch(() => undefined)
      .then(() => Promise.all([topEntries(board), myEntry(board, uid)]))
      .then(([top, me]) => { if (alive) { setRows(top); setMine(me); } })
      .catch(() => { if (alive) { setRows([]); setError(true); } });
    return () => { alive = false; };
  }, [board, uid, account?.name]);

  const getRankStyle = (index: number, isMe: boolean) => {
    if (index === 0) return 'bg-yellow-50/80 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20';
    if (index === 1) return 'bg-slate-100 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/20';
    if (index === 2) return 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20';
    if (isMe) return 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20';
    return 'bg-white border-transparent hover:border-slate-200 dark:bg-[#1e293b] dark:hover:border-white/10 shadow-sm';
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 pb-40">

      {/* HEADER */}
      <div className="px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between relative z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t("লিডারবোর্ড", "Leaderboard")}</h1>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Trophy size={12}/> {t("সবচেয়ে বেশি ফোকাস", "Most focus time")}</p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 mt-2 max-w-4xl mx-auto">

        {/* TIME FILTER TABS */}
        <div className="bg-slate-200/50 dark:bg-[#1e293b] p-1 rounded-2xl flex items-center justify-between mb-6">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setBoard(id)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
                board === id
                  ? 'bg-white dark:bg-[#2a3850] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {rows === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[68px] rounded-2xl bg-white dark:bg-[#1e293b] animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Timer size={26} /></div>
            <h3 className="font-bold text-slate-800 dark:text-white">{error ? t("লিডারবোর্ড আনা গেল না", "Could not load the leaderboard") : t("এখনো কেউ নেই", "No one here yet")}</h3>
            <p className="text-sm text-slate-500 mt-1">{error ? t("ইন্টারনেট দেখে আবার চেষ্টা করো।", "Check your internet and try again.") : t("একটা ফোকাস সেশন শেষ করো, তুমিই হবে প্রথম।", "Finish a focus session and be the first on the board.")}</p>
          </div>
        ) : (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {rows.map((user, idx) => {
              const isMe = user.uid === uid;
              const label = shown(user, isMe);
              return (
                <div key={user.uid} className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${getRankStyle(idx, isMe)}`}>
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-8 flex justify-center shrink-0">
                      {idx === 0 ? <Crown size={22} className="text-yellow-500 drop-shadow-sm" /> :
                       idx === 1 ? <Trophy size={20} className="text-slate-400 drop-shadow-sm" /> :
                       idx === 2 ? <Trophy size={20} className="text-orange-400 drop-shadow-sm" /> :
                       <span className="text-sm font-bold text-slate-400">{n(idx + 1)}</span>}
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${
                      isMe ? 'bg-indigo-500 text-white' :
                      idx === 0 ? 'bg-yellow-400 text-white' :
                      idx === 1 ? 'bg-slate-300 text-slate-700' :
                      idx === 2 ? 'bg-orange-400 text-white' :
                      'bg-slate-100 dark:bg-[#2a3850] text-slate-700 dark:text-slate-300'
                    }`}>
                      {label.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-sm md:text-base font-bold truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{label}</h4>
                      <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-0.5">🍅 {t(`${n(user.sessions)}টা সেশন`, `${user.sessions} sessions`)}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs md:text-sm font-bold px-2.5 py-1.5 rounded-lg ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-500' :
                    isMe ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                    'bg-slate-100 dark:bg-black/20 text-slate-700 dark:text-slate-300'
                  }`}>
                    {formatTime(user.minutes)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* নিজের র‍্যাঙ্ক, নিচে আটকানো */}
      {rows !== null && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 px-5 z-40 flex justify-center pointer-events-none">
          <div className="bg-slate-900 dark:bg-[#2a3850] border border-slate-800 dark:border-white/10 p-3 rounded-2xl shadow-xl w-full max-w-md flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 text-white text-xs font-extrabold min-w-8 h-8 px-1.5 rounded-full flex items-center justify-center shadow-md">
                {mine ? `#${n(mine.rank)}` : "–"}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{t("তোমার র‍্যাঙ্ক", "Your Rank")}</h4>
                <p className="text-[10px] font-medium text-slate-400">{mine ? t("চালিয়ে যাও! 🔥", "Keep going! 🔥") : t("একটা ফোকাস সেশন শেষ করলেই র‍্যাঙ্ক পাবে", "Finish a focus session to get ranked")}</p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-white bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
              {formatTime(mine?.entry.minutes || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
