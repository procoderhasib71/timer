// src/app/leaderboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Flame, Crown, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";

// Mock Data
const MOCK_LEADERBOARD = [
  { id: "1", name: "Tawhid Afridi", avatar: "T", score: 2840, isCurrentUser: false, trend: "up" },
  { id: "2", name: "Ayman Sadiq", avatar: "A", score: 2650, isCurrentUser: false, trend: "same" },
  { id: "3", name: "Asif (You)", avatar: "A", score: 2410, isCurrentUser: true, trend: "up" },
  { id: "4", name: "Sakib Al Hasan", avatar: "S", score: 2100, isCurrentUser: false, trend: "down" },
  { id: "5", name: "Jhankar Mahbub", avatar: "J", score: 1950, isCurrentUser: false, trend: "up" },
  { id: "6", name: "Enayet Chowdhury", avatar: "E", score: 1820, isCurrentUser: false, trend: "down" },
  { id: "7", name: "Khalid Farhan", avatar: "K", score: 1640, isCurrentUser: false, trend: "same" },
  { id: "8", name: "Ali Abdaal", avatar: "A", score: 1500, isCurrentUser: false, trend: "up" },
  { id: "9", name: "Dr. Najeeb", avatar: "D", score: 1320, isCurrentUser: false, trend: "down" },
  { id: "10", name: "Hussain Elius", avatar: "H", score: 1100, isCurrentUser: false, trend: "up" },
];

type FilterType = 'This Week' | 'All Time';

export default function LeaderboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('This Week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setTimeout(() => setLoading(false), 400); // Simulate loading
    });
    return () => unsubscribe();
  }, []);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const currentUserData = MOCK_LEADERBOARD.find(u => u.isCurrentUser);
  const currentUserRank = MOCK_LEADERBOARD.findIndex(u => u.isCurrentUser) + 1;

  // Background style based on rank
  const getRankStyle = (index: number, isMe: boolean) => {
    if (index === 0) return 'bg-yellow-50/80 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20';
    if (index === 1) return 'bg-slate-100 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/20';
    if (index === 2) return 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20';
    if (isMe) return 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20';
    return 'bg-white border-transparent hover:border-slate-200 dark:bg-[#1c1c1e] dark:hover:border-white/10 shadow-sm';
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 pb-32">
      
      {/* HEADER */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-slate-50/90 dark:bg-[#0f172a]/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Leaderboard</h1>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Trophy size={12}/> Top Students</p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 mt-2 max-w-4xl mx-auto">
        
        {/* TIME FILTER TABS */}
        <div className="bg-slate-200/50 dark:bg-[#1c1c1e] p-1 rounded-2xl flex items-center justify-between mb-6">
          {(['This Week', 'All Time'] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
                activeFilter === filter 
                  ? 'bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* CLEAN UNIFIED LIST */}
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {MOCK_LEADERBOARD.map((user, idx) => {
            const rank = idx + 1;
            
            return (
              <div 
                key={user.id} 
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${getRankStyle(idx, user.isCurrentUser)}`}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  
                  {/* Rank Icon / Number */}
                  <div className="w-8 flex justify-center shrink-0">
                    {idx === 0 ? <Crown size={22} className="text-yellow-500 drop-shadow-sm" /> :
                     idx === 1 ? <Trophy size={20} className="text-slate-400 drop-shadow-sm" /> :
                     idx === 2 ? <Trophy size={20} className="text-orange-400 drop-shadow-sm" /> :
                     <span className="text-sm font-bold text-slate-400">{rank}</span>}
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${
                    user.isCurrentUser ? 'bg-indigo-500 text-white' : 
                    idx === 0 ? 'bg-yellow-400 text-white' :
                    idx === 1 ? 'bg-slate-300 text-slate-700' :
                    idx === 2 ? 'bg-orange-400 text-white' :
                    'bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300'
                  }`}>
                    {user.avatar}
                  </div>

                  {/* User Info */}
                  <div>
                    <h4 className={`text-sm md:text-base font-bold ${
                      user.isCurrentUser ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {user.name}
                    </h4>
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                      <Flame size={10} className="text-orange-500"/>
                      Focusing
                    </p>
                  </div>
                </div>

                {/* Score & Trend */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs md:text-sm font-bold px-2.5 py-1.5 rounded-lg ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-500' :
                    user.isCurrentUser ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                    'bg-slate-100 dark:bg-black/20 text-slate-700 dark:text-slate-300'
                  }`}>
                    {formatTime(user.score)}
                  </span>
                  
                  <div className="w-5 flex justify-center hidden sm:flex">
                    {user.trend === 'up' && <ChevronUp size={16} className="text-emerald-500" />}
                    {user.trend === 'down' && <ChevronDown size={16} className="text-red-500" />}
                    {user.trend === 'same' && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FIXED CURRENT USER BAR AT BOTTOM (Slimmer Design) */}
      {currentUserData && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 px-5 z-40 flex justify-center pointer-events-none animate-in slide-in-from-bottom-10 duration-500 delay-200">
          <div className="bg-slate-900 dark:bg-[#2c2c2e] border border-slate-800 dark:border-white/10 p-3 rounded-2xl shadow-xl w-full max-w-md flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 text-white text-xs font-extrabold w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                #{currentUserRank}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Your Rank</h4>
                <p className="text-[10px] font-medium text-slate-400">Keep grinding! 🔥</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-white bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
                {formatTime(currentUserData.score)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}