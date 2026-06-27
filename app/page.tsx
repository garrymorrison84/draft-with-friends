export default function Home() {
  const draftTeams = [
    {
      team: "Mark",
      picks: ["On the clock", "Open", "Open"],
      pickNumbers: ["1.1", "2.4", "3.1"],
    },
    {
      team: "Steve",
      picks: ["Open", "Open", "Open"],
      pickNumbers: ["1.2", "2.3", "3.2"],
    },
    {
      team: "Andrew",
      picks: ["Open", "Open", "Open"],
      pickNumbers: ["1.3", "2.2", "3.3"],
    },
    {
      team: "Garry",
      picks: ["Open", "Open", "Open"],
      pickNumbers: ["1.4", "2.1", "3.4"],
    },
  ];

  const standings = [
    ["1", "Mark", "-55"],
    ["2", "Garry", "-49"],
    ["3", "Steve", "-45"],
    ["4", "Andrew", "-44"],
  ];

  const golfers = [
    ["T1", "Scottie Scheffler", "-6", "-10", "E", "-", "-16", true],
    ["T1", "Akshay Bhatia", "-4", "-8", "-4", "-", "-16", true],
    ["T7", "Justin Rose", "-5", "-4", "-3", "-", "-12", true],
    ["T13", "Justin Thomas", "-2", "-4", "-5", "-", "-11", true],
    ["T13", "Sam Burns", "-4", "-4", "-3", "-", "-11", false],
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 sm:py-8">
        <div className="text-xl font-black tracking-tight sm:text-3xl md:text-4xl">
          DRAFT <span className="text-emerald-400">WITH</span> FRIENDS
        </div>

        <a
          href="/create-pool"
          className="hidden rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 sm:inline-flex"
        >
          Create a Pool
        </a>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-6 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 lg:py-14">
        <div className="absolute left-1/2 top-16 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 -z-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-300 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            The home for snake drafts
          </div>

          <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            Your Friends.
            <br />
            Your Pool.
            <br />
            Your Rules.
          </h1>

          <p className="mt-6 max-w-2xl text-xl font-black leading-8 text-emerald-300 sm:text-2xl">
            Snake drafts are the best part of sports pools. We made them the
            centerpiece.
          </p>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9">
            No spreadsheets. No season-long commitments. No headaches. Just a
            better way to draft, track, and compete with your friends.
          </p>

          <div className="mt-9">
            <a
              href="/create-pool"
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-7 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 sm:w-auto"
            >
              Create Your Pool →
            </a>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl sm:gap-5">
            {[
              ["↝", "Live Snake Drafts"],
              ["▮", "Automatic Scoring"],
              ["🏆", "Live Standings"],
            ].map(([icon, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-emerald-400/30 bg-slate-900/60 p-3 sm:p-4"
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-lg font-black text-emerald-300">
                  {icon}
                </div>
                <p className="text-xs font-black leading-5 sm:text-sm">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 shadow-2xl shadow-emerald-950/20 backdrop-blur sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-emerald-300 sm:text-sm">
                  Current Pick 1.1
                </p>
                <h2 className="text-2xl font-black sm:text-3xl">Draft Room</h2>
                <p className="mt-1 text-sm font-bold text-slate-300">
                  Mark is on the clock.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300">
                Snake Draft
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[0.9fr_1.8fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                <h3 className="text-base font-black sm:text-lg">
                  Eligible Golfers
                </h3>

                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-400">
                  Search golfers...
                </div>

                <div className="mt-3 space-y-2">
                  {[
                    ["Scottie Scheffler", "+440"],
                    ["Tommy Fleetwood", "+1600"],
                    ["Xander Schauffele", "+1800"],
                  ].map(([name, odds]) => (
                    <div
                      key={name}
                      className="rounded-xl border border-emerald-400/25 bg-slate-900 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black sm:text-base">
                            {name}
                          </p>
                          <p className="text-sm text-slate-400">{odds}</p>
                        </div>
                        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                          Draft
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70">
                <div className="grid grid-cols-4 bg-emerald-700/90">
                  {draftTeams.map((team) => (
                    <div
                      key={team.team}
                      className="border-r border-emerald-400/20 p-3 text-center last:border-r-0"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/80">
                        Team
                      </p>
                      <p className="text-sm font-black sm:text-lg">
                        {team.team}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-4">
                  {draftTeams.flatMap((team) =>
                    team.picks.map((pick, index) => (
                      <div
                        key={`${team.team}-${index}`}
                        className={`min-h-20 border-r border-t border-slate-800 p-3 last:border-r-0 ${
                          pick === "On the clock"
                            ? "bg-emerald-400/15"
                            : "bg-slate-950"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p
                            className={`text-xs font-black sm:text-sm ${
                              pick === "On the clock"
                                ? "text-emerald-300"
                                : "text-slate-500"
                            }`}
                          >
                            {pick}
                          </p>
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-300">
                            {team.pickNumbers[index]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Awaiting selection
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 shadow-2xl shadow-emerald-950/20 backdrop-blur sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-black text-emerald-300 sm:text-sm">
                Live Standings
              </p>
              <h2 className="text-2xl font-black sm:text-3xl">Leaderboard</h2>
              <p className="mt-1 text-xs font-bold text-slate-400 sm:text-sm">
                US Open • Draft 6 golfers • Best 4 scores count
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[0.8fr_1.7fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">
                  Leaderboard
                </h3>

                <div className="space-y-2">
                  {standings.map(([rank, team, score]) => (
                    <div
                      key={team}
                      className="flex items-center justify-between border-b border-slate-800 py-2 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-400">
                          {rank}
                        </span>
                        <span className="font-black">{team}</span>
                      </div>
                      <span className="font-black text-emerald-300">
                        {score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70">
                <div className="grid grid-cols-[42px_1fr_42px_42px_42px_42px_54px] border-b border-slate-700 px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400 sm:grid-cols-[60px_1fr_50px_50px_50px_50px_70px] sm:text-xs">
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
                    key={`${name}`}
                    className={`grid grid-cols-[42px_1fr_42px_42px_42px_42px_54px] items-center border-b border-slate-800 px-3 py-3 text-xs last:border-b-0 sm:grid-cols-[60px_1fr_50px_50px_50px_50px_70px] sm:text-sm ${
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
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-5 sm:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:border-r md:border-slate-700 md:pr-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-2xl text-emerald-300">
                ↝
              </div>
              <h3 className="text-xl font-black">Real Snake Drafts</h3>
              <p className="mt-3 leading-7 text-slate-400">
                Run a live snake draft with your friends. Every pick updates
                instantly so everyone knows who&apos;s available and who&apos;s
                on the clock.
              </p>
            </div>

            <div className="md:border-r md:border-slate-700 md:px-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-2xl text-emerald-300">
                ▮
              </div>
              <h3 className="text-xl font-black">Automatic Live Scoring</h3>
              <p className="mt-3 leading-7 text-slate-400">
                Once the draft is done, we track the tournament for you. Your
                leaderboard updates automatically as the action unfolds.
              </p>
            </div>

            <div className="md:pl-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-2xl text-emerald-300">
                🏆
              </div>
              <h3 className="text-xl font-black">Built for Friends</h3>
              <p className="mt-3 leading-7 text-slate-400">
                Easy setup, custom rules, roster management, and full control
                for commissioners. You&apos;re in charge.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
