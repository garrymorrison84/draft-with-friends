export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <div className="text-3xl font-black tracking-tight md:text-4xl">
          DRAFT WITH FRIENDS
        </div>

        
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-104px)] max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-2">
        <div className="absolute left-1/2 top-12 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 -z-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10">
          
         
          

          <h1 className="max-w-5xl text-5xl font-black tracking-tight md:text-8xl">
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
              className="inline-flex rounded-xl bg-emerald-400 px-7 py-4 text-base font-bold text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
            >
              Create a Pool
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-400">
            <span>✓ Snake Drafts</span>
            <span>✓ Custom Scoring</span>
            <span>✓ Live Leaderboard</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-2xl bg-slate-900 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">U.S. Open Pool</p>
                  <h2 className="text-2xl font-bold">Weekend Draft</h2>
                </div>
                <div className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-bold text-slate-950">
                  LIVE
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["1", "Andrew", "-22", "Scheffler, Fleetwood, Rose"],
                  ["2", "Steve", "-19", "McIlroy, Spieth, Lowry"],
                  ["3", "Mark", "-15", "Thomas, Cantlay, Day"],
                  ["4", "Andy", "-11", "Aberg, Homa, Kim"],
                  ["5", "Garry", "-1", "Koepka, Rai, Speith"],
                ].map(([rank, team, score, golfers]) => (
                  <div
                    key={team}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-bold">
                        {rank}
                      </div>
                      <div>
                        <p className="font-bold">{team}</p>
                        <p className="text-sm text-slate-400">{golfers}</p>
                      </div>
                    </div>
                    <p className="text-xl font-black text-emerald-300">
                      {score}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
                Format: Draft 8 golfers. Best 4 scores count.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h3 className="text-xl font-bold">Customize Your Pool</h3>
            <p className="mt-3 leading-7 text-slate-400">
          Build the exact format your group wants. Choose how many golfers to draft, how many scores count, and let the competition begin.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h3 className="text-xl font-bold">Built For Friend Groups</h3>
            <p className="mt-3 leading-7 text-slate-400">
              No more messy spreadsheets, screenshots, or group text chaos.
              Create the pool and let everyone follow along.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h3 className="text-xl font-bold">Golf First. More Sports Coming...</h3>
            <p className="mt-3 leading-7 text-slate-400">
We're starting with golf drafts and live leaderboards, with plans to bring the same customizable experience to football, baseball, college sports, and beyond.            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
