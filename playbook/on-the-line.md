# Serve or Sit (Thursday): lineup calls, coin flips, Thursday night

Called On the Line through Week 4. The series is Serve or Sit on the site and in posts from Week 5 on; the job name (`on-the-line`), this file, the data file (`line.json`) and the page (`line.html`) keep the old name so the schedules and every link already posted keep working.

Runs Thursday 11:00 AM ET (FK Daily), after the 10:00 AM pantry. Posts at 1:25 PM ET. Week = current content week.

## What it is

Lineup calls for the borderline players: the RB2/WR2/flex/TE/QB decisions people actually agonize over. Studs are not on this page. Every call is a verdict, spoken as the player's Menu rank and its tier in the rank language of `_standards.md`; the reader decides. Never "start him".

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
2. The week favors them (`starts`): 10 to 15 players ranked in the Menu between RB13 to RB30, WR19 to WR40, TE5 to TE14, QB7 to QB18 whom the week favors (matchup, role, health). Verdict gives the Menu rank and its tier: "WR18 for me this week, a WR2", "RB27 for me, a high-end RB3, a flex play", "TE12 for me, a borderline start this week".
3. The week does not (`sits`): 10 to 15 players people will be tempted to play (name value, last week's box score) whom the week does not favor. Verdict gives the rank and where it falls, then the replacement level: "WR41 for me, a low-end flex play; sit him for any Tier 3 receiver".
4. Coin flips: 4 to 8 true toss-ups with a lean and what would flip it.
5. Each `why` carries at least one backward-looking number.
6. Consistency: a player the week favors here cannot be ranked below one it does not favor at the same position in the Menu unless the Menu is being updated in the same run (it is not; note the tension in `why` and let the Friday Prep Notes refresh reconcile).

## `data` shape

```json
{ "tnf": [ { "player": "", "team": "", "pos": "", "opp": "", "why": "", "verdict": "", "action": "START", "slot": "WR2" } ],
  "starts": [ ... same, action START or FLEX with slot ... ],
  "sits": [ ... same, action SIT ... ],
  "coinflips": [ { "player": "", "team": "", "pos": "", "opp": "", "why": "", "verdict": "", "action": "START", "slot": "FLEX", "flip_if": "what would flip the lean" } ] }

Actions: tnf and starts are START (with `slot`) or FLEX; sits are SIT; coin flips carry the lean as the action (START or SIT) plus `flip_if`. The action is data; every `verdict` is written in rank language.
```

Envelope: `title` "Serve or Sit, Week N", `dek` one sentence with the boldest call, `intro_md` one or two paragraphs.

## Posts

One thread, 15 to 25 posts (aim for 20 or more), naming at least 14 teams and every team with a call on the site, `--at "Thu 13:20"`, `--not-after "Sun 11:00"`, `--link "line.html?week=N"`. Every call on the site goes in the thread, game by game where it helps a reader find his team. The Thursday night game leads it, so there is no separate Thursday night thread. The outline below is the order:

1. Hook: a general intro to the week's lineup calls, with the boldest call up and the boldest call down as highlights, each player on his own line. No link. (The hook is a closer only if the thread runs 20 or more posts, per `_standards.md`; every post but the last ends with the official hashtag of each team it names.)
2. Thursday night calls.
3. The week favors them, part one (name, rank and tier, number), one player per line with an empty line between players.
4. The week favors them, part two.
5. The week does not: the rank and where it falls, one player per line.
6. Coin flips with leans, one flip per line (the two names of a flip share that line).
7. Close plus link.

One player per line in every post, the team hashtags on their own last line, no start commands (`_standards.md`).

No second thread. The Thursday night calls (with the lineup lock time) are posts 2 and 3 of this thread; if a later run before 1:20 PM changes them, rewrite the thread with `--replace <id>`.

## Finish

`_sync.md` steps 6 and 7. Log: "Serve or Sit week N: a TNF, b starts, c sits, d flips; thread and TNF post queued".
