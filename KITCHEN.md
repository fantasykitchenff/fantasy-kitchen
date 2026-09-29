# Fantasy Kitchen: how the kitchen runs

This repo is the whole system: the website, the data behind it, the playbooks the scheduled tasks follow, the tools they run, and the queue of posts waiting to go out on X. One source of truth, so the site and the account never drift apart.

## The pieces

| Path | What it is |
| --- | --- |
| `docs/` | The website (Cloudflare Pages serves this folder at fantasykitchenff.com). Static HTML + `assets/app.js` + `assets/styles.css`. No build step. |
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

All times Eastern. Each FK scheduled task starts FK Kitchen (a Claude Code routine with the repositories attached), which runs the series and pushes. The poster and FK Order Up run with the owner's computer attached and do the posting.

| When | Task | Playbook | Posts at |
| --- | --- | --- | --- |
| Mon 7:15 AM | Leftovers | `playbook/leftovers.md` | 9:25 AM |
| Tue 5:15 AM | Market Run | `playbook/market-run.md` | 7:25 AM |
| Tue 12:52 PM | Butcher Shop + Heat Check | `playbook/butcher-heat.md` | 1:25 PM |
| Wed 5:52 AM | The Menu | `playbook/menu.md` | 7:25 AM |
| Thu 7:52 AM | On the Line | `playbook/on-the-line.md` | 9:25 AM, TNF reminder 6:25 PM |
| Fri 5:45 PM | Prep Notes (+ Menu refresh) | `playbook/prep-notes.md` | 6:25 PM |
| Sun 8:36, 11:36 AM, 3:36 PM | Order Up (FK Kitchen researches and queues; the computer-attached task posts it as soon as it lands) | `playbook/order-up.md` | immediately |
| Daily 12:12 PM, 7:12 PM | Kitchen Notes | `playbook/kitchen-notes.md` | 1:25 PM, 8:25 PM |
| 7:25, 9:25 AM, 1:25, 6:25, 8:25 PM | Poster (computer attached) + reply mode at 1:25 and 8:25 PM | `playbook/poster.md` | n/a |

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

## Local preview

```
cd docs && python3 -m http.server 8000
```
Open `http://localhost:8000/index.html?sample=1` for the layout with sample data, or without `?sample=1` for the live data files.

## Validation

`python3 tools/fk.py validate` runs on every push through GitHub Actions and fails the check when a piece breaks the standards: em dashes, arrows, emoji, analyst names, projected numbers, bot phrasing, missing or incomplete actions, a non-reply that is not a thread, a hook without its closer, a post without its team hashtags or with a hashtag that is not official (`kitchen/hashtags.json`), over-length posts, links anywhere but the last post, a thread or reply that does not end by telling people to follow.
