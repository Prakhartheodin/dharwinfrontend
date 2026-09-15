/** True when chat query params target a communication chat room (not an interview). */
export function isCommunicationChatRoomEntry(fromChat: boolean, roomName: string): boolean {
  return fromChat && roomName.startsWith("chat-");
}
