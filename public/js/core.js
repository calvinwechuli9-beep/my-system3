/** Shared state, helpers, and the API client */
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const M = [
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
  ],
  p2 = (n) => String(n).padStart(2, "0");
const fmt = (d, t) =>
  `${p2(d.getDate())}-${M[d.getMonth()]}-${d.getFullYear()}` +
  (t ? ` ${p2(d.getHours())}:${p2(d.getMinutes())}` : "");
const D = (y, m, d, h, mi) => new Date(y, m, d, h, mi);
const RO = "Records Officer",
  AD = "Administrator";
const db = { users: [], recs: [], audit: [] };
let S = null,
  view = "dash",
  dupBanner = "",
  certRec = null,
  q = "";
const NAV = {
  [RO]: [
    ["dash", "Dashboard"],
    ["add", "Add Land Record"],
    ["search", "Search Records"],
    ["upload", "Upload Title Deed"],
    ["dups", "Duplicate Alerts"],
    ["audit", "Audit Trail"],
    ["out", "Logout"],
  ],
  [AD]: [
    ["dash", "Dashboard"],
    ["users", "User Accounts"],
    ["perms", "Permissions"],
    ["audit", "Audit Trail"],
    ["reports", "Generate Reports"],
    ["dbv", "Database"],
    ["out", "Logout"],
  ],
};
async function api(p, o = {}) {
  try {
    const r = await fetch(p, { credentials: "same-origin", ...o });
    let j = {};
    try {
      j = await r.json();
    } catch (e) {}
    return { ok: r.ok, status: r.status, ...j };
  } catch (e) {
    return {
      ok: false,
      error: "Cannot reach the server. Make sure it is running (npm start).",
    };
  }
}
const jp = (p, b, m = "POST") =>
  api(p, {
    method: m,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
async function load() {
  const r = await api("/api/records");
  db.recs = r.records || [];
  if (S.role === AD) {
    const u = await api("/api/users");
    db.users = u.users || [];
  }
  const a = await api("/api/audit");
  db.audit = (a.audit || []).map((x) => ({
    ts: new Date(x.ts),
    staffId: x.staffId,
    name: x.name,
    role: x.role,
    action: x.action,
    recordId: x.recordId,
    ref: x.ref,
  }));
}
function toast(m) {
  const t = $("toast");
  t.textContent = m;
  t.style.display = "block";
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.style.display = "none"), 2600);
}
