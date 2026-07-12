import Link from "next/link";
import BrandMark from "../components/BrandMark";

const rosterPreviewRows = [
  ["Quarterback (QB)", "1"],
  ["Running Back (RB)", "2"],
  ["Wide Receiver (WR)", "2"],
  ["Tight End (TE)", "1"],
  ["Flex (RB/WR/TE)", "1"],
  ["Defense / Special Teams", "1"],
  ["Kicker", "0"],
];

const scoringPreviewTabs = [
  "Passing",
  "Rushing",
  "Receiving",
  "Team Defense",
  "Kicking",
  "More",
];

const scoringPreviewRows = [
  {
    label: "Rush Yds",
    detail: "1 point per 10 yards",
    enabled: true,
    controls: ["1 point per", "10", "Custom", "yards"],
  },
  {
    label: "Rushing TD",
    detail: "6 points per Rushing TD",
    enabled: true,
    controls: ["4", "6", "Custom", "points per Rushing TD"],
  },
  {
    label: "Rush Attempt",
    detail: "Off",
    enabled: false,
    controls: ["0.2", "Custom", "0", "points per Rush Attempt"],
  },
];

const eligiblePreviewRows = [
  {
    slot: "QB",
    name: "Jayden Daniels",
    school: "LSU",
    conference: "SEC",
    proj: "32",
    action: "Draft",
    taken: false,
    color: "border-purple-200 bg-purple-500/45 text-purple-50 shadow-purple-500/20",
  },
  {
    slot: "QB",
    name: "Jaxson Dart",
    school: "Ole Miss",
    conference: "SEC",
    proj: "30",
    action: "Taken",
    taken: true,
    color: "border-purple-200 bg-purple-500/45 text-purple-50 shadow-purple-500/20",
  },
  {
    slot: "QB",
    name: "Conner Weigman",
    school: "Texas A&M",
    conference: "SEC",
    proj: "28",
    action: "Draft",
    taken: false,
    color: "border-purple-200 bg-purple-500/45 text-purple-50 shadow-purple-500/20",
  },
  {
    slot: "WR",
    name: "Creed Whittemore",
    school: "Mississippi State",
    conference: "SEC",
    proj: "26",
    action: "Draft",
    taken: false,
    color: "border-yellow-200 bg-yellow-500/45 text-yellow-50 shadow-yellow-500/20",
  },
];

const draftBoardTeams = ["Brian", "Garry", "Andy", "Andrew", "Matt"];

