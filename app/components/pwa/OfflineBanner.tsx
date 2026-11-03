"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useLang } from "@/lib/i18n";

// নেট না থাকলে উপরে লাল দাগ; iPhone এ অ্যাপ সামনে এলে আবার দেখি (online/offline ইভেন্ট সেখানে মাঝে মাঝে আসে না)
export default function OfflineBanner() {
  const { t } = useLang();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const check = () => setOffline(!navigator.onLine);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="px-5 pb-2">
      <div className="bg-rose-500 text-white text-xs font-bold text-center py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2">
        <WifiOff size={14} />
        <span>{t("নেট নেই: টাইমার চলবে, নেট এলে সব মিলে যাবে", "Offline: the timer works, data syncs when you reconnect")}</span>
      </div>
    </div>
  );
}
