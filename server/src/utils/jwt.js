// server/src/utils/jwt.js
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signJwt(payload /* { uid, role } */) {
  if (!SECRET) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyJwt(token) {
  if (!SECRET) throw new Error("JWT_SECRET not set");
  const raw = jwt.verify(token, SECRET); // will throw on invalid/expired

  // Normalize id across any historical shapes you might have used
  const id =
    raw?.uid != null ? raw.uid :
    raw?.id  != null ? raw.id  :
    raw?.userId != null ? raw.userId :
    null;

  if (id == null) {
    // Make it explicit if a token verifies but doesn't carry a usable id
    const e = new Error("Token missing uid/id/userId");
    e.code = "NO_USER_ID";
    throw e;
  }

  // Return the original claims, plus normalized id fields
  return {
    ...raw,
    id,
    uid: id,
    userId: id,
  };
}