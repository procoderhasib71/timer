// টাইমার শেষ হলে শব্দ, কাঁপুনি আর নোটিফিকেশন।
// রিংটোনগুলো Web Audio দিয়ে বানানো (আলাদা অডিও ফাইল লাগে না)। ব্রাউজার শব্দ চালু করতে দেয় শুধু ইউজার কিছু চাপার পরে,
// তাই "Start" চাপার সময় unlockAudio() ডাকা হয়।

export const RINGTONES = ["Default", "Bell", "Digital", "Bird", "None"] as const;

let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx ||= new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
}

/** একটা সুর: freq থেকে (দিলে) toFreq এ, start সেকেন্ড পরে, len সেকেন্ড */
function tone(c: AudioContext, type: OscillatorType, freq: number, start: number, len: number, vol = 0.25, toFreq?: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t = c.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, t + len);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + len + 0.05);
}

export function playRingtone(name: string = "Default") {
  if (name === "None") return;
  unlockAudio();
  const c = ctx;
  if (!c) return;
  for (let r = 0; r < 3; r++) {
    const o = r * 1.2;   // তিনবার বাজে
    if (name === "Bell") {
      tone(c, "sine", 880, o, 1.1, 0.3);
      tone(c, "sine", 1320, o, 0.8, 0.12);
    } else if (name === "Digital") {
      for (let i = 0; i < 4; i++) tone(c, "square", 1000, o + i * 0.15, 0.08, 0.08);
    } else if (name === "Bird") {
      tone(c, "sine", 2000, o, 0.12, 0.2, 3200);
      tone(c, "sine", 2400, o + 0.18, 0.12, 0.2, 3600);
      tone(c, "sine", 2200, o + 0.4, 0.15, 0.2, 3000);
    } else {
      tone(c, "triangle", 660, o, 0.25, 0.3);
      tone(c, "triangle", 880, o + 0.3, 0.35, 0.3);
    }
  }
}

export function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([300, 150, 300, 150, 300]);
}

/** প্রথমবার Start চাপলে অনুমতি চাই; একবার না বললে আর জিজ্ঞেস করি না */
export function askNotifyPermission() {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  Notification.requestPermission().catch(() => undefined);
}

export async function notify(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const options = { body, icon: "/favicon.ico", tag: "pomodoro-timer", renotify: true } as NotificationOptions;
  try {
    // ইনস্টল করা PWA তে service worker দিয়ে দেখালে ফোনেও আসে
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, options);
  } catch { /* নিচে সাধারণ নোটিফিকেশন */ }
  try { new Notification(title, options); } catch { /* কিছু ফোনে সরাসরি Notification চলে না */ }
}
