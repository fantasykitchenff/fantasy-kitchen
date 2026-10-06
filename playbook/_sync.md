# Kitchen mechanics: where things live and how a task moves data

Every scheduled kitchen task follows this file first, then its series playbook. Do the steps in order. Do not improvise around a failed step; log it and stop (see "If something fails").

## Where things live

| Thing | Where | How a task reaches it |
| --- | --- | --- |
| Site, data, playbooks, tools, queue | GitHub repo `OWNER/fantasy-kitchen` (public), branch `claude/kitchen` | FK Kitchen clones and pushes it; Cowork tasks clone it read-only (see Step 1) |
| Projection workbook | GitHub repo `OWNER/fantasy-kitchen-model` (private), the projection workbook (the `*_Team_Projections.xlsx` file) at the root | cloned by FK Kitchen; read with `tools/extract_projections.py` |
| Owner rankings | the same repo, `owner_rankings/<season>-week-NN_FK_Rankings.xlsx`, one file per week when the owner makes one | read and blended with `tools/owner_rankings.py` (Step 3) |
| Editorial doctrine | `playbook/_standards.md` in the repo (mirrors project memory) | read it every run |
| Running facts about players, teams, coaches | `kitchen/notes/<TEAM>.md` in the repo (seeded from the project's research docs) | read the teams you write about; append what you learned |
| Preseason research docs (about 100) and past-season stat workbooks | the Fantasy football project on claude.ai | Projects tool: `project_search`, `project_read`; `tools/project_stats.py` for the workbooks |
| Doctrine and the state of the owner's leagues | project memory (`doctrine.md`, `overview.md`) | memory tools: `memory_read` |
| Publication log | `kitchen/log.md` | append one line per run |
| The live site | `https://fantasykitchenff.com`, served by Cloudflare Pages from the `docs/` folder of `claude/kitchen` (it redeploys on every push); the same URL is `site_url` in `docs/data/site.json` | link target for posts. Never link to a github.io or pages.dev address or write a site URL by hand: links come only from `site_url` through `tools/fk.py queue add --link`. While `site_url` is empty, posts go out with no site link. |

`OWNER` is the GitHub account named in the task prompt.

## Step 1. Get the repos

Two kinds of runs touch the repo, and they reach it differently.

- **FK Kitchen** is a Claude Code routine with `OWNER/fantasy-kitchen` and `OWNER/fantasy-kitchen-model` attached. It is the only run that pushes. Every series runs inside it (Leftovers, Market Run, Butcher Shop and Heat Check, the Menu, Serve or Sit, Prep Notes, Kitchen Notes, and Order Up's research): the FK scheduled task for each series only starts FK Kitchen with `job: series <name>`. It also records the ledgers the poster sends (`poster.md`, "Ledger").
- **The poster and the FK Order Up task** are Cowork scheduled tasks with the owner's computer attached, because they post through the browser. Cowork tasks cannot be given repositories (their git proxy refuses any repo that is not attached), so they clone the public repo read-only, never commit or push, and send what they did to FK Kitchen as a ledger.

In FK Kitchen:

1. The checkouts are in the working directory (`ls`); clone either one from `https://github.com/OWNER/<name>.git` if it is missing. Credentials come from the routine; never type one.
2. All work happens on the branch `claude/kitchen`, the repo's default branch: `git fetch origin claude/kitchen && git checkout -B claude/kitchen origin/claude/kitchen`. Branches whose names start with `claude/` always accept the routine's pushes, so `main` is not used.
3. Confirm `git status` is clean and `git log -1` shows the latest commit. Do not create other branches.
4. `pip install openpyxl --break-system-packages -q` if the run needs the workbook.

In a Cowork task (the poster, FK Order Up):

1. `git clone --depth 20 --branch claude/kitchen https://github.com/OWNER/fantasy-kitchen.git "$SCRATCH/fk"` (public, no credentials needed) and `cd "$SCRATCH/fk"`. Do not clone the model repo; it is private and these tasks do not need it.
2. The checkout is read-only scratch. Tools like `queue expire` may change files locally, but nothing is committed or pushed from a Cowork task; the ledger is how its results reach the repo.

## The day's clock

Nothing runs before 10:00 AM ET. The pantry reads the owner's saved podcast transcripts on the owner's computer, so it cannot run until the machine is on, and every other run is timed off it. All times Eastern.

| Time | Run | Where |
|---|---|---|
| 10:00 AM | Pantry 1 (`job: pantry` to FK Kitchen when it has new lines) | owner's computer |
| 10:25 AM | Poster | owner's computer |
| 11:00 AM | FK Daily: the day's series, Leftovers Mon, Market Run Tue, Menu Wed, Serve or Sit Thu | FK Kitchen |
| 11:36 AM | Order Up, first run (Sunday) | FK Kitchen and owner's computer |
| 12:00 PM | FK Daily: Kitchen Notes, news run | FK Kitchen |
| 1:00 PM | Pantry 2 | owner's computer |
| 1:25 PM | Poster, with reply mode | owner's computer |
| 2:00 PM | FK Daily: Butcher Shop and Heat Check (Tuesday) | FK Kitchen |
| 3:36 PM | Order Up, second run (Sunday) | FK Kitchen and owner's computer |
| 4:00 PM | Pantry 3 | owner's computer |
| 5:00 PM | FK Daily: Prep Notes (Friday), after the final injury report | FK Kitchen |
| 6:25 PM | Poster | owner's computer |
| 7:00 PM | Pantry 4 | owner's computer |
| 6:00 PM | FK Daily: Kitchen Notes, news run | FK Kitchen |
| 8:25 PM | Poster, with reply mode | owner's computer |
| 10:00 PM | Pantry 5, only when the machine is still on | owner's computer |

One scheduled task can start every FK Kitchen run above. Give it the payload `job: daily` and fire it at 11:00 AM, 12:00 PM, 2:00 PM, 5:00 PM and 6:00 PM ET every day (the task form takes one time each, so it is five tasks named FK Daily with the same instructions; none of them requires the owner's computer). On `job: daily`, FK Kitchen runs `python3 tools/fk.py clock`, which names the job for this weekday and time from the table in `tools/fk.py` (`CLOCK_SLOTS`; a slot matches within 30 minutes of the start), and runs it as if the payload had said `job: <that>`; on `"job": "none"` (a Wednesday 2:00 PM, a Monday 5:00 PM) it ends at once. Order Up keeps its own Sunday tasks because it posts through the browser. The pantry and the poster are Cowork tasks with their own schedules.

A series runs an hour after a pantry so that step 4a finds the payload filed; the filings take under ten minutes each once the payload arrives. If the pantry itself takes longer than 45 minutes on the owner's machine, swap the two morning FK Daily times (Kitchen Notes at 11:00 AM, the series at 12:00 PM, with the thread slots moved to 1:20 PM still) rather than moving the pantry earlier than 10:00 AM.

A pantry filing does not end with the notes and the pantry page. After filing and fixing the published calls the facts make wrong, FK Kitchen runs the Kitchen Notes method over the payload (`kitchen-notes.md`), so a new call reaches the site within the hour instead of waiting for the weekly piece: every ripple, crowd line or fact that changes a lineup, waiver or trade decision and is not yet an item becomes an item in this week's `notes.json` with `player`, `action` and the action's required field. The usage numbers must back it and the text says so; a crowd lean alone never makes an item; no show or analyst is named; a thread is queued only under the Kitchen Notes rules. The log line then carries "d notes items" before the threads count.

Filings from the X feed. The FK Replies tasks also send `job: pantry` filings, with a part line that starts with "X" (`replies.md`, "News scan"). They come from posts on X, not from checked podcast notes, so FK Kitchen checks them first: before a FACT changes a page, a rank or a notes item, confirm it with an official report (team injury report, transaction wire, team site) or a second independent source (`_sync.md` step 4b). A confirmed fact is filed and used exactly like a pantry fact. An unconfirmed one goes to the pantry board's Watch list with what would confirm it and changes nothing else. CROWD lines are filed as crowd lines and, as always, never move a rank or a call by themselves. The owner's rankings files (`kitchen/rankings/`) are never changed by a filing; the news moves players on the Menu under each playbook's rules. Log line: "Pantry week NN part X <time> (X feed): a facts filed, u unconfirmed to watch, b crowd lines, c pages updated, d notes items".

The same filing grows the week's Butcher Shop and Heat Check (`butcher-heat.md`, "Through the week"): a buy-low or sell-high case the payload backs with usage becomes a new Butcher Shop player, a usage trend becomes a new Heat Check riser or faller, each with every field the series asks for. The podcasts, research and replies the owner uploads all week are the reason those two pieces should keep growing until Sunday.

## Step 2. Know what week it is

`python3 tools/fk.py week` prints the content week (Tuesday through Monday cycle, Eastern time) and the dates of its Tuesday, Thursday, Sunday and Monday. On Monday it still returns the week that just finished, which is what Leftovers wants. Never hardcode a week number. `python3 tools/fk.py when "Wed 10:20"` converts a weekday and Eastern time inside the content week to the UTC timestamp the queue uses; `now` and `+6h` work too.

## Step 3. Load the model (rankings-bearing series only: Menu, Serve or Sit, Prep Notes, Order Up, Market Run, Butcher Shop, Heat Check)

1. The workbook is the `*_Team_Projections.xlsx` file at the root of the `fantasy-kitchen-model` checkout (`ls *_Team_Projections.xlsx`). (If that repo is unavailable but the Claude Project lists a file of that name, `project_read` it instead; the bytes land in a local file.)
2. `python3 tools/extract_projections.py "<path to xlsx>" --out "$SCRATCH/projections.json"`. If it reports that it could not find the player table, run it with `--inspect`, read the sheet and header list it prints, and pass the right sheet with `--sheet` and column names with `--map` (the flags are documented in the script). Do not guess player values; if extraction fails twice, stop and log it.
   `tools/workbook_map.json` pins the owner's workbook: the four Rankings sheets are the projections, the position is the sheet's, the team comes from the 32 team sheets, and `ppg` is the season number divided by 17 because the workbook has no games column (the file says so in `ppg_basis`). Do not pass `--sheet` or `--map` while that file matches the workbook.
3. The owner's own rankings, when they exist for the week: `owner_rankings/<season>-week-NN_FK_Rankings.xlsx` in the model repo (one overall superflex PPR list; the POS column carries the position and the rank within it). `python3 tools/owner_rankings.py extract "<path>" --out "$SCRATCH/owner.json"`, then `python3 tools/owner_rankings.py blend --projections "$SCRATCH/projections.json" --owner "$SCRATCH/owner.json" --out "$SCRATCH/blended.json"`. The blend turns each owner rank into a value on the model's scale and mixes it with the projection at the weight in `tools/workbook_map.json` (`owner_rankings.weight`, 0.8 today: the owner's list carries most of the order until the kitchen's notes cover essentially every player, and the owner lowers it as that research fills in). A player the owner left out gets the owner's floor at his position, so leaving a player out is how the owner marks him as having no role or as out. When the file for the week exists, every rankings-bearing series orders by `blended.json` instead of the raw projection; the blended values are as private as the projections.
4. The owner's final rankings override everything above when present: `kitchen/rankings/<season>-week-NN.csv` (the week's overall list; RK, PLAYER NAME, TEAM, POS with the rank inside the position like WR17, OPP) and `kitchen/rankings/<season>-ros.csv` (rest of season), written by `job: rankings`. When the week's file exists, every rankings-bearing series (Menu, Serve or Sit, Prep Notes, Order Up, Market Run, Butcher Shop, Heat Check) orders players by it at full weight instead of `blended.json` or the raw projection; this week's news after its as-of date (injuries, ruled out, role changes) still adjusts it the way each playbook says. Every rest-of-season rank in copy (trade, add, drop, hold calls, game notes, Kitchen Notes) comes from the ros file. Never mention the owner's list or a blend in copy; the ranks are public, any number behind them is not.
5. `projections.json` holds, per player: name, team, position, rest-of-season per-game projection, weekly projection when the workbook carries one, and any owner flags. These numbers are inputs. They are never published, never written to notes, never committed to the public repo. Rankings are ordered by them, then adjusted by this week's news per the series playbook, and only ranks and tiers leave the kitchen.

## Step 4. Research

### 4a. What the kitchen already knows (do this before any web search)

FK Kitchen is a Claude Code routine and may not have the Projects tool or the memory tools. Use each item below when its tool is available; when one is not, skip it, rely on the kitchen notes (distilled from the same research docs) and say so in the log line.

1. Project memory: read `/projects/019f7bf8-3569-7402-81a6-72287aa2c98e/doctrine.md` and `overview.md` with the memory tools (`memory_read`). The doctrine governs every call; the overview says where the owner's leagues and model stand.
2. Kitchen notes: read `kitchen/notes/<TEAM>.md` for every team you will write about (and `kitchen/notes/NFL.md` once). They hold about 3,500 dated facts from the preseason research plus everything earlier runs appended: play-callers and what they did at earlier stops, roles, camp battles, injuries, contracts. A ranking or call that contradicts a note needs a newer fact behind it.
3. Project docs: the Fantasy football project holds about 100 research docs (June 24 to Aug 26, 2026, camp reports, coaching-change breakdowns, 32-team previews, injury-expert sessions). For each player or team whose call you are unsure about, run the Projects tool `project_search` with the name (and the topic, for example "Achane snap share" or "Slowik play calling") and read the hits. The notes files were distilled from these docs, so search when a note is thin or when you need the reasoning behind a role.
4. Project stat workbooks (past seasons, safe to cite): with the Projects tool `project_read` download `active QB stats as of 2026.xlsx`, `active QB rushing stats as of 2026.xlsx`, `active RB rushing stats as of 2026.xlsx`, `active RB recieving stats as of 2026.xlsx`, `active WR reciving stats as of 2026.xlsx`, `active TE reciving stats as of 2026.xlsx`, `team pass attempts stats thru 2025.xlsx`, `team rush stats thru 2025.xlsx`, and `nfl_2026_current_staff_prior_tracked_roles_2010_2026.xlsx` into one folder (the read returns each file's local path; copy them into `$SCRATCH/stats/`). Then:
   ```
   python3 tools/project_stats.py --dir "$SCRATCH/stats" player "Bijan Robinson"     # season lines 2010 to 2025
   python3 tools/project_stats.py --dir "$SCRATCH/stats" team ATL                     # team pass and rush volume by season, 2026 offensive staff and their history
   python3 tools/project_stats.py --dir "$SCRATCH/stats" coach "Kevin Stefanski"      # tracked-role history 2010 to 2026
   python3 tools/project_stats.py --dir "$SCRATCH/stats" export "$SCRATCH/stats/csv"  # everything as CSV
   ```
   Use them for career baselines (a receiver's catch rate and yards per target, a back's success rate), for team volume context (a play-caller's pass rate at previous stops), and for coaching continuity. Series that need them: Menu, Butcher Shop, Heat Check, Leftovers, Market Run. The Poster and Order Up do not.
5. The projection workbook (Step 3) is the projection. The notes, docs and stat workbooks are the reasoning behind it and the facts you cite in copy.

### 4b. This week's news

Use web search and page fetches. Priority order for facts: official team injury reports and inactives (nfl.com, team sites), beat reporters, ESPN/NFL.com/CBS/Yahoo news pages, PFR/Next Gen/PFF-style usage data (snap counts, routes, targets), then everything else. Each series playbook lists its own queries. Rules:

- Confirm anything that changes a ranking with two sources or one primary source (an official report, a team announcement, the box score).
- Record every fact you use in `kitchen/notes/<TEAM>.md`, under the matching section, as a dated line: `- 2026-10-01: Player X: 71% snaps in Week 4, first time over 65% (snap counts).` Read the section before writing so you do not repeat a fact. Facts are backward-looking; never write a projected number into notes or copy.
- Keep the project's knowledge space in mind: it is close to its size cap, so do not write new docs to the project from a run unless a playbook says to.

## Step 5. Write the piece

Write the series JSON to `docs/data/2026/week-NN/<series>.json` (two-digit week). The envelope is the same for every series:

```json
{
  "series": "menu",
  "season": 2026,
  "week": 4,
  "title": "The Menu, Week 4",
  "dek": "One sentence that sells the piece.",
  "format": "PPR",
  "publishedAt": "2026-09-30T11:00:00Z",
  "updatedAt": "2026-09-30T11:00:00Z",
  "author": "Chef Hazy",
  "intro_md": "Two to four short paragraphs. Markdown: paragraphs, **bold**, lists, [links](menu.html?week=4).",
  "outro_md": "Optional close.",
  "data": { },
  "posts": [ { "id": "2026w04-menu-thread", "kind": "thread", "status": "queued", "url": null } ]
}
```

`data` is series-specific; each playbook shows it. Times are UTC ISO strings. If the file already exists for this week (an update run), read it, change what changed, bump `updatedAt`, keep `publishedAt`.

Every player item carries `pos` (QB, RB, WR, TE, K or DST): the site filters every page by position. The validator rejects a player item without one in pieces published from Week 5 on.

### Updating a published piece

When a later run changes a published piece (a pantry filing, a Kitchen Notes run, the Friday Menu refresh, a correction), it edits the data, bumps `updatedAt`, keeps `publishedAt`, and puts one short note at the top of `intro_md`:

`Updated Thu 7:00 PM ET: Jared Goff moves up to QB8 against CAR's depleted secondary, and Drake Maye drops to QB15.`

- The note says what changed for the reader, in plain words about the players, with the new call. It never describes the page or its data: no "card", "row", "line" or "carries a flag" (`_standards.md`, "Talk about the player, not the page"). Not "DeVonta Smith's row carries a second DNP" but "DeVonta Smith missed a second practice with the hamstring; he is still WR24 for me until Friday's report."
- A run that only adds players says who: "Updated Wed 3:00 PM ET: added Tre Tucker and Jalen Coker as risers."
- One note per run, newest first. Keep the five newest and delete the rest (the data already holds what they changed). A run that changes nothing a reader would act on writes no note.

The site shows these notes under "What changed" at the top of each piece and keeps the rest of `intro_md` as the chef's intro.

## Step 6. Queue the posts

Each content item gets exactly one thread (`_standards.md`, "One long thread per content item"): 15 to 25 posts for a weekly series, 10 to 25 for the daily Kitchen Notes thread and each Order Up window, covering as many teams as the piece touches, built from the piece, the pantry board, the team notes and the owner's rankings. Write it as a queue item with the tool so ids, timing and validation are consistent:

```
python3 tools/fk.py queue add --series menu --week 4 --kind thread \
  --at "Wed 13:20" --not-after "Thu 18:00" \
  --link "menu.html?week=4" --texts-file "$SCRATCH/menu-thread.json"
```

`--at` and `--not-after` take a weekday and Eastern time inside the content week ("Wed 10:20"), `now`, `+6h`, or an ISO timestamp. The poster runs at 10:25, 13:25, 18:25 and 20:25 ET, so schedule posts a few minutes before one of those. Nothing ever posts before 10:00 AM ET: `queue add` moves an earlier `--at` to 10:00 AM that day (and one after 8:30 PM, past the last poster run, to 10:00 AM the next day), a relative `--not-after` (`+8h`) counts from that time, `queue list --due` returns nothing before 10:00 AM ET, and `validate` rejects a pending item scheduled earlier. An item whose `--not-after` falls before 10:00 AM gets a warning and will expire unposted.

`--texts-file` is a JSON array of strings, one per post. Everything except a reply is a thread: post 1 is the hook, a general intro to the thread that may call out the highlights (a closer only on threads of 20 or more posts; see `_standards.md`), every post but the last carries the official hashtag of each team it names (`kitchen/hashtags.json`), the last post ends with the follow line ("Follow @handle for the rest of the week's calls, and repost this for your league."), and the tool appends the site link after it (replies use `--kind post --no-link` and end with "Follow @handle for more."). Items post at or after `--at` the next time the poster runs and are skipped forever after `--not-after`. Sunday-morning content must carry a tight `--not-after` (kickoff), rankings can carry a day. Add the item's id to the piece's `posts` array.

Update runs: if the piece's thread is still in `queue/pending/`, rewrite it in place with `--replace <id>` (same flags otherwise) so the new facts and ranks go out in the one thread. If it is already in `queue/posted/`, update the site only and queue nothing; `queue add` and `validate` reject a second thread for the same content item.

## Step 7. Validate, build the manifest, commit, push

```
python3 tools/fk.py validate            # schema, standards, post lengths; fix everything it flags
python3 tools/fk.py manifest            # rebuilds docs/data/index.json from the data files and sets currentWeek
python3 tools/fk.py log "menu week 4 published, 5 positions, 1 thread queued"
git add -A && git commit -m "Menu week 4" && git push origin HEAD:claude/kitchen
```

If the push is rejected because the remote moved (another run pushed first), `git pull --rebase origin claude/kitchen` and push again. Never force-push, and never push to `main`.

## If something fails

- FK Kitchen cannot clone or push: stop and report "no GitHub access" in the summary (the repositories may have been removed from the FK Kitchen routine, or the Claude GitHub App lost access to them).
- A Cowork task cannot clone the public repo: stop, leave everything as is, and report it.
- Workbook missing (model repo unreachable or file absent): for the Menu, stop and report. For other series, proceed using last week's published Menu (`docs/data/2026/week-NN/menu.json`) as the baseline and say so in the log line.
- A source site is blocked by the fetch tool: use another; never use curl or scripts to fetch web pages.
- Validation fails: fix the content. Do not weaken the validator.
- Do not post to X from FK Kitchen. Posting is the poster's job (`playbook/poster.md`) and FK Order Up's. FK Kitchen only queues.

## Run summary

End every run with a short plain-language summary (what was published, what was queued, anything that needs the owner). The owner reads these from the task's run history.
