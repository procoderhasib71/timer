// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/shared/ThemeProvider";
import TopHeader from "./components/shared/TopHeader";
import BottomNav from "./components/shared/BottomNav";
import InstallPrompt from "./components/pwa/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // ✅ ফুল-স্ক্রিন কভার করবে
};

export const metadata: Metadata = {
  title: "Pomodoro Focus BD",
  description: "Advanced study timer for students",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // ✅ স্ট্যাটাস বারের কালো গ্যাপ সরাবে
    title: "Focus BD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-slate-50 dark:bg-[#0f172a] transition-colors antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* ✅ আপনার রেফারেন্স অ্যাপের মতো মাস্টার র‍্যাপার */}
          <div className="max-w-xl mx-auto min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white relative overflow-x-hidden transition-colors flex flex-col">
            
            <TopHeader />
            
            <main className="flex-1">
              {children}
            </main>
            
            <InstallPrompt />
            <BottomNav />
            
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}