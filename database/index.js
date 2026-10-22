const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const configuredUrl = process.env.DATABASE_URL;
const placeholderUrl =
  configuredUrl &&
  /YOUR_HOST|YOUR_PROJECT|CHANGE_ME|placeholder/i.test(configuredUrl);
const isProduction =
  process.env.NODE_ENV === "production" || process.env.VERCEL;
const isLocal =
  configuredUrl === "sqlite" ||
  (!isProduction && (!configuredUrl || placeholderUrl));

let db;

if (isLocal) {
  const Database = require("better-sqlite3");
  const filename =
    process.env.LOCAL_DATABASE_PATH ||
    path.join(__dirname, "..", "landtrust.db");
  const sqlite = new Database(filename);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(
    fs.readFileSync(path.join(__dirname, "schema.sqlite.sql"), "utf8"),
  );

  db = {
    async query(sql, params = []) {
      const bindings = Object.fromEntries(
        params.map((value, index) => [`p${index + 1}`, value]),
      );
      const statement = sqlite.prepare(
        sql
          .replace(/\bILIKE\b/gi, "LIKE")
          .replace(/::(?:int|integer|timestamptz)\b/gi, "")
          .replace(
            /now\(\)\s*\+\s*interval\s*'7 days'/gi,
            "datetime('now', '+7 days')",
          )
          .replace(/\bnow\(\)/gi, "CURRENT_TIMESTAMP")
          .replace(/\$(\d+)/g, "@p$1"),
      );
      if (statement.reader) {
        const rows = statement.all(bindings);
        return { rows, rowCount: rows.length };
      }
      return { rows: [], rowCount: statement.run(bindings).changes };
    },
    async exec(sql) {
      sqlite.exec(sql);
    },
    async end() {
      sqlite.close();
    },
  };

  if (placeholderUrl) {
    console.warn(
      "DATABASE_URL is a template value; using the local landtrust.db database.",
    );
  }
} else {
  if (!configuredUrl) {
    throw new Error(
      "DATABASE_URL is required in production. Set it to a PostgreSQL URL or sqlite for local development.",
    );
  }
  if (configuredUrl === "sqlite") {
    throw new Error(
      "SQLite is for local development only. Configure a PostgreSQL DATABASE_URL in production.",
    );
  }
  if (placeholderUrl) {
    throw new Error(
      "DATABASE_URL is still a template value. Configure a PostgreSQL connection string in production.",
    );
  }

  const pool = new Pool({
    connectionString: configuredUrl,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: true },
    max: process.env.VERCEL ? 1 : 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  db = pool;
}

async function audit(userId, action, ref, recordId = null, at = null) {
  await db.query(
    `INSERT INTO audit_log (user_id, record_id, action, record_ref, logged_at)
     VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))`,
    [userId, recordId, action, ref, at],
  );
}

module.exports = { db, audit, isLocal };
