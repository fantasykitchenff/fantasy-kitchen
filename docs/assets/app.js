/* Fantasy Kitchen: site renderer. No build step, no dependencies.
   Every page is a thin shell, <div id="app" data-view="menu"></div>, and everything on it comes from
   docs/data/*.json, written by the kitchen pipeline (KITCHEN.md). Add ?sample=1 to render docs/data/sample/.

   Game day in the kitchen. The frame is the field (turf, chalk lines, the end zone header, the leather tab bar)
   and it is the same on every page. Each content area keeps its own object on the field:
     board    The Menu, as the kitchen's menu board in a wood frame
     ticket   the pieces you act on (Market Run, Butcher Shop, Serve or Sit, Prep Notes, Order Up), as order tickets
     field    home and the pieces you read (Heat Check, Leftovers, From the Pass, About), as broadcast graphics on the turf
   Every page with players on it filters by position (All, QB, RB, WR, TE); the choice is kept in the URL hash. */
(function () {
  "use strict";

  const SERIES = {
    home:      { name: "This week",     plain: "The week",           page: "index.html",     plate: "field" },
    menu:      { name: "The Menu",      plain: "Rankings",           page: "menu.html",      plate: "board",  blurb: "Rankings by position for the week, with tiers." },
    market:    { name: "Market Run",    plain: "Waivers",            page: "market.html",    plate: "ticket", blurb: "Waiver adds with FAAB, stashes and drops." },
    butcher:   { name: "Butcher Shop",  plain: "Trades",             page: "butcher.html",   plate: "ticket", blurb: "Who to trade for and who to trade away, with a price on each." },
    heat:      { name: "Heat Check",    plain: "Risers and fallers", page: "heat.html",      plate: "field",  blurb: "Risers and fallers, with the number behind each one." },
    line:      { name: "Serve or Sit",  plain: "Lineup calls",       page: "line.html",      plate: "ticket", blurb: "Who the week favors, who it does not, and the coin flips." },
    prep:      { name: "Prep Notes",    plain: "Injury report",      page: "prep.html",      plate: "ticket", blurb: "The injury report, read for lineups." },
    orderup:   { name: "Order Up",      plain: "Sunday inactives",   page: "orderup.html",   plate: "ticket", blurb: "Sunday inactives and the pivot for each." },
    leftovers: { name: "Leftovers",     plain: "Monday recap",       page: "leftovers.html", plate: "field",  blurb: "Monday takeaways, usage and overreactions." },
    notes:     { name: "Kitchen notes", plain: "News",               page: "pass.html",      plate: "field",  blurb: "What moved today." },
    pass:      { name: "From the Pass", plain: "Every post",         page: "pass.html",      plate: "field",  blurb: "Everything the kitchen posted." },
    about:     { name: "About",         plain: "The kitchen",        page: "about.html",     plate: "field",  blurb: "How the kitchen runs." }
  };
  const DECK = ["home", "menu", "market", "butcher", "heat", "line", "prep", "orderup", "leftovers", "pass"];
  const TABS = [["home", "This week", "board"], ["menu", "Rankings", "list"], ["market", "Waivers", "basket"], ["line", "Serve or Sit", "cloche"]];
  const POS_ORDER = ["QB", "RB", "WR", "TE", "FLEX"];
  const FILTERS = ["QB", "RB", "WR", "TE"];
  const POS_NAME = { QB: "Quarterbacks", RB: "Running backs", WR: "Wide receivers", TE: "Tight ends", FLEX: "Flex" };
  const TIER_LABEL = { 1: "Chef's table", 2: "Entrees", 3: "Sides", 4: "Snacks", 5: "Pantry", 6: "Scraps" };
  const YARDS = [10, 20, 30, 40, 50, 40, 30, 20, 10];

  const params = new URLSearchParams(location.search);
  const SAMPLE = params.get("sample") === "1";
  const DATA_ROOT = SAMPLE ? "data/sample/" : "data/";
  /* The sample week is frozen at Sunday of Week 4, 11:50 AM ET, so the preview shows a full week with Order Up live;
     ?now=ISO moves the clock for testing. */
  const NOW = (() => {
    const d = params.get("now") ? new Date(params.get("now")) : SAMPLE ? new Date("2026-10-04T15:50:00Z") : new Date();
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
  const safeUrl = u => /^https?:\/\//i.test(String(u || "")) ? String(u) : "";
  const plural = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));

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
  /* The kitchen logs each later change as an "Updated <day> <time> ET: ..." paragraph at the top of intro_md.
     Those go under "What changed"; the rest is the chef's intro. */
  function splitIntro(src) {
    const changes = [], rest = [];
    String(src || "").replace(/\r/g, "").split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).forEach(p => {
      const m = /^Updated\s+([^:\n]{1,40}?)\s*:\s+([\s\S]+)$/.exec(p);
      if (m) changes.push({ when: m[1], text: m[2] });
      else if (/^Updated\b/.test(p)) changes.push({ when: "", text: p });
      else rest.push(p);
    });
    return { intro: rest, changes };
  }

  /* ---------- time, all Eastern ---------- */
  const dtf = o => new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: ET }, o));
  const valid = iso => iso && !isNaN(new Date(iso));
  const fmt = iso => valid(iso) ? dtf({ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) + " ET" : "";
  const fmtDay = iso => valid(iso) ? dtf({ weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) + " ET" : "";
  const isRecent = iso => { const age = valid(iso) ? NOW - new Date(iso) : -1; return age >= 0 && age < 48 * 36e5; };
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

  /* ---------- who plays where: positions for the filters, Menu ranks for lineup calls ---------- */
  const nameKey = s => lc(s).replace(/[^a-z\s]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "").replace(/\s+/g, " ").trim();
  const normPos = p => {
    const s = String(p || "").toUpperCase().replace(/[^A-Z]/g, "");
    return s === "DEF" || s === "D" ? "DST" : s === "PK" ? "K" : s === "FB" ? "RB" : s;
  };
  /* positions from every piece given, ranks only from this week's Menu */
  function makeIndex(pieces, rankMenu) {
    const pos = new Map(), rank = new Map();
    const put = (name, p) => { const k = nameKey(name), q = normPos(p); if (k && q && q !== "FLEX" && !pos.has(k)) pos.set(k, q); };
    const walk = o => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") { if (o.player && o.pos) put(o.player, o.pos); Object.values(o).forEach(walk); }
    };
    pieces.filter(Boolean).forEach(pc => {
      const d = pc.data || {};
      Object.entries(d.positions || {}).forEach(([k, rows]) => (rows || []).forEach(r => put(r.player, r.pos || k)));
      walk(d);
    });
    if (rankMenu) Object.entries((rankMenu.data || {}).positions || {}).forEach(([k, rows]) => {
      if (k !== "FLEX") (rows || []).forEach(r => { if (r.rank != null && !rank.has(nameKey(r.player))) rank.set(nameKey(r.player), { pos: k, rank: r.rank }); });
    });
    return { pos, rank };
  }
  const posOf = (ctx, r) => normPos(r && r.pos) || (ctx.idx && ctx.idx.pos.get(nameKey(r && r.player))) || "";
  const rankOf = (ctx, name) => ctx.idx ? ctx.idx.rank.get(nameKey(name)) : null;
  /* data-p on every player element, counted for the position bar; an element naming several players carries each position */
  function pAttr(ctx, players, name) {
    const ps = Array.from(new Set(players.map(x => typeof x === "string" ? posOf(ctx, { player: x }) : posOf(ctx, x)).filter(Boolean)));
    const t = ctx.tally;
    t.n++;
    ps.forEach(p => { t.by[p] = (t.by[p] || 0) + 1; });
    return raw(` data-p="${esc(ps.join(" ") || "NA")}"${name ? ` data-name="${esc(lc(name))}"` : ""}`);
  }
  /* call this after the items are rendered, so the counts are in */
  function posBar(ctx, noun) {
    const t = ctx.tally;
    if (!t.n) return "";
    const keys = FILTERS.concat(Object.keys(t.by).filter(k => !FILTERS.includes(k)).sort());
    return html`<div class="posbar" data-posbar role="toolbar" aria-label="Show players by position">
      <button type="button" data-posf="ALL" aria-pressed="true">All<i>${t.n}</i></button>
      ${keys.map(k => html`<button type="button" data-posf="${k}" aria-pressed="false"${t.by[k] ? "" : raw(" disabled")}>${k}<i>${t.by[k] || 0}</i></button>`)}
    </div><p class="pos-empty" hidden>No ${noun || "players"} at that position on this page.</p>`;
  }

  /* ---------- the action rule: every player item carries one call ---------- */
  const ACTIONS = {
    START: ["Start", "go"], FLEX: ["Flex", "go"], STREAM: ["Stream", "go"],
    CLAIM: ["Claim", "buy"], ADD: ["Add", "buy"], STASH: ["Stash", "buy"], TRADE_FOR: ["Trade for", "buy"],
    HOLD: ["Hold", "hold"], SIT: ["Sit", "stop"], DROP: ["Drop", "stop"], TRADE_AWAY: ["Trade away", "stop"],
    MONITOR: ["Monitor", "watch"], PIVOT: ["Pivot", "pivot"]
  };
  const LINEUP = { START: 1, FLEX: 1, SIT: 1, STREAM: 1 };
  function act(item) {
    if (!item || !item.action) return null;
    const key = String(item.action).toUpperCase().replace(/\s+/g, "_");
    const [label, cls] = ACTIONS[key] || [cap(lc(item.action)), "hold"];
    return {
      key, label, cls, lineup: !!LINEUP[key],
      faab: /^(CLAIM|ADD|STASH|STREAM)$/.test(key) ? String(item.faab || "") : "",
      price: key === "TRADE_FOR" || key === "TRADE_AWAY" ? String(item.price || "") : "",
      priceLabel: key === "TRADE_FOR" ? "Offer" : "Ask",
      watch: String(item.watch || ""),
      to: key === "PIVOT" ? String(item.to || "") : ""
    };
  }
  /* A lineup call (START, FLEX, SIT, STREAM) never gets a Start, Sit or slot label: where the verdict is on the page
     it says the rank and the tier, so the call carries no stamp. Where only the name shows (home, previews), the stamp
     is the player's rank on this week's Menu, labelled as such. Every other call keeps its word. */
  function stamp(ctx, a, item, o) {
    o = o || {};
    if (!a) return "";
    if (a.lineup) {
      const r = o.rank ? rankOf(ctx, item.player) : null;
      return r ? html`<span class="rkb ${a.cls}" title="${r.pos}${r.rank} on this week's Menu"><em>Menu</em><small>${r.pos}</small><b>${r.rank}</b></span>` : "";
    }
    return html`<span class="stamp ${a.cls}">${a.label}</span>`;
  }
  /* the short form of a call, for chips */
  function callText(ctx, a, item) {
    if (!a) return "";
    if (a.lineup) { const r = rankOf(ctx, item.player); return r ? r.pos + r.rank + " on the Menu" : ({ START: "Lineup call", FLEX: "Flex play" })[a.key] || a.label; }
    if (a.faab) return a.label + ", FAAB " + a.faab;
    if (a.to) return "Pivot to " + a.to;
    if (a.key === "MONITOR" && a.watch) return "Monitor: " + a.watch;
    return a.label;
  }
  function facts(a, o) {
    o = o || {};
    if (!a) return "";
    const f = [];
    if (a.faab) f.push(html`<span class="faab"><b>FAAB</b>${a.faab}</span>`);
    if (a.price) f.push(html`<span class="fact ${a.cls}"><b>${a.priceLabel}</b>${a.price}</span>`);
    if (a.to && !o.noTo) f.push(html`<span class="fact pivot"><b>Pivot to</b>${a.to}</span>`);
    if (a.watch) f.push(html`<span class="fact watch"><b>${a.key === "START" ? "Have a backup ready" : "Watch"}</b>${a.watch}</span>`);
    return f.length ? html`<p class="facts">${f}</p>` : "";
  }
  function flag(r) {
    const f = String(r.flag || "").toUpperCase();
    if (!f || f === "O" || f === "OUT" || f === "IR") return "";
    return html`<span class="flag ${lc(f)}" title="${f === "Q" ? "Questionable" : f === "D" ? "Doubtful" : f}">${icon("flag")}<b>${f}</b></span>`;
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
    ball: '<svg viewBox="0 0 44 30" aria-hidden="true"><g transform="rotate(-18 22 15)"><path d="M3 15C9 3 35 3 41 15C35 27 9 27 3 15Z" fill="#7a3f1d" stroke="#2b1407" stroke-width="2"/><path d="M9.5 8.6c1.7 3.8 1.7 9 0 12.8M34.5 8.6c-1.7 3.8-1.7 9 0 12.8" stroke="#fbf6ea" stroke-width="2" fill="none"/><path d="M15 15h14M17 12.4v5.2M20 12.4v5.2M23 12.4v5.2M26 12.4v5.2" stroke="#fbf6ea" stroke-width="1.8" fill="none"/></g></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9L1 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z"/></svg>',
    chev: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="m6 9 6 6 6-6"/></svg>`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${S} cx="11" cy="11" r="7"/><path ${S} d="m20 20-3.6-3.6"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect ${S} x="5" y="11" width="14" height="10" rx="1"/><path ${S} d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
    share: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>`,
    board: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect ${S} x="2.5" y="4" width="19" height="12.5" rx="1"/><path ${S} d="M9 20.5h6M12 16.5v4M6.5 8v5M10 8h3v5h-3zM16.5 8v5"/></svg>`,
    list: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>`,
    basket: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M3 9h18l-2 11H5L3 9zM8 9l4-6 4 6M9 13v4M15 13v4"/></svg>`,
    cloche: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M4 17a8 8 0 0 1 16 0M2.5 17h19M12 9V7.2M10.2 7h3.6M5 20.5h14"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect ${S} x="4" y="4" width="6.5" height="6.5"/><rect ${S} x="13.5" y="4" width="6.5" height="6.5"/><rect ${S} x="4" y="13.5" width="6.5" height="6.5"/><rect ${S} x="13.5" y="13.5" width="6.5" height="6.5"/></svg>`,
    close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${S} d="M6 6l12 12M18 6 6 18"/></svg>`,
    flag: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 2.6c3-1.5 5.2 1.5 9.6 0v6.9c-4.4 1.5-6.6-1.5-9.6 0z" fill="currentColor"/><path d="M3.2 2v12.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
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
      brand: site.brand || "Fantasy Kitchen", author: site.author || "Chef Hazy", scoring: site.scoring || "PPR",
      x: "https://x.com/" + handle, follow: "https://x.com/intent/follow?screen_name=" + encodeURIComponent(handle),
      entry: (series, week) => pieces.filter(p => p.series === series && p.week === week).sort(byNewest)[0] || null,
      latest: series => pieces.filter(p => p.series === series).sort((a, b) => (b.week - a.week) || byNewest(a, b))[0] || null,
      weeksOf: series => Array.from(new Set(pieces.filter(p => p.series === series).map(p => p.week))).sort((a, b) => b - a),
      tally: { n: 0, by: {} }, idx: null
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
    : s.state === "none" ? "Not served" : s.state === "next" ? (short ? "Next" : "Next, " + s.time) : s.time;
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
        <a class="brand" href="${link("home")}" aria-label="${ctx.brand}, this week"><span class="ball">${icon("ball")}</span><span class="wm">${ctx.brand}</span></a>
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
    return html`<div class="follow-card"><span class="ball">${icon("ball")}</span>
      <p><b>Every call, as it drops.</b> Waivers Tuesday, the Menu Wednesday, lineup calls Thursday, pivots Sunday morning.</p>
      <a class="btn gold" href="${ctx.follow}" target="_blank" rel="noopener">${icon("x")}Follow @${ctx.handle}</a></div>`;
  }
  /* the end of every piece: the thread on X, share, follow */
  function after(ctx, p) {
    const post = (p.posts || []).find(x => safeUrl(x.url));
    return html`<section class="after">
      <div class="after-row">${post ? html`<a class="btn" href="${post.url}" target="_blank" rel="noopener">${icon("x")}${post.kind === "post" ? "See the post" : "Read the thread"}</a>` : ""}
        <button type="button" class="btn" data-share="${ctx.title || p.title || ""}">${icon("share")}Share</button></div>
      ${followCard(ctx)}</section>`;
  }
  function membersSlot(what) {
    if (!MEMBERS.launched && !SAMPLE) return "";
    return html`<section class="reserved" aria-label="Members section, preview">
      <p class="lock-line">${icon("lock")}<span>Members</span><em>coming later</em></p><h3>Reserved</h3>
      <p>Where paid extras would sit: set apart from the free ${what}, locked until a member signs in.</p>
      <button type="button" class="btn" disabled>Get notified</button></section>`;
  }
  function weekPick(ctx, series, week) {
    const weeks = ctx.weeksOf(series);
    if (weeks.length < 2) return html`<span class="week-pick single">Week ${week}</span>`;
    return html`<label class="week-pick"><span class="sr">Choose a week</span><select data-week>${weeks.map(w =>
      html`<option value="${w}"${w === week ? raw(" selected") : ""}>Week ${w}</option>`)}</select>${icon("chev")}</label>`;
  }
  /* Published and Updated, with the week picker beside them */
  function metaLine(ctx, series, p) {
    const pub = p.publishedAt, upd = p.updatedAt && p.updatedAt !== p.publishedAt ? p.updatedAt : null;
    return html`<div class="meta-row"><p class="meta">${valid(pub) ? html`<span>Published ${fmt(pub)}</span>` : ""}${upd && valid(upd) ? html`<span>Updated ${fmt(upd)}${isRecent(upd) ? " · " + ago(upd) : ""}</span>` : ""}</p>
      ${p.week ? weekPick(ctx, series, p.week) : ""}</div>`;
  }
  function introBlock(paras) {
    if (!paras.length) return "";
    return html`<div class="intro prose">${md(paras[0])}${paras.length > 1 ? html`<details class="read-on"><summary>Keep reading</summary>${md(paras.slice(1).join("\n\n"))}</details>` : ""}</div>`;
  }
  function changesBlock(changes) {
    if (!changes.length) return "";
    return html`<details class="changes"><summary><span>What changed</span><i>${plural(changes.length, "update")}</i></summary>
      <ol>${changes.map(c => html`<li>${c.when ? html`<time>${c.when}</time>` : ""}<p>${ri(c.text)}</p></li>`)}</ol></details>`;
  }
  const box = (msg, cls) => html`<div class="empty ${cls || ""}"><p>${msg}</p></div>`;
  const notes = (r, label) => { const t = r.why || r.note || r.read; return t ? html`<p class="fx"><b>${label || "Notes"}</b>${ri(t)}</p>` : ""; };
  const verdict = (r, label) => r.verdict ? html`<p class="fx v"><b>${label || "Verdict"}</b>${ri(r.verdict)}</p>` : "";

  /* ---------- plate: the menu board ---------- */
  /* No Start, Sit or slot labels on the board: the rank and the tier say it. Flex marks the flex range,
     and Stream marks a streamer only while he is still near the top 12. */
  function menuLabel(r, posKey) {
    if (posKey === "FLEX" || posKey === "*") return "";
    const k = String(r.action || "").toUpperCase();
    if (k === "FLEX") return html`<span class="lbl">Flex</span>`;
    if (k === "STREAM" && Number(r.rank) <= 13) return html`<span class="lbl">Stream</span>`;
    return "";
  }
  function dish(ctx, r, posKey) {
    const m = [posKey === "FLEX" || posKey === "*" ? r.pos : null, r.team, r.opp].filter(Boolean).join(" ");
    const a = act(r), special = posKey === "*";
    return html`<li class="dish" data-name="${lc(r.player)}">
      <span class="rk">${r.rank == null ? "" : r.rank}</span>
      <p class="dn"><span class="nm">${r.player}</span>${flag(r)}${m ? html`<span class="tm">${m}</span>` : ""}</p>${menuLabel(r, posKey)}
      ${r.note ? html`<p class="dd">${ri(r.note)}</p>` : ""}
      ${special && r.why ? html`<p class="dd">${ri(r.why)}</p>` : ""}${special && r.verdict ? html`<p class="dd v">${ri(r.verdict)}</p>` : ""}
      ${a && a.watch ? html`<p class="dd w">${a.key === "START" ? "Have a backup ready" : "Watch"}: ${a.watch}</p>` : ""}
    </li>`;
  }
  function menuBoard(ctx, p) {
    const d = p.data || {}, pos = d.positions || {};
    const keys = Object.keys(pos).filter(k => (pos[k] || []).length).sort((a, b) => (POS_ORDER.indexOf(a) + 99) % 99 - (POS_ORDER.indexOf(b) + 99) % 99);
    const { intro, changes } = splitIntro(p.intro_md);
    return html`<div class="cols"><div class="main-col">
      <article class="board">
        <header class="bd-head">
          <p class="kick">Week ${p.week} rankings · ${p.format || ctx.scoring}</p>
          <h1>${SERIES.menu.name}</h1>
          ${p.dek ? html`<p class="dek">${p.dek}</p>` : ""}
          ${metaLine(ctx, "menu", p)}
          ${keys.length ? html`<a class="jump" href="#rankings" data-jump>${icon("chev")}<span><b>The rankings are further down the page.</b> Scroll down, or tap here to jump straight to them.</span></a>` : ""}
        </header>
        ${introBlock(intro)}
        ${changesBlock(changes)}
        <section class="ranks" id="rankings" aria-label="Rankings">
          ${keys.length ? html`<nav class="courses" role="tablist" aria-label="Positions">${keys.map(k =>
            html`<button type="button" role="tab" id="tab-${k}" data-pos-tab="${k}" aria-controls="pos-${k}">${k}</button>`)}
            <button type="button" class="find" data-find aria-label="Find a player" aria-expanded="false">${icon("search")}</button></nav>
          <div class="finder" hidden><input type="search" placeholder="Find a player" aria-label="Find a player" autocomplete="off" spellcheck="false"></div>` : ""}
          <div class="spread" data-board>${keys.length ? keys.map(k => html`<section class="pos" id="pos-${k}" data-pos="${k}" role="tabpanel" aria-labelledby="tab-${k}">
            <h2 class="pos-h">${POS_NAME[k] || k}</h2>
            <div class="pos-body">${tiers(pos[k]).map(t => html`<div class="tier"><p class="tier-h"><b>Tier ${t.n}</b><span>${t.label}</span></p>
              <ol class="dishes">${t.rows.map(r => dish(ctx, r, k))}</ol></div>`)}</div>
          </section>`) : box("No rankings on this menu yet.")}</div>
          <p class="no-match" hidden>Nobody by that name on this menu.</p>
        </section>
        ${(d.specials || []).length ? html`<section class="specials"><p class="tier-h"><b>Specials</b><span>Matchup plays</span></p>
          <ol class="dishes">${d.specials.map(r => dish(ctx, r, "*"))}</ol></section>` : ""}
        ${p.outro_md ? html`<div class="bd-outro prose">${md(p.outro_md)}</div>` : ""}
      </article></div>
      <aside class="side-col">${membersSlot("menu")}${after(ctx, p)}</aside></div>`;
  }

  /* ---------- plate: order tickets ---------- */
  function ticket(band, body, o) {
    o = o || {};
    return html`<article class="tk${o.cls ? " " + o.cls : ""}"${o.fsec ? raw(" data-fsec") : ""}${o.fall ? raw(" data-fall") : ""}>
      <div class="tk-band ${o.tone || ""}"><span>${band[0]}</span><span${o.fsec ? raw(" data-count") : ""}>${band[1] || ""}</span></div>${body}${o.code ? html`<div class="barcode" aria-hidden="true"></div><p class="tk-id">${o.code}</p>` : ""}</article>`;
  }
  /* this week's tickets on the rail, the one you are on pulled forward */
  function rail(ctx, view, week) {
    const rows = plan(ctx, week).filter(s => SERIES[s.series].plate === "ticket");
    return html`<nav class="rail" aria-label="This week's tickets"><div class="rod" aria-hidden="true"></div>
      <ol>${rows.map(s => html`<li class="stub is-${s.state}${s.series === view ? " here" : ""}"><a href="${link(s.series, s.entry && week !== ctx.currentWeek ? week : null)}"${s.series === view ? raw(' aria-current="page"') : ""}>
        <span class="d">${s.day.slice(0, 3)}</span><span class="s">${SERIES[s.series].name}</span><span class="t">${stateText(s, true)}</span></a></li>`)}</ol></nav>`;
  }
  function ticketHead(ctx, series, p, o) {
    o = o || {};
    const { intro, changes } = splitIntro(p.intro_md);
    return ticket([o.band || html`${SERIES[series].plain} · Week ${p.week}`, p.format || ctx.scoring], html`
      <header class="tk-head"><h1>${SERIES[series].name}</h1>
        ${p.dek ? html`<p class="dek">${p.dek}</p>` : ""}${metaLine(ctx, series, p)}</header>
      ${introBlock(intro)}${changesBlock(changes)}`, { cls: "head-tk", tone: o.tone });
  }
  function tItem(ctx, r, o) {
    o = o || {};
    const a = act(r), pos = posOf(ctx, r);
    const num = o.num != null ? (typeof o.num === "number" ? pad2(o.num) : o.num) : "";
    return html`<li class="ti${o.off ? " off" : ""}"${pAttr(ctx, [r], r.player)}>
      <span class="q${o.qcls ? " " + o.qcls : ""}">${num}</span>
      <div class="ti-head"><p class="n">${r.player}${flag(r)}</p><p class="m">${[r.team, pos, r.opp].filter(Boolean).join(" · ")}${o.sub ? html` · ${o.sub}` : ""}</p></div>
      ${stamp(ctx, a, r)}
      <div class="ti-body">${facts(a, { noTo: o.noTo })}${o.mods || ""}${notes(r)}${verdict(r, o.verdictLabel)}
        ${r.flip_if ? html`<p class="fx f"><b>Flips if</b>${ri(r.flip_if)}</p>` : ""}</div>
    </li>`;
  }
  const items = list => html`<ol class="items">${list}</ol>`;
  const code = (p, s) => `${p.season || ""}W${pad2(p.week)} ${s}`;
  const count = n => plural(n, "player");
  function ticketPage(ctx, series, p, grid, o) {
    o = o || {};
    return html`<div class="cols"><div class="main-col">${rail(ctx, series, p.week)}
      ${ticketHead(ctx, series, p, o)}
      ${posBar(ctx, o.noun)}
      <div class="tk-grid" data-fscope>${grid}</div>
      ${p.outro_md ? ticket(["From the chef", ""], html`<div class="tk-body prose">${md(p.outro_md)}</div>`, { cls: "outro-tk" }) : ""}</div>
    <aside class="side-col">${o.members === false ? "" : membersSlot("tickets")}${after(ctx, p)}</aside></div>`;
  }

  function marketTicket(ctx, p) {
    const d = p.data || {};
    const grid = html`
      ${(d.adds || []).length ? ticket(["Priority adds", count(d.adds.length)], items(d.adds.map((r, i) =>
        tItem(ctx, r, { num: r.priority != null ? r.priority : i + 1, sub: r.rostered ? "Rostered " + r.rostered : "" }))), { code: code(p, "ADDS"), fsec: true }) : ""}
      ${(d.stashes || []).length ? ticket(["Stashes", count(d.stashes.length)], items(d.stashes.map((r, i) => tItem(ctx, r, { num: i + 1 }))), { code: code(p, "STASH"), fsec: true }) : ""}
      ${(d.drops || []).length ? ticket(["Drops", count(d.drops.length)], items(d.drops.map((r, i) => tItem(ctx, r, { num: i + 1, off: true }))), { tone: "red", code: code(p, "DROPS"), fsec: true }) : ""}
      ${(d.mnf || []).length ? ticket(["Monday night", "what changed"], html`<div class="tk-body prose">${d.mnf.map(m => html`<p>${ri(m.text || m)}</p>`)}</div>`, { fall: true }) : ""}`;
    return ticketPage(ctx, "market", p, grid, { noun: "waiver calls" });
  }
  function butcherTicket(ctx, p) {
    const d = p.data || {};
    const grid = html`
      ${(d.buy || []).length ? ticket(["Trade for", count(d.buy.length)], items(d.buy.map((r, i) => tItem(ctx, r, { num: i + 1 }))), { code: code(p, "BUY"), fsec: true }) : ""}
      ${(d.sell || []).length ? ticket(["Trade away", count(d.sell.length)], items(d.sell.map((r, i) => tItem(ctx, r, { num: i + 1 }))), { tone: "red", code: code(p, "SELL"), fsec: true }) : ""}`;
    return ticketPage(ctx, "butcher", p, grid, { noun: "trade calls" });
  }
  function lineTicket(ctx, p) {
    const d = p.data || {};
    const t = (key, band, tone, o) => (d[key] || []).length ? ticket([band, count(d[key].length)], items(d[key].map((r, i) => tItem(ctx, r, Object.assign({ num: i + 1 }, o)))),
      { code: code(p, key.toUpperCase()), tone, fsec: true }) : "";
    const grid = html`${t("tnf", "Thursday night")}${t("starts", "The week favors them")}${t("sits", "The week does not", "red")}${t("coinflips", "Coin flips", "gold", { verdictLabel: "The lean" })}`;
    return ticketPage(ctx, "line", p, grid, { noun: "lineup calls" });
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
    const plog = r => (r.practice || []).length ? html`<p class="plog"><span class="pl">${r.practice.map((x, i) =>
      html`<i class="pl-${lc(String(x).replace(/[^a-z]/gi, "")) || "na"}" title="${PRACTICE_DAYS[i] || ""}: ${x}">${(PRACTICE_DAYS[i] || "").charAt(0)}</i>`)}</span>${r.practice.join(" · ")}</p>` : "";
    const nameOf = x => typeof x === "string" ? x : (x && x.player) || "";
    const grid = html`
      ${groups.length ? ticket(["Designations", "Wed · Thu · Fri practice"], groups.map(g => html`<section class="grp" data-fsec><h2><span>${g.name}</span></h2>
        ${items(g.rows.map(r => tItem(ctx, r, { num: g.st || "", qcls: "st st-" + lc(g.st), sub: r.injury ? cap(r.injury) : "", mods: plog(r) })))}</section>`),
        { code: code(p, "REPORT"), fsec: true }) : ""}
      ${(d.reversals || []).length ? ticket(["Reversals", "the call changed"], items(d.reversals.map((r, i) => html`<li class="ti"${pAttr(ctx, [r], r.player)}>
        <span class="q">${pad2(i + 1)}</span><div class="ti-head"><p class="n">${r.player}</p><p class="m">Was: ${r.was}</p></div>
        <div class="ti-body"><p class="fx v"><b>Now</b>${ri(r.now)}</p></div></li>`)), { tone: "red", fsec: true }) : ""}
      ${(d.gtd || []).length ? ticket(["Sunday morning decisions", "watch the inactives"], items(d.gtd.map((x, i) => html`<li class="ti"${pAttr(ctx, [nameOf(x)], nameOf(x))}>
        <span class="q">${pad2(i + 1)}</span><div class="ti-head"><p class="n">${nameOf(x)}</p><p class="m">Game-time decision. Order Up has the call.</p></div></li>`)), { fsec: true }) : ""}`;
    return ticketPage(ctx, "prep", p, grid, { noun: "players on the report" });
  }
  function orderupTicket(ctx, p) {
    const d = p.data || {}, live = ctx.liveOrderUp(ctx.entry("orderup", p.week));
    const grid = html`
      ${(d.updates || []).length ? ticket(["Updates", "newest first"], html`<ol class="upd">${d.updates.map(u => html`<li><time>${u.time}</time><p>${ri(u.text)}</p></li>`)}</ol>`, { fall: true }) : ""}
      ${(d.windows || []).map(w => {
        const [kick, ...rest] = String(w.time || "").split(" · "), sub = rest.join(" · ");
        const outRow = name => (w.inactives || []).find(x => x.player === name) || name;
        return ticket([w.name, kick], html`
          ${sub ? html`<p class="tk-sub">${cap(sub)}</p>` : ""}
          ${(w.inactives || []).length ? items(w.inactives.map(r => tItem(ctx, r, { num: "86", off: true, noTo: (w.pivots || []).some(pv => pv.out === r.player) })))
            : html`<p class="tk-empty">Nothing on this ticket yet. It prints when the inactives drop.</p>`}
          ${(w.pivots || []).map(pv => html`<div class="swap"${pAttr(ctx, [outRow(pv.out)])}><span class="o">${pv.out}</span><span class="stamp pivot">Pivot to</span><span class="i">${pv.in}</span>${pv.note ? html`<span class="sn">${pv.note}</span>` : ""}</div>`)}`,
          { code: code(p, String(w.name || "").toUpperCase()), fsec: true });
      })}`;
    return ticketPage(ctx, "orderup", p, grid, { tone: live ? "red" : "", band: live ? html`<i class="dot"></i>Order Up · Live` : null, members: false, noun: "inactives" });
  }

  /* ---------- plate: the field, in broadcast graphics ---------- */
  const bar = (title, aside, tone, counted) => html`<h2 class="bar ${tone || ""}"><span>${title}</span>${aside ? html`<em${counted ? raw(" data-count") : ""}>${aside}</em>` : ""}</h2>`;
  function fieldHead(ctx, series, p, o) {
    o = o || {};
    const { intro, changes } = splitIntro(p && p.intro_md);
    return html`<section class="f-head">
      <p class="f-kick"><span>${SERIES[series].plain}</span>${p && p.week ? html`<span>Week ${p.week} · ${p.format || ctx.scoring}</span>` : ""}</p>
      <h1>${o.title || SERIES[series].name}</h1>
      ${(o.dek || (p && p.dek)) ? html`<p class="dek">${o.dek || p.dek}</p>` : ""}
      ${p ? metaLine(ctx, series, p) : ""}
      ${introBlock(intro)}${changesBlock(changes)}
    </section>`;
  }
  function lowerThird(ctx, r, a, o) {
    const pos = posOf(ctx, r);
    return html`<div class="lt"><p class="lt-n"><span>${r.player}</span>${flag(r)}</p><p class="lt-m">${[r.team, pos].filter(Boolean).join(" · ")}</p>${stamp(ctx, a, r, o)}</div>`;
  }
  function heatEntry(ctx, r, dir) {
    const a = act(r);
    return html`<li class="bc ${dir}"${pAttr(ctx, [r], r.player)}>${lowerThird(ctx, r, a)}
      ${r.stat ? html`<p class="bc-stat">${r.stat}</p>` : ""}
      ${facts(a)}${notes(r)}${verdict(r)}
    </li>`;
  }
  /* body is a function, so the items are counted before the position bar is drawn */
  function fieldPage(ctx, series, p, body, o) {
    o = o || {};
    const inner = body();
    return html`<div class="cols"><div class="main-col">${fieldHead(ctx, series, p)}
      ${posBar(ctx, o.noun)}
      <div class="f-body" data-fscope>${inner}</div>
      ${p.outro_md && series !== "leftovers" ? html`<section class="f-outro prose">${md(p.outro_md)}</section>` : ""}</div>
    <aside class="side-col">${membersSlot(o.what || "board")}${after(ctx, p)}</aside></div>`;
  }
  function heatField(ctx, p) {
    const d = p.data || {}, up = d.risers || [], down = d.fallers || [];
    return fieldPage(ctx, "heat", p, () => html`<div class="heat-cols">
      ${up.length ? html`<section class="f-sec" data-fsec>${bar("Stove's on", plural(up.length, "riser"), "gold", true)}<ol class="bc-list">${up.map(r => heatEntry(ctx, r, "up"))}</ol></section>` : ""}
      ${down.length ? html`<section class="f-sec" data-fsec>${bar("Left to cool", plural(down.length, "faller"), "brown", true)}<ol class="bc-list">${down.map(r => heatEntry(ctx, r, "down"))}</ol></section>` : ""}
    </div>`, { noun: "risers or fallers" });
  }
  const chip = (ctx, x) => { const a = act(x); return a && x.player ? html`<span class="chip ${a.cls}"><b>${x.player}</b>${callText(ctx, a, x)}</span>` : ""; };
  function leftoversField(ctx, p) {
    const d = p.data || {};
    return fieldPage(ctx, "leftovers", p, () => html`
      ${(d.takeaways || []).length ? html`<section class="f-sec" data-fsec>${bar("Takeaways", "what Sunday told us", "gold")}<ol class="takeaways">${d.takeaways.map((t, i) => {
        const players = (t.actions || []).filter(x => x.player);
        return html`<li${pAttr(ctx, players)}><span class="tw-n">${i + 1}</span><div class="tw-body"><h3>${t.headline}</h3>${t.text ? html`<p>${ri(t.text)}</p>` : ""}
          ${players.length ? html`<div class="chips">${players.map(x => chip(ctx, x))}</div>` : ""}</div></li>`;
      })}</ol></section>` : ""}
      ${(d.usage || []).length ? html`<section class="f-sec" data-fsec>${bar("Usage notes", "snaps, routes, targets, carries", "chalk")}<ol class="bc-list">${d.usage.map(u => {
        const a = act(u);
        return html`<li class="bc"${pAttr(ctx, [u], u.player)}>${lowerThird(ctx, u, a)}${u.stat ? html`<p class="bc-stat">${u.stat}</p>` : ""}${facts(a)}${u.read ? html`<p class="fx"><b>The read</b>${ri(u.read)}</p>` : ""}</li>`;
      })}</ol></section>` : ""}
      ${(d.overreactions || []).length ? html`<section class="f-sec" data-fsec>${bar("Overreactions, checked", "real or noise", "brown")}<ol class="over-list">${d.overreactions.map(o => {
        const real = o.verdict === "buy";
        return html`<li class="over ${real ? "real" : "noise"}"${pAttr(ctx, [o], o.player)}><p class="ov-badge">${real ? "Real" : "Noise"}</p><p class="ov-take">${o.take}</p>
          ${o.why ? html`<p class="ov-why">${ri(o.why)}</p>` : ""}<div class="chips">${chip(ctx, o)}</div>${facts(act(o))}</li>`;
      })}</ol></section>` : ""}
      ${p.outro_md ? html`<section class="f-sec misses" data-fall>${bar("The misses", "owned", "red")}<div class="prose">${md(p.outro_md)}</div></section>` : ""}`, { noun: "players" });
  }

  /* ---------- series pages ---------- */
  function seriesView(series, render) {
    return async ctx => {
      const weeks = ctx.weeksOf(series), want = parseInt(params.get("week"), 10);
      const week = weeks.includes(want) ? want : weeks[0];
      const entry = week != null ? ctx.entry(series, week) : null;
      if (!entry) return emptySeries(ctx, series);
      const menuE = series === "menu" ? null : (ctx.entry("menu", week) || ctx.latest("menu"));
      const [p, menu] = await Promise.all([getJSON(entry.path), menuE ? tryJSON(menuE.path) : null]);
      ctx.idx = makeIndex([p, menu], menu && menu.week === p.week ? menu : null);
      ctx.title = SERIES[series].name + ", Week " + p.week;
      return render(ctx, p);
    };
  }
  function emptySeries(ctx, series) {
    const svc = servicesOf(ctx.site).find(s => s.series === series);
    const msg = svc ? `${SERIES[series].name} opens ${svc.day}${svc.min == null ? ", " + svc.time : " at " + svc.time + " ET"}. First service is coming.` : "The kitchen is prepping. Check back soon.";
    const plate = SERIES[series].plate;
    if (plate === "board") return html`<div class="cols"><div class="main-col"><article class="board"><header class="bd-head">
      <p class="kick">Week ${ctx.currentWeek} rankings</p><h1>${SERIES.menu.name}</h1><p class="dek">${SERIES.menu.blurb}</p></header>${box(msg)}</article></div>
      <aside class="side-col">${followCard(ctx)}</aside></div>`;
    if (plate === "ticket") return html`<div class="cols"><div class="main-col">${rail(ctx, series, ctx.currentWeek)}
      ${ticket([html`${SERIES[series].plain} · Week ${ctx.currentWeek}`, ctx.scoring], html`<header class="tk-head">
        <h1>${SERIES[series].name}</h1><p class="dek">${SERIES[series].blurb}</p></header>
        <p class="tk-empty">${msg}</p>`, { cls: "head-tk" })}</div><aside class="side-col">${followCard(ctx)}</aside></div>`;
    return html`<div class="cols"><div class="main-col">${fieldHead(ctx, series, null, { dek: SERIES[series].blurb })}${box(msg)}</div><aside class="side-col">${followCard(ctx)}</aside></div>`;
  }

  /* ---------- the Pass and About ---------- */
  function noteItem(ctx, it) {
    const a = act(it);
    return html`<li><time>${fmt(it.at)}</time><p>${ri(it.text)}${safeUrl(it.url) ? html` <a class="src" href="${safeUrl(it.url)}" target="_blank" rel="noopener">Source</a>` : ""}</p>
      ${a && it.player ? html`<div class="chips">${chip(ctx, it)}</div>` : ""}${a && a.key === "HOLD" && it.why ? html`<p class="why">${ri(it.why)}</p>` : ""}</li>`;
  }
  function postItem(p) {
    return html`<li><time>${SERIES[p.series] ? SERIES[p.series].name : p.series === "reply" ? "Reply" : "Post"}${p.week ? " · Week " + p.week : ""} · ${fmt(p.postedAt)}</time>
      <p>${raw(esc(p.preview || "").replace(/(^|\s)(#\w+)/g, '$1<span class="ht">$2</span>'))}</p>
      ${p.note ? html`<p class="why">${p.note}</p>` : ""}
      ${safeUrl(p.url) ? html`<a class="more" href="${safeUrl(p.url)}" target="_blank" rel="noopener">${icon("x")}${p.kind === "thread" ? "Read the thread" + (p.count ? " (" + p.count + ")" : "") : "View on X"}</a>` : ""}</li>`;
  }
  async function latestNotes(ctx) {
    const e = ctx.latest("notes");
    return e ? tryJSON(e.path) : null;
  }
  async function passView(ctx) {
    const menuE = ctx.latest("menu");
    const [notesP, feed, menu] = await Promise.all([latestNotes(ctx), tryJSON("posts.json"), menuE ? tryJSON(menuE.path) : null]);
    ctx.idx = makeIndex([menu, notesP], notesP && menu && menu.week === notesP.week ? menu : null);
    const list = (notesP && notesP.data && notesP.data.items) || [], posts = ((feed && feed.posts) || []).slice().sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
    ctx.title = SERIES.pass.name;
    return html`<div class="cols"><div class="main-col">
      ${fieldHead(ctx, "pass", null, { dek: "Every post and thread from the kitchen as it went out on X, plus the daily notes." })}
      <section class="f-sec">${bar("Kitchen notes", notesP ? "Week " + notesP.week + " · " + fmt(notesP.updatedAt) : "", "gold")}${list.length ? html`<ol class="feed">${list.slice(0, 60).map(it => noteItem(ctx, it))}</ol>` : box("No notes yet this week.")}</section>
      <section class="f-sec">${bar("Posts", posts.length ? plural(posts.length, "post") : "", "chalk")}${posts.length ? html`<ol class="feed">${posts.slice(0, 100).map(postItem)}</ol>` : box("Nothing has gone out yet.")}</section>
    </div><aside class="side-col">${followCard(ctx)}</aside></div>`;
  }
  function aboutView(ctx) {
    const site = ctx.site;
    ctx.title = SERIES.about.name;
    return html`<div class="cols"><div class="main-col">
      ${fieldHead(ctx, "about", null, { title: ctx.brand, dek: site.about_dek || "" })}
      <section class="f-sec prose about">${md(site.about_md || "")}</section>
      <section class="f-sec">${bar("The week", "all times ET", "gold")}<ol class="drive">${servicesOf(site).map((s, i) => html`<li><a href="${link(s.series)}">
        <span class="yd">${YARDS[i] || ""}</span><span class="d">${s.day.slice(0, 3)}</span><span class="s">${SERIES[s.series].name}<small>${SERIES[s.series].plain}</small></span><span class="t">${s.time}</span></a></li>`)}</ol></section>
    </div><aside class="side-col">${followCard(ctx)}</aside></div>`;
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
    add("butcher", (d("butcher").sell || [])[0]);
    add("heat", (d("heat").risers || [])[0]);
    add("prep", (d("prep").report || []).find(r => String(r.action).toUpperCase() === "PIVOT"));
    return calls.slice(0, 8);
  }
  function preview(series, p) {
    const d = (p && p.data) || {};
    switch (series) {
      case "menu": return POS_ORDER.slice(0, 4).map(k => (d.positions && d.positions[k] || [])[0] && Object.assign({ _pos: k }, d.positions[k][0])).filter(Boolean);
      case "market": return (d.adds || []).slice(0, 3);
      case "butcher": return [].concat((d.buy || []).slice(0, 2), (d.sell || []).slice(0, 1));
      case "heat": return [].concat((d.risers || []).slice(0, 2), (d.fallers || []).slice(0, 1));
      case "line": return [].concat((d.tnf || []).slice(0, 1), (d.starts || []).slice(0, 1), (d.sits || []).slice(0, 1));
      case "prep": return (d.report || []).slice(0, 3);
      case "orderup": return (d.windows || []).flatMap(w => w.inactives || []).slice(0, 3);
      case "leftovers": return (d.takeaways || []).flatMap(t => t.actions || []).slice(0, 3);
      default: return [];
    }
  }
  /* each piece on home shows up as the object it is: the menu board, a ticket, or a broadcast card */
  function miniPlate(ctx, e, p) {
    const S = SERIES[e.series], wk = e.week !== ctx.currentWeek ? " · Week " + e.week : "", href = link(e.series, e.week !== ctx.currentWeek ? e.week : null);
    const svc = servicesOf(ctx.site).find(s => s.series === e.series), day = svc ? svc.day : "";
    const rows = preview(e.series, p);
    if (S.plate === "board") return html`<li class="mini-board"><a href="${href}"><span class="mk">${day} · ${S.plain}${wk}</span><span class="mt">${S.name}</span>
      ${p && p.dek ? html`<span class="md">${p.dek}</span>` : ""}
      <span class="mm">${rows.map(r => html`<span class="mm-row"><b>${r._pos}</b><span class="nm">${r.player}</span><span class="tm">${r.team || ""}</span></span>`)}</span></a></li>`;
    if (S.plate === "ticket") return html`<li class="mini-tk"><a href="${href}"><span class="tk-band"><span>${day.slice(0, 3)} · ${S.plain}${wk}</span><span>${fmtDay(e.updatedAt || e.publishedAt)}</span></span>
      <span class="mt">${S.name}</span>${p && p.dek ? html`<span class="md">${p.dek}</span>` : ""}
      <span class="mi">${rows.map(r => html`<span class="mi-row"><span class="n">${r.player}</span>${stamp(ctx, act(r), r, { rank: true })}</span>`)}</span></a></li>`;
    return html`<li class="mini-f"><a href="${href}"><span class="mk">${S.plain} · ${day.slice(0, 3)}${wk}</span><span class="mt">${S.name}</span>
      ${p && p.dek ? html`<span class="md">${p.dek}</span>` : ""}
      ${rows.length ? html`<span class="chips">${rows.map(r => chip(ctx, r))}</span>` : ""}
      <span class="tm">${fmt(e.updatedAt || e.publishedAt)}</span></a></li>`;
  }
  function liveTicket(ctx, e, p) {
    const d = p.data || {}, w = lastWindow(d);
    return html`<div class="home-live">${ticket([html`<i class="dot"></i>Order Up · Live`, "Week " + p.week], html`
      <header class="tk-head"><p class="k">${w.time}</p><h2 class="h">${w.name}</h2></header>
      ${(d.updates || []).length ? html`<ol class="upd">${d.updates.slice(0, 3).map(u => html`<li><time>${u.time}</time><p>${ri(u.text)}</p></li>`)}</ol>` : ""}
      ${(w.pivots || []).slice(0, 1).map(pv => html`<div class="swap"><span class="o">${pv.out}</span><span class="stamp pivot">Pivot to</span><span class="i">${pv.in}</span></div>`)}
      <a class="tk-btn" href="${link("orderup")}">Open the ticket</a>`, { tone: "red", cls: "live-tk" })}</div>`;
  }
  function scoreboard(ctx, week, nxt, live) {
    return html`<section class="scoreboard" aria-label="Week ${week}, ${ctx.now.day}">
      <div class="sb-top"><span>${ctx.brand}</span><span>${ctx.site.season || ""} season</span></div>
      <div class="sb-grid">
        <div class="sb-cell"><span class="sb-l">Week</span><span class="bulbs">${week}</span></div>
        <div class="sb-cell"><span class="sb-l">Today</span><span class="bulbs">${ctx.now.day.slice(0, 3)}</span></div>
        <div class="sb-cell wide${live ? " is-live" : ""}">${live
          ? html`<span class="sb-l"><i class="dot"></i>Live now</span><span class="sb-v">${SERIES.orderup.name}</span><span class="sb-t">${live.name ? live.name + " inactives are in" : "Inactives are in"}</span>`
          : nxt ? html`<span class="sb-l">Next up</span><span class="sb-v">${SERIES[nxt.series].name}</span><span class="sb-t">${whenText(nxt)}</span>`
          : html`<span class="sb-l">Next up</span><span class="sb-v">Week ${week + 1}</span>`}</div>
      </div></section>`;
  }
  async function homeView(ctx) {
    const week = ctx.currentWeek, rows = plan(ctx, week);
    const recent = ctx.pieces.filter(p => p.series !== "notes").sort(byNewest);
    const liveRow = rows.find(r => r.state === "live");
    const listed = recent.filter(e => !(liveRow && e === liveRow.entry)).slice(0, 6);
    const menuE = ctx.entry("menu", week) || ctx.latest("menu");
    const needed = Array.from(new Set(listed.concat(rows.filter(r => r.entry).map(r => r.entry)).concat(menuE ? [menuE] : [])));
    const [feed, notesP, ...loaded] = await Promise.all([tryJSON("posts.json"), latestNotes(ctx)].concat(needed.map(e => tryJSON(e.path))));
    const P = {}, byPath = {};
    needed.forEach((e, i) => { byPath[e.path] = loaded[i]; if (e.week === week && loaded[i]) P[e.series] = loaded[i]; });
    ctx.idx = makeIndex(Object.values(P).concat(menuE ? [byPath[menuE.path]] : []), P.menu || null);
    const calls = headlineCalls(P), nxt = nextService(ctx), w = liveRow && P.orderup ? lastWindow(P.orderup.data) : null;
    const posts = ((feed && feed.posts) || []).slice().sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt))).slice(0, 3);
    const noteItems = ((notesP && notesP.data && notesP.data.items) || []).slice(0, 3);
    return html`<div class="home">
      <div class="h-main">
        <h1 class="sr">${ctx.brand}, week ${week}</h1>
        ${scoreboard(ctx, week, nxt, liveRow && w ? w : null)}
        ${liveRow && P.orderup ? liveTicket(ctx, liveRow.entry, P.orderup) : ""}
        <section class="f-sec">${bar("Week " + week + " schedule", "Tuesday to Monday", "gold")}
          <ol class="drive" aria-label="This week's schedule">${rows.map((s, i) => html`<li class="is-${s.state}"><a href="${link(s.series, s.entry && week !== ctx.currentWeek ? week : null)}">
            <span class="yd">${s.state === "next" || s.state === "live" ? html`<span class="on-ball">${icon("ball")}</span>` : YARDS[i] || ""}</span><span class="d">${s.day.slice(0, 3)}</span>
            <span class="s">${SERIES[s.series].name}<small>${SERIES[s.series].plain}</small></span><span class="t">${stateText(s)}</span></a></li>`)}</ol></section>
        ${calls.length ? html`<section class="f-sec">${bar("This week's calls", "tap for the why", "chalk")}<ol class="calls">${calls.map(c => html`<li><a class="call" href="${link(c.series)}">
          ${stamp(ctx, c.a, c.item, { rank: true }) || html`<span class="stamp ${c.a.cls}">${c.a.lineup ? "Lineup call" : c.a.label}</span>`}
          <span class="who"><span class="nm">${c.item.player}</span><span class="mt">${[c.item.team, posOf(ctx, c.item)].filter(Boolean).join(" ")}${c.item.team || posOf(ctx, c.item) ? " · " : ""}${SERIES[c.series].name}</span>
          ${c.a.faab || c.a.price || c.a.to ? html`<span class="ex">${c.a.faab ? "FAAB " + c.a.faab : c.a.price ? c.a.priceLabel + ": " + c.a.price : "Pivot to " + c.a.to}</span>` : ""}</span></a></li>`)}</ol></section>` : ""}
      </div>
      <div class="h-side">
        <section class="f-sec">${bar("Latest from the kitchen", "", "brown")}${listed.length ? html`<ol class="minis">${listed.map(e => miniPlate(ctx, e, byPath[e.path]))}</ol>`
          : box(nxt ? `The kitchen is prepping. First service is ${SERIES[nxt.series].name}, ${whenText(nxt)}.` : "The kitchen is prepping.")}</section>
        ${noteItems.length ? html`<section class="f-sec">${bar("Kitchen notes", html`<a href="${link("pass")}">All notes</a>`, "chalk")}<ol class="feed">${noteItems.map(it => noteItem(ctx, it))}</ol></section>` : ""}
        ${posts.length ? html`<section class="f-sec">${bar("From the Pass", html`<a href="${link("pass")}">All posts</a>`, "chalk")}<ol class="feed">${posts.map(postItem)}</ol></section>` : ""}
        <section class="f-sec">${followCard(ctx)}</section>
      </div>
    </div>`;
  }

  const VIEWS = {
    home: homeView,
    menu: seriesView("menu", menuBoard),
    market: seriesView("market", marketTicket),
    butcher: seriesView("butcher", butcherTicket),
    heat: seriesView("heat", heatField),
    line: seriesView("line", lineTicket),
    prep: seriesView("prep", prepTicket),
    orderup: seriesView("orderup", orderupTicket),
    leftovers: seriesView("leftovers", leftoversField),
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
  const setHash = k => { try { history.replaceState(null, "", location.pathname + location.search + (k ? "#" + k : "")); } catch (e) { /* file:// */ } };
  const smooth = () => matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  function wire() {
    const $$ = s => Array.from(document.querySelectorAll(s));
    const want = location.hash.slice(1).toUpperCase();
    /* the Menu: one position at a time, the choice kept in the URL hash (menu.html#RB) */
    const tabs = $$("[data-pos-tab]"), blocks = $$("[data-board] .pos");
    if (tabs.length) {
      const show = (k, focus) => {
        tabs.forEach(t => { const on = t.dataset.posTab === k; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
        blocks.forEach(b => b.classList.toggle("on", b.dataset.pos === k));
      };
      tabs.forEach((t, i) => {
        t.addEventListener("click", () => { show(t.dataset.posTab); setHash(t.dataset.posTab); });
        t.addEventListener("keydown", e => {
          const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (step) { e.preventDefault(); const k = tabs[(i + step + tabs.length) % tabs.length].dataset.posTab; show(k, true); setHash(k); }
        });
      });
      const hit = tabs.find(t => t.dataset.posTab === want);
      show(hit ? want : tabs[0].dataset.posTab);
      if (hit) requestAnimationFrame(() => document.getElementById("rankings").scrollIntoView());
      addEventListener("hashchange", () => { const k = location.hash.slice(1).toUpperCase(); if (tabs.some(t => t.dataset.posTab === k)) show(k); });
    }
    /* the red note at the top of the Menu jumps to the rankings */
    $$("[data-jump]").forEach(a => a.addEventListener("click", e => {
      const el = document.getElementById("rankings");
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: smooth() });
      const on = document.querySelector('[data-pos-tab][aria-selected="true"]');
      if (on) on.focus({ preventScroll: true });
    }));
    /* find a player on the Menu: filters every position at once */
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
    /* the position bar on every other page with players: All, QB, RB, WR, TE */
    const pbar = document.querySelector("[data-posbar]"), scope = document.querySelector("[data-fscope]");
    if (pbar && scope) {
      const btns = Array.from(pbar.querySelectorAll("[data-posf]")), empty = document.querySelector(".pos-empty");
      const apply = k => {
        const all = k === "ALL";
        btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.posf === k)));
        scope.querySelectorAll("[data-p]").forEach(el => { el.hidden = !all && !el.dataset.p.split(" ").includes(k); });
        scope.querySelectorAll("[data-fall]").forEach(el => { el.hidden = !all; });
        Array.from(scope.querySelectorAll("[data-fsec]")).reverse().forEach(sec => {
          sec.hidden = !all && !sec.querySelector("[data-p]:not([hidden])");
          const c = sec.querySelector("[data-count]");
          if (c && c.closest("[data-fsec]") === sec) {
            if (c.dataset.orig == null) c.dataset.orig = c.textContent;
            const shown = sec.querySelectorAll("[data-p]:not([hidden])").length, total = sec.querySelectorAll("[data-p]").length;
            c.textContent = all ? c.dataset.orig : c.dataset.orig.replace(/^\d+/, shown + " of " + total);
          }
        });
        if (empty) empty.hidden = all || !!scope.querySelector("[data-p]:not([hidden])");
      };
      btns.forEach(b => b.addEventListener("click", () => {
        apply(b.dataset.posf);
        setHash(b.dataset.posf === "ALL" ? "" : b.dataset.posf);
        const top = pbar.getBoundingClientRect().top;
        if (top < 0 || top > innerHeight * 0.6) pbar.scrollIntoView({ block: "start", behavior: smooth() });
      }));
      if (btns.some(b => b.dataset.posf === want && !b.disabled)) apply(want);
      addEventListener("hashchange", () => { const k = location.hash.slice(1).toUpperCase() || "ALL"; if (btns.some(b => b.dataset.posf === k && !b.disabled)) apply(k); });
    }
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
    /* the rail starts at the ticket you are on */
    const here = document.querySelector(".rail .here") || document.querySelector(".rail .is-live");
    if (here) {
      const ol = here.parentElement;
      if (ol.scrollWidth > ol.clientWidth) {
        const off = here.getBoundingClientRect().left - ol.getBoundingClientRect().left;
        ol.scrollLeft = Math.max(0, ol.scrollLeft + off - (ol.clientWidth - here.clientWidth) / 2);
      }
    }
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
