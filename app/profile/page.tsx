// src/app/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { User, ChevronDown, Save } from "lucide-react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["SSC", "HSC", "Admission", "Medical", "Varsity", "MBBS"];

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("Asif"); 
  const [gender, setGender] = useState("male");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["HSC"]);
  const [isSaved, setIsSaved] = useState(false);

  // পেজ লোড হলে LocalStorage থেকে আগের সেভ করা ক্যাটাগরি আনবে
  useEffect(() => {
    const savedCats = localStorage.getItem("pomodoro_categories");
    if (savedCats) {
      setSelectedCategories(JSON.parse(savedCats));
    }
  }, []);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // LocalStorage এ ক্যাটাগরি সেভ করছি যাতে ড্যাশবোর্ড এটা পড়তে পারে
    localStorage.setItem("pomodoro_categories", JSON.stringify(selectedCategories));
    setIsSaved(true);
    
    // ১ সেকেন্ড পর ড্যাশবোর্ডে নিয়ে যাবে
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  return (
    <div className="px-5 pt-6 pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Your Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Customize your study experience.</p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Basic Info</h2>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><User size={18} /></div>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 outline-none transition-all" required />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Study Category</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  selectedCategories.includes(cat) 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                    : "bg-slate-100 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 ${isSaved ? "bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none"}`}>
          <Save size={18} /> {isSaved ? "Saved!" : "Save Profile Changes"}
        </button>
      </form>
    </div>
  );
}