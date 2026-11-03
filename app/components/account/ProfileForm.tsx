"use client";

import React, { useState } from "react";
import { User, Save, School, Loader2, Check } from "lucide-react";
// @ts-ignore: Bypassing implicit any error for production build
import { auth } from "@/lib/firebaseClient";
import { saveAccount } from "@/lib/admcqAccount";
import { useAccount } from "@/app/components/shared/AuthGate";
import BotLink from "@/app/components/shared/BotLink";
import { useLang } from "@/lib/i18n";

// প্রোফাইল AdMCQ আর Money এর সাথে এক (AdMCQ এর ডাটাবেসে থাকে); অন্য জায়গায় পূরণ করা থাকলে এখানে আগে থেকেই বসানো।
const LEVELS: [string, string, string][] = [
  ["ssc", "SSC", "SSC"], ["hsc", "HSC", "HSC"], ["admission", "ভর্তি প্রস্তুতি", "Admission prep"], ["mbbs", "MBBS", "MBBS"], ["university", "বিশ্ববিদ্যালয়", "University"], ["other", "অন্যান্য", "Other"],
];

const box = "bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4";
const label = "text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1";
const input = "w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 outline-none transition-all";
const chip = (on: boolean) => `px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${on
  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
  : "bg-slate-100 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`;

// onSaved না দিলে (প্রথমবার /profile পাতা) রাখার পরে হোমে যাই; শিটে থাকলে শিটেই "রাখা হলো" দেখাই
export default function ProfileForm({ onSaved }: { onSaved?: () => void }) {
  const { account, setAccount, botLinked } = useAccount();
  const { t } = useLang();
  const [f, setF] = useState({
    name: account?.name || auth.currentUser?.displayName || "",
    gender: account?.gender || "",
    studyLevel: account?.studyLevel || "",
    institution: account?.institution || "",
    hscBatch: account?.hscBatch || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const firstTime = !(account?.name && account.gender && account.studyLevel && account.institution);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.gender) return setError(t("ছেলে না মেয়ে বাছাই করো।", "Please choose male or female."));
    if (!f.studyLevel) return setError(t("কী পড়ো বাছাই করো।", "Please choose what you study."));
    setBusy(true);
    try {
      const r = await saveAccount(auth, f);
      setAccount(r.account);
      if (!onSaved) return window.location.replace("/");
      setBusy(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("রাখা গেল না।", "Could not save."));
      setBusy(false);
    }
  };

  return (
    <div>
      <div className={onSaved ? "hidden" : "mb-8"}>
        <h1 className="text-2xl font-extrabold tracking-tight">{firstTime ? t("প্রোফাইলটা পূরণ করো", "Complete your profile") : t("তোমার প্রোফাইল", "Your Profile")}</h1>
        <p className="text-slate-400 text-sm mt-1">{t("Shonghi Lab এর সব অ্যাপে একই প্রোফাইল।", "One profile for every Shonghi Lab app.")}</p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className={box}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("সাধারণ তথ্য", "Basic Info")}</h2>
          <div className="space-y-1.5">
            <label className={label}>{t("পুরো নাম", "Full Name")}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><User size={18} /></div>
              <input type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} placeholder={t("যেমন: রাফি আহমেদ", "e.g. Rafi Ahmed")} required minLength={2} />
            </div>
          </div>
          <div className="space-y-1.5">
            <span className={label}>{t("ছেলে/মেয়ে", "Gender")}</span>
            <div className="flex gap-2.5">
              {[["male", t("ছেলে", "Male")], ["female", t("মেয়ে", "Female")]].map(([id, text]) => (
                <button key={id} type="button" onClick={() => setF({ ...f, gender: id })} className={chip(f.gender === id)}>{text}</button>
              ))}
            </div>
          </div>
        </div>

        <div className={box}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("পড়াশোনা", "Study")}</h2>
          <div className="flex flex-wrap gap-2.5">
            {LEVELS.map(([id, bn, en]) => (
              <button key={id} type="button" onClick={() => setF({ ...f, studyLevel: id })} className={chip(f.studyLevel === id)}>{t(bn, en)}</button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className={label}>{t("স্কুল / কলেজ / বিশ্ববিদ্যালয়", "School / College / University")}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><School size={18} /></div>
              <input type="text" value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} className={input} placeholder={t("যেমন: ঢাকা কলেজ", "e.g. Dhaka College")} required minLength={2} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={label}>{t("HSC ব্যাচ (না দিলেও চলে)", "HSC batch (optional)")}</label>
            <input type="text" inputMode="numeric" maxLength={4} value={f.hscBatch} onChange={(e) => setF({ ...f, hscBatch: e.target.value.replace(/\D/g, "") })}
              className={input.replace("pl-11", "pl-4")} placeholder="2026" />
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
        <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none disabled:opacity-70">
          {busy ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <Save size={18} />} {saved ? t("রাখা হলো", "Saved") : firstTime ? t("রেখে এগিয়ে যাও", "Save and continue") : t("প্রোফাইল রাখো", "Save Profile Changes")}
        </button>
      </form>

      {!firstTime && (
        <div className={`${box} mt-6`}>
          <BotLink auth={auth} app="pomodoro" linked={botLinked} text={t("টাইমার শেষ হলে আর টাস্কের সময়ে Telegram এ মেসেজ পাবে, অ্যাপ বন্ধ থাকলেও।", "Get a Telegram message when your timer ends or a task is due, even if this app is closed.")} />
        </div>
      )}
    </div>
  );
}
