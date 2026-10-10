/**
 * Land record screens (Records Officer)
 *   Search Records  ·  Add Land Record  ·  Upload Title Deed
 *   Duplicate Alerts  ·  View / Edit window
 * Data comes from the server (db.recs) via the helpers in core.js.
 */

const idx = (record) => db.recs.indexOf(record);

const dupMsg = (title) => `
  <div class="alert" role="alert">
    ALERT — Duplicate Record: Title No. ${esc(title)} already exists in database
  </div>`;

const isDup = (title) =>
  db.recs.some((r) => r.title.toUpperCase() === title.toUpperCase());

function tbl(rows) {
  if (!rows.length) {
    return "<p>No records match your search. Try a title number, owner name or parcel ID.</p>";
  }
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${esc(r.title)}</td>
        <td>${esc(r.owner)}</td>
        <td>${r.size} Ac</td>
        <td>${esc(r.loc)}</td>
        <td>${pill(r.status)}</td>
        <td>
          <button style="all:unset;cursor:pointer;color:var(--head);font-weight:700"
                  onclick="edit(${idx(r)})">
            ${r.status === "DUPLICATE" ? "Review" : "View / Edit"}
          </button>
        </td>
      </tr>`,
    )
    .join("");

  return `
    <div class="wrap">
      <table>
        <tr>
          <th>Title No.</th><th>Owner Name</th><th>Parcel Size</th>
          <th>Location</th><th>Status</th><th>Actions</th>
        </tr>
        ${body}
      </table>
    </div>`;
}

function found() {
  const term = q.toLowerCase();
  return db.recs.filter(
    (r) =>
      !term ||
      [r.title, r.owner, r.nid, r.loc].some((v) =>
        v.toLowerCase().includes(term),
      ),
  );
}

function srch() {
  return `
    <div class="srch">
      <input id="q" value="${esc(q)}" aria-label="Search records"
             placeholder="Search by Title No. / Owner Name / Parcel ID ..."
             onkeydown="if (event.key === 'Enter') runQ()">
      <button onclick="runQ()">Search</button>
    </div>`;
}

function runQ() {
  q = $("q").value.trim();
  $("res").innerHTML = tbl(found());
}

function search() {
  return `
    <h1>Search Land Records</h1>
    ${srch()}
    <div id="res">${tbl(found())}</div>`;
}

function add() {
  return `
    <h1>Add New Land Record</h1>
    <div id="db">${dupBanner}</div>

    <form onsubmit="save(event)" novalidate>
      <div class="grid">
        <div>
          <label for="f_o">Owner Full Name</label>
          <input id="f_o">

          <label for="f_n">National ID No.</label>
          <input id="f_n" inputmode="numeric" placeholder="7–8 digits">

          <label for="f_t">Title / Parcel Number</label>
          <input id="f_t" placeholder="NAK/1234/2026" onblur="chkDup()">

          <label for="f_s">Parcel Size (Acres)</label>
          <input id="f_s" type="number" step="0.01" min="0">
        </div>

        <div>
          <label for="f_l">Location / Ward</label>
          <input id="f_l">

          <label for="f_u">Land Use Type</label>
          <select id="f_u">
            <option>Residential</option>
            <option>Agricultural</option>
            <option>Commercial</option>
            <option>Industrial</option>
          </select>

          <label for="f_d">Registration Date</label>
          <input id="f_d" value="${fmt(new Date())}" readonly>

          <label for="f_f">Scanned Title Deed</label>
          <input id="f_f" type="file" accept=".pdf,image/*">
          <small>Maximum file size: 4 MB.</small>
        </div>
      </div>

      <p id="fe" class="err" role="alert" style="display:none"></p>

      <div class="row" style="margin-top:20px">
        <button>Save Record</button>
        <button type="button" class="ghost" onclick="go('dash')">Cancel</button>
      </div>
    </form>`;
}

function chkDup() {
  const title = $("f_t").value.trim();
  $("db").innerHTML = title && isDup(title) ? dupMsg(title.toUpperCase()) : "";
}

async function save(e) {
  e.preventDefault();
  const val = (id) => $(id).value.trim();
  const title = val("f_t").toUpperCase();
  const showError = (msg) => {
    const box = $("fe");
    box.textContent = msg;
    box.style.display = "block";
  };

  if (!val("f_o") || !val("f_n") || !title || !val("f_s") || !val("f_l"))
    return showError(
      "Fill in owner name, national ID, title number, parcel size and location.",
    );
  if (!/^\d{7,8}$/.test(val("f_n")))
    return showError("National ID must be 7 or 8 digits.");
  if (!/^[A-Z]{3}\/\d{1,5}\/\d{4}$/.test(title))
    return showError("Title number must look like NAK/1234/2026.");
  if (!(+val("f_s") > 0))
    return showError("Parcel size must be more than 0 acres.");

  const form = new FormData();
  form.append("owner", val("f_o"));
  form.append("nid", val("f_n"));
  form.append("title", title);
  form.append("size", val("f_s"));
  form.append("loc", val("f_l"));
  form.append("use", $("f_u").value);
  const deed = $("f_f").files[0];
  if (deed) form.append("deed", deed);

  const res = await api("/api/records", { method: "POST", body: form });
  if (!res.ok) return showError(res.error || "Could not save the record.");

  if (res.duplicate) {
    dupBanner = dupMsg(title);
    toast("Saved and flagged as duplicate");
  } else {
    dupBanner = "";
    toast("Record saved");
  }
  await load();
  shell();
}

function upload() {
  const options = db.recs
    .map(
      (r, i) =>
        `<option value="${i}">${esc(r.title)} — ${esc(r.owner)}${r.deed ? " (has deed)" : ""}</option>`,
    )
    .join("");

  return `
    <h1>Upload Title Deed</h1>
    <form onsubmit="upl(event)" style="max-width:520px">
      <label for="ur">Land record</label>
      <select id="ur">${options}</select>

      <label for="uf">Scanned title deed (PDF or image)</label>
      <input id="uf" type="file" accept=".pdf,image/*">
      <small>Maximum file size: 4 MB.</small>

      <p id="ue" class="err" role="alert" style="display:none"></p>
      <div class="row" style="margin-top:20px"><button>Upload deed</button></div>
    </form>`;
}

async function upl(e) {
  e.preventDefault();
  const file = $("uf").files[0];
  const box = $("ue");
  const showError = (msg) => {
    box.textContent = msg;
    box.style.display = "block";
  };

  if (!file) return showError("Choose a file to upload.");

  const form = new FormData();
  form.append("deed", file);
  const record = db.recs[+$("ur").value];
  const res = await api(`/api/records/${record.id}/deed`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) return showError(res.error || "Upload failed.");

  toast("Deed uploaded");
  await load();
  shell();
}

function dups() {
  const flagged = db.recs.filter((r) => r.status === "DUPLICATE");
  const content = flagged.length
    ? flagged.map((r) => dupMsg(r.title)).join("") + tbl(flagged)
    : "<p>No duplicate records. New duplicates appear here as soon as they are detected.</p>";
  return `<h1>Duplicate Alerts</h1>${content}`;
}

function edit(i) {
  const r = db.recs[i];
  const dialog = $("dlg");

  dialog.innerHTML = `
    <form method="dialog" onsubmit="return upd(event, ${i})">
      <h1>${esc(r.title)}</h1>

      <label for="e_o">Owner Full Name</label>
      <input id="e_o" value="${esc(r.owner)}">

      <label for="e_l">Location / Ward</label>
      <input id="e_l" value="${esc(r.loc)}">

      <label for="e_s">Parcel Size (Acres)</label>
      <input id="e_s" type="number" step="0.01" value="${r.size}">

      <label for="e_st">Status</label>
      <select id="e_st">
        <option ${r.status === "Active" ? "selected" : ""}>Active</option>
        <option ${r.status === "DUPLICATE" ? "selected" : ""}>DUPLICATE</option>
      </select>

      <p style="color:var(--mute)">
        National ID ${esc(r.nid)} · Deed: ${esc(r.deed || "not uploaded")}
      </p>

      <div class="row" style="margin-top:8px">
        <button>Save changes</button>
        <button type="button" class="ghost" onclick="$('dlg').close()">Close</button>
      </div>
    </form>`;

  api(`/api/records/${r.id}/view`, { method: "POST" });
  dialog.showModal();
}

function upd(e, i) {
  const r = db.recs[i];
  const owner = $("e_o").value.trim();
  const loc = $("e_l").value.trim();
  const size = +$("e_s").value;

  if (!owner || !loc || !(size > 0)) {
    toast("Owner, location and a size above 0 are required");
    return false;
  }

  jp(
    `/api/records/${r.id}`,
    { owner, loc, size, status: $("e_st").value },
    "PUT",
  ).then(async (res) => {
    if (!res.ok) return toast(res.error || "Could not save");
    toast("Changes saved");
    await load();
    shell();
  });
  return true;
}
