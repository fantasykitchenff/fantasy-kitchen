# Prep Notes (Friday): the injury report, read for lineups, and the Menu refresh

Runs Friday 5:00 PM ET (FK Daily), after the 4:00 PM pantry and the final injury report. Posts at 6:25 PM ET. Week = current content week.

## What it is

The final Friday designations (Out, Doubtful, Questionable) for every fantasy-relevant player, each with the practice log (Wed/Thu/Fri), a one-line read, and a verdict. In the same run the Menu is updated: ruled-out players move off the menu, flags are set, doubtful players move down, and pivots are named.

## Inputs

1. `_sync.md` steps 1 to 3 (workbook needed for pivots and re-ordering). Then step 4a: project memory, the kitchen notes for every team involved, the project's research docs, and the stat workbooks through `tools/project_stats.py`.
2. This week's Menu (`docs/data/2026/week-NN/menu.json`) and On the Line.
3. `kitchen/notes/` for teams with a designation.

## Research

- Official Friday injury reports for every team playing Sunday and Monday (Thursday's teams post Wednesday; treat their reports as final already). Sources: NFL.com injury report page, team sites, beat reporters for the "expected to play" or "not expected to play" reads.
- Saturday walkthrough news does not exist at run time; note in the intro which players are true game-time decisions so Order Up knows where to look.

## Method

1. Report rows: every player with a designation who is in the Menu's rankable pool or is a starter at his position. Practice log as three entries in order Wed, Thu, Fri using "DNP", "LP", "FP" (or "--" when a team held a walkthrough with no data).
2. Read: what the pattern means. Full Friday practice after two limited days is a play. DNP Friday with a Questionable tag is usually out. Doubtful is out. Out is out.
3. Verdict: the lineup action, including the pivot by name for every Out or Doubtful starter.
4. Menu refresh, in `menu.json`:
   - Out or Doubtful: remove from `positions`, add to `off_menu` with the pivot in `note`. Doubtful players who might play stay off the menu with note "Doubtful. If he plays, ranks around RB2x." (rank in words, no number from the model).
   - Questionable: set `flag` "Q"; move down within tier if Friday was DNP or LP with a soft-tissue injury; no move for FP.
   - Pivots: the replacement inherits the role share. Re-order him to where the model would place him with that role (reserve the replacement-body haircut). Re-check tier breaks only where a move crossed one.
   - FLEX list re-derived from the updated RB/WR/TE lists.
   - Update `updatedAt`, keep `publishedAt`, add one sentence to the top of `intro_md`: "Updated Friday evening with the injury report."
5. Consistency with On the Line: any start/sit call that Friday's report reversed gets a `data.reversals` list in prep.json naming the player and the new call.

## `data` shape

```json
{ "report": [ { "player": "", "team": "", "pos": "", "status": "Q", "injury": "hamstring", "practice": ["DNP","LP","FP"], "read": "", "verdict": "", "action": "START", "watch": "inactives at 11:30 AM ET" } ],
  "reversals": [ { "player": "", "was": "Start as a WR2", "now": "Out. Pivot to ..." } ],
  "gtd": [ "names that are true Sunday morning decisions" ] }
```

`status` is one of "O", "D", "Q". Sort: Out first, then Doubtful, then Questionable, alphabetical by team inside each.

Actions: Out and Doubtful rows are PIVOT with `to` (the replacement) or SIT when the reader has a better option anyway; Questionable rows are START (with `watch` set to when the decision lands, usually the inactives time), SIT, or MONITOR (with `watch`) for true game-time decisions. Every `gtd` entry also appears in the report with MONITOR.

Envelope: `title` "Prep Notes, Week N", `dek` the biggest designation and its pivot, `intro_md` one or two paragraphs.

## Posts

One thread, 6 to 9 posts, `--at "Fri 18:20"`, `--not-after "Sun 11:30"`, `--link "prep.html?week=N"`:

1. Hook: the biggest out and the pivot. No link. (The hook ends with a closer from `_standards.md`; every post but the last ends with the official hashtag of each team it names.)
2. Ruled out, with pivots (up to two posts).
3. Doubtful.
4. Questionable, the ones that matter, with the Friday practice status.
5. Sunday morning decisions to watch, with the time each team's inactives drop.
6. Menu changes in one post: who moved up, who moved off.
7. Close plus link.

## Finish

`_sync.md` steps 6 and 7 (validate covers both prep.json and the refreshed menu.json). Log: "Prep Notes week N: x out, y doubtful, z questionable; Menu refreshed; thread queued".
