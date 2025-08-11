/**
 * Return {cond_ok, diff_ok, exact_ok, points}
 * Stage: "group" => tiers 1/3/5, "playoff" => 2/4/6
 */
export function scoreGuess({ stage, guess_a, guess_b, score_a, score_b }) {
  const diffGuess = Math.abs(guess_a - guess_b);
  const diffReal  = Math.abs(score_a - score_b);

  // Who wins and by >5, =5, <5?
  const sign = (x) => (x > 0 ? 1 : (x < 0 ? -1 : 0));
  const winnerGuess = sign(guess_b - guess_a); // +1 => B wins, -1 => A wins, 0 => tie (shouldn't happen in basketball)
  const winnerReal  = sign(score_b - score_a);

  const bandGuess = diffGuess > 5 ? "gt5" : (diffGuess === 5 ? "eq5" : "lt5");
  const bandReal  = diffReal  > 5 ? "gt5" : (diffReal  === 5 ? "eq5" : "lt5");

  const cond_ok = (winnerGuess === winnerReal) && (bandGuess === bandReal);
  const diff_ok = cond_ok && (diffGuess === diffReal);
  const exact_ok = diff_ok && (guess_a === score_a) && (guess_b === score_b);

  const base = stage === "playoff" ? [0,2,4,6] : [0,1,3,5];
  let points = 0;
  if      (exact_ok) points = base[3];
  else if (diff_ok)  points = base[2];
  else if (cond_ok)  points = base[1];
  else               points = base[0];

  return { cond_ok, diff_ok, exact_ok, points };
}