// src/components/pwa/InstallPrompt.tsx
"use client";

import { useState, useEffect } from "react";
import { PlusSquare, Share, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

// Chrome/Android এর "ইনস্টল করো" ইভেন্ট (TypeScript এ এর টাইপ নেই)
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

// iPhone/iPad এ Safari নিজে থেকে ইনস্টলের প্রস্তাব দেয় না (beforeinstallprompt নেই),
// তাই সেখানে "Share → Add to Home Screen" এর নির্দেশনা দেখাই। iPadOS এর Safari নিজেকে Mac বলে,
// টাচস্ক্রিন দেখে চিনি। একবার কেটে দিলে আর দেখাই না।
const DISMISS_KEY = "focus_install_dismissed";

export default function InstallPrompt() {
  const { t } = useLang();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [ios, setIos] = useState<"iphone" | "ipad" | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as Navigator & { standalone?: boolean }).standalone;
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* প্রাইভেট মোড */ }
    if (standalone || dismissed) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ipad = /ipad/.test(ua) || (/macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const iphone = /iphone|ipod/.test(ua);
    if (ipad || iphone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- device type only exists in the browser
      setIos(ipad ? "ipad" : "iphone");
      setShowPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      // ব্রাউজারের ডিফল্ট প্রম্পট আটকে দেওয়া হলো
      e.preventDefault();
      // ইভেন্টটি সেভ করে রাখছি যাতে পরে ট্রিগার করা যায়
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    setShowSteps(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* প্রাইভেট মোড */ }
  };

  const handleInstall = async () => {
    if (ios) return setShowSteps(true);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <>
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-indigo-600 text-white p-4 rounded-2xl shadow-xl z-50 flex items-center justify-between transition-all">
        <div className="flex flex-col">
          <span className="font-bold text-sm">{t("Shongi Focus ইনস্টল করো", "Install Shongi Focus")}</span>
          <span className="text-[10px] opacity-80">{t("হোম স্ক্রিনে রাখো, অ্যাপের মতো খুলবে", "Add it to your home screen like an app")}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleInstall}
            className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
          >
            {t("ইনস্টল", "Install")}
          </button>
          <button onClick={dismiss} aria-label={t("বন্ধ করো", "Close")} className="p-1 opacity-70 hover:opacity-100 transition-opacity">
            <X size={20} />
          </button>
        </div>
      </div>

      {showSteps && ios ? (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowSteps(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {ios === "ipad" ? t("iPad এ ইনস্টল", "Install on iPad") : t("iPhone এ ইনস্টল", "Install on iPhone")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {t("Apple নিজে থেকে ইনস্টল করতে দেয় না। দুই ধাপে হোম স্ক্রিনে রাখো:", "Apple does not allow automatic install. Add it to your home screen in two steps:")}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl"><Share size={20} /></div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {ios === "ipad"
                    ? t("১. Safari র উপরে ডানে Share বোতাম চাপো", "1. Tap Share at the top right of Safari")
                    : t("১. Safari র নিচে Share বোতাম চাপো", "1. Tap Share at the bottom of Safari")}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl"><PlusSquare size={20} /></div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("২. নিচে নেমে \"Add to Home Screen\" চাপো", "2. Scroll down and tap \"Add to Home Screen\"")}
                </p>
              </div>
            </div>
            <button onClick={dismiss} className="mt-5 w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold active:scale-[0.98] transition-transform">
              {t("বুঝেছি", "Got it")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
