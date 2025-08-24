import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import pool from '../src/db.js'; // reuse your DB pool
import { TEAM_TO_ISO } from './team-map.js'; // create below

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TZ = process.env.TIMEZONE || 'Europe/Vilnius';
const FETCH_LIMIT = 20;

// Flag helper
function flagEmoji(iso2) {
  if (!iso2) return '🏀';
  const up = iso2.toUpperCase();
  return String.fromCodePoint(...[...up].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65)));
}
function codeForTeam(name) {
  return TEAM_TO_ISO[String(name || '').trim()] || null;
}
const F = (name) => flagEmoji(codeForTeam(name));

async function resolveChannelId(purpose, tournamentId) {
  // 1) specific override
  let [[row]] = await pool.query(
    'SELECT channel_id FROM discord_channels WHERE purpose=? AND tournament_id=? AND active=1 LIMIT 1',
    [purpose, tournamentId || null]
  );
  if (row?.channel_id) return row.channel_id;

  // 2) default for purpose (tournament_id IS NULL)
  [[row]] = await pool.query(
    'SELECT channel_id FROM discord_channels WHERE purpose=? AND tournament_id IS NULL AND active=1 LIMIT 1',
    [purpose]
  );
  if (row?.channel_id) return row.channel_id;

  // 3) env fallback
  const envKey = {
    daily: 'DISCORD_CHAN_DAILY',
    locks: 'DISCORD_CHAN_LOCKS',
    results: 'DISCORD_CHAN_RESULTS',
    tournaments: 'DISCORD_CHAN_TOURNAMENTS',
  }[purpose];
  return process.env[envKey] || null;
}

// Message builders
function buildDayStart(payload) {
  const lines = [];
  lines.push('siandien nauja rungtyniu diena! siandien zaidzia:\n');
  for (const g of payload.games || []) {
    lines.push(`${F(g.team_a)} ${g.team_a} VS ${g.team_b} ${F(g.team_b)}`);
  }
  return lines.join('\n');
}
function buildGameLock(payload) {
  return `Uz 10min prasides naujas zaidimas, rezultato spejimas uzdaromas:\n${F(payload.team_a)} ${payload.team_a} VS ${payload.team_b} ${F(payload.team_b)}`;
}
function buildGameFinished(payload) {
  return `Rungtynes baigtos, rezultatas:\n${F(payload.team_a)} ${payload.team_a} ${payload.score_a} - ${payload.score_b} ${payload.team_b} ${F(payload.team_b)}`;
}
async function buildTournamentFinished(payload) {
  const tid = payload.tournament_id;
  // winner user (top of tournament_scores)
  let champion = null;
  try {
    const [[row]] = await pool.query(
      `SELECT ts.user_id, u.username
         FROM tournament_scores ts
         JOIN users u ON u.id = ts.user_id
        WHERE ts.tournament_id = ?
        ORDER BY ts.points DESC, u.username ASC
        LIMIT 1`, [tid]
    );
    champion = row ? row.username : null;
  } catch {}
  const link = (process.env.FRONTEND_URL || 'https://dubply.bet') + `/turnyrai/${tid}`;
  return [
    `Aciu visiems uz dalyvavima, ${payload.tournament_name} turnyras oficialiai skelbiamas BAIGTU.`,
    `Nugalejusi salis: ${F(payload.winner_team)} ${payload.winner_team}`,
    `Speliojusiu cempionas, gaves pinigini priza: ${champion || '—'}`,
    `Turnyro info: ${link}`,
  ].join('\n');
}

async function formatMessage(row) {
  const payload = JSON.parse(row.payload || '{}');
  switch (row.type) {
    case 'DAY_START':           return buildDayStart(payload);
    case 'GAME_LOCK':           return buildGameLock(payload);
    case 'GAME_FINISHED':       return buildGameFinished(payload);
    case 'TOURNAMENT_FINISHED': return await buildTournamentFinished(payload);
    default: return null;
  }
}

async function fetchDueEvents() {
  const [rows] = await pool.query(
    `SELECT * FROM discord_events
      WHERE published_at IS NULL
        AND scheduled_for <= NOW()
      ORDER BY id ASC
      LIMIT ?`, [FETCH_LIMIT]
  );
  return rows || [];
}

async function markPublished(id) {
  await pool.query(
    'UPDATE discord_events SET published_at = NOW(), publish_error = NULL WHERE id = ?',
    [id]
  );
}
async function markError(id, err) {
  await pool.query(
    'UPDATE discord_events SET publish_error = ? WHERE id = ?',
    [String(err).slice(0, 2000), id]
  );
}

async function processQueue() {
  const rows = await fetchDueEvents();
  if (!rows.length) return;

  for (const row of rows) {
    try {
      const channelId = await resolveChannelId(row.channel_hint || 'daily', row.tournament_id);
      if (!channelId) {
        await markError(row.id, `No channel mapping for purpose=${row.channel_hint} tournament_id=${row.tournament_id}`);
        continue;
      }
      const content = await formatMessage(row);
      if (!content) {
        await markError(row.id, 'Empty content');
        continue;
      }
      const ch = await client.channels.fetch(channelId);
      await ch.send({ content });
      await markPublished(row.id);
    } catch (e) {
      await markError(row.id, e?.message || e);
    }
  }
}

client.once('ready', () => {
  console.log(`[discord] Logged in as ${client.user.tag}`);
  setInterval(processQueue, 5000);
  // also run once on boot
  processQueue().catch(console.error);
});

client.login(process.env.DISCORD_TOKEN);
