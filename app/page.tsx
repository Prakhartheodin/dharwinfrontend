import { redirect } from "next/navigation";

/**
 * Root entry. Server-redirect to the dashboard so no markup paints here.
 * Unauthenticated users are bounced to the real sign-in by ProtectedRoute.
 * (Previously this rendered a leftover Synto demo login that flashed on cold load.)
 */
export default function Home() {
  redirect("/dashboard");
}
