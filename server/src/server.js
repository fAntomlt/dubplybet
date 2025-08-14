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
import usersMeRoutes from "./routes/users.me.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "*")
  .split(",").map(s => s.trim()).filter(Boolean);

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
app.use("/api/users", usersMeRoutes);

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

// ---------- CHAT SOCKET ----------
const lastSendAt = new Map();

io.on("connection", async (socket) => {
  try {
    // token from handshake auth or Authorization header
    const token =
      socket.handshake?.auth?.token ||
      (socket.handshake?.headers?.authorization || "").replace(/^Bearer\s+/i, "");

    if (!token) throw new Error("missing token");

    const payload = verifyJwt(token); // throws if invalid/expired/missing id
    const userId = payload.id;        // guaranteed by verifyJwt()

    // verify user exists (also read role for admin permissions)
    const [rows] = await pool.query(
      "SELECT id, username, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (!rows.length) throw new Error("user not found");

    const user = rows[0];
    const isAdmin = user.role === "admin";

    // everyone in a public room for now
    socket.join("public");

    // === SEND ===
    socket.on("chat:send", async (data) => {
      const content = String(data?.content || "").trim();
      if (!content || content.length > 500) return;

      // throttle: 1 message / second per user
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

    // === DELETE (admins can delete others' messages) ===
    // === DELETE (owner OR admin) ===
    socket.on("chat:delete", async ({ id }) => {
      try {
        // find owner of the message
        const [rows] = await pool.query(
          "SELECT user_id FROM chat_messages WHERE id = ? LIMIT 1",
          [id]
        );
        if (!rows.length) return;

        const ownerId = rows[0].user_id;
        const canDelete = isAdmin || ownerId === user.id; // allow owner OR admin
        if (!canDelete) return;

        const [res] = await pool.query("DELETE FROM chat_messages WHERE id = ?", [id]);
        if (res.affectedRows > 0) {
          io.to("public").emit("chat:deleted", { id });
        }
      } catch (e) {
        console.error("chat:delete error", e);
      }
    });


    // === EDIT (only author can edit) ===
    socket.on("chat:update", async ({ id, content }) => {
      try {
        const text = String(content || "").trim();
        if (!text || text.length > 500) return;

        // ensure ownership
        const [rows] = await pool.query(
          "SELECT user_id FROM chat_messages WHERE id = ?",
          [id]
        );
        if (!rows.length) return;
        if (rows[0].user_id !== user.id) return;
        await pool.query("UPDATE chat_messages SET content = ?, edited_at = NOW() WHERE id = ?", [text, id]);

        io.to("public").emit("chat:updated", {
          id,
          content: text,
          edited: true,
          userId: user.id,
          username: user.username,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error("chat:update error", e);
      }
    });
  } catch (err) {
    console.error("socket auth error:", err.message);
    socket.disconnect(true);
  }
});
// ---------- /CHAT SOCKET ----------

const enableCron = process.env.ENABLE_CRON_JOBS === "true";
if (enableCron) {
  startLockGamesJob();
  console.log("Cron jobs enabled: lockGames");
}

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log("Allowed CORS origins:", allowedOrigins.join(", ") || "(none)");
});