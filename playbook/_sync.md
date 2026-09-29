# Kitchen mechanics: where things live and how a task moves data

Every scheduled kitchen task follows this file first, then its series playbook. Do the steps in order. Do not improvise around a failed step; log it and stop (see "If something fails").

## Where things live

| Thing | Where | How a task reaches it |
| --- | --- | --- |
| Site, data, playbooks, tools, queue | GitHub repo `OWNER/fantasy-kitchen` (public), branch `claude/kitchen` | FK Kitchen clones and pushes it; Cowork tasks clone it read-only (see Step 1) |
| Projection workbook | GitHub repo `OWNER/fantasy-kitchen-model` (private), the projection workbook (the `*_Team_Projections.xlsx` file) at the root | cloned by FK Kitchen; read with `tools/extract_projections.py` |
| Editorial doctrine | `playbook/_standards.md` in the repo (mirrors project memory) | read it every run |
| Running facts about players, teams, coaches | `kitchen/notes/<TEAM>.md` in the repo (seeded from the project's research docs) | read the teams you write about; append what you learned |
| Preseason research docs (about 100) and past-season stat workbooks | the Fantasy football project on claude.ai | Projects tool: `project_search`, `project_read`; `tools/project_stats.py` for the workbooks |
| Doctrine and the state of the owner's leagues | project memory (`doctrine.md`, `overview.md`) | memory tools: `memory_read` |
| Publication log | `kitchen/log.md` | append one line per run |
| The live site | `https://fantasykitchenff.com`, served by Cloudflare Pages from the `docs/` folder of `claude/kitchen` (it redeploys on every push); the same URL is `site_url` in `docs/data/site.json` | link target for posts. Never link to a github.io or pages.dev address or write a site URL by hand: links come only from `site_url` through `tools/fk.py queue add --link`. While `site_url` is empty, posts go out with no site link. |

`OWNER` is the GitHub account named in the task prompt.

## Step 1. Get the repos

Two kinds of runs touch the repo, and they reach it differently.

- **FK Kitchen** is a Claude Code routine with `OWNER/fantasy-kitchen` and `OWNER/fantasy-kitchen-model` attached. It is the only run that pushes. Every series runs inside it (Leftovers, Market Run, Butcher Shop and Heat Check, the Menu, On the Line, Prep Notes, Kitchen Notes, and Order Up's research): the FK scheduled task for each series only starts FK Kitchen with `job: series <name>`. It also records the ledgers the poster sends (`poster.md`, "Ledger").
- **The poster and the FK Order Up task** are Cowork scheduled tasks with the owner's computer attached, because they post through the browser. Cowork tasks cannot be given repositories (their git proxy refuses any repo that is not attached), so they clone the public repo read-only, never commit or push, and send what they did to FK Kitchen as a ledger.

In FK Kitchen:

1. The checkouts are in the working directory (`ls`); clone either one from `https://github.com/OWNER/<name>.git` if it is missing. Credentials come from the routine; never type one.
2. All work happens on the branch `claude/kitchen`, the repo's default branch: `git fetch origin claude/kitchen && git checkout -B claude/kitchen origin/claude/kitchen`. Branches whose names start with `claude/` always accept the routine's pushes, so `main` is not used.
3. Confirm `git status` is clean and `git log -1` shows the latest commit. Do not create other branches.
4. `pip install openpyxl --break-system-packages -q` if the run needs the workbook.

In a Cowork task (the poster, FK Order Up):

1. `git clone --depth 20 --branch claude/kitchen https://github.com/OWNER/fantasy-kitchen.git "$SCRATCH/fk"` (public, no credentials needed) and `cd "$SCRATCH/fk"`. Do not clone the model repo; it is private and these tasks do not need it.
2. The checkout is read-only scratch. Tools like `queue expire` may change files locally, but nothing is committed or pushed from a Cowork task; the ledger is how its results reach the repo.

## Step 2. Know what week it is

`python3 tools/fk.py week` prints the content week (Tuesday through Monday cycle, Eastern time) and the dates of its Tuesday, Thursday, Sunday and Monday. On Monday it still returns the week that just finished, which is what Leftovers wants. Never hardcode a week number. `python3 tools/fk.py when "Wed 07:20"` converts a weekday and Eastern time inside the content week to the UTC timestamp the queue uses; `now` and `+6h` work too.

## Step 3. Load the model (rankings-bearing series only: Menu, On the Line, Prep Notes, Order Up, Market Run, Butcher Shop, Heat Check)

1. The workbook is the `*_Team_Projections.xlsx` file at the root of the `fantasy-kitchen-model` checkout (`ls *_Team_Projections.xlsx`). (If that repo is unavailable but the Claude Project lists a file of that name, `project_read` it instead; the bytes land in a local file.)
2. `python3 tools/extract_projections.py "<path to xlsx>" --out "$SCRATCH/projections.json"`. If it reports that it could not find the player table, run it with `--inspect`, read the sheet and header list it prints, and pass the right sheet with `--sheet` and column names with `--map` (the flags are documented in the script). Do not guess player values; if extraction fails twice, stop and log it.
3. `projections.json` holds, per player: name, team, position, rest-of-season per-game projection, weekly projection when the workbook carries one, and any owner flags. These numbers are inputs. They are never published, never written to notes, never committed to the public repo. Rankings are ordered by them, then adjusted by this week's news per the series playbook, and only ranks and tiers leave the kitchen.

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

## Step 6. Queue the posts

Write each post or thread as a queue item with the tool so ids, timing and validation are consistent:

```
python3 tools/fk.py queue add --series menu --week 4 --kind thread \
  --at "Wed 07:20" --not-after "Thu 18:00" \
  --link "menu.html?week=4" --texts-file "$SCRATCH/menu-thread.json"
```

`--at` and `--not-after` take a weekday and Eastern time inside the content week ("Wed 07:20"), `now`, `+6h`, or an ISO timestamp. The poster runs at 7:25, 9:25, 13:25, 18:25 and 20:25 ET, so schedule posts a few minutes before one of those.

`--texts-file` is a JSON array of strings, one per post. Everything except a reply is a thread: post 1 is the hook and ends with a closer ("Let's dive in." and the others in `_standards.md`), every post but the last carries the official hashtag of each team it names (`kitchen/hashtags.json`), the last post ends with the follow line ("Follow @handle for the rest of the week's calls, and repost this for your league."), and the tool appends the site link after it (replies use `--kind post --no-link` and end with "Follow @handle for more."). Items post at or after `--at` the next time the poster runs and are skipped forever after `--not-after`. Sunday-morning content must carry a tight `--not-after` (kickoff), rankings can carry a day. Add the item's id to the piece's `posts` array.

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
