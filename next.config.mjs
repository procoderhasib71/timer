import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  cacheStartUrl: true,
  dynamicStartUrl: true,   // শুরুর পাতা আগে নেট থেকে (নতুন version সাথে সাথে), নেট না থাকলে cache থেকে
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        // অন্য সাইট অ্যাপকে iframe এ ঢোকাতে পারবে না। স্ক্রিপ্টের কড়া CSP দিইনি: Google লগইন আর Firebase ভাঙার ঝুঁকি
        // (money-manager-app/next.config.mjs এর সাথে একই)
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }];
  },
  turbopack: {}, // <--- এই লাইনটি যোগ করা হয়েছে এরর ফিক্স করার জন্য
};

export default withPWA(nextConfig);