# The poster: getting queued posts onto X, and reply mode

Runs at 7:25 AM, 9:25 AM, 1:25 PM, 6:25 PM and 8:25 PM ET as a Cowork scheduled task with the owner's computer attached. It posts through Claude's built-in browser in the desktop app (the account is already signed in there); the Chrome extension is the fallback. It never uses the X API and never posts from the cloud shell.

Cowork tasks cannot push to GitHub. The poster reads the queue from a read-only clone of the public repo and, at the end of the run, sends a ledger of what it did to the FK Kitchen routine, which records it and pushes (section 7 and "Ledger" below).

## Hard rules

- Never sign in, never type a password or a code, never touch account settings. If X shows a login screen, a verification step, a captcha, or an "unusual activity" notice: stop, post nothing more, and say so in the run summary. The owner handles it.
- Post exactly the queued text. No edits in the composer. If a text no longer fits (X changed the limit), record it as failed with the reason.
- One item at a time, in queue order. Keep a running ledger as you go (section 7) and send it at the end of the run, and also before stopping after any failure.
- Never post an item past its `notAfter`. Run `queue expire` first.
- Never repeat a post. Before posting any item, check the profile (section 3.0). If a post there starts with the same text as the item, record `posted` with that URL instead of posting again. The ledger from an earlier run may not have landed yet, so this check is what stops doubles.
- Reply mode caps: at most 3 replies per run, 6 per day, never two replies to the same account in a day, never to a post older than 8 hours, never to a reply, never to anything about betting, politics, or another creator's rankings. No links, no hashtags, no hook closers in replies; replies are the one place the kitchen posts a single message. Every reply ends with "Follow @handle for more." (handle from `docs/data/site.json`).

## Procedure

### 1. Sync
`_sync.md` step 1 ("In a Cowork task") and step 2 (week). Then:
```
python3 tools/fk.py queue expire
python3 tools/fk.py queue list --due --json > "$SCRATCH/due.json"
```
If `due.json` is an empty list and this is not a reply-mode hour (13 or 20, Eastern), end with "nothing due". Expirations need no ledger; FK Kitchen expires items on its own runs.

### 2. Open the browser
Built-in browser first: `tabs_context`, then `preview_start` with `https://x.com/home`. If the tool says the site is not allowed yet, call `request_access` with scope "site" and retry once. Then `get_page_text`: if the text contains "Sign in" or "Log in" as the main content, or the URL is under `/i/flow/login`, stop (hard rules).

If the built-in browser tools are unavailable, use the Chrome extension: `tabs_context_mcp`, `tabs_create_mcp`, `navigate` to `https://x.com/home`, same sign-in check. If neither browser is reachable, end the run with "browser unavailable"; the queue waits.

### 3. Post a single item (replies only; everything else is a thread)

0. Profile check (before every item, single or thread): `navigate` to `https://x.com/<handle>`, wait 3 seconds, run the article script from step 6. If any article's text contains the first 40 characters of the item's first post, do not post: add `posted <id> <that url>` to the ledger and move to the next item.
1. `navigate` to `https://x.com/compose/post`.
2. `find` "Post text" to get the editor ref (it is a contenteditable with the accessible name "Post text"). Click it.
3. `type` the full text. Line breaks in the text are typed as line breaks.
4. Take a screenshot at scale 0.5 and confirm the composer shows the text and the character counter is not red.
5. `find` "Post" and click the button whose role is button and name is exactly "Post" (the submit button, not the sidebar "Post" link). Wait 3 seconds.
6. Get the URL: `navigate` to `https://x.com/<handle>` (handle from `docs/data/site.json`), wait 3 seconds, then run this in `javascript_tool`:
   ```
   (() => { const a = [...document.querySelectorAll('article')].map(ar => ({ t: (ar.innerText||'').slice(0,160), u: (ar.querySelector('a[href*="/status/"]')||{}).href })); return JSON.stringify(a.slice(0,5)); })()
   ```
   Pick the article whose text contains the first 40 characters of the posted text (pinned posts come first, so do not assume index 0). That `u` is the post URL (strip anything after the status id).
7. Add `posted <id> <url>` to the ledger.

