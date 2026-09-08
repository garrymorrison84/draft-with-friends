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
  const response = await fetch(`/api/team-claims?poolId=${encodeURIComponent(poolId)}`, { cache: "no-store" });
  const data = await response.json().catch(() => null);
  return (data?.claims || {}) as Record<string, string>;
}

export async function claimTeam(poolId: string, teamName: string) {
  const participantId = getParticipantId();
  const response = await fetch("/api/team-claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ poolId, teamName, participantId }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Could not claim this team.");
  return data.claims as Record<string, string>;
}
