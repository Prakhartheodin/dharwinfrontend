"use client"

/**
 * Static join room page - uses ?room= for static export compatibility.
 * Dynamic /join/room/[roomId] returns 404 in production (static export only builds paths from generateStaticParams).
 */
import PublicMeetingRoomClient from "./[roomId]/public-meeting-room-client";

export default function JoinRoomPage() {
  return <PublicMeetingRoomClient />;
}
