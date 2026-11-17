// src/app/community/page.tsx
// কমিউনিটি: যে কেউ গ্রুপ খুলতে পারে, অন্যরা জয়েন অনুরোধ পাঠায়, মালিক মেনে নিলে সদস্য হয় আর চ্যাট করতে পারে।
// নিয়ম আছে firestore.rules এ (communities/...): মেসেজ শুধু সদস্যদের, অনুরোধ মানা/বের করা শুধু মালিকের।
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Send, Users, MessageSquare, Hash, Plus, X, Check, Crown, UserPlus, LogOut, Trash2, Clock, Search, BookOpen, GraduationCap, Stethoscope, FlaskConical, Brain, Rocket, Flame, Trophy, Target, Atom, Dna, Lightbulb, Palette, Medal, Lock, Pencil, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useAccount } from "@/app/components/shared/AuthGate";
import { useLang } from "@/lib/i18n";
import { weekId } from "@/lib/leaderboard";
import { AVATARS, COLORS, AvatarBadge, groupPatch, loadMyAvatar, memberLook, memberMatches, type Look } from "@/lib/avatar";
import { CHAT_THEMES } from "./themes";
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, doc, getDoc, getDocs, setDoc, deleteDoc,
  writeBatch, getCountFromServer, updateDoc, type Timestamp,
} from "firebase/firestore";

interface Message { id: string; type?: string; themeId?: string; text: string; uid: string; displayName: string; photoURL: string | null; createdAt: Timestamp | null }
interface Group { id: string; name: string; description: string; icon?: string; color?: string; privacy?: "open" | "closed"; ownerUid?: string; ownerName?: string }
interface Member { uid: string; name: string; photoURL: string | null; role: "owner" | "member"; avatar?: string; avColor?: string }
interface JoinRequest { uid: string; name: string; photoURL: string | null; note: string; avatar?: string; avColor?: string }
type Status = "owner" | "member" | "pending" | "none";

// গ্রুপের লোগো: আইকন আর রং বেছে নেওয়া যায় (না থাকলে # আর বেগুনি)
const ICONS: Record<string, LucideIcon> = { hash: Hash, book: BookOpen, cap: GraduationCap, steth: Stethoscope, flask: FlaskConical, brain: Brain, rocket: Rocket, flame: Flame, trophy: Trophy, target: Target, atom: Atom, dna: Dna, bulb: Lightbulb, users: Users };
// চ্যাটের থিম (themes.ts): পুরো গ্রুপের একটাই, যে কেউ বদলালে সবার বদলে যায় আর চ্যাটে লেখা আসে (communities/{id}/settings/theme)

