import type { ReactNode } from 'react';

export const CONTACT_URL = 'https://t.me/Machranga_ai_bot';

/** Privacy আর Terms এর একই চেহারা; লগইন ছাড়াও খোলা যায় */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="px-6 pt-2 pb-32 max-w-xl mx-auto text-sm leading-relaxed text-slate-700 dark:text-slate-300 space-y-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:pt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline [&_code]:bg-slate-100 dark:[&_code]:bg-slate-800 [&_code]:px-1 [&_code]:rounded">
      <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
      <p className="text-xs text-slate-500 dark:text-slate-400">সর্বশেষ আপডেট: {updated}</p>
      {children}
    </article>
  );
}
