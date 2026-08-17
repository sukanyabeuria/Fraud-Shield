/**
 * ============================================================================
 *  FRAUD-SHIELD — Database connectivity smoke test
 * ============================================================================
 *  Proves the schema is installed and reachable BEFORE any backend exists.
 *
 *      npm install pg dotenv
 *      cp database/.env.example .env      # then edit credentials
 *      node database/client/healthcheck.js
 *
 *  Exits with code 0 on success, 1 on failure (CI friendly).
 * ============================================================================
 */

import { healthCheck, query, closePool } from "./db.js";
import {
  getDashboardSummary,
  searchTransactions,
  getFraudResult,
  getRiskAnalysis,
} from "./queries.js";

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const info = (m) => console.log(`    \x1b[90m${m}\x1b[0m`);

async function main() {
  console.log("\n════════════════════════════════════════════════");
  console.log(" FRAUD-SHIELD :: database health check");
  console.log("════════════════════════════════════════════════\n");

  // 1. connection ------------------------------------------------------------
  const health = await healthCheck();
  ok("connection established");
  info(`database=${health.db}  role=${health.role}`);
  info(health.version.split(",")[0]);

  // 2. schema objects --------------------------------------------------------
  const { rows: tables } = await query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'fraudshield' AND table_type = 'BASE TABLE'
      ORDER BY table_name`
  );
  ok(`${tables.length} tables found`);
  info(tables.map((t) => t.table_name).join(", "));

  const { rows: views } = await query(
    `SELECT table_name FROM information_schema.views WHERE table_schema = 'fraudshield'`
  );
  ok(`${views.length} views found`);

  // 3. KPI summary -----------------------------------------------------------
  const summary = await getDashboardSummary();
  ok("v_dashboard_summary readable");
  info(
    `total=${summary.total_transactions}  safe=${summary.safe_transactions}  ` +
      `suspicious=${summary.suspicious_transactions}  fraud=${summary.fraud_detected}  ` +
      `fraud%=${summary.fraud_percentage}  avgRisk=${summary.avg_risk_score}`
  );

  // 4. search / filter / pagination -----------------------------------------
  const page = await searchTransactions({ riskLevel: "CRITICAL", pageSize: 5 });
  ok(`fn_search_transactions works (${page.total} CRITICAL transactions)`);
  page.data.slice(0, 3).forEach((t) =>
    info(`${t.reference}  ₹${t.amount}  score=${t.risk_score}  ${t.status}`)
  );

  // 5. full fraud-result payload (ML + XAI shape) ---------------------------
  const first = page.data[0] ?? (await searchTransactions({ pageSize: 1 })).data[0];
  if (first) {
    const result = await getFraudResult(first.reference);
    ok(`fn_get_fraud_result('${first.reference}') returns the FraudResult payload`);
    info(
      `verdict=${result.verdict}  riskScore=${result.riskScore}  ` +
        `riskLevel=${result.riskLevel}  reasons=${result.reasons.length}  ` +
        `warnings=${result.warnings.length}`
    );
    if (result.reasons[0]) info(`top reason: "${result.reasons[0].text}"`);
  }

  // 6. analytics -------------------------------------------------------------
  const risk = await getRiskAnalysis(5);
  ok(`fn_get_risk_analysis works (${(risk.highestRisk ?? []).length} highest-risk rows)`);

  // 7. integrity assertions --------------------------------------------------
  const { rows: bad } = await query(
    `SELECT count(*)::int AS violations
       FROM fraud_predictions p
      WHERE (p.prediction = 'FRAUD' AND p.risk_level NOT IN ('HIGH','CRITICAL'))
         OR NOT EXISTS (SELECT 1 FROM risk_indicators r WHERE r.prediction_id = p.id)
         OR NOT EXISTS (SELECT 1 FROM explanations   e WHERE e.prediction_id = p.id)`
  );
  if (bad[0].violations > 0) throw new Error(`${bad[0].violations} inconsistent predictions`);
  ok("data integrity verified — every prediction has indicators + an explanation");

  console.log("\n\x1b[32mAll checks passed.\x1b[0m\n");
}

main()
  .catch((err) => {
    console.error("\n\x1b[31m✗ health check failed:\x1b[0m", err.message);
    process.exitCode = 1;
  })
  .finally(closePool);
