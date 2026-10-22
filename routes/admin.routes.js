/** Administrator routes: audit trail, user accounts and database viewer */
const express = require("express");
const { db, audit, isLocal } = require("../database");
const { auth } = require("../middleware/auth");
const { RO, AD, hash } = require("../utils/helpers");
const asyncRoute = require("../utils/asyncRoute");

const router = express.Router();
const TABLES = ["users", "land_records", "audit_log"];

router.get(
  "/api/audit",
  auth(),
  asyncRoute(async (q, s) => {
    const { rows } = await db.query(
      `SELECT a.log_id,a.logged_at,u.staff_id,u.full_name,u.role,
              a.action,a.record_id,a.record_ref
       FROM audit_log a JOIN users u ON u.user_id=a.user_id
       ORDER BY a.log_id DESC`,
    );
    s.json({
      audit: rows.map((a) => ({
        id: a.log_id,
        ts: new Date(a.logged_at).toISOString(),
        staffId: a.staff_id,
        name: a.full_name,
        role: a.role,
        action: a.action,
        recordId: a.record_id,
        ref: a.record_ref,
      })),
    });
  }),
);

router.get(
  "/api/users",
  auth(AD),
  asyncRoute(async (q, s) => {
    const { rows } = await db.query(
      "SELECT user_id,staff_id,full_name,role,is_active FROM users ORDER BY user_id",
    );
    s.json({
      users: rows.map((u) => ({
        uid: u.user_id,
        id: u.staff_id,
        name: u.full_name,
        role: u.role,
        active: u.is_active,
      })),
    });
  }),
);

router.post(
  "/api/users",
  auth(AD),
  asyncRoute(async (q, s) => {
    const b = q.body;
    const id = String(b.id || "")
      .trim()
      .toUpperCase();
    if (
      !id ||
      !b.name ||
      String(b.pw || "").length < 8 ||
      ![RO, AD].includes(b.role)
    )
      return s.status(400).json({
        error:
          "Enter a staff ID, a name and a password of at least 8 characters.",
      });
    try {
      await db.query(
        "INSERT INTO users(staff_id,full_name,password_hash,role) VALUES($1,$2,$3,$4)",
        [id, b.name.trim(), hash(b.pw), b.role],
      );
    } catch (error) {
      if (error.code === "23505" || error.code === "SQLITE_CONSTRAINT_UNIQUE")
        return s.status(409).json({ error: "That staff ID already exists." });
      throw error;
    }
    await audit(q.user.user_id, "Created account", id);
    s.json({ ok: true });
  }),
);

router.post(
  "/api/users/:uid/toggle",
  auth(AD),
  asyncRoute(async (q, s) => {
    const { rows } = await db.query("SELECT * FROM users WHERE user_id=$1", [
      q.params.uid,
    ]);
    const user = rows[0];
    if (!user || String(user.user_id) === String(q.user.user_id))
      return s.status(400).json({ error: "You cannot change this account." });
    const active = !user.is_active;
    await db.query(
      "UPDATE users SET is_active=$1,failed_attempts=0 WHERE user_id=$2",
      [active, user.user_id],
    );
    await audit(
      q.user.user_id,
      active ? "Activated account" : "Deactivated account",
      user.staff_id,
    );
    s.json({ ok: true });
  }),
);

router.get(
  "/api/db",
  auth(AD),
  asyncRoute(async (q, s) => {
    const tables = await Promise.all(
      TABLES.map(async (name) => {
        const columns = isLocal
          ? await db.query(`PRAGMA table_info("${name}")`)
          : await db.query(
              `SELECT column_name,data_type,is_nullable,column_default
               FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = $1
               ORDER BY ordinal_position`,
              [name],
            );
        const data = await db.query(`SELECT * FROM "${name}" LIMIT 500`);
        const count = await db.query(
          `SELECT COUNT(*)::int AS count FROM "${name}"`,
        );
        const columnRows = columns.rows.map((column) =>
          isLocal
            ? {
                column_name: column.name,
                data_type: column.type || "TEXT",
                is_nullable: column.notnull ? "NO" : "YES",
                column_default: column.dflt_value,
              }
            : column,
        );
        const cols = columnRows.map((c) => c.column_name);
        const definition = columnRows
          .map(
            (c) =>
              `  ${c.column_name} ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}${c.column_default ? ` DEFAULT ${c.column_default}` : ""}`,
          )
          .join(",\n");
        const rows = data.rows.map((row) => {
          if ("password_hash" in row) row.password_hash = "(hashed)";
          return row;
        });
        return {
          name,
          sql: `CREATE TABLE ${name} (\n${definition}\n);`,
          cols,
          rows,
          count: count.rows[0].count,
        };
      }),
    );
    s.json({ tables });
  }),
);

router.get(
  "/api/db/download",
  auth(AD),
  asyncRoute(async (q, s) => {
    const tables = {};
    for (const name of TABLES) {
      const { rows } = await db.query(`SELECT * FROM "${name}"`);
      tables[name] = rows;
    }
    s.setHeader("Content-Type", "application/json");
    s.setHeader(
      "Content-Disposition",
      'attachment; filename="landtrust-backup.json"',
    );
    s.json({ exportedAt: new Date().toISOString(), tables });
  }),
);

module.exports = router;
