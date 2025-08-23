function nowPlus10LT() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Vilnius",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(new Date(Date.now() + 10 * 60 * 1000));
}

export function isLocked(game) {
  // Both sides are LT wall time strings "YYYY-MM-DD HH:mm:ss"
  const tip = String(game.tipoff_at || "").slice(0, 19).replace("T", " ");
  const cutoff = nowPlus10LT();
  return game.status !== "scheduled" || tip <= cutoff;
}