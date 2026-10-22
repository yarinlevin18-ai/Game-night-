// Short haptic tap where supported (Android; iOS ignores it).
export function buzz(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}
