// চাপলে হালকা কম্পন (Android এ চলে; iPhone Safari তে vibrate নেই, তাই কিছু হয় না)
export function tap(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {}
}
