(function () {
  const OVERLAY_ID = "__li_focus_block__";
  const UNLOCK_KEY = "__li_focus_unlock_until__";
  const STATS_KEY = "__li_focus_stats__";
  const UNLOCK_MINUTES = 5;

  const QUOTES = [
    ["You will never reach your destination if you stop and throw stones at every dog that barks.", "Winston Churchill"],
    ["The successful warrior is the average man, with laser-like focus.", "Bruce Lee"],
    ["It is not that we have a short time to live, but that we waste a lot of it.", "Seneca"],
    ["Where your attention goes, your time goes.", "Idowu Koyenikan"],
    ["You become what you give your attention to.", "Epictetus"],
    ["The cost of a thing is the amount of life which is required to be exchanged for it.", "Henry David Thoreau"],
    ["Concentrate all your thoughts upon the work in hand. The sun's rays do not burn until brought to a focus.", "Alexander Graham Bell"],
    ["Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.", "Zig Ziglar"],
    ["Starve your distractions, feed your focus.", "Unknown"],
    ["What you stay focused on will grow.", "Roy T. Bennett"],
    ["Do the hard jobs first. The easy jobs will take care of themselves.", "Dale Carnegie"],
    ["Your attention is the most valuable thing you own. Spend it deliberately.", "Unknown"],
  ];

  function isFeedHome() {
    // Only the home feed itself (/feed or /feed/), never sub-paths like
    // /feed/update/... (individual post permalinks) and never the root "/"
    // (which is the logged-out marketing/login page, not the feed).
    return /^\/feed\/?$/.test(location.pathname);
  }

  function unlockUntil() {
    return Number(localStorage.getItem(UNLOCK_KEY) || 0);
  }

  function unlockActive() {
    return Date.now() < unlockUntil();
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function readStats() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function bumpStats() {
    const stats = readStats();
    const key = todayKey();
    stats[key] = (stats[key] || 0) + 1;
    const cutoff = Date.now() - 7 * 864e5;
    for (const k of Object.keys(stats)) {
      if (new Date(k + "T00:00:00").getTime() < cutoff) delete stats[k];
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    return stats;
  }

  let reblockTimer = null;

  function scheduleReblock() {
    clearTimeout(reblockTimer);
    const ms = unlockUntil() - Date.now();
    if (ms > 0) reblockTimer = setTimeout(check, ms + 250);
  }

  function startUnlock() {
    localStorage.setItem(UNLOCK_KEY, String(Date.now() + UNLOCK_MINUTES * 60e3));
    scheduleReblock();
    removeBlock();
  }

  function showBlock() {
    document.documentElement.classList.add("li-focus-blocked");

    if (document.getElementById(OVERLAY_ID)) return;

    const stats = bumpStats();
    const today = stats[todayKey()] || 0;
    const week = Object.values(stats).reduce((a, b) => a + b, 0);
    const [quote, author] = QUOTES[Math.floor(Math.random() * QUOTES.length)];

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="li-focus-card">
        <div class="li-focus-emoji">🎯</div>
        <h1>Feed blocked</h1>
        <p class="li-focus-sub">You only need Messages and Jobs here.</p>
        <blockquote class="li-focus-quote">
          “${quote}”
          <cite>— ${author}</cite>
        </blockquote>
        <div class="li-focus-streak">
          🛡️ Saved you <strong>${today}×</strong> today · <strong>${week}×</strong> this week
        </div>
        <div class="li-focus-links">
          <a href="https://www.linkedin.com/messaging/">Messages</a>
          <a href="https://www.linkedin.com/jobs/">Jobs</a>
        </div>
        <button type="button" class="li-focus-unlock">I really need the feed for ${UNLOCK_MINUTES} minutes</button>
      </div>
    `;

    overlay
      .querySelector(".li-focus-unlock")
      .addEventListener("click", startUnlock);

    (document.documentElement || document).appendChild(overlay);
  }

  function removeBlock() {
    document.documentElement.classList.remove("li-focus-blocked");

    const el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
  }

  function check() {
    if (isFeedHome() && !unlockActive()) {
      showBlock();
    } else {
      removeBlock();
      if (unlockActive()) scheduleReblock();
    }
  }

  // LinkedIn is a client-side-routed SPA, so plain URL matching only
  // catches the first load. Content scripts run in an isolated world,
  // so patching history.pushState here can't see the page's own calls —
  // use browser-dispatched signals instead.
  if (typeof navigation !== "undefined") {
    navigation.addEventListener("navigatesuccess", check);
  }

  // Backstop: on any DOM change, re-check if the URL moved since last time.
  let lastHref = location.href;
  new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      check();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", check);
  document.addEventListener("DOMContentLoaded", check);
  check();
})();
