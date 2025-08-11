import cron from "node-cron";
import pool from "../db.js";

export function startLockGamesJob() {
  // every minute
  cron.schedule("*/1 * * * *", async () => {
    try {
      const [r] = await pool.query(
        `UPDATE games
           SET status = 'locked', updated_at = NOW()
         WHERE status = 'scheduled'
           AND tipoff_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)`
      );
      if (r.affectedRows > 0) {
        console.log(`[lockGames] Locked ${r.affectedRows} game(s)`);
      }
    } catch (e) {
      console.error("[lockGames] Error:", e);
    }
  }, { timezone: "UTC" });
}