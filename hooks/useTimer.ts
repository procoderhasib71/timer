// src/hooks/useTimer.ts
import { useState, useEffect, useCallback } from 'react';

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

export function useTimer(initialMode: TimerMode = 'pomodoro') {
  const [mode, setMode] = useState<TimerMode>(initialMode);
  
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

  // Initial States
  const [initialDuration, setInitialDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  // ✅ Listen for Settings Updates & SSR Hydration Fix
  useEffect(() => {
    const updateTimerFromSettings = () => {
      if (!isActive) {
        const duration = getDurationForMode(mode);
        setInitialDuration(duration);
        setTimeLeft(duration);
      }
    };

    // Run on mount
    updateTimerFromSettings();

    // Listen for custom event from Settings page & Tab Focus
    window.addEventListener('settings_updated', updateTimerFromSettings);
    window.addEventListener('focus', updateTimerFromSettings);

    return () => {
      window.removeEventListener('settings_updated', updateTimerFromSettings);
      window.removeEventListener('focus', updateTimerFromSettings);
    };
  }, [mode, getDurationForMode, isActive]);

  // Main timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft <= 0) {
      setIsActive(false); 
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    const duration = getDurationForMode(mode);
    setInitialDuration(duration);
    setTimeLeft(duration);
  };

  const adjustTime = (amountInSeconds: number) => {
    setTimeLeft((prev) => {
      let newTime = prev + amountInSeconds;
      if (newTime < 60) newTime = 60; 
      setInitialDuration((prevInitial) => (prevInitial < newTime ? newTime : prevInitial));
      return newTime;
    });
  };

  const changeMode = (newMode: TimerMode, autoStart: boolean = false) => {
    setMode(newMode);
    const duration = getDurationForMode(newMode);
    setInitialDuration(duration);
    setTimeLeft(duration);
    setIsActive(autoStart);
  };

  return { 
    mode, timeLeft, isActive, toggleTimer, resetTimer, 
    adjustTime, initialDuration, changeMode, getSettings 
  };
}