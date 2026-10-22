require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { db, isLocal } = require("../database");

async function setup() {
  try {
    const schema = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "database",
        isLocal ? "schema.sqlite.sql" : "schema.sql",
      ),
      "utf8",
    );
    if (isLocal) await db.exec(schema);
    else await db.query(schema);
    console.log("Database schema is ready.");
  } finally {
    await db.end();
  }
}

setup().catch((error) => {
  console.error("Database setup failed:", error);
  process.exitCode = 1;
});
