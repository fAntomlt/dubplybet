// server/src/utils/gameLock.js
function fmtLT(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Vilnius",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(date);
}

export function nowLTString() {            // "YYYY-MM-DD HH:mm:ss" in LT
  return fmtLT(new Date());
}
export function cutoff10mLTString() {      // now + 10 min in LT
  return fmtLT(new Date(Date.now() + 10 * 60 * 1000));
}

// Normalize DB tipoff to the same LT wall-time string regardless of type
export function tipoffLTString(tipoff_at) {
  if (tipoff_at instanceof Date) return fmtLT(tipoff_at);

  const s = String(tipoff_at || "");
  // "YYYY-MM-DD HH:mm:ss" or ISO
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    return s.replace("T", " ").slice(0, 19).replace(/(\d{2}:\d{2})$/, "$1:00");
  }
  // date only
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;

  // last-resort parse
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s.slice(0, 19).replace("T", " ") : fmtLT(d);
}

export function isLocked(game) {
  const tip = tipoffLTString(game?.tipoff_at);
  const cutoff = cutoff10mLTString();
  return game?.status !== "scheduled" || tip <= cutoff;
}