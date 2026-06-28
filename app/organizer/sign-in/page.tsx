"use client";

import Link from "next/link";
import { useState } from "react";
import BrandMark from "../../components/BrandMark";
import { supabase } from "../../lib/supabase";

export default function OrganizerSignInPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function getRedirectTo() {
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect") || "/organizer";
  }

  async function submitAuth() {
    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response =
        mode === "sign-up"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

      if (response.error) throw response.error;

      if (mode === "sign-up" && !response.data.session) {
        setMessage("Account created. Check your email to confirm your account, then sign in.");
        setMode("sign-in");
      } else {
        window.location.href = getRedirectTo();
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

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="md" />
          </Link>

          <Link href="/" className="text-sm font-medium text-emerald-300">
            Back Home
          </Link>
        </div>

        <section className="my-auto grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase text-emerald-400">
              Organizer Portal
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              Secure commissioner access.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Sign in to create pools, manage active drafts, review archived
              drafts, and make commissioner overrides when your group needs a
              clean fix.
            </p>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
            <div className="grid grid-cols-2 rounded-2xl border border-white/5 bg-[#1F2937] p-1">
              <button
                type="button"
                onClick={() => setMode("sign-in")}
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
                onClick={() => setMode("sign-up")}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  mode === "sign-up"
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
                />
              </div>

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
                onClick={submitAuth}
                disabled={isSubmitting || !email || password.length < 6}
                className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Working..."
                  : mode === "sign-up"
                  ? "Create Organizer Account"
                  : "Sign In"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
