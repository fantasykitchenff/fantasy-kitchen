#!/usr/bin/env python3
"""Fantasy Kitchen pipeline tool.

Subcommands
  week [--finished] [--date ISO]      print the content week (Tue..Mon cycle, Eastern)
  when "Tue 07:20"                     print the UTC timestamp for a weekday+Eastern time in the content week (also: now, +6h, ISO)
  validate                             validate data files, queue items and copy standards (rank language and one player per line from 2026-10-01)
  manifest                             rebuild docs/data/index.json from data files
  queue add ...                        add a post/thread to queue/pending
  queue list [--due] [--json]          list pending items (optionally only those due now)
  queue mark-posted --id ID --url URL  move an item to queue/posted and record it in the site feed
  queue mark-failed --id ID --reason R increment attempts; after 3 failures the item is parked
  queue expire                         park items past their not-after time
  log "message"                        append a dated line to kitchen/log.md
  feed add --series reply --url U --text T   record a post made outside the queue (replies) in the site feed
  ledger --file PATH                   apply a poster ledger (posted / failed / reply lines) sent to FK Kitchen
  site-url                             print the site base URL

Run from anywhere inside the repo. Python 3.9+, no third-party packages.
"""
import argparse, json, os, re, sys, glob, datetime as dt, uuid, shutil
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
SEASON = 2026
WEEK1_SUNDAY = dt.date(2026, 9, 13)   # Week 1 Sunday of the 2026 season (kickoff Wed Sept 9)
WEEKS = 18
SERIES = ["menu", "market", "butcher", "heat", "line", "prep", "orderup", "leftovers", "notes"]
EARLIEST_POST_ET = dt.time(10, 0)   # nothing posts before 10:00 AM Eastern, ever
LAST_POSTER_RUN_ET = dt.time(20, 30)  # the poster's last run of the day starts at 8:25 PM Eastern
POST_LIMIT = 275          # characters, links counted as 23
LINK_LEN = 23

def repo_root():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, ".."))
    if not os.path.isdir(os.path.join(root, "docs", "data")):
        sys.exit("fk.py: cannot find repo root (expected docs/data next to tools/)")
    return root

ROOT = repo_root()
DATA = os.path.join(ROOT, "docs", "data")
QUEUE = os.path.join(ROOT, "queue")

def now_utc():
    return dt.datetime.now(dt.timezone.utc)

