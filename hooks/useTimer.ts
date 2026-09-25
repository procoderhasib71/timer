// src/hooks/useTimer.ts

import { useState, useEffect } from "react";

export const MODES = {
  pomodoro: 25 * 60,       // 25 minutes
  admission: 2 * 60 * 60,  // 2 hours
  hscBoard: 3 * 60 * 60,   // 3 hours
};

export type TimerMode = keyof typeof MODES;

export function useTimer(initialMode: TimerMode = "pomodoro") {
  const [mode, setMode] = useState<TimerMode>(initialMode);
  const [timeLeft, setTimeLeft] = useState(MODES[initialMode]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      // পরবর্তীতে এখানে আমরা সাউন্ড প্লে বা নোটিফিকেশন লজিক যোগ করব
    }
    
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive((prev) => !prev);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode]);
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODES[newMode]);
  };

  return {
    mode,
    timeLeft,
    isActive,
    toggleTimer,
    resetTimer,
    switchMode,
  };
}