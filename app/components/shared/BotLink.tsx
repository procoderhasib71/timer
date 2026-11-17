"use client";
import { useState } from 'react';
import { ChevronRight, Loader2, Send } from 'lucide-react';
import type { Auth } from 'firebase/auth';
import { botLinkUrl, type BotApp } from '@/lib/admcqAccount';
import { useLang } from '@/lib/i18n';

// এই অ্যাপকে মাছরাঙা বটের সাথে যুক্ত করা: সেটিংসে "প্রোফাইল এডিট" এর মতোই একটা সাধারণ সারি।
// লিংক আনতে সার্ভারে যেতে হয়, আর অপেক্ষার পরে নতুন ট্যাব খুললে ফোনের ব্রাউজার আটকায়, তাই দুই চাপ: সারি চাপো → "Telegram খোলো"।
// এই ফাইল money-manager-app/app/components/BotLink.tsx (শুধু ইংরেজি) এও আছে; বদলালে দুই জায়গাতেই বদলাও।
export default function BotLink({ auth, app, linked, text }: { auth: Auth; app: BotApp; linked: boolean; text: string }) {
  const { t } = useLang();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const getLink = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setUrl(await botLinkUrl(auth, app));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('লিংক বানানো গেল না।', 'Could not create a link.'));
    }
    setBusy(false);
  };

  const icon = (
    <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">
      {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
    </div>
  );

  return (
    <div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => setUrl(''), 1000)}
          className="flex items-center justify-between py-3.5 px-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors">
          <div className="flex items-center gap-4 pl-1">
            {icon}
            <span className="text-[15px] font-bold text-sky-700 dark:text-sky-300">{t('Telegram খুলে Start চাপো', 'Open Telegram, tap Start')}</span>
          </div>
          <ChevronRight size={18} className="text-sky-500 mr-1" />
        </a>
      ) : (
        <button type="button" onClick={getLink} title={text}
          className="w-full flex items-center justify-between py-3.5 px-2 group cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left">
          <div className="flex items-center gap-4 pl-1 min-w-0">
            {icon}
            <span className="text-[15px] font-medium text-slate-800 dark:text-slate-200 truncate">{t('মাছরাঙা বট', 'Machranga bot')}</span>
          </div>
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${linked ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10'}`}>
              {linked ? t('যুক্ত ✓', 'Linked ✓') : t('যুক্ত করো', 'Connect')}
            </span>
            <ChevronRight size={18} className="text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
          </div>
        </button>
      )}
      {error && <p className="text-sm font-semibold text-rose-500 px-2 pt-1">{error}</p>}
    </div>
  );
}
