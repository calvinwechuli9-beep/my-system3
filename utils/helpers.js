const crypto = require("crypto");

const RO = "Records Officer";
const AD = "Administrator";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function hash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(password, salt, 64).toString("hex");
}

function verify(password, stored) {
  const [salt, key] = stored.split(":");
  return crypto.timingSafeEqual(
    Buffer.from(key, "hex"),
    crypto.scryptSync(password, salt, 64),
  );
}

function dmy(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${MONTHS[+m - 1]}-${y}`;
}

function today() {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}

module.exports = { RO, AD, hash, verify, dmy, today };
