# Market Run (Tuesday): the waiver wire, plus what Monday night changed

Runs Tuesday 11:00 AM ET (FK Daily), after the 10:00 AM pantry. Posts at 1:25 PM ET. Week = current content week (the coming week; on Tuesday `fk.py week` already returns it).

## What it is

Priority adds by position with FAAB guidance, stashes, drops, and a short read on Monday night. Written for 10 to 14 team leagues, full PPR. The piece people set their waiver claims from.

## Inputs

1. `_sync.md` steps 1 to 3 (workbook needed for rest-of-season value of each add). Then step 4a: project memory, the kitchen notes for every team involved, the project's research docs, and the stat workbooks through `tools/project_stats.py`.
2. Yesterday's Leftovers (Sunday usage) and last week's Market Run (do not re-recommend a player who was a priority add last week unless he is still widely available and the reason strengthened).
3. `kitchen/notes/` for teams involved.

## Research

- Monday night box score, snap counts, routes and targets for both teams.
- Injuries from Sunday and Monday: who is out multiple weeks, who is week to week. Confirm with a primary report before treating an injury as multi-week.
- Rostered percentages: fetch a public "most added" or waiver page (ESPN, Yahoo, FantasyPros). If none is fetchable, leave `rostered` empty; never guess.
- Usage trends over the last three weeks for candidates: snap share, route share, target share, carries, red zone touches.
- Upcoming schedule for candidates (next three opponents) as a tiebreaker.

## Method

1. Candidate pool: players not in last week's Menu top 24 (QB), top 30 (RB), top 36 (WR), top 12 (TE), or widely available by the rostered data, whose rest-of-season projection or new role makes them startable within two weeks.
2. Rank adds by the model's rest-of-season projection adjusted for the new information (a backup who just inherited a starting job is priced at the starter's share minus a replacement-body haircut, per doctrine). Injury-driven adds are ranked by the length of the window, not the size of the one-week spike.
3. FAAB ranges (of a 100 budget): league-winning role change 30 to 50 percent; clear multi-week starter 15 to 30; strong flex or streamer 5 to 15; speculative 1 to 5. State the range and the verdict in one sentence.
4. Stashes: 3 to 5 players for deep benches (handcuffs with standalone paths, returning-from-IR, rookies trending up).
5. Drops: 3 to 5 widely rostered players whose role is gone, each with the deployment number that proves it.
6. Monday night: 2 to 4 sentences of what changed, only what affects this list.
7. 8 to 12 priority adds total, across positions, ordered by priority (1 is the best add). At least one QB streamer and one TE when the week has any worth naming.
8. Actions: adds are CLAIM (waiver claim with a FAAB range) or ADD (free agent or 0 to 2 percent); a one-week streamer is STREAM and still carries `faab`. Stashes are STASH with `faab`. Drops are DROP. The `mnf` paragraphs name an action for every player they mention ("Monitor; MRI Monday.", "Claim him, 10 to 15 percent.").

## `data` shape

```json
{
  "adds": [ { "priority": 1, "player": "", "team": "", "pos": "", "action": "CLAIM", "faab": "25-35%", "rostered": "41%", "why": "two sentences, deployment first", "verdict": "Claim him, 25 to 35 percent of FAAB. Top priority." } ],
  "stashes": [ { "player": "", "team": "", "pos": "", "action": "STASH", "faab": "1-3%", "why": "", "verdict": "" } ],
  "drops": [ { "player": "", "team": "", "pos": "", "action": "DROP", "why": "", "verdict": "" } ],
  "mnf": [ { "text": "one paragraph per point" } ]
}
```

Envelope: `title` "Market Run, Week N", `dek` the top add and why in one sentence, `intro_md` one or two paragraphs (the theme of this week's wire, the FAAB budget assumption).

## Posts

One thread, 15 to 25 posts (aim for 20 or more), naming at least 14 teams and as many as the adds, stashes, drops and pantry ripples reach, `--at "Tue 13:20"`, `--not-after "Wed 12:00"`, `--link "market.html?week=N"`. Every add, stash and drop on the site goes in the thread, one or two teams per post, plus the pantry board's role changes that make or break a waiver call. The outline below is the order, not the length; an item with more players runs as many posts as it needs:

1. Hook: the number one add and the FAAB range. No link. (The hook ends with a closer from `_standards.md`; every post but the last ends with the official hashtag of each team it names.)
2. Adds 1 to 3, one player per line with an empty line between players: name, team, position, the deployment number, then the action with the FAAB range ("Claim, 25 to 35 percent").
3. Adds 4 to 6.
4. Adds 7 to 10 (or "deeper adds").
5. QB and TE streamers.
6. Stashes.
7. Cut bait: the drops and the number behind each, one player per line.
8. Monday night in two sentences.
9. Close plus link.

One player per line in every post, the team hashtags on their own last line, no start commands (`_standards.md`; waiver calls are unchanged).

## Finish

`_sync.md` steps 6 and 7. Log: "Market Run week N: x adds, y stashes, z drops, thread queued". Notes appended for every player named.
