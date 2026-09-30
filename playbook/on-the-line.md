# On the Line (Thursday): start, sit, coin flips, Thursday night

Runs Thursday 11:00 AM ET (FK Daily), after the 10:00 AM pantry. Posts at 1:25 PM ET. Week = current content week.

## What it is

Lineup calls for the borderline players: the RB2/WR2/flex/TE/QB decisions people actually agonize over. Studs are not on the line. Every call is a verdict.

## Inputs

1. `_sync.md` steps 1 to 3. The Menu for this week is the baseline; this piece does not re-rank, it decides. Then step 4a: project memory, the kitchen notes for every team involved, the project's research docs, and the stat workbooks through `tools/project_stats.py`.
2. Wednesday practice reports (out by run time) and Thursday morning news.
3. `kitchen/notes/` for the teams involved.

## Research

- Wednesday practice participation for every questionable-looking player in the Menu's top tiers.
- This week's matchups: pace, implied totals and spreads from a public odds page (use them as context, not as the call), defense versus position over the last four weeks, weather for outdoor games with wind or heavy rain forecasts.
- Thursday night game: both depth charts, injuries, the last two box scores for each side.

## Method

1. Thursday night: 3 to 5 calls covering every fantasy-relevant player in the game (the starters people hold), each with a verdict.
2. Starts: 8 to 12 players ranked in the Menu between RB13 to RB30, WR19 to WR40, TE5 to TE14, QB7 to QB18 whom the week favors (matchup, role, health). Verdict names the slot: "Start as a WR2", "Flex him".
3. Sits: 8 to 12 players people will be tempted to start (name value, last week's box score) whom the week does not favor. Verdict names the replacement level: "Sit for any Tier 3 receiver".
4. Coin flips: 4 to 6 true toss-ups with a lean and what would flip it.
5. Each `why` carries at least one backward-looking number.
6. Consistency: a start here cannot be ranked below a sit here at the same position in the Menu unless the Menu is being updated in the same run (it is not; note the tension in `why` and let the Friday Prep Notes refresh reconcile).

## `data` shape

```json
{ "tnf": [ { "player": "", "team": "", "pos": "", "opp": "", "why": "", "verdict": "", "action": "START", "slot": "WR2" } ],
  "starts": [ ... same, action START or FLEX with slot ... ],
  "sits": [ ... same, action SIT ... ],
  "coinflips": [ { "player": "", "team": "", "pos": "", "opp": "", "why": "", "verdict": "", "action": "START", "slot": "FLEX", "flip_if": "what would flip the lean" } ] }

Actions: tnf and starts are START (with `slot`) or FLEX; sits are SIT; coin flips carry the lean as the action (START or SIT) plus `flip_if`.
```

Envelope: `title` "On the Line, Week N", `dek` one sentence with the boldest call, `intro_md` one or two paragraphs.

## Posts

One thread, 6 to 8 posts, `--at "Thu 13:20"`, `--not-after "Sun 11:00"`, `--link "line.html?week=N"`:

1. Hook: the boldest start and the boldest sit, one number each. No link. (The hook ends with a closer from `_standards.md`; every post but the last ends with the official hashtag of each team it names.)
2. Thursday night calls.
3. Starts, part one (name, slot, number).
4. Starts, part two.
5. Sits.
6. Coin flips with leans.
7. Close plus link.

Also queue a 2-post thread with `--at "Thu 18:20"`, `--not-after "Thu 20:15"`, `--series line --kind thread --link "line.html?week=N"`: post 1 is the Thursday night lineup-lock hook (both teams' hashtags, a closer), post 2 is the top two calls from the game with their actions, then the link post is appended by the tool as post 3 only if you include it; keep it to hook, calls, link.

## Finish

`_sync.md` steps 6 and 7. Log: "On the Line week N: a TNF, b starts, c sits, d flips; thread and TNF post queued".
