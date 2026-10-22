const express = require("express");
const { db, audit, isLocal } = require("../database");
const {
  auth,
  startSession,
  endSession,
  publicUser,
} = require("../middleware/auth");
const { verify } = require("../utils/helpers");
const asyncRoute = require("../utils/asyncRoute");

const router = express.Router();

router.post(
  "/api/login",
  asyncRoute(async (q, s) => {
    const id = String(q.body.id || "")
      .trim()
      .toUpperCase();
    const pw = String(q.body.pw || "");
    const role = q.body.role;
    const bad = (message, code = 401) =>
      s.status(code).json({ error: message });
    if (!id || !pw) return bad("Enter your staff ID and password.", 400);

    const result = await db.query("SELECT * FROM users WHERE staff_id = $1", [
      id,
    ]);
    const user = result.rows[0];
    if (!user)
      return bad(
        "Staff ID or password is incorrect. Check both and try again.",
      );
    if (!user.is_active) {
      await audit(user.user_id, "Login blocked - inactive account", "Login");
      return bad(
        "This account is locked or deactivated. Contact the system administrator.",
        403,
      );
    }
    if (!verify(pw, user.password_hash)) {
      const failedAttempts = user.failed_attempts + 1;
      const active = isLocal ? Number(failedAttempts < 3) : failedAttempts < 3;
      await db.query(
        "UPDATE users SET failed_attempts = $1, is_active = $2 WHERE user_id = $3",
        [failedAttempts, active, user.user_id],
      );
      await audit(user.user_id, "Failed login attempt", "Login");
      if (failedAttempts >= 3)
        await audit(user.user_id, "Account locked after failed login", "Login");
      return failedAttempts >= 3
        ? bad(
            "Too many failed attempts. Account locked; contact the system administrator.",
            403,
          )
        : bad(
            `Staff ID or password is incorrect. ${3 - failedAttempts} attempt(s) left.`,
          );
    }
    if (user.role !== role) {
      await audit(
        user.user_id,
        "Login rejected - incorrect role selected",
        "Login",
      );
      return bad(
        `This account is not registered as ${role}. Select the correct role.`,
        403,
      );
    }

    await db.query("UPDATE users SET failed_attempts = 0 WHERE user_id = $1", [
      user.user_id,
    ]);
    await startSession(s, user.user_id);
    await audit(user.user_id, "Logged in", "—");
    s.json({ user: publicUser(user) });
  }),
);

router.get("/api/me", auth(), (q, s) => s.json({ user: publicUser(q.user) }));
router.post(
  "/api/logout",
  auth(),
  asyncRoute(async (q, s) => {
    await audit(q.user.user_id, "Logged out", "—");
    await endSession(q, s);
    s.json({ ok: true });
  }),
);

module.exports = router;
