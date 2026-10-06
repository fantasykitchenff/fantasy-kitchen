# Prep Notes (Friday): the injury report, read for lineups, and the Menu refresh

Runs Friday 5:00 PM ET (FK Daily), after the 4:00 PM pantry and the final injury report. Posts at 6:25 PM ET. Week = current content week.

## What it is

The final Friday designations (Out, Doubtful, Questionable) for every fantasy-relevant player, each with the practice log (Wed/Thu/Fri), a one-line read, and a verdict. In the same run the Menu is updated: ruled-out players come out of the rankings, designations are set, doubtful players move down, and this piece names the pivots.

## Inputs

1. `_sync.md` steps 1 to 3 (workbook needed for pivots and re-ordering). Then step 4a: project memory, the kitchen notes for every team involved, the project's research docs, and the stat workbooks through `tools/project_stats.py`.
2. This week's Menu (`docs/data/2026/week-NN/menu.json`) and Serve or Sit (`line.json`).
3. `kitchen/notes/` for teams with a designation.

## Research

- Official Friday injury reports for every team playing Sunday and Monday (Thursday's teams post Wednesday; treat their reports as final already). Sources: NFL.com injury report page, team sites, beat reporters for the "expected to play" or "not expected to play" reads.
- Saturday walkthrough news does not exist at run time; note in the intro which players are true game-time decisions so Order Up knows where to look.

## Method

1. Report rows: every player with a designation who is in the Menu's rankable pool or is a starter at his position. Practice log as three entries in order Wed, Thu, Fri using "DNP", "LP", "FP" (or "--" when a team held a walkthrough with no data).
2. Read: what the pattern means. Full Friday practice after two limited days is a play. DNP Friday with a Questionable tag is usually out. Doubtful is out. Out is out.
3. Verdict: the lineup call in rank language (the Menu rank and its tier, `_standards.md`; never "start him"), including the pivot by name for every Out or Doubtful starter. A Questionable player who is expected to play gets his rank and tier with the watch; a Doubtful or Out player gets the pivot.
4. Menu refresh, in `menu.json`:
   - Out or Doubtful: remove from `positions`. The Menu lists no ruled-out players; this piece's report row carries the pivot (`to`). A Doubtful player who might play says so in his report row: "Doubtful. If he plays, he ranks around the RB2 range." (rank in words, no number from the model).
   - Questionable: set `flag` "Q"; move down within tier if Friday was DNP or LP with a soft-tissue injury; no move for FP.
   - Pivots: the replacement inherits the role share. Re-order him to where the model would place him with that role (reserve the replacement-body haircut). Re-check tier breaks only where a move crossed one.
   - FLEX list re-derived from the updated RB/WR/TE lists.
   - Update `updatedAt`, keep `publishedAt`, and add an Updated note to the top of `intro_md` that names the moves in plain words (`_sync.md`, "Updating a published piece"): "Updated Fri 6:00 PM ET with the injury report: Nico Collins is out, so Xavier Hutchinson moves up to WR38; Lamar Jackson has no designation and stays QB2."
5. Consistency with Serve or Sit: any start/sit call that Friday's report reversed gets a `data.reversals` list in prep.json naming the player and the new call.

## `data` shape

```json
{ "report": [ { "player": "", "team": "", "pos": "", "status": "Q", "injury": "hamstring", "practice": ["DNP","LP","FP"], "read": "", "verdict": "", "action": "START", "watch": "inactives at 11:30 AM ET" } ],
  "reversals": [ { "player": "", "was": "WR18, a WR2", "now": "Out. Pivot to ..." } ],
  "gtd": [ "names that are true Sunday morning decisions" ] }
```

`status` is one of "O", "D", "Q". Sort: Out first, then Doubtful, then Questionable, alphabetical by team inside each.

Actions: Out and Doubtful rows are PIVOT with `to` (the replacement) or SIT when the reader has a better option anyway; Questionable rows are START (with `watch` set to when the decision lands, usually the inactives time), SIT, or MONITOR (with `watch`) for true game-time decisions. Every `gtd` entry also appears in the report with MONITOR.

Envelope: `title` "Prep Notes, Week N", `dek` the biggest designation and its pivot, `intro_md` one or two paragraphs.

## Posts

One thread, 15 to 25 posts (aim for 22 or more), covering every team playing Sunday and Monday, `--at "Fri 18:20"`, `--not-after "Sun 11:30"`, `--link "prep.html?week=N"`. If an earlier run this week already queued the Prep Notes thread and it has not posted, rewrite it with `--replace <id>`; if it has posted, queue nothing.

1. Hook: a general intro to the injury report (how many are out, doubtful and questionable), with the biggest outs and their pivots as highlights (one player per line). No link. (The hook is a closer only if the thread runs 20 or more posts, per `_standards.md`; every post but the last ends with the official hashtag of each team it names.)
2. Then team by team, one or two teams per post, ordered by how much the news changes lineups: every Out and Doubtful player with his pivot and the pivot's rank and tier; every Questionable player with his Wed/Thu/Fri practice, his rank and tier if active, and the time his team's inactives drop; the players who cleared (practiced in full, no designation) with their rank; and the teammates whose role grows, with the usage number behind it.
3. Teams with no fantasy designation still get a post: the most useful injury or availability fact from the pantry board or the team notes (an IR window, a line injury, a player back at practice) and the call it changes.
4. Close plus link.

The week 4 thread (`2026w04-prep-thread-2730`, 25 posts, all 30 teams playing) is the model.

One player per line in every post with an empty line between players, the team hashtags on their own last line, no start commands (`_standards.md`).

## Finish

`_sync.md` steps 6 and 7 (validate covers both prep.json and the refreshed menu.json). Log: "Prep Notes week N: x out, y doubtful, z questionable; Menu refreshed; thread queued".
