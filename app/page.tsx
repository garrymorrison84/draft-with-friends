import type { ReactNode } from "react";
import BrandMark from "./components/BrandMark";

const draftPicks = [
  ["1.1", "Andy", "Omarion Hampton", "RB", "North Carolina", "Drafted"],
  ["1.2", "Mark", "Rome Odunze", "WR", "Washington", "Drafted"],
  ["1.3", "Andrew", "Audric Estime", "RB", "Notre Dame", "Drafted"],
  ["1.4", "Steve", "Blake Corum", "RB", "Michigan", "Drafted"],
  ["2.4", "Andy", "Kyle Monangai", "RB", "Rutgers", "Drafted"],
  ["2.3", "Mark", "Jaxson Dart", "QB", "Ole Miss", "Drafted"],
  ["2.2", "Andrew", "Michael Penix Jr.", "QB", "Washington", "Drafted"],
  ["2.1", "Steve", "Brock Bowers", "TE", "Georgia", "Drafted"],
  ["3.1", "Andy", "Malik Nabers", "WR", "LSU", "Drafted"],
  ["3.2", "Mark", "Luther Burden III", "WR", "Missouri", "Drafted"],
  ["3.3", "Andrew", "Awaiting selection", "FLEX", "", "On the clock"],
  ["3.4", "Steve", "Awaiting selection", "FLEX", "", "Open"],
  ["4.4", "Andy", "Awaiting selection", "FLEX", "", "Open"],
  ["4.3", "Mark", "Awaiting selection", "FLEX", "", "Open"],
  ["4.2", "Andrew", "Awaiting selection", "FLEX", "", "Open"],
  ["4.1", "Steve", "Awaiting selection", "FLEX", "", "Open"],
];

const liveGolfRows = [
  ["Scottie Scheffler", "-6", "-10", "-3", "-19"],
  ["Sam Burns", "-4", "-4", "-4", "-12"],
  ["Justin Rose", "-5", "-4", "-3", "-12"],
  ["Tommy Fleetwood", "-2", "-5", "-3", "-10"],
];

