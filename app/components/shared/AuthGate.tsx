"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
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

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setState('out');
    try {
      const r = await fetchAccount(auth);
      setAccount(r.account);
      setBotLinked(Boolean(r.botLinks.pomodoro));
      setState(r.complete.full ? 'ok' : 'needProfile');
    } catch {
      setState('ok');
    }
  }), []);

  // অবস্থা অনুযায়ী ঠিক পেজে পাঠাই। /login নিজেই সামলায় (রেজিস্ট্রেশনের মাঝে OTP তে লগইন হয়ে যায়, তখন সরানো যাবে না)
  const target = state === 'out' ? '/login' : state === 'needProfile' ? '/profile' : null;
  const isPublic = PUBLIC_PAGES.includes(pathname);
  const wrongPage = state !== 'checking' && !isPublic && pathname !== '/login' && target !== null && pathname !== target;
  useEffect(() => {
    if (!wrongPage) return;
    window.location.replace(target || '/');
  }, [wrongPage, target]);

  const value = { account, setAccount: (a: Account) => { setAccount(a); setState('ok'); }, botLinked };
  if ((state === 'checking' && !isPublic) || wrongPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
