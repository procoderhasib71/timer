// src/app/(auth)/login/page.tsx
"use client";

import React, { useState } from "react";
import { Mail, Lock, ArrowRight, Timer, User, ChevronDown, ArrowLeft, GraduationCap, BookOpen, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isSignIn, setIsSignIn] = useState(true);
  
  // Multi-step signup state
  const [signUpStep, setSignUpStep] = useState(1);
  
  // ফর্ম স্টেটস
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studyLevel, setStudyLevel] = useState("hsc");

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignIn) {
      console.log("Signing in with:", { email, password });
      // ফায়ারবেস লগইন লজিক এখানে বসবে
    } else {
      if (signUpStep === 1) {
        setSignUpStep(2); // প্রথম ধাপ শেষ হলে দ্বিতীয় ধাপে যাবে
      } else {
        console.log("Final Profile Data:", { name, gender, email, password, studyLevel });
        // ফায়ারবেস সাইন-আপ ও প্রোফাইল সেভ করার লজিক এখানে বসবে
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-[#0f172a] text-white">
      
      {/* Top Logo & Dynamic Welcome Text */}
      <div className="flex flex-col items-center mb-8 text-center mt-10">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20">
          <Timer size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          {isSignIn ? "Welcome Back" : signUpStep === 1 ? "Create an Account" : "Complete Profile"}
        </h2>
        <p className="text-slate-400 text-sm mt-2 max-w-[280px]">
          {isSignIn 
            ? "Enter your details to access your personal study dashboard." 
            : signUpStep === 1 
              ? "Start managing your study time effectively with our premium tools."
              : "Select your current study phase to personalize your dashboard."}
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-sm bg-[#1e293b] rounded-3xl p-6 shadow-xl border border-slate-700/50">
        
        {/* Sign In / Sign Up Toggle (Only show on Step 1) */}
        {(isSignIn || signUpStep === 1) && (
          <div className="flex p-1.5 bg-[#0f172a] rounded-xl mb-8">
            <button
              type="button"
              onClick={() => setIsSignIn(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isSignIn ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignIn(false); setSignUpStep(1); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                !isSignIn ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* ================= STEP 1: Basic Info ================= */}
          {!isSignIn && signUpStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><User size={18} /></div>
                  <input type="text" placeholder="e.g. Asif" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-slate-700/50 rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Gender</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><User size={18} /></div>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className={`w-full pl-11 pr-10 py-3.5 bg-[#0f172a] border border-slate-700/50 rounded-xl text-sm font-medium outline-none appearance-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${gender === "" ? "text-slate-600" : "text-white"}`} required>
                    <option value="" disabled>Select Gender</option>
                    <option value="male" className="text-white">Male</option>
                    <option value="female" className="text-white">Female</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500"><ChevronDown size={18} /></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Mail size={18} /></div>
                  <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-slate-700/50 rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Lock size={18} /></div>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-slate-700/50 rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" required />
                </div>
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-transform active:scale-95 mt-4 shadow-lg shadow-indigo-500/20">
                Next <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ================= STEP 2: Profile Completion (Study Mode) ================= */}
          {!isSignIn && signUpStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1 block text-center mb-4">
                  Select Your Study Goal
                </label>
                
                <button type="button" onClick={() => setStudyLevel("hsc")} className={`w-full flex items-center p-4 rounded-2xl border transition-all ${studyLevel === "hsc" ? "bg-white text-slate-900 border-white shadow-lg" : "bg-[#0f172a] text-slate-300 border-slate-700/50 hover:bg-slate-800"}`}>
                  <BookOpen size={24} className={studyLevel === "hsc" ? "text-indigo-600" : "text-slate-500"} />
                  <div className="ml-4 text-left">
                    <p className="font-extrabold text-sm uppercase tracking-wide">HSC Mode</p>
                    <p className={`text-xs mt-0.5 ${studyLevel === "hsc" ? "text-slate-600" : "text-slate-500"}`}>Board exam preparation</p>
                  </div>
                </button>

                <button type="button" onClick={() => setStudyLevel("mbbs")} className={`w-full flex items-center p-4 rounded-2xl border transition-all ${studyLevel === "mbbs" ? "bg-white text-slate-900 border-white shadow-lg" : "bg-[#0f172a] text-slate-300 border-slate-700/50 hover:bg-slate-800"}`}>
                  <Stethoscope size={24} className={studyLevel === "mbbs" ? "text-indigo-600" : "text-slate-500"} />
                  <div className="ml-4 text-left">
                    <p className="font-extrabold text-sm uppercase tracking-wide">MBBS Mode</p>
                    <p className={`text-xs mt-0.5 ${studyLevel === "mbbs" ? "text-slate-600" : "text-slate-500"}`}>Medical professional studies</p>
                  </div>
                </button>

                <button type="button" onClick={() => setStudyLevel("university")} className={`w-full flex items-center p-4 rounded-2xl border transition-all ${studyLevel === "university" ? "bg-white text-slate-900 border-white shadow-lg" : "bg-[#0f172a] text-slate-300 border-slate-700/50 hover:bg-slate-800"}`}>
                  <GraduationCap size={24} className={studyLevel === "university" ? "text-indigo-600" : "text-slate-500"} />
                  <div className="ml-4 text-left">
                    <p className="font-extrabold text-sm uppercase tracking-wide">University Mode</p>
                    <p className={`text-xs mt-0.5 ${studyLevel === "university" ? "text-slate-600" : "text-slate-500"}`}>Varsity admission prep</p>
                  </div>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSignUpStep(1)} className="p-3.5 bg-slate-800 rounded-xl text-slate-300 hover:bg-slate-700 transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-transform active:scale-95 shadow-lg shadow-indigo-500/20">
                  Complete Profile
                </button>
              </div>
            </div>
          )}

          {/* ================= Sign In Form ================= */}
          {isSignIn && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Mail size={18} /></div>
                  <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-slate-700/50 rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                  <Link href="/forgot-password" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Forgot?</Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Lock size={18} /></div>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-slate-700/50 rounded-xl text-sm font-medium text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" required />
                </div>
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-transform active:scale-95 mt-4 shadow-lg shadow-indigo-500/20">
                Sign In <ArrowRight size={18} />
              </button>
            </div>
          )}
        </form>

        {/* Social Logins (Hide on Step 2 of Sign Up) */}
        {(isSignIn || signUpStep === 1) && (
          <div className="animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center my-7">
              <div className="border-t border-slate-700 w-full absolute"></div>
              <span className="bg-[#1e293b] px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider relative z-10">OR</span>
            </div>

            <div className="space-y-3">
              <button type="button" className="w-full flex items-center justify-center gap-3 bg-transparent border border-slate-700 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95">
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                <span className="text-sm">Continue with Google</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}