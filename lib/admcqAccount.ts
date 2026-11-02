import type { Auth } from 'firebase/auth';

// এক প্রোফাইল (AdMCQ, Pomodoro, Money) থাকে AdMCQ এর ডাটাবেসে; app.admcq.com/api/account থেকে পড়া-লেখা।
// একই Firebase প্রজেক্ট, তাই এখানকার লগইনের টোকেনেই চলে। মাছরাঙা বটের সাথে যুক্ত করাও AdMCQ এর মাধ্যমে।
// এই ফাইল money-manager-app/app/lib/admcqAccount.ts এও হুবহু আছে; বদলালে দুই জায়গাতেই বদলাও।

export const ADMCQ_URL = (process.env.NEXT_PUBLIC_ADMCQ_URL || 'https://app.admcq.com').replace(/\/$/, '');
export const BOT_URL = 'https://t.me/Machranga_ai_bot';

export type Account = { name: string; gender: string; studyLevel: string; institution: string; hscBatch: string; phone: string; email: string };
export type AccountResult = { account: Account; complete: { money: boolean; full: boolean }; botLinked: boolean };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(auth: Auth, path: string, init: RequestInit = {}): Promise<any> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');
  const res = await fetch(`${ADMCQ_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const d = await res.json().catch(() => null);
  if (!d?.success) throw new Error(d?.error || 'Could not reach AdMCQ');
  return d;
}

const asResult = (d: AccountResult): AccountResult => ({ account: d.account, complete: d.complete, botLinked: Boolean(d.botLinked) });

export const fetchAccount = async (auth: Auth) => asResult(await call(auth, '/api/account'));

export const saveAccount = async (auth: Auth, fields: Partial<Omit<Account, 'phone' | 'email'>>) =>
  asResult(await call(auth, '/api/account', { method: 'PATCH', body: JSON.stringify(fields) }));

/** বটের সাথে যুক্ত করার লিংক (১৫ মিনিট চলে): খুলে Start চাপলেই বট যুক্ত করে নেয় */
export const botLinkUrl = async (auth: Auth) => `${BOT_URL}?start=${(await call(auth, '/api/me/link-code', { method: 'POST', body: '{}' })).code}`;

/** Pomodoro টাইমার কখন শেষ হবে বটকে জানায় (endAt null = বাতিল); বটে যুক্ত না থাকলে কিছু হয় না */
export const botTimer = (auth: Auth, endAt: number | null, mode: string) =>
  call(auth, '/api/bot/timer', { method: 'POST', body: JSON.stringify({ endAt, mode }) }).catch(() => undefined);
