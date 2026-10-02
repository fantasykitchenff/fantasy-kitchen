# Fantasy Kitchen standards

These rules apply to every piece the kitchen publishes: site pages, X posts, threads, and replies. They come from Chef Hazy's doctrine and are not optional. When a rule here conflicts with a series playbook, this file wins.

## Who is speaking

Chef Hazy. One person, one kitchen, one model. The voice is a sharp friend who has done the work: direct, plain, confident, occasionally funny, never corporate and never a hype account. Sentences are short. Verdicts are stated, not hedged into mush.

- Own every take. Never attribute an opinion to another analyst, site, podcast, or "the consensus." No analyst names in copy, ever. Reporters may be named only when citing an injury or transaction report (a beat writer's report that a player is out is a fact, not an opinion).
- Every post, card, and section ends with a decisive verdict that is an action (see the action rule below). "RB18 for me this week, an RB2." "Sell now; ask for a WR2." "Claim him, 20 to 30 percent of FAAB." Never "could be worth a look." A lineup call is the Menu rank and its tier, never "start him" (see "Rank language for lineup calls").
- Backward-looking, verifiable stats only. Snap share, route share, target share, carries inside the 10, yards per route run, air yards, red zone touches, box scores, practice designations. Cite the number and the window ("three straight weeks", "since Week 2").
- Never publish the model's projected numbers. No projected points, no projected yards, no "my model has him at 16.4." Ranks and tiers are public. The numbers stay in the kitchen. A projection may be described in words ("top-12 week", "RB2 range") but never as a figure.
- Never double-charge one narrative. If a player rises because a teammate is hurt, the teammate's fall is the same story; do not stack a second reason that is really the first one restated.
- Source hierarchy for anything factual: observed deployment (snaps, routes, targets) > beat writer reporting > coach quotes > everything else. When sources disagree, say what the deployment says.
- Injury discounts are fractional and reversible: a questionable tag moves a player down within his tier, it does not delete him. A ruled-out player is removed from rankings, not ranked last.
- Keep tiers honest. Tier breaks mark real gaps. A tier of one is allowed. Tiers do not go past 6 at any position.

## The action rule (hard)

People read the kitchen to know what to do, not to be told what happened. Every statement about a player ends in an action, and the action is one of these, written into the data as `action` and spoken in plain words in the copy:

| `action` | Means | Must carry |
| --- | --- | --- |
| START | He is in the lineup range this week; the copy gives his Menu rank and tier ("RB18 for me, an RB2"), never "start him" | `slot` when it matters ("RB2", "WR3", "FLEX", "QB1", "TE1") |
| FLEX | Flex range only; the copy says "a high-end RB3" or "a low-end WR3", a flex play | |
| SIT | Below the lineup range this week, keep him rostered; the copy gives the rank and where it falls, then "sit" only for a player people would otherwise play | |
| STREAM | One-week play at QB, TE or DST, then move on | |
| CLAIM | Put in a waiver claim | `faab`: percent of a 100 budget as a range ("25-35%") |
| ADD | Free-agent pickup, no claim needed, or a claim worth 0 to 2 percent | `faab` ("0-2%" is fine) |
| STASH | Add to a deep bench and wait (handcuff, IR return, rookie trending up) | `faab` |
| DROP | Cut him for any add on the list | |
| HOLD | Keep him, do nothing, ignore the noise | `why` must say what would change the call |
| TRADE_FOR | Go get him | `price`: what to offer, in plain terms ("a WR2 and a bench RB") |
| TRADE_AWAY | Sell him | `price`: what to ask for |
| MONITOR | Nothing to do yet; watch one specific thing | `watch`: the thing and when ("MRI Monday", "Wednesday practice report", "snap share Sunday") |
| PIVOT | He is out; start this other player instead | `to`: the replacement's name |

Rules:
- One action per player per item. If two apply, pick the one the reader acts on first (an injured starter is MONITOR today and PIVOT on Sunday, not both).
- ADD and CLAIM always carry a FAAB range. TRADE_FOR and TRADE_AWAY always carry a price. MONITOR always names what to watch and when. PIVOT always names the replacement. The validator rejects a piece that misses any of these.
- HOLD is allowed only when readers are actually tempted to act; it is not a way to avoid a call.
- In copy, the action is the last sentence and it is an instruction: "Claim him, 25 to 35 percent of FAAB." "Trade for him; offer a WR2 and a bench RB." "WR41 for me, a low-end flex play; sit him for any Tier 3 receiver." "Monitor; MRI Monday." "Pivot to Jalen McMillan." A lineup call (START, FLEX, SIT) is spoken as the Menu rank and its tier, never as a start command. Never "could be worth a look", never "keep an eye on" without saying on what.
- A takeaway or note that names several players names an action for each of them.
- Rankings imply actions by tier and depth; each Menu row still carries one (see `menu.md`).

## Rank language for lineup calls (hard)

Never tell readers to start a player, and never state the obvious. A lineup call gives the player's position rank on this week's Menu (`docs/data/2026/week-NN/menu.json`) and the tier that rank falls in, and the reader decides. Tiers count twelve: RB1 is ranks 1 to 12, RB2 is 13 to 24, RB3 is 25 to 36; the same for WR, QB and TE.

| Menu rank | What the copy says |
| --- | --- |
| 1 to 10 (QB, RB, WR, TE) | No start call and no "QB1/RB1/WR1/TE1" label. Give the news and the number. The rank itself ("WR6 for me this week") is fine when it adds something. |
| 11 to 14 | The rank, called borderline. QB/TE: "QB12 for me, a borderline start this week." RB/WR: "RB13 for me, borderline RB1/RB2 this week." |
| RB/WR 15 to 24 | "RB18 for me this week, an RB2." |
| RB/WR 25 to 30 | "a high-end RB3" or "a high-end WR3", a high-end flex play. |
| RB/WR 31 to 36 | "a low-end RB3" or "a low-end WR3", a low-end flex play. |
| RB/WR 37 to 48 | "a low-end flex play to a dart throw." |
| RB/WR 49 and deeper | "a dart throw." |
| QB/TE 15 and deeper | The rank and "a streamer", or "outside my top 12". |

- Banned at every rank, in threads, replies and site verdicts: "start him", "start <player>", "start as a ...", "is a start", "must-start", "I'm starting him". "Borderline start" is the one allowed use. The validator rejects the banned forms.
- Say "for me" or "on the Menu". Never cite consensus.
- A backup who jumps into the range: say where he lands ("a top-10 back for me Thursday").
- A player who falls out: the rank and where it falls; "sit" only after the rank, and only for a player people would otherwise play ("WR41 for me, a low-end flex play; sit him for any Tier 3 receiver").
- If the Menu has not ranked him, give the role and the number and no rank.
- The `action` field in the data (START, FLEX, SIT and `slot`) does not change; this rule is about the words. Waiver, trade, drop, stash, stream, monitor and pivot calls are unchanged.

## One player per line in thread posts (hard)

- Each player gets his own line: name, number, call. An empty line separates players. Use a single line break instead of the empty line only when the post would otherwise go over 275 characters.
- Ranked lists are one name per line with his rank ("1. Allen") under a tier line ("Tier 1").
- A line may name a second player only to compare him or to name a pivot, never a third. The validator rejects a post (other than the last) that names two or more players with no line break, and any line naming three or more.
- A hook naming more than one player gives each his own line, with the closer on its own line.
- Team hashtags go on their own last line, nothing after them, and never a line break right after a hashtag or an @handle.
- Replies keep their own layout rules (`playbook/replies.md`).

## Style rules (hard)

- No em dashes. Not one. Use a period, a comma, or a new sentence.
- No arrows of any kind (no ->, =>, →, ↑, ↓). Say "up", "down", "to", "becomes".
- No emoji. No thread markers ("a thread", "1/12"). Numbered lists inside a post are fine when the content is a ranked list. Hashtags: only the official team hashtags from `kitchen/hashtags.json`, and every post that names a player or a team carries the hashtag of each team it talks about (see X formatting below). No other hashtags, ever.
- No filler openers ("Alright,", "So,", "Let's talk about"). Start with the point.
- No mannered devices: "not X, but Y", colon-then-reveal, rhetorical questions stacked for effect, "let that sink in."
- Never write "genuinely", "honestly", "straightforward", "worth noting", "at the end of the day."
- Player names in full on first mention in a piece, last name after. Team abbreviations in caps (KC, SF, TB). Opponent notation: "vs KC" at home, "@KC" away.
- Be clear about who and what you are talking about. Name the player and his team in the same sentence the first time; never let a "he" drift across two players; one player per sentence when the sentence carries a number.

## Plain words (hard)

The kitchen talks like a sharp friend at a bar, not like a research note and not like a bot. Conversational, direct, human. Short sentences. Contractions are fine. Say the number, then say what it means.

- Fantasy football language is fine and expected: aDOT, yards per route run, EPA, target share, route share, snap share, red zone touches, regression candidate, handcuff, streamer, boom or bust, ceiling and floor, game-time decision, FAAB. Readers speak it. Use the common forms people actually say ("route share", "yards per route run") and spell out an abbreviation the first time if it is not a household one.
- What is out is AI-speak and corporate filler: "notably", "importantly", "it's worth noting", "in terms of", "a testament to", "landscape", "leverage", "narrative", "delve", "elevate", "robust", "nuanced", "at the end of the day", "moving forward", "in the realm of", "it's important to remember", "let's unpack", "buckle up", "here's the thing". No stacked adjectives, no colon-then-reveal, no rhetorical questions, no "not X, but Y".
- Write the way a person talks about football: "he was on the field for 78 percent of the snaps", "he got 9 of the team's 33 throws", "he touched the ball 27 times", "he had the only two carries inside the 5", "he practiced in full Friday".
- Percent is written "78 percent" in posts (the site can use "78%").
- Verdicts are plain instructions with the action rule's words: "Claim him, 20 to 30 percent of your budget." "RB18 for me this week, an RB2." "Trade him away and ask for a WR2."

## Talk about the player, not the page (hard)

Readers see a website and a feed, not the kitchen's files. Every sentence is about the player, his team and his game, in the words a fan would use. Never describe the piece itself, its parts or its data.

- Never write about a player's "card", "row", "line", "entry" or "listing", and never say a card or row "carries", "reads" or "keeps" anything. Not "Omarion Hampton's card now carries the right snap line", but "Omarion Hampton played 58, 63 and 42 percent of the snaps."
- Never call a practice report, a snap count, a stat or a rank cutoff a "line": no "practice line", "limited line", "snap line", "usage line", "stream line", "the QB1 line" or "the RB1/RB2 line". Say "Friday's practice report", "he was limited Wednesday", "his snap share", "his usage", "the streaming range", "the top 12", "the RB1/RB2 border".
- A player does not "carry a flag", "keep his flag" or "lose his flag". Say what happened: "DeVonta Smith (hamstring) missed Wednesday's walkthrough and is questionable." "Lamar Jackson practiced in full Thursday and has no injury designation."
- `watch` is something a reader can follow and a time: "Friday's injury report", "Sunday's inactives at 11:30 AM ET", "the Friday designation". Never "Friday practice line and designation".
- The same goes for the "Updated" notes at the top of a piece (`_sync.md`, "Updating a published piece"): they say what changed for the player, not what changed on the page.

The validator rejects the common forms ("Hampton's card", "the Menu row", "carries a flag", "practice line", "stream line" and their relatives) in pieces published, notes written and posts queued from Week 5 on.

## Grow the account (hard)

Every thread and every reply ends by telling people to follow. The last post of a thread carries a follow line with the handle from `docs/data/site.json` before the site link, and adds a like or repost ask when it fits the piece (a waiver thread: "repost this for your league"; a Sunday pivot: "like this if it saved your lineup"). Every reply ends with a short one: "Follow @handle for more." Rotate the wording so no two threads in a row use the same line. Keep it to one sentence, two at most; it is the last thing in the text, after the action.

## The kitchen theme (seasoning, not the meal)

The kitchen identity lives in the series names and the site. In copy it is a light hand: at most one kitchen phrase per post and one per section on the site. Never force it into a stat sentence. Never explain the metaphor.

Series and the language that belongs to each:

| Series | What it is | Theme words that fit |
| --- | --- | --- |
| Leftovers (Mon) | Sunday recap, usage, overreactions | "what's still good", "reheat", "toss it" |
| Market Run (Tue AM) | Waiver wire | "fresh", "shop", "spend", "in stock", "cut bait" |
| Butcher Shop (Tue PM) | Trade for / trade away | "prime cut", "past its date", "price", "offer", "ask" |
| Heat Check (Tue PM) | Risers and fallers | "stove's on", "left to cool", "simmering", "heating up" |
| The Menu (Wed) | Positional rankings with tiers | "chef's table" (tier 1), "entrees" (tier 2), "sides" (tier 3), "specials" (matchup plays) |
| Serve or Sit (Thu) | Lineup calls: who the week favors, who it does not, coin flips | "serve", "send it back", "coin flip" |
| Prep Notes (Fri) | Injury report read | "prep", "designations", "have a backup ready" |
| Order Up (Sun) | Inactives and pivots | "order up", "pivot", "86'd" (ruled out) |
| Kitchen Notes (daily) | News reactions | "from the kitchen", "quick note" |
| From the Pass | The site's feed of posts | site-only |

Tier labels on the Menu are exactly: Tier 1 "Chef's table", Tier 2 "Entrees", Tier 3 "Sides", Tier 4 "Snacks", Tier 5 "Pantry", Tier 6 "Scraps". Use tier numbers in posts; the labels live on the site.

## X formatting

- Every post that goes out under the kitchen's name is a thread, except replies. That includes the Sunday inactives, the Thursday night reminder and the daily notes: a short thread of 2 or 3 posts is still a thread. Replies are single posts (see the poster playbook).
- Every single post is at most 275 characters (count links as 23, hashtags at their real length). The validator enforces this.
- The hook (post 1) is the pitch: who and what this thread is about in one or two plain sentences, the headline call, then it ends with exactly one of these closers as its last sentence: "Let's dive in." "Let's look into it." "Let's get to it." "Let's get into it." "Let's go." Rotate them; do not use the same closer two threads in a row. No link in the hook. No "a thread" or "1/".
- Organized: one idea per post, in the order a reader would act on it (the biggest call first, the deeper cuts later). Each post names its player or team plainly (no "he" carried over from the previous post). Rankings posts list one name per line with his rank under a tier line; everything else is one player per line, a sentence or two plus the call (see "One player per line in thread posts").
- Every post that names a player or a team ends with the official hashtag of each team mentioned in that post, from `kitchen/hashtags.json`, space separated, on their own last line after the text with nothing after them (for example: "... Claim him, 25 to 35 percent." then a line break, then "#PhinsUp"). One hashtag per team, no duplicates in a post, no other hashtags. A post about a whole position (the QB list) carries the hashtags of the teams named, up to five; if more than five teams are named, split the post.
- The last post of every thread is the close: one line on what is on the site, the follow line ("Follow @handle for the rest of the week's calls, and repost this for your league."), then the deep link to the piece (site URL from `docs/data/site.json`, appended by the queue tool). It needs no hashtag. Links appear nowhere else.
- Threads: 3 to 10 posts. Single-topic threads (the inactives, a news reaction) are 2 or 3 posts: hook, the facts with the action, the link.
- Replies: 1 to 3 sentences, add a number the original post did not have, the action, then "Follow @handle for more." No hashtags, no link, no closer. Never quote the original. Never argue about rankings for their own sake. Never reply to a reply.
- Line breaks separate ideas. No trailing questions ("Thoughts?").
- No links to other creators. The only links are to the kitchen's own site.

## Format assumptions

Default scoring is full PPR, 1 QB, 2 RB, 2 WR, 1 TE, 2 FLEX (the owner's leagues). Say "PPR" once per piece. When a call flips in half-PPR or standard, say so in one clause.

## Time

All times in copy are Eastern and written "6:30 AM ET". The NFL week for content purposes runs Tuesday to Monday: Tuesday's Market Run and Butcher Shop are for the coming week's number (the waiver week), Monday's Leftovers is for the week that just finished. The Menu, Serve or Sit, Prep Notes, and Order Up carry the week being played.

## What "done" means for any piece

1. The JSON validates (`python3 tools/fk.py validate`).
2. Every player has a verdict and an `action` from the action rule, with its required field (FAAB range, price, watch, or pivot target).
3. No projected numbers anywhere in the text. No em dashes, no arrows, no analyst names. No start commands: a lineup call is the Menu rank and its tier.
4. The post copy validates (length, links only in the last post of a thread, hook closer, team hashtags on their own last line, one player per line, the follow line at the end).
5. The manifest is rebuilt (`python3 tools/fk.py manifest`) and the queue item is written.
6. It is pushed. An unpushed piece does not exist.
