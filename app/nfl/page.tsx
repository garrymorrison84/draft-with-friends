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

const draftBoardTeams = ["Brian", "Garry", "Andy", "Andrew", "Matt"];

const draftBoardCells = [
  { status: "Drafted", pick: "1.1", name: "Josh\nAllen", slot: "QB", school: "BUF", color: "bg-purple-500/20 border-purple-300/60", badge: "border-purple-200 bg-purple-500/45 text-purple-50 shadow-purple-500/20" },
  { status: "Drafted", pick: "1.2", name: "Saquon\nBarkley", slot: "RB", school: "PHI", color: "bg-sky-500/20 border-sky-300/60", badge: "border-sky-200 bg-sky-500/45 text-sky-50 shadow-sky-500/20" },
  { status: "Drafted", pick: "1.3", name: "Bijan\nRobinson", slot: "RB", school: "ATL", color: "bg-sky-500/20 border-sky-300/60", badge: "border-sky-200 bg-sky-500/45 text-sky-50 shadow-sky-500/20" },
  { status: "Drafted", pick: "1.4", name: "Ja'Marr\nChase", slot: "WR", school: "CIN", color: "bg-yellow-500/20 border-yellow-300/60", badge: "border-yellow-200 bg-yellow-500/45 text-yellow-50 shadow-yellow-500/20" },
  { status: "Drafted", pick: "1.5", name: "Justin\nJefferson", slot: "WR", school: "MIN", color: "bg-yellow-500/20 border-yellow-300/60", badge: "border-yellow-200 bg-yellow-500/45 text-yellow-50 shadow-yellow-500/20" },
  { status: "Drafted", pick: "2.6", name: "Derrick\nHenry", slot: "RB", school: "BAL", color: "bg-sky-500/20 border-sky-300/60", badge: "border-sky-200 bg-sky-500/45 text-sky-50 shadow-sky-500/20" },
  { status: "Drafted", pick: "2.5", name: "Amon-Ra\nSt. Brown", slot: "WR", school: "DET", color: "bg-yellow-500/20 border-yellow-300/60", badge: "border-yellow-200 bg-yellow-500/45 text-yellow-50 shadow-yellow-500/20" },
  { status: "Drafted", pick: "2.4", name: "Patrick\nMahomes", slot: "QB", school: "KC", color: "bg-purple-500/20 border-purple-300/60", badge: "border-purple-200 bg-purple-500/45 text-purple-50 shadow-purple-500/20" },
  { status: "Drafted", pick: "2.3", name: "Lamar\nJackson", slot: "QB", school: "BAL", color: "bg-purple-500/20 border-purple-300/60", badge: "border-purple-200 bg-purple-500/45 text-purple-50 shadow-purple-500/20" },
  { status: "Drafted", pick: "2.2", name: "Brock\nBowers", slot: "TE", school: "LV", color: "bg-red-500/20 border-red-300/60", badge: "border-red-200 bg-red-500/45 text-red-50 shadow-red-500/20" },
];

