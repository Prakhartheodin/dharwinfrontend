import { redirect } from "next/navigation";

/** Legacy demo team page; canonical teams UI is under /project-management/teams */
export default function LegacyPagesTeamRedirect() {
  redirect("/project-management/teams");
}
