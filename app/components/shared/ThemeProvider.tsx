// src/app/components/shared/ThemeProvider.tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

// Safari র উপরের বারের রং (theme-color) ফোনের সেটিং দেখে বসানো থাকে; অ্যাপের থিম বদলালে সেটাও মিলিয়ে দিই (লগইন সব সময় ডার্ক)
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  React.useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvedTheme === "dark" || pathname === "/login" ? "#0f172a" : "#f8fafc";
    // শুধু content বদলালে iPhone Safari অনেক সময় পুরনো রং রেখে দেয়; তাই পুরনো ট্যাগ সরিয়ে নতুন ট্যাগ বসাই
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
  }, [resolvedTheme, pathname]);
  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}><ThemeColorSync />{children}</NextThemesProvider>;
}
