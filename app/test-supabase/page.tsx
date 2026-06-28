import { supabase } from "../lib/supabase";

export default async function TestSupabasePage() {
  const { data, error } = await supabase.from("pools").select("*").limit(5);

  return (
    <main className="min-h-screen bg-[#030712] p-10 text-white">
      <h1 className="text-4xl font-black">Supabase Test</h1>

      {error ? (
        <pre className="mt-6 rounded-xl bg-red-950 p-4 text-red-200">
          {JSON.stringify(error, null, 2)}
        </pre>
      ) : (
        <pre className="mt-6 rounded-xl bg-[#111827] p-4 text-emerald-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
