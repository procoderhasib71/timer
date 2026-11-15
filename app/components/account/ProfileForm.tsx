"use client";

import React, { useEffect, useState } from "react";
import { User, Save, School, Loader2, Check } from "lucide-react";
import { auth } from "@/lib/firebaseClient";
import { saveAccount } from "@/lib/admcqAccount";
import { useAccount } from "@/app/components/shared/AuthGate";
import BotLink from "@/app/components/shared/BotLink";
import { useLang } from "@/lib/i18n";
import { AVATARS, COLORS, AvatarBadge, loadMyAvatar, saveMyAvatar, syncAvatarToGroups, type Look } from "@/lib/avatar";

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
export default function ProfileForm({ onSaved, onLook }: { onSaved?: () => void; onLook?: (l: Look) => void }) {
  const { account, setAccount, botLinked } = useAccount();
  const { t } = useLang();
  const [f, setF] = useState({
    name: account?.name || auth.currentUser?.displayName || "",
    gender: account?.gender || "",
    studyLevel: account?.studyLevel || "",
    institution: account?.institution || "",
    hscBatch: account?.hscBatch || "",
  });
  const [look, setLookState] = useState<Look>({});
  const setLook = (l: Look) => { setLookState(l); onLook?.(l); };   // বাছার সাথে সাথে হেডারের অবতারও বদলায়
  const [savedLook, setSavedLook] = useState<Look>({});   // শেষবার রাখা অবতার: বদলালে তবেই গ্রুপগুলোতে ছড়াই
  useEffect(() => { const u = auth.currentUser; if (u) void loadMyAvatar(u.uid).then((l) => { setLookState(l); setSavedLook(l); }); }, []);
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
      const u = auth.currentUser;
      if (u) {
        await saveMyAvatar(u.uid, look).catch(() => undefined);
        if ((look.avatar || "") !== (savedLook.avatar || "") || (look.avatar && look.avColor !== savedLook.avColor)) {
          void syncAvatarToGroups(u.uid, look);
          setSavedLook(look);
        }
      }
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
        <p className="text-slate-400 text-sm mt-1">{t("Shongi Lab এর সব অ্যাপে একই প্রোফাইল।", "One profile for every Shongi Lab app.")}</p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className={box}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("অবতার", "Avatar")}</h2>
          <div className="flex justify-center"><AvatarBadge name={f.name || "?"} photo={auth.currentUser?.photoURL} look={look} cls="w-20 h-20 text-3xl" /></div>
          <div className="grid grid-cols-7 gap-2">
            <button type="button" onClick={() => setLook({ ...look, avatar: "" })} className={`aspect-square rounded-xl flex items-center justify-center text-[10px] font-extrabold transition-all ${!look.avatar ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-900/80"}`}>{t("ছবি", "Photo")}</button>
            {AVATARS.map((e) => (
              <button key={e} type="button" onClick={() => setLook({ avatar: e, avColor: look.avColor || "indigo" })} className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${look.avatar === e ? "bg-indigo-100 dark:bg-indigo-500/25 ring-2 ring-indigo-500 scale-105" : "bg-slate-100 dark:bg-slate-900/80"}`}>{e}</button>
            ))}
          </div>
          {look.avatar && (
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(COLORS).map(([k, [from, to]]) => (
                <button key={k} type="button" onClick={() => setLook({ ...look, avColor: k })} aria-label={k} className={`w-7 h-7 rounded-full transition-transform ${(look.avColor || "indigo") === k ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-white/60 ring-offset-white dark:ring-offset-slate-800 scale-110" : ""}`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-400">{t("কমিউনিটি গ্রুপে ঢুকলে এই অবতারটাই দেখাবে, পরে বদলালে সব গ্রুপেই বদলে যাবে। \"ছবি\" বাছলে Google ছবি বা নামের প্রথম অক্ষর।", "This shows up in your community groups, and changing it updates all of them. \"Photo\" uses your Google picture or initial.")}</p>
        </div>

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
