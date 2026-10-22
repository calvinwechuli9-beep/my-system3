/** Administrator screens: users, permissions, audit trail, reports, database viewer */
function users() {
  return `<h1>User Accounts</h1><div class="wrap"><table><tr><th>Staff ID</th><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr>${db.users
    .map(
      (u, i) =>
        `<tr><td>${esc(u.id)}</td><td>${esc(u.name)}</td><td>${u.role}</td><td>${pill(u.active ? "Active" : "Locked")}</td><td>${u.id === S.id ? "—" : `<button style="all:unset;cursor:pointer;color:var(--head);font-weight:700" onclick="tgl(${i})">${u.active ? "Deactivate" : "Activate"}</button>`}</td></tr>`,
    )
    .join("")}</table></div>
 <h2>Add Staff Account</h2><form onsubmit="addU(event)" style="max-width:520px"><label for="n_i">Staff ID</label><input id="n_i" placeholder="RO-2026-021"><label for="n_n">Name</label><input id="n_n">
 <label for="n_p">Temporary password (8+ characters)</label><input id="n_p" type="password"><label for="n_r">Role</label><select id="n_r"><option>${RO}</option><option>${AD}</option></select>
 <p id="ne" class="err" role="alert" style="display:none"></p><div class="row" style="margin-top:20px"><button>Create account</button></div></form>`;
}
async function tgl(i) {
  const r = await jp("/api/users/" + db.users[i].uid + "/toggle", {});
  if (!r.ok) toast(r.error);
  await load();
  shell();
}
async function addU(e) {
  e.preventDefault();
  const x = $("ne"),
    er = (m) => {
      x.textContent = m;
      x.style.display = "block";
    };
  const r = await jp("/api/users", {
    id: $("n_i").value,
    name: $("n_n").value,
    pw: $("n_p").value,
    role: $("n_r").value,
  });
  if (!r.ok) return er(r.error || "Could not create the account.");
  toast("Account created");
  await load();
  shell();
}
const CAP = [
  ["Log in", "1,1"],
  ["Add and edit land records", "1,1"],
  ["Search and retrieve records", "1,1"],
  ["Upload scanned title deeds", "1,1"],
  ["View duplicate alerts", "1,1"],
  ["Generate ownership reports", "1,1"],
  ["Manage user accounts and permissions", "0,1"],
  ["View audit trail", "1,1"],
];
function perms() {
  return `<h1>Permissions</h1><p>Access is granted by role. These permissions are enforced at login and on every panel.</p><div class="wrap"><table><tr><th>Capability</th><th>${RO}</th><th>${AD}</th></tr>${CAP.map(
    ([c, v]) => {
      const [a, b] = v.split(",");
      return `<tr><td style="text-align:left">${c}</td><td>${a === "1" ? "Allowed" : "—"}</td><td>${b === "1" ? "Allowed" : "—"}</td></tr>`;
    },
  ).join("")}</table></div>`;
}
function auditTbl() {
  return `<div class="wrap"><table><tr><th>Date / Time</th><th>Staff member</th><th>Role</th><th>Action</th><th>Record / Reference</th></tr>${db.audit
    .map(
      (a) =>
        `<tr><td>${fmt(a.ts, 1)}</td><td>${esc(a.staffId)} · ${esc(a.name)}</td><td>${esc(a.role)}</td><td>${esc(a.action)}</td><td>${a.recordId ? `#${esc(a.recordId)} · ` : ""}${esc(a.ref || "—")}</td></tr>`,
    )
    .join("")}</table></div>`;
}
function genBox() {
  return `<h2>Generate Ownership Report / Certificate</h2><label for="g_t">Title / Parcel Number</label><div class="srch"><input id="g_t" placeholder="NAK/0456/2021" onkeydown="if(event.key==='Enter')gen()"><button onclick="gen()">Generate</button><button class="ghost" onclick="pdf()">Download PDF</button></div><p id="ge" class="err" role="alert" style="display:none"></p><div id="certbox"></div>`;
}
function audit() {
  return `<h1>Audit Trail / Activity Log</h1><p>Shows staff sign-ins, record views and changes, deed uploads, certificates, and account actions.</p>${auditTbl()}${S.role === AD ? genBox() : ""}`;
}
function reports() {
  return `<h1>Generate Reports</h1>${genBox()}`;
}
function gen() {
  const t = $("g_t").value.trim().toUpperCase(),
    x = $("ge");
  x.style.display = "none";
  const r = db.recs.find(
    (r) => r.title.toUpperCase() === t && r.status === "Active",
  );
  if (!r) {
    certRec = null;
    $("certbox").innerHTML = "";
    x.textContent = t
      ? "No active record found for that title number. Check the number or resolve duplicates first."
      : "Enter a title / parcel number.";
    x.style.display = "block";
    return;
  }
  certRec = r;
  jp("/api/certificate/" + encodeURIComponent(r.title), {});
  const n = new Date();
  $("certbox").innerHTML =
    `<div class="cert" id="cert"><h3>LandTrust Kenya, Nakuru</h3><p class="c">Certificate of Ownership Record</p><hr>
 <p><b>Title / Parcel No.:</b> ${esc(r.title)}</p><p><b>Registered owner:</b> ${esc(r.owner)}</p><p><b>National ID:</b> ${esc(r.nid.slice(0, 5))}xxx</p>
 <p><b>Parcel size:</b> ${r.size} acres</p><p><b>Location:</b> ${esc(r.loc)}</p><p><b>Land use:</b> ${esc(r.use)}</p><p><b>Registered on:</b> ${esc(r.date)}</p>
 <p><b>Title deed on file:</b> ${r.deed ? "Yes" : "No"}</p><hr><p class="c">Generated ${fmt(n, 1)} by ${esc(S.id)} ${esc(S.name)}</p></div>`;
}
function pdf() {
  if (!certRec) return gen();
  window.print();
}
function dbv() {
  setTimeout(loadDb, 0);
  return `<h1>Database Viewer</h1><p>Live contents of the hosted database. Password hashes are hidden.</p><div id="dbx">Loading…</div>`;
}
async function loadDb() {
  const r = await api("/api/db"),
    x = $("dbx");
  if (!x) return;
  if (!r.ok) {
    x.textContent = r.error || "Could not load the database.";
    return;
  }
  window._t = r.tables;
  showT(0);
}
function showT(i) {
  const t = window._t[i],
    x = $("dbx");
  if (!x) return;
  x.innerHTML = `<div class="row" style="margin-top:0">${window._t.map((a, j) => `<button class="${j === i ? "" : "ghost"}" onclick="showT(${j})">${a.name} (${a.count})</button>`).join("")}<a class="lnk" style="align-self:center" href="/api/db/download">Download database backup (JSON)</a></div>
 <h2>${t.name}</h2><pre style="white-space:pre-wrap;color:var(--mute)">${esc(t.sql)}</pre><div class="wrap"><table><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>${t.rows.map((r) => `<tr>${t.cols.map((c) => `<td>${esc(r[c] ?? "")}</td>`).join("")}</tr>`).join("")}</table></div>`;
}
