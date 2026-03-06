import { redirect } from "next/navigation";

/**
 * Redirect /roles/ to the actual settings roles page.
 * The app only has routes under /settings/roles/.
 */
export default function RolesRedirectPage() {
  redirect("/settings/roles/");
}
