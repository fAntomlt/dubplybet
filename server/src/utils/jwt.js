import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Reikia prisijungti" });

  try {
    // payload is expected to look like { uid, role } based on your login code
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res
      .status(401)
      .json({ error: "Neteisingas arba pasibaigęs prisijungimas" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Reikalingos administratoriaus teisės" });
  }
  next();
}