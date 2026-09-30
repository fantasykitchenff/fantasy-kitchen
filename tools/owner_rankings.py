#!/usr/bin/env python3
"""Read the owner's weekly rankings workbook (the *_FK_Rankings.xlsx file in the model repo's
owner_rankings folder) into JSON, and blend them with the projection workbook's order.

The owner's sheet is one overall superflex PPR list: columns RK, PLAYER NAME, TEAM, POS (position plus
the rank within it, "RB12"), OPP. This script only reads cached cell values.

  python3 tools/owner_rankings.py extract "<xlsx>" --out owner.json
  python3 tools/owner_rankings.py blend --projections projections.json --owner owner.json --out blended.json [--weight 0.5]

Blend rule (tools/workbook_map.json, "owner_rankings"): each owner positional rank is turned into a value on the
model's own scale (the projection of the model's k-th player at that position), and the blended value is
weight * owner value + (1 - weight) * model value. A player the owner did not rank gets the value of the owner's
last-ranked player at the position (the owner sees no role). A player the model does not project but the owner
ranks (a new starter at quarterback) gets the owner value alone. Blended values are inputs like the
projections: never published, never written to notes or the public repo.
"""
import argparse, json, re, sys, unicodedata

def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    s = s.lower().replace("'", "").replace(".", "").replace("-", " ")
    s = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b", "", s)
    return " ".join(s.split())

TEAM_ALIASES = {"JAC": "JAX", "LVR": "LV", "WSH": "WAS", "LA": "LAR"}

def extract(a):
    import openpyxl
    wb = openpyxl.load_workbook(a.path, data_only=True)
    ws = wb[a.sheet] if a.sheet else wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(c).strip().upper() if c is not None else "" for c in rows[0]]
    def col(*names):
        for n in names:
            if n in hdr: return hdr.index(n)
        sys.exit(f"missing column {names[0]} in {hdr}")
    irk, iname, iteam, ipos, iopp = col("RK", "RANK"), col("PLAYER NAME", "PLAYER"), col("TEAM"), col("POS", "POSITION"), col("OPP", "OPPONENT")
    players = []
    for r in rows[1:]:
        if r[iname] is None or r[ipos] is None: continue
        m = re.match(r"([A-Za-z]+)\s*(\d+)", str(r[ipos]).strip())
        if not m: continue
        team = str(r[iteam] or "").strip().upper()
        players.append({"overall": int(r[irk]), "player": str(r[iname]).strip(), "team": TEAM_ALIASES.get(team, team),
                        "pos": m.group(1).upper(), "pos_rank": int(m.group(2)), "opp": str(r[iopp] or "").strip()})
    out = {"source": a.path, "sheet": ws.title, "count": len(players), "players": players}
    json.dump(out, open(a.out, "w"), indent=1)
    print(f"extracted {len(players)} owner-ranked players from sheet '{ws.title}'")

def blend(a):
    proj = json.load(open(a.projections))["players"]
    owner = json.load(open(a.owner))["players"]
    w = a.weight
    by_pos = {}
    for p in proj:
        if p.get("ppg", 0) > 0:
            by_pos.setdefault(p["pos"], []).append(p)
    for pos in by_pos: by_pos[pos].sort(key=lambda p: -p["ppg"])
    model_idx = {(norm(p["player"]), p["pos"]): p for p in proj}
    owner_idx = {(norm(o["player"]), o["pos"]): o for o in owner}
    owner_max = {}
    for o in owner: owner_max[o["pos"]] = max(owner_max.get(o["pos"], 0), o["pos_rank"])
    def implied(pos, k):
        lst = by_pos.get(pos, [])
        if not lst: return 0.0
        k = max(1, k)
        return lst[k-1]["ppg"] if k <= len(lst) else lst[-1]["ppg"] * (len(lst) / k)
    out = []
    keys = set(model_idx) | set(owner_idx)
    for key in keys:
        m = model_idx.get(key); o = owner_idx.get(key)
        pos = key[1]
        mv = m["ppg"] if m and m.get("ppg") else None
        if o: ov = implied(pos, o["pos_rank"])
        else: ov = implied(pos, owner_max.get(pos, 0) + 1)
        if mv is None and o is None: continue
        if mv is None: val = ov; how = "owner only"
        elif o is None: val = w * ov + (1 - w) * mv; how = "not in owner file"
        else: val = w * ov + (1 - w) * mv; how = "blend"
        team = (m or {}).get("team") or (o or {}).get("team")
        out.append({"player": (m or o)["player"], "team": team, "pos": pos, "model_ppg": mv, "owner_pos_rank": o["pos_rank"] if o else None,
                    "owner_overall": o["overall"] if o else None, "opp": (o or {}).get("opp"), "value": round(val, 3), "how": how})
    out.sort(key=lambda r: (r["pos"], -r["value"]))
    rank = {}
    for r in out:
        rank[r["pos"]] = rank.get(r["pos"], 0) + 1
        r["blended_pos_rank"] = rank[r["pos"]]
    json.dump({"weight": w, "count": len(out), "players": out}, open(a.out, "w"), indent=1)
    print(f"blended {len(out)} players at owner weight {w}")

def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("extract"); e.add_argument("path"); e.add_argument("--sheet"); e.add_argument("--out", required=True); e.set_defaults(fn=extract)
    b = sub.add_parser("blend"); b.add_argument("--projections", required=True); b.add_argument("--owner", required=True); b.add_argument("--out", required=True)
    b.add_argument("--weight", type=float, default=None); b.set_defaults(fn=blend)
    a = ap.parse_args()
    if a.cmd == "blend" and a.weight is None:
        import os
        try:
            a.weight = float(json.load(open(os.path.join(os.path.dirname(__file__), "workbook_map.json")))["owner_rankings"]["weight"])
        except Exception:
            a.weight = 0.5
    a.fn(a)

if __name__ == "__main__":
    main()
