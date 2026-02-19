import PublicMeetingRoomClient from "./public-meeting-room-client";

/** Required for static export. Placeholder so the route is built; actual roomId is used at runtime. */
export async function generateStaticParams() {
  return [{ roomId: "_" }];
}

export default async function PublicJoinRoomPage() {
  return <PublicMeetingRoomClient />;
}
