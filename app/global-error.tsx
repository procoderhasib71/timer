"use client";

// মূল layout ই ভেঙে গেলে: এখানে অ্যাপের CSS নাও থাকতে পারে, তাই সাধারণ চেহারা
export default function GlobalError({ retry }: { error: Error; retry: () => void }) {
  return (
    <html lang="bn">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '4rem 1.5rem' }}>
        <h2>কিছু একটা সমস্যা হয়েছে</h2>
        <p>আপনার পড়ার হিসাব নিরাপদ আছে।</p>
        <button onClick={() => retry()} style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}>আবার চেষ্টা করুন</button>
      </body>
    </html>
  );
}
