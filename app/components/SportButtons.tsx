"use client";

import { useEffect, useState } from "react";
import { getCurrentCollegeFootballWeek } from "../football/lib/collegeWeek";
import { getCurrentNflWeek } from "../nfl/lib/nflWeek";

const SHOW_GOLF_POOL_ON_HOME = false;

async function loadReplayWeek(endpoint: string) {
  const response = await fetch(endpoint, { cache: "no-store" });
  const data = await response.json();
  const week = Number(data?.replay?.week);
  return response.ok && week > 0 ? Math.min(18, week) : null;
}

export default function SportButtons({ className = "" }: { className?: string }) {
  const [collegeWeek, setCollegeWeek] = useState(() =>
    getCurrentCollegeFootballWeek()
  );
  const [nflWeek, setNflWeek] = useState(() => getCurrentNflWeek());

  useEffect(() => {
    let active = true;

    async function loadCurrentWeeks() {
      const [collegeResult, nflResult] = await Promise.allSettled([
        loadReplayWeek("/api/football/replay"),
        loadReplayWeek("/api/nfl/replay"),
      ]);

      if (!active) return;
      if (collegeResult.status === "fulfilled" && collegeResult.value) {
        setCollegeWeek((current) => Math.max(current, collegeResult.value || current));
      }
      if (nflResult.status === "fulfilled" && nflResult.value) {
        setNflWeek((current) => Math.max(current, nflResult.value || current));
      }
    }

    void loadCurrentWeeks();
    return () => {
      active = false;
    };
  }, []);

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
          Create Week {collegeWeek} College Fantasy Football Pool
        </a>
        <a
          href="/nfl"
          className="flex min-h-[4.6rem] items-center justify-center rounded-2xl bg-emerald-400 px-5 py-4 text-center text-base font-black leading-5 text-slate-950 shadow-lg shadow-emerald-400/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-[0_18px_38px_rgba(52,211,153,0.3)]"
        >
          Create Week {nflWeek} NFL Fantasy Football Pool
        </a>
        {SHOW_GOLF_POOL_ON_HOME ? (
          <a
            href="/create-pool"
            className="flex min-h-[4.6rem] items-center justify-center rounded-2xl bg-emerald-400 px-5 py-4 text-center text-base font-black leading-5 text-slate-950 shadow-lg shadow-emerald-400/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-[0_18px_38px_rgba(52,211,153,0.3)]"
          >
            Create PGA Event Pool
          </a>
        ) : null}
      </div>
    </div>
  );
}
