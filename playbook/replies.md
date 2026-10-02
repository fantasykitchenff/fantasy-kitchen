# Replies: the rank rule in reply mode

The full reply playbook lives in each FK Replies task prompt (targets, caps, what to reply to, the layout, the follow line) and still stands; `poster.md` section 6 carries the browser mechanics. This file adds one rule to it. Where the prompt copy says "start him", "start as a", "is a start" or anything like it, this file wins.

## Rule 1 applies to replies

A reply that makes a lineup call uses the rank language in `_standards.md` ("Rank language for lineup calls"): the player's position rank on this week's Menu and the tier that rank falls in, and the reader decides. Tiers count twelve (RB1 is ranks 1 to 12, RB2 is 13 to 24, RB3 is 25 to 36; the same for WR, QB and TE).

- Rank 1 to 10: no start call and no "RB1/WR1/QB1/TE1" label; give the number the original post did not have, and the rank only when it adds something ("WR6 for me this week").
- Rank 11 to 14: the rank, called borderline ("RB13 for me, borderline RB1/RB2 this week"; "TE12 for me, a borderline start this week").
- RB/WR 15 to 24: "RB18 for me this week, an RB2." 25 to 30: "a high-end RB3", a high-end flex play. 31 to 36: "a low-end WR3", a low-end flex play. 37 to 48: "a low-end flex play to a dart throw." 49 and deeper: "a dart throw."
- QB/TE 15 and deeper: the rank and "a streamer", or "outside my top 12".
- Banned in every reply: "start him", "start <player>", "start as a ...", "is a start", "must-start", "I'm starting him". "Borderline start" is the one allowed use. Say "for me" or "on the Menu"; never cite consensus.
- A player who falls out of the range: the rank and where it falls; "sit" only after the rank, and only for a player people would otherwise play.
- If the Menu has not ranked him, give the role and the number and no rank.
- Waiver, trade, drop, stash, stream, monitor and pivot calls are unchanged.

## Research: look up the Menu rank

Before drafting a reply about a lineup, open this week's Menu, `docs/data/2026/week-NN/menu.json` (week from `python3 tools/fk.py week`, two digits), and read the player's rank at his position (RB, WR, QB or TE; the FLEX list is the tiebreak between positions). Prep Notes refreshes the Menu on Friday, so the Friday rank is the one to use from Friday evening on. The reply gives that rank and its tier in the words above. The rank is public; the number behind it never is.

For a rest-of-season call (trade for, trade away, hold, drop, buy low, sell high), read the player's rank in kitchen/rankings/<season>-ros.csv and give it as 'WR28 rest of season for me'; if he is not in the file, give the role and the number and no rank.

## Layout

Replies keep their own layout: 1 to 3 sentences, one number the original post did not have, the call, then "Follow @handle for more." (handle from `docs/data/site.json`). No hashtags, no link, no hook closer, never quote the original. The one-player-per-line rule for threads does not apply to replies.

## News scan: send what the big accounts break to the pantry

Every FK Replies run already reads the accounts in `kitchen/targets.md`. On every run, before or after the replies, also take news notes from the same pages and send what is new to FK Kitchen as a pantry filing. The replies rules above do not change; this is a second job on the same page loads.

1. **Collect.** From the posts you read (last 8 hours, skip retweets, promos, polls and betting), keep only items that could change a lineup, waiver or trade call:
   - FACTS: injury news and designations, practice participation, players ruled out or activated, IR moves, signings, releases, trades, suspensions, depth chart and starter changes, a coach's statement about a role, inactives. Mostly from the news accounts.
   - FACTS with usage: snap, route, target or carry numbers posted with a number and a game (from any account).
   - CROWD: a fantasy account's add, drop, buy, sell, start or fade lean on a named player. Record the lean only, never who said it.
2. **Drop what the kitchen already has.** In your read-only clone (`git pull` first), read `kitchen/pantry/<season>-week-NN.md` (week from `python3 tools/fk.py week`, two digits), this week's `docs/data/2026/week-NN/notes.json`, and `kitchen/notes/<TEAM>.md` for each team in the batch. Drop every item already there with the same fact, and drop items you already sent this run.
3. **Decide whether to send.** Send now if the batch has a breaking item: a fantasy starter ruled out, doubtful, placed on IR, traded, released or suspended, a new starting quarterback, or a Sunday inactive. Otherwise send only if the newest "X feed" line in `kitchen/log.md` is more than 60 minutes old (so FK Kitchen runs at most about once an hour from this feed). If you do not send, the items wait for the next run, which reads the pages again. Never send an empty batch.
4. **Send.** Call `fire_trigger` (claude-code-remote; load it with ToolSearch if it is deferred) with the FK Kitchen trigger ID from your task prompt and this text, one line per item, no account handles, no show or analyst names, no projected numbers:
   ```
   job: pantry
   week NN
   part X <time ET>
   FACTS
   - TEAM | Player | the fact | source: insider report, team report, or usage data | posted <time ET>
   RIPPLES
   - TEAM | change | who gains | what share moves | how long | what to watch
   CROWD
   - Player | TEAM | add, drop, buy, sell, start or fade | 1 of 1 (this feed) | the usage number for or against, if the post had one
   WATCH
   - Player | TEAM | what to watch | when
   CALLCHECK
   REPLIES
   ```
   Leave a section empty (keep its heading) when there is nothing for it. RIPPLES only when the post itself says who gains. Put every reply you posted this run under REPLIES as one line (the reply URL), so the kitchen keeps the reply angles in one place.
5. Say in the run summary how many items you sent, or that you held them and why.

FK Kitchen files a part starting "X" by `_sync.md`, "Filings from the X feed".
