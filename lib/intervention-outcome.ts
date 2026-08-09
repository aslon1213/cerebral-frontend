import { api } from "./api/server";
import { EXECUTION_STATUS_LABEL } from "./vocabulary";

/**
 * What actually happened to the run, read back rather than assumed.
 *
 * Resolving an intervention usually unblocks its run — but several can be open
 * at once, and the run stays parked until the last is dealt with. Saying "back
 * to running" without checking would be wrong exactly when it matters most, so
 * this re-reads the execution and counts what is still open on it.
 *
 * It lives here, not in the Server Action, because the message is rendered on
 * the *next* request: the action redirects and this is what the page calls to
 * turn `?resolved=…&verb=…` back into a sentence. A card cannot report its own
 * success — a Server Action re-renders the route, and by then the resolved item
 * is no longer pending and its card is gone.
 */
export async function describeResolution(
  executionId: string,
  verb: string,
): Promise<string | null> {
  const past = VERBS[verb];
  if (!past) return null;

  try {
    const [execution, stillOpen] = await Promise.all([
      api.executions.get(executionId),
      api.executions.interventions(executionId, { status: "pending", limit: 1 }),
    ]);

    if (stillOpen.total > 0) {
      const count = stillOpen.total;
      return `${past}. That run is still blocked — ${count} more ${
        count === 1 ? "intervention is" : "interventions are"
      } waiting on you.`;
    }

    return `${past}. The run is now ${EXECUTION_STATUS_LABEL[execution.status].toLowerCase()}.`;
  } catch {
    // The resolution itself succeeded; failing to describe its aftermath is not
    // worth turning into an error over the top of it.
    return `${past}.`;
  }
}

const VERBS: Record<string, string> = {
  approve: "Approved",
  reject: "Rejected",
  answer: "Answer sent",
};
