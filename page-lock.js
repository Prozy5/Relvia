// PAGE LOCK — shared check for Page Access in the owner panel.
// When the owner closes a page, this shows a closed screen with a passcode instead of the page.
// Usage: put data-page-key="<key>" on <body>, then add <script src="/page-lock.js"></script>
// at the end of the page, after the page's own supabaseClient is created.
// Fails open: if the check can't run, the page stays visible rather than locking people out.
(function () {
  const key = document.body && document.body.dataset.pageKey;
  if (!key || typeof supabaseClient === "undefined") return;
  const unlockKey = "relvia-page-unlock-" + key;

  const esc = (s) => String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  function showClosed(lock) {
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;background:#0a0806;color:#f5f1ea;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;font-family:Inter,sans-serif;">
        <h2 style="font-family:'Playfair Display',serif;font-size:24px;">${esc(lock.label)} is temporarily closed</h2>
        <p style="color:#a89e8f;font-size:14px;max-width:460px;">${esc(lock.message || "Check back soon.")}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
          <input id="pageLockPasscode" type="password" placeholder="Passcode" style="background:#1c150d;border:1px solid #2a2018;border-radius:12px;padding:10px 14px;color:#f5f1ea;font-size:14px;">
          <button id="pageLockSubmit" style="background:#e0b158;color:#0a0806;font-weight:800;padding:10px 20px;border-radius:12px;border:none;cursor:pointer;">Unlock</button>
        </div>
        <div id="pageLockError" style="color:#f2a8a3;font-size:13px;min-height:18px;"></div>
      </div>`;
    const submit = async () => {
      const passcode = document.getElementById("pageLockPasscode").value;
      const { data: ok, error } = await supabaseClient.rpc("verify_page_passcode", { target_page_key: key, passcode });
      if (error) { document.getElementById("pageLockError").textContent = "Couldn't check the passcode. Try again."; return; }
      if (ok) { sessionStorage.setItem(unlockKey, "true"); window.location.reload(); }
      else document.getElementById("pageLockError").textContent = "That passcode isn't right.";
    };
    document.getElementById("pageLockSubmit").addEventListener("click", submit);
    document.getElementById("pageLockPasscode").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  }

  (async function check() {
    try {
      const { data } = await supabaseClient.rpc("get_page_locks_public");
      const lock = (data || []).find((l) => l.page_key === key);
      if (!lock || !lock.is_closed) return;
      if (sessionStorage.getItem(unlockKey) === "true") return;
      showClosed(lock);
    } catch (e) { /* fail open */ }
  })();
})();
