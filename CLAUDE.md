# B-Crew Companion

Season-long matchup context for the same league as `../bcrew`. Read that
repo's CLAUDE.md for scoring, data sources and the valuation model — none of
it is restated here.

React + Vite + Tailwind, deployed to GitHub Pages.

## Run and deploy

```bash
npm run dev      # http://localhost:5173/bcrew-companion/
npm run build
npm run deploy   # builds, then pushes dist/ to the gh-pages branch
```

**Pushing `main` does not deploy anything.** `main` is source; `gh-pages` is
what the world sees. There are no branch preview URLs — preview locally.

After deploying, verify against the live URL rather than the CLI output:
GitHub Pages can serve the previous bundle for ~30s after printing
"Published", so an immediate check passes on stale assets. Compare the served
bundle hash to the local build.

Live: https://mmira11.github.io/bcrew-companion/

## 🛑 BLOCKER — decide before wiring real data

`public/data/week.json` is **deliberately mock**. Do not replace it with real
roster data until Miguel has answered this:

**This repo is PUBLIC.** Real data means his roster and all eleven opponents'
rosters published to the open internet under his name. The draft log in
`../bcrew` already reconstructs all twelve teams, so the data exists and is
complete — only the decision is missing.

Three options, his call and not an implementation detail:

1. Stay public and accept that opponent rosters are visible.
2. Move to a private repo — GitHub Pages on a private repo needs GitHub Pro.
3. Anonymize opponent display ("Team 3") and keep only his own roster named.

Raised 2026-08-09, still open as of 2026-08-10. Flag it loudly rather than
picking one. Week 1 is 2026-09-09.

## Conventions

- Labels are **context, never verdicts.** `CLAUDE.md` in `../bcrew` rules out
  start/sit prediction outright — weekly variance swamps that confidence. Show
  a labelled signal with its basis and stop there. Never render a percentage.
- Every matchup label carries a `basis` string explaining it. **Never truncate
  the basis** — clipping the justification defeats the reason it is shown. It
  wraps instead.
- Mobile is the point: this gets read on a phone. Verify at 320px and 375px,
  not just desktop, and measure `scrollWidth > clientWidth` rather than
  eyeballing screenshots.
