const ENTRY_URL = "https://fantasy.premierleague.com/api/entry/";
import { pool, RANK_TIERS } from "./estimator-config.js";
import { estimateRankMovement } from "./rank-movement.js";


async function fetchJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FPL-Risk-Calculator/1.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function interpolateRank(points, samples) {
  if (samples.length < 2) return null;
  const rows = [...samples].sort((a, b) => b.points - a.points || a.rank - b.rank);
  if (points >= rows[0].points) {
    const a = rows[0], b = rows[1];
    return a.rank + ((a.points - points) * (b.rank - a.rank)) / (a.points - b.points || 1);
  }
  const last = rows.length - 1;
  if (points <= rows[last].points) {
    const a = rows[last - 1], b = rows[last];
    return a.rank + ((a.points - points) * (b.rank - a.rank)) / (a.points - b.points || 1);
  }
  for (let i = 0; i < last; i += 1) {
    const a = rows[i], b = rows[i + 1];
    if (points <= a.points && points >= b.points) {
      return a.rank + ((a.points - points) * (b.rank - a.rank)) / (a.points - b.points || 1);
    }
  }
  return null;
}

function localSlopes(points, samples) {
  const rows = [...samples]
    .sort((a, b) => Math.abs(a.points - points) - Math.abs(b.points - points))
    .slice(0, 5)
    .sort((a, b) => b.points - a.points);
  const slopes = [];
  for (let i = 0; i < rows.length - 1; i += 1) {
    const dp = rows[i].points - rows[i + 1].points;
    if (dp === 0) continue;
    const dr = rows[i + 1].rank - rows[i].rank;
    slopes.push(Math.abs(dr / dp));
  }
  return slopes.filter(Number.isFinite).filter(v => v > 0);
}

export async function estimateRankImpact({
  fplId,
  relativeSwing,
  gameweek,
  tierName
}) {
  if (!pool) throw new Error("DATABASE_URL is required");
  if (!Number.isSafeInteger(fplId) || fplId <= 0)
    throw new Error("Invalid FPL Team ID");
  if (!Number.isFinite(relativeSwing))
    throw new Error("Invalid relative swing");
  if (!Number.isSafeInteger(gameweek) || gameweek <= 0)
    throw new Error("Invalid snapshot gameweek");
  if (typeof tierName !== "string" || !tierName)
    throw new Error("Invalid snapshot tier");

  const snapshotResult = await pool.query(
    `
      SELECT gameweek, season, deadline, picks_captured_at
      FROM fpl_gameweeks
      WHERE gameweek=$1
        AND status='complete'
      LIMIT 1
    `,
    [gameweek]
  );

  const snapshot = snapshotResult.rows[0];

  if (!snapshot)
    throw new Error("Requested risk snapshot is not complete");

  const history = await fetchJSON(`${ENTRY_URL}${fplId}/history/`);

  const historyRow = (history.current || []).find(
    row => Number(row.event) === gameweek
  );

  if (!historyRow)
    throw new Error("User snapshot history unavailable");

  const currentRank = Number(historyRow.overall_rank);
  const currentPoints = Number(historyRow.total_points);

  if (!Number.isSafeInteger(currentRank) || currentRank < 1)
    throw new Error("User snapshot rank unavailable");

  if (!Number.isFinite(currentPoints))
    throw new Error("User snapshot points unavailable");

  const result = await pool.query(
    `
      SELECT
        locked_rank,
        overall_points_at_lock
      FROM fpl_sample_managers
      WHERE gameweek=$1
        AND overall_points_at_lock IS NOT NULL
        AND locked_rank IS NOT NULL
      ORDER BY locked_rank ASC
    `,
    [gameweek]
  );

  const snapshotManagers = result.rows
    .map(row => ({
      rank: Number(row.locked_rank),
      points: Number(row.overall_points_at_lock)
    }))
    .filter(
      row =>
        Number.isSafeInteger(row.rank) &&
        row.rank >= 1 &&
        Number.isFinite(row.points)
    );

  if (snapshotManagers.length < 2)
    throw new Error(
      "Snapshot contains insufficient rank/points observations"
    );

  const maxObservedRank = Math.max(
    currentRank,
    ...snapshotManagers.map(row => row.rank)
  );

  const tiers = RANK_TIERS.map(tier => ({ ...tier }));

  for (
    let min = 1000001;
    min <= maxObservedRank;
    min += 1000000
  ) {
  const max = min + 999999;

  tiers.push({
    name: String(min) + "-" + String(max),
    min,
    max
  });
}

  const movement = estimateRankMovement({
    currentRank,
    currentPoints,
    pointSwing: relativeSwing,
    rows: snapshotManagers,
    tiers
  });

  const [finalMin, finalMax] =
    movement.finalTier.split("-").map(Number);

  const rankingRows = snapshotManagers.filter(
    row =>
      row.rank >= finalMin &&
      row.rank <= finalMax
  );

  const lastCrossing =
    movement.tiersCrossed[movement.tiersCrossed.length - 1] ?? null;

  return {
    currentRank: movement.currentRank,
    currentPoints: movement.currentPoints,
    pointSwing: movement.pointSwing,
    projectedPoints: movement.projectedPoints,
    estimatedRank: movement.estimatedRank,
    estimatedRankMovement: movement.estimatedRankMovement,
    direction: movement.direction,
    rankTier: movement.rankTier,
    finalTier: movement.finalTier,
    boundaryLowerLimit:
      lastCrossing?.boundaryLowerLimit ?? null,
    boundaryDistance:
      lastCrossing?.boundaryDistance ?? 0,
    tiersCrossed: movement.tiersCrossed,
    sampleSize: rankingRows.length,
    gameweek: Number(snapshot.gameweek),
    season: snapshot.season,
    snapshot: {
      deadline: snapshot.deadline,
      picksCapturedAt: snapshot.picks_captured_at
    },
    method:
      "snapshot-observed score-to-rank interpolation with observed tier boundaries"
  };

}

