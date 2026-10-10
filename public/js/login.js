/** Login page */
function showLogin(msg) {
  $("root").innerHTML =
    `<div class="login"><form class="lcard" onsubmit="doLogin(event)" novalidate>
 <h1>LandTrust Kenya</h1><p class="sub">Land Records Management System</p>
 <label for="u">Username / Staff ID</label><input id="u" placeholder="e.g. RO-2026-014" autocomplete="username" autofocus>
 <label for="p">Password</label><input id="p" type="password" autocomplete="current-password">
 <label style="margin-bottom:0">Login as:</label>
 <div class="roles"><label><input type="radio" name="r" value="${RO}" checked> Records Officer</label><label><input type="radio" name="r" value="${AD}"> Administrator</label></div>
 <div id="le" class="err" role="alert" style="${msg ? "" : "display:none"}">${esc(msg || "")}</div>
 <button style="width:100%;margin-top:22px;font-size:17px">LOGIN</button>
 <p class="hint">Forgot password? Contact system administrator</p>
 <p class="hint">Demo: RO-2026-014 / officer123 (Records Officer) · ADM-002 / admin123 (Administrator)</p></form></div>`;
}
async function doLogin(e) {
  e.preventDefault();
  const id = $("u").value.trim(),
    pw = $("p").value,
    role = document.querySelector("input[name=r]:checked").value;
  const bad = (m) => {
    const x = $("le");
    x.textContent = m;
    x.style.display = "block";
  };
  if (!id || !pw) return bad("Enter your staff ID and password.");
  const r = await jp("/api/login", { id, pw, role });
  if (!r.ok) return bad(r.error || "Login failed.");
  S = r.user;
  view = "dash";
  certRec = null;
  dupBanner = "";
  q = "";
  await load();
  shell();
}
async function logout() {
  await jp("/api/logout", {});
  S = null;
  db.recs = [];
  db.users = [];
  db.audit = [];
  showLogin();
}
