export function isLocked(game) {
  // lock guesses 10 minutes before tipoff
  const tip = new Date(game.tipoff_at).getTime();
  const now = Date.now();
  const tenMin = 10 * 60 * 1000;
  return now >= (tip - tenMin) || game.status !== "scheduled";
}