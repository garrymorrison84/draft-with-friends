import BrandMark from "./components/BrandMark";

const draftPicks = [
  ["1.1", "Andrew", "Scottie Scheffler", "Drafted"],
  ["1.2", "Mark", "Xander Schauffele", "Drafted"],
  ["1.3", "Garry", "Tommy Fleetwood", "Drafted"],
  ["1.4", "Steve", "Awaiting pick", "On the clock"],
];

const leaderboardRows = [
  ["1", "Andrew", "Scottie Scheffler", "-19", "-43"],
  ["2", "Mark", "Xander Schauffele", "-14", "-39"],
  ["3", "Garry", "Tommy Fleetwood", "-12", "-36"],
];

function PhoneProductPreview() {
  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[2.2rem] border-[10px] border-[#1F2937] bg-[#030712] p-3 shadow-2xl shadow-emerald-950/40">
      <div className="rounded-[1.55rem] border border-slate-700/70 bg-[#07111f] p-4">
        <div className="mb-5 flex items-center justify-between text-[11px] font-black text-white">
          <span>9:41</span>
          <div className="h-5 w-24 rounded-full bg-[#030712]" />
          <span className="rounded-md border border-slate-500 px-1.5 py-0.5 text-[9px]">
            97
          </span>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-[#111827] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
                Snake Draft
              </p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-white">
                Draft Room
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                Pick golfers with your group in real time.
              </p>
            </div>

            <span className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-black text-slate-950">
              Live
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {draftPicks.map(([pick, team, golfer, status]) => (
              <div
                key={pick}
                className={`rounded-xl border p-3 ${
                  status === "On the clock"
                    ? "border-emerald-400/60 bg-emerald-400/15"
                    : "border-white/5 bg-[#1F2937]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                      Pick {pick} • {team}
                    </p>
                    <p className="mt-1 text-base font-black leading-snug text-white">
                      {golfer}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-right text-[11px] font-black leading-4 ${
                      status === "On the clock"
                        ? "text-emerald-300"
                        : "text-slate-400"
                    }`}
                  >
                    {status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-700/70 bg-[#111827] p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
                Live Leaderboard
              </p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-white">
                Track Every Team
              </h2>
            </div>

            <span className="text-2xl font-black text-emerald-300">-43</span>
          </div>

          <div className="space-y-2">
            {leaderboardRows.map(([rank, team, golfer, golferScore, total]) => (
              <div
                key={team}
                className="rounded-xl border border-white/5 bg-[#1F2937] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                      {rank}. {team}
                    </p>
                    <p className="mt-1 text-base font-black leading-snug text-white">
                      {golfer}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Golfer score {golferScore}
                    </p>
                  </div>

                  <p className="shrink-0 text-xl font-black text-emerald-300">
                    {total}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-[#030712] p-3 text-center text-sm font-black text-emerald-300">
            Scores refresh automatically
          </div>
        </div>

        <div className="mx-auto mt-4 h-1.5 w-28 rounded-full bg-slate-600" />
      </div>
    </div>
  );
}

function PreviewCaption() {
  return (
    <div className="mx-auto mt-5 max-w-[420px] rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
      <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
        Built for the phone in your hand
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Draft picks, team standings, and golfer scores stay readable without
        pinching, zooming, or clipped names.
      </p>
    </div>
  );
}

function ProductPreview() {
  return (
    <div>
      <PhoneProductPreview />
      <PreviewCaption />
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030712] text-white">
      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative z-10">
          <div className="mb-8">
            <BrandMark size="lg" />
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Your Friends.
            <br />
            Your Pool.
            <br />
            Your Rules.
          </h1>

          <p className="mt-5 text-lg font-semibold text-emerald-300">
            Golf is live. College football is next.
          </p>

          <p className="mt-6 max-w-3xl text-xl leading-9 text-slate-300">
            Snake drafts are the best part of a pool. Draft With Friends is the
            easiest end-to-end drafting and tracking experience for sports
            pools. Create a contest, invite your friends, draft your players,
            and follow the leaderboard in real time.
          </p>

          <div className="mt-10">
            <p className="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">
              Pick Your Sport
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href="/create-pool"
                className="flex min-h-20 items-center justify-center rounded-2xl bg-emerald-400 px-8 py-5 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 md:text-xl"
              >
                Create PGA Pool
              </a>

              <a
                href="/football"
                className="flex min-h-20 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-8 py-5 text-center text-lg font-black text-emerald-300 transition hover:bg-emerald-400/15 md:text-xl"
              >
                Create College Football Pool
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-base font-semibold text-slate-300 md:text-lg">
            <span>✓ Snake Drafts</span>
            <span>✓ Custom Scoring</span>
            <span>✓ Live Leaderboard</span>
          </div>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end">
          <ProductPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">Customize Your Pool</h3>
            <p className="mt-3 leading-7 text-slate-400">
              Build the exact format your group wants. Choose how many golfers
              to draft, how many scores count, and let the competition begin.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">Built For Friend Groups</h3>
            <p className="mt-3 leading-7 text-slate-400">
              No more messy spreadsheets, screenshots, or group text chaos.
              Create the pool and let everyone follow along.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">
              Built To Become A Platform
            </h3>
            <p className="mt-3 leading-7 text-slate-400">
              College football now sits beside golf with the same dark theme,
              green accent, draft-first flow, and live leaderboard direction.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
