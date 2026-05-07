/**
 * Post-deploy smoke test. Hit a small list of canonical dynamic-route
 * shapes and the home page. Any 5xx fails the script with exit 1 so a
 * CI / deploy-hook gate can block promotion.
 *
 * Usage:
 *   DEPLOY_URL=https://uat.dharwin.com node scripts/post-deploy-smoke.js
 *
 * Exit code:
 *   0 — every route returned <500
 *   1 — at least one route returned 5xx OR network error
 *
 * Routes probed are deliberately minimal — the placeholder ids ("_") match
 * the `generateStaticParams` placeholders historically used by these
 * pages. They DO NOT need to exist as real records — we are validating
 * SSR runtime + chunk graph integrity, not data correctness. Auth-gated
 * routes returning 401/403 are treated as PASS (the runtime is alive).
 */

const ROUTES = [
  "/",
  "/training/attendance/student/_/",
  "/ats/jobs/edit/_/",
  "/ats/employees/",
  "/communication/chats/",
];

const DEFAULT_TIMEOUT_MS = 15_000;
const HARD_FAIL_STATUS_MIN = 500;

function pickBaseUrl() {
  const explicit = process.env.DEPLOY_URL || process.env.VERCEL_URL;
  if (explicit) {
    return /^https?:\/\//.test(explicit) ? explicit.replace(/\/$/, "") : `https://${explicit}`;
  }
  console.error("[smoke] FATAL: DEPLOY_URL (or VERCEL_URL) env var required.");
  process.exit(2);
  return ""; // unreachable
}

async function probe(base, route) {
  const url = `${base}${route}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "manual", signal: controller.signal });
    return { url, status: res.status, ok: res.status < HARD_FAIL_STATUS_MIN };
  } catch (err) {
    return { url, status: 0, ok: false, error: err && err.message ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const base = pickBaseUrl();
  console.log(`[smoke] base=${base}, ${ROUTES.length} route(s)`);

  /** @type {Array<{url:string, status:number, ok:boolean, error?:string}>} */
  const results = [];
  for (const r of ROUTES) {
    const result = await probe(base, r);
    results.push(result);
    const tag = result.ok ? "ok " : "FAIL";
    console.log(`  ${tag}  ${result.status.toString().padStart(3)}  ${result.url}${result.error ? `  (${result.error})` : ""}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n[smoke] ${failed.length} of ${results.length} route(s) returned 5xx / network failure — failing the deploy.`);
    process.exit(1);
  }
  console.log(`\n[smoke] all ${results.length} route(s) healthy.`);
}

main().catch((err) => {
  console.error(`[smoke] FATAL: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
