"use client";
import { useEffect } from "react";

// সার্ভিস ওয়ার্কার নিজে রেজিস্টার করি, যাতে নেট ছাড়াও অ্যাপ খোলে।
// নতুন version এলে: অ্যাপ সামনে এলেই খুঁজি, আর নতুনটা চালু হলে একবার reload (নইলে iPhone এ পুরনোটাই থেকে যেত)
export default function PwaRegistry() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    const onChange = () => {
      if (!hadController || reloaded) return;   // প্রথমবার বসানোর সময় reload দরকার নেই
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker.register("/sw.js").then((r) => { reg = r; }).catch(() => undefined);
    const onVisible = () => { if (document.visibilityState === "visible") reg?.update().catch(() => undefined); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
