"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { useCallback, useEffect, useRef, useState } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import {
  listConversations,
  getMessages,
  sendMessage,
  markAsRead,
  createConversation,
  getConversation,
  searchUsers,
  addParticipants,
  removeParticipant,
  setParticipantRole,
  updateGroupName,
  uploadGroupAvatar,
  listCalls,
  initiateCall,
  endCallByRoom,
  getActiveCallForConversation,
  getCallsForConversation,
  deleteMessage,
  reactToMessage,
  uploadChatFiles,
  deleteConversation as deleteConversationApi,
  type ChatCall,
  type Conversation,
  type Message,
} from "@/shared/lib/api/chat";
import { useSearchParams } from "next/navigation";
import { useChatSocket } from "@/shared/contexts/ChatSocketContext";
import { useAuth } from "@/shared/contexts/auth-context";
import { format, formatDistanceToNow } from "date-fns";
import chatStyles from "./chats.module.scss";

const DEFAULT_AVATAR = "/assets/images/faces/1.jpg";

function callLogStatusLabel(status: string | undefined): string {
  if (!status || status === "ongoing") return "";
  if (status === "completed" || status === "ended") return "Ended";
  if (status === "missed") return "Missed";
  if (status === "declined") return "Declined";
  if (status === "initiated") return "Started";
  return status;
}

/** Short line for merged thread timeline (enriched calls from getCallsForConversation). */
function timelineCallPillText(call: {
  direction?: "incoming" | "outgoing";
  peer?: { name?: string; isGroup?: boolean };
  callType?: string;
  status?: string;
}): string {
  const kind = call.callType === "video" ? "Video" : "Voice";
  const dir = call.direction === "outgoing" ? "Outgoing" : "Incoming";
  const status = callLogStatusLabel(call.status);
  const peerName = (call.peer?.name || "Unknown").trim() || "Unknown";
  const chunks: string[] = [];
  if (call.peer?.isGroup) {
    chunks.push(`${peerName} · ${kind} · ${dir}`);
  } else if (call.direction === "outgoing") {
    chunks.push(`You called ${peerName} · ${kind}`);
  } else if (call.direction === "incoming") {
    chunks.push(`${peerName} called · ${kind}`);
  } else {
    chunks.push(`${kind} call`);
  }
  if (status) chunks.push(status);
  return chunks.join(" · ");
}

function participantIdFromCallUser(p: { id?: string; _id?: string } | null | undefined): string {
  if (!p) return "";
  return String((p as { id?: string }).id ?? (p as { _id?: string })._id ?? "").trim();
}

/** Calls list row title: explicit callee (outgoing) or caller (incoming); group name for group calls. */
function callsTabHeadline(call: ChatCall): string {
  const peer = call.peer;
  const name = (peer?.name || (call.caller as { name?: string } | undefined)?.name || "Unknown").trim() || "Unknown";
  if (peer?.isGroup) {
    if (call.direction === "outgoing") return `You called ${name}`;
    return name;
  }
  if (call.direction === "outgoing") return `You called ${name}`;
  if (call.direction === "incoming") return `${name} called you`;
  return name;
}

/** Names of users who actually joined the LiveKit room (You for viewer); omit if no join data. */
function callJoinedParticipantsLine(
  call: { roomJoinedUserIds?: Array<{ id?: string; _id?: string; name?: string }> },
  myId: string | undefined
): string | null {
  const list = call.roomJoinedUserIds?.length ? call.roomJoinedUserIds : [];
  if (list.length === 0) return null;
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    const pid = participantIdFromCallUser(p);
    const label =
      myId && pid && pid === String(myId) ? "You" : (p.name || "Unknown").trim() || "Unknown";
    const dedupe = label.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    labels.push(label);
  }
  if (labels.length === 0) return null;
  return labels.join(", ");
}

const getId = (x: { id?: string; _id?: string } | null | undefined) =>
  x && (x.id || (x as any)._id?.toString?.());

