// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "./globals.css";
import AuthGate from "./components/shared/AuthGate";
import { ThemeProvider } from "./components/shared/ThemeProvider";
import TopHeader from "./components/shared/TopHeader";
import BottomNav from "./components/shared/BottomNav";
import InstallPrompt from "./components/pwa/InstallPrompt";
import Onboarding from "./components/shared/Onboarding";
import { LangProvider } from "@/lib/i18n";

// ইংরেজি Inter, বাংলা Hind Siliguri (Inter এ বাংলা অক্ষর নেই, তাই পরেরটায় যায়)
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bangla = Hind_Siliguri({ subsets: ["bengali"], weight: ["400", "500", "600", "700"], variable: "--font-bangla" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" }, // iOS Status Bar Match
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Notch/Island সাপোর্ট
};

export const metadata: Metadata = {
  title: "Pomodoro BD",
  description: "Focus timer and study planner for students in Bangladesh",
  applicationName: "Pomodoro BD",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pomodoro BD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${bangla.variable} font-sans antialiased min-h-screen bg-[var(--background)] transition-colors`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LangProvider>
          
          <div className="w-full md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white relative overflow-x-hidden transition-colors flex flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            
            <AuthGate>
            <TopHeader />
            
            <main className="flex-1">
              {children}
            </main>
            
            <Onboarding />
            <InstallPrompt />
            <BottomNav />
            </AuthGate>
            
          </div>
        </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}