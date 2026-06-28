const ORGANIZER_POOL_IDS_KEY = "draft-with-friends-organizer-pool-ids";

export type OrganizerPoolMeta = {
  archived?: boolean;
  draftLocked?: boolean;
};

function getMetaKey(poolId: string) {
  return `draft-with-friends-organizer-meta-${poolId}`;
}

export function getOrganizerPoolIds() {
  const savedIds = localStorage.getItem(ORGANIZER_POOL_IDS_KEY);
  const indexedIds = savedIds ? (JSON.parse(savedIds) as string[]) : [];
  const discoveredIds: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);

    if (!key?.startsWith("draft-with-friends-pool-")) continue;

    discoveredIds.push(key.replace("draft-with-friends-pool-", ""));
  }

  return Array.from(new Set([...indexedIds, ...discoveredIds]));
}

export function rememberOrganizerPool(poolId: string) {
  const poolIds = getOrganizerPoolIds();

  if (poolIds.includes(poolId)) return;

  localStorage.setItem(
    ORGANIZER_POOL_IDS_KEY,
    JSON.stringify([...poolIds, poolId])
  );
}

export function getOrganizerPoolMeta(poolId: string): OrganizerPoolMeta {
  const savedMeta = localStorage.getItem(getMetaKey(poolId));

  if (!savedMeta) return {};

  return JSON.parse(savedMeta);
}

export function saveOrganizerPoolMeta(
  poolId: string,
  meta: OrganizerPoolMeta
) {
  const currentMeta = getOrganizerPoolMeta(poolId);

  localStorage.setItem(
    getMetaKey(poolId),
    JSON.stringify({ ...currentMeta, ...meta })
  );
}
