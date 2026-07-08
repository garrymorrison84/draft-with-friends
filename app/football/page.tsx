import Link from "next/link";
import BrandMark from "../components/BrandMark";

const flowSteps = [
  {
    label: "Player Pool",
    title: "Pick the conferences",
    detail: "Power programs, independents, or only the leagues your group follows.",
  },
  {
    label: "Roster + Scoring",
    title: "Set the rules",
    detail: "Choose positions, flex spots, PPR, passing TDs, sacks, kickers, and D/ST.",
  },
  {
    label: "Snake Draft",
    title: "Draft with friends",
    detail: "A live draft room built for weekend pools and commissioner control.",
  },
  {
    label: "Live Tracking",
    title: "Watch the board move",
    detail: "Projected scores before kickoff, then live scoring once games start.",
  },
];

const playerRows = [
  { pos: "QB", name: "J. Daniels", school: "LSU", pts: "29.9", color: "border-fuchsia-300/60 bg-fuchsia-400/20 text-fuchsia-100" },
  { pos: "WR", name: "H. Clement", school: "West Virginia", pts: "24.4", color: "border-sky-200/60 bg-sky-300/20 text-sky-100" },
  { pos: "RB", name: "O. Hampton", school: "North Carolina", pts: "22.7", color: "border-teal-200/60 bg-teal-300/20 text-teal-100" },
];

const leaderboardRows = [
  ["1", "Garry", "226.0"],
  ["2", "Wade", "217.0"],
  ["3", "Steve", "204.0"],
];

export default function FootballHomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>

          <Link href="/" className="text-sm font-medium text-emerald-300">
            Back Home
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/5 bg-[#111827] shadow-xl shadow-black/40 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <div className="flex flex-col justify-between p-5 sm:p-8 md:p-10 lg:min-h-[760px] lg:p-12">
            <div>
              <p className="text-xl font-black uppercase tracking-[0.14em] text-emerald-300 sm:text-3xl md:text-5xl">
              College Football
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.04] sm:text-5xl md:mt-7 md:text-6xl xl:text-7xl">
                Fantasy draft energy, built for college Saturdays.
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-300 sm:text-lg md:mt-6 md:text-xl md:leading-9">
                College football and fantasy snake drafts should fit together.
                The hard part has always been scheduling. Draft With Friends
                turns that chaos into weekend-long pools: pick the conferences,
                draft the players, and track every roster in real time.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {["Weekend pools", "Custom conferences", "Live scoring"].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 md:mt-9">
              <Link
                href="/football/create"
                className="inline-flex min-h-16 w-full items-center justify-center rounded-2xl bg-emerald-400 px-6 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 sm:w-auto md:min-h-20 md:min-w-[360px] md:px-10 md:py-5 md:text-xl"
              >
                Start Pool Setup
              </Link>
            </div>
          </div>

          <div className="border-t border-emerald-400/20 bg-[#06111f] p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-8">
            <div className="grid gap-5">
              <div className="rounded-3xl border border-white/10 bg-[#162033] p-4 shadow-2xl shadow-black/40 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Live Draft Preview
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Snake draft, college-style
                    </h2>
                  </div>
                  <div className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950">
                    Week 1
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                  <div className="grid grid-cols-3 bg-gradient-to-r from-emerald-900 via-teal-900 to-sky-900">
                    {["Garry", "Wade", "Steve"].map((team) => (
                      <div key={team} className="border-r border-white/10 p-3 text-center last:border-r-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                          Team
                        </p>
                        <p className="mt-1 truncate text-lg font-black">{team}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3">
                    {["On the clock", "Open", "Open"].map((status, index) => (
                      <div
                        key={`${status}-${index}`}
                        className={`min-h-28 border-r border-white/10 p-4 last:border-r-0 ${
                          index === 0 ? "bg-emerald-400/10" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className={index === 0 ? "text-sm font-black text-emerald-300" : "text-sm font-black text-slate-500"}>
                            {status}
                          </p>
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-black text-slate-300">
                            1.{index + 1}
                          </span>
                        </div>
                        <p className="mt-5 text-sm font-bold text-slate-500">
                          Awaiting pick
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
                <div className="rounded-3xl border border-white/10 bg-[#162033] p-4 shadow-xl shadow-black/30 sm:p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Eligible Players
                  </p>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                    {playerRows.map((player) => (
                      <div
                        key={player.name}
                        className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-3 border-b border-white/5 p-4 last:border-b-0"
                      >
                        <span className={`rounded-xl border px-3 py-2 text-center text-sm font-black ${player.color}`}>
                          {player.pos}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black">{player.name}</p>
                          <p className="truncate text-sm font-bold text-slate-500">
                            {player.school}
                          </p>
                        </div>
                        <p className="text-right text-lg font-black text-emerald-300">
                          {player.pts}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#162033] p-4 shadow-xl shadow-black/30 sm:p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Projected Leaderboard
                  </p>
                  <div className="mt-4 space-y-3">
                    {leaderboardRows.map(([rank, team, points]) => (
                      <div
                        key={team}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#202b3a] px-4 py-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-lg font-black text-slate-500">{rank}</span>
                          <span className="truncate text-lg font-black">{team}</span>
                        </div>
                        <span className="text-xl font-black text-emerald-300">
                          {points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          {flowSteps.map((step, index) => (
            <div
              key={step.label}
              className="rounded-3xl border border-white/5 bg-[#111827] p-5 shadow-xl shadow-black/40 sm:p-7"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-lg font-black text-slate-950">
                {index + 1}
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                {step.label}
              </p>
              <h2 className="mt-2 text-2xl font-black">{step.title}</h2>
              <p className="mt-3 leading-7 text-slate-400">{step.detail}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
