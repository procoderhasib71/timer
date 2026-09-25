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
  viewportFit: "cover", // iOS-এর ফুল-স্ক্রিন এবং সেফ এরিয়া কভার করার জন্য
};

export const metadata: Metadata = {
  title: "Pomodoro Focus BD",
  description: "Advanced study timer for students",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // স্ট্যাটাস বার ট্রান্সপারেন্ট করে ফুল-স্ক্রিন ফিল দেওয়ার জন্য
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
      {/* ব্যাকগ্রাউন্ড ক্লাসগুলো সরাসরি body তে দেওয়া হয়েছে সাফারির গ্যাপ এড়ানোর জন্য */}
      <body className={`${inter.className} bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="max-w-xl mx-auto relative overflow-x-hidden min-h-[100dvh] flex flex-col">
            <TopHeader />
            
            {/* বটম ন্যাভের সাথে ওভারল্যাপ এড়াতে safe-area-inset-bottom যুক্ত করা হয়েছে */}
            <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))]">
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