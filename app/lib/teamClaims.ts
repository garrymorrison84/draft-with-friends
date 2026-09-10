import { supabase } from "./supabase";

export function getParticipantId() {
  const key = "dwf-participant-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export async function loadTeamClaims(poolId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const response = await fetch(`/api/team-claims?poolId=${encodeURIComponent(poolId)}`, {
    cache: "no-store",
    headers: sessionData.session?.access_token
      ? { Authorization: `Bearer ${sessionData.session.access_token}` }
      : undefined,
  });
  const data = await response.json().catch(() => null);
  return (data?.claims || {}) as Record<string, string>;
}

export async function claimTeam(poolId: string, teamName: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sign in before choosing your team.");
  const response = await fetch("/api/team-claims", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      poolId,
      teamName,
      legacyParticipantId: getParticipantId(),
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Could not claim this team.");
  return data.claims as Record<string, string>;
}