def iso(d):
    return d.astimezone(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def parse_iso(s):
    if not s:
        return None
    s = s.replace("Z", "+00:00")
    d = dt.datetime.fromisoformat(s)
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")

# ---------------------------------------------------------------- week
def content_week(when=None, finished=False):
    """Content week: Tuesday 00:00 ET through Monday 23:59 ET belongs to the week whose Sunday is in that window."""
    when = when or dt.datetime.now(ET)
    if when.tzinfo is None:
        when = when.replace(tzinfo=ET)
    when = when.astimezone(ET)
    d = when.date()
    # find the Sunday of the window containing d: window runs Tue(d-5) .. Mon(d+1) relative to Sunday
    dow = d.weekday()  # Mon=0 .. Sun=6
    if dow == 6:
        sunday = d
    elif dow == 0:
        sunday = d - dt.timedelta(days=1)
    else:  # Tue..Sat -> upcoming Sunday
        sunday = d + dt.timedelta(days=(6 - dow))
    week = (sunday - WEEK1_SUNDAY).days // 7 + 1
    if finished:
        week -= 1
        sunday = sunday - dt.timedelta(days=7)
    week = max(1, min(WEEKS, week))
    return {
        "season": SEASON,
        "week": week,
        "tuesday": str(sunday - dt.timedelta(days=5)),
        "thursday": str(sunday - dt.timedelta(days=3)),
        "sunday": str(sunday),
        "monday": str(sunday + dt.timedelta(days=1)),
        "now_et": when.strftime("%Y-%m-%d %H:%M %Z"),
    }

WEEKDAY_OFFSET = {"tue": 0, "wed": 1, "thu": 2, "fri": 3, "sat": 4, "sun": 5, "mon": 6}

def parse_when(s, finished=False):
    """Accept an ISO timestamp, 'now', '+Nh', or 'Tue 07:20' (weekday + Eastern time inside the content week)."""
    if not s:
        return None
    s = s.strip()
    if s.lower() == "now":
        return iso(now_utc())
    m = re.match(r"^\+(\d+)h$", s)
    if m:
        return iso(now_utc() + dt.timedelta(hours=int(m.group(1))))
    m = re.match(r"^(mon|tue|wed|thu|fri|sat|sun)\w*\s+(\d{1,2}):(\d{2})$", s, re.I)
    if m:
        wk = content_week(finished=finished)
        base = dt.date.fromisoformat(wk["tuesday"]) + dt.timedelta(days=WEEKDAY_OFFSET[m.group(1).lower()[:3]])
        local = dt.datetime(base.year, base.month, base.day, int(m.group(2)), int(m.group(3)), tzinfo=ET)
        return iso(local)
    return iso(parse_iso(s))

def post_floor(ts):
    """Push a UTC ISO timestamp forward to 10:00 AM Eastern if it falls earlier that day, or to 10:00 AM
    the next day if it falls after the last poster run (8:25 PM), so no item waits overnight on its clock."""
    d = parse_iso(ts).astimezone(ET)
    if d.time() > LAST_POSTER_RUN_ET:
        d = d + dt.timedelta(days=1)
        d = d.replace(hour=0, minute=0, second=0, microsecond=0)
    if d.time() < EARLIEST_POST_ET:
        d = d.replace(hour=EARLIEST_POST_ET.hour, minute=EARLIEST_POST_ET.minute, second=0, microsecond=0)
    return iso(d)

def posting_hours(now):
    return now.astimezone(ET).time() >= EARLIEST_POST_ET

def cmd_when(a):
    print(parse_when(a.when, a.finished))

def cmd_week(a):
    when = parse_iso(a.date).astimezone(ET) if a.date else None
    print(json.dumps(content_week(when, a.finished), indent=2))


# ---------------------------------------------------------------- the day's clock
# One scheduled task, one payload ("job: daily"), fired at every slot below. FK Kitchen
# runs `fk.py clock` and does the job it names. Times are Eastern; a slot matches when
# the run starts within CLOCK_WINDOW_MIN of it. Order Up keeps its own Sunday tasks.
CLOCK_SLOTS = [
    ("mon", "11:00", "series leftovers"),
    ("tue", "11:00", "series market-run"),
    ("wed", "11:00", "series menu"),
    ("thu", "11:00", "series on-the-line"),
    ("tue", "14:00", "series butcher-heat"),
    ("fri", "17:00", "series prep-notes"),
    ("*",   "12:00", "series kitchen-notes"),
    ("*",   "18:00", "series kitchen-notes"),
]
CLOCK_WINDOW_MIN = 30
DAY_ABBR = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

def clock_job(now_et):
    day = DAY_ABBR[now_et.weekday()]
    best = None
    for d, hm, job in CLOCK_SLOTS:
        if d != "*" and d != day:
            continue
        h, m = (int(x) for x in hm.split(":"))
        slot = now_et.replace(hour=h, minute=m, second=0, microsecond=0)
        off = abs((now_et - slot).total_seconds()) / 60
        if off <= CLOCK_WINDOW_MIN and (best is None or off < best[0]):
            best = (off, d, hm, job)
    if best is None:
        return {"job": "none", "now": now_et.strftime("%a %H:%M ET")}
    return {"job": best[3], "slot": f"{'Daily' if best[1] == '*' else best[1].title()} {best[2]}", "now": now_et.strftime("%a %H:%M ET")}

def cmd_clock(a):
    now = parse_iso(a.at).astimezone(ET) if a.at else dt.datetime.now(ET)
    print(json.dumps(clock_job(now)))

# ---------------------------------------------------------------- standards checks
EM_DASH = re.compile(r"[—–]")
ARROWS = re.compile(r"(->|=>|<-|[←-⇿➡⬅-⬇⤴⤵])")
EMOJI = re.compile(r"[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]")
HASHTAG = re.compile(r"(^|\s)(#\w+)")
HOOK_CLOSERS = ["let's dive in", "let's look into it", "let's get to it", "let's get into it", "let's go"]
HOOK_CLOSER_RE = re.compile(r"(let's dive in|let's look into it|let's get to it|let's get into it|let's go)[.!]?(\s+#\w+)*\s*$", re.I)
AI_TELLS = re.compile(r"\b(notably|importantly|it's worth noting|it is worth noting|in terms of|a testament to|landscape|leverage|narrative|delve|elevate|robust|nuanced|moving forward|in the realm of|it's important to remember|let's unpack|buckle up|here's the thing)\b", re.I)

def site_handle():
    try:
        return (load(os.path.join(DATA, "site.json")).get("handle") or "").lstrip("@")
    except Exception:
        return ""

def official_hashtags():
    path = os.path.join(ROOT, "kitchen", "hashtags.json")
    try:
        d = load(path)
        return {v.lower(): k for k, v in (d.get("tags") or {}).items()}
    except Exception:
        return {}
OFFICIAL = official_hashtags()
BANNED_WORDS = re.compile(r"\b(genuinely|honestly|straightforward|worth noting|at the end of the day)\b", re.I)
PROJ_NUMBER = re.compile(r"\b(project(?:s|ed|ion)?|model has|my model|expected)\b[^.\n]{0,40}?\b\d+(\.\d+)?\s*(pts|points|fantasy points|yards|yds|tds?)\b", re.I)
DECIMAL_POINTS = re.compile(r"\b\d{1,2}\.\d\s*(pts|points|fantasy points)\b", re.I)
ANALYST_NAMES = [
    "Matthew Berry", "Berry", "Harmon", "Zachariason", "JJ Zach", "Winks", "Del Don", "Justin Boone", "Boone",
    "Dwain", "Andy Holloway", "Jason Moore", "Mike Wright", "Footballers", "Footballguys", "Establish the Run", "ETR",
    "4for4", "FantasyPros", "Late Round", "Rotoworld", "Rotoballer", "PFF grade", "Yahoo says", "ESPN says",
    "Kendall", "Sigmund Bloom", "Bloom", "Evan Silva", "Silva", "Pat Kerrane", "Kerrane", "Dan Titus", "Scott Pianowski",
    "Pianowski", "Field Yates", "Yates", "Mike Clay", "Clay's", "Tristan Cockcroft", "Cockcroft", "Eric Karabell", "Karabell",
    "Dalton Del Don", "Hayden Winks", "Adam Levitan", "Levitan", "Peter Overzet", "Overzet", "Josh Norris", "Norris",
]
ANALYST_RE = re.compile(r"\b(" + "|".join(re.escape(n) for n in sorted(ANALYST_NAMES, key=len, reverse=True)) + r")\b")

def check_text(text, where, errors, warnings):
    if not isinstance(text, str) or not text:
        return
    if EM_DASH.search(text):
        errors.append(f"{where}: em dash or en dash")
    if ARROWS.search(text):
        errors.append(f"{where}: arrow")
    if EMOJI.search(text):
        errors.append(f"{where}: emoji")
    for m in HASHTAG.finditer(text):
        if m.group(2).lower() not in OFFICIAL:
            errors.append(f"{where}: hashtag {m.group(2)} is not an official team hashtag (kitchen/hashtags.json)")
    m = AI_TELLS.search(text)
    if m:
        errors.append(f"{where}: reads like a bot: '{m.group(0)}'")
    m = BANNED_WORDS.search(text)
    if m:
        errors.append(f"{where}: banned word '{m.group(0)}'")
    m = ANALYST_RE.search(text)
    if m:
        errors.append(f"{where}: analyst or outlet name '{m.group(0)}' (own the take)")
    if PROJ_NUMBER.search(text) or DECIMAL_POINTS.search(text):
        errors.append(f"{where}: looks like a projected number; publish ranks and tiers only")

def walk_strings(obj, path, fn):
    if isinstance(obj, str):
        fn(obj, path)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("url", "path", "link", "id", "at", "publishedAt", "updatedAt", "postedAt", "scheduledFor", "notAfter", "createdAt"):
                continue
            walk_strings(v, f"{path}.{k}", fn)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk_strings(v, f"{path}[{i}]", fn)

def post_length(text):
    urls = re.findall(r"https?://\S+", text)
    n = len(text)
    for u in urls:
        n += LINK_LEN - len(u)
    return n

# ---------------------------------------------------------------- actions
ACTIONS = ["START", "FLEX", "SIT", "STREAM", "CLAIM", "ADD", "STASH", "DROP", "HOLD", "TRADE_FOR", "TRADE_AWAY", "MONITOR", "PIVOT"]
ACTION_NEEDS = {"CLAIM": "faab", "ADD": "faab", "STASH": "faab", "TRADE_FOR": "price", "TRADE_AWAY": "price", "MONITOR": "watch", "PIVOT": "to"}
ACTION_WORDS = re.compile(r"\b(start|sit|bench|flex|stream|claim|add|pick up|pickup|drop|cut|hold|trade for|trade away|sell|buy|stash|monitor|watch|pivot|spend|offer|ask for|keep)\b", re.I)
FAAB_RE = re.compile(r"^\d{1,3}(\s*-\s*\d{1,3})?\s*%$")

# ---------------------------------------------------------------- owner rules of 2026-10-01
# Rank language: a lineup call is spoken as the player's Menu rank and its tier, never as a start command.
# One player per line: a thread post gives each player his own line; a line names a second player only to
# compare or to pivot, never a third. Both apply to queue items created, pieces published and notes items
# dated on or after RULE_CUTOFF; earlier published pieces and queued posts are left as they are.
RULE_CUTOFF = dt.datetime(2026, 10, 1, 4, 0, tzinfo=dt.timezone.utc)
START_CMD = re.compile(r"\b(start(?:ing)?\s+(?:him|them)|start\s+as\s+an?\b|is\s+a\s+start\b|must[- ]start|i'?m\s+starting)\b", re.I)
RANK_WORDS = re.compile(r"\b((?:qb|rb|wr|te)\d{1,2}|top[- ]?\d+|borderline|flex play|dart throw|streamer|active|for me|on the menu|high-end|low-end|outside my top)\b", re.I)
ACTION_OR_RANK = re.compile("(?:%s)|(?:%s)" % (ACTION_WORDS.pattern, RANK_WORDS.pattern), re.I)
NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}
_week_names = {}

