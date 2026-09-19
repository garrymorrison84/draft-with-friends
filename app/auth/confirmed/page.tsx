"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  clearRememberedAuthRedirect,
  DEFAULT_AUTH_REDIRECT,
  parseAuthRedirect,
  readRememberedAuthRedirect,
  USER_REDIRECT_METADATA_KEY,
} from "../../lib/authRedirect";
import { supabase } from "../../lib/supabase";

export default function EmailConfirmedPage() {
  const [destination, setDestination] = useState(DEFAULT_AUTH_REDIRECT);
  const [hasSession, setHasSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const redirectFromUrl = parseAuthRedirect(search.get("redirect"));
    const redirectFromBrowser = readRememberedAuthRedirect();

    function resolveDestination(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
      const redirectFromAccount = parseAuthRedirect(
        session?.user.user_metadata?.[USER_REDIRECT_METADATA_KEY]
      );
      return (
        redirectFromUrl ||
        redirectFromAccount ||
        redirectFromBrowser ||
        DEFAULT_AUTH_REDIRECT
      );
    }

    async function checkConfirmation() {
      const authError =
        search.get("error_description") ||
        hash.get("error_description") ||
        search.get("error") ||
        hash.get("error");

      if (!active) return;

      if (authError) {
        setErrorMessage(authError.replace(/\+/g, " "));
        setIsChecking(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (active) {
        setDestination(resolveDestination(data.session));
        setHasSession(Boolean(data.session));
        setIsChecking(false);
      }
    }

    void checkConfirmation();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setDestination(resolveDestination(session));
        setHasSession(Boolean(session));
        setIsChecking(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const continueHref = useMemo(() => {
    if (hasSession) return destination;
    const params = new URLSearchParams({ confirmed: "1" });
    if (destination !== DEFAULT_AUTH_REDIRECT) params.set("redirect", destination);
    return `/organizer/sign-in?${params.toString()}`;
  }, [destination, hasSession]);

  const isPoolLobby =
    destination.startsWith("/football/pool?") || destination.startsWith("/pool?");
  const continueLabel = isChecking
    ? "Preparing Your Pool..."
    : isPoolLobby
      ? "Continue to Pool Lobby"
      : destination === DEFAULT_AUTH_REDIRECT
        ? hasSession
          ? "View My Pools"
          : "Sign In"
        : hasSession
          ? "Continue"
          : "Sign In & Continue";

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" aria-label="Draft With Friends home" className="mx-auto">
          <BrandMark size="md" />
        </Link>

        <section className="my-auto w-full rounded-[2rem] border border-emerald-400/25 bg-[#111827] p-6 text-center shadow-2xl shadow-black/50 sm:p-10">
          {errorMessage ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-300/30 bg-red-400/10 text-2xl font-black text-red-200">
                !
              </div>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-red-300 sm:text-sm">
                Confirmation link issue
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                We couldn&apos;t confirm this link
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                {errorMessage}. Try signing in—if your email was already confirmed,
                your account is ready.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-2xl font-black text-emerald-300">
                ✓
              </div>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400 sm:text-sm">
                Email confirmed
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Your account is live!
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                {isPoolLobby
                  ? "Your invitation is ready. Continue to the pool lobby, choose your team, and join the draft."
                  : "You're verified and ready to build pools, join your friends, and start drafting."}
              </p>
            </>
          )}

          <div className="mx-auto mt-8 max-w-md">
            <Link
              href={continueHref}
              aria-disabled={isChecking}
              onClick={(event) => {
                if (isChecking) {
                  event.preventDefault();
                  return;
                }
                clearRememberedAuthRedirect();
              }}
              className={`block rounded-xl px-6 py-4 text-center font-black transition ${
                isChecking
                  ? "cursor-wait bg-emerald-400/50 text-slate-700"
                  : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              }`}
            >
              {continueLabel}
            </Link>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-bold text-slate-400 transition hover:text-emerald-300"
            >
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
