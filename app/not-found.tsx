import Link from "next/link";
import BrandMark from "./components/BrandMark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center bg-[#030712] px-6 py-12 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
          <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
            404
          </p>
          <h1 className="mt-4 text-4xl font-black">This page is off the board.</h1>
          <p className="mt-4 text-base font-semibold leading-7 text-slate-400">
            The page you are looking for may have moved, expired, or never made the draft list.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/"
              className="flex min-h-14 items-center justify-center rounded-2xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950 hover:bg-emerald-300"
            >
              Go Home
            </Link>
            <Link
              href="/football"
              className="flex min-h-14 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-6 py-4 text-center font-black text-emerald-300 hover:bg-emerald-400/15"
            >
              College Football
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
