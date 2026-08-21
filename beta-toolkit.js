// ==========================================================
// RELVIA BETA TOOLKIT — shared, single-include script
//
// Add this ONE line near the end of any page's <body>:
//   <script src="/beta-toolkit.js"></script>
//
// It automatically:
//   1. Checks the real beta_mode flag from the owner panel
//   2. Shows a floating "BETA" badge (bottom-left) if it's on
//   3. Clicking the badge shows what beta actually means
//   4. Shows a floating "Feedback" button (bottom-right) that
//      goes straight to DevForum
//
// Works on any page without needing to know that page's own
// HTML structure — it builds its own floating elements rather
// than trying to inject into an existing header.
// ==========================================================

(function(){
  const SUPABASE_URL = "https://nqcbhpqzzwjgkusfbexo.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xY2JocHF6endqZ2t1c2ZiZXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjY1NjEsImV4cCI6MjA5ODk0MjU2MX0.BphyIGT-X9ctYVvfYXw_ldo5XGguNv5j-zDiGBPrCVU";

  function loadSupabaseThen(callback){
    if (window.supabase){ callback(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = callback;
    document.head.appendChild(script);
  }

  function injectStyles(){
    const style = document.createElement("style");
    style.textContent = `
      #relviaBetaBadge{
        position:fixed; bottom:20px; left:20px; z-index:9999;
        font-family:Inter,sans-serif; font-size:10.5px; font-weight:800; letter-spacing:.5px;
        color:#000; background:linear-gradient(135deg,#f2c766,#b9832f);
        padding:6px 14px; border-radius:999px; cursor:pointer; box-shadow:0 6px 20px -4px rgba(217,169,75,.5);
        display:none;
      }
      #relviaFeedbackBtn{
        position:fixed; bottom:20px; right:20px; z-index:9999;
        font-family:Inter,sans-serif; font-size:12px; font-weight:700;
        color:#f5f1ea; background:rgba(10,8,6,.9); border:1px solid #2a2018;
        padding:9px 16px; border-radius:999px; cursor:pointer; backdrop-filter:blur(8px);
        display:none; text-decoration:none;
      }
      #relviaFeedbackBtn:hover{ border-color:#b9832f; color:#e0b158; }
      #relviaBetaPopover{
        position:fixed; bottom:60px; left:20px; z-index:10000;
        background:#1c150d; border:1px solid #b9832f; border-radius:14px; padding:18px 20px;
        max-width:280px; font-family:Inter,sans-serif; color:#f5f1ea; font-size:12.5px; line-height:1.6;
        box-shadow:0 20px 50px -10px rgba(0,0,0,.6); display:none;
      }
      #relviaBetaPopover h4{ font-family:"Playfair Display",serif; font-size:14px; margin-bottom:8px; color:#e0b158; }
      #relviaBetaPopoverClose{ float:right; color:#a89e8f; cursor:pointer; font-size:14px; }
    `;
    document.head.appendChild(style);
  }

  function buildElements(){
    const badge = document.createElement("div");
    badge.id = "relviaBetaBadge";
    badge.textContent = "BETA";
    document.body.appendChild(badge);

    const popover = document.createElement("div");
    popover.id = "relviaBetaPopover";
    popover.innerHTML = `
      <span id="relviaBetaPopoverClose">×</span>
      <h4>You're in Beta</h4>
      <p>Relvia is in active beta — things may change, and some features (like RelvBits) aren't live yet while we build out the platform. Found a bug or have an idea? Use the Feedback button.</p>
    `;
    document.body.appendChild(popover);

    const feedbackBtn = document.createElement("a");
    feedbackBtn.id = "relviaFeedbackBtn";
    feedbackBtn.textContent = "✦ Feedback";
    const depth = (window.location.pathname.match(/\//g) || []).length - 1;
    const prefix = depth > 0 ? "../".repeat(depth) : "";
    feedbackBtn.href = `${prefix}devforum.html`;
    document.body.appendChild(feedbackBtn);

    badge.addEventListener("click", () => {
      popover.style.display = popover.style.display === "block" ? "none" : "block";
    });
    document.getElementById("relviaBetaPopoverClose").addEventListener("click", () => {
      popover.style.display = "none";
    });
  }

  function init(){
    injectStyles();
    buildElements();

    loadSupabaseThen(async () => {
      const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const [{ data: betaBadgeFlag }, { data: betaModeFlag }] = await Promise.all([
        client.from("feature_flags").select("enabled").eq("key", "beta_badge").maybeSingle(),
        client.from("feature_flags").select("enabled").eq("key", "beta_mode").maybeSingle(),
      ]);

      if (betaBadgeFlag && betaBadgeFlag.enabled){
        document.getElementById("relviaBetaBadge").style.display = "block";
      }
      if (betaModeFlag && betaModeFlag.enabled){
        document.getElementById("relviaFeedbackBtn").style.display = "block";
      }
    });
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
