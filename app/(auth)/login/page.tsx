// src/app/(auth)/login/page.tsx
"use client";

import React, { useEffect } from "react";
import { Timer, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc, Firestore } from "firebase/firestore";
// @ts-ignore: Bypassing implicit any error for production build
import { auth, db } from "@/lib/firebaseClient";
import { useAuth } from "@/hooks/useAuth";
import PhoneAuthCard from "@/app/components/shared/PhoneAuthCard";

// লগইন AdMCQ এর মতো (ফোন + পাসওয়ার্ড বা Google), একই অ্যাকাউন্ট
export default function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // ইউজার আগে থেকেই লগড ইন থাকলে সরাসরি হোমপেজে পাঠিয়ে দেবে
  useEffect(() => {
    if (user && !loading) router.push("/");
  }, [user, loading, router]);

  // প্রথমবার এলে প্রোফাইল ডক বানাই (ফোনের অ্যাকাউন্টে লুকানো ইমেইল নয়, ফোন নম্বর রাখি)
  const onSignedIn = async (u: User, info: { name: string }) => {
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
    router.push("/");
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center p-5 bg-[#0f172a] text-white">
      <PhoneAuthCard
        auth={auth}
        accent="bg-indigo-600 hover:bg-indigo-500"
        onSignedIn={onSignedIn}
        header={
          <div className="flex flex-col items-center mb-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20 rotate-3">
              <Timer size={28} className="text-white" />
            </div>
            <span className="font-extrabold text-xl">Pomodoro BD</span>
          </div>
        }
      />
    </div>
  );
}
