import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import http from "http";
import adminUsersRoutes from "./routes/admin.users.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";
import { Server as IOServer } from "socket.io";
import { db } from "./db.js";
import {verifyToken} from './utils/jwt.js'
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";


import authRoutes from "./routes/auth.js";
import pool, { dbPing } from "./db.js";
import tournamentsAdmin from "./routes/admin.tournaments.js";
import gamesAdmin from "./routes/admin.games.js";
import gamesPublic from "./routes/games.public.js";
import gamesGuess from "./routes/games.guess.js";
import gamePublicGuesses from "./routes/games.public.guesses.js";
import leaderboardsPublic from "./routes/leaderboards.public.js";
import { startLockGamesJob } from "./jobs/lockGames.js";
import chatPublic from './routes/chat.public.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "*")
  .split(",").map(s=>s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin), false);
  },
  credentials: true,
};

const chatPublic = require("./routes/chat.public");

// ORDER: parsers → cors → routes
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));
app.use("/api/admin", requireAuth, requireAdmin, adminUsersRoutes);
app.use("/api/admin", requireAuth, requireAdmin, tournamentsAdmin);
app.use("/api/admin", requireAuth, requireAdmin, gamesAdmin);
app.use("/api/games", gamesPublic);
app.use("/api/games", gamesGuess);
app.use("/api/games", gamePublicGuesses);
app.use("/api/leaderboards", leaderboardsPublic);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Per daug užklausų. Bandykite dar kartą vėliau." }
});
app.use("/api/auth", authLimiter, authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get("/api/db-health", async (req, res) => {
  try {
    const ok = await dbPing();
    res.json({ ok });
  } catch {
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }
});

// simple in-memory throttle (per user)
const lastSendAt = new Map();

io.on('connection', async (socket) => {
  // Expect token in handshake.auth.token
  const token = socket.handshake?.auth?.token;

  let user = null;
  try {
    const payload = verifyToken(token); // { id, username, ... }
    if (!payload?.id) throw new Error('bad token');

    // minimal fetch of username to be sure user exists
    const u = await db('users').select('id', 'username').where({ id: payload.id }).first();
    if (!u) throw new Error('no user');
    user = u;
  } catch {
    socket.disconnect(true);
    return;
  }

  // join everyone to one public room (optional)
  socket.join('public');

  socket.on('chat:send', async (data) => {
    try {
      const content = String((data?.content || '')).trim();

      // throttle 1 msg / sec
      const now = Date.now();
      if ((lastSendAt.get(user.id) || 0) > now - 1000) return;
      lastSendAt.set(user.id, now);

      if (!content || content.length > 500) return;

      const [id] = await db('chat_messages').insert({
        user_id: user.id,
        content
      });

      const message = {
        id,
        userId: user.id,
        username: user.username,
        content,
        createdAt: new Date().toISOString(),
      };

      io.to('public').emit('chat:new', message);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('disconnect', () => {
    // nothing for now
  });
});

app.use("/api/chat", chatPublic);
app.use('/api/chat', chatPublic);

const enableCron = process.env.ENABLE_CRON_JOBS === "true";
if (enableCron) {
  startLockGamesJob();
  console.log("Cron jobs enabled: lockGames");
}

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log("Allowed CORS origins:", allowedOrigins.join(", ") || "(none)");
});