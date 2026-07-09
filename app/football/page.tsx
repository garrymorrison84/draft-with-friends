import Link from "next/link";
import BrandMark from "../components/BrandMark";

const rosterPreviewRows = [
  ["QB", "1"],
  ["RB", "2"],
  ["WR", "2"],
  ["TE", "1"],
  ["FLEX", "1"],
  ["D/ST", "1"],
  ["K", "0"],
];

const scoringPreviewGroups = [
  {
    label: "Passing",
    rows: [
      ["Pass TD", "4 pts"],
      ["Pass Yds", "25 = 1"],
      ["Completion", "0.2"],
    ],
  },
  {
    label: "Rushing",
    rows: [
      ["Rush TD", "6 pts"],
      ["Rush Yds", "10 = 1"],
      ["Rush Att", "0.2"],
    ],
  },
  {
    label: "Receiving",
    rows: [
      ["Reception", "0.5"],
      ["Rec Yds", "10 = 1"],
      ["Rec TD", "6 pts"],
    ],
  },
];

const eligiblePreviewRows = [
  {
    slot: "QB",
    name: "J. Daniels",
    school: "LSU",
    conference: "SEC",
    avg: "29.9",
    proj: "31.2",
    color: "border-fuchsia-300/60 bg-fuchsia-400/20 text-fuchsia-100",
  },
  {
    slot: "RB",
    name: "O. Hampton",
    school: "North Carolina",
    conference: "ACC",
    avg: "22.7",
    proj: "33.8",
    color: "border-teal-200/60 bg-teal-300/20 text-teal-100",
  },
  {
    slot: "WR",
    name: "H. Clement",
    school: "West Virginia",
    conference: "Big 12",
    avg: "24.4",
    proj: "40.7",
    color: "border-sky-200/60 bg-sky-300/25 text-sky-50",
  },
];

const teamPreviewRows = [
  { slot: "QB", name: "J. Daniels", school: "LSU", points: "29.9", color: "border-fuchsia-300/60 bg-fuchsia-400/20 text-fuchsia-100" },
  { slot: "RB", name: "O. Hampton", school: "North Carolina", points: "22.7", color: "border-teal-200/60 bg-teal-300/20 text-teal-100" },
  { slot: "RB", name: "B. Corum", school: "Michigan", points: "21.4", color: "border-teal-200/60 bg-teal-300/20 text-teal-100" },
  { slot: "WR", name: "H. Clement", school: "West Virginia", points: "24.4", color: "border-sky-200/60 bg-sky-300/25 text-sky-50" },
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
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.04] sm:text-5xl md:mt-7 md:text-6xl xl:text-[4.25rem]">
                Fantasy Football for Saturday.
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-300 sm:text-lg md:mt-6 md:text-xl md:leading-9">
                One weekend at a time. No waivers, trades, bye weeks, or
                season-long commitment. Pick the conferences, rip a snake draft,
                and give every college football watch party a live scoreboard.
              </p>
            </div>

            <div className="mt-7 md:mt-9">
              <Link
                href="/football/create"
                className="inline-flex min-h-16 w-full items-center justify-center rounded-2xl bg-emerald-400 px-6 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 sm:w-auto md:min-h-20 md:min-w-[360px] md:px-10 md:py-5 md:text-xl"
              >
                Start a Weekend Pool
              </Link>
            </div>
          </div>

          <div className="border-t border-emerald-400/20 bg-[#06111f] p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-8">
            <div className="grid gap-5">
              <div className="rounded-3xl border border-white/10 bg-[#162033] p-4 shadow-2xl shadow-black/40 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Step 1
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Set roster positions
                    </h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
                      Managers choose the exact build before kickoff: starters,
                      flex, defense, and kickers.
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950">
                    Week 1
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-[#030712] p-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {rosterPreviewRows.map(([slot, count]) => (
                      <div
                        key={slot}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[#111827] px-4 py-3"
                      >
                        <span className="text-sm font-black text-slate-300">{slot}</span>
                        <span className="text-lg font-black text-emerald-300">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-5">
                <div className="rounded-3xl border border-white/10 bg-[#162033] p-4 shadow-xl shadow-black/30 sm:p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                    Step 2
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Establish scoring settings</h2>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {scoringPreviewGroups.map((group) => (
                      <div
                        key={group.label}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712]"
                      >
                        <div className="border-b border-white/10 bg-[#111827] px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-300">
                          {group.label}
                        </div>
                        {group.rows.map(([label, value]) => (
                          <div
                            key={`${group.label}-${label}`}
                            className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-3 last:border-b-0"
                          >
                            <span className="min-w-0 text-sm font-black text-slate-300">{label}</span>
                            <span className="shrink-0 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-slate-950">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#162033] p-4 shadow-xl shadow-black/30 sm:p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                    Step 3
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Snake draft your squads</h2>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                      <div className="grid grid-cols-[minmax(0,1fr)_70px_70px] gap-3 border-b border-white/10 bg-[#111827] px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                        <span>Eligible</span>
                        <span className="text-right">Avg</span>
                        <span className="text-right text-emerald-300">Proj</span>
                      </div>
                      {eligiblePreviewRows.map((player) => (
                        <div
                          key={player.name}
                          className="grid grid-cols-[minmax(0,1fr)_70px_70px] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${player.color}`}>
                              {player.slot}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">{player.name}</p>
                              <p className="truncate text-xs font-bold text-slate-500">
                                {player.school} • {player.conference}
                              </p>
                            </div>
                          </div>
                          <span className="text-right text-sm font-black text-slate-300">{player.avg}</span>
                          <span className="text-right text-sm font-black text-emerald-300">{player.proj}</span>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
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
                        {["Drafted", "Drafted", "On the clock"].map((status, index) => (
                          <div
                            key={`${status}-${index}`}
                            className={`min-h-28 border-r border-white/10 p-4 last:border-r-0 ${
                              index === 2 ? "bg-emerald-400/10" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className={index === 2 ? "text-sm font-black text-emerald-300" : "text-sm font-black text-slate-400"}>
                                {status}
                              </p>
                              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-black text-slate-300">
                                1.{index + 1}
                              </span>
                            </div>
                            <p className="mt-5 truncate text-sm font-bold text-white">
                              {index === 0 ? "J. Daniels" : index === 1 ? "O. Hampton" : "Awaiting pick"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#162033] p-4 shadow-xl shadow-black/30 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Step 4
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Track every team</h2>
                  </div>
                  <p className="text-sm font-bold text-slate-400">
                    Projected before kickoff. Live once games start.
                  </p>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                    {teamPreviewRows.map((player) => (
                      <div
                        key={player.name}
                        className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-3 border-b border-white/5 p-4 last:border-b-0"
                      >
                        <span className={`rounded-xl border px-3 py-2 text-center text-sm font-black ${player.color}`}>
                          {player.slot}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black">{player.name}</p>
                          <p className="truncate text-sm font-bold text-slate-500">
                            {player.school}
                          </p>
                        </div>
                        <p className="text-right text-lg font-black text-emerald-300">
                          {player.points}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
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
      </div>
    </main>
  );
}
