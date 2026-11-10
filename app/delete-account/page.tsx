import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { CONTACT_URL } from '../components/shared/LegalPage';
import DeleteAccount from '../components/account/DeleteAccount';

export const metadata: Metadata = { title: 'Delete account | Shongi Focus' };

// Google Play এর "account deletion URL": লগইন ছাড়াও খোলা যায় (AuthGate এর PUBLIC_PAGES)।
// লগইন থাকলে এখান থেকেই মোছা যায়; না থাকলে কীভাবে মুছবেন সেটা লেখা। Money এর /delete-account এর মতো।
export default function DeleteAccountPage() {
  return (
    <LegalPage title="অ্যাকাউন্ট মুছে ফেলা" updated="১০ নভেম্বর ২০২৬">
      <p>Shongi Focus (Pomodoro), Money Manager আর AdMCQ একই Shongi Lab অ্যাকাউন্ট ব্যবহার করে। অ্যাকাউন্ট মুছলে তিনটাতেই মুছে যায়।</p>

      <h2>কী মুছে যাবে</h2>
      <ul>
        <li>প্রোফাইল (নাম, ফোন নম্বর বা ইমেইল) আর লগইন।</li>
        <li>Pomodoro এর টাস্ক, পড়ার সেশন আর লিডারবোর্ডের ঘর; স্টাডি গ্রুপে নিজের পাঠানো মেসেজ।</li>
        <li>Money এর সব হিসাব: লেনদেন, বাজেট, ধার-দেনা, সঞ্চয়ের লক্ষ্য, recurring।</li>
        <li>AdMCQ এর প্রশ্ন সমাধান, ভুল, বুকমার্ক, পরীক্ষার ফল আর কোর্সে ভর্তি।</li>
        <li>মাছরাঙা Telegram বটের সাথে এই অ্যাকাউন্টের যোগ, আর অ্যাপ থেকে বটে রাখা টাইমার ও রিমাইন্ডার।</li>
      </ul>
      <p>সাথে সাথে মূল ডাটাবেস থেকে মুছে যায়; ফেরানো যায় না। Telegram বটের নিজের অ্যাকাউন্ট আলাদা সেবা; সেটা বটে লিখে মুছতে পারেন।</p>

      <h2>কীভাবে মুছবেন</h2>
      <ul>
        <li>অ্যাপে: সেটিংস এর নিচে &quot;অ্যাকাউন্ট মুছে ফেলুন&quot;।</li>
        <li>ওয়েবে: <Link href="/login">লগইন করে</Link> এই পাতায় ফিরে আসুন।</li>
        <li>লগইন করতে না পারলে <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">Telegram এ যোগাযোগ করুন</a>; ফোন নম্বর যাচাই করে ৭ দিনের মধ্যে মুছে দেওয়া হবে।</li>
      </ul>

      <div className="pt-4">
        <DeleteAccount />
      </div>
    </LegalPage>
  );
}
