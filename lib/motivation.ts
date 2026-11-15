// অনুপ্রেরণার উক্তি: [বাংলা, English, কার কথা (না থাকলে খালি)]
// দিনের উক্তি তারিখ ধরে ঠিক হয় (সারা দিন একই), টাইমারে সেশন ধরে বদলায়।
export type Quote = { bn: string; en: string; by?: string };

export const QUOTES: Quote[] = [
  { bn: "প্রতিদিনের ছোট ছোট চেষ্টাই একদিন বড় সাফল্য হয়ে ফেরে।", en: "Small efforts, repeated every day, become big results." },
  { bn: "আজ যেটুকু পড়বে, কাল সেটুকুই তোমার আত্মবিশ্বাস।", en: "What you study today becomes your confidence tomorrow." },
  { bn: "শুরু করাটাই সবচেয়ে কঠিন। শুরু করে ফেললে অর্ধেক কাজ শেষ।", en: "Starting is the hardest part. Begin, and half the work is done." },
  { bn: "ক্লান্ত লাগলে থেমো না, একটু বিরতি নাও, তারপর আবার ফেরো।", en: "Tired? Don't quit. Rest a little, then come back." },
  { bn: "তুমি যত মন দেবে, সময় তত তোমার পক্ষে কাজ করবে।", en: "The more focus you give, the more time works for you." },
  { bn: "স্বপ্ন দেখলে হবে না, ২৫ মিনিট করে তাকে সময় দিতে হবে।", en: "Dreams need more than wishing. Give them 25 minutes at a time." },
  { bn: "কঠিন লাগছে মানে তুমি আগাচ্ছ।", en: "If it feels hard, you are moving forward." },
  { bn: "ফোনটা সরিয়ে রাখো। তোমার ভবিষ্যৎ এই সেশনেই তৈরি হচ্ছে।", en: "Put the phone away. Your future is being built in this session." },
  { bn: "যে আজ কষ্ট করে, সে-ই কাল হাসে।", en: "Who works hard today smiles tomorrow." },
  { bn: "পারফেক্ট হওয়ার দরকার নেই, শুধু নিয়মিত হও।", en: "You don't need to be perfect, just consistent." },
  { bn: "একটা সেশন শেষ মানে লক্ষ্যের আরও এক ধাপ কাছে।", en: "One more session done is one more step closer to your goal." },
  { bn: "মন ভেসে গেলে ফিরিয়ে আনো, এটাই আসল অনুশীলন।", en: "When your mind drifts, bring it back. That is the real practice." },
  { bn: "আজকের পরিশ্রম কাল তোমাকে ধন্যবাদ জানাবে।", en: "Today's effort will thank you tomorrow." },
  { bn: "ধীরে হলেও এগিয়ে চলো, থেমে যাওয়াটাই একমাত্র হার।", en: "Go slowly if you must, but keep going. Stopping is the only loss." },
  { bn: "তোমার প্রতিযোগিতা অন্যের সাথে নয়, গতকালের তোমার সাথে।", en: "Your rival is not others, it's yesterday's you." },
  { bn: "মনোযোগ হলো সবচেয়ে দামি সম্পদ, দেখে খরচ করো।", en: "Attention is your most valuable asset. Spend it wisely." },
  { bn: "আজ ছুটি নিলে কাল দ্বিগুণ খাটতে হবে। আজই শুরু করো।", en: "Skip today and you'll work double tomorrow. Start now." },
  { bn: "ভালো ফল হঠাৎ আসে না, রোজকার অভ্যাস থেকে আসে।", en: "Good results don't come suddenly. They come from daily habits." },
  { bn: "তুমি পারবে। আগেও কঠিন সময় পার করেছ।", en: "You can do this. You've got through hard times before." },
  { bn: "সফল মানুষ ইচ্ছা নয়, নিয়মের ওপর চলে।", en: "Successful people run on routine, not on mood." },
  { bn: "এই ২৫ মিনিটটা শুধু তোমার। পুরোটা কাজে লাগাও।", en: "These 25 minutes are yours alone. Use every one." },
  { bn: "প্রতিটা ভুল শেখার একটা সুযোগ, ভয় পেয়ো না।", en: "Every mistake is a chance to learn. Don't fear it." },
  { bn: "লক্ষ্য বড় হলে ছোট ছোট ভাগ করে নাও, একটা একটা করে শেষ করো।", en: "Big goal? Split it into small parts and finish them one by one." },
  { bn: "আজ যা শিখবে, পরীক্ষার হলে সেটাই তোমার সাহস।", en: "What you learn today is your courage in the exam hall." },
];

export const BREAK_QUOTES: Quote[] = [
  { bn: "একটু পানি খাও, চোখ বন্ধ করে লম্বা শ্বাস নাও।", en: "Drink some water, close your eyes and breathe deeply." },
  { bn: "কাঁধ আর ঘাড় ঘুরিয়ে নাও, উঠে একটু হাঁটো।", en: "Roll your neck and shoulders, stand up and walk a little." },
  { bn: "বিরতিও পড়ার অংশ। মাথা বিশ্রাম নিলে মনে থাকে বেশি।", en: "Rest is part of studying. A rested mind remembers more." },
  { bn: "জানালার বাইরে তাকাও, চোখ দুটোকে একটু ছুটি দাও।", en: "Look out of the window and give your eyes a break." },
];

const dayNumber = (d = new Date()) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
export const quoteOfTheDay = (shift = 0): Quote => QUOTES[(dayNumber() + shift) % QUOTES.length];
export const quoteFor = (seed: number, isBreak = false): Quote => {
  const list = isBreak ? BREAK_QUOTES : QUOTES;
  return list[Math.abs(seed) % list.length];
};
