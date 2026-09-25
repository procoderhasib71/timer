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
  // এই কালারটি আইফোনের উপরের স্ট্যাটাস বারের সাথে ম্যাচ করবে
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // আইফোনের এজ-টু-এজ স্ক্রিন কভার করার জন্য
};

export const metadata: Metadata = {
  title: "Pomodoro Focus BD",
  description: "Advanced study timer for students",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // স্ট্যাটাস বার ট্রান্সপারেন্ট করে ব্যাকগ্রাউন্ডের সাথে মিশিয়ে দেবে
    title: "Focus BD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // html ট্যাগে সরাসরি ডার্ক কালার দেওয়া হয়েছে যাতে একদম উপরের অংশ কালো না থাকে
    <html lang="en" suppressHydrationWarning className="bg-slate-50 dark:bg-[#0f172a]">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-slate-50 dark:bg-[#0f172a] transition-colors antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          
          {/* pt-[env(safe-area-inset-top)] যুক্ত করা হয়েছে যাতে ব্যাটারি/নেটওয়ার্ক আইকনের সাথে কন্টেন্ট ওভারল্যাপ না হয় */}
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