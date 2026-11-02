"use client";
import { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import type { Auth } from 'firebase/auth';
import { botLinkUrl, type BotApp } from '@/lib/admcqAccount';
import { useLang } from '@/lib/i18n';

// এই অ্যাপকে মাছরাঙা বটের সাথে যুক্ত করা। প্রতিটা অ্যাপ আলাদা করে যুক্ত হয়, বট অ্যাপ অনুযায়ী উত্তর দেয়।
// লিংক আনতে সার্ভারে যেতে হয়, আর অপেক্ষার পরে নতুন ট্যাব খুললে ফোনের ব্রাউজার আটকায়, তাই দুই চাপ: কোড আনো → বট খোলো।
// এই ফাইল money-manager-app/app/components/BotLink.tsx এও আছে (এটায় বাংলা/ইংরেজি, ওটায় শুধু ইংরেজি); বদলালে দুই জায়গাতেই বদলাও।
export default function BotLink({ auth, app, linked, text }: { auth: Auth; app: BotApp; linked: boolean; text: string }) {
  const { t } = useLang();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const getLink = async () => {
    setBusy(true);
    setError('');
    try {
      setUrl(await botLinkUrl(auth, app));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('লিংক বানানো গেল না।', 'Could not create a link.'));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {t('মাছরাঙা বট (Telegram)', 'Machranga bot (Telegram)')}
          {linked && <span className="flex items-center gap-1 text-xs font-bold text-emerald-500"><CheckCircle2 size={14} /> {t('যুক্ত আছে', 'Linked')}</span>}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{text}</p>
      </div>
      {url ? (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => setUrl(''), 1000)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm">
            <Send size={16} /> {t('Telegram খুলে Start চাপো', 'Open Telegram and tap Start')}
          </a>
          <p className="text-[11px] text-center text-slate-400">{t('লিংকটা ১৫ মিনিট চলবে।', 'The link works for 15 minutes.')}</p>
        </>
      ) : (
        <button type="button" onClick={getLink} disabled={busy}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm disabled:opacity-70 cursor-pointer">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {linked ? t('আবার যুক্ত করো', 'Link again') : t('বট যুক্ত করো', 'Link the bot')}
        </button>
      )}
      {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
    </div>
  );
}
