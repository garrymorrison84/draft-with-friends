export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <div className="text-3xl font-black tracking-tight md:text-4xl">
          DRAFT <span className="text-emerald-400">WITH</span> FRIENDS
        </div>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-104px)] max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-2">
        <div className="absolute left-1/2 top-12 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 -z-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10">
          <p className="mb-5 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-black uppercase tracking-wide text-emerald-300">
            Live snake drafts + automatic scoring
          </p>

          <h1 className="max-w-5xl text-5xl font-black tracking-tight md:text-8xl">
            Draft Night
            <br />
            Finally Has
            <br />
            A Home.
          </h1>

          <p className="mt-5 text-lg font-semibold text-emerald-300">
            Snake drafts are the best part of sports pools. We made them the centerpiece.
          </p>

          <p className="mt-6 max-w-3xl text-xl leading-9 text-slate-300">
            Create a pool, invite your friends, run a live snake draft, and
            track the leaderboard automatically. No spreadsheets. No screenshots.
            No group text chaos.
          </p>

          <div className="mt-10">
            <a
              href="/create-pool"
              className="inline-flex rounded-xl bg-emerald-400 px-7 py-4 text-base font-bold text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
            >
              Create a Pool
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-400">
            <span>✓ Live Snake Drafts</span>
            <span>✓ Draft Board</span>
            <span>✓ Live Leaderboard</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-2xl bg-slate-900 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-300">
                    Live Snake Draft
                  </p>
                  <h2 className="text-2xl font-black">U.S. Open Pool</h2>
                </div>

                <div className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-black text-slate-950">
                  PICK 3.04
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-400">
                      On the clock
                    </p>
                    <p className="text-xl font-black">Garry</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-400">
                      Next pick
                    </p>
                    <p className="text-xl font-black text-emerald-300">
                      00:45
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Nutt", "Scottie", "Fleetwood", "Rose"],
                  ["Garry", "Rory", "Spieth", "On Clock"],
                  ["Silver", "JT", "Cantlay", "Day"],
                ].map(([team, pick1, pick2, pick3]) => (
                  <div
                    key={team}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <p className="mb-3 text-sm font-black text-white">{team}</p>

                    {[pick1, pick2, pick3].map((pick, index) => (
                      <div
                        key={`${team}-${pick}-${index}`}
                        className={`mb-2 rounded-lg px-3 py-2 text-sm font-bold last:mb-0 ${
                          pick === "On Clock"
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-slate-800 text-slate-200"
                        }`}
                      >
                        {pick}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="my-5 border-t border-white/10" />

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-emerald-300">
                      Live Score Tracking
                    </p>
                    <h3 className="text-xl font-black">Leaderboard</h3>
                  </div>

                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">
                    AUTO-UPDATING
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    ["1", "Nutt", "-22"],
                    ["2", "Garry", "-19"],
                    ["3", "Silver", "-15"],
                    ["4", "Mark", "-11"],
                  ].map(([rank, team, score]) => (
                    <div
                      key={team}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-black">
                          {rank}
                        </div>
                        <p className="font-black">{team}</p>
                      </div>

                      <p className="text-lg font-black text-emerald-300">
                        {score}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
                  Format: Draft 8 players. Best 4 scores count.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-black uppercase tracking-wide text-emerald-300">
            Built around the best part
          </p>

          <h2 className="text-4xl font-black tracking-tight md:text-6xl">
            The draft is the event.
          </h2>

          <p className="mt-5 text-xl leading-8 text-slate-300">
            Most pool sites start with scoring. Draft With Friends starts with
            the part everyone actually talks about: the picks, the reaches, the
            steals, and the bragging rights before the tournament even starts.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h3 className="text-xl font-black">Live Snake Drafts</h3>
            <p className="mt-3 leading-7 text-slate-400">
              Run a real draft board with your friends. Every pick updates live
              so everyone knows who is available and who is on the clock.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h3 className="text-xl font-black">Automatic Score Tracking</h3>
            <p className="mt-3 leading-7 text-slate-400">
              Once the draft is done, the pool turns into a live leaderboard.
              Track standings automatically as the event unfolds.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h3 className="text-xl font-black">Built For Friend Groups</h3>
            <p className="mt-3 leading-7 text-slate-400">
              No spreadsheets, screenshots, or messy group text updates. Create
              the pool, share the link, draft, and follow along.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
