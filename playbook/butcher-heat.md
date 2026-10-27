# Butcher Shop and Heat Check (Tuesday afternoon): trade for, trade away, risers, fallers

Runs Tuesday 2:00 PM ET (FK Daily), after the 1:00 PM pantry. Posts at 6:25 PM ET. Two pieces from one run: `butcher.json` and `heat.json`. Week = current content week.

## What they are

Butcher Shop is trade advice: 10 to 15 players to trade for and 10 to 15 to trade away, each with his rest-of-season rank, the reasons and the call ("Buy him." or "Sell him."). No trade prices: never tell readers what to offer or ask for (`_standards.md`, the action rule). Heat Check is the trend read: 10 to 15 risers ("stove's on") and 10 to 15 fallers ("left to cool"), each backed by one number. Trade advice is about rest-of-season value versus what the box score is telling people; Heat Check is about the direction of usage.

These are the pieces people bring into trade talks, and a short list misses most of the rosters in a league. Use everything the kitchen learned this week: the pantry (the owner's podcasts and research), Kitchen Notes, the replies, Leftovers usage, the kitchen notes files. Cover every position: QB, RB, WR and TE on each side whenever the research backs a call (at least one QB and one TE per side is the usual week; RB and WR fill the rest). The site filters both pages by position, so every player carries `pos`.

The validator rejects a Butcher Shop or Heat Check with fewer than 10 players on either side, from Week 5 on. Ten is the floor, not the target: never pad with a call the numbers do not back, and never stop at ten when the research backs more.

## Inputs

1. `_sync.md` steps 1 to 3 (workbook needed: rest-of-season projections are the value side of every trade call). Then step 4a: project memory, the kitchen notes for every team involved, the project's research docs, and the stat workbooks through `tools/project_stats.py`.
2. This week's Leftovers and Market Run (Monday and Tuesday morning). Do not repeat a Market Run add as a trade target.
3. `kitchen/notes/` for teams involved.

## Research

- Three-week usage trends for every player in the top 40 at RB and WR and top 12 at QB and TE: snap share, route share, target share, carries, red zone touches, air yards. Pull from a public snap count / usage page or the weekly box scores.
- Box-score production for the same window (fantasy points scored, touchdowns).
- Schedule the next four weeks for the teams involved (a soft or hard stretch is a legitimate reason to buy or sell now).
- Injury timelines for anyone named.

## Method

Butcher Shop
Before writing any Butcher Shop or Heat Check player, read his whole history in `kitchen/notes/<TEAM>.md`: every dated line for him and for his position group, not just the newest, plus the week's pantry board (`kitchen/pantry/<season>-week-NN.md`, this week and last) and this week's pieces (Leftovers, Market Run, Kitchen Notes, the Menu when it is out). The `why` carries the context a box score does not: the weeks before, role changes, injuries, teammates in and out, practice reports, the play-caller, the schedule. A why that only restates Sunday's line is not done.

Butcher Shop
- Trade for: players whose rest-of-season rank is clearly better than their recent scoring (usage is good, production lagged, touchdowns will come), or whose role just improved and the market has not caught up.
- Trade away: players whose recent scoring beats their usage (touchdown-driven), whose role is eroding, or whose schedule hardens.
- Every player: `why` is three or four sentences: this week's deployment number, then the history behind it (the earlier weeks, the role change, who is in or out, the injury and practice record). `verdict` is his rest-of-season rank from `kitchen/rankings/<season>-ros.csv` and the call: "RB6 rest of season for me. Buy him." or "WR19 rest of season for me. Sell him on the two scores." Variations are fine ("Buy him during the bye."). Never mention the projection number.
- No `price`, no "offer", no "ask for": every league and situation is different, so the reader sets the terms. The validator rejects a trade price in the data or the copy.

Heat Check
- Riser: a usage metric that rose over three consecutive weeks, or a role change confirmed by deployment. Faller: the opposite. Not box scores. One player can be a faller in Heat Check and a trade-for in Butcher Shop only when the write-up says why (usage down, but his value fell further than his role).
- `stat` is the single number that makes the case, as a compact string: "Route share 61% to 78% to 91%".

## `data` shapes

butcher.json
```json
{ "buy": [ { "player": "", "team": "", "pos": "", "action": "TRADE_FOR", "why": "", "verdict": "" } ],
  "sell": [ { "player": "", "team": "", "pos": "", "action": "TRADE_AWAY", "why": "", "verdict": "" } ] }
```
heat.json
```json
{ "risers": [ { "player": "", "team": "", "pos": "", "stat": "", "why": "", "verdict": "", "action": "START", "slot": "WR2" } ],
  "fallers": [ { "player": "", "team": "", "pos": "", "stat": "", "why": "", "verdict": "", "action": "TRADE_AWAY" } ] }

Heat Check actions: a riser is START (with `slot`), TRADE_FOR, CLAIM or ADD (with `faab`), or HOLD; a faller is SIT, TRADE_AWAY, DROP, or MONITOR (with `watch`). Pick the one the reader acts on first. A START, FLEX or SIT verdict is written in rank language (the Menu rank and its tier, `_standards.md`), never "start him".
```

Envelopes: `title` "Butcher Shop, Week N" and "Heat Check, Week N"; `dek` one sentence each; `intro_md` one paragraph each.

## Through the week

Butcher Shop and Heat Check are not frozen on Tuesday. Every pantry filing and every Kitchen Notes run (`_sync.md`, "The day's clock"; `kitchen-notes.md`, step 5) adds players when new usage, news or research makes a case: a role that changed is a Heat Check riser or faller, a value that moved is a Butcher Shop buy or sell. Add the player at the end of the right list with every field, replace a call the news made wrong (and say so in the Updated note), and keep the lists in one order: the strongest call first. By Sunday each list should hold 12 to 20 players. Each run that adds players writes an Updated note naming them (`_sync.md`, "Updating a published piece").

## Posts

Two content items, so two threads (one each, never more), both `--not-after "Wed 12:00"`, each 15 to 25 posts naming at least 14 teams. Every buy and sell goes in the Butcher Shop thread and every riser and faller in the Heat Check thread, one or two teams per post, with the pantry board's usage and crowd lines behind each call. If a thread has not posted when a later run adds players, rewrite it with `--replace <id>`. Each hook is a general intro with highlights, a closer only if the thread runs 20 or more posts, per `_standards.md`; in every post but the last, the official hashtag of each player's team sits directly before his first mention ("#ChiefsKingdom Kenneth Walker III, KC RB: ..."), one per team per post, with no hashtag line at the end and none in the close. One player per line in every post with an empty line between players, no start commands (`_standards.md`). The threads carry every call on the site.

Butcher Shop thread, 15 to 25 posts, `--at "Tue 18:20"`, `--link "butcher.html?week=N"`: hook (a general intro to the week's buys and sells, with the best buy as a highlight; a closer only if the thread runs 20 or more posts, per `_standards.md`), every buy (one player per line: tag and name, the number and the reason, his rest-of-season rank, "Buy him."), every sell (the same, "Sell him."), the one trade to make today, close plus link.

Heat Check thread, 15 to 25 posts, `--at "Tue 18:22"`, `--link "heat.html?week=N"`: hook (a general intro to the week's risers and fallers, with the biggest riser as a highlight; a closer only if the thread runs 20 or more posts, per `_standards.md`), every riser (one player per line: name, the stat, verdict), every faller, close plus link.

## Finish

`_sync.md` steps 6 and 7 for both pieces. Log: "Butcher Shop week N: a buys, b sells; Heat Check: c risers, d fallers; 2 threads queued".
