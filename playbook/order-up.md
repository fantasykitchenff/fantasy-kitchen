# Order Up (Sunday): inactives and lineup pivots, by kickoff window

Runs Sunday 11:36 AM ET and 3:36 PM ET. Nothing posts before 10:00 AM ET, so games that kick off before 1:00 PM ET (international games) get no Order Up thread; cover them on the site in the 11:36 AM run if relevant. Two runs share the work, because inactives are useless an hour later:

- **FK Kitchen** (`job: series order-up`) does the research, the site piece and the queue item. Everything in this playbook down to "Posts" is its job.
- **The FK Order Up task** (a Cowork task on the owner's computer) starts FK Kitchen, waits for the queued item to land, and posts it through the browser the moment it does ("The FK Order Up task" below).

Week = current content week.

## What it is

For each kickoff window: the official inactives that matter, the surprises, and the pivot for every fantasy-relevant player who is out, posted inside the window between inactives (90 minutes before kickoff) and kickoff. The site piece accumulates windows through the day.

## Inputs

1. `_sync.md` steps 1 and 2 (repos, week). Step 3 (workbook) only if a pivot needs an ordering decision; the Friday Menu already carries the model's order, use it.
2. This week's Menu (with Friday's refresh) and Prep Notes (`gtd` list of game-time decisions).
3. This week's schedule with kickoff times, so the windows are right (watch for 9:30 AM ET international games, Saturday games late in the year, and holiday slates).

## Research (fast: 6 to 12 fetches)

- Official inactives for every game in the window: team accounts and NFL.com/ESPN inactives pages post them about 90 minutes before kickoff. If the lists are not up yet at run time, wait up to 8 minutes and check again once; do not post guesses.
- Confirm any surprise (a player not on the Friday report, or Questionable players who are in or out) with the team's own announcement.

## Method

1. Window name and time: "Early window" (1:00 PM ET), "Late window" (4:05 and 4:25 PM ET), "Sunday night" (8:20 PM ET) or the international window. Include only games in that window.
2. `inactives`: every inactive player who is in the Menu's rankable pool or is a starter, with a note for surprises.
3. `pivots`: for each inactive starter, the replacement people should slot, with one sentence on why (route share, backup role, matchup). Prefer players people already roster; a waiver-wire pivot is still named.
4. `updates`: time-stamped one-liners as they were confirmed, newest first. Each update that names a player ends in the action ("Pivot to Jalen McMillan.", "Active. Start him.").
5. Actions: every inactive row is PIVOT with `to` set to the replacement (or SIT with a note when there is no pivot worth naming).
6. Append this window to the week's `orderup.json` (create it on the first run of the day). Keep earlier windows untouched.

## `data` shape

```json
{ "windows": [ { "name": "Early window", "time": "1:00 PM ET, inactives at 11:30",
    "inactives": [ { "player": "", "team": "", "pos": "", "note": "", "action": "PIVOT", "to": "" } ],
    "pivots": [ { "out": "", "in": "", "note": "" } ] } ],
  "updates": [ { "time": "11:41 AM ET", "text": "" } ] }
```

Envelope: `title` "Order Up, Week N", `dek` the day's biggest surprise so far (update it each window), `intro_md` one short paragraph.

## Posts (queued by FK Kitchen, posted by the FK Order Up task)

One short thread per window (2 to 4 posts): post 1 is the hook (the window, the biggest surprise, the closer, the hashtags of the teams named), the middle posts carry the inactives and the pivot for each with the team hashtags, and the last post is the link to `orderup.html?week=N` (appended by the tool). If nothing surprising happened and every relevant Questionable player is active, the thread is two posts: the hook saying so ("Early window: everyone relevant is active. Start who you planned to start. Let's go.") and the link.

Queue it with `--at now`, `--not-after` the window's kickoff time (ISO), and `--link "orderup.html?week=N"`. Do not post it; the FK Order Up task is waiting for it. Push as soon as the piece validates, because every minute counts before kickoff.

## The FK Order Up task (Cowork, the owner's computer)

1. Start FK Kitchen: `fire_trigger` with the FK Kitchen trigger ID from the task prompt and the text `job: series order-up`.
2. `_sync.md` step 1 ("In a Cowork task") and step 2. Open the browser and check the sign-in as in `poster.md` section 2.
3. Wait for the item: every 2 minutes, `git pull --ff-only` and `python3 tools/fk.py queue list --due --json`. When an item with series `orderup` is due, post it with `poster.md` section 4 (profile check included), then post any other due items the same way. Stop waiting after 40 minutes or at the window's kickoff, whichever comes first, and say so if nothing arrived.
4. Send the ledger (`poster.md` section 7).

## Finish

FK Kitchen: `_sync.md` step 7. Log: "Order Up week N, <window>: x inactives, y pivots, queued <id>". The FK Order Up task ends with the poster's run summary.
