# Fantasy Kitchen: how the kitchen runs

This repo is the whole system: the website, the data behind it, the playbooks the scheduled tasks follow, the tools they run, and the queue of posts waiting to go out on X. One source of truth, so the site and the account never drift apart.

## The pieces

| Path | What it is |
| --- | --- |
| `docs/` | The website (Cloudflare Pages serves this folder at fantasykitchenff.com). Static HTML + `assets/app.js` + `assets/styles.css`. No build step. How it is laid out: "The site" below. |
| `docs/data/site.json` | Brand, handle, site URL, season, current week, service schedule, about copy. |
| `docs/data/index.json` | Manifest of every published piece. Rebuilt by `tools/fk.py manifest`. Never edit by hand. |
| `docs/data/2026/week-NN/<series>.json` | One file per piece per week. The site renders these. |
| `docs/data/posts.json` | Feed of everything posted on X, with links. Written by the poster. |
| `playbook/` | The instructions each scheduled task follows. `_standards.md` (voice and hard rules) and `_sync.md` (mechanics) apply to every run. |
| `tools/fk.py` | Week calculator, validator, manifest builder, queue, feed, log. |
| `tools/extract_projections.py` | Reads the projection workbook (kept in the private `fantasy-kitchen-model` repo) into `projections.json` (private input, never published). |
| `queue/pending/` | Posts and threads waiting for the poster. `queue/posted/` is the archive (posted, expired, failed). |
| `kitchen/notes/<TEAM>.md` | Running facts about players, teams, coaches. The kitchen's memory, seeded with about 3,500 dated facts distilled from the project's preseason research docs. |
| `tools/project_stats.py` | Lookups over the project's stat workbooks (player seasons 2010 to 2025, team volumes, the 2026 offensive staffs and their histories). |
| `kitchen/log.md` | One line per task run. |
| `kitchen/targets.md` | Accounts the poster replies to in reply mode. |
| `kitchen/hashtags.json` | The 32 official team hashtags every post uses. Re-check each September; edit here if a team changes its tag. |

## The week

All times Eastern. Nothing posts to X before 10:00 AM ET; `tools/fk.py` enforces it. Each FK scheduled task starts FK Kitchen (a Claude Code routine with the repositories attached), which runs the series and pushes. The poster and FK Order Up run with the owner's computer attached and do the posting.

| When | Task | Playbook | Posts at |
| --- | --- | --- | --- |
| Mon 7:15 AM | Leftovers | `playbook/leftovers.md` | 10:25 AM |
| Tue 5:15 AM | Market Run | `playbook/market-run.md` | 10:25 AM |
| Tue 12:52 PM | Butcher Shop + Heat Check | `playbook/butcher-heat.md` | 1:25 PM |
| Wed 5:52 AM | The Menu | `playbook/menu.md` | 10:25 AM |
| Thu 7:52 AM | Serve or Sit (called On the Line through Week 4) | `playbook/on-the-line.md` | 10:25 AM, TNF reminder 6:25 PM |
| Fri 5:45 PM | Prep Notes (+ Menu refresh) | `playbook/prep-notes.md` | 6:25 PM |
| Sun 11:36 AM, 3:36 PM | Order Up (FK Kitchen researches and queues; the computer-attached task posts it as soon as it lands) | `playbook/order-up.md` | immediately |
| Daily 12:00 PM, 6:00 PM (FK Daily; the FK Kitchen Notes task also fires 12:12 and 7:12 PM) | Kitchen Notes: the site at every run, plus the day's one thread from the first run at 5:30 PM ET or later | `playbook/kitchen-notes.md` | 6:25 PM (8:25 PM if late) |
| 10:25 AM, 1:25, 6:25, 8:25 PM | Poster (computer attached) + reply mode at 1:25 and 8:25 PM | `playbook/poster.md` | n/a |

## Data flow

