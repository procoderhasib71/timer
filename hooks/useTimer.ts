// src/hooks/useTimer.ts
import { useState, useEffect, useCallback, useRef } from 'react';

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

// টাইমার "কখন শেষ হবে" (endAt) মনে রাখে, প্রতি সেকেন্ডে ১ কমায় না। তাই ফোন লক হলে বা অন্য ট্যাবে গেলে পিছিয়ে পড়ে না,
// আর localStorage এ রাখা থাকে বলে পেজ রিফ্রেশ বা অ্যাপ বন্ধ করে খুললেও চলমান/থামানো টাইমার ফিরে আসে।
const STORAGE_KEY = 'pomodoro_timer';
type Saved = { mode: TimerMode; endAt: number | null; timeLeft: number; initialDuration: number };

const secondsUntil = (endAt: number) => Math.max(0, Math.ceil((endAt - Date.now()) / 1000));

// onSchedule: টাইমার চালু হলে কখন শেষ হবে (endAt), থামলে/শেষ হলে null — বটকে জানানোর জন্য
export function useTimer(initialMode: TimerMode = 'pomodoro', onFinish?: (mode: TimerMode) => void,
                         onSchedule?: (endAt: number | null, mode: TimerMode) => void) {
  const [mode, setMode] = useState<TimerMode>(initialMode);
  const [initialDuration, setInitialDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);   // আগের চলমান/থামানো টাইমার ফিরে এসেছে কিনা
  const hydrated = useRef(false);
  const [ready, setReady] = useState(false);   // ফিরিয়ে আনা শেষ; তার আগে সেভ করলে পুরনোটা মুছে যেত
  const finishedFor = useRef<number | null>(null);   // একই endAt এর জন্য "শেষ" একবারই
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const scheduleRef = useRef(onSchedule);
  scheduleRef.current = onSchedule;
  const lastScheduled = useRef<number | null>(null);   // শুরুতে null, তাই খোলার সময় অকারণে "বাতিল" পাঠাই না
  const isActive = endAt !== null;

  const getSettings = useCallback(() => {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('pomodoro_settings') || '{}');
  }, []);

  const getDurationForMode = useCallback((currentMode: TimerMode) => {
    const settings = getSettings();
    if (currentMode === 'pomodoro') return (settings.pomodoroLength || 25) * 60;
    if (currentMode === 'shortBreak') return (settings.shortBreak || 5) * 60;
    if (currentMode === 'longBreak') return (settings.longBreak || 15) * 60;
    return 25 * 60;
  }, [getSettings]);

  // প্রথমবার: আগের টাইমার ফিরিয়ে আনি, না থাকলে সেটিংসের সময়
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let saved: Saved | null = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { saved = null; }
    if (saved && (saved.endAt || saved.timeLeft < saved.initialDuration)) {
      setMode(saved.mode);
      setInitialDuration(saved.initialDuration);
      // বন্ধ থাকার মধ্যে শেষ হয়ে গেলেও endAt রাখি: পরের tick এ 0 হয়ে স্বাভাবিকভাবে "শেষ" ধরা হবে (সেশন সেভ হবে)
      setTimeLeft(saved.endAt ? secondsUntil(saved.endAt) : saved.timeLeft);
      setEndAt(saved.endAt);
      setRestored(true);
    } else {
      const d = getDurationForMode(initialMode);
      setInitialDuration(d);
      setTimeLeft(d);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const saved: Saved = { mode, endAt, timeLeft, initialDuration };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [ready, mode, endAt, timeLeft, initialDuration]);

  useEffect(() => {
    if (!ready || endAt === lastScheduled.current) return;
    lastScheduled.current = endAt;
    scheduleRef.current?.(endAt, mode);
  }, [ready, endAt, mode]);

  // সেটিংস বদলালে: টাইমার একদম শুরুর অবস্থায় থাকলেই নতুন সময় বসাই (চলমান বা থামানো টাইমারে হাত দিই না)
  const live = useRef({ isActive, timeLeft, initialDuration, mode });
  const customized = useRef(false);   // হাতে সময় বদলালে অ্যাপে ফিরে আসার (focus) সময় সেটিংসের সময় বসাই না
  live.current = { isActive, timeLeft, initialDuration, mode };
  useEffect(() => {
    const updateTimerFromSettings = (e: Event) => {
      const s = live.current;
      if (s.isActive || s.timeLeft !== s.initialDuration) return;
      if (e.type === 'focus' && customized.current) return;
      customized.current = false;
      const duration = getDurationForMode(s.mode);
      setInitialDuration(duration);
      setTimeLeft(duration);
    };
    window.addEventListener('settings_updated', updateTimerFromSettings);
    window.addEventListener('focus', updateTimerFromSettings);
    return () => {
      window.removeEventListener('settings_updated', updateTimerFromSettings);
      window.removeEventListener('focus', updateTimerFromSettings);
    };
  }, [getDurationForMode]);

  // চলার সময় ঘড়ি দেখে বাকি সময় হিসাব; ট্যাবে ফিরে এলেও সাথে সাথে ঠিক হয়
  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const left = secondsUntil(endAt);
      setTimeLeft(left);
      if (left === 0 && finishedFor.current !== endAt) {
        finishedFor.current = endAt;
        setEndAt(null);
        finishRef.current?.(live.current.mode);
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endAt]);

  const toggleTimer = () => {
    if (endAt !== null) {
      setTimeLeft(secondsUntil(endAt));
      setEndAt(null);
    } else if (timeLeft > 0) {
      setEndAt(Date.now() + timeLeft * 1000);
    }
  };

  const resetTimer = () => {
    setEndAt(null);
    setRestored(false);
    customized.current = false;
    const duration = getDurationForMode(mode);
    setInitialDuration(duration);
    setTimeLeft(duration);
  };

  // শুরুর আগেই শুধু সময় বদলানো যায় (১ থেকে ১৮০ মিনিট); মোট সময়ও সাথে বদলায়, নইলে রিং আধা ভরা আর "থেমে আছে" দেখাত
  const adjustTime = (amountInSeconds: number) => {
    if (endAt !== null || timeLeft !== initialDuration) return;
    const next = Math.min(180 * 60, Math.max(60, timeLeft + amountInSeconds));
    customized.current = true;
    setTimeLeft(next);
    setInitialDuration(next);
  };

  const changeMode = (newMode: TimerMode, autoStart: boolean = false) => {
    setMode(newMode);
    customized.current = false;
    const duration = getDurationForMode(newMode);
    setInitialDuration(duration);
    setTimeLeft(duration);
    setEndAt(autoStart ? Date.now() + duration * 1000 : null);
  };

  return {
    mode, timeLeft, isActive, toggleTimer, resetTimer,
    adjustTime, initialDuration, changeMode, getSettings, restored
  };
}
