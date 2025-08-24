// ESM
import pool from '../db.js';

export async function enqueueDiscordEvent({
  type,            // 'DAY_START' | 'GAME_LOCK' | 'GAME_FINISHED' | 'TOURNAMENT_FINISHED'
  dedupeKey,       // string (unique)
  scheduledFor,    // 'YYYY-MM-DD HH:mm:ss' in LT
  payload,         // plain object -> will be JSON.stringified
  tournamentId = null,
  gameId = null,
  channelHint = null, // 'daily'|'locks'|'results'|'tournaments'
}) {
  const json = JSON.stringify(payload || {});
  await pool.query(
    `INSERT IGNORE INTO discord_events
     (type, dedupe_key, scheduled_for, payload, tournament_id, game_id, channel_hint, created_at)
     VALUES (?,?,?,?,?,?,?, NOW())`,
    [type, dedupeKey, scheduledFor, json, tournamentId, gameId, channelHint]
  );
}

// Helpers
export function ltNowSql() {
  // sv-SE => 'YYYY-MM-DD HH:mm:ss'
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Vilnius',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date());
}

export function ltDateSql(d = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Vilnius',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d); // 'YYYY-MM-DD'
}