def after_cutoff(ts):
    d = parse_iso(ts) if ts else None
    return bool(d) and d >= RULE_CUTOFF

def week_player_names(week):
    """(full name, last name) for every player named in the week's piece files (player, to, in, out fields)."""
    try:
        wk = int(week)
    except (TypeError, ValueError):
        return []
    if wk in _week_names:
        return _week_names[wk]
    names = set()
    def grab(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("player", "to", "in", "out") and isinstance(v, str) and v.strip():
                    names.add(v.strip())
                else:
                    grab(v)
        elif isinstance(o, list):
            for v in o:
                grab(v)
    for path in glob.glob(os.path.join(DATA, str(SEASON), f"week-{wk:02d}", "*.json")):
        try:
            grab(load(path).get("data") or {})
        except Exception:
            pass
    pairs = []
    for n in names:
        toks = n.split()
        while len(toks) > 1 and toks[-1].lower().strip(".") in NAME_SUFFIXES:
            toks.pop()
        if len(toks) < 2:
            continue
        last = toks[-1].strip(".,'")
        if len(last) >= 3:
            pairs.append((n, last))
    _week_names[wk] = pairs
    return pairs

def players_in(text, pairs):
    """The distinct players a line names: a full name in any case, or a capitalized last name."""
    found = set()
    for full, last in pairs:
        if re.search(r"(?<!\w)" + re.escape(full) + r"(?!\w)", text, re.I) or re.search(r"(?<![\w'])" + re.escape(last) + r"(?![\w'])", text):
            found.add(last.lower())
    return found

def check_start_commands(text, where, errors, pairs):
    """Rule 1: no start commands anywhere; a lineup call gives the Menu rank and its tier."""
    if not isinstance(text, str) or not text:
        return
    m = START_CMD.search(text)
    if not m and pairs:
        alts = "|".join(sorted({re.escape(x) for full, last in pairs for x in (full, last)}, key=len, reverse=True))
        m = re.search(r"\b[Ss]tart(?:ing)?\s+(?:" + alts + r")(?!\w)", text)
    if m:
        errors.append(f"{where}: start command '{m.group(0)}' (give the Menu rank and its tier instead: 'RB18 for me this week, an RB2')")

def check_action(item, where, errors, allowed=None):
    """Every player-bearing item needs an action from the vocabulary plus its companion field."""
    a = item.get("action")
    if not a:
        errors.append(f"{where}: missing action (one of {', '.join(ACTIONS)})"); return
    a = str(a).upper().replace(" ", "_")
    if a not in ACTIONS:
        errors.append(f"{where}: unknown action '{item.get('action')}'"); return
    if allowed and a not in allowed:
        errors.append(f"{where}: action {a} is not one of {', '.join(allowed)} for this list")
    need = ACTION_NEEDS.get(a)
    if need and not str(item.get(need) or "").strip():
        errors.append(f"{where}: action {a} needs '{need}'")
    if need == "faab" and item.get("faab") and not FAAB_RE.match(str(item["faab"]).strip()):
        errors.append(f"{where}: faab '{item['faab']}' should look like '25-35%' or '2%'")
    if a == "HOLD" and not str(item.get("why") or item.get("read") or item.get("note") or "").strip():
        errors.append(f"{where}: HOLD needs a reason (why/read/note)")

# ---------------------------------------------------------------- validate
REQUIRED_ENVELOPE = ["series", "season", "week", "title", "dek", "publishedAt", "updatedAt", "data"]
VERDICT_LISTS = {
    "market": ["adds", "stashes", "drops"],
    "butcher": ["buy", "sell"],
    "heat": ["risers", "fallers"],
    "line": ["tnf", "starts", "sits", "coinflips"],
}
ALLOWED_ACTIONS = {
    ("market", "adds"): ["CLAIM", "ADD", "STREAM"], ("market", "stashes"): ["STASH"], ("market", "drops"): ["DROP"],
    ("butcher", "buy"): ["TRADE_FOR"], ("butcher", "sell"): ["TRADE_AWAY"],
    ("heat", "risers"): ["START", "FLEX", "TRADE_FOR", "CLAIM", "ADD", "HOLD", "STASH"], ("heat", "fallers"): ["SIT", "TRADE_AWAY", "DROP", "MONITOR", "HOLD"],
    ("line", "tnf"): ["START", "FLEX", "SIT", "STREAM"], ("line", "starts"): ["START", "FLEX", "STREAM"], ("line", "sits"): ["SIT"], ("line", "coinflips"): ["START", "FLEX", "SIT", "STREAM"],
}

def validate_piece(path, errors, warnings):
    try:
        p = load(path)
    except Exception as e:
        errors.append(f"{path}: invalid JSON ({e})"); return
    rel = os.path.relpath(path, ROOT)
    for k in REQUIRED_ENVELOPE:
        if k not in p:
            errors.append(f"{rel}: missing '{k}'")
    if p.get("series") not in SERIES:
        errors.append(f"{rel}: unknown series '{p.get('series')}'")
    m = re.search(r"week-(\d\d)/(\w+)\.json$", rel)
    if m:
        if int(m.group(1)) != p.get("week"):
            errors.append(f"{rel}: folder week {m.group(1)} does not match 'week' {p.get('week')}")
        if m.group(2) != p.get("series"):
            errors.append(f"{rel}: file name does not match series")
    walk_strings(p, rel, lambda s, w: check_text(s, w, errors, warnings))
    d = p.get("data") or {}
    s = p.get("series")
    recent = after_cutoff(p.get("publishedAt"))
    pairs = week_player_names(p.get("week")) if (recent or s == "notes") else []
    if recent:
        walk_strings(p, rel, lambda t, w: check_start_commands(t, w, errors, pairs))
    if s == "menu":
        pos = d.get("positions") or {}
        if not pos:
            errors.append(f"{rel}: menu has no positions")
        for k, rows in pos.items():
            last_tier = 0
            for i, r in enumerate(rows):
                for f in ("player", "team", "pos"):
                    if not r.get(f):
                        errors.append(f"{rel}: {k}[{i}] missing {f}")
                t = r.get("tier")
                if t is None or not (1 <= int(t) <= 6):
                    errors.append(f"{rel}: {k}[{i}] tier must be 1..6")
                elif int(t) < last_tier:
                    errors.append(f"{rel}: {k}[{i}] tiers must be non-decreasing")
                else:
                    last_tier = int(t)
                if r.get("rank") != i + 1:
                    warnings.append(f"{rel}: {k}[{i}] rank {r.get('rank')} != position {i+1}")
                fl = str(r.get("flag") or "").upper()
                if fl in ("O", "OUT", "IR"):
                    errors.append(f"{rel}: {k}[{i}] {r.get('player')} is ruled out; remove from rankings instead of flagging")
                check_action(r, f"{rel}: {k}[{i}] {r.get('player')}", errors, allowed=["START", "FLEX", "SIT", "STREAM"])
        for k, rows in (d.get("off_menu") or {}).items():
            for i, r in enumerate(rows):
                check_action(r, f"{rel}: off_menu.{k}[{i}] {r.get('player')}", errors, allowed=["PIVOT", "SIT"])
        for i, r in enumerate(d.get("specials") or []):
            check_action(r, f"{rel}: specials[{i}] {r.get('player')}", errors, allowed=["START", "FLEX", "STREAM"])
    elif s in VERDICT_LISTS:
        for key in VERDICT_LISTS[s]:
            for i, r in enumerate(d.get(key) or []):
                if not r.get("player"):
                    errors.append(f"{rel}: {key}[{i}] missing player")
                if not r.get("verdict"):
                    errors.append(f"{rel}: {key}[{i}] {r.get('player')} has no verdict")
                if s == "heat" and not r.get("stat"):
                    errors.append(f"{rel}: {key}[{i}] {r.get('player')} needs the backing stat")
                if s == "market" and key == "adds" and not r.get("faab"):
                    errors.append(f"{rel}: adds[{i}] {r.get('player')} needs a FAAB range")
                allowed = ALLOWED_ACTIONS.get((s, key))
                check_action(r, f"{rel}: {key}[{i}] {r.get('player')}", errors, allowed=allowed)
        for i, m in enumerate(d.get("mnf") or []):
            txt = m.get("text") if isinstance(m, dict) else m
            if txt and not ACTION_OR_RANK.search(str(txt)):
                errors.append(f"{rel}: mnf[{i}] names no action or rank call")
    elif s == "prep":
        for i, r in enumerate(d.get("report") or []):
            if not r.get("player") or not r.get("status"):
                errors.append(f"{rel}: report[{i}] needs player and status")
            if not r.get("verdict"):
                errors.append(f"{rel}: report[{i}] {r.get('player')} has no verdict")
            check_action(r, f"{rel}: report[{i}] {r.get('player')}", errors, allowed=["START", "FLEX", "SIT", "PIVOT", "MONITOR", "STREAM"])
    elif s == "orderup":
        if not d.get("windows"):
            errors.append(f"{rel}: orderup needs windows")
        for wi, w in enumerate(d.get("windows") or []):
            for i, r in enumerate(w.get("inactives") or []):
                check_action(r, f"{rel}: windows[{wi}].inactives[{i}] {r.get('player')}", errors, allowed=["PIVOT", "SIT"])
        for i, u in enumerate(d.get("updates") or []):
            if u.get("text") and not ACTION_OR_RANK.search(str(u["text"])):
                errors.append(f"{rel}: updates[{i}] names no action or rank call")
    elif s == "leftovers":
        if not d.get("takeaways"):
            errors.append(f"{rel}: leftovers needs takeaways")
        for i, t in enumerate(d.get("takeaways") or []):
            acts = t.get("actions") or []
            if not acts:
                errors.append(f"{rel}: takeaways[{i}] has no actions (one per player named)")
            for j, a in enumerate(acts):
                if not a.get("player"):
                    errors.append(f"{rel}: takeaways[{i}].actions[{j}] missing player")
                check_action(a, f"{rel}: takeaways[{i}].actions[{j}] {a.get('player')}", errors)
        for i, u in enumerate(d.get("usage") or []):
            check_action(u, f"{rel}: usage[{i}] {u.get('player')}", errors)
        for i, o in enumerate(d.get("overreactions") or []):
            if o.get("verdict") not in ("buy", "sell"):
                errors.append(f"{rel}: overreactions[{i}] verdict must be 'buy' (real) or 'sell' (noise)")
            if not o.get("player"):
                errors.append(f"{rel}: overreactions[{i}] missing player")
            check_action(o, f"{rel}: overreactions[{i}] {o.get('player')}", errors)
    elif s == "notes":
        for i, it in enumerate(d.get("items") or []):
            if it.get("player"):
                check_action(it, f"{rel}: items[{i}] {it.get('player')}", errors)
            elif it.get("action"):
                errors.append(f"{rel}: items[{i}] has an action but no player")
            if not recent and after_cutoff(it.get("at")):
                check_start_commands(it.get("text"), f"{rel}: items[{i}].text", errors, pairs)
    for i, q in enumerate(p.get("posts") or []):
        if not q.get("id"):
            errors.append(f"{rel}: posts[{i}] missing id")

def validate_queue_item(path, errors, warnings):
    try:
        q = load(path)
    except Exception as e:
        errors.append(f"{path}: invalid JSON ({e})"); return
    rel = os.path.relpath(path, ROOT)
    for k in ("id", "series", "kind", "texts", "scheduledFor", "status"):
        if k not in q:
            errors.append(f"{rel}: missing '{k}'")
    sf = q.get("scheduledFor")
    if q.get("status") == "pending" and sf and parse_iso(sf).astimezone(ET).time() < EARLIEST_POST_ET:
        errors.append(f"{rel}: scheduledFor {sf} is before 10:00 AM ET (nothing posts before 10 AM Eastern)")
    texts = q.get("texts") or []
    if not texts:
        errors.append(f"{rel}: no texts")
    if q.get("series") != "reply" and q.get("kind") != "thread":
        errors.append(f"{rel}: everything but a reply goes out as a thread (kind: thread, 2 to 12 posts)")
    if q.get("kind") == "post" and len(texts) != 1:
        errors.append(f"{rel}: a post has exactly one text")
    if q.get("kind") == "thread" and not (2 <= len(texts) <= 12):
        errors.append(f"{rel}: a thread has 2 to 12 posts")
    if q.get("kind") == "thread" and texts and not HOOK_CLOSER_RE.search(texts[0].strip()):
        errors.append(f"{rel}: the hook (text[0]) must end with one of: " + ", ".join(HOOK_CLOSERS) + " (hashtags may follow it)")
    handle = site_handle()
    follow_re = re.compile(r"\bfollow\b", re.I)
    if texts:
        last = texts[-1]
        if not follow_re.search(last) or (handle and ("@" + handle).lower() not in last.lower()):
            errors.append(f"{rel}: the last post must tell people to follow @{handle or 'the account'} (the follow line goes before the link)")
    if q.get("kind") == "thread":
        for i, t in enumerate(texts[:-1]):
            tags = [m.group(2).lower() for m in HASHTAG.finditer(t)]
            if not tags:
                errors.append(f"{rel}: text[{i}] names no official team hashtag (every post that names a player or team carries its team's hashtag)")
            if len(tags) != len(set(tags)):
                errors.append(f"{rel}: text[{i}] repeats a hashtag")
            if len(tags) > 5:
                errors.append(f"{rel}: text[{i}] carries {len(tags)} hashtags; split the post")
    if after_cutoff(q.get("createdAt")):
        pairs = week_player_names(q.get("week"))
        for i, t in enumerate(texts):
            check_start_commands(t, f"{rel}.text[{i}]", errors, pairs)
        if q.get("kind") == "thread":
            for i, t in enumerate(texts[:-1]):
                if len(players_in(t, pairs)) >= 2 and "\n" not in t.strip():
                    errors.append(f"{rel}: text[{i}] names two or more players with no line break (one player per line)")
                for ln in t.split("\n"):
                    n = players_in(ln, pairs)
                    if len(n) >= 3:
                        errors.append(f"{rel}: text[{i}] has a line naming {len(n)} players ('{ln.strip()[:50]}'); one player per line, a second only to compare or pivot")
    for i, t in enumerate(texts):
        n = post_length(t)
        if n > POST_LIMIT:
            errors.append(f"{rel}: text[{i}] is {n} chars (limit {POST_LIMIT})")
        if not t.strip():
            errors.append(f"{rel}: text[{i}] is empty")
        if i < len(texts) - 1 and re.search(r"https?://", t):
            errors.append(f"{rel}: text[{i}] has a link; links go in the last post only")
        check_text(t, f"{rel}.text[{i}]", errors, warnings)
        if re.match(r"^\s*(\d+/\d*|a thread|thread)\b", t, re.I) or re.search(r"(^|\n|\s)(a thread|thread)[.!:]?\s*$", t, re.I) or re.search(r"\(\d+/\d+\)", t):
            errors.append(f"{rel}: text[{i}] uses a thread marker or counter (drop it; the first post stands alone)")
        if re.search(r"\d%", t):
            warnings.append(f"{rel}: text[{i}] uses '%'; posts say 'percent'")
        if i < len(texts) - 1 and not ACTION_OR_RANK.search(t):
            errors.append(f"{rel}: text[{i}] names no action or rank call (the Menu rank and tier, sit, claim with FAAB, drop, hold, trade for, trade away, monitor, pivot)")

def cmd_validate(a):
    errors, warnings = [], []
    for path in sorted(glob.glob(os.path.join(DATA, str(SEASON), "week-*", "*.json"))):
        validate_piece(path, errors, warnings)
    for path in sorted(glob.glob(os.path.join(QUEUE, "pending", "*.json"))):
        validate_queue_item(path, errors, warnings)
    for f in ("site.json", "index.json", "posts.json"):
        try:
            load(os.path.join(DATA, f))
        except Exception as e:
            errors.append(f"docs/data/{f}: invalid JSON ({e})")
    site = load(os.path.join(DATA, "site.json"))
    walk_strings({"about": site.get("about_md"), "dek": site.get("dek"), "tagline": site.get("tagline")}, "site.json", lambda s, w: check_text(s, w, errors, warnings))
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    print(f"{len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)

# ---------------------------------------------------------------- manifest
def cmd_manifest(a):
    pieces = []
    for path in sorted(glob.glob(os.path.join(DATA, str(SEASON), "week-*", "*.json"))):
        p = load(path)
        pieces.append({
            "series": p.get("series"), "week": p.get("week"),
            "path": os.path.relpath(path, DATA).replace(os.sep, "/"),
            "title": p.get("title"), "dek": p.get("dek"),
            "publishedAt": p.get("publishedAt"), "updatedAt": p.get("updatedAt") or p.get("publishedAt"),
        })
    pieces.sort(key=lambda x: (str(x["updatedAt"])), reverse=True)
    wk = content_week()
    manifest = {"season": SEASON, "currentWeek": wk["week"], "updatedAt": iso(now_utc()), "pieces": pieces}
    save(os.path.join(DATA, "index.json"), manifest)
    site_path = os.path.join(DATA, "site.json")
    site = load(site_path)
    if site.get("currentWeek") != wk["week"]:
        site["currentWeek"] = wk["week"]
        save(site_path, site)
    print(f"manifest: {len(pieces)} pieces, current week {wk['week']}")

# ---------------------------------------------------------------- queue
def site_url():
    site = load(os.path.join(DATA, "site.json"))
    return (site.get("site_url") or "").rstrip("/")

def cmd_site_url(a):
    print(site_url())

def cmd_queue_add(a):
    texts = load(a.texts_file) if a.texts_file else [a.text]
    if not isinstance(texts, list) or not all(isinstance(t, str) for t in texts):
        sys.exit("texts must be a JSON array of strings")
    texts = [t.strip() for t in texts]
    base = site_url()
    link = ""
    if a.link and not a.no_link:
        link = a.link if a.link.startswith("http") else (base + "/" + a.link.lstrip("/") if base else "")
        if link and link not in texts[-1]:
            texts[-1] = texts[-1].rstrip() + "\n\n" + link
    at = post_floor(parse_when(a.at) or iso(now_utc()))
    m = re.match(r"^\+(\d+)h$", (a.not_after or "").strip())
    # a relative --not-after counts from when the item may first post, not from when it was queued
    not_after = iso(parse_iso(at) + dt.timedelta(hours=int(m.group(1)))) if m else parse_when(a.not_after)
    if not_after and parse_iso(not_after) <= parse_iso(at):
        print(f"WARNING: not-after {not_after} is before the 10:00 AM ET posting floor ({at}); this item will expire unposted")
    wk = a.week if a.week else content_week()["week"]
    qid = a.id or f"{SEASON}w{int(wk):02d}-{a.series}-{a.kind}-{uuid.uuid4().hex[:4]}"
    item = {
        "id": qid, "series": a.series, "week": int(wk), "kind": a.kind, "texts": texts,
        "scheduledFor": at, "notAfter": not_after,
        "link": link or None, "status": "pending", "createdAt": iso(now_utc()),
        "attempts": 0, "postedAt": None, "url": None, "notes": a.notes,
    }
    path = os.path.join(QUEUE, "pending", qid + ".json")
    if os.path.exists(path):
        sys.exit(f"queue item {qid} already exists")
    errors, warnings = [], []
    save(path, item)
    validate_queue_item(path, errors, warnings)
    if errors:
        os.remove(path)
        for e in errors:
            print("ERROR:", e)
        sys.exit(1)
    print(qid)

def pending_items():
    items = []
    for path in sorted(glob.glob(os.path.join(QUEUE, "pending", "*.json"))):
        try:
            q = load(path); q["_path"] = path; items.append(q)
        except Exception:
            pass
    items.sort(key=lambda q: q.get("scheduledFor") or "")
    return items

def is_due(q, now):
    at = parse_iso(q.get("scheduledFor")) or now
    na = parse_iso(q.get("notAfter"))
    return posting_hours(now) and at <= now and (na is None or na > now) and q.get("status") == "pending"

def cmd_queue_list(a):
    now = now_utc()
    items = pending_items()
    if a.due:
        items = [q for q in items if is_due(q, now)]
    if a.json:
        out = [{k: v for k, v in q.items() if k != "_path"} for q in items]
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return
    if not items:
        print("no items" + (" due" if a.due else ""))
    for q in items:
        print(f"{q['id']:40s} {q.get('kind'):6s} at {q.get('scheduledFor')}  until {q.get('notAfter') or '-'}  posts={len(q.get('texts') or [])} status={q.get('status')} attempts={q.get('attempts', 0)}")

def move_to_posted(q, status, url=None):
    q["status"] = status
    q["url"] = url
    q["postedAt"] = iso(now_utc()) if status == "posted" else q.get("postedAt")
    src = q.pop("_path")
    dst = os.path.join(QUEUE, "posted", os.path.basename(src))
    save(dst, q)
    os.remove(src)

def record_post(q, url):
    feed_path = os.path.join(DATA, "posts.json")
    feed = load(feed_path) if os.path.exists(feed_path) else {"posts": []}
    feed["posts"] = [p for p in feed["posts"] if p.get("id") != q["id"]]
    first = (q.get("texts") or [""])[0]
    feed["posts"].append({
        "id": q["id"], "series": q.get("series"), "week": q.get("week"), "kind": q.get("kind"),
        "count": len(q.get("texts") or []), "postedAt": q.get("postedAt") or iso(now_utc()), "url": url,
        "preview": first[:280],
    })
    feed["posts"].sort(key=lambda p: p.get("postedAt") or "", reverse=True)
    save(feed_path, feed)
    # link the piece file
    for path in glob.glob(os.path.join(DATA, str(SEASON), "week-*", "*.json")):
        try:
            p = load(path)
        except Exception:
            continue
        changed = False
        for post in p.get("posts") or []:
            if post.get("id") == q["id"]:
                post["url"] = url; post["status"] = "posted"; post["kind"] = q.get("kind"); changed = True
        if changed:
            save(path, p)

def cmd_queue_mark_posted(a):
    for q in pending_items():
        if q["id"] == a.id:
            move_to_posted(q, "posted", a.url)
            record_post(q, a.url)
            print(f"posted {a.id}")
            return
    sys.exit(f"no pending item {a.id}")

def mark_failed(q, reason):
    q["attempts"] = int(q.get("attempts", 0)) + 1
    q.setdefault("failures", []).append({"at": iso(now_utc()), "reason": reason})
    if q["attempts"] >= 3:
        move_to_posted(q, "failed")
        print(f"parked {q['id']} after {q['attempts']} attempts")
    else:
        path = q.pop("_path"); save(path, q)
        print(f"failed {q['id']} (attempt {q['attempts']})")

def cmd_queue_mark_failed(a):
    for q in pending_items():
        if q["id"] == a.id:
            mark_failed(q, a.reason)
            return
    sys.exit(f"no pending item {a.id}")

def cmd_queue_expire(a):
    now = now_utc(); n = 0
    for q in pending_items():
        na = parse_iso(q.get("notAfter"))
        if na and na <= now:
            move_to_posted(q, "expired"); n += 1
    print(f"expired {n}")

# ---------------------------------------------------------------- feed
def feed_add(series, kind, url, text, week=None, pid=None, note=None):
    feed_path = os.path.join(DATA, "posts.json")
    feed = load(feed_path) if os.path.exists(feed_path) else {"posts": []}
    wk = week if week else content_week()["week"]
    pid = pid or f"{SEASON}w{int(wk):02d}-{series}-{kind}-{uuid.uuid4().hex[:4]}"
    feed["posts"] = [p for p in feed["posts"] if p.get("id") != pid]
    feed["posts"].append({"id": pid, "series": series, "week": int(wk), "kind": kind, "count": 1,
                          "postedAt": iso(now_utc()), "url": url, "preview": (text or "")[:280], "note": note})
    feed["posts"].sort(key=lambda p: p.get("postedAt") or "", reverse=True)
    save(feed_path, feed)
    return pid

def cmd_feed_add(a):
    print(feed_add(a.series, a.kind, a.url, a.text, a.week, a.id, a.note))

# ---------------------------------------------------------------- ledger
# The poster and the Order Up task run on the owner's computer as Cowork tasks, which cannot push.
# They send FK Kitchen a ledger, one record per line:
#   posted <queue id> <post url>
#   failed <queue id> <reason>
#   reply <post url> @<account> <reply text>
# FK Kitchen saves the lines to a file and runs `fk.py ledger --file <path>`.
STATUS_URL = re.compile(r"^https://(?:www\.|mobile\.)?(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})/status/(\d+)(?:[/?#]\S*)?$")

def clean_status_url(url, handle):
    """The canonical https://x.com/<handle>/status/<id> form, or None if the URL is not one of the kitchen's own posts."""
    m = STATUS_URL.match((url or "").strip())
    if not m or (handle and m.group(1).lower() != handle.lower()):
        return None
    return f"https://x.com/{handle or m.group(1)}/status/{m.group(2)}"

def cmd_ledger(a):
    handle = site_handle()
    text = sys.stdin.read() if a.file == "-" else open(a.file, encoding="utf-8").read()
    pending = {q["id"]: q for q in pending_items()}
    feed_path = os.path.join(DATA, "posts.json")
    n = {"posted": 0, "failed": 0, "reply": 0, "skipped": 0}
    def skip(line, why):
        n["skipped"] += 1
        print(f"skip ({why}): {line[:140]}")
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.lower().startswith("job:") or line.startswith("<"):
            continue
        parts = line.split(None, 2)
        kind = parts[0].lower()
        if kind == "posted":
            if len(parts) < 3:
                skip(line, "needs an id and a url"); continue
            url = clean_status_url(parts[2].split()[0], handle)
            if not url:
                skip(line, f"not a status URL of @{handle}"); continue
            q = pending.pop(parts[1], None)
            if not q:
                skip(line, "no pending item with that id (already recorded or expired)"); continue
            move_to_posted(q, "posted", url)
            record_post(q, url)
            n["posted"] += 1
            print(f"posted {q['id']} {url}")
        elif kind == "failed":
            if len(parts) < 2:
                skip(line, "needs an id"); continue
            q = pending.get(parts[1])
            if not q:
                skip(line, "no pending item with that id"); continue
            mark_failed(q, parts[2] if len(parts) > 2 else "")
            pending.pop(parts[1], None)
            n["failed"] += 1
        elif kind == "reply":
            m = re.match(r"^@?([A-Za-z0-9_]{1,15})\s+(.+)$", parts[2], re.S) if len(parts) == 3 else None
            url = clean_status_url(parts[1], handle) if len(parts) > 1 else None
            if not url or not m:
                skip(line, f"needs a status URL of @{handle}, @account and the text"); continue
            feed = load(feed_path) if os.path.exists(feed_path) else {"posts": []}
            if any(p.get("url") == url for p in feed.get("posts", [])):
                skip(line, "already in the feed"); continue
            pid = feed_add("reply", "post", url, m.group(2).strip(), note=f"reply to @{m.group(1)}")
            n["reply"] += 1
            print(f"reply {pid} {url}")
        else:
            skip(line, "unknown record")
    print(f"ledger: {n['posted']} posted, {n['failed']} failed, {n['reply']} replies, {n['skipped']} skipped")

# ---------------------------------------------------------------- log
def cmd_log(a):
    path = os.path.join(ROOT, "kitchen", "log.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    line = f"- {dt.datetime.now(ET).strftime('%Y-%m-%d %H:%M ET')}: {a.message}\n"
    with open(path, "a", encoding="utf-8") as f:
        f.write(line)
    print(line.strip())

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(prog="fk.py")
    sub = ap.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("week"); w.add_argument("--finished", action="store_true"); w.add_argument("--date"); w.set_defaults(fn=cmd_week)
    wh = sub.add_parser("when"); wh.add_argument("when"); wh.add_argument("--finished", action="store_true"); wh.set_defaults(fn=cmd_when)
    ck = sub.add_parser("clock", help="which job the day's clock names right now (job: daily)"); ck.add_argument("--at", help="ISO timestamp to test instead of now"); ck.set_defaults(fn=cmd_clock)
    sub.add_parser("validate").set_defaults(fn=cmd_validate)
    sub.add_parser("manifest").set_defaults(fn=cmd_manifest)
    sub.add_parser("site-url").set_defaults(fn=cmd_site_url)
    q = sub.add_parser("queue"); qs = q.add_subparsers(dest="qcmd", required=True)
    qa = qs.add_parser("add")
    qa.add_argument("--series", required=True, choices=SERIES + ["reply", "note"])
    qa.add_argument("--week", type=int)
    qa.add_argument("--kind", default="thread", choices=["post", "thread"])
    qa.add_argument("--at", help="ISO, 'now', '+6h', or 'Tue 07:20' (Eastern, inside the content week)"); qa.add_argument("--not-after", dest="not_after")
    qa.add_argument("--link"); qa.add_argument("--no-link", dest="no_link", action="store_true")
    qa.add_argument("--texts-file", dest="texts_file"); qa.add_argument("--text")
    qa.add_argument("--id"); qa.add_argument("--notes")
    qa.set_defaults(fn=cmd_queue_add)
    ql = qs.add_parser("list"); ql.add_argument("--due", action="store_true"); ql.add_argument("--json", action="store_true"); ql.set_defaults(fn=cmd_queue_list)
    qp = qs.add_parser("mark-posted"); qp.add_argument("--id", required=True); qp.add_argument("--url", required=True); qp.set_defaults(fn=cmd_queue_mark_posted)
    qf = qs.add_parser("mark-failed"); qf.add_argument("--id", required=True); qf.add_argument("--reason", default=""); qf.set_defaults(fn=cmd_queue_mark_failed)
    qs.add_parser("expire").set_defaults(fn=cmd_queue_expire)
    lg = sub.add_parser("log"); lg.add_argument("message"); lg.set_defaults(fn=cmd_log)
    fd = sub.add_parser("feed"); fds = fd.add_subparsers(dest="fcmd", required=True)
    fa = fds.add_parser("add"); fa.add_argument("--series", required=True); fa.add_argument("--kind", default="post", choices=["post", "thread"])
    fa.add_argument("--url", required=True); fa.add_argument("--text", required=True); fa.add_argument("--week", type=int); fa.add_argument("--id"); fa.add_argument("--note")
    fa.set_defaults(fn=cmd_feed_add)
    ld = sub.add_parser("ledger"); ld.add_argument("--file", required=True, help="path to the ledger lines, or - for stdin"); ld.set_defaults(fn=cmd_ledger)
    a = ap.parse_args()
    a.fn(a)

if __name__ == "__main__":
    main()
