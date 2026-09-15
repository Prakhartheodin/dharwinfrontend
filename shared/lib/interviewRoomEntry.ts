/** True when chat query params target a communication chat room (not an interview). */
export function isCommunicationChatRoomEntry(fromChat: boolean, roomName: string): boolean {
  return fromChat && roomName.startsWith("chat-");
}

/** Pre-join recording notice — participants only; hosts join without this step. */
export function shouldShowInterviewJoinConsent(params: {
  isChatCall: boolean;
  isHost: boolean;
  interviewConsentComplete: boolean;
}): boolean {
  const { isChatCall, isHost, interviewConsentComplete } = params;
  if (isChatCall || isHost || interviewConsentComplete) {
    return false;
  }
  return true;
}
