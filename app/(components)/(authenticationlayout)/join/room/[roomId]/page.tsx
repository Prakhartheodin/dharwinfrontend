// SSR dynamic route. No `generateStaticParams` — see
// training/attendance/student/[studentId]/page.tsx for rationale (placeholder
// `{ roomId: "_" }` strands SSR runtime chunks on Vercel after `output: "export"`
// was removed from next.config.js).

import PublicMeetingRoomClient from "./public-meeting-room-client";

export default async function PublicJoinRoomPage() {
  return <PublicMeetingRoomClient />;
}
