"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { useAccount } from "@/app/components/shared/AuthGate";
import { useLang } from "@/lib/i18n";
import { AvatarBadge, loadMyAvatar, type Look } from "@/lib/avatar";
import ProfileForm from "./ProfileForm";
import SettingsPanel from "./SettingsPanel";

// সেটিংস এক শিটে (Money র মতো): ফোনে নিচ থেকে ওঠে, বড় স্ক্রিনে ডান পাশ থেকে আসে। ভেতরে "প্রোফাইল এডিট করো" চাপলে প্রোফাইল।
// যেকোনো জায়গা থেকে useAccountSheet().open("profile" | "settings")।

export type SheetTab = "settings" | "profile";
type Ctx = { open: (tab?: SheetTab) => void };
const SheetContext = createContext<Ctx>({ open: () => undefined });
export const useAccountSheet = () => useContext(SheetContext);

export function AccountSheetProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<SheetTab | null>(null);
  const open = useCallback((t: SheetTab = "settings") => setTab(t), []);
  // লগআউটে /login এ গেলে শিট বন্ধ
  const pathname = usePathname();
  if (tab && pathname === "/login") setTab(null);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <SheetContext.Provider value={value}>
      {children}
      {tab && <AccountSheet tab={tab} setTab={setTab} onClose={() => setTab(null)} />}
    </SheetContext.Provider>
  );
}

const LEVEL: Record<string, [string, string]> = {
  ssc: ["SSC", "SSC"], hsc: ["HSC", "HSC"], admission: ["ভর্তি প্রস্তুতি", "Admission prep"],
  mbbs: ["MBBS", "MBBS"], university: ["বিশ্ববিদ্যালয়", "University"], other: ["অন্যান্য", "Other"],
};

function AccountSheet({ tab, setTab, onClose }: { tab: SheetTab; setTab: (t: SheetTab) => void; onClose: () => void }) {
  const { account } = useAccount();
  const { t } = useLang();
  const name = account?.name || auth.currentUser?.displayName || t("ছাত্র", "Student");
  const level = account?.studyLevel && LEVEL[account.studyLevel];
  const [look, setLook] = useState<Look>({});   // প্রোফাইলে বাছা অবতার (হেডারে দেখাই)
  useEffect(() => { const u = auth.currentUser; if (u) void loadMyAvatar(u.uid).then(setLook); }, []);
  const sub = [level && t(level[0], level[1]), account?.institution].filter(Boolean).join(" · ");

  // খোলা থাকলে পেছনের পাতা স্ক্রল হয় না; Esc চাপলে বন্ধ
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);


  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-stretch md:justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full md:w-[420px] h-[92dvh] md:h-full flex flex-col bg-slate-50 dark:bg-[#0f172a] rounded-t-[28px] md:rounded-none md:rounded-l-[28px] md:pt-[env(safe-area-inset-top)] shadow-2xl border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:slide-in-from-right duration-300 pb-[env(safe-area-inset-bottom)]">
        {/* টেনে নামানোর দাগ (শুধু ফোনে, দেখানোর জন্য) */}
        <div className="md:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/15" />

        <div className="px-5 pt-4 pb-4 flex items-center gap-3.5">
          {tab === "profile" ? (
            <button onClick={() => setTab("settings")} aria-label={t("সেটিংসে ফেরো", "Back to settings")} className="p-2.5 -ml-1 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-white/15 transition-colors active:scale-95">
              <ArrowLeft size={18} />
            </button>
          ) : (
            <AvatarBadge name={name} photo={null} look={look} cls="w-12 h-12 text-xl" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">{tab === "profile" ? t("প্রোফাইল এডিট", "Edit profile") : name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{tab === "profile" ? t("নাম, ছবি আর পড়াশোনার তথ্য", "Name, photo and study info") : sub || t("Shongi Lab অ্যাকাউন্ট", "Shongi Lab account")}</p>
          </div>
          <button onClick={onClose} aria-label={t("বন্ধ করো", "Close")} className="p-2.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-white/15 transition-colors active:scale-95">
            <X size={18} />
          </button>
        </div>

        <div key={tab} className="flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-8 animate-in fade-in duration-200">
          {tab === "settings" ? <SettingsPanel onEditProfile={() => setTab("profile")} /> : <ProfileForm onSaved={() => setTimeout(() => setTab("settings"), 900)} onLook={setLook} />}
        </div>
      </div>
    </div>
  );
}
