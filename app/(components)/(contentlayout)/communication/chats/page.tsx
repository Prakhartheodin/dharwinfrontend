"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import {
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
  getActiveCallForConversation,
  getCallsForConversation,
  deleteMessage,
  forwardMessage,
  reactToMessage,
  setMessagePinned,
  listPinnedMessages,
  uploadChatFiles,
  deleteConversation as deleteConversationApi,
  setConversationPreferences,
  type ChatCall,
  type Conversation,
  type Message,
} from "@/shared/lib/api/chat";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useChatSocket } from "@/shared/contexts/ChatSocketContext";
import { useAuth } from "@/shared/contexts/auth-context";
import { format, formatDistanceToNow } from "date-fns";
import chatStyles from "./chats.module.scss";
import {
  myReactionEmoji,
  reactionToggleEmoji,
  splitTextLinks,
  conversationPreviewText,
  conversationPreviewAfterDelete,
  findMentionToken,
  insertMentionText,
  callStatusLabel,
  timelineCallPillText,
  callsTabHeadline,
  callJoinedParticipantsLine,
  groupReactions,
  applyReactionLocally,
  mentionsForSend,
  type PickedMention,
} from "./_utils/chatHelpers";
import { ReceiptTick } from "./_components/ReceiptTick";
import { VoiceNotePlayer } from "./_components/VoiceNotePlayer";
import {
  applyReceiptEvent,
  messageTickStatus,
  upgradeTickStatus,
  type TickStatus,
} from "./_lib/chatReceipts";
import { ChatToast, useChatToast } from "./_components/ChatToast";
import EmailLookupPanel from "./_components/EmailLookupPanel";
import {
  deriveDirectoryScope,
  DIRECTORY_RBAC_FLAG,
} from "@/shared/lib/communication/directoryScope";
import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";
import ListPagination from "@/shared/components/ListPagination";
import { useDebouncedValue } from "@/app/(components)/(contentlayout)/communication/dialer/_lib/contactSearch";
import { CONVERSATIONS_PAGE_LIMIT, useConversationListPagination } from "./_hooks/useConversationListPagination";
import { useCallsListPagination } from "./_hooks/useCallsListPagination";
import {
  applyConversationListParams,
  CONVERSATION_SEARCH_MAX_LEN,
  parseConversationListPage,
  parseConversationListQ,
} from "./_lib/conversationListQuery";
import {
  applyConversationConvParam,
  conversationConvMatches,
  isConversationUnavailableError,
} from "./_lib/conversationConvQuery";
import {
  canSendVoicePreview,
  createVoicePreviewFromBlob,
  formatVoiceElapsed,
  revokeVoicePreviewUrl,
  pickRecorderMimeType,
  voiceFileExtension,
  voiceNoteBelongsTo,
  VOICE_NOTE_MAX_MS,
  VOICE_NOTE_WARN_REMAINING_MS,
  type VoiceNotePreview,
} from "./_lib/voiceNotePreview";
import {
  selectedMemberChipEntries,
  toggleSelectedMemberChip,
} from "./_lib/groupCreateChips";
import {
  buildCallsListSearch,
  parseCallsListQuery,
  CALLS_TAB_SEARCH_DEBOUNCE_MS,
  callsSearchParam,
} from "./_lib/callsListQuery";

const DEFAULT_AVATAR = "/assets/images/faces/1.jpg";

/** Message body text with bare URLs turned into real anchors. */
const MessageText = ({ text, className }: { text: string; className?: string }) => (
  <p className={className}>
    {splitTextLinks(text).map((s, i) =>
      s.href ? (
        <a
          key={i}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={(e) => e.stopPropagation()}
        >
          {s.text}
        </a>
      ) : (
        <span key={i}>{s.text}</span>
      )
    )}
  </p>
);

type DeleteConfirmMode = "me" | "everyone" | "chat";

function getDeleteConfirmCopy(mode: DeleteConfirmMode, isGroup: boolean) {
  if (mode === "me") {
    return {
      title: "Remove message?",
      message: "This message will be removed from your view. Others can still see it.",
      confirmLabel: "Remove",
    };
  }
  if (mode === "everyone") {
    return {
      title: "Delete for everyone?",
      message: "This message will be removed for all participants. This can't be undone.",
      confirmLabel: "Delete",
    };
  }
  if (isGroup) {
    return {
      title: "Delete group chat?",
      message: "This group chat will be permanently deleted for everyone. This can't be undone.",
      confirmLabel: "Delete chat",
    };
  }
  return {
    title: "Delete chat?",
    message: "This chat will be removed for both participants.",
    confirmLabel: "Delete chat",
  };
}

const getId = (x: { id?: string; _id?: string } | null | undefined) =>
  x && (x.id || (x as any)._id?.toString?.());

/** Viewer-only mute switch shared by the contact and group info panels. */
function MuteToggle({ muted, busy, onToggle }: { muted: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={muted}
      disabled={busy}
      onClick={onToggle}
      className={chatStyles.muteRow}
    >
      <span className="flex min-w-0 items-center gap-2">
        <i className={muted ? "ri-notification-off-line" : "ri-notification-3-line"} aria-hidden />
        <span className="truncate">Mute notifications</span>
      </span>
      <span className={`${chatStyles.muteSwitch} ${muted ? chatStyles.muteSwitchOn : ""}`} aria-hidden>
        <span className={chatStyles.muteSwitchKnob} />
      </span>
    </button>
  );
}

