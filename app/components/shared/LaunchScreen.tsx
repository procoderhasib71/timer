// অ্যাপ খোলার সময় যাচাই চলার মুহূর্তে দেখানো পাতা।
// iOS এ হোম স্ক্রিন থেকে খুললে আগে public/splash এর ছবি দেখায় (পটভূমি আর মাঝখানে আইকন, প্রস্থের ২৮%)।
// এই পাতা হুবহু সেই ছবির মতো আঁকা, তাই ছবি থেকে পাতায় যাওয়ার সময় আইকন একই জায়গায় থাকে।
// (আগে এখানে ঘুরন্ত spinner ছিল: আইকন মিলিয়ে গিয়ে spinner আসত, সেটাই ঝলকের মতো লাগত।)
// আইকন SVG, তাই আলাদা ছবি আনার অপেক্ষা নেই। আঁকা public/icons/icon-512.png এর মাপ ধরে।
export default function LaunchScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a]" role="status" aria-label="Loading">
      <svg viewBox="0 0 512 512" width="28vw" height="28vw" aria-hidden="true">
        <rect width="512" height="512" rx="112" fill="#4f46e5" />
        <rect x="214" y="89" width="84" height="24" rx="11" fill="#fff" />
        <rect x="241" y="113" width="30" height="26" fill="#fff" />
        <circle cx="256" cy="273" r="115.5" fill="none" stroke="#fff" strokeWidth="25" />
        <line x1="256" y1="276" x2="306" y2="214" stroke="#fff" strokeWidth="24" />
        <circle cx="256" cy="276" r="21" fill="#fff" />
      </svg>
    </div>
  );
}
