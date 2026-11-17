// অবতার: ইমোজি + রঙ। প্রোফাইলে একবার বাছলে গ্রুপে ঢোকার সময় সেটাই বসে (গ্রুপে আলাদা করেও বদলানো যায়)।
// প্রোফাইলের অবতার থাকে users/{uid}/profile/avatar এ (শুধু নিজে পড়ে/লেখে)। নিজের ছবি দিলে ছোট করে (১৬০px JPEG)
// একই ডকে `photo` হিসেবে থাকে; ছবি থাকলে সেটাই আগে দেখায়। Money, AdMCQ, পোর্টাল সবাই এই ডক পড়ে।
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export const AVATARS = ["👨‍🎓", "👩‍🎓", "🧑‍⚕️", "👨‍⚕️", "👩‍⚕️", "🧑‍💻", "👨‍💻", "👩‍💻", "👨‍🏫", "👩‍🏫", "🧑‍🔬", "🧕", "🧔", "👦", "👧", "🦸", "🦊", "🐼", "🐯", "🦁", "🐨", "🐸", "🦉", "🐬", "🦄", "🚀", "⭐", "🔥"];   // আগে মানুষ, তারপর প্রাণী আর অন্যান্য
export const COLORS: Record<string, [string, string]> = {
  indigo: ["#6366f1", "#8b5cf6"], rose: ["#f43f5e", "#fb923c"], emerald: ["#10b981", "#14b8a6"], sky: ["#0ea5e9", "#6366f1"],
  amber: ["#f59e0b", "#ef4444"], pink: ["#ec4899", "#a855f7"], teal: ["#14b8a6", "#0ea5e9"], slate: ["#475569", "#1e293b"],
};
export type Look = { avatar?: string; avColor?: string; photo?: string };

/** গোল অবতার: ইমোজি থাকলে রঙিন পটে ইমোজি, নইলে ছবি বা নামের প্রথম অক্ষর */
export function AvatarBadge({ name, photo, look, cls = "w-8 h-8 text-xs" }: { name: string; photo?: string | null; look?: Look; cls?: string }) {
  if (look?.photo) {
    return (
      <div className={`${cls} rounded-full shrink-0 shadow-sm overflow-hidden bg-slate-200`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.photo} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
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
  try {
    const d = await getDoc(ref(uid));
    return d.exists() ? { avatar: d.data().avatar || "", avColor: d.data().avColor || "indigo", photo: d.data().photo || "" } : {};
  } catch { return {}; }
}
export const saveMyAvatar = (uid: string, look: Look) =>
  setDoc(ref(uid), { avatar: look.photo ? "" : look.avatar || "", avColor: look.avColor || "indigo", photo: look.photo || "" });

/** ছবি ফাইল → মাঝখান থেকে কাটা ১৬০×১৬০ JPEG (data URL, ~১০-২০KB): Firestore ডকে সরাসরি রাখা যায় */
export function fileToPhoto(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("not an image"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = size;
      c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

/** গ্রুপের সদস্য/অনুরোধের ডকে কী বসবে: ছবি থাকলে photoURL এ ছবি (ইমোজি ফাঁকা), নইলে ইমোজি */
export function memberLook(look: Look, fallbackPhoto: string | null): { avatar?: string; avColor?: string; photoURL: string | null } {
  if (look.photo) return { avatar: "", avColor: look.avColor || "indigo", photoURL: look.photo };
  return { ...(look.avatar ? { avatar: look.avatar, avColor: look.avColor || "indigo" } : {}), photoURL: fallbackPhoto };
}

/** প্রোফাইলে অবতার বদলালে যত গ্রুপের সদস্য, সবখানে বদলে দিই (শুধু অবতার; গ্রুপে রাখা নাম নয়) */
export async function syncAvatarToGroups(uid: string, look: Look) {
  const groups = await getDocs(collection(db, "communities"));
  await Promise.all(groups.docs.map(async (g) => {
    const m = doc(db, "communities", g.id, "members", uid);
    try {
      const cur = await getDoc(m);
      if (cur.exists()) await updateDoc(m, groupPatch(look, cur.data().photoURL ?? null));
    } catch { /* এই গ্রুপে হয়নি, বাকিগুলো চলুক */ }
  }));
}

/** সদস্যের ডকে প্রোফাইলের অবতার/ছবি বসানোর পরিবর্তন; ছবি সরালে আগের বসানো ছবিও (data:) সরে */
export function groupPatch(look: Look, curPhoto: string | null): { avatar: string; avColor: string; photoURL: string | null } {
  if (look.photo) return { avatar: "", avColor: look.avColor || "indigo", photoURL: look.photo };
  return { avatar: look.avatar || "", avColor: look.avColor || "indigo", photoURL: curPhoto?.startsWith("data:") ? null : curPhoto };
}

/** সদস্যের ডক প্রোফাইলের সাথে মেলে কিনা */
export function memberMatches(look: Look, m: { avatar?: string; avColor?: string; photoURL?: string | null }): boolean {
  if (look.photo) return m.photoURL === look.photo && !m.avatar;
  if ((m.photoURL || "").startsWith("data:")) return false;
  return (m.avatar || "") === (look.avatar || "") && (!look.avatar || m.avColor === look.avColor);
}
