require("dotenv").config();

const { db } = require("../database");
const { AD, hash } = require("../utils/helpers");

async function createAdmin() {
  const staffId = String(process.env.ADMIN_STAFF_ID || "")
    .trim()
    .toUpperCase();
  const fullName = String(process.env.ADMIN_FULL_NAME || "").trim();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!staffId || !fullName || password.length < 12)
    throw new Error(
      "Set ADMIN_STAFF_ID, ADMIN_FULL_NAME, and ADMIN_PASSWORD (at least 12 characters).",
    );

  try {
    await db.query(
      "INSERT INTO users (staff_id, full_name, password_hash, role) VALUES ($1, $2, $3, $4)",
      [staffId, fullName, hash(password), AD],
    );
    console.log(`Administrator account ${staffId} created.`);
  } finally {
    await db.end();
  }
}

createAdmin().catch((error) => {
  console.error("Administrator creation failed:", error.message);
  process.exitCode = 1;
});
