"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  clearRememberedAuthRedirect,
  rememberAuthRedirect,
  safeAuthRedirect,
  USER_REDIRECT_METADATA_KEY,
} from "../../lib/authRedirect";
import { supabase } from "../../lib/supabase";

export default function OrganizerSignInPage() {
  const [mode, setMode] = useState<
    "sign-in" | "sign-up" | "forgot-password"
  >("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function getRedirectTo() {
    const params = new URLSearchParams(window.location.search);
    return safeAuthRedirect(params.get("redirect"));
  }

  function getEmailConfirmationUrl() {
    const confirmationUrl = new URL(
      "/auth/confirmed",
      "https://www.draftwithfriends.com"
    );
    const redirect = getRedirectTo();
    if (redirect !== "/organizer") {
      confirmationUrl.searchParams.set("redirect", redirect);
    }
    return confirmationUrl.toString();
  }

  function getPasswordResetUrl() {
    const resetUrl = new URL(
      "/auth/reset-password",
      "https://www.draftwithfriends.com"
    );
    const redirect = getRedirectTo();
    if (redirect !== "/organizer") {
      resetUrl.searchParams.set("redirect", redirect);
    }
    return resetUrl.toString();
  }

  function selectMode(nextMode: "sign-in" | "sign-up") {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setErrorMessage("");
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("forgot") === "1") {
      queueMicrotask(() => {
        if (active) setMode("forgot-password");
      });
    }
    rememberAuthRedirect(getRedirectTo());
    if (params.get("confirmed") === "1") {
      queueMicrotask(() => {
        if (active) {
          setMessage("Email confirmed! Sign in to start drafting.");
        }
      });
    }
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        const destination = getRedirectTo();
        clearRememberedAuthRedirect();
        window.location.replace(destination);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const destination = getRedirectTo();
        clearRememberedAuthRedirect();
        window.location.replace(destination);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submitAuth() {
    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (mode === "sign-up" && password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      const redirectTo = getRedirectTo();
      rememberAuthRedirect(redirectTo);
      const response =
        mode === "sign-up"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: getEmailConfirmationUrl(),
                data: { [USER_REDIRECT_METADATA_KEY]: redirectTo },
              },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (response.error) throw response.error;

      if (mode === "sign-up" && !response.data.session) {
        setMessage("Account created. Check your email to confirm your account, then sign in.");
        setMode("sign-in");
      } else {
        clearRememberedAuthRedirect();
        window.location.href = redirectTo;
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not complete sign in. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPasswordReset() {
    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const redirectTo = getRedirectTo();
      rememberAuthRedirect(redirectTo);
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: getPasswordResetUrl() }
      );
      if (error) throw error;

      setMessage(
        "If an account exists for this email, a secure password reset link is on the way."
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not send the reset email. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
        </div>

        <section className="my-auto grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase text-emerald-400">
              Your Draft With Friends Account
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Every pool. One account.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Organizers can create and manage pools. Members can claim their
              team, draft from any device, and revisit every pool they have joined.
            </p>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
            <div className="grid grid-cols-2 rounded-2xl border border-white/5 bg-[#1F2937] p-1">
              <button
                type="button"
                onClick={() => selectMode("sign-in")}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  mode === "sign-in"
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => selectMode("sign-up")}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  mode === "sign-up"
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {mode === "forgot-password" && (
              <div className="mt-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">
                  Password help
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Reset your password
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Enter the email connected to your account and we&apos;ll send
                  you a secure reset link.
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
                />
              </div>

              {mode !== "forgot-password" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Password
                  </label>
                  <input
                    type="password"
                    autoComplete={
                      mode === "sign-up" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
                  />
                </div>
              )}

              {mode === "sign-up" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
                  />
                </div>
              )}

              {mode === "sign-in" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot-password");
                    setPassword("");
                    setMessage("");
                    setErrorMessage("");
                  }}
                  className="justify-self-end text-sm font-bold text-emerald-300 transition hover:text-emerald-200"
                >
                  Forgot password?
                </button>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-300">
                  {message}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold text-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={
                  mode === "forgot-password"
                    ? submitPasswordReset
                    : submitAuth
                }
                disabled={
                  isSubmitting ||
                  !email ||
                  (mode !== "forgot-password" && password.length < 6) ||
                  (mode === "sign-up" && confirmPassword.length < 6)
                }
                className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Working..."
                  : mode === "forgot-password"
                  ? "Send Reset Link"
                  : mode === "sign-up"
                  ? "Create Account"
                  : "Sign In"}
              </button>

              {mode === "forgot-password" && (
                <button
                  type="button"
                  onClick={() => selectMode("sign-in")}
                  className="rounded-xl border border-white/10 px-5 py-3 font-black text-slate-300 transition hover:border-emerald-300/40 hover:text-emerald-300"
                >
                  Back to Sign In
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
