// src/components/pwa/InstallPrompt.tsx
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function InstallPrompt() {
  const { t } = useLang();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // ব্রাউজারের ডিফল্ট প্রম্পট আটকে দেওয়া হলো
      e.preventDefault();
      // ইভেন্টটি সেভ করে রাখছি যাতে পরে ট্রিগার করা যায়
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
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
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-indigo-600 text-white p-4 rounded-2xl shadow-xl z-50 flex items-center justify-between transition-all">
      <div className="flex flex-col">
        <span className="font-bold text-sm">{t("Shonghi Focus ইনস্টল করো", "Install Shonghi Focus")}</span>
        <span className="text-[10px] opacity-80">{t("হোম স্ক্রিনে রাখো, অ্যাপের মতো খুলবে", "Add it to your home screen like an app")}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleInstall}
          className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
        >
          {t("ইনস্টল", "Install")}
        </button>
        <button onClick={() => setShowPrompt(false)} className="p-1 opacity-70 hover:opacity-100 transition-opacity">
          <X size={20} />
        </button>
      </div>
    </div>
  );
}