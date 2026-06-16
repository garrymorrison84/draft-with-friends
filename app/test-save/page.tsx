import { savePool, getPool } from "../lib/poolApi";

export default async function TestSavePage() {
  const testPool = {
    id: "TEST123",
    pool_name: "Test Supabase Pool",
    golf_event: "U.S. Open",
    number_of_teams: 4,
    golfers_per_team: 8,
    scores_to_count: 4,
    team_names: ["Team 1", "Team 2", "Team 3", "Team 4"],
    draft_order: ["Team 1", "Team 2", "Team 3", "Team 4"],
  };

  let result;
  let savedPool;

  try {
    result = await savePool(testPool);
    savedPool = await getPool("TEST123");
  } catch (error) {
    result = error;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-10 text-white">
      <h1 className="text-4xl font-black">Test Save Pool</h1>

      <pre className="mt-6 rounded-xl bg-slate-900 p-4 text-emerald-300">
        {JSON.stringify({ result, savedPool }, null, 2)}
      </pre>
    </main>
  );
}
