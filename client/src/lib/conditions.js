import { bandFromDiff } from "./flags";

export function guessConditionPretty({ team_a, team_b, a, b, finished, cond_ok, diff_ok, exact_ok, awarded_points }){
  const winner = a > b ? team_a : (b > a ? team_b : "Lygiosios");
  const diff = Math.abs(a - b);
  const band = bandFromDiff(diff);
  const part1 = `${winner} ${band}`;
  const part2 = `[${diff} pt.]`;
  const part3 = `(${a}–${b})`;
  const bold = (s,on)=> on?`**${s}**`:s;
  const text = `${bold(part1, finished && cond_ok)} ${bold(part2, finished && diff_ok)} ${bold(part3, finished && exact_ok)}${finished && awarded_points!=null ? ` [${awarded_points}p]` : ""}`;
  return text;
}