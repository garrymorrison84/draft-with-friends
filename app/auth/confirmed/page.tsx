"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import { supabase } from "../../lib/supabase";

function safeRedirect(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/organizer";
}

export default function EmailConfirmedPage() {
  const [destination, setDestination] = useState("/organizer");
  const [hasSession, setHasSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkConfirmation() {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const nextDestination = safeRedirect(search.get("redirect"));
      const authError =
        search.get("error_description") ||
        hash.get("error_description") ||
        search.get("error") ||
        hash.get("error");

      if (!active) return;
      setDestination(nextDestination);

      if (authError) {
        setErrorMessage(authError.replace(/\+/g, " "));
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (active) setHasSession(Boolean(data.session));
    }

    void checkConfirmation();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setHasSession(Boolean(session));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const continueHref = useMemo(() => {
    if (hasSession) return destination;
    const params = new URLSearchParams({ confirmed: "1" });
    if (destination !== "/organizer") params.set("redirect", destination);
    return `/organizer/sign-in?${params.toString()}`;
  }, [destination, hasSession]);

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <section className="my-auto mx-auto w-full max-w-2xl rounded-[2rem] border border-emerald-400/25 bg-[#111827] p-7 shadow-2xl shadow-black/50 sm:p-12">
          {errorMessage ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-300/30 bg-red-400/10 text-3xl font-black text-red-200">
                !
              </div>
              <p className="mt-8 text-sm font-extrabold uppercase tracking-[0.18em] text-red-300">
                Confirmation link issue
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                We couldn&apos;t confirm this link
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                {errorMessage}. Try signing in—if your email was already confirmed,
                your account is ready.
              </p>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-3xl font-black text-emerald-300">
                ✓
              </div>
              <p className="mt-8 text-sm font-extrabold uppercase tracking-[0.18em] text-emerald-400">
                Email confirmed
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Success! Your Draft With Friends account is live.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                You&apos;re verified and ready to join your friends, claim your team,
                and start drafting.
              </p>
            </>
          )}

          <div className="mt-9 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Link
              href={continueHref}
              className="rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950 transition hover:bg-emerald-300"
            >
              {hasSession ? "Start Drafting" : "Sign In & Start Drafting"}
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-[#1F2937] px-6 py-4 text-center font-black text-slate-200 transition hover:border-emerald-400/30 hover:text-white"
            >
              Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
