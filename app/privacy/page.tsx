import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "../components/BrandMark";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Draft With Friends, including how pool data and site usage information may be handled.",
  alternates: {
    canonical: "/privacy",
  },
};

const sections = [
  {
    title: "Information We Collect",
    body: [
      "Information you enter when creating or managing a pool, such as pool names, team names, draft settings, scoring settings, picks, and related leaderboard information.",
      "Basic technical information provided by your browser or hosting infrastructure, such as device type, pages visited, timestamps, IP address, and error logs.",
      "If analytics are enabled, aggregated usage information that helps us understand traffic, performance, and product usage.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "To create, save, display, and manage sports pools, drafts, scoring settings, and leaderboards.",
      "To maintain, secure, debug, and improve Draft With Friends.",
      "To understand which features are useful and where the product experience can be improved.",
    ],
  },
  {
    title: "Sharing Information",
    body: [
      "We do not sell personal information.",
      "Pool information may be visible to people with access to the relevant pool or draft link.",
      "We may use service providers for hosting, databases, analytics, logging, and related operations. These providers process information on our behalf.",
    ],
  },
  {
    title: "Cookies and Local Storage",
    body: [
      "Draft With Friends may use browser storage to keep draft, pool, or session information available in your browser.",
      "Analytics or hosting providers may use cookies or similar technologies if those services are enabled.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "Pool and draft information may be retained while needed to operate the product, troubleshoot issues, or improve the service.",
      "If you need information removed, contact the site operator with enough detail to identify the relevant pool or record.",
    ],
  },
  {
    title: "Children",
    body: [
      "Draft With Friends is not intended for children under 13. Do not use the service if you are under 13.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this Privacy Policy from time to time. The effective date below indicates when it was last updated.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about this policy or requests related to pool data can be sent to support@draftwithfriends.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#030712] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="md" />
        </Link>

        <div className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
          <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
            Effective July 13, 2026
          </p>
          <h1 className="mt-4 text-4xl font-black">Privacy Policy</h1>
          <p className="mt-4 text-base font-semibold leading-7 text-slate-300">
            This policy explains how Draft With Friends handles information when people create,
            join, and manage private sports pools.
          </p>

          <div className="mt-8 grid gap-6">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-black">{section.title}</h2>
                <div className="mt-3 grid gap-3 text-sm font-semibold leading-7 text-slate-400">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>
                      {paragraph.includes("support@draftwithfriends.com") ? (
                        <>
                          Questions about this policy or requests related to pool data can be sent to{" "}
                          <a
                            href="mailto:support@draftwithfriends.com"
                            className="text-emerald-300 hover:text-emerald-200"
                          >
                            support@draftwithfriends.com
                          </a>
                          .
                        </>
                      ) : (
                        paragraph
                      )}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