function GroupInfoPanel({
  conversation,
  loading,
  myId,
  onlineUsers,
  onRefresh,
  onClose,
  onLeave,
  onCall,
  muted,
  muteBusy,
  onToggleMute,
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
  muted: boolean;
  muteBusy: boolean;
  onToggleMute: () => void;
  addMemberSearch: string;
  setAddMemberSearch: (v: string) => void;
  addMemberResults: { id: string; name: string; email?: string }[];
  setAddMemberResults: (v: { id: string; name: string; email?: string }[]) => void;
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

      <PerfectScrollbar className={chatStyles.groupInfoScroll}>
        <div className="mb-4">
          <MuteToggle muted={muted} busy={muteBusy} onToggle={onToggleMute} />
        </div>
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
  const router = useRouter();
  const pathname = usePathname();
  const listPage = parseConversationListPage(searchParams.get("page"));
  const listQ = parseConversationListQ(searchParams.get("q"));
  const replaceListParams = useCallback(
    (next: { page: number; q: string }) => {
      const params = applyConversationListParams(searchParams, next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const writeConvParam = useCallback(
    (convId: string | null, history: "push" | "replace") => {
      if (conversationConvMatches(searchParams, convId)) return;
      const params = applyConversationConvParam(searchParams, convId);
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (history === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const replaceConvParam = useCallback(
    (convId: string | null) => writeConvParam(convId, "replace"),
    [writeConvParam]
  );
  const pushConvParam = useCallback(
    (convId: string | null) => writeConvParam(convId, "push"),
    [writeConvParam]
  );
  const callsListQuery = useMemo(() => parseCallsListQuery(searchParams), [searchParams]);
  const replaceCallsQuery = useCallback(
    (patch: Partial<ReturnType<typeof parseCallsListQuery>>) => {
      const qs = buildCallsListSearch(searchParams, patch);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const { user, permissions, permissionsLoaded } = useAuth();
  const rbacFlag = useFeatureFlag(DIRECTORY_RBAC_FLAG);
  const scope = useMemo(
    () => deriveDirectoryScope(permissions, rbacFlag),
    [permissions, rbacFlag]
  );
  const scopeReady = permissionsLoaded;
  const {
    joinConversation,
    leaveConversation,
    onNewMessage,
    onConversationUpdated,
    onConversationDeleted,
    onCallEnded,
    onMessageDeleted,
    onMessageReacted,
    onMessagePinned,
    onTyping,
    onMessagesRead,
    // FE-B contract (ChatSocketContext): delivery receipts, membership removal, reconnect.
    onMessageDelivered,
    onConversationDelivered,
    onConversationRemoved,
    onReconnected,
    emitTyping,
    emitMessageRead,
    onlineUsers,
    syncOnlineUsers,
    emitCallInitiate,
    prepareCallWindow,
  } = useChatSocket();

  const [activeTab, setActiveTab] = useState<"recent" | "groups" | "calls">("recent");
  const [groupsTabEnabled, setGroupsTabEnabled] = useState(false);
  const {
    conversations,
    setConversations,
    loading: conversationsLoading,
    total: conversationsTotal,
    totalPages: conversationsTotalPages,
    refresh: refreshConversations,
  } = useConversationListPagination(undefined, true, { page: listPage, q: listQ });
  const {
    conversations: groupConversations,
    setConversations: setGroupConversations,
    loading: groupLoading,
    total: groupTotal,
    totalPages: groupTotalPages,
    refresh: refreshGroups,
  } = useConversationListPagination("group", groupsTabEnabled, { page: listPage, q: listQ });
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  /**
   * True when the open chat was entered by a push from the bare list (no `?conv=` before it), so
   * the in-app back button can pop that entry instead of stacking a new one (R2/R3).
   */
  const enteredFromListRef = useRef(false);
  /** Explicit user choice (list click, new chat): push so browser Back returns to where they were. */
  const selectConversation = useCallback(
    (c: Conversation) => {
      const id = getId(c) || null;
      const current = searchParams.get("conv");
      setSelectedConversation(c);
      if (current === id) return; // re-clicking the open chat is not a navigation
      enteredFromListRef.current = !current;
      pushConvParam(id);
    },
    [pushConvParam, searchParams]
  );
  /**
   * Programmatic deselect (delete, leave, removed, socket): REPLACE so Back never lands on a dead
   * `?conv=` (R4/R5).
   */
  const deselectConversation = useCallback(() => {
    enteredFromListRef.current = false;
    setSelectedConversation(null);
    replaceConvParam(null);
  }, [replaceConvParam]);
  /** In-app back button (mobile/tablet): pop our own push when we made one, else replace. */
  const backToList = useCallback(() => {
    if (enteredFromListRef.current && typeof window !== "undefined" && window.history.length > 1) {
      enteredFromListRef.current = false;
      router.back();
      return;
    }
    deselectConversation();
  }, [router, deselectConversation]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [convCalls, setConvCalls] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [mentionToken, setMentionToken] = useState<{ start: number; end: number; query: string } | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callSearchDraft, setCallSearchDraft] = useState(callsListQuery.callQ);
  const {
    calls,
    totalPages: callsTotalPages,
    total: callsTotal,
    loading: callsLoading,
    error: callsError,
    refresh: refreshCalls,
  } = useCallsListPagination({
    enabled: activeTab === "calls",
    page: callsListQuery.callPage,
    q: callsListQuery.callQ,
  });
  const [showNewChat, setShowNewChat] = useState(false);
  const [conversationSearch, setConversationSearch] = useState(listQ);
  const [newChatMode, setNewChatMode] = useState<"direct" | "group">("direct");
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedUserLabels, setSelectedUserLabels] = useState<Record<string, string>>({});
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
  const [messageMenuFor, setMessageMenuFor] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [forwardTargets, setForwardTargets] = useState<Set<string>>(new Set());
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const closeForwardModal = useCallback(() => {
    setForwardingMessage(null);
    setForwardTargets(new Set());
    setForwardSearch("");
  }, []);

  const [deleteConfirm, setDeleteConfirm] = useState<{ mode: DeleteConfirmMode; messageId?: string } | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const deleteConfirmCancelRef = useRef<HTMLButtonElement>(null);

  const closeDeleteConfirm = useCallback(() => {
    if (deletingMessage || deletingChat) return;
    setDeleteConfirm(null);
  }, [deletingMessage, deletingChat]);

  const executeDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const cid = getId(selectedConversation);
    if (!cid) return;

    if (deleteConfirm.mode === "chat") {
      setDeletingChat(true);
      setError(null);
      try {
        await deleteConversationApi(cid);
        setDeleteConfirm(null);
        deselectConversation();
        setIsOpen(false);
        await fetchConversations();
      } catch (e: any) {
        const message = e?.response?.data?.message || "Failed to delete chat.";
        setError(message);
      } finally {
        setDeletingChat(false);
      }
      return;
    }

    const mid = deleteConfirm.messageId;
    if (!mid) return;
    setDeletingMessage(true);
    try {
      if (deleteConfirm.mode === "me") {
        await deleteMessage(cid, mid, "me");
        setMessages((prev) => prev.filter((x) => String((x as any).id || (x as any)._id) !== mid));
      } else {
        await deleteMessage(cid, mid, "everyone");
        const deletedMsg = messages.find((x) => String((x as any).id || (x as any)._id) === mid);
        setMessages((prev) =>
          prev.map((x) =>
            String((x as any).id || (x as any)._id) === mid
              ? {
                  ...x,
                  deletedAt: new Date().toISOString(),
                  deletedFor: "everyone" as const,
                  content: "",
                  attachments: [],
                  reactions: [],
                }
              : x
          )
        );
        if (deletedMsg) {
          const preview = conversationPreviewAfterDelete(messages, mid, deletedMsg);
          setConversations((prev) =>
            prev.map((c) => (getId(c) === cid ? { ...c, lastMessage: preview } : c))
          );
        }
      }
      // A deleted message can no longer be pinned; the server drops it from the pinned list.
      void fetchPinnedMessages(cid);
      setDeleteConfirm(null);
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Could not delete message.");
    } finally {
      setDeletingMessage(false);
    }
  };
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const messageMenuRef = useRef<HTMLSpanElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voicePreview, setVoicePreview] = useState<VoiceNotePreview | null>(null);
  const [voiceElapsedMs, setVoiceElapsedMs] = useState(0);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceSending, setVoiceSending] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef<number>(0);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceSendLockRef = useRef(false);
  /** Conversation the in-flight recording belongs to (captured at start, R1). */
  const voiceConvIdRef = useRef<string | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  /** Set by Cancel: the next onstop drops the blob instead of opening a preview. */
  const voiceDiscardOnStopRef = useRef(false);
  const [voiceStarting, setVoiceStarting] = useState(false);
  const voiceStartingRef = useRef(false);
  const [muteBusy, setMuteBusy] = useState(false);
  const [pickedMentions, setPickedMentions] = useState<PickedMention[]>([]);
  const [groupInfoData, setGroupInfoData] = useState<Conversation | null>(null);
  const [groupInfoLoading, setGroupInfoLoading] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [addMemberResults, setAddMemberResults] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [addMemberSelected, setAddMemberSelected] = useState<Set<string>>(new Set());
  const [dismissedCallNotificationPrompt, setDismissedCallNotificationPrompt] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!sessionStorage.getItem("chats-call-notification-prompt-dismissed");
  });

  const { toast, showToast } = useChatToast();

  const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const autoResizeComposer = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`; // ~5 rows, then internal scroll
  };
  const clearMentionState = useCallback(() => {
    setMentionToken(null);
    setMentionActiveIndex(0);
  }, []);
  const refreshMentionState = useCallback(
    (value: string, caret: number | null | undefined) => {
      if (!selectedConversation || selectedConversation.type !== "group") {
        clearMentionState();
        return;
      }
      const next = findMentionToken(value, typeof caret === "number" ? caret : value.length);
      if (!next) {
        clearMentionState();
        return;
      }
      setMentionToken(next);
      setMentionActiveIndex(0);
    },
    [selectedConversation, clearMentionState]
  );
  const applyMention = useCallback(
    (member: { id: string; name: string }) => {
      if (!mentionToken) return;
      const { value, caret } = insertMentionText(
        messageInput,
        { start: mentionToken.start, end: mentionToken.end },
        member.name
      );
      setMessageInput(value);
      setPickedMentions((prev) => [...prev, { userId: member.id, displayName: member.name.trim() }]);
      clearMentionState();
      requestAnimationFrame(() => {
        const el = composerRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(caret, caret);
        autoResizeComposer(el);
      });
    },
    [mentionToken, messageInput, clearMentionState]
  );
  const typingDisplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const chatContainerRef = useRef<HTMLElement | null>(null);
  /** Set true right before prepending older messages so the auto-scroll effect
      doesn't yank the view back to the bottom (preserve the reader's position). */
  const skipAutoScrollRef = useRef(false);
  const conversationListScrollRef = useRef<HTMLDivElement | null>(null);
  const skipSearchInputSyncRef = useRef(false);

  const myId = (user as any)?.id || (user as any)?._id?.toString?.();
  const mentionSuggestions = useMemo(() => {
    if (!mentionToken || !selectedConversation || selectedConversation.type !== "group") return [];
    const query = mentionToken.query.trim().toLowerCase();
    const seen = new Set<string>();
    const members = ((selectedConversation.participants || []) as any[])
      .map((p) => {
        const raw = (p.user as any) || {};
        const id = raw.id || raw._id?.toString?.();
        const name = (raw.name || "").trim();
        const email = (raw.email || "").trim();
        if (!id || !name) return null;
        if (myId && String(id) === String(myId)) return null;
        const key = String(id);
        if (seen.has(key)) return null;
        seen.add(key);
        return { id: key, name, email };
      })
      .filter(Boolean) as Array<{ id: string; name: string; email: string }>;

    if (!query) return members.slice(0, 8);
    return members
      .filter((member) =>
        member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [mentionToken, selectedConversation, myId]);

  useEffect(() => {
    clearMentionState();
  }, [selectedConversation, clearMentionState]);

  const fetchConversations = useCallback(async () => {
    await Promise.all([
      refreshConversations(),
      groupsTabEnabled ? refreshGroups() : Promise.resolve(),
    ]);
  }, [refreshConversations, refreshGroups, groupsTabEnabled]);

  const debouncedConversationSearch = useDebouncedValue(conversationSearch, 300);

  useEffect(() => {
    if (skipSearchInputSyncRef.current) {
      skipSearchInputSyncRef.current = false;
      return;
    }
    setConversationSearch(listQ);
  }, [listQ]);

  useEffect(() => {
    const nextQ = parseConversationListQ(debouncedConversationSearch);
    if (nextQ === listQ) return;
    skipSearchInputSyncRef.current = true;
    replaceListParams({ page: 1, q: nextQ });
  }, [debouncedConversationSearch, listQ, replaceListParams]);

  useEffect(() => {
    setCallSearchDraft(callsListQuery.callQ);
  }, [callsListQuery.callQ]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const nextQ = callSearchDraft.trim();
      if (nextQ === callsListQuery.callQ) return;
      replaceCallsQuery({ callQ: nextQ, callPage: 1 });
    }, CALLS_TAB_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [callSearchDraft, callsListQuery.callQ, replaceCallsQuery]);

  // ── Auto-scroll to bottom ──
  // Double rAF: the merged timeline (messages + call pills + date separators)
  // and PerfectScrollbar settle layout across two frames, so a single rAF can
  // fire before scrollHeight is final and leave us short of the latest message.
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = chatContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }, []);

  /**
   * The conversation currently on screen, readable from async callbacks. Every async result that
   * writes into the thread (fetch, send, upload, voice) checks it so a late response for chat A
   * never lands in chat B.
   */
  const openConvIdRef = useRef<string | null>(null);
  openConvIdRef.current = getId(selectedConversation) || null;
  const fetchSeqRef = useRef(0);

  // ── Fetch helpers ──
  const fetchMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    const seq = ++fetchSeqRef.current;
    const isStale = () => seq !== fetchSeqRef.current || openConvIdRef.current !== convId;
    setLoadingMessages(true);
    setHasMoreMessages(true);
    try {
      const [msgs, calls] = await Promise.all([
        getMessages(convId, { limit: 50 }),
        getCallsForConversation(convId, { limit: 50 }),
      ]);
      if (isStale()) return;
      setMessages(msgs || []);
      setConvCalls(calls || []);
      setHasMoreMessages((msgs || []).length >= 50);
      // Only a visible tab has "read" anything; a background refetch must not clear unread.
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        await markAsRead(convId).catch(() => {});
      }
    } catch {
      if (isStale()) return;
      setMessages([]);
      setConvCalls([]);
    } finally {
      if (seq === fetchSeqRef.current) setLoadingMessages(false);
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
      if (openConvIdRef.current !== cid) return;
      if ((older || []).length < 50) setHasMoreMessages(false);
      skipAutoScrollRef.current = true;
      setMessages((prev) => [...(older || []), ...prev]);
    } catch {
      setHasMoreMessages(false);
    } finally {
      setLoadingOlder(false);
    }
  }, [selectedConversation, loadingOlder, hasMoreMessages, messages]);

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
    if (activeTab === "groups") {
      setGroupsTabEnabled(true);
    }
  }, [activeTab]);

  useEffect(() => {
    setSelectedConversation((sel) => {
      if (!sel) return sel;
      const sid = getId(sel);
      const found =
        conversations.find((c) => getId(c) === sid) ||
        groupConversations.find((c) => getId(c) === sid);
      return found ?? sel;
    });
  }, [conversations, groupConversations]);

  // URL `?conv=` is canonical: apply deep links (direct + group), do not snap back after select.
  // Runs only when the conv VALUE changes — list refreshes must not re-fetch a conversation that
  // is not on the current list page. Lists are read through refs for the same reason.
  const convParam = (searchParams.get("conv") || "").trim();
  const listsRef = useRef({ conversations, groupConversations });
  listsRef.current = { conversations, groupConversations };
  const replaceConvParamRef = useRef(replaceConvParam);
  replaceConvParamRef.current = replaceConvParam;
  const prevConvParamRef = useRef<string | null>(null);
  useEffect(() => {
    const prevConv = prevConvParamRef.current;
    prevConvParamRef.current = convParam || null;

    if (!convParam) {
      // Only clear when the URL actually dropped `conv` (back/forward), not while replace is in flight.
      if (prevConv) setSelectedConversation(null);
      return;
    }
    if (openConvIdRef.current === convParam) return;

    const { conversations: convs, groupConversations: groups } = listsRef.current;
    const found =
      convs.find((x) => getId(x) === convParam) || groups.find((x) => getId(x) === convParam);
    if (found) {
      setSelectedConversation(found);
      return;
    }

    // Not blacklisted on failure: the next explicit navigation to this id tries again.
    let cancelled = false;
    getConversation(convParam)
      .then((conv) => {
        if (cancelled || !conv) return;
        setSelectedConversation(conv);
      })
      .catch((err) => {
        if (cancelled) return;
        setSelectedConversation(null);
        if (isConversationUnavailableError(err)) {
          showToast("This conversation isn't available.");
          replaceConvParamRef.current(null);
        } else {
          showToast("Couldn't open this conversation. Check your connection and try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [convParam, showToast]);

  const convId = getId(selectedConversation);

  // Pins are conversation-wide and can point at a message far older than the loaded page,
  // so they are their own fetch rather than something derived from `messages`.
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);

  const fetchPinnedMessages = useCallback(async (cid: string) => {
    if (!cid) {
      setPinnedMessages([]);
      return;
    }
    try {
      const pins = await listPinnedMessages(cid);
      if (openConvIdRef.current === cid) setPinnedMessages(pins);
    } catch {
      // A failed pin fetch must not blank the thread — the banner just stays hidden.
      if (openConvIdRef.current === cid) setPinnedMessages([]);
    }
  }, []);

  useEffect(() => {
    setPinnedCollapsed(false);
    fetchPinnedMessages(convId);
  }, [convId, fetchPinnedMessages]);

  useEffect(() => {
    const unsub = onMessagePinned((data) => {
      if (!data.conversationId || String(data.conversationId) !== String(convId)) return;
      fetchPinnedMessages(convId);
      setMessages((prev) =>
        prev.map((m) => {
          const id = String((m as any).id || (m as any)._id);
          if (id !== String(data.messageId)) return m;
          return { ...m, pinnedAt: data.pinned ? new Date().toISOString() : null };
        })
      );
    });
    return unsub;
  }, [onMessagePinned, convId, fetchPinnedMessages]);

  /**
   * Backend authority: groups allow admins only, direct chats allow either party. Mirrored here
   * so the action is hidden rather than offered and then rejected.
   */
  const canPinInConversation = (c: Conversation | null) => {
    if (!c) return false;
    return c.type === "group" ? isGroupAdmin(c) : true;
  };

  const handleTogglePin = async (messageId: string, pinned: boolean) => {
    if (!convId || pinBusy) return;
    setPinBusy(true);
    try {
      await setMessagePinned(convId, messageId, pinned);
      await fetchPinnedMessages(convId);
      showToast(pinned ? "Message pinned." : "Message unpinned.");
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Could not update pin.");
    } finally {
      setPinBusy(false);
    }
  };

  useEffect(() => {
    if (!selectedConversation) setIsOpen(false);
  }, [selectedConversation]);

  // Pin to the latest message whenever a conversation finishes loading
  // (fires on open / conversation switch, not on every new message).
  useEffect(() => {
    if (!convId || loadingMessages) return;
    scrollToBottom();
  }, [convId, loadingMessages, scrollToBottom]);

  // Follow new sent/received messages — but skip when older messages were just
  // prepended (load-older preserves the reader's scroll position).
  useEffect(() => {
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reply quote / pinned bar → scroll to the original and flash it. Declared after the auto-scroll
  // effect so a jump that prepended history wins over scroll-to-bottom.
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);
  const [flashMessageId, setFlashMessageId] = useState<string | null>(null);
  useEffect(() => {
    if (!jumpTargetId) return;
    const container = chatContainerRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(jumpTargetId)}"]`);
    setJumpTargetId(null);
    if (!container || !el) return;
    // Drive the PerfectScrollbar container directly (like scrollToBottom). scrollIntoView also scrolls
    // outer ancestors, and PS's re-render update interrupts a native smooth scroll.
    const from = container.scrollTop;
    const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    const to = Math.max(
      0,
      Math.min(
        from + offset - (container.clientHeight - el.offsetHeight) / 2,
        container.scrollHeight - container.clientHeight
      )
    );
    setFlashMessageId(jumpTargetId);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || Math.abs(to - from) < 2) {
      container.scrollTop = to;
      return;
    }
    const start = performance.now();
    const DURATION = 350;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      container.scrollTop = from + (to - from) * (1 - Math.pow(1 - t, 4)); // ease-out-quart
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [jumpTargetId, messages]);

  useEffect(() => {
    if (!flashMessageId) return;
    const t = setTimeout(() => setFlashMessageId(null), 1600);
    return () => clearTimeout(t);
  }, [flashMessageId]);

  const jumpToMessage = useCallback(
    async (targetId?: string) => {
      const cid = getId(selectedConversation);
      const id = String(targetId || "");
      if (!cid || !id) return;
      const idOf = (m: Message) => String((m as any).id || (m as any)._id || "");
      if (messages.some((m) => idOf(m) === id)) {
        setJumpTargetId(id);
        return;
      }
      // ponytail: pages back 50 at a time, capped at 10 pages (500 msgs); a server "around id"
      // query is the upgrade if older jumps become common.
      const older: Message[] = [];
      let oldestId = messages.length ? idOf(messages[0]) : "";
      let more = hasMoreMessages;
      let found = false;
      try {
        for (let page = 0; page < 10 && more && oldestId && !found; page++) {
          const batch = (await getMessages(cid, { before: oldestId, limit: 50 })) || [];
          if (openConvIdRef.current !== cid) return;
          if (batch.length < 50) more = false;
          older.unshift(...batch);
          oldestId = batch.length ? idOf(batch[0]) : "";
          found = batch.some((m) => idOf(m) === id);
        }
      } catch {
        /* fall through with whatever loaded */
      }
      if (older.length) {
        skipAutoScrollRef.current = true;
        setMessages((prev) => [...older, ...prev]);
      }
      if (!more) setHasMoreMessages(false);
      if (found) setJumpTargetId(id);
      else showToast("That message isn't available anymore.");
    },
    [selectedConversation, messages, hasMoreMessages, showToast]
  );

  useEffect(() => {
    const onFocus = () => {
      fetchConversations();
      if (convId) fetchMessages(convId);
    };
    // Messages that arrived while the tab was hidden stay unread until it is actually visible.
    const onVisibility = () => {
      if (document.visibilityState !== "visible" || !convId) return;
      emitMessageRead(convId);
      fetchConversations();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [convId, fetchConversations, fetchMessages, emitMessageRead]);

  useEffect(() => {
    setPickedMentions([]);
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

  // After a socket reconnect the context re-joins the room, but anything sent while we were
  // disconnected never arrived: refetch the open thread and the list.
  useEffect(() => {
    return onReconnected(() => {
      const cid = openConvIdRef.current;
      if (cid) fetchMessages(cid);
      fetchConversations();
    });
  }, [onReconnected, fetchMessages, fetchConversations]);

  useEffect(() => {
    const userIds = [...conversations, ...groupConversations]
      .flatMap((conversation) =>
        (conversation.participants || []).map((participant) =>
          String((participant.user as any)?.id || (participant.user as any)?._id || "").trim()
        )
      )
      .filter(Boolean);
    if (userIds.length > 0) {
      syncOnlineUsers(userIds);
    }
  }, [conversations, groupConversations, syncOnlineUsers]);

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
        // A hidden tab has not read it; visibilitychange marks it read when the user comes back.
        if (document.visibilityState === "visible") emitMessageRead(convId);
      }
      fetchConversations();
    });
    return unsub;
  }, [onNewMessage, convId, fetchConversations, emitMessageRead]);

  // Conversation updated (for persistence across users)
  useEffect(() => {
    const unsub = onConversationUpdated((data) => {
      if (data?.conversationId && data.lastMessage) {
        const lastMessage = data.lastMessage as Conversation["lastMessage"];
        setConversations((prev) =>
          prev.map((c) =>
            getId(c) === String(data.conversationId) ? { ...c, lastMessage } : c
          )
        );
        setGroupConversations((prev) =>
          prev.map((c) =>
            getId(c) === String(data.conversationId) ? { ...c, lastMessage } : c
          )
        );
      } else {
        fetchConversations();
      }
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
      setGroupConversations((prev) => prev.filter((c) => getId(c) !== deletedId));
      if (openConvIdRef.current === deletedId) {
        setIsOpen(false);
        deselectConversation();
      }
    });
    return unsub;
  }, [onConversationDeleted, deselectConversation]);

  // Removed from a group by an admin: drop it from the lists and close it if it is open.
  useEffect(() => {
    return onConversationRemoved((data) => {
      const removedId = data?.conversationId && String(data.conversationId);
      if (!removedId) return;
      setConversations((prev) => prev.filter((c) => getId(c) !== removedId));
      setGroupConversations((prev) => prev.filter((c) => getId(c) !== removedId));
      if (openConvIdRef.current === removedId) {
        setIsOpen(false);
        deselectConversation();
        showToast("You're no longer a member of this conversation.");
      }
    });
  }, [onConversationRemoved, deselectConversation, showToast, setConversations, setGroupConversations]);

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

  // ── Receipts (delivered / read) ──
  // Thread: push normalized {user, at} receipts onto my messages. List: 1:1 rows update their
  // lastMessage tick in place; group rows need every member, so they refetch (debounced).
  const listRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;
  useEffect(
    () => () => {
      if (listRefreshTimerRef.current) clearTimeout(listRefreshTimerRef.current);
    },
    []
  );
  const bumpListTick = useCallback(
    (conversationId: string, userId: string, status: TickStatus, messageIds?: string[]) => {
      if (!conversationId || !userId || !myId || String(userId) === String(myId)) return;
      const { conversations: convs, groupConversations: groups } = listsRef.current;
      const row = [...convs, ...groups].find((c) => getId(c) === String(conversationId));
      const lm = row?.lastMessage;
      if (!row || !lm?.senderId || String(lm.senderId) !== String(myId)) return;
      if (messageIds?.length && lm.id && !messageIds.map(String).includes(String(lm.id))) return;
      if (row.type === "group") {
        if (listRefreshTimerRef.current) clearTimeout(listRefreshTimerRef.current);
        listRefreshTimerRef.current = setTimeout(() => void fetchConversationsRef.current(), 800);
        return;
      }
      const update = (prev: Conversation[]) =>
        prev.map((c) => {
          if (getId(c) !== String(conversationId) || !c.lastMessage) return c;
          const next = upgradeTickStatus(c.lastMessage.status, status);
          return next === c.lastMessage.status ? c : { ...c, lastMessage: { ...c.lastMessage, status: next } };
        });
      setConversations(update);
      setGroupConversations(update);
    },
    [myId, setConversations, setGroupConversations]
  );

  useEffect(() => {
    const unsub = onMessagesRead((data) => {
      const d = data as { conversationId: string; userId: string; readAt?: string; messageIds?: string[] };
      if (String(d.conversationId) === String(convId)) {
        setMessages((prev) =>
          applyReceiptEvent(prev, { kind: "read", userId: d.userId, at: d.readAt, messageIds: d.messageIds })
        );
      }
      bumpListTick(d.conversationId, d.userId, "read", d.messageIds);
    });
    return unsub;
  }, [onMessagesRead, convId, bumpListTick]);

  useEffect(() => {
    const offMessage = onMessageDelivered((d) => {
      if (String(d.conversationId) === String(convId)) {
        setMessages((prev) =>
          applyReceiptEvent(prev, { kind: "delivered", userId: d.userId, at: d.at, messageIds: d.messageIds })
        );
      }
      bumpListTick(d.conversationId, d.userId, "delivered", d.messageIds);
    });
    const offConversation = onConversationDelivered((d) => {
      if (String(d.conversationId) === String(convId)) {
        setMessages((prev) => applyReceiptEvent(prev, { kind: "delivered", userId: d.userId, at: d.at }));
      }
      bumpListTick(d.conversationId, d.userId, "delivered");
    });
    return () => {
      offMessage();
      offConversation();
    };
  }, [onMessageDelivered, onConversationDelivered, convId, bumpListTick]);

  // Active call for rejoin bar
  useEffect(() => {
    fetchActiveCallForConv(convId);
    const interval = setInterval(() => fetchActiveCallForConv(convId), 8000);
    return () => clearInterval(interval);
  }, [convId, fetchActiveCallForConv]);

  // Fetch group info when opening panel for a group
  // Keyed on the id, not the object: list refreshes and the mute toggle replace the object and
  // must not re-fetch (and flash a spinner in) an already-open panel.
  const selectedType = selectedConversation?.type;
  useEffect(() => {
    if (!isOpen || !convId || selectedType !== "group") {
      setGroupInfoData(null);
      return;
    }
    let cancelled = false;
    setGroupInfoLoading(true);
    getConversation(convId)
      .then((data) => {
        if (!cancelled) setGroupInfoData(data);
      })
      .catch(() => {
        if (!cancelled) setGroupInfoData(null);
      })
      .finally(() => {
        if (!cancelled) setGroupInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, convId, selectedType]);

  // call_ended: clear active call for that conversation
  useEffect(() => {
    const unsub = onCallEnded((data) => {
      if (data.conversationId && String(data.conversationId) === String(convId)) {
        setActiveCallForConv(null);
        fetchMessages(convId);
      }
      refreshCalls();
    });
    return unsub;
  }, [onCallEnded, convId, refreshCalls, fetchMessages]);

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
      if (data.deleteFor === "everyone") {
        fetchConversations();
      }
      if (data.conversationId && String(data.conversationId) === String(convId) && data.deleteFor === "everyone") {
        setMessages((prev) =>
          prev.map((m) => {
            const id = String((m as any).id || (m as any)._id);
            if (id === String(data.messageId)) {
              return {
                ...m,
                deletedAt: new Date().toISOString(),
                deletedFor: "everyone" as const,
                content: "",
                attachments: [],
                reactions: [],
              };
            }
            return m;
          })
        );
        // The pinned bar may be showing the deleted message.
        fetchPinnedMessages(convId);
        setReactionPickerFor((cur) => (cur === String(data.messageId) ? null : cur));
      }
    });
    return unsub;
  }, [onMessageDeleted, convId, fetchConversations, fetchPinnedMessages]);

  // Group info panel state is per conversation: never carry a draft or pick-list across chats.
  useEffect(() => {
    setAddMemberSearch("");
    setAddMemberResults([]);
    setAddMemberSelected(new Set());
  }, [convId]);

  // Escape closes the topmost layer only.
  useEffect(() => {
    if (!imagePreview && !forwardingMessage && !deleteConfirm && !showNewChat && !isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (imagePreview) setImagePreview(null);
      else if (forwardingMessage) closeForwardModal();
      else if (deleteConfirm) closeDeleteConfirm();
      else if (showNewChat) closeNewChatModal();
      // A message menu / picker is above the panel; its own listener closes it first.
      else if (reactionPickerFor || messageMenuFor) return;
      else if (isOpen) setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeNewChatModal is recreated each render
  }, [
    imagePreview,
    forwardingMessage,
    deleteConfirm,
    showNewChat,
    isOpen,
    reactionPickerFor,
    messageMenuFor,
    closeForwardModal,
    closeDeleteConfirm,
  ]);

  useEffect(() => {
    if (!deleteConfirm) return;
    deleteConfirmCancelRef.current?.focus();
  }, [deleteConfirm]);

  // Overlay sheet (<1024px): move focus into the panel on open, hand it back to the opener on close.
  const sidePanelRef = useRef<HTMLDivElement>(null);
  const panelOpenerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const overlay = typeof window !== "undefined" && window.matchMedia("(max-width: 1023.98px)").matches;
    if (overlay) sidePanelRef.current?.focus();
    return () => {
      // By cleanup time the panel is unmounted, so focus has fallen back to <body>.
      if (overlay && (!document.activeElement || document.activeElement === document.body)) {
        panelOpenerRef.current?.focus();
      }
    };
  }, [isOpen]);

  // Close the reaction bar / message menu on outside-click or Escape.
  useEffect(() => {
    if (!reactionPickerFor && !messageMenuFor) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (reactionPickerRef.current?.contains(t) || messageMenuRef.current?.contains(t)) return;
      setReactionPickerFor(null);
      setMessageMenuFor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReactionPickerFor(null);
        setMessageMenuFor(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [reactionPickerFor, messageMenuFor]);

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
    const mentions =
      selectedConversation?.type === "group" ? mentionsForSend(content, pickedMentions) : [];
    try {
      const msg = await sendMessage(cid, content, {
        replyTo: replyingTo ? String((replyingTo as any).id || (replyingTo as any)._id) : undefined,
        ...(mentions.length ? { mentions } : {}),
      });
      fetchConversations();
      // Clear the composer only if it still holds what was sent (the user may have moved on).
      setMessageInput((cur) => (cur.trim() === content ? "" : cur));
      // The user may have switched chats while the request was in flight.
      if (openConvIdRef.current !== cid) return;
      setMessages((prev) => addMessageIfNew(prev, msg));
      setPickedMentions([]);
      clearMentionState();
      if (composerRef.current) composerRef.current.style.height = "auto";
      setReplyingTo(null);
    } catch {
      showToast("Message failed to send. Your text was kept — try again.");
    } finally {
      setSending(false);
    }
  };

  const CHAT_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

  const uploadErrorMessage = (err: unknown): string => {
    const data = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
    return data?.message || data?.error || "Upload failed. Try again.";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const cid = getId(selectedConversation);
    if (!files.length || !cid) return;
    const tooLarge = files.find((f) => f.size > CHAT_UPLOAD_MAX_BYTES);
    if (tooLarge) {
      showToast(`"${tooLarge.name}" is too large. Maximum 100MB per file.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const replyToId = replyingTo ? String((replyingTo as any).id || (replyingTo as any)._id) : undefined;
      const msg = await uploadChatFiles(cid, files, undefined, replyToId);
      fetchConversations();
      if (openConvIdRef.current === cid) {
        setMessages((prev) => addMessageIfNew(prev, msg));
        setReplyingTo(null);
      }
    } catch (err) {
      showToast(uploadErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearVoiceTimer = useCallback(() => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }, []);

  const discardVoicePreview = useCallback(() => {
    voiceSendLockRef.current = false;
    setVoiceSending(false);
    setVoicePlaying(false);
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current = null;
    }
    setVoicePreview((prev) => {
      revokeVoicePreviewUrl(prev?.objectUrl);
      return null;
    });
    setVoiceElapsedMs(0);
  }, []);

  const stopVoiceStream = useCallback(() => {
    voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
    voiceStreamRef.current = null;
  }, []);

  const stopVoiceNote = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      // isRecording / preview are resolved in onstop (it fires asynchronously).
      rec.stop();
    }
  }, []);

  /** Cancel while recording: stop the mic and throw the audio away (no preview). */
  const cancelVoiceRecording = useCallback(() => {
    voiceDiscardOnStopRef.current = true;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.stop();
      return;
    }
    clearVoiceTimer();
    stopVoiceStream();
    mediaRecorderRef.current = null;
    voiceConvIdRef.current = null;
    setIsRecording(false);
    setVoiceElapsedMs(0);
  }, [clearVoiceTimer, stopVoiceStream]);

  const startVoiceNote = useCallback(async () => {
    // Guard double-clicks: a second click while getUserMedia is pending would open a second mic.
    if (voiceStartingRef.current || mediaRecorderRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      showToast("Voice notes aren't supported in this browser.");
      return;
    }
    const cid = getId(selectedConversation);
    if (!cid || voiceSending) return;
    voiceStartingRef.current = true;
    setVoiceStarting(true);
    discardVoicePreview();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showToast("Microphone access is blocked. Allow it in your browser to record a voice note.");
      return;
    } finally {
      voiceStartingRef.current = false;
      setVoiceStarting(false);
    }
    // The user may have switched chats while the permission prompt was open.
    if (openConvIdRef.current !== cid) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    stopVoiceStream();
    voiceStreamRef.current = stream;
    const requestedMime = pickRecorderMimeType((m) => MediaRecorder.isTypeSupported(m));
    let recorder: MediaRecorder;
    try {
      recorder = requestedMime ? new MediaRecorder(stream, { mimeType: requestedMime }) : new MediaRecorder(stream);
    } catch {
      stopVoiceStream();
      showToast("Couldn't start recording. Try again.");
      return;
    }
    chunksRef.current = [];
    voiceConvIdRef.current = cid;
    voiceDiscardOnStopRef.current = false;
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    // Stop must NOT upload — hold blob for preview (Send uses upload once).
    recorder.onstop = () => {
      stopVoiceStream();
      clearVoiceTimer();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      const recordedIn = voiceConvIdRef.current;
      voiceConvIdRef.current = null;
      const discard = voiceDiscardOnStopRef.current;
      voiceDiscardOnStopRef.current = false;
      // Cancelled, or the user left the chat it was recorded in (R1): never surface it elsewhere.
      if (discard || !voiceNoteBelongsTo(recordedIn, openConvIdRef.current)) {
        chunksRef.current = [];
        setVoiceElapsedMs(0);
        return;
      }
      const elapsed = Math.max(0, Date.now() - voiceStartedAtRef.current);
      setVoiceElapsedMs(elapsed);
      // Use what the recorder actually produced, not what we asked for (Safari → audio/mp4).
      const mime = recorder.mimeType || requestedMime || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      const preview = createVoicePreviewFromBlob(blob, mime, elapsed);
      if (!preview) {
        setVoiceElapsedMs(0);
        showToast("Recording was too short. Hold the mic a little longer.");
        return;
      }
      setVoicePreview({ ...preview, conversationId: recordedIn! });
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    voiceStartedAtRef.current = Date.now();
    setVoiceElapsedMs(0);
    clearVoiceTimer();
    voiceTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - voiceStartedAtRef.current;
      setVoiceElapsedMs(elapsed);
      // Hard cap: stop into preview rather than recording forever.
      if (elapsed >= VOICE_NOTE_MAX_MS && recorder.state === "recording") recorder.stop();
    }, 250);
    setIsRecording(true);
  }, [selectedConversation, voiceSending, discardVoicePreview, clearVoiceTimer, stopVoiceStream, showToast]);

  const toggleVoicePreviewPlayback = useCallback(() => {
    const preview = voicePreview;
    if (!preview?.objectUrl) return;
    let audio = voiceAudioRef.current;
    if (!audio) {
      audio = new Audio(preview.objectUrl);
      voiceAudioRef.current = audio;
      audio.onended = () => setVoicePlaying(false);
    }
    if (voicePlaying) {
      audio.pause();
      setVoicePlaying(false);
    } else {
      void audio.play().then(() => setVoicePlaying(true)).catch(() => setVoicePlaying(false));
    }
  }, [voicePreview, voicePlaying]);

  const sendVoicePreview = useCallback(async () => {
    const preview = voicePreview;
    // Target the conversation the note was recorded in — never the current selection (R1).
    const cid = preview?.conversationId;
    if (!cid || !preview) return;
    if (!canSendVoicePreview({ phase: "preview", blob: preview.blob, sending: voiceSending })) return;
    if (voiceSendLockRef.current) return;
    voiceSendLockRef.current = true;
    setVoiceSending(true);
    setUploading(true);
    try {
      const type = preview.mime || preview.blob.type;
      const file = new File([preview.blob], `voice-note${voiceFileExtension(type)}`, { type });
      const replyToId = replyingTo ? String((replyingTo as any).id || (replyingTo as any)._id) : undefined;
      const msg = await uploadChatFiles(cid, [file], undefined, replyToId);
      fetchConversations();
      if (openConvIdRef.current === cid) {
        setMessages((prev) => addMessageIfNew(prev, msg));
        setReplyingTo(null);
      }
      discardVoicePreview();
    } catch {
      showToast("Voice note failed to send.");
      voiceSendLockRef.current = false;
      setVoiceSending(false);
    } finally {
      setUploading(false);
    }
  }, [voicePreview, voiceSending, replyingTo, showToast, fetchConversations, discardVoicePreview]);

  // Leaving the conversation (or the page) stops the mic; onstop sees the flag and drops the audio.
  useEffect(() => {
    return () => {
      clearVoiceTimer();
      const rec = mediaRecorderRef.current;
      if (rec && rec.state === "recording") {
        voiceDiscardOnStopRef.current = true;
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      } else {
        stopVoiceStream();
      }
    };
  }, [convId, clearVoiceTimer, stopVoiceStream]);

  useEffect(() => {
    discardVoicePreview();
    setIsRecording(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on conversation change
  }, [convId]);

  // Revoke a pending preview's object URL when the page unmounts.
  const voicePreviewRef = useRef(voicePreview);
  voicePreviewRef.current = voicePreview;
  useEffect(() => () => revokeVoicePreviewUrl(voicePreviewRef.current?.objectUrl), []);

  const handleTyping = () => {
    const cid = getId(selectedConversation);
    if (!cid) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      emitTyping(cid);
      lastTypingEmitRef.current = now;
    }
  };

  const handleCall = (callType: "audio" | "video") => {
    const cid = getId(selectedConversation);
    if (!cid || !selectedConversation) return;
    const isGroup = selectedConversation.type === "group";
    const participantCount = selectedConversation.participants?.length || 0;
    // Must run synchronously inside the click so the browser allows the popup; the context closes
    // this placeholder window itself if the initiate fails, and falls back to this tab if blocked.
    prepareCallWindow();
    emitCallInitiate(cid, callType, {
      calleeName: displayName(selectedConversation),
      callScope: isGroup ? "group" : "direct",
      groupName: isGroup ? displayName(selectedConversation) : undefined,
      participantCount: isGroup ? participantCount : undefined,
    });
  };

  const handleDeleteChat = () => {
    const cid = getId(selectedConversation);
    if (!cid) return;
    setDeleteConfirm({ mode: "chat" });
  };

  /** Latest user-search request; older responses that land late are dropped. */
  const userSearchSeqRef = useRef(0);
  const handleSearchUsers = async () => {
    if (!userSearch.trim()) return;
    // Do not call the directory at `none` scope — the API 403s by design. Also wait for scopeReady
    // (permissions AND flag), or the directory flashes to a restricted user on first paint. Spec §7.1.
    if (!scopeReady || scope === "none") return;
    const seq = ++userSearchSeqRef.current;
    try {
      const res = await searchUsers({ search: userSearch.trim(), limit: 20 });
      if (seq === userSearchSeqRef.current) setSearchResults(res.results || []);
    } catch {
      if (seq === userSearchSeqRef.current) setSearchResults([]);
    }
  };

  // ponytail: live search — debounce keystrokes so results appear as you type; Enter/button still work.
  useEffect(() => {
    const q = userSearch.trim();
    if (!q) {
      userSearchSeqRef.current += 1; // an in-flight search must not repopulate a cleared box
      setSearchResults([]);
      return;
    }
    if (!scopeReady || scope === "none") return;
    const t = setTimeout(() => { handleSearchUsers(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch, scopeReady, scope]);

  useEffect(() => {
    const q = addMemberSearch.trim();
    if (!q) { setAddMemberResults([]); return; }
    if (!scopeReady || scope === "none") return;
    const t = setTimeout(async () => {
      try {
        const res = await searchUsers({ search: q, limit: 20 });
        setAddMemberResults(res.results || []);
      } catch { setAddMemberResults([]); }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMemberSearch, scopeReady, scope]);

  const handleStartChat = async (userOrId: { id?: string; _id?: string }) => {
    const userId = (userOrId as any)?.id || (userOrId as any)?._id;
    if (!userId) return;
    try {
      const conv = await createConversation({ type: "direct", participantIds: [String(userId)] });
      selectConversation(conv);
      closeNewChatModal();
      fetchConversations();
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Couldn't start the chat. Try again.");
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
      selectConversation(conv);
      closeNewChatModal();
      setNewChatMode("direct");
      fetchConversations();
    } catch (e: any) {
      // 400 (validation) / 403 (directory scope) carry a server message worth showing.
      showToast(e?.response?.data?.message || "Couldn't create the group. Try again.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleUserForGroup = (userId: string, displayName = "") => {
    const next = toggleSelectedMemberChip(selectedUserIds, selectedUserLabels, userId, displayName);
    setSelectedUserIds(next.selectedIds);
    setSelectedUserLabels(next.labels);
  };

  const resetNewChatDraft = () => {
    userSearchSeqRef.current += 1;
    setUserSearch("");
    setSearchResults([]);
    setSelectedUserIds(new Set());
    setSelectedUserLabels({});
    setGroupName("");
  };

  const openNewChatModal = (mode: "direct" | "group" = "direct") => {
    setNewChatMode(mode);
    resetNewChatDraft();
    setShowNewChat(true);
  };

  /** Every close path (Cancel, backdrop, Escape, success) resets search + selection. */
  const closeNewChatModal = () => {
    setShowNewChat(false);
    resetNewChatDraft();
  };

  /** Group → Direct drops the group pick-list; a direct chat starts from one click. */
  const switchNewChatMode = (mode: "direct" | "group") => {
    if (mode === newChatMode) return;
    if (mode === "direct") {
      setSelectedUserIds(new Set());
      setSelectedUserLabels({});
    }
    setNewChatMode(mode);
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
    if (p?.role) return p.role === "admin";
    // Same fallback as backend ensureAdmin: a creator row without a role is an admin.
    return !!p && !!isCreator(c);
  };

  const isCreator = (c: Conversation) => {
    const creatorId = (c.createdBy as any)?.id || (c.createdBy as any)?._id?.toString?.();
    return creatorId && myId && String(creatorId) === String(myId);
  };

  const recentConvs = conversations;
  const groupConvs = groupConversations;
  const visibleCalls = calls;

  const toggleForwardTarget = (conversationId: string) => {
    setForwardTargets((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      return next;
    });
  };

  const handleForwardSubmit = async () => {
    const cid = getId(selectedConversation);
    const mid = forwardingMessage
      ? String((forwardingMessage as any).id || (forwardingMessage as any)._id)
      : "";
    if (!cid || !mid || forwardTargets.size === 0 || forwarding) return;
    setForwarding(true);
    try {
      await forwardMessage(cid, mid, Array.from(forwardTargets));
      showToast(`Forwarded to ${forwardTargets.size} chat${forwardTargets.size > 1 ? "s" : ""}.`);
      closeForwardModal();
      fetchConversations();
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Could not forward message.");
    } finally {
      setForwarding(false);
    }
  };

  const forwardableConversations = React.useMemo(() => {
    const currentId = getId(selectedConversation);
    const q = forwardSearch.trim().toLowerCase();
    return recentConvs.filter((c) => {
      const id = getId(c);
      if (!id || id === currentId) return false;
      if (!q) return true;
      return displayName(c).toLowerCase().includes(q);
    });
  }, [recentConvs, selectedConversation, forwardSearch]);

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
    const map = new Map<string, Conversation[]>();
    const order: string[] = [];
    for (const c of recentConvs) {
      const d = (c as any).lastMessageAt ? new Date((c as any).lastMessageAt) : new Date();
      const label = formatDateSeparatorForList(d);
      if (!map.has(label)) {
        map.set(label, []);
        order.push(label);
      }
      map.get(label)!.push(c);
    }
    return order.map((label) => ({ label, convs: map.get(label)! }));
  }, [recentConvs]);

  const getReplyPreviewText = (r: { content?: string; type?: string }) => {
    if (!r) return "";
    if (r.type === "image") return "Photo";
    if (r.type === "video") return "Video";
    if (r.type === "file") return "File";
    if (r.type === "audio") return "Voice note";
    return (r.content || "").slice(0, 60) + ((r.content || "").length > 60 ? "…" : "");
  };

  // ── Message actions (reactions, copy, download, long-press) ──
  const messageIdOf = (m: Message) => String((m as any).id || (m as any)._id || "");

  /** Optimistic react / un-react ('' removes mine), rolled back with a toast if the server refuses. */
  const handleReact = async (m: Message, emoji: string) => {
    const cid = getId(selectedConversation);
    const mid = messageIdOf(m);
    if (!cid || !mid || !myId || m.deletedAt) return;
    const before = m.reactions || [];
    const setReactions = (reactions: Message["reactions"]) =>
      setMessages((prev) => prev.map((x) => (messageIdOf(x) === mid ? { ...x, reactions } : x)));
    setReactionPickerFor(null);
    setReactions(
      applyReactionLocally(before, { id: String(myId), name: (user as any)?.name }, emoji) as Message["reactions"]
    );
    try {
      const updated = await reactToMessage(cid, mid, emoji);
      if (openConvIdRef.current === cid) setReactions(updated?.reactions || []);
    } catch (e: any) {
      if (openConvIdRef.current === cid) setReactions(before);
      showToast(e?.response?.data?.message || "Couldn't update your reaction.");
    }
  };

  const copyMessageText = async (m: Message) => {
    setMessageMenuFor(null);
    try {
      await navigator.clipboard.writeText(m.content || "");
      showToast("Copied", "success");
    } catch {
      showToast("Couldn't copy. Select the text and copy it instead.");
    }
  };

  /** Presigned S3 URLs are cross-origin, so `download` may be ignored and the file opens in a tab. */
  const downloadAttachments = (m: Message) => {
    setMessageMenuFor(null);
    for (const a of m.attachments || []) {
      if (!a.url) continue;
      const link = document.createElement("a");
      link.href = a.url;
      link.download = a.originalName || "";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const LONG_PRESS_MS = 500;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const cancelLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };
  /** Long-press (touch) and right-click (desktop) open the same menu as the ⋮ button. */
  const messageGestureProps = (m: Message) => {
    const mid = messageIdOf(m);
    return {
      onTouchStart: () => {
        longPressFiredRef.current = false;
        cancelLongPress();
        longPressTimerRef.current = setTimeout(() => {
          longPressFiredRef.current = true;
          setReactionPickerFor(null);
          setMessageMenuFor(mid);
        }, LONG_PRESS_MS);
      },
      onTouchMove: cancelLongPress,
      onTouchEnd: cancelLongPress,
      onTouchCancel: cancelLongPress,
      onContextMenu: (e: React.MouseEvent) => {
        // Keep the native menu for links and selected text (open in new tab, copy selection).
        if ((e.target as HTMLElement).closest("a") || window.getSelection()?.toString()) return;
        e.preventDefault();
        setReactionPickerFor(null);
        setMessageMenuFor(mid);
      },
      // The click that ends a long-press must not also open an image or follow a link.
      onClickCapture: (e: React.MouseEvent) => {
        if (!longPressFiredRef.current) return;
        longPressFiredRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      },
    };
  };
  useEffect(() => () => cancelLongPress(), []);

  const renderMessageContent = (m: Message) => {
    const isDeleted = !!(m as any).deletedAt;
    if (isDeleted) {
      return (
        <p className={chatStyles.deletedMessage}>
          {(m as any).deletedFor === "everyone"
            ? "This message was deleted"
            : "You deleted this message"}
        </p>
      );
    }
    const replyTo = (m as any).replyTo;
    const replyBlock = replyTo ? (
      <div
        className={`${chatStyles.replyPreview} ${chatStyles.jumpable}`}
        role="button"
        tabIndex={0}
        aria-label="Go to replied message"
        onClick={(e) => {
          e.stopPropagation();
          void jumpToMessage(replyTo.id || replyTo._id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void jumpToMessage(replyTo.id || replyTo._id);
          }
        }}
      >
        <p className={chatStyles.replyPreviewName}>
          {(replyTo.sender as any)?.name || "Unknown"}
        </p>
        <p className={chatStyles.replyPreviewText}>{getReplyPreviewText(replyTo)}</p>
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
          {m.content && m.content !== "\ud83d\udcf7 Image" && (
            <MessageText text={m.content} className="mb-0 mt-1 whitespace-pre-wrap" />
          )}
        </div>
      );
    }
    if (m.type === "audio" && m.attachments?.length) {
      return (
        <div>
          {replyBlock}
          {m.attachments.map((a, i) => (
            <VoiceNotePlayer key={i} src={a.url} />
          ))}
        </div>
      );
    }
    if (m.type === "video" && m.attachments?.length) {
      return (
        <div>
          {replyBlock}
          {m.attachments.map((a, i) => (
            <video
              key={i}
              controls
              className="rounded max-w-[280px] max-h-[200px] mb-1"
              src={a.url}
              preload="metadata"
            />
          ))}
          {m.content && !/^Sent (a video|\d+ videos)$/i.test(m.content) && (
            <MessageText text={m.content} className="mb-0 mt-1 whitespace-pre-wrap" />
          )}
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
                  <p className={`mb-0 ${chatStyles.bubbleMutedText}`}>
                    {a.size >= 1048576
                      ? `${(a.size / 1048576).toFixed(1)} MB`
                      : `${(a.size / 1024).toFixed(1)} KB`}
                  </p>
                ) : null}
              </div>
              <i className="ri-download-2-line ms-auto" />
            </a>
          ))}
          {m.content && m.content !== "\ud83d\udcce File" && (
            <MessageText text={m.content} className="mb-0 mt-1 whitespace-pre-wrap" />
          )}
        </div>
      );
    }
    return (
      <div>
        {replyBlock}
        <MessageText text={m.content || ""} className="mb-0 whitespace-pre-wrap" />
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

  /** Everyone in the open conversation except me: the audience a tick is measured against. */
  const recipientIds = useMemo(
    () =>
      ((selectedConversation?.participants || []) as any[])
        .map((p) => String(p?.user?.id || p?.user?._id || ""))
        .filter((id) => id && id !== String(myId || "")),
    [selectedConversation, myId]
  );

  const renderReadStatus = (m: Message) => {
    const senderId = (m.sender as any)?.id || (m.sender as any)?._id?.toString?.();
    if (String(senderId) !== String(myId) || m.deletedAt) return null;
    return <ReceiptTick status={messageTickStatus(m, recipientIds)} className="ms-1" />;
  };

  const showCallNotificationBanner =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "default" &&
    !dismissedCallNotificationPrompt;

  const handleEnableCallNotifications = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // Permission is not React state; hide the strip once the browser prompt resolves.
    void Notification.requestPermission().finally(() => setDismissedCallNotificationPrompt(true));
  };

  // Mute is viewer-only; the list row and panel read `muted` from the conversation payload.
  const handleToggleMute = async () => {
    const cid = getId(selectedConversation);
    if (!cid || muteBusy) return;
    const next = !selectedConversation?.muted;
    const patch = (c: Conversation) => (getId(c) === cid ? { ...c, muted: next } : c);
    setMuteBusy(true);
    setSelectedConversation((prev) => (prev ? patch(prev) : prev));
    setConversations((prev) => prev.map(patch));
    setGroupConversations((prev) => prev.map(patch));
    try {
      await setConversationPreferences(cid, { muted: next });
      showToast(next ? "Notifications muted." : "Notifications unmuted.", "success");
    } catch (e: any) {
      const undo = (c: Conversation) => (getId(c) === cid ? { ...c, muted: !next } : c);
      setSelectedConversation((prev) => (prev ? undo(prev) : prev));
      setConversations((prev) => prev.map(undo));
      setGroupConversations((prev) => prev.map(undo));
      showToast(e?.response?.data?.message || "Couldn't update notifications.");
    } finally {
      setMuteBusy(false);
    }
  };

  const handleDismissCallNotificationPrompt = () => {
    if (typeof window !== "undefined") sessionStorage.setItem("chats-call-notification-prompt-dismissed", "1");
    setDismissedCallNotificationPrompt(true);
  };

  return (
    <div className={chatStyles.shell}>
      <Seo title="Chat" />
      <div
        className={`main-chart-wrapper ${chatStyles.grid} ${
          selectedConversation ? chatStyles.gridConversationOpen : ""
        } p-2 gap-2 lg:flex`}
      >
        {/* ── Left sidebar ── */}
        <div className={`chat-info ${chatStyles.rail} border-0 dark:border-0`}>
          <div className={chatStyles.railHeader}>
            <h5 className={chatStyles.railTitle}>Messages</h5>
            <button
              type="button"
              aria-label="New chat or group"
              onClick={() => openNewChatModal(activeTab === "groups" ? "group" : "direct")}
              className={chatStyles.railFab}
            >
              <i className="ri-add-line" />
            </button>
          </div>
          {/* Compact strip inside the list column so it never pushes the thread below the fold. */}
          {showCallNotificationBanner && (
            <div className={chatStyles.notifBanner} role="region" aria-label="Notification permission">
              <i className={`ri-notification-3-line ${chatStyles.notifIcon}`} aria-hidden />
              <p className={chatStyles.notifText}>Get notified of chats and calls in the background.</p>
              <button type="button" className={chatStyles.notifEnable} onClick={handleEnableCallNotifications}>
                Enable
              </button>
              <button
                type="button"
                className={chatStyles.notifDismiss}
                onClick={handleDismissCallNotificationPrompt}
                aria-label="Dismiss notification prompt"
                title="Not now"
              >
                <i className="ri-close-line" aria-hidden />
              </button>
            </div>
          )}
          <div className={chatStyles.railSearch}>
            <div className={chatStyles.searchField}>
              <label htmlFor="chat-conversation-search" className="sr-only">
                Search conversations
              </label>
              <input
                id="chat-conversation-search"
                type="search"
                className={`form-control ${chatStyles.searchInput}`}
                placeholder="Search conversations…"
                value={conversationSearch}
                maxLength={CONVERSATION_SEARCH_MAX_LEN}
                autoComplete="off"
                onChange={(e) => setConversationSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setConversationSearch("");
                }}
              />
              <button
                type="button"
                className={chatStyles.searchBtn}
                onClick={() => {
                  const nextQ = parseConversationListQ(conversationSearch);
                  setConversationSearch(nextQ);
                  skipSearchInputSyncRef.current = true;
                  replaceListParams({ page: 1, q: nextQ });
                }}
                aria-label="Search conversations"
              >
                <i className="ri-search-line text-lg" />
              </button>
            </div>
            <div className="sr-only" aria-live="polite">
              {listQ
                ? `${activeTab === "groups" ? groupTotal : conversationsTotal} conversations match ${listQ}`
                : ""}
            </div>
          </div>
          <nav className={chatStyles.tabRow} role="tablist" aria-label="Conversation filters">
            {(["recent", "groups", "calls"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (listPage !== 1) replaceListParams({ page: 1, q: listQ });
                }}
                className={`${chatStyles.tab} ${activeTab === tab ? chatStyles.tabActive : ""}`}
              >
                <i className={`me-1 ${tab === "recent" ? "ri-history-line" : tab === "groups" ? "ri-group-2-line" : "ri-phone-line"}`} />
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>

          <div
            ref={conversationListScrollRef}
            className={`tab-content ${chatStyles.listScroll}`}
          >
            {activeTab === "recent" && (
              <div className="tab-pane fade show active !border-0 chat-users-tab">
                <div className={chatStyles.listPane}>
                {conversationsLoading ? (
                  <p className={chatStyles.emptyList}>Loading…</p>
                ) : error ? (
                  <p className="text-danger px-1">{error}</p>
                ) : recentConvs.length === 0 ? (
                  <p className={chatStyles.emptyList}>
                    {listQ
                      ? `No conversations match “${listQ}”.`
                      : "No conversations yet. Use + to start a chat."}
                  </p>
                ) : (
                  <>
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
                              onClick={() => selectConversation(c)}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`avatar avatar-md avatar-rounded flex-shrink-0 ${isUserOnline(c) ? "online" : ""}`}>
                                  <img src={conversationAvatar(c)} alt="" className="rounded-full" />
                                </span>
                                <div className="flex-grow min-w-0">
                                  <p className={`${chatStyles.convName} truncate`}>
                                    <span className="truncate">{displayName(c)}</span>
                                    {c.muted && (
                                      <span className="inline-flex shrink-0 text-[#8c9097] dark:text-[#9ca3af]" title="Muted">
                                        <i className="ri-notification-off-line text-[0.8rem]" aria-hidden />
                                        <span className="sr-only">Muted</span>
                                      </span>
                                    )}
                                    {hasActiveCall && (
                                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-primary" title="Call in progress">
                                        <i className="ri-phone-fill text-[0.65rem]" />
                                        Live
                                      </span>
                                    )}
                                  </p>
                                  <p className={`${chatStyles.convPreview} truncate`}>
                                    {c.lastMessage?.status &&
                                      myId &&
                                      String(c.lastMessage.senderId || "") === String(myId) && (
                                        <ReceiptTick status={c.lastMessage.status} className="me-1 align-[-1px]" />
                                      )}
                                    {conversationPreviewText(c.lastMessage)}
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
                  <ListPagination
                    page={listPage}
                    totalPages={conversationsTotalPages}
                    totalResults={conversationsTotal}
                    pageSize={CONVERSATIONS_PAGE_LIMIT}
                    onPageChange={(nextPage) => replaceListParams({ page: nextPage, q: listQ })}
                    showPageSize={false}
                    showSummary={false}
                    hideWhenSinglePage
                    touchFriendly
                    ariaLabel="Conversation pages"
                    className={chatStyles.listPager}
                  />
                  </>
                )}
                </div>
              </div>
            )}
            {activeTab === "groups" && (
              <div className="tab-pane fade show active !border-0 chat-groups-tab">
                <div className={chatStyles.listPane}>
                {groupLoading ? (
                  <p className={chatStyles.emptyList}>Loading…</p>
                ) : groupConvs.length === 0 ? (
                  <p className={chatStyles.emptyList}>
                    {listQ ? `No groups match “${listQ}”.` : "No groups yet. Create one with +"}
                  </p>
                ) : (
                  <>
                  <ul className="list-none mb-0">
                    {groupConvs.map((c) => (
                      <li
                        key={getId(c) || ""}
                        className={`${chatStyles.convItem} ${getId(selectedConversation) === getId(c) ? chatStyles.convItemActive : ""}`}
                        onClick={() => selectConversation(c)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="avatar avatar-md avatar-rounded flex-shrink-0">
                            <img src={conversationAvatar(c)} alt="" />
                          </span>
                          <p className={`${chatStyles.convName} mb-0`}>
                            <span className="truncate">{displayName(c)}</span>
                            {c.muted && (
                              <span className="inline-flex shrink-0 text-[#8c9097] dark:text-[#9ca3af]" title="Muted">
                                <i className="ri-notification-off-line text-[0.8rem]" aria-hidden />
                                <span className="sr-only">Muted</span>
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <ListPagination
                    page={listPage}
                    totalPages={groupTotalPages}
                    totalResults={groupTotal}
                    pageSize={CONVERSATIONS_PAGE_LIMIT}
                    onPageChange={(nextPage) => replaceListParams({ page: nextPage, q: listQ })}
                    showPageSize={false}
                    showSummary={false}
                    hideWhenSinglePage
                    touchFriendly
                    ariaLabel="Group conversation pages"
                    className={chatStyles.listPager}
                  />
                  </>
                )}
                </div>
              </div>
            )}
            {activeTab === "calls" && (
              <div className="tab-pane fade show active !border-0 chat-calls-tab">
                <div className="px-3 pt-2">
                  <input
                    type="search"
                    className="form-control !text-sm"
                    placeholder="Search calls by name or email"
                    value={callSearchDraft}
                    onChange={(e) => setCallSearchDraft(e.target.value)}
                    aria-label="Search calls"
                  />
                </div>
                <div className={chatStyles.listPane}>
                {callsLoading ? (
                  <p className={chatStyles.emptyList}>Loading calls…</p>
                ) : callsError ? (
                  <p className={chatStyles.emptyList}>Could not load calls.</p>
                ) : calls.length === 0 ? (
                  <p className={chatStyles.emptyList}>
                    {callsSearchParam(callsListQuery.callQ)
                      ? `No calls match “${callsListQuery.callQ}”.`
                      : "No call history yet."}
                  </p>
                ) : (
                  <ul className="list-none mb-0" role="list">
                    {visibleCalls.map((call) => {
                      const peer = call.peer;
                      const peerAvatarName = peer?.name || (call.caller as { name?: string })?.name || "Unknown";
                      const title = callsTabHeadline(call);
                      const isOutgoing = call.direction === "outgoing";
                      const dirLabel = isOutgoing ? "Outgoing" : "Incoming";
                      const typeLabel = call.callType === "video" ? "Video" : "Voice";
                      // Direction-aware label; completed calls carry their m:ss duration.
                      const { label: statusText, tone: statusTone } = callStatusLabel(call);
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
                                className={`mb-0 text-[0.75rem] tabular-nums ${
                                  statusTone === "danger"
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
                {callsTotalPages > 1 ? (
                  <ListPagination
                    page={callsListQuery.callPage}
                    totalPages={callsTotalPages}
                    totalResults={callsTotal}
                    pageSize={30}
                    showPageSize={false}
                    touchFriendly
                    hideWhenSinglePage
                    onPageChange={(next) => replaceCallsQuery({ callPage: next })}
                    className="px-2 py-2"
                    ariaLabel="Call history pages"
                  />
                ) : null}
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
                  <div className={chatStyles.rejoinBarStatus}>
                    <span className={chatStyles.rejoinBarPulse} aria-hidden="true" />
                    <span className={`flex items-center gap-2 font-semibold text-sm ${chatStyles.rejoinBarStatusText}`}>
                      <i className={`${activeCallForConv.callType === "video" ? "ri-vidicon-line" : "ri-phone-line"} shrink-0 text-lg`} aria-hidden="true" />
                      {(() => {
                        const label = activeCallForConv.callType === "video" ? "Video call" : "Voice call";
                        const count = activeCallForConv.participantCount;
                        return count && count > 1 ? `${label} · ${count} in call` : `${label} in progress`;
                      })()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={chatStyles.rejoinBarAction}
                    aria-label="Rejoin ongoing call"
                    onClick={() => {
                      const params = new URLSearchParams({ from: "chat", conv: activeCallForConv.conversation });
                      if (activeCallForConv.id) params.set("callId", activeCallForConv.id);
                      params.set("video", activeCallForConv.callType === "audio" ? "0" : "1");
                      const url = `/meetings/room/${encodeURIComponent(activeCallForConv.roomName)}?${params}`;
                      window.open(url, "_blank", "noopener");
                    }}
                  >
                    <i className="ri-phone-fill" aria-hidden="true" />
                    Rejoin
                  </button>
                </div>
              )}
              <div className={`${chatStyles.threadHeader} sm:flex-nowrap`}>
                <div className="flex items-center min-w-0">
                  <button
                    type="button"
                    className={chatStyles.threadBackBtn}
                    onClick={backToList}
                    aria-label="Back to conversations"
                  >
                    <i className="ri-arrow-left-line" />
                  </button>
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
                        ref={panelOpenerRef}
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
                    aria-label="Voice call"
                    onClick={() => handleCall("audio")}
                  >
                    <i className="ri-phone-line" />
                  </button>
                  <button
                    type="button"
                    className={chatStyles.toolBtn}
                    title="Video call"
                    aria-label="Video call"
                    onClick={() => handleCall("video")}
                  >
                    <i className="ri-vidicon-line" />
                  </button>
                  <button
                    type="button"
                    className={`${chatStyles.toolBtn} ${chatStyles.toolBtnDanger}`}
                    title="Delete chat"
                    aria-label="Delete chat"
                    disabled={deletingChat}
                    onClick={handleDeleteChat}
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
              {pinnedMessages.length > 0 && (
                <div className={chatStyles.pinnedBar}>
                  <button
                    type="button"
                    className={chatStyles.pinnedBarToggle}
                    onClick={() => setPinnedCollapsed((v) => !v)}
                    aria-expanded={!pinnedCollapsed}
                  >
                    <i className="ri-pushpin-fill" aria-hidden="true" />
                    <span>
                      {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? "s" : ""}
                    </span>
                    <i
                      className={pinnedCollapsed ? "ri-arrow-down-s-line" : "ri-arrow-up-s-line"}
                      aria-hidden="true"
                    />
                  </button>
                  {!pinnedCollapsed && (
                    <ul className={chatStyles.pinnedBarList}>
                      {pinnedMessages.map((pm) => {
                        const pid = String((pm as any).id || (pm as any)._id);
                        return (
                          <li key={pid} className={chatStyles.pinnedBarItem}>
                            <div
                              className={`min-w-0 flex-1 ${chatStyles.jumpable}`}
                              role="button"
                              tabIndex={0}
                              aria-label="Go to pinned message"
                              onClick={() => void jumpToMessage(pid)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  void jumpToMessage(pid);
                                }
                              }}
                            >
                              <p className={chatStyles.pinnedBarSender}>
                                {(pm.sender as any)?.name || "Unknown"}
                              </p>
                              <p className={chatStyles.pinnedBarText}>{getReplyPreviewText(pm)}</p>
                            </div>
                            {canPinInConversation(selectedConversation) && (
                              <button
                                type="button"
                                className={chatStyles.pinnedBarUnpin}
                                title="Unpin"
                                aria-label={`Unpin message from ${(pm.sender as any)?.name || "Unknown"}`}
                                disabled={pinBusy}
                                onClick={() => handleTogglePin(pid, false)}
                              >
                                <i className="ri-unpin-line" aria-hidden="true" />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              {error && (
                <div className={chatStyles.errorInline}>
                  {error}
                </div>
              )}
              <PerfectScrollbar
                className={chatStyles.transcript}
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
                          // Label carries the direction-aware outcome and, for completed calls, m:ss.
                          const bareStatus = callStatusLabel(call).label;
                          const callLabel = hasEnriched
                            ? timelineCallPillText(call)
                            : `${call.callType === "video" ? "Video call" : "Voice call"}${bareStatus ? ` · ${bareStatus}` : ""}`;
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
                                  <span className="min-w-0 tabular-nums">
                                    {callLabel}
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
                        const isGroupChat = selectedConversation?.type === "group";
                        const mid = messageIdOf(m);
                        const isDeletedMsg = !!(m as any).deletedAt;
                        const menuOpen = messageMenuFor === mid;
                        const pickerOpen = !isDeletedMsg && reactionPickerFor === mid;
                        // Copy is for text bodies only; voice/image/file get Download instead.
                        const canCopy = !isDeletedMsg && m.type === "text" && !!m.content?.trim();
                        const canDownload = !isDeletedMsg && m.type !== "text" && (m.attachments?.length || 0) > 0;
                        const chips = isDeletedMsg ? [] : groupReactions(m.reactions, myId);
                        const myEmoji = myReactionEmoji(m.reactions, myId);
                        const closeMenuThen = (fn: () => void) => () => {
                          setMessageMenuFor(null);
                          fn();
                        };
                        return (
                          <li
                            key={m.id || (m as any)._id}
                            data-message-row
                            data-message-id={mid}
                            className={`${chatStyles.msgRow} group ${isMe ? chatStyles.msgRowMe : chatStyles.msgRowThem} ${flashMessageId === mid ? chatStyles.msgRowFlash : ""}`}
                          >
                            <div className={`${chatStyles.msgCluster} ${isMe ? chatStyles.msgClusterMe : ""}`}>
                              {/* Sender identity only disambiguates in groups; a 1:1 thread's header already names the peer. */}
                              {isGroupChat && (
                                <span className="avatar avatar-md avatar-rounded flex-shrink-0">
                                  <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent((m.sender as any)?.name || "U")}&size=40`}
                                    alt=""
                                  />
                                </span>
                              )}
                              <div className={`min-w-0 flex-1 ${isMe ? "text-end" : ""}`}>
                                {/* WhatsApp-style: only a group names the sender, and only for other people's messages. */}
                                {isGroupChat && !isMe && (
                                  <span className={chatStyles.msgMeta}>{(m.sender as any)?.name}</span>
                                )}
                                <div className="relative">
                                  {/* Bubble + React trigger share a line; the trigger sits on the inner side. */}
                                  <div className={`${chatStyles.bubbleLine} ${isMe ? chatStyles.bubbleLineMe : ""}`}>
                                    <div
                                      className={`${chatStyles.bubble} mt-1 ${isMe ? chatStyles.bubbleSent : chatStyles.bubbleRecv}`}
                                      {...messageGestureProps(m)}
                                    >
                                        <span ref={menuOpen ? messageMenuRef : undefined} className={`${chatStyles.bubbleMenu} ${menuOpen ? chatStyles.bubbleMenuOpen : ""}`}>
                                          <button
                                            type="button"
                                            className={chatStyles.msgActionBtn}
                                            title="Message actions"
                                            aria-label="Message actions"
                                            aria-haspopup="menu"
                                            aria-expanded={menuOpen}
                                            onClick={() => {
                                              setReactionPickerFor(null);
                                              setMessageMenuFor((prev) => (prev === mid ? null : mid));
                                            }}
                                          >
                                            <i className="ri-arrow-down-s-line text-base" aria-hidden />
                                          </button>
                                          {menuOpen && (
                                            <div
                                              role="menu"
                                              aria-label="Message actions"
                                              className={`absolute top-full mt-1 min-w-[11rem] rounded-lg bg-white dark:bg-bodybg shadow-lg border border-black/5 dark:border-white/10 py-1 text-start ${chatStyles.messageActionMenu} ${
                                                isMe ? "right-0 origin-top-right" : "left-0 origin-top-left"
                                              }`}
                                            >
                                              {/* A deleted message offers nothing but removing it from my view. */}
                                              {!isDeletedMsg && (
                                                <>
                                                  <button
                                                    type="button"
                                                    role="menuitem"
                                                    className={chatStyles.menuItem}
                                                    onClick={closeMenuThen(() => setReactionPickerFor(mid))}
                                                  >
                                                    <i className="ri-emotion-happy-line" aria-hidden />
                                                    React
                                                  </button>
                                                  <button
                                                    type="button"
                                                    role="menuitem"
                                                    className={chatStyles.menuItem}
                                                    onClick={closeMenuThen(() => setReplyingTo(m))}
                                                  >
                                                    <i className="ri-reply-line" aria-hidden />
                                                    Reply
                                                  </button>
                                                  {canCopy && (
                                                    <button
                                                      type="button"
                                                      role="menuitem"
                                                      className={chatStyles.menuItem}
                                                      onClick={() => void copyMessageText(m)}
                                                    >
                                                      <i className="ri-file-copy-line" aria-hidden />
                                                      Copy
                                                    </button>
                                                  )}
                                                  <button
                                                    type="button"
                                                    role="menuitem"
                                                    className={chatStyles.menuItem}
                                                    onClick={closeMenuThen(() => {
                                                      setForwardTargets(new Set());
                                                      setForwardSearch("");
                                                      setForwardingMessage(m);
                                                    })}
                                                  >
                                                    <i className="ri-share-forward-line" aria-hidden />
                                                    Forward
                                                  </button>
                                                  {canDownload && (
                                                    <button
                                                      type="button"
                                                      role="menuitem"
                                                      className={chatStyles.menuItem}
                                                      onClick={() => downloadAttachments(m)}
                                                    >
                                                      <i className="ri-download-2-line" aria-hidden />
                                                      Download
                                                    </button>
                                                  )}
                                                  {canPinInConversation(selectedConversation) && (
                                                    <button
                                                      type="button"
                                                      role="menuitem"
                                                      className={chatStyles.menuItem}
                                                      disabled={pinBusy}
                                                      onClick={closeMenuThen(() => handleTogglePin(mid, !(m as any).pinnedAt))}
                                                    >
                                                      <i className={(m as any).pinnedAt ? "ri-unpin-line" : "ri-pushpin-line"} aria-hidden />
                                                      {(m as any).pinnedAt ? "Unpin message" : "Pin message"}
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                              <button
                                                type="button"
                                                role="menuitem"
                                                className={chatStyles.menuItem}
                                                onClick={closeMenuThen(() => {
                                                  if (!getId(selectedConversation)) return;
                                                  setDeleteConfirm({ mode: "me", messageId: mid });
                                                })}
                                              >
                                                <i className="ri-delete-bin-line" aria-hidden />
                                                Delete for me
                                              </button>
                                              {isMe && !isDeletedMsg && (
                                                <button
                                                  type="button"
                                                  role="menuitem"
                                                  className={`${chatStyles.menuItem} ${chatStyles.menuItemDanger}`}
                                                  onClick={closeMenuThen(() => {
                                                    if (!getId(selectedConversation)) return;
                                                    setDeleteConfirm({ mode: "everyone", messageId: mid });
                                                  })}
                                                >
                                                  <i className="ri-delete-bin-2-line" aria-hidden />
                                                  Delete for everyone
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </span>
                                      <div className={chatStyles.bubbleBody}>{renderMessageContent(m)}</div>
                                      <span className={chatStyles.bubbleMeta}>
                                        {(m as any).pinnedAt && (
                                          <i className="ri-pushpin-fill" title="Pinned" aria-label="Pinned" />
                                        )}
                                        {m.createdAt ? format(new Date(m.createdAt), "h:mm a") : ""}
                                        {isMe && renderReadStatus(m)}
                                      </span>
                                    </div>
                                    {!isDeletedMsg && (
                                      <button
                                        type="button"
                                        className={chatStyles.reactTrigger}
                                        title="React"
                                        aria-label="React to message"
                                        aria-haspopup="true"
                                        aria-expanded={pickerOpen}
                                        onClick={() => {
                                          setMessageMenuFor(null);
                                          setReactionPickerFor((prev) => (prev === mid ? null : mid));
                                        }}
                                      >
                                        <i className="ri-emotion-happy-line" aria-hidden />
                                      </button>
                                    )}
                                  </div>
                                  {chips.length > 0 && (
                                    <div
                                      className={`${chatStyles.reactionRow} ${isMe ? "justify-end" : "justify-start"}`}
                                    >
                                      {chips.map((chip) => {
                                        const people = `${chip.count} ${chip.count === 1 ? "person" : "people"}`;
                                        return (
                                          <button
                                            key={chip.emoji}
                                            type="button"
                                            aria-pressed={chip.mine}
                                            aria-label={`React with ${chip.emoji}, ${people}${chip.mine ? ", including you" : ""}`}
                                            title={chip.names.length ? chip.names.join(", ") : people}
                                            className={`${chatStyles.reactionChip} ${chip.mine ? chatStyles.reactionChipMine : ""}`}
                                            onClick={() => void handleReact(m, reactionToggleEmoji(myEmoji, chip.emoji))}
                                          >
                                            <span aria-hidden>{chip.emoji}</span>
                                            {chip.count > 1 && (
                                              <span className="text-xs tabular-nums" aria-hidden>
                                                {chip.count}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {pickerOpen && (
                                    <div
                                      ref={reactionPickerRef}
                                      role="group"
                                      aria-label="Choose a reaction"
                                      className={`${chatStyles.reactionPicker} ${isMe ? "right-0" : "left-0"}`}
                                    >
                                      {REACTION_EMOJIS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          aria-pressed={myEmoji === emoji}
                                          aria-label={myEmoji === emoji ? `Remove ${emoji} reaction` : `React with ${emoji}`}
                                          className={`${chatStyles.pickerEmoji} ${myEmoji === emoji ? chatStyles.pickerEmojiActive : ""}`}
                                          onClick={() => void handleReact(m, reactionToggleEmoji(myEmoji, emoji))}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
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
                    aria-label="Cancel reply"
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
                  accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className={`${chatStyles.toolBtn} flex-shrink-0`}
                  title="Attach file"
                  aria-label="Attach file"
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
                  voicePreview ? (
                    <div className={chatStyles.voicePreviewBar} role="group" aria-label="Voice note preview">
                      <button
                        type="button"
                        className={chatStyles.voicePreviewPlay}
                        title={voicePlaying ? "Pause" : "Play"}
                        aria-label={voicePlaying ? "Pause voice note" : "Play voice note"}
                        onClick={toggleVoicePreviewPlayback}
                        disabled={voiceSending}
                      >
                        <i className={voicePlaying ? "ri-pause-fill" : "ri-play-fill"} aria-hidden />
                      </button>
                      <span className={chatStyles.voicePreviewDuration}>
                        {formatVoiceElapsed(voicePreview.durationMs || voiceElapsedMs)}
                      </span>
                      <button
                        type="button"
                        className={chatStyles.voicePreviewDiscard}
                        title="Discard"
                        aria-label="Discard voice note"
                        onClick={discardVoicePreview}
                        disabled={voiceSending}
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        className={chatStyles.voicePreviewSend}
                        title="Send"
                        aria-label="Send voice note"
                        onClick={sendVoicePreview}
                        disabled={
                          voiceSending ||
                          !canSendVoicePreview({
                            phase: "preview",
                            blob: voicePreview.blob,
                            sending: voiceSending,
                          })
                        }
                      >
                        {voiceSending ? (
                          <i className="ri-loader-4-line animate-spin" aria-hidden />
                        ) : (
                          "Send"
                        )}
                      </button>
                    </div>
                  ) : isRecording ? (
                    <div className={chatStyles.voiceRecordBar} role="group" aria-label="Recording voice note">
                      <span className={chatStyles.voiceRecordDot} aria-hidden />
                      <span className={chatStyles.voiceRecordTimer}>{formatVoiceElapsed(voiceElapsedMs)}</span>
                      {VOICE_NOTE_MAX_MS - voiceElapsedMs <= VOICE_NOTE_WARN_REMAINING_MS && (
                        <span className={chatStyles.voiceRemaining} aria-live="polite">
                          {formatVoiceElapsed(Math.max(0, VOICE_NOTE_MAX_MS - voiceElapsedMs))} left
                        </span>
                      )}
                      <button
                        type="button"
                        className={`${chatStyles.toolBtn} flex-shrink-0`}
                        title="Cancel recording"
                        aria-label="Cancel recording"
                        onClick={cancelVoiceRecording}
                      >
                        <i className="ri-delete-bin-line" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={`${chatStyles.toolBtn} flex-shrink-0 ${chatStyles.voiceStopBtn}`}
                        title="Stop recording"
                        aria-label="Stop recording"
                        onClick={stopVoiceNote}
                      >
                        <i className="ri-stop-circle-fill" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`${chatStyles.toolBtn} flex-shrink-0`}
                      title="Record voice note"
                      aria-label={voiceStarting ? "Starting microphone" : "Record voice note"}
                      aria-busy={voiceStarting}
                      onClick={startVoiceNote}
                      disabled={uploading || voiceSending || voiceStarting}
                    >
                      <i className={voiceStarting ? "ri-loader-4-line animate-spin" : "ri-mic-line"} aria-hidden />
                    </button>
                  )
                ) : null}
                <div className="relative flex-1">
                  <textarea
                    ref={composerRef}
                    rows={1}
                    className={`form-control w-full ${chatStyles.composerInput}`}
                    placeholder="Message…"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      autoResizeComposer(e.target);
                      handleTyping();
                      refreshMentionState(e.target.value, e.target.selectionStart);
                    }}
                    onSelect={(e) => {
                      const el = e.target as HTMLTextAreaElement;
                      refreshMentionState(el.value, el.selectionStart);
                    }}
                    onKeyDown={(e) => {
                      if (mentionToken && mentionSuggestions.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setMentionActiveIndex((prev) => (prev + 1) % mentionSuggestions.length);
                          return;
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setMentionActiveIndex(
                            (prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length
                          );
                          return;
                        }
                        if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
                          e.preventDefault();
                          const active = mentionSuggestions[mentionActiveIndex] || mentionSuggestions[0];
                          if (active) applyMention(active);
                          return;
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          clearMentionState();
                          return;
                        }
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    aria-label="Message text"
                  />
                  {mentionToken && mentionSuggestions.length > 0 && (
                    <div
                      className="absolute bottom-full left-0 z-30 mb-2 w-[min(20rem,90vw)] rounded-lg border border-black/5 dark:border-white/10 bg-white dark:bg-gray-800 shadow-lg py-1"
                      role="listbox"
                      aria-label="Mention suggestions"
                    >
                      {mentionSuggestions.map((member, idx) => (
                        <button
                          key={member.id}
                          type="button"
                          className={`w-full text-start px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 ${
                            idx === mentionActiveIndex ? "bg-black/5 dark:bg-white/10" : ""
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyMention(member);
                          }}
                        >
                          <span className="block text-sm font-medium">@{member.name}</span>
                          {member.email ? (
                            <span className="block text-[0.7rem] text-[#8c9097]">{member.email}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

        <ChatToast toast={toast} />

        {/* ── Right details panel ──
            ≥1024px: inline column (only rendered while open, so no empty reserved column).
            <1024px: overlay sheet over a scrim; scrim click / Escape / X close it. Closing never
            touches the selected conversation. */}
        {isOpen && selectedConversation && (
          <>
          <div className={chatStyles.sideScrim} onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className={`${chatStyles.sidePanelShell} ${chatStyles.sidePanelShellOpen}`}>
        <div
          id="chat-side-details-panel"
          ref={sidePanelRef}
          tabIndex={-1}
          role="dialog"
          aria-label={selectedConversation.type === "group" ? "Group info" : "Contact info"}
          className={`chat-user-details open ${chatStyles.sidePanel} border-0 dark:border-0`}
        >
          {selectedConversation.type === "group" && (
            <GroupInfoPanel
              key={convId || ""}
              muted={!!selectedConversation.muted}
              muteBusy={muteBusy}
              onToggleMute={() => void handleToggleMute()}
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
                if (!cid || !myId) return;
                removeParticipant(cid, myId).then(() => {
                  setIsOpen(false);
                  setGroupInfoData(null);
                  deselectConversation();
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
                if (!scopeReady || scope === "none") return;
                const res = await searchUsers({ search: addMemberSearch.trim(), limit: 20 });
                setAddMemberResults(res.results || []);
              }}
            />
          )}
          {selectedConversation.type !== "group" && (
            <div className={chatStyles.sideCard}>
              <header className={chatStyles.groupInfoHeader}>
                <div className={chatStyles.groupInfoHeaderTitles}>
                  <span className={chatStyles.groupInfoHeaderEyebrow}>Details</span>
                  <h2 className={chatStyles.groupInfoHeaderTitle}>Contact info</h2>
                </div>
                <button
                  type="button"
                  className={chatStyles.groupInfoClose}
                  onClick={() => setIsOpen(false)}
                  aria-label="Close contact info"
                >
                  <i className="ri-close-line" aria-hidden />
                </button>
              </header>
              <div className="text-center mb-4 px-3">
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
              <div className="mb-4 text-start">
                <MuteToggle
                  muted={!!selectedConversation.muted}
                  busy={muteBusy}
                  onToggle={() => void handleToggleMute()}
                />
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
          </>
        )}
        </div>
      </div>

      {/* ── New chat / New group modal ── */}
      {showNewChat && (
        <div className={chatStyles.modalBackdrop} onClick={closeNewChatModal} role="presentation">
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
                  onClick={() => switchNewChatMode("direct")}
                >
                  <i className="ri-chat-3-line me-1.5 align-middle" />
                  Direct
                </button>
                {scope !== "none" && (
                  <button
                    type="button"
                    className={`${chatStyles.modeBtn} ${newChatMode === "group" ? chatStyles.modeBtnActive : ""}`}
                    onClick={() => switchNewChatMode("group")}
                  >
                    <i className="ri-group-2-line me-1.5 align-middle" />
                    Group
                  </button>
                )}
              </div>
            </div>
            <div className={chatStyles.modalBody}>
              {!scopeReady ? (
                <div className="p-6 text-center text-defaulttextcolor/60 text-sm">
                  Loading contact options…
                </div>
              ) : scope === "none" ? (
                <EmailLookupPanel
                  onStarted={(conversationId) => {
                    closeNewChatModal();
                    getConversation(conversationId)
                      .then((conv) => {
                        selectConversation(conv);
                        fetchConversations();
                      })
                      .catch(() => showToast("Chat started, but it couldn't be opened. Find it in your list."));
                  }}
                />
              ) : (
                <>
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
                      {scope === "referred"
                        ? "My referred candidates"
                        : newChatMode === "group"
                          ? "Select members"
                          : "Search for users to add."}
                    </p>
                    {newChatMode === "group" && selectedUserIds.size > 0 && (
                      <div className={chatStyles.addChipTray}>
                        <p className={chatStyles.addChipTrayLabel}>
                          Selected members ({selectedUserIds.size})
                        </p>
                        {selectedMemberChipEntries(selectedUserIds, selectedUserLabels).map(({ id, label }) => (
                          <span key={id} className={chatStyles.addChip}>
                            <span className={chatStyles.addChipLabel} title={label}>
                              {label}
                            </span>
                            <button
                              type="button"
                              className={chatStyles.addChipRemove}
                              onClick={() => toggleUserForGroup(id, label)}
                              aria-label={`Remove ${label} from group`}
                            >
                              <i className="ri-close-line text-sm leading-none" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
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
                                newChatMode === "group"
                                  ? toggleUserForGroup(String(uid), u.name || u.email || "")
                                  : handleStartChat(u)
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
                </>
              )}
            </div>
            <div className={chatStyles.modalFoot}>
              <button
                type="button"
                className="ti-btn ti-btn-outline-secondary rounded-lg"
                onClick={closeNewChatModal}
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

      {/* ── Delete confirmation modal ── */}
      {deleteConfirm && (() => {
        const copy = getDeleteConfirmCopy(deleteConfirm.mode, selectedConversation?.type === "group");
        const confirmBusy = deletingMessage || deletingChat;
        return (
          <div
            className={chatStyles.modalBackdrop}
            onClick={closeDeleteConfirm}
            role="presentation"
          >
            <div
              className={`${chatStyles.modalPanel} ${chatStyles.confirmPanel}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-confirm-title"
              aria-describedby="delete-confirm-desc"
            >
              <div className={chatStyles.modalHead}>
                <div className={chatStyles.modalHeadRow}>
                  <h5 id="delete-confirm-title" className={chatStyles.confirmTitle}>
                    <i className="ri-delete-bin-line me-2 text-danger" aria-hidden />
                    {copy.title}
                  </h5>
                  <button
                    type="button"
                    className={chatStyles.modalCloseBtn}
                    onClick={closeDeleteConfirm}
                    disabled={confirmBusy}
                    aria-label="Close"
                  >
                    <i className="ri-close-line text-lg" aria-hidden />
                  </button>
                </div>
              </div>
              <div className={chatStyles.modalBody}>
                <p id="delete-confirm-desc" className={chatStyles.confirmMessage}>
                  {copy.message}
                </p>
              </div>
              <div className={chatStyles.modalFoot}>
                <button
                  ref={deleteConfirmCancelRef}
                  type="button"
                  className={chatStyles.confirmCancelBtn}
                  onClick={closeDeleteConfirm}
                  disabled={confirmBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={chatStyles.confirmDangerBtn}
                  onClick={() => void executeDeleteConfirm()}
                  disabled={confirmBusy}
                >
                  {confirmBusy ? (
                    <>
                      <i className="ri-loader-4-line animate-spin me-1.5" aria-hidden />
                      Deleting...
                    </>
                  ) : (
                    copy.confirmLabel
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Forward message modal ── */}
      {forwardingMessage && (
        <div className={chatStyles.modalBackdrop} onClick={closeForwardModal} role="presentation">
          <div
            className={chatStyles.modalPanel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="forward-message-title"
          >
            <div className={chatStyles.modalHead}>
              <h5 id="forward-message-title" className={chatStyles.modalTitle}>
                Forward message
              </h5>
            </div>
            <div className={chatStyles.modalBody}>
              <div className="mb-4 rounded-lg border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-sm">
                <p className="mb-0 text-defaulttextcolor/70 truncate">
                  {forwardingMessage.type === "image"
                    ? "Photo"
                    : forwardingMessage.type === "file"
                      ? "File"
                      : forwardingMessage.type === "audio"
                        ? "Voice note"
                        : (forwardingMessage.content || "").slice(0, 120) +
                          ((forwardingMessage.content || "").length > 120 ? "…" : "")}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-defaulttextcolor/80 mb-1.5" htmlFor="forward-chat-search">
                  Forward to
                </label>
                <input
                  id="forward-chat-search"
                  className="form-control rounded-lg"
                  placeholder="Search chats…"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                />
              </div>
              <ul className={chatStyles.userPickList}>
                {forwardableConversations.length === 0 ? (
                  <li className="py-8 text-center text-defaulttextcolor/60 text-sm px-3">
                    {forwardSearch.trim() ? "No chats match your search." : "No other chats available."}
                  </li>
                ) : (
                  forwardableConversations.map((c) => {
                    const convId = getId(c);
                    if (!convId) return null;
                    const isSelected = forwardTargets.has(convId);
                    return (
                      <li
                        key={convId}
                        className={`${chatStyles.userPickItem} ${isSelected ? chatStyles.userPickSelected : ""}`}
                        onClick={() => toggleForwardTarget(convId)}
                      >
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? "bg-primary border-primary" : "border-defaultborder dark:border-white/20"
                          }`}
                        >
                          {isSelected && <i className="ri-check-line text-white text-xs" />}
                        </span>
                        <span className="avatar avatar-sm avatar-rounded flex-shrink-0">
                          <img src={conversationAvatar(c)} alt="" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="mb-0 font-medium truncate">{displayName(c)}</p>
                          <p className="text-[0.75rem] text-defaulttextcolor/60 truncate">
                            {c.type === "group" ? "Group" : "Direct message"}
                          </p>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
            <div className={chatStyles.modalFoot}>
              <button
                type="button"
                className="ti-btn ti-btn-outline-secondary rounded-lg"
                onClick={closeForwardModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary rounded-lg min-w-[140px]"
                onClick={() => void handleForwardSubmit()}
                disabled={forwardTargets.size === 0 || forwarding}
              >
                {forwarding ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-1.5" />
                    Forwarding...
                  </>
                ) : (
                  <>
                    <i className="ri-share-forward-line me-1.5" />
                    Forward {forwardTargets.size > 0 && `(${forwardTargets.size})`}
                  </>
                )}
              </button>
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
