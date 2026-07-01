export type PoolData = {
  id: string;
  poolName: string;
  golfEvent: string;
  eventId?: string;
  numberOfTeams: number;
  golfersPerTeam: number;
  scoresToCount: number;
  teamNames: string[];
  draftOrder: string[];
};

export type DraftPick = {
  team: string;
  golfer: {
    name: string;
    rank: number;
  };
  pickIndex: number;
};

const CURRENT_POOL_KEY = "draft-with-friends-current-pool";
const ORGANIZER_POOL_IDS_KEY = "draft-with-friends-organizer-pool-ids";

function getPoolKey(poolId: string) {
  return `draft-with-friends-pool-${poolId}`;
}

function getPicksKey(poolId: string) {
  return `draft-with-friends-picks-${poolId}`;
}

export function createPoolId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function savePool(pool: PoolData) {
  localStorage.setItem(getPoolKey(pool.id), JSON.stringify(pool));
  localStorage.setItem(CURRENT_POOL_KEY, pool.id);
  const savedPoolIds = localStorage.getItem(ORGANIZER_POOL_IDS_KEY);
  const poolIds = savedPoolIds ? (JSON.parse(savedPoolIds) as string[]) : [];

  if (!poolIds.includes(pool.id)) {
    localStorage.setItem(
      ORGANIZER_POOL_IDS_KEY,
      JSON.stringify([...poolIds, pool.id])
    );
  }

  localStorage.removeItem(getPicksKey(pool.id));
}

export function updatePool(pool: PoolData) {
  localStorage.setItem(getPoolKey(pool.id), JSON.stringify(pool));
  localStorage.setItem(CURRENT_POOL_KEY, pool.id);
  const savedPoolIds = localStorage.getItem(ORGANIZER_POOL_IDS_KEY);
  const poolIds = savedPoolIds ? (JSON.parse(savedPoolIds) as string[]) : [];

  if (!poolIds.includes(pool.id)) {
    localStorage.setItem(
      ORGANIZER_POOL_IDS_KEY,
      JSON.stringify([...poolIds, pool.id])
    );
  }
}

export function loadPool(poolId?: string): PoolData | null {
  const id = poolId || localStorage.getItem(CURRENT_POOL_KEY);

  if (!id) return null;

  const savedPool = localStorage.getItem(getPoolKey(id));

  if (!savedPool) return null;

  return JSON.parse(savedPool);
}

export function saveDraftPicks(
  poolId: string,
  picks: (DraftPick | null)[]
) {
  localStorage.setItem(getPicksKey(poolId), JSON.stringify(picks));
}

export function loadDraftPicks(poolId: string): (DraftPick | null)[] | null {
  const savedPicks = localStorage.getItem(getPicksKey(poolId));

  if (!savedPicks) return null;

  return JSON.parse(savedPicks);
}

export function clearPool(poolId: string) {
  localStorage.removeItem(getPoolKey(poolId));
  localStorage.removeItem(getPicksKey(poolId));
}
