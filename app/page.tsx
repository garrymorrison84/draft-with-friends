import type { ReactNode } from "react";
import BrandMark from "./components/BrandMark";

const draftPicks = [
  ["1.1", "Andrew", "Scottie Scheffler", "Drafted"],
  ["1.2", "Mark", "Xander Schauffele", "Drafted"],
  ["1.3", "Garry", "Tommy Fleetwood", "Drafted"],
  ["1.4", "Steve", "Awaiting pick", "On the clock"],
];

const leaderboardRows = [
  ["1", "Andrew", "-43"],
  ["2", "Mark", "-39"],
  ["3", "Garry", "-36"],
  ["4", "Steve", "-31"],
];

const liveGolfRows = [
  ["Scottie Scheffler", "-6", "-10", "-3", "-19"],
  ["Sam Burns", "-4", "-4", "-4", "-12"],
  ["Justin Rose", "-5", "-4", "-3", "-12"],
  ["Tommy Fleetwood", "-2", "-5", "-3", "-10"],
];

function PhoneFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative w-[268px] rounded-[2.55rem] border border-slate-500/40 bg-gradient-to-br from-slate-500 via-slate-900 to-black p-2.5 shadow-2xl shadow-emerald-950/50 ${className}`}
    >
      <div className="absolute -left-1.5 top-24 h-12 w-1 rounded-l-full bg-slate-700" />
      <div className="absolute -right-1.5 top-32 h-16 w-1 rounded-r-full bg-slate-700" />

      <div className="relative overflow-hidden rounded-[2rem] border border-slate-700/80 bg-[#050914]">
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-4 text-[10px] font-black text-white">
          <span>9:41</span>
          <div className="h-5 w-20 rounded-full bg-black" />
          <span className="rounded-md border border-slate-500 px-1.5 py-0.5 text-[9px]">
            97
          </span>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_30%,transparent_72%,rgba(255,255,255,0.04))]" />
        <div className="relative z-0 min-h-[560px] px-4 pb-5 pt-14">
          {children}
        </div>
      </div>
    </div>
  );
}

function DraftPhonePreview() {
  return (
    <PhoneFrame className="rotate-[-3deg]">
      <div className="rounded-2xl border border-slate-700/70 bg-[#111827] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              Snake Draft
            </p>
            <h2 className="mt-1 text-[1.7rem] font-black leading-none text-white">
              Draft Board
            </h2>
          </div>

          <span className="rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-black text-slate-950">
            Live
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-emerald-400/20 bg-[#030712]">
          <div className="grid grid-cols-2 bg-gradient-to-r from-emerald-900 to-teal-700">
            {["Andrew", "Mark"].map((team) => (
              <div
                key={team}
                className="border-r border-white/10 px-3 py-3 text-center last:border-r-0"
              >
                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-100/70">
                  Team
                </p>
                <p className="text-sm font-black text-white">{team}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2">
            {draftPicks.map(([pick, team, golfer, status]) => (
              <div
                key={pick}
                className={`min-h-[118px] border-b border-r border-white/10 p-3 even:border-r-0 ${
                  status === "On the clock"
                    ? "bg-emerald-400/15"
                    : "bg-[#13233a]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-black text-slate-300">
                    {status}
                  </p>
                  <span className="rounded-full bg-blue-700/80 px-2 py-1 text-[9px] font-black text-white">
                    {pick}
                  </span>
                </div>
                <p className="mt-4 text-sm font-black leading-tight text-white">
                  {golfer}
                </p>
                <p className="mt-2 text-[10px] font-bold text-slate-400">
                  {team}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function LeaderboardPhonePreview() {
  return (
    <PhoneFrame className="mt-10 rotate-[4deg] lg:mt-24 lg:-ml-10">
      <div className="rounded-2xl border border-slate-700/70 bg-[#111827] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              Live Golf Tracking
            </p>
            <h2 className="mt-1 text-[1.65rem] font-black leading-none text-white">
              Leaderboard
            </h2>
          </div>

          <span className="text-2xl font-black text-emerald-300">-43</span>
        </div>

        <div className="mt-4 space-y-2">
          {leaderboardRows.map(([rank, team, total]) => (
            <div
              key={team}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[#1F2937] px-3 py-2.5"
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

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/70 bg-[#030712]">
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

        <div className="mt-4 rounded-xl bg-emerald-400/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
            Auto refresh
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-300">
            Scores update as the tournament unfolds.
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function ProductPreview() {
  return (
    <div>
      <div className="relative mx-auto flex w-full max-w-[620px] flex-col items-center justify-center sm:flex-row sm:items-start">
        <div className="absolute inset-10 -z-10 rounded-full bg-emerald-500/10 blur-3xl" />
        <DraftPhonePreview />
        <LeaderboardPhonePreview />
      </div>

      <div className="mx-auto mt-5 max-w-[520px] rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
        <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
          Mobile-first pool control
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Draft from one phone. Track live scores from another. No clipped
          names, no spreadsheet chaos, no zooming just to see who is winning.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030712] text-white">
      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative z-10">
          <div className="mb-8">
            <BrandMark size="lg" />
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Your Friends.
            <br />
            Your Pool.
            <br />
            Your Rules.
          </h1>

          <p className="mt-5 text-lg font-semibold text-emerald-300">
            Golf is live. College football is next.
          </p>

          <p className="mt-6 max-w-3xl text-xl leading-9 text-slate-300">
            Snake drafts are the best part of a pool. Draft With Friends is the
            easiest end-to-end drafting and tracking experience for sports
            pools. Create a contest, invite your friends, draft your players,
            and follow the leaderboard in real time.
          </p>

          <div className="mt-10">
            <p className="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">
              Pick Your Sport
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href="/create-pool"
                className="flex min-h-20 items-center justify-center rounded-2xl bg-emerald-400 px-8 py-5 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 md:text-xl"
              >
                Create PGA Pool
              </a>

              <a
                href="/football"
                className="flex min-h-20 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-8 py-5 text-center text-lg font-black text-emerald-300 transition hover:bg-emerald-400/15 md:text-xl"
              >
                Create College Football Pool
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-base font-semibold text-slate-300 md:text-lg">
            <span>✓ Snake Drafts</span>
            <span>✓ Custom Scoring</span>
            <span>✓ Live Leaderboard</span>
          </div>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end">
          <ProductPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">Customize Your Pool</h3>
            <p className="mt-3 leading-7 text-slate-400">
              Build the exact format your group wants. Choose how many golfers
              to draft, how many scores count, and let the competition begin.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">Built For Friend Groups</h3>
            <p className="mt-3 leading-7 text-slate-400">
              No more messy spreadsheets, screenshots, or group text chaos.
              Create the pool and let everyone follow along.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40">
            <h3 className="text-xl font-bold">
              Built To Become A Platform
            </h3>
            <p className="mt-3 leading-7 text-slate-400">
              College football now sits beside golf with the same dark theme,
              green accent, draft-first flow, and live leaderboard direction.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
