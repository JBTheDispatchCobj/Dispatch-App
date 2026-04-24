import { run } from "../lib/orchestration/run";

void (async () => {
  try {
    const result = await run();
    if (result.killed) {
      console.log("[orchestrator] Halted by kill switch. No DB operations performed.");
      process.exit(0);
    }
    console.log(
      `[orchestrator] Done. events_processed=${result.events_processed} drafts_inserted=${result.drafts_inserted} tasks_inserted=${result.tasks_inserted}`,
    );
    process.exit(0);
  } catch (err) {
    console.error("[orchestrator] Fatal error:", err);
    process.exit(1);
  }
})();
