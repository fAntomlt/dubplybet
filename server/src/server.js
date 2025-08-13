import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import http from "http";
import adminUsersRoutes from "./routes/admin.users.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import chatPublic from "./routes/chat.public.js";
import { verifyJwt } from "./utils/jwt.js";


import authRoutes from "./routes/auth.js";
import pool, { dbPing } from "./db.js";
import tournamentsAdmin from "./routes/admin.tournaments.js";
import gamesAdmin from "./routes/admin.games.js";
import gamesPublic from "./routes/games.public.js";
import gamesGuess from "./routes/games.guess.js";
import gamePublicGuesses from "./routes/games.public.guesses.js";
import leaderboardsPublic from "./routes/leaderboards.public.js";
import { startLockGamesJob } from "./jobs/lockGames.js";

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
app.use("/api/chat", chatPublic);

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
const io = new SocketIOServer(server, { cors: corsOptions });

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("ping", () => socket.emit("pong"));
});

const lastSendAt = new Map();

io.on("connection", async (socket) => {
  try {
    const token = socket.handshake?.auth?.token;
    const payload = verifyJwt(token);
    if (!payload?.id) throw new Error("bad token");

    const [rows] = await pool.query(
      "SELECT id, username FROM users WHERE id = ? LIMIT 1",
      [payload.id]
    );
    if (!rows.length) throw new Error("no user");

    const user = rows[0];
    socket.join("public");

    socket.on("chat:send", async (data) => {
      const content = String(data?.content || "").trim();
      if (!content || content.length > 500) return;

      // throttle 1 msg/sec per user
      const now = Date.now();
      if ((lastSendAt.get(user.id) || 0) > now - 1000) return;
      lastSendAt.set(user.id, now);

      const [result] = await pool.query(
        "INSERT INTO chat_messages (user_id, content) VALUES (?, ?)",
        [user.id, content]
      );

      const message = {
        id: result.insertId,
        userId: user.id,
        username: user.username,
        content,
        createdAt: new Date().toISOString(),
      };

      io.to("public").emit("chat:new", message);
    });
  } catch {
    socket.disconnect(true);
  }
});

const enableCron = process.env.ENABLE_CRON_JOBS === "true";
if (enableCron) {
  startLockGamesJob();
  console.log("Cron jobs enabled: lockGames");
}

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log("Allowed CORS origins:", allowedOrigins.join(", ") || "(none)");
});