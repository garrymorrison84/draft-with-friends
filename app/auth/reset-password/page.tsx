"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  clearRememberedAuthRedirect,
  DEFAULT_AUTH_REDIRECT,
  readRememberedAuthRedirect,
  safeAuthRedirect,
} from "../../lib/authRedirect";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [destination, setDestination] = useState(DEFAULT_AUTH_REDIRECT);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const redirect = safeAuthRedirect(
      search.get("redirect") || readRememberedAuthRedirect()
    );
    queueMicrotask(() => {
      if (active) setDestination(redirect);
    });

    const authError =
      search.get("error_description") ||
      hash.get("error_description") ||
      search.get("error") ||
      hash.get("error");

    if (authError) {
      queueMicrotask(() => {
        if (!active) return;
        setErrorMessage(authError.replace(/\+/g, " "));
        setIsChecking(false);
      });
      return () => {
        active = false;
      };
    }

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setErrorMessage(error.message);
      }
      setHasRecoverySession(Boolean(data.session));
      setIsChecking(false);
    }

    void checkRecoverySession();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setHasRecoverySession(Boolean(session));
          setIsChecking(false);
          setErrorMessage("");
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function saveNewPassword() {
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      clearRememberedAuthRedirect();
      setIsComplete(true);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not update your password. Request a new link and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const destinationLabel = destination.includes("/pool?")
    ? "Continue to Pool"
    : "View My Pools";

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" aria-label="Draft With Friends home" className="mx-auto">
          <BrandMark size="md" />
        </Link>

        <section className="my-auto w-full rounded-[2rem] border border-emerald-400/25 bg-[#111827] p-6 shadow-2xl shadow-black/50 sm:p-10">
          {isComplete ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-2xl font-black text-emerald-300">
                ✓
              </div>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400 sm:text-sm">
                Password updated
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                You&apos;re back in the game
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Your new password is ready. Continue to your pools and start
                drafting.
              </p>
              <Link
                href={destination}
                className="mt-8 block rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950 transition hover:bg-emerald-300"
              >
                {destinationLabel}
              </Link>
            </div>
          ) : isChecking ? (
            <div className="py-12 text-center">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-emerald-400">
                Securing your account
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">
                Checking your reset link...
              </h1>
            </div>
          ) : !hasRecoverySession ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-300/30 bg-red-400/10 text-2xl font-black text-red-200">
                !
              </div>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-red-300 sm:text-sm">
                Reset link issue
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                This link is invalid or expired
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                {errorMessage ||
                  "Password reset links can only be used once. Request a new link and try again."}
              </p>
              <Link
                href={`/organizer/sign-in?forgot=1&redirect=${encodeURIComponent(destination)}`}
                className="mt-8 block rounded-xl bg-emerald-400 px-6 py-4 text-center font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Request a New Link
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400 sm:text-sm">
                Account recovery
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Create a new password
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Choose a password with at least 6 characters, then confirm it
                below.
              </p>

              <div className="mt-8 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    New Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none focus:border-emerald-300/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none focus:border-emerald-300/50"
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold text-red-200">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={saveNewPassword}
                  disabled={
                    isSubmitting ||
                    password.length < 6 ||
                    confirmPassword.length < 6
                  }
                  className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save New Password"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
