"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AccountMenu() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  }

  if (!authReady || (!user && pathname === "/organizer/sign-in")) return null;

  return (
    <div ref={menuRef} className="absolute right-3 top-3 z-[100] sm:right-6 sm:top-6">
      {user ? (
        <div className="relative">
          <button
            type="button"
            aria-label="Open account menu"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((current) => !current)}
            className="flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-[#111827]/95 p-1.5 pr-2.5 text-sm font-black text-white shadow-xl shadow-black/40 backdrop-blur transition hover:border-emerald-300/70 hover:bg-[#182235]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-sm text-slate-950">
              {(user.email?.[0] || "A").toUpperCase()}
            </span>
            <span aria-hidden="true" className="text-xs text-emerald-300">▼</span>
          </button>

          {open && (
            <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#111827] p-1.5 shadow-2xl shadow-black/60">
              <Link
                role="menuitem"
                href="/organizer"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-300 hover:text-slate-950"
              >
                My Pools
              </Link>
              <button
                role="menuitem"
                type="button"
                onClick={signOut}
                className="block w-full rounded-lg px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/organizer/sign-in"
          onClick={(event) => {
            event.preventDefault();
            const redirect = `${window.location.pathname}${window.location.search}`;
            window.location.href = `/organizer/sign-in?redirect=${encodeURIComponent(redirect)}`;
          }}
          className="inline-flex rounded-xl border border-emerald-300/35 bg-[#111827]/95 px-4 py-2.5 text-sm font-black text-emerald-300 shadow-xl shadow-black/40 backdrop-blur transition hover:border-emerald-300 hover:bg-emerald-300 hover:text-slate-950"
        >
          Sign In
        </Link>
      )}
    </div>
  );
}
