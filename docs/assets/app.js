/* Fantasy Kitchen — site renderer. No build step, no dependencies.
   Every page is a thin shell: <div id="app" data-view="menu"></div>.
   Data comes from docs/data/*.json, written by the kitchen pipeline. */
(function () {
  "use strict";

  const SERIES = {
    menu:      { name: "The Menu",       page: "menu.html",      blurb: "Weekly positional rankings with tiers." },
    market:    { name: "Market Run",     page: "market.html",    blurb: "Waiver wire: adds, FAAB, stashes, drops." },
    butcher:   { name: "Butcher Shop",   page: "butcher.html",   blurb: "Trade for and trade away." },
    heat:      { name: "Heat Check",     page: "heat.html",      blurb: "Risers and fallers, with the numbers behind them." },
    line:      { name: "On the Line",    page: "line.html",      blurb: "Lineup calls, and the coin flips." },
    prep:      { name: "Prep Notes",     page: "prep.html",      blurb: "The injury report, read for lineups." },
    orderup:   { name: "Order Up",       page: "orderup.html",   blurb: "Sunday inactives and lineup pivots." },
    leftovers: { name: "Leftovers",      page: "leftovers.html", blurb: "Monday takeaways, usage, and overreactions." },
    pass:      { name: "From the Pass",  page: "pass.html",      blurb: "Everything the kitchen posted." },
    about:     { name: "About",          page: "about.html",     blurb: "" }
  };
  const NAV_ORDER = ["menu", "market", "butcher", "heat", "line", "prep", "orderup", "leftovers", "pass"];

  const params = new URLSearchParams(location.search);
  const SAMPLE = params.get("sample") === "1";
  const DATA_ROOT = SAMPLE ? "data/sample/" : "data/";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, attrs, children) => {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => { if (c === null || c === undefined) return; n.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return n;
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* The action rule: every player item carries one action; render it as an instruction chip.
     A START chip shows the slot alone ("RB2"), never "Start as": the reader sees the rank and tier and decides. */
  const ACTION_LABEL = { START: "Start", FLEX: "Flex", SIT: "Sit", STREAM: "Stream", CLAIM: "Claim", ADD: "Add", STASH: "Stash", DROP: "Drop", HOLD: "Hold", TRADE_FOR: "Trade for", TRADE_AWAY: "Trade away", MONITOR: "Monitor", PIVOT: "Pivot" };
  const ACTION_CLASS = { START: "go", FLEX: "go", STREAM: "go", CLAIM: "buy", ADD: "buy", STASH: "buy", TRADE_FOR: "buy", HOLD: "hold", SIT: "stop", DROP: "stop", TRADE_AWAY: "stop", MONITOR: "watch", PIVOT: "pivot" };
  function actionChip(item) {
    if (!item || !item.action) return null;
    const a = String(item.action).toUpperCase().replace(" ", "_");
    let label = ACTION_LABEL[a] || a;
    if (a === "START") label = item.slot || "Lineup";
    if ((a === "CLAIM" || a === "ADD" || a === "STASH") && item.faab) label += " · FAAB " + item.faab;
    if ((a === "TRADE_FOR" || a === "TRADE_AWAY") && item.price) label += " · " + item.price;
    if (a === "MONITOR" && item.watch) label += " · " + item.watch;
    if (a === "PIVOT" && item.to) label += " to " + item.to;
    if (a === "START" && item.watch) label += " · " + item.watch;
    return el("span", { class: "action " + (ACTION_CLASS[a] || "hold") }, [label]);
  }

  async function getJSON(path) {
    const r = await fetch(DATA_ROOT + path + (SAMPLE ? "" : "?v=" + Date.now().toString(36).slice(0, 6)), { cache: "no-cache" });
    if (!r.ok) throw new Error(path + " " + r.status);
    return r.json();
  }
  async function tryJSON(path) { try { return await getJSON(path); } catch (e) { return null; } }

  /* ---------- tiny markdown (paragraphs, headings, lists, bold, italics, links, quotes) ---------- */
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\*)([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|[^\s)]+\.html[^\s)]*)\)/g, '<a href="$2">$1</a>');
  }
  function md(src) {
    if (!src) return "";
    const lines = String(src).replace(/\r/g, "").split("\n");
    let out = [], para = [], list = null;
    const flushP = () => { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
    const flushL = () => { if (list) { out.push("<" + list.t + ">" + list.items.map(i => "<li>" + inline(i) + "</li>").join("") + "</" + list.t + ">"); list = null; } };
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) { flushP(); flushL(); continue; }
      let m;
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushP(); flushL(); const h = m[1].length + 1; out.push(`<h${h}>${inline(m[2])}</h${h}>`); continue; }
      if ((m = line.match(/^>\s?(.*)$/))) { flushP(); flushL(); out.push("<blockquote><p>" + inline(m[1]) + "</p></blockquote>"); continue; }
      if ((m = line.match(/^[-*]\s+(.*)$/))) { flushP(); if (!list || list.t !== "ul") { flushL(); list = { t: "ul", items: [] }; } list.items.push(m[1]); continue; }
      if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flushP(); if (!list || list.t !== "ol") { flushL(); list = { t: "ol", items: [] }; } list.items.push(m[1]); continue; }
      flushL(); para.push(line.trim());
    }
    flushP(); flushL();
    return out.join("\n");
  }

  /* ---------- time ---------- */
  const ET = "America/New_York";
  function fmtET(iso, opts) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: ET, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }, opts || {})).format(d) + " ET";
  }
  function ago(iso) {
    const d = new Date(iso); if (isNaN(d)) return "";
    const s = Math.max(0, (Date.now() - d) / 1000);
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    return Math.round(s / 86400) + "d ago";
  }

  /* ---------- shell ---------- */
  function shell(site, view) {
    const handle = site.handle || "FF_ChefHazy";
    const header = el("header", { class: "site-header" }, [
      el("div", { class: "wrap" }, [
        el("div", { class: "brand-row" }, [
          el("a", { class: "brand", href: "index.html", "aria-label": site.brand || "Fantasy Kitchen" }, [
            el("span", { class: "mark", html: MARK }),
            el("span", { class: "word", html: esc(site.brand || "Fantasy Kitchen") + "<small>by " + esc(site.author || "Chef Hazy") + "</small>" })
          ]),
          el("a", { class: "x-link", href: "https://x.com/" + handle, target: "_blank", rel: "noopener", html: XICON + " @" + esc(handle) })
        ]),
        el("nav", { class: "nav", "aria-label": "Sections" }, NAV_ORDER.map(k =>
          el("a", { href: SERIES[k].page, "aria-current": k === view ? "page" : null }, [SERIES[k].name])
        ))
      ])
    ]);
    const main = el("main", { class: "wrap", id: "main" });
    const footer = el("footer", { class: "wrap footer" }, [
      el("span", {}, [(site.brand || "Fantasy Kitchen") + " · " + (site.season || "") + " season"]),
      el("span", {}, [el("a", { href: "about.html" }, ["About the kitchen"]), " · ", el("a", { href: "https://x.com/" + handle, target: "_blank", rel: "noopener" }, ["@" + handle + " on X"])])
    ]);
    const app = $("#app");
    app.replaceChildren(header, main, footer);
    return main;
  }

  const MARK = '<svg viewBox="0 0 34 34" width="34" height="34" aria-hidden="true"><circle cx="17" cy="17" r="15.5" fill="none" stroke="#e9a23b" stroke-width="2"/><circle cx="17" cy="17" r="9.5" fill="none" stroke="#e9a23b" stroke-width="2" opacity="0.7"/><circle cx="17" cy="17" r="3.5" fill="#c9531e"/></svg>';
  const XICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9L1 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z"/></svg>';

  function pageHead(main, opts) {
    const head = el("div", { class: "page-head" }, [
      opts.eyebrow ? el("div", { class: "eyebrow" }, [opts.eyebrow]) : null,
      el("h1", {}, [opts.title]),
      opts.dek ? el("p", { class: "dek" }, [opts.dek]) : null,
      opts.meta ? el("div", { class: "meta", html: opts.meta }) : null
    ]);
    main.append(head);
    return head;
  }

  function weekLabel(p) { return p && p.week ? "Week " + p.week : ""; }
  function pieceMeta(piece) {
    const parts = [];
    if (piece.publishedAt) parts.push("Published <b>" + esc(fmtET(piece.publishedAt)) + "</b>");
    if (piece.updatedAt && piece.updatedAt !== piece.publishedAt) parts.push("Updated <b>" + esc(fmtET(piece.updatedAt)) + "</b> (" + esc(ago(piece.updatedAt)) + ")");
    if (piece.format) parts.push("Scoring <b>" + esc(piece.format) + "</b>");
    return parts.map(p => "<span>" + p + "</span>").join("");
  }
  function postedLinks(piece) {
    const posts = (piece.posts || []).filter(p => p.url);
    if (!posts.length) return null;
    return el("p", { class: "muted", style: "font-size:14px" }, ["As posted on X: ", ...posts.flatMap((p, i) => [i ? " · " : "", el("a", { href: p.url, target: "_blank", rel: "noopener" }, [p.kind === "thread" ? "thread" : "post"])])]);
  }

  /* ---------- pieces (week selector + loading) ---------- */
  function piecesFor(manifest, series) {
    return (manifest.pieces || []).filter(p => p.series === series).sort((a, b) => (b.week - a.week) || (String(b.publishedAt) > String(a.publishedAt) ? 1 : -1));
  }
  async function loadSeries(main, site, manifest, series, render) {
    const list = piecesFor(manifest, series);
    const S = SERIES[series];
    if (!list.length) {
      pageHead(main, { eyebrow: "Kitchen schedule", title: S.name, dek: S.blurb });
      let when = null;
      (site.schedule || []).forEach(d => (d.services || []).forEach(sv => { if (sv.series === series && !when) when = d.day + " at " + sv.time + " ET"; }));
      main.append(el("div", { class: "empty" }, [when ? `${S.name} opens ${when}. First service is coming.` : "The kitchen is prepping. Check back soon."]));
      return;
    }
    const want = parseInt(params.get("week"), 10);
    const entry = list.find(p => p.week === want) || list[0];
    const piece = await getJSON(entry.path);
    pageHead(main, {
      eyebrow: S.name + " · " + weekLabel(piece),
      title: piece.title || S.name,
      dek: piece.dek || "",
      meta: pieceMeta(piece)
    });
    if (list.length > 1) {
      const sel = el("select", { class: "select", id: "week-select", "aria-label": "Choose a week", onchange: e => { location.search = "?week=" + e.target.value + (SAMPLE ? "&sample=1" : ""); } },
        list.map(p => el("option", { value: p.week, selected: p.week === entry.week ? "selected" : null }, ["Week " + p.week])));
      main.append(el("div", { class: "toolbar" }, [sel]));
    }
    if (piece.intro_md) main.append(el("div", { class: "prose", html: md(piece.intro_md) }));
    await render(main, piece, site);
    if (piece.outro_md) main.append(el("section", { class: "prose", html: md(piece.outro_md) }));
    const links = postedLinks(piece); if (links) main.append(links);
  }

  /* ---------- shared renderers ---------- */
  function playerRow(p, i, opts) {
    opts = opts || {};
    const flag = (p.flag || "").toUpperCase();
    /* Menu rows ranked 1 to 10 carry no START chip: the rank says it. */
    const topTen = opts.menu && String(p.action || "").toUpperCase() === "START" && Number(p.rank) >= 1 && Number(p.rank) <= 10;
    const pillClass = { Q: "q", D: "d", O: "o", IR: "ir", OUT: "o" }[flag];
    return el("li", { class: "row" + (flag === "O" || flag === "OUT" || flag === "IR" ? " dim" : "") }, [
      el("span", { class: "rank" }, [p.rank != null ? p.rank : (i + 1)]),
      el("span", { class: "who" }, [
        el("span", { class: "name" }, [p.player]),
        el("span", { class: "team" }, [[p.team, p.pos].filter(Boolean).join(" · ")]),
        pillClass ? el("span", { class: "pill " + pillClass }, [flag]) : null,
        p.tag ? el("span", { class: "pill heat" }, [p.tag]) : null
      ]),
      el("span", { class: "opp" }, [p.opp || ""]),
      p.note ? el("span", { class: "note" }, [p.note]) : null,
      p.action && !topTen ? el("span", { class: "note" }, [actionChip(p)]) : null
    ]);
  }
  function tieredList(players, opts) {
    const wrap = el("div");
    let cur = null, ul = null;
    players.forEach((p, i) => {
      const t = p.tier != null ? p.tier : 0;
      if (t !== cur) {
        cur = t;
        const label = p.tier_label ? " · " + p.tier_label : "";
        wrap.append(el("div", { class: "tier" }, [el("div", { class: "tier-head" }, [el("span", { class: "n" }, ["Tier " + t + label]), el("span", { class: "rule" })])]));
        ul = el("ul", { class: "rows" }); wrap.lastChild.append(ul);
      }
      ul.append(playerRow(p, i, opts));
    });
    return wrap;
  }
  function recCard(item, opts) {
    opts = opts || {};
    return el("div", { class: "card" + (opts.prio ? " prio" : "") }, [
      el("div", { class: "top" }, [
        el("div", {}, [
          opts.prio && item.priority != null ? el("span", { class: "prio-n" }, [item.priority + " "]) : null,
          el("span", { class: "title" }, [item.player || item.headline || item.take || ""]),
          item.tag ? el("span", { class: "pill " + (item.tag_class || "heat") }, [item.tag]) : null
        ]),
        el("span", { class: "sub" }, [[item.team, item.pos, item.opp].filter(Boolean).join(" · ")])
      ]),
      (item.faab && !item.action) || item.rostered ? el("div", { class: "sub" }, [[item.faab && !item.action ? "FAAB " + item.faab : null, item.rostered ? "Rostered " + item.rostered : null].filter(Boolean).join(" · ")]) : null,
      item.stat ? el("div", { class: "stat" }, [item.stat]) : null,
      item.price ? el("div", { class: "price" }, ["Price: " + item.price]) : null,
      item.why ? el("p", { class: "why", html: inline(item.why) }) : null,
      item.text && !item.why ? el("p", { class: "why", html: inline(item.text) }) : null,
      item.verdict ? el("p", { class: "verdict", html: "<b>" + esc(opts.verdictLabel || "Verdict") + "</b>" + inline(item.verdict) }) : null,
      item.action ? el("div", { class: "action-row" }, [actionChip(item), item.flip_if ? el("span", { class: "muted", style: "font-size:12px" }, ["Flips if " + item.flip_if]) : null]) : null
    ]);
  }
  function cardSection(title, items, opts) {
    if (!items || !items.length) return null;
    return el("section", {}, [
      el("div", { class: "section-head" }, [el("h2", {}, [title]), el("span", { class: "count" }, [items.length + (items.length === 1 ? " name" : " names")])]),
      el("div", { class: "cards" }, items.map(it => recCard(it, opts)))
    ]);
  }

  /* ---------- views ---------- */
  const views = {
    async home(main, site, manifest) {
      const wk = manifest.currentWeek || site.currentWeek;
      const hero = el("div", { class: "hero" }, [
        el("div", { class: "eyebrow" }, [wk ? `${site.season} season · Week ${wk} board` : `${site.season} season`]),
        el("h1", {}, [site.tagline || "What the kitchen is serving this week"]),
        el("p", { class: "dek" }, [site.dek || "Rankings, waivers, lineup calls, trades and Sunday pivots, cooked from one projection model and posted on X all week."]),
      ]);
      main.append(hero);

      const day = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short" }).format(new Date());
      const sched = el("div", { class: "schedule", role: "list" }, (site.schedule || []).map(s => el("div", { class: s.day && s.day.slice(0, 3) === day ? "now" : "", role: "listitem" }, [
        el("span", { class: "d" }, [s.day]),
        ...(s.services || []).map(sv => el("span", { class: "svc" }, [el("span", { class: "s" }, [SERIES[sv.series] ? SERIES[sv.series].name : sv.series]), el("span", { class: "t" }, [sv.time])]))
      ])));
      main.append(el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["Service schedule"]), el("span", { class: "count" }, ["all times ET"])]), sched]));

      const board = el("div", { class: "board" });
      const latest = el("section", { class: "latest" }, [el("div", { class: "section-head" }, [el("h2", {}, ["Latest from the kitchen"])])]);
      const pieces = (manifest.pieces || []).slice().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 8);
      if (!pieces.length) latest.append(el("div", { class: "empty" }, ["The kitchen is prepping. First service drops this week."]));
      pieces.forEach(p => latest.append(el("article", { class: "piece" }, [
        el("div", { class: "eyebrow" }, [(SERIES[p.series] ? SERIES[p.series].name : p.series) + " · Week " + p.week]),
        el("div", { class: "title" }, [el("a", { href: SERIES[p.series] ? SERIES[p.series].page + "?week=" + p.week + (SAMPLE ? "&sample=1" : "") : "#" }, [p.title])]),
        p.dek ? el("p", { class: "dek" }, [p.dek]) : null,
        el("div", { class: "meta" }, [el("span", {}, [fmtET(p.updatedAt || p.publishedAt)])])
      ])));
      board.append(latest);

      const feed = await tryJSON("posts.json");
      const side = el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["From the pass"]), el("a", { href: "pass.html" + (SAMPLE ? "?sample=1" : ""), class: "count" }, ["all posts"])])]);
      side.append(feedList((feed && feed.posts) || [], 6));
      board.append(side);
      main.append(board);
    },

    async menu(main, site, manifest) {
      await loadSeries(main, site, manifest, "menu", (m, piece) => {
        const pos = piece.data && piece.data.positions || {};
        const keys = Object.keys(pos);
        if (!keys.length) { m.append(el("div", { class: "empty" }, ["No rankings in this menu yet."])); return; }
        const tabs = el("div", { class: "tabs", role: "tablist" });
        const body = el("div");
        const off = piece.data.off_menu || {};
        const show = k => {
          tabs.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", b.dataset.k === k ? "true" : "false"));
          body.replaceChildren(tieredList(pos[k] || [], { menu: true }));
          if (off[k] && off[k].length) body.append(el("div", { class: "tier" }, [
            el("div", { class: "tier-head" }, [el("span", { class: "n", style: "color:var(--mute)" }, ["Off the menu"]), el("span", { class: "rule" })]),
            el("ul", { class: "rows" }, off[k].map((p, i) => playerRow(Object.assign({ rank: "", flag: p.flag || "OUT" }, p), i)))
          ]));
          try { history.replaceState(null, "", "#" + k); } catch (e) {}
        };
        keys.forEach(k => tabs.append(el("button", { role: "tab", "data-k": k, onclick: () => show(k) }, [k])));
        m.append(el("div", { class: "toolbar" }, [tabs]), body);
        const want = location.hash.replace("#", "").toUpperCase();
        show(keys.includes(want) ? want : keys[0]);
      });
    },

    async market(main, site, manifest) {
      await loadSeries(main, site, manifest, "market", (m, piece) => {
        const d = piece.data || {};
        [cardSection("Priority adds", d.adds, { prio: true }),
         cardSection("Stashes", d.stashes),
         cardSection("Cut bait", d.drops, { verdictLabel: "Call" }),
         d.mnf && d.mnf.length ? el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["Monday night reactions"])]), el("div", { class: "prose", html: d.mnf.map(x => "<p>" + inline(x.text || x) + "</p>").join("") })]) : null
        ].forEach(s => s && m.append(s));
      });
    },

    async butcher(main, site, manifest) {
      await loadSeries(main, site, manifest, "butcher", (m, piece) => {
        const d = piece.data || {};
        m.append(el("div", { class: "split" }, [
          cardSection("Trade for", d.buy, { verdictLabel: "Offer" }) || el("div"),
          cardSection("Trade away", d.sell, { verdictLabel: "Ask" }) || el("div")
        ]));
      });
    },

    async heat(main, site, manifest) {
      await loadSeries(main, site, manifest, "heat", (m, piece) => {
        const d = piece.data || {};
        (d.risers || []).forEach(x => { x.tag = x.tag || "Rising"; x.tag_class = "up"; });
        (d.fallers || []).forEach(x => { x.tag = x.tag || "Cooling"; x.tag_class = "down"; });
        m.append(el("div", { class: "split" }, [
          cardSection("Stove's on", d.risers, { verdictLabel: "Read" }) || el("div"),
          cardSection("Left to cool", d.fallers, { verdictLabel: "Read" }) || el("div")
        ]));
      });
    },

    async line(main, site, manifest) {
      await loadSeries(main, site, manifest, "line", (m, piece) => {
        const d = piece.data || {};
        [cardSection("Thursday night", d.tnf, { verdictLabel: "Call" }),
         cardSection("The week favors them", d.starts, { verdictLabel: "Call" }),
         cardSection("The week does not", d.sits, { verdictLabel: "Call" }),
         cardSection("Coin flips", d.coinflips, { verdictLabel: "Lean" })
        ].forEach(s => s && m.append(s));
      });
    },

    async prep(main, site, manifest) {
      await loadSeries(main, site, manifest, "prep", (m, piece) => {
        const d = piece.data || {};
        const rows = d.report || [];
        if (!rows.length) { m.append(el("div", { class: "empty" }, ["No designations logged yet."])); return; }
        const ul = el("ul", { class: "report" });
        rows.forEach(r => {
          const st = String(r.status || "").toUpperCase();
          const cls = { Q: "q", D: "d", O: "o", OUT: "o", IR: "ir", P: "up" }[st] || "neutral";
          ul.append(el("li", {}, [
            el("span", { class: "who" }, [r.player, el("span", { class: "team" }, [" " + [r.team, r.pos].filter(Boolean).join(" · ")]), el("span", { class: "pill " + cls }, [st || "—"]),
              el("span", { class: "practice", title: (r.practice || []).join(" / ") }, (r.practice || []).map(p => el("i", { class: p })))]),
            el("span", { class: "inj" }, [r.injury || ""]),
            (r.read || r.verdict) ? el("span", { class: "read", html: (r.read ? inline(r.read) + " " : "") + (r.verdict ? "<b>Call</b>" + inline(r.verdict) : "") }) : null,
            r.action ? el("span", { class: "read" }, [actionChip(r)]) : null
          ]));
        });
        m.append(el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["Designations"]), el("span", { class: "count" }, ["Wed · Thu · Fri practice"])]), ul]));
      });
    },

    async orderup(main, site, manifest) {
      await loadSeries(main, site, manifest, "orderup", (m, piece) => {
        const d = piece.data || {};
        (d.windows || []).forEach(w => {
          const sec = el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, [w.name]), el("span", { class: "count" }, [w.time || ""])])]);
          if (w.inactives && w.inactives.length) sec.append(el("ul", { class: "rows" }, w.inactives.map((p, i) => playerRow(Object.assign({ rank: "", flag: "OUT" }, p), i))));
          (w.pivots || []).forEach(pv => sec.append(el("div", { class: "pivot" }, [el("span", {}, [pv.out + " out"]), el("span", { class: "arrow" }, ["pivot to"]), el("span", { class: "in" }, [pv.in]), pv.note ? el("span", { class: "muted", style: "grid-column:1/-1;font-size:13px" }, [pv.note]) : null])));
          m.append(sec);
        });
        if (d.updates && d.updates.length) {
          m.append(el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["Live updates"])]),
            el("ul", { class: "timeline" }, d.updates.map(u => el("li", {}, [el("div", { class: "t" }, [u.time]), el("div", { html: inline(u.text) })])))]));
        }
      });
    },

    async leftovers(main, site, manifest) {
      await loadSeries(main, site, manifest, "leftovers", (m, piece) => {
        const d = piece.data || {};
        if (d.takeaways && d.takeaways.length) m.append(el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["Takeaways"])]),
          el("ol", { class: "prose", style: "padding-left:1.2em" }, d.takeaways.map(t => el("li", {}, [
            el("span", { html: "<strong>" + esc(t.headline) + "</strong> " + inline(t.text) }),
            (t.actions || []).length ? el("div", { class: "action-row" }, t.actions.map(a => el("span", { class: "action-who" }, [el("span", { class: "muted" }, [a.player + ": "]), actionChip(a)]))) : null
          ])))]));
        if (d.usage && d.usage.length) m.append(el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["Usage notes"]), el("span", { class: "count" }, ["snaps · routes · targets · carries"])]),
          el("div", { class: "cards" }, d.usage.map(u => recCard(Object.assign({}, u, { why: u.read }), {})))]));
        (d.overreactions || []).forEach(o => { o.tag = o.verdict === "buy" ? "Real" : o.verdict === "sell" ? "Noise" : (o.tag || ""); o.tag_class = o.verdict === "buy" ? "up" : "down"; });
        const ov = cardSection("Overreactions, checked", (d.overreactions || []).map(o => Object.assign({}, o, { player: o.take, team: o.player, pos: null, verdict: null })), {});
        if (ov) m.append(ov);
      });
    },

    async pass(main, site, manifest) {
      pageHead(main, { eyebrow: "From the pass", title: "Everything the kitchen posted", dek: "Threads and posts as they went out on X, newest first." });
      const notes = piecesFor(manifest, "notes")[0];
      if (notes) {
        const n = await tryJSON(notes.path);
        if (n && n.data && n.data.items && n.data.items.length) {
          main.append(el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["Kitchen notes"]), el("span", { class: "count" }, [fmtET(n.updatedAt)])]),
            el("ul", { class: "timeline" }, n.data.items.slice(0, 12).map(it => el("li", {}, [el("div", { class: "t" }, [fmtET(it.at)]), el("div", { html: inline(it.text) + (it.url ? ' <a href="' + esc(it.url) + '" target="_blank" rel="noopener">view</a>' : "") }), it.action ? el("div", { class: "action-row" }, [it.player ? el("span", { class: "muted" }, [it.player + ": "]) : null, actionChip(it)]) : null])))]));
        }
      }
      const feed = await tryJSON("posts.json");
      main.append(el("section", {}, [el("div", { class: "section-head" }, [el("h2", {}, ["Posts"])]), feedList((feed && feed.posts) || [], 100)]));
    },

    async about(main, site) {
      pageHead(main, { eyebrow: "About", title: site.brand || "Fantasy Kitchen", dek: site.about_dek || "" });
      main.append(el("div", { class: "prose", html: md(site.about_md || "") }));
    }
  };

  function feedList(posts, limit) {
    const ul = el("ul", { class: "feed" });
    const list = posts.slice().sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt))).slice(0, limit);
    if (!list.length) ul.append(el("li", { class: "empty" }, ["Nothing has gone out yet."]));
    list.forEach(p => ul.append(el("li", {}, [
      el("div", { class: "t" }, [el("span", {}, [(SERIES[p.series] ? SERIES[p.series].name : p.series || "Post") + (p.week ? " · Week " + p.week : "")]), el("span", {}, [fmtET(p.postedAt)])]),
      el("div", { class: "text" }, [p.preview || ""]),
      el("div", { class: "more" }, [el("a", { href: p.url, target: "_blank", rel: "noopener" }, [p.kind === "thread" ? "Read the thread (" + (p.count || "") + ")" : "View on X"])])
    ])));
    return ul;
  }

  async function boot() {
    const app = $("#app");
    const view = app.dataset.view || "home";
    let site = {}, manifest = { pieces: [] };
    try { site = await getJSON("site.json"); } catch (e) { console.error(e); }
    try { manifest = await getJSON("index.json"); } catch (e) { console.error(e); }
    const main = shell(site, view);
    if (SAMPLE) main.append(el("div", { class: "notice", style: "margin-bottom:18px" }, ["Sample data. This is a preview of the layout, not real rankings."]));
    try {
      await (views[view] || views.home)(main, site, manifest);
    } catch (e) {
      console.error(e);
      main.append(el("div", { class: "empty" }, ["Something in the kitchen fell over loading this page. Refresh, or try again in a minute."]));
    }
    document.title = (view === "home" ? "" : (SERIES[view] ? SERIES[view].name + " · " : "")) + (site.brand || "Fantasy Kitchen");
  }
  boot();
})();
