# Kitchen Notes (daily): news reactions

Runs every day at 12:00 PM and 6:00 PM ET (FK Daily). Posts go out on the next poster run (1:25 PM and 6:25 or 8:25 PM ET). Week = current content week. The same method also runs as the last step of every pantry filing (`_sync.md`, "The day's clock"), with the payload as its news: every ripple, crowd line or fact that changes a lineup, waiver or trade decision and is not yet an item becomes an item, backed by the usage numbers (a crowd lean alone never makes one), with no show or analyst named.

## What it is

Short reactions to the day's fantasy-relevant news, written into the week's `notes.json` for the site and queued as short threads when the news deserves one. Volume is low on purpose: zero to three threads per run. Most runs should produce notes and no posts.

## Inputs

1. `_sync.md` steps 1 and 2, then step 4a (project memory, kitchen notes, and `project_search` on the players in the news). Workbook only if a reaction needs the model's view of a role change (then step 3).
2. This week's `notes.json` (do not repeat an item already logged), the Menu and Prep Notes.
3. `kitchen/notes/` for the teams in the news.

## Research

- NFL news from the last 12 hours: injuries with timelines, practice reports (Wed/Thu/Fri afternoons), trades and signings, depth chart changes, suspensions, coach comments on roles, MRI results.
- Confirm each item with a primary or beat-writer source.

## Method

1. Log every fantasy-relevant item as a note: `at` (UTC ISO), `text` (one or two sentences: the fact, then the read; a lineup read is the player's Menu rank and its tier in the rank language of `_standards.md`, never "start him"), `url` (the source, optional). Newest first. Keep the week's list under 60 items; prune stale ones from earlier in the week if needed.
2. Queue a short thread (2 or 3 posts) only when an item changes a lineup or waiver decision for a lot of people (a starter ruled out mid-week, a trade, a role change confirmed by the coach). Post 1 is the hook (who, what, the headline call, a closer from `_standards.md` on its own line, the team hashtag on its own last line; a second player gets his own line). Post 2 is the fact, the number, and the call (rank language for a lineup call), one player per line, with the hashtag on its own last line. Post 3 is the link to the piece that covers it (`--link`), or the notes on the Pass page (`--link "pass.html"`).
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

Short threads, `--series notes --kind thread`, `--at now`, `--not-after +8h`, `--link "pass.html"` unless a kitchen piece covers the news. One player per line in every post with an empty line between players, the team hashtags on their own last line, no start commands (`_standards.md`).

## Finish

`_sync.md` step 7. Log: "Kitchen Notes: x items logged, y posts queued, z players added to Butcher Shop and Heat Check".
