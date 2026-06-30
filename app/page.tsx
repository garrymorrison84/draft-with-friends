import BrandMark from "./components/BrandMark";

function DraftBoardPreview() {
  return (
    <div className="rounded-3xl border border-white/5 bg-[#111827] p-3 shadow-xl shadow-black/40">
      <div className="rounded-2xl border border-slate-700/60 bg-[#1F2937] p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Draft Board</h2>
            <p className="mt-1 text-sm text-slate-400">
              Picks fill in automatically as golfers are selected.
            </p>
          </div>

          <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300">
            Snake Draft
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-700/60">
          <div className="grid grid-cols-4 bg-emerald-700">
            {["Andrew", "Mark", "Garry", "Steve"].map((team) => (
              <div
                key={team}
                className="border-r border-emerald-400/20 p-3 text-center last:border-r-0"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/80">
                  Team
                </p>
                <p className="text-sm font-black sm:text-base">{team}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4">
            {[
              ["Drafted", "Scheffler", "1.1", "bg-[#1F2937]"],
              ["Drafted", "Schauffele", "1.2", "bg-[#1F2937]"],
              ["Drafted", "Fleetwood", "1.3", "bg-[#1F2937]"],
              ["On the clock", "Awaiting...", "1.4", "bg-emerald-400/15"],
              ["Open", "Awaiting...", "2.4", "bg-[#030712]"],
              ["Open", "Awaiting...", "2.3", "bg-[#030712]"],
              ["Open", "Awaiting...", "2.2", "bg-[#030712]"],
              ["Open", "Awaiting...", "2.1", "bg-[#030712]"],
            ].map(([status, name, pick, bg], index) => (
              <div
                key={`${status}-${pick}-${index}`}
                className={`${bg} min-h-24 border-r border-t border-slate-700/60 p-3 last:border-r-0`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p
                    className={`text-xs font-black ${
                      status === "On the clock"
                        ? "text-emerald-300"
                        : "text-slate-400"
                    }`}
                  >
                    {status}
                  </p>

                  <span className="rounded-full bg-[#1F2937] px-2 py-1 text-[10px] font-black text-slate-300">
                    {pick}
                  </span>
                </div>

                <p className="text-xs font-black text-white sm:text-sm">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardPreview() {
  const golfers = [
    ["2", "Scottie Scheffler", "-6", "-10", "-3", "-", "-19", true],
    ["T10", "Sam Burns", "-4", "-4", "-4", "-", "-12", true],
    ["T10", "Justin Rose", "-5", "-4", "-3", "-", "-12", true],
    ["T14", "Collin Morikawa", "-1", "-4", "-6", "-", "-11", false],
  ];

  return (
    <div className="rounded-3xl border border-white/5 bg-[#111827] p-3 shadow-xl shadow-black/40">
      <div className="rounded-2xl border border-slate-700/60 bg-[#1F2937] p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Live Leaderboard</h2>
            <p className="mt-1 text-sm text-slate-400">
              Scores update automatically as the tournament unfolds.
            </p>
          </div>

          <span className="text-xl font-black text-emerald-300">-43</span>
        </div>

        <div className="grid grid-cols-[44px_1fr_42px_42px_42px_42px_54px] border-b border-slate-700/60 pb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
          <div>Pos</div>
          <div>Golfer</div>
          <div className="text-right">R1</div>
          <div className="text-right">R2</div>
          <div className="text-right">R3</div>
          <div className="text-right">R4</div>
          <div className="text-right">Total</div>
        </div>

        {golfers.map(([pos, name, r1, r2, r3, r4, total, counts]) => (
          <div
            key={name.toString()}
            className={`grid grid-cols-[44px_1fr_42px_42px_42px_42px_54px] items-center border-b border-slate-700/60 py-3 text-xs last:border-b-0 ${
              counts ? "text-white" : "text-slate-500 line-through"
            }`}
          >
            <div className="font-black text-slate-400">{pos}</div>
            <div className="min-w-0 truncate font-black">{name}</div>
            <div className="text-right font-bold">{r1}</div>
            <div className="text-right font-bold">{r2}</div>
            <div className="text-right font-bold">{r3}</div>
            <div className="text-right font-bold">{r4}</div>
            <div className="text-right font-black text-emerald-300">
              {total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030712] text-white">
      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-2">
        <div className="absolute left-1/2 top-12 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 -z-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

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
            No spreadsheets. No season long commitments. No headaches.
          </p>

          <p className="mt-6 max-w-3xl text-xl leading-9 text-slate-300">
            The easiest end-to-end drafting and tracking experience for sports
            pools. Create a contest, invite your friends, draft your players,
            and follow the leaderboard in real time.
          </p>

          <div className="mt-10">
            <a
              href="/create-pool"
              className="inline-flex rounded-2xl bg-emerald-400 px-7 py-4 text-base font-bold text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
            >
              Create Your Pool →
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-lg font-semibold text-slate-300 md:text-xl">
            <span>✓ Snake Drafts</span>
            <span>✓ Custom Scoring</span>
            <span>✓ Live Leaderboard</span>
          </div>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end">
          <div className="w-full max-w-[500px] space-y-4">
            <DraftBoardPreview />
            <LeaderboardPreview />
          </div>
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
              Golf First. More Sports Coming...
            </h3>
            <p className="mt-3 leading-7 text-slate-400">
              We're starting with golf drafts and live leaderboards, with plans
              to bring the same customizable experience to football, baseball,
              college sports, and beyond.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