const draftBoardCells = [
  { status: "Drafted", pick: "1.1", name: "Jaxson\nDart", slot: "QB", school: "Ole Miss", color: "bg-purple-950/70 border-purple-400/60", badge: "border-purple-200 bg-purple-500/55 text-purple-50" },
  { status: "Drafted", pick: "1.2", name: "Kyle\nMonangai", slot: "RB", school: "Rutgers", color: "bg-sky-950/70 border-sky-400/60", badge: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { status: "Drafted", pick: "1.3", name: "Blake\nCorum", slot: "RB", school: "Michigan", color: "bg-sky-950/70 border-sky-400/60", badge: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { status: "Drafted", pick: "1.4", name: "Braelon\nAllen", slot: "RB", school: "Wisconsin", color: "bg-sky-950/70 border-sky-400/60", badge: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { status: "Drafted", pick: "1.5", name: "Malik\nNabers", slot: "WR", school: "LSU", color: "bg-yellow-950/65 border-yellow-400/60", badge: "border-yellow-200 bg-yellow-500/55 text-yellow-50" },
  { status: "Drafted", pick: "2.6", name: "Raheim\nSanders", slot: "RB", school: "Arkansas", color: "bg-sky-950/70 border-sky-400/60", badge: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { status: "Drafted", pick: "2.5", name: "Nicholas\nSingleton", slot: "RB", school: "Penn State", color: "bg-sky-950/70 border-sky-400/60", badge: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { status: "Drafted", pick: "2.4", name: "Marvin\nHarrison\nJr.", slot: "WR", school: "Ohio State", color: "bg-yellow-950/65 border-yellow-400/60", badge: "border-yellow-200 bg-yellow-500/55 text-yellow-50" },
  { status: "Drafted", pick: "2.3", name: "Jalen\nMilroe", slot: "QB", school: "Alabama", color: "bg-purple-950/70 border-purple-400/60", badge: "border-purple-200 bg-purple-500/55 text-purple-50" },
  { status: "Drafted", pick: "2.2", name: "Brock\nBowers", slot: "TE", school: "Georgia", color: "bg-rose-950/70 border-rose-400/60", badge: "border-rose-200 bg-rose-500/55 text-rose-50" },
];

const livePreviewRows = [
  { slot: "QB", name: "J. Milton III", school: "Tennessee", game: "@ FL", points: "18.0", passing: ["287", "2", "1"], rushing: ["6", "0"], receiving: ["0", "0", "0"], color: "border-purple-200 bg-purple-500/55 text-purple-50" },
  { slot: "RB", name: "K. Monangai", school: "Rutgers", game: "vs VTECH", points: "33.0", passing: ["0", "0", "0"], rushing: ["143", "3"], receiving: ["1", "3", "0"], color: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { slot: "RB", name: "N. Singleton", school: "Penn State", game: "@ ILL", points: "17.0", passing: ["0", "0", "0"], rushing: ["37", "1"], receiving: ["3", "49", "0"], color: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { slot: "WR", name: "E. Egbuka", school: "Ohio State", game: "vs WKENT", points: "20.0", passing: ["0", "0", "0"], rushing: ["0", "0"], receiving: ["4", "57", "2"], color: "border-yellow-200 bg-yellow-500/55 text-yellow-50" },
  { slot: "TE", name: "T. Warren", school: "Penn State", game: "@ ILL", points: "12.0", passing: ["0", "0", "0"], rushing: ["0", "0"], receiving: ["3", "35", "1"], color: "border-rose-200 bg-rose-500/55 text-rose-50" },
];

export default function FootballHomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>

          <Link href="/" className="text-sm font-medium text-emerald-300">
            Back Home
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/5 bg-[#111827] shadow-xl shadow-black/40 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
          <div className="p-5 sm:p-6 md:p-8 lg:p-12">
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

            <div className="mt-7 rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-4 sm:p-5 md:mt-9">
              <p className="text-sm font-black uppercase tracking-widest text-emerald-200">
                Next step
              </p>
              <p className="mt-2 text-lg font-black text-white sm:text-xl">
                Build your CFB Week 1 pool
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                Choose teams, conferences, roster spots, and scoring before the draft room opens.
              </p>
              <Link
                href="/football/create"
                className="mt-5 inline-flex min-h-16 w-full items-center justify-center rounded-2xl bg-emerald-300 px-6 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:bg-emerald-200 md:min-h-20 md:px-10 md:py-5 md:text-xl"
              >
                Start a Weekend Pool
              </Link>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black uppercase tracking-wide text-slate-300">
                <span className="rounded-xl bg-[#030712] px-3 py-3">Setup</span>
                <span className="rounded-xl bg-[#030712] px-3 py-3">Scoring</span>
                <span className="rounded-xl bg-[#030712] px-3 py-3">Draft</span>
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-400/20 bg-[#06111f] p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-6">
            <div className="grid gap-5">
              <div className="rounded-3xl border border-white/10 bg-[#202b3a] p-4 shadow-2xl shadow-black/40 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Step 1
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Roster Positions</h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
                      Active roster spots that will be drafted and scored for each team.
                    </p>
                  </div>
                  <Link
                    href="/football/create"
                    className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-5 py-3 text-base font-black text-emerald-300 transition hover:bg-emerald-300 hover:text-slate-950"
                    aria-label="Create a CFB Week 1 pool"
                  >
                    CFB Week 1
                  </Link>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                  {rosterPreviewRows.map(([slot, count], index) => (
                    <div
                      key={slot}
                      className="grid grid-cols-[minmax(0,1fr)_52px_44px_52px] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
                    >
                      <span className="min-w-0 text-sm font-black text-white sm:text-base">{slot}</span>
                      <span className={`rounded-xl border border-white/10 px-3 py-2 text-center text-base font-black ${index === rosterPreviewRows.length - 1 ? "text-emerald-300/40" : "text-emerald-300"}`}>
                        -
                      </span>
                      <span className="text-center text-lg font-black text-white">{count}</span>
                      <span className="rounded-xl border border-white/10 px-3 py-2 text-center text-base font-black text-emerald-300">
                        +
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#202b3a] p-4 shadow-xl shadow-black/30 sm:p-5">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                  Step 2
                </p>
                <h2 className="mt-2 text-2xl font-black">Scoring Settings</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
                  Start from familiar defaults, then adjust only the values your group cares about.
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl bg-[#111827] p-1.5">
                  <div className="grid grid-cols-3 gap-1 text-center text-xs font-black text-slate-300 sm:grid-cols-6">
                    {scoringPreviewTabs.map((tab) => (
                      <span
                        key={tab}
                        className={`rounded-xl px-2 py-3 ${tab === "Rushing" ? "bg-slate-100 text-slate-950" : ""}`}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                  {scoringPreviewRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid gap-4 border-b border-white/5 p-4 last:border-b-0 md:grid-cols-[minmax(220px,0.85fr)_minmax(0,1.15fr)] md:items-center"
                    >
                      <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4">
                        <span className={`relative h-8 rounded-full ${row.enabled ? "bg-emerald-400" : "bg-slate-600"}`}>
                          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white ${row.enabled ? "right-1" : "left-1"}`} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-white">{row.label}</p>
                          <p className="truncate text-sm font-bold text-slate-500">{row.detail}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                        {row.controls.map((control, index) => {
                          const isValue = /^[0-9.]+$/.test(control) || control === "Custom";
                          const isSelected = row.enabled
                            ? control === "10" || control === "6"
                            : control === "Custom";

                          return (
                            <span
                              key={`${row.label}-${control}-${index}`}
                              className={
                                isValue
                                  ? `rounded-xl border px-4 py-2 text-sm font-black ${
                                      isSelected
                                        ? row.enabled
                                          ? "border-emerald-400 bg-emerald-400 text-slate-950"
                                          : "border-emerald-400/30 bg-emerald-400/30 text-slate-950"
                                        : "border-white/10 bg-[#111827] text-slate-300"
                                    }`
                                  : "text-sm font-black text-slate-500"
                              }
                            >
                              {control}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#162033] p-4 shadow-xl shadow-black/30 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Step 3
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Draft Board</h2>
                    <p className="mt-2 text-sm font-bold text-slate-400">
                      Snake draft order reverses each round.
                    </p>
                  </div>
                  <span className="w-fit rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-300">
                    Snake Draft
                  </span>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[0.48fr_0.52fr]">
                  <div className="rounded-2xl border border-white/10 bg-[#111827] p-3">
                    <h3 className="text-lg font-black">Eligible Players</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      SportsData CFB replay • 3,981 eligible players
                    </p>
                    <div className="mt-3 rounded-xl border border-white/10 bg-[#1b2638] px-3 py-3 text-sm font-bold text-slate-500">
                      Search players...
                    </div>
                    <div className="mt-2 rounded-xl border border-white/10 bg-[#1b2638] px-3 py-3 text-sm font-bold text-slate-300">
                      All Positions
                    </div>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                      <div className="grid grid-cols-[minmax(0,1fr)_70px_80px] bg-[#111827] px-3 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                        <span>Player</span>
                        <span className="text-center text-emerald-300">Proj Pts</span>
                        <span className="text-center">Action</span>
                      </div>
                      {eligiblePreviewRows.map((player) => (
                        <div
                          key={player.name}
                          className={`grid grid-cols-[minmax(0,1fr)_70px_80px] items-center gap-2 border-b border-white/5 px-3 py-3 last:border-b-0 ${player.taken ? "opacity-45" : ""}`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black shadow-lg ${player.color}`}>
                              {player.slot}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">{player.name}</p>
                              <p className="truncate text-xs font-bold text-slate-500">
                                {player.school} • {player.conference}
                              </p>
                            </div>
                          </div>
                          <span className="text-center text-sm font-black text-emerald-300">{player.proj}</span>
                          <span className={`rounded-xl px-3 py-2 text-center text-xs font-black ${player.taken ? "bg-slate-700 text-slate-400" : "bg-emerald-400 text-slate-950"}`}>
                            {player.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                    <div className="grid min-w-[580px] grid-cols-5 bg-gradient-to-r from-sky-950 via-teal-950 to-emerald-950">
                      {draftBoardTeams.map((team) => (
                        <div key={team} className="border-r border-emerald-300/20 px-3 py-4 text-center last:border-r-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            Team
                          </p>
                          <p className="mt-2 truncate text-xl font-black">{team}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid min-w-[580px] grid-cols-5">
                      {draftBoardCells.map((cell) => (
                        <div
                          key={`${cell.pick}-${cell.name}`}
                          className={`min-h-36 border-r border-t p-3 last:border-r-0 ${cell.color}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-black text-slate-300">{cell.status}</p>
                            <span className="rounded-full bg-blue-500/45 px-3 py-1 text-xs font-black text-blue-50">
                              {cell.pick}
                            </span>
                          </div>
                          <p className="mt-4 whitespace-pre-line text-lg font-black leading-tight text-white">
                            {cell.name}
                          </p>
                          <div className="mt-4 flex min-w-0 items-center gap-2">
                            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${cell.badge}`}>
                              {cell.slot}
                            </span>
                            <span className="truncate text-sm font-black text-slate-400">
                              {cell.school}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#202b3a] p-4 shadow-xl shadow-black/30 sm:p-5">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                  Step 4
                </p>
                <h2 className="mt-2 text-2xl font-black">Live Scoring Tracking</h2>
                <p className="mt-2 text-sm font-bold text-slate-400">
                  Position players update across passing, rushing, and receiving as games move.
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
                  <div className="bg-[#111827] px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
                    Position Players
                  </div>
                  <div className="grid min-w-[580px] grid-cols-[164px_56px_repeat(8,45px)] border-b border-white/10 bg-[#111827] text-center text-xs font-black uppercase tracking-wide text-slate-500">
                    <div className="row-span-2 flex items-center px-4 text-left">Player</div>
                    <div className="row-span-2 flex items-center justify-center text-emerald-300">Pts</div>
                    <div className="col-span-3 border-l border-white/10 py-2">Passing</div>
                    <div className="col-span-2 border-l border-white/10 py-2">Rushing</div>
                    <div className="col-span-3 border-l border-white/10 py-2">Receiving</div>
                    {["Yds", "TD", "Int", "Yds", "TD", "Rec", "Yds", "TD"].map((label, index) => (
                      <div key={`${label}-${index}`} className="border-l border-white/10 py-2">
                        {label}
                      </div>
                    ))}
                  </div>
                  {livePreviewRows.map((player) => (
                    <div
                      key={player.name}
                      className="grid min-w-[580px] grid-cols-[164px_56px_repeat(8,45px)] items-center border-b border-white/5 text-center text-xs font-black text-slate-300 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-3 px-4 py-4 text-left">
                        <span className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-black ${player.color}`}>
                          {player.slot}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{player.name}</p>
                          <p className="truncate text-xs font-bold text-slate-500">
                            {player.school} • {player.game}
                          </p>
                        </div>
                      </div>
                      <div className="text-emerald-300">{player.points}</div>
                      {[...player.passing, ...player.rushing, ...player.receiving].map((value, index) => (
                        <div key={`${player.name}-${index}`} className="border-l border-white/5 py-4">
                          {value}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