1. At each scheduled time, the FK scheduled task for the series starts FK Kitchen with `job: series <name>`. FK Kitchen, a Claude Code routine with this repo and the private `fantasy-kitchen-model` repo attached, reads the projection workbook (`*_Team_Projections.xlsx`), the kitchen notes, and project memory and research docs when its tools allow, researches the week, writes `docs/data/2026/week-NN/<series>.json`, queues posts, validates, rebuilds the manifest, and pushes to `claude/kitchen`.
2. Cloudflare Pages serves `docs/` from `claude/kitchen` at fantasykitchenff.com and redeploys within a minute or two of the push.
3. The poster (a Cowork task on the owner's computer) clones the repo read-only, posts due items through the built-in browser, and sends FK Kitchen a ledger of what it posted. FK Kitchen writes each post's URL into `docs/data/posts.json` and the piece's `posts[]` and pushes. The site's "From the Pass" feed and every piece's "As posted on X" link update on that push.

Why the split: Cowork scheduled tasks cannot be given GitHub repositories, and a Claude Code routine cannot use the owner's computer. FK Kitchen does everything that writes to GitHub; the two computer-attached tasks do everything that touches X.

## Owner's controls

- **Pause everything:** disable the FK scheduled tasks in the Claude app (Cowork, Scheduled). FK Kitchen only runs when one of them starts it. The repo and site keep serving.
- **Pause posting only:** disable the Poster task. Content keeps publishing to the site; the queue waits and time-sensitive items expire on their own.
- **Change the voice or a rule:** edit `playbook/_standards.md`. Every run reads it fresh.
- **Change a series:** edit its playbook. Change times in the task's schedule in the Claude app and in `docs/data/site.json` (schedule) so the site matches.
- **Update the model:** upload the new projection workbook (`*_Team_Projections.xlsx`) to the private `fantasy-kitchen-model` repo (GitHub web: Add file, Upload files, same name). The next run reads it.
- **Change reply targets:** edit `kitchen/targets.md`.
- **Fix a published piece by hand:** edit the JSON on GitHub on the `claude/kitchen` branch (web editor is fine), then run any task or wait; the site reads files directly, no manifest change needed unless the title or dek changed (then a run will rebuild it).
- **Hosting and domain:** the site is `https://fantasykitchenff.com`, hosted on Cloudflare Pages (project `fantasy-kitchen`, production branch `claude/kitchen`, output folder `docs`, no build command). Every push redeploys it. The same URL is `site_url` in `docs/data/site.json`, which every post link is built from. GitHub Pages is not used.

## The site

Game day in the kitchen. Every page shares one frame, the field: turf green with mowing stripes, chalk lines, the end zone header, the leather tab bar on phones, goalpost yellow for what is active, and two typefaces (Graduate for titles and numbers, Archivo for everything else). What changes is the object the content sits on, set per series in `SERIES` at the top of `docs/assets/app.js`:

| Plate | Looks like | Series |
| --- | --- | --- |
| `board` | the menu board in a wood frame | The Menu |
| `ticket` | paper order tickets on the rail | Market Run, Butcher Shop, Serve or Sit, Prep Notes, Order Up |
| `field` | broadcast graphics on the turf | This week (home: the scoreboard and the week's schedule on yard lines), Heat Check, Leftovers, From the Pass, About |

- Every page with players on it has a position bar (All, QB, RB, WR, TE) that filters every list on the page, from each player's `pos` (the Menu's positions fill in a player who has none). The Menu keeps its own position tabs. The choice is in the URL hash: `market.html#RB`, `menu.html#WR`.
- Each piece shows Published and Updated, the chef's intro (first paragraph, the rest behind "Keep reading"), and the "Updated ..." notes at the top of `intro_md` under "What changed" (`_sync.md`, "Updating a published piece").
- The Menu opens with a red note that the rankings are further down, with a tap to jump to them. It shows no Start, Sit or slot labels and no Off the Menu list: the rank and the tier say it, Flex marks the flex range, Stream marks a streamer ranked 13.
- Lineup calls (START, FLEX, SIT, STREAM) never show a Start label anywhere. Where the verdict is on the page, the call has no stamp; on home and in previews it shows the player's rank on this week's Menu, marked "Menu".
- Serve or Sit is the Thursday series that was called On the Line. Its page is still `line.html` and its data `line.json`.
- Page addresses are the ones the posts link to, so they never change: `menu.html?week=4` opens a week, `menu.html#RB` a position.
- Home reads the schedule in `docs/data/site.json` and marks each service served, live, cooking, next or upcoming. The week rolls over on Tuesday by the clock, even before the first run of the week.
- Everything on the site is free, and everything in `docs/` is public. Members content must never be committed to this repo. When the paid tier launches it gets its own signed-in source and renders in the members slot every piece page already has (`MEMBERS` in `app.js`); until then the slot only shows in the sample preview.
- Add `?sample=1` to any page to render `docs/data/sample/`, and `&now=2026-10-04T15:50:00Z` to move the clock while testing.

## Local preview

```
cd docs && python3 -m http.server 8000
```
Open `http://localhost:8000/index.html?sample=1` for the layout with sample data, or without `?sample=1` for the live data files.

## Validation

`python3 tools/fk.py validate` runs on every push through GitHub Actions and fails the check when a piece breaks the standards: em dashes, arrows, emoji, analyst names, projected numbers, bot phrasing, missing or incomplete actions, a non-reply that is not a thread, a thread outside 15 to 25 posts (10 to 25 for Kitchen Notes and Order Up) or naming too few teams, a second thread for the same content item, a Kitchen Notes thread queued before 5:30 PM ET, a hook without its closer, a post without its team hashtags or with a hashtag that is not official (`kitchen/hashtags.json`), over-length posts, links anywhere but the last post, a thread or reply that does not end by telling people to follow.
