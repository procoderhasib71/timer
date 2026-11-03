"use client";
import { useEffect } from "react";

// Money অ্যাপের মতো: সার্ভিস ওয়ার্কার নিজে রেজিস্টার করি, যাতে নেট ছাড়াও অ্যাপ খোলে
export default function PwaRegistry() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
