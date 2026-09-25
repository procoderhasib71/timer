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
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Pomodoro Focus BD",
  description: "Advanced study timer for students",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default", // black-translucent এর বদলে default দিলে এটি theme-color ফলো করবে
    title: "Focus BD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-slate-50 dark:bg-[#0f172a]">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* সাফারির উপরের বারের কালার ফোর্স করার জন্য সরাসরি মেটা ট্যাগ */}
        <meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={`${inter.className} bg-slate-50 dark:bg-[#0f172a] transition-colors antialiased min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          
          <div className="w-full md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white relative overflow-x-hidden transition-colors flex flex-col shadow-2xl pt-[env(safe-area-inset-top)]">
            
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