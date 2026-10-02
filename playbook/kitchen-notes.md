# Kitchen Notes (daily): news reactions

Runs every day at 12:00 PM and 6:00 PM ET (FK Daily). The 12:00 PM run updates the site only. The 6:00 PM run updates the site and queues the day's one Kitchen Notes thread, which posts at 6:25 PM ET (8:25 PM if the run finishes late). Week = current content week. The same method also runs as the last step of every pantry filing (`_sync.md`, "The day's clock"), with the payload as its news: every ripple, crowd line or fact that changes a lineup, waiver or trade decision and is not yet an item becomes an item, backed by the usage numbers (a crowd lean alone never makes one), with no show or analyst named.

## What it is

Reactions to the day's fantasy-relevant news, written into the week's `notes.json` for the site, and one long thread a day on X that rolls up every team's news since the previous day's thread.

## Inputs

1. `_sync.md` steps 1 and 2, then step 4a (project memory, kitchen notes, and `project_search` on the players in the news). Workbook only if a reaction needs the model's view of a role change (then step 3).
2. This week's `notes.json` (do not repeat an item already logged), the Menu and Prep Notes.
3. `kitchen/notes/` for the teams in the news.

## Research

- NFL news from the last 12 hours: injuries with timelines, practice reports (Wed/Thu/Fri afternoons), trades and signings, depth chart changes, suspensions, coach comments on roles, MRI results.
- Confirm each item with a primary or beat-writer source.

## Method

1. Log every fantasy-relevant item as a note: `at` (UTC ISO), `text` (one or two sentences: the fact, then the read; a lineup read is the player's Menu rank and its tier in the rank language of `_standards.md`, never "start him"), `url` (the source, optional). Newest first. Keep the week's list under 60 items; prune stale ones from earlier in the week if needed.
2. The day's thread, queued only by the 6:00 PM run (any run that starts at 5:30 PM ET or later, if none has queued today's thread): one thread of 10 to 25 posts that rolls up every notes item since the previous day's thread plus the pantry board's newest ripples, crowd lines and watch items, team by team, naming at least 8 teams and as many as the news and the pantry cover. Post 1 is the hook (the biggest news of the day and its call, a closer from `_standards.md` on its own line, the team hashtags on their own last line). Then one or two teams per post: the fact, the number and the call (rank language for a lineup call), one player per line. The last post is the close with the follow line and the link to the Pass page (`--link "pass.html"`). The 12:00 PM run and the pantry filings never queue a thread; their news waits for the 6:00 PM thread. A run after the day's thread is queued but before it posts rewrites it with `--replace <id>`; after it posts, the site only.
3. Never post the same news twice. Never post a rumor. Never post a reaction to another creator's take.
4. Append facts to `kitchen/notes/<TEAM>.md`.
5. Grow the week's Butcher Shop and Heat Check (`butcher-heat.md`, "Through the week"). A note that shows a trend in usage (a role won or lost, a snap or route share that moved two weeks running) also goes into this week's `heat.json` as a riser or faller, and a note that moves a player's trade value goes into `butcher.json` as a buy or sell, each with every field and a price. Add an Updated note to the piece naming who was added (`_sync.md`, "Updating a published piece"). Skip this step on Monday, before the new week's pieces exist.

## `data` shape

```json
{ "items": [ { "at": "2026-10-01T16:05:00Z", "text": "", "url": "", "player": "", "action": "MONITOR", "watch": "Friday designation" } ] }

Every item that names a player carries `player` and an `action` (with its required field: `faab` for CLAIM or ADD, `price` for trades, `watch` for MONITOR, `to` for PIVOT). Items about a team or coach with no player named may omit them.
```

Envelope: `series` "notes", `title` "Kitchen notes, Week N", `dek` "What moved today.", `updatedAt` now.

## Posts

One thread a day from the 6:00 PM run, `--series notes --kind thread`, `--at now`, `--not-after +4h`, `--link "pass.html"`. `validate` rejects a notes thread created before 5:30 PM ET, a second one the same day, fewer than 10 posts or fewer than 8 teams. One player per line in every post with an empty line between players, the team hashtags on their own last line, no start commands (`_standards.md`).

## Finish

`_sync.md` step 7. Log: "Kitchen Notes: x items logged, y posts queued, z players added to Butcher Shop and Heat Check".
