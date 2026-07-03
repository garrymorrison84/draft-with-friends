import Link from "next/link";
import BrandMark from "../components/BrandMark";

const featureCards = [
  ["Create Pool", "Set teams, roster spots, and draft order.", "/football/create"],
  ["Scoring Setup", "Passing, rushing, receiving, defense, and kicker rules.", "/football/scoring"],
  ["Snake Draft", "Draft players by position with the same board feel as golf.", "/football/draft"],
  ["Live Leaderboard", "Track team scores and player detail once the draft is complete.", "/football/leaderboard"],
];

export default function FootballHomePage() {
  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>

          <Link href="/" className="text-sm font-medium text-emerald-300">
            Back Home
          </Link>
        </div>

        <section className="mt-12 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40 md:p-10">
          <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
            College Football
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Build your college football draft pool.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Same Draft With Friends look and feel, now shaped around seasons,
            weekly scoring, roster settings, and a snake draft for college football.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/football/create"
              className="rounded-2xl bg-emerald-400 px-8 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300"
            >
              Create Football Pool
            </Link>
            <Link
              href="/create-pool"
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-8 py-4 text-center text-lg font-black text-emerald-300 hover:bg-emerald-400/15"
            >
              Create Golf Pool
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {featureCards.map(([title, body, href]) => (
            <Link
              key={title}
              href={href}
              className="rounded-3xl border border-white/5 bg-[#111827] p-7 shadow-xl shadow-black/40 hover:border-emerald-400/30 hover:bg-[#162033]"
            >
              <h2 className="text-2xl font-black">{title}</h2>
              <p className="mt-3 leading-7 text-slate-400">{body}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
