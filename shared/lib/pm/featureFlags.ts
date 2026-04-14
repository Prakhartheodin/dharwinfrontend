/**
 * PM assistant UI (task breakdown, assignment entry points, post-create prompt).
 * Default: **on** so flows work when the server has `OPENAI_API_KEY` / PM routes.
 * Set `NEXT_PUBLIC_PM_ASSISTANT_ENABLED=false` to hide all PM assistant affordances.
 */
export function isPmAssistantUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PM_ASSISTANT_ENABLED !== "false";
}

/**
 * Backend enables PM assistant when `PM_ASSISTANT_ENABLED=true` **or** `OPENAI_API_KEY` is set
 * (see `ensurePmAssistantEnabled` in `pmAssistant.service.js`). Use `PM_ASSISTANT_ENABLED=false` to force off.
 * Logs: `promptHash` / `modelId` on assignment runs; gap rows notify the creator.
 * Permissions (API): task breakdown preview `projects.read`, apply `projects.manage`+`tasks.manage`;
 * assignment run create `projects.read`+`candidates.read`, approve `projects.manage`, apply `projects.manage`+`tasks.manage`.
 */
export const PM_ASSISTANT_ROLLOUT_NOTES = "openai_key_or_PM_ASSISTANT_ENABLED_true_opt_out_false" as const;
