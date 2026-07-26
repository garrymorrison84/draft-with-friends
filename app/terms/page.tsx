import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "../components/BrandMark";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for using Draft With Friends sports pool and snake draft tools.",
  alternates: {
    canonical: "/terms",
  },
};

const sections = [
  {
    title: "Use of the Service",
    body: [
      "Draft With Friends provides tools for creating private sports pools, running drafts, configuring scoring, and viewing leaderboards.",
      "You are responsible for the information you enter and for sharing pool links only with people you want to access that pool.",
    ],
  },
  {
    title: "No Gambling or Wagering",
    body: [
      "Draft With Friends is a pool management and entertainment tool. The service is not intended to facilitate gambling, wagering, or illegal contests.",
      "You are responsible for complying with all laws and rules that apply to your pool, group, location, and use of the service.",
    ],
  },
  {
    title: "Sports Data and Accuracy",
    body: [
      "Scores, player information, projections, and standings may rely on third-party data sources, manual inputs, calculations, or cached information.",
      "We work to provide a useful experience, but we do not guarantee that all data will be complete, uninterrupted, or error-free.",
    ],
  },
  {
    title: "Acceptable Use",
    body: [
      "Do not use Draft With Friends to break the law, infringe rights, harass others, attack the service, or interfere with other users.",
      "Do not attempt to access systems, pools, or data that you are not authorized to access.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "Draft With Friends, including its design, branding, software, and content, is owned by its operator or licensors.",
      "All sports names, team names, school names, league names, player names, tournament names, event names, logos, trademarks, and other identifying marks are the property of their respective owners.",
      "Any references to sports, athletes, teams, schools, leagues, tours, tournaments, or events are used only for identification, informational, and compatibility purposes.",
    ],
  },
  {
    title: "No League, Tour, School, or Event Affiliation",
    body: [
      "Draft With Friends is an independent sports pool and draft management tool.",
      "Draft With Friends is not affiliated with, endorsed by, sponsored by, approved by, or officially connected with the NCAA, PGA TOUR, The R&A, PGA of America, NFL, MLB, NBA, NHL, any conference, school, team, tournament, event operator, league, tour, or governing body.",
      "All references to sports, athletes, teams, schools, tournaments, tours, leagues, or events are for identification, informational, scheduling, scoring, and compatibility purposes only.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "The service is provided as is and as available, without warranties of any kind to the fullest extent permitted by law.",
      "We are not responsible for losses, disputes, scoring disagreements, data errors, downtime, or decisions made based on information displayed in the service.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update these Terms from time to time. Continued use of Draft With Friends after updates means you accept the revised Terms.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about these Terms can be sent to support@draftwithfriends.com.",
    ],
  },
];

export default function TermsPage() {
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
          <h1 className="mt-4 text-4xl font-black">Terms of Service</h1>
          <p className="mt-4 text-base font-semibold leading-7 text-slate-300">
            These Terms govern access to and use of Draft With Friends, including private sports
            pools, drafts, scoring settings, and leaderboards.
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
                          Questions about these Terms can be sent to{" "}
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
