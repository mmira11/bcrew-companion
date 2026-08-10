import { useEffect, useState } from "react";

// Matchup labels are CONTEXT, never verdicts. CLAUDE.md (bcrew) rules out
// start/sit prediction outright — weekly variance swamps that confidence —
// so this app displays labeled signal with its basis and stops there.
const CHIP = {
  favorable: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  neutral: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  tough: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  "no-data": "text-slate-500 border-slate-600 border-dashed",
};

function SlotRow({ e }) {
  const p = e.player;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-slate-800/70 last:border-0">
      <span className="w-11 shrink-0 font-mono text-[11px] uppercase tracking-wide text-slate-500">
        {e.slot}
      </span>
      <div className="min-w-0 flex-1">
        {/* Wraps so position/team and injury drop below the name when the row
            is too narrow (320px), instead of squeezing the name into an
            ellipsis. The name keeps truncate as a backstop for long names. */}
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="truncate font-medium text-slate-100">{p.name}</span>
          <span className="text-xs text-sky-300/70">
            {p.position} · {p.nfl_team}
          </span>
          {p.injury.status &&
            (p.injury.severe ? (
              <span className="text-xs font-semibold text-rose-400">
                {p.injury.detail || p.injury.status}
              </span>
            ) : (
              <span className="text-xs text-amber-300">{p.injury.status}</span>
            ))}
          {e.on_bye && (
            <span className="text-xs font-semibold text-rose-400">BYE</span>
          )}
        </div>
        {/* The basis is the justification for the label — truncating it defeats
            the point of showing it, so it wraps rather than clipping. */}
        <div className="text-xs text-slate-500">
          {e.opp_game}
          {e.matchup.basis ? ` — ${e.matchup.basis}` : ""}
        </div>
      </div>
      {/* Below sm the chip drops to its own line — w-full forces the wrap — so
          the name gets the full row width instead of competing with it at
          375px. pl-14 matches the slot column (w-11) plus gap-x-3. */}
      <div className="w-full pl-14 sm:w-auto sm:shrink-0 sm:pl-0">
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            CHIP[e.matchup.label] ?? CHIP["no-data"]
          }`}
        >
          {e.matchup.label}
        </span>
      </div>
    </div>
  );
}

function Lineup({ team, entries, mine }) {
  const starters = entries.filter((e) => e.slot !== "BN");
  const bench = entries.filter((e) => e.slot === "BN");
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <header
        className={`flex items-baseline justify-between px-4 py-3 ${
          mine ? "bg-emerald-500/10" : "bg-slate-800/40"
        }`}
      >
        <h2 className="font-semibold text-slate-100">{team.name}</h2>
        <span className="font-mono text-sm text-slate-400">{team.record}</span>
      </header>
      {starters.map((e) => (
        <SlotRow key={e.slot + e.player.name} e={e} />
      ))}
      {bench.length > 0 && (
        <>
          {/* Bench rows render through the SAME SlotRow as starters. The point
              of this dashboard is comparing a hurt starter against a healthy
              bench option — a bench that hides injury status defeats it. */}
          <div className="border-t border-slate-800 bg-slate-950/60 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">
            Bench
          </div>
          {bench.map((e) => (
            <SlotRow key={"BN" + e.player.name} e={e} />
          ))}
        </>
      )}
    </section>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/week.json`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err)
    return <div className="p-8 text-rose-300">Failed to load week data: {err}</div>;
  if (!data) return <div className="p-8 text-slate-400">Loading…</div>;

  const { meta, matchup, lineups } = data;
  const mock = /mock/i.test(meta.source);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <header className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            B-Crew Weekly
          </h1>
          <span className="text-2xl font-bold text-slate-100">
            Week {meta.week}
            <span className="ml-2 text-base font-normal text-slate-500">
              {meta.season}
            </span>
          </span>
          {mock && (
            <span className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
              MOCK DATA — layout review only
            </span>
          )}
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <Lineup team={matchup.me} entries={lineups.me} mine />
          <Lineup team={matchup.opponent} entries={lineups.opponent} />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-400">
            Matchup labels are context, not verdicts.
          </span>{" "}
          favorable / neutral / tough come from where the opposing defense ranks
          against that position — the basis is shown next to each player. This
          app never recommends who to start: weekly variance swamps that kind of
          confidence, by design.
        </p>
        <footer className="mt-2 text-xs text-slate-600">
          generated {meta.generated} · source: {meta.source}
        </footer>
      </div>
    </div>
  );
}
