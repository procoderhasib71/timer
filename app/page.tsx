// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, X, ChevronDown, ArrowLeft, 
  Calendar, CalendarDays, CheckCircle2, ChevronRight, 
  Plus, Circle, Clock, Flag, Tag, Repeat, Bell, Send, Square, SkipForward, ListTodo, Settings2, Trash2,
  
} from "lucide-react";
// 🚨 MODES বাদ দিয়ে শুধু useTimer ইমপোর্ট করা হলো
import { useTimer, TimerMode, TimerState } from "@/hooks/useTimer";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, addDoc } from "firebase/firestore";
import { useAccount } from "@/app/components/shared/AuthGate";
import { useAccountSheet } from "@/app/components/account/AccountSheet";
import { BotSession, botReminder, botTimerPull, botTimerPush } from "@/lib/admcqAccount";
import { addMinutes, ensureEntry } from "@/lib/leaderboard";
import { useLang } from "@/lib/i18n";
import { askNotifyPermission, notify, playRingtone, unlockAudio, vibrate } from "@/lib/alarm";

interface Task {
  id: string;
  title: string;
  category: string;
  duration: number;
  completed: boolean;
  estimatedPomodoros: number;
  completedPomodoros: number;
  dueDate?: string | null;
  reminder?: string | null;
  repeat?: string | null;
  notes?: string | null;
  priority?: number;
  createdAt?: string;
  completedAt?: string | null; 
  list?: string; 
}

const CATEGORIES = ["HSC", "Admission", "Medical", "Varsity", "MBBS"];

const formatClock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const isClock = (v?: string | null): v is string => Boolean(v && /^\d\d:\d\d$/.test(v));

// টাস্ক বারবার: শেষ করা টাস্ক নিয়মের দিনে আবার ফিরে আসে, আর রিমাইন্ডারও সেই নিয়মে বাজে (বটের মাধ্যমে)
const REPEATS: [string, string][] = [["", "None"], ["daily", "Daily"], ["satthu", "Sat–Thu"], ["weekly", "Weekly"]];
const LEGACY_REPEAT: Record<string, string> = { Daily: "daily", Weekly: "weekly", Weekdays: "satthu" };
const repeatKey = (v?: string | null) => (v ? LEGACY_REPEAT[v] ?? (REPEATS.some(([k]) => k === v) ? v : "") : "");

/** নিয়মের আজকের দিনে, আগে শেষ করা বারবারের টাস্ক আবার অসম্পূর্ণ করি */
/** কিছু না থাকলে: আইকন, শিরোনাম আর এক লাইনের পথ দেখানো */
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="text-center py-12 px-6 animate-in fade-in duration-500">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">{icon}</div>
      <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{body}</p>
    </div>
  );
}

function renewRepeats(list: Task[]): Task[] | null {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let changed = false;
  const out = list.map((t) => {
    const key = repeatKey(t.repeat);
    if (!key || !t.completed || !t.completedAt || Date.parse(t.completedAt) >= todayStart) return t;
    const due = key === "daily" || (key === "satthu" && now.getDay() !== 5)
      || (key === "weekly" && new Date(t.createdAt || t.completedAt).getDay() === now.getDay());
    if (!due) return t;
    changed = true;
    return { ...t, completed: false, completedAt: null, completedPomodoros: 0 };
  });
  return changed ? out : null;
}

