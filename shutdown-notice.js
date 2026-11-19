/* Relvia whole-platform shutdown notice.
 * Include on every public page:  <script src="/shutdown-notice.js"></script>
 * Fails open: if the check can't run, the page loads normally.
 * Skipped on /owner/ so founders can always turn the switch back on. */
(function () {
  if (window.location.pathname.indexOf("/owner") === 0) return;

  var SUPABASE_URL = "https://nqcbhpqzzwjgkusfbexo.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xY2JocHF6endqZ2t1c2ZiZXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjY1NjEsImV4cCI6MjA5ODk0MjU2MX0.BphyIGT-X9ctYVvfYXw_ldo5XGguNv5j-zDiGBPrCVU";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showNotice(message) {
    var wrap = document.createElement("div");
    wrap.setAttribute("role", "alert");
    wrap.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:rgba(10,10,12,.96);color:#f5f1ea;" +
      "display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;" +
      "font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;";
    wrap.innerHTML =
      '<div style="max-width:520px;">' +
      '<h1 style="font-size:24px;margin:0 0 12px;">Relvia is temporarily closed</h1>' +
      '<p style="margin:0 0 20px;color:#c9c2b5;">' + esc(message || "We'll be back soon.") + "</p>" +
      '<p style="margin:0;font-size:13px;color:#8a8478;">Check the status page for updates.</p>' +
      "</div>";
    document.documentElement.appendChild(wrap);
    document.documentElement.style.overflow = "hidden";
  }

  try {
    fetch(SUPABASE_URL + "/rest/v1/rpc/platform_shutdown_status", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: "{}"
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.is_on) showNotice(d.message); })
      .catch(function () { /* fail open */ });
  } catch (e) { /* fail open */ }
})();