### 4. Post a thread
0. Profile check as in 3.0.
1. `navigate` to `https://x.com/compose/post`. Click the "Post text" editor and `type` post 1.
2. `find` "Add post" (the plus button under the editor; accessible name "Add post" or "Add another post") and click it. A second editor appears and takes focus. `type` post 2. Repeat for each remaining post: click "Add post", type.
3. Screenshot at scale 0.5 to confirm the number of editors equals the number of posts and none has a red counter.
4. `find` "Post all" and click it. Wait 4 seconds.
5. Get the URL of the first post as in step 3.6. Add `posted <id> <url>` to the ledger.
6. Fallback if "Add post" is not found: post the first text as a single post, open its URL, then for each remaining post: `find` "Reply" (the reply action under the post), click, type the text into the reply editor ("Post your reply"), click the "Reply" submit button, wait 3 seconds, reload the thread page. The thread URL is still the first post's URL.

If an item cannot be posted (red counter, the button never appears, an error toast), add `failed <id> <reason>` to the ledger and move on. Three failures park the item.

### 5. After the queue
On the 1:25 PM and 8:25 PM runs, do reply mode (section 6). Then send the ledger (section 7).

### 6. Reply mode (1:25 PM and 8:25 PM ET runs only)
1. Read `kitchen/targets.md` (accounts, and the daily cap).
2. For each target, `navigate` to `https://x.com/<account>` and `get_page_text` (or `read_page`). Collect posts from the last 8 hours that are about a specific player, injury, role, or trade. Skip retweets, polls, promos, and anything already replied to (check today's entries in `docs/data/posts.json` with series "reply" and their "reply to @account" notes, plus the replies already in this run's ledger).
3. Choose up to 3 (per run) where the kitchen has something the post does not: a usage number, a matchup fact, a verdict the Menu or Prep Notes already made. Draft the reply per `_standards.md` (1 to 3 sentences, one number, the action, then "Follow @handle for more."; no link, no hashtags, no quoting the original, never "great post").
4. Open the post's URL, `find` "Reply", click, click the editor ("Post your reply"), `type` the text, `find` the submit button "Reply" and click. Wait 3 seconds. Get the reply URL from `https://x.com/<handle>/with_replies` the same way as 3.6.
5. Add `reply <reply url> @<account> <reply text>` to the ledger (the text on one line).

### 7. Send the ledger
The ledger is plain lines, one record each:
```
posted <queue id> <post url>
failed <queue id> <reason>
reply <reply url> @<account> <reply text>
```
If the run posted, failed or replied at least once, call `fire_trigger` (the claude-code-remote tool; load it with ToolSearch if it is deferred) with the FK Kitchen trigger ID from your task prompt and this text:
```
job: ledger
posted 2026w04-menu-thread-1a2b https://x.com/<handle>/status/1234567890123456789
reply https://x.com/<handle>/status/1234567890123456790 @AdamSchefter <the reply text>
```
If the run did nothing, do not fire it. If `fire_trigger` fails, say so in the run summary and put the ledger lines there, so the owner can replay them with Run now on FK Kitchen; the profile check keeps the next run from posting doubles.

## Ledger (run by FK Kitchen for `job: ledger`)
1. `_sync.md` step 1 ("In FK Kitchen").
2. Save the lines inside the routine-fire-payload block to `$SCRATCH/ledger.txt` exactly as sent, then run `python3 tools/fk.py ledger --file "$SCRATCH/ledger.txt"`. The tool records `posted` lines (moves the item to `queue/posted`, adds it to the site feed, links the piece), `failed` lines (counts the attempt), and `reply` lines (adds them to the feed). It accepts only status URLs of the kitchen's own handle and skips anything else, including lines that are not records.
3. `python3 tools/fk.py queue expire`, `python3 tools/fk.py validate`, `python3 tools/fk.py log "ledger: <the tool's summary line>"`, commit "poster: ledger", push (`_sync.md` step 7).

## Run summary
"Posted x items (ids), y failed (reasons), z expired, r replies. Ledger: sent | not needed | failed (lines below). Browser: built-in | chrome. Signed in: yes | no."
