import type { ReactNode } from "react";
import BrandMark from "./components/BrandMark";

const draftTeams = ["Garry", "Kelli", "Andrew"];

const draftPicks = [
  ["1.1", "Dante Moore", "QB", "ORE", "Drafted"],
  ["1.2", "Jeremiah Smith", "WR", "OSU", "Drafted"],
  ["1.3", "CJ Baxter", "RB", "TEX", "Drafted"],
  ["2.3", "Ryan Williams", "WR", "ALA", "Drafted"],
  ["2.2", "LaNorris Sellers", "QB", "SC", "Drafted"],
  ["2.1", "On the clock", "FLEX", "", "On the clock"],
];

const eligiblePlayers = [
  ["WR", "Carnell Tate", "OSU · vs Notre Dame", "21.8"],
  ["RB", "Justice Haynes", "MICH · at Wisconsin", "19.6"],
  ["TE", "Eli Stowers", "VAN · vs Kentucky", "16.2"],
];

const footballLeaderboardTeams = [
  ["1", "Garry", "128.6"],
  ["2", "Kelli", "117.2"],
  ["3", "Andrew", "109.8"],
];

const liveFootballRows = [
  ["QB", "Dante Moore", "ORE · Q3 21–17 vs USC", "28.4"],
  ["WR", "Carnell Tate", "OSU · Final 31–24", "24.7"],
  ["DST", "Oregon D/ST", "ORE · Q3 21–17", "16.0"],
];

const draftPreviewPositionStyles: Record<string, { cell: string; badge: string }> = {
  QB: {
    cell: "border-purple-500/55 bg-purple-950/70",
    badge: "border-purple-200 bg-purple-500/45 text-purple-50",
  },
  RB: {
    cell: "border-sky-500/45 bg-[#0b3b55]/95",
    badge: "border-sky-200 bg-sky-500/45 text-sky-50",
  },
  WR: {
    cell: "border-yellow-500/55 bg-yellow-950/55",
    badge: "border-yellow-200 bg-yellow-500/45 text-yellow-50",
  },
  TE: {
    cell: "border-red-500/55 bg-red-950/60",
    badge: "border-red-200 bg-red-500/45 text-red-50",
  },
  FLEX: {
    cell: "border-sky-500/45 bg-[#0b3b55]/95",
    badge: "border-sky-200 bg-sky-500/45 text-sky-50",
  },
  DST: {
    cell: "border-emerald-500/45 bg-emerald-950/65",
    badge: "border-emerald-200 bg-emerald-500/40 text-emerald-50",
  },
};

function PhoneFrame({
  children,
  className = "",
  screenClassName = "",
}: {
  children: ReactNode;
  className?: string;
  screenClassName?: string;
}) {
  return (
    <div
      className={`relative w-[318px] rounded-[3.65rem] bg-gradient-to-br from-slate-300 via-slate-700 to-slate-950 p-[5px] shadow-[0_38px_90px_rgba(0,0,0,0.72),0_0_0_1px_rgba(203,213,225,0.36)] ${className}`}
    >
      <div className="absolute -left-[4px] top-24 h-7 w-[3px] rounded-l-full bg-slate-500" />
      <div className="absolute -left-[4px] top-36 h-12 w-[3px] rounded-l-full bg-slate-500" />
      <div className="absolute -left-[4px] top-[13.25rem] h-12 w-[3px] rounded-l-full bg-slate-500" />
      <div className="absolute -right-[4px] top-40 h-20 w-[3px] rounded-r-full bg-slate-600" />

      <div className="rounded-[3.35rem] bg-[#070b11] p-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
        <div className="relative overflow-hidden rounded-[3.16rem] bg-[#050a13]">
          <div className="absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-6 text-[9px] font-black text-white">
            <span>9:41</span>
            <div className="absolute left-1/2 top-2 h-[24px] w-[82px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
              <span className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#101927] ring-1 ring-slate-700" />
            </div>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="flex h-2.5 items-end gap-[1px]">
                {[3, 5, 7, 9].map((height) => (
                  <span key={height} className="w-[2px] rounded-sm bg-white" style={{ height }} />
                ))}
              </span>
              <span className="h-2 w-3 rounded-t-full border-2 border-b-0 border-white" />
              <span className="relative h-2.5 w-5 rounded-[3px] border border-white/80">
                <span className="absolute inset-[2px] rounded-[1px] bg-white" />
                <span className="absolute -right-1 top-[2px] h-1 w-0.5 rounded-r bg-white/70" />
              </span>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(125deg,rgba(255,255,255,0.075),transparent_28%,transparent_76%,rgba(255,255,255,0.025))]" />
          <div
            className={`relative z-0 min-h-[610px] px-3.5 pb-8 pt-12 ${screenClassName}`}
        >
            {children}
          </div>
          <div className="absolute bottom-2.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-white/85" />
        </div>
      </div>
    </div>
  );
}

