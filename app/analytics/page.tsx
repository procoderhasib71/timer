// src/app/analytics/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Clock, Flame, Target, Trophy, TrendingUp, BarChart3, Settings, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import Link from "next/link";

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

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('Week');
  
  // ✅ Offset state for Previous/Next navigation (0 = Current, -1 = Previous, etc.)
  const [dateOffset, setDateOffset] = useState<number>(0);

  // Fetch Session Data from Firebase
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const sessionsRef = collection(db, 'users', user.uid, 'sessions');
        const q = query(sessionsRef, orderBy('timestamp', 'desc'));
        
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const fetchedSessions: Session[] = [];
          snapshot.forEach((doc) => {
            fetchedSessions.push({ id: doc.id, ...doc.data() } as Session);
          });
          setSessions(fetchedSessions);
          setLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else {
        setSessions([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Filter change handler
  const handleFilterChange = (filter: TimeFilter) => {
    setActiveFilter(filter);
    setDateOffset(0); // Reset to current time when changing tabs
  };

  // --- SMART DATE CALCULATION LOGIC ---
  const now = new Date();
  const referenceDate = new Date();
  
  if (activeFilter === 'Today') referenceDate.setDate(now.getDate() + dateOffset);
  else if (activeFilter === 'Week') referenceDate.setDate(now.getDate() + dateOffset * 7);
  else if (activeFilter === 'Month') referenceDate.setMonth(now.getMonth() + dateOffset);
  else if (activeFilter === 'Year') referenceDate.setFullYear(now.getFullYear() + dateOffset);

  // Calculate strict boundaries for filtering
  let filterStart = new Date(referenceDate);
  let filterEnd = new Date(referenceDate);

  if (activeFilter === 'Today') {
    filterStart.setHours(0, 0, 0, 0);
    filterEnd.setHours(23, 59, 59, 999);
  } else if (activeFilter === 'Week') {
    filterStart.setDate(referenceDate.getDate() - referenceDate.getDay()); // Sunday Start
    filterStart.setHours(0, 0, 0, 0);
    filterEnd = new Date(filterStart);
    filterEnd.setDate(filterStart.getDate() + 6); // Saturday End
    filterEnd.setHours(23, 59, 59, 999);
  } else if (activeFilter === 'Month') {
    filterStart.setDate(1);
    filterStart.setHours(0, 0, 0, 0);
    filterEnd = new Date(filterStart);
    filterEnd.setMonth(filterStart.getMonth() + 1);
    filterEnd.setDate(0); // Last day of current month
    filterEnd.setHours(23, 59, 59, 999);
  } else if (activeFilter === 'Year') {
    filterStart.setMonth(0, 1);
    filterStart.setHours(0, 0, 0, 0);
    filterEnd.setMonth(11, 31);
    filterEnd.setHours(23, 59, 59, 999);
  }

  // Filter Sessions Based on calculated Date Range
  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.timestamp);
    return sessionDate >= filterStart && sessionDate <= filterEnd;
  });

  // Dynamic Header String
  const getDateDisplayString = () => {
    if (activeFilter === 'Today') {
      if (dateOffset === 0) return "Today";
      if (dateOffset === -1) return "Yesterday";
      return referenceDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } else if (activeFilter === 'Week') {
      if (dateOffset === 0) return "This Week";
      if (dateOffset === -1) return "Last Week";
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      return `${filterStart.toLocaleDateString('en-GB', opts)} - ${filterEnd.toLocaleDateString('en-GB', opts)}`;
    } else if (activeFilter === 'Month') {
      if (dateOffset === 0) return "This Month";
      if (dateOffset === -1) return "Last Month";
      return referenceDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    } else if (activeFilter === 'Year') {
      if (dateOffset === 0) return "This Year";
      if (dateOffset === -1) return "Last Year";
      return referenceDate.getFullYear().toString();
    }
  };

  // --- OVERVIEW CALCULATIONS ---
  const totalFocusMinutes = filteredSessions.reduce((acc, curr) => acc + curr.duration, 0);
  const totalFocusHours = Math.floor(totalFocusMinutes / 60);
  const remainingMinutes = totalFocusMinutes % 60;
  const completedPomodoros = filteredSessions.filter(s => s.completed && s.mode === 'pomodoro').length;

  // --- CATEGORY BREAKDOWN ---
  const categoryStats = filteredSessions.reduce((acc: Record<string, number>, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.duration;
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);

  // --- DYNAMIC CHART GENERATOR ---
  let chartLabels: string[] = [];
  let chartData: number[] = [];
  let currentHighlightIndex = -1;

  if (activeFilter === 'Today') {
    chartLabels = ['Night', 'Morning', 'Afternoon', 'Evening'];
    chartData = [0, 0, 0, 0];
    if (dateOffset === 0) {
      const currentHour = now.getHours();
      currentHighlightIndex = currentHour < 6 ? 0 : currentHour < 12 ? 1 : currentHour < 18 ? 2 : 3;
    }

    filteredSessions.forEach(s => {
      const hour = new Date(s.timestamp).getHours();
      if (hour < 6) chartData[0] += s.duration;
      else if (hour < 12) chartData[1] += s.duration;
      else if (hour < 18) chartData[2] += s.duration;
      else chartData[3] += s.duration;
    });
  } 
  else if (activeFilter === 'Week') {
    chartLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    chartData = [0, 0, 0, 0, 0, 0, 0];
    if (dateOffset === 0) currentHighlightIndex = now.getDay();

    filteredSessions.forEach(s => {
      chartData[new Date(s.timestamp).getDay()] += s.duration;
    });
  } 
  else if (activeFilter === 'Month') {
    chartLabels = ['W1', 'W2', 'W3', 'W4', 'W5'];
    chartData = [0, 0, 0, 0, 0];
    if (dateOffset === 0) currentHighlightIndex = Math.floor((now.getDate() - 1) / 7);

    filteredSessions.forEach(s => {
      const weekIndex = Math.floor((new Date(s.timestamp).getDate() - 1) / 7);
      if (weekIndex >= 0 && weekIndex <= 4) {
        chartData[weekIndex] += s.duration;
      }
    });
  } 
  else if (activeFilter === 'Year') {
    chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    chartData = new Array(12).fill(0);
    if (dateOffset === 0) currentHighlightIndex = now.getMonth();

    filteredSessions.forEach(s => {
      chartData[new Date(s.timestamp).getMonth()] += s.duration;
    });
  }

  const maxChartValue = Math.max(...chartData, 60);

  if (loading) {
    return (
      <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 pb-32">
      
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-slate-50/80 dark:bg-[#0f172a]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Analytics</h1>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><CalendarDays size={12}/> Study Sessions</p>
          </div>
        </div>
        <button className="p-2 text-slate-500 bg-slate-200/50 dark:bg-[#1c1c1e] rounded-full hover:text-slate-900 dark:hover:text-white transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="px-5 space-y-6 mt-2">
        
        {/* TIME FILTER TABS */}
        <div className="bg-slate-200/50 dark:bg-[#1c1c1e] p-1 rounded-2xl flex items-center justify-between">
          {(['Today', 'Week', 'Month', 'Year'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
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

        {/* ✅ DYNAMIC DATE NAVIGATOR */}
        <div className="flex items-center justify-between bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-2xl p-1 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button 
            onClick={() => setDateOffset(prev => prev - 1)} 
            className="p-3 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {getDateDisplayString()}
          </span>
          
          <button
            onClick={() => setDateOffset(prev => prev + 1)}
            disabled={dateOffset >= 0}
            className={`p-3 rounded-xl transition-colors ${
              dateOffset >= 0 
                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                : 'hover:bg-slate-100 dark:hover:bg-[#2c2c2e] text-slate-500 dark:text-slate-400'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* OVERVIEW CARDS */}
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-5 text-white shadow-lg shadow-indigo-500/30 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-20">
              <Clock size={80} />
            </div>
            <div className="mb-4">
              <span className="bg-white/20 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-sm">
                Focus Time
              </span>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                {totalFocusHours}<span className="text-lg font-medium opacity-80 ml-0.5">h</span> {remainingMinutes}<span className="text-lg font-medium opacity-80 ml-0.5">m</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-rows-2 gap-4">
            <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02]">
              <div className="p-3 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-xl">
                <Flame size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">Sessions</p>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">
                  {filteredSessions.length}
                </h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02]">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Target size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">Pomodoros</p>
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{completedPomodoros}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* DYNAMIC CHART */}
        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500"/> Focus Trend
              </h3>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Total minutes studied ({activeFilter.toLowerCase()})</p>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${totalFocusMinutes > 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-500'}`}>
              <TrendingUp size={14}/> {totalFocusMinutes > 0 ? '+Active' : 'No Data'}
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-1.5 pt-6 pb-2 border-b border-slate-100 dark:border-white/5 relative">
            {chartLabels.map((label, index) => {
              const value = chartData[index];
              const heightPercent = value > 0 ? (value / maxChartValue) * 100 : 4;
              const isHighlight = index === currentHighlightIndex;

              return (
                <div key={label + index} className="flex flex-col items-center w-full group relative h-full justify-end">
                  
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-2 py-1 rounded-md transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                    {Math.floor(value/60)}h {value%60}m
                  </div>
                  
                  {/* Bar */}
                  <div className="w-full flex justify-center h-full items-end mb-2">
                    <div 
                      className={`w-full max-w-[2.5rem] rounded-t-lg transition-all duration-700 ease-out ${
                        isHighlight 
                          ? 'bg-gradient-to-t from-indigo-500 to-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                          : value > 0 
                            ? 'bg-slate-200 dark:bg-[#2c2c2e] group-hover:bg-indigo-300 dark:group-hover:bg-indigo-500/50' 
                            : 'bg-slate-100 dark:bg-white/5'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>
                  <span className={`text-[10px] font-bold ${isHighlight ? 'text-indigo-500' : 'text-slate-400'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CATEGORY BREAKDOWN */}
        <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
            <Trophy size={18} className="text-amber-500"/> Top Categories
          </h3>
          
          <div className="space-y-5">
            {sortedCategories.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-transparent">
                <p className="text-sm font-medium text-slate-400">No session data for this period.</p>
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
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-[#2c2c2e] px-2 py-1 rounded-md group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors">
                        {Math.floor(duration/60)}h {duration%60}m
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-[#2c2c2e] h-2.5 rounded-full overflow-hidden">
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

      </div>
    </div>
  );
}