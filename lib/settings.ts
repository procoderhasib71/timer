// এই ফোনে রাখা টাইমার সেটিংস (localStorage "pomodoro_settings")।
// মান নষ্ট হলে বা localStorage বন্ধ থাকলে (প্রাইভেট মোড) খালি সেটিংস দিই, অ্যাপ যেন crash না করে।
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Settings = Record<string, any>;

export function readSettings(): Settings {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(localStorage.getItem("pomodoro_settings") || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
