import cron from 'node-cron';
import pool from '../db.js';
import { enqueueDiscordEvent, ltDateSql } from '../discord/events.js';

// Build one "DAY_START" summary for all today's games (across tournaments).
export function startDayStartJob() {
  cron.schedule('0 10 * * *', async () => {
    const today = ltDateSql(); // 'YYYY-MM-DD' in LT
    // gather all games that start today (scheduled or locked)
    const [rows] = await pool.query(
      `SELECT team_a, team_b
         FROM games
        WHERE DATE(tipoff_at) = ?
          AND status IN ('scheduled','locked')
        ORDER BY tipoff_at ASC`, [today]
    );
    if (!rows.length) return;

    const games = rows.map(r => ({ team_a: r.team_a, team_b: r.team_b }));
    await enqueueDiscordEvent({
      type: 'DAY_START',
      dedupeKey: `DAY_START:${today}`,
      scheduledFor: `${today} 10:00:00`,
      payload: { date: today, games },
      channelHint: 'daily',
    });
  }, { timezone: 'Europe/Vilnius' });
}