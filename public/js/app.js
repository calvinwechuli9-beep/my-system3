/** Page shell, sidebar navigation and Dashboard */
function shell() {
  const nav = NAV[S.role]
    .map(
      ([k, l]) =>
        `<button class="${k === view ? "on" : ""}" onclick="go('${k}')">${l}</button>`,
    )
    .join("");
  $("root").innerHTML =
    `<div class="app"><nav class="side" aria-label="Main"><div class="who">${S.role.toUpperCase()}</div><div class="nm">${esc(S.id)} · ${esc(S.name)}</div>${nav}</nav><main id="m"></main></div>`;
  const V = {
    dash,
    add,
    search,
    upload,
    dups,
    users,
    perms,
    audit,
    reports,
    dbv,
  };
  $("m").innerHTML = V[view]();
}
async function go(k) {
  if (k === "out") return logout();
  view = k;
  if (k !== "add") dupBanner = "";
  await load();
  shell();
}
const pill = (s) =>
  `<span class="pill ${s === "Active" ? "" : s === "DUPLICATE" ? "dup" : "off"}">${s}</span>`;

function dash() {
  const d = db.recs.filter((r) => r.status === "DUPLICATE").length;
  let h =
    `<h1>Dashboard</h1><div class="stats"><div class="stat"><b>${db.recs.length}</b>Land records</div><div class="stat"><b>${d}</b>Duplicate alerts</div>` +
    (S.role === AD
      ? `<div class="stat"><b>${db.users.length}</b>Staff accounts</div><div class="stat"><b>${db.audit.length}</b>Audit entries</div>`
      : `<div class="stat"><b>${db.recs.filter((r) => r.by === S.id).length}</b>Records you added</div>`) +
    "</div>";
  return (
    h +
    `<h2>Search Land Records</h2>${srch()}<div id="res">${tbl(found())}</div>`
  );
}
