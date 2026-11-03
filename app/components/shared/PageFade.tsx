"use client";

import { usePathname } from "next/navigation";

// পাতা বদলালে নতুন পাতা হালকা fade হয়ে আসে (transform নয়: ভেতরের fixed পর্দাগুলো ঠিক জায়গায় থাকে)
export default function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-in fade-in duration-300 motion-reduce:animate-none">
      {children}
    </div>
  );
}
