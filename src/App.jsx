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

// showSlot=false is the paired mobile view, where the slot is already the card
// header — dropping the gutter there gives the name ~56px more width, which is
// what lets the chip sit inline instead of claiming its own line.
function SlotRow({ e, showSlot = true }) {
  const p = e.player;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-slate-800/70 last:border-0">
      {showSlot && (
        <span className="w-11 shrink-0 font-mono text-[11px] uppercase tracking-wide text-slate-500">
          {e.slot}
        </span>
      )}
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
      {/* With the slot gutter present, the chip drops to its own line below sm —
          w-full forces the wrap — so the name gets the full row width instead of
          competing with it at 375px. pl-14 matches the slot column (w-11) plus
          gap-x-3. Without the gutter there is room to sit inline, and the
          parent's flex-wrap still drops it to its own line if there isn't. */}
      <div className={showSlot ? "w-full pl-14 sm:w-auto sm:shrink-0 sm:pl-0" : "shrink-0"}>
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

// One side of a paired slot. The accent bar carries whose player it is; the
// sticky legend above the list says which colour is which, so identity costs no
// vertical space per row.
function PairSide({ e, mine }) {
  const accent = mine
    ? "border-emerald-500/60 bg-emerald-500/[0.04]"
    : "border-slate-700";
  if (!e)
    return (
      <div className={`border-l-2 ${accent} px-4 py-2.5 text-xs text-slate-600`}>
        no player in this slot
      </div>
    );
  return (
    <div className={`border-l-2 ${accent}`}>
      <SlotRow e={e} showSlot={false} />
    </div>
  );
}

function BenchBlock({ team, entries, mine }) {
  if (entries.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <header
        className={`px-4 py-2 text-xs font-semibold ${
          mine ? "bg-emerald-500/10 text-emerald-200" : "bg-slate-800/40 text-slate-300"
        }`}
      >
        {team.name} — bench
      </header>
      {/* Same SlotRow as everywhere else: a bench that hides injury status
          defeats the point of comparing a hurt starter against it. */}
      {entries.map((e) => (
        <SlotRow key={"BN" + e.player.name} e={e} showSlot={false} />
      ))}
    </section>
  );
}

// Mobile pairs the lineups slot by slot. Stacking them the way the desktop grid
// does leaves your RB2 ~1300px from the opponent's at 375px — the comparison
// this app exists for is the one thing a phone layout has to make easy, so on
// mobile the slot is the unit and the two teams sit adjacent inside it.
function PairedSlots({ matchup, lineups }) {
  const startersOf = (l) => l.filter((e) => e.slot !== "BN");
  const benchOf = (l) => l.filter((e) => e.slot === "BN");
  const mine = startersOf(lineups.me);
  const theirs = startersOf(lineups.opponent);
  const pairs = Array.from(
    { length: Math.max(mine.length, theirs.length) },
    (_, i) => [mine[i], theirs[i]]
  );

  return (
    <div className="space-y-3 md:hidden">
      {/* Spans the container rather than bleeding to the screen edge: the cards
          are already flush with it, so this covers everything scrolling behind
          without a negative margin overflowing the parent. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-emerald-500" />
          {matchup.me.name}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-slate-500" />
          {matchup.opponent.name}
        </span>
      </div>

      {pairs.map(([a, b], i) => {
        // Slots are paired positionally; if the two lineups ever disagree on
        // slot order, name both rather than silently labelling it with one.
        const slot = a?.slot === b?.slot ? a.slot : [a?.slot, b?.slot].filter(Boolean).join(" / ");
        return (
          <section
            key={slot + i}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60"
          >
            <div className="border-b border-slate-800 bg-slate-800/40 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
              {slot}
            </div>
            <PairSide e={a} mine />
            <PairSide e={b} />
          </section>
        );
      })}

      <BenchBlock team={matchup.me} entries={benchOf(lineups.me)} mine />
      <BenchBlock team={matchup.opponent} entries={benchOf(lineups.opponent)} />
    </div>
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

        {/* Phone: paired slot by slot. md and up: the two full lineups side by
            side, where the eye can already compare across columns. */}
        <PairedSlots matchup={matchup} lineups={lineups} />
        <div className="hidden gap-5 md:grid md:grid-cols-2">
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
