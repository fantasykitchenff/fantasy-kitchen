/* Fantasy Kitchen redesign: design-direction mockups.
   "This week" (home) and The Menu, in three directions, rendered from the sample data in docs/data/sample/.
   Prototype only. This folder is deleted once a direction is picked and the real renderer is rebuilt. */
(function () {
  "use strict";

  const DIR = document.documentElement.dataset.dir || "a";
  const VIEW = document.body.dataset.view || "home";
  const DATA = "../../data/sample/";
  const params = new URLSearchParams(location.search);
  const SHOT = params.has("shot");
  /* The sample week's clock: Sunday 11:50 AM ET, just after the early-window inactives. */
  const NOW = new Date(params.get("now") || "2026-09-27T15:50:00Z");
  const ET = "America/New_York";

  /* ---------- html strings with escaping ---------- */
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ESC[c]);
  function Raw(s) { this.s = s; }
  const raw = s => new Raw(String(s));
  const out = v => (v == null || v === false) ? "" : Array.isArray(v) ? v.map(out).join("") : v instanceof Raw ? v.s : esc(v);
  const html = (strs, ...vals) => raw(strs.reduce((acc, s, i) => acc + s + (i < vals.length ? out(vals[i]) : ""), ""));
  const pad2 = n => String(n).padStart(2, "0");
  const lc = s => String(s || "").toLowerCase();

  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\*)([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, '<a href="$2">$1</a>');
  const md = src => raw(String(src || "").replace(/\r/g, "").split(/\n{2,}/).map(b => b.trim()).filter(Boolean).map(b =>
    /^#{1,3}\s/.test(b) ? "<h3>" + inline(b.replace(/^#+\s+/, "")) + "</h3>" :
    /^[-*]\s/.test(b) ? "<ul>" + b.split("\n").map(l => "<li>" + inline(l.replace(/^[-*]\s+/, "")) + "</li>").join("") + "</ul>" :
    "<p>" + inline(b.replace(/\n/g, " ")) + "</p>").join(""));
  const tags = s => raw(esc(s).replace(/(^|\s)(#\w+)/g, '$1<span class="ht">$2</span>'));

  /* ---------- time (all Eastern) ---------- */
  const dtf = o => new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: ET }, o));
  const fmt = iso => iso ? dtf({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) + " ET" : "";
  const fmtDay = iso => iso ? dtf({ weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) + " ET" : "";
  function nowET() {
    const p = {};
    dtf({ weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(NOW).forEach(x => { p[x.type] = x.value; });
    return { day: p.weekday, date: p.month + " " + p.day, min: (+p.hour) * 60 + (+p.minute) };
  }
  const toMin = t => {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t || "").trim());
    if (!m) return null;
    return (+m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + (+m[2]);
  };

  /* ---------- the kitchen's vocabulary ---------- */
  const SERIES = {
    home:      { name: "This week",     plain: "The board",          blurb: "" },
    menu:      { name: "The Menu",      plain: "Rankings",           blurb: "Weekly positional rankings with tiers." },
    market:    { name: "Market Run",    plain: "Waivers",            blurb: "Waiver wire: adds, FAAB, stashes, drops." },
    butcher:   { name: "Butcher Shop",  plain: "Trades",             blurb: "Trade for and trade away." },
    heat:      { name: "Heat Check",    plain: "Risers and fallers", blurb: "Risers and fallers, with the numbers behind them." },
    line:      { name: "On the Line",   plain: "Start/sit",          blurb: "Start, sit, and the coin flips." },
    prep:      { name: "Prep Notes",    plain: "Injury report",      blurb: "The injury report, read for lineups." },
    orderup:   { name: "Order Up",      plain: "Sunday inactives",   blurb: "Sunday inactives and lineup pivots." },
    leftovers: { name: "Leftovers",     plain: "Monday recap",       blurb: "Monday takeaways, usage, and overreactions." },
    notes:     { name: "Kitchen notes", plain: "News",               blurb: "What moved today." },
    pass:      { name: "From the Pass", plain: "Every post",         blurb: "Everything the kitchen posted." },
    about:     { name: "About",         plain: "The kitchen",        blurb: "" }
  };
  const TIER_LABEL = { 1: "Chef's table", 2: "Entrees", 3: "Sides", 4: "Snacks", 5: "Pantry", 6: "Scraps" };
  const POS_NAME = { QB: "Quarterbacks", RB: "Running backs", WR: "Wide receivers", TE: "Tight ends", FLEX: "Flex" };
  const BUILT = DIR === "d" ? { home: 1, menu: 1, market: 1, orderup: 1 } : { home: 1, menu: 1 };
  const href = k => k === "home" ? "index.html" : BUILT[k] ? k + ".html" : "#" + k;
  const todo = k => BUILT[k] ? "" : raw(' data-todo="' + k + '"');
  const cur = (k, view) => k === view ? raw(' aria-current="page"') : "";

  /* Every player item carries one action (playbook/_standards.md). */
  const ACTIONS = {
    START: ["Start", "go"], FLEX: ["Flex", "go"], STREAM: ["Stream", "go"],
    CLAIM: ["Claim", "buy"], ADD: ["Add", "buy"], STASH: ["Stash", "buy"], TRADE_FOR: ["Trade for", "buy"],
    HOLD: ["Hold", "hold"], SIT: ["Sit", "stop"], DROP: ["Drop", "stop"], TRADE_AWAY: ["Trade away", "stop"],
    MONITOR: ["Monitor", "watch"], PIVOT: ["Pivot", "pivot"]
  };
  function act(item) {
    if (!item || !item.action) return null;
    const key = String(item.action).toUpperCase().replace(/\s+/g, "_");
    const [label, cls] = ACTIONS[key] || [key, "hold"];
    let tag = "", extra = "";
    if (key === "START" || key === "FLEX" || key === "STREAM") tag = item.slot || item.faab || "";
    else if (key === "CLAIM" || key === "ADD" || key === "STASH") tag = item.faab || "";
    else if (key === "TRADE_FOR" || key === "TRADE_AWAY") extra = item.price ? "Price: " + item.price : "";
    else if (key === "MONITOR") extra = item.watch ? "Watch " + item.watch : "";
    else if (key === "PIVOT") extra = item.to ? "Pivot to " + item.to : "";
    const faab = (key === "CLAIM" || key === "ADD" || key === "STASH" || (key === "STREAM" && !item.slot)) && item.faab;
    return { key, label, cls, tag, faab: !!faab, extra, watch: key === "MONITOR" ? "" : (item.watch || "") };
  }
  const flag = r => {
    const f = String(r.flag || "").toUpperCase();
    return f && f !== "OUT" && f !== "O" && f !== "IR" ? html`<span class="flag ${lc(f)}" title="${f === "Q" ? "Questionable" : f === "D" ? "Doubtful" : f}">${f}</span>` : "";
  };
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

  /* The content week runs Tuesday to Monday. */
  const DAY_ORDER = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Monday"];
  function weekPlan(site, P) {
    const now = nowET(), today = DAY_ORDER.indexOf(now.day), rows = [];
    (site.schedule || []).forEach(d => (d.services || []).forEach(sv =>
      rows.push({ day: d.day, idx: DAY_ORDER.indexOf(d.day), series: sv.series, time: sv.time, min: toMin(sv.time) })));
    rows.sort((a, b) => a.idx - b.idx || (a.min || 0) - (b.min || 0));
    rows.forEach(r => {
      const started = r.idx < today || (r.idx === today && now.min >= (r.min == null ? 11 * 60 + 30 : r.min));
      r.state = !started ? "upcoming" : (r.series === "orderup" && r.idx === today && P.orderup) ? "live" : "served";
    });
    const next = rows.find(r => r.state === "upcoming");
    if (next) next.state = "next";
    return rows;
  }
  function sectionList(plan) {
    const seen = {}, items = [];
    plan.forEach(s => { if (!seen[s.series]) { seen[s.series] = 1; items.push({ k: s.series, when: s.day + (toMin(s.time) != null ? ", " + s.time : "") }); } });
    return items.concat([{ k: "notes", when: "Daily" }, { k: "pass", when: "All week" }, { k: "about", when: "" }]);
  }
  /* The headline call from each piece: what a reader acts on first. */
  function headlineCalls(P) {
    const calls = [], d = k => (P[k] && P[k].data) || {};
    const add = (series, item) => { if (item && item.player && item.action) calls.push({ series, item, a: act(item) }); };
    const w = lastWindow(d("orderup"));
    add("orderup", (w.inactives || []).find(i => i.action === "PIVOT"));
    add("market", (d("market").adds || [])[0]);
    add("line", (d("line").tnf || [])[0]);
    add("line", (d("line").sits || [])[0]);
    add("butcher", (d("butcher").buy || [])[0]);
    add("heat", (d("heat").fallers || [])[0]);
    return calls;
  }
  function preview(series, p) {
    const d = (p && p.data) || {};
    switch (series) {
      case "menu": return Object.keys(d.positions || {}).map(k => (d.positions[k] || [])[0]).filter(Boolean);
      case "market": return (d.adds || []).slice(0, 3);
      case "butcher": return [].concat((d.buy || []).slice(0, 2), (d.sell || []).slice(0, 2));
      case "heat": return [].concat((d.risers || []).slice(0, 2), (d.fallers || []).slice(0, 2));
      case "line": return [].concat((d.tnf || []).slice(0, 1), (d.starts || []).slice(0, 1), (d.sits || []).slice(0, 1));
      case "prep": return (d.report || []).slice(0, 3);
      case "orderup": return (d.windows || []).flatMap(w => w.inactives || []).slice(0, 3);
      case "leftovers": return (d.takeaways || []).flatMap(t => t.actions || []).slice(0, 3);
      default: return [];
    }
  }

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
    menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M4 7h16M4 12h16M4 17h10"/></svg>`,
    close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M6 6l12 12M18 6 6 18"/></svg>`
  };
  const icon = k => raw(ICONS[k] || "");

  /* =====================================================================
     Direction A: Night Service. The current dark kitchen, rebuilt like an app.
     ===================================================================== */
  const A = {
    shell(ctx, view, body, plate) {
      const deck = ["home", "menu", "market", "butcher", "heat", "line", "prep", "orderup", "leftovers", "pass"];
      const tabs = [["home", "This week", "burner"], ["menu", "Rankings", "list"], ["market", "Waivers", "basket"], ["line", "Start/Sit", "swap"]];
      return html`
        <header class="top"><div class="top-in">
          <a class="brand" href="index.html" aria-label="Fantasy Kitchen, this week"><span class="mk">${icon("mark")}</span><span class="wm">Fantasy Kitchen</span></a>
          <nav class="deck" aria-label="Sections">${deck.map(k => html`<a href="${href(k)}"${todo(k)}${cur(k, view)}>${SERIES[k].name}</a>`)}</nav>
          <a class="follow" href="${ctx.follow}" target="_blank" rel="noopener">${icon("x")}<span>Follow</span></a>
        </div></header>
        <main id="main" class="view-${view}${plate ? " plate-" + plate : ""}">${body}</main>
        <footer class="foot"><span>Fantasy Kitchen by Chef Hazy · ${ctx.site.season} season</span><span><a href="#about" data-todo="about">About the kitchen</a> · <a href="${ctx.x}" target="_blank" rel="noopener">@${ctx.handle} on X</a></span></footer>
        <nav class="tabbar" aria-label="Sections">
          ${tabs.map(([k, label, ic]) => html`<a href="${href(k)}"${todo(k)}${cur(k, view)}>${icon(ic)}<span>${label}</span></a>`)}
          <a href="#more" data-sheet="more">${icon("grid")}<span>More</span></a>
        </nav>
        <div class="sheet" id="more" hidden><div class="sheet-in">
          <div class="sheet-head"><h2>The week</h2><button data-sheet="more" aria-label="Close">${icon("close")}</button></div>
          <ol>${sectionList(ctx.plan).map(s => html`<li><a href="${href(s.k)}"${todo(s.k)}><span class="s">${SERIES[s.k].name}</span><span class="p">${SERIES[s.k].plain}</span><span class="w">${s.when}</span></a></li>`)}</ol>
        </div></div>`;
    },

    tag(a) { return a ? html`<span class="act ${a.cls}"><b>${a.label}</b>${a.tag ? html`<small>${a.tag}${a.faab ? " FAAB" : ""}</small>` : ""}</span>` : ""; },

    /* o.live and o.served let direction D put its own plates on the same home page */
    home(ctx, o) {
      o = o || {};
      const { P, plan, site, manifest } = ctx, now = nowET();
      const live = plan.find(s => s.state === "live"), w = P.orderup && lastWindow(P.orderup.data);
      return html`<div class="cols"><div class="main-col">
          <section class="today">
            <p class="kicker"><span>${site.season} season</span><span>Week ${manifest.currentWeek}</span></p>
            <h1>${now.day} service</h1>
            ${live && w ? html`<p class="status"><i class="dot"></i><span><b>${SERIES[live.series].name} is live.</b> ${w.name} inactives are in.</span></p>` : ""}
          </section>
          <ol class="strip" aria-label="This week's schedule">${plan.map(s => html`<li class="is-${s.state}"><a href="${href(s.series)}"${todo(s.series)}>
            <span class="d">${s.day.slice(0, 3)}</span><span class="s">${SERIES[s.series].name}</span>
            <span class="t">${s.state === "served" ? "Served" : s.state === "live" ? "Live now" : s.state === "next" ? "Next, " + s.time : s.time}</span></a></li>`)}</ol>
          ${P.orderup ? (o.live || A.live)(P.orderup) : ""}
          <section class="sec"><div class="sec-head"><h2>This week's calls</h2><span class="aside">tap for the why</span></div>
            <ol class="calls">${ctx.calls.map(c => html`<li><a class="call" href="${href(c.series)}"${todo(c.series)}>${A.tag(c.a)}
              <span class="who"><span class="nm">${c.item.player}</span><span class="mt">${[c.item.team, c.item.pos].filter(Boolean).join(" ")} · ${SERIES[c.series].name}</span>
              ${c.a.extra ? html`<span class="ex ${c.a.cls}">${c.a.extra}</span>` : ""}</span></a></li>`)}</ol></section>
        </div>
        <aside class="side-col">
          <section class="sec"><div class="sec-head"><h2>Served this week</h2></div>
            <ol class="served-list">${plan.filter(s => P[s.series] && s.state === "served").map(s => (o.served || A.served)(s, P[s.series]))}</ol></section>
          ${A.notes(P.notes)}
          ${A.pass(ctx.feed)}
          <section class="sec">${A.followCard(ctx)}</section>
        </aside></div>`;
    },

    served(s, p) {
      return html`<li><a href="${href(s.series)}"${todo(s.series)}>
        <span class="pl">${SERIES[s.series].plain} · ${s.day.slice(0, 3)}</span><span class="ser">${SERIES[s.series].name}</span>
        <span class="dk">${p.dek}</span><span class="tm">${fmt(p.updatedAt)}</span></a></li>`;
    },

    live(p) {
      const d = p.data || {}, w = lastWindow(d);
      return html`<section class="live-card">
        <div class="live-head"><span class="badge"><i class="dot"></i>Live</span><span>Order Up · Week ${p.week}</span></div>
        <h2>${w.name}</h2><p class="lt">${w.time}</p>
        <ol class="updates">${(d.updates || []).slice(0, 3).map(u => html`<li><time>${u.time}</time><p>${raw(inline(u.text))}</p></li>`)}</ol>
        ${(w.pivots || []).slice(0, 1).map(pv => html`<div class="pivot"><span class="o"><small>Out</small>${pv.out}</span><span class="i"><small>Pivot to</small>${pv.in}</span></div>`)}
        <a class="btn hot wide" href="#orderup" data-todo="orderup">Open Order Up</a>
      </section>`;
    },

    notes(p) {
      const items = (p && p.data && p.data.items) || [];
      if (!items.length) return "";
      return html`<section class="sec"><div class="sec-head"><h2>Kitchen notes</h2><span class="aside">${fmt(p.updatedAt)}</span></div>
        <ol class="feed">${items.slice(0, 3).map(it => { const a = act(it); return html`<li><time>${fmt(it.at)}</time><p>${raw(inline(it.text))}</p>
          ${a ? html`<span class="chip ${a.cls}">${a.label}${a.tag ? " " + a.tag : ""}${a.extra ? ". " + a.extra : a.watch ? ". Watch " + a.watch : ""}</span>` : ""}</li>`; })}</ol></section>`;
    },

    pass(feed) {
      const posts = ((feed && feed.posts) || []).slice(0, 3);
      if (!posts.length) return "";
      return html`<section class="sec"><div class="sec-head"><h2>From the Pass</h2><a class="aside" href="#pass" data-todo="pass">All posts</a></div>
        <ol class="feed">${posts.map(p => html`<li><time>${SERIES[p.series] ? SERIES[p.series].name : "Post"} · ${fmt(p.postedAt)}</time><p>${tags(p.preview)}</p>
          <a class="more" href="${p.url}" target="_blank" rel="noopener">${icon("x")}${p.kind === "thread" ? "Read the thread" : "View on X"}</a></li>`)}</ol></section>`;
    },

    followCard(ctx) {
      return html`<div class="follow-card"><span class="mk">${icon("mark")}</span>
        <p><b>Every call, as it drops.</b> Waivers Tuesday, the Menu Wednesday, start/sit Thursday, pivots Sunday morning.</p>
        <a class="btn hot" href="${ctx.follow}" target="_blank" rel="noopener">${icon("x")}Follow @${ctx.handle}</a></div>`;
    },

    menu(ctx) {
      const p = ctx.P.menu;
      if (!p) return html`<p class="empty">The Menu opens Wednesday.</p>`;
      const d = p.data || {}, pos = d.positions || {}, keys = Object.keys(pos), off = d.off_menu || {};
      const post = (p.posts || []).find(x => x.url);
      return html`<div class="cols"><div class="main-col">
          <section class="head">
            <p class="kicker"><span>Rankings</span><span>${p.format || "PPR"}</span></p>
            <div class="title-row"><h1>The Menu</h1><button class="week-pill" aria-label="Choose a week">Week ${p.week}${icon("chev")}</button></div>
            <p class="dek">${p.dek}</p>
            <p class="stamp">${icon("clock")}<span>Updated ${fmt(p.updatedAt)}</span></p>
            ${p.intro_md ? html`<details class="note-box"><summary>Chef's note</summary><div class="prose">${md(p.intro_md)}</div></details>` : ""}
          </section>
          <div class="posbar" role="tablist" aria-label="Positions">${keys.map(k => html`<button role="tab" data-pos-tab="${k}">${k}</button>`)}<button class="find" data-find aria-label="Find a player">${icon("search")}</button></div>
          <div class="finder"><input type="search" placeholder="Find a player" aria-label="Find a player" autocomplete="off"></div>
          <div class="board" data-board>${keys.map(k => html`<section class="pos" data-pos="${k}">
            ${tiers(pos[k]).map(t => html`<div class="tier t${t.n}"><div class="tier-head"><span class="tn">Tier ${t.n}</span><span class="tl">${t.label}</span><i class="glow"></i></div>
              <ol class="rows">${t.rows.map(r => A.row(r))}</ol></div>`)}
            ${(off[k] || []).length ? html`<div class="tier off"><div class="tier-head"><span class="tn">Off the menu</span><i class="glow"></i></div><ol class="rows">${off[k].map(r => A.row(r, true))}</ol></div>` : ""}
          </section>`)}</div>
        </div>
        <aside class="side-col">
          <section class="reserved" aria-label="Members block, example">
            <div class="ghost" aria-hidden="true"><i></i><i></i><i></i></div>
            <p class="lock-line">${icon("lock")}<span>Members</span><em>Example, coming later</em></p>
            <h3>Deeper cuts</h3>
            <p>Where paid extras would sit: clearly split from the free rankings above, locked until a member signs in.</p>
            <button class="btn" disabled>Get notified</button>
          </section>
          <section class="pf">
            <div class="pf-row">${post ? html`<a class="btn" href="${post.url}" target="_blank" rel="noopener">${icon("x")}Read the thread</a>` : ""}<button class="btn" data-share>${icon("share")}Share</button></div>
            ${A.followCard(ctx)}
          </section>
        </aside></div>`;
    },

    row(r, isOff) {
      const a = act(r);
      return html`<li class="row${isOff ? " is-off" : ""}" data-name="${lc(r.player)}">
        <span class="rk">${isOff ? "" : r.rank}</span>
        <span class="who"><span class="nm">${r.player}</span>${flag(r)}<span class="mt">${[r.team, r.pos, r.opp].filter(Boolean).join(" · ")}</span></span>
        ${A.tag(a)}
        ${r.note ? html`<p class="nt">${r.note}</p>` : ""}
        ${a && a.extra ? html`<p class="ex ${a.cls}">${a.extra}</p>` : ""}
        ${a && a.watch ? html`<p class="wt">${icon("clock")}<span>${a.watch}</span></p>` : ""}
      </li>`;
    }
  };

  /* =====================================================================
     Direction B: The Ticket. Every piece is an order ticket on the rail.
     ===================================================================== */
  const B = {
    shell(ctx, view, body) {
      return html`
        <header class="hd">
          <a class="brand" href="index.html" aria-label="Fantasy Kitchen, this week"><span class="mk">${icon("mark")}</span><span class="wm">Fantasy<br>Kitchen</span></a>
          <p class="hd-k">Chef Hazy's line<br>${ctx.site.season} season</p>
          <a class="follow" href="${ctx.follow}" target="_blank" rel="noopener">${icon("x")}<span>Follow</span></a>
        </header>
        <nav class="rail" aria-label="This week's tickets"><div class="rod" aria-hidden="true"></div>
          <ol>${ctx.plan.map(s => html`<li class="stub is-${s.state}${s.series === view ? " here" : ""}"><a href="${href(s.series)}"${todo(s.series)}>
            <span class="d">${s.day.slice(0, 3)}</span><span class="s">${SERIES[s.series].name}</span>
            <span class="t">${s.state === "served" ? "Served" : s.state === "live" ? "Live" : s.state === "next" ? "Next " + s.time : s.time}</span></a></li>`)}
            <li class="stub"><a href="#pass" data-todo="pass"><span class="d">All week</span><span class="s">From the Pass</span><span class="t">Every post</span></a></li></ol></nav>
        <main id="main" class="view-${view}">${body}</main>
        <footer class="ft"><span>Fantasy Kitchen · Chef Hazy · ${ctx.site.season}</span><span><a href="#about" data-todo="about">About</a> · <a href="${ctx.x}" target="_blank" rel="noopener">@${ctx.handle}</a></span></footer>`;
    },

    stamp(a, sm) { return a ? html`<span class="stamp ${a.cls}${sm ? " sm" : ""}">${a.label}${a.tag ? " " + a.tag : ""}</span>` : ""; },

    home(ctx) {
      const { P, plan, manifest } = ctx, now = nowET();
      return html`
        <section class="now"><p class="k"><span>Week ${manifest.currentWeek}</span><span>${now.day}, ${now.date}</span></p><h1>Now serving</h1></section>
        <div class="home-grid">
          <div class="home-a">
            ${P.orderup ? B.liveTicket(P.orderup) : ""}
            <article class="ticket calls-tk"><div class="band"><span>Chef's calls</span><span>Week ${manifest.currentWeek}</span></div>
              <ol class="items">${ctx.calls.map((c, i) => html`<li class="it"><a href="${href(c.series)}"${todo(c.series)}>
                <span class="q">${pad2(i + 1)}</span><span class="n">${c.item.player}</span>${B.stamp(c.a)}
                <span class="m">${[c.item.team, c.item.pos].filter(Boolean).join(" ")} · ${SERIES[c.series].name}</span>
                ${c.a.extra ? html`<span class="mod x ${c.a.cls}">${c.a.extra}</span>` : ""}</a></li>`)}</ol>
              <div class="barcode" aria-hidden="true"></div><p class="tk-id">${ctx.site.season}W${pad2(manifest.currentWeek)} CALLS</p></article>
          </div>
          <div class="home-b">
            <h2 class="rail-h">On the rail this week</h2>
            <div class="stack">${plan.filter(s => P[s.series] && s.state === "served").map(s => B.mini(s, P[s.series]))}</div>
            ${B.notes(P.notes)}
            ${B.pass(ctx.feed)}
            ${B.follow(ctx)}
          </div>
        </div>`;
    },

    liveTicket(p) {
      const d = p.data || {}, w = lastWindow(d);
      return html`<article class="ticket live-tk">
        <div class="band red"><span><i class="dot"></i>Order Up · Live</span><span>Week ${p.week}</span></div>
        <header class="tk-head"><p class="k">${w.time}</p><h2 class="h">${w.name}</h2></header>
        <ol class="upd">${(d.updates || []).map(u => html`<li><time>${u.time}</time><p>${raw(inline(u.text))}</p></li>`)}</ol>
        ${(w.pivots || []).map(pv => html`<div class="swap"><span class="o">${pv.out}</span><span class="stamp pivot">Pivot to</span><span class="i">${pv.in}</span></div>`)}
        <a class="tk-btn" href="#orderup" data-todo="orderup">Open the full ticket</a>
      </article>`;
    },

    mini(s, p) {
      return html`<a class="ticket mini" href="${href(s.series)}"${todo(s.series)}>
        <div class="band"><span>${s.day.slice(0, 3)} · ${SERIES[s.series].plain}</span><span>${fmtDay(p.updatedAt)}</span></div>
        <div class="mini-head"><h3>${SERIES[s.series].name}</h3><p>${p.dek}</p></div>
        <ol>${preview(s.series, p).slice(0, 4).map(it => html`<li><span class="n">${s.series === "menu" && it.pos ? it.pos + "1 " : ""}${it.player}</span>${B.stamp(act(it), true)}</li>`)}</ol>
      </a>`;
    },

    notes(p) {
      const items = (p && p.data && p.data.items) || [];
      if (!items.length) return "";
      return html`<article class="ticket notes-tk"><div class="band"><span>Kitchen notes</span><span>${fmtDay(p.updatedAt)}</span></div>
        <ol class="upd">${items.slice(0, 3).map(it => html`<li><time>${fmtDay(it.at)}</time><p>${raw(inline(it.text))}</p>${it.action ? B.stamp(act(it), true) : ""}</li>`)}</ol></article>`;
    },

    pass(feed) {
      const posts = ((feed && feed.posts) || []).slice(0, 2);
      if (!posts.length) return "";
      return html`<h2 class="rail-h">From the Pass</h2>
        <div class="receipts">${posts.map(p => html`<a class="receipt" href="${p.url}" target="_blank" rel="noopener">
          <span class="r-top">${icon("x")}@FF_ChefHazy · ${fmtDay(p.postedAt)}</span><span class="r-txt">${tags(p.preview)}</span>
          <span class="r-more">${p.kind === "thread" ? "Read the thread" : "View on X"}${p.count ? " · " + p.count + " posts" : ""}</span></a>`)}</div>`;
    },

    follow(ctx) {
      return html`<a class="follow-tk" href="${ctx.follow}" target="_blank" rel="noopener">
        <span class="fk">Order in</span><span class="fh">Follow @${ctx.handle}</span><span class="fs">Every call as it leaves the kitchen: waivers Tuesday, the Menu Wednesday, pivots Sunday.</span></a>`;
    },

    menu(ctx) {
      const p = ctx.P.menu;
      if (!p) return html`<p class="empty">The Menu opens Wednesday.</p>`;
      const d = p.data || {}, pos = d.positions || {}, keys = Object.keys(pos), off = d.off_menu || {};
      const post = (p.posts || []).find(x => x.url);
      return html`
        <article class="ticket head-tk">
          <div class="band"><span>Order ${p.season}-W${pad2(p.week)}</span><span>${p.format || "PPR"}</span></div>
          <header class="tk-head">
            <p class="k">Rankings · Week ${p.week}</p>
            <h1>The Menu</h1>
            <p class="dek">${p.dek}</p>
            <p class="fired"><span>Fired ${fmtDay(p.publishedAt)}</span>${p.updatedAt !== p.publishedAt ? html`<span>Refired ${fmtDay(p.updatedAt)}</span>` : ""}</p>
          </header>
          ${p.intro_md ? html`<details class="memo"><summary>Chef's memo</summary>${md(p.intro_md)}</details>` : ""}
        </article>
        <div class="toolbar"><div class="tabs" role="tablist" aria-label="Positions">${keys.map(k => html`<button role="tab" data-pos-tab="${k}">${k}</button>`)}</div>
          <button class="find-btn" data-find aria-label="Find a player">${icon("search")}</button></div>
        <div class="finder"><input type="search" placeholder="Find a player" aria-label="Find a player" autocomplete="off"></div>
        <div class="tickets" data-board>${keys.map(k => html`<article class="ticket pos" data-pos="${k}">
          <div class="band"><span>Table ${k}</span><span>${pos[k].length} ranked</span></div>
          ${tiers(pos[k]).map(t => html`<section class="tier"><h2><span>Tier ${t.n} · ${t.label}</span></h2><ol class="items">${t.rows.map(r => B.item(r))}</ol></section>`)}
          ${(off[k] || []).length ? html`<section class="tier off"><h2><span>86'd · Off the menu</span></h2><ol class="items">${off[k].map(r => B.item(r, true))}</ol></section>` : ""}
          <div class="barcode" aria-hidden="true"></div><p class="tk-id">${p.season}W${pad2(p.week)} MENU ${k}</p>
        </article>`)}</div>
        <div class="after">
          <article class="ticket reserved" aria-label="Members block, example">
            <div class="band"><span>Members</span><span>Example</span></div>
            <div class="ghost" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <span class="big-stamp">Reserved</span>
            <p class="rs">Where paid extras would sit: split from the free rankings, locked until a member signs in.</p>
          </article>
          <div class="pf">${post ? html`<a class="tk-btn" href="${post.url}" target="_blank" rel="noopener">${icon("x")}Read the thread</a>` : ""}<button class="tk-btn ghost" data-share>${icon("share")}Share this ticket</button></div>
          ${B.follow(ctx)}
        </div>`;
    },

    item(r, isOff) {
      const a = act(r);
      return html`<li class="it${isOff ? " off" : ""}" data-name="${lc(r.player)}">
        <span class="q">${isOff ? "86" : pad2(r.rank)}</span>
        <span class="n">${r.player}${flag(r)}</span>
        ${B.stamp(a)}
        <span class="m">${[r.team, r.pos, r.opp].filter(Boolean).join(" ")}</span>
        ${r.note ? html`<span class="mod">${r.note}</span>` : ""}
        ${a && a.extra ? html`<span class="mod x ${a.cls}">${a.extra}</span>` : ""}
        ${a && a.watch ? html`<span class="mod w"><mark>Watch: ${a.watch}</mark></span>` : ""}
      </li>`;
    }
  };

  /* =====================================================================
     Direction C: Chef's Menu. A printed menu card, light and editorial.
     ===================================================================== */
  const C = {
    shell(ctx, view, body) {
      const deck = ["home", "menu", "market", "butcher", "heat", "line", "prep", "orderup", "leftovers", "pass"];
      return html`
        <header class="mast">
          <button class="sect" data-sheet="sections" aria-controls="sections">${icon("menu")}<span>Sections</span></button>
          <a class="brand" href="index.html" aria-label="Fantasy Kitchen, this week"><span class="by">Chef Hazy's</span><span class="nm">Fantasy Kitchen</span></a>
          <a class="follow" href="${ctx.follow}" target="_blank" rel="noopener" aria-label="Follow @${ctx.handle} on X">${icon("x")}<span>Follow</span></a>
          <nav class="deck" aria-label="Sections">${deck.map(k => html`<a href="${href(k)}"${todo(k)}${cur(k, view)}>${SERIES[k].name}</a>`)}</nav>
        </header>
        <div class="sections" id="sections" hidden><div class="sections-in">
          <div class="sections-head"><p class="sc">The week at Fantasy Kitchen</p><button data-sheet="sections" aria-label="Close">${icon("close")}</button></div>
          <ol><li><a href="index.html"><span class="nm">This week</span><span class="dots"></span><span class="st">Home</span></a></li>
          ${sectionList(ctx.plan).map(s => html`<li><a href="${href(s.k)}"${todo(s.k)}><span class="nm">${SERIES[s.k].name}</span><span class="dots"></span><span class="st">${s.when}</span></a><p class="desc">${SERIES[s.k].blurb}</p></li>`)}</ol>
        </div></div>
        <main id="main" class="view-${view}">${body}</main>
        <footer class="colophon"><p class="orn" aria-hidden="true">${icon("mark")}</p><p>Fantasy Kitchen · Chef Hazy · ${ctx.site.season} season</p>
          <p><a href="#about" data-todo="about">About the kitchen</a> · <a href="${ctx.x}" target="_blank" rel="noopener">@${ctx.handle} on X</a></p></footer>`;
    },

    price(a) { return a ? html`<span class="price ${a.cls}">${a.label}${a.tag ? " " + a.tag : ""}</span>` : ""; },

    home(ctx) {
      const { P, plan, site, manifest } = ctx, days = [];
      plan.forEach(s => { let d = days.find(x => x.day === s.day); if (!d) days.push(d = { day: s.day, items: [] }); d.items.push(s); });
      return html`<div class="home-grid">
        <section class="week-card">
          <p class="sc">${site.season} season · Week ${manifest.currentWeek}</p>
          <h1>This Week's Menu</h1>
          <p class="dek">${site.tagline}</p>
          <p class="orn" aria-hidden="true">${icon("mark")}</p>
          ${days.map(d => html`<div class="day"><p class="sc day-h">${d.day}</p><ol>${d.items.map(s => html`<li class="course is-${s.state}">
            <a href="${href(s.series)}"${todo(s.series)}><span class="nm">${SERIES[s.series].name}</span><span class="dots" aria-hidden="true"></span>
            <span class="st">${s.state === "served" ? "Served" : s.state === "live" ? html`<i class="dot"></i>Now serving` : s.time}</span></a>
            <p class="desc">${SERIES[s.series].blurb}</p></li>`)}</ol></div>`)}
        </section>
        <div class="home-side">
          ${P.orderup ? C.now(P.orderup) : ""}
          <section class="block"><p class="sc">Straight from the pass</p><h2>The calls</h2>
            <ol class="dishes">${ctx.calls.map(c => html`<li class="dish"><a href="${href(c.series)}"${todo(c.series)}>
              <p class="line"><span class="nm">${c.item.player}</span><span class="tm">${[c.item.team, c.item.pos].filter(Boolean).join(" ")}</span><span class="dots" aria-hidden="true"></span>${C.price(c.a)}</p>
              <p class="desc">${c.item.verdict || c.item.why || c.item.note || ""}</p><p class="src">${SERIES[c.series].name}</p></a></li>`)}</ol></section>
          ${C.notes(P.notes)}
          ${C.pass(ctx.feed)}
          ${C.follow(ctx)}
        </div></div>`;
    },

    now(p) {
      const d = p.data || {}, w = lastWindow(d);
      return html`<section class="block now-card"><p class="sc live"><i class="dot"></i>Now serving</p><h2>Order Up</h2>
        <p class="desc">${w.name}, ${w.time}.</p>
        <ol class="upd">${(d.updates || []).map(u => html`<li><span class="sc">${u.time}</span><p>${raw(inline(u.text))}</p></li>`)}</ol>
        <a class="btn" href="#orderup" data-todo="orderup">See every pivot</a></section>`;
    },

    notes(p) {
      const items = (p && p.data && p.data.items) || [];
      if (!items.length) return "";
      return html`<section class="block"><p class="sc">Kitchen notes</p><h2>What moved</h2>
        <ol class="upd">${items.slice(0, 3).map(it => html`<li><span class="sc">${fmt(it.at)}</span><p>${raw(inline(it.text))}</p>${it.action ? html`<p class="act-line">${C.price(act(it))}</p>` : ""}</li>`)}</ol></section>`;
    },

    pass(feed) {
      const posts = ((feed && feed.posts) || []).slice(0, 2);
      if (!posts.length) return "";
      return html`<section class="block"><p class="sc">From the Pass</p><h2>As posted on X</h2>
        <ol class="upd">${posts.map(p => html`<li><span class="sc">${SERIES[p.series] ? SERIES[p.series].name : "Post"} · ${fmt(p.postedAt)}</span><p>${tags(p.preview)}</p>
          <a class="more" href="${p.url}" target="_blank" rel="noopener">${p.kind === "thread" ? "Read the thread" : "View on X"}</a></li>`)}</ol></section>`;
    },

    follow(ctx) {
      return html`<section class="block follow-card"><p class="sc">Reservations not required</p><h2>Follow the kitchen</h2>
        <p class="desc">Every call as it leaves the pass: waivers Tuesday, the Menu Wednesday, pivots Sunday morning.</p>
        <a class="btn solid" href="${ctx.follow}" target="_blank" rel="noopener">${icon("x")}Follow @${ctx.handle}</a></section>`;
    },

    menu(ctx) {
      const p = ctx.P.menu;
      if (!p) return html`<p class="empty">The Menu opens Wednesday.</p>`;
      const d = p.data || {}, pos = d.positions || {}, keys = Object.keys(pos), off = d.off_menu || {};
      const post = (p.posts || []).find(x => x.url);
      return html`
        <header class="card-head">
          <p class="sc">Week ${p.week} · ${p.format || "PPR"} · Rankings</p>
          <h1>The Menu</h1>
          <p class="dek">${p.dek}</p>
          <p class="orn" aria-hidden="true">${icon("mark")}</p>
          <p class="sc upd-line">Updated ${fmt(p.updatedAt)}</p>
        </header>
        <nav class="courses" role="tablist" aria-label="Positions">${keys.map(k => html`<button role="tab" data-pos-tab="${k}">${k}</button>`)}<button class="find" data-find aria-label="Find a player">${icon("search")}</button></nav>
        <div class="finder"><input type="search" placeholder="Find a player" aria-label="Find a player" autocomplete="off"></div>
        ${p.intro_md ? html`<aside class="chef-note"><p class="sc">A note from the chef</p>${md(p.intro_md)}</aside>` : ""}
        <div class="spread" data-board>${keys.map(k => html`<section class="pos" data-pos="${k}"><h2 class="pos-h">${POS_NAME[k] || k}</h2>
          ${tiers(pos[k]).map(t => html`<div class="tier"><p class="tier-h"><span class="sc">Tier ${t.n}</span><span class="it">${t.label}</span></p>
            <ol class="dishes">${t.rows.map(r => C.dish(r))}</ol></div>`)}
          ${(off[k] || []).length ? html`<div class="tier off"><p class="tier-h"><span class="sc">Ruled out</span><span class="it">Off the menu</span></p><ol class="dishes">${off[k].map(r => C.dish(r, true))}</ol></div>` : ""}
        </section>`)}</div>
        <section class="reserved" aria-label="Members block, example">
          <p class="sc">Members · example, coming later</p>
          <p class="rv">Reserved</p>
          <p class="desc">Where paid extras would sit: set apart from the free menu above, locked until a member signs in.</p>
          <button class="btn" disabled>Get notified</button>
        </section>
        <section class="menu-foot">
          <div class="pf">${post ? html`<a class="btn" href="${post.url}" target="_blank" rel="noopener">${icon("x")}Read the thread</a>` : ""}<button class="btn" data-share>${icon("share")}Share</button></div>
          ${C.follow(ctx)}
        </section>`;
    },

    dish(r, isOff) {
      const a = act(r);
      return html`<li class="dish${isOff ? " off" : ""}" data-name="${lc(r.player)}">
        <p class="line"><span class="no">${isOff ? "" : r.rank}</span><span class="nm">${r.player}</span>${flag(r)}<span class="tm">${[r.team, r.opp].filter(Boolean).join(" ")}</span><span class="dots" aria-hidden="true"></span>${C.price(a)}</p>
        ${r.note ? html`<p class="desc">${r.note}</p>` : ""}
        ${a && a.extra ? html`<p class="more ${a.cls}">${a.extra}</p>` : ""}
        ${a && a.watch ? html`<p class="more watch">Watch ${a.watch}</p>` : ""}
      </li>`;
    }
  };

  /* =====================================================================
     Direction D: Stations. The Night Service frame (header, tabs, fonts, call colours)
     on every page; each content area gets its own plate. The Menu is a printed menu
     card, the pieces you act on are order tickets, the rest stays in the dark kitchen.
     ===================================================================== */
  const PLATE = { home: "kitchen", menu: "menu", market: "ticket", butcher: "ticket", line: "ticket", prep: "ticket", orderup: "ticket",
    heat: "kitchen", leftovers: "kitchen", notes: "kitchen", pass: "kitchen", about: "kitchen" };
  const Dd = {
    shell(ctx, view, body) { return A.shell(ctx, view, body, PLATE[view] || "kitchen"); },

    home(ctx) { return A.home(ctx, { live: Dd.liveTicket, served: Dd.served }); },

    /* "Served this week" shows each piece as the object it is: a menu card, a ticket, or a kitchen card */
    served(s, p) {
      const plate = PLATE[s.series];
      if (plate === "menu") {
        const pos = (p.data && p.data.positions) || {};
        return html`<li class="mini-menu"><a href="${href(s.series)}"${todo(s.series)}>
          <span class="sc">${s.day} · ${SERIES[s.series].plain}</span><span class="mm-t">${SERIES[s.series].name}</span><span class="mm-d">${p.dek}</span>
          <span class="mm-list">${Object.keys(pos).map(k => pos[k][0] ? html`<span class="mm-row"><b>${k}</b><span class="nm">${pos[k][0].player}</span><i class="dots"></i><span class="tm">${pos[k][0].team}</span></span>` : "")}</span></a></li>`;
      }
      if (plate === "ticket") {
        return html`<li class="mini-tk"><a href="${href(s.series)}"${todo(s.series)}>
          <span class="tk-band"><span>${s.day.slice(0, 3)} · ${SERIES[s.series].plain}</span><span>${fmtDay(p.updatedAt)}</span></span>
          <span class="mt-t">${SERIES[s.series].name}</span><span class="mt-d">${p.dek}</span>
          <span class="mt-items">${preview(s.series, p).slice(0, 3).map(it => html`<span class="mt-it"><span class="n">${it.player}</span>${Dd.stamp(act(it), true)}</span>`)}</span></a></li>`;
      }
      return A.served(s, p);
    },

    stamp(a, sm) { return a ? html`<span class="stamp ${a.cls}${sm ? " sm" : ""}">${a.label}${a.tag ? " " + a.tag : ""}</span>` : ""; },

    /* a menu line: name, dotted leader, the call; the matchup opens the description so long names never wrap */
    dish(r, isOff) {
      const a = act(r), m = [r.team, r.opp].filter(Boolean).join(" ");
      return html`<li class="dish${isOff ? " off" : ""}" data-name="${lc(r.player)}">
        <p class="line"><span class="no">${isOff ? "" : r.rank}</span><span class="nm">${r.player}</span>${flag(r)}<span class="dots" aria-hidden="true"></span>${C.price(a)}</p>
        <p class="desc">${m ? html`<span class="tm">${m}</span>` : ""}${r.note || ""}</p>
        ${a && a.extra ? html`<p class="more ${a.cls}">${a.extra}</p>` : ""}
        ${a && a.watch ? html`<p class="more watch">Watch ${a.watch}</p>` : ""}
      </li>`;
    },

    /* a ticket: black band on top, zigzag tear at the bottom, optional barcode */
    tk(band, body, o) {
      o = o || {};
      return html`<article class="tk${o.cls ? " " + o.cls : ""}"><div class="tk-band${o.red ? " red" : ""}"><span>${band[0]}</span><span>${band[1] || ""}</span></div>${body}${o.code ? html`<div class="barcode" aria-hidden="true"></div><p class="tk-id">${o.code}</p>` : ""}</article>`;
    },

    /* the line: this week's ticket stations, the current one pulled forward */
    rail(ctx, view) {
      return html`<nav class="rail" aria-label="The line: this week's tickets"><div class="rod" aria-hidden="true"></div>
        <ol>${ctx.plan.filter(s => PLATE[s.series] === "ticket").map(s => html`<li class="stub is-${s.state}${s.series === view ? " here" : ""}"><a href="${href(s.series)}"${todo(s.series)}>
          <span class="d">${s.day.slice(0, 3)}</span><span class="s">${SERIES[s.series].name}</span>
          <span class="t">${s.state === "served" ? "Served" : s.state === "live" ? "Live" : s.state === "next" ? "Next " + s.time : s.time}</span></a></li>`)}</ol></nav>`;
    },

    head(p, o) {
      return Dd.tk([o.band, p.format || "PPR"], html`<header class="tk-head"><p class="k">${o.kicker}</p><h1>${o.title}</h1><p class="dek">${p.dek}</p>
        <p class="fired"><span>Fired ${fmtDay(p.publishedAt)}</span>${p.updatedAt !== p.publishedAt ? html`<span>Refired ${fmtDay(p.updatedAt)}</span>` : ""}</p></header>
        ${p.intro_md ? html`<details class="memo"><summary>Chef's memo</summary>${md(p.intro_md)}</details>` : ""}`, { cls: "head-tk", red: o.red });
    },

    item(r, o) {
      o = o || {};
      const a = act(r);
      return html`<li class="it${o.off ? " off" : ""}" data-name="${lc(r.player)}">
        <span class="q">${o.num != null ? pad2(o.num) : ""}</span>
        <span class="n">${r.player}${flag(r)}</span>
        ${Dd.stamp(a)}
        <span class="m">${[r.team, r.pos, r.opp].filter(Boolean).join(" ")}${o.sub ? " · " + o.sub : ""}</span>
        ${r.why || r.note ? html`<span class="mod">${r.why || r.note}</span>` : ""}
        ${r.verdict ? html`<span class="mod v">${r.verdict}</span>` : ""}
        ${a && a.extra && !o.noExtra ? html`<span class="mod x ${a.cls}">${a.extra}</span>` : ""}
        ${a && a.watch ? html`<span class="mod w"><mark>Watch: ${a.watch}</mark></span>` : ""}
      </li>`;
    },

    reserved(kind) {
      if (kind === "menu") return html`<section class="tent" aria-label="Members block, example"><p class="sc">Members · example, coming later</p><p class="rv">Reserved</p>
        <p class="desc">Where paid extras would sit: set apart from the free menu, locked until a member signs in.</p><button class="tent-btn" disabled>Get notified</button></section>`;
      return Dd.tk(["Members", "Example"], html`<div class="ghost" aria-hidden="true"><i></i><i></i><i></i></div><span class="big-stamp">Reserved</span>
        <p class="rs">Where paid extras would sit: split from the free tickets, locked until a member signs in.</p>`, { cls: "reserved-tk" });
    },

    after(ctx, p) {
      const post = (p.posts || []).find(x => x.url);
      return html`<section class="pf">
        <div class="pf-row">${post ? html`<a class="btn" href="${post.url}" target="_blank" rel="noopener">${icon("x")}Read the thread</a>` : ""}<button class="btn" data-share>${icon("share")}Share</button></div>
        ${A.followCard(ctx)}</section>`;
    },

    liveTicket(p) {
      const d = p.data || {}, w = lastWindow(d);
      return html`<div class="home-live">${Dd.tk([html`<i class="dot"></i>Order Up · Live`, "Week " + p.week], html`
        <header class="tk-head"><p class="k">${w.time}</p><h2 class="h">${w.name}</h2></header>
        <ol class="upd">${(d.updates || []).slice(0, 3).map(u => html`<li><time>${u.time}</time><p>${raw(inline(u.text))}</p></li>`)}</ol>
        ${(w.pivots || []).slice(0, 1).map(pv => html`<div class="swap"><span class="o">${pv.out}</span>${Dd.stamp({ cls: "pivot", label: "Pivot to", tag: "" })}<span class="i">${pv.in}</span></div>`)}
        <a class="tk-btn" href="${href("orderup")}"${todo("orderup")}>Open the ticket</a>`, { red: true, cls: "live-tk" })}</div>`;
    },

    menu(ctx) {
      const p = ctx.P.menu;
      if (!p) return html`<p class="empty">The Menu opens Wednesday.</p>`;
      const d = p.data || {}, pos = d.positions || {}, keys = Object.keys(pos), off = d.off_menu || {};
      return html`<div class="cols"><div class="main-col">
        <article class="menu-card">
          <header class="mc-head">
            <p class="sc">Week ${p.week} · ${p.format || "PPR"} · Rankings</p>
            <h1>The Menu</h1>
            <p class="dek">${p.dek}</p>
            <p class="orn" aria-hidden="true">${icon("mark")}</p>
            <div class="mc-meta"><p class="sc">Updated ${fmt(p.updatedAt)}</p><button class="mc-week" aria-label="Choose a week">Week ${p.week}${icon("chev")}</button></div>
          </header>
          <nav class="courses" role="tablist" aria-label="Positions">${keys.map(k => html`<button role="tab" data-pos-tab="${k}">${k}</button>`)}<button class="find" data-find aria-label="Find a player">${icon("search")}</button></nav>
          <div class="finder"><input type="search" placeholder="Find a player" aria-label="Find a player" autocomplete="off"></div>
          ${p.intro_md ? html`<details class="chef-note"><summary class="sc">A note from the chef</summary>${md(p.intro_md)}</details>` : ""}
          <div class="spread" data-board>${keys.map(k => html`<section class="pos" data-pos="${k}"><h2 class="pos-h">${POS_NAME[k] || k}</h2>
            ${tiers(pos[k]).map(t => html`<div class="tier"><p class="tier-h"><span class="sc">Tier ${t.n}</span><span class="it">${t.label}</span></p>
              <ol class="dishes">${t.rows.map(r => Dd.dish(r))}</ol></div>`)}
            ${(off[k] || []).length ? html`<div class="tier off"><p class="tier-h"><span class="sc">Ruled out</span><span class="it">Off the menu</span></p><ol class="dishes">${off[k].map(r => Dd.dish(r, true))}</ol></div>` : ""}
          </section>`)}</div>
        </article></div>
        <aside class="side-col">${Dd.reserved("menu")}${Dd.after(ctx, p)}</aside></div>`;
    },

    market(ctx) {
      const p = ctx.P.market;
      if (!p) return html`<p class="empty">Market Run opens Tuesday morning.</p>`;
      const d = p.data || {}, code = p.season + "W" + pad2(p.week);
      return html`<div class="cols"><div class="main-col">${Dd.rail(ctx, "market")}
        <div class="tk-grid">
          ${Dd.head(p, { band: "Order " + p.season + "-W" + pad2(p.week) + " · Waivers", kicker: "Waivers · Week " + p.week, title: "Market Run" })}
          ${(d.adds || []).length ? Dd.tk(["Priority adds", d.adds.length + " on the list"], html`<ol class="items">${d.adds.map(a => Dd.item(a, { num: a.priority, sub: a.rostered ? "Rostered " + a.rostered : "" }))}</ol>`, { code: code + " ADDS" }) : ""}
          <div class="tk-col">
            ${(d.stashes || []).length ? Dd.tk(["Stashes", "deep bench"], html`<ol class="items">${d.stashes.map((a, i) => Dd.item(a, { num: i + 1 }))}</ol>`, { code: code + " STASH" }) : ""}
            ${(d.drops || []).length ? Dd.tk(["Cut bait", "drops"], html`<ol class="items">${d.drops.map((a, i) => Dd.item(a, { num: i + 1, off: true }))}</ol>`, { red: true, code: code + " DROPS" }) : ""}
            ${(d.mnf || []).length ? Dd.tk(["Monday night", "what changed"], html`<div class="tk-body">${d.mnf.map(m => html`<p>${raw(inline(m.text || m))}</p>`)}</div>`) : ""}
          </div>
        </div></div>
        <aside class="side-col">${Dd.reserved("ticket")}${Dd.after(ctx, p)}</aside></div>`;
    },

    orderup(ctx) {
      const p = ctx.P.orderup;
      if (!p) return html`<p class="empty">Order Up runs Sunday as the inactives drop.</p>`;
      const d = p.data || {}, live = ctx.plan.some(s => s.series === "orderup" && s.state === "live");
      return html`<div class="cols"><div class="main-col">${Dd.rail(ctx, "orderup")}
        <div class="tk-grid">
          ${Dd.head(p, { band: live ? html`<i class="dot"></i>Order Up · Live` : "Order Up", kicker: "Sunday inactives · Week " + p.week, title: "Order Up", red: live })}
          ${(d.updates || []).length ? Dd.tk(["Updates", "newest first"], html`<ol class="upd">${d.updates.map(u => html`<li><time>${u.time}</time><p>${raw(inline(u.text))}</p></li>`)}</ol>`) : ""}
          <div class="tk-col">${(d.windows || []).map(w => { const [kick, ...rest] = String(w.time || "").split(" · "), sub = rest.join(" · "); return Dd.tk([w.name, kick], html`
            ${sub ? html`<p class="tk-sub">${sub.charAt(0).toUpperCase() + sub.slice(1)}</p>` : ""}
            ${(w.inactives || []).length ? html`<ol class="items">${w.inactives.map(r => Dd.item(r, { num: 86, off: true, noExtra: (w.pivots || []).some(pv => pv.out === r.player) }))}</ol>`
              : html`<p class="tk-empty">Nothing on this ticket yet. It prints when the inactives drop.</p>`}
            ${(w.pivots || []).map(pv => html`<div class="swap"><span class="o">${pv.out}</span>${Dd.stamp({ cls: "pivot", label: "Pivot to", tag: "" })}<span class="i">${pv.in}</span>${pv.note ? html`<span class="sn">${pv.note}</span>` : ""}</div>`)}`,
            { code: p.season + "W" + pad2(p.week) + " " + w.name.toUpperCase() }); })}</div>
        </div></div>
        <aside class="side-col">${Dd.after(ctx, p)}</aside></div>`;
    }
  };

  /* ---------- mockup chrome ---------- */
  const NAMES = { a: "A · Night Service", b: "B · The Ticket", c: "C · Chef's Menu", d: "D · Stations" };
  const pageName = k => k === "home" ? "This week" : SERIES[k].name;
  const builtList = () => { const n = Object.keys(BUILT).map(pageName); return n.length > 2 ? n.slice(0, -1).join(", ") + " and " + n[n.length - 1] : n.join(" and "); };
  function mockChrome() {
    const s = document.createElement("style");
    s.textContent = ".mockbar{position:relative;z-index:100;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;padding:7px 12px;background:#ffe24d;color:#111;font:600 12px/1.3 system-ui,sans-serif}" +
      ".mockbar a{color:#111;text-decoration:underline}" +
      ".mock-toast{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:200;width:max-content;max-width:calc(100% - 32px);padding:10px 14px;border-radius:10px;background:#111;color:#fff;font:500 14px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4)}";
    document.head.append(s);
    if (SHOT) return "";
    const others = Object.keys(BUILT).filter(k => k !== VIEW);
    return html`<div class="mockbar"><span>Mockup ${NAMES[DIR]}, sample data</span>${others.map(k => html`<a href="${href(k)}">${pageName(k)}</a>`)}<a href="../">All directions</a></div>`;
  }
  let toastTimer = 0;
  function toast(msg) {
    let t = document.querySelector(".mock-toast");
    if (!t) { t = document.createElement("div"); t.className = "mock-toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function wire() {
    const $$ = s => Array.from(document.querySelectorAll(s));
    const tabs = $$("[data-pos-tab]"), blocks = $$("[data-board] .pos");
    if (tabs.length) {
      const wide = window.matchMedia("(min-width: 1000px)");
      const show = (k, jump) => {
        tabs.forEach(t => t.setAttribute("aria-selected", String(t.dataset.posTab === k)));
        blocks.forEach(b => b.classList.toggle("on", b.dataset.pos === k));
        if (jump && wide.matches && DIR !== "a") { const b = blocks.find(x => x.dataset.pos === k); if (b) b.scrollIntoView({ behavior: "smooth", block: "start" }); }
        try { history.replaceState(null, "", location.pathname + location.search + "#" + k); } catch (e) { /* file:// */ }
      };
      tabs.forEach(t => t.addEventListener("click", () => show(t.dataset.posTab, true)));
      const want = location.hash.slice(1).toUpperCase();
      show(tabs.some(t => t.dataset.posTab === want) ? want : tabs[0].dataset.posTab, false);
    }
    const finder = document.querySelector(".finder"), board = document.querySelector("[data-board]");
    $$("[data-find]").forEach(b => b.addEventListener("click", () => {
      finder.classList.toggle("open");
      if (finder.classList.contains("open")) finder.querySelector("input").focus();
    }));
    if (finder && board) finder.querySelector("input").addEventListener("input", e => {
      const q = e.target.value.trim().toLowerCase();
      board.classList.toggle("searching", !!q);
      board.querySelectorAll("[data-name]").forEach(li => { li.hidden = !!q && !li.dataset.name.includes(q); });
      board.querySelectorAll(".tier").forEach(t => { t.hidden = !!q && !t.querySelector("[data-name]:not([hidden])"); });
      board.querySelectorAll(".pos").forEach(b => b.classList.toggle("hit", !!q && !!b.querySelector("[data-name]:not([hidden])")));
    });
    $$("[data-sheet]").forEach(b => b.addEventListener("click", e => {
      e.preventDefault();
      const s = document.getElementById(b.dataset.sheet);
      s.hidden = !s.hidden;
      document.documentElement.classList.toggle("sheet-open", !s.hidden);
    }));
    document.addEventListener("click", e => {
      const a = e.target.closest("[data-todo]");
      if (!a) return;
      e.preventDefault();
      toast("Mockup: only " + builtList() + " are built in this direction.");
    });
    $$("[data-share]").forEach(b => b.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: document.title, url: location.href });
        else { await navigator.clipboard.writeText(location.href); toast("Link copied."); }
      } catch (e) { /* share sheet dismissed */ }
    }));
    const here = document.querySelector(".rail .here") || document.querySelector(".rail .is-live");
    if (here) { const ol = here.parentElement; ol.scrollLeft = Math.max(0, here.offsetLeft - (ol.clientWidth - here.clientWidth) / 2); }
  }

  async function boot() {
    const get = p => fetch(DATA + p).then(r => r.ok ? r.json() : null).catch(() => null);
    const [site, manifest, feed] = await Promise.all([get("site.json"), get("index.json"), get("posts.json")]);
    const P = {};
    await Promise.all(((manifest && manifest.pieces) || []).filter(p => p.week === manifest.currentWeek)
      .map(async p => { P[p.series] = await get(p.path); }));
    const handle = String((site && site.handle) || "FF_ChefHazy").replace(/^@/, "");
    const ctx = { site: site || {}, manifest: manifest || { pieces: [] }, feed, P, handle,
      x: "https://x.com/" + handle, follow: "https://x.com/intent/follow?screen_name=" + encodeURIComponent(handle) };
    ctx.plan = weekPlan(ctx.site, P);
    ctx.calls = headlineCalls(P);
    const T = { a: A, b: B, c: C, d: Dd }[DIR] || A;
    const view = T[VIEW] ? VIEW : "home";
    document.getElementById("app").innerHTML = out(mockChrome()) + out(T.shell(ctx, view, T[view](ctx)));
    document.title = pageName(view) + " · Fantasy Kitchen · Direction " + DIR.toUpperCase();
    wire();
    document.documentElement.classList.add("ready");
  }
  boot();
})();
