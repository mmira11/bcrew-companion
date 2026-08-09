# B-Crew Companion — season-long matchup context

Weekly dashboard for the Tesla B-Crew league (Yahoo 1251986, 2026): my lineup,
my opponent's lineup, bye/injury flags, and a plain-language matchup read per
position.

**This is NOT a start/sit engine.** The bcrew CLAUDE.md rules that out
explicitly — weekly variance swamps that kind of confidence. Matchup labels
(favorable / neutral / tough / no-data) are context with their basis shown,
never a verdict. If a label ever reads as "start him", the label is wrong.

Separate repo and separate data model from the draft board (`bcrew`), on
purpose: the board's lifecycle is one night; this app's is weekly for four
months. Stack matches the Tanda Manager pattern: Vite + React 18 + Tailwind,
deployed to GitHub Pages via `gh-pages -d dist`.

## Status (2026-08-09)

Layout scaffold with MOCK data only. Real data is **impossible** right now,
not merely missing:

| Blocked until | Why |
|---|---|
| Aug 23 draft | Miguel's roster does not exist yet |
| Week 1 (Sep 9) | Opponent lineups and matchups do not exist yet |
| Real games played | Any matchup-rating logic is untestable before them |

None of those may be faked to "make progress". The MOCK banner stays on the
page until every mocked field is fed by a real source.

## Data model — `public/data/week.json`

```jsonc
{
  "meta":    { "season": 2026, "week": 1, "generated": "ISO-8601", "source": "string" },
  "matchup": { "me": {"name","record"}, "opponent": {"name","record"} },
  "lineups": { "me": [SlotEntry], "opponent": [SlotEntry] }
}

// SlotEntry
{
  "slot": "QB|RB|WR|TE|FLEX|K|DEF|BN",
  "player": {
    "name": "", "nfl_team": "", "position": "", "bye_week": 0,
    "injury": { "status": "Q|IR|PUP|...", "detail": "free text", "severe": false }
  },
  "on_bye": false,          // player.bye_week == meta.week
  "opp_game": "vs KC | @ BUF | BYE",
  "matchup": { "label": "favorable|neutral|tough|no-data", "basis": "one plain sentence" }
}
```

Rules the model encodes:

- `matchup.basis` is mandatory whenever `label` is not `no-data` — a label
  with no stated reason is a verdict in disguise.
- `no-data` is a first-class value. Early weeks WILL lack sample; the honest
  label is "no-data", not a guessed "neutral".
- `injury.severe` follows the same keyword discipline as the board's
  `SEVERE_INJURY_KEYWORDS` class of logic, but the data structures are not
  shared — different repo, different lifecycle.

Planned label derivation (documented now, built only after real games exist):
opponent defense vs position rank over a trailing window from nflverse weekly
data (the same source family `bcrew/src/radar.py` already uses), split into
terciles -> tough / neutral / favorable. Untested against real games and
therefore not implemented.

## Weekly pipeline — `.github/workflows/weekly-update.yml`

Skeleton only, and inert by construction: this repo has no GitHub remote yet,
and there is nothing real to regenerate. Cadence when live: Tuesdays 10:00 UTC
(after MNF settles, before waivers). The regenerate step is an explicit TODO
list, not a fake fetch.

## Yahoo endpoint research — DOCUMENTED, NOT EXECUTED

Everything below is inferred from the one real Yahoo internal-API response we
have (the `/f1/draftanalysis` pull of 2026-08-04, `fantasy_content` envelope)
plus Yahoo's public Fantasy API v2 resource naming. **None of it has been
fetched.** It cannot be verified until a roster exists.

Known from the draftanalysis pull:

- Host `pub-api-ro.fantasysports.yahoo.com`, path prefix `/fantasy/v2/`,
  `?format=json_f`, cookie auth from a logged-in browser session, responses
  wrapped in `fantasy_content`.
- The 2026 NFL game key is `470` (seen as `470.l.public`), so this league's
  key is `470.l.1251986` and a team key will be `470.l.1251986.t.{team_id}`.

Likely endpoint family for this app (same envelope expected):

| Need | Probable resource |
|---|---|
| discover Miguel's team_id | `/fantasy/v2/league/470.l.1251986/teams?format=json_f` |
| my roster, week W | `/fantasy/v2/team/470.l.1251986.t.{id}/roster;week={W}?format=json_f` |
| all matchups, week W | `/fantasy/v2/league/470.l.1251986/scoreboard;week={W}?format=json_f` |
| my matchup history | `/fantasy/v2/team/470.l.1251986.t.{id}/matchups?format=json_f` |

Verification plan (post-draft): capture ONE authenticated request from
DevTools on the league page — the exact procedure used for draftanalysis —
confirm the envelope, then adapt. Same handling rules as before: the cookie
lives in memory for the session only, raw responses are gitignored, and no
auth material is ever committed.