function GroupInfoPanel({
  conversation,
  loading,
  myId,
  onlineUsers,
  onRefresh,
  onClose,
  onLeave,
  onCall,
  addMemberSearch,
  setAddMemberSearch,
  addMemberResults,
  setAddMemberResults,
  addMemberSelected,
  setAddMemberSelected,
  handleSearchUsers,
}: {
  conversation: Conversation;
  loading: boolean;
  myId: string;
  onlineUsers: Set<string>;
  onRefresh: () => void;
  onClose: () => void;
  onLeave: () => void;
  onCall: (t: "audio" | "video") => void;
  addMemberSearch: string;
  setAddMemberSearch: (v: string) => void;
  addMemberResults: { id: string; name: string; email: string }[];
  setAddMemberResults: (v: { id: string; name: string; email: string }[]) => void;
  addMemberSelected: Set<string>;
  setAddMemberSelected: (v: Set<string>) => void;
  handleSearchUsers: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(conversation.name || "Group");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  /** Display names for pending invites (survives if search results refresh). */
  const [pendingAddLabels, setPendingAddLabels] = useState<Record<string, string>>({});
  const groupAvatarFileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const cid = getId(conversation);
  const participants = (conversation.participants || []) as { user: { id?: string; _id?: string; name: string; email?: string }; role?: string }[];
  const creatorId = (conversation.createdBy as any)?.id || (conversation.createdBy as any)?._id?.toString?.();
  const myPart = participants.find((p: any) => {
    const uid = (p.user as any)?.id || (p.user as any)?._id?.toString?.();
    return uid && String(uid) === String(myId);
  }) as any;
  const amCreator = creatorId && String(creatorId) === String(myId);
  const isAdmin = myPart?.role === "admin" || amCreator;
  const avatarForGroup = (n?: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent((n || "G").slice(0, 2).toUpperCase())}&size=128&background=f1f5f9&color=0f172a&bold=true`;

  const groupPhotoSrc = conversation.avatarUrl || avatarForGroup(conversation.name);

  const handleGroupAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !cid || !isAdmin) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) return;
    setAvatarUploading(true);
    try {
      await uploadGroupAvatar(cid, file);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setAvatarUploading(false);
    }
  };

  const addMemberCandidates = addMemberResults.filter(
    (u) => !participants.some((p: any) => String((p.user as any)?.id || (p.user as any)?._id) === u.id)
  );

  const handleSaveName = async () => {
    if (!cid || !isAdmin) return;
    setSaving(true);
    try {
      await updateGroupName(cid, editNameVal.trim() || "Group");
      setEditingName(false);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (!cid || !isAdmin || addMemberSelected.size === 0) return;
    setAdding(true);
    try {
      await addParticipants(cid, Array.from(addMemberSelected));
      setAddMemberSelected(new Set());
      setPendingAddLabels({});
      setAddMemberSearch("");
      setAddMemberResults([]);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!cid) return;
    try {
      await removeParticipant(cid, userId);
      onRefresh();
    } catch {
      // ignore
    }
  };

  const handleSetRole = async (userId: string, role: "admin" | "member") => {
    if (!cid) return;
    try {
      await setParticipantRole(cid, userId, role);
      onRefresh();
    } catch {
      // ignore
    }
  };

  const toggleSelect = (id: string, displayName: string) => {
    const existing = new Set(addMemberSelected);
    if (existing.has(id)) {
      existing.delete(id);
      setPendingAddLabels((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
    } else {
      existing.add(id);
      if (displayName.trim()) setPendingAddLabels((m) => ({ ...m, [id]: displayName.trim() }));
    }
    setAddMemberSelected(existing);
  };

  if (loading) {
    return (
      <div className={chatStyles.groupInfoRoot}>
        <div className={chatStyles.groupInfoLoading} role="status" aria-live="polite" aria-busy="true">
          <span className="flex flex-col items-center gap-3 text-[#64748b] dark:text-slate-400">
            <i className="ri-loader-4-line animate-spin text-3xl text-primary" aria-hidden />
            <span className="text-sm font-medium">Loading group…</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={chatStyles.groupInfoRoot}>
      <header className={chatStyles.groupInfoHeader}>
        <div className={chatStyles.groupInfoHeaderTitles}>
          <span className={chatStyles.groupInfoHeaderEyebrow}>Details</span>
          <h2 className={chatStyles.groupInfoHeaderTitle}>Group info</h2>
        </div>
        <button type="button" className={chatStyles.groupInfoClose} onClick={onClose} aria-label="Close group info">
          <i className="ri-close-line" aria-hidden />
        </button>
      </header>

      <div className={chatStyles.groupInfoHero}>
        <div className={chatStyles.groupInfoAvatarWrap}>
          <span className={chatStyles.groupInfoAvatarGlow} aria-hidden />
          <span className={chatStyles.groupInfoAvatarRing} aria-hidden />
          <input
            ref={groupAvatarFileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleGroupAvatarChange}
            aria-hidden
            tabIndex={-1}
          />
          {isAdmin ? (
            <button
              type="button"
              className={chatStyles.groupInfoAvatarEditable}
              onClick={() => !avatarUploading && groupAvatarFileRef.current?.click()}
              disabled={avatarUploading}
              aria-label={avatarUploading ? "Uploading group photo" : "Change group photo"}
            >
              <img className={chatStyles.groupInfoAvatar} src={groupPhotoSrc} alt="" width={92} height={92} />
              <span className={chatStyles.groupInfoAvatarOverlay} aria-hidden>
                {avatarUploading ? (
                  <i className="ri-loader-4-line animate-spin text-2xl" />
                ) : (
                  <i className="ri-camera-line text-2xl" />
                )}
              </span>
            </button>
          ) : (
            <img className={chatStyles.groupInfoAvatar} src={groupPhotoSrc} alt="" width={92} height={92} />
          )}
        </div>

        <div className={chatStyles.groupInfoNameBlock}>
          {editingName ? (
            <div className={chatStyles.groupInfoRenameBlock}>
              <input
                className={chatStyles.groupInfoRenameInput}
                value={editNameVal}
                onChange={(e) => setEditNameVal(e.target.value)}
                autoFocus
                aria-label="Group name"
              />
              <div className={chatStyles.groupInfoRenameActions}>
                <button
                  type="button"
                  className={chatStyles.groupInfoRenameBtnSecondary}
                  onClick={() => setEditingName(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={chatStyles.groupInfoRenameBtnPrimary}
                  onClick={handleSaveName}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={chatStyles.groupInfoNameRow}>
                <p className={chatStyles.groupInfoNameText}>{conversation.name || "Group"}</p>
                {isAdmin && (
                  <button
                    type="button"
                    className={chatStyles.groupInfoEditBtn}
                    onClick={() => {
                      setEditNameVal(conversation.name || "Group");
                      setEditingName(true);
                    }}
                    title="Rename group"
                    aria-label="Rename group"
                  >
                    <i className="ri-pencil-line text-[1.0625rem]" aria-hidden />
                  </button>
                )}
              </div>
              <p className={chatStyles.groupInfoHint}>
                {isAdmin
                  ? "You can change the name or group photo for everyone."
                  : "Only admins can change the name or group photo."}
              </p>
            </>
          )}
        </div>
      </div>

      <PerfectScrollbar className={chatStyles.groupInfoScroll} style={{ maxHeight: "calc(100vh - 22rem)" }}>
        <div className="mb-4">
          <div className={chatStyles.groupInfoSectionHead}>
            <p className={`${chatStyles.sectionLabel} !mb-0`}>Members</p>
            <span className={chatStyles.groupInfoCountPill} title={`${participants.length} members`}>
              {participants.length}
            </span>
          </div>
          <ul className="list-none">
            {participants.map((p: any) => {
              const uid = (p.user as any)?.id || (p.user as any)?._id?.toString?.();
              const name = (p.user as any)?.name || "Unknown";
              const isMe = uid && String(uid) === String(myId);
              const isPartCreator = uid && creatorId && String(uid) === String(creatorId);
              return (
                <li key={uid} className={chatStyles.participantRow}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`avatar avatar-sm avatar-rounded flex-shrink-0 ${onlineUsers.has(String(uid)) ? "online" : ""}`}>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=40`} alt="" />
                    </span>
                    <span className="min-w-0 truncate font-medium text-[0.875rem]" title={name}>
                      {name}
                    </span>
                    {p.role === "admin" && (
                      <span className="badge bg-primary/20 text-primary text-[0.65rem] flex-shrink-0">Admin</span>
                    )}
                    {isPartCreator && <span className="text-[0.65rem] text-[#8c9097] flex-shrink-0">(creator)</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isMe ? (
                      <button
                        type="button"
                        className="ti-btn ti-btn-sm ti-btn-outline-danger shrink-0 !px-4 !min-w-[4.5rem]"
                        onClick={onLeave}
                      >
                        Leave
                      </button>
                    ) : !isPartCreator && (amCreator || (isAdmin && (p.role as string) !== "admin")) ? (
                      <>
                        {amCreator && (
                          <button
                            type="button"
                            className="ti-btn ti-btn-sm ti-btn-icon ti-btn-ghost shrink-0"
                            onClick={() => handleSetRole(uid, p.role === "admin" ? "member" : "admin")}
                            title={p.role === "admin" ? "Demote" : "Make admin"}
                          >
                            <i className={p.role === "admin" ? "ri-arrow-down-s-line" : "ri-shield-star-line"} />
                          </button>
                        )}
                        {(amCreator || (p.role as string) === "member") && (
                          <button
                            type="button"
                            className="ti-btn ti-btn-sm ti-btn-icon ti-btn-ghost text-danger shrink-0"
                            onClick={() => handleRemove(uid)}
                            title="Remove"
                          >
                            <i className="ri-user-unfollow-line" />
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {isAdmin && (
          <div className={`mb-4 ${chatStyles.addParticipantsSection}`}>
            <p className={chatStyles.sectionLabel}>Add participants</p>
            <div className={chatStyles.addSearchShell}>
              <input
                className={chatStyles.addSearchInput}
                placeholder="Search by name or email…"
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchUsers())}
                aria-label="Search users to add"
              />
              <button
                type="button"
                className={chatStyles.addSearchSubmit}
                onClick={handleSearchUsers}
                aria-label="Run search"
              >
                <i className="ri-search-line text-lg leading-none" />
              </button>
            </div>
            {addMemberSelected.size > 0 && (
              <div className={chatStyles.addChipTray}>
                <p className={chatStyles.addChipTrayLabel}>Ready to invite</p>
                {Array.from(addMemberSelected).map((id) => (
                  <span key={id} className={chatStyles.addChip}>
                    <span className={chatStyles.addChipLabel} title={pendingAddLabels[id] || id}>
                      {pendingAddLabels[id] || "Selected user"}
                    </span>
                    <button
                      type="button"
                      className={chatStyles.addChipRemove}
                      onClick={() => toggleSelect(id, pendingAddLabels[id] || "")}
                      aria-label={`Remove ${pendingAddLabels[id] || "user"} from invite list`}
                    >
                      <i className="ri-close-line text-sm leading-none" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {addMemberCandidates.length > 0 && (
              <ul className={chatStyles.addResultsList}>
                {addMemberCandidates.map((u) => {
                  const selected = addMemberSelected.has(u.id);
                  return (
                    <li key={u.id} className={chatStyles.addResultRow}>
                      <span
                        className={chatStyles.addResultName}
                        title={u.email ? `${u.name} · ${u.email}` : u.name}
                      >
                        {u.name}
                      </span>
                      <button
                        type="button"
                        className={`${chatStyles.addResultAction} ${selected ? chatStyles.addResultActionSelected : ""}`}
                        onClick={() => toggleSelect(u.id, u.name)}
                      >
                        {selected ? "Remove" : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {addMemberSelected.size > 0 && (
              <button
                type="button"
                className={chatStyles.addMembersCta}
                onClick={handleAddMembers}
                disabled={adding}
              >
                {adding ? (
                  <>
                    <i className="ri-loader-4-line animate-spin shrink-0" aria-hidden />
                    Adding…
                  </>
                ) : (
                  <>
                    <i className="ri-user-add-line shrink-0 text-base" aria-hidden />
                    Add {addMemberSelected.size} member{addMemberSelected.size > 1 ? "s" : ""} to group
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </PerfectScrollbar>
      <div className={`${chatStyles.panelActions} ${chatStyles.groupInfoFooterBar}`}>
        <button
          type="button"
          className="ti-btn ti-btn-outline-primary !inline-flex items-center gap-2 !py-1.5 !px-3 !text-sm"
          onClick={() => onCall("audio")}
        >
          <i className="ri-phone-line shrink-0" />
          <span className="whitespace-nowrap">Call</span>
        </button>
        <button
          type="button"
          className="ti-btn ti-btn-outline-primary !inline-flex items-center gap-2 !py-1.5 !px-3 !text-sm"
          onClick={() => onCall("video")}
        >
          <i className="ri-vidicon-line shrink-0" />
          <span className="whitespace-nowrap">Video</span>
        </button>
      </div>
    </div>
  );
}

const Chat = () => {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    joinConversation,
    leaveConversation,
    onNewMessage,
    onConversationUpdated,
    onConversationDeleted,
    onCallEnded,
    onMessageDeleted,
    onMessageReacted,
    onTyping,
    onMessagesRead,
    emitTyping,
    emitMessageRead,
    onlineUsers,
    syncOnlineUsers,
  } = useChatSocket();

  const [activeTab, setActiveTab] = useState<"recent" | "groups" | "calls">("recent");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [convCalls, setConvCalls] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calls, setCalls] = useState<ChatCall[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatMode, setNewChatMode] = useState<"direct" | "group">("direct");
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeCallForConv, setActiveCallForConv] = useState<{
    id: string;
    roomName: string;
    callType: string;
    participantCount?: number;
    conversation: string;
  } | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [groupInfoData, setGroupInfoData] = useState<Conversation | null>(null);
  const [groupInfoLoading, setGroupInfoLoading] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [addMemberResults, setAddMemberResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [addMemberSelected, setAddMemberSelected] = useState<Set<string>>(new Set());
  const [dismissedCallNotificationPrompt, setDismissedCallNotificationPrompt] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!sessionStorage.getItem("chats-call-notification-prompt-dismissed");
  });

  const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingDisplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const chatContainerRef = useRef<HTMLElement | null>(null);

  const myId = (user as any)?.id || (user as any)?._id?.toString?.();

  // ── Auto-scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = chatContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // ── Fetch helpers ──
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listConversations({ page: 1, limit: 50 });
      const next = res.results || [];
      setConversations(next);
      setSelectedConversation((sel) => {
        if (!sel) return sel;
        const sid = getId(sel);
        const found = next.find((c) => getId(c) === sid);
        return found ?? sel;
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load conversations");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    setLoadingMessages(true);
    setHasMoreMessages(true);
    try {
      const [msgs, calls] = await Promise.all([
        getMessages(convId, { limit: 50 }),
        getCallsForConversation(convId, { limit: 50 }),
      ]);
      setMessages(msgs || []);
      setConvCalls(calls || []);
      setHasMoreMessages((msgs || []).length >= 50);
      await markAsRead(convId);
    } catch {
      setMessages([]);
      setConvCalls([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const fetchOlderMessages = useCallback(async () => {
    const cid = getId(selectedConversation);
    if (!cid || loadingOlder || !hasMoreMessages) return;
    const oldestId = messages.length > 0 ? (messages[0] as any).id || (messages[0] as any)._id : null;
    if (!oldestId) return;
    setLoadingOlder(true);
    try {
      const older = await getMessages(cid, { before: oldestId, limit: 50 });
      if ((older || []).length < 50) setHasMoreMessages(false);
      setMessages((prev) => [...(older || []), ...prev]);
    } catch {
      setHasMoreMessages(false);
    } finally {
      setLoadingOlder(false);
    }
  }, [selectedConversation, loadingOlder, hasMoreMessages, messages]);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await listCalls({ page: 1, limit: 30 });
      setCalls(res.results || []);
    } catch {
      setCalls([]);
    }
  }, []);

  const fetchActiveCallForConv = useCallback(async (convId: string | null) => {
    if (!convId) {
      setActiveCallForConv(null);
      return;
    }
    try {
      const active = await getActiveCallForConversation(convId);
      if (active?.livekitRoom) {
        const convIdStr = (active.conversation as any)?.id || (active.conversation as any)?._id || active.conversation;
        setActiveCallForConv({
          id: active.id || (active as any)._id,
          roomName: active.livekitRoom,
          callType: active.callType || "audio",
          participantCount: active.liveParticipantCount ?? active.participants?.length ?? 1,
          conversation: String(convIdStr),
        });
      } else {
        setActiveCallForConv(null);
      }
    } catch {
      setActiveCallForConv(null);
    }
  }, []);

  // ── Effects ──
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Select conversation from ?conv= when returning from meeting
  useEffect(() => {
    const convParam = searchParams.get("conv");
    if (convParam && conversations.length > 0 && (!selectedConversation || getId(selectedConversation) !== convParam)) {
      const c = conversations.find((x) => getId(x) === convParam);
      if (c) setSelectedConversation(c);
    }
  }, [searchParams, conversations, selectedConversation]);

  const convId = getId(selectedConversation);

  useEffect(() => {
    if (!selectedConversation) setIsOpen(false);
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const onFocus = () => {
      fetchConversations();
      if (convId) fetchMessages(convId);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [convId, fetchConversations, fetchMessages]);

  useEffect(() => {
    if (convId) {
      fetchMessages(convId);
      joinConversation(convId);
      setReplyingTo(null);
      return () => leaveConversation(convId);
    } else {
      setMessages([]);
      setReplyingTo(null);
    }
  }, [convId, fetchMessages, joinConversation, leaveConversation]);

  useEffect(() => {
    const userIds = conversations
      .flatMap((conversation) =>
        (conversation.participants || []).map((participant) =>
          String((participant.user as any)?.id || (participant.user as any)?._id || "").trim()
        )
      )
      .filter(Boolean);
    if (userIds.length > 0) {
      syncOnlineUsers(userIds);
    }
  }, [conversations, syncOnlineUsers]);

  // New message from socket
  useEffect(() => {
    const unsub = onNewMessage((msg: any) => {
      const msgConvId = msg?.conversation;
      if (msgConvId && convId && String(msgConvId) === String(convId)) {
        setMessages((prev) => {
          const msgId = String(msg?.id || msg?._id || "");
          if (!msgId) return [...prev, msg as Message];
          const exists = prev.some((m) => String((m as any)?.id || (m as any)?._id || "") === msgId);
          if (exists) return prev;
          return [...prev, msg as Message];
        });
        emitMessageRead(convId);
      }
      fetchConversations();
    });
    return unsub;
  }, [onNewMessage, convId, fetchConversations, emitMessageRead]);

  // Conversation updated (for persistence across users)
  useEffect(() => {
    const unsub = onConversationUpdated(() => {
      fetchConversations();
      if (isOpen && selectedConversation?.type === "group") {
        const cid = getId(selectedConversation);
        if (cid) getConversation(cid).then(setGroupInfoData).catch(() => {});
      }
    });
    return unsub;
  }, [onConversationUpdated, fetchConversations, isOpen, selectedConversation]);

  // Conversation deleted (remove from list and clear selection)
  useEffect(() => {
    const unsub = onConversationDeleted((data) => {
      const deletedId = data?.conversationId && String(data.conversationId);
      if (!deletedId) return;
      setConversations((prev) => prev.filter((c) => getId(c) !== deletedId));
      setSelectedConversation((prev) => {
        if (prev && getId(prev) === deletedId) {
          setIsOpen(false);
          return null;
        }
        return prev;
      });
    });
    return unsub;
  }, [onConversationDeleted]);

  // Typing indicator with proper cleanup
  useEffect(() => {
    setTypingUser(null);
    if (typingDisplayRef.current) {
      clearTimeout(typingDisplayRef.current);
      typingDisplayRef.current = null;
    }
    const unsub = onTyping((data) => {
      if (data.conversationId === convId && data.userId !== myId) {
        setTypingUser(data.userName);
        if (typingDisplayRef.current) clearTimeout(typingDisplayRef.current);
        typingDisplayRef.current = setTimeout(() => setTypingUser(null), 3000);
      }
    });
    return () => {
      unsub();
      if (typingDisplayRef.current) {
        clearTimeout(typingDisplayRef.current);
        typingDisplayRef.current = null;
      }
    };
  }, [onTyping, convId, myId]);

  // Read receipts
  useEffect(() => {
    const unsub = onMessagesRead((data) => {
      if (data.conversationId === convId) {
        setMessages((prev) =>
          prev.map((m) => {
            const senderId = (m.sender as any)?.id || (m.sender as any)?._id;
            if (String(senderId) === myId && !(m.readBy || []).includes(data.userId)) {
              return { ...m, readBy: [...(m.readBy || []), data.userId] };
            }
            return m;
          })
        );
      }
    });
    return unsub;
  }, [onMessagesRead, convId, myId]);

  // Calls tab
  useEffect(() => {
    if (activeTab === "calls") fetchCalls();
  }, [activeTab, fetchCalls]);

  // Active call for rejoin bar
  useEffect(() => {
    fetchActiveCallForConv(convId);
    const interval = setInterval(() => fetchActiveCallForConv(convId), 8000);
    return () => clearInterval(interval);
  }, [convId, fetchActiveCallForConv]);

  // Fetch group info when opening panel for a group
  useEffect(() => {
    if (!isOpen || !selectedConversation || selectedConversation.type !== "group") {
      setGroupInfoData(null);
      return;
    }
    const cid = getId(selectedConversation);
    if (!cid) return;
    setGroupInfoLoading(true);
    getConversation(cid)
      .then((data) => setGroupInfoData(data))
      .catch(() => setGroupInfoData(null))
      .finally(() => setGroupInfoLoading(false));
  }, [isOpen, selectedConversation]);

  // call_ended: clear active call for that conversation
  useEffect(() => {
    const unsub = onCallEnded((data) => {
      if (data.conversationId && String(data.conversationId) === String(convId)) {
        setActiveCallForConv(null);
        fetchMessages(convId);
      }
      fetchCalls();
    });
    return unsub;
  }, [onCallEnded, convId, fetchCalls, fetchMessages]);

  useEffect(() => {
    const unsub = onMessageReacted((data) => {
      if (data.conversationId && String(data.conversationId) === String(convId) && data.message) {
        const msg = data.message as any;
        setMessages((prev) =>
          prev.map((m) => {
            const id = String((m as any).id || (m as any)._id);
            if (id === String(msg?.id || msg?._id)) return { ...m, reactions: msg.reactions || [] };
            return m;
          })
        );
      }
    });
    return unsub;
  }, [onMessageReacted, convId]);

  useEffect(() => {
    const unsub = onMessageDeleted((data) => {
      if (data.conversationId && String(data.conversationId) === String(convId) && data.deleteFor === "everyone") {
        setMessages((prev) =>
          prev.map((m) => {
            const id = String((m as any).id || (m as any)._id);
            if (id === String(data.messageId)) {
              return { ...m, deletedAt: new Date().toISOString(), deletedFor: "everyone" as const };
            }
            return m;
          })
        );
      }
    });
    return unsub;
  }, [onMessageDeleted, convId]);

  // Escape key to close lightbox
  useEffect(() => {
    if (!imagePreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImagePreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imagePreview]);

  // ── Handlers ──
  const addMessageIfNew = useCallback((prev: Message[], msg: Message) => {
    const msgId = String((msg as any)?.id || (msg as any)?._id || "");
    if (!msgId) return [...prev, msg];
    const exists = prev.some((m) => String((m as any)?.id || (m as any)?._id || "") === msgId);
    return exists ? prev : [...prev, msg];
  }, []);

  const handleSend = async () => {
    const content = messageInput.trim();
    const cid = getId(selectedConversation);
    if (!content || !cid || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(cid, content, {
        replyTo: replyingTo ? String((replyingTo as any).id || (replyingTo as any)._id) : undefined,
      });
      setMessages((prev) => addMessageIfNew(prev, msg));
      setMessageInput("");
      setReplyingTo(null);
      fetchConversations();
    } catch {
      // Error
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const cid = getId(selectedConversation);
    if (!files.length || !cid) return;
    setUploading(true);
    try {
      const replyToId = replyingTo ? String((replyingTo as any).id || (replyingTo as any)._id) : undefined;
      const msg = await uploadChatFiles(cid, files, undefined, replyToId);
      setMessages((prev) => addMessageIfNew(prev, msg));
      setReplyingTo(null);
      fetchConversations();
    } catch {
      // Error
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startVoiceNote = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const cid = getId(selectedConversation);
    if (!cid) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 1000) return; // too short, ignore
        const file = new File([blob], "voice-note.webm", { type: blob.type });
        setUploading(true);
        try {
          const replyToId = replyingTo ? String((replyingTo as any).id || (replyingTo as any)._id) : undefined;
          const msg = await uploadChatFiles(cid, [file], undefined, replyToId);
          setMessages((prev) => addMessageIfNew(prev, msg));
          setReplyingTo(null);
          fetchConversations();
        } catch {
          // Error
        } finally {
          setUploading(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // Permission denied or not supported
    }
  }, [selectedConversation, replyingTo]);

  const stopVoiceNote = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }, []);

  const handleTyping = () => {
    const cid = getId(selectedConversation);
    if (!cid) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      emitTyping(cid);
      lastTypingEmitRef.current = now;
    }
  };

  const handleCall = async (callType: "audio" | "video") => {
    const cid = getId(selectedConversation);
    if (!cid) return;
    try {
      const { call, roomName } = await initiateCall(cid, callType);
      const params = new URLSearchParams({ from: "chat", conv: cid });
      if (call?.id) params.set("callId", call.id);
      if (callType === "audio") params.set("video", "0");
      else params.set("video", "1");
      const url = `/meetings/room/${encodeURIComponent(roomName)}?${params}`;
      window.open(url, "_blank", "noopener");
    } catch {
      // Error
    }
  };

  const [deletingChat, setDeletingChat] = useState(false);
  const handleDeleteChat = async () => {
    const cid = getId(selectedConversation);
    if (!cid) return;
    const isGroup = selectedConversation?.type === "group";
    const msg = isGroup
      ? "Permanently delete this group chat for everyone? This cannot be undone."
      : "Delete this chat? It will be removed for both participants.";
    if (!window.confirm(msg)) return;
    setDeletingChat(true);
    setError(null);
    try {
      await deleteConversationApi(cid);
      setSelectedConversation(null);
      setIsOpen(false);
      await fetchConversations();
    } catch (e: any) {
      const message = e?.response?.data?.message || "Failed to delete chat.";
      setError(message);
    } finally {
      setDeletingChat(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!userSearch.trim()) return;
    try {
      const res = await searchUsers({ search: userSearch.trim(), limit: 20 });
      setSearchResults(res.results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleStartChat = async (userOrId: { id?: string; _id?: string }) => {
    const userId = (userOrId as any)?.id || (userOrId as any)?._id;
    if (!userId) return;
    try {
      const conv = await createConversation({ type: "direct", participantIds: [String(userId)] });
      setSelectedConversation(conv);
      setShowNewChat(false);
      setUserSearch("");
      setSearchResults([]);
      fetchConversations();
    } catch {
      // Error
    }
  };

  const handleCreateGroup = async () => {
    const ids = Array.from(selectedUserIds);
    if (ids.length < 1) return;
    setCreatingGroup(true);
    try {
      const conv = await createConversation({
        type: "group",
        participantIds: ids,
        name: groupName.trim() || undefined,
      });
      setSelectedConversation(conv);
      setShowNewChat(false);
      setUserSearch("");
      setSearchResults([]);
      setSelectedUserIds(new Set());
      setGroupName("");
      setNewChatMode("direct");
      fetchConversations();
    } catch {
      // Error
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleUserForGroup = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const openNewChatModal = (mode: "direct" | "group" = "direct") => {
    setNewChatMode(mode);
    setSelectedUserIds(new Set());
    setGroupName("");
    setShowNewChat(true);
  };

  // ── Display helpers ──
  const otherParticipants = (c: Conversation) =>
    (c.participants || []).filter((p: any) => {
      const pid = (p.user as any)?.id || (p.user as any)?._id?.toString?.();
      return pid && myId && String(pid) !== String(myId);
    });
  const displayName = (c: Conversation) =>
    c.displayName || c.name || (otherParticipants(c)[0] as any)?.user?.name || "Unknown";
  const avatarFor = (c: Conversation) => {
    const other = otherParticipants(c)[0] as any;
    return other?.user?.name
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(other.user.name)}&size=80`
      : DEFAULT_AVATAR;
  };
  const isUserOnline = (c: Conversation) => {
    const other = otherParticipants(c)[0] as any;
    const uid = other?.user?.id || other?.user?._id;
    return uid ? onlineUsers.has(String(uid)) : false;
  };

  const avatarForGroup = (name?: string) => {
    const initials = (name || "G").slice(0, 2).toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=80`;
  };

  const conversationAvatar = (c: Conversation) =>
    c.type === "group" ? c.avatarUrl || avatarForGroup(c.name) : avatarFor(c);

  const isGroupAdmin = (c: Conversation) => {
    const p = (c.participants || []).find((x: any) => {
      const pid = (x.user as any)?.id || (x.user as any)?._id?.toString?.();
      return pid && myId && String(pid) === String(myId);
    }) as any;
    return p?.role === "admin";
  };

  const isCreator = (c: Conversation) => {
    const creatorId = (c.createdBy as any)?.id || (c.createdBy as any)?._id?.toString?.();
    return creatorId && myId && String(creatorId) === String(myId);
  };

  const recentConvs = conversations.filter((c) => c.type === "direct" || c.type === "group");
  const groupConvs = conversations.filter((c) => c.type === "group");

  const formatDateSeparatorForList = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const recentConvsByDate = React.useMemo(() => {
    const groups: { label: string; convs: Conversation[] }[] = [];
    let lastLabel = "";
    for (const c of recentConvs) {
      const d = (c as any).lastMessageAt ? new Date((c as any).lastMessageAt) : new Date();
      const label = formatDateSeparatorForList(d);
      if (label !== lastLabel) {
        lastLabel = label;
        groups.push({ label, convs: [] });
      }
      groups[groups.length - 1].convs.push(c);
    }
    return groups;
  }, [recentConvs]);

  const getReplyPreviewText = (r: { content?: string; type?: string }) => {
    if (!r) return "";
    if (r.type === "image") return "Photo";
    if (r.type === "file") return "File";
    if (r.type === "audio") return "Voice note";
    return (r.content || "").slice(0, 60) + ((r.content || "").length > 60 ? "…" : "");
  };

  const renderMessageContent = (m: Message) => {
    const isDeleted = !!(m as any).deletedAt;
    if (isDeleted) {
      return (
        <p className="mb-0 italic text-[#8c9097]">
          {(m as any).deletedFor === "everyone"
            ? "This message was deleted"
            : "You deleted this message"}
        </p>
      );
    }
    const replyTo = (m as any).replyTo;
    const replyBlock = replyTo ? (
      <div className="mb-2 pb-2 border-l-2 border-primary/50 pl-2 text-[0.8rem]">
        <p className="mb-0 font-medium text-primary/90 truncate">
          {(replyTo.sender as any)?.name || "Unknown"}
        </p>
        <p className="mb-0 text-[#8c9097] truncate">{getReplyPreviewText(replyTo)}</p>
      </div>
    ) : null;
    if (m.type === "image" && m.attachments?.length) {
      return (
        <div>
          {replyBlock}
          {m.attachments.map((a, i) => (
            <img
              key={i}
              src={a.url}
              alt={a.originalName || "image"}
              className="rounded max-w-[240px] max-h-[200px] cursor-pointer object-cover mb-1"
              onClick={(e) => { e.stopPropagation(); setImagePreview(a.url); }}
            />
          ))}
          {m.content && m.content !== "\ud83d\udcf7 Image" && <p className="mb-0 mt-1">{m.content}</p>}
        </div>
      );
    }
    if (m.type === "audio" && m.attachments?.length) {
      return (
        <div>
          {replyBlock}
          {m.attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded bg-white/10">
              <audio controls className="max-w-[200px] h-9" src={a.url} />
              <span className="text-[0.7rem] text-[#8c9097]">Voice note</span>
            </div>
          ))}
        </div>
      );
    }
    if (m.type === "file" && m.attachments?.length) {
      return (
        <div>
          {replyBlock}
          {m.attachments.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded bg-white/10 hover:bg-white/20 mb-1"
            >
              <i className="ri-file-line text-lg" />
              <div className="min-w-0">
                <p className="mb-0 text-sm font-medium truncate">{a.originalName || "File"}</p>
                {a.size ? (
                  <p className="mb-0 text-[0.7rem] text-[#8c9097]">
                    {a.size >= 1048576
                      ? `${(a.size / 1048576).toFixed(1)} MB`
                      : `${(a.size / 1024).toFixed(1)} KB`}
                  </p>
                ) : null}
              </div>
              <i className="ri-download-2-line ms-auto" />
            </a>
          ))}
          {m.content && m.content !== "\ud83d\udcce File" && <p className="mb-0 mt-1">{m.content}</p>}
        </div>
      );
    }
    return (
      <div>
        {replyBlock}
        <p className="mb-0">{m.content}</p>
      </div>
    );
  };

  const formatDateSeparator = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  // Merge messages and calls for WhatsApp-style chat timeline, with date separators
  type TimelineItem =
    | { type: "message"; data: Message }
    | { type: "call"; data: any }
    | { type: "date"; data: string };
  const chatTimeline = React.useMemo(() => {
    const items: TimelineItem[] = [];
    (messages || []).forEach((m) => items.push({ type: "message", data: m }));
    (convCalls || []).forEach((c) => items.push({ type: "call", data: c }));
    const getDate = (item: { type: string; data: any }) => {
      if (item.type === "message") return (item.data as Message).createdAt;
      if (item.type === "call") return (item.data as any).createdAt || (item.data as any).startedAt;
      return null;
    };
    items.sort((a, b) => {
      const da = getDate(a);
      const db = getDate(b);
      if (!da || !db) return 0;
      return new Date(da).getTime() - new Date(db).getTime();
    });
    const withDateSeparators: TimelineItem[] = [];
    let lastDateStr = "";
    for (const item of items) {
      const d = getDate(item);
      if (d) {
        const dateStr = formatDateSeparator(new Date(d));
        if (dateStr !== lastDateStr) {
          lastDateStr = dateStr;
          withDateSeparators.push({ type: "date", data: dateStr });
        }
      }
      withDateSeparators.push(item);
    }
    return withDateSeparators;
  }, [messages, convCalls]);

  const formatCallDuration = (seconds: number) => {
    if (!seconds || seconds < 0) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };

  const renderReadStatus = (m: Message) => {
    const senderId = (m.sender as any)?.id || (m.sender as any)?._id?.toString?.();
    if (String(senderId) !== myId) return null;
    const readCount = (m.readBy || []).length;
    if (readCount > 0) {
      return <i className="ri-check-double-line text-primary ms-1" title="Read" />;
    }
    return <i className="ri-check-double-line text-[#8c9097] ms-1" title="Delivered" />;
  };

  const showCallNotificationBanner =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "default" &&
    !dismissedCallNotificationPrompt;

  const handleEnableCallNotifications = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission();
  };

  const handleDismissCallNotificationPrompt = () => {
    if (typeof window !== "undefined") sessionStorage.setItem("chats-call-notification-prompt-dismissed", "1");
    setDismissedCallNotificationPrompt(true);
  };

  return (
    <div className={`mt-5 sm:mt-6 ${chatStyles.shell}`}>
      <Seo title="Chat" />
      {showCallNotificationBanner && (
        <div className={chatStyles.notifBanner}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className={chatStyles.notifIcon}>
              <i className="ri-notification-3-line text-lg" />
            </span>
            <p className="mb-0 min-w-0 text-sm text-defaulttextcolor dark:text-defaulttextcolor/90">
              Get notified of incoming chats and calls when this tab is in the background.
            </p>
          </div>
          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 sm:justify-start">
            <button
              type="button"
              className="ti-btn ti-btn-sm ti-btn-primary !inline-flex !h-8 !w-auto !min-w-0 items-center gap-1.5 !whitespace-nowrap !py-1.5 !px-3"
              onClick={handleEnableCallNotifications}
            >
              <i className="ri-bell-line shrink-0 text-sm" />
              <span>Enable</span>
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-sm ti-btn-outline-secondary !inline-flex !h-8 !w-auto !min-w-0 items-center !whitespace-nowrap !py-1.5 !px-3"
              onClick={handleDismissCallNotificationPrompt}
            >
              <span>Not now</span>
            </button>
          </div>
        </div>
      )}
      <div className={`main-chart-wrapper ${chatStyles.grid} p-2 gap-2 lg:flex`}>
        {/* ── Left sidebar ── */}
        <div className={`chat-info ${chatStyles.rail} border-0 dark:border-0`}>
          <button
            type="button"
            aria-label="New chat or group"
            onClick={() => openNewChatModal(activeTab === "groups" ? "group" : "direct")}
            className={chatStyles.railFab}
          >
            <i className="ri-add-line" />
          </button>
          <div className={chatStyles.railHeader}>
            <h5 className={chatStyles.railTitle}>Messages</h5>
          </div>
          <div className={chatStyles.railSearch}>
            <div className={chatStyles.searchField}>
              <input
                type="text"
                className={`form-control ${chatStyles.searchInput}`}
                placeholder="Search conversations…"
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
              />
              <button type="button" className={chatStyles.searchBtn} onClick={handleSearchUsers} aria-label="Search">
                <i className="ri-search-line text-lg" />
              </button>
            </div>
          </div>
          <nav className={chatStyles.tabRow} role="tablist" aria-label="Conversation filters">
            {(["recent", "groups", "calls"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`${chatStyles.tab} ${activeTab === tab ? chatStyles.tabActive : ""}`}
              >
                <i className={`me-1 ${tab === "recent" ? "ri-history-line" : tab === "groups" ? "ri-group-2-line" : "ri-phone-line"}`} />
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>

          <div className={`tab-content ${chatStyles.listScroll}`}>
            {activeTab === "recent" && (
              <div className="tab-pane fade show active !border-0 chat-users-tab">
                <div className={chatStyles.listPane}>
                {loading ? (
                  <p className={chatStyles.emptyList}>Loading…</p>
                ) : error ? (
                  <p className="text-danger px-1">{error}</p>
                ) : recentConvs.length === 0 ? (
                  <p className={chatStyles.emptyList}>No conversations yet. Use + to start a chat.</p>
                ) : (
                  <ul className="list-none mb-0">
                    {recentConvsByDate.map((g) => (
                      <React.Fragment key={g.label}>
                        <li data-chat-section className={chatStyles.dateChip}>
                          {g.label}
                        </li>
                        {g.convs.map((c) => {
                          const convId = getId(c);
                          const hasActiveCall = activeCallForConv && String(activeCallForConv.conversation) === String(convId);
                          const active = getId(selectedConversation) === convId;
                          return (
                            <li
                              key={convId || ""}
                              className={`${chatStyles.convItem} ${active ? chatStyles.convItemActive : ""}`}
                              onClick={() => setSelectedConversation(c)}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`avatar avatar-md avatar-rounded flex-shrink-0 ${isUserOnline(c) ? "online" : ""}`}>
                                  <img src={conversationAvatar(c)} alt="" className="rounded-full" />
                                </span>
                                <div className="flex-grow min-w-0">
                                  <p className={`${chatStyles.convName} truncate`}>
                                    {displayName(c)}
                                    {hasActiveCall && (
                                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-primary" title="Call in progress">
                                        <i className="ri-phone-fill text-[0.65rem]" />
                                        Live
                                      </span>
                                    )}
                                  </p>
                                  <p className={`${chatStyles.convPreview} truncate`}>
                                    {c.lastMessage?.content || "No messages yet"}
                                  </p>
                                </div>
                                {(c.unreadCount || 0) > 0 && (
                                  <span className={chatStyles.unreadBadge}>{c.unreadCount}</span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </ul>
                )}
                </div>
              </div>
            )}
            {activeTab === "groups" && (
              <div className="tab-pane fade show active !border-0 chat-groups-tab">
                <div className={chatStyles.listPane}>
                {groupConvs.length === 0 ? (
                  <p className={chatStyles.emptyList}>No groups yet. Create one with +</p>
                ) : (
                  <ul className="list-none mb-0">
                    {groupConvs.map((c) => (
                      <li
                        key={getId(c) || ""}
                        className={`${chatStyles.convItem} ${getId(selectedConversation) === getId(c) ? chatStyles.convItemActive : ""}`}
                        onClick={() => setSelectedConversation(c)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="avatar avatar-md avatar-rounded flex-shrink-0">
                            <img src={conversationAvatar(c)} alt="" />
                          </span>
                          <p className={`${chatStyles.convName} mb-0`}>{displayName(c)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                </div>
              </div>
            )}
            {activeTab === "calls" && (
              <div className="tab-pane fade show active !border-0 chat-calls-tab">
                <div className={chatStyles.listPane}>
                {calls.length === 0 ? (
                  <p className={chatStyles.emptyList}>No call history yet.</p>
                ) : (
                  <ul className="list-none mb-0" role="list">
                    {calls.map((call) => {
                      const peer = call.peer;
                      const peerAvatarName = peer?.name || (call.caller as { name?: string })?.name || "Unknown";
                      const title = callsTabHeadline(call);
                      const isOutgoing = call.direction === "outgoing";
                      const dirLabel = isOutgoing ? "Outgoing" : "Incoming";
                      const typeLabel = call.callType === "video" ? "Video" : "Voice";
                      const statusText = callLogStatusLabel(call.status);
                      const timeText =
                        call.createdAt &&
                        formatDistanceToNow(new Date(call.createdAt), { addSuffix: true });
                      const subtitleParts = [
                        `${typeLabel} call`,
                        statusText || undefined,
                        timeText || undefined,
                      ].filter(Boolean);
                      const joined = callJoinedParticipantsLine(call, myId);
                      const ariaLabel = `${title}. ${subtitleParts.join(". ")}${
                        joined ? `. Participants: ${joined}` : ""
                      }`;
                      const avatarSrc = peer?.isGroup
                        ? `https://ui-avatars.com/api/?name=${encodeURIComponent((peerAvatarName || "G").slice(0, 2).toUpperCase())}&size=80`
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(peerAvatarName)}&size=80`;
                      return (
                        <li
                          key={call.id}
                          className={`${chatStyles.convItem} flex items-center justify-between gap-2`}
                          role="listitem"
                          aria-label={ariaLabel}
                        >
                          <span className="avatar avatar-md me-2 avatar-rounded shrink-0">
                            <img src={avatarSrc} alt="" />
                          </span>
                          <div className="flex min-w-0 flex-1 items-start gap-2">
                            <span className="text-[#8c9097] dark:text-[#9ca3af] shrink-0 pt-0.5" aria-hidden="true">
                              <i
                                className={`text-base ${isOutgoing ? "ri-arrow-right-up-line" : "ri-arrow-left-down-line"}`}
                              />
                            </span>
                            <div className="min-w-0 flex-grow">
                              <p className="mb-0 truncate font-semibold" title={title}>
                                {title}
                              </p>
                              <p
                                className={`mb-0 text-[0.75rem] ${
                                  call.status === "missed"
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-[#8c9097] dark:text-[#9ca3af]"
                                }`}
                              >
                                <i
                                  className={`me-1 ${call.callType === "video" ? "ri-vidicon-line" : "ri-phone-line"}`}
                                  aria-hidden="true"
                                />
                                <span className="me-1">{dirLabel}.</span>
                                {subtitleParts.join(" · ")}
                              </p>
                              {joined && (
                                <p className="mb-0 mt-0.5 truncate text-[0.6875rem] text-[#8c9097] dark:text-[#9ca3af]">
                                  Joined: {joined}
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Main chat + details (slide panel on lg+; template .chat-user-details.open under 1400px) ── */}
        <div className={chatStyles.mainWithDetails}>
        <div className={`main-chat-area ${chatStyles.main} border-0 dark:border-0 flex-1 flex flex-col`}>
          {selectedConversation ? (
            <>
              {/* Rejoin bar (WhatsApp-style) */}
              {activeCallForConv && String(activeCallForConv.conversation) === String(convId) && (
                <div className={chatStyles.rejoinBar}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex items-center gap-2 text-primary font-semibold text-sm">
                      <i className={`${activeCallForConv.callType === "video" ? "ri-vidicon-line" : "ri-phone-line"} text-lg`} />
                      {activeCallForConv.participantCount && activeCallForConv.participantCount > 1
                        ? `${activeCallForConv.participantCount} in call`
                        : "Call in progress"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ti-btn ti-btn-sm ti-btn-primary !rounded-full shrink-0"
                    onClick={() => {
                      const params = new URLSearchParams({ from: "chat", conv: activeCallForConv.conversation });
                      if (activeCallForConv.id) params.set("callId", activeCallForConv.id);
                      params.set("video", activeCallForConv.callType === "audio" ? "0" : "1");
                      const url = `/meetings/room/${encodeURIComponent(activeCallForConv.roomName)}?${params}`;
                      window.open(url, "_blank", "noopener");
                    }}
                  >
                    <i className="ri-phone-fill me-1" />
                    Rejoin
                  </button>
                </div>
              )}
              <div className={`${chatStyles.threadHeader} sm:flex-nowrap`}>
                <div className="flex items-center min-w-0">
                  <span className={`avatar avatar-lg me-3 sm:me-4 avatar-rounded flex-shrink-0 ${isUserOnline(selectedConversation) ? "online" : ""}`}>
                    <img src={conversationAvatar(selectedConversation)} alt="" />
                  </span>
                  <div className="min-w-0">
                    <p className={`${chatStyles.threadTitle} mb-0 truncate`}>
                      <button
                        type="button"
                        className="hover:underline text-left truncate max-w-full"
                        onClick={() => {
                          if (!selectedConversation) return;
                          setIsOpen((open) => !open);
                        }}
                        aria-expanded={!!selectedConversation && isOpen}
                        aria-controls="chat-side-details-panel"
                      >
                        {displayName(selectedConversation)}
                      </button>
                    </p>
                    <p className={`${chatStyles.threadMeta} ${typingUser ? chatStyles.threadMetaTyping : ""}`}>
                      {typingUser
                        ? `${typingUser} is typing…`
                        : isUserOnline(selectedConversation)
                          ? "Online"
                          : "Offline"}
                    </p>
                  </div>
                </div>
                <div className={`${chatStyles.toolbar} mt-2 sm:mt-0`}>
                  <button
                    type="button"
                    className={chatStyles.toolBtn}
                    title="Voice call"
                    onClick={() => handleCall("audio")}
                  >
                    <i className="ri-phone-line" />
                  </button>
                  <button
                    type="button"
                    className={chatStyles.toolBtn}
                    title="Video call"
                    onClick={() => handleCall("video")}
                  >
                    <i className="ri-vidicon-line" />
                  </button>
                  <button
                    type="button"
                    className={`${chatStyles.toolBtn} ${chatStyles.toolBtnDanger}`}
                    title="Delete chat"
                    disabled={deletingChat}
                    onClick={handleDeleteChat}
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
              {error && (
                <div className={chatStyles.errorInline}>
                  {error}
                </div>
              )}
              <PerfectScrollbar
                className={chatStyles.transcript}
                style={{ height: "calc(100vh - 18rem)" }}
                containerRef={(el) => { chatContainerRef.current = el; }}
              >
                <div className={`chat-content ${chatStyles.transcriptInner}`}>
                  {hasMoreMessages && !loadingMessages && messages.length > 0 && (
                    <div className={chatStyles.loadOlder}>
                      <button
                        type="button"
                        className="ti-btn ti-btn-sm ti-btn-outline-secondary !rounded-full"
                        onClick={fetchOlderMessages}
                        disabled={loadingOlder}
                      >
                        {loadingOlder ? (
                          <>
                            <i className="ri-loader-4-line animate-spin me-1" />
                            Loading...
                          </>
                        ) : (
                          "Load older messages"
                        )}
                      </button>
                    </div>
                  )}
                  {loadingMessages ? (
                    <p className={chatStyles.emptyList}>Loading messages…</p>
                  ) : chatTimeline.length === 0 ? (
                    <div className={chatStyles.emptyThread}>
                      <span className={chatStyles.emptyThreadIcon} aria-hidden>
                        <i className="ri-chat-smile-2-line" />
                      </span>
                      <h3>Start the thread</h3>
                      <p>Send a message to kick things off. Replies and files show up here.</p>
                    </div>
                  ) : (
                    <ul className="list-none">
                      {chatTimeline.map((item, idx) => {
                        if (item.type === "date") {
                          return (
                            <li key={`date-${item.data}-${idx}`} className={chatStyles.timelineDate}>
                              <span>{item.data}</span>
                            </li>
                          );
                        }
                        if (item.type === "call") {
                          const call = item.data as any;
                          const hasEnriched = call.direction && call.peer;
                          const callLabel = hasEnriched
                            ? timelineCallPillText(call)
                            : call.callType === "video"
                              ? "Video call"
                              : "Voice call";
                          const duration = call.duration ? formatCallDuration(call.duration) : null;
                          const callDate = call.endedAt || call.createdAt || call.startedAt;
                          const isOutgoing = call.direction === "outgoing";
                          const joinedThread = callJoinedParticipantsLine(call, myId);
                          return (
                            <li key={`call-${call.id || call._id}-${idx}`} className={`${chatStyles.timelineDate} mb-4`}>
                              <div
                                className={`${chatStyles.callPill} ${joinedThread ? chatStyles.callPillWithJoined : ""}`}
                              >
                                <div className={chatStyles.callPillMainRow}>
                                  {hasEnriched ? (
                                    <i
                                      className={`shrink-0 text-base ${isOutgoing ? "ri-arrow-right-up-line" : "ri-arrow-left-down-line"}`}
                                      aria-hidden
                                    />
                                  ) : (
                                    <i
                                      className={`${call.callType === "video" ? "ri-vidicon-line" : "ri-phone-line"} shrink-0 text-base`}
                                      aria-hidden
                                    />
                                  )}
                                  <span className="min-w-0">
                                    {callLabel}
                                    {duration && ` (${duration})`}
                                    {callDate && ` · ${format(new Date(callDate), "h:mm a")}`}
                                  </span>
                                </div>
                                {joinedThread && (
                                  <div className={`${chatStyles.callPillJoined} truncate`} title={`Joined: ${joinedThread}`}>
                                    Joined: {joinedThread}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        }
                        if (item.type !== "message") return null;
                        const m = item.data;
                        const senderId = (m.sender as any)?.id || (m.sender as any)?._id?.toString?.();
                        const isMe = !!senderId && !!myId && String(senderId) === String(myId);
                        return (
                          <li
                            key={m.id || (m as any)._id}
                            data-message-row
                            className={`${chatStyles.msgRow} group ${isMe ? chatStyles.msgRowMe : chatStyles.msgRowThem}`}
                          >
                            <div className={`${chatStyles.msgCluster} ${isMe ? chatStyles.msgClusterMe : ""}`}>
                              <span className="avatar avatar-md avatar-rounded flex-shrink-0">
                                <img
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent((m.sender as any)?.name || "U")}&size=40`}
                                  alt=""
                                />
                              </span>
                              <div className={`min-w-0 flex-1 ${isMe ? "text-end" : ""}`}>
                                <span className={`${chatStyles.msgMeta} ${isMe ? chatStyles.msgMetaMe : ""}`}>
                                  {isMe && !(m as any).deletedAt && (
                                    <>
                                      <button
                                        type="button"
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-opacity shrink-0"
                                        title="Delete"
                                        onClick={() => {
                                          const cid = getId(selectedConversation);
                                          if (!cid) return;
                                          deleteMessage(cid, String((m as any).id || (m as any)._id), "me").then(() => {
                                            setMessages((prev) => prev.filter((x) => String((x as any).id || (x as any)._id) !== String((m as any).id || (m as any)._id)));
                                          }).catch(() => {});
                                        }}
                                      >
                                        <i className="ri-delete-bin-line text-sm" />
                                      </button>
                                      <button
                                        type="button"
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-opacity shrink-0"
                                        title="Delete for everyone"
                                        onClick={() => {
                                          const cid = getId(selectedConversation);
                                          if (!cid) return;
                                          deleteMessage(cid, String((m as any).id || (m as any)._id), "everyone").then(() => {
                                            setMessages((prev) =>
                                              prev.map((x) => {
                                                if (String((x as any).id || (x as any)._id) === String((m as any).id || (m as any)._id)) {
                                                  return { ...x, deletedAt: new Date().toISOString(), deletedFor: "everyone" as const };
                                                }
                                                return x;
                                              })
                                            );
                                          }).catch(() => {});
                                        }}
                                      >
                                        <i className="ri-delete-bin-2-line text-sm" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-opacity shrink-0"
                                    title="Reply"
                                    onClick={() => setReplyingTo(m)}
                                  >
                                    <i className="ri-reply-line text-sm" />
                                  </button>
                                  {(m.sender as any)?.name} &middot;{" "}
                                  {m.createdAt ? format(new Date(m.createdAt), "h:mm a") : ""}
                                  {isMe && renderReadStatus(m)}
                                </span>
                                <div className="relative">
                                  <div
                                    className={`${chatStyles.bubble} mt-1 ${isMe ? chatStyles.bubbleSent : chatStyles.bubbleRecv}`}
                                  >
                                    {renderMessageContent(m)}
                                  </div>
                                  {(m as any).reactions?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Array.from(
                                        new Map<string, number>(
                                          ((m as any).reactions || []).map((r: any) => [
                                            r.emoji,
                                            ((m as any).reactions || []).filter((x: any) => x.emoji === r.emoji).length,
                                          ]) as [string, number][]
                                        ).entries()
                                      ).map(([emoji, count]: [string, number]) => (
                                        <span
                                          key={emoji}
                                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/10 text-sm"
                                        >
                                          {emoji} {count > 1 ? <span className="text-xs">{count}</span> : null}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {!(m as any).deletedAt && (
                                    <>
                                      {reactionPickerFor === (m.id || (m as any)._id) ? (
                                        <div className="absolute bottom-full left-0 mb-1 flex gap-1 p-1 rounded-lg bg-white dark:bg-gray-800 shadow-lg z-10">
                                          {REACTION_EMOJIS.map((emoji) => (
                                            <button
                                              key={emoji}
                                              type="button"
                                              className="text-lg hover:scale-125 transition-transform p-0.5"
                                              onClick={() => {
                                                const cid = getId(selectedConversation);
                                                if (!cid) return;
                                                reactToMessage(cid, String((m as any).id || (m as any)._id), emoji)
                                                  .then((updated) => {
                                                    setMessages((prev) =>
                                                      prev.map((x) =>
                                                        String((x as any).id || (x as any)._id) === String((m as any).id || (m as any)._id)
                                                          ? { ...x, reactions: updated.reactions || [] }
                                                          : x
                                                      )
                                                    );
                                                  })
                                                  .catch(() => {});
                                                setReactionPickerFor(null);
                                              }}
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          className="opacity-0 group-hover:opacity-100 absolute -bottom-1 right-0 p-1 rounded hover:bg-white/10 transition-opacity"
                                          title="React"
                                          onClick={() =>
                                            setReactionPickerFor(
                                              reactionPickerFor === (m.id || (m as any)._id) ? null : String((m as any).id || (m as any)._id)
                                            )
                                          }
                                        >
                                          <i className="ri-emotion-happy-line text-sm" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {typingUser && (
                    <div className={chatStyles.typingRow}>
                      <span className="flex gap-1" aria-hidden>
                        <span className={chatStyles.typingDot} />
                        <span className={chatStyles.typingDot} />
                        <span className={chatStyles.typingDot} />
                      </span>
                      <span>{typingUser} is typing…</span>
                    </div>
                  )}
                </div>
              </PerfectScrollbar>
              {replyingTo && (
                <div className={chatStyles.replyStrip}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.75rem] font-medium text-primary mb-0">Replying to {(replyingTo.sender as any)?.name}</p>
                    <p className="text-[0.75rem] text-[#8c9097] truncate mb-0">{getReplyPreviewText(replyingTo)}</p>
                  </div>
                  <button
                    type="button"
                    className="ti-btn ti-btn-icon ti-btn-ghost-danger !rounded-full shrink-0"
                    title="Cancel reply"
                    onClick={() => setReplyingTo(null)}
                  >
                    <i className="ri-close-line" />
                  </button>
                </div>
              )}
              <div className={`chat-footer ${chatStyles.composer}`}>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className={`${chatStyles.toolBtn} flex-shrink-0`}
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading && !isRecording ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    <i className="ri-attachment-2" />
                  )}
                </button>
                {typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function" ? (
                  isRecording ? (
                    <button
                      type="button"
                      className="ti-btn ti-btn-icon !rounded-full flex-shrink-0 bg-danger text-white animate-pulse"
                      title="Stop recording"
                      onClick={stopVoiceNote}
                    >
                      <i className="ri-stop-circle-fill" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${chatStyles.toolBtn} flex-shrink-0`}
                      title="Record voice note"
                      onClick={startVoiceNote}
                      disabled={uploading}
                    >
                      <i className="ri-mic-line" />
                    </button>
                  )
                ) : null}
                <input
                  className={`form-control flex-1 ${chatStyles.composerInput}`}
                  placeholder="Message…"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  aria-label="Message text"
                />
                <button
                  type="button"
                  className={`ti-btn ti-btn-icon ti-btn-send ${chatStyles.sendBtn}`}
                  onClick={handleSend}
                  disabled={sending || !messageInput.trim()}
                  title="Send"
                  aria-label="Send message"
                >
                  <i className="ri-send-plane-2-line" />
                </button>
              </div>
            </>
          ) : (
            <div className={chatStyles.emptySelect}>
              <i className={`ri-chat-3-line ${chatStyles.emptySelectIcon}`} aria-hidden />
              <p className="mb-0 text-sm font-medium text-defaulttextcolor dark:text-white/80">Select a conversation</p>
              <p className="mb-0 mt-1 text-xs max-w-[14rem]">Pick someone from the list or tap + to start a new chat.</p>
            </div>
          )}
        </div>

        {/* ── Right details panel ── */}
        <div
          className={`${chatStyles.sidePanelShell} ${
            isOpen && selectedConversation ? chatStyles.sidePanelShellOpen : chatStyles.sidePanelShellClosed
          }`}
          aria-hidden={!isOpen || !selectedConversation}
        >
        <div
          id="chat-side-details-panel"
          className={`chat-user-details ${chatStyles.sidePanel} border-0 dark:border-0 ${
            isOpen && selectedConversation ? "open" : ""
          }`}
        >
          {selectedConversation && selectedConversation.type === "group" && (
            <GroupInfoPanel
              conversation={groupInfoData || selectedConversation}
              loading={groupInfoLoading}
              myId={myId || ""}
              onlineUsers={onlineUsers}
              onRefresh={async () => {
                const cid = getId(selectedConversation);
                if (cid) {
                  try {
                    const fresh = await getConversation(cid);
                    setGroupInfoData(fresh);
                    setSelectedConversation((prev) => (prev && getId(prev) === cid ? fresh : prev));
                  } catch {
                    /* ignore */
                  }
                }
                await fetchConversations();
              }}
              onClose={() => setIsOpen(false)}
              onLeave={() => {
                const cid = getId(selectedConversation);
                if (cid && myId)
                  removeParticipant(cid, myId).then(() => {
                    setSelectedConversation(null);
                    setIsOpen(false);
                    setGroupInfoData(null);
                    fetchConversations();
                  });
              }}
              onCall={handleCall}
              addMemberSearch={addMemberSearch}
              setAddMemberSearch={setAddMemberSearch}
              addMemberResults={addMemberResults}
              setAddMemberResults={setAddMemberResults}
              addMemberSelected={addMemberSelected}
              setAddMemberSelected={setAddMemberSelected}
              handleSearchUsers={async () => {
                if (!addMemberSearch.trim()) return;
                const res = await searchUsers({ search: addMemberSearch.trim(), limit: 20 });
                setAddMemberResults(res.results || []);
              }}
            />
          )}
          {selectedConversation && selectedConversation.type !== "group" && (
            <div className={chatStyles.sideCard}>
              <div className="text-center mb-4">
                <span className={`avatar avatar-xxl avatar-rounded ${isUserOnline(selectedConversation) ? "online" : ""}`}>
                  <img src={avatarFor(selectedConversation)} alt="" />
                </span>
                <p className="mb-1 font-semibold mt-2">{displayName(selectedConversation)}</p>
                <p className="text-[0.75rem] text-[#8c9097]">
                  {(otherParticipants(selectedConversation)[0] as any)?.user?.email || ""}
                </p>
                <p className="text-[0.75rem] mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full me-1 ${isUserOnline(selectedConversation) ? "bg-success" : "bg-gray-400"}`} />
                  {isUserOnline(selectedConversation) ? "Online" : "Offline"}
                </p>
              </div>
              <div className={chatStyles.panelActions}>
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-primary !inline-flex items-center justify-center gap-2 !py-1.5 !px-3 !text-sm !w-auto !min-w-0"
                  onClick={() => handleCall("audio")}
                >
                  <i className="ri-phone-line shrink-0 text-base" />
                  <span className="whitespace-nowrap">Call</span>
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-primary !inline-flex items-center justify-center gap-2 !py-1.5 !px-3 !text-sm !w-auto !min-w-0"
                  onClick={() => handleCall("video")}
                >
                  <i className="ri-vidicon-line shrink-0 text-base" />
                  <span className="whitespace-nowrap">Video</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
        </div>
      </div>

      {/* ── New chat / New group modal ── */}
      {showNewChat && (
        <div className={chatStyles.modalBackdrop} onClick={() => setShowNewChat(false)} role="presentation">
          <div
            className={chatStyles.modalPanel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="new-chat-title"
          >
            <div className={chatStyles.modalHead}>
              <h5 id="new-chat-title" className={chatStyles.modalTitle}>
                {newChatMode === "group" ? "New group" : "New chat"}
              </h5>
              <div className={chatStyles.modeSwitch} role="group" aria-label="Chat type">
                <button
                  type="button"
                  className={`${chatStyles.modeBtn} ${newChatMode === "direct" ? chatStyles.modeBtnActive : ""}`}
                  onClick={() => setNewChatMode("direct")}
                >
                  <i className="ri-chat-3-line me-1.5 align-middle" />
                  Direct
                </button>
                <button
                  type="button"
                  className={`${chatStyles.modeBtn} ${newChatMode === "group" ? chatStyles.modeBtnActive : ""}`}
                  onClick={() => setNewChatMode("group")}
                >
                  <i className="ri-group-2-line me-1.5 align-middle" />
                  Group
                </button>
              </div>
            </div>
            <div className={chatStyles.modalBody}>
              {newChatMode === "group" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-defaulttextcolor/80 mb-1.5">Group name</label>
                  <input
                    className="form-control rounded-lg"
                    placeholder="Enter group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-defaulttextcolor/80 mb-1.5" htmlFor="new-chat-user-search">
                  Add participants
                </label>
                <div className={chatStyles.addSearchShell}>
                  <input
                    id="new-chat-user-search"
                    className={chatStyles.addSearchInput}
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchUsers())}
                  />
                  <button
                    type="button"
                    className={chatStyles.addSearchSubmit}
                    onClick={handleSearchUsers}
                    aria-label="Search users"
                  >
                    <i className="ri-search-line text-lg leading-none" />
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-defaulttextcolor/60 mb-2">
                  {newChatMode === "group"
                    ? "Select at least one user. Click a user to toggle selection."
                    : "Click a user to start a chat."}
                </p>
                <ul className={chatStyles.userPickList}>
                  {searchResults.length === 0 ? (
                    <li className="py-8 text-center text-defaulttextcolor/60 text-sm px-3">
                      {userSearch.trim() ? "No users found. Try a different search." : "Search for users to add."}
                    </li>
                  ) : (
                    searchResults.map((u) => {
                      const uid = (u as any).id || (u as any)._id;
                      const isSelected = selectedUserIds.has(String(uid));
                      return (
                        <li
                          key={uid}
                          className={`${chatStyles.userPickItem} ${
                            newChatMode === "group" && isSelected ? chatStyles.userPickSelected : ""
                          }`}
                          onClick={() =>
                            newChatMode === "group" ? toggleUserForGroup(String(uid)) : handleStartChat(u)
                          }
                        >
                          {newChatMode === "group" && (
                            <span
                              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected ? "bg-primary border-primary" : "border-defaultborder dark:border-white/20"
                              }`}
                            >
                              {isSelected && <i className="ri-check-line text-white text-xs" />}
                            </span>
                          )}
                          <span className="avatar avatar-sm avatar-rounded flex-shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=40`} alt="" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="mb-0 font-medium truncate">{u.name}</p>
                            <p className="text-[0.75rem] text-defaulttextcolor/60 truncate">{u.email}</p>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
            <div className={chatStyles.modalFoot}>
              <button
                type="button"
                className="ti-btn ti-btn-outline-secondary rounded-lg"
                onClick={() => setShowNewChat(false)}
              >
                Cancel
              </button>
              {newChatMode === "group" && (
                <button
                  type="button"
                  className="ti-btn ti-btn-primary rounded-lg min-w-[140px]"
                  onClick={handleCreateGroup}
                  disabled={selectedUserIds.size < 1 || creatingGroup}
                >
                  {creatingGroup ? (
                    <>
                      <i className="ri-loader-4-line animate-spin me-1.5" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="ri-add-circle-line me-1.5" />
                      Create Group {selectedUserIds.size > 0 && `(${selectedUserIds.size})`}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Image preview lightbox ── */}
      {imagePreview && (
        <div
          className={chatStyles.lightbox}
          onClick={() => setImagePreview(null)}
          role="presentation"
        >
          <img
            src={imagePreview}
            alt="Preview"
            className={chatStyles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;
