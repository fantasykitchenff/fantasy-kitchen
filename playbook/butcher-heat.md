# Butcher Shop and Heat Check (Tuesday afternoon): trade for, trade away, risers, fallers

Runs Tuesday 2:00 PM ET (FK Daily), after the 1:00 PM pantry. Posts at 6:25 PM ET. Two pieces from one run: `butcher.json` and `heat.json`. Week = current content week.

## What they are

Butcher Shop is trade advice: 10 to 15 players to trade for and 10 to 15 to trade away, each with a price. Heat Check is the trend read: 10 to 15 risers ("stove's on") and 10 to 15 fallers ("left to cool"), each backed by one number. Trade advice is about rest-of-season value versus what the box score is telling people; Heat Check is about the direction of usage.

These are the pieces people bring into trade talks, and a short list misses most of the rosters in a league. Use everything the kitchen learned this week: the pantry (the owner's podcasts and research), Kitchen Notes, the replies, Leftovers usage, the kitchen notes files. Cover every position: QB, RB, WR and TE on each side whenever the research backs a call (at least one QB and one TE per side is the usual week; RB and WR fill the rest). The site filters both pages by position, so every player carries `pos`.

The validator rejects a Butcher Shop or Heat Check with fewer than 10 players on either side, from Week 5 on. Ten is the floor, not the target: never pad with a call the numbers do not back, and never stop at ten when the research backs more.

## Inputs

1. `_sync.md` steps 1 to 3 (workbook needed: rest-of-season projections are the value side of every trade call). Then step 4a: project memory, the kitchen notes for every team involved, the project's research docs, and the stat workbooks through `tools/project_stats.py`.
2. This week's Leftovers and Market Run (Monday and Tuesday morning). Do not repeat a Market Run add as a trade target.
3. `kitchen/notes/` for teams involved.

## Research

- Three-week usage trends for every player in the top 40 at RB and WR and top 12 at QB and TE: snap share, route share, target share, carries, red zone touches, air yards. Pull from a public snap count / usage page or the weekly box scores.
- Box-score production for the same window (fantasy points scored, touchdowns).
- Schedule the next four weeks for the teams involved (a soft or hard stretch is a legitimate price lever).
- Injury timelines for anyone named.

## Method

Butcher Shop
- Trade for: players whose rest-of-season projection rank is clearly better than their recent scoring rank (usage is good, production lagged, touchdowns will come), or whose role just improved and the market has not priced it. Give a price: what to offer in plain terms ("a WR2 and a bench RB", "a RB2-level player").
- Trade away: players whose recent scoring beats their usage (touchdown-driven), whose role is eroding, or whose schedule hardens. Give an ask.
- Every player: `why` is two sentences with the deployment number, `verdict` is the action. Never mention the projection number; say "the rest-of-season number likes him" if needed.
- The price is a real example a reader can put in an offer: "a WR2 and a bench RB", "a RB2 who catches passes", "a top-8 TE". Keep it for every player on both sides.

Heat Check
- Riser: a usage metric that rose over three consecutive weeks, or a role change confirmed by deployment. Faller: the opposite. Not box scores. One player can be a faller in Heat Check and a trade-for in Butcher Shop only when the write-up says why (usage down but price down more).
- `stat` is the single number that makes the case, as a compact string: "Route share 61% to 78% to 91%".

## `data` shapes

butcher.json
```json
{ "buy": [ { "player": "", "team": "", "pos": "", "action": "TRADE_FOR", "price": "what to offer", "why": "", "verdict": "" } ],
  "sell": [ { "player": "", "team": "", "pos": "", "action": "TRADE_AWAY", "price": "what to ask for", "why": "", "verdict": "" } ] }
```
heat.json
```json
{ "risers": [ { "player": "", "team": "", "pos": "", "stat": "", "why": "", "verdict": "", "action": "START", "slot": "WR2" } ],
  "fallers": [ { "player": "", "team": "", "pos": "", "stat": "", "why": "", "verdict": "", "action": "TRADE_AWAY", "price": "" } ] }

Heat Check actions: a riser is START (with `slot`), TRADE_FOR (with `price`), CLAIM or ADD (with `faab`), or HOLD; a faller is SIT, TRADE_AWAY (with `price`), DROP, or MONITOR (with `watch`). Pick the one the reader acts on first. A START, FLEX or SIT verdict is written in rank language (the Menu rank and its tier, `_standards.md`), never "start him".
```

Envelopes: `title` "Butcher Shop, Week N" and "Heat Check, Week N"; `dek` one sentence each; `intro_md` one paragraph each.

## Through the week

Butcher Shop and Heat Check are not frozen on Tuesday. Every pantry filing and every Kitchen Notes run (`_sync.md`, "The day's clock"; `kitchen-notes.md`, step 5) adds players when new usage, news or research makes a case: a role that changed is a Heat Check riser or faller, a price that moved is a Butcher Shop buy or sell. Add the player at the end of the right list with every field, replace a call the news made wrong (and say so in the Updated note), and keep the lists in one order: the strongest call first. By Sunday each list should hold 12 to 20 players. Each run that adds players writes an Updated note naming them (`_sync.md`, "Updating a published piece").

## Posts

Two threads, both `--not-after "Wed 12:00"`. Each hook ends with a closer from `_standards.md` on its own line; every post but the last ends with the official hashtag of each team it names on its own last line. One player per line in every post with an empty line between players, no start commands (`_standards.md`). The threads carry the best calls; the site carries every player, and each close says how many ("All 26 trade calls are on the site.").

Butcher Shop thread, 6 to 8 posts, `--at "Tue 18:20"`, `--link "butcher.html?week=N"`: hook (best buy, one number), the top buys in two posts (one player per line: name, the number, the price), the top sells in two posts, the one trade to make today, close plus link.

Heat Check thread, 5 to 7 posts, `--at "Tue 18:22"`, `--link "heat.html?week=N"`: hook (biggest riser and the number), the top risers in two posts (one player per line: name, the stat, verdict), the top fallers in two posts, close plus link.

## Finish

`_sync.md` steps 6 and 7 for both pieces. Log: "Butcher Shop week N: a buys, b sells; Heat Check: c risers, d fallers; 2 threads queued".
