import Link from "next/link";
import BrandMark from "../components/BrandMark";

const featureCards = [
  [
    "Pick Your Conferences",
    "Build the player pool around the conferences your group actually follows.",
    "Power 5 + ND",
  ],
  [
    "Set Positions + Scoring",
    "QB, RB, WR, TE, FLEX, D/ST, kickers, and custom scoring rules.",
    "Roster Rules",
  ],
  [
    "Snake Draft",
    "Draft college stars with the same clean board experience as golf.",
    "Live Draft",
  ],
  [
    "Track Live",
    "Follow the leaderboard, team totals, and player scoring every week.",
    "Leaderboard",
  ],
];

const flowSteps = [
  {
    label: "Teams + Leagues",
    title: "Choose conferences",
    detail: "Power 5, Notre Dame, MAC, or custom player pools.",
    bars: ["w-11/12", "w-8/12", "w-10/12"],
  },
  {
    label: "Positions + Scoring",
    title: "Build your rules",
    detail: "Roster spots, PPR, passing TDs, sacks, returns, and more.",
    bars: ["w-9/12", "w-6/12", "w-8/12"],
  },
  {
    label: "Snake Draft",
    title: "Draft your team",
    detail: "A live board built for friend groups and commissioner control.",
    bars: ["w-7/12", "w-10/12", "w-5/12"],
  },
  {
    label: "Live Leaderboard",
    title: "Track every week",
    detail: "Standings update around team and player production.",
    bars: ["w-10/12", "w-9/12", "w-11/12"],
  },
];

export default function FootballHomePage() {
  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>

          <Link href="/" className="text-sm font-medium text-emerald-300">
            Back Home
          </Link>
        </div>

        <section className="mt-12 overflow-hidden rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40 md:p-10 lg:grid lg:grid-cols-[1fr_520px] lg:gap-10">
          <div className="flex min-h-[560px] flex-col justify-center">
            <p className="text-lg font-black uppercase tracking-[0.22em] text-emerald-300 md:text-xl">
              College Football
            </p>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.98] md:text-7xl xl:text-8xl">
              A true fantasy football experience for college.
            </h1>
            <p className="mt-7 max-w-3xl text-xl font-semibold leading-9 text-slate-300 md:text-2xl md:leading-10">
              Pick your conferences. Set the positions. Customize the scoring
              system. Run a snake draft. Track the weekly leaderboard live.
            </p>

            <div className="mt-9">
              <Link
                href="/football/create"
                className="inline-flex min-h-20 items-center justify-center rounded-2xl bg-emerald-400 px-10 py-5 text-center text-xl font-black text-slate-950 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 md:min-w-[360px]"
              >
                Start With Pool Setup
              </Link>
            </div>
          </div>

          <div className="mt-10 lg:mt-0">
            <div className="rounded-3xl border border-emerald-400/20 bg-[#030712] p-4 shadow-2xl shadow-black/50">
              <div className="rounded-2xl border border-white/5 bg-[#162033] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Pool Flow
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Built for Saturdays
                    </h2>
                  </div>
                  <div className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950">
                    Live
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {flowSteps.map((step, index) => (
                    <div
                      key={step.label}
                      className="rounded-2xl border border-white/5 bg-[#111827] p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-lg font-black text-slate-950">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                            {step.label}
                          </p>
                          <h3 className="mt-1 text-lg font-black">
                            {step.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            {step.detail}
                          </p>

                          <div className="mt-4 space-y-2">
                            {step.bars.map((width, barIndex) => (
                              <div
                                key={`${step.label}-${barIndex}`}
                                className="h-2 overflow-hidden rounded-full bg-[#030712]"
                              >
                                <div
                                  className={`${width} h-full rounded-full ${
                                    barIndex === 0
                                      ? "bg-emerald-400"
                                      : "bg-emerald-400/35"
                                  }`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {featureCards.map(([title, body, tag]) => (
            <div
              key={title}
              className="rounded-3xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40"
            >
              <div className="mb-5 inline-flex rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-300">
                {tag}
              </div>
              <h2 className="text-2xl font-black md:text-3xl">{title}</h2>
              <p className="mt-3 leading-7 text-slate-400">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
