// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AuthGate from "./components/shared/AuthGate";
import { ThemeProvider } from "./components/shared/ThemeProvider";
import TopHeader from "./components/shared/TopHeader";
import BottomNav from "./components/shared/BottomNav";
import InstallPrompt from "./components/pwa/InstallPrompt";
import PwaRegistry from "./components/pwa/PwaRegistry";
import OfflineBanner from "./components/pwa/OfflineBanner";
import Onboarding from "./components/shared/Onboarding";
import { AccountSheetProvider } from "./components/account/AccountSheet";
import PageFade from "./components/shared/PageFade";
import { LangProvider } from "@/lib/i18n";

// ইংরেজি Plus Jakarta Sans (সংখ্যা আর শিরোনামে ঝকঝকে), বাংলা Noto Sans Bengali (প্রথমটায় বাংলা অক্ষর নেই, তাই পরেরটায় যায়)।
// আগে Hind Siliguri ছিল: সেটার ৪০০ আর ৬০০ ওজনে "১" অঙ্কটা ছোট আর নিচু আঁকা হয় (১৫ দেখায় ৽৫), তাই বদলেছি
const inter = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-inter" });
const bangla = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bangla" });

// Money অ্যাপের মতো: উপরের বারের রং ফোনের লাইট/ডার্ক অনুযায়ী
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Notch/Island সাপোর্ট
};

// iOS এ হোম স্ক্রিন থেকে খুললে প্রথমে এই ছবি দেখায় (public/splash); না থাকলে সাদা বা কালো ঝলক আসে।
// প্রতিটা iPhone/iPad এর মাপে light আর dark দুটো। Money অ্যাপের সাথে একই ব্যবস্থা।
const SPLASH_SIZES: [number, number, number][] = [
  [440, 956, 3], [430, 932, 3], [402, 874, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
  [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [768, 1024, 2],
];
const startupImage = SPLASH_SIZES.flatMap(([w, h, r]) =>
  (["light", "dark"] as const).map((theme) => ({
    url: `/splash/${theme}-${w * r}x${h * r}.png`,
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
  })),
);

export const metadata: Metadata = {
  title: "Shongi Focus",
  description: "Focus timer and study planner for students in Bangladesh",
  applicationName: "Shongi Focus",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",   // অ্যাপ স্ট্যাটাস বারের নিচ পর্যন্ত; হেডারের উপরের padding নচের জায়গা রাখে
    title: "Shongi Focus",
    startupImage,
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
        {/* CSS আসার আগেও পটভূমি থিমের রঙে থাকে, তাই খোলার সময় সাদা ঝলক আসে না */}
        <style>{`html{background:#f8fafc}@media (prefers-color-scheme:dark){html{background:#0f172a}}html.dark{background:#0f172a}html.light{background:#f8fafc}`}</style>
      </head>
      <body className={`${inter.variable} ${bangla.variable} font-sans antialiased min-h-screen bg-[var(--background)]`}>
        <PwaRegistry />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LangProvider>
          
          <div className="w-full md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white relative overflow-x-hidden flex flex-col shadow-2xl pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
            
            <AuthGate>
            <AccountSheetProvider>
            <TopHeader />
            <OfflineBanner />
            
            <main className="flex-1">
              <PageFade>{children}</PageFade>
            </main>
            
            <Onboarding />
            <InstallPrompt />
            <BottomNav />
            </AccountSheetProvider>
            </AuthGate>
            
          </div>
        </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}