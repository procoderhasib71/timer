import { collection, doc, getCountFromServer, getDoc, getDocs, increment, limit, orderBy, query, setDoc, where } from "firebase/firestore";
// @ts-ignore: Bypassing implicit any error for production build
import { db } from "@/lib/firebaseClient";
import { readSettings } from "@/lib/settings";

// আসল লিডারবোর্ড: প্রত্যেকের ফোকাস মিনিট leaderboards/{week বা "all"}/users/{uid} এ (Firestore)।
// নিজের ঘরে শুধু নিজে লেখে, লগইন করা সবাই পড়ে (firestore.rules এ সীমা: একবারে ৩ ঘণ্টার বেশি বাড়ানো যায় না)।
// সপ্তাহ শনিবার থেকে শুক্রবার, বাংলাদেশ সময়ে; week id = সেই শনিবারের তারিখ (YYYY-MM-DD)।

export type Board = "week" | "all";
export type Entry = { uid: string; name: string; hidden: boolean; minutes: number; sessions: number };

const BD = 6 * 60 * 60 * 1000;

export function weekId(at = Date.now()): string {
  const d = new Date(at + BD);                      // UTC এর ঘরে বাংলাদেশের তারিখ
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7));   // শনিবার পর্যন্ত পেছাই (শনি = 6)
  return d.toISOString().slice(0, 10);
}

const boardId = (b: Board) => (b === "week" ? weekId() : "all");
const ref = (b: Board, uid: string) => doc(db, "leaderboards", boardId(b), "users", uid);

/** লিডারবোর্ডে নাম দেখাবে কিনা (সেটিংস, এই ফোনে) */
export const isHidden = () => {
  return readSettings().showOnLeaderboard === false;
};

// ensureEntry চলার সময় কোনো সেশন শেষ হলে সেটা দুবার গোনা হতো (ঘর বানানোর গোনায় একবার, addMinutes এ আবার)।
// তাই: addMinutes আগে চলমান ensureEntry শেষ হওয়ার অপেক্ষা করে, আর ensureEntry যে সেশনগুলো গুনেছে
// (id দিয়ে) আর যে ঘর নিজে বানিয়েছে, সেখানে আর যোগ করে না।
type Ensured = { counted: Set<string>; created: Board[] };
const ensuring = new Map<string, Promise<Ensured>>();
// rules এ নতুন ঘর বানানোর সীমা (firestore.rules এর সাথে মিলিয়ে রাখো)
const CREATE_MAX = 180;

/** প্রথমবার: নিজের আগের সেশন থেকে এই সপ্তাহের আর সব সময়ের মিনিট গুনে ঘর বানাই */
export function ensureEntry(uid: string, name: string): Promise<void> {
  const p = createEntries(uid, name);
  ensuring.set(uid, p.catch(() => ({ counted: new Set<string>(), created: [] })));
  return p.then(() => undefined);
}

async function createEntries(uid: string, name: string): Promise<Ensured> {
  const counted = new Set<string>();
  const created: Board[] = [];
  const [w, a] = await Promise.all([getDoc(ref("week", uid)), getDoc(ref("all", uid))]);
  if (w.exists() && a.exists()) return { counted, created };
  const start = Date.parse(`${weekId()}T00:00:00+06:00`);
  let week = 0, weekN = 0, all = 0, allN = 0;
  (await getDocs(collection(db, "users", uid, "sessions"))).forEach((s) => {
    const x = s.data();
    counted.add(s.id);
    if (x.mode && x.mode !== "pomodoro") return;
    const m = Math.max(0, Math.round(Number(x.duration) || 0));
    all += m; allN++;
    if (Date.parse(x.timestamp) >= start) { week += m; weekN++; }
  });
  const base = { uid, name: name.slice(0, 40), hidden: isHidden() };
  if (!w.exists()) {
    await setDoc(ref("week", uid), { ...base, minutes: Math.min(week, CREATE_MAX), sessions: weekN });
    created.push("week");
  }
  if (!a.exists()) {
    await setDoc(ref("all", uid), { ...base, minutes: Math.min(all, CREATE_MAX), sessions: allN });
    created.push("all");
  }
  return { counted, created };
}

/** একটা ফোকাস সেশন শেষ (বা মাঝপথে থামানো): মিনিট যোগ। sessionId = users/{uid}/sessions এর doc id */
export async function addMinutes(uid: string, name: string, minutes: number, sessionId?: string) {
  const m = Math.min(180, Math.max(0, Math.round(minutes)));
  if (!m) return;
  const done = await ensuring.get(uid);
  const skip = done && sessionId && done.counted.has(sessionId) ? done.created : [];
  const data = { uid, name: name.slice(0, 40), hidden: isHidden(), minutes: increment(m), sessions: increment(1) };
  await Promise.all((["week", "all"] as Board[]).filter((b) => !skip.includes(b))
    .map((b) => setDoc(ref(b, uid), data, { merge: true })));
}

/** সেটিংসে নাম লুকানো/দেখানো বদলালে দুই বোর্ডেই */
export async function setHidden(uid: string, hidden: boolean) {
  await Promise.all((["week", "all"] as Board[]).map(async (b) => {
    if ((await getDoc(ref(b, uid))).exists()) await setDoc(ref(b, uid), { hidden }, { merge: true });
  }));
}

export async function topEntries(b: Board, n = 50): Promise<Entry[]> {
  const snap = await getDocs(query(collection(db, "leaderboards", boardId(b), "users"), orderBy("minutes", "desc"), limit(n)));
  return snap.docs.map((d) => {
    const x = d.data();
    return { uid: d.id, name: String(x.name || ""), hidden: Boolean(x.hidden), minutes: Number(x.minutes) || 0, sessions: Number(x.sessions) || 0 };
  }).filter((e) => e.minutes > 0);
}

/** নিজের ঘর আর র‍্যাঙ্ক (প্রথম ৫০ এর বাইরে থাকলেও; আমার চেয়ে বেশি মিনিট কয়জনের সেটা গুনে) */
export async function myEntry(b: Board, uid: string): Promise<{ entry: Entry; rank: number } | null> {
  const d = await getDoc(ref(b, uid));
  if (!d.exists() || !(Number(d.data().minutes) > 0)) return null;
  const x = d.data();
  const entry = { uid, name: String(x.name || ""), hidden: Boolean(x.hidden), minutes: Number(x.minutes) || 0, sessions: Number(x.sessions) || 0 };
  const ahead = await getCountFromServer(query(collection(db, "leaderboards", boardId(b), "users"), where("minutes", ">", entry.minutes)));
  return { entry, rank: ahead.data().count + 1 };
}
