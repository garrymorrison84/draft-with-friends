import Link from "next/link";
import BrandMark from "../../components/BrandMark";

export default function FootballWinsHomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-14">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-10">
          <p className="text-lg font-black text-emerald-300">
            College Football Wins Pool
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
            Draft teams. Track wins. Talk all season.
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-slate-400">
            Pick conferences, snake draft college football teams, and see which
            participant finishes with the most regular-season wins.
          </p>

          <Link
            href="/football/wins/create"
            className="mt-8 inline-flex rounded-2xl bg-emerald-400 px-8 py-5 text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300"
          >
            Create Wins Pool
          </Link>
        </section>
      </div>
    </main>
  );
}
