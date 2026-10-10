/** Start-up: restore an existing session or show the login page */
(async () => {
  const r = await api("/api/me");
  if (r.ok) {
    S = r.user;
    await load();
    shell();
  } else showLogin();
})();
