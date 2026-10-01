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

## Layout

Replies keep their own layout: 1 to 3 sentences, one number the original post did not have, the call, then "Follow @handle for more." (handle from `docs/data/site.json`). No hashtags, no link, no hook closer, never quote the original. The one-player-per-line rule for threads does not apply to replies.
