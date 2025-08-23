import cron from "node-cron";
import pool from "../db.js";
import { nowLTString } from "../utils/gameLock.js";

function nowLT() {
   // 'sv-SE' gives 'YYYY-MM-DD HH:mm:ss'
   return new Intl.DateTimeFormat("sv-SE", {
     timeZone: "Europe/Vilnius",
     year: "numeric", month: "2-digit", day: "2-digit",
     hour: "2-digit", minute: "2-digit", second: "2-digit",
     hour12: false,
   }).format(new Date());
 }

export function startLockGamesJob() {
  // every minute
  cron.schedule("*/1 * * * *", async () => {
    try {
      const nowLt = nowLTString();
      const [r] = await pool.query(
        `UPDATE games
           SET status = 'locked', updated_at = NOW()
         WHERE status = 'scheduled'
           AND tipoff_at <= DATE_ADD(?, INTERVAL 10 MINUTE)`,
        [nowLt]
      );
      if (r.affectedRows > 0) {
        console.log(`[lockGames] Locked ${r.affectedRows} game(s)`);
      }
    } catch (e) {
      console.error("[lockGames] Error:", e);
    }
  }, { timezone: "Europe/Vilnius" });
}