export default function PomodoroPage() {
  const { t, n, lang } = useLang();
  const loc = lang === "bn" ? "bn-BD" : "en-GB";
  // তালিকা/তারিখের নাম ডাটায় ইংরেজিতে থাকে ("Today" ...), দেখাই ভাষা অনুযায়ী
  const listLabel = (v?: string | null) => ({
    Today: t("আজ", "Today"), Tomorrow: t("আগামীকাল", "Tomorrow"), "This Week": t("এই সপ্তাহ", "This Week"),
    Planned: t("পরিকল্পিত", "Planned"), Completed: t("শেষ হয়েছে", "Completed"), None: t("নেই", "None"),
  } as Record<string, string>)[v || ""] || v || "";
  const [currentScreen, setCurrentScreen] = useState<'home' | 'tasks' | 'timer'>('home');
  const [activeList, setActiveList] = useState("Today");
  
  const [showStopModal, setShowStopModal] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [showCompletedSection, setShowCompletedSection] = useState(false); 
  const [showAllCompletedTasks, setShowAllCompletedTasks] = useState(false);
  const [editModalField, setEditModalField] = useState<'none' | 'category' | 'priority' | 'dueDate' | 'reminder' | 'repeat'>('none');
  const [addTab, setAddTab] = useState<'pomo' | 'date' | 'priority' | 'tag'>('pomo');
  
  const [quickNewTaskTitle, setQuickNewTaskTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [estimatedPomos, setEstimatedPomos] = useState(1);
  const [addDate, setAddDate] = useState("Today");
  const [addPriority, setAddPriority] = useState(0); 
  const [addCategory, setAddCategory] = useState("HSC");
  
  const router = useRouter();
  const sheet = useAccountSheet();

  // সময় শেষ: শব্দ, কাঁপুনি আর নোটিফিকেশন (অ্যাপ পেছনে থাকলেও দেখা যায়)।
  // অনেক পরে টের পেলে (অ্যাপ বন্ধ ছিল) বাজাই না, বিরতিও নিজে শুরু করি না; বট আগেই Telegram এ জানিয়েছে
  const lateFinish = useRef(false);
  const handleTimerFinish = (finishedMode: TimerMode, lateMs = 0) => {
    lateFinish.current = lateMs > 2 * 60 * 1000;
    if (lateFinish.current) return;
    const settings = JSON.parse(localStorage.getItem('pomodoro_settings') || '{}');
    playRingtone(settings.ringtone || "Default");
    vibrate();
    if (finishedMode === 'pomodoro') notify(t("ফোকাস সেশন শেষ 🍅", "Focus session complete 🍅"), t("দারুণ! এবার একটু বিরতি নাও।", "Great work! Time for a break."));
    else notify(t("বিরতি শেষ ⏰", "Break is over ⏰"), t("পরের ফোকাস সেশনের জন্য তৈরি?", "Ready for the next focus session?"));
  };

  const { account, botLinked } = useAccount();
  // Timer Hook
  const { mode, timeLeft, isActive, toggleTimer, adjustTime, initialDuration, changeMode, getSettings, restored, applyRemote } = useTimer("pomodoro", handleTimerFinish,
    // বটে যুক্ত থাকলে বটও একই টাইমার দেখে, আর শেষে Telegram এ মেসেজ দেয় (অ্যাপ বন্ধ থাকলেও); অ্যাপেই শেষ হলে বাতিল, যাতে দুবার না বাজে
    (s) => pushTimer(s));
  const [activeCategory, setActiveCategory] = useState("HSC");
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const userName = (account?.name || auth.currentUser?.displayName || "").split(" ")[0];
  const [hour, setHour] = useState<number | null>(null);

  // সময় অনুযায়ী শুভেচ্ছা (সার্ভারে নয়, ব্রাউজারের ঘড়িতে)
  useEffect(() => { setHour(new Date().getHours()); }, []);
  const greeting = hour === null ? t("স্বাগতম", "Hello")
    : hour >= 5 && hour < 12 ? t("শুভ সকাল", "Good Morning") : hour >= 12 && hour < 17 ? t("শুভ দুপুর", "Good Afternoon")
    : hour >= 17 && hour < 21 ? t("শুভ সন্ধ্যা", "Good Evening") : t("শুভ রাত্রি", "Good Night");

  // লিডারবোর্ডে নিজের ঘর না থাকলে আগের সেশন থেকে বানাই (প্রথমবার একবারই)
  useEffect(() => {
    if (userId) ensureEntry(userId, account?.name || auth.currentUser?.displayName || "").catch(() => undefined);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // আগের চলমান/থামানো টাইমার ফিরে এলে সরাসরি টাইমারের পর্দায়
  useEffect(() => {
    if (restored) setCurrentScreen('timer');
  }, [restored]);

  // কোন টাস্কে কাজ চলছিল মনে রাখি, রিফ্রেশের পরে সেটাই আবার
  useEffect(() => {
    if (activeTask) localStorage.setItem('pomodoro_active_task', activeTask.id);
  }, [activeTask]);

  // ব্রাউজারের ট্যাবে বাকি সময়
  useEffect(() => {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    const title = !isActive && timeLeft === initialDuration ? "Pomodoro BD"
      : `${isActive ? "" : "⏸ "}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} · ${mode === 'pomodoro' ? t("ফোকাস", "Focus") : t("বিরতি", "Break")}`;
    document.title = title;
    // পেজ লোডের পরে Next নিজের title বসায়; থামানো টাইমারে তাই একটু পরে আবার
    const id = setTimeout(() => { document.title = title; }, 500);
    return () => clearTimeout(id);
  }, [timeLeft, isActive, initialDuration, mode, t]);

  // সেটিংসে চালু থাকলে টাইমার চলার সময় স্ক্রিন বন্ধ হবে না
  useEffect(() => {
    if (!isActive || !getSettings().keepScreenOn || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState === 'visible') navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => undefined);
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => undefined);
    };
  }, [isActive, getSettings]);

  // Start চাপলে: শব্দ চালুর অনুমতি (ব্রাউজারের নিয়ম) আর প্রথমবার নোটিফিকেশনের অনুমতি
  const startOrPause = () => {
    if (!isActive) {
      unlockAudio();
      askNotifyPermission();
    }
    toggleTimer();
  };

  const sessionState = useRef({ timeLeft, isActive, activeTask, mode, activeCategory, initialDuration });
  const wasActiveRef = useRef(false);

  useEffect(() => {
    sessionState.current = { timeLeft, isActive, activeTask, mode, activeCategory, initialDuration };
    if (isActive) wasActiveRef.current = true;
  }, [timeLeft, isActive, activeTask, mode, activeCategory, initialDuration]);

  const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay(); 
    const diffToSat = day === 6 ? 0 : -(day + 1);
    
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + diffToSat);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); 
    
    const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    
    return {
      startStr: startDate.toLocaleDateString(loc, formatOpts),
      endStr: endDate.toLocaleDateString(loc, formatOpts),
      rangeStr: `${startDate.toLocaleDateString(loc, formatOpts)} - ${endDate.toLocaleDateString(loc, formatOpts)}`
    };
  };

  const weekData = getWeekRange();

  // লগইন না থাকলে /login এ। একবারই শুনি; ইউজার বদলালে আগের টাস্কের listener বন্ধ করে নতুনটা
  useEffect(() => {
    let stopTasks: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      stopTasks?.();
      stopTasks = null;
      if (!user) {
        setUserId(null); setTasks([]);
        router.replace('/login');
        return;
      }
      setUserId(user.uid);

      stopTasks = onSnapshot(doc(db, 'users', user.uid, 'taskData', 'allTasks'), (docSnap) => {
        let fetchedTasks: Task[] = docSnap.exists() ? (docSnap.data().tasks || []) : [];
        const renewed = renewRepeats(fetchedTasks);
        if (renewed) { fetchedTasks = renewed; syncTasksToDB(renewed, user.uid); }
        setTasks(fetchedTasks);
        // চলতি টাস্কের নতুন তথ্য; না থাকলে আগে যেটায় কাজ চলছিল, নইলে প্রথম অসম্পূর্ণ টাস্ক
        setActiveTask((prev) => {
          const wanted = prev?.id || localStorage.getItem('pomodoro_active_task');
          if (wanted === 'none') return null;   // "কাজ ছাড়াই ফোকাস" বাছাই করা
          return fetchedTasks.find((t) => t.id === wanted) || prev || fetchedTasks.find((t) => !t.completed) || null;
        });
      });
    });
    return () => { stopTasks?.(); unsubscribeAuth(); };
  }, [router]);

  const syncTasksToDB = async (updatedTasks: Task[], uid: string) => {
    try {
      const safeTasks = JSON.parse(JSON.stringify(updatedTasks));
      await setDoc(doc(db, 'users', uid, 'taskData', 'allTasks'), { tasks: safeTasks });
    } catch (error) {
      console.error("DB Sync Error: ", error);
    }
  };

  const saveFocusSession = async (finalTimeLeft: number, isCompleted: boolean) => {
    if (!userId) return;
    const currentInitial = sessionState.current.initialDuration;
    const timeSpentInSeconds = currentInitial - finalTimeLeft;
    
    if (timeSpentInSeconds >= 60) {
      try {
        await addDoc(collection(db, 'users', userId, 'sessions'), {
          taskId: activeTask?.id || null,
          taskTitle: activeTask?.title || "Focus Session",
          category: activeTask?.category || activeCategory,
          duration: Math.round(timeSpentInSeconds / 60),
          mode: mode, completed: isCompleted, timestamp: new Date().toISOString()
        });
        if (mode === 'pomodoro') addMinutes(userId, account?.name || auth.currentUser?.displayName || "", timeSpentInSeconds / 60).catch(() => undefined);

        if (isCompleted && activeTask && mode === 'pomodoro') {
          const newCompletedCount = (activeTask.completedPomodoros || 0) + 1;
          const updatedTasks = tasks.map(t => 
            t.id === activeTask.id ? { ...t, completedPomodoros: newCompletedCount } : t
          );
          setTasks(updatedTasks);
          setActiveTask({...activeTask, completedPomodoros: newCompletedCount});
          syncTasksToDB(updatedTasks, userId);
        }
      } catch (error) { console.error("Error saving session: ", error); }
    }
  };

  // AUTO-BREAK & AUTO-NEXT LOGIC
  useEffect(() => { 
    if (timeLeft === 0 && userId && wasActiveRef.current) {
      wasActiveRef.current = false;
      
      saveFocusSession(0, true).then(() => {
        const settings = getSettings();
        
        if (mode === 'pomodoro' && settings.disableBreak) {
          // বিরতি বন্ধ: সরাসরি পরের পোমোডোরো
          changeMode('pomodoro', (settings.autoStartNext ?? false) && !lateFinish.current);
        } else if (mode === 'pomodoro') {
          const currentCount = (activeTask?.completedPomodoros || 0) + 1;
          const longBreakInterval = settings.longBreakInterval || 4;
          const nextMode = (currentCount % longBreakInterval === 0) ? 'longBreak' : 'shortBreak';
          const autoBreak = settings.autoStartBreak ?? true;
          
          changeMode(nextMode, autoBreak && !lateFinish.current);
        } else {
          const autoNext = settings.autoStartNext ?? false;
          changeMode('pomodoro', autoNext && !lateFinish.current);
        }
      });
    } 
  }, [timeLeft, userId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleAppClose = () => {
      const { timeLeft, isActive, initialDuration } = sessionState.current;
      if (isActive || timeLeft < initialDuration) saveFocusSession(timeLeft, false);
    };
    window.addEventListener('beforeunload', handleAppClose);
    window.addEventListener('pagehide', handleAppClose);
    return () => { window.removeEventListener('beforeunload', handleAppClose); window.removeEventListener('pagehide', handleAppClose); };
  }, [userId]);

  // ---- বটের সাথে একই টাইমার ----
  // timerSeen: বটের যে বদল পর্যন্ত দেখা বা নিজে পাঠানো হয়েছে (updated_at), তার পরেরটাই শুধু বসাই
  const timerSeen = useRef(0);
  const markSeen = (at: number) => {
    timerSeen.current = Math.max(timerSeen.current, at);
    try { localStorage.setItem('pomodoro_timer_seen', String(timerSeen.current)); } catch { /* প্রাইভেট মোড */ }
  };
  useEffect(() => { timerSeen.current = Number(localStorage.getItem('pomodoro_timer_seen')) || 0; }, []);

  // অ্যাপে বদলালে বটকে জানাই, একটার পর একটা (যাতে পরেরটা আগে না পৌঁছায়)
  const pushChain = useRef<Promise<unknown>>(Promise.resolve());
  const pushTimer = (s: TimerState) => {
    if (!botLinked) return;
    const set = getSettings();
    const body = {
      endAt: s.endAt, mode: s.mode, timeLeft: s.timeLeft, initial: s.initialDuration,
      taskId: activeTask?.id || null, taskTitle: activeTask?.title || null,
      lengths: { focus: set.pomodoroLength || 25, short: set.shortBreak || 5, long: set.longBreak || 15 },
    };
    pushChain.current = pushChain.current.then(() => botTimerPush(auth, body)).then((at) => { if (at) markSeen(at); });
  };

  // বট থেকে চালানো যে সেশন অ্যাপ দেখেনি (বন্ধ ছিল), সেটা পড়ার হিসাব, লিডারবোর্ড আর টাস্কে তুলি
  const saveBotSession = async (uid: string, s: BotSession) => {
    const task = tasksRef.current.find((x) => x.id === s.task_id);
    await addDoc(collection(db, 'users', uid, 'sessions'), {
      taskId: s.task_id, taskTitle: s.task_title || task?.title || "Focus Session", category: task?.category || activeCategory,
      duration: s.minutes, mode: s.mode, completed: Boolean(s.completed), timestamp: new Date(s.ended_at).toISOString(), source: 'bot',
    });
    if (s.mode === 'pomodoro') addMinutes(uid, account?.name || auth.currentUser?.displayName || "", s.minutes).catch(() => undefined);
    if (s.completed && task) {
      const updated = tasksRef.current.map((x) => x.id === task.id ? { ...x, completedPomodoros: (x.completedPomodoros || 0) + 1 } : x);
      tasksRef.current = updated;
      setTasks(updated);
      syncTasksToDB(updated, uid);
    }
  };

  // অ্যাপ খোলা থাকলে ১৫ সেকেন্ড পরপর আর অ্যাপে ফিরে এলেই বটের বদল দেখি
  const pullRef = useRef<() => Promise<void>>(async () => undefined);
  pullRef.current = async () => {
    if (!userId || document.visibilityState !== 'visible') return;
    const r = await botTimerPull(auth);
    if (!r) return;
    for (const s of r.sessions) await saveBotSession(userId, s).catch(() => undefined);
    const tm = r.timer;
    if (!tm || tm.source !== 'bot' || tm.updated_at <= timerSeen.current) return;
    markSeen(tm.updated_at);
    const m: TimerMode = tm.mode === 'shortBreak' || tm.mode === 'longBreak' ? tm.mode : 'pomodoro';
    if (tm.end_at && tm.end_at > Date.now()) applyRemote({ mode: m, endAt: tm.end_at, timeLeft: 0, initialDuration: tm.initial });
    else if (!tm.end_at && tm.time_left < tm.initial) applyRemote({ mode: m, endAt: null, timeLeft: tm.time_left, initialDuration: tm.initial });
    else { changeMode('pomodoro'); return; }   // বট থেকে বন্ধ করা (যতটুকু পড়া হয়েছে বট রেখে দিয়েছে)
    const task = tm.task_id ? tasksRef.current.find((x) => x.id === tm.task_id && !x.completed) : null;
    if (task) setActiveTask(task);
    setCurrentScreen('timer');
  };
  useEffect(() => {
    if (!botLinked || !userId) return;
    let busy = false;
    const pull = () => {
      if (busy) return;
      busy = true;
      pullRef.current().catch(() => undefined).finally(() => { busy = false; });
    };
    pull();
    const id = setInterval(pull, 15000);
    document.addEventListener('visibilitychange', pull);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', pull); };
  }, [botLinked, userId]);

  const confirmStopTimer = () => {
    const { timeLeft, isActive, initialDuration } = sessionState.current;
    if (isActive || timeLeft < initialDuration) saveFocusSession(timeLeft, false);
    changeMode('pomodoro');
    setShowStopModal(false);
    setCurrentScreen('home');
  };

  const openAddTaskModal = () => {
    const defaultList = activeList !== "Completed" ? activeList : "Today";
    setAddDate(defaultList); 
    setNewTaskTitle("");
    setEstimatedPomos(1);
    setAddPriority(0);
    setAddCategory("HSC");
    setAddTab('pomo');
    setIsAddingTask(true);
  };

  const submitNewTask = async () => {
    if (newTaskTitle.trim() === '') return;
    const targetList = addDate === "Today" ? "Today" : (addDate === "This Week" ? "This Week" : "Planned");
    const newId = Date.now().toString();
    
    const newTask: Task = {
      id: newId, title: newTaskTitle, category: addCategory, duration: 25, completed: false,
      estimatedPomodoros: estimatedPomos, completedPomodoros: 0, createdAt: new Date().toISOString(), completedAt: null,
      list: targetList, dueDate: addDate !== "None" ? addDate : null, priority: addPriority, reminder: null, repeat: null, notes: null
    };
    
    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    setIsAddingTask(false);
    if (userId) syncTasksToDB(updatedTasks, userId);
  };

  const handleQuickAddTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickNewTaskTitle.trim() !== '') {
      const newId = Date.now().toString();
      const newTask: Task = {
        id: newId, title: quickNewTaskTitle, category: activeCategory, duration: 25, completed: false,
        estimatedPomodoros: 1, completedPomodoros: 0, createdAt: new Date().toISOString(), completedAt: null, 
        list: "Today", priority: 0, dueDate: null, reminder: null, repeat: null, notes: null
      };
      
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks); setActiveTask(newTask); setQuickNewTaskTitle(""); setShowTaskSelector(false); 
      if (userId) syncTasksToDB(updatedTasks, userId);
    }
  };

  // টাস্কের রিমাইন্ডার বটে: সময় থাকলে বসাই; শেষ করা (বারবারের নয়) টাস্ক বা সময় মুছলে বাতিল
  const syncReminder = (t: Task) => {
    if (!botLinked) return;
    const off = !isClock(t.reminder) || (t.completed && !repeatKey(t.repeat));
    botReminder(auth, { ref: t.id, title: t.title, time: off ? null : t.reminder!, day: t.dueDate === "Tomorrow" ? "tomorrow" : "today", repeat: repeatKey(t.repeat) });
  };

  // lazy: নাম আর নোট টাইপের সময় প্রতি অক্ষরে নয়, থামার একটু পরে ডাটাবেসে (আর নাম বদলালে বটের রিমাইন্ডারেও)
  const lazySync = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUpdateTaskDetails = async (taskId: string, updates: Partial<Task>, lazy = false) => {
    if (!userId) return;
    const before = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    setTasks(updatedTasks);
    const after = updatedTasks.find(t => t.id === taskId);
    if (editingTask && editingTask.id === taskId) setEditingTask(prev => prev ? { ...prev, ...updates } : null);
    if (activeTask && activeTask.id === taskId) setActiveTask(prev => prev ? { ...prev, ...updates } : null);
    if (lazySync.current) clearTimeout(lazySync.current);
    lazySync.current = null;
    if (lazy) {
      lazySync.current = setTimeout(() => {
        lazySync.current = null;
        syncTasksToDB(updatedTasks, userId);
        if (after && 'title' in updates && isClock(after.reminder) && after.title.trim()) syncReminder(after);
      }, 800);
      return;
    }
    if (after && ['reminder', 'repeat', 'completed', 'dueDate'].some(k => k in updates) && (isClock(after.reminder) || isClock(before?.reminder))) syncReminder(after);
    syncTasksToDB(updatedTasks, userId);
  };

  // টাস্কের শিট বন্ধ: বাকি থাকা লেখা এখনই রাখি; নাম খালি রাখলে আগের নাম ফেরত
  const [confirmDelete, setConfirmDelete] = useState(false);
  const openTitle = useRef("");
  useEffect(() => { setConfirmDelete(false); openTitle.current = editingTask?.title || ""; }, [editingTask?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeTaskEditor = () => {
    const et = editingTask;
    if (et && !et.title.trim()) {
      handleUpdateTaskDetails(et.id, { title: openTitle.current.trim() || t("নাম ছাড়া কাজ", "Untitled task") });
    } else if (lazySync.current && userId) {
      clearTimeout(lazySync.current);
      lazySync.current = null;
      syncTasksToDB(tasks, userId);
      if (et && isClock(et.reminder)) syncReminder(et);
    }
    setEditingTask(null);
    setEditModalField('none');
  };

  // কাজ মুছে ফেলা: বটের রিমাইন্ডারও বাতিল, টাইমারে এটা বাছাই থাকলে সরাই
  const deleteTask = (task: Task) => {
    if (!userId) return;
    if (lazySync.current) clearTimeout(lazySync.current);
    lazySync.current = null;
    const updatedTasks = tasks.filter(x => x.id !== task.id);
    setTasks(updatedTasks);
    syncTasksToDB(updatedTasks, userId);
    if (isClock(task.reminder)) syncReminder({ ...task, reminder: null });
    if (activeTask?.id === task.id) setActiveTask(null);
    setEditingTask(null);
    setEditModalField('none');
  };

  const toggleTaskComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const isCompleting = !task.completed;
    const completedAtTime = isCompleting ? new Date().toISOString() : null;
    handleUpdateTaskDetails(task.id, { completed: isCompleting, completedAt: completedAtTime });
  };

  // SWIPE TO ADJUST LOGIC
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragLastX, setDragLastX] = useState<number | null>(null);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isActive) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragStartX(clientX);
    setDragLastX(clientX);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartX === null || dragLastX === null || isActive) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - dragLastX;
    
    if (Math.abs(diff) > 15) { 
      const minutesToAdjust = diff > 0 ? 1 : -1;
      adjustTime(minutesToAdjust * 60);
      setDragLastX(clientX);
    }
  };

  const handleDragEnd = () => {
    setDragStartX(null);
    setDragLastX(null);
  };

  const svgSize = 340; const center = svgSize / 2; const radius = 128; const circumference = 2 * Math.PI * radius;
  const progress = initialDuration > 0 ? ((initialDuration - timeLeft) / initialDuration) * 100 : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (seconds: number) => n(formatClockTime(seconds));
  const formatClockTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatCompletedDate = (isoString?: string | null) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString(loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getPriorityColor = (level?: number) => {
    if (level === 3) return "text-red-500";
    if (level === 2) return "text-orange-500";
    if (level === 1) return "text-blue-500";
    return "text-slate-400";
  };

  const getPriorityLabel = (level?: number) => {
    if (level === 3) return t("বেশি জরুরি", "High Priority");
    if (level === 2) return t("মাঝারি জরুরি", "Medium Priority");
    if (level === 1) return t("কম জরুরি", "Low Priority");
    return t("গুরুত্ব", "Priority");
  };

  const currentMinutes = Math.ceil(timeLeft / 60);
  const dur = (min: number) => `${n(Math.floor(min / 60))}${t("ঘ", "h")} ${n(min % 60)}${t("মি", "m")}`;
  const repeatText = (v?: string | null) => ({ "": t("নেই", "None"), daily: t("প্রতিদিন", "Daily"), satthu: t("শনি–বৃহস্পতি", "Sat–Thu"), weekly: t("প্রতি সপ্তাহে", "Weekly") } as Record<string, string>)[repeatKey(v)];
  const openTasks = (title: string) => { setActiveList(title); setCurrentScreen('tasks'); };
  
  const activeTasksList = tasks.filter(t => !t.completed);
  const completedTasksList = tasks.filter(t => t.completed);
  const todayTasks = activeTasksList.filter(t => !t.list || t.list === "Today");
  const thisWeekTasks = activeTasksList.filter(t => t.list === "This Week");
  const plannedTasks = activeTasksList.filter(t => t.list === "Planned");

  const currentDisplayedActiveTasks = activeList === "Today" ? todayTasks : (activeList === "This Week" ? thisWeekTasks : (activeList === "Planned" ? plannedTasks : activeTasksList));
  const todayEstimatedTime = todayTasks.reduce((acc, curr) => acc + ((curr.estimatedPomodoros || 1) * 25), 0);

  const isInitialState = timeLeft === initialDuration && !isActive;
  const isPausedState = !isActive && timeLeft < initialDuration;

  const renderTaskItem = (task: Task) => (
    <div key={task.id} onClick={() => setEditingTask(task)} className={`flex items-start justify-between p-4 border rounded-2xl cursor-pointer group transition-colors shadow-sm dark:shadow-none ${task.completed ? 'bg-slate-100 dark:bg-[#2c2c2e]/60 border-slate-200 dark:border-white/5 opacity-60' : 'bg-white dark:bg-[#2c2c2e] border-slate-200 dark:border-white/5 hover:border-indigo-500/30'}`}>
      <div className="flex items-start gap-3 flex-1">
        <button onClick={(e) => toggleTaskComplete(task, e)} className={`mt-0.5 transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400'}`}>
          {task.completed ? <CheckCircle2 size={22} /> : <Circle size={22} strokeWidth={1.5} />}
        </button>
        <div className="flex-1">
          <h3 className={`text-sm font-medium transition-colors ${task.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</h3>
          <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-slate-500">
            <div className="flex gap-0.5 items-center mr-2"><span className="text-red-400 mr-1 text-xs">🍅 {n(task.completedPomodoros || 0)}/{n(task.estimatedPomodoros || 1)}</span></div>
            {!task.completed && task.priority && task.priority > 0 && (<span className="flex items-center"><Flag size={10} className={getPriorityColor(task.priority)} /></span>)}
            <span className="bg-slate-100 dark:bg-black/30 px-1.5 py-0.5 rounded text-[9px]">{task.category}</span>
            {task.completed && task.completedAt ? (
               <span className="flex items-center gap-1 text-emerald-500/80 ml-1"><CheckCircle2 size={10}/> {formatCompletedDate(task.completedAt)}</span>
            ) : (
               task.dueDate && <span className="flex items-center gap-1 text-slate-400 ml-1"><CalendarDays size={10}/> {listLabel(task.dueDate)}</span>
            )}
          </div>
        </div>
      </div>
      {!task.completed && (
        <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); setCurrentScreen('timer'); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors"><Play size={20} fill="currentColor" /></button>
      )}
    </div>
  );

  // হোম: বড় "পরের কাজ" কার্ড থেকে এক চাপে ফোকাস, আজকের হিসাব, আজকের কাজের ঝলক আর বাকি তালিকা
  const todayStartMs = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const doneToday = completedTasksList.filter(t => t.completedAt && Date.parse(t.completedAt) >= todayStartMs).length;
  const dayProgress = doneToday + todayTasks.length > 0 ? doneToday / (doneToday + todayTasks.length) : 0;
  const nextTask = activeTask && !activeTask.completed ? activeTask : todayTasks[0] || activeTasksList[0] || null;
  const timerRunning = isActive || isPausedState;
  const todayDate = new Date().toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });

  const startFocus = () => {
    if (!timerRunning && nextTask) setActiveTask(nextTask);
    setCurrentScreen('timer');
  };

  const listRow = (icon: React.ReactNode, tint: string, title: string, note: string, count: number, onClick: () => void) => (
    <button onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors active:bg-slate-100 dark:active:bg-white/5">
      <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${tint}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-[11px] text-slate-400 truncate">{note}</p>
      </div>
      <span className="text-sm font-extrabold text-slate-400 tabular-nums">{n(count)}</span>
      <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
    </button>
  );

  const renderHome = () => (
    <div className="w-full max-w-2xl mx-auto pb-44 px-5 pt-2 space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{todayDate}</p>
        <h1 className="text-[26px] leading-tight font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
          {greeting}{userName ? <>, <span className="text-indigo-600 dark:text-indigo-400">{userName}</span></> : ""}
        </h1>
      </div>

      {/* পরের কাজ */}
      <div className="relative rounded-[28px] p-5 text-white bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/25">
        {/* ঝাপসা আলো আলাদা ঘরে কেটে রাখি: Safari তে overflow-hidden এ blur গোল কোণের বাইরে চৌকো হয়ে দেখা যেত (ছায়াটা বাইরে থাকে) */}
        <div className="absolute inset-0 rounded-[28px] overflow-hidden [clip-path:inset(0_round_28px)] pointer-events-none">
          <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 w-44 h-44 rounded-full bg-violet-300/20 blur-2xl" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-white/15 px-2.5 py-1 rounded-full">
              {timerRunning ? (isActive ? t("ফোকাস চলছে", "Focusing now") : t("থেমে আছে", "Paused")) : t("পরের কাজ", "Up next")}
            </span>
            {nextTask && <span className="text-xs font-bold text-white/85">🍅 {n(nextTask.completedPomodoros || 0)}/{n(nextTask.estimatedPomodoros || 1)}</span>}
          </div>
          <h2 className="text-xl font-extrabold mt-3 leading-snug line-clamp-2">
            {nextTask ? nextTask.title : t("আজ কী পড়বে? একটা কাজ যোগ করো", "What will you study? Add a task")}
          </h2>
          <p className="text-[13px] text-white/75 mt-1">
            {nextTask ? `${nextTask.category} · ${dur((nextTask.estimatedPomodoros || 1) * 25)}` : t("অথবা কাজ ছাড়াই একটা ফোকাস সেশন চালাও", "Or just start a focus session")}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={startFocus} className="flex items-center gap-2 bg-white text-indigo-700 font-extrabold text-sm pl-4 pr-5 py-3 rounded-2xl shadow-lg shadow-indigo-900/20 hover:bg-indigo-50 active:scale-95 transition-all">
              <Play size={16} fill="currentColor" />
              {timerRunning ? `${t("টাইমারে ফিরে যাও", "Back to timer")} · ${formatTime(timeLeft)}` : t("ফোকাস শুরু করো", "Start focus")}
            </button>
            {!timerRunning && <span className="text-xs font-semibold text-white/70">{n(Math.round(initialDuration / 60))} {t("মিনিট", "min")}</span>}
          </div>
        </div>
      </div>

      {/* আজকের হিসাব */}
      <div className="bg-white dark:bg-[#1e293b]/60 border border-slate-200/80 dark:border-white/5 rounded-3xl p-4 shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5">
          {[[t("বাকি কাজ", "To do"), n(todayTasks.length)], [t("আনুমানিক", "Estimated"), dur(todayEstimatedTime)], [t("আজ শেষ", "Done today"), n(doneToday)]].map(([label, value]) => (
            <div key={label} className="text-center px-1">
              <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700" style={{ width: `${Math.round(dayProgress * 100)}%` }} />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">{t(`আজকের কাজের ${n(Math.round(dayProgress * 100))}% শেষ`, `${Math.round(dayProgress * 100)}% of today's tasks done`)}</p>
      </div>

      {/* আজকের কাজ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{t("আজকের কাজ", "Today")}</h3>
          {todayTasks.length > 0 && <button onClick={() => openTasks("Today")} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">{t("সব দেখো", "See all")} <ChevronRight size={14} /></button>}
        </div>
        <div className="relative mb-3">
          <Plus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={quickNewTaskTitle} onChange={(e) => setQuickNewTaskTitle(e.target.value)} onKeyDown={handleQuickAddTask}
            placeholder={t("নতুন কাজ লিখে Enter চাপো", "Type a task and press Enter")} enterKeyHint="done"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white dark:bg-[#1e293b]/60 border border-slate-200/80 dark:border-white/5 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-400 shadow-sm" />
        </div>
        <div className="space-y-2.5">
          {todayTasks.length === 0
            ? <p className="text-center text-sm text-slate-400 py-6">{t("আজকের জন্য কোনো কাজ নেই। উপরে লিখে যোগ করো।", "Nothing for today yet. Add one above.")}</p>
            : todayTasks.slice(0, 3).map(renderTaskItem)}
        </div>
      </div>

      {/* বাকি তালিকা */}
      <div className="bg-white dark:bg-[#1e293b]/60 border border-slate-200/80 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-white/5">
        {listRow(<Calendar size={18} />, "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400", t("এই সপ্তাহ", "This Week"), weekData.rangeStr, thisWeekTasks.length, () => openTasks("This Week"))}
        {listRow(<CalendarDays size={18} />, "bg-teal-50 text-teal-500 dark:bg-teal-500/10 dark:text-teal-400", t("পরিকল্পিত", "Planned"), t(`${weekData.endStr} এর পরে`, `After ${weekData.endStr}`), plannedTasks.length, () => openTasks("Planned"))}
        {listRow(<CheckCircle2 size={18} />, "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400", t("শেষ হয়েছে", "Completed"), t("যা শেষ করেছ", "Everything you finished"), completedTasksList.length, () => openTasks("Completed"))}
      </div>
    </div>
  );

  const renderTasksList = () => (
    <div className="w-full h-full overflow-y-auto pb-40 px-5 pt-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-8 mt-2 relative z-30">
        <button onClick={() => setCurrentScreen('home')} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ArrowLeft size={24} /></button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{listLabel(activeList)}</h1>
          {activeList === "This Week" && <span className="text-[10px] text-blue-500 font-medium">{weekData.rangeStr}</span>}
          {activeList === "Planned" && <span className="text-[10px] text-teal-500 font-medium">{t(`${weekData.endStr} এর পরে`, `After ${weekData.endStr}`)}</span>}
        </div>
        <div className="w-10" />
      </div>

      {activeList !== "Completed" && !isAddingTask && (
        <button onClick={openAddTaskModal} className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 mb-6 shadow-sm flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <Plus size={20} className="mr-3" />
          <span className="text-sm font-medium">{t(`${listLabel(activeList)} এ কাজ যোগ করো...`, `Add a task to ${activeList}...`)}</span>
        </button>
      )}

      <div className="space-y-3 pb-24 relative z-30">
        {activeList === "Completed" ? (
          completedTasksList.length === 0 ? <EmptyState icon={<CheckCircle2 size={26} />} title={t("এখনো কোনো কাজ শেষ হয়নি", "No completed tasks yet")} body={t("কাজ শেষ করে টিক দিলে এখানে আসবে।", "Tick a task when you finish it and it shows up here.")} /> : 
          <div className="space-y-3 mt-4">
            {(showAllCompletedTasks ? completedTasksList : completedTasksList.slice(0, 3)).map(renderTaskItem)}
            {completedTasksList.length > 3 && (
              <div className="flex justify-center pt-3 pb-6">
                <button onClick={() => setShowAllCompletedTasks(!showAllCompletedTasks)} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors">
                  {showAllCompletedTasks ? t("কম দেখাও ▴", "Show Less ▴") : t(`আরো দেখাও (${n(completedTasksList.length - 3)}) ▾`, `Show More (${completedTasksList.length - 3}) ▾`)}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {currentDisplayedActiveTasks.length === 0 ? <EmptyState icon={<Plus size={26} />} title={t("এখানে এখনো কোনো কাজ নেই", "Nothing here yet")} body={t("উপরে চেপে প্রথম কাজটা যোগ করো, তারপর টাইমার চালাও।", "Add your first task above, then start the timer.")} /> : currentDisplayedActiveTasks.map(renderTaskItem)}
            {completedTasksList.length > 0 && (
              <div className="flex justify-center pt-6 pb-2">
                <button onClick={() => setShowCompletedSection(!showCompletedSection)} className="bg-slate-200 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-bold px-5 py-2.5 rounded-full transition-colors hover:bg-slate-300 dark:hover:bg-slate-700">
                  {showCompletedSection ? t("শেষ করা কাজ লুকাও ▴", "Hide Completed Tasks ▴") : t(`শেষ করা কাজ দেখাও (${n(completedTasksList.length)}) ▾`, `Show Completed Tasks (${completedTasksList.length}) ▾`)}
                </button>
              </div>
            )}
            {showCompletedSection && (
              <div className="space-y-3 mt-4">
                {(showAllCompletedTasks ? completedTasksList : completedTasksList.slice(0, 3)).map(renderTaskItem)}
                {completedTasksList.length > 3 && (
                  <div className="flex justify-center pt-3 pb-6">
                    <button onClick={() => setShowAllCompletedTasks(!showAllCompletedTasks)} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors">
                      {showAllCompletedTasks ? t("কম দেখাও ▴", "Show Less ▴") : t(`আরো দেখাও (${n(completedTasksList.length - 3)}) ▾`, `Show More (${completedTasksList.length - 3}) ▾`)}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // টাইমারের পর্দা: প্রতিটা ধরনের নিজের রং (ফোকাস বেগুনি, ছোট বিরতি সবুজ, লম্বা বিরতি নীল)
  const MODE_STYLE: Record<TimerMode, { label: string; from: string; to: string; glow: string; text: string }> = {
    pomodoro: { label: t("ফোকাস", "Focus"), from: "#6366f1", to: "#a855f7", glow: "bg-indigo-500/25", text: "text-indigo-600 dark:text-indigo-300" },
    shortBreak: { label: t("ছোট বিরতি", "Short Break"), from: "#10b981", to: "#14b8a6", glow: "bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-300" },
    longBreak: { label: t("লম্বা বিরতি", "Long Break"), from: "#0ea5e9", to: "#6366f1", glow: "bg-sky-500/20", text: "text-sky-600 dark:text-sky-300" },
  };
  const ms = MODE_STYLE[mode];
  const longEvery = getSettings().longBreakInterval || 4;
  const doneInCycle = (activeTask?.completedPomodoros || 0) % longEvery;
  const endsAt = new Date(Date.now() + timeLeft * 1000).toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit', hour12: true });
  const knobAngle = (progress / 100) * 2 * Math.PI - Math.PI / 2;
  const statusText = isActive
    ? t(`শেষ হবে ${endsAt}`, `Ends at ${endsAt}`)
    : isPausedState ? t("থেমে আছে", "Paused") : t("শুরু করতে প্রস্তুত", "Ready when you are");

  const pickMode = (m: TimerMode) => { if (!isActive && !isPausedState && m !== mode) changeMode(m); };
  const skipBreak = () => changeMode('pomodoro');
  const closeTimer = () => setCurrentScreen('home');
  const roundBtn = "w-14 h-14 rounded-full flex items-center justify-center bg-white/80 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 active:scale-90 transition-all shadow-sm";

  const renderTimerScreen = () => (
    <div className="fixed inset-0 z-[60] flex flex-col items-center overflow-hidden bg-slate-50 dark:bg-[#0b1120] pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in fade-in zoom-in-95 duration-300">
      {/* পেছনের রঙিন আভা, ধরন অনুযায়ী */}
      <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${ms.glow} ${isActive ? 'opacity-100' : 'opacity-60'}`} />

      <div className="relative w-full max-w-md px-5 flex items-center justify-between gap-3">
        <button onClick={closeTimer} aria-label={t("ছোট করো", "Minimize")} className="p-2.5 rounded-full text-slate-500 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"><ChevronDown size={24} /></button>
        <button onClick={() => setShowTaskSelector(true)} className="min-w-0 flex-1 max-w-[240px] bg-white/80 dark:bg-white/[0.06] backdrop-blur-md border border-slate-200 dark:border-white/10 px-4 py-2.5 rounded-full flex items-center justify-center gap-2 text-slate-800 dark:text-white shadow-sm transition-colors">
          <span className={`w-2 h-2 shrink-0 rounded-full ${isActive ? 'animate-pulse' : 'opacity-50'}`} style={{ background: ms.from }} />
          <span className="text-[13px] font-semibold truncate">{activeTask ? activeTask.title : t("কাজ বাছাই করো", "Select a task")}</span>
          <ChevronDown size={14} className="shrink-0 text-slate-400" />
        </button>
        <button onClick={() => sheet.open('settings')} aria-label={t("টাইমারের সেটিংস", "Timer settings")} className="p-2.5 rounded-full text-slate-500 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"><Settings2 size={22} /></button>
      </div>

      {/* ফোকাস / ছোট বিরতি / লম্বা বিরতি: চলার সময় বদলানো যায় না */}
      <div className="relative mt-5 p-1 rounded-2xl bg-slate-200/60 dark:bg-white/[0.05] flex gap-1">
        {(Object.keys(MODE_STYLE) as TimerMode[]).map((m) => {
          const locked = (isActive || isPausedState) && m !== mode;
          return (
            <button key={m} onClick={() => pickMode(m)} disabled={locked}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${m === mode ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'} ${locked ? 'opacity-40' : ''}`}>
              {MODE_STYLE[m].label}
            </button>
          );
        })}
      </div>

      <div
        className={`relative my-auto w-[min(80vw,340px)] aspect-square select-none touch-pan-y ${isInitialState ? 'cursor-ew-resize' : ''}`}
        onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
      >
        <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible">
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={ms.from} />
              <stop offset="100%" stopColor={ms.to} />
            </linearGradient>
          </defs>
          {/* ঘড়ির দাগ: প্রতি ৫ টায় একটা লম্বা */}
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * 2 * Math.PI, long = i % 5 === 0;
            const r1 = radius + 16, r2 = radius + (long ? 24 : 20);
            return <line key={i} x1={center + r1 * Math.cos(a)} y1={center + r1 * Math.sin(a)} x2={center + r2 * Math.cos(a)} y2={center + r2 * Math.sin(a)}
              stroke="currentColor" strokeWidth={long ? 2 : 1} strokeLinecap="round"
              className={i / 60 < progress / 100 ? '' : 'text-slate-300 dark:text-white/10'} style={i / 60 < progress / 100 ? { color: ms.from } : undefined} />;
          })}
          <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200/80 dark:text-white/[0.06]" />
          <circle cx={center} cy={center} r={radius} stroke="url(#ring-grad)" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-300 ease-linear" style={{ filter: isActive ? `drop-shadow(0 0 10px ${ms.from}66)` : undefined }} />
          {progress > 0 && <circle cx={center + radius * Math.cos(knobAngle + Math.PI / 2)} cy={center + radius * Math.sin(knobAngle + Math.PI / 2)} r="9" fill="white" stroke={ms.to} strokeWidth="4" />}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-[11px] font-extrabold uppercase tracking-[0.3em] ${ms.text}`}>{ms.label}</span>
          <span className="mt-1 text-[clamp(3.6rem,18vw,5.2rem)] leading-none font-light tracking-tight tabular-nums text-slate-900 dark:text-white">{formatTime(timeLeft)}</span>
          <span className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{statusText}</span>
          {activeTask && mode === 'pomodoro' && (
            <div className="mt-3 flex gap-1.5" aria-label={t("লম্বা বিরতির আগে সেশন", "Sessions before long break")}>
              {Array.from({ length: longEvery }).map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i < doneInCycle ? 'w-4' : i === doneInCycle && isActive ? 'w-4 animate-pulse' : 'w-1.5 bg-slate-300 dark:bg-white/15'}`}
                  style={i < doneInCycle || (i === doneInCycle && isActive) ? { background: ms.from, opacity: i < doneInCycle ? 1 : 0.5 } : undefined} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* শুরুর আগে সময় কমানো/বাড়ানো (রিংয়ে আঙুল সরিয়েও হয়) */}
      <div className={`relative flex items-center gap-3 mb-6 transition-opacity ${isInitialState ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={() => adjustTime(-5 * 60)} className="px-4 py-2 rounded-full text-sm font-bold bg-white/80 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 active:scale-95 transition-all">−{n(5)}</button>
        <span className="text-[11px] font-medium text-slate-400">{t("মিনিট বদলাও", "Adjust minutes")}</span>
        <button onClick={() => adjustTime(5 * 60)} className="px-4 py-2 rounded-full text-sm font-bold bg-white/80 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 active:scale-95 transition-all">+{n(5)}</button>
      </div>

      <div className="relative w-full max-w-xs flex items-center justify-between px-4">
        {isActive || isPausedState
          ? <button onClick={() => setShowStopModal(true)} aria-label={t("বন্ধ করো", "Stop")} className={roundBtn}><Square size={18} fill="currentColor" /></button>
          : <button onClick={closeTimer} aria-label={t("বন্ধ করো", "Close")} className={roundBtn}><X size={20} /></button>}

        <button onClick={startOrPause} aria-label={isActive ? t("থামাও", "Pause") : t("শুরু করো", "Start")}
          className="relative w-20 h-20 rounded-full flex items-center justify-center text-white active:scale-90 hover:scale-105 transition-transform"
          style={{ background: `linear-gradient(135deg, ${ms.from}, ${ms.to})`, boxShadow: `0 14px 34px -10px ${ms.from}` }}>
          {isActive && <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: ms.from }} />}
          {isActive ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
        </button>

        {mode !== 'pomodoro'
          ? <button onClick={skipBreak} aria-label={t("বিরতি বাদ দাও", "Skip break")} className={roundBtn}><SkipForward size={20} /></button>
          : <button onClick={() => setShowTaskSelector(true)} aria-label={t("কাজ বাছাই করো", "Select a task")} className={roundBtn}><ListTodo size={20} /></button>}
      </div>
      <p className="relative mt-3 h-4 text-[11px] font-semibold text-slate-400">
        {isInitialState ? (mode === 'pomodoro' ? t("শুরু চাপো, ফোন সরিয়ে রাখো", "Press start and put your phone away") : t("একটু হাঁটো, পানি খাও", "Stretch and drink some water")) : isPausedState ? t("চালিয়ে যেতে চাপো", "Tap to continue") : ""}
      </p>
    </div>
  );

  const renderModals = () => (
    <>
      {isAddingTask && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setIsAddingTask(false)} />
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-300 relative z-10 border border-slate-200 dark:border-white/5">
            <div className="flex justify-between items-center mb-5 ml-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("নতুন কাজ", "Create New Task")}</h3>
              <button onClick={() => setIsAddingTask(false)} className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#2c2c2e] p-3.5 rounded-xl border border-slate-200 dark:border-white/5 mb-4">
              <Circle size={20} className="text-slate-400 shrink-0" />
              <input autoFocus type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitNewTask()} placeholder={t("কী পড়বে?", "What are you working on?")} className="w-full bg-transparent outline-none text-base font-medium text-slate-900 dark:text-white placeholder-slate-400" />
            </div>

            <div className="flex flex-wrap gap-2 mb-4 px-1">
              <span className="text-[10px] font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-md flex items-center gap-1">🍅 {n(estimatedPomos)}</span>
              {addDate !== "Today" && <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md">{listLabel(addDate)}</span>}
              {addPriority > 0 && <span className={`text-[10px] font-bold bg-slate-100 dark:bg-[#3a3a3c] px-2 py-1 rounded-md ${getPriorityColor(addPriority)}`}>{getPriorityLabel(addPriority)}</span>}
              {addCategory !== "HSC" && <span className="text-[10px] font-bold bg-slate-100 dark:bg-[#3a3a3c] text-slate-400 px-2 py-1 rounded-md">{addCategory}</span>}
            </div>

            <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-4 h-24 mb-5 border border-slate-100 dark:border-white/5 flex items-center justify-center">
              {addTab === 'pomo' && (
                <div className="w-full animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">{t("কয়টা পোমোডোরো লাগবে", "Estimated Pomodoros")}</p>
                  <div className="flex justify-center gap-2 overflow-x-auto scrollbar-hide px-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <button key={num} onClick={() => setEstimatedPomos(num)} className={`shrink-0 w-10 h-10 rounded-full font-bold text-sm transition-all ${estimatedPomos === num ? 'bg-red-500 text-white shadow-md' : 'bg-white dark:bg-[#3a3a3c] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5'}`}>{n(num)}</button>
                    ))}
                  </div>
                </div>
              )}
              {addTab === 'date' && (
                <div className="w-full flex justify-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                  {["Today", "Tomorrow", "This Week", "Planned"].map(option => (
                    <button key={option} onClick={() => setAddDate(option)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${addDate === option ? 'bg-indigo-500 text-white shadow-md' : 'bg-white dark:bg-[#3a3a3c] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5'}`}>{listLabel(option)}</button>
                  ))}
                </div>
              )}
              {addTab === 'priority' && (
                <div className="w-full flex justify-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                  <button onClick={() => setAddPriority(3)} className={`p-3 rounded-xl transition-all ${addPriority===3 ? 'bg-red-500 text-white shadow-md':'bg-white dark:bg-[#3a3a3c] text-red-500 border border-slate-200 dark:border-white/5'}`}><Flag size={18}/></button>
                  <button onClick={() => setAddPriority(2)} className={`p-3 rounded-xl transition-all ${addPriority===2 ? 'bg-orange-500 text-white shadow-md':'bg-white dark:bg-[#3a3a3c] text-orange-500 border border-slate-200 dark:border-white/5'}`}><Flag size={18}/></button>
                  <button onClick={() => setAddPriority(1)} className={`p-3 rounded-xl transition-all ${addPriority===1 ? 'bg-blue-500 text-white shadow-md':'bg-white dark:bg-[#3a3a3c] text-blue-500 border border-slate-200 dark:border-white/5'}`}><Flag size={18}/></button>
                  <button onClick={() => setAddPriority(0)} className={`p-3 rounded-xl transition-all ${addPriority===0 ? 'bg-slate-500 text-white shadow-md':'bg-white dark:bg-[#3a3a3c] text-slate-400 border border-slate-200 dark:border-white/5'}`}><X size={18}/></button>
                </div>
              )}
              {addTab === 'tag' && (
                <div className="w-full flex justify-center gap-2 flex-wrap animate-in fade-in zoom-in-95 duration-200">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setAddCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${addCategory === cat ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-[#3a3a3c] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5'}`}>{cat}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => setAddTab('pomo')} className={`p-3 rounded-xl transition-colors ${addTab === 'pomo' ? 'bg-red-50 dark:bg-red-500/20 text-red-500' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]'}`}><Circle size={20}/></button>
                <button onClick={() => setAddTab('date')} className={`p-3 rounded-xl transition-colors ${addTab === 'date' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]'}`}><Calendar size={20}/></button>
                <button onClick={() => setAddTab('priority')} className={`p-3 rounded-xl transition-colors ${addTab === 'priority' ? 'bg-slate-100 dark:bg-[#3a3a3c] text-slate-900 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]'}`}><Flag size={20}/></button>
                <button onClick={() => setAddTab('tag')} className={`p-3 rounded-xl transition-colors ${addTab === 'tag' ? 'bg-slate-100 dark:bg-[#3a3a3c] text-slate-900 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]'}`}><Tag size={20}/></button>
              </div>
              <button onClick={submitNewTask} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-500/30 font-bold text-sm transition-transform active:scale-95 flex items-center gap-2">
                {t("রাখো", "Save Task")} <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (() => {
        const et = editingTask;
        const focusLen = getSettings().pomodoroLength || 25;
        const est = et.estimatedPomodoros || 1;
        const done = et.completedPomodoros || 0;
        const row = (field: typeof editModalField, icon: React.ReactNode, tint: string, title: string, hint: string, value: string, on: boolean) => (
          <button onClick={() => setEditModalField(prev => prev === field ? 'none' : field)} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
            <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${tint}`}>{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
              <p className="text-[11px] text-slate-400 truncate">{hint}</p>
            </div>
            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ${on ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'text-slate-400'}`}>{value}</span>
            <ChevronDown size={16} className={`shrink-0 text-slate-300 dark:text-slate-600 transition-transform ${editModalField === field ? 'rotate-180' : ''}`} />
          </button>
        );
        const chip = (on: boolean) => `shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${on ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'}`;
        return (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 md:p-6">
          <div className="fixed inset-0" onClick={closeTaskEditor} />
          <div className="relative z-10 w-full md:max-w-lg h-[90dvh] md:h-auto md:max-h-[88vh] flex flex-col bg-white dark:bg-[#161b26] rounded-t-[28px] md:rounded-[28px] shadow-2xl border-t md:border border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom md:zoom-in-95 duration-300 pb-[env(safe-area-inset-bottom)]">
            <div className="md:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/15" />

            {/* নাম আর শেষ করার টিক */}
            <div className="flex items-start gap-3 px-5 pt-4 pb-3">
              <button onClick={(e) => toggleTaskComplete(et, e)} aria-label={et.completed ? t("আবার চালু করো", "Mark as not done") : t("শেষ হয়েছে", "Mark as done")}
                className={`mt-1 shrink-0 transition-colors ${et.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'}`}>
                {et.completed ? <CheckCircle2 size={26} /> : <Circle size={26} strokeWidth={1.5} />}
              </button>
              <div className="flex-1 min-w-0">
                <input type="text" value={et.title} maxLength={200} placeholder={t("কী পড়বে?", "What will you study?")}
                  onChange={(e) => handleUpdateTaskDetails(et.id, { title: e.target.value }, true)}
                  className={`w-full text-xl font-extrabold bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 ${et.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`} />
                <p className="text-xs text-slate-400 mt-0.5">
                  {et.completed && et.completedAt ? t(`✅ শেষ করেছ ${formatCompletedDate(et.completedAt)}`, `✅ Done ${formatCompletedDate(et.completedAt)}`) : t("নামে চাপ দিয়ে বদলানো যায়", "Tap the name to edit it")}
                </p>
              </div>
              <button onClick={closeTaskEditor} aria-label={t("বন্ধ করো", "Close")} className="shrink-0 p-2.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-4 scrollbar-hide">
              {/* কয়টা পোমোডোরো */}
              <div className="rounded-2xl p-4 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/5 border border-rose-100 dark:border-rose-500/15">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500/80">{t("ফোকাস সেশন", "Focus sessions")}</p>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">🍅 {n(done)}<span className="text-slate-400 font-bold text-lg"> / {n(est)}</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t(`আনুমানিক ${dur(est * focusLen)} · প্রতিটা ${n(focusLen)} মিনিট`, `About ${dur(est * focusLen)} · ${focusLen} min each`)}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-black/20 rounded-xl p-1 border border-rose-100 dark:border-white/10">
                    <button onClick={() => handleUpdateTaskDetails(et.id, { estimatedPomodoros: Math.max(1, est - 1) })} disabled={est <= 1} aria-label={t("কমাও", "Fewer")} className="w-9 h-9 rounded-lg text-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-white/10 disabled:opacity-30">−</button>
                    <span className="w-7 text-center font-extrabold text-slate-900 dark:text-white tabular-nums">{n(est)}</span>
                    <button onClick={() => handleUpdateTaskDetails(et.id, { estimatedPomodoros: Math.min(20, est + 1) })} disabled={est >= 20} aria-label={t("বাড়াও", "More")} className="w-9 h-9 rounded-lg text-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-white/10 disabled:opacity-30">+</button>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-rose-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-400 transition-all duration-500" style={{ width: `${Math.min(100, Math.round((done / est) * 100))}%` }} />
                </div>
              </div>

              {/* বিষয় আর কতটা জরুরি */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setEditModalField(prev => prev === 'category' ? 'none' : 'category')} className={`text-left p-3.5 rounded-2xl border transition-colors ${editModalField === 'category' ? 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.03]'}`}>
                  <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Tag size={12} /> {t("বিষয়", "Subject")}</p>
                  <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-300 mt-1 truncate">{et.category || t("বাছাই করো", "Choose")}</p>
                </button>
                <button onClick={() => setEditModalField(prev => prev === 'priority' ? 'none' : 'priority')} className={`text-left p-3.5 rounded-2xl border transition-colors ${editModalField === 'priority' ? 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.03]'}`}>
                  <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Flag size={12} /> {t("কতটা জরুরি", "How urgent")}</p>
                  <p className={`text-sm font-extrabold mt-1 truncate ${et.priority ? getPriorityColor(et.priority) : 'text-slate-500 dark:text-slate-300'}`}>{et.priority ? getPriorityLabel(et.priority) : t("ঠিক করা নেই", "Not set")}</p>
                </button>
              </div>
              {editModalField === 'category' && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { handleUpdateTaskDetails(et.id, { category: cat }); setEditModalField('none'); }} className={chip(et.category === cat)}>{cat}</button>
                  ))}
                </div>
              )}
              {editModalField === 'priority' && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                  {([[3, t("🔴 খুব জরুরি", "🔴 High")], [2, t("🟠 মাঝারি", "🟠 Medium")], [1, t("🔵 পরে করলেও চলে", "🔵 Low")], [0, t("নেই", "None")]] as const).map(([lvl, label]) => (
                    <button key={lvl} onClick={() => { handleUpdateTaskDetails(et.id, { priority: lvl }); setEditModalField('none'); }} className={chip((et.priority || 0) === lvl)}>{label}</button>
                  ))}
                </div>
              )}

              {/* কবে, মনে করানো, বারবার */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
                <div>
                  {row('dueDate', <CalendarDays size={18} />, "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400",
                    t("কবে করবে", "When"), t("আজ, কাল, এই সপ্তাহ বা পরে", "Today, tomorrow, this week or later"),
                    listLabel(et.dueDate || "Today"), Boolean(et.dueDate && et.dueDate !== "None"))}
                  {editModalField === 'dueDate' && (
                    <div className="px-4 pb-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                      {["Today", "Tomorrow", "This Week", "Planned", "None"].map(opt => (
                        <button key={opt} onClick={() => { handleUpdateTaskDetails(et.id, { dueDate: opt === "None" ? null : opt, list: opt === "None" || opt === "Tomorrow" ? (opt === "Tomorrow" ? "Planned" : "Today") : opt }); setEditModalField('none'); }}
                          className={chip(et.dueDate === opt || (!et.dueDate && opt === "Today"))}>{listLabel(opt)}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  {row('reminder', <Bell size={18} />, "bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400",
                    t("মনে করিয়ে দাও", "Remind me"), botLinked ? t("ঠিক সময়ে Telegram এ মাছরাঙা বট জানাবে", "The Machranga bot pings you on Telegram") : t("আগে মাছরাঙা বট যুক্ত করতে হবে", "Link the Machranga bot first"),
                    isClock(et.reminder) ? n(formatClock(et.reminder)) : t("বন্ধ", "Off"), isClock(et.reminder))}
                  {editModalField === 'reminder' && (
                    <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                      {botLinked ? (
                        <>
                          <div className="flex gap-2 items-center">
                            <input type="time" defaultValue={isClock(et.reminder) ? et.reminder : ""}
                              onChange={(e) => { if (isClock(e.target.value)) handleUpdateTaskDetails(et.id, { reminder: e.target.value }); }}
                              className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400/50" />
                            {isClock(et.reminder) && (
                              <button onClick={() => { handleUpdateTaskDetails(et.id, { reminder: null }); setEditModalField('none'); }} className="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-500">{t("বন্ধ করো", "Turn off")}</button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{et.dueDate === "Tomorrow" ? t("কাল এই সময়ে Telegram এ মেসেজ যাবে, অ্যাপ বন্ধ থাকলেও।", "You'll get a Telegram message at this time tomorrow, even if the app is closed.") : t("এই সময়ে Telegram এ মেসেজ যাবে, অ্যাপ বন্ধ থাকলেও।", "You'll get a Telegram message at this time, even if the app is closed.")}</p>
                        </>
                      ) : (
                        <button onClick={() => { closeTaskEditor(); sheet.open('profile'); }} className="w-full text-left p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs font-semibold">
                          <Send size={14} className="inline mr-1.5 -mt-0.5" /> {t("এক চাপে বট যুক্ত করো, তারপর রিমাইন্ডার Telegram এ আসবে →", "Link the bot in one tap, then reminders arrive on Telegram →")}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  {row('repeat', <Repeat size={18} />, "bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400",
                    t("বারবার আসবে", "Repeat"), t("রোজের পড়া একবার লিখলেই চলবে", "Write a daily routine once"),
                    repeatText(et.repeat), Boolean(repeatKey(et.repeat)))}
                  {editModalField === 'repeat' && (
                    <div className="px-4 pb-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                      <div className="flex flex-wrap gap-2">
                        {REPEATS.map(([key]) => (
                          <button key={key} onClick={() => { handleUpdateTaskDetails(et.id, { repeat: key || null }); setEditModalField('none'); }} className={chip(repeatKey(et.repeat) === key)}>{repeatText(key)}</button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400">{t("শেষ করলে নিয়মের পরের দিনে কাজটা নিজেই আবার ফিরে আসবে।", "Once done, it comes back by itself on its next day.")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* নোট */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 ml-1">{t("নোট", "Notes")}</p>
                <textarea value={et.notes || ""} maxLength={2000}
                  placeholder={t("কোন অধ্যায়, কোন পৃষ্ঠা, কী মনে রাখতে হবে...", "Chapter, pages, anything to remember...")}
                  onChange={(e) => handleUpdateTaskDetails(et.id, { notes: e.target.value }, true)}
                  className="w-full h-28 resize-none rounded-2xl p-4 text-sm bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-300 dark:focus:border-indigo-500/40 transition-colors" />
              </div>
            </div>

            {/* নিচে: মুছে ফেলা আর এই কাজে ফোকাস */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-t border-slate-100 dark:border-white/5">
              <button onClick={() => (confirmDelete ? deleteTask(et) : setConfirmDelete(true))}
                className={`shrink-0 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${confirmDelete ? 'px-4 bg-red-500 text-white' : 'w-12 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20'}`}
                aria-label={t("কাজটা মুছে ফেলো", "Delete task")}>
                <Trash2 size={18} />{confirmDelete && t("আবার চাপো, মুছে যাবে", "Tap again to delete")}
              </button>
              {!confirmDelete && (et.completed ? (
                <button onClick={(e) => toggleTaskComplete(et, e)} className="flex-1 h-12 rounded-2xl font-bold text-sm bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-colors">{t("আবার চালু করো", "Reopen task")}</button>
              ) : (
                <button onClick={() => { setActiveTask(et); closeTaskEditor(); setCurrentScreen('timer'); }} className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-extrabold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-transform">
                  <Play size={16} fill="currentColor" /> {t("এই কাজে ফোকাস শুরু করো", "Start focusing on this")}
                </button>
              ))}
            </div>
          </div>
        </div>
        );
      })()}

      {showTaskSelector && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[calc(6rem+env(safe-area-inset-top))] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 px-5">
          <div className="fixed inset-0" onClick={() => setShowTaskSelector(false)} />
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 dark:border-white/10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[60vh] relative z-10">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white ml-1">{t("কাজ বাছাই করো", "Select Task")}</h3>
              <button onClick={() => setShowTaskSelector(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10 transition-colors rounded-full"><X size={18} /></button>
            </div>
            <div className="relative mb-4 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Plus size={18} className="text-slate-500 dark:text-slate-400" /></div>
              <input type="text" value={quickNewTaskTitle} onChange={(e) => setQuickNewTaskTitle(e.target.value)} onKeyDown={handleQuickAddTask} placeholder={t("নতুন কাজ লিখে Enter চাপো...", "Type new task & press Enter...")} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-slate-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all" />
            </div>
            <div className="overflow-y-auto space-y-2 pr-1 scrollbar-hide flex-1">
              <button onClick={() => { setActiveTask(null); localStorage.setItem('pomodoro_active_task', 'none'); setShowTaskSelector(false); }} className={`w-full flex items-center gap-3 p-3 border rounded-xl transition-colors text-left ${!activeTask ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600' : 'bg-white border-slate-100 hover:bg-slate-50 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10'}`}>
                <div className="w-2.5 h-2.5 rounded-full border border-slate-400" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("কাজ ছাড়াই ফোকাস", "Focus without a task")}</span>
              </button>
              {activeTasksList.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">{t("এখনো কোনো কাজ নেই।", "No tasks available.")}</p>
              ) : (
                activeTasksList.map(task => (
                  <button key={task.id} onClick={() => { setActiveTask(task); setShowTaskSelector(false); }} className={`w-full flex items-center gap-3 p-3 border rounded-xl transition-colors text-left ${activeTask?.id === task.id ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600' : 'bg-white border-slate-100 hover:bg-slate-50 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-400'}`} />
                    <div className="flex-1 truncate"><h4 className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</h4></div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showStopModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm px-5">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-6">{mode === 'pomodoro' ? t("ফোকাস সেশন বন্ধ করবে?", "Stop this focus session?") : t("বিরতি বন্ধ করবে?", "End this break?")}</h3>
            {mode === 'pomodoro' && <p className="-mt-4 mb-6 text-center text-xs text-slate-500">{t("১ মিনিটের বেশি পড়ে থাকলে সেটুকু হিসাবে থাকবে।", "If you focused for over a minute, that time is still counted.")}</p>}
            <div className="flex items-center gap-3">
              <button onClick={() => setShowStopModal(false)} className="flex-1 py-3.5 rounded-xl text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 font-medium">{t("না", "Cancel")}</button>
              <button onClick={confirmStopTimer} className="flex-1 py-3.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20">{t("বন্ধ করো", "Stop")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="w-full bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 min-h-[100dvh] relative overflow-hidden">
      
      {currentScreen === 'home' && renderHome()}
      {currentScreen === 'tasks' && renderTasksList()}
      {currentScreen === 'timer' && renderTimerScreen()}

      {!editingTask && !isAddingTask && currentScreen === 'tasks' && !showTaskSelector && !showStopModal && (
        <div className="fixed bottom-[calc(7.2rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center z-40 pointer-events-none">
          <div className="relative pointer-events-auto group">
            {isActive && (
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 blur-lg animate-pulse duration-[2000ms]"></div>
            )}
            <button 
              onClick={() => setCurrentScreen('timer')} 
              className={`relative w-[68px] h-[68px] rounded-full flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl backdrop-blur-xl ${
                isActive 
                  ? 'bg-gradient-to-br from-indigo-500/90 to-purple-600/90 border border-white/30 text-white' 
                  : 'bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-100'
              }`}
            >
              <span className="text-xl font-bold tracking-tight tabular-nums mt-0.5">
                {n(currentMinutes)}
              </span>
              <span className={`text-[9px] uppercase tracking-widest font-bold -mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {isActive ? t("ফোকাস", "Focus") : t("মিনিট", "Min")}
              </span>
            </button>
          </div>
        </div>
      )}

      {renderModals()}
      
    </div>
  );
}