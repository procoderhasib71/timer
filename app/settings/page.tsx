// src/app/settings/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccountSheet } from "@/app/components/account/AccountSheet";

// পুরোনো /settings লিংক: হোমে গিয়ে সেটিংস শিট খুলি
export default function SettingsPage() {
  const router = useRouter();
  const { open } = useAccountSheet();
  useEffect(() => {
    router.replace("/");
    open("settings");
  }, [router, open]);
  return null;
}
