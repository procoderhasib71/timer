"use client";

// AdMCQ এর মতো লগইন: ফোন নম্বর + পাসওয়ার্ড (OTP ছাড়া), রেজিস্ট্রেশন আর "পাসওয়ার্ড ভুলে গেছি" তে একবার OTP, আর Google।
// একই machranga Firebase আর একই লুকানো ইমেইল (8801...@phone.admcq.com), তাই সব অ্যাপে একটাই Shonghi Lab অ্যাকাউন্ট।
// এই ফাইল money-manager-app/app/components/PhoneAuthCard.tsx এও হুবহু আছে; বদলালে দুই জায়গাতেই বদলাও।

import { useEffect, useRef, useState } from "react";
import {
  Auth,
  ConfirmationResult,
  EmailAuthProvider,
  GoogleAuthProvider,
  RecaptchaVerifier,
  User,
  getRedirectResult,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { ArrowRight, KeyRound, Loader2, Lock, Phone, User as UserIcon } from "lucide-react";

type Mode = "login" | "register" | "forgot";
type Step = "phone" | "code" | "password";

/** ফোন নম্বরের অ্যাকাউন্টের লুকানো ইমেইল: পাসওয়ার্ড দিয়ে লগইনের জন্য (ইউজার এটা কখনো দেখে না) */
export const phoneEmail = (e164: string) => `${e164.replace(/\D/g, "")}@phone.admcq.com`;

/** '01712345678', '+8801712345678', বাংলা অঙ্ক সব চলে; ভুল হলে '' */
export function toE164(raw: string) {
  const d = raw.replace(/[০-৯]/g, (x) => String("০১২৩৪৫৬৭৮৯".indexOf(x))).replace(/\D/g, "");
  const local = d.startsWith("880") ? d.slice(2) : d;
  return /^01[3-9]\d{8}$/.test(local) ? `+88${local}` : "";
}

// রেজিস্ট্রেশনের আগে AdMCQ দেখে নেয় নম্বরটায় পাসওয়ার্ডসহ অ্যাকাউন্ট আছে কিনা (অযথা SMS যাতে না যায়)
const ADMCQ_URL = (process.env.NEXT_PUBLIC_ADMCQ_URL || "https://app.admcq.com").replace(/\/$/, "");
const isRegistered = (e164: string): Promise<boolean | null> =>
  fetch(`${ADMCQ_URL}/api/auth/phone?phone=${encodeURIComponent(e164)}`)
    .then((r) => r.json())
    .then((j) => (typeof j.registered === "boolean" ? j.registered : null))
    .catch(() => null);   // দেখা না গেলে আগের মতো OTP পাঠাই

const BN = (s: string) => s.replace(/[০-৯]/g, (x) => String("০১২৩৪৫৬৭৮৯".indexOf(x)));

function authError(err: unknown) {
  const c = String((err as { code?: string })?.code || "");
  const msg: Record<string, string> = {
    "auth/invalid-credential": 'Wrong phone number or password. Never set a password? Use "Register".',
    "auth/wrong-password": "Wrong phone number or password.",
    "auth/user-not-found": 'No account for this number. Use "Register".',
    "auth/invalid-phone-number": "That phone number is not valid.",
    "auth/invalid-verification-code": "Wrong code.",
    "auth/code-expired": "The code expired. Get a new one.",
    "auth/too-many-requests": "Too many attempts. Try again a little later.",
    "auth/quota-exceeded": "The SMS limit for today is reached. Try later.",
    "auth/weak-password": "Use at least 6 characters.",
    "auth/requires-recent-login": "Verify again with an OTP.",
    "auth/popup-closed-by-user": "The Google window was closed.",
    "auth/unauthorized-domain": "Login is not allowed from this address yet.",
    "auth/network-request-failed": "Network problem.",
    "auth/operation-not-allowed": "This login method is not enabled yet.",
  };
  console.error("Auth error:", err);
  return `${msg[c] || "Something went wrong. Please try again."}${c ? ` (${c})` : ""}`;
}

const input =
  "w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-400 text-sm";

const Field = ({ icon: Icon, label, ...props }: { icon: typeof Phone; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Icon size={18} /></div>
      <input {...props} className={input} required />
    </div>
  </div>
);

type Props = {
  auth: Auth;
  /** লোগো, নাম আর ছোট লেখা: কার্ডের মাথায় */
  header: React.ReactNode;
  /** সাবমিট বোতামের রঙ, যেমন "bg-indigo-600 hover:bg-indigo-500" */
  accent: string;
  /** লগইন শেষ: প্রোফাইল ডক বানানো আর হোমে পাঠানো অ্যাপের কাজ */
  onSignedIn: (user: User, info: { registered: boolean; name: string }) => Promise<void> | void;
};

export default function PhoneAuthCard({ auth, header, accent, onSignedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [needName, setNeedName] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmation = useRef<ConfirmationResult | null>(null);
  const recaptcha = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    // Google এর popup আটকে গেলে redirect এ যাই, ফিরে এলে এখানে লগইন শেষ
    getRedirectResult(auth)
      .then((r) => r && onSignedIn(r.user, { registered: false, name: "" }))
      .catch((err) => setError(authError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setStep("phone");
    setError("");
    setCode("");
    setPassword("");
    setPassword2("");
  };

  const run = async (fn: () => Promise<void>) => {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error && !(err as { code?: string }).code ? err.message : authError(err));
    } finally {
      setLoading(false);
    }
  };

  const number = () => {
    const n = toE164(phone);
    if (!n) throw new Error("Invalid number. Enter 11 digits starting with 01.");
    return n;
  };

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const cred = await signInWithEmailAndPassword(auth, phoneEmail(number()), password);
      await onSignedIn(cred.user, { registered: false, name: "" });
    });
  };

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    run(async () => {
      const n = number();
      const registered = await isRegistered(n);
      if (mode === "register" && registered === true) {
        switchMode("login");
        throw new Error("আপনার আগে থেকেই অ্যাকাউন্ট আছে। Shonghi Lab এর পাসওয়ার্ড দিয়ে লগইন করুন।");
      }
      if (mode === "forgot" && registered === false) {
        switchMode("register");
        throw new Error("এই নম্বরে কোনো অ্যাকাউন্ট নেই। নতুন অ্যাকাউন্ট খুলুন।");
      }
      try {
        recaptcha.current ||= new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
        confirmation.current = await signInWithPhoneNumber(auth, n, recaptcha.current);
      } catch (err) {
        recaptcha.current?.clear();
        recaptcha.current = null;
        throw err;
      }
      setStep("code");
      setCode("");
      setCooldown(60);
    });
  };

  const verifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!confirmation.current) return setStep("phone");
      const cred = await confirmation.current.confirm(BN(code).trim());
      // রেজিস্ট্রেশনে গিয়ে দেখা গেল আগেই পাসওয়ার্ড আছে: লগইনে ফেরাই (পাসওয়ার্ড বদলাতে "ভুলে গেছি")
      if (mode === "register" && cred.user.providerData.some((p) => p.providerId === "password")) {
        await auth.signOut();
        switchMode("login");
        throw new Error("আপনার আগে থেকেই অ্যাকাউন্ট আছে। Shonghi Lab এর পাসওয়ার্ড দিয়ে লগইন করুন।");
      }
      setNeedName(!cred.user.displayName);
      setStep("password");
    });
  };

  // OTP এর পরে পাসওয়ার্ড: নতুন হলে ফোনের সাথে জুড়ে দিই, আগে থেকে থাকলে বদলাই
  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const user = auth.currentUser;
      if (!user?.phoneNumber) return setStep("phone");
      if (password.length < 6) throw new Error("Use at least 6 characters.");
      if (password !== password2) throw new Error("The two passwords do not match.");
      if (needName && name.trim().length < 2) throw new Error("Please enter your name.");
      const hasPassword = user.providerData.some((p) => p.providerId === "password");
      if (hasPassword) await updatePassword(user, password);
      else await linkWithCredential(user, EmailAuthProvider.credential(phoneEmail(user.phoneNumber), password));
      if (needName) await updateProfile(user, { displayName: name.trim() });
      await onSignedIn(user, { registered: mode === "register", name: needName ? name.trim() : "" });
    });
  };

  const google = () =>
    run(async () => {
      const provider = new GoogleAuthProvider();
      try {
        const cred = await signInWithPopup(auth, provider);
        await onSignedIn(cred.user, { registered: false, name: "" });
      } catch (err) {
        const c = String((err as { code?: string })?.code || "");
        if (c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment") return signInWithRedirect(auth, provider);
        throw err;
      }
    });

  const submit = (text: string) => (
    <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-2xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-70 text-sm cursor-pointer ${accent}`}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <>{text} <ArrowRight size={16} /></>}
    </button>
  );
  const title = mode === "login" ? "Log in" : mode === "register" ? "Create account" : "Forgot password?";

  return (
    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-7">
      {header}
      <h1 className="text-center text-lg font-black text-slate-800 dark:text-white mb-1">{title}</h1>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-6">Shonghi Lab account</p>

      {error && <div className="mb-5 p-3 rounded-2xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-sm text-rose-600 dark:text-rose-400 text-center">{error}</div>}

      {mode === "login" && (
        <form onSubmit={login} className="space-y-4">
          <Field icon={Phone} label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel" placeholder="01712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field icon={Lock} label="Password" type="password" autoComplete="current-password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          {submit("Log in")}
          <button type="button" onClick={() => switchMode("forgot")} className="block mx-auto text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer">Forgot password</button>
          <p className="text-center text-sm text-slate-600 dark:text-slate-300 pt-1">
            No account? <button type="button" onClick={() => switchMode("register")} className="font-bold underline cursor-pointer">Register</button>
          </p>
        </form>
      )}

      {mode !== "login" && step === "phone" && (
        <form onSubmit={sendCode} className="space-y-4">
          <Field icon={Phone} label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel" placeholder="01712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {submit("Send verification code")}
          <p className="text-[11px] text-center text-slate-500">A 6-digit code is sent by SMS once. No code is needed to log in later.</p>
        </form>
      )}

      {mode !== "login" && step === "code" && (
        <form onSubmit={verifyCode} className="space-y-4">
          <Field icon={KeyRound} label="Code from SMS" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
          {submit("Verify")}
          <div className="flex justify-between text-xs px-1 text-slate-500">
            <button type="button" onClick={() => setStep("phone")} className="hover:text-slate-800 dark:hover:text-white cursor-pointer">Change number</button>
            <button type="button" disabled={cooldown > 0 || loading} onClick={() => sendCode()} className="hover:text-slate-800 dark:hover:text-white disabled:opacity-50 cursor-pointer">
              {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {mode !== "login" && step === "password" && (
        <form onSubmit={savePassword} className="space-y-4">
          <p className="text-xs text-center text-emerald-600 font-bold">✅ Number verified, now set a password</p>
          {needName && <Field icon={UserIcon} label="Your name" type="text" autoComplete="name" placeholder="e.g. Rafi Ahmed" value={name} onChange={(e) => setName(e.target.value)} />}
          <Field icon={Lock} label={mode === "register" ? "Password (6+ characters)" : "New password"} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Field icon={Lock} label="Repeat password" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          {submit(mode === "register" ? "Finish registration" : "Save password")}
        </form>
      )}

      {mode !== "login" && step !== "password" && (
        <button type="button" onClick={() => switchMode("login")} className="mt-4 w-full text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer">← Already have an account? Log in</button>
      )}
      <div id="recaptcha-container" />

      {step !== "password" && (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-xs text-slate-400 font-semibold">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>
          <button onClick={google} disabled={loading} className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-white font-bold text-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
}
