"use client";

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import LaunchScreen from './LaunchScreen';
import { auth } from '@/lib/firebaseClient';
import { Account, fetchAccount } from '@/lib/admcqAccount';

// পুরো অ্যাপের পাহারা: লগইন নেই → /login; প্রোফাইল অসম্পূর্ণ (নাম, ছেলে/মেয়ে, পড়ার ধরন, স্কুল/কলেজ) → /profile; নইলে অ্যাপ।
// যাচাই শেষ না হওয়া পর্যন্ত শুধু spinner, তাই ভুল পেজ এক ঝলকও দেখা যায় না।
// AdMCQ এ পৌঁছানো না গেলে আটকাই না (টাইমার চলুক)।

const PUBLIC_PAGES = ['/privacy', '/terms', '/delete-account'];   // লগইন ছাড়াও খোলা যায় (Google যাচাই আর Play Store এর জন্য দরকার)

type Ctx ={ account: Account | null; setAccount: (a: Account) => void; botLinked: boolean };
const AccountContext = createContext<Ctx>({ account: null, setAccount: () => undefined, botLinked: false });
export const useAccount = () => useContext(AccountContext);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [account, setAccount] = useState<Account | null>(null);
  const [botLinked, setBotLinked] = useState(false);
  const [state, setState] = useState<'checking' | 'out' | 'needProfile' | 'ok'>('checking');

  // Firebase লগইন ফিরে আসার অপেক্ষাও করি না: শেষ জানা ব্যবহারকারীর রাখা কপি থাকলে প্রথম মুহূর্তেই অ্যাপ দেখাই,
  // তারপর আসল লগইন যাচাই হয়ে অবস্থা ঠিক করে (লগইন না থাকলে /login এ পাঠায়)
  const cachedRef = useRef(false);
  useEffect(() => {
    try {
      const uid = localStorage.getItem('focus_last_uid');
      const saved = uid ? localStorage.getItem(`focus_account_${uid}`) : null;
      if (saved) {
        const c = JSON.parse(saved) as { account: Account | null; botLinked: boolean; complete: boolean };
        cachedRef.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved copy only exists in the browser
        setAccount(c.account);
        setBotLinked(c.botLinked);
        setState(c.complete ? 'ok' : 'needProfile');
      }
    } catch { /* প্রাইভেট মোড বা ভাঙা লেখা: লগইন যাচাইয়ের পরেই দেখাই */ }

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        cachedRef.current = false;
        try { localStorage.removeItem('focus_last_uid'); } catch { /* সমস্যা নেই */ }
        return setState('out');
      }
      try { localStorage.setItem('focus_last_uid', user.uid); } catch { /* সমস্যা নেই */ }
      try {
        const r = await fetchAccount(auth);
        setAccount(r.account);
        setBotLinked(Boolean(r.botLinks.pomodoro));
        setState(r.complete.full ? 'ok' : 'needProfile');
        try {
          localStorage.setItem(`focus_account_${user.uid}`, JSON.stringify({ account: r.account, botLinked: Boolean(r.botLinks.pomodoro), complete: r.complete.full }));
        } catch { /* জায়গা নেই: সমস্যা নেই */ }
      } catch {
        if (!cachedRef.current) setState('ok');
      }
    });
  }, []);

  // অবস্থা অনুযায়ী ঠিক পেজে পাঠাই। /login নিজেই সামলায় (রেজিস্ট্রেশনের মাঝে OTP তে লগইন হয়ে যায়, তখন সরানো যাবে না)
  const target = state === 'out' ? '/login' : state === 'needProfile' ? '/profile' : null;
  const isPublic = PUBLIC_PAGES.includes(pathname);
  const wrongPage = state !== 'checking' && !isPublic && pathname !== '/login' && target !== null && pathname !== target;
  useEffect(() => {
    if (!wrongPage) return;
    window.location.replace(target || '/');
  }, [wrongPage, target]);

  const value = {
    account,
    setAccount: (a: Account) => {
      setAccount(a);
      setState('ok');
      // প্রোফাইল বদলালে রাখা কপিও বদলাই
      const uid = auth.currentUser?.uid;
      try {
        if (uid) localStorage.setItem(`focus_account_${uid}`, JSON.stringify({ account: a, botLinked, complete: true }));
      } catch { /* সমস্যা নেই */ }
    },
    botLinked,
  };
  if ((state === 'checking' && !isPublic) || wrongPage) return <LaunchScreen />;
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
