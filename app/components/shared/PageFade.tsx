"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

// পাতা বদলালে নতুন পাতা হালকা fade হয়ে আসে (transform নয়: ভেতরের fixed পর্দাগুলো ঠিক জায়গায় থাকে)
// অ্যাপ প্রথম খোলার সময় fade নেই (খোলার সময়ই পাতা এক পলক ফাঁকা দেখাত); শুধু পরে পাতা বদলালে।
export default function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [first] = useState(pathname);
  const animate = pathname !== first;
  return (
    <div key={pathname} className={animate ? "animate-in fade-in duration-300 motion-reduce:animate-none" : undefined}>
      {children}
    </div>
  );
}
