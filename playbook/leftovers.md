# Leftovers (Monday): what Sunday actually told us

Runs Monday 11:00 AM ET (FK Daily), after the 10:00 AM pantry. Posts at 1:25 PM ET. Week = the week that just finished (on Monday `python3 tools/fk.py week` returns it). Monday night is not included; Tuesday's Market Run covers it.

## What it is

The recap that matters for next week: 5 to 7 takeaways, 8 to 12 usage notes, and 4 to 6 overreactions checked. Everything is deployment first (snaps, routes, targets, carries, red zone), box score second.

## Inputs

1. `_sync.md` steps 1 to 3 (workbook optional; use it to say where the model already stood on a player without publishing a number). Then step 4a: project memory, the kitchen notes for every team involved, the project's research docs, and the stat workbooks through `tools/project_stats.py`.
2. This week's Menu, On the Line and Prep Notes (what the kitchen said before the games; own the misses in one line each when a call was wrong, no excuses).
3. `kitchen/notes/` for every team that played.

## Research

- Sunday box scores for every game.
- Snap counts, routes run, targets, carries, red zone touches for every game (a public snap-count page plus box scores). Confirm any usage claim with the number.
- Injuries suffered during the games and Monday morning updates (MRI results are often Monday; note "pending" when unknown).
- Coaching quotes from post-game pressers only when they explain a deployment change.

## Method

1. Takeaways: the 5 to 7 things that change how next week is priced. Each has a headline (a claim, under 12 words) and two or three sentences with the numbers. A takeaway is a role or usage shift, an injury with a window, a scheme change, or a stat that reverses a narrative.
2. Usage notes: 8 to 12 players with the compact stat string ("78% snaps, 22 touches, 3 targets") and a one-line read.
3. Overreactions: 4 to 6 takes the timeline will be making Monday morning. Verdict is exactly "buy" (it is real) or "sell" (it is noise), with the number that decides it.
4. Own the misses: one short paragraph in `outro_md` naming the kitchen's wrong calls from the week and the lesson, in plain words.
5. Notes: append every fact used to `kitchen/notes/<TEAM>.md`.

## `data` shape

```json
{ "takeaways": [ { "headline": "", "text": "", "actions": [ { "player": "", "action": "CLAIM", "faab": "20-30%" }, { "player": "", "action": "MONITOR", "watch": "MRI Monday" } ] } ],
  "usage": [ { "player": "", "team": "", "pos": "", "stat": "", "read": "", "action": "HOLD" } ],
  "overreactions": [ { "take": "", "verdict": "buy", "why": "", "player": "", "action": "TRADE_FOR", "price": "" } ] }

Actions: every takeaway lists an action for each player it names (the `actions` array, at least one entry). Every usage row carries one. Every overreaction names the player it is about and the action (a "buy" is usually HOLD or TRADE_FOR, a "sell" is usually TRADE_AWAY, SIT or DROP). Injured players are MONITOR with `watch` set to the next checkpoint (the MRI, the Wednesday report) unless the replacement is already clear, in which case the replacement gets CLAIM or ADD with a FAAB range.
```

Envelope: `title` "Leftovers, Week N", `dek` the single biggest takeaway, `intro_md` one paragraph, `outro_md` the misses.

## Posts

One thread, 7 to 9 posts, `--at "Mon 13:20"`, `--not-after +20h`, `--link "leftovers.html?week=N"`:

1. Hook: the biggest takeaway with its number. No link. (The hook ends with a closer from `_standards.md`; every post but the last ends with the official hashtag of each team it names.)
2. to 4. One takeaway per post (the top three).
5. Usage notes, one name per line with one number and one call each, an empty line between players (5 or 6 names).
6. Overreactions: two "real", two "noise", each with the number, one player per line.
7. The misses, owned.
8. Close plus link.

One player per line in every post, the team hashtags on their own last line, no start commands; a lineup call is the Menu rank and its tier (`_standards.md`).

## Finish

`_sync.md` steps 6 and 7. Log: "Leftovers week N: a takeaways, b usage notes, c overreactions; thread queued".