function DraftPhonePreview({
  className = "",
  screenClassName = "",
}: {
  className?: string;
  screenClassName?: string;
}) {
  const resolvedScreenClassName = screenClassName || "!min-h-[610px]";

  return (
    <PhoneFrame className={`rotate-[-2deg] ${className}`} screenClassName={resolvedScreenClassName}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-300">
              College Football · Week 3
            </p>
            <h2 className="mt-1 text-[1.45rem] font-black leading-none text-white">
              Draft Room
            </h2>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-300">
            Live
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-300">Pick 6 of 27</p>
            <p className="mt-0.5 text-[12px] font-black text-white">Garry is on the clock</p>
          </div>
          <span className="rounded-lg bg-emerald-400 px-2.5 py-1.5 text-[12px] font-black tabular-nums text-slate-950">0:42</span>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#030712] shadow-xl shadow-black/30">
          <div className="grid grid-cols-3 bg-[#10363d]">
            {draftTeams.map((team) => (
              <div key={team} className="border-r border-emerald-300/10 px-1.5 py-2 text-center last:border-r-0">
                <p className="truncate text-[9px] font-black text-white">{team}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3">
            {draftPicks.map(([pick, player, position, school, status]) => {
              const styles = draftPreviewPositionStyles[position] ?? draftPreviewPositionStyles.RB;

              return (
                <div
                  key={pick}
                  className={`relative min-h-[76px] overflow-hidden border-b border-r px-2 pb-2 pt-2 ${
                    status === "On the clock"
                      ? "border-emerald-400/45 bg-emerald-400/10"
                      : styles.cell
                  }`}
                >
                  <div className="flex items-start justify-end pr-0.5">
                    <span className="shrink-0 rounded-full bg-blue-600/80 px-1.5 py-0.5 text-[6px] font-black leading-none text-white">
                      {pick}
                    </span>
                  </div>
                  <p className={`mt-1 line-clamp-2 text-[8px] font-black leading-tight ${status === "On the clock" ? "text-emerald-300" : "text-white"}`}>
                    {player}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span
                      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[6px] font-black leading-none ${styles.badge}`}
                    >
                      {position}
                    </span>
                    <span className="min-w-0 truncate text-[6px] font-bold text-slate-400">
                      {school || "Awaiting pick"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <h3 className="text-[12px] font-black text-white">Eligible Players</h3>
          <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Sorted by PPG</span>
        </div>
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0c1421]">
          {eligiblePlayers.map(([position, name, game, ppg]) => {
            const styles = draftPreviewPositionStyles[position] ?? draftPreviewPositionStyles.RB;
            return (
              <div key={name} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 border-b border-white/5 px-2.5 py-2.5 last:border-b-0">
                <span className={`rounded-full border px-2 py-1 text-[7px] font-black ${styles.badge}`}>{position}</span>
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-black text-white">{name}</p>
                  <p className="truncate text-[6.5px] font-bold text-slate-500">{game}</p>
                </div>
                <span className="text-[9px] font-black text-emerald-300">{ppg}</span>
                <span className="rounded-lg bg-emerald-400 px-2 py-1.5 text-[7px] font-black text-slate-950">Draft</span>
              </div>
            );
          })}
        </div>
      </div>
    </PhoneFrame>
  );
}

function LeaderboardPhonePreview({
  className = "",
  screenClassName = "",
}: {
  className?: string;
  screenClassName?: string;
}) {
  return (
    <PhoneFrame
      className={`mt-8 rotate-[2deg] lg:mt-16 lg:-ml-9 ${className}`}
      screenClassName={screenClassName}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-300">
              College Football · Week 3
            </p>
            <h2 className="mt-1 text-[1.45rem] font-black leading-none text-white">
              Live Leaderboard
            </h2>
          </div>
          <span className="mt-0.5 flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
            Live
          </span>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0c1421] p-2.5">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Pool Standings</span>
            <span className="text-[7px] font-bold text-slate-500">Updated now</span>
          </div>
          <div className="space-y-1.5">
            {footballLeaderboardTeams.map(([rank, team, total]) => (
              <div
                key={team}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                  rank === "1"
                    ? "border-emerald-400/30 bg-emerald-400/10 shadow-[0_8px_20px_rgba(16,185,129,0.08)]"
                    : "border-white/5 bg-[#182334]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="w-3 text-[9px] font-black text-slate-500">
                    {rank}
                  </span>
                  <span className="truncate text-[11px] font-black text-white">
                    {team}
                  </span>
                </div>
                <span className="text-[12px] font-black tabular-nums text-emerald-300">
                  {total}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#030712] shadow-xl shadow-black/30">
          <div className="flex items-center justify-between bg-[#172235] px-3 py-2.5">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-emerald-300">Garry&apos;s Roster</p>
              <p className="mt-0.5 text-[7px] font-bold text-slate-500">128.6 fantasy points</p>
            </div>
            <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[7px] font-black text-emerald-300">1st</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] bg-[#111a28] px-3 py-2 text-[7px] font-black uppercase tracking-widest text-slate-500">
            <span>Player / Game</span>
            <span>Pts</span>
          </div>
          {liveFootballRows.map(([position, name, game, total]) => {
            const styles = draftPreviewPositionStyles[position] ?? draftPreviewPositionStyles.RB;
            return (
              <div
                key={name}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-white/5 px-3 py-3"
              >
                <span className={`rounded-full border px-2 py-1 text-[7px] font-black ${styles.badge}`}>{position}</span>
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-black text-white">{name}</p>
                  <p className="truncate text-[6.5px] font-bold text-slate-500">{game}</p>
                </div>
                <span className="text-[11px] font-black tabular-nums text-emerald-300">{total}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0c1421] px-3 py-3">
          <div>
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-500">Next Up</p>
            <p className="mt-1 text-[9px] font-black text-white">Michigan at Wisconsin</p>
          </div>
          <span className="text-[9px] font-black text-slate-300">7:30 PM</span>
        </div>
      </div>
    </PhoneFrame>
  );
}

function ProductPreview() {
  return (
    <div className="relative isolate mx-auto flex w-full max-w-[740px] flex-col items-center justify-center sm:flex-row sm:items-start">
      <div className="pointer-events-none absolute inset-x-[-18%] top-[0%] z-0 h-[96%] rounded-[52%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.34)_0%,rgba(16,185,129,0.20)_34%,rgba(16,185,129,0.08)_58%,transparent_78%)] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-[58%] z-0 h-[34rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/18 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-[10%] bottom-[-6%] z-0 h-40 rounded-full bg-emerald-300/12 blur-2xl" />
      <div className="relative z-10">
        <DraftPhonePreview />
      </div>
      <div className="relative z-10">
        <LeaderboardPhonePreview />
      </div>
    </div>
  );
}

function MobileExperienceShowcase() {
  return (
    <div className="relative isolate my-7 h-[380px] overflow-hidden rounded-[2rem] border border-emerald-400/18 bg-[#040b12] shadow-[0_0_54px_rgba(16,185,129,0.12)] lg:hidden">
      <div className="absolute inset-[-18%] z-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.36)_0%,rgba(16,185,129,0.20)_38%,rgba(16,185,129,0.08)_60%,transparent_80%)] blur-3xl" />
      <div className="absolute left-1/2 top-1/2 z-0 h-[32rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/16 blur-3xl" />
      <div className="absolute inset-x-[12%] bottom-[-10%] z-0 h-36 rounded-full bg-emerald-300/12 blur-2xl" />
      <div className="absolute left-[8%] top-5 z-10 origin-top-left scale-[0.52] min-[375px]:left-[9%]">
        <DraftPhonePreview />
      </div>
      <div className="absolute left-[42%] top-11 z-10 origin-top-left scale-[0.52] min-[375px]:left-[43%]">
        <LeaderboardPhonePreview className="!mt-0" />
      </div>
    </div>
  );
}

function SportButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`relative z-10 ${className}`}>
      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        Pick Your Sport
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="/football"
          className="flex min-h-[4.6rem] items-center justify-center rounded-2xl bg-emerald-400 px-5 py-4 text-center text-base font-black leading-5 text-slate-950 shadow-lg shadow-emerald-400/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-[0_18px_38px_rgba(52,211,153,0.3)]"
        >
          Create College Fantasy Football Pool
        </a>
        <a
          href="/create-pool"
          className="flex min-h-[4.6rem] items-center justify-center rounded-2xl bg-emerald-400 px-5 py-4 text-center text-base font-black leading-5 text-slate-950 shadow-lg shadow-emerald-400/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-[0_18px_38px_rgba(52,211,153,0.3)]"
        >
          Create PGA Event Pool
        </a>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030712] text-white">
      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-5 py-8 sm:px-6 sm:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        <div className="relative z-10">
          <div className="mb-6 max-w-[280px] sm:max-w-[340px] lg:mb-8 lg:max-w-none">
            <BrandMark size="lg" />
          </div>

          <div className="lg:hidden">
            <h1 className="whitespace-nowrap text-[2.55rem] font-black leading-[1.04] tracking-tight min-[375px]:text-[2.85rem]">
              Your Pool
              <br />
              Your Friends
              <br />
              Your Rules
            </h1>

            <SportButtons className="mt-7" />

            <p className="mt-7 max-w-[340px] text-xl font-black leading-8 text-emerald-300">
              No spreadsheets. No manual tracking. Just snake drafts with friends.
            </p>

            <MobileExperienceShowcase />
          </div>

          <div className="relative mb-7 hidden lg:mb-0 lg:block">
            <h1 className="relative z-10 whitespace-nowrap text-5xl font-black leading-[1.04] tracking-tight xl:text-[4.2rem]">
              Your Pool
              <br />
              Your Friends
              <br />
              Your Rules
            </h1>

            <SportButtons className="mt-8 max-w-xl" />

            <p className="relative z-10 mt-8 max-w-xl text-xl font-black leading-8 text-emerald-300">
              Weekend long contests. No waiver wires. No bye weeks. No text threads
              for drafting. No excel spreadsheets for tracking.
            </p>
          </div>

          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8 md:mt-6 md:text-xl md:leading-9">
            Build your pool. Invite your friends. Snake draft teams. Track in realtime.
          </p>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-300 sm:text-base md:text-lg lg:mt-10 lg:gap-6">
            <span>✓ Snake Drafts</span>
            <span>✓ Custom Scoring</span>
            <span>✓ Live Leaderboard</span>
          </div>
        </div>

        <div className="relative z-10 hidden justify-center lg:flex lg:justify-end">
          <ProductPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">Built For Friend Groups</h3>
            <p className="mt-3 leading-7 text-slate-400">
              No more messy spreadsheets, screenshots, or group text chaos.
              Create the pool and let everyone follow along.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">Make Every Game Matter</h3>
            <p className="mt-3 leading-7 text-slate-400">
              Draft a team for the weekend and instantly care about every drive,
              touchdown, and leaderboard move your group is watching together.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">Fantasy Without The Grind</h3>
            <p className="mt-3 leading-7 text-slate-400">
              Get the fun of drafting, scoring, and bragging rights without a
              season-long roster, waiver wire, or months of maintenance.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
