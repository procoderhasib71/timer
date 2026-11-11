"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { deleteUser, EmailAuthProvider, GoogleAuthProvider, onAuthStateChanged, reauthenticateWithCredential, reauthenticateWithPopup, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { ADMCQ_URL } from "@/lib/admcqAccount";
import { useLang } from "@/lib/i18n";

const WORD = "DELETE";

// অ্যাকাউন্ট পুরো মোছা (Google Play এর নিয়ম; Money এর app/components/DeleteAccount.tsx এর মতো)।
// অ্যাকাউন্ট AdMCQ, Pomodoro আর Money তে এক, তাই AdMCQ সার্ভার (DELETE /api/account) সব জায়গা থেকে মোছে।
// সার্ভার গত ১০ মিনিটের লগইন চায়, তাই আগে পাসওয়ার্ড বা Google দিয়ে আবার যাচাই।
const method = (u: User | null) => {
  const ids = u?.providerData.map((p) => p.providerId) || [];
  return ids.includes("password") ? "password" : ids.includes("google.com") ? "google" : null;
};

export default function DeleteAccount() {
  const { t } = useLang();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const how = method(user);

  const run = async () => {
    if (!user || typed !== WORD) return;
    if (how === "password" && !password) return setError(t("পাসওয়ার্ড দিন", "Enter your password"));
    setBusy(true);
    setError("");
    try {
      if (how === "password" && user.email) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      else if (how === "google") await reauthenticateWithPopup(user, new GoogleAuthProvider());
      const token = await user.getIdToken(true);
      const res = await fetch(`${ADMCQ_URL}/api/account`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => null);
      if (!d?.success) throw new Error(d?.error || t("অ্যাকাউন্ট মোছা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।", "Could not delete the account. Check your internet and try again."));
      // সার্ভার লগইনটা মুছতে না পারলে এখান থেকেই মুছি (এইমাত্র যাচাই হয়েছে)
      if (!d.authDeleted) await deleteUser(user).catch((e) => console.error(e));
      Object.keys(localStorage).filter((k) => k.startsWith("pomodoro_")).forEach((k) => localStorage.removeItem(k));
      await signOut(auth).catch(() => undefined);
      window.location.replace("/login");
    } catch (e) {
      const code = String((e as { code?: string })?.code || "");
      console.error(e);
      setError(code === "auth/invalid-credential" || code === "auth/wrong-password" ? t("পাসওয়ার্ড ভুল।", "Wrong password.") : e instanceof Error ? e.message : t("অ্যাকাউন্ট মোছা যায়নি", "Could not delete the account"));
      setBusy(false);
    }
  };

  if (!user) return null;
  const input = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 text-sm";
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-bold text-rose-600 dark:text-rose-400">{t("অ্যাকাউন্ট মুছে ফেলুন", "Delete account")}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t("Shongi Lab অ্যাকাউন্ট পুরো মুছে যাবে: Pomodoro, Money আর অন্য সব Shongi Lab অ্যাপের হিসাব, প্রোফাইল আর লগইন। ফেরানো যাবে না।",
            "Your Shongi Lab account will be deleted everywhere: Pomodoro, Money and all other Shongi Lab app data, profile and login. This can't be undone.")}
        </p>
      </div>
      {!open ? (
        <button onClick={() => { setTyped(""); setPassword(""); setError(""); setOpen(true); }} className="w-full py-3 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-sm">
          {t("অ্যাকাউন্ট মুছে ফেলুন", "Delete account")}
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{t("নিশ্চিত করতে লিখুন", "Type to confirm")}: {WORD}</label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" className={input} />
          {how === "password" && (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{t("আপনার পাসওয়ার্ড (আবার যাচাই)", "Your password (to confirm)")}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={input} />
            </>
          )}
          {how === "google" && <p className="text-xs text-slate-500 dark:text-slate-400">{t("মোছার আগে আবার Google দিয়ে যাচাই করতে বলবে।", "You'll be asked to sign in with Google again first.")}</p>}
          {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} disabled={busy} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm">{t("বাতিল", "Cancel")}</button>
            <button onClick={run} disabled={busy || typed !== WORD} className="flex-1 py-3 rounded-xl bg-rose-600 disabled:opacity-40 text-white font-bold text-sm flex justify-center">
              {busy ? <Loader2 className="animate-spin" size={18} /> : t("চিরতরে মুছুন", "Delete forever")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
