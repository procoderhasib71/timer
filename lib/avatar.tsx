// অবতার: ইমোজি + রঙ। প্রোফাইলে একবার বাছলে গ্রুপে ঢোকার সময় সেটাই বসে (গ্রুপে আলাদা করেও বদলানো যায়)।
// প্রোফাইলের অবতার থাকে users/{uid}/profile/avatar এ (শুধু নিজে পড়ে/লেখে)।
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export const AVATARS = ["🦊", "🐼", "🐯", "🦁", "🐨", "🐸", "🦉", "🐬", "🦄", "🐙", "🦋", "🐢", "🚀", "⭐", "🔥", "🌙", "🍀", "🎯", "📚", "🧠", "🎧", "☕", "🌸", "⚡"];
export const COLORS: Record<string, [string, string]> = {
  indigo: ["#6366f1", "#8b5cf6"], rose: ["#f43f5e", "#fb923c"], emerald: ["#10b981", "#14b8a6"], sky: ["#0ea5e9", "#6366f1"],
  amber: ["#f59e0b", "#ef4444"], pink: ["#ec4899", "#a855f7"], teal: ["#14b8a6", "#0ea5e9"], slate: ["#475569", "#1e293b"],
};
export type Look = { avatar?: string; avColor?: string };

/** গোল অবতার: ইমোজি থাকলে রঙিন পটে ইমোজি, নইলে ছবি বা নামের প্রথম অক্ষর */
export function AvatarBadge({ name, photo, look, cls = "w-8 h-8 text-xs" }: { name: string; photo?: string | null; look?: Look; cls?: string }) {
  if (look?.avatar) {
    const [from, to] = COLORS[look.avColor || ""] || COLORS.indigo;
    return (
      <div className={`${cls} rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <span className="leading-none" style={{ fontSize: "1.15em" }}>{look.avatar}</span>
      </div>
    );
  }
  return (
    <div className={`${cls} rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 font-bold shadow-sm overflow-hidden`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : (name.trim().charAt(0) || "?").toUpperCase()}
    </div>
  );
}

const ref = (uid: string) => doc(db, "users", uid, "profile", "avatar");
export async function loadMyAvatar(uid: string): Promise<Look> {
  try { const d = await getDoc(ref(uid)); return d.exists() ? { avatar: d.data().avatar || "", avColor: d.data().avColor || "indigo" } : {}; } catch { return {}; }
}
export const saveMyAvatar = (uid: string, look: Look) => setDoc(ref(uid), { avatar: look.avatar || "", avColor: look.avColor || "indigo" });

/** প্রোফাইলে অবতার বদলালে যত গ্রুপের সদস্য, সবখানে বদলে দিই (শুধু অবতার; গ্রুপে রাখা নাম নয়) */
export async function syncAvatarToGroups(uid: string, look: Look) {
  const groups = await getDocs(collection(db, "communities"));
  await Promise.all(groups.docs.map(async (g) => {
    const m = doc(db, "communities", g.id, "members", uid);
    try {
      if ((await getDoc(m)).exists()) await updateDoc(m, { avatar: look.avatar || "", avColor: look.avColor || "indigo" });
    } catch { /* এই গ্রুপে হয়নি, বাকিগুলো চলুক */ }
  }));
}
