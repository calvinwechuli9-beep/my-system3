const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: true },
  max: process.env.VERCEL ? 1 : 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

async function audit(userId, action, ref, recordId = null, at = null) {
  await db.query(
    `INSERT INTO audit_log (user_id, record_id, action, record_ref, logged_at)
     VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))`,
    [userId, recordId, action, ref, at],
  );
}

module.exports = { db, audit };
