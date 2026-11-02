import type { Auth } from 'firebase/auth';

// এক প্রোফাইল (AdMCQ, Pomodoro, Money) থাকে AdMCQ এর ডাটাবেসে; app.admcq.com/api/account থেকে পড়া-লেখা।
// একই Firebase প্রজেক্ট, তাই এখানকার লগইনের টোকেনেই চলে।
// এই ফাইল money-manager-app/app/lib/admcqAccount.ts এও হুবহু আছে; বদলালে দুই জায়গাতেই বদলাও।

export const ADMCQ_URL = (process.env.NEXT_PUBLIC_ADMCQ_URL || 'https://app.admcq.com').replace(/\/$/, '');

export type Account = { name: string; gender: string; studyLevel: string; institution: string; hscBatch: string; phone: string; email: string };
export type AccountResult = { account: Account; complete: { money: boolean; full: boolean } };

async function call(auth: Auth, init: RequestInit = {}): Promise<AccountResult> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');
  const res = await fetch(`${ADMCQ_URL}/api/account`, {
    ...init,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const d = await res.json().catch(() => null);
  if (!d?.success) throw new Error(d?.error || 'Could not reach AdMCQ');
  return { account: d.account, complete: d.complete };
}

export const fetchAccount = (auth: Auth) => call(auth);

export const saveAccount = (auth: Auth, fields: Partial<Omit<Account, 'phone' | 'email'>>) =>
  call(auth, { method: 'PATCH', body: JSON.stringify(fields) });