function GroupLogo({ icon, color, size = 44 }: { icon?: string; color?: string; size?: number }) {
  const Icon = ICONS[icon || ""] || Hash;
  const [from, to] = COLORS[color || ""] || COLORS.indigo;
  return (
    <span className="shrink-0 flex items-center justify-center text-white shadow-md" style={{ width: size, height: size, borderRadius: size * 0.3, background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 8px 18px -8px ${from}` }}>
      <Icon size={size * 0.5} />
    </span>
  );
}

const messagesPath = (g: Group) => ["communities", g.id, "messages"] as [string, string, string];
const avatarOf = (name: string, photo: string | null, cls = "w-8 h-8 text-xs", look?: Look) => <AvatarBadge name={name} photo={photo} cls={cls} look={look} />;

export default function CommunityPage() {
  const { account } = useAccount();
  const { t, n, lang } = useLang();
  const [me, setMe] = useState<User | null>(null);
  const [communities, setCommunities] = useState<Group[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [pending, setPending] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"mine" | "discover">("mine");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<Group | null>(null);
  const [panel, setPanel] = useState(false);
  const [bgPicker, setBgPicker] = useState(false);
  const [chatTab, setChatTab] = useState<"chat" | "rank">("chat");
  const [themeId, setThemeId] = useState("plain");
  // প্রোফাইলে বাছা অবতার: গ্রুপে ঢোকার সময় এটাই বসে
  const [myLook, setMyLook] = useState<Look>({});
  useEffect(() => { if (me) void loadMyAvatar(me.uid).then(setMyLook); }, [me]);
  // অবতার Money বা AdMCQ থেকে বদলালে এখানকার গ্রুপে পুরনোটা থেকে যায়: খুললে একবার মিলিয়ে দিই
  const healed = useRef(false);
  useEffect(() => {
    if (!me || healed.current || myLook.avatar === undefined || !Object.keys(status).length) return;
    healed.current = true;
    const mineIds = Object.entries(status).filter(([, v]) => v === "owner" || v === "member").map(([k]) => k);
    void Promise.all(mineIds.map(async (id) => {
      const ref = doc(db, "communities", id, "members", me.uid);
      try {
        const m = await getDoc(ref);
        if (m.exists() && !memberMatches(myLook, m.data())) {
          await updateDoc(ref, groupPatch(myLook, m.data().photoURL ?? null));
        }
      } catch { /* বাকিগুলো চলুক */ }
    }));
  }, [me, myLook, status]);
  const th = CHAT_THEMES.find((b) => b.id === themeId) ?? CHAT_THEMES[0];
  const themed = th.id !== "plain";
  // থিম বাছা থাকলে হেডার, ট্যাব আর নিচের বার থিমের রঙে (না বাছলে আগের মতো, আলো/অন্ধকার মোড মেনে)
  const barSt: React.CSSProperties | undefined = themed ? { background: th.bar, borderColor: th.line, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } : undefined;
  const inkSt: React.CSSProperties | undefined = themed ? { color: th.ink } : undefined;
  const subSt: React.CSSProperties | undefined = themed ? { color: th.sub } : undefined;
  const chipSt: React.CSSProperties | undefined = themed ? { background: th.chip, color: th.ink } : undefined;
  const [toast, setToast] = useState("");

  const myName = account?.name || me?.displayName || t("একজন ছাত্র", "A student");
  const desc = (g: Group) => g.description;
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  useEffect(() => onAuthStateChanged(auth, setMe), []);
  useEffect(() => {
    if (!active) return;
    document.body.setAttribute("data-chat-open", "");
    return () => document.body.removeAttribute("data-chat-open");
  }, [active]);

  // সব গ্রুপের তালিকা
  useEffect(() => {
    if (!me) return;
    const q = query(collection(db, "communities"), orderBy("createdAt", "desc"), limit(60));
    return onSnapshot(q, (snap) => {
      setCommunities(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Group, "id">) })));
    }, () => setCommunities([]));
  }, [me]);

  // আমি কোন গ্রুপের কী (মালিক / সদস্য / অনুরোধ পাঠানো)
  const loadStatus = useCallback(async (list: Group[]) => {
    if (!me) return;
    const entries = await Promise.all(list.map(async (g): Promise<[string, Status]> => {
      if (g.ownerUid === me.uid) return [g.id, "owner"];
      try {
        const [m, r] = await Promise.all([getDoc(doc(db, "communities", g.id, "members", me.uid)), getDoc(doc(db, "communities", g.id, "requests", me.uid))]);
        return [g.id, m.exists() ? "member" : r.exists() ? "pending" : "none"];
      } catch { return [g.id, "none"]; }
    }));
    setStatus(Object.fromEntries(entries));
  }, [me]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Firestore ফলাফল এসে state বদলায়; গ্রুপ খুললেও আবার দেখি (অনুরোধ মানা হয়ে থাকতে পারে)
  useEffect(() => { void loadStatus(communities); }, [communities, loadStatus, active?.id]);

  // আমার গ্রুপগুলোতে নতুন অনুরোধ কয়টা (লাল গোল সংখ্যা)
  useEffect(() => {
    if (!me) return;
    const owned = communities.filter((g) => g.ownerUid === me.uid);
    const offs = owned.map((g) => onSnapshot(collection(db, "communities", g.id, "requests"), (s) => setPending((p) => ({ ...p, [g.id]: s.size })), () => undefined));
    return () => offs.forEach((f) => f());
  }, [communities, me]);

  const mine = [...communities.filter((g) => status[g.id] === "owner" || status[g.id] === "member")];
  const discover = communities.filter((g) => status[g.id] !== "owner" && status[g.id] !== "member")
    .filter((g) => !search.trim() || g.name.toLowerCase().includes(search.trim().toLowerCase()));

  // খোলা গ্রুপে চাপলেই জয়েন; বন্ধ গ্রুপে অনুরোধ পাঠাতে হয়
  const joinOpen = async (g: Group) => {
    if (!me) return;
    try {
      await setDoc(doc(db, "communities", g.id, "members", me.uid), { uid: me.uid, name: myName, role: "member", joinedAt: serverTimestamp(), ...memberLook(myLook, me.photoURL || null) });
      setStatus((st) => ({ ...st, [g.id]: "member" }));
      setActive(g);
    } catch { flash(t("জয়েন করা যায়নি, আবার চেষ্টা করো", "Couldn't join, try again")); }
  };
  const openGroup = (g: Group) => {
    if ((status[g.id] || "none") === "none" && g.privacy === "open") void joinOpen(g);
    else setActive(g);
  };

  // নতুন মেসেজের চিহ্ন: প্রতিটা গ্রুপের শেষ মেসেজের সময় বনাম এই ফোনে শেষবার কখন দেখেছি
  const [lastMsg, setLastMsg] = useState<Record<string, { ms: number; uid: string }>>({});
  const [seen, setSeen] = useState<Record<string, number>>({});
  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage শুধু ব্রাউজারে, মাউন্টের পর পড়ি
  useEffect(() => { try { setSeen(JSON.parse(localStorage.getItem("pomodoro_chat_seen") || "{}")); } catch { /* প্রাইভেট মোড */ } }, []);
  const markSeen = useCallback((gid: string) => {
    setSeen((p) => { const next = { ...p, [gid]: Date.now() }; try { localStorage.setItem("pomodoro_chat_seen", JSON.stringify(next)); } catch { /* প্রাইভেট মোড */ } return next; });
  }, []);
  const mineKey = communities.filter((g) => status[g.id] === "owner" || status[g.id] === "member").map((g) => g.id).join(",");
  useEffect(() => {
    if (!me || !mineKey) return;
    const offs = mineKey.split(",").map((id) => onSnapshot(query(collection(db, "communities", id, "messages"), orderBy("createdAt", "desc"), limit(1)), (snap) => {
      const d = snap.docs[0]?.data();
      const ms = (d?.createdAt as Timestamp | null)?.toMillis?.();
      if (d && ms) setLastMsg((p) => ({ ...p, [id]: { ms, uid: d.uid as string } }));
      // এই ফোনে গ্রুপটা প্রথমবার দেখলে পুরনো মেসেজকে "নতুন" ধরি না
      setSeen((p) => { if (p[id] !== undefined) return p; const next = { ...p, [id]: Date.now() }; try { localStorage.setItem("pomodoro_chat_seen", JSON.stringify(next)); } catch { /* প্রাইভেট মোড */ } return next; });
    }, () => undefined));
    return () => offs.forEach((f) => f());
  }, [me, mineKey]);
  const isUnread = (gid: string) => {
    const l = lastMsg[gid];
    return Boolean(l && l.uid !== me?.uid && l.ms > (seen[gid] ?? 0));
  };

  const createGroup = async (name: string, description: string, icon: string, color: string, privacy: "open" | "closed") => {
    if (!me) return;
    const ref = doc(collection(db, "communities"));
    const batch = writeBatch(db);
    batch.set(ref, { name: name.trim(), description: description.trim(), icon, color, privacy, ownerUid: me.uid, ownerName: myName, createdAt: serverTimestamp() });
    batch.set(doc(db, "communities", ref.id, "members", me.uid), { uid: me.uid, name: myName, role: "owner", joinedAt: serverTimestamp(), ...memberLook(myLook, me.photoURL || null) });
    try {
      await batch.commit();
      setCreating(false);
      setStatus((st) => ({ ...st, [ref.id]: "owner" }));
      setActive({ id: ref.id, name: name.trim(), description: description.trim(), icon, color, privacy, ownerUid: me.uid, ownerName: myName });
      flash(t("গ্রুপ তৈরি হয়েছে 🎉", "Group created 🎉"));
    } catch { flash(t("গ্রুপ বানানো যায়নি, আবার চেষ্টা করো", "Couldn't create the group, try again")); }
  };

  const sendRequest = async (g: Group, note: string) => {
    if (!me) return;
    try {
      await setDoc(doc(db, "communities", g.id, "requests", me.uid), { uid: me.uid, name: myName, note: note.trim().slice(0, 200), createdAt: serverTimestamp(), ...memberLook(myLook, me.photoURL || null) });
      setStatus((s) => ({ ...s, [g.id]: "pending" }));
      flash(t("অনুরোধ পাঠানো হয়েছে, মালিক মেনে নিলে জানতে পারবে", "Request sent. You'll get in once the owner accepts"));
    } catch { flash(t("অনুরোধ পাঠানো যায়নি", "Couldn't send the request")); }
  };
  const cancelRequest = async (g: Group) => {
    if (!me) return;
    try { await deleteDoc(doc(db, "communities", g.id, "requests", me.uid)); setStatus((s) => ({ ...s, [g.id]: "none" })); } catch { flash(t("হয়নি, আবার চেষ্টা করো", "Failed, try again")); }
  };
  const leaveGroup = async (g: Group) => {
    if (!me) return;
    try { await deleteDoc(doc(db, "communities", g.id, "members", me.uid)); setStatus((s) => ({ ...s, [g.id]: "none" })); setPanel(false); setActive(null); }
    catch { flash(t("বের হওয়া যায়নি", "Couldn't leave")); }
  };
  const deleteGroup = async (g: Group) => {
    try {
      const [ms, rs] = await Promise.all([getDocs(collection(db, "communities", g.id, "members")), getDocs(collection(db, "communities", g.id, "requests"))]);
      const batch = writeBatch(db);
      [...ms.docs, ...rs.docs].forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "communities", g.id, "settings", "theme"));
      await batch.commit();
      await deleteDoc(doc(db, "communities", g.id));
      setPanel(false); setActive(null);
      flash(t("গ্রুপ মুছে গেছে", "Group deleted"));
    } catch { flash(t("মোছা যায়নি", "Couldn't delete")); }
  };

  // ---------------- চ্যাট ----------------
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  // গ্রুপের সদস্যদের এখনকার নাম আর অবতার (মেসেজে সবসময় সর্বশেষটা দেখাই)
  const [roster, setRoster] = useState<Record<string, Member>>({});
  const canChat = Boolean(active && (status[active.id] === "owner" || status[active.id] === "member"));

  useEffect(() => {
    if (!active || !canChat) return;
    const off1 = onSnapshot(collection(db, "communities", active.id, "members"), (s) => setRoster(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as Member]))), () => undefined);
    const off2 = onSnapshot(doc(db, "communities", active.id, "settings", "theme"), (s) => setThemeId((s.data()?.theme as string) || "plain"), () => undefined);
    return () => { off1(); off2(); };
  }, [active, canChat]);

  // থিম বদলালে পুরো গ্রুপের বদলায় আর চ্যাটে "অমুক থিম বদলেছে" লেখা যায় (Messenger এর মতো)
  const changeTheme = async (id: string) => {
    if (!me || !active || id === themeId) { setBgPicker(false); return; }
    try {
      const b = writeBatch(db);
      b.set(doc(db, "communities", active.id, "settings", "theme"), { theme: id, by: me.uid, byName: myName, at: serverTimestamp() });
      b.set(doc(collection(db, "communities", active.id, "messages")), { type: "theme", themeId: id, text: "changed the theme", uid: me.uid, displayName: myName, photoURL: me.photoURL || null, createdAt: serverTimestamp() });
      await b.commit();
      setThemeId(id);
      setBgPicker(false);
    } catch { flash(t("থিম বদলানো যায়নি", "Couldn't change the theme")); }
  };
  useEffect(() => {
    if (!active || !me || !canChat) return;
    const q = query(collection(db, ...messagesPath(active)), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, (s) => setMessages(s.docs.map((d) => ({ id: d.id, ...d.data() } as Message)).reverse()), () => setMessages([]));
  }, [active, me, canChat]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- চ্যাট খোলা থাকলে নতুন মেসেজ আসামাত্র "দেখা হয়েছে" ধরি
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); if (active && messages.length) markSeen(active.id); }, [messages, active, markSeen]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !me || !active) return;
    const msg = text; setText("");
    try {
      await addDoc(collection(db, ...messagesPath(active)), { text: msg, uid: me.uid, displayName: myName, photoURL: me.photoURL || null, createdAt: serverTimestamp() });
    } catch { flash(t("মেসেজ যায়নি", "Message failed")); }
  };
  const msgTime = (ts: Timestamp | null) => ts ? ts.toDate().toLocaleTimeString(lang === "bn" ? "bn-BD" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : t("যাচ্ছে...", "Sending...");

  const toastEl = toast && (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-[300] max-w-[90vw] px-4 py-2.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2">{toast}</div>
  );

  // ---------------- গ্রুপের ভেতর ----------------
  if (active) {
    const st: Status = status[active.id] || "none";
    return (
      <div className="w-full h-[calc(100dvh-env(safe-area-inset-bottom))] flex flex-col bg-slate-50 dark:bg-[#0f172a] relative">
        <div style={barSt} className="px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between gap-2 bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-white/5 shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button style={inkSt} onClick={() => { setActive(null); setPanel(false); setChatTab("chat"); setThemeId("plain"); }} aria-label={t("পেছনে", "Back")} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft size={24} /></button>
            <GroupLogo icon={active.icon} color={active.color} size={40} />
            <div className="min-w-0">
              <h1 style={inkSt} className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{active.name}</h1>
              <p style={subSt} className="text-[10px] font-medium text-slate-500 line-clamp-1">{desc(active) || t("কমিউনিটি গ্রুপ", "Community group")}</p>
            </div>
          </div>
          {(st === "owner" || st === "member") && (
            <div className="flex items-center gap-2 shrink-0">
            <button style={chipSt} onClick={() => setBgPicker(true)} aria-label={t("চ্যাটের থিম", "Chat theme")} className="press shrink-0 p-2.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200"><Palette size={18} /></button>
            <button style={chipSt} onClick={() => setPanel(true)} aria-label={t("সদস্য", "Members")} className="press relative shrink-0 p-2.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200">
              <Users size={18} />
              {(pending[active.id] || 0) > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">{n(pending[active.id])}</span>}
            </button>
            </div>
          )}
        </div>

        {canChat && (
          <div style={barSt} className="px-4 py-2 bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-white/5 shrink-0">
            <div style={themed ? { background: th.chip } : undefined} className="p-1 rounded-xl bg-slate-100 dark:bg-white/5 grid grid-cols-2">
              {(["chat", "rank"] as const).map((k) => (
                <button key={k} onClick={() => setChatTab(k)} style={themed ? (chatTab === k ? { background: th.accent, color: "#fff" } : { color: th.sub }) : undefined} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${chatTab === k ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
                  {k === "chat" ? t("চ্যাট", "Chat") : t("ফোকাস র‍্যাঙ্ক", "Focus ranking")}
                </button>
              ))}
            </div>
          </div>
        )}

        {canChat && chatTab === "rank" ? (
          <div className="flex-1 min-h-0 flex flex-col" style={th.area}><GroupRanking group={active} me={me} t={t} n={n} /></div>
        ) : canChat ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide" style={th.area}>
              <div className="flex justify-center my-6">
                <div style={themed ? { background: th.chip, color: th.sub } : undefined} className="bg-slate-200/50 dark:bg-white/5 px-4 py-2 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                  {t("স্বাগতম", "Welcome to")} <span className="font-bold">{active.name}</span> 🚀
                </div>
              </div>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 opacity-50">
                  <MessageSquare size={40} className="text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-500">{t("প্রথম মেসেজটা তুমিই দাও!", "Be the first to say hello!")}</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.uid === me?.uid;
                const first = i === 0 || messages[i - 1].uid !== msg.uid || messages[i - 1].type === "theme";
                if (msg.type === "theme") {
                  const who = roster[msg.uid]?.name || msg.displayName;
                  const tn = CHAT_THEMES.find((x) => x.id === msg.themeId);
                  return (
                    <div key={msg.id} className="flex justify-center animate-in fade-in">
                      <span style={themed ? { background: th.chip, color: th.sub } : undefined} className="max-w-[90%] text-center bg-slate-200/60 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-semibold px-3.5 py-1.5 rounded-full">
                        {msg.uid === me?.uid ? t("তুমি", "You") : who} {t(`থিম বদলে "${tn?.bn || ""}" করেছে`, `changed the theme to "${tn?.en || ""}"`)}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`flex max-w-[80%] ${isMe ? "flex-row-reverse" : "flex-row"} gap-2`}>
                      {!isMe && first ? avatarOf(roster[msg.uid]?.name || msg.displayName, roster[msg.uid]?.photoURL ?? msg.photoURL, "w-8 h-8 text-xs", roster[msg.uid]) : <div className="w-8 h-8 shrink-0" />}
                      <div className="flex flex-col min-w-0">
                        {!isMe && first && <span style={subSt} className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{roster[msg.uid]?.name || msg.displayName}</span>}
                        <div style={themed ? (isMe ? { background: th.accent } : { background: th.other, color: th.otherInk, borderColor: th.line }) : undefined} className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words ${isMe ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-sm"}`}>{msg.text}</div>
                        <span style={subSt} className={`text-[9px] font-medium mt-1 text-slate-400 ${isMe ? "text-right mr-1" : "ml-1"}`}>{msgTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div style={barSt} className="bg-white dark:bg-[#1e293b] border-t border-slate-200 dark:border-white/5 p-4 shrink-0 z-30">
              <form onSubmit={send} className="flex items-center gap-2">
                <div style={themed ? { background: th.chip } : undefined} className="flex-1 bg-slate-100 dark:bg-[#2a3850] rounded-full flex items-center px-4 py-1.5 border border-transparent focus-within:border-indigo-500/50 focus-within:bg-white dark:focus-within:bg-[#1e293b] transition-all">
                  <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={t("মেসেজ লেখো...", `Message #${active.name}...`)}
                    style={inkSt} className="w-full bg-transparent border-none focus:outline-none text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 py-2.5" />
                </div>
                <button type="submit" disabled={!text.trim()} aria-label={t("পাঠাও", "Send")} style={themed && text.trim() ? { background: th.accent } : undefined}
                  className={`p-3 rounded-full shrink-0 transition-all ${text.trim() ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 active:scale-95" : "bg-slate-200 dark:bg-[#2a3850] text-slate-400 cursor-not-allowed"}`}>
                  <Send size={20} className={text.trim() ? "ml-0.5" : ""} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <JoinCard group={active} status={st} onRequest={(note) => sendRequest(active, note)} onCancel={() => cancelRequest(active)} t={t} n={n} />
        )}

        {panel && (
          <MembersPanel group={active} isOwner={st === "owner"} me={me} onClose={() => setPanel(false)} myLook={myLook} onPrivacy={(p) => setActive({ ...active, privacy: p })} onLeave={() => leaveGroup(active)} onDelete={() => deleteGroup(active)} flash={flash} t={t} n={n} />
        )}
        {bgPicker && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setBgPicker(false)} />
            <div className="relative w-full max-w-lg bg-white dark:bg-[#161b26] rounded-t-[28px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t("চ্যাটের থিম", "Chat theme")}</h2>
                <button onClick={() => setBgPicker(false)} aria-label={t("বন্ধ করো", "Close")} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {CHAT_THEMES.map((b) => (
                  <button key={b.id} onClick={() => changeTheme(b.id)} className="flex flex-col items-center gap-1.5">
                    <span className={`relative block w-full aspect-[3/4] rounded-2xl border-2 overflow-hidden bg-slate-50 dark:bg-[#0f172a] transition-all ${themeId === b.id ? "border-indigo-500 scale-105" : "border-slate-200 dark:border-white/10"}`}>
                      <span className="absolute left-0 top-0 block" style={{ ...b.area, width: "286%", height: "286%", transform: "scale(.35)", transformOrigin: "0 0" }} />
                      {b.id !== "plain" && <span className="absolute inset-x-0 top-0 h-2.5" style={{ background: b.bar }} />}
                      {b.id !== "plain" && <span className="absolute left-1.5 top-5 h-2.5 w-7 rounded-md" style={{ background: b.other }} />}
                      {b.id !== "plain" && <span className="absolute right-1.5 top-9 h-2.5 w-6 rounded-md" style={{ background: b.accent }} />}
                    </span>
                    <span className={`text-[11px] font-bold ${themeId === b.id ? "text-indigo-600 dark:text-indigo-300" : "text-slate-500"}`}>{t(b.bn, b.en)}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-4">{t("থিম বদলালে গ্রুপের সবার চ্যাটেই বদলে যাবে, আর চ্যাটে সেটা লেখা থাকবে।", "Changing the theme changes it for everyone in the group, and the chat will say so.")}</p>
            </div>
          </div>
        )}
        {toastEl}
      </div>
    );
  }

  // ---------------- তালিকা ----------------
  const list = tab === "mine" ? mine : discover;
  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a]">
      <div className="px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label={t("পেছনে", "Back")} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft size={24} /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t("কমিউনিটি", "Community")}</h1>
            <p className="text-xs font-medium text-slate-500">{t("পড়ার গ্রুপ", "Study Groups")}</p>
          </div>
        </div>
        <button onClick={() => setCreating(true)} className="press flex items-center gap-1.5 text-xs font-extrabold text-white bg-indigo-600 px-3.5 py-2.5 rounded-full shadow-lg shadow-indigo-500/30">
          <Plus size={15} /> {t("নতুন গ্রুপ", "New group")}
        </button>
      </div>

      <div className="px-5 pt-3 pb-28 space-y-4">
        <div className="p-1 rounded-2xl bg-slate-200/60 dark:bg-white/5 grid grid-cols-2">
          {(["mine", "discover"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`py-2 rounded-xl text-[13px] font-bold transition-all ${tab === k ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
              {k === "mine" ? t("আমার গ্রুপ", "My groups") : t("খুঁজে দেখো", "Discover")}
            </button>
          ))}
        </div>

        {tab === "discover" && (
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("গ্রুপের নাম খোঁজো", "Search groups")}
              className="surface w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:!border-indigo-400" />
          </div>
        )}

        {list.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 px-6 py-10 text-center">
            <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-extrabold text-slate-800 dark:text-slate-100">{tab === "mine" ? t("এখনো কোনো গ্রুপে নেই", "You're not in any group yet") : t("কোনো গ্রুপ পাওয়া যায়নি", "No groups found")}</p>
            <p className="text-xs text-slate-400 mt-1">{tab === "mine" ? t("নিজের গ্রুপ খুলো, নয়তো খুঁজে দেখো ট্যাবে গিয়ে জয়েন করো।", "Create your own, or join one from Discover.") : t("নিজেই একটা খুলে ফেলো!", "Why not start one yourself!")}</p>
          </div>
        )}

        <div className="space-y-3">
          {list.map((g, idx) => {
            const st = status[g.id] || "none";
            return (
              <button key={g.id} onClick={() => openGroup(g)} style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
                className="surface press w-full text-left rounded-2xl p-4 flex items-center gap-4 hover:!border-indigo-500/50 animate-in fade-in slide-in-from-bottom-4">
                <GroupLogo icon={g.icon} color={g.color} size={46} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                    {g.name}{g.privacy !== "open" && <Lock size={11} className="text-slate-400 shrink-0" />}{st === "owner" && <Crown size={13} className="text-amber-500 shrink-0" />}
                  </h3>
                  <p className={`text-xs line-clamp-1 ${isUnread(g.id) ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>{isUnread(g.id) ? t("নতুন মেসেজ এসেছে", "New messages") : desc(g) || (g.ownerName ? t(`${g.ownerName} এর গ্রুপ`, `By ${g.ownerName}`) : "")}</p>
                </div>
                {isUnread(g.id) && <span aria-label={t("নতুন মেসেজ", "New message")} className="shrink-0 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.25)] animate-pulse" />}
                {(pending[g.id] || 0) > 0 && st === "owner"
                  ? <span className="shrink-0 text-[11px] font-extrabold text-white bg-rose-500 px-2.5 py-1 rounded-full">{n(pending[g.id])} {t("অনুরোধ", "requests")}</span>
                  : st === "pending"
                    ? <span className="shrink-0 text-[11px] font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full flex items-center gap-1"><Clock size={11} />{t("অপেক্ষায়", "Pending")}</span>
                    
                    : <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#2a3850] px-3 py-1.5 rounded-lg">{st === "none" ? t("দেখো", "View") : t("খোলো", "Open")}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {creating && <CreateSheet onClose={() => setCreating(false)} onCreate={createGroup} t={t} />}
      {toastEl}
    </div>
  );
}

type TFn = (bn: string, en: string) => string;
type NFn = (v: number | string) => string;

function CreateSheet({ onClose, onCreate, t }: { onClose: () => void; onCreate: (name: string, description: string, icon: string, color: string, privacy: "open" | "closed") => Promise<void>; t: TFn }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("book");
  const [color, setColor] = useState("indigo");
  const [privacy, setPrivacy] = useState<"open" | "closed">("closed");
  const [busy, setBusy] = useState(false);
  const ok = name.trim().length >= 2 && !busy;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#161b26] rounded-t-[28px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t("নতুন গ্রুপ খোলো", "Create a group")}</h2>
          <button onClick={onClose} aria-label={t("বন্ধ করো", "Close")} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500"><X size={18} /></button>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <GroupLogo icon={icon} color={color} size={64} />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ICONS).map(([k, I]) => (
                <button key={k} type="button" onClick={() => setIcon(k)} aria-label={k} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${icon === k ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"}`}><I size={16} /></button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COLORS).map(([k, [f, e]]) => (
                <button key={k} type="button" onClick={() => setColor(k)} aria-label={k} className={`w-6 h-6 rounded-full transition-transform ${color === k ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-white/60 ring-offset-white dark:ring-offset-[#161b26] scale-110" : ""}`} style={{ background: `linear-gradient(135deg, ${f}, ${e})` }} />
              ))}
            </div>
          </div>
        </div>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("গ্রুপের নাম", "Group name")}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={t("যেমন: মেডিকেল ২০২৭ ব্যাচ", "e.g. Medical 2027 batch")}
          className="mt-1 mb-4 w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/50" />
        <div className="mb-4 p-1 rounded-xl bg-slate-100 dark:bg-white/5 grid grid-cols-2">
          {(["open", "closed"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setPrivacy(k)} className={`py-2 rounded-lg text-xs font-bold transition-all ${privacy === k ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
              {k === "open" ? t("🌐 খোলা", "🌐 Open") : t("🔒 বন্ধ", "🔒 Closed")}
            </button>
          ))}
        </div>
        <p className="-mt-2 mb-4 text-[11px] text-slate-400">{privacy === "open" ? t("খোলা: যে কেউ চাপলেই সরাসরি ঢুকে যাবে।", "Open: anyone can tap and join right away.") : t("বন্ধ: অনুরোধ পাঠাতে হবে, তুমি মেনে নিলে ঢুকবে।", "Closed: people send a request and get in once you accept.")}</p>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("কী নিয়ে গ্রুপ (ঐচ্ছিক)", "What it's about (optional)")}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} rows={3} placeholder={t("সবাই জয়েন করার আগে এটা দেখবে", "Everyone sees this before asking to join")}
          className="mt-1 w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/50 resize-none" />
        <p className="text-[11px] text-slate-400 mt-2">{t("তুমি গ্রুপের মালিক হবে। অন্যরা জয়েন অনুরোধ পাঠাবে, তুমি মেনে নিলে তারা চ্যাট করতে পারবে।", "You'll be the owner. Others send join requests; once you accept they can chat.")}</p>
        <button disabled={!ok} onClick={async () => { setBusy(true); await onCreate(name, description, icon, color, privacy); setBusy(false); }}
          className={`press mt-4 w-full py-3.5 rounded-2xl text-sm font-extrabold transition-all ${ok ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-200 dark:bg-white/5 text-slate-400"}`}>
          {busy ? t("তৈরি হচ্ছে...", "Creating...") : t("গ্রুপ তৈরি করো", "Create group")}
        </button>
      </div>
    </div>
  );
}

function JoinCard({ group, status, onRequest, onCancel, t, n }: { group: Group; status: Status; onRequest: (note: string) => void; onCancel: () => void; t: TFn; n: NFn }) {
  const [note, setNote] = useState("");
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { getCountFromServer(collection(db, "communities", group.id, "members")).then((s) => setCount(s.data().count)).catch(() => undefined); }, [group.id]);
  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center text-center">
      <div className="mt-6"><GroupLogo icon={group.icon} color={group.color} size={80} /></div>
      <h2 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">{group.name}</h2>
      <p className="text-xs font-semibold text-slate-400 mt-1">{count !== null && `${n(count)} ${t("জন সদস্য", count === 1 ? "member" : "members")}`}{group.ownerName && ` · ${t("মালিক", "Owner")}: ${group.ownerName}`}</p>
      {group.description && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed">{group.description}</p>}
      <div className="mt-6 w-full max-w-sm">
        {status === "pending" ? (
          <>
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"><Clock size={16} />{t("অনুরোধ পাঠানো হয়েছে", "Request sent")}</div>
            <p className="text-xs text-slate-400 mt-2">{t("মালিক মেনে নিলে এই পাতা নিজেই চ্যাটে বদলে যাবে (আবার খুলে দেখো)।", "Once the owner accepts, reopen the group to chat.")}</p>
            <button onClick={onCancel} className="mt-3 text-xs font-bold text-slate-500 underline">{t("অনুরোধ বাতিল করো", "Cancel request")}</button>
          </>
        ) : (
          <>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("মালিককে ছোট্ট একটা কথা (ঐচ্ছিক)", "A short note to the owner (optional)")}
              className="surface w-full rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:!border-indigo-400" />
            <button onClick={() => onRequest(note)} className="press mt-3 w-full py-3.5 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"><UserPlus size={17} />{t("জয়েন অনুরোধ পাঠাও", "Request to join")}</button>
          </>
        )}
      </div>
    </div>
  );
}

function MembersPanel({ group, isOwner, me, myLook, onClose, onPrivacy, onLeave, onDelete, flash, t, n }: {
  group: Group; isOwner: boolean; me: User | null; myLook: Look; onClose: () => void; onPrivacy: (p: "open" | "closed") => void; onLeave: () => void; onDelete: () => void; flash: (m: string) => void; t: TFn; n: NFn;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const mine = members.find((m) => m.uid === me?.uid);

  useEffect(() => onSnapshot(collection(db, "communities", group.id, "members"), (s) => setMembers(s.docs.map((d) => d.data() as Member)), () => undefined), [group.id]);
  useEffect(() => {
    if (!isOwner) return;
    return onSnapshot(collection(db, "communities", group.id, "requests"), (s) => setRequests(s.docs.map((d) => d.data() as JoinRequest)), () => undefined);
  }, [group.id, isOwner]);

  const accept = async (r: JoinRequest) => {
    try {
      const b = writeBatch(db);
      b.set(doc(db, "communities", group.id, "members", r.uid), { uid: r.uid, name: r.name, photoURL: r.photoURL || null, role: "member", joinedAt: serverTimestamp(), ...(r.avatar ? { avatar: r.avatar, avColor: r.avColor || "indigo" } : {}) });
      b.delete(doc(db, "communities", group.id, "requests", r.uid));
      await b.commit();
      flash(t(`${r.name} গ্রুপে যোগ হলো`, `${r.name} joined the group`));
    } catch { flash(t("মেনে নেওয়া যায়নি", "Couldn't accept")); }
  };
  const reject = async (r: JoinRequest) => { try { await deleteDoc(doc(db, "communities", group.id, "requests", r.uid)); } catch { flash(t("হয়নি", "Failed")); } };
  const kick = async (m: Member) => { try { await deleteDoc(doc(db, "communities", group.id, "members", m.uid)); } catch { flash(t("হয়নি", "Failed")); } };

  return (
    <div className="absolute inset-0 z-[100] flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {editing && mine && <ProfileSheet group={group} member={mine} myLook={myLook} onClose={() => setEditing(false)} flash={flash} t={t} />}
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative h-full w-[min(92vw,380px)] bg-white dark:bg-[#161b26] border-l border-slate-200 dark:border-white/10 flex flex-col pt-[calc(1rem+env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-right duration-300">
        <div className="px-5 pb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{t("সদস্য", "Members")} · {n(members.length)}</h2>
          <button onClick={onClose} aria-label={t("বন্ধ করো", "Close")} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          {mine && (
            <button onClick={() => setEditing(true)} className="press w-full rounded-2xl border border-slate-200 dark:border-white/10 p-3 flex items-center gap-3 text-left">
              {avatarOf(mine.name, mine.photoURL, "w-11 h-11 text-base", mine)}
              <span className="flex-1 min-w-0"><span className="block text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">{t("এই গ্রুপে আমি", "Me in this group")}</span><span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{mine.name}</span></span>
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Pencil size={12} />{t("বদলাও", "Edit")}</span>
            </button>
          )}
          {isOwner && requests.length > 0 && (
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500 mb-2">{t("জয়েন অনুরোধ", "Join requests")} · {n(requests.length)}</p>
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.uid} className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
                    <div className="flex items-center gap-3">
                      {avatarOf(r.name, r.photoURL, "w-9 h-9 text-sm", r)}
                      <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.name}</p>{r.note && <p className="text-[11px] text-slate-500 line-clamp-2">{r.note}</p>}</div>
                      <button onClick={() => accept(r)} aria-label={t("মেনে নাও", "Accept")} className="press w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check size={17} /></button>
                      <button onClick={() => reject(r)} aria-label={t("বাদ দাও", "Reject")} className="press w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 flex items-center justify-center"><X size={17} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">{t("সবাই", "Everyone")}</p>
            <div className="space-y-1">
              {[...members].sort((a, b) => (a.role === "owner" ? -1 : 0) - (b.role === "owner" ? -1 : 0)).map((m) => (
                <div key={m.uid} className="flex items-center gap-3 py-2">
                  {avatarOf(m.name, m.photoURL, "w-9 h-9 text-sm", m)}
                  <p className="flex-1 min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{m.name}{m.uid === me?.uid && <span className="text-slate-400 font-medium"> ({t("তুমি", "you")})</span>}</p>
                  {m.uid === me?.uid && <button onClick={() => setEditing(true)} aria-label={t("আমার প্রোফাইল বদলাও", "Edit my profile")} className="press p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300"><Pencil size={14} /></button>}
                  {m.role === "owner" ? <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full flex items-center gap-1"><Crown size={11} />{t("মালিক", "Owner")}</span>
                    : isOwner && <button onClick={() => kick(m)} className="text-[11px] font-bold text-rose-500 px-2 py-1">{t("বের করো", "Remove")}</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-white/5">
          {isOwner && (
            <div className="mb-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">{t("কে ঢুকতে পারবে", "Who can join")}</p>
              <div className="p-1 rounded-xl bg-slate-100 dark:bg-white/5 grid grid-cols-2">
                {(["open", "closed"] as const).map((k) => (
                  <button key={k} onClick={async () => { try { await updateDoc(doc(db, "communities", group.id), { privacy: k }); onPrivacy(k); } catch { flash(t("বদলানো যায়নি", "Couldn't change")); } }}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${(group.privacy || "closed") === k ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
                    {k === "open" ? t("🌐 খোলা", "🌐 Open") : t("🔒 বন্ধ", "🔒 Closed")}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isOwner ? (
            confirmDelete ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{t("গ্রুপ আর সব সদস্য মুছে যাবে, ফেরানো যাবে না।", "The group and its members will be removed. This can't be undone.")}</p>
                <div className="flex gap-2">
                  <button onClick={onDelete} className="flex-1 py-3 rounded-2xl bg-rose-600 text-white text-sm font-extrabold">{t("হ্যাঁ, মুছো", "Yes, delete")}</button>
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200 text-sm font-bold">{t("না", "No")}</button>
                </div>
              </div>
            ) : <button onClick={() => setConfirmDelete(true)} className="w-full py-3 rounded-2xl text-rose-500 bg-rose-50 dark:bg-rose-500/10 text-sm font-extrabold flex items-center justify-center gap-2"><Trash2 size={16} />{t("গ্রুপ মুছে ফেলো", "Delete group")}</button>
          ) : (
            <button onClick={onLeave} className="w-full py-3 rounded-2xl text-rose-500 bg-rose-50 dark:bg-rose-500/10 text-sm font-extrabold flex items-center justify-center gap-2"><LogOut size={16} />{t("গ্রুপ ছেড়ে দাও", "Leave group")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// গ্রুপের সদস্যদের ফোকাস সময়: লিডারবোর্ড (leaderboards/{সপ্তাহ বা all}/users/{uid}) থেকে, বেশি থেকে কম
function GroupRanking({ group, me, t, n }: { group: Group; me: User | null; t: TFn; n: NFn }) {
  const [range, setRange] = useState<"week" | "all">("week");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [mins, setMins] = useState<Record<string, { minutes: number; hidden: boolean }> | null>(null);

  useEffect(() => onSnapshot(collection(db, "communities", group.id, "members"), (s) => setMembers(s.docs.map((d) => d.data() as Member)), () => setMembers([])), [group.id]);
  useEffect(() => {
    if (!members) return;
    let live = true;
    const board = range === "week" ? weekId() : "all";
    Promise.all(members.map(async (m) => {
      try {
        const d = await getDoc(doc(db, "leaderboards", board, "users", m.uid));
        const x = d.exists() ? d.data() : null;
        return [m.uid, { minutes: Number(x?.minutes) || 0, hidden: x?.hidden === true && m.uid !== me?.uid }] as const;
      } catch { return [m.uid, { minutes: 0, hidden: false }] as const; }
    })).then((e) => { if (live) setMins(Object.fromEntries(e)); });
    return () => { live = false; };
  }, [members, range, me?.uid]);

  const dur = (min: number) => min >= 60 ? `${n(Math.floor(min / 60))}${t("ঘ", "h")} ${n(min % 60)}${t("মি", "m")}` : `${n(min)}${t("মি", "m")}`;
  const rows = (members || []).map((m) => ({ m, ...(mins?.[m.uid] || { minutes: 0, hidden: false }) }))
    .sort((a, b) => Number(a.hidden) - Number(b.hidden) || b.minutes - a.minutes);
  const top = Math.max(1, ...rows.filter((r) => !r.hidden).map((r) => r.minutes));
  const total = rows.filter((r) => !r.hidden).reduce((a, r) => a + r.minutes, 0);
  const medal = ["text-amber-500", "text-slate-400", "text-orange-500"];
  let place = 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="p-1 rounded-xl bg-slate-200/60 dark:bg-white/5 grid grid-cols-2">
        {(["week", "all"] as const).map((k) => (
          <button key={k} onClick={() => { setMins(null); setRange(k); }} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${range === k ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
            {k === "week" ? t("এই সপ্তাহ", "This week") : t("সব সময়", "All time")}
          </button>
        ))}
      </div>
      <div className="surface rounded-2xl p-4 flex items-center justify-between">
        <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("গ্রুপের মোট ফোকাস", "Group focus total")}</p><p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{mins ? dur(total) : "…"}</p></div>
        <span className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><Medal size={22} /></span>
      </div>
      {!mins || !members ? (
        <p className="text-center text-sm text-slate-400 py-8">{t("লোড হচ্ছে...", "Loading...")}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const rank = r.hidden ? 0 : ++place;
            return (
              <div key={r.m.uid} className={`surface rounded-2xl px-3.5 py-3 flex items-center gap-3 ${r.m.uid === me?.uid ? "!border-indigo-400/60" : ""}`}>
                <span className={`w-6 text-center text-sm font-extrabold tabular-nums ${rank > 0 && rank <= 3 ? medal[rank - 1] : "text-slate-400"}`}>{rank > 0 ? n(rank) : "–"}</span>
                {avatarOf(r.m.name, r.m.photoURL, "w-9 h-9 text-sm", r.m)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.m.name}{r.m.uid === me?.uid && <span className="text-slate-400 font-medium"> ({t("তুমি", "you")})</span>}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700" style={{ width: `${r.hidden ? 0 : Math.round((r.minutes / top) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">{r.hidden ? t("লুকানো", "Hidden") : dur(r.minutes)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// এই গ্রুপে নিজের নাম আর অবতার বদলানো (শুধু এই গ্রুপে দেখা যায়)
function ProfileSheet({ group, member, myLook, onClose, flash, t }: { group: Group; member: Member; myLook: Look; onClose: () => void; flash: (m: string) => void; t: TFn }) {
  const [name, setName] = useState(member.name);
  const [avatar, setAvatar] = useState(member.avatar || "");
  const [color, setColor] = useState(member.avColor || "indigo");
  const [busy, setBusy] = useState(false);
  const ok = name.trim().length >= 1 && !busy;
  const save = async () => {
    setBusy(true);
    try {
      await updateDoc(doc(db, "communities", group.id, "members", member.uid), { name: name.trim().slice(0, 40), avatar, avColor: color });
      onClose();
    } catch { flash(t("সেভ করা যায়নি, আবার চেষ্টা করো", "Couldn't save, try again")); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#161b26] rounded-t-[28px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom duration-300 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t("এই গ্রুপে আমার প্রোফাইল", "My profile in this group")}</h2>
          <button onClick={onClose} aria-label={t("বন্ধ করো", "Close")} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500"><X size={18} /></button>
        </div>
        <div className="flex justify-center mb-4">{avatarOf(name || "?", member.photoURL, "w-20 h-20 text-3xl", { avatar, avColor: color })}</div>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("গ্রুপে আমার নাম", "Name in this group")}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
          className="mt-1 mb-4 w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/50" />
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("অবতার", "Avatar")}</label>
        <div className="mt-2 grid grid-cols-7 gap-2">
          <button type="button" onClick={() => setAvatar("")} className={`aspect-square rounded-xl flex items-center justify-center text-[10px] font-extrabold transition-all ${!avatar ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-500"}`}>{t("ছবি", "Photo")}</button>
          {AVATARS.map((e) => (
            <button key={e} type="button" onClick={() => setAvatar(e)} className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${avatar === e ? "bg-indigo-100 dark:bg-indigo-500/25 ring-2 ring-indigo-500 scale-105" : "bg-slate-100 dark:bg-white/5"}`}>{e}</button>
          ))}
        </div>
        {myLook.avatar && (avatar !== myLook.avatar || color !== (myLook.avColor || "indigo")) && (
          <button type="button" onClick={() => { setAvatar(myLook.avatar || ""); setColor(myLook.avColor || "indigo"); }} className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-300 underline">{t("প্রোফাইলের অবতারটা নাও", "Use my profile avatar")} {myLook.avatar}</button>
        )}
        {avatar && (
          <div className="mt-3 flex flex-wrap gap-2.5">
            {Object.entries(COLORS).map(([k, [f, e]]) => (
              <button key={k} type="button" onClick={() => setColor(k)} aria-label={k} className={`w-7 h-7 rounded-full transition-transform ${color === k ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-white/60 ring-offset-white dark:ring-offset-[#161b26] scale-110" : ""}`} style={{ background: `linear-gradient(135deg, ${f}, ${e})` }} />
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-3">{t("এটা শুধু এই গ্রুপের সদস্যরা দেখবে। \"ছবি\" বাছলে তোমার Google ছবি (বা নামের প্রথম অক্ষর) দেখাবে।", "Only members of this group see this. \"Photo\" shows your Google picture (or your initial).")}</p>
        <button disabled={!ok} onClick={save} className={`press mt-4 w-full py-3.5 rounded-2xl text-sm font-extrabold transition-all ${ok ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-200 dark:bg-white/5 text-slate-400"}`}>{busy ? t("সেভ হচ্ছে...", "Saving...") : t("সেভ করো", "Save")}</button>
      </div>
    </div>
  );
}
