import React from "react";
import "./rank-estimator.css";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

export default function RankEstimator({ rankImpact }) {
  if (!rankImpact) return null;

  const movement = Number(rankImpact.estimatedRankMovement);
  const pointSwing = Number(rankImpact.pointSwing);
  const direction =
    rankImpact.direction === "up"
      ? "Moving upward"
      : rankImpact.direction === "down"
        ? "Moving downward"
        : "No tier crossing";

  return (
    <section className="rank-estimator-section">
      <div className="rank-estimator-heading">
        <div>
          <div className="rank-estimator-eyebrow">RANK ESTIMATOR</div>
          <h2>Estimated rank impact</h2>
        </div>

        <div className="rank-estimator-swing">
          <strong className={movement >= 0 ? "positive" : "negative"}>
            {movement >= 0 ? "+" : ""}
            {formatNumber(Math.abs(movement))}
          </strong>
          <span>rank places</span>
        </div>
      </div>

      <div className="rank-estimator-grid">
        <div className="rank-estimator-card">
          <span>Current rank</span>
          <strong>{formatNumber(rankImpact.currentRank)}</strong>
          <small>your rank at the snapshot</small>
        </div>

        <div className="rank-estimator-card">
          <span>Estimated rank</span>
          <strong>{formatNumber(rankImpact.estimatedRank)}</strong>
          <small>projected rank after the swing</small>
        </div>

        <div className="rank-estimator-card">
          <span>Point swing</span>
          <strong className={pointSwing >= 0 ? "positive" : "negative"}>
            {pointSwing >= 0 ? "+" : ""}
            {pointSwing.toFixed(2)}
          </strong>
          <small>relative expected points</small>
        </div>
      </div>

      {(rankImpact.boundaryLowerLimit != null ||
        Number(rankImpact.boundaryDistance) > 0) && (
        <div className="rank-boundary-card">
          <div className="rank-mini-heading">
            <h3>Nearest observed rank boundary</h3>
            <span>{direction}</span>
          </div>

          <div className="boundary-grid">
            <div>
              <span>Boundary</span>
              <strong>
                {rankImpact.boundaryLowerLimit != null
                  ? formatNumber(rankImpact.boundaryLowerLimit)
                  : "—"}
              </strong>
            </div>

            <div>
              <span>Distance</span>
              <strong>
                {formatNumber(rankImpact.boundaryDistance)}
              </strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
