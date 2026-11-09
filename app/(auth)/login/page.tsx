// src/app/(auth)/login/page.tsx
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { saveAccount } from "@/lib/admcqAccount";
import { Timer, Loader2 } from "lucide-react";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc, Firestore } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useAuth } from "@/hooks/useAuth";
import PhoneAuthCard from "@/app/components/shared/PhoneAuthCard";

// লগইন AdMCQ এর মতো (ফোন + পাসওয়ার্ড বা Google), একই অ্যাকাউন্ট
export default function AuthPage() {
  const { user, loading } = useAuth();

  // আগে থেকেই লগইন থাকলে সরাসরি হোমপেজে। শুধু প্রথম অবস্থা দেখি; রেজিস্ট্রেশনের মাঝে OTP তে লগইন হলে সরাই না
  const [checked, setChecked] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  useEffect(() => {
    if (loading || checked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time redirect check once auth has loaded
    setChecked(true);
    if (user) { setLeaving(true); window.location.replace("/"); }
  }, [user, loading, checked]);

  // প্রথমবার এলে প্রোফাইল ডক বানাই (ফোনের অ্যাকাউন্টে লুকানো ইমেইল নয়, ফোন নম্বর রাখি)
  const onSignedIn = async (u: User, info: { name: string }) => {
    if (info.name) await saveAccount(auth, { name: info.name }).catch(() => undefined);
    const ref = doc(db as Firestore, "users", u.uid);
    if (!(await getDoc(ref)).exists()) {
      await setDoc(ref, {
        uid: u.uid,
        email: u.phoneNumber ? null : u.email,
        phone: u.phoneNumber || null,
        displayName: info.name || u.displayName || "Student",
        studyLevel: "hsc",
        createdAt: new Date().toISOString(),
      });
    }
    window.location.replace("/");   // পুরো লোড: পাহারাদার নতুন করে প্রোফাইল দেখে
  };

  if (loading || !checked || leaving) {
    return (
      <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-[#0f172a]">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="dark fixed inset-0 z-[2001] overflow-y-auto flex flex-col items-center justify-center p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] bg-[#0f172a] text-white">
      <PhoneAuthCard
        auth={auth}
        accent="bg-indigo-600 hover:bg-indigo-500"
        onSignedIn={onSignedIn}
        header={
          <div className="flex flex-col items-center mb-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20 rotate-3">
              <Timer size={28} className="text-white" />
            </div>
            <span className="font-extrabold text-xl">Shonghi Focus</span>
          </div>
        }
      />
      <p className="text-center text-xs text-slate-400 mt-4 max-w-sm">চালিয়ে গেলে আপনি <Link href="/terms" className="underline">Terms</Link> আর <Link href="/privacy" className="underline">Privacy Policy</Link> মেনে নিচ্ছেন।</p>
    </div>
  );
}
