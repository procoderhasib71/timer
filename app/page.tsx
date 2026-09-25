// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { 
  Play, Pause, X, ChevronDown, ArrowLeft, 
  Sun, Calendar, CalendarDays, CheckCircle2, 
  Plus, MoreVertical, Circle, Clock
} from "lucide-react";
import { useTimer, MODES } from "@/hooks/useTimer";

const MOUNTAIN_BG = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1080&auto=format&fit=crop";

interface Task {
  id: string;
  title: string;
  category: string;
  duration: number;
  completed: boolean;
}

export default function PomodoroPage() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'tasks' | 'timer'>('home');
  const [activeList, setActiveList] = useState("Today");
  const [showStopModal, setShowStopModal] = useState(false);
  
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [quickNewTaskTitle, setQuickNewTaskTitle] = useState("");
  
  const { mode, timeLeft, isActive, toggleTimer, resetTimer } = useTimer("pomodoro");
  const [activeCategory, setActiveCategory] = useState("HSC"); 

  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Complete Biology Chapter 4', category: 'HSC', duration: 25, completed: false }, 
    { id: '2', title: 'Physics Math Solve', category: 'Admission', duration: 25, completed: false },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    const savedCats = localStorage.getItem("pomodoro_categories");
    if (savedCats) {
      const parsed = JSON.parse(savedCats);
      if (parsed.length > 0) setActiveCategory(parsed[0]); 
    }
    if (tasks.length > 0 && !activeTask) {
      setActiveTask(tasks[0]);
    }
  }, []);

  const handleAddTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim() !== '') {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
        category: activeCategory, 
        duration: 25,
        completed: false
      };
      setTasks([newTask, ...tasks]);
      setNewTaskTitle("");
    }
  };

  const handleTaskClick = (task: Task) => {
    setActiveTask(task);
    setCurrentScreen('timer');
  };

  const toggleTaskComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const confirmStopTimer = () => {
    resetTimer();
    setShowStopModal(false);
    setCurrentScreen('home');
  };

  const svgSize = 420;
  const center = svgSize / 2;
  const radius = 145; 
  const circumference = 2 * Math.PI * radius;
  const progress = ((MODES[mode] - timeLeft) / MODES[mode]) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentMinutes = Math.ceil(timeLeft / 60);
  const openTasks = (title: string) => { setActiveList(title); setCurrentScreen('tasks'); };
  const pendingTasksCount = tasks.filter(t => !t.completed).length;
  const completedTasksCount = tasks.filter(t => t.completed).length;

  const isInitialState = timeLeft === MODES[mode] && !isActive;
  const isPausedState = !isActive && timeLeft < MODES[mode];

  // ==============================
  // VIEW 1: MODERN BENTO HOMEPAGE
  // ==============================
  if (currentScreen === 'home') {
    return (
      // Changed to min-h-screen and massive pb-48 padding so content naturally scrolls above the floating button
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0f172a] text-slate-600 dark:text-slate-300 pb-48 px-5 pt-6 transition-colors duration-300">
        <div className="mb-8 mt-2">
          <h2 className="text-sm font-bold tracking-wider text-indigo-500 dark:text-indigo-400 uppercase mb-1">Good Morning, Asif</h2>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ready to focus? 🔥</h1>
        </div>
        <div className="grid grid-cols-2 gap-4">
          
          <button onClick={() => openTasks("Today")} className="col-span-2 rounded-3xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 p-5 text-left shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95">
            <div className="flex justify-between items-center mb-6">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-500 dark:text-indigo-400">
                <Sun size={24} />
              </div>
              <span className="bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {pendingTasksCount} Tasks left
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Today</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Estimated time: {pendingTasksCount * 25}m</p>
            </div>
          </button>
          
          <button onClick={() => openTasks("This Week")} className="col-span-1 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 text-left shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95">
            <Calendar size={22} className="text-blue-500 dark:text-blue-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">This Week</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">12 Planned</p>
          </button>
          
          <button onClick={() => openTasks("Planned")} className="col-span-1 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 text-left shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95">
            <CalendarDays size={22} className="text-teal-500 dark:text-teal-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Planned</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">8 Tasks</p>
          </button>
          
          <button onClick={() => openTasks("Completed")} className="col-span-2 flex items-center justify-between bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 mt-2 shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors active:scale-95">
            <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={20} /></div><span className="font-bold text-slate-700 dark:text-slate-200">Completed</span></div>
            <span className="text-lg font-extrabold text-slate-400 dark:text-slate-500">{completedTasksCount}</span>
          </button>
        </div>
        
        {/* Floating Timer Button - safely above bottom nav */}
        <div className="fixed bottom-24 pb-[env(safe-area-inset-bottom)] left-0 right-0 flex justify-center z-40 pointer-events-none">
          <button onClick={() => setCurrentScreen('timer')} className="w-[72px] h-[72px] rounded-full overflow-hidden border-[1.5px] border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:scale-105 transition-all relative group pointer-events-auto">
            <div className="absolute inset-0 bg-cover bg-center opacity-90 group-hover:opacity-100" style={{ backgroundImage: `url("${MOUNTAIN_BG}")` }} />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-2xl font-light tracking-wider drop-shadow-md">{currentMinutes}</span></div>
          </button>
        </div>
      </div>
    );
  }

  // ==============================
  // VIEW 2: DYNAMIC TASK LIST VIEW
  // ==============================
  if (currentScreen === 'tasks') {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0f172a] text-slate-600 dark:text-slate-300 pb-48 px-5 pt-6 animate-in fade-in slide-in-from-right-4 duration-300 transition-colors">
        <div className="flex items-center justify-between mb-8 mt-2">
          <button onClick={() => setCurrentScreen('home')} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{activeList}</h1>
          <button className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><MoreVertical size={20} /></button>
        </div>
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Plus size={20} className="text-indigo-500 dark:text-indigo-400" /></div>
          <input 
            type="text" 
            value={newTaskTitle} 
            onChange={(e) => setNewTaskTitle(e.target.value)} 
            onKeyDown={handleAddTask} 
            placeholder="Add a new task & press Enter..." 
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-slate-50 dark:focus:bg-slate-800 shadow-sm dark:shadow-none outline-none transition-all" 
          />
        </div>
        <div className="space-y-3">
          {tasks.length === 0 ? <p className="text-center text-slate-400 dark:text-slate-500 mt-10 text-sm">No tasks added yet. Add one above!</p> : tasks.map((task) => (
            <div key={task.id} onClick={() => handleTaskClick(task)} className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer group transition-colors shadow-sm dark:shadow-none ${task.completed ? 'bg-slate-100 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800/50 opacity-60' : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <button onClick={(e) => toggleTaskComplete(task.id, e)} className={`mt-0.5 transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400'}`}>
                {task.completed ? <CheckCircle2 size={22} /> : <Circle size={22} strokeWidth={1.5} />}
              </button>
              <div className="flex-1">
                <h3 className={`text-sm font-medium transition-colors ${task.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white'}`}>{task.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"><span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md"><Clock size={12} /> {task.duration}m</span><span>{task.category}</span></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="fixed bottom-24 pb-[env(safe-area-inset-bottom)] left-0 right-0 flex justify-center z-40 pointer-events-none">
          <button onClick={() => setCurrentScreen('timer')} className="w-[72px] h-[72px] rounded-full overflow-hidden border-[1.5px] border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:scale-105 transition-all relative group pointer-events-auto">
            <div className="absolute inset-0 bg-cover bg-center opacity-90 group-hover:opacity-100" style={{ backgroundImage: `url("${MOUNTAIN_BG}")` }} />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-2xl font-light tracking-wider drop-shadow-md">{currentMinutes}</span></div>
          </button>
        </div>
      </div>
    );
  }

  // ==============================
  // VIEW 3: CLEAN & MINIMAL TIMER
  // ==============================
  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center pt-14 pb-12 bg-cover bg-center overflow-hidden h-[100dvh] w-full" 
      style={{ backgroundImage: `url("${MOUNTAIN_BG}")` }}
    >
      <div className={`absolute inset-0 bg-[#0f172a] transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-80' : 'opacity-40'}`} />

      {/* Top Controls */}
      <div className="w-full max-w-xl px-6 flex items-center justify-between mb-8 z-30">
        <button onClick={() => setCurrentScreen('tasks')} className="p-2 text-white/50 hover:text-white transition-colors">
          <ChevronDown size={28} strokeWidth={1} />
        </button>
        
        <button 
          onClick={() => setShowTaskSelector(true)}
          className="bg-black/30 hover:bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2.5 rounded-full flex items-center gap-3 text-white shadow-lg transition-colors cursor-pointer"
        >
          <div className={`w-2 h-2 rounded-full transition-all duration-700 ${isActive ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-slate-300'}`}></div>
          <span className="text-[13px] font-medium tracking-wide text-white/90 max-w-[200px] truncate">
            {activeTask ? activeTask.title : "Select a Task"}
          </span>
          <ChevronDown size={14} className="text-white/50" />
        </button>
        
        <button onClick={() => setShowStopModal(true)} className="p-2 text-white/50 hover:text-white transition-colors">
          <X size={26} strokeWidth={1} />
        </button>
      </div>

      {/* Main Minimal Timer */}
      <div className={`relative flex items-center justify-center mt-auto mb-auto transition-transform duration-1000 ease-out ${isActive ? 'scale-[1.02]' : 'scale-100'}`}>
        <svg width={svgSize} height={svgSize} className="relative z-10 drop-shadow-xl">
          <g className={`transition-opacity duration-1000 ease-out ${isActive ? 'opacity-100' : 'opacity-0'}`} style={{ transformOrigin: `${center}px ${center}px` }}>
            <g style={{ transformOrigin: `${center}px ${center}px`, animationDuration: '40s' }} className={`animate-spin ${!isActive ? 'animation-paused' : ''}`}>
              <circle cx={center} cy={center} r={radius + 35} stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="transparent" />
              <circle cx={center} cy={center - (radius + 35)} r="2" fill="rgba(255,255,255,0.8)" />
            </g>
            <g style={{ transformOrigin: `${center}px ${center}px`, animationDuration: '25s', animationDirection: 'reverse' }} className={`animate-spin ${!isActive ? 'animation-paused' : ''}`}>
              <circle cx={center} cy={center} r={radius + 15} stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="transparent" />
              <circle cx={center} cy={center - (radius + 15)} r="3" fill="rgba(255,255,255,0.9)" />
            </g>
          </g>

          <circle cx={center} cy={center} r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="transparent" />
          <circle 
            cx={center} cy={center} r={radius} 
            stroke="#ffffff" strokeWidth="3" fill="transparent" 
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
            className="transition-all duration-1000 ease-linear"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
        
        <div className="absolute flex flex-col items-center justify-center z-20">
          <span className="text-[5rem] font-extralight tracking-wider tabular-nums text-white drop-shadow-md">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.4em] mt-2 text-white/70">
            {activeTask ? activeTask.category : activeCategory}
          </span>
        </div>
      </div>
      
      {/* Action Buttons Container */}
      <div className="mt-auto mb-10 pb-[env(safe-area-inset-bottom)] z-20 w-full px-10 flex justify-center items-center gap-4 h-[60px] relative">
        {isInitialState && (
          <button onClick={toggleTimer} className="absolute px-10 py-3.5 rounded-full flex items-center justify-center font-medium text-[15px] transition-all duration-500 ease-out active:scale-95 border bg-white/90 text-slate-900 border-transparent hover:bg-white animate-in fade-in zoom-in-95">
            Start to Focus
          </button>
        )}
        {isActive && (
          <button onClick={toggleTimer} className="absolute px-10 py-3.5 rounded-full flex items-center justify-center font-medium text-[15px] transition-all duration-500 ease-out active:scale-95 border bg-transparent text-white border-white/40 hover:border-white hover:bg-white/10 animate-in fade-in zoom-in-95 backdrop-blur-md">
            Pause
          </button>
        )}
        {isPausedState && (
          <div className="absolute flex items-center gap-4 animate-in fade-in zoom-in-95 duration-500 ease-out">
            <button onClick={toggleTimer} className="px-8 py-3.5 rounded-full flex items-center justify-center font-medium text-[15px] transition-all active:scale-95 border bg-white/90 text-slate-900 border-transparent hover:bg-white">
              Continue
            </button>
            <button onClick={() => setShowStopModal(true)} className="px-8 py-3.5 rounded-full flex items-center justify-center font-medium text-[15px] transition-all active:scale-95 border bg-transparent text-white border-white/40 hover:border-white hover:bg-white/10 backdrop-blur-md">
              Stop
            </button>
          </div>
        )}
      </div>

      {/* COMPACT TOP MODAL: Quick Task Selector / Adder */}
      {showTaskSelector && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 px-5">
          <div className="bg-[#1c1c1e] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[60vh]">
            
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold text-white ml-1">Select Task</h3>
              <button 
                onClick={() => setShowTaskSelector(false)} 
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative mb-4 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Plus size={18} className="text-indigo-400" />
              </div>
              <input 
                type="text" 
                value={quickNewTaskTitle}
                onChange={(e) => setQuickNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickNewTaskTitle.trim() !== '') {
                    const newTask: Task = {
                      id: Date.now().toString(),
                      title: quickNewTaskTitle,
                      category: activeCategory, 
                      duration: 25,
                      completed: false
                    };
                    setTasks([newTask, ...tasks]);
                    setActiveTask(newTask); 
                    setQuickNewTaskTitle("");
                    setShowTaskSelector(false); 
                  }
                }}
                placeholder="Type new task & press Enter..." 
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:border-indigo-500 focus:bg-white/10 outline-none transition-all"
              />
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 scrollbar-hide flex-1">
              {tasks.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-4">No tasks available.</p>
              ) : (
                tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setActiveTask(task);
                      setShowTaskSelector(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 border rounded-xl transition-colors text-left ${
                      activeTask?.id === task.id 
                        ? 'bg-indigo-500/20 border-indigo-500/50' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <div className="flex-1 truncate">
                      <h4 className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.title}
                      </h4>
                    </div>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* Stop Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 px-5">
          <div className="bg-[#1c1c1e] w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-white text-center mb-6">Stop This Pomodoro?</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowStopModal(false)} className="flex-1 py-3.5 rounded-xl font-medium text-white bg-white/10 hover:bg-white/20 transition-colors">
                Cancel
              </button>
              <button onClick={confirmStopTimer} className="flex-1 py-3.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}