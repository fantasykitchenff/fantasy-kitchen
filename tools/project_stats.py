#!/usr/bin/env python3
"""Lookups over the Fantasy football project's stat workbooks.

The project holds (as file uploads):
  active QB stats as of 2026.xlsx           passing, one row per player-season, 2010 to 2025
  active QB rushing stats as of 2026.xlsx   quarterback rushing
  active RB rushing stats as of 2026.xlsx   running back rushing
  active RB recieving stats as of 2026.xlsx running back receiving
  active WR reciving stats as of 2026.xlsx  wide receiver receiving
  active TE reciving stats as of 2026.xlsx  tight end receiving
  team pass attempts stats thru 2025.xlsx   team passing volume by season
  team rush stats thru 2025.xlsx            team rushing volume by season
  nfl_2026_current_staff_prior_tracked_roles_2010_2026.xlsx   2026 HC/OC/pass-game/run-game coordinators and their tracked history

Get them in a run with the Projects tool: `project_read` each path; the bytes land in a local file. Put those files (any names)
in one folder and point this script at it. Nothing here is a projection; these are past seasons, safe to cite in copy.

Usage
  python3 tools/project_stats.py --dir DIR player "Bijan Robinson"        every season line for the player (rushing, receiving, passing)
  python3 tools/project_stats.py --dir DIR team ATL                        team pass and rush volume by season, plus the 2026 staff
  python3 tools/project_stats.py --dir DIR coach "Kevin Stefanski"         tracked-role history for a coach
  python3 tools/project_stats.py --dir DIR export OUT_DIR                  write every table to CSV for pandas or grep
  python3 tools/project_stats.py --dir DIR season 2025 --pos WR --top 40   best seasons by yards for a position and year
"""
import argparse, csv, glob, os, re, sys

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl --break-system-packages")

KINDS = {
    "qb_pass":   ["qb_stats", "qb stats"],
    "qb_rush":   ["qb_rushing", "qb rushing"],
    "rb_rush":   ["rb_rushing", "rb rushing"],
    "rb_rec":    ["rb_rec", "rb rec"],
    "wr_rec":    ["wr_rec", "wr rec"],
    "te_rec":    ["te_rec", "te rec"],
    "team_pass": ["pass_attempts", "pass attempts"],
    "team_rush": ["rush_stats", "rush stats"],
    "staff":     ["staff"],
}
TEAM_ALIASES = {"GNB": "GB", "KAN": "KC", "NOR": "NO", "NWE": "NE", "SFO": "SF", "TAM": "TB", "LVR": "LV", "OAK": "LV", "SDG": "LAC", "STL": "LAR", "LA": "LAR", "JAC": "JAX", "WSH": "WAS"}

def norm_team(t):
    t = str(t or "").upper().strip()
    return TEAM_ALIASES.get(t, t)

def find_files(d):
    out = {}
    for path in glob.glob(os.path.join(d, "*.xlsx")):
        name = os.path.basename(path).lower().replace("-", "_")
        for kind, keys in KINDS.items():
            if any(k.replace(" ", "_") in name.replace(" ", "_") for k in keys):
                out.setdefault(kind, path)
    return out

def read_table(path, sheet=None, header_hint=None):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet] if sheet else wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    hi = 0
    if header_hint:
        for i, r in enumerate(rows[:12]):
            if r and any(str(c).strip() == header_hint for c in r if c is not None):
                hi = i; break
    headers = [str(c).strip().replace("▲", "") if c is not None else "" for c in rows[hi]]
    out = []
    for r in rows[hi + 1:]:
        if r is None or all(c is None for c in r):
            continue
        rec = {h: r[i] for i, h in enumerate(headers) if h and i < len(r)}
        out.append(rec)
    return out

def load_all(d):
    files = find_files(d)
    tables = {}
    for kind, path in files.items():
        if kind == "staff":
            tables["staff_summary"] = read_table(path, "Current Staff Summary", "Current Team")
            tables["staff_history"] = read_table(path, "Tracked Role History", "Current Team")
        else:
            tables[kind] = read_table(path)
    return tables

def fmt(rec, cols):
    return "  ".join(f"{c}={rec.get(c)}" for c in cols if c in rec and rec.get(c) is not None)

