# The Menu (Wednesday): weekly positional rankings with tiers

Runs Wednesday 5:52 AM ET. Posts at 10:25 AM ET. Week = current content week (`python3 tools/fk.py week`).

## What it is

The kitchen's rankings for the week being played: QB, RB, WR, TE and FLEX (RB/WR/TE combined), with tiers. This is the anchor piece. On the Line, Prep Notes and Order Up all hang off it, and Prep Notes updates it Friday.

## Inputs

1. `_sync.md` steps 1 to 3: repos, week, workbook extraction to `projections.json`. Then step 4a: project memory, the kitchen notes for every team involved, the project's research docs, and the stat workbooks through `tools/project_stats.py`.
2. Last week's Menu and Leftovers (`docs/data/2026/week-NN/`) for continuity and to see what moved.
3. `kitchen/notes/<TEAM>.md` for every team with a player in the top 30 at any position.

## Research (about 20 to 30 fetches, no more than needed)

- This week's schedule with kickoff times and byes (teams on bye have no rankable players).
- Injuries since the workbook was saved: search "NFL injury news" for the last 3 days, then team-by-team for anyone in the rankable pool whose status is unclear. Wednesday practice reports are not out at run time; use Monday and Tuesday reporting.
- Role changes: depth chart moves, trades, signings, suspensions, returns from IR.
- Matchups: for each position, note the three softest and three toughest defenses over the last four weeks by fantasy points allowed to the position, from a public stats page. Matchups move players within a tier only, never across tiers, unless the model already prices the matchup.

## Method

1. Pool: every player in `projections.json` with a projection for this week (`week_pts` if present, otherwise `ppg`). Remove bye teams, ruled-out players, IR, suspended.
2. Order each position by the projection. That order is the starting point and it wins any argument that does not have a fact behind it.
3. Adjust, in this order, and write the reason into the row's `note`:
   - Ruled out or on bye: out of the rankings, into `off_menu`.
   - Doubtful: drop to the bottom of the next tier down. Questionable with a soft-tissue injury and limited reporting: move down within the tier. Questionable but practiced in full or reporting is confident: no move, flag stays.
   - Role change the workbook does not know about (new starter, new team, teammate out): reorder to where the model would put him with the new role. Reserve a replacement-body share before promoting anyone (doctrine: when a role-holder leaves a room, the replacement inherits a share, not the whole).
   - Matchup: within-tier moves only.
   - Do not adjust anything the owner has marked as owner-set in the workbook (owner flags, if present in `projections.json`).
4. Tiers: break where the projection gap is largest, no tier wider than about one point per game at RB/WR/TE and about two at QB, at most 6 tiers. Injury-discounted players rank above their raw number within a tier when the discount is the only reason they fell (doctrine).
5. Depth: QB 24, RB 40, WR 50, TE 20, FLEX 60 (built from the RB/WR/TE lists by projection, tiers recomputed on the combined list).
6. Notes: every row in the top 12 at each position gets a `note` (max 90 characters). Any player who moved two or more spots from the raw order gets a note explaining why. Notes are facts and reads, never projected numbers.
7. Opponent string: `vs KC` home, `@KC` away, `BYE` never appears (bye players are removed).
8. Action per row (the action rule in `_standards.md`), set by position and rank for a 12-team, 2 RB, 2 WR, 2 FLEX PPR league: QB 1 to 12 START, 13 to 18 STREAM, 19 and below SIT. RB 1 to 24 START, 25 to 36 FLEX, 37 and below SIT. WR 1 to 36 START, 37 to 48 FLEX, 49 and below SIT. TE 1 to 12 START, 13 to 16 STREAM, 17 and below SIT. FLEX list: 1 to 24 START, 25 to 48 FLEX, 49 and below SIT. A questionable player keeps his action and carries the flag; a row whose note says "have a backup ready" is START with `watch` filled in. `off_menu` rows are PIVOT with `to` set to the replacement. `specials` are START with the `slot`.

## `data` shape

```json
{
  "positions": {
    "QB": [ { "rank": 1, "tier": 1, "tier_label": "Chef's table", "player": "Josh Allen", "team": "BUF", "pos": "QB", "opp": "vs NO", "note": "...", "flag": "", "action": "START", "slot": "QB1" } ],
    "RB": [], "WR": [], "TE": [], "FLEX": []
  },
  "off_menu": { "RB": [ { "player": "...", "team": "TB", "pos": "RB", "opp": "vs PHI", "flag": "OUT", "note": "Ruled out.", "action": "PIVOT", "to": "Rachaad White" } ] },
  "specials": [ { "player": "...", "team": "", "pos": "", "opp": "", "why": "matchup or role reason", "verdict": "Start him as a WR3.", "action": "START", "slot": "WR3" } ]
}
```

`tier_label` only on the first row of each tier (labels from `_standards.md`). `flag` is one of "", "Q", "D". `specials` are 3 to 5 matchup plays outside the top tiers.

Envelope: `title` "The Menu, Week N", `dek` one sentence with the week's biggest shift, `intro_md` two or three short paragraphs (the week in one breath, the biggest tier movements, what Prep Notes will revisit Friday), `format` "PPR".

## Posts

One thread, 7 to 9 posts, `--at "Wed 10:20"`, `--not-after "Thu 18:00"`, `--link "menu.html?week=N"`:

1. Hook: the one thing that changed this week and the headline verdict. No link. (The hook ends with a closer from `_standards.md`; every post but the last ends with the official hashtag of each team it names.)
2. QB: tier 1 and tier 2 names in a compact list, one sentence on the biggest mover.
3. RB: tiers 1 and 2.
4. WR: tiers 1 and 2.
5. TE: tier 1 and the one streamer worth a look.
6. Specials: 3 matchup plays, each with one deployment number.
7. Off the menu: who is out and the pivot for each.
8. Close: "Full menu, all tiers, updated Friday with the injury report." plus the link (the tool appends it).

Every post at most 275 characters. Names as "Allen, Jackson, Daniels", each followed by nothing; the team hashtags for the teams named go at the end of the post (up to five per post; split a position across two posts when a tier list names more than five teams). A questionable player carries "(Q)". The specials post names the slot for each ("Start as a WR3"), the off-the-menu post names the pivot for each ("Pivot to Rachaad White"). The hook ends with a closer from `_standards.md`.

## Finish

`_sync.md` steps 6 and 7. Log line: "Menu week N published: QB a, RB b, WR c, TE d, FLEX e rows; x off menu; thread queued". Append facts learned to `kitchen/notes/<TEAM>.md`.
