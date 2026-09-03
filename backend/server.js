import http from "node:http";
import { estimateRankImpact } from "./rank-impact.js";

const PORT = Number(process.env.PORT || 3002);

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });

  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;

    if (body.length > 100_000) {
      throw new Error("Request body too large");
    }
  }

  return body ? JSON.parse(body) : {};
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendJSON(res, 204, {});
  }

  if (req.method === "GET" && req.url === "/") {
    return sendJSON(res, 200, {
      status: "ok",
      service: "fpl-rank-estimator-reference"
    });
  }

  if (req.method === "POST" && req.url === "/api/rank-estimator") {
    try {
      const body = await readBody(req);

      const result = await estimateRankImpact({
        fplId: Number(body.fplId),
        relativeSwing: Number(body.relativeSwing),
        gameweek: Number(body.gameweek),
        tierName: body.tierName
      });

      return sendJSON(res, 200, {
        success: true,
        rankImpact: result
      });
    } catch (error) {
      console.error("RANK ESTIMATOR ERROR:", error);

      return sendJSON(res, 400, {
        success: false,
        error: error.message
      });
    }
  }

  return sendJSON(res, 404, {
    success: false,
    error: "Not found"
  });
});

server.listen(PORT, () => {
  console.log(`FPL Rank Estimator reference API listening on port ${PORT}`);
});
