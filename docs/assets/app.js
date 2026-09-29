/* Fantasy Kitchen: site renderer. No build step, no dependencies.
   Every page is a thin shell, <div id="app" data-view="menu"></div>, and everything on it comes from
   docs/data/*.json, written by the kitchen pipeline (KITCHEN.md). Add ?sample=1 to render docs/data/sample/.

   One kitchen, different stations. The frame (header, tabs, fonts, call colours, follow card) is the same
   on every page; each content area sits on its own plate:
     menu     The Menu, as a printed menu card
     ticket   the pieces you act on (Market Run, Butcher Shop, On the Line, Prep Notes, Order Up), as order tickets
     kitchen  home and the pieces you read (Heat Check, Leftovers, From the Pass, About), in the dark kitchen */
(function () {
  "use strict";

  const SERIES = {
    home:      { name: "This week",     plain: "The week's board",   page: "index.html",     plate: "kitchen" },
    menu:      { name: "The Menu",      plain: "Rankings",           page: "menu.html",      plate: "menu",    blurb: "Weekly positional rankings with tiers." },
    market:    { name: "Market Run",    plain: "Waivers",            page: "market.html",    plate: "ticket",  blurb: "Waiver wire: adds, FAAB, stashes, drops." },
    butcher:   { name: "Butcher Shop",  plain: "Trades",             page: "butcher.html",   plate: "ticket",  blurb: "Trade for and trade away." },
    heat:      { name: "Heat Check",    plain: "Risers and fallers", page: "heat.html",      plate: "kitchen", blurb: "Risers and fallers, with the numbers behind them." },
    line:      { name: "On the Line",   plain: "Start/sit",          page: "line.html",      plate: "ticket",  blurb: "Start, sit, and the coin flips." },
    prep:      { name: "Prep Notes",    plain: "Injury report",      page: "prep.html",      plate: "ticket",  blurb: "The injury report, read for lineups." },
    orderup:   { name: "Order Up",      plain: "Sunday inactives",   page: "orderup.html",   plate: "ticket",  blurb: "Sunday inactives and lineup pivots." },
    leftovers: { name: "Leftovers",     plain: "Monday recap",       page: "leftovers.html", plate: "kitchen", blurb: "Monday takeaways, usage, and overreactions." },
    notes:     { name: "Kitchen notes", plain: "News",               page: "pass.html",      plate: "kitchen", blurb: "What moved today." },
    pass:      { name: "From the Pass", plain: "Every post",         page: "pass.html",      plate: "kitchen", blurb: "Everything the kitchen posted." },
    about:     { name: "About",         plain: "The kitchen",        page: "about.html",     plate: "kitchen", blurb: "How the kitchen runs." }
  };
  const DECK = ["home", "menu", "market", "butcher", "heat", "line", "prep", "orderup", "leftovers", "pass"];
  const TABS = [["home", "This week", "burner"], ["menu", "Rankings", "list"], ["market", "Waivers", "basket"], ["line", "Start/Sit", "swap"]];
  const POS_ORDER = ["QB", "RB", "WR", "TE", "FLEX"];
  const POS_NAME = { QB: "Quarterbacks", RB: "Running backs", WR: "Wide receivers", TE: "Tight ends", FLEX: "Flex" };
  const TIER_LABEL = { 1: "Chef's table", 2: "Entrees", 3: "Sides", 4: "Snacks", 5: "Pantry", 6: "Scraps" };

  const params = new URLSearchParams(location.search);
  const SAMPLE = params.get("sample") === "1";
  const DATA_ROOT = SAMPLE ? "data/sample/" : "data/";
  /* The sample week is frozen at Sunday 11:50 AM ET so the preview shows a full week; ?now=ISO moves the clock for testing. */
  const NOW = (() => {
    const d = params.get("now") ? new Date(params.get("now")) : SAMPLE ? new Date("2026-09-27T15:50:00Z") : new Date();
    return isNaN(d) ? new Date() : d;
  })();
  const ET = "America/New_York";

  /* ---------- free and members content ----------
     Everything the site shows today is free, and all of it comes from docs/data/, which is public.
     Members content will never be committed to this repo: when the paid tier launches, each piece gets
     a members section fed from a separate, signed-in source, and it renders in membersSlot(). Until then
     the slot shows only in the sample preview, so the design is ready and nothing is promised on the live site. */
  const MEMBERS = { launched: false };

  /* ---------- html strings, escaped by default ---------- */
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ESC[c]);
  function Raw(s) { this.s = s; }
  const raw = s => new Raw(String(s));
  const out = v => (v == null || v === false) ? "" : Array.isArray(v) ? v.map(out).join("") : v instanceof Raw ? v.s : esc(v);
  const html = (strs, ...vals) => raw(strs.reduce((acc, s, i) => acc + s + (i < vals.length ? out(vals[i]) : ""), ""));
  const pad2 = n => String(n).padStart(2, "0");
  const lc = s => String(s || "").toLowerCase();
  const cap = s => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
  const tagsOf = r => [r.team, r.pos].filter(Boolean).join(" ");
  const safeUrl = u => /^https?:\/\//i.test(String(u || "")) ? String(u) : "";

  /* ---------- tiny markdown (paragraphs, headings, lists, bold, italics, links, quotes) ---------- */
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\*)([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|[^\s):]+\.html[^\s)]*)\)/g, '<a href="$2">$1</a>');
  }
  const ri = s => raw(inline(s));
  function md(src) {
    if (!src) return raw("");
    const lines = String(src).replace(/\r/g, "").split("\n");
    const acc = [];
    let para = [], list = null;
    const flushP = () => { if (para.length) { acc.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
    const flushL = () => { if (list) { acc.push("<" + list.t + ">" + list.items.map(i => "<li>" + inline(i) + "</li>").join("") + "</" + list.t + ">"); list = null; } };
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      let m;
      if (!line.trim()) { flushP(); flushL(); continue; }
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushP(); flushL(); const h = m[1].length + 2; acc.push(`<h${h}>${inline(m[2])}</h${h}>`); continue; }
      if ((m = line.match(/^>\s?(.*)$/))) { flushP(); flushL(); acc.push("<blockquote><p>" + inline(m[1]) + "</p></blockquote>"); continue; }
      if ((m = line.match(/^[-*]\s+(.*)$/))) { flushP(); if (!list || list.t !== "ul") { flushL(); list = { t: "ul", items: [] }; } list.items.push(m[1]); continue; }
      if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flushP(); if (!list || list.t !== "ol") { flushL(); list = { t: "ol", items: [] }; } list.items.push(m[1]); continue; }
      flushL(); para.push(line.trim());
    }
    flushP(); flushL();
    return raw(acc.join(""));
  }

  /* ---------- time, all Eastern ---------- */
  const dtf = o => new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: ET }, o));
  const valid = iso => iso && !isNaN(new Date(iso));
  const fmt = iso => valid(iso) ? dtf({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) + " ET" : "";
  const fmtDay = iso => valid(iso) ? dtf({ weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) + " ET" : "";
  function ago(iso) {
    if (!valid(iso)) return "";
    const s = Math.max(0, (NOW - new Date(iso)) / 1000);
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    return Math.round(s / 86400) + "d ago";
  }
  function etParts(d) {
    const p = {};
    dtf({ weekday: "long", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" })
      .formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return { day: p.weekday, y: +p.year, m: +p.month, d: +p.day, min: (+p.hour % 24) * 60 + (+p.minute) };
  }
  const toMin = t => {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t || "").trim());
    return m ? (+m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + (+m[2]) : null;
  };
  const DAY_ORDER = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Monday"];
  const INACTIVES_MIN = 11 * 60 + 30;
  /* Content weeks run Tuesday to Monday (tools/fk.py). The manifest names the week it was built in;
     count the Tuesdays since then so the site rolls over at midnight even before the first run of the week. */
  function clockWeek(manifest) {
    const base = manifest.currentWeek || 1;
    if (!valid(manifest.updatedAt)) return base;
    const start = d => { const p = etParts(d), day = Date.UTC(p.y, p.m - 1, p.d) / 864e5; return day - DAY_ORDER.indexOf(p.day); };
    const weeks = Math.round((start(NOW) - start(new Date(manifest.updatedAt))) / 7);
    return Math.max(1, Math.min(18, base + Math.max(0, weeks)));
  }

  /* ---------- data ---------- */
  async function getJSON(path) {
    const r = await fetch(DATA_ROOT + path + (SAMPLE ? "" : "?v=" + Date.now().toString(36).slice(0, 6)), { cache: "no-cache" });
    if (!r.ok) throw new Error(path + " " + r.status);
    return r.json();
  }
  const tryJSON = path => getJSON(path).catch(() => null);
  const byNewest = (a, b) => String(b.updatedAt || b.publishedAt).localeCompare(String(a.updatedAt || a.publishedAt));

  /* ---------- the action rule: every player item carries one call ---------- */
  const ACTIONS = {
    START: ["Start", "go"], FLEX: ["Flex", "go"], STREAM: ["Stream", "go"],
    CLAIM: ["Claim", "buy"], ADD: ["Add", "buy"], STASH: ["Stash", "buy"], TRADE_FOR: ["Trade for", "buy"],
    HOLD: ["Hold", "hold"], SIT: ["Sit", "stop"], DROP: ["Drop", "stop"], TRADE_AWAY: ["Trade away", "stop"],
    MONITOR: ["Monitor", "watch"], PIVOT: ["Pivot", "pivot"]
  };
  function act(item) {
    if (!item || !item.action) return null;
    const key = String(item.action).toUpperCase().replace(/\s+/g, "_");
    const [label, cls] = ACTIONS[key] || [cap(lc(item.action)), "hold"];
    const faab = !!item.faab && (key === "CLAIM" || key === "ADD" || key === "STASH" || (key === "STREAM" && !item.slot));
    const tag = faab ? item.faab : (key === "START" || key === "FLEX" || key === "STREAM") ? (item.slot || "") : "";
    let extra = "";
    if (key === "TRADE_FOR" || key === "TRADE_AWAY") extra = item.price ? "Price: " + item.price : "";
    else if (key === "MONITOR") extra = item.watch ? "Watch " + item.watch : "";
    else if (key === "PIVOT") extra = item.to ? "Pivot to " + item.to : "";
    let line = label + (faab ? ", " + tag + " FAAB" : tag ? " as " + tag : "");
    if (key === "PIVOT" && item.to) line = extra;
    else if (extra) line = label + " · " + extra.replace(/^(Price: |Watch )/, "");
    return { key, label, cls, tag, faab, extra, line, watch: key === "MONITOR" ? "" : (item.watch || "") };
  }
  const callText = a => a ? a.label + (a.tag ? " " + a.tag : "") : "";
  function flag(r) {
    const f = String(r.flag || "").toUpperCase();
    if (!f || f === "O" || f === "OUT" || f === "IR") return "";
    return html`<span class="flag ${lc(f)}" title="${f === "Q" ? "Questionable" : f === "D" ? "Doubtful" : f}">${f}</span>`;
  }
  function tiers(rows) {
    const groups = [];
    let g = null;
    (rows || []).forEach(r => {
      const n = r.tier || 0;
      if (!g || g.n !== n) { g = { n, label: r.tier_label || TIER_LABEL[n] || "", rows: [] }; groups.push(g); }
      g.rows.push(r);
    });
    return groups;
  }
  const lastWindow = d => {
    const ws = (d && d.windows) || [];
    return ws.filter(w => (w.inactives || []).length || (w.pivots || []).length).pop() || ws[0] || { name: "", time: "" };
  };

  /* ---------- icons ---------- */
  const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    mark: '<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="15" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17" cy="17" r="9" fill="none" stroke="currentColor" stroke-width="2" opacity=".7"/><circle cx="17" cy="17" r="3.6" style="fill:var(--mark-core,#e0612b)"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9L1 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z"/></svg>',
    chev: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="m6 9 6 6 6-6"/></svg>`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${S} cx="11" cy="11" r="7"/><path ${S} d="m20 20-3.6-3.6"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${S} cx="12" cy="12" r="9"/><path ${S} d="M12 7v5l3 2"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect ${S} x="5" y="11" width="14" height="10" rx="2"/><path ${S} d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
    share: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>`,
    burner: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${S} cx="12" cy="12" r="9"/><circle ${S} cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>`,
    list: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>`,
    basket: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M3 9h18l-2 11H5L3 9zM8 9l4-6 4 6M9 13v4M15 13v4"/></svg>`,
    swap: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect ${S} x="2.5" y="7" width="19" height="10" rx="5"/><circle cx="16.5" cy="12" r="2.6" fill="currentColor"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect ${S} x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect ${S} x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect ${S} x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect ${S} x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>`,
    close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M6 6l12 12M18 6 6 18"/></svg>`
  };
  const icon = k => raw(ICONS[k] || "");

  /* ---------- the week: what is served, live, next ---------- */
  function link(k, week) {
    const q = [];
    if (week) q.push("week=" + week);
    if (SAMPLE) q.push("sample=1");
    return SERIES[k].page + (q.length ? "?" + q.join("&") : "");
  }
  function makeCtx(site, manifest) {
    const handle = String(site.handle || "FF_ChefHazy").replace(/^@/, "");
    const pieces = manifest.pieces || [];
    const ctx = {
      site, manifest, pieces, now: etParts(NOW), currentWeek: clockWeek(manifest), handle,
      brand: site.brand || "Fantasy Kitchen", author: site.author || "Chef Hazy",
      x: "https://x.com/" + handle, follow: "https://x.com/intent/follow?screen_name=" + encodeURIComponent(handle),
      entry: (series, week) => pieces.filter(p => p.series === series && p.week === week).sort(byNewest)[0] || null,
      weeksOf: series => Array.from(new Set(pieces.filter(p => p.series === series).map(p => p.week))).sort((a, b) => b - a)
    };
    ctx.liveOrderUp = entry => !!entry && entry.week === ctx.currentWeek && ctx.now.day === "Sunday" && ctx.now.min >= 8 * 60 &&
      (SAMPLE || (NOW - new Date(entry.updatedAt || entry.publishedAt)) < 16 * 36e5);
    return ctx;
  }
  function servicesOf(site) {
    const rows = [];
    (site.schedule || []).forEach(d => (d.services || []).forEach(sv => {
      if (SERIES[sv.series]) rows.push({ day: d.day, idx: DAY_ORDER.indexOf(d.day), series: sv.series, time: sv.time, min: toMin(sv.time) });
    }));
    const at = r => r.min == null ? INACTIVES_MIN : r.min;
    return rows.sort((a, b) => a.idx - b.idx || at(a) - at(b));
  }
  /* each scheduled service for a week: served (on the site), live, cooking (due in the last few hours), next, upcoming, or none */
  function plan(ctx, week) {
    const rel = Math.sign(week - ctx.currentWeek), today = DAY_ORDER.indexOf(ctx.now.day);
    const rows = servicesOf(ctx.site).map(r => {
      const entry = ctx.entry(r.series, week), at = r.min == null ? INACTIVES_MIN : r.min;
      const minsSince = (today - r.idx) * 1440 + (ctx.now.min - at);
      let state;
      if (entry) state = r.series === "orderup" && ctx.liveOrderUp(entry) ? "live" : "served";
      else if (rel < 0) state = "none";
      else if (rel > 0 || minsSince < 0) state = "upcoming";
      else state = minsSince < 180 ? "cooking" : "none";
      return Object.assign(r, { entry, state });
    });
    const next = rows.find(r => r.state === "upcoming");
    if (next && rel === 0) next.state = "next";
    return rows;
  }
  const stateText = (s, short) => s.state === "served" ? "Served" : s.state === "live" ? (short ? "Live" : "Live now") : s.state === "cooking" ? "Cooking"
    : s.state === "none" ? "Not served" : s.state === "next" ? (short ? "Next " : "Next, ") + s.time : s.time;
  function nextService(ctx) {
    const rows = plan(ctx, ctx.currentWeek), n = rows.find(r => r.state === "next");
    if (n) return n;
    const first = servicesOf(ctx.site)[0];
    return first ? Object.assign({}, first, { later: true }) : null;
  }
  const whenText = s => s.day + (s.min == null ? ", " + s.time : " " + s.time + " ET");

  /* ---------- the frame: the same on every page ---------- */
  function shell(ctx, view, plate, body) {
    const tabbed = TABS.some(t => t[0] === view);
    const cur = k => k === view ? raw(' aria-current="page"') : "";
    return html`
      ${SAMPLE ? html`<p class="notice">Sample data. This is a preview of the layout, not real rankings.</p>` : ""}
      <header class="top"><div class="top-in">
        <a class="brand" href="${link("home")}" aria-label="${ctx.brand}, this week"><span class="mk">${icon("mark")}</span><span class="wm">${ctx.brand}</span></a>
        <nav class="deck" aria-label="Sections">${DECK.map(k => html`<a href="${link(k)}"${cur(k)}>${SERIES[k].name}</a>`)}</nav>
        <button type="button" class="more-btn" data-sheet-open aria-haspopup="dialog" aria-label="All sections">${icon("grid")}<span>More</span></button>
        <a class="follow" href="${ctx.follow}" target="_blank" rel="noopener">${icon("x")}<span>Follow</span></a>
      </div></header>
      <main id="main" class="view-${view} plate-${plate}">${body}</main>
      <footer class="foot"><span>${ctx.brand} by ${ctx.author} · ${ctx.site.season || ""} season</span>
        <span><a href="${link("about")}">About the kitchen</a> · <a href="${ctx.x}" target="_blank" rel="noopener">@${ctx.handle} on X</a></span></footer>
      <nav class="tabbar" aria-label="Sections">
        ${TABS.map(([k, label, ic]) => html`<a href="${link(k)}"${cur(k)}>${icon(ic)}<span>${label}</span></a>`)}
        <button type="button" data-sheet-open${tabbed ? "" : raw(' aria-current="page"')} aria-haspopup="dialog">${icon("grid")}<span>More</span></button>
      </nav>
      <div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="All sections" hidden><div class="sheet-in">
        <div class="sheet-head"><h2>The week</h2><button type="button" data-sheet-close aria-label="Close">${icon("close")}</button></div>
        <ol>${sectionList(ctx).map(s => html`<li><a href="${link(s.k)}"${cur(s.k)}><span class="s">${SERIES[s.k].name}</span><span class="p">${SERIES[s.k].plain}</span><span class="w">${s.when}</span></a></li>`)}</ol>
      </div></div>`;
  }
  function sectionList(ctx) {
    const seen = {}, items = [{ k: "home", when: "" }];
    servicesOf(ctx.site).forEach(s => { if (!seen[s.series]) { seen[s.series] = 1; items.push({ k: s.series, when: s.day + (s.min == null ? "" : ", " + s.time) }); } });
    DECK.forEach(k => { if (!items.some(i => i.k === k)) items.push({ k, when: k === "pass" ? "All week" : "" }); });
    return items.concat([{ k: "about", when: "" }]);
  }
  function followCard(ctx) {
    return html`<div class="follow-card"><span class="mk">${icon("mark")}</span>
      <p><b>Every call, as it drops.</b> Waivers Tuesday, the Menu Wednesday, start/sit Thursday, pivots Sunday morning.</p>
      <a class="btn hot" href="${ctx.follow}" target="_blank" rel="noopener">${icon("x")}Follow @${ctx.handle}</a></div>`;
  }
  /* the end of every piece: the thread on X, share, follow */
  function after(ctx, p) {
    const post = (p.posts || []).find(x => safeUrl(x.url));
    return html`<section class="after">
      <div class="after-row">${post ? html`<a class="btn" href="${post.url}" target="_blank" rel="noopener">${icon("x")}${post.kind === "post" ? "See the post" : "Read the thread"}</a>` : ""}
        <button type="button" class="btn" data-share="${p.title || ""}">${icon("share")}Share</button></div>
      ${followCard(ctx)}</section>`;
  }
  function membersSlot(plate, what) {
    if (!MEMBERS.launched && !SAMPLE) return "";
    const say = `Where paid extras would sit: set apart from the free ${what}, locked until a member signs in.`;
    if (plate === "menu") return html`<section class="tent" aria-label="Members section, preview"><p class="sc">Members · coming later</p><p class="rv">Reserved</p>
      <p class="desc">${say}</p><button type="button" class="tent-btn" disabled>Get notified</button></section>`;
    if (plate === "ticket") return ticket(["Members", "Coming later"], html`<div class="ghost" aria-hidden="true"><i></i><i></i><i></i></div>
      <span class="big-stamp">Reserved</span><p class="rs">${say}</p>`, { cls: "reserved-tk" });
    return html`<section class="reserved" aria-label="Members section, preview"><div class="ghost" aria-hidden="true"><i></i><i></i><i></i></div>
      <p class="lock-line">${icon("lock")}<span>Members</span><em>coming later</em></p><h3>Reserved</h3><p>${say}</p>
      <button type="button" class="btn" disabled>Get notified</button></section>`;
  }
  function weekPick(ctx, series, week, cls) {
    const weeks = ctx.weeksOf(series);
    if (weeks.length < 2) return html`<span class="week-pick ${cls} single">Week ${week}</span>`;
    return html`<label class="week-pick ${cls}"><span class="sr">Choose a week</span><select data-week>${weeks.map(w =>
      html`<option value="${w}"${w === week ? raw(" selected") : ""}>Week ${w}</option>`)}</select>${icon("chev")}</label>`;
  }
  const updated = p => {
    const t = p.updatedAt || p.publishedAt, age = valid(t) ? NOW - new Date(t) : -1, recent = age >= 0 && age < 48 * 36e5;
    return (p.updatedAt && p.updatedAt !== p.publishedAt ? "Updated " : "Served ") + fmt(t) + (recent ? " · " + ago(t) : "");
  };
  const box = (msg, cls) => html`<div class="empty ${cls || ""}"><p>${msg}</p></div>`;

  /* ---------- plate: the menu card ---------- */
  const price = a => a ? html`<span class="price ${a.cls}">${callText(a)}</span>` : "";
  function dish(r, posKey, isOff) {
    const a = act(r), m = [posKey === "FLEX" || posKey === "*" ? r.pos : null, r.team, r.opp].filter(Boolean).join(" ");
    return html`<li class="dish${isOff ? " off" : ""}" data-name="${lc(r.player)}">
      <p class="line"><span class="no">${isOff || r.rank == null ? "" : r.rank}</span><span class="nm">${r.player}</span>${flag(r)}<span class="dots" aria-hidden="true"></span>${price(a)}</p>
      <p class="desc">${m ? html`<span class="tm">${m}</span>` : ""}${r.note ? ri(r.note) : r.why ? ri(r.why) : ""}</p>
      ${r.verdict ? html`<p class="more verdict">${ri(r.verdict)}</p>` : ""}
      ${a && a.extra ? html`<p class="more ${a.cls}">${a.extra}</p>` : ""}
      ${a && a.watch ? html`<p class="more watch">Watch ${a.watch}</p>` : ""}
    </li>`;
  }
  function menuPlate(ctx, p) {
    const d = p.data || {}, pos = d.positions || {}, off = d.off_menu || {};
    const keys = Object.keys(pos).sort((a, b) => (POS_ORDER.indexOf(a) + 99) % 99 - (POS_ORDER.indexOf(b) + 99) % 99);
    return html`<div class="cols"><div class="main-col">
      <article class="menu-card">
        <header class="mc-head">
          <p class="sc">${SERIES.menu.plain} · ${p.format || ctx.site.scoring || "PPR"} · Week ${p.week}</p>
          <h1>${SERIES.menu.name}</h1>
          ${p.dek ? html`<p class="dek">${p.dek}</p>` : ""}
          <p class="orn" aria-hidden="true">${icon("mark")}</p>
          <div class="mc-meta"><p class="sc">${updated(p)}</p>${weekPick(ctx, "menu", p.week, "on-menu")}</div>
        </header>
        ${keys.length ? html`<nav class="courses" role="tablist" aria-label="Positions">${keys.map(k =>
          html`<button type="button" role="tab" id="tab-${k}" data-pos-tab="${k}" aria-controls="pos-${k}">${k}</button>`)}
          <button type="button" class="find" data-find aria-label="Find a player" aria-expanded="false">${icon("search")}</button></nav>
        <div class="finder" hidden><input type="search" placeholder="Find a player" aria-label="Find a player" autocomplete="off" spellcheck="false"></div>` : ""}
        ${p.intro_md ? html`<details class="chef-note"><summary class="sc">A note from the chef</summary>${md(p.intro_md)}</details>` : ""}
        <div class="spread" data-board>${keys.length ? keys.map(k => html`<section class="pos" id="pos-${k}" data-pos="${k}" role="tabpanel" aria-labelledby="tab-${k}">
          <h2 class="pos-h">${POS_NAME[k] || k}</h2>
          <div class="pos-body">${tiers(pos[k]).map(t => html`<div class="tier"><p class="tier-h"><span class="sc">Tier ${t.n}</span><span class="it">${t.label}</span></p>
            <ol class="dishes">${t.rows.map(r => dish(r, k))}</ol></div>`)}
          ${(off[k] || []).length ? html`<div class="tier off"><p class="tier-h"><span class="sc">Ruled out</span><span class="it">Off the menu</span></p>
            <ol class="dishes">${off[k].map(r => dish(r, k, true))}</ol></div>` : ""}</div>
        </section>`) : box("No rankings on this menu yet.")}</div>
        <p class="no-match" hidden>Nobody by that name on this menu.</p>
        ${(d.specials || []).length ? html`<section class="specials"><p class="tier-h"><span class="sc">Matchup plays</span><span class="it">Specials</span></p>
          <ol class="dishes">${d.specials.map(r => dish(r, "*"))}</ol></section>` : ""}
        ${p.outro_md ? html`<div class="mc-outro">${md(p.outro_md)}</div>` : ""}
      </article></div>
      <aside class="side-col">${membersSlot("menu", "menu")}${after(ctx, p)}</aside></div>`;
  }

  /* ---------- plate: order tickets ---------- */
  const stamp = (a, sm, pre) => a ? html`<span class="stamp ${a.cls}${sm ? " sm" : ""}">${pre ? pre + " " : ""}${callText(a)}</span>` : "";
  function ticket(band, body, o) {
    o = o || {};
    return html`<article class="tk${o.cls ? " " + o.cls : ""}"${o.id ? raw(' id="' + esc(o.id) + '"') : ""}><div class="tk-band${o.red ? " red" : ""}"><span>${band[0]}</span><span>${band[1] || ""}</span></div>${body}${o.code ? html`<div class="barcode" aria-hidden="true"></div><p class="tk-id">${o.code}</p>` : ""}</article>`;
  }
  /* the line: this week's ticket stations, the one you are on pulled forward */
  function rail(ctx, view, week) {
    const rows = plan(ctx, week).filter(s => SERIES[s.series].plate === "ticket");
    return html`<nav class="rail" aria-label="The line: this week's tickets"><div class="rod" aria-hidden="true"></div>
      <ol>${rows.map(s => html`<li class="stub is-${s.state}${s.series === view ? " here" : ""}"><a href="${link(s.series, s.entry && week !== ctx.currentWeek ? week : null)}"${s.series === view ? raw(' aria-current="page"') : ""}>
        <span class="d">${s.day.slice(0, 3)}</span><span class="s">${SERIES[s.series].name}</span><span class="t">${stateText(s, true)}</span></a></li>`)}</ol></nav>`;
  }
  function ticketHead(ctx, series, p, o) {
    o = o || {};
    return ticket([o.band || html`Order ${p.season || ctx.site.season}-W${pad2(p.week)} · ${SERIES[series].plain}`, p.format || ctx.site.scoring || "PPR"], html`
      <header class="tk-head"><p class="k">${SERIES[series].plain} · Week ${p.week}</p><h1>${SERIES[series].name}</h1>${p.dek ? html`<p class="dek">${p.dek}</p>` : ""}
        <div class="tk-meta"><p class="fired"><span>Fired ${fmtDay(p.publishedAt)}</span>${p.updatedAt && p.updatedAt !== p.publishedAt ? html`<span>Refired ${fmtDay(p.updatedAt)}</span>` : ""}</p>
        ${weekPick(ctx, series, p.week, "on-ticket")}</div></header>
      ${p.intro_md ? html`<details class="memo"><summary>Chef's memo</summary>${md(p.intro_md)}</details>` : ""}`, { cls: "head-tk", red: o.red });
  }
  function item(r, o) {
    o = o || {};
    const a = act(r);
    return html`<li class="ti${o.off ? " off" : ""}" data-name="${lc(r.player)}">
      <span class="q${o.qcls ? " " + o.qcls : ""}">${o.num != null ? (typeof o.num === "number" ? pad2(o.num) : o.num) : ""}</span>
      <span class="n">${r.player}${flag(r)}</span>
      ${stamp(a, false, o.pre)}
      <span class="m">${[r.team, r.pos, r.opp].filter(Boolean).join(" ")}${o.sub ? " · " + o.sub : ""}</span>
      ${(o.mods || []).map(x => x)}
      ${r.why || r.note || r.read ? html`<span class="mod">${ri(r.why || r.note || r.read)}</span>` : ""}
      ${r.verdict ? html`<span class="mod v">${ri(r.verdict)}</span>` : ""}
      ${r.flip_if ? html`<span class="mod f">Flips if ${r.flip_if}</span>` : ""}
      ${a && a.extra && !o.noExtra ? html`<span class="mod x ${a.cls}">${a.extra}</span>` : ""}
      ${a && a.watch ? html`<span class="mod w"><mark>Watch: ${a.watch}</mark></span>` : ""}
    </li>`;
  }
  const items = list => html`<ol class="items">${list}</ol>`;
  const code = (p, s) => `${p.season || ""}W${pad2(p.week)} ${s}`;
  const ticketPage = (ctx, series, p, grid, o) => html`<div class="cols"><div class="main-col">${rail(ctx, series, p.week)}
      <div class="tk-grid">${ticketHead(ctx, series, p, o)}${grid}</div>
      ${p.outro_md ? ticket(["From the chef", ""], html`<div class="tk-body">${md(p.outro_md)}</div>`) : ""}</div>
    <aside class="side-col">${o && o.members === false ? "" : membersSlot("ticket", "tickets")}${after(ctx, p)}</aside></div>`;

  function marketTicket(ctx, p) {
    const d = p.data || {};
    return ticketPage(ctx, "market", p, html`
      ${(d.adds || []).length ? ticket(["Priority adds", d.adds.length + " on the list"], items(d.adds.map((r, i) =>
        item(r, { num: r.priority != null ? r.priority : i + 1, sub: r.rostered ? "Rostered " + r.rostered : "" }))), { code: code(p, "ADDS") }) : ""}
      <div class="tk-col">
        ${(d.stashes || []).length ? ticket(["Stashes", "deep bench"], items(d.stashes.map((r, i) => item(r, { num: i + 1 }))), { code: code(p, "STASH") }) : ""}
        ${(d.drops || []).length ? ticket(["Cut bait", "drops"], items(d.drops.map((r, i) => item(r, { num: i + 1, off: true }))), { red: true, code: code(p, "DROPS") }) : ""}
        ${(d.mnf || []).length ? ticket(["Monday night", "what changed"], html`<div class="tk-body">${d.mnf.map(m => html`<p>${ri(m.text || m)}</p>`)}</div>`) : ""}
      </div>`);
  }
  function butcherTicket(ctx, p) {
    const d = p.data || {};
    return ticketPage(ctx, "butcher", p, html`
      ${(d.buy || []).length ? ticket(["Trade for", "prime cuts"], items(d.buy.map((r, i) => item(r, { num: i + 1 }))), { code: code(p, "BUY") }) : ""}
      ${(d.sell || []).length ? ticket(["Trade away", "past its date"], items(d.sell.map((r, i) => item(r, { num: i + 1 }))), { red: true, code: code(p, "SELL") }) : ""}`);
  }
  function lineTicket(ctx, p) {
    const d = p.data || {};
    const t = (key, band, sub, o) => (d[key] || []).length ? ticket([band, sub], items(d[key].map((r, i) => item(r, Object.assign({ num: i + 1 }, o)))), { code: code(p, key.toUpperCase()), red: key === "sits" }) : "";
    return ticketPage(ctx, "line", p, html`${t("tnf", "Thursday night", "lock it in")}${t("starts", "Start them", "plate it")}
      <div class="tk-col">${t("sits", "Sit them", "send it back")}${t("coinflips", "Coin flips", "the lean", { pre: "Lean" })}</div>`);
  }
  const PRACTICE_DAYS = ["Wed", "Thu", "Fri"];
  const STATUS = { O: "Out", OUT: "Out", D: "Doubtful", Q: "Questionable", P: "Probable", IR: "Injured reserve" };
  function prepTicket(ctx, p) {
    const d = p.data || {}, groups = [];
    (d.report || []).forEach(r => {
      const st = String(r.status || "").toUpperCase(), name = STATUS[st] || st || "Listed";
      let g = groups.find(x => x.name === name);
      if (!g) groups.push(g = { name, st: st === "OUT" ? "O" : st, rows: [] });
      g.rows.push(r);
    });
    const rank = st => ({ O: 0, D: 1, Q: 2 })[st] ?? 9;
    groups.sort((a, b) => rank(a.st) - rank(b.st));
    const plog = r => (r.practice || []).length ? html`<span class="mod plog"><span class="pl">${r.practice.map((x, i) =>
      html`<i class="pl-${lc(String(x).replace(/[^a-z]/gi, "")) || "na"}" title="${PRACTICE_DAYS[i] || ""}: ${x}">${(PRACTICE_DAYS[i] || "").charAt(0)}</i>`)}</span>${r.practice.join(" · ")}</span>` : "";
    return ticketPage(ctx, "prep", p, html`
      ${groups.length ? ticket(["Designations", "Wed · Thu · Fri practice"], groups.map(g => html`<section class="grp"><h2><span>${g.name}</span></h2>
        ${items(g.rows.map(r => item(Object.assign({}, r, { pos: [r.pos, r.injury].filter(Boolean).join(" · ") }),
          { num: g.st || "", qcls: "st st-" + lc(g.st), mods: [plog(r)] })))}</section>`), { code: code(p, "REPORT") }) : ""}
      <div class="tk-col">
        ${(d.reversals || []).length ? ticket(["Reversals", "the call changed"], items(d.reversals.map((r, i) => html`<li class="ti" data-name="${lc(r.player)}">
          <span class="q">${pad2(i + 1)}</span><span class="n">${r.player}</span><span class="m">Was: ${r.was}</span><span class="mod v">Now: ${r.now}</span></li>`)), { red: true }) : ""}
        ${(d.gtd || []).length ? ticket(["Sunday morning decisions", "watch the inactives"], items(d.gtd.map((name, i) => html`<li class="ti" data-name="${lc(typeof name === "string" ? name : name.player)}">
          <span class="q">${pad2(i + 1)}</span><span class="n">${typeof name === "string" ? name : name.player}</span><span class="m">Game-time decision. Order Up has the call.</span></li>`))) : ""}
      </div>`);
  }
  function orderupTicket(ctx, p) {
    const d = p.data || {}, live = ctx.liveOrderUp(ctx.entry("orderup", p.week));
    return ticketPage(ctx, "orderup", p, html`
      ${(d.updates || []).length ? ticket(["Updates", "newest first"], html`<ol class="upd">${d.updates.map(u => html`<li><time>${u.time}</time><p>${ri(u.text)}</p></li>`)}</ol>`) : ""}
      <div class="tk-col">${(d.windows || []).map(w => {
        const [kick, ...rest] = String(w.time || "").split(" · "), sub = rest.join(" · ");
        return ticket([w.name, kick], html`
          ${sub ? html`<p class="tk-sub">${cap(sub)}</p>` : ""}
          ${(w.inactives || []).length ? items(w.inactives.map(r => item(r, { num: "86", off: true, noExtra: (w.pivots || []).some(pv => pv.out === r.player) })))
            : html`<p class="tk-empty">Nothing on this ticket yet. It prints when the inactives drop.</p>`}
          ${(w.pivots || []).map(pv => html`<div class="swap"><span class="o">${pv.out}</span><span class="stamp pivot">Pivot to</span><span class="i">${pv.in}</span>${pv.note ? html`<span class="sn">${pv.note}</span>` : ""}</div>`)}`,
          { code: code(p, String(w.name || "").toUpperCase()) });
      })}</div>`, { red: live, band: live ? html`<i class="dot"></i>Order Up · Live` : null, members: false });
  }

  /* ---------- plate: the kitchen ---------- */
  const tag = a => a ? html`<span class="act ${a.cls}"><b>${a.label}</b>${a.tag ? html`<small>${a.tag}${a.faab ? " FAAB" : ""}</small>` : ""}</span>` : "";
  const chip = (a, player) => a ? html`<span class="chip ${a.cls}">${player ? html`<b>${player}</b>` : ""}${a.line}${a.watch ? " · watch " + a.watch : ""}</span>` : "";
  function kitchenHead(ctx, series, p, o) {
    o = o || {};
    return html`<section class="k-head">
      <p class="kicker"><span>${SERIES[series].plain}</span>${p && p.week ? html`<span>${p.format || ctx.site.scoring || "PPR"}</span>` : ""}</p>
      <div class="title-row"><h1>${o.title || SERIES[series].name}</h1>${p && p.week ? weekPick(ctx, series, p.week, "on-kitchen") : ""}</div>
      ${(o.dek || (p && p.dek)) ? html`<p class="dek">${o.dek || p.dek}</p>` : ""}
      ${p && (p.updatedAt || p.publishedAt) ? html`<p class="k-when">${icon("clock")}<span>${updated(p)}</span></p>` : ""}
      ${p && p.intro_md ? html`<details class="note-box"><summary>Chef's note</summary><div class="prose">${md(p.intro_md)}</div></details>` : ""}
    </section>`;
  }
  const sec = (title, aside, body, cls) => html`<section class="sec${cls ? " " + cls : ""}"><div class="sec-head"><h2>${title}</h2>${aside ? html`<span class="aside">${aside}</span>` : ""}</div>${body}</section>`;
  function heatCard(r, dir) {
    const a = act(r);
    return html`<article class="heat-card ${dir}">
      <div class="hc-top"><span class="who"><span class="nm">${r.player}</span><span class="mt">${[r.team, r.pos].filter(Boolean).join(" · ")}</span></span>${tag(a)}</div>
      ${r.stat ? html`<p class="hc-stat">${r.stat}</p>` : ""}
      ${r.why ? html`<p class="hc-why">${ri(r.why)}</p>` : ""}
      ${r.verdict ? html`<p class="hc-verdict">${ri(r.verdict)}</p>` : ""}
      ${a && a.extra ? html`<p class="ex ${a.cls}">${a.extra}</p>` : ""}
      ${a && a.watch ? html`<p class="ex watch">Watch ${a.watch}</p>` : ""}
    </article>`;
  }
  const kitchenPage = (ctx, series, p, body, what) => html`<div class="cols"><div class="main-col">${kitchenHead(ctx, series, p)}${body}
      ${p.outro_md && series !== "leftovers" ? html`<section class="sec prose outro">${md(p.outro_md)}</section>` : ""}</div>
    <aside class="side-col">${membersSlot("kitchen", what)}${after(ctx, p)}</aside></div>`;
  function heatKitchen(ctx, p) {
    const d = p.data || {}, up = d.risers || [], down = d.fallers || [];
    return kitchenPage(ctx, "heat", p, html`<div class="heat-cols">
      ${up.length ? sec("Stove's on", up.length + (up.length === 1 ? " riser" : " risers"), html`<div class="heat-list">${up.map(r => heatCard(r, "up"))}</div>`) : ""}
      ${down.length ? sec("Left to cool", down.length + (down.length === 1 ? " faller" : " fallers"), html`<div class="heat-list">${down.map(r => heatCard(r, "down"))}</div>`) : ""}
    </div>`, "board");
  }
  function leftoversKitchen(ctx, p) {
    const d = p.data || {};
    return kitchenPage(ctx, "leftovers", p, html`
      ${(d.takeaways || []).length ? sec("Takeaways", "what Sunday told us", html`<ol class="takeaways">${d.takeaways.map((t, i) => html`<li>
        <span class="tw-n">${i + 1}</span><div class="tw-body"><h3>${t.headline}</h3>${t.text ? html`<p>${ri(t.text)}</p>` : ""}
        ${(t.actions || []).length ? html`<div class="acts">${t.actions.map(x => chip(act(x), x.player))}</div>` : ""}</div></li>`)}</ol>`) : ""}
      ${(d.usage || []).length ? sec("Usage notes", "snaps · routes · targets · carries", html`<div class="usage-list">${d.usage.map(u => html`<article class="u-card">
        <div class="hc-top"><span class="who"><span class="nm">${u.player}</span><span class="mt">${[u.team, u.pos].filter(Boolean).join(" · ")}</span></span>${tag(act(u))}</div>
        ${u.stat ? html`<p class="hc-stat">${u.stat}</p>` : ""}${u.read ? html`<p class="hc-why">${ri(u.read)}</p>` : ""}</article>`)}</div>`) : ""}
      ${(d.overreactions || []).length ? sec("Overreactions, checked", "real or noise", html`<div class="over-list">${d.overreactions.map(o => html`<article class="over ${o.verdict === "buy" ? "real" : "noise"}">
        <p class="ov-badge">${o.verdict === "buy" ? "Real" : "Noise"}</p><p class="ov-take">${o.take}</p>${o.why ? html`<p class="ov-why">${ri(o.why)}</p>` : ""}
        <div class="acts">${chip(act(o), o.player)}</div></article>`)}</div>`) : ""}
      ${p.outro_md ? sec("The misses", "owned", html`<div class="prose">${md(p.outro_md)}</div>`, "misses") : ""}`, "board");
  }

  /* ---------- series pages ---------- */
  function seriesView(series, render) {
    return async ctx => {
      const weeks = ctx.weeksOf(series), want = parseInt(params.get("week"), 10);
      const week = weeks.includes(want) ? want : weeks[0];
      const entry = week != null ? ctx.entry(series, week) : null;
      if (!entry) return emptySeries(ctx, series);
      const p = await getJSON(entry.path);
      ctx.title = p.title || SERIES[series].name;
      return render(ctx, p);
    };
  }
  function emptySeries(ctx, series) {
    const svc = servicesOf(ctx.site).find(s => s.series === series);
    const msg = svc ? `${SERIES[series].name} opens ${svc.day}${svc.min == null ? ", " + svc.time : " at " + svc.time + " ET"}. First service is coming.` : "The kitchen is prepping. Check back soon.";
    const plate = SERIES[series].plate, fake = { week: ctx.currentWeek, season: ctx.site.season, dek: SERIES[series].blurb };
    if (plate === "menu") return html`<div class="cols"><div class="main-col"><article class="menu-card"><header class="mc-head">
      <p class="sc">${SERIES.menu.plain} · Week ${ctx.currentWeek}</p><h1>${SERIES.menu.name}</h1><p class="dek">${SERIES.menu.blurb}</p>
      <p class="orn" aria-hidden="true">${icon("mark")}</p><p class="sc">${msg}</p></header></article></div><aside class="side-col">${followCard(ctx)}</aside></div>`;
    if (plate === "ticket") return html`<div class="cols"><div class="main-col">${rail(ctx, series, ctx.currentWeek)}
      ${ticket([html`Order ${ctx.site.season}-W${pad2(ctx.currentWeek)} · ${SERIES[series].plain}`, ctx.site.scoring || "PPR"], html`<header class="tk-head">
        <p class="k">${SERIES[series].plain} · Week ${fake.week}</p><h1>${SERIES[series].name}</h1><p class="dek">${fake.dek}</p></header>
        <p class="tk-empty">${msg}</p>`, { cls: "head-tk" })}</div><aside class="side-col">${followCard(ctx)}</aside></div>`;
    return html`<div class="cols"><div class="main-col">${kitchenHead(ctx, series, null, { dek: SERIES[series].blurb })}${box(msg)}</div><aside class="side-col">${followCard(ctx)}</aside></div>`;
  }

  /* ---------- the Pass and About ---------- */
  function noteItem(it) {
    const a = act(it);
    return html`<li><time>${fmt(it.at)}</time><p>${ri(it.text)}${safeUrl(it.url) ? html` <a class="src" href="${safeUrl(it.url)}" target="_blank" rel="noopener">Source</a>` : ""}</p>
      ${a ? chip(a, it.player) : ""}${a && a.key === "HOLD" && it.why ? html`<p class="why">${ri(it.why)}</p>` : ""}</li>`;
  }
  function postItem(p) {
    return html`<li><time>${SERIES[p.series] ? SERIES[p.series].name : p.series === "reply" ? "Reply" : "Post"}${p.week ? " · Week " + p.week : ""} · ${fmt(p.postedAt)}</time>
      <p>${raw(esc(p.preview || "").replace(/(^|\s)(#\w+)/g, '$1<span class="ht">$2</span>'))}</p>
      ${p.note ? html`<p class="why">${p.note}</p>` : ""}
      ${safeUrl(p.url) ? html`<a class="more" href="${safeUrl(p.url)}" target="_blank" rel="noopener">${icon("x")}${p.kind === "thread" ? "Read the thread" + (p.count ? " (" + p.count + ")" : "") : "View on X"}</a>` : ""}</li>`;
  }
  async function latestNotes(ctx) {
    const e = ctx.pieces.filter(p => p.series === "notes").sort((a, b) => (b.week - a.week) || byNewest(a, b))[0];
    return e ? tryJSON(e.path) : null;
  }
  async function passView(ctx) {
    const [notes, feed] = await Promise.all([latestNotes(ctx), tryJSON("posts.json")]);
    const items = (notes && notes.data && notes.data.items) || [], posts = ((feed && feed.posts) || []).slice().sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
    ctx.title = SERIES.pass.name;
    return html`<div class="cols"><div class="main-col">
      ${kitchenHead(ctx, "pass", null, { dek: "Every post and thread from the kitchen as it went out on X, plus the daily notes." })}
      ${sec("Kitchen notes", notes ? "Week " + notes.week + " · " + fmt(notes.updatedAt) : "", items.length ? html`<ol class="feed">${items.slice(0, 60).map(noteItem)}</ol>` : box("No notes yet this week."))}
      ${sec("Posts", posts.length ? posts.length + (posts.length === 1 ? " post" : " posts") : "", posts.length ? html`<ol class="feed">${posts.slice(0, 100).map(postItem)}</ol>` : box("Nothing has gone out yet."))}
    </div><aside class="side-col"><section class="sec">${followCard(ctx)}</section></aside></div>`;
  }
  function aboutView(ctx) {
    const site = ctx.site;
    ctx.title = SERIES.about.name;
    return html`<div class="cols"><div class="main-col">
      ${kitchenHead(ctx, "about", null, { title: ctx.brand, dek: site.about_dek || "" })}
      <section class="sec prose">${md(site.about_md || "")}</section>
      ${sec("The week", "all times ET", html`<ol class="schedule">${servicesOf(site).map(s => html`<li><a href="${link(s.series)}"><span class="d">${s.day}</span>
        <span class="s">${SERIES[s.series].name}</span><span class="p">${SERIES[s.series].plain}</span><span class="t">${s.time}</span></a></li>`)}</ol>`)}
    </div><aside class="side-col"><section class="sec">${followCard(ctx)}</section></aside></div>`;
  }

  /* ---------- This week (home) ---------- */
  function headlineCalls(P) {
    const calls = [], d = k => (P[k] && P[k].data) || {};
    const add = (series, it) => { if (it && it.player && it.action) calls.push({ series, item: it, a: act(it) }); };
    add("orderup", (lastWindow(d("orderup")).inactives || []).find(i => String(i.action).toUpperCase() === "PIVOT"));
    add("market", (d("market").adds || [])[0]);
    add("line", (d("line").tnf || [])[0]);
    add("line", (d("line").starts || [])[0]);
    add("line", (d("line").sits || [])[0]);
    add("butcher", (d("butcher").buy || [])[0]);
    add("heat", (d("heat").fallers || [])[0]);
    add("prep", (d("prep").report || []).find(r => String(r.action).toUpperCase() === "PIVOT"));
    return calls.slice(0, 7);
  }
  function preview(series, p) {
    const d = (p && p.data) || {};
    switch (series) {
      case "menu": return POS_ORDER.map(k => (d.positions && d.positions[k] || [])[0] && Object.assign({ _pos: k }, d.positions[k][0])).filter(Boolean);
      case "market": return (d.adds || []).slice(0, 3);
      case "butcher": return [].concat((d.buy || []).slice(0, 2), (d.sell || []).slice(0, 2));
      case "heat": return [].concat((d.risers || []).slice(0, 2), (d.fallers || []).slice(0, 1));
      case "line": return [].concat((d.tnf || []).slice(0, 1), (d.starts || []).slice(0, 1), (d.sits || []).slice(0, 1));
      case "prep": return (d.report || []).slice(0, 3);
      case "orderup": return (d.windows || []).flatMap(w => w.inactives || []).slice(0, 3);
      case "leftovers": return (d.takeaways || []).flatMap(t => t.actions || []).slice(0, 3);
      default: return [];
    }
  }
  /* each piece on home shows up as the object it is: a menu card, a ticket, or a kitchen card */
  function miniPlate(ctx, e, p) {
    const S = SERIES[e.series], wk = e.week !== ctx.currentWeek ? " · Week " + e.week : "", href = link(e.series, e.week !== ctx.currentWeek ? e.week : null);
    const svc = servicesOf(ctx.site).find(s => s.series === e.series), day = svc ? svc.day : "";
    if (S.plate === "menu") return html`<li class="mini-menu"><a href="${href}"><span class="sc">${day} · ${S.plain}${wk}</span><span class="mm-t">${S.name}</span>
      ${p && p.dek ? html`<span class="mm-d">${p.dek}</span>` : ""}
      <span class="mm-list">${preview(e.series, p).map(r => html`<span class="mm-row"><b>${r._pos}</b><span class="nm">${r.player}</span><i class="dots"></i><span class="tm">${r.team || ""}</span></span>`)}</span></a></li>`;
    if (S.plate === "ticket") return html`<li class="mini-tk"><a href="${href}"><span class="tk-band"><span>${day.slice(0, 3)} · ${S.plain}${wk}</span><span>${fmtDay(e.updatedAt || e.publishedAt)}</span></span>
      <span class="mt-t">${S.name}</span>${p && p.dek ? html`<span class="mt-d">${p.dek}</span>` : ""}
      <span class="mt-items">${preview(e.series, p).map(r => html`<span class="mt-it"><span class="n">${r.player}</span>${stamp(act(r), true)}</span>`)}</span></a></li>`;
    return html`<li class="mini-k"><a href="${href}"><span class="pl">${S.plain} · ${day.slice(0, 3)}${wk}</span><span class="ser">${S.name}</span>
      ${p && p.dek ? html`<span class="dk">${p.dek}</span>` : ""}
      ${preview(e.series, p).length ? html`<span class="mk-items">${preview(e.series, p).map(r => chip(act(r), r.player))}</span>` : ""}
      <span class="tm">${fmt(e.updatedAt || e.publishedAt)}</span></a></li>`;
  }
  function liveTicket(ctx, e, p) {
    const d = p.data || {}, w = lastWindow(d);
    return html`<div class="home-live">${ticket([html`<i class="dot"></i>Order Up · Live`, "Week " + p.week], html`
      <header class="tk-head"><p class="k">${w.time}</p><h2 class="h">${w.name}</h2></header>
      ${(d.updates || []).length ? html`<ol class="upd">${d.updates.slice(0, 3).map(u => html`<li><time>${u.time}</time><p>${ri(u.text)}</p></li>`)}</ol>` : ""}
      ${(w.pivots || []).slice(0, 1).map(pv => html`<div class="swap"><span class="o">${pv.out}</span><span class="stamp pivot">Pivot to</span><span class="i">${pv.in}</span></div>`)}
      <a class="tk-btn" href="${link("orderup")}">Open the ticket</a>`, { red: true, cls: "live-tk" })}</div>`;
  }
  async function homeView(ctx) {
    const week = ctx.currentWeek, rows = plan(ctx, week);
    const recent = ctx.pieces.filter(p => p.series !== "notes").sort(byNewest);
    const liveRow = rows.find(r => r.state === "live");
    const listed = recent.filter(e => !(liveRow && e === liveRow.entry)).slice(0, 7);
    const needed = Array.from(new Set(listed.concat(rows.filter(r => r.entry).map(r => r.entry))));
    const [feed, notes, ...loaded] = await Promise.all([tryJSON("posts.json"), latestNotes(ctx)].concat(needed.map(e => tryJSON(e.path))));
    const P = {}, byPath = {};
    needed.forEach((e, i) => { byPath[e.path] = loaded[i]; if (e.week === week && loaded[i]) P[e.series] = loaded[i]; });
    const calls = headlineCalls(P), nxt = nextService(ctx), w = liveRow && P.orderup ? lastWindow(P.orderup.data) : null;
    const status = liveRow && w ? html`<i class="dot"></i><span><b>${SERIES.orderup.name} is live.</b> ${w.name ? w.name + " inactives are in." : "Inactives are in."}</span>`
      : nxt ? html`<i class="dot calm"></i><span><b>Next up:</b> ${SERIES[nxt.series].name}, ${whenText(nxt)}.</span>` : "";
    const posts = ((feed && feed.posts) || []).slice().sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt))).slice(0, 3);
    const noteItems = ((notes && notes.data && notes.data.items) || []).slice(0, 3);
    return html`<div class="home">
      <div class="h-main">
        <section class="today">
          <p class="kicker"><span>${ctx.site.season || ""} season</span><span>Week ${week}</span></p>
          <h1>${ctx.now.day} service</h1>
          ${status ? html`<p class="status">${status}</p>` : ""}
        </section>
        <ol class="strip" aria-label="This week's schedule">${rows.map(s => html`<li class="is-${s.state}"><a href="${link(s.series, s.entry && week !== ctx.currentWeek ? week : null)}">
          <span class="d">${s.day.slice(0, 3)}</span><span class="s">${SERIES[s.series].name}</span><span class="t">${stateText(s)}</span></a></li>`)}</ol>
        ${liveRow && P.orderup ? liveTicket(ctx, liveRow.entry, P.orderup) : ""}
        ${calls.length ? sec("This week's calls", "tap for the why", html`<ol class="calls">${calls.map(c => html`<li><a class="call" href="${link(c.series)}">${tag(c.a)}
          <span class="who"><span class="nm">${c.item.player}</span><span class="mt">${tagsOf(c.item)}${tagsOf(c.item) ? " · " : ""}${SERIES[c.series].name}</span>
          ${c.a.extra ? html`<span class="ex ${c.a.cls}">${c.a.extra}</span>` : ""}</span></a></li>`)}</ol>`) : ""}
      </div>
      <div class="h-side">
        ${sec("Latest from the kitchen", "", listed.length ? html`<ol class="minis">${listed.map(e => miniPlate(ctx, e, byPath[e.path]))}</ol>`
          : box(nxt ? `The kitchen is prepping. First service is ${SERIES[nxt.series].name}, ${whenText(nxt)}.` : "The kitchen is prepping."))}
      </div>
      <div class="h-more">
        ${noteItems.length ? sec("Kitchen notes", html`<a href="${link("pass")}">All notes</a>`, html`<ol class="feed">${noteItems.map(noteItem)}</ol>`) : ""}
        ${posts.length ? sec("From the Pass", html`<a href="${link("pass")}">All posts</a>`, html`<ol class="feed">${posts.map(postItem)}</ol>`) : ""}
        <section class="sec">${followCard(ctx)}</section>
      </div>
    </div>`;
  }

  const VIEWS = {
    home: homeView,
    menu: seriesView("menu", menuPlate),
    market: seriesView("market", marketTicket),
    butcher: seriesView("butcher", butcherTicket),
    heat: seriesView("heat", heatKitchen),
    line: seriesView("line", lineTicket),
    prep: seriesView("prep", prepTicket),
    orderup: seriesView("orderup", orderupTicket),
    leftovers: seriesView("leftovers", leftoversKitchen),
    pass: passView,
    about: aboutView
  };

  /* ---------- behaviour ---------- */
  let toastTimer = 0;
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
  }
  function wire() {
    const $$ = s => Array.from(document.querySelectorAll(s));
    /* position tabs: one course at a time, the choice kept in the URL hash (menu.html#RB) */
    const tabs = $$("[data-pos-tab]"), blocks = $$("[data-board] .pos");
    if (tabs.length) {
      const show = (k, focus) => {
        tabs.forEach(t => { const on = t.dataset.posTab === k; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
        blocks.forEach(b => b.classList.toggle("on", b.dataset.pos === k));
        try { history.replaceState(null, "", location.pathname + location.search + "#" + k); } catch (e) { /* file:// */ }
      };
      tabs.forEach((t, i) => {
        t.addEventListener("click", () => show(t.dataset.posTab));
        t.addEventListener("keydown", e => {
          const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (step) { e.preventDefault(); show(tabs[(i + step + tabs.length) % tabs.length].dataset.posTab, true); }
        });
      });
      const want = location.hash.slice(1).toUpperCase();
      show(tabs.some(t => t.dataset.posTab === want) ? want : tabs[0].dataset.posTab);
    }
    /* find a player: filters every position at once */
    const finder = document.querySelector(".finder"), board = document.querySelector("[data-board]"), none = document.querySelector(".no-match");
    $$("[data-find]").forEach(b => b.addEventListener("click", () => {
      finder.hidden = !finder.hidden;
      b.setAttribute("aria-expanded", String(!finder.hidden));
      if (!finder.hidden) finder.querySelector("input").focus();
    }));
    if (finder && board) finder.querySelector("input").addEventListener("input", e => {
      const q = e.target.value.trim().toLowerCase();
      board.classList.toggle("searching", !!q);
      board.querySelectorAll("[data-name]").forEach(li => { li.hidden = !!q && !li.dataset.name.includes(q); });
      board.querySelectorAll(".tier").forEach(t => { t.hidden = !!q && !t.querySelector("[data-name]:not([hidden])"); });
      board.querySelectorAll(".pos").forEach(b => b.classList.toggle("hit", !!q && !!b.querySelector("[data-name]:not([hidden])")));
      if (none) none.hidden = !q || !!board.querySelector(".pos.hit");
    });
    /* week select */
    $$("[data-week]").forEach(s => s.addEventListener("change", () => {
      location.href = location.pathname + "?week=" + encodeURIComponent(s.value) + (SAMPLE ? "&sample=1" : "") + location.hash;
    }));
    /* the More sheet */
    const sheet = document.getElementById("sheet");
    let opener = null;
    const close = () => { sheet.hidden = true; document.documentElement.classList.remove("sheet-open"); if (opener) opener.focus(); };
    $$("[data-sheet-open]").forEach(b => b.addEventListener("click", () => {
      opener = b; sheet.hidden = false; document.documentElement.classList.add("sheet-open"); sheet.querySelector("[data-sheet-close]").focus();
    }));
    $$("[data-sheet-close]").forEach(b => b.addEventListener("click", close));
    sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) close(); });
    /* share */
    $$("[data-share]").forEach(b => b.addEventListener("click", async () => {
      const url = location.href.replace(/[?&]sample=1/, "");
      try {
        if (navigator.share) await navigator.share({ title: b.dataset.share || document.title, url });
        else { await navigator.clipboard.writeText(url); toast("Link copied."); }
      } catch (e) { /* share sheet dismissed */ }
    }));
    /* the rail starts at the ticket you are on; the week strip at what is live, cooking or next */
    [[".rail .here", ".rail .is-live"], [".strip .is-live", ".strip .is-cooking", ".strip .is-next"]].forEach(group => {
      const el = group.map(sel => document.querySelector(sel)).find(Boolean);
      if (!el) return;
      const ol = el.parentElement;
      if (ol.scrollWidth <= ol.clientWidth) return;
      const off = el.getBoundingClientRect().left - ol.getBoundingClientRect().left;
      ol.scrollLeft = Math.max(0, ol.scrollLeft + off - (ol.clientWidth - el.clientWidth) / 2);
    });
  }

  async function boot() {
    const app = document.getElementById("app");
    const view = VIEWS[app.dataset.view] ? app.dataset.view : "home";
    let site = {}, manifest = { pieces: [] };
    try { site = await getJSON("site.json"); } catch (e) { console.error(e); }
    try { manifest = await getJSON("index.json"); } catch (e) { console.error(e); }
    const ctx = makeCtx(site, manifest);
    let body;
    try {
      body = await VIEWS[view](ctx);
    } catch (e) {
      console.error(e);
      body = html`<div class="cols"><div class="main-col">${box("Something in the kitchen fell over loading this page. Refresh, or try again in a minute.", "error")}</div></div>`;
    }
    app.innerHTML = out(shell(ctx, view, SERIES[view].plate, body));
    document.title = (view === "home" ? "" : (ctx.title || SERIES[view].name) + " · ") + ctx.brand;
    wire();
  }
  boot();
})();
