const crypto = require("crypto");
const { db } = require("../database");

function sessionId(req) {
  const match = (req.headers.cookie || "").match(/(?:^|; )sid=([a-f0-9]+)/);
  return match && match[1];
}

async function startSession(res, userId) {
  const id = crypto.randomBytes(24).toString("hex");
  await db.query(
    "INSERT INTO sessions (session_id, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')",
    [id, userId],
  );
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL;
  res.setHeader(
    "Set-Cookie",
    `sid=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure ? "; Secure" : ""}`,
  );
}

async function endSession(req, res) {
  const id = sessionId(req);
  if (id) await db.query("DELETE FROM sessions WHERE session_id = $1", [id]);
  res.setHeader(
    "Set-Cookie",
    "sid=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/",
  );
}

function auth(role) {
  return async (req, res, next) => {
    try {
      const id = sessionId(req);
      const result = id
        ? await db.query(
            `SELECT u.* FROM sessions s
             JOIN users u ON u.user_id = s.user_id
             WHERE s.session_id = $1 AND s.expires_at > now() AND u.is_active = TRUE`,
            [id],
          )
        : { rows: [] };
      const user = result.rows[0];

      if (!user) return res.status(401).json({ error: "Please log in." });
      if (role && user.role !== role)
        return res
          .status(403)
          .json({ error: "Administrator access required." });

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

const publicUser = (u) => ({
  uid: u.user_id,
  id: u.staff_id,
  name: u.full_name,
  role: u.role,
});

module.exports = { auth, startSession, endSession, publicUser };
