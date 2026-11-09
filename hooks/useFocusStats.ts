"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

// হোমের জন্য হালকা হিসাব: আজ কত মিনিট ফোকাস আর টানা কত দিন। শুধু শেষ DAYS দিনের সেশন পড়ি (খরচ কম)
const DAYS = 35;
const dayKey = (d: Date) => d.toLocaleDateString("en-CA");
const EMPTY = new Map<string, number>();

export function useFocusStats(uid: string | null) {
  // কার হিসাব সেটাও রাখি: logout বা অন্য কেউ login করলে আগের জনের মিনিট/streak এক মুহূর্তও দেখাই না
  const [data, setData] = useState<{ uid: string | null; byDay: Map<string, number> }>({ uid: null, byDay: new Map() });
  const byDay = uid && data.uid === uid ? data.byDay : EMPTY;

  useEffect(() => {
    if (!uid) return;
    const from = new Date();
    from.setDate(from.getDate() - DAYS);
    from.setHours(0, 0, 0, 0);
    const q = query(collection(db, "users", uid, "sessions"), where("timestamp", ">=", from.toISOString()));
    return onSnapshot(q, (snap) => {
      const m = new Map<string, number>();
      snap.forEach((d) => {
        const s = d.data() as { mode?: string; duration?: number; timestamp: string };
        if (s.mode && s.mode !== "pomodoro") return;
        const k = dayKey(new Date(s.timestamp));
        m.set(k, (m.get(k) || 0) + (s.duration || 0));
      });
      setData({ uid, byDay: m });
    });
  }, [uid]);

  const now = new Date();
  const todayMinutes = byDay.get(dayKey(now)) || 0;
  // আজ এখনো না পড়লে গতকাল থেকে গুনি: দিন শেষ না হওয়া পর্যন্ত streak ভাঙে না
  let streak = 0;
  for (const d = new Date(now); streak <= DAYS; d.setDate(d.getDate() - 1)) {
    if ((byDay.get(dayKey(d)) || 0) > 0) streak++;
    else if (!(streak === 0 && dayKey(d) === dayKey(now))) break;
  }
  return { todayMinutes, streak: Math.min(streak, DAYS), streakCapped: streak > DAYS };
}
