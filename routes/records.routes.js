const express = require("express");
const path = require("path");
const { db, audit } = require("../database");
const { auth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { dmy, today } = require("../utils/helpers");
const { uploadDeed } = require("../utils/storage");
const asyncRoute = require("../utils/asyncRoute");

const router = express.Router();
const SELECT_RECORDS = `
  SELECT r.*, u.staff_id, u.full_name
  FROM land_records r
  JOIN users u ON u.user_id = r.created_by`;

function toRecord(r) {
  return {
    id: r.record_id,
    title: r.title_number,
    owner: r.owner_name,
    nid: r.national_id,
    size: r.parcel_size,
    loc: r.location,
    use: r.land_use,
    date: dmy(String(r.registration_date)),
    deed: r.deed_path ? path.basename(r.deed_path).replace(/^\d+_/, "") : "",
    status: r.status,
    by: r.staff_id,
    creator: `${r.staff_id} · ${r.full_name}`,
  };
}

const findRecord = (id) =>
  db.query("SELECT * FROM land_records WHERE record_id = $1", [id]);

router.get(
  "/api/records",
  auth(),
  asyncRoute(async (req, res) => {
    const term = `%${String(req.query.q || "").trim()}%`;
    const { rows } = await db.query(
      `${SELECT_RECORDS}
       WHERE r.title_number ILIKE $1 OR r.owner_name ILIKE $1
          OR r.national_id ILIKE $1 OR r.location ILIKE $1
       ORDER BY r.record_id`,
      [term],
    );
    res.json({ records: rows.map(toRecord) });
  }),
);

router.post(
  "/api/records",
  auth(),
  upload.single("deed"),
  asyncRoute(async (req, res) => {
    const b = req.body;
    const title = String(b.title || "")
      .trim()
      .toUpperCase();
    const fail = (msg) => res.status(400).json({ error: msg });

    if (!b.owner || !b.nid || !title || !b.size || !b.loc)
      return fail(
        "Fill in owner name, national ID, title number, parcel size and location.",
      );
    if (!/^\d{7,8}$/.test(b.nid))
      return fail("National ID must be 7 or 8 digits.");
    if (!/^[A-Z]{3}\/\d{1,5}\/\d{4}$/.test(title))
      return fail("Title number must look like NAK/1234/2026.");
    if (!(+b.size > 0)) return fail("Parcel size must be more than 0 acres.");

    const duplicate = await db.query(
      "SELECT COUNT(*)::int AS count FROM land_records WHERE upper(title_number) = $1",
      [title],
    );
    const deedPath = req.file ? await uploadDeed(req.file) : null;
    const { rows } = await db.query(
      `INSERT INTO land_records
         (title_number, owner_name, national_id, parcel_size, location,
          land_use, registration_date, deed_path, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING record_id`,
      [
        title,
        b.owner.trim(),
        b.nid,
        +b.size,
        b.loc.trim(),
        b.use || "Residential",
        today(),
        deedPath,
        Number(duplicate.rows[0].count) > 0 ? "DUPLICATE" : "Active",
        req.user.user_id,
      ],
    );

    const recordId = rows[0].record_id;
    await audit(req.user.user_id, "Created new record", title, recordId);
    const isDuplicate = Number(duplicate.rows[0].count) > 0;
    if (isDuplicate)
      await audit(req.user.user_id, "Duplicate flagged", title, recordId);
    res.json({ id: recordId, duplicate: isDuplicate });
  }),
);

router.put(
  "/api/records/:id",
  auth(),
  asyncRoute(async (req, res) => {
    const result = await findRecord(req.params.id);
    const record = result.rows[0];
    const b = req.body;
    if (!record) return res.status(404).json({ error: "Record not found." });
    if (
      !b.owner ||
      !b.loc ||
      !(+b.size > 0) ||
      !["Active", "DUPLICATE"].includes(b.status)
    )
      return res
        .status(400)
        .json({ error: "Owner, location and a size above 0 are required." });

    await db.query(
      `UPDATE land_records
       SET owner_name = $1, location = $2, parcel_size = $3, status = $4
       WHERE record_id = $5`,
      [b.owner.trim(), b.loc.trim(), +b.size, b.status, record.record_id],
    );
    await audit(
      req.user.user_id,
      "Edited record",
      record.title_number,
      record.record_id,
    );
    res.json({ ok: true });
  }),
);

router.post(
  "/api/records/:id/view",
  auth(),
  asyncRoute(async (req, res) => {
    const result = await findRecord(req.params.id);
    const record = result.rows[0];
    if (record)
      await audit(
        req.user.user_id,
        "Viewed record",
        record.title_number,
        record.record_id,
      );
    res.json({ ok: true });
  }),
);

router.post(
  "/api/records/:id/deed",
  auth(),
  upload.single("deed"),
  asyncRoute(async (req, res) => {
    const result = await findRecord(req.params.id);
    const record = result.rows[0];
    if (!record || !req.file)
      return res.status(400).json({ error: "Choose a record and a file." });

    const deedPath = await uploadDeed(req.file);
    await db.query(
      "UPDATE land_records SET deed_path = $1 WHERE record_id = $2",
      [deedPath, record.record_id],
    );
    await audit(
      req.user.user_id,
      "Uploaded title deed",
      record.title_number,
      record.record_id,
    );
    res.json({ ok: true });
  }),
);

router.post(
  "/api/certificate/:title",
  auth(),
  asyncRoute(async (req, res) => {
    const { rows } = await db.query(
      `SELECT * FROM land_records
       WHERE upper(title_number) = upper($1) AND status = 'Active'`,
      [req.params.title],
    );
    const record = rows[0];
    if (!record)
      return res
        .status(404)
        .json({ error: "No active record found for that title number." });

    await audit(
      req.user.user_id,
      "Generated certificate",
      record.title_number,
      record.record_id,
    );
    res.json({ ok: true });
  }),
);

module.exports = router;
