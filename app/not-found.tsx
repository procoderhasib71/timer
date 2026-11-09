import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="px-6 py-16 max-w-sm mx-auto text-center">
      <p className="text-3xl font-extrabold text-slate-300 dark:text-slate-600">404</p>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">এই পেজ পাওয়া যায়নি</h2>
      <Link href="/" className="inline-block mt-5 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm">হোমে ফিরুন</Link>
    </div>
  );
}
