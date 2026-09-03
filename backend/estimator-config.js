import pg from "pg";

const { Pool } = pg;

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    })
  : null;

export const RANK_TIERS = [
  { name: "1-10000", min: 1, max: 10000 },
  { name: "10001-50000", min: 10001, max: 50000 },
  { name: "50001-100000", min: 50001, max: 100000 },
  { name: "100001-250000", min: 100001, max: 250000 },
  { name: "250001-500000", min: 250001, max: 500000 },
  { name: "500001-1000000", min: 500001, max: 1000000 }
];

export const UNLIMITED = true;
