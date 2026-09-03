# FPL Rank Estimator Reference

Standalone reference implementation of the FPL Rank Estimator.

## Purpose

Calculates estimated rank impact from a relative point swing using completed FPL snapshot data and observed rank/points samples.

## Backend

- backend/rank-impact.js - estimator orchestration
- backend/rank-movement.js - rank movement and observed-boundary algorithm
- backend/estimator-config.js - database and rank-tier configuration
- backend/server.js - standalone API endpoint

## Frontend

- frontend/RankEstimator.jsx - standalone React component
- frontend/rank-estimator.css - component styling

## API

POST /api/rank-estimator

The reference is intentionally unlocked and unlimited. It contains no premium checks, subscription system, trial limits, authentication gateway, or Risk Calculator.

## Database

The estimator expects the existing fpl_gameweeks and fpl_sample_managers snapshot tables.