const livePreviewRows = [
  { slot: "QB", name: "J. Allen", school: "BUF", game: "vs MIA", points: "31.4", passing: ["287", "2", "1"], rushing: ["54", "1"], receiving: ["0", "0", "0"], color: "border-purple-200 bg-purple-500/55 text-purple-50" },
  { slot: "RB", name: "S. Barkley", school: "PHI", game: "@ DAL", points: "29.8", passing: ["0", "0", "0"], rushing: ["143", "2"], receiving: ["4", "37", "0"], color: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { slot: "RB", name: "B. Robinson", school: "ATL", game: "vs CAR", points: "24.1", passing: ["0", "0", "0"], rushing: ["97", "1"], receiving: ["6", "54", "0"], color: "border-sky-200 bg-sky-500/55 text-sky-50" },
  { slot: "WR", name: "J. Chase", school: "CIN", game: "vs PIT", points: "27.7", passing: ["0", "0", "0"], rushing: ["0", "0"], receiving: ["9", "117", "2"], color: "border-yellow-200 bg-yellow-500/55 text-yellow-50" },
  { slot: "TE", name: "B. Bowers", school: "LV", game: "@ DEN", points: "18.2", passing: ["0", "0", "0"], rushing: ["0", "0"], receiving: ["7", "82", "1"], color: "border-rose-200 bg-rose-500/55 text-rose-50" },
];

export default function NflHomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-2.5 py-5 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-[#111827] shadow-xl shadow-black/40 sm:mt-8 sm:rounded-3xl lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
          <div className="p-5 sm:p-6 md:p-8 lg:p-12">
            <div>
              <p className="text-lg font-black uppercase tracking-widest text-emerald-300 sm:text-2xl md:text-3xl">
                NFL
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.04] sm:text-5xl md:mt-7 md:text-6xl xl:text-[4.25rem]">
                Fantasy Football for Sundays.
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-300 sm:text-lg md:mt-6 md:text-xl md:leading-9">
                Single weekend pools! Pick your NFL teams, snake draft players, and watch them
                rack up points in real time.
              </p>
            </div>

            <div className="mt-7 rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-4 sm:p-5 md:mt-9">
              <p className="text-sm font-black uppercase tracking-widest text-emerald-200">
                Next step
              </p>
              <Link
                href="/nfl/create"
                className="mt-3 inline-flex min-h-16 w-full items-center justify-center rounded-2xl bg-emerald-300 px-6 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:bg-emerald-200 md:min-h-20 md:px-8 md:py-5 md:text-xl"
              >
                <span>
                  Create Your NFL
                  <br />
                  Fantasy Football Pool
                </span>
              </Link>
            </div>
          </div>

          <div className="min-w-0 border-t border-emerald-400/20 bg-[#111418] p-2.5 sm:p-6 lg:border-l lg:border-t-0 lg:p-6">
            <div className="grid gap-3 sm:gap-5">
              <div className="min-w-0 rounded-2xl border border-white/10 bg-[#1F2937] p-3 shadow-2xl shadow-black/40 sm:rounded-3xl sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Step 1
                    </p>
                    <h2 className="mt-1 text-xl font-black sm:mt-2 sm:text-2xl">Roster Positions</h2>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-400 sm:mt-2 sm:text-sm sm:leading-6">
                      Active roster spots that will be drafted and scored for each team.
                    </p>
                  </div>
                  <Link
                    href="/nfl/create"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-black text-emerald-300 transition hover:bg-emerald-300 hover:text-slate-950 sm:min-h-14 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
                    aria-label="Create an NFL pool"
                  >
                    NFL Week
                  </Link>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#030712] sm:mt-5">
                  {rosterPreviewRows.map(([slot, count], index) => (
                    <div
                      key={slot}
                      className="grid grid-cols-[minmax(0,1fr)_40px_34px_40px] items-center gap-2 border-b border-white/5 px-3 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_52px_44px_52px] sm:gap-3 sm:px-4 sm:py-3"
                    >
                      <span className="min-w-0 text-sm font-black text-white sm:text-base">{slot}</span>
                      <span className={`rounded-xl border border-white/10 px-2 py-1.5 text-center text-sm font-black sm:px-3 sm:py-2 sm:text-base ${index === rosterPreviewRows.length - 1 ? "text-emerald-300/40" : "text-emerald-300"}`}>
                        -
                      </span>
                      <span className="text-center text-base font-black text-white sm:text-lg">{count}</span>
                      <span className="rounded-xl border border-white/10 px-2 py-1.5 text-center text-sm font-black text-emerald-300 sm:px-3 sm:py-2 sm:text-base">
                        +
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-white/10 bg-[#1F2937] p-3 shadow-xl shadow-black/30 sm:rounded-3xl sm:p-5">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                  Step 2
                </p>
                <h2 className="mt-1 text-xl font-black sm:mt-2 sm:text-2xl">Scoring Settings</h2>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-400 sm:mt-2 sm:text-sm sm:leading-6">
                  Start from familiar defaults, then adjust only the values your group cares about.
                </p>

                <div className="mt-4 overflow-hidden rounded-2xl bg-[#111827] p-1 sm:mt-5 sm:p-1.5">
                  <div className="grid grid-cols-3 gap-1 text-center text-xs font-black text-slate-300 sm:grid-cols-6">
                    {scoringPreviewTabs.map((tab) => (
                      <span
                        key={tab}
                        className={`rounded-xl px-2 py-2.5 ${tab === "Rushing" ? "bg-slate-100 text-slate-950" : ""}`}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#030712] sm:mt-4">
                  {scoringPreviewRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid gap-3 border-b border-white/5 p-3 last:border-b-0 sm:p-4 md:grid-cols-[minmax(220px,0.85fr)_minmax(0,1.15fr)] md:items-center"
                    >
                      <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-4">
                        <span className={`relative h-7 rounded-full sm:h-8 ${row.enabled ? "bg-emerald-400" : "bg-slate-600"}`}>
                          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white sm:h-6 sm:w-6 ${row.enabled ? "right-1" : "left-1"}`} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white sm:text-base">{row.label}</p>
                          <p className="truncate text-xs font-bold text-slate-500 sm:text-sm">{row.detail}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-start gap-1.5 sm:gap-2 md:justify-end">
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
                                  ? `rounded-xl border px-3 py-1.5 text-xs font-black sm:px-4 sm:py-2 sm:text-sm ${
                                      isSelected
                                        ? row.enabled
                                          ? "border-emerald-400 bg-emerald-400 text-slate-950"
                                          : "border-emerald-400/30 bg-emerald-400/30 text-slate-950"
                                        : "border-white/10 bg-[#111827] text-slate-300"
                                    }`
                                  : "text-xs font-black text-slate-500 sm:text-sm"
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

              <div className="min-w-0 rounded-2xl border border-white/10 bg-[#172235] p-3 shadow-xl shadow-black/30 sm:rounded-3xl sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Step 3
                    </p>
                    <h2 className="mt-1 text-xl font-black sm:mt-2 sm:text-2xl">Draft Board</h2>
                    <p className="mt-1 text-xs font-bold text-slate-400 sm:mt-2 sm:text-sm">
                      Snake draft order reverses each round.
                    </p>
                  </div>
                  <span className="w-fit rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-300 sm:px-4">
                    Snake Draft
                  </span>
                </div>

                <div className="mt-4 sm:mt-5">
                  <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-white/10 bg-[#030712]">
                    <div className="grid min-w-[680px] grid-cols-5 border-b border-emerald-300/20 bg-gradient-to-r from-sky-500/20 via-teal-500/20 to-emerald-500/20 sm:min-w-[760px]">
                      {draftBoardTeams.map((team) => (
                        <div key={team} className="border-r border-emerald-300/10 px-3 py-4 text-center last:border-r-0 sm:px-4 sm:py-5">
                          <p className="truncate text-lg font-black sm:text-2xl">{team}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid min-w-[680px] grid-cols-5 sm:min-w-[760px]">
                      {draftBoardCells.map((cell) => (
                        <div
                          key={`${cell.pick}-${cell.name}`}
                          className={`min-h-36 border-r border-t p-3 last:border-r-0 sm:min-h-44 sm:p-4 ${cell.color}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-black text-slate-300 sm:text-xs">{cell.status}</p>
                            <span className="rounded-full bg-blue-500/45 px-2 py-1 text-[11px] font-black text-blue-50 sm:px-3 sm:text-xs">
                              {cell.pick}
                            </span>
                          </div>
                          <p className="mt-4 whitespace-pre-line text-base font-black leading-tight text-white sm:text-xl">
                            {cell.name}
                          </p>
                          <div className="mt-3 flex min-w-0 items-center gap-1.5 sm:mt-4 sm:gap-2">
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black sm:px-3 sm:text-xs ${cell.badge}`}>
                              {cell.slot}
                            </span>
                            <span className="truncate text-xs font-black text-slate-400 sm:text-sm">
                              {cell.school}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-white/10 bg-[#1F2937] p-3 shadow-xl shadow-black/30 sm:rounded-3xl sm:p-5">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                  Step 4
                </p>
                <h2 className="mt-1 text-xl font-black sm:mt-2 sm:text-2xl">Live Scoring Tracking</h2>
                <p className="mt-1 text-xs font-bold text-slate-400 sm:mt-2 sm:text-sm">
                  Position players update across passing, rushing, and receiving as games move.
                </p>

                <div className="mt-4 overflow-x-auto overflow-y-hidden rounded-2xl border border-white/10 bg-[#030712] sm:mt-5">
                  <div className="bg-[#111827] px-3 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 sm:px-4 sm:py-3">
                    Position Players
                  </div>
                  <div className="grid min-w-[520px] grid-cols-[138px_48px_repeat(8,40px)] border-b border-white/10 bg-[#111827] text-center text-[10px] font-black uppercase tracking-wide text-slate-500 sm:min-w-[580px] sm:grid-cols-[164px_56px_repeat(8,45px)] sm:text-xs">
                    <div className="row-span-2 flex items-center px-3 text-left sm:px-4">Player</div>
                    <div className="row-span-2 flex items-center justify-center text-emerald-300">Pts</div>
                    <div className="col-span-3 border-l border-white/10 py-1.5 sm:py-2">Passing</div>
                    <div className="col-span-2 border-l border-white/10 py-1.5 sm:py-2">Rushing</div>
                    <div className="col-span-3 border-l border-white/10 py-1.5 sm:py-2">Receiving</div>
                    {["Yds", "TD", "Int", "Yds", "TD", "Rec", "Yds", "TD"].map((label, index) => (
                      <div key={`${label}-${index}`} className="border-l border-white/10 py-1.5 sm:py-2">
                        {label}
                      </div>
                    ))}
                  </div>
                  {livePreviewRows.map((player) => (
                    <div
                      key={player.name}
                      className="grid min-w-[520px] grid-cols-[138px_48px_repeat(8,40px)] items-center border-b border-white/5 text-center text-[11px] font-black text-slate-300 last:border-b-0 sm:min-w-[580px] sm:grid-cols-[164px_56px_repeat(8,45px)] sm:text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2 px-3 py-3 text-left sm:gap-3 sm:px-4 sm:py-4">
                        <span className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-xs font-black sm:px-3 sm:py-2 sm:text-sm ${player.color}`}>
                          {player.slot}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-white sm:text-sm">{player.name}</p>
                          <p className="truncate text-xs font-bold text-slate-500">
                            {player.school} • {player.game}
                          </p>
                        </div>
                      </div>
                      <div className="text-emerald-300">{player.points}</div>
                      {[...player.passing, ...player.rushing, ...player.receiving].map((value, index) => (
                        <div key={`${player.name}-${index}`} className="border-l border-white/5 py-3 sm:py-4">
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