The public OAuth Yahoo API remains application-gated and off the critical
path, exactly as bcrew's CLAUDE.md records.

## Sleeper player metadata — verified 2026-08-09, planned SUPPLEMENT

`GET https://api.sleeper.app/v1/players/nfl` (no auth): HTTP 200, 14.6 MB,
12,218 players. Both target fields exist and are populated:

| Field | Coverage (3,229 active QB/RB/WR/TE/K/DEF) |
|---|---|
| `injury_status` | 168 non-null (only injured players carry one) |
| `injury_body_part` | 165 |
| `depth_chart_order` / `depth_chart_position` | 777 / 952 |
| `news_updated` (ms epoch) | 2,773 |

Freshness, measured rather than assumed: the newest `news_updated` was **0.5
hours old** at fetch time; 80 players updated in the prior 24 h, 358 in the
prior 7 days. Consistent with the docs' daily-update claim — though only
currency is verifiable from outside, not their cadence.

Cross-check against players the bcrew pipeline flagged: Sleeper shows
Pearsall IR, Pierce PUP, Kittle PUP, Nabers Q, Kraft Q — agreeing with the
Yahoo statuses. Fresher than FFA's one-shot export either way.

### Injury status ages fast — re-verify it close to when it matters

**Open conflict, unresolved:** a red-team web search weeks ago reported Ricky
Pearsall **activated off PUP**; Sleeper's live data on 2026-08-09 still lists
him **IR**, matching Yahoo. Both cannot be current. Immaterial today — he is
not on any roster of Miguel's, since no roster exists — but it is a standing
warning, not a one-off discrepancy:

- A status claim is only true as of the moment it was fetched. Anything
  captured during research is stale by draft night, and very stale by Week 6.
- Treat a written injury note in this repo, in bcrew's CLAUDE.md, or in a
  commit message as a **timestamp with an opinion attached**, never as fact.
- Re-pull `injury_status` at the moment a decision depends on it — before the
  draft, and every Tuesday during the season — and prefer sources carrying
  their own freshness stamp (`news_updated`) over ones that do not.
- When two sources disagree, record the conflict rather than picking a winner.
  The FFA export has no timestamp at all, which is precisely why it loses to
  Sleeper for status even though it wins for projections.

**Role: SUPPLEMENT only.** Sleeper's league/roster/matchup endpoints work
solely for leagues hosted on Sleeper. This league lives on Yahoo — Sleeper
can never supply the actual roster or matchups and must not be substituted
for them. It supplements the display with fresher injury status and depth
chart order, keyed by player name through the same normalization discipline
as `bcrew/src/market.py` (the pool-relative name-join checklist in bcrew's
CLAUDE.md applies).

## Local dev

```
npm install
npm run dev        # local preview with the MOCK week.json
npm run deploy     # gh-pages, once a remote exists
```

## Deployment status — LOCAL ONLY as of 2026-08-09

Verified, not assumed:

| Check | Result |
|---|---|
| git remote on this repo | **none** — `git init` only, never pushed |
| `github.com/mmira11/bcrew-companion` | **HTTP 404** — repo does not exist |
| `mmira11.github.io/bcrew-companion/` | **HTTP 404** — nothing published |
| `mmira11.github.io/tanda-manager/` | HTTP 200 — the pattern works, just unused here |
| `gh` CLI | installed, authenticated as `mmira11` |

So the phone-check goal is **not yet met**. `npm run dev` is a localhost
preview only; it is unreachable from a phone.

### To go live (matching tanda-manager)

`homepage` in package.json and `base` in vite.config.js are already set to
`/bcrew-companion/`, and `gh-pages` is already a devDependency. What remains:

```bash
cd ~/Desktop/projects/bcrew-companion
gh repo create bcrew-companion --public --source=. --remote=origin --push
npm run deploy          # runs build, pushes dist/ to the gh-pages branch
gh api -X POST repos/mmira11/bcrew-companion/pages \
  -f 'source[branch]=gh-pages' -f 'source[path]=/'   # enable Pages once
```

Then `https://mmira11.github.io/bcrew-companion/` — usually live within a
minute or two of the first Pages build.

**Repo must be public** for GitHub Pages on a free account. That is the reason
this has not been run automatically: it publishes to the open internet under
Miguel's account, and it is his call, not an implementation detail. Nothing in
this repo is sensitive today (all data is mock, no cookies, no tokens), but
that changes the moment real roster data lands — see the note below.

### Before real data goes live

Once the Yahoo pull is wired up, `public/data/week.json` will contain Miguel's
actual roster and his opponents' — published to a public URL. Decide then
whether that is acceptable, or whether the site should move to a private repo
with Pages (needs GitHub Pro) or to a host with access control. **Never commit
the Yahoo cookie or any raw authenticated response**, regardless.
