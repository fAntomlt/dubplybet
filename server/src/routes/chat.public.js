const express = require("express");
const router = express.Router();
const db = require("../utils/db");                 // your existing Knex instance
const { requireAuth } = require("../middleware/auth"); // you already use this in other routes

// GET /api/chat/history?limit=50
router.get("/history", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const rows = await db("chat_messages as m")
      .join("users as u", "u.id", "m.user_id")
      .select(
        "m.id",
        "m.content",
        "m.created_at",
        "u.id as user_id",
        "u.username"
      )
      .orderBy("m.id", "desc")
      .limit(limit);

    // return newest last for natural scroll
    return res.json({ ok: true, items: rows.reverse() });
  } catch (err) {
    console.error("chat/history error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/chat/send
router.post("/send", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const content = (req.body?.content || "").trim();

    if (!content) {
      return res.status(400).json({ ok: false, error: "Tuščia žinutė" });
    }
    if (content.length > 2000) {
      return res.status(400).json({ ok: false, error: "Žinutė per ilga" });
    }

    const [id] = await db("chat_messages").insert({
      user_id: userId,
      content,
    });

    const item = {
      id,
      user_id: userId,
      username: req.user.username,
      content,
      created_at: new Date(),
    };

    return res.json({ ok: true, item });
  } catch (err) {
    console.error("chat/send error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;