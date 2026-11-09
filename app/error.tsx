"use client";
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

// কোনো পেজ ভেঙে গেলে: হিসাব নিরাপদ আছে জানাই, আবার চেষ্টার পথ দিই
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="px-6 py-16 max-w-sm mx-auto text-center">
      <AlertCircle className="mx-auto text-rose-500 mb-3" size={32} />
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">কিছু একটা সমস্যা হয়েছে</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">আপনার পড়ার হিসাব নিরাপদ আছে। আবার চেষ্টা করুন।</p>
      <button onClick={() => retry()} className="w-full mt-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm">আবার চেষ্টা করুন</button>
      <Link href="/" className="block mt-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400">হোমে ফিরুন</Link>
    </div>
  );
}