def cmd_player(t, name):
    name_l = name.lower()
    found = False
    for kind, cols in (("qb_pass", ["Season", "Team", "G", "GS", "Cmp", "Att2", "Yds", "TD", "Int", "Y/A", "Rate"]),
                       ("qb_rush", ["Season", "Team", "G", "Att2", "Yds", "TD", "Y/A"]),
                       ("rb_rush", ["Season", "Team", "G", "GS", "Att2", "Yds", "Y/A", "TD", "1D", "Succ%"]),
                       ("rb_rec", ["Season", "Team", "G", "Tgt2", "Rec", "Yds", "TD", "Ctch%", "Y/Tgt"]),
                       ("wr_rec", ["Season", "Team", "G", "GS", "Tgt2", "Rec", "Yds", "Y/R", "TD", "Ctch%", "Y/Tgt", "1D"]),
                       ("te_rec", ["Season", "Team", "G", "GS", "Tgt2", "Rec", "Yds", "Y/R", "TD", "Ctch%", "Y/Tgt"])):
        rows = [r for r in t.get(kind, []) if str(r.get("Player", "")).lower() == name_l]
        if rows:
            found = True
            print(f"== {name} ({kind})")
            for r in sorted(rows, key=lambda r: r.get("Season") or 0):
                print("  ", fmt(r, cols))
    if not found:
        # fuzzy
        cands = set()
        for kind in ("qb_pass", "qb_rush", "rb_rush", "rb_rec", "wr_rec", "te_rec"):
            for r in t.get(kind, []):
                p = str(r.get("Player", ""))
                if name_l.split()[-1] in p.lower():
                    cands.add(p)
        print("no exact match; similar names:", sorted(cands)[:15])

def cmd_team(t, abbr):
    abbr = norm_team(abbr)
    print(f"== {abbr} passing volume by season")
    for r in sorted([r for r in t.get("team_pass", []) if norm_team(r.get("Team")) == abbr], key=lambda r: r.get("Season") or 0):
        print("  ", fmt(r, ["Season", "G", "W", "L", "Pts", "Att2", "Cmp%", "Yds", "TD", "Int", "Sk"]))
    print(f"== {abbr} rushing volume by season")
    for r in sorted([r for r in t.get("team_rush", []) if norm_team(r.get("Team")) == abbr], key=lambda r: r.get("Season") or 0):
        print("  ", fmt(r, ["Season", "G", "Att2", "Yds", "Y/A", "TD"]))
    print(f"== {abbr} 2026 offensive staff")
    for r in t.get("staff_summary", []):
        if norm_team(r.get("Abbr")) == abbr:
            print("  ", f"{r.get('Current Role')}: {r.get('Current Coach')}  prior HC/OC/PGC/RGC seasons={r.get('Prior HC Seasons')}/{r.get('Prior OC Seasons')}/{r.get('Prior Pass-Game Coord. Seasons')}/{r.get('Prior Run-Game Coord. Seasons')}  previous teams: {r.get('Previous Teams')}")

def cmd_coach(t, name):
    name_l = name.lower()
    rows = [r for r in t.get("staff_history", []) if name_l in str(r.get("Coach", "")).lower()]
    if not rows:
        print("no match"); return
    for r in sorted(rows, key=lambda r: (str(r.get("Coach")), -(r.get("Season") or 0))):
        print("  ", f"{r.get('Coach')}: {r.get('Season')} {r.get('Historical Abbr')} {r.get('Historical Role')} ({r.get('Assignment Type')}) now {r.get('Current Abbr')} {r.get('Current Role')}")

def cmd_season(t, season, pos, top):
    kind = {"QB": "qb_pass", "RB": "rb_rush", "WR": "wr_rec", "TE": "te_rec"}[pos.upper()]
    rows = [r for r in t.get(kind, []) if r.get("Season") == season]
    rows.sort(key=lambda r: -(r.get("Yds") or 0))
    for r in rows[:top]:
        print("  ", f"{r.get('Player')} ({norm_team(r.get('Team'))})", fmt(r, ["G", "Att2", "Tgt2", "Rec", "Yds", "TD"]))

def cmd_export(t, out):
    os.makedirs(out, exist_ok=True)
    for kind, rows in t.items():
        if not rows:
            continue
        cols = []
        for r in rows:
            for k in r:
                if k not in cols:
                    cols.append(k)
        with open(os.path.join(out, kind + ".csv"), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)
        print(f"wrote {kind}.csv ({len(rows)} rows)")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="folder holding the downloaded project xlsx files")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("player"); p.add_argument("name")
    tm = sub.add_parser("team"); tm.add_argument("abbr")
    c = sub.add_parser("coach"); c.add_argument("name")
    e = sub.add_parser("export"); e.add_argument("out")
    s = sub.add_parser("season"); s.add_argument("season", type=int); s.add_argument("--pos", default="WR"); s.add_argument("--top", type=int, default=40)
    a = ap.parse_args()
    t = load_all(a.dir)
    if not t:
        sys.exit("no recognizable workbooks in " + a.dir + " (names must contain qb_stats, qb_rushing, rb_rushing, rb_rec, wr_rec, te_rec, pass_attempts, rush_stats or staff)")
    {"player": lambda: cmd_player(t, a.name), "team": lambda: cmd_team(t, a.abbr), "coach": lambda: cmd_coach(t, a.name),
     "export": lambda: cmd_export(t, a.out), "season": lambda: cmd_season(t, a.season, a.pos, a.top)}[a.cmd]()

if __name__ == "__main__":
    main()
