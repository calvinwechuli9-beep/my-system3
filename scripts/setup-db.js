require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { db } = require("../database");

async function setup() {
  try {
    const schema = fs.readFileSync(
      path.join(__dirname, "..", "database", "schema.sql"),
      "utf8",
    );
    await db.query(schema);
    console.log("Database schema is ready.");
  } finally {
    await db.end();
  }
}

setup().catch((error) => {
  console.error("Database setup failed:", error);
  process.exitCode = 1;
});
