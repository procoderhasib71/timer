import type { Auth } from 'firebase/auth';

// এক প্রোফাইল (AdMCQ, Pomodoro, Money) থাকে AdMCQ এর ডাটাবেসে; app.admcq.com/api/account থেকে পড়া-লেখা।
// একই Firebase প্রজেক্ট, তাই এখানকার লগইনের টোকেনেই চলে। মাছরাঙা বটের সাথে যুক্ত করাও AdMCQ এর মাধ্যমে।
// এই ফাইল money-manager-app/app/lib/admcqAccount.ts এও হুবহু আছে; বদলালে দুই জায়গাতেই বদলাও।

export const ADMCQ_URL = (process.env.NEXT_PUBLIC_ADMCQ_URL || 'https://app.admcq.com').replace(/\/$/, '');
export const BOT_URL = 'https://t.me/Machranga_ai_bot';

export type Account = { name: string; gender: string; studyLevel: string; institution: string; hscBatch: string; phone: string; email: string };
export type BotApp = 'money' | 'pomodoro';
// botLinks: কোন অ্যাপ বটে যুক্ত (প্রতিটা অ্যাপ আলাদা করে যুক্ত হয়; medical = AdMCQ)
export type AccountResult = { account: Account; complete: { money: boolean; full: boolean }; botLinks: Record<string, boolean> };

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
  if (!d?.success) throw new Error(d?.error || 'Could not reach the account server');
  return d;
}

const asResult = (d: AccountResult): AccountResult => ({ account: d.account, complete: d.complete, botLinks: d.botLinks || {} });

export const fetchAccount = async (auth: Auth) => asResult(await call(auth, '/api/account'));

export const saveAccount = async (auth: Auth, fields: Partial<Omit<Account, 'phone' | 'email'>>) =>
  asResult(await call(auth, '/api/account', { method: 'PATCH', body: JSON.stringify(fields) }));

/** এই অ্যাপকে বটের সাথে যুক্ত করার লিংক (১৫ মিনিট চলে): খুলে Start চাপলেই বট যুক্ত করে নেয় */
export const botLinkUrl = async (auth: Auth, app: BotApp) =>
  `${BOT_URL}?start=${(await call(auth, '/api/me/link-code', { method: 'POST', body: JSON.stringify({ app }) })).code}`;

// অ্যাপ আর বট একই টাইমার দেখে: অ্যাপ বদলালে push, বটের বদল দেখতে pull (বটে যুক্ত না থাকলে কিছু হয় না)
export type TimerPush = {
  endAt: number | null; mode: string; timeLeft: number; initial: number; taskId: string | null; taskTitle: string | null;
  lengths: { focus: number; short: number; long: number };
};
export type RemoteTimer = { mode: string; end_at: number | null; time_left: number; initial: number; task_id: string | null; source: string; updated_at: number };
export type BotSession = { id: number; minutes: number; mode: string; task_id: string | null; task_title: string | null; completed: number; ended_at: number };

/** টাইমারের বদল বটকে জানাই (শেষ হলে Telegram এ মেসেজও এখান থেকে); ফেরত দেয় কখন রাখা হলো */
export const botTimerPush = async (auth: Auth, s: TimerPush): Promise<number | null> =>
  (await call(auth, '/api/bot/timer', { method: 'POST', body: JSON.stringify(s) }).catch(() => null))?.updatedAt ?? null;

/** বট থেকে করা বদলসহ এখনকার টাইমার, আর বটের চালানো যে সেশন এখনো হিসাবে ওঠেনি */
export const botTimerPull = async (auth: Auth): Promise<{ timer: RemoteTimer | null; sessions: BotSession[] } | null> => {
  const d = await call(auth, '/api/bot/timer', { method: 'POST', body: JSON.stringify({ action: 'pull' }) }).catch(() => null);
  return d?.linked ? { timer: d.timer ?? null, sessions: d.sessions || [] } : null;
};

/** Pomodoro টাস্কের রিমাইন্ডার বটে রাখে (time null = বাতিল); Pomodoro বটে যুক্ত না থাকলে কিছু হয় না */
export const botReminder = (auth: Auth, r: { ref: string; title: string; time: string | null; day: 'today' | 'tomorrow'; repeat: string }) =>
  call(auth, '/api/bot/reminder', { method: 'POST', body: JSON.stringify(r) }).catch(() => undefined);
