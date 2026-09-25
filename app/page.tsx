// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, X, ChevronDown, ArrowLeft, 
  Sun, Calendar, CalendarDays, CheckCircle2, 
  Plus, MoreVertical, Circle, Clock, Flag, Tag, Repeat, Bell
} from "lucide-react";
import { useTimer, MODES } from "@/hooks/useTimer";
// Firebase Imports
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy, addDoc } from "firebase/firestore";

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

export default function PomodoroPage() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'tasks' | 'timer'>('home');
  const [activeList, setActiveList] = useState("Today");
  const [showStopModal, setShowStopModal] = useState(false);
  
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [quickNewTaskTitle, setQuickNewTaskTitle] = useState("");
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editModalField, setEditModalField] = useState<'none' | 'category' | 'priority' | 'dueDate' | 'reminder' | 'repeat'>('none');
  
  const [showCompletedSection, setShowCompletedSection] = useState(false); 
  const [showAllCompletedTasks, setShowAllCompletedTasks] = useState(false);
  
  // Add Task States
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [estimatedPomos, setEstimatedPomos] = useState(1);
  const [addDate, setAddDate] = useState("Today");
  const [addPriority, setAddPriority] = useState(0); 
  const [addCategory, setAddCategory] = useState("HSC");
  const [activePopup, setActivePopup] = useState<'none' | 'date' | 'priority' | 'tag'>('none');
  
  const { mode, timeLeft, isActive, toggleTimer, resetTimer } = useTimer("pomodoro");
  const [activeCategory, setActiveCategory] = useState("HSC"); 

  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const sessionState = useRef({ timeLeft, isActive, activeTask, mode, activeCategory });
  
  useEffect(() => {
    sessionState.current = { timeLeft, isActive, activeTask, mode, activeCategory };
  }, [timeLeft, isActive, activeTask, mode, activeCategory]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        const tasksRef = collection(db, 'users', user.uid, 'tasks');
        const q = query(tasksRef, orderBy('createdAt', 'desc'));
        
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const fetchedTasks: Task[] = [];
          snapshot.forEach((doc) => { fetchedTasks.push({ id: doc.id, ...doc.data() } as Task); });
          setTasks(fetchedTasks);
          if (fetchedTasks.length > 0 && !activeTask) setActiveTask(fetchedTasks[0]);
        });
        return () => unsubscribeSnapshot();
      } else {
        setUserId(null); setTasks([]); 
      }
    });
    return () => unsubscribeAuth();
  }, [activeTask]);

  const saveFocusSession = async (finalTimeLeft: number, isCompleted: boolean) => {
    if (!userId) return;
    const timeSpentInSeconds = MODES[mode] - finalTimeLeft;
    if (timeSpentInSeconds >= 60) {
      try {
        await addDoc(collection(db, 'users', userId, 'sessions'), {
          taskId: activeTask?.id || null,
          taskTitle: activeTask?.title || "Focus Session",
          category: activeTask?.category || activeCategory,
          duration: Math.round(timeSpentInSeconds / 60),
          mode: mode, completed: isCompleted, timestamp: new Date().toISOString()
        });

        if (isCompleted && activeTask && mode === 'pomodoro') {
          const newCompletedCount = (activeTask.completedPomodoros || 0) + 1;
          await updateDoc(doc(db, 'users', userId, 'tasks', activeTask.id), { completedPomodoros: newCompletedCount });
          setActiveTask({...activeTask, completedPomodoros: newCompletedCount});
        }
      } catch (error) { console.error("Error saving session: ", error); }
    }
  };

  useEffect(() => { if (timeLeft === 0 && userId) saveFocusSession(0, true); }, [timeLeft, userId]);

  useEffect(() => {
    const handleAppClose = () => {
      const { timeLeft, isActive, mode } = sessionState.current;
      if (isActive || timeLeft < MODES[mode]) saveFocusSession(timeLeft, false);
    };
    window.addEventListener('beforeunload', handleAppClose);
    window.addEventListener('pagehide', handleAppClose);
    return () => { window.removeEventListener('beforeunload', handleAppClose); window.removeEventListener('pagehide', handleAppClose); };
  }, [userId]);

  // ✅ Fixed the missing function here!
  const confirmStopTimer = () => {
    if (isActive || timeLeft < MODES[mode]) {
      saveFocusSession(timeLeft, false);
    }
    resetTimer();
    setShowStopModal(false);
    setCurrentScreen('home');
  };

  const handleAddTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim() !== '') {
      const targetList = addDate === "Today" ? "Today" : (addDate === "This Week" ? "This Week" : "Planned");
      const newId = Date.now().toString();
      
      const rawTask: Task = {
        id: newId,
        title: newTaskTitle,
        category: addCategory, 
        duration: 25,
        completed: false,
        estimatedPomodoros: estimatedPomos,
        completedPomodoros: 0,
        createdAt: new Date().toISOString(),
        completedAt: null,
        list: targetList,
        dueDate: addDate !== "None" ? addDate : null,
        priority: addPriority,
        reminder: null,
        repeat: null,
        notes: null
      };

      const safeTask = JSON.parse(JSON.stringify(rawTask));
      
      setTasks([safeTask, ...tasks]);
      setNewTaskTitle(""); setEstimatedPomos(1); setAddDate("Today"); setAddPriority(0); setActivePopup('none');

      if (userId) {
        try { 
          await setDoc(doc(db, 'users', userId, 'tasks', newId), safeTask); 
        } 
        catch (error) { console.error("Error adding task: ", error); }
      }
    }
  };

  const handleQuickAddTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickNewTaskTitle.trim() !== '') {
      const newId = Date.now().toString();
      const rawTask: Task = {
        id: newId, title: quickNewTaskTitle, category: activeCategory, duration: 25, completed: false,
        estimatedPomodoros: 1, completedPomodoros: 0, createdAt: new Date().toISOString(), completedAt: null, 
        list: "Today", priority: 0, dueDate: null, reminder: null, repeat: null, notes: null
      };
      
      const safeTask = JSON.parse(JSON.stringify(rawTask));
      setTasks([safeTask, ...tasks]); setActiveTask(safeTask); setQuickNewTaskTitle(""); setShowTaskSelector(false); 
      
      if (userId) {
        try { await setDoc(doc(db, 'users', userId, 'tasks', newId), safeTask); } 
        catch (error) { console.error(error); }
      }
    }
  };

  const handleUpdateTaskDetails = async (taskId: string, updates: Partial<Task>) => {
    if (!userId) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    if (editingTask && editingTask.id === taskId) {
      setEditingTask(prev => prev ? { ...prev, ...updates } : null);
    }
    if (activeTask && activeTask.id === taskId) {
      setActiveTask(prev => prev ? { ...prev, ...updates } : null);
    }

    try { 
      const safeUpdates = JSON.parse(JSON.stringify(updates));
      await updateDoc(doc(db, 'users', userId, 'tasks', taskId), safeUpdates); 
    } 
    catch (error) { console.error("Error updating task details: ", error); }
  };

  const toggleTaskComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const isCompleting = !task.completed;
    const completedAtTime = isCompleting ? new Date().toISOString() : null;
    handleUpdateTaskDetails(task.id, { completed: isCompleting, completedAt: completedAtTime });
  };

  const svgSize = 420; const center = svgSize / 2; const radius = 145; const circumference = 2 * Math.PI * radius;
  const progress = ((MODES[mode] - timeLeft) / MODES[mode]) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatCompletedDate = (isoString?: string | null) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const currentMinutes = Math.ceil(timeLeft / 60);
  const openTasks = (title: string) => { setActiveList(title); setCurrentScreen('tasks'); };
  
  const activeTasksList = tasks.filter(t => !t.completed);
  const completedTasksList = tasks.filter(t => t.completed);
  const todayTasks = activeTasksList.filter(t => !t.list || t.list === "Today");
  const thisWeekTasks = activeTasksList.filter(t => t.list === "This Week");
  const plannedTasks = activeTasksList.filter(t => t.list === "Planned");

  const getCurrentActiveTasks = () => {
    if (activeList === "Today") return todayTasks;
    if (activeList === "This Week") return thisWeekTasks;
    if (activeList === "Planned") return plannedTasks;
    return activeTasksList; 
  };

  const currentDisplayedActiveTasks = getCurrentActiveTasks();
  const todayEstimatedTime = todayTasks.reduce((acc, curr) => acc + ((curr.estimatedPomodoros || 1) * 25), 0);
  const totalElapsedPomodoros = tasks.reduce((acc, curr) => acc + (curr.completedPomodoros || 0), 0);

  const isInitialState = timeLeft === MODES[mode] && !isActive;
  const isPausedState = !isActive && timeLeft < MODES[mode];

  const getPriorityColor = (level?: number) => {
    if (level === 3) return "text-red-500";
    if (level === 2) return "text-orange-500";
    if (level === 1) return "text-blue-500";
    return "text-slate-400";
  };

  const getPriorityLabel = (level?: number) => {
    if (level === 3) return "High Priority";
    if (level === 2) return "Medium Priority";
    if (level === 1) return "Low Priority";
    return "Priority";
  };

  const renderTaskItem = (task: Task) => (
    <div key={task.id} onClick={() => setEditingTask(task)} className={`flex items-start justify-between p-4 border rounded-2xl cursor-pointer group transition-colors shadow-sm dark:shadow-none ${task.completed ? 'bg-slate-100 dark:bg-[#2c2c2e]/60 border-slate-200 dark:border-white/5 opacity-60' : 'bg-white dark:bg-[#2c2c2e] border-slate-200 dark:border-white/5 hover:border-indigo-500/30'}`}>
      <div className="flex items-start gap-3 flex-1">
        <button onClick={(e) => toggleTaskComplete(task, e)} className={`mt-0.5 transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400'}`}>
          {task.completed ? <CheckCircle2 size={22} /> : <Circle size={22} strokeWidth={1.5} />}
        </button>
        <div className="flex-1">
          <h3 className={`text-sm font-medium transition-colors ${task.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</h3>
          
          <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-slate-500">
            <div className="flex gap-0.5 items-center mr-2"><span className="text-red-400 mr-1 text-xs">🍅 {task.completedPomodoros || 0}/{task.estimatedPomodoros || 1}</span></div>
            {!task.completed && task.priority && task.priority > 0 ? (<span className="flex items-center"><Flag size={10} className={getPriorityColor(task.priority)} /></span>) : null}
            <span className="bg-slate-100 dark:bg-black/30 px-1.5 py-0.5 rounded text-[9px]">{task.category}</span>
            {task.completed && task.completedAt ? (
               <span className="flex items-center gap-1 text-emerald-500/80 ml-1"><CheckCircle2 size={10}/> {formatCompletedDate(task.completedAt)}</span>
            ) : (
               task.dueDate && <span className="flex items-center gap-1 text-slate-400 ml-1"><CalendarDays size={10}/> {task.dueDate}</span>
            )}
          </div>
        </div>
      </div>
      {!task.completed && (
        <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); setCurrentScreen('timer'); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors">
          <Play size={20} fill="currentColor" />
        </button>
      )}
    </div>
  );

  const renderCompletedSection = () => {
    if (completedTasksList.length === 0) return <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-10">No completed tasks yet.</p>;
    const visibleCompletedTasks = showAllCompletedTasks ? completedTasksList : completedTasksList.slice(0, 3);
    return (
      <div className="space-y-3 mt-4">
        {visibleCompletedTasks.map(renderTaskItem)}
        {completedTasksList.length > 3 && (
          <div className="flex justify-center pt-3 pb-6">
            <button onClick={() => setShowAllCompletedTasks(!showAllCompletedTasks)} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
              {showAllCompletedTasks ? "Show Less ▴" : `Show More (${completedTasksList.length - 3}) ▾`}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (currentScreen === 'home') {
    return (
      <div className="w-full pb-40 px-5 pt-6 transition-colors duration-300">
        <div className="mb-8 mt-2">
          <h2 className="text-sm font-bold tracking-wider text-indigo-500 dark:text-indigo-400 uppercase mb-1">Good Morning, Asif</h2>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ready to focus? 🔥</h1>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-8 bg-white dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50">
          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Estimated</span>
            <span className="text-lg font-bold text-slate-800 dark:text-white">{Math.floor(todayEstimatedTime/60)}h {todayEstimatedTime%60}m</span>
          </div>
          <div className="flex flex-col items-center text-center border-l border-slate-200 dark:border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">To Do</span>
            <span className="text-lg font-bold text-slate-800 dark:text-white">{todayTasks.length}</span>
          </div>
          <div className="flex flex-col items-center text-center border-l border-slate-200 dark:border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Elapsed</span>
            <span className="text-lg font-bold text-slate-800 dark:text-white">{Math.floor((totalElapsedPomodoros*25)/60)}h</span>
          </div>
          <div className="flex flex-col items-center text-center border-l border-slate-200 dark:border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Done</span>
            <span className="text-lg font-bold text-slate-800 dark:text-white">{completedTasksList.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => openTasks("Today")} className="col-span-2 rounded-3xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 p-5 text-left shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95">
            <div className="flex justify-between items-center mb-6">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-500 dark:text-indigo-400"><Sun size={24} /></div>
              <span className="bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400">{todayTasks.length} Tasks left</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Today</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Estimated time: {Math.floor(todayEstimatedTime/60)}h {todayEstimatedTime%60}m</p>
            </div>
          </button>
          
          <button onClick={() => openTasks("This Week")} className="col-span-1 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 text-left shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95">
            <Calendar size={22} className="text-blue-500 dark:text-blue-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">This Week</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{thisWeekTasks.length} Planned</p>
          </button>
          
          <button onClick={() => openTasks("Planned")} className="col-span-1 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 text-left shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95">
            <CalendarDays size={22} className="text-teal-500 dark:text-teal-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Planned</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{plannedTasks.length} Tasks</p>
          </button>
          
          <button onClick={() => openTasks("Completed")} className="col-span-2 flex items-center justify-between bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 mt-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors active:scale-95">
            <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={20} /></div><span className="font-bold text-slate-700 dark:text-slate-200">Completed</span></div>
            <span className="text-lg font-extrabold text-slate-400 dark:text-slate-500">{completedTasksList.length}</span>
          </button>
        </div>
        
        <div className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center z-40 pointer-events-none">
          <button onClick={() => setCurrentScreen('timer')} className="w-[72px] h-[72px] rounded-full border-[4px] border-white dark:border-[#0f172a] bg-slate-900 dark:bg-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.25)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:scale-105 transition-all flex items-center justify-center pointer-events-auto">
            <span className="text-white text-2xl font-bold tracking-wider">{currentMinutes}</span>
          </button>
        </div>
      </div>
    );
  }

  if (currentScreen === 'tasks') {
    return (
      <div className="w-full h-[100dvh] overflow-y-auto pb-40 px-5 pt-6 animate-in fade-in slide-in-from-right-4 duration-300 transition-colors relative">
        <div className="flex items-center justify-between mb-8 mt-2 relative z-30">
          <button onClick={() => setCurrentScreen('home')} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{activeList}</h1>
          <button className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><MoreVertical size={20} /></button>
        </div>

        {activeList !== "Completed" && (
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-3 mb-6 shadow-sm relative z-50">
            <div className="flex items-center">
              <Plus size={20} className="text-slate-400 mr-2 shrink-0" />
              <input 
                type="text" 
                value={newTaskTitle} 
                onChange={(e) => setNewTaskTitle(e.target.value)} 
                onKeyDown={handleAddTask} 
                placeholder={`Add a task to ${activeList}...`} 
                className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none" 
              />
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 relative">
              <div className="flex items-center gap-4 text-slate-400 relative">
                <button onClick={() => setActivePopup(activePopup === 'date' ? 'none' : 'date')} className={`hover:text-indigo-500 transition-colors ${addDate !== "Today" ? "text-indigo-500" : ""}`}><Sun size={18} /></button>
                {activePopup === 'date' && (
                  <div className="absolute top-8 left-0 w-36 bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/5 shadow-xl rounded-xl p-1 z-50 animate-in fade-in zoom-in-95">
                    {["Today", "Tomorrow", "This Week", "Planned", "None"].map(option => (
                      <button key={option} onClick={() => { setAddDate(option); setActivePopup('none'); }} className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg ${addDate === option ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#3a3a3c]"}`}>{option}</button>
                    ))}
                  </div>
                )}

                <button onClick={() => setActivePopup(activePopup === 'priority' ? 'none' : 'priority')} className={`hover:text-indigo-500 transition-colors ${getPriorityColor(addPriority)}`}><Flag size={18} /></button>
                {activePopup === 'priority' && (
                  <div className="absolute top-8 left-6 w-36 bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/5 shadow-xl rounded-xl p-1 z-50 animate-in fade-in zoom-in-95">
                    <button onClick={() => { setAddPriority(3); setActivePopup('none'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-slate-50 dark:hover:bg-[#3a3a3c] rounded-lg">High Priority</button>
                    <button onClick={() => { setAddPriority(2); setActivePopup('none'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-orange-500 hover:bg-slate-50 dark:hover:bg-[#3a3a3c] rounded-lg">Medium Priority</button>
                    <button onClick={() => { setAddPriority(1); setActivePopup('none'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-blue-500 hover:bg-slate-50 dark:hover:bg-[#3a3a3c] rounded-lg">Low Priority</button>
                    <button onClick={() => { setAddPriority(0); setActivePopup('none'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-[#3a3a3c] rounded-lg">None</button>
                  </div>
                )}

                <button onClick={() => setActivePopup(activePopup === 'tag' ? 'none' : 'tag')} className={`hover:text-indigo-500 transition-colors ${addCategory !== "HSC" ? "text-indigo-500" : ""}`}><Tag size={18} /></button>
                {activePopup === 'tag' && (
                  <div className="absolute top-8 left-14 w-32 bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/5 shadow-xl rounded-xl p-1 z-50 animate-in fade-in zoom-in-95">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => { setAddCategory(cat); setActivePopup('none'); }} className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg ${addCategory === cat ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#3a3a3c]"}`}>{cat}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Pomodoros</span>
                <div className="flex gap-1 items-center bg-slate-100 dark:bg-[#2c2c2e] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors" onClick={() => setEstimatedPomos(prev => prev < 8 ? prev + 1 : 1)}>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">{estimatedPomos}</span>
                  <div className="flex gap-0.5">
                    {Array.from({length: Math.min(estimatedPomos, 5)}).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-400"></div>)}
                    {estimatedPomos > 5 && <span className="text-[10px] text-slate-500 ml-0.5">+{estimatedPomos-5}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pb-24 relative z-30">
          {activeList === "Completed" ? (
            renderCompletedSection()
          ) : (
            <>
              {currentDisplayedActiveTasks.length === 0 
                ? <p className="text-center text-slate-400 dark:text-slate-500 mt-10 text-sm">No active tasks added to {activeList} yet.</p> 
                : currentDisplayedActiveTasks.map(renderTaskItem)
              }
              {completedTasksList.length > 0 && (
                <div className="flex justify-center pt-6 pb-2">
                  <button onClick={() => setShowCompletedSection(!showCompletedSection)} className="bg-slate-200 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-bold px-5 py-2.5 rounded-full transition-colors hover:bg-slate-300 dark:hover:bg-slate-700">
                    {showCompletedSection ? "Hide Completed Tasks ▴" : `Show Completed Tasks (${completedTasksList.length}) ▾`}
                  </button>
                </div>
              )}
              {showCompletedSection && renderCompletedSection()}
            </>
          )}
        </div>

        {editingTask && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1c1c1e] w-full h-[88vh] rounded-t-[2rem] p-6 shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div className="flex items-center gap-3 w-full">
                  <button onClick={(e) => toggleTaskComplete(editingTask, e)} className={editingTask.completed ? 'text-emerald-500' : 'text-slate-400'}>
                    {editingTask.completed ? <CheckCircle2 size={24} /> : <Circle size={24} strokeWidth={1.5} />}
                  </button>
                  <input 
                    type="text" 
                    value={editingTask.title} 
                    onChange={(e) => handleUpdateTaskDetails(editingTask.id, { title: e.target.value })}
                    className={`text-xl font-bold bg-transparent outline-none w-full ${editingTask.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}
                  />
                </div>
                <button onClick={() => { setEditingTask(null); setEditModalField('none'); }} className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-10 scrollbar-hide">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-[#2c2c2e] rounded-xl flex flex-col items-center justify-center p-4 border border-slate-100 dark:border-white/5">
                    <span className="text-2xl mb-1">🍅</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{editingTask.completedPomodoros || 0} / {editingTask.estimatedPomodoros || 1}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Pomodoros</span>
                  </div>
                  <div className="flex flex-col gap-3 justify-center">
                    <button onClick={() => setEditModalField(prev => prev === 'category' ? 'none' : 'category')} className="w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-[#28283a] text-indigo-600 dark:text-indigo-400 p-3.5 rounded-xl text-sm font-semibold border border-indigo-100 dark:border-indigo-500/20 transition-transform active:scale-95">
                      <Tag size={16}/> {editingTask.category || "Add Tags"}
                    </button>
                    <button onClick={() => setEditModalField(prev => prev === 'priority' ? 'none' : 'priority')} className={`w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-[#2c2c2e] p-3.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/5 transition-transform active:scale-95 ${editingTask.priority ? getPriorityColor(editingTask.priority) : "text-slate-500 dark:text-slate-300"}`}>
                      <Flag size={16}/> {getPriorityLabel(editingTask.priority)}
                    </button>
                  </div>
                </div>

                {editModalField === 'category' && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 animate-in fade-in slide-in-from-top-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => { handleUpdateTaskDetails(editingTask.id, { category: cat }); setEditModalField('none'); }} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${editingTask.category === cat ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300'}`}>{cat}</button>
                    ))}
                  </div>
                )}

                {editModalField === 'priority' && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => { handleUpdateTaskDetails(editingTask.id, { priority: 3 }); setEditModalField('none'); }} className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-500">High</button>
                    <button onClick={() => { handleUpdateTaskDetails(editingTask.id, { priority: 2 }); setEditModalField('none'); }} className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-500">Medium</button>
                    <button onClick={() => { handleUpdateTaskDetails(editingTask.id, { priority: 1 }); setEditModalField('none'); }} className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-500">Low</button>
                    <button onClick={() => { handleUpdateTaskDetails(editingTask.id, { priority: 0 }); setEditModalField('none'); }} className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#2c2c2e] text-slate-400">None</button>
                  </div>
                )}

                <div className="bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/5 rounded-xl flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                  <div className="flex flex-col">
                    <div onClick={() => setEditModalField(prev => prev === 'dueDate' ? 'none' : 'dueDate')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><CalendarDays size={18}/> <span className="text-sm font-medium">Due Date</span></div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-md ${editingTask.dueDate && editingTask.dueDate !== "None" ? 'bg-indigo-100 dark:bg-[#3a3a3c] text-indigo-600 dark:text-blue-400' : 'text-slate-500 bg-slate-100 dark:bg-transparent'}`}>{editingTask.dueDate || "Today"}</span>
                    </div>
                    {editModalField === 'dueDate' && (
                      <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide animate-in fade-in slide-in-from-top-2">
                        {["Today", "Tomorrow", "This Week", "Planned", "None"].map(opt => (
                          <button key={opt} onClick={() => { handleUpdateTaskDetails(editingTask.id, { dueDate: opt === "None" ? null : opt, list: opt === "None" ? "Today" : opt }); setEditModalField('none'); }} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${editingTask.dueDate === opt || (!editingTask.dueDate && opt === "Today") ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#3a3a3c] text-slate-600 dark:text-slate-300'}`}>{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col">
                    <div onClick={() => setEditModalField(prev => prev === 'reminder' ? 'none' : 'reminder')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><Bell size={18}/> <span className="text-sm font-medium">Reminder</span></div>
                      <span className="text-xs font-medium text-slate-400">{editingTask.reminder || "None"}</span>
                    </div>
                    {editModalField === 'reminder' && (
                      <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide animate-in fade-in slide-in-from-top-2">
                        {["None", "5 mins before", "10 mins before", "30 mins before"].map(opt => (
                          <button key={opt} onClick={() => { handleUpdateTaskDetails(editingTask.id, { reminder: opt === "None" ? null : opt }); setEditModalField('none'); }} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${editingTask.reminder === opt || (!editingTask.reminder && opt === "None") ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#3a3a3c] text-slate-600 dark:text-slate-300'}`}>{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div onClick={() => setEditModalField(prev => prev === 'repeat' ? 'none' : 'repeat')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300"><Repeat size={18}/> <span className="text-sm font-medium">Repeat</span></div>
                      <span className="text-xs font-medium text-slate-400">{editingTask.repeat || "None"}</span>
                    </div>
                    {editModalField === 'repeat' && (
                      <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide animate-in fade-in slide-in-from-top-2">
                        {["None", "Daily", "Weekly", "Monthly", "Weekdays"].map(opt => (
                          <button key={opt} onClick={() => { handleUpdateTaskDetails(editingTask.id, { repeat: opt === "None" ? null : opt }); setEditModalField('none'); }} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${editingTask.repeat === opt || (!editingTask.repeat && opt === "None") ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#3a3a3c] text-slate-600 dark:text-slate-300'}`}>{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Notes</h4>
                  <textarea 
                    placeholder="Add a note..." 
                    value={editingTask.notes || ""}
                    onChange={(e) => handleUpdateTaskDetails(editingTask.id, { notes: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/5 rounded-xl p-4 text-sm outline-none resize-none h-32 text-slate-800 dark:text-white placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!editingTask && (
          <div className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center z-40 pointer-events-none">
            <button onClick={() => setCurrentScreen('timer')} className="w-[72px] h-[72px] rounded-full border-[4px] border-white dark:border-[#0f172a] bg-slate-900 dark:bg-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.25)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:scale-105 transition-all flex items-center justify-center pointer-events-auto">
              <span className="text-white text-2xl font-bold tracking-wider">{currentMinutes}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==============================
  // VIEW 3: TIMER
  // ==============================
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 overflow-hidden h-[100dvh] w-full">
      <div className="w-full max-w-xl px-6 flex items-center justify-between mb-8 z-30">
        <button onClick={() => setCurrentScreen('tasks')} className="p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronDown size={28} strokeWidth={1} /></button>
        <button onClick={() => setShowTaskSelector(true)} className="bg-white/80 dark:bg-black/30 dark:hover:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 px-6 py-2.5 rounded-full flex items-center gap-3 text-slate-800 dark:text-white shadow-sm dark:shadow-lg transition-colors cursor-pointer">
          <div className={`w-2 h-2 rounded-full transition-all duration-700 ${isActive ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-slate-300 dark:bg-slate-500'}`}></div>
          <span className="text-[13px] font-medium tracking-wide max-w-[200px] truncate">{activeTask ? activeTask.title : "Select a Task"}</span>
          <ChevronDown size={14} className="text-slate-400 dark:text-white/50" />
        </button>
        <button onClick={() => setShowStopModal(true)} className="p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={26} strokeWidth={1} /></button>
      </div>

      <div className={`relative flex items-center justify-center mt-auto mb-auto transition-transform duration-1000 ease-out ${isActive ? 'scale-[1.02]' : 'scale-100'}`}>
        <svg width={svgSize} height={svgSize} className="relative z-10 drop-shadow-sm dark:drop-shadow-xl">
          <g className={`transition-opacity duration-1000 ease-out ${isActive ? 'opacity-100' : 'opacity-0'}`} style={{ transformOrigin: `${center}px ${center}px` }}>
            <g style={{ transformOrigin: `${center}px ${center}px`, animationDuration: '40s' }} className={`animate-spin ${!isActive ? 'animation-paused' : ''}`}>
              <circle cx={center} cy={center} r={radius + 35} stroke="currentColor" strokeWidth="1" fill="transparent" className="text-slate-200 dark:text-white/10" />
              <circle cx={center} cy={center - (radius + 35)} r="2" fill="currentColor" className="text-slate-900 dark:text-white/80" />
            </g>
            <g style={{ transformOrigin: `${center}px ${center}px`, animationDuration: '25s', animationDirection: 'reverse' }} className={`animate-spin ${!isActive ? 'animation-paused' : ''}`}>
              <circle cx={center} cy={center} r={radius + 15} stroke="currentColor" strokeWidth="1" fill="transparent" className="text-slate-200 dark:text-white/10" />
              <circle cx={center} cy={center - (radius + 15)} r="3" fill="currentColor" className="text-slate-900 dark:text-white/80" />
            </g>
          </g>
          <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="2" fill="transparent" className="text-slate-200 dark:text-white/15" />
          <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="text-slate-900 dark:text-white transition-all duration-1000 ease-linear" transform={`rotate(-90 ${center} ${center})`} />
        </svg>
        <div className="absolute flex flex-col items-center justify-center z-20">
          <span className="text-[5rem] font-extralight tracking-wider tabular-nums text-slate-800 dark:text-white">{formatTime(timeLeft)}</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.4em] mt-2 text-slate-500 dark:text-white/70">{activeTask ? activeTask.category : activeCategory}</span>
        </div>
      </div>
      
      <div className="mt-auto mb-10 pb-[env(safe-area-inset-bottom)] z-20 w-full px-10 flex justify-center items-center gap-4 h-[60px] relative">
        {isInitialState && <button onClick={toggleTimer} className="absolute px-10 py-3.5 rounded-full flex items-center justify-center font-medium text-[15px] border bg-slate-900 text-white dark:bg-white/90 dark:text-slate-900 hover:scale-95 transition-all">Start to Focus</button>}
        {isActive && <button onClick={toggleTimer} className="absolute px-10 py-3.5 rounded-full flex items-center justify-center font-medium text-[15px] border bg-white dark:bg-transparent text-slate-700 dark:text-white border-slate-300 dark:border-white/40 hover:scale-95 transition-all">Pause</button>}
        {isPausedState && (
          <div className="absolute flex items-center gap-4">
            <button onClick={toggleTimer} className="px-8 py-3.5 rounded-full font-medium text-[15px] border bg-slate-900 text-white dark:bg-white/90 dark:text-slate-900 hover:scale-95 transition-all">Continue</button>
            <button onClick={() => setShowStopModal(true)} className="px-8 py-3.5 rounded-full font-medium text-[15px] border bg-white dark:bg-transparent text-slate-700 dark:text-white border-slate-300 dark:border-white/40 hover:scale-95 transition-all">Stop</button>
          </div>
        )}
      </div>

      {showTaskSelector && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[calc(6rem+env(safe-area-inset-top))] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 px-5">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 dark:border-white/10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[60vh]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white ml-1">Select Task</h3>
              <button onClick={() => setShowTaskSelector(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10 transition-colors rounded-full"><X size={18} /></button>
            </div>
            <div className="relative mb-4 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Plus size={18} className="text-slate-500 dark:text-slate-400" /></div>
              <input type="text" value={quickNewTaskTitle} onChange={(e) => setQuickNewTaskTitle(e.target.value)} onKeyDown={handleQuickAddTask} placeholder="Type new task & press Enter..." className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-slate-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all" />
            </div>
            <div className="overflow-y-auto space-y-2 pr-1 scrollbar-hide flex-1">
              {tasks.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">No tasks available.</p>
              ) : (
                tasks.map(task => (
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-6">Stop Session?</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowStopModal(false)} className="flex-1 py-3.5 rounded-xl text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 font-medium">Cancel</button>
              <button onClick={confirmStopTimer} className="flex-1 py-3.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20">Stop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}