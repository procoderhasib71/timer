// src/app/profile/page.tsx
"use client";

import ProfileForm from "@/app/components/account/ProfileForm";

// প্রোফাইল অসম্পূর্ণ থাকলে AuthGate এখানে পাঠায়; বাকি সময় প্রোফাইল খোলে অ্যাকাউন্ট শিটে
export default function ProfilePage() {
  return (
    <div className="px-5 pt-6 pb-24 max-w-xl mx-auto">
      <ProfileForm />
    </div>
  );
}
