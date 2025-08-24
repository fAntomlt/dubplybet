import cron from "node-cron";
import pool from "../db.js";
import { nowLTString } from "../utils/gameLock.js";
import { enqueueDiscordEvent } from '../discord/events.js';

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
  cron.schedule('*/1 * * * *', async () => {
    try {
      const nowLt = nowLTString();

      // 1) Which games will be locked now?
      const [toLock] = await pool.query(
        `SELECT id, tournament_id, team_a, team_b, tipoff_at
           FROM games
          WHERE status = 'scheduled'
            AND tipoff_at <= DATE_ADD(?, INTERVAL 10 MINUTE)`,
        [nowLt]
      );

      if (!toLock.length) return;

      // 2) Lock them
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

      // 3) Enqueue GAME_LOCK for each (dedupe prevents dupes)
      for (const g of toLock) {
        await enqueueDiscordEvent({
          type: 'GAME_LOCK',
          dedupeKey: `GAME_LOCK:${g.id}`,
          scheduledFor: nowLt,
          payload: { team_a: g.team_a, team_b: g.team_b },
          tournamentId: g.tournament_id,
          gameId: g.id,
          channelHint: 'locks',
        });
      }
    } catch (e) {
      console.error('[lockGames] Error:', e);
    }
  }, { timezone: 'Europe/Vilnius' });
}