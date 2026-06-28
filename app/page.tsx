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

        <div className="relative z-10 flex justify-center lg:justify-end">
          <div className="w-full max-w-[500px] space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur">
              <img
                src="/images/draft-board-home.png"
                alt="Draft With Friends snake draft board"
                className="w-full rounded-2xl border border-white/10"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur">
              <img
                src="/images/leaderboard-home.png"
                alt="Draft With Friends live leaderboard"
                className="w-full rounded-2xl border border-white/10"
              />
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
              We're starting with golf drafts and live leaderboards, with plans to bring the same customizable experience to football, baseball, college sports, and beyond.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