const golfLeaderboardTeams = [
  ["1", "Andrew", "-43"],
  ["2", "Mark", "-39"],
  ["3", "Garry", "-36"],
  ["4", "Steve", "-31"],
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
      className={`relative w-[306px] rounded-[2.45rem] border border-slate-500/40 bg-gradient-to-br from-slate-500 via-slate-900 to-black p-2.5 shadow-2xl shadow-emerald-950/50 ${className}`}
    >
      <div className="absolute -left-1.5 top-24 h-12 w-1 rounded-l-full bg-slate-700" />
      <div className="absolute -right-1.5 top-32 h-16 w-1 rounded-r-full bg-slate-700" />

      <div className="relative overflow-hidden rounded-[1.9rem] border border-slate-700/80 bg-[#050a13]">
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_30%,transparent_72%,rgba(255,255,255,0.04))]" />
        <div
          className={`relative z-0 min-h-[540px] px-3.5 pb-4 pt-4 ${screenClassName}`}
        >
          {children}
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
  return (
    <PhoneFrame className={`rotate-[-2deg] ${className}`} screenClassName={screenClassName}>
      <div className="rounded-2xl border border-slate-700/70 bg-[#111827] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              College Football
            </p>
            <h2 className="mt-1 text-[1.7rem] font-black leading-none text-white">
              Draft Board
            </h2>
          </div>

          <span className="rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-black text-slate-950">
            Live
          </span>
        </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-emerald-400/20 bg-[#030712]">
            <div className="grid grid-cols-4 bg-[#0d3b45] shadow-[0_10px_18px_rgba(0,0,0,0.35)]">
              {["Andy", "Mark", "Andrew", "Steve"].map((team) => (
                <div
                  key={team}
                  className="border-r border-emerald-300/10 px-1.5 py-2 text-center last:border-r-0"
                >
                  <p className="truncate text-[10px] font-black text-white">{team}</p>
                </div>
              ))}
            </div>

          <div className="grid grid-cols-4">
            {draftPicks.map(([pick, team, player, position, school, status]) => {
              const styles = draftPreviewPositionStyles[position] ?? draftPreviewPositionStyles.RB;

              return (
                <div
                  key={pick}
                  className={`relative min-h-[92px] overflow-hidden border-b border-r px-1.5 pb-1.5 pt-2 ${
                    status === "On the clock"
                      ? "border-emerald-400/35 bg-[#07110f]"
                      : status === "Open"
                        ? "border-slate-800 bg-[#030712]"
                        : styles.cell
                  }`}
                >
                  <div className="flex items-start justify-end pr-0.5">
                    <span className="shrink-0 rounded-full bg-blue-700/80 px-1.5 py-0.5 text-[6.5px] font-black leading-none text-white">
                      {pick}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[8.5px] font-black leading-tight text-white">
                    {player}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span
                      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[6.5px] font-black leading-none ${styles.badge}`}
                    >
                      {position}
                    </span>
                    <span className="min-w-0 truncate text-[6.5px] font-bold text-slate-400">
                      {school || team}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
      className={`mt-8 rotate-[2deg] lg:mt-20 lg:-ml-8 ${className}`}
      screenClassName={screenClassName}
    >
      <div className="rounded-2xl border border-slate-700/70 bg-[#111827] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              Live Golf Pool
            </p>
            <h2 className="mt-1 text-[1.65rem] font-black leading-none text-white">
              Scoreboard
            </h2>
          </div>

          <span className="text-2xl font-black text-emerald-300">-43</span>
        </div>

        <div className="mt-4 space-y-2">
          {golfLeaderboardTeams.map(([rank, team, total]) => (
            <div
              key={team}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                rank === "1"
                  ? "border-emerald-400/25 bg-emerald-400/10"
                  : "border-white/5 bg-[#1F2937]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-sm font-black text-slate-400">
                  {rank}
                </span>
                <span className="truncate text-base font-black text-white">
                  {team}
                </span>
              </div>
              <span className="text-lg font-black text-emerald-300">
                {total}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/70 bg-[#030712]">
          <div className="bg-[#172235] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-emerald-300">
            Andrew's Golfers
          </div>
          <div className="grid grid-cols-[1.6fr_0.55fr_0.55fr_0.55fr_0.7fr] bg-[#1F2937] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
            <span>Golfer</span>
            <span>R1</span>
            <span>R2</span>
            <span>R3</span>
            <span>Total</span>
          </div>
          {liveGolfRows.map(([name, r1, r2, r3, total]) => (
            <div
              key={name}
              className="grid grid-cols-[1.6fr_0.55fr_0.55fr_0.55fr_0.7fr] border-t border-white/5 px-3 py-3 text-[10px] font-black text-slate-200"
            >
              <span className="truncate pr-2 text-white">{name}</span>
              <span>{r1}</span>
              <span>{r2}</span>
              <span>{r3}</span>
              <span className="text-emerald-300">{total}</span>
            </div>
          ))}
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

function MobileHeroPreview() {
  return (
    <div className="pointer-events-none absolute right-0 top-0 h-[430px] w-[118px] overflow-visible min-[390px]:w-[124px] sm:right-1 sm:w-[170px] lg:hidden">
      <div className="absolute -inset-12 rounded-full bg-emerald-400/28 blur-3xl" />
      <div className="absolute -inset-5 rounded-full bg-emerald-300/18 blur-2xl" />
      <div className="absolute right-0 top-0 origin-top-right scale-[0.32] min-[390px]:scale-[0.34] sm:scale-[0.42]">
        <DraftPhonePreview />
      </div>
      <div className="absolute right-0 top-[198px] origin-top-right scale-[0.32] min-[390px]:top-[210px] min-[390px]:scale-[0.34] sm:top-[258px] sm:scale-[0.42]">
        <LeaderboardPhonePreview className="!mt-0" />
      </div>
    </div>
  );
}

function MobileExperienceShowcase() {
  return (
    <div className="relative isolate my-5 h-[365px] overflow-hidden rounded-[2rem] border border-emerald-400/18 bg-[#040b12] shadow-[0_0_54px_rgba(16,185,129,0.12)] lg:hidden">
      <div className="absolute inset-[-18%] z-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.36)_0%,rgba(16,185,129,0.20)_38%,rgba(16,185,129,0.08)_60%,transparent_80%)] blur-3xl" />
      <div className="absolute left-1/2 top-1/2 z-0 h-[32rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/16 blur-3xl" />
      <div className="absolute inset-x-[12%] bottom-[-10%] z-0 h-36 rounded-full bg-emerald-300/12 blur-2xl" />
      <div className="absolute left-[8%] top-5 z-10 origin-top-left scale-[0.52] min-[375px]:left-[9%]">
        <DraftPhonePreview screenClassName="!h-[500px] !min-h-[500px] overflow-hidden" />
      </div>
      <div className="absolute left-[42%] top-11 z-10 origin-top-left scale-[0.52] min-[375px]:left-[43%]">
        <LeaderboardPhonePreview
          className="!mt-0"
          screenClassName="!h-[500px] !min-h-[500px] overflow-hidden"
        />
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
              Your Friends.
              <br />
              Your Pool.
              <br />
              Your Rules.
            </h1>

            <p className="mt-5 max-w-[340px] text-xl font-black leading-8 text-emerald-300">
              No spreadsheets. No manual tracking. Just snake drafts with friends.
            </p>

            <MobileExperienceShowcase />
          </div>

          <div className="relative mb-7 hidden min-h-[430px] min-[390px]:min-h-[450px] lg:mb-0 lg:block lg:min-h-0">
            <MobileHeroPreview />

            <h1 className="relative z-10 max-w-[calc(100%-118px)] whitespace-nowrap text-[2.05rem] font-black leading-[1.08] tracking-tight min-[375px]:text-[2.18rem] min-[390px]:max-w-[calc(100%-124px)] sm:max-w-[calc(100%-176px)] sm:text-5xl md:max-w-4xl lg:max-w-4xl">
              Your Friends.
              <br />
              Your Pool.
              <br />
              Your Rules.
            </h1>

            <p className="relative z-10 mt-6 max-w-[calc(100%-122px)] text-base font-black leading-6 text-emerald-300 min-[375px]:text-lg min-[375px]:leading-7 min-[390px]:max-w-[calc(100%-128px)] sm:max-w-[calc(100%-180px)] sm:text-2xl md:max-w-3xl">
              No spreadsheets. No manual tracking. Just snake drafts with friends.
            </p>
          </div>

          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8 md:mt-6 md:text-xl md:leading-9">
            Create your own custom pool. Share the link with your crew.
          </p>

          <div className="mt-8 lg:mt-10">
            <p className="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">
              Pick Your Sport
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <a
                href="/create-pool"
                className="flex min-h-20 items-center justify-center rounded-2xl bg-emerald-400 px-8 py-5 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 md:text-xl"
              >
                Create PGA Pool
              </a>

              <a
                href="/football"
                className="flex min-h-20 items-center justify-center rounded-2xl bg-emerald-400 px-8 py-5 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 md:text-xl"
              >
                Weekly College Fantasy Football
              </a>

              <a
                href="/football/wins/create"
                className="flex min-h-20 items-center justify-center rounded-2xl bg-emerald-400 px-8 py-5 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 md:text-xl"
              >
                College Football Wins Pool
              </a>
            </div>
          </div>

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
