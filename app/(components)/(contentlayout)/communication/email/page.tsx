"use client";

import { DM_Sans, Newsreader } from "next/font/google";
import Seo from "@/shared/layout-components/seo/seo";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";
import * as emailApi from "@/shared/lib/api/email";
import mailStyles from "./mail-app.module.css";
import type {
  EmailAccount,
  EmailConnectionPolicy,
  EmailDraftLength,
  EmailDraftOption,
  EmailDraftTone,
  EmailLabel,
  EmailMessage,
  EmailThreadListItem,
  AgentEmailTemplate,
  AgentEmailTemplateShared,
} from "@/shared/lib/api/email";
import { useAuth } from "@/shared/contexts/auth-context";
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildReplyAllRecipients,
  recipientsFromHeaderString,
  validateRecipientList,
} from "@/shared/lib/email-recipient-utils";
import EmailRecipientField from "@/shared/components/email/EmailRecipientField";
import { hasEmailManageAccess, hasEmailReadAccess } from "@/shared/lib/permissions";
import { buildMailQuery } from "@/shared/lib/mailQuery";
import { escapeHtmlForTextNode, sanitizeRichHtml } from "@/shared/lib/sanitize-html";
import { buildForwardQuote, buildReplyQuote, cleanHtmlForSend } from "./_utils/composeHtml";
import { parseQuickRecipients } from "./_utils/quickRecipients";
import { buildPrintDocument } from "./_utils/printEmail";
import { resolveBulkTargets } from "./_utils/bulkSelection";
import { htmlHasBlockedImages, prepareMailBodyHtml } from "./_utils/mailHtmlBody";
import { isPermanentDeleteFolderId, isSpamFolderId } from "./_utils/deleteScope";
import { ARCHIVE_LABEL_ID, resolveListScope } from "./_utils/listScope";
import FocusLock from "react-focus-lock";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import MailConfirmDialog from "./MailConfirmDialog";

type ComposeMode = "new" | "reply" | "replyAll" | "forward";

/**
 * Feedback for an action the user just took. Replaces alert(), which stole focus,
 * was announced as a system dialog rather than as page content, and left the user
 * with no way to retry the thing that failed.
 */
type MailNotice = {
  tone: "error" | "success";
  message: string;
  action?: { label: string; onClick: () => void };
};
type MailConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};
type ComposeAttachment = {
  id: string;
  filename: string;
  content: string;
  mimeType: string;
  size: number;
};

const AI_TONE_OPTIONS: { value: EmailDraftTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "persuasive", label: "Persuasive" },
  { value: "empathetic", label: "Empathetic" },
];

const AI_LENGTH_OPTIONS: { value: EmailDraftLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

const PRACTICAL_ATTACHMENT_LIMIT_BYTES = {
  gmail: 22 * 1024 * 1024,
  outlook: 18 * 1024 * 1024,
} as const;

const mailBody = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const mailDisplay = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const LABEL_ICONS: Record<string, string> = {
  // Gmail
  INBOX: "ri-inbox-line",
  SENT: "ri-send-plane-line",
  DRAFT: "ri-file-edit-line",
  TRASH: "ri-delete-bin-line",
  SPAM: "ri-spam-2-line",
  STARRED: "ri-star-line",
  IMPORTANT: "ri-flag-line",
  UNREAD: "ri-mail-line",
  CATEGORY_PERSONAL: "ri-inbox-archive-line",
  CATEGORY_SOCIAL: "ri-user-shared-line",
  CATEGORY_PROMOTIONS: "ri-price-tag-3-line",
  CATEGORY_UPDATES: "ri-refresh-line",
  CATEGORY_FORUMS: "ri-chat-3-line",
  // Outlook
  JUNK: "ri-spam-2-line",
  ARCHIVE: "ri-archive-line",
  OUTBOX: "ri-send-plane-2-line",
  conversationhistory: "ri-chat-history-line",
  notes: "ri-sticky-note-line",
};

const MAX_GMAIL_ACCOUNTS = 3;
const MAX_OUTLOOK_ACCOUNTS = 1;
/** Snapshot of account ids before OAuth redirect; used to select newly linked mailbox on return. */
const STORAGE_EMAIL_ACCOUNTS_SNAPSHOT = "dharwin_email_accounts_before_oauth";

const MAILS_ORDER = [
  "INBOX",
  "SENT",
  "DRAFT",
  "JUNK",
  "SPAM",
  "IMPORTANT",
  "TRASH",
  "ARCHIVE",
  "OUTBOX",
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
  "STARRED",
  "conversationhistory",
  "notes",
];

function getLabelIcon(labelId: string): string {
  return LABEL_ICONS[labelId] || "ri-price-tag-line";
}

/** Gmail folder-counts keys → normalized label ids used in the nav. */
const GMAIL_FOLDER_COUNT_KEY_BY_LABEL: Record<string, string> = {
  INBOX: "inbox",
  SENT: "sent",
  DRAFT: "draft",
  SPAM: "spam",
  TRASH: "trash",
  IMPORTANT: "important",
  STARRED: "starred",
};

function mergeGmailLabelCounts(
  labels: EmailLabel[],
  counts: emailApi.EmailFolderCounts
): EmailLabel[] {
  return labels.map((label) => {
    const key = GMAIL_FOLDER_COUNT_KEY_BY_LABEL[label.id];
    const bucket = key ? counts[key] : undefined;
    if (!bucket) return label;
    return { ...label, unread: bucket.unread, total: bucket.total };
  });
}

function formatMailNavBadgeCount(count: number): string {
  if (count > 999) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function MailNavUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="badge !rounded-full !bg-success/20 !text-success !text-[.65rem] !px-1.5 !py-0"
      title="Unread conversations"
    >
      {formatMailNavBadgeCount(count)}
    </span>
  );
}

/** Human-readable dates in list + reading pane (avoids raw ISO like 2024-03-18T09:25:58Z). */
function formatMailListDate(iso: string | null | undefined): string {
  if (!iso || !String(iso).trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function emailToDisplayName(email: string): string {
  const local = email.split("@")[0] || "User";
  return local.charAt(0).toUpperCase() + local.slice(1).replace(/[._0-9]+/g, " ");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

function splitComposeSignature(html: string): { bodyHtml: string; signatureHtml: string } {
  const signatureMatch = String(html || "").match(/<div[^>]*data-email-signature="true"[^>]*>[\s\S]*?<\/div>/i);
  return {
    bodyHtml: String(html || "").replace(/<div[^>]*data-email-signature="true"[^>]*>[\s\S]*?<\/div>/i, "").trim(),
    signatureHtml: signatureMatch?.[0] || "",
  };
}

function hasMeaningfulComposeBody(html: string): boolean {
  const { bodyHtml } = splitComposeSignature(html);
  const plain = bodyHtml
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  return plain.length > 0;
}

function joinComposeBodyAndSignature(bodyHtml: string, signatureHtml: string): string {
  const cleanedBody = String(bodyHtml || "").trim();
  if (cleanedBody) return `${cleanedBody}${signatureHtml}`;
  if (signatureHtml) return `<p></p>${signatureHtml}`;
  return "<p></p>";
}

function appendDraftToCompose(existingHtml: string, draftHtml: string): string {
  const { bodyHtml, signatureHtml } = splitComposeSignature(existingHtml);
  const trimmedBody = String(bodyHtml || "").trim();
  const trimmedDraft = String(draftHtml || "").trim();
  if (!trimmedDraft) {
    return joinComposeBodyAndSignature(trimmedBody, signatureHtml);
  }
  const nextBody = hasMeaningfulComposeBody(trimmedBody) ? `${trimmedBody}<p><br></p>${trimmedDraft}` : trimmedDraft;
  return joinComposeBodyAndSignature(nextBody, signatureHtml);
}

function replaceComposeBody(existingHtml: string, draftHtml: string): string {
  const { signatureHtml } = splitComposeSignature(existingHtml);
  return joinComposeBodyAndSignature(String(draftHtml || "").trim(), signatureHtml);
}

/**
 * Below this viewport width the mail app is master-detail: the thread list and
 * the reading pane take turns owning the row instead of sharing it. Mirrored in
 * mail-app.module.css — change both together.
 */
const MASTER_DETAIL_MAX_WIDTH = 1600;

const Mailapp = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, permissionsLoaded } = useAuth();
  const canUseEmailPreferences = hasEmailReadAccess(permissions ?? []);
  const canManageEmail = hasEmailManageAccess(permissions ?? []);
  const canSeeEmailPolicy =
    permissionsLoaded && (hasEmailReadAccess(permissions ?? []) || hasEmailManageAccess(permissions ?? []));
  const isAgentRef = useRef(canUseEmailPreferences);
  useEffect(() => {
    isAgentRef.current = canUseEmailPreferences;
  }, [canUseEmailPreferences]);

  const [agentTemplatesOwn, setAgentTemplatesOwn] = useState<AgentEmailTemplate[]>([]);
  const [agentTemplatesShared, setAgentTemplatesShared] = useState<AgentEmailTemplateShared[]>([]);
  const [agentSignature, setAgentSignature] = useState<emailApi.AgentEmailSignature | null>(null);
  const agentSignatureRef = useRef<{ html: string; enabled: boolean } | null>(null);
  const [showComposeTemplatesMenu, setShowComposeTemplatesMenu] = useState(false);
  const composeTemplatesMenuRef = useRef<HTMLDivElement | null>(null);
  /** The portalled list itself, so outside-click and the focus lock can see it. */
  const composeTemplatesListRef = useRef<HTMLDivElement | null>(null);
  const composeTemplatesBtnRef = useRef<HTMLButtonElement | null>(null);
  const [templatesMenuPosition, setTemplatesMenuPosition] = useState<{
    bottom: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!agentSignature) {
      agentSignatureRef.current = null;
      return;
    }
    agentSignatureRef.current = {
      html: agentSignature.html || "",
      enabled: Boolean(agentSignature.enabled),
    };
  }, [agentSignature]);

  useEffect(() => {
    if (!permissionsLoaded || !canUseEmailPreferences) {
      setAgentTemplatesOwn([]);
      setAgentTemplatesShared([]);
      setAgentSignature(null);
      return;
    }
    (async () => {
      try {
        const [tpl, sig] = await Promise.all([
          emailApi.listAgentEmailTemplates(),
          emailApi.getAgentEmailSignature(),
        ]);
        setAgentTemplatesOwn(tpl.own);
        setAgentTemplatesShared(tpl.shared);
        setAgentSignature(sig);
      } catch {
        setAgentTemplatesOwn([]);
        setAgentTemplatesShared([]);
      }
    })();
  }, [permissionsLoaded, canUseEmailPreferences]);

  useEffect(() => {
    if (!showComposeTemplatesMenu) return;
    const close = () => {
      setShowComposeTemplatesMenu(false);
      setTemplatesMenuPosition(null);
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // The list is portalled out of the trigger's subtree, so it has to be
      // checked separately or clicking a template would dismiss the menu.
      if (composeTemplatesMenuRef.current?.contains(target)) return;
      if (composeTemplatesListRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        composeTemplatesBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    // Capture phase so Escape closes this menu before the compose window's own
    // Escape handler sees it and tries to close the whole draft.
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [showComposeTemplatesMenu]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [gmailFolderCounts, setGmailFolderCounts] = useState<emailApi.EmailFolderCounts | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<string>("ALL");
  const [threads, setThreads] = useState<EmailThreadListItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<EmailMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<MailNotice | null>(null);
  const [mailConfirm, setMailConfirm] = useState<MailConfirmRequest | null>(null);
  const mailConfirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  /**
   * Set when the thread list could not be loaded. Without it a failed fetch and a
   * genuinely empty folder both rendered "Nothing here yet", so an outage or an
   * expired mailbox looked exactly like an empty inbox.
   */
  const [listError, setListError] = useState<string | null>(null);
  /** Provider outage during account load — kept separate from folder listError. */
  const [providerWarning, setProviderWarning] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState(false);
  const [mailboxPolicy, setMailboxPolicy] = useState<EmailConnectionPolicy | null>(null);
  const [policyTick, setPolicyTick] = useState(0);

  const workLock =
    mailboxPolicy !== null &&
    mailboxPolicy.hardLockActive === true &&
    "expectedEmail" in mailboxPolicy &&
    String((mailboxPolicy as Extract<EmailConnectionPolicy, { hardLockActive: true }>).expectedEmail || "").trim() !== "";
  const expectedWorkEmail = workLock
    ? String((mailboxPolicy as Extract<EmailConnectionPolicy, { hardLockActive: true }>).expectedEmail).toLowerCase().trim()
    : "";
  // Memoised because the [] literal was a fresh array on every render, which made
  // the two connect handlers that depend on it new functions on every render too.
  const lockAllowedProviders: ("gmail" | "outlook")[] = useMemo(
    () =>
      workLock
        ? (mailboxPolicy as Extract<EmailConnectionPolicy, { hardLockActive: true }>).allowedProviders
        : [],
    [workLock, mailboxPolicy]
  );

  const navMailboxAccounts = useMemo(() => {
    if (!workLock) return accounts;
    return accounts.filter((a) => (a.email || "").toLowerCase() === expectedWorkEmail);
  }, [accounts, workLock, expectedWorkEmail]);

  /** Locked org with assignment but no connected mailbox matching the assignment (wrong or zero accounts). */
  const needsCompanyMailboxConnect = workLock && navMailboxAccounts.length === 0;
  const showMailEmptyStage = !loading && (accounts.length === 0 || needsCompanyMailboxConnect);

  const mailProvider =
    accounts.find((a) => a.id === selectedAccountId)?.provider === "outlook" ? "outlook" : "gmail";
  const composeAttachmentLimitBytes = PRACTICAL_ATTACHMENT_LIMIT_BYTES[mailProvider];
  const composeAttachmentLimitLabel = `${formatBytes(composeAttachmentLimitBytes)} practical max for ${
    mailProvider === "outlook" ? "Outlook" : "Gmail"
  }`;

  const gmailAccountCount = useMemo(
    () => accounts.filter((a) => a.provider === "gmail").length,
    [accounts]
  );
  const outlookAccountCount = useMemo(
    () => accounts.filter((a) => a.provider === "outlook").length,
    [accounts]
  );
  const canAddMoreGmail = gmailAccountCount < MAX_GMAIL_ACCOUNTS;
  const canAddOutlookMailbox = outlookAccountCount < MAX_OUTLOOK_ACCOUNTS;
  const hasGmailAccount = gmailAccountCount > 0;
  const hasOutlookAccount = outlookAccountCount > 0;

  const [isMailNavigationVisible, setMailNavigationVisible] = useState(false);
  const [isTotalMailsVisible, setTotalMailsVisible] = useState(true);
  const [isTotalMailsHidden, setTotalMailsHidden] = useState(false);
  const [isMailsInformationVisible, setMailsInformationVisible] = useState(false);
  const selectedThreadIdRef = useRef<string | null>(null);
  selectedThreadIdRef.current = selectedThreadId;

  /** Drives single-pane layout below MASTER_DETAIL_MAX_WIDTH via data-mail-view on the column shell. */
  const mailView = useMemo((): "folders" | "list" | "detail" => {
    if (isMailNavigationVisible && !isTotalMailsVisible) return "folders";
    if (isMailsInformationVisible && selectedThreadId) return "detail";
    return "list";
  }, [isMailNavigationVisible, isTotalMailsVisible, isMailsInformationVisible, selectedThreadId]);

  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("new");
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [showComposeCc, setShowComposeCc] = useState(false);
  const [showComposeBcc, setShowComposeBcc] = useState(false);
  const [composeRecipientErrors, setComposeRecipientErrors] = useState<{
    to?: string;
    cc?: string;
    bcc?: string;
  }>({});
  const [composeSubject, setComposeSubject] = useState("");
  const [composeHtml, setComposeHtml] = useState("");
  const [inlineReplyHtml, setInlineReplyHtml] = useState("");
  /** Which thread the reply draft belongs to, so navigating back to it keeps it. */
  const inlineReplyThreadIdRef = useRef<string | null>(null);
  const [inlineReplyAttachments, setInlineReplyAttachments] = useState<
    { filename: string; content: string; mimeType: string }[]
  >([]);
  const [composeAttachments, setComposeAttachments] = useState<ComposeAttachment[]>([]);
  const [showComposeAiPanel, setShowComposeAiPanel] = useState(false);
  const [composeAiTone, setComposeAiTone] = useState<EmailDraftTone>("professional");
  const [composeAiLength, setComposeAiLength] = useState<EmailDraftLength>("medium");
  const [composeAiPrompt, setComposeAiPrompt] = useState("");
  const [composeAiContext, setComposeAiContext] = useState("");
  const [composeAiLoading, setComposeAiLoading] = useState(false);
  const [composeAiError, setComposeAiError] = useState<string | null>(null);
  const [composeAiSubject, setComposeAiSubject] = useState("");
  const [composeAiOptions, setComposeAiOptions] = useState<EmailDraftOption[]>([]);
  const [composeAttachmentError, setComposeAttachmentError] = useState<string | null>(null);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  /** Reply and reply-all derive their recipients server-side; only these two modes. */
  const isReplyMode = composeMode === "reply" || composeMode === "replyAll";
  const composeMessageRef = useRef<EmailMessage | null>(null);
  /** Bumped whenever compose opens or closes so in-flight forward attachment loads cannot land on a new draft. */
  const forwardAttachGenerationRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineReplyFileInputRef = useRef<HTMLInputElement>(null);
  const [showMailMenu, setShowMailMenu] = useState(false);
  const mailMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mailMenuRef = useRef<HTMLUListElement | null>(null);
  const [mailMenuPosition, setMailMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const labelButtonRef = useRef<HTMLButtonElement | null>(null);
  const labelMenuRef = useRef<HTMLDivElement | null>(null);
  const [labelMenuPosition, setLabelMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [createLabelExpanded, setCreateLabelExpanded] = useState(false);
  const [navCreateLabelOpen, setNavCreateLabelOpen] = useState(false);
  const [navLabelName, setNavLabelName] = useState("");
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddEmail, setQuickAddEmail] = useState("");
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [quickRecipients, setQuickRecipients] = useState<{ email: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return parseQuickRecipients(localStorage.getItem("email-quick-recipients"));
    } catch {
      // localStorage itself can throw (private mode, blocked site data).
      return [];
    }
  });

  const showError = useCallback((message: string, action?: MailNotice["action"]) => {
    setNotice({ tone: "error", message, action });
  }, []);
  const showSuccess = useCallback((message: string) => {
    setNotice({ tone: "success", message });
  }, []);

  const isPermanentDeleteFolder = isPermanentDeleteFolderId(selectedLabelId);
  const isSpamFolder = isSpamFolderId(selectedLabelId);

  /** The list row for the open thread, when it is in the loaded page. */
  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  /**
   * Labels for the open conversation.
   *
   * Falls back to the union across its fetched messages when there is no list
   * row. A link to a conversation beyond the loaded page has no row, and reading
   * labels from the row alone left the star showing unstarred, every label
   * showing unapplied and only ever addable, and archive believing the mail was
   * not in the inbox.
   */
  const openThreadLabelIds = useMemo(() => {
    if (selectedThread) return selectedThread.labelIds || [];
    return [...new Set(threadMessages.flatMap((m) => m.labelIds || []))];
  }, [selectedThread, threadMessages]);

  /**
   * Which conversation the reader has agreed to load remote media for.
   *
   * Held as a thread id rather than a boolean so it expires by itself when
   * another conversation is opened - consenting once must not quietly consent
   * for everything opened afterwards.
   */
  const [remoteImagesAllowedFor, setRemoteImagesAllowedFor] = useState<string | null>(null);
  const remoteImagesAllowed =
    remoteImagesAllowedFor !== null && remoteImagesAllowedFor === selectedThreadId;
  /**
   * Each message body, sanitized once, with remote media withheld unless the
   * reader has opted in for this conversation.
   */
  const preparedBodies = useMemo(
    () =>
      threadMessages.map((m) =>
        prepareMailBodyHtml(m.htmlBody, { loadRemoteImages: remoteImagesAllowed })
      ),
    [threadMessages, remoteImagesAllowed]
  );
  /** Only offer the banner when something was actually held back. */
  const threadHasRemoteImages = useMemo(
    () => preparedBodies.some(htmlHasBlockedImages),
    [preparedBodies]
  );

  const requestMailConfirm = useCallback((options: MailConfirmRequest): Promise<boolean> => {
    return new Promise((resolve) => {
      // Settle any dialog still waiting before replacing its resolver, or the
      // caller awaiting it would hang for the life of the page.
      mailConfirmResolverRef.current?.(false);
      mailConfirmResolverRef.current = resolve;
      setMailConfirm(options);
    });
  }, []);

  const settleMailConfirm = useCallback((confirmed: boolean) => {
    const resolve = mailConfirmResolverRef.current;
    mailConfirmResolverRef.current = null;
    setMailConfirm(null);
    resolve?.(confirmed);
  }, []);
  const confirmTrash = useCallback(
    async (count: number, scope: "selected" | "visible") => {
      const noun = count === 1 ? "conversation" : "conversations";
      const recover = count === 1 ? "it" : "them";
      const where =
        scope === "selected" ? `${count} selected ${noun}` : `all ${count} ${noun} loaded in this view`;

      // Inside Trash and Spam there is nowhere further to move to, so the action
      // is a permanent delete and has to say so. It used to offer "Move to trash"
      // for conversations that were already in trash.
      if (isPermanentDeleteFolder) {
        return requestMailConfirm({
          title: "Delete forever?",
          message: `This permanently deletes ${where}. This cannot be undone and ${
            count === 1 ? "it" : "they"
          } cannot be recovered.`,
          confirmLabel: "Delete forever",
          destructive: true,
        });
      }

      const message =
        scope === "selected"
          ? `${count} selected ${noun} will be moved to trash. You can recover ${recover} from Trash.`
          : `All ${count} ${noun} loaded in this view will be moved to trash. You can recover ${recover} from Trash.`;
      return requestMailConfirm({
        title: "Move to trash?",
        message,
        confirmLabel: "Move to trash",
        destructive: true,
      });
    },
    [requestMailConfirm, isPermanentDeleteFolder]
  );


  // OAuth failures on return only rendered on the connect stage; with mailboxes
  // already linked the main shell hid them entirely.
  useEffect(() => {
    if (!oauthError || showMailEmptyStage) return;
    showError(oauthError);
    setOauthError(null);
  }, [oauthError, showMailEmptyStage, showError]);

  // Success is transient; an error stays until the user dismisses it or acts on
  // it, so a failed send is never scrolled past unnoticed.
  useEffect(() => {
    if (notice?.tone !== "success") return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const Toggle1 = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < MASTER_DETAIL_MAX_WIDTH) {
      setMailNavigationVisible(true);
      setTotalMailsVisible(false);
      setTotalMailsHidden(true);
      setMailsInformationVisible(false);
    }
  }, []);

  /** Opening a thread on a narrow screen: hand the width to the reading pane. */
  const Medium = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < MASTER_DETAIL_MAX_WIDTH) {
      setMailsInformationVisible(true);
      setTotalMailsVisible(false);
      setTotalMailsHidden(true);
    }
  }, []);

  /** The exact inverse of Medium(): give the width back to the thread list. */
  const restoreMobileListLayout = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < MASTER_DETAIL_MAX_WIDTH) {
      setMailsInformationVisible(false);
      setTotalMailsVisible(true);
      setTotalMailsHidden(false);
    }
  }, []);

  /**
   * Chose a folder: show its thread list.
   *
   * This used to act only at 992px and under, while Medium() hides the list all
   * the way up to MASTER_DETAIL_MAX_WIDTH. Between those two widths - every tablet - opening a
   * thread hid the list and nothing brought it back, so picking another folder
   * left the reading pane on screen showing the previous thread.
   */
  const Toggle2 = useCallback(() => {
    if (typeof window === "undefined") return;
    restoreMobileListLayout();
    if (window.innerWidth < MASTER_DETAIL_MAX_WIDTH) setMailNavigationVisible(false);
  }, [restoreMobileListLayout]);

  /**
   * Single entry point for choosing a folder.
   *
   * The four call sites had drifted: All Mails and Inbox cleared searchQuery but
   * not searchInput, so the box still showed a term that was no longer applied,
   * and the label rows cleared neither, so a search silently carried over into
   * the folder you had just opened.
   */
  const selectFolder = useCallback(
    (labelId: string) => {
      setSelectedLabelId(labelId);
      setSearchInput("");
      setSearchQuery("");
      Toggle2();
    },
    [Toggle2]
  );

  const backToThreadList = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("thread");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    setSelectedThreadId(null);
    setThreadMessages([]);
    restoreMobileListLayout();
  }, [router, pathname, searchParams, restoreMobileListLayout]);

  useEffect(() => {
    const syncLayoutForWidth = (width: number) => {
      if (width >= MASTER_DETAIL_MAX_WIDTH) {
        setMailNavigationVisible(false);
        setTotalMailsVisible(true);
        setTotalMailsHidden(false);
        if (!selectedThreadIdRef.current) {
          setMailsInformationVisible(false);
        }
        return;
      }
      setMailNavigationVisible(false);
      if (selectedThreadIdRef.current) {
        setMailsInformationVisible(true);
        setTotalMailsVisible(false);
        setTotalMailsHidden(true);
      } else {
        setMailsInformationVisible(false);
        setTotalMailsVisible(true);
        setTotalMailsHidden(false);
      }
    };
    const handleResize = () => {
      if (typeof window === "undefined") return;
      syncLayoutForWidth(window.innerWidth);
    };
    // Initial state is wrong for desktop (total-mails flags start false). Sync only wide viewports;
    // do not call full handleResize() on mount — that would hide the thread list on tablet before a thread is opened.
    if (typeof window !== "undefined" && window.innerWidth >= MASTER_DETAIL_MAX_WIDTH) {
      syncLayoutForWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("email-quick-recipients", JSON.stringify(quickRecipients));
    } catch {
      // ignore
    }
  }, [quickRecipients]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (error) {
      const dec = decodeURIComponent(error);
      const friendly: Record<string, string> = {
        MAILBOX_MISMATCH:
          "That sign-in does not match your company-assigned mailbox. Use the exact address your administrator set, then try again.",
        POLICY_CHANGED:
          "Your company mailbox assignment changed while you were signing in. Please try connecting again.",
        WRONG_PROVIDER: "Use the email provider (Gmail or Outlook) your organization selected for this mailbox.",
      };
      setOauthError(friendly[dec] ?? dec);
    }
    if (connected === "gmail" || connected === "outlook") setOauthSuccess(true);
    // Strip the callback params once handled. They used to survive every later
    // router.replace on this page, so the URL stayed advertising ?connected= or a
    // raw ?error= code, and reloading re-ran the callback handling.
    //
    // Only after the account load has finished: that load reads ?connected= from
    // window.location to pick out the mailbox just linked, so clearing it any
    // earlier would leave the new mailbox unselected.
    if (!loading && (connected || error)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("connected");
      params.delete("error");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [searchParams, router, pathname, loading]);

  useEffect(() => {
    if (!canSeeEmailPolicy) return;
    const bump = () => setPolicyTick((t) => t + 1);
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [canSeeEmailPolicy]);

  useEffect(() => {
    if (mailProvider !== "gmail") {
      setShowLabelDropdown(false);
      setLabelMenuPosition(null);
      setCreateLabelExpanded(false);
    }
  }, [mailProvider]);

  useEffect(() => {
    if (!showMailMenu) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        mailMenuRef.current?.contains(target) ||
        mailMenuButtonRef.current?.contains(target)
      )
        return;
      setShowMailMenu(false);
      setMailMenuPosition(null);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showMailMenu]);

  useEffect(() => {
    if (!showLabelDropdown) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        labelMenuRef.current?.contains(target) ||
        labelButtonRef.current?.contains(target)
      )
        return;
      setShowLabelDropdown(false);
      setLabelMenuPosition(null);
      setCreateLabelExpanded(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showLabelDropdown]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const oauthReturn =
          typeof window !== "undefined" &&
          (new URLSearchParams(window.location.search).get("connected") === "gmail" ||
            new URLSearchParams(window.location.search).get("connected") === "outlook");

        const [pol, accountsResult] = await Promise.all([
          canSeeEmailPolicy
            ? emailApi.getEmailConnectionPolicy().catch(() => ({ hardLockActive: false } as EmailConnectionPolicy))
            : Promise.resolve({ hardLockActive: false } as EmailConnectionPolicy),
          emailApi.getEmailAccounts(),
        ]);
        if (cancelled) return;
        const list = accountsResult.accounts;
        // A provider we could not reach is not the same as a provider with no
        // accounts. Say so, otherwise a connected mailbox just disappears - and
        // when it is the only one, the page offers to connect what is already
        // connected.
        if (accountsResult.unreachable.length > 0) {
          const names = accountsResult.unreachable
            .map((p) => (p === "outlook" ? "Outlook" : "Gmail"))
            .join(" and ");
          setProviderWarning(
            `We couldn't reach ${names} just now. Connected mailboxes may be missing until the provider responds again.`
          );
        } else {
          setProviderWarning(null);
        }

        setMailboxPolicy(pol);
        const polLock =
          pol.hardLockActive === true && "expectedEmail" in pol && String(pol.expectedEmail || "").trim() !== "";
        const exp = polLock ? String(pol.expectedEmail).toLowerCase().trim() : "";

        let preferredId: string | null = null;
        if (oauthReturn) {
          try {
            const raw = sessionStorage.getItem(STORAGE_EMAIL_ACCOUNTS_SNAPSHOT);
            if (raw != null) {
              const snapshot: string[] = JSON.parse(raw);
              sessionStorage.removeItem(STORAGE_EMAIL_ACCOUNTS_SNAPSHOT);
              const added = list.find((a) => !snapshot.includes(a.id));
              if (added) preferredId = added.id;
            }
          } catch {
            sessionStorage.removeItem(STORAGE_EMAIL_ACCOUNTS_SNAPSHOT);
          }
        }

        setAccounts(list);
        if (polLock) {
          const compliant = list.find((a) => (a.email || "").toLowerCase() === exp);
          if (preferredId && list.some((a) => a.id === preferredId) && list.find((a) => a.id === preferredId)?.email?.toLowerCase() === exp) {
            setSelectedAccountId(preferredId);
          } else if (compliant) {
            setSelectedAccountId(compliant.id);
          } else {
            setSelectedAccountId(null);
          }
        } else if (preferredId && list.some((a) => a.id === preferredId)) {
          setSelectedAccountId(preferredId);
        } else if (list.length > 0) {
          setSelectedAccountId((prev) =>
            prev && list.some((a) => a.id === prev) ? prev : list[0].id
          );
        } else {
          setSelectedAccountId(null);
        }
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setSelectedAccountId(null);
          setMailboxPolicy({ hardLockActive: false });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [oauthSuccess, policyTick, canSeeEmailPolicy]);

  useEffect(() => {
    const accountId = selectedAccountId;
    if (!accountId) {
      setLabels([]);
      setGmailFolderCounts(null);
      return;
    }
    const id: string = accountId;
    let cancelled = false;
    async function load() {
      try {
        const list = await emailApi.getLabels(id, mailProvider);
        if (cancelled) return;
        if (mailProvider === "gmail") {
          try {
            const counts = await emailApi.getFolderCounts(id, mailProvider);
            if (cancelled) return;
            setGmailFolderCounts(counts);
            setLabels(mergeGmailLabelCounts(list, counts));
          } catch {
            setGmailFolderCounts(null);
            setLabels(list);
          }
        } else {
          setGmailFolderCounts(null);
          setLabels(list);
        }
      } catch {
        if (!cancelled) {
          setLabels([]);
          setGmailFolderCounts(null);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // Depends on the selected account's provider, not on the accounts array: that
    // array is rebuilt on every window focus, and depending on it re-ran this and
    // every sibling effect - reloading labels, resetting the thread list to page
    // one and refetching the open thread each time the user came back to the tab.
  }, [selectedAccountId, mailProvider]);

  const refreshMailboxLabels = useCallback(async () => {
    const accountId = selectedAccountId;
    if (!accountId) {
      setLabels([]);
      setGmailFolderCounts(null);
      return;
    }
    try {
      const list = await emailApi.getLabels(accountId, mailProvider);
      if (mailProvider === "gmail") {
        try {
          const counts = await emailApi.getFolderCounts(accountId, mailProvider);
          setGmailFolderCounts(counts);
          setLabels(mergeGmailLabelCounts(list, counts));
        } catch {
          setGmailFolderCounts(null);
          setLabels(list);
        }
      } else {
        setGmailFolderCounts(null);
        setLabels(list);
      }
    } catch {
      setLabels([]);
      setGmailFolderCounts(null);
    }
  }, [selectedAccountId, mailProvider]);

  const bumpNavUnreadCounts = useCallback(
    (delta: number, labelIds: string[] = ["INBOX"]) => {
      if (delta === 0) return;
      setLabels((prev) =>
        prev.map((l) =>
          labelIds.includes(l.id) && typeof l.unread === "number"
            ? { ...l, unread: Math.max(0, l.unread + delta) }
            : l
        )
      );
      if (mailProvider !== "gmail" || !gmailFolderCounts) return;
      setGmailFolderCounts((prev) => {
        if (!prev) return prev;
        const next: emailApi.EmailFolderCounts = { ...prev };
        for (const labelId of labelIds) {
          const key = GMAIL_FOLDER_COUNT_KEY_BY_LABEL[labelId];
          if (key && next[key]) {
            next[key] = { ...next[key], unread: Math.max(0, next[key].unread + delta) };
          }
        }
        if (labelIds.includes("INBOX") && next.all) {
          next.all = { ...next.all, unread: Math.max(0, next.all.unread + delta) };
        }
        return next;
      });
    },
    [mailProvider, gmailFolderCounts]
  );

  // Outlook cannot use Gmail label ids as folder paths — reset when switching to Outlook
  useEffect(() => {
    if (!selectedAccountId || mailProvider !== "outlook") return;
    setSelectedLabelId((prev) => {
      if (
        prev.startsWith("CATEGORY_") ||
        prev.startsWith("Label_") ||
        ["STARRED", "IMPORTANT", "CHAT"].includes(prev)
      ) {
        return "INBOX";
      }
      return prev;
    });
  }, [selectedAccountId, mailProvider]);

  useEffect(() => {
    const accountId = selectedAccountId;
    if (!accountId) {
      setThreads([]);
      setNextPageToken(null);
      return;
    }
    const id: string = accountId;
    let cancelled = false;
    setLoadingMessages(true);
    setThreads([]);
    setNextPageToken(null);
    setListError(null);
    async function load() {
      try {
        const res = await emailApi.getThreads(
          {
            accountId: id,
            ...resolveListScope(mailProvider, selectedLabelId, searchQuery),
            pageSize: 20,
          },
          mailProvider
        );
        if (!cancelled) {
          setThreads(res.threads);
          setNextPageToken(res.nextPageToken);
        }
      } catch {
        if (!cancelled) {
          setThreads([]);
          // Distinguish "this folder is empty" from "we could not read it".
          setListError("We couldn't load this folder.");
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, selectedLabelId, searchQuery, mailProvider]);

  // Lets the retry action call the current loader without the callback depending
  // on itself.
  const loadMoreThreadsRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * Close the open thread when the list it came from is replaced.
   *
   * Changing folder or search reset `threads` but left `selectedThreadId`, so
   * `threads.find(...)` returned undefined and the reading pane rendered a blank
   * sender, recipient and date over the previous thread's body, with ?thread=
   * still in the URL. On a tablet the thread list stayed hidden too, leaving the
   * user stranded on that header-less pane.
   *
   * The first run is skipped so a ?thread= deep link, which resolves once the
   * list arrives, is not cleared out from under itself.
   */
  const listScopeRef = useRef<string | null>(null);
  useEffect(() => {
    // Nothing is scoped until a mailbox is selected. Tracking from mount recorded
    // a baseline with an empty account id, so the account arriving a moment later
    // looked like a folder change: it cleared the open thread and stripped
    // ?thread= from the URL before the deep link could ever resolve.
    if (!selectedAccountId) return;
    const scope = `${selectedAccountId}|${selectedLabelId}|${searchQuery}`;
    if (listScopeRef.current === null || listScopeRef.current === scope) {
      listScopeRef.current = scope;
      return;
    }
    listScopeRef.current = scope;
    setSelectedThreadId(null);
    setThreadMessages([]);
    restoreMobileListLayout();
    if (searchParams.get("thread")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("thread");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [
    selectedAccountId,
    selectedLabelId,
    searchQuery,
    restoreMobileListLayout,
    router,
    pathname,
    searchParams,
  ]);

  const loadMoreThreads = useCallback(async () => {
    if (!selectedAccountId || !nextPageToken) return;
    // Its own flag: sharing loadingMessages swapped the whole list for skeletons
    // on every "Load more", so the rows the user was reading vanished and the
    // scroll position was lost before the next page was appended.
    setLoadingMore(true);
    try {
      const res = await emailApi.getThreads(
        {
          accountId: selectedAccountId,
          ...resolveListScope(mailProvider, selectedLabelId, searchQuery),
          pageToken: nextPageToken,
          pageSize: 20,
        },
        mailProvider
      );
      setThreads((prev) => {
        // Outlook groups a page of messages into conversations, so a conversation
        // whose messages straddle a page boundary comes back on both pages. Left
        // unchecked that produced duplicate React keys, and a star or read toggle
        // updated both copies.
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...res.threads.filter((t) => !seen.has(t.id))];
      });
      setNextPageToken(res.nextPageToken);
    } catch {
      showError("Could not load more conversations.", {
        label: "Try again",
        onClick: () => void loadMoreThreadsRef.current?.(),
      });
    } finally {
      setLoadingMore(false);
    }
  }, [selectedAccountId, selectedLabelId, searchQuery, nextPageToken, mailProvider, showError]);

  loadMoreThreadsRef.current = loadMoreThreads;

  const retryLoadThreadDetail = useCallback(() => {
    if (!selectedAccountId || !selectedThreadId) return;
    setDetailError(null);
    setLoadingDetail(true);
    emailApi
      .getThread(selectedAccountId, selectedThreadId, mailProvider)
      .then((data) => {
        setThreadMessages(data.messages);
        setDetailError(null);
      })
      .catch(() => {
        setThreadMessages([]);
        setDetailError("We couldn't load this conversation.");
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedAccountId, selectedThreadId, mailProvider]);

  useEffect(() => {
    if (!selectedAccountId || !selectedThreadId) {
      setThreadMessages([]);
      return;
    }
    const tid = selectedThreadId;
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError(null);
    emailApi
      .getThread(selectedAccountId, tid, mailProvider)
      .then((data) => {
        if (!cancelled && selectedThreadId === tid) {
          setThreadMessages(data.messages);
          setDetailError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setThreadMessages([]);
          setDetailError("We couldn't load this conversation.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, selectedThreadId, mailProvider]);

  const handleConnectGmail = useCallback(async () => {
    const bypassGmailCap =
      workLock && lockAllowedProviders.includes("gmail") && !accounts.some((a) => (a.email || "").toLowerCase() === expectedWorkEmail);
    if (!bypassGmailCap && gmailAccountCount >= MAX_GMAIL_ACCOUNTS) {
      setOauthError(
        `Maximum of ${MAX_GMAIL_ACCOUNTS} Gmail accounts allowed. Disconnect one to add another.`
      );
      return;
    }
    try {
      try {
        sessionStorage.setItem(
          STORAGE_EMAIL_ACCOUNTS_SNAPSHOT,
          JSON.stringify(accounts.map((a) => a.id).sort())
        );
      } catch {
        /* ignore quota / private mode */
      }
      const { url } = await emailApi.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; code?: string } } };
      const msg = ax.response?.data?.message || ax.response?.data?.code;
      setOauthError(msg ? String(msg) : "Failed to get Google auth URL");
    }
  }, [gmailAccountCount, accounts, workLock, lockAllowedProviders, expectedWorkEmail]);

  const handleConnectOutlook = useCallback(async () => {
    const bypassOutlookCap =
      workLock &&
      lockAllowedProviders.includes("outlook") &&
      !accounts.some((a) => (a.email || "").toLowerCase() === expectedWorkEmail);
    if (!bypassOutlookCap && outlookAccountCount >= MAX_OUTLOOK_ACCOUNTS) {
      setOauthError(
        "Only one Outlook account is allowed. Disconnect it to connect a different mailbox."
      );
      return;
    }
    try {
      try {
        sessionStorage.setItem(
          STORAGE_EMAIL_ACCOUNTS_SNAPSHOT,
          JSON.stringify(accounts.map((a) => a.id).sort())
        );
      } catch {
        /* ignore */
      }
      const { url } = await emailApi.getMicrosoftAuthUrl();
      window.location.href = url;
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; code?: string } } };
      const msg = ax.response?.data?.message || ax.response?.data?.code;
      setOauthError(msg ? String(msg) : "Failed to get Microsoft auth URL");
    }
  }, [outlookAccountCount, accounts, workLock, lockAllowedProviders, expectedWorkEmail]);

  const handleDisconnect = useCallback(
    async (accountId: string) => {
      try {
        const p =
          accounts.find((a) => a.id === accountId)?.provider === "outlook" ? "outlook" : "gmail";
        await emailApi.disconnectAccount(accountId, p);
        const remaining = accounts.filter((a) => a.id !== accountId);
        setAccounts(remaining);
        if (selectedAccountId === accountId) {
          setSelectedAccountId(remaining.length > 0 ? remaining[0].id : null);
        }
      } catch (err: unknown) {
        const ax = err as { response?: { status?: number; data?: { code?: string; message?: string } } };
        if (ax.response?.status === 403 && ax.response?.data?.code === "MAILBOX_LOCKED") {
          setOauthError("This mailbox is locked to your company assignment. Your administrator must clear it before you can disconnect.");
        }
      }
    },
    [accounts, selectedAccountId]
  );

  const handleSelectThread = useCallback(
    async (thread: EmailThreadListItem) => {
      if (thread.id === selectedThreadId) {
        // Already open, but on a narrow screen the list may be what is on screen
        // right now - re-tapping the current row has to bring the reading pane
        // back, or the row looks dead.
        Medium();
        return;
      }
      // Returning to the thread the draft belongs to keeps it; only moving to a
      // different one discards it, and then only after asking. This used to wipe
      // the composer silently, so a half-written reply vanished on a stray click.
      const draftBelongsHere = inlineReplyThreadIdRef.current === thread.id;
      if (
        !draftBelongsHere &&
        hasMeaningfulComposeBody(inlineReplyHtml) &&
        !(await requestMailConfirm({
          title: "Discard reply?",
          message: "Discard the reply you started on the other thread?",
          confirmLabel: "Discard",
          destructive: true,
        }))
      ) {
        return;
      }
      setSelectedThreadId(thread.id);
      if (!draftBelongsHere) {
        setInlineReplyHtml("");
        setInlineReplyAttachments([]);
        inlineReplyThreadIdRef.current = null;
      }
      Medium();
      const params = new URLSearchParams(searchParams.toString());
      params.set("thread", thread.id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      if (thread.isUnread && selectedAccountId) {
        try {
          await emailApi.batchModifyThreads(
            {
              accountId: selectedAccountId,
              threadIds: [thread.id],
              addLabelIds: [],
              removeLabelIds: ["UNREAD"],
            },
            mailProvider
          );
          setThreads((prev) =>
            prev.map((t) =>
              t.id === thread.id ? { ...t, isUnread: false, labelIds: (t.labelIds || []).filter((l) => l !== "UNREAD") } : t
            )
          );

        } catch {
          // ignore
        }
      }
    },
    [
      Medium,
      selectedAccountId,
      selectedThreadId,
      inlineReplyHtml,
      mailProvider,
      router,
      pathname,
      searchParams,
      requestMailConfirm,
    ]
  );

  useEffect(() => {
    if (!selectedAccountId) return;
    const tid = searchParams.get("thread");
    if (!tid) {
      setSelectedThreadId((current) => (current === null ? current : null));
      restoreMobileListLayout();
      return;
    }
    // Open it whether or not it is in the loaded page. The link used to resolve
    // only against threads already fetched, so a shared link to anything beyond
    // the first 20 rows silently did nothing. The detail fetch works from the id
    // alone, and the reading-pane header falls back to the fetched messages.
    //
    // Do not depend on selectedThreadId here: backToThreadList clears selection
    // before router.replace updates searchParams, which used to re-run this effect
    // with a stale ?thread= and immediately reopen the pane (two-click back).
    setSelectedThreadId((current) => (current === tid ? current : tid));
    Medium();
  }, [searchParams, selectedAccountId, Medium, restoreMobileListLayout]);

  const lastMessageInThread = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;

  const handleSendInlineReply = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    if (!hasMeaningfulComposeBody(inlineReplyHtml)) {
      showError("Write something before sending the reply.");
      return;
    }
    let targetMsg: EmailMessage | null = lastMessageInThread;
    const thread = threads.find((t) => t.id === selectedThreadId);
    if (!targetMsg && thread?.lastMessageId) {
      try {
        targetMsg = await emailApi.getMessage(selectedAccountId, thread.lastMessageId, mailProvider);
      } catch {
        showError("Could not load the message you are replying to. Reopen the thread and try again.");
        return;
      }
    }
    if (!targetMsg) {
      showError("This thread has not finished loading yet. Give it a moment, then try again.");
      return;
    }

    // Its own flag, not the compose modal's: sharing one made the footer button
    // read "Sending..." for a send it was not performing.
    setSendingReply(true);
    let sent = false;
    try {
      await emailApi.replyMessage(
        targetMsg.id,
        {
          accountId: selectedAccountId,
          html: cleanHtmlForSend(inlineReplyHtml),
          attachments:
            inlineReplyAttachments.length > 0
              ? inlineReplyAttachments.map((a) => ({
                  filename: a.filename,
                  content: a.content,
                  mimeType: a.mimeType,
                }))
              : undefined,
        },
        mailProvider
      );
      sent = true;
    } catch {
      showError("Could not send the reply. Your text is still here - try again.");
    } finally {
      setSendingReply(false);
    }

    if (!sent) return;
    // Only clear the draft once the send has actually resolved, and refresh the
    // thread as a separate failable step so a refresh hiccup cannot read as a
    // failed reply.
    setInlineReplyHtml("");
    setInlineReplyAttachments([]);
    showSuccess("Reply sent.");
    try {
      const data = await emailApi.getThread(selectedAccountId, selectedThreadId, mailProvider);
      setThreadMessages(data.messages);
    } catch {
      showError("Reply sent, but this thread could not be refreshed.");
    }
  }, [
    selectedAccountId,
    lastMessageInThread,
    inlineReplyHtml,
    inlineReplyAttachments,
    selectedThreadId,
    threads,
    mailProvider,
    showError,
    showSuccess,
  ]);

  const insertComposeTemplate = useCallback((t: AgentEmailTemplate | AgentEmailTemplateShared) => {
    setComposeHtml((prev) => {
      const trimmed = (prev || "").trim();
      const base = trimmed.length ? prev : "";
      const sep =
        trimmed.length && !trimmed.match(/<p>\s*<\/p>\s*$/i) && !trimmed.endsWith("</p>")
          ? "<p><br></p>"
          : trimmed.length
            ? ""
            : "";
      return `${base}${sep}${t.bodyHtml || ""}`;
    });
    setComposeSubject((sub) => {
      const s = sub.trim();
      if (s) return sub;
      const d = (t.subject || "").trim();
      return d || sub;
    });
    setShowComposeTemplatesMenu(false);
  }, []);

  /**
   * Carry the original's attachments into a forward.
   *
   * Forward was built on sendMessage with a quoted body, so it sent only files
   * the user added by hand - forwarding a contract silently delivered the note
   * without the contract. The backend forward endpoint does not carry them
   * either, so the bytes are pulled here and re-attached through the normal
   * compose path, which needs no API change.
   */
  // Declared near the top so every handler below can list it as a dependency;
  // a const referenced in a deps array must already be initialised at render time.
  const refetchMessages = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoadingMessages(true);
    setThreads([]);
    setNextPageToken(null);
    setListError(null);
    try {
      const res = await emailApi.getThreads(
        {
          accountId: selectedAccountId,
          ...resolveListScope(mailProvider, selectedLabelId, searchQuery),
          pageSize: 20,
        },
        mailProvider
      );
      setThreads(res.threads);
      setNextPageToken(res.nextPageToken);
    } catch {
      setThreads([]);
      setListError("We couldn't load this folder.");
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedAccountId, selectedLabelId, searchQuery, mailProvider]);

  const attachOriginalAttachments = useCallback(
    async (msg: EmailMessage, generation: number) => {
      const source = (msg.attachments || []).filter((a) => a.attachmentId);
      if (!selectedAccountId || source.length === 0) return;
      setAttachmentsBusy(true);
      const loaded: ComposeAttachment[] = [];
      const failed: string[] = [];
      let budget = composeAttachmentLimitBytes;
      for (const att of source) {
        if (generation !== forwardAttachGenerationRef.current) {
          setAttachmentsBusy(false);
          return;
        }
        if (att.size > budget) {
          failed.push(`${att.filename} (too large to include)`);
          continue;
        }
        try {
          const content = await emailApi.fetchAttachmentContent(
            selectedAccountId,
            att.messageId || msg.id,
            att.attachmentId as string,
            mailProvider
          );
          loaded.push({
            id: `fwd-${att.attachmentId}`,
            filename: att.filename,
            content,
            mimeType: att.mimeType || "application/octet-stream",
            size: att.size,
          });
          budget -= att.size;
        } catch {
          failed.push(att.filename);
        }
      }
      const stillForwardForThisMessage =
        generation === forwardAttachGenerationRef.current &&
        composeMessageRef.current?.id === msg.id;
      if (!stillForwardForThisMessage) {
        setAttachmentsBusy(false);
        return;
      }
      setComposeAttachments((prev) => {
        const have = new Set(prev.map((a) => a.id));
        return [...prev, ...loaded.filter((a) => !have.has(a.id))];
      });
      setAttachmentsBusy(false);
      if (failed.length) {
        setComposeAttachmentError(
          `Could not attach ${failed.join(", ")}. Send anyway, or download and attach by hand.`
        );
      }
    },
    [selectedAccountId, mailProvider, composeAttachmentLimitBytes]
  );

  const openCompose = useCallback(
    (mode: ComposeMode, msg?: EmailMessage) => {
      if (!canManageEmail) {
        showError("You do not have permission to send email.");
        return;
      }
      forwardAttachGenerationRef.current += 1;
      composeMessageRef.current = msg ?? null;
      setComposeMode(mode);
      setShowComposeTemplatesMenu(false);
      setShowComposeAiPanel(false);
      setComposeAiPrompt("");
      setComposeAiContext("");
      setComposeAiTone("professional");
      setComposeAiLength("medium");
      setComposeAiError(null);
      setComposeAiSubject("");
      setComposeAiOptions([]);
      setComposeAttachmentError(null);
      setAttachmentsBusy(false);
      setComposeRecipientErrors({});
      setShowComposeCc(false);
      setShowComposeBcc(false);
      if (mode === "new") {
        setComposeTo("");
        setComposeCc("");
        setComposeBcc("");
        setComposeSubject("");
        const sig = agentSignatureRef.current;
        if (isAgentRef.current && sig?.enabled && sig.html?.trim()) {
          setComposeHtml(`<p></p><div data-email-signature="true">${sig.html}</div>`);
        } else {
          setComposeHtml("");
        }
      } else if (msg) {
        const subject = msg.subject || "(No subject)";
        const quoteReply = buildReplyQuote(msg);
        if (mode === "reply") {
          setComposeTo(msg.from ?? "");
          setComposeSubject(subject.startsWith("Re:") ? subject : `Re: ${subject}`);
          setComposeHtml(quoteReply);
          setComposeCc("");
        } else if (mode === "replyAll") {
          const selfEmail = accounts.find((a) => a.id === selectedAccountId)?.email ?? "";
          const { to, cc } = buildReplyAllRecipients(msg, selfEmail);
          setComposeTo(to);
          setComposeCc(cc);
          if (cc.trim()) setShowComposeCc(true);
          setComposeSubject(subject.startsWith("Re:") ? subject : `Re: ${subject}`);
          setComposeHtml(quoteReply);
        } else {
          setComposeTo("");
          setComposeSubject(subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`);
          setComposeHtml(buildForwardQuote(msg, subject));
          setComposeCc("");
        }
        setComposeBcc("");
      }
      setComposeAttachments([]);
      setShowComposeModal(true);
    },
    [accounts, selectedAccountId, canManageEmail, showError]
  );

  /** Reply / reply-all / forward when thread body fetch failed but list row has message ids */
  const openComposeForReadingPane = useCallback(
    async (mode: ComposeMode) => {
      if (!selectedAccountId) return;
      const thread = threads.find((t) => t.id === selectedThreadId);
      let msg: EmailMessage | null = lastMessageInThread;
      if (!msg && threadMessages.length > 0) {
        msg = mode === "forward" ? threadMessages[0] : threadMessages[threadMessages.length - 1];
      }
      const fallbackId =
        mode === "forward"
          ? thread?.firstMessageId ?? thread?.lastMessageId
          : thread?.lastMessageId ?? thread?.firstMessageId;
      if (!msg && fallbackId) {
        try {
          msg = await emailApi.getMessage(selectedAccountId, fallbackId, mailProvider);
        } catch {
          showError("Could not load this message.", {
            label: "Reload inbox",
            onClick: () => void refetchMessages(),
          });
          return;
        }
      }
      if (!msg) {
        showError("This thread has not finished loading yet. Give it a moment, then try again.");
        return;
      }
      openCompose(mode, msg);
      if (mode === "forward") {
        // Fire and forget: the modal is already open and shows a busy state on the
        // attach control while the original's files are pulled in.
        void attachOriginalAttachments(msg, forwardAttachGenerationRef.current);
      }
    },
    [
      selectedAccountId,
      selectedThreadId,
      threads,
      lastMessageInThread,
      threadMessages,
      mailProvider,
      openCompose,
      attachOriginalAttachments,
      refetchMessages,
      showError,
    ]
  );

  /**
   * Snapshot of the compose fields as opened, so "has the user actually written
   * anything" can be answered. A reply or forward starts with the quoted original
   * already in the body, so a plain "is the body non-empty" check would prompt
   * about unsaved work the moment the window opened.
   */
  const composeOpenedWithRef = useRef({ html: "", subject: "", to: "", cc: "", bcc: "" });

  useEffect(() => {
    if (!showComposeModal) return;
    // Captures the fields as of the render that opened the window - openCompose
    // batches its setters, so they have all landed by here. Intentionally keyed
    // on the open flag alone: listing the fields would re-snapshot on every
    // keystroke and nothing would ever look dirty.
    composeOpenedWithRef.current = {
      html: composeHtml,
      subject: composeSubject,
      to: composeTo,
      cc: composeCc,
      bcc: composeBcc,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComposeModal]);

  const isComposeDirty = useCallback(() => {
    const start = composeOpenedWithRef.current;
    return (
      composeHtml !== start.html ||
      composeSubject !== start.subject ||
      composeTo !== start.to ||
      composeCc !== start.cc ||
      composeBcc !== start.bcc ||
      composeAttachments.length > 0
    );
  }, [composeHtml, composeSubject, composeTo, composeCc, composeBcc, composeAttachments]);

  const closeCompose = useCallback(() => {
    forwardAttachGenerationRef.current += 1;
    setShowComposeModal(false);
    composeMessageRef.current = null;
    setShowComposeAiPanel(false);
    setComposeAiTone("professional");
    setComposeAiLength("medium");
    setComposeAiPrompt("");
    setComposeAiContext("");
    setComposeAiError(null);
    setComposeAiSubject("");
    setComposeAiOptions([]);
    setComposeAttachmentError(null);
    setAttachmentsBusy(false);
  }, []);

  /**
   * Every dismissal route goes through here: the X, Discard, the backdrop and
   * Escape. Closing used to throw away the body, the subject, any AI draft and
   * every base64-encoded attachment without a word, and a stray backdrop click
   * was enough to do it.
   */
  const requestCloseCompose = useCallback(async () => {
    if (
      isComposeDirty() &&
      !(await requestMailConfirm({
        title: "Discard message?",
        message: "Discard this message? Your draft will be lost.",
        confirmLabel: "Discard",
        destructive: true,
      }))
    ) {
      return;
    }
    closeCompose();
  }, [isComposeDirty, closeCompose, requestMailConfirm]);

  // Escape closes the topmost surface: confirm dialog, then quick-add, then
  // compose (which asks first if there is anything to lose).
  useEffect(() => {
    if (!mailConfirm && !showComposeModal && !showQuickAddModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mailConfirm) {
        settleMailConfirm(false);
        return;
      }
      if (showQuickAddModal) {
        setShowQuickAddModal(false);
        setQuickAddEmail("");
        setQuickAddError(null);
        return;
      }
      void requestCloseCompose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mailConfirm, showComposeModal, showQuickAddModal, requestCloseCompose, settleMailConfirm]);

  const handleAddAttachment = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setAttachmentsBusy(true);
      setComposeAttachmentError(null);
      const existingKeys = new Set(composeAttachments.map((att) => `${att.filename.toLowerCase()}::${att.size}`));
      const nextAttachments: ComposeAttachment[] = [];
      const skipped: string[] = [];

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const duplicateKey = `${file.name.toLowerCase()}::${file.size}`;
        if (existingKeys.has(duplicateKey)) {
          skipped.push(`${file.name} is already attached.`);
          continue;
        }
        if (file.size > composeAttachmentLimitBytes) {
          skipped.push(`${file.name} is too large. Keep files under ${composeAttachmentLimitLabel}.`);
          continue;
        }
        try {
          const content = await fileToBase64(file);
          nextAttachments.push({
            id: `${file.name}-${file.size}-${file.lastModified}-${i}`,
            filename: file.name,
            content,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
          });
          existingKeys.add(duplicateKey);
        } catch {
          skipped.push(`Could not read ${file.name}. Please try again.`);
        }
      }

      if (nextAttachments.length > 0) {
        setComposeAttachments((prev) => [...prev, ...nextAttachments]);
      }
      setComposeAttachmentError(skipped.length ? skipped.join(" ") : null);
      setAttachmentsBusy(false);
      e.target.value = "";
    },
    [composeAttachments, composeAttachmentLimitBytes, composeAttachmentLimitLabel]
  );

  const removeAttachment = useCallback((attachmentId: string) => {
    setComposeAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
  }, []);

  const handleGenerateComposeDrafts = useCallback(async () => {
    if (!canManageEmail) return;
    const prompt = composeAiPrompt.trim();
    if (!prompt) {
      setComposeAiError("Tell AI what this email should say before generating drafts.");
      return;
    }

    setComposeAiLoading(true);
    setComposeAiError(null);
    try {
      const firstRecipient = recipientsFromHeaderString(composeTo)[0];
      const recipientName =
        firstRecipient && firstRecipient.includes("@") ? emailToDisplayName(firstRecipient) : firstRecipient || "";
      const result = await emailApi.generateDraft({
        tone: composeAiTone,
        prompt,
        subject: composeSubject,
        context: composeAiContext,
        recipientName,
        length: composeAiLength,
      });
      setComposeAiOptions(result.options || []);
      setComposeAiSubject(result.subject || "");
    } catch (error: any) {
      setComposeAiError(error?.response?.data?.message || "Could not generate drafts right now. Please try again.");
      setComposeAiOptions([]);
      setComposeAiSubject("");
    } finally {
      setComposeAiLoading(false);
    }
  }, [canManageEmail, composeAiContext, composeAiLength, composeAiPrompt, composeAiTone, composeSubject, composeTo]);

  const applyComposeDraft = useCallback(
    async (option: EmailDraftOption, mode: "replace" | "append" = "replace") => {
      if (mode === "replace" && hasMeaningfulComposeBody(composeHtml)) {
        const shouldReplace = await requestMailConfirm({
          title: "Replace draft?",
          message:
            "Replace the current draft body with this AI version? Your existing text will be removed, but your signature will stay.",
          confirmLabel: "Replace",
        });
        if (!shouldReplace) return;
      }
      setComposeHtml((prev) =>
        mode === "append" ? appendDraftToCompose(prev, option.html) : replaceComposeBody(prev, option.html)
      );
      setComposeSubject((prev) => {
        if (prev.trim()) return prev;
        return composeAiSubject.trim() || prev;
      });
      setComposeAiError(null);
      setShowComposeAiPanel(false);
    },
    [composeAiSubject, composeHtml, requestMailConfirm]
  );

  const handleAddInlineReplyAttachment = useCallback(() => {
    inlineReplyFileInputRef.current?.click();
  }, []);

  const handleInlineReplyFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const skipped: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // The compose modal enforced this and the inline reply did not, so an
        // oversized file was accepted here and only rejected by the provider.
        if (file.size > composeAttachmentLimitBytes) {
          skipped.push(`${file.name} is too large. Keep files under ${composeAttachmentLimitLabel}.`);
          continue;
        }
        try {
          const content = await fileToBase64(file);
          setInlineReplyAttachments((prev) => [
            ...prev,
            { filename: file.name, content, mimeType: file.type || "application/octet-stream" },
          ]);
        } catch {
          skipped.push(`Could not read ${file.name}.`);
        }
      }
      if (skipped.length) showError(skipped.join(" "));
      e.target.value = "";
    },
    [composeAttachmentLimitBytes, composeAttachmentLimitLabel, showError]
  );

  const removeInlineReplyAttachment = useCallback((idx: number) => {
    setInlineReplyAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSendCompose = useCallback(async () => {
    if (!selectedAccountId) return;
    if (!canManageEmail) {
      showError("You do not have permission to send email.");
      return;
    }

    // Validate before entering the sending state, so a missing recipient never
    // looks like a failed send.
    const explicitTo = recipientsFromHeaderString(composeTo);
    const explicitCc = composeCc ? recipientsFromHeaderString(composeCc) : [];
    const explicitBcc = composeBcc ? recipientsFromHeaderString(composeBcc) : [];
    const nextErrors: { to?: string; cc?: string; bcc?: string } = {};

    if ((composeMode === "new" || composeMode === "forward") && explicitTo.length === 0) {
      nextErrors.to = "Enter at least one recipient.";
    }
    if (explicitTo.length) {
      const toCheck = validateRecipientList(explicitTo);
      if (!toCheck.valid) nextErrors.to = `Invalid address: ${toCheck.invalid[0]}`;
    }
    if (explicitCc.length) {
      const ccCheck = validateRecipientList(explicitCc);
      if (!ccCheck.valid) nextErrors.cc = `Invalid address: ${ccCheck.invalid[0]}`;
    }
    if (explicitBcc.length) {
      const bccCheck = validateRecipientList(explicitBcc);
      if (!bccCheck.valid) nextErrors.bcc = `Invalid address: ${bccCheck.invalid[0]}`;
    }

    if (Object.keys(nextErrors).length) {
      setComposeRecipientErrors(nextErrors);
      if (nextErrors.cc) setShowComposeCc(true);
      if (nextErrors.bcc) setShowComposeBcc(true);
      return;
    }
    setComposeRecipientErrors({});
    if (composeMode !== "new" && composeMode !== "forward" && !composeMessageRef.current) {
      showError("The message being replied to is no longer loaded. Close and reopen the thread.");
      return;
    }

    setSending(true);
    let sent = false;
    try {
      if (composeMode === "new" || composeMode === "forward") {
        const to = explicitTo;
        await emailApi.sendMessage(
          {
            accountId: selectedAccountId,
            to,
            cc: explicitCc.length ? explicitCc : undefined,
            bcc: explicitBcc.length ? explicitBcc : undefined,
            subject: composeSubject,
            html: cleanHtmlForSend(composeHtml),
            attachments:
              composeAttachments.length > 0
                ? composeAttachments.map((a) => ({
                    filename: a.filename,
                    content: a.content,
                    mimeType: a.mimeType,
                  }))
                : undefined,
          },
          mailProvider
        );
      } else if (composeMode === "replyAll") {
        const msg = composeMessageRef.current;
        if (!msg) return;
        await emailApi.replyAllMessage(
          msg.id,
          {
            accountId: selectedAccountId,
            html: cleanHtmlForSend(composeHtml),
            attachments:
              composeAttachments.length > 0
                ? composeAttachments.map((a) => ({
                    filename: a.filename,
                    content: a.content,
                    mimeType: a.mimeType,
                  }))
                : undefined,
          },
          mailProvider
        );
      } else {
        const msg = composeMessageRef.current;
        if (!msg) return;
        await emailApi.replyMessage(
          msg.id,
          {
            accountId: selectedAccountId,
            html: cleanHtmlForSend(composeHtml),
            attachments:
              composeAttachments.length > 0
                ? composeAttachments.map((a) => ({
                    filename: a.filename,
                    content: a.content,
                    mimeType: a.mimeType,
                  }))
                : undefined,
          },
          mailProvider
        );
      }
      sent = true;
    } catch {
      showError("Could not send the message. Your draft is still open - try again.");
    } finally {
      setSending(false);
    }

    if (!sent) return;

    // The message is gone the moment the send resolves. Refreshing the list is a
    // separate, failable step: it used to sit inside the same try, so a hiccup on
    // the refresh reported "Failed to send" for a message that had already been
    // delivered - and users resent it. It also cleared the list first, so that
    // failure left the inbox looking empty as well.
    closeCompose();
    showSuccess("Message sent.");
    await refetchMessages();
    void refreshMailboxLabels();
  }, [
    selectedAccountId,
    composeTo,
    composeCc,
    composeBcc,
    composeSubject,
    composeHtml,
    composeAttachments,
    composeMode,
    closeCompose,
    mailProvider,
    refetchMessages,
    refreshMailboxLabels,
    showError,
    showSuccess,
    canManageEmail,
  ]);

  const handleTrash = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    const wasUnread = threads.find((t) => t.id === selectedThreadId)?.isUnread ?? false;
    if (!(await confirmTrash(1, "selected"))) return;
    try {
      // In Trash or Spam this is the permanent delete; anywhere else it is a move.
      if (isPermanentDeleteFolder) {
        await emailApi.deleteThreads(selectedAccountId, [selectedThreadId], mailProvider);
      } else {
        await emailApi.trashThreads(selectedAccountId, [selectedThreadId], mailProvider);
      }
      setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
      setSelectedThreadId(null);
      setThreadMessages([]);
      setSelectedThreadIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedThreadId);
        return next;
      });
      restoreMobileListLayout();
      if (wasUnread) bumpNavUnreadCounts(-1, ["INBOX"]);
      void refreshMailboxLabels();
      showSuccess(
        isPermanentDeleteFolder
          ? "Conversation permanently deleted."
          : "Moved to trash. Recover it from the Trash folder."
      );
    } catch {
      showError(
        isPermanentDeleteFolder
          ? "Could not delete this conversation. Nothing was removed."
          : "Could not move this conversation to trash. Nothing was deleted."
      );
    }
  }, [
    selectedAccountId,
    selectedThreadId,
    threads,
    restoreMobileListLayout,
    mailProvider,
    showError,
    showSuccess,
    bumpNavUnreadCounts,
    refreshMailboxLabels,
    isPermanentDeleteFolder,
    confirmTrash,
  ]);

  const handleToggleStar = useCallback(
    async (thread: EmailThreadListItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!selectedAccountId) return;
      const isStarred = thread.labelIds?.includes("STARRED");
      try {
        await emailApi.batchModifyThreads(
          {
            accountId: selectedAccountId,
            threadIds: [thread.id],
            addLabelIds: isStarred ? [] : ["STARRED"],
            removeLabelIds: isStarred ? ["STARRED"] : [],
          },
          mailProvider
        );
        // Un-starring inside Starred takes the conversation out of that view, so
        // the row goes; everywhere else it stays and just changes state.
        if (isStarred && selectedLabelId === "STARRED") {
          setThreads((prev) => prev.filter((t) => t.id !== thread.id));
          if (selectedThreadId === thread.id) {
            setSelectedThreadId(null);
            setThreadMessages([]);
          }
        } else {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === thread.id
                ? {
                    ...t,
                    labelIds: isStarred
                      ? (t.labelIds || []).filter((l) => l !== "STARRED")
                      : [...new Set([...(t.labelIds || []), "STARRED"])],
                  }
                : t
            )
          );
        }
      } catch {
        showError("Could not update the star.");
      }
    },
    [selectedAccountId, mailProvider, selectedLabelId, selectedThreadId, showError]
  );

  const handleArchive = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    // Archiving takes mail out of the inbox, so for mail that is not in the
    // inbox there is nothing to do - both providers accept the request and
    // ignore it, which reads as a successful archive.
    //
    // Gmail only: its thread rows carry INBOX, so the no-op is detectable. The
    // Outlook provider synthesizes just UNREAD, STARRED and IMPORTANT, so its
    // rows never carry INBOX and this check would refuse every archive there.
    if (
      mailProvider === "gmail" &&
      selectedThread &&
      !openThreadLabelIds.includes("INBOX")
    ) {
      showError("This conversation is already out of the inbox.");
      return;
    }
    try {
      await emailApi.batchModifyThreads(
        {
          accountId: selectedAccountId,
          threadIds: [selectedThreadId],
          addLabelIds: [],
          removeLabelIds: ["INBOX"],
        },
        mailProvider
      );
      // Archived mail leaves the inbox, but it is still in All Mail, still under
      // its labels and still in Starred. Dropping the row from every one of
      // those views was why archiving looked broken: the conversation vanished
      // and then came back on the next load, because it had never left that
      // view in the first place.
      if (selectedLabelId === "INBOX") {
        setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
      } else {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedThreadId
              ? { ...t, labelIds: (t.labelIds || []).filter((l) => l !== "INBOX") }
              : t
          )
        );
      }
      setSelectedThreadId(null);
      setThreadMessages([]);
      setSelectedThreadIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedThreadId);
        return next;
      });
      restoreMobileListLayout();
      void refreshMailboxLabels();
      showSuccess("Moved to Archive.");
    } catch {
      showError("Could not archive this conversation. Nothing was moved.");
    }
  }, [
    selectedAccountId,
    selectedThreadId,
    selectedThread,
    openThreadLabelIds,
    selectedLabelId,
    restoreMobileListLayout,
    mailProvider,
    refreshMailboxLabels,
    showError,
    showSuccess,
  ]);

  /**
   * Where "Mailbox settings" points.
   *
   * Both links were hardcoded to the consumer hosts, so a Workspace user landed
   * in whichever Google account their browser happened to have first, and a
   * Microsoft 365 work account was sent to outlook.live.com, which does not host
   * it. Gmail's /u/<address>/ form selects the right account for personal and
   * Workspace alike; for Microsoft the consumer hosts are a known short list, so
   * anything else is treated as a work or school tenant.
   */
  const mailboxSettingsUrl = useMemo(() => {
    const email = (accounts.find((a) => a.id === selectedAccountId)?.email || "").trim();
    if (mailProvider === "outlook") {
      const domain = email.split("@")[1]?.toLowerCase() ?? "";
      const consumer = ["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain);
      return consumer
        ? "https://outlook.live.com/mail/0/options/general"
        : "https://outlook.office.com/mail/options/general";
    }
    return email
      ? `https://mail.google.com/mail/u/${encodeURIComponent(email)}/#settings/general`
      : "https://mail.google.com/mail/#settings";
  }, [accounts, selectedAccountId, mailProvider]);

  const unreadForLabel = useCallback(
    (labelId: string): number => labels.find((l) => l.id === labelId)?.unread ?? 0,
    [labels]
  );

  const allMailsUnread = useMemo(() => {
    if (mailProvider === "gmail") {
      return gmailFolderCounts?.all?.unread ?? unreadForLabel("INBOX");
    }
    return labels.reduce((sum, l) => sum + (l.unread ?? 0), 0);
  }, [mailProvider, gmailFolderCounts, labels, unreadForLabel]);


  /**
   * What the reading-pane header shows.
   *
   * The list row is the best source when there is one, but there is not always a
   * row: a shared ?thread= link can point at a thread beyond the loaded page.
   * Falling back to the fetched messages stops the pane rendering a blank sender,
   * recipient and date above a perfectly good conversation.
   */
  const headerFrom = selectedThread?.from ?? lastMessageInThread?.from ?? "";
  const headerTo = selectedThread?.to ?? lastMessageInThread?.to ?? "";
  const headerDate = selectedThread?.date ?? lastMessageInThread?.date ?? null;
  const headerSubject = selectedThread?.subject ?? threadMessages[0]?.subject ?? "";
  const headerMessageCount = selectedThread?.messageCount ?? threadMessages.length;

  const handleCreateLabel = useCallback(
    /**
     * `applyToOpenThread` defaults to the reading-pane behaviour, where creating a
     * label from the thread's own menu is meant to tag that thread. Creating one
     * from the sidebar is just housekeeping and must not silently label whatever
     * happens to be open.
     */
    async (
      name: string,
      { applyToOpenThread = true }: { applyToOpenThread?: boolean } = {}
    ): Promise<boolean> => {
      if (!selectedAccountId || !name?.trim()) return false;
      setCreatingLabel(true);
      try {
        const created = await emailApi.createLabel(
          selectedAccountId,
          { name: name.trim() },
          mailProvider
        );
        setLabels((prev) => [...prev, { ...created, type: "user" }]);
        setNewLabelName("");
        setCreateLabelExpanded(false);
        if (applyToOpenThread && selectedThreadId) {
          await emailApi.batchModifyThreads(
            {
              accountId: selectedAccountId,
              threadIds: [selectedThreadId],
              addLabelIds: [created.id],
              removeLabelIds: [],
            },
            mailProvider
          );
          setThreads((prev) =>
            prev.map((t) =>
              t.id === selectedThreadId
                ? { ...t, labelIds: [...(t.labelIds || []), created.id] }
                : t
            )
          );
        }
        return true;
      } catch {
        showError("Could not create that label.");
        return false;
      } finally {
        setCreatingLabel(false);
      }
    },
    [selectedAccountId, selectedThreadId, mailProvider, showError]
  );

  const handleApplyLabel = useCallback(
    async (labelId: string) => {
      if (!selectedAccountId || !selectedThreadId) return;
      const currentIds = openThreadLabelIds;
      const hasLabel = currentIds.includes(labelId);
      try {
        await emailApi.batchModifyThreads(
          {
            accountId: selectedAccountId,
            threadIds: [selectedThreadId],
            addLabelIds: hasLabel ? [] : [labelId],
            removeLabelIds: hasLabel ? [labelId] : [],
          },
          mailProvider
        );
        const nextIds = hasLabel ? currentIds.filter((l) => l !== labelId) : [...currentIds, labelId];
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThreadId ? { ...t, labelIds: nextIds } : t))
        );
      } catch (err) {
        console.error("Failed to apply label:", err);
        showError("Could not update the labels on this conversation.");
      }
    },
    [selectedAccountId, selectedThreadId, openThreadLabelIds, mailProvider, showError]
  );

  const handleMarkRead = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    const wasUnread = selectedThread?.isUnread ?? false;
    try {
      await emailApi.batchModifyThreads(
        {
          accountId: selectedAccountId,
          threadIds: [selectedThreadId],
          addLabelIds: [],
          removeLabelIds: ["UNREAD"],
        },
        mailProvider
      );
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThreadId ? { ...t, isUnread: false, labelIds: (t.labelIds || []).filter((l) => l !== "UNREAD") } : t
        )
      );
      // Only the Inbox badge, and only when reading Inbox mail: marking a Sent,
      // Spam or search result read used to move the Inbox count for a thread
      // that was never in the Inbox. refreshMailboxLabels reconciles either way.
      if (wasUnread && selectedLabelId === "INBOX") bumpNavUnreadCounts(-1, ["INBOX"]);
      void refreshMailboxLabels();
    } catch {
      showError("Could not mark this conversation as read.");
    }
  }, [selectedAccountId, selectedThreadId, selectedThread, selectedLabelId, mailProvider, showError, bumpNavUnreadCounts, refreshMailboxLabels]);

  const handleMarkUnread = useCallback(
    async (thread: EmailThreadListItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!selectedAccountId || thread.isUnread) return;
      try {
        await emailApi.batchModifyThreads(
          {
            accountId: selectedAccountId,
            threadIds: [thread.id],
            addLabelIds: ["UNREAD"],
            removeLabelIds: [],
          },
          mailProvider
        );
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  isUnread: true,
                  labelIds: [...new Set([...(t.labelIds || []), "UNREAD"])],
                }
              : t
          )
        );
        if (selectedLabelId === "INBOX") bumpNavUnreadCounts(1, ["INBOX"]);
        void refreshMailboxLabels();
      } catch {
        showError("Could not mark this conversation as unread.");
      }
    },
    [selectedAccountId, selectedLabelId, mailProvider, showError, bumpNavUnreadCounts, refreshMailboxLabels]
  );

  const visibleThreadIds = useMemo(() => threads.map((t) => t.id), [threads]);
  /**
   * Which threads a bulk action hits. Ticked rows win; with none ticked it falls
   * back to everything currently loaded. Ticks left over from another folder are
   * discarded rather than silently targeted - see resolveBulkTargets.
   */
  const bulkTargets = useMemo(
    () => resolveBulkTargets(selectedThreadIds, visibleThreadIds),
    [selectedThreadIds, visibleThreadIds]
  );
  /** Ticks that still refer to a visible row, for the header checkbox and labels. */
  const liveSelectedCount = bulkTargets.scope === "selected" ? bulkTargets.ids.length : 0;

  const closeMailMenu = useCallback(() => {
    setShowMailMenu(false);
    setMailMenuPosition(null);
  }, []);

  const confirmSpam = useCallback(
    async (count: number, scope: "selected" | "visible") => {
      const noun = count === 1 ? "conversation" : "conversations";
      const message =
        scope === "selected"
          ? `Report ${count} selected ${noun} as spam and move them out of the inbox?`
          : `Report all ${count} ${noun} loaded in this view as spam?`;
      return requestMailConfirm({
        title: "Report as spam?",
        message,
        confirmLabel: "Report as spam",
        destructive: true,
      });
    },
    [requestMailConfirm]
  );

  const handleMarkAllRead = useCallback(async () => {
    const ids = bulkTargets.ids;
    if (!selectedAccountId || ids.length === 0) return;
    closeMailMenu();
    const target = new Set(ids);
    const unreadMarked = threads.filter((t) => target.has(t.id) && t.isUnread).length;
    try {
      await emailApi.batchModifyThreads(
        { accountId: selectedAccountId, threadIds: ids, addLabelIds: [], removeLabelIds: ["UNREAD"] },
        mailProvider
      );
      // Only the rows we actually asked the server to change. This used to mark
      // every loaded row read locally even when the call targeted two of them.
      setThreads((prev) =>
        prev.map((t) =>
          target.has(t.id)
            ? { ...t, isUnread: false, labelIds: (t.labelIds || []).filter((l) => l !== "UNREAD") }
            : t
        )
      );
      setSelectedThreadIds(new Set());
      if (unreadMarked > 0) bumpNavUnreadCounts(-unreadMarked, ["INBOX"]);
      void refreshMailboxLabels();
    } catch {
      showError("Could not mark those conversations as read. Check your connection and try again.");
    }
  }, [selectedAccountId, bulkTargets, threads, mailProvider, showError, bumpNavUnreadCounts, refreshMailboxLabels, closeMailMenu]);

  const trashThreadIds = useCallback(
    async (ids: string[]) => {
      if (!selectedAccountId || ids.length === 0) return;
      const target = new Set(ids);
      const unreadTrashed = threads.filter((t) => target.has(t.id) && t.isUnread).length;
      try {
        // Already in the bin or in spam? Then this is the permanent delete, not
        // another move - moving re-trashed an already-trashed conversation, which
        // the provider accepts and ignores, so the row came back on refresh.
        if (isPermanentDeleteFolder) {
          await emailApi.deleteThreads(selectedAccountId, ids, mailProvider);
        } else {
          await emailApi.trashThreads(selectedAccountId, ids, mailProvider);
        }
        setThreads((prev) => prev.filter((t) => !target.has(t.id)));
        if (selectedThreadId && target.has(selectedThreadId)) {
          setSelectedThreadId(null);
          setThreadMessages([]);
        }
        setSelectedThreadIds(new Set());
        if (unreadTrashed > 0) bumpNavUnreadCounts(-unreadTrashed, ["INBOX"]);
        void refreshMailboxLabels();
        showSuccess(
          isPermanentDeleteFolder
            ? `Permanently deleted ${ids.length}.`
            : `Moved ${ids.length} to trash. Recover them from the Trash folder.`
        );
      } catch {
        showError(
          isPermanentDeleteFolder
            ? "Could not delete those conversations. Nothing was removed."
            : "Could not move those conversations to trash. Nothing was deleted."
        );
      }
    },
    [
      selectedAccountId,
      threads,
      selectedThreadId,
      mailProvider,
      showError,
      showSuccess,
      bumpNavUnreadCounts,
      refreshMailboxLabels,
      isPermanentDeleteFolder,
    ]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (bulkTargets.scope !== "selected" || bulkTargets.ids.length === 0) return;
    const ids = bulkTargets.ids;
    if (!(await confirmTrash(ids.length, "selected"))) return;
    closeMailMenu();
    await trashThreadIds(ids);
  }, [bulkTargets, confirmTrash, closeMailMenu, trashThreadIds]);

  const handleDeleteAllLoaded = useCallback(async () => {
    const ids = visibleThreadIds;
    if (!selectedAccountId || ids.length === 0) return;
    if (!(await confirmTrash(ids.length, "visible"))) return;
    closeMailMenu();
    await trashThreadIds(ids);
  }, [visibleThreadIds, selectedAccountId, confirmTrash, closeMailMenu, trashThreadIds]);

  /**
   * Move conversations into, or back out of, the junk folder.
   *
   * Inside Spam the direction reverses. Reporting already-junk mail as junk is
   * accepted and ignored by both providers, so the row was removed
   * optimistically, "Moved to spam" was reported, and the conversation came back
   * on the next load - the same defect the Trash delete had. In Spam the action
   * is now "Not spam", which is what the reader actually needs there and what
   * every mail client offers.
   *
   * Both directions ride the existing batch-modify endpoint: Gmail treats
   * remove SPAM + add INBOX as its canonical "not spam", and the Outlook
   * provider moves to the inbox on an INBOX add that carries no SPAM.
   */
  const applySpamChange = useCallback(
    async (ids: string[]) => {
      if (!selectedAccountId || ids.length === 0) return;
      const target = new Set(ids);
      const unSpam = isSpamFolder;
      try {
        await emailApi.batchModifyThreads(
          {
            accountId: selectedAccountId,
            threadIds: ids,
            addLabelIds: unSpam ? ["INBOX"] : ["SPAM"],
            removeLabelIds: unSpam ? ["SPAM"] : ["INBOX"],
          },
          mailProvider
        );
        setThreads((prev) => prev.filter((t) => !target.has(t.id)));
        if (selectedThreadId && target.has(selectedThreadId)) {
          setSelectedThreadId(null);
          setThreadMessages([]);
        }
        setSelectedThreadIds(new Set());
        void refreshMailboxLabels();
        showSuccess(
          unSpam
            ? `Moved ${ids.length} back to the inbox.`
            : `Moved ${ids.length} to spam.`
        );
      } catch {
        showError(
          unSpam
            ? "Could not move those conversations out of spam. Nothing was changed."
            : "Could not move those conversations to spam. Nothing was changed."
        );
      }
    },
    [
      selectedAccountId,
      selectedThreadId,
      mailProvider,
      isSpamFolder,
      refreshMailboxLabels,
      showError,
      showSuccess,
    ]
  );

  const handleMoveSelectedToSpam = useCallback(async () => {
    if (bulkTargets.scope !== "selected" || bulkTargets.ids.length === 0) return;
    const ids = bulkTargets.ids;
    // Restoring mail from junk is recoverable and expected, so it does not need
    // the "are you sure" that reporting as junk does.
    if (!isSpamFolder && !(await confirmSpam(ids.length, "selected"))) return;
    closeMailMenu();
    await applySpamChange(ids);
  }, [bulkTargets, isSpamFolder, confirmSpam, closeMailMenu, applySpamChange]);

  const handleMoveAllLoadedToSpam = useCallback(async () => {
    const ids = visibleThreadIds;
    if (ids.length === 0) return;
    if (!isSpamFolder && !(await confirmSpam(ids.length, "visible"))) return;
    closeMailMenu();
    await applySpamChange(ids);
  }, [visibleThreadIds, isSpamFolder, confirmSpam, closeMailMenu, applySpamChange]);

  const handleMailMenuRecent = useCallback(() => {
    setShowMailMenu(false);
    refetchMessages();
  }, [refetchMessages]);

  const handleMailMenuUnread = useCallback(() => {
    setShowMailMenu(false);
    // Use provider-appropriate search syntax: Gmail uses "is:unread", Outlook KQL uses "isRead:false"
    const unreadQuery = mailProvider === "outlook" ? "isRead:false" : "is:unread";
    setSearchQuery(unreadQuery);
    setSearchInput(unreadQuery);
  }, [mailProvider]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) setSelectedThreadIds(new Set(threads.map((t) => t.id)));
      else setSelectedThreadIds(new Set());
    },
    [threads]
  );

  const handleToggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedThreadIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedThreadIds(new Set());
  }, []);

  const handlePrint = useCallback(() => {
    if (threadMessages.length === 0) return;
    // Render into a sandboxed iframe rather than window.open(""), which hands back
    // an about:blank window that inherits this app's origin - a crafted email could
    // run script as the signed-in user there. Omitting allow-scripts means markup
    // that ever slipped past the sanitizer still cannot execute; allow-modals is
    // what permits print(), allow-same-origin is what lets us reach contentWindow.
    // The iframe also removes the popup-blocker dead end, where printing was simply
    // unavailable behind an alert().
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("title", "Print preview");
    // Zero-sized and off-screen, but never display:none/visibility:hidden - those
    // stop the frame from being painted, and an unpainted frame does not print.
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    frame.srcdoc = buildPrintDocument(threadMessages);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      frame.remove();
    };

    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      win.addEventListener("afterprint", cleanup, { once: true });
      win.focus();
      win.print();
      // Not every browser fires afterprint (Safari historically does not), so
      // reclaim the node on a long timer rather than leaking one frame per print.
      window.setTimeout(cleanup, 60000);
    };
    document.body.appendChild(frame);
  }, [threadMessages]);

  const handleAddQuickRecipient = useCallback(() => {
    setQuickAddEmail("");
    setQuickAddError(null);
    setShowQuickAddModal(true);
  }, []);

  const closeQuickAddModal = useCallback(() => {
    setShowQuickAddModal(false);
    setQuickAddEmail("");
    setQuickAddError(null);
  }, []);

  const handleQuickAddSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = quickAddEmail.trim();
      if (!trimmed) {
        setQuickAddError("Enter an email address.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setQuickAddError("That doesn't look like a valid email address.");
        return;
      }
      setQuickRecipients((prev) => {
        if (prev.some((r) => r.email.toLowerCase() === trimmed.toLowerCase())) return prev;
        return [...prev, { email: trimmed }];
      });
      closeQuickAddModal();
    },
    [quickAddEmail, closeQuickAddModal]
  );

  const handleQuickCompose = useCallback(
    (email: string) => {
      // Goes through openCompose rather than setting the fields by hand, which
      // skipped the signature that a new message from the sidebar gets - the same
      // action produced two different drafts depending on where it was started.
      openCompose("new");
      setComposeTo(email);
    },
    [openCompose]
  );

  const handleRemoveQuickRecipient = useCallback((email: string) => {
    setQuickRecipients((prev) => prev.filter((r) => r.email !== email));
  }, []);

  const switchToMailbox = useCallback(
    (accountId: string) => {
      if (accountId === selectedAccountId) return;
      setSelectedAccountId(accountId);
      setSelectedLabelId("INBOX");
      setSelectedThreadId(null);
      setThreadMessages([]);
      setSelectedThreadIds(new Set());
      setNextPageToken(null);
      // A search typed against the previous mailbox otherwise stayed applied,
      // and its operators may not even be valid for the new provider.
      setSearchInput("");
      setSearchQuery("");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("thread");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [selectedAccountId, router, pathname, searchParams]
  );

  const quickRecipientList = quickRecipients;

  const handleSearch = useCallback(() => {
    setSearchQuery(buildMailQuery(searchInput));
  }, [searchInput]);

  // Predictive search: debounce typed input into the query that drives the fetch.
  // buildMailQuery scopes plain text to sender+subject (no body-text noise);
  // operator queries (is:unread, from:x) pass through. Enter/button fire instantly.
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(buildMailQuery(searchInput)), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const currentProvider = accounts.find((a) => a.id === selectedAccountId)?.provider ?? "gmail";

  const filteredLabels = labels.filter((l) => {
    // Inbox is always shown via the hardcoded nav item above; exclude it here for both
    // providers so it doesn't render twice (Gmail's INBOX system label + Outlook's inbox folder).
    if (l.id === "INBOX") return false;
    if (currentProvider === "outlook") {
      return true;
    }
    const isSystem = ["SENT", "DRAFT", "TRASH", "SPAM", "STARRED", "IMPORTANT"].includes(l.id);
    const isUser = l.type === "user";
    const showInSidebar = l.labelListVisibility !== "labelHide" || isSystem;
    return showInSidebar && (isSystem || isUser);
  });

  // Gmail has no archive folder, so it returns no label to hang this entry off.
  // Selecting it asks for All Mail minus the inbox instead - see resolveListScope.
  // Outlook has a real Archive folder and already lists it among its own.
  const navLabels =
    currentProvider === "gmail"
      ? [...filteredLabels, { id: ARCHIVE_LABEL_ID, name: "Archive", type: "system" as const }]
      : filteredLabels;

  const mailLabelsOrdered = [...navLabels].sort((a, b) => {
    const ai = MAILS_ORDER.indexOf(a.id);
    const bi = MAILS_ORDER.indexOf(b.id);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    if (a.type === "user" && b.type === "user") return (a.name || "").localeCompare(b.name || "");
    return (a.type === "user" ? 1 : 0) - (b.type === "user" ? 1 : 0);
  });

  const mailLabelsForNav = mailLabelsOrdered;

  /** Icon-only folder shortcuts for the 992px–MASTER_DETAIL_MAX_WIDTH collapsed rail. */
  const folderRailShortcuts = useMemo(() => {
    const shortcuts: { id: string; icon: string; label: string }[] = [
      { id: "INBOX", icon: "ri-inbox-line", label: "Inbox" },
    ];
    const sent = mailLabelsForNav.find(
      (l) => l.id === "SENT" || l.name?.toLowerCase() === "sent"
    );
    if (sent) {
      shortcuts.push({ id: sent.id, icon: getLabelIcon(sent.id), label: sent.name });
    }
    return shortcuts;
  }, [mailLabelsForNav]);

  // For Outlook, user folders are already included in mailLabelsForNav; no separate "Labels" section
  const userLabelsForNav = currentProvider === "outlook"
    ? []
    : filteredLabels.filter((l) => l.type === "user");

  return (
    <Fragment>
      <Seo title="Mail App" />
      <div className={`container-fluid mt-5 sm:mt-6 ${mailBody.className} ${mailStyles.mailRoot}`}>
        {!loading && showMailEmptyStage ? (
          <div className={mailStyles.mailEmptyStage}>
            <div className={mailStyles.mailEmptyBg} aria-hidden />
            <div className={mailStyles.mailEmptyMesh} aria-hidden />
            <div className={mailStyles.mailEmptyGrain} aria-hidden />
            <div className={mailStyles.mailEmptyOrbit} aria-hidden />
            <div className={mailStyles.mailEmptyGrid}>
              <div className={`text-center lg:text-left ${mailStyles.mailEmptyHeroWrap}`}>
                <div className={`${mailStyles.emptyHero} ${mailStyles.fadeIn}`}>
                  <div className="w-16 h-16 mx-auto lg:mx-0 mb-6 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30 flex items-center justify-center shadow-inner ring-1 ring-amber-900/10 dark:ring-amber-500/20">
                    <i className="ri-mail-send-fill text-3xl text-amber-800 dark:text-amber-400"></i>
                  </div>
                  <h2
                    className={`${mailDisplay.className} text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100 mb-3 tracking-tight`}
                  >
                    {needsCompanyMailboxConnect
                      ? "Connect your company mailbox"
                      : "Your correspondence, one place"}
                  </h2>
                  <p
                    className={`${mailBody.className} text-stone-600 dark:text-stone-400 text-sm leading-relaxed mb-8 max-w-md mx-auto lg:mx-0`}
                  >
                    {needsCompanyMailboxConnect
                      ? `Sign in with ${expectedWorkEmail} using the provider your organization selected. Other linked mailboxes stay in Dharwin until you complete this step; they are removed once the correct mailbox is connected.`
                      : "Link Gmail or Outlook to read threads, compose, and reply—without leaving Dharwin."}
                  </p>
                  {oauthError && (
                    <div
                      className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm text-left border border-red-100 dark:border-red-900/50"
                      role="status"
                      aria-live="polite"
                    >
                      {oauthError}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                    {(!workLock || lockAllowedProviders.includes("gmail")) && (
                      <button
                        type="button"
                        onClick={handleConnectGmail}
                        className={`ti-btn px-6 py-3 flex items-center justify-center gap-2 ${mailStyles.connectBtnGmail}`}
                      >
                        <i className="ri-google-fill text-lg"></i>
                        {workLock ? `Connect Gmail (${expectedWorkEmail})` : "Connect Gmail"}
                      </button>
                    )}
                    {(!workLock || lockAllowedProviders.includes("outlook")) &&
                      (!workLock ? canAddOutlookMailbox : true) && (
                      <button
                        type="button"
                        onClick={handleConnectOutlook}
                        className={`ti-btn px-6 py-3 flex items-center justify-center gap-2 ${mailStyles.connectBtnOutlook}`}
                      >
                        <i className="ri-microsoft-fill text-lg"></i>
                        {workLock ? `Connect Outlook (${expectedWorkEmail})` : "Connect Outlook"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <aside className={mailStyles.mailEmptyAside}>
                <div className={mailStyles.mailEmptyPreview}>
                  <div className={mailStyles.mailEmptyPreviewChrome}>
                    <span className={mailStyles.mailEmptyPreviewDot} />
                    <span className={mailStyles.mailEmptyPreviewDot} />
                    <span className={mailStyles.mailEmptyPreviewDot} />
                    <span className={mailStyles.mailEmptyPreviewTitle}>Inbox preview</span>
                  </div>
                  <div className={mailStyles.mailEmptyPreviewBody}>
                    {[
                      { initial: "M", subj: "Onboarding — next steps", meta: "Gmail · 2m ago", tone: "gmail" as const },
                      { initial: "T", subj: "Re: Q4 roadmap draft", meta: "Outlook · 1h", tone: "outlook" as const },
                      { initial: "S", subj: "Files shared with you", meta: "Gmail · Yesterday", tone: "gmail" as const },
                      { initial: "H", subj: "Team standup notes", meta: "Outlook · Tue", tone: "outlook" as const },
                    ].map((row) => (
                      <div key={row.subj} className={mailStyles.mailEmptyFakeRow}>
                        <span
                          className={`${mailStyles.mailEmptyFakeAvatar} ${
                            row.tone === "outlook"
                              ? "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 text-blue-900 dark:text-blue-100"
                              : "bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-950 dark:to-amber-950 text-rose-900 dark:text-rose-100"
                          }`}
                        >
                          {row.initial}
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <p
                            className={`${mailBody.className} text-[0.8125rem] font-medium text-stone-800 dark:text-stone-200 truncate`}
                          >
                            {row.subj}
                          </p>
                          <p className="text-[0.65rem] text-stone-500 dark:text-stone-500 mt-0.5">{row.meta}</p>
                        </div>
                        <i className="ri-arrow-right-s-line text-stone-300 dark:text-stone-600 shrink-0 text-lg" aria-hidden />
                      </div>
                    ))}
                  </div>
                </div>
                <div className={mailStyles.mailEmptyBenefits}>
                  {[
                    {
                      icon: "ri-inbox-unarchive-line",
                      title: "One workspace",
                      text: "Gmail and Outlook threads side by side—no tab hopping.",
                    },
                    {
                      icon: "ri-reply-line",
                      title: "Reply in context",
                      text: "Read and answer mail where you already work.",
                    },
                    {
                      icon: "ri-stack-line",
                      title: "Multiple mailboxes",
                      text: "Connect several accounts and switch in a tap.",
                    },
                  ].map((b) => (
                    <div key={b.title} className={mailStyles.mailEmptyBenefit}>
                      <span className={mailStyles.mailEmptyBenefitIcon}>
                        <i className={b.icon} aria-hidden />
                      </span>
                      <div className="text-left min-w-0">
                        <p
                          className={`${mailBody.className} text-sm font-semibold text-stone-800 dark:text-stone-100`}
                        >
                          {b.title}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                          {b.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className={`main-mail-container !p-2 gap-y-2 flex flex-col min-h-0 ${mailStyles.shell} ${mailStyles.fadeIn}`}>
            {providerWarning ? (
              <div
                className="w-full shrink-0 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[0.8125rem] text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100"
                role="alert"
              >
                <div className="flex items-start gap-2">
                  <i className="ri-cloud-off-line mt-0.5 shrink-0" aria-hidden />
                  <p className="mb-0">{providerWarning}</p>
                </div>
              </div>
            ) : null}
            <div
              className={`flex gap-x-2 min-h-0 flex-1 min-w-0 ${mailStyles.mailColumns}`}
              data-mail-view={mailView}
            >
            <nav className={mailStyles.folderRail} aria-label="Folder shortcuts">
              {folderRailShortcuts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectFolder(item.id)}
                  className={`${mailStyles.folderRailBtn} ${
                    selectedLabelId === item.id ? mailStyles.folderRailBtnActive : ""
                  }`}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={selectedLabelId === item.id ? "true" : undefined}
                >
                  <i className={item.icon} aria-hidden />
                </button>
              ))}
              <button
                type="button"
                onClick={Toggle1}
                className={mailStyles.folderRailBtn}
                title="All folders"
                aria-label="All folders"
              >
                <i className="ri-menu-line" aria-hidden />
              </button>
            </nav>
            <div
              // !flex, not !block: the SCSS lays this column out with flex, and
              // display:block !important silently disabled that.
              className={`mail-navigation ${isMailNavigationVisible ? "!flex" : ""} border dark:border-defaultborder/10`}
            >
              {canManageEmail ? (
                <div className="!p-4 border-b border-stone-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => openCompose("new")}
                    className={`ti-btn w-full py-3 flex items-center justify-center gap-2 ${mailStyles.composeCta}`}
                  >
                    <i className="ri-quill-pen-line text-lg"></i>
                    New message
                  </button>
                </div>
              ) : null}
              {selectedAccountId && accounts.length > 0 && (
                <>
                  <div className={`flex items-start gap-3 ${mailStyles.navProfile}`}>
                    <div>
                      <span className="avatar avatar-md online avatar-rounded bg-white/15 flex items-center justify-center ring-2 ring-white/10">
                        <i className="ri-user-smile-line text-white text-lg"></i>
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold mb-0 text-white truncate text-[0.9rem]">
                        {emailToDisplayName(
                          accounts.find((a) => a.id === selectedAccountId)?.email ?? ""
                        )}
                      </p>
                      <p className="text-white/70 text-[0.7rem] mb-0 truncate font-mono">
                        {accounts.find((a) => a.id === selectedAccountId)?.email ?? ""}
                      </p>
                      {!workLock && (
                        <button
                          type="button"
                          onClick={() => selectedAccountId && handleDisconnect(selectedAccountId)}
                          className="text-white/60 hover:text-white text-[0.65rem] mt-1.5 underline underline-offset-2"
                        >
                          Sign out mailbox
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Fills whatever height is left instead of relying on the list's
                      own calc(100vh - 19rem), which clamps to zero on a short
                      window or at high browser zoom and made the folders
                      unreachable. */}
                  <div className="flex-1 min-h-0">
                    <PerfectScrollbar>
                      {/* !max-h-none overrides the stylesheet's
                          max-height: calc(100vh - 19rem) on this list, which clamps
                          to zero on a short window or at high browser zoom and hid
                          every folder. Height now comes from the flex parent above. */}
                      <ul className="list-none mail-main-nav !max-h-none !text-[0.813rem]">
                        {navMailboxAccounts.length > 1 && (
                          <>
                            <li className="!px-4 !pt-3 !pb-1">
                              <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                                MAILBOXES
                              </span>
                            </li>
                            {navMailboxAccounts.map((acc) => {
                              const activeMb = acc.id === selectedAccountId;
                              return (
                                <li key={`mb-${acc.id}`} className="!px-2 !py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      switchToMailbox(acc.id);
                                      Toggle2();
                                    }}
                                    className={`w-full text-left rounded-md px-2 py-2 flex items-center gap-2 min-w-0 border-0 bg-transparent ${mailStyles.navItem} ${activeMb ? mailStyles.navItemActive : ""}`}
                                    aria-current={activeMb ? "true" : undefined}
                                    aria-pressed={activeMb}
                                    aria-label={`${acc.provider === "outlook" ? "Outlook" : "Gmail"}: ${acc.email}`}
                                  >
                                    <i
                                      className={`align-middle text-[.875rem] shrink-0 ${acc.provider === "outlook" ? "ri-microsoft-fill text-blue-500 dark:text-blue-400" : "ri-google-fill text-red-500 dark:text-red-400"}`}
                                      aria-hidden
                                    />
                                    <span className="truncate min-w-0 text-[0.8125rem]">{acc.email}</span>
                                  </button>
                                </li>
                              );
                            })}
                            <li
                              className="!px-4 !pt-2 !pb-0 border-t border-stone-200/40 dark:border-white/10 mt-1"
                              aria-hidden
                            />
                          </>
                        )}
                        <li className="!px-4 !pt-3 !pb-1">
                          <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                            MAILS
                          </span>
                        </li>
                        <li
                          className={`mail-type ${mailStyles.navItem} ${selectedLabelId === "ALL" ? mailStyles.navItemActive : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => selectFolder("ALL")}
                            aria-current={selectedLabelId === "ALL" ? "true" : undefined}
                            className="w-full text-left bg-transparent border-0 -m-2 p-2 rounded-md"
                          >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                              <i className="ri-mail-line align-middle text-[.875rem] me-2"></i>
                              <span className="whitespace-nowrap">All Mails</span>
                            </div>
                            <MailNavUnreadBadge count={allMailsUnread} />
                          </div>
                          </button>
                        </li>
                        <li
                          className={`mail-type ${mailStyles.navItem} ${selectedLabelId === "INBOX" ? mailStyles.navItemActive : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => selectFolder("INBOX")}
                            aria-current={selectedLabelId === "INBOX" ? "true" : undefined}
                            className="w-full text-left bg-transparent border-0 -m-2 p-2 rounded-md"
                          >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                              <i className="ri-inbox-line align-middle text-[.875rem] me-2"></i>
                              <span className="whitespace-nowrap">Inbox</span>
                            </div>
                            <MailNavUnreadBadge count={unreadForLabel("INBOX")} />
                          </div>
                          </button>
                        </li>
                        {mailLabelsForNav.map((label) => (
                            <li
                              key={label.id}
                              className={`mail-type ${mailStyles.navItem} ${selectedLabelId === label.id ? mailStyles.navItemActive : ""}`}
                            >
                              <button
                                type="button"
                                onClick={() => selectFolder(label.id)}
                                aria-current={selectedLabelId === label.id ? "true" : undefined}
                                className="w-full text-left bg-transparent border-0 -m-2 p-2 rounded-md"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center min-w-0">
                                    <i
                                      className={`${getLabelIcon(label.id)} align-middle text-[.875rem] me-2`}
                                      aria-hidden
                                    ></i>
                                    <span className="whitespace-nowrap">
                                      {label.id === "conversationhistory" ? "Conversation History" : label.name}
                                    </span>
                                  </div>
                                  <MailNavUnreadBadge count={unreadForLabel(label.id)} />
                                </div>
                              </button>
                            </li>
                          ))}
                        <li className="!px-4 !pt-4 !pb-1">
                          <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                            SETTINGS
                          </span>
                        </li>
                        <li>
                          <a
                            href={mailboxSettingsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block !px-4 !py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <div className="flex items-center">
                              <i className="ri-settings-3-line align-middle text-[.875rem] me-2" aria-hidden></i>
                              <span className="whitespace-nowrap">
                                {mailProvider === "outlook" ? "Outlook Settings" : "Gmail Settings"}
                              </span>
                            </div>
                          </a>
                        </li>
                        {!workLock &&
                          (canAddMoreGmail ||
                            canAddOutlookMailbox ||
                            hasGmailAccount ||
                            hasOutlookAccount) && (
                          <li className="!px-4 !pt-4 !pb-1">
                            <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                              ADD ACCOUNT
                            </span>
                          </li>
                        )}
                        {!workLock && canAddMoreGmail && (
                          <li
                            className="cursor-pointer !px-4 !py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                            onClick={handleConnectGmail}
                          >
                            <div className="flex items-center">
                              <i className="ri-google-fill align-middle text-[.875rem] me-2 text-[#8c9097] dark:text-white/50"></i>
                              <span className="whitespace-nowrap">
                                {hasGmailAccount ? "Add Gmail account" : "Connect Gmail"}
                              </span>
                            </div>
                          </li>
                        )}
                        {!workLock &&
                          !canAddMoreGmail &&
                          accounts.some((a) => a.provider === "gmail") && (
                          <li className="!px-4 !py-2 text-[#8c9097] dark:text-white/45 text-[0.75rem]">
                            Maximum {MAX_GMAIL_ACCOUNTS} Gmail accounts (disconnect one to add another)
                          </li>
                        )}
                        {!workLock && canAddOutlookMailbox && (
                          <li
                            className="cursor-pointer !px-4 !py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                            onClick={handleConnectOutlook}
                          >
                            <div className="flex items-center">
                              <i className="ri-microsoft-fill align-middle text-[.875rem] me-2 text-[#8c9097] dark:text-white/50"></i>
                              <span className="whitespace-nowrap">Connect Outlook</span>
                            </div>
                          </li>
                        )}
                        {!workLock &&
                          !canAddOutlookMailbox &&
                          accounts.some((a) => a.provider === "outlook") && (
                          <li className="!px-4 !py-2 text-[#8c9097] dark:text-white/45 text-[0.75rem]">
                            One Outlook account connected (disconnect to use a different mailbox)
                          </li>
                        )}
                        {currentProvider !== "outlook" && (
                          <>
                            <li className="!px-4 !pt-4 !pb-1">
                              <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                                LABELS
                              </span>
                            </li>
                            {/* window.prompt() before: unstyled, outside the page for
                                a screen reader, and with nowhere to report a failure.
                                This is the same inline form the reading-pane label
                                menu already used - one create-label UI, not two. */}
                            <li className="!px-4 !py-2">
                              {navCreateLabelOpen ? (
                                <form
                                  className="flex gap-1.5"
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    void handleCreateLabel(navLabelName, {
                                      applyToOpenThread: false,
                                    }).then((created) => {
                                      // Keep what was typed when the create failed,
                                      // so the message is not the only thing left.
                                      if (!created) return;
                                      setNavLabelName("");
                                      setNavCreateLabelOpen(false);
                                    });
                                  }}
                                >
                                  <label htmlFor="nav-new-label" className="sr-only">
                                    New label name
                                  </label>
                                  <input
                                    id="nav-new-label"
                                    autoFocus
                                    value={navLabelName}
                                    onChange={(e) => setNavLabelName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") setNavCreateLabelOpen(false);
                                    }}
                                    placeholder="Label name"
                                    className="form-control form-control-sm flex-1 min-w-0 !py-1.5 !px-2 !text-[0.75rem]"
                                  />
                                  <button
                                    type="submit"
                                    disabled={!navLabelName.trim() || creatingLabel}
                                    className="ti-btn ti-btn-sm ti-btn-primary !py-1.5 !px-2.5 !mb-0 shrink-0"
                                  >
                                    {creatingLabel ? "..." : "Add"}
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNavLabelName("");
                                    setNavCreateLabelOpen(true);
                                  }}
                                  className="flex items-center gap-2 w-full text-left rounded-md"
                                >
                                  <i className="ri-add-line align-middle text-[.875rem] text-primary" aria-hidden />
                                  <span className="text-[0.75rem] text-primary">Create label</span>
                                </button>
                              )}
                            </li>
                            {userLabelsForNav.map((label) => (
                              <li
                                key={label.id}
                                className={`${mailStyles.navItem} ${selectedLabelId === label.id ? mailStyles.navItemActive : ""}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => selectFolder(label.id)}
                                  aria-current={selectedLabelId === label.id ? "true" : undefined}
                                  className="w-full text-left bg-transparent border-0 -m-2 p-2 rounded-md"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center min-w-0">
                                      <i
                                        className="ri-price-tag-line align-middle text-[.875rem] me-2 text-secondary"
                                        aria-hidden
                                      ></i>
                                      <span className="whitespace-nowrap">{label.name}</span>
                                    </div>
                                    <MailNavUnreadBadge count={unreadForLabel(label.id)} />
                                  </div>
                                </button>
                              </li>
                            ))}
                          </>
                        )}
                      </ul>
                    </PerfectScrollbar>
                  </div>
                </>
              )}
            </div>

            <div
              className={`total-mails ${mailStyles.threadListPane} ${isTotalMailsVisible ? "!flex" : ""} ${isTotalMailsHidden ? "!hidden" : ""} border dark:border-defaultborder/10`}
            >
              <div className="!p-4 flex items-center gap-2 border-b dark:border-defaultborder/10">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="checkAllMails"
                  aria-label={
                    liveSelectedCount > 0
                      ? `${liveSelectedCount} of ${threads.length} selected. Clear selection`
                      : "Select all conversations in this view"
                  }
                  // Counts only ticks that still match a visible row, so leftovers
                  // from a previous folder cannot leave this stuck on "all selected".
                  checked={threads.length > 0 && liveSelectedCount === threads.length}
                  ref={(el) => {
                    if (el) el.indeterminate = liveSelectedCount > 0 && liveSelectedCount < threads.length;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <button
                  onClick={Toggle1}
                  aria-label="Show folders"
                  title="Show folders"
                  type="button"
                  className={`ti-btn ti-btn-icon ti-btn-light !mb-0 ${mailStyles.listFolderToggle}`}
                >
                  <i className="ri-menu-line" aria-hidden></i>
                </button>
                <div className="flex-grow min-w-0">
                  <h6
                    className={`${mailDisplay.className} font-semibold mb-0 text-lg text-stone-800 dark:text-stone-100 truncate`}
                  >
                    {selectedLabelId === "ALL"
                      ? "All mail"
                      : selectedLabelId === "INBOX"
                        ? "Inbox"
                        : mailLabelsForNav.find((l) => l.id === selectedLabelId)?.name ??
                          selectedLabelId}
                  </h6>
                </div>
                <div className="hs-dropdown ti-dropdown relative">
                  <button
                    ref={mailMenuButtonRef}
                    type="button"
                    onClick={() => {
                      const next = !showMailMenu;
                      if (next && mailMenuButtonRef.current) {
                        const rect = mailMenuButtonRef.current.getBoundingClientRect();
                        setMailMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                      } else {
                        setMailMenuPosition(null);
                      }
                      setShowMailMenu(next);
                    }}
                    className="ti-btn ti-btn-icon ti-btn-light"
                    aria-expanded={showMailMenu}
                  >
                    <i className="ti ti-dots-vertical"></i>
                  </button>
                  {showMailMenu &&
                    typeof document !== "undefined" &&
                    mailMenuPosition &&
                    createPortal(
                      <>
                        <div
                          className="fixed inset-0 z-[9998] pointer-events-none"
                          aria-hidden="true"
                        />
                        <ul
                          ref={mailMenuRef}
                          className="fixed min-w-[10rem] ti-dropdown-menu !opacity-100 bg-white dark:bg-bodybg border dark:border-defaultborder rounded-md shadow-lg z-[9999] py-1"
                          style={{ top: mailMenuPosition.top, right: mailMenuPosition.right }}
                        >
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                handleMailMenuRecent();
                                setShowMailMenu(false);
                                setMailMenuPosition(null);
                              }}
                              className="ti-dropdown-item !py-2 !px-4 w-full text-left"
                            >
                              Recent
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                handleMailMenuUnread();
                                setShowMailMenu(false);
                                setMailMenuPosition(null);
                              }}
                              className="ti-dropdown-item !py-2 !px-4 w-full text-left"
                            >
                              Unread
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                handleMarkAllRead();
                                setShowMailMenu(false);
                                setMailMenuPosition(null);
                              }}
                              className="ti-dropdown-item !py-2 !px-4 w-full text-left"
                            >
                              {liveSelectedCount > 0
                                ? `Mark ${liveSelectedCount} read`
                                : "Mark all read"}
                            </button>
                          </li>
                          {/* Destructive pair, separated and coloured so they are not
                              one careless click away from "Mark all read". */}
                          <li className="border-t dark:border-defaultborder/10 mt-1 pt-1">
                            {liveSelectedCount > 0 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleMoveSelectedToSpam()}
                                  className={`ti-dropdown-item !py-2 !px-4 w-full text-left ${
                                    isSpamFolder ? "" : "!text-danger"
                                  }`}
                                >
                                  {isSpamFolder
                                    ? `Not spam (${liveSelectedCount} selected)`
                                    : `Report ${liveSelectedCount} selected as spam`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleMoveAllLoadedToSpam()}
                                  className={`ti-dropdown-item !py-2 !px-4 w-full text-left ${
                                    isSpamFolder ? "" : "!text-danger"
                                  }`}
                                >
                                  {isSpamFolder
                                    ? `Not spam (all ${threads.length} loaded)`
                                    : `Report all ${threads.length} loaded as spam`}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleMoveAllLoadedToSpam()}
                                className={`ti-dropdown-item !py-2 !px-4 w-full text-left ${
                                  isSpamFolder ? "" : "!text-danger"
                                }`}
                              >
                                {isSpamFolder ? "Not spam (all loaded)" : "Report all as spam"}
                              </button>
                            )}
                          </li>
                          <li>
                            {liveSelectedCount > 0 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteSelected()}
                                  className="ti-dropdown-item !py-2 !px-4 w-full text-left !text-danger"
                                >
                                  Delete selected ({liveSelectedCount})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteAllLoaded()}
                                  className="ti-dropdown-item !py-2 !px-4 w-full text-left !text-danger"
                                >
                                  Delete all loaded ({threads.length})
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleDeleteAllLoaded()}
                                className="ti-dropdown-item !py-2 !px-4 w-full text-left !text-danger"
                              >
                                Delete all loaded
                              </button>
                            )}
                          </li>
                        </ul>
                      </>,
                      document.body
                    )}
                </div>
              </div>
              {liveSelectedCount > 0 && (
                <div
                  className={mailStyles.threadListSelectionBar}
                  role="region"
                  aria-label="Selected conversations"
                >
                  <span className={mailStyles.threadListSelectionCount}>
                    {liveSelectedCount} selected
                  </span>
                  <div className={mailStyles.threadListSelectionActions}>
                    <button
                      type="button"
                      className={`${mailStyles.selectionActionBtn} ${mailStyles.selectionActionBtnDanger}`}
                      onClick={() => void handleDeleteSelected()}
                      aria-label={`Delete ${liveSelectedCount} selected conversations`}
                    >
                      <i className="ri-delete-bin-line" aria-hidden />
                      <span className={mailStyles.selectionActionBtnLabel}>Delete selected</span>
                    </button>
                    <button
                      type="button"
                      className={`${mailStyles.selectionActionBtn} ${mailStyles.selectionActionBtnNeutral}`}
                      onClick={() => void handleMarkAllRead()}
                      aria-label={`Mark ${liveSelectedCount} conversations as read`}
                    >
                      <i className="ri-mail-open-line" aria-hidden />
                      <span className={mailStyles.selectionActionBtnLabel}>Mark read</span>
                    </button>
                    <button
                      type="button"
                      className={`${mailStyles.selectionActionBtn} ${mailStyles.selectionActionBtnNeutral}`}
                      onClick={handleClearSelection}
                      aria-label="Clear selection"
                    >
                      <i className="ri-close-circle-line" aria-hidden />
                      <span className={mailStyles.selectionActionBtnLabel}>Clear</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="px-4 pb-3 pt-1">
                <div className={`flex items-stretch ${mailStyles.searchWrap}`}>
                  <input
                    type="text"
                    className="form-control !border-0 !bg-transparent !shadow-none flex-1 !py-2.5 !px-4 !text-sm focus:!ring-0"
                    placeholder="Search messages…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    aria-label="Search mail"
                  />
                  <button
                    aria-label="Search"
                    type="button"
                    onClick={handleSearch}
                    className="ti-btn !border-0 !bg-transparent !text-stone-500 hover:!text-amber-700 dark:hover:!text-amber-400 !mb-0 !px-4"
                  >
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
                {/* Graph rejects $orderby alongside $search, so Outlook hands back
                    relevance order. Saying so beats letting the date column look
                    shuffled. */}
                {mailProvider === "outlook" && searchQuery ? (
                  <p className="mt-1.5 text-[0.7rem] text-stone-500 dark:text-stone-400">
                    Outlook returns search results by relevance, not by date.
                  </p>
                ) : null}
              </div>
              <div className={mailStyles.threadListScroll}>
                <div className={`mail-messages ${mailStyles.threadListMessages}`}>
                  <ul className="list-none mb-0 mail-messages-container text-defaulttextcolor text-defaultsize w-full">
                    {loadingMessages ? (
                      <li className="!p-6 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-16 ${mailStyles.skeleton}`} />
                        ))}
                      </li>
                    ) : listError ? (
                      <li className="!p-10 text-center text-sm" role="alert">
                        <i className="ri-wifi-off-line text-3xl mb-2 block text-danger/60" aria-hidden></i>
                        <p className="text-stone-700 dark:text-stone-200 mb-1">{listError}</p>
                        <p className="text-stone-500 dark:text-stone-400 text-[0.75rem] mb-3">
                          This is a loading problem, not an empty folder.
                        </p>
                        <button
                          type="button"
                          onClick={refetchMessages}
                          className="ti-btn ti-btn-sm ti-btn-light !mb-0"
                        >
                          <i className="ri-refresh-line me-1 align-middle" aria-hidden></i>
                          Try again
                        </button>
                      </li>
                    ) : threads.length === 0 ? (
                      <li className="!p-10 text-center text-stone-500 dark:text-stone-400 text-sm">
                        <i className="ri-inbox-unarchive-line text-3xl mb-2 block opacity-40"></i>
                        Nothing here yet
                      </li>
                    ) : (
                      threads.map((thread) => (
                        /* role=button rather than a real <button>: the row already
                           contains a checkbox and two icon buttons, and nesting
                           interactive elements inside a button is invalid. This
                           makes the row focusable and operable by keyboard, which
                           it was not - it was a plain <li> with an onClick. */
                        <li
                          key={thread.id}
                          role="button"
                          tabIndex={0}
                          aria-current={selectedThreadId === thread.id ? "true" : undefined}
                          aria-label={`${thread.isUnread ? "Unread. " : ""}${thread.from || "Unknown sender"}: ${
                            thread.subject || "(No subject)"
                          }`}
                          className={`cursor-pointer ${mailStyles.threadRow} ${selectedThreadId === thread.id ? mailStyles.threadRowActive : ""} ${thread.isUnread ? mailStyles.threadUnread : ""}`}
                          onClick={() => handleSelectThread(thread)}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return; // let the inner controls handle their own keys
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void handleSelectThread(thread);
                            }
                          }}
                        >
                          <div className="flex items-start !p-3.5">
                            <div className="me-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedThreadIds.has(thread.id)}
                                onChange={(e) => handleToggleSelect(thread.id, e.target.checked)}
                                aria-label="Select"
                              />
                            </div>
                            <div className="me-3 leading-none">
                              <span
                                className={`avatar avatar-md avatar-rounded mail-msg-avatar flex items-center justify-center !bg-primary/20 !text-primary ${selectedThreadId === thread.id ? "ring-2 ring-primary ring-offset-1" : ""}`}
                              >
                                {thread.from?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <div className={`flex-grow min-w-0 max-w-full overflow-hidden ${mailStyles.threadContent}`}>
                              <div className={`mb-1 flex items-start gap-2 min-w-0 max-w-full ${mailStyles.threadTopLine}`}>
                                <p className="flex-1 min-w-0 max-w-full text-[0.75rem] mb-0 overflow-hidden">
                                  <span className={`block ${mailStyles.threadSender} ${thread.isUnread ? "font-semibold" : ""}`}>
                                    {thread.from}
                                  </span>
                                </p>
                                <span
                                  className={`shrink-0 text-[#8c9097] dark:text-white/50 font-normal text-[.6875rem] ${mailStyles.threadListDate}`}
                                >
                                  {formatMailListDate(thread.date)}
                                </span>
                              </div>
                              <p className={`mail-msg mb-0 min-w-0 max-w-full overflow-hidden ${mailStyles.threadMeta}`}>
                                <span
                                  className={`block mb-0 ${mailStyles.threadSubject} ${thread.isUnread ? "font-semibold" : ""}`}
                                >
                                  {thread.subject || "(No subject)"}
                                </span>
                                <span className={`text-[.6875rem] text-[#8c9097] dark:text-white/50 ${mailStyles.threadSnippet}`}>
                                  {thread.snippet || ""}
                                </span>
                              </p>
                            </div>
                            {!thread.isUnread && (
                              <button
                                type="button"
                                onClick={(e) => void handleMarkUnread(thread, e)}
                                className={`ti-btn ti-btn-icon ti-btn-ghost !p-1 ms-1 self-center opacity-50 hover:opacity-100 ${mailStyles.rowIconBtn}`}
                                title="Mark as unread"
                                aria-label="Mark thread as unread"
                              >
                                <i className="ri-mail-unread-line"></i>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(thread, e)}
                              className={`ti-btn ti-btn-icon ti-btn-ghost !p-1 ms-1 self-center opacity-50 hover:opacity-100 ${mailStyles.rowIconBtn}`}
                              title="Star"
                              aria-label={
                                thread.labelIds?.includes("STARRED") ? "Remove star" : "Star thread"
                              }
                            >
                              <i
                                className={`${thread.labelIds?.includes("STARRED") ? "ri-star-fill text-warning" : "ri-star-line"}`}
                              ></i>
                            </button>
                          </div>
                        </li>
                      ))
                    )}
                    {nextPageToken && threads.length > 0 && (
                      <li className="!p-4 text-center shrink-0">
                        <button
                          type="button"
                          onClick={loadMoreThreads}
                          disabled={loadingMore}
                          className="ti-btn ti-btn-sm ti-btn-light whitespace-nowrap shrink-0 min-w-[5.5rem]"
                        >
                          {loadingMore ? "Loading..." : "Load more"}
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div
              // !flex, not !block. This pane is a flex column with a fixed height
              // and overflow:hidden; its body scrolls via flex:1 + min-height:0.
              // display:block !important made those inert, so on every screen
              // under MASTER_DETAIL_MAX_WIDTH the message body was clipped with no scrollbar and
              // the reply composer and footer actions could not be reached.
              className={`mails-information ${isMailsInformationVisible ? "!flex" : ""} border dark:border-defaultborder/10 text-defaulttextcolor text-defaultsize ${mailStyles.readingPane}`}
            >
              {!selectedThreadId ? (
                <div
                  className={`flex flex-col items-center justify-center text-center text-stone-500 dark:text-stone-400 ${mailStyles.emptyReading}`}
                >
                  <div className={mailStyles.emptyReadingIcon}>
                    <i className="ri-mail-open-line text-3xl text-amber-700/70 dark:text-amber-400/80"></i>
                  </div>
                  <p className={`${mailDisplay.className} text-xl text-stone-800 dark:text-stone-100 mb-2`}>
                    Pick a thread
                  </p>
                  <p className="text-sm max-w-[280px] leading-relaxed text-stone-600 dark:text-stone-400">
                    Select a conversation in the list to read messages, attachments, and replies in one place.
                  </p>
                </div>
              ) : loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className={`w-48 h-3 ${mailStyles.skeleton}`} />
                  <div className={`w-full max-w-md h-32 ${mailStyles.skeleton}`} />
                </div>
              ) : detailError ? (
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center" role="alert">
                  <i className="ri-wifi-off-line text-3xl mb-3 text-danger/60" aria-hidden />
                  <p className="text-stone-700 dark:text-stone-200 mb-1">{detailError}</p>
                  <p className="text-stone-500 dark:text-stone-400 text-[0.75rem] mb-4 max-w-sm">
                    This is a loading problem, not an empty thread.
                  </p>
                  <button
                    type="button"
                    onClick={retryLoadThreadDetail}
                    className="ti-btn ti-btn-sm ti-btn-light !mb-0"
                  >
                    <i className="ri-refresh-line me-1 align-middle" aria-hidden />
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`mail-info-header relative z-20 flex flex-wrap gap-2 items-center !p-5 border-b border-stone-200/80 dark:border-white/10 ${mailStyles.readingHeader} ${mailStyles.readingPaneHeader}`}
                  >
                    <button
                      type="button"
                      onClick={backToThreadList}
                      className={mailStyles.threadBackBtn}
                      aria-label="Back to conversation list"
                    >
                      <i className="ri-arrow-left-line" aria-hidden />
                      <span className={mailStyles.threadBackBtnLabel}>Back</span>
                    </button>
                    <div className="me-2">
                      <span className="avatar avatar-md online avatar-rounded flex items-center justify-center !bg-amber-100 !text-amber-900 dark:!bg-amber-900/40 dark:!text-amber-200 ring-2 ring-amber-200/50 dark:ring-amber-700/40">
                        {headerFrom?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h6 className="mb-0 font-semibold text-[1.05rem] text-stone-900 dark:text-stone-100 truncate">
                        {headerFrom}
                      </h6>
                      <span className="text-stone-500 dark:text-stone-400 text-[0.75rem] block truncate">
                        {headerTo}
                      </span>
                    </div>
                    <span
                      className={`text-[0.75rem] text-stone-500 dark:text-stone-400 shrink-0 ${mailStyles.threadListDate}`}
                    >
                      <time dateTime={headerDate || undefined}>
                        {formatMailListDate(headerDate)}
                      </time>
                    </span>
                    <div
                      className={`${mailStyles.readingToolbar} relative z-20 pointer-events-auto shrink-0 max-w-full justify-end`}
                      role="toolbar"
                      aria-label="Mail actions"
                    >
                      <div className={mailStyles.mailToolbarGroup}>
                        <button
                          type="button"
                          // Falls back to a minimal row built from the open thread.
                          // Guarded on selectedThread alone, the button did nothing
                          // at all for a conversation opened from a link that is not
                          // in the loaded page - no action, no message.
                          onClick={(e) =>
                            void handleToggleStar(
                              selectedThread ?? ({ id: selectedThreadId, labelIds: [] } as unknown as EmailThreadListItem),
                              e
                            )
                          }
                          disabled={!selectedThreadId}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title="Star"
                          aria-label={
                            selectedThread?.labelIds?.includes("STARRED")
                              ? "Remove star from thread"
                              : "Star thread"
                          }
                        >
                          <i
                            className={`${selectedThread?.labelIds?.includes("STARRED") ? "ri-star-fill text-warning" : "ri-star-line"}`}
                            aria-hidden
                          ></i>
                        </button>
                      {mailProvider === "gmail" ? (
                        <div className="relative">
                          <button
                            ref={labelButtonRef}
                            type="button"
                            aria-haspopup="true"
                            aria-expanded={showLabelDropdown}
                            onClick={() => {
                              const next = !showLabelDropdown;
                              if (next && labelButtonRef.current) {
                                const rect = labelButtonRef.current.getBoundingClientRect();
                                setLabelMenuPosition({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                });
                              } else {
                                setLabelMenuPosition(null);
                              }
                              setShowLabelDropdown(next);
                            }}
                            className="ti-btn ti-btn-icon ti-btn-light"
                            title="Labels"
                            aria-label="Labels"
                          >
                            <i className="ri-price-tag-3-line" aria-hidden></i>
                          </button>
                          {showLabelDropdown &&
                            typeof document !== "undefined" &&
                            labelMenuPosition &&
                            createPortal(
                              <div
                                ref={labelMenuRef}
                                className="fixed min-w-[12rem] max-w-[14rem] ti-dropdown-menu !opacity-100 bg-white dark:bg-bodybg border dark:border-defaultborder rounded-lg shadow-xl z-[9999] py-2 max-h-[18rem] flex flex-col"
                                style={{ top: labelMenuPosition.top, right: labelMenuPosition.right }}
                              >
                                <div className="px-3 py-1.5 text-[0.7rem] font-semibold text-[#8c9097] dark:text-white/50 uppercase tracking-wide">
                                  Apply label
                                </div>
                                <div className="overflow-y-auto max-h-[10rem] px-1">
                                  {userLabelsForNav.length === 0 ? (
                                    <div className="px-3 py-2 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                      No labels yet
                                    </div>
                                  ) : (
                                    userLabelsForNav.map((label) => {
                                      const isApplied = selectedThread?.labelIds?.includes(label.id);
                                      return (
                                        <button
                                          key={label.id}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApplyLabel(label.id);
                                          }}
                                          className="w-full text-left flex items-center gap-2 py-2.5 px-3 rounded-md hover:bg-primary/5 hover:text-primary dark:hover:bg-white/5 transition-colors"
                                        >
                                          <i
                                            className={`ri-${isApplied ? "check-line text-primary" : "add-line text-[#8c9097] dark:text-white/50"} text-[.875rem] shrink-0`}
                                          ></i>
                                          <span className="text-[0.8125rem] truncate">{label.name}</span>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                                <div className="border-t dark:border-defaultborder/10 mt-1 pt-1">
                                  {createLabelExpanded ? (
                                    <div className="px-3 py-2 bg-light/50 dark:bg-black/20 rounded-b-lg">
                                      <div className="text-[0.7rem] font-medium text-[#8c9097] dark:text-white/50 mb-2">
                                        Create new label
                                      </div>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={newLabelName}
                                          onChange={(e) => setNewLabelName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleCreateLabel(newLabelName);
                                            if (e.key === "Escape") setCreateLabelExpanded(false);
                                          }}
                                          placeholder="Label name"
                                          className="form-control form-control-sm flex-1 !py-1.5 !px-2 !text-[0.75rem]"
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreateLabel(newLabelName);
                                          }}
                                          disabled={!newLabelName.trim() || creatingLabel}
                                          className="ti-btn ti-btn-sm ti-btn-primary !py-1.5 !px-3 shrink-0"
                                        >
                                          {creatingLabel ? "..." : "Create"}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCreateLabelExpanded(true);
                                      }}
                                      className="w-full text-left flex items-center gap-2 py-2.5 px-3 rounded-md hover:bg-primary/5 hover:text-primary dark:hover:bg-white/5 transition-colors"
                                    >
                                      <i className="ri-add-line text-primary text-[.875rem] shrink-0"></i>
                                      <span className="text-[0.8125rem] text-primary">Create label</span>
                                    </button>
                                  )}
                                </div>
                              </div>,
                              document.body
                            )}
                        </div>
                      ) : null}
                        <button
                          type="button"
                          onClick={handleArchive}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title="Archive"
                          aria-label="Archive thread"
                        >
                          <i className="ri-inbox-archive-line" aria-hidden></i>
                        </button>
                      </div>
                      <span className={mailStyles.toolbarDivider} aria-hidden />
                      <div className={mailStyles.mailToolbarGroup}>
                        <button
                          type="button"
                          onClick={handleTrash}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title={isPermanentDeleteFolder ? "Delete forever" : "Move to trash"}
                          aria-label={
                            isPermanentDeleteFolder
                              ? "Delete this conversation forever"
                              : "Move this conversation to trash"
                          }
                        >
                          <i className="ri-delete-bin-line" aria-hidden></i>
                        </button>
                      </div>
                      {canManageEmail ? (
                        <>
                          <span className={mailStyles.toolbarDivider} aria-hidden />
                          <div className={mailStyles.mailToolbarGroup}>
                            <button
                              type="button"
                              onClick={() => void openComposeForReadingPane("reply")}
                              className="ti-btn ti-btn-icon ti-btn-light"
                              title="Reply"
                              aria-label="Reply to sender"
                            >
                              <i className="ri-reply-line" aria-hidden></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => void openComposeForReadingPane("replyAll")}
                              className="ti-btn ti-btn-icon ti-btn-light"
                              title="Reply all"
                              aria-label="Reply all"
                            >
                              <i className="ri-reply-all-line" aria-hidden></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => void openComposeForReadingPane("forward")}
                              className="ti-btn ti-btn-icon ti-btn-light"
                              title="Forward"
                              aria-label="Forward message"
                            >
                              <i className="ri-share-forward-line" aria-hidden></i>
                            </button>
                          </div>
                        </>
                      ) : null}
                      <span className={mailStyles.toolbarDivider} aria-hidden />
                      <div className={mailStyles.mailToolbarGroup}>
                        <button
                          type="button"
                          onClick={backToThreadList}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title="Back to mail list"
                          aria-label="Close message"
                        >
                          <i className="ri-close-line" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`mail-info-body dark:!border-defaultborder/10 p-6 ${mailStyles.readingPaneScroll}`}
                  >
                    <div className="sm:flex block items-start justify-between mb-6 gap-4">
                      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 flex-1 min-w-0">
                        <p
                          className={`${mailDisplay.className} ${mailStyles.subjectDisplay} font-semibold mb-0 flex-1 min-w-0`}
                        >
                          {headerSubject || "(No subject)"}
                        </p>
                        {headerMessageCount > 1 ? (
                          <span className={mailStyles.threadCountBadge}>
                            {headerMessageCount} messages
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {/* Remote media is held back until the reader asks for it: a
                        tracking pixel reports the read time and the reader's IP
                        back to whoever sent the message. Inline data: and cid:
                        images are unaffected, so signatures still render. */}
                    {threadHasRemoteImages && !remoteImagesAllowed ? (
                      <div className={mailStyles.remoteImageNotice} role="status">
                        <i className="ri-image-line" aria-hidden />
                        <span className={mailStyles.remoteImageNoticeText}>
                          Images in this conversation are not shown, so the sender is not told you
                          opened it.
                        </span>
                        <button
                          type="button"
                          className={mailStyles.remoteImageNoticeAction}
                          onClick={() => setRemoteImagesAllowedFor(selectedThreadId)}
                        >
                          Show images
                        </button>
                      </div>
                    ) : null}
                    <div
                      className={threadMessages.length > 0 ? mailStyles.threadConversation : undefined}
                      role="region"
                      aria-label="Conversation messages"
                    >
                      {threadMessages.length === 0 && selectedThread?.snippet && (
                        <div
                          className={`main-mail-content prose dark:prose-invert max-w-none mail-html-body text-sm ${mailStyles.threadMessageCard}`}
                        >
                          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                            Preview
                          </p>
                          <p className="whitespace-pre-wrap m-0 text-stone-700 dark:text-stone-200">
                            {selectedThread.snippet}
                          </p>
                        </div>
                      )}
                      {threadMessages.map((msg, idx) => (
                        <article
                          key={msg.id}
                          className={mailStyles.threadMessageCard}
                          aria-label={`Message ${idx + 1} of ${threadMessages.length}`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <span
                              className="avatar avatar-sm avatar-rounded flex items-center justify-center !bg-amber-100 !text-amber-900 dark:!bg-amber-900/35 dark:!text-amber-100 shrink-0 ring-1 ring-amber-200/40 dark:ring-amber-700/30"
                              aria-hidden
                            >
                              {msg.from?.[0]?.toUpperCase() || "?"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                                  {msg.from}
                                </span>
                                <time
                                  className={`text-[0.75rem] text-stone-500 dark:text-stone-400 ${mailStyles.threadListDate}`}
                                  dateTime={msg.date || undefined}
                                >
                                  {formatMailListDate(msg.date)}
                                </time>
                              </div>
                              <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 space-y-0.5 mt-1">
                                <div className="break-words">
                                  <span className="font-medium text-stone-500 dark:text-stone-400">To:</span>{" "}
                                  <span className="text-stone-600 dark:text-stone-300">{msg.to || "—"}</span>
                                </div>
                                {msg.cc?.trim() ? (
                                  <div className="break-words">
                                    <span className="font-medium text-stone-500 dark:text-stone-400">Cc:</span>{" "}
                                    <span className="text-stone-600 dark:text-stone-300">{msg.cc}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`main-mail-content prose max-w-none mail-html-body text-sm text-stone-800 ${mailStyles.mailHtmlCanvas}`}
                            dangerouslySetInnerHTML={{
                              __html:
                                preparedBodies[idx] ||
                                (msg.textBody
                                  ? `<pre class="whitespace-pre-wrap">${escapeHtmlForTextNode(msg.textBody)}</pre>`
                                  : "<p>No content</p>"),
                            }}
                          />
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mail-attachments mt-3 flex flex-wrap gap-2">
                              {msg.attachments.map((att) =>
                                att.attachmentId ? (
                                  <a
                                    key={att.attachmentId}
                                    href={emailApi.getAttachmentUrl(
                                      selectedAccountId!,
                                      msg.id,
                                      att.attachmentId,
                                      mailProvider
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mail-attachment border dark:border-defaultborder/10 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm bg-stone-50/80 dark:bg-white/5 hover:bg-amber-50/90 dark:hover:bg-amber-950/20 border-stone-200/80 dark:border-white/10 transition-colors"
                                  >
                                    <i className="ri-attachment-2 text-amber-700 dark:text-amber-400" aria-hidden></i>
                                    <span className="truncate max-w-[140px]">{att.filename}</span>
                                  </a>
                                ) : null
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                    {canManageEmail ? (
                    <div className="mt-8 pt-8 border-t border-stone-200/80 dark:border-white/10">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                        <i className="ri-reply-line me-1.5 align-middle text-amber-700 dark:text-amber-500"></i>
                        Your reply
                      </span>
                      <p className="text-[0.7rem] text-stone-500 dark:text-stone-400 mb-3 leading-relaxed">
                        Sends to the original sender only. Use <span className="font-medium">Reply all</span> in the
                        toolbar above to include everyone on To/Cc. Bcc is never visible on incoming mail.
                      </p>
                      <div
                        className={`mail-reply overflow-hidden bg-white dark:bg-stone-900 [&_.tiptap-toolbar]:!bg-stone-50 [&_.tiptap-toolbar]:dark:!bg-stone-900 [&_.tiptap-content]:!bg-white [&_.tiptap-content]:dark:!bg-stone-950 [&_.ProseMirror]:!bg-white [&_.ProseMirror]:dark:!bg-stone-950 ${mailStyles.replyZone}`}
                      >
                        <TiptapEditor
                          content={inlineReplyHtml}
                          placeholder="Type your reply..."
                          onChange={(html) => {
                            inlineReplyThreadIdRef.current = selectedThreadId;
                            setInlineReplyHtml(html);
                          }}
                        />
                      </div>
                      {inlineReplyAttachments.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {inlineReplyAttachments.map((att, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-light dark:bg-white/10 text-sm"
                            >
                              {att.filename}
                              <button
                                type="button"
                                onClick={() => removeInlineReplyAttachment(idx)}
                                className="ti-btn ti-btn-icon ti-btn-ghost !p-0 !w-6 !h-6"
                                aria-label={`Remove attachment ${att.filename}`}
                              >
                                <i className="ri-close-line text-xs" aria-hidden></i>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* The composer above had no send path at all: its handler was
                          never wired to anything, so a typed reply was discarded on
                          the next thread click. Attaching lives here too, beside the
                          chips it produces, rather than in the footer. */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => void handleSendInlineReply()}
                          disabled={sendingReply || !hasMeaningfulComposeBody(inlineReplyHtml)}
                          className={`ti-btn !mb-0 px-5 py-2.5 rounded-xl text-white font-semibold shadow-lg disabled:opacity-50 ${mailStyles.composeCta}`}
                        >
                          <i
                            className={`${sendingReply ? "ri-loader-4-line animate-spin" : "ri-send-plane-line"} me-1 align-middle`}
                            aria-hidden
                          />
                          {sendingReply ? "Sending…" : "Send reply"}
                        </button>
                        <button
                          type="button"
                          onClick={handleAddInlineReplyAttachment}
                          className="ti-btn ti-btn-light border border-stone-200 dark:border-white/10 !mb-0"
                        >
                          <i className="ri-attachment-2 me-1 align-middle" aria-hidden />
                          Attach
                        </button>
                        <input
                          ref={inlineReplyFileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleInlineReplyFileChange}
                        />
                      </div>
                    </div>
                    ) : null}
                  </div>
                  <div className={`mail-info-footer border-t dark:border-defaultborder/10 !p-4 flex flex-wrap gap-2 items-center justify-between bg-light/30 dark:bg-white/5 ${mailStyles.readingPaneFooter}`}>
                    <div
                      className={`flex gap-1 flex-wrap items-center ${mailStyles.readingToolbar}`}
                      role="group"
                      aria-label="Reading utilities"
                    >
                      <button
                        type="button"
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Print"
                        aria-label="Print"
                        onClick={handlePrint}
                      >
                        <i className="ri-printer-line" aria-hidden></i>
                      </button>
                      {selectedThread?.isUnread ? (
                        <button
                          type="button"
                          onClick={handleMarkRead}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title="Mark as read"
                          aria-label="Mark thread as read"
                        >
                          <i className="ri-mail-open-line" aria-hidden></i>
                        </button>
                      ) : selectedThread ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkUnread(selectedThread)}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title="Mark as unread"
                          aria-label="Mark thread as unread"
                        >
                          <i className="ri-mail-unread-line" aria-hidden></i>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={refetchMessages}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Reload"
                        aria-label="Refresh inbox"
                      >
                        <i className="ri-refresh-line" aria-hidden></i>
                      </button>
                    </div>
                    {canManageEmail ? (
                      <div
                        className={`flex gap-2 flex-wrap relative z-20 pointer-events-auto ${mailStyles.readingToolbar}`}
                        role="group"
                        aria-label="Compose actions"
                      >
                        <button
                          type="button"
                          onClick={() => void openComposeForReadingPane("forward")}
                          className="ti-btn ti-btn-primary-full"
                        >
                          <i className="ri-share-forward-line me-1 align-middle"></i>
                          Forward
                        </button>
                        <button
                          type="button"
                          onClick={() => void openComposeForReadingPane("replyAll")}
                          className="ti-btn ti-btn-light border border-stone-200 dark:border-white/10"
                        >
                          <i className="ri-reply-all-line me-1 align-middle"></i>
                          Reply all
                        </button>
                        {/* Replying to the sender is the "Send reply" button under the
                            composer above. The button that used to sit here opened the
                            compose window instead, while labelling itself "Sending..."
                            off a flag it never set - two Reply affordances, neither of
                            which sent what the user had just typed. */}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            <div
              className={`mail-recepients border-l border-stone-200/80 dark:border-white/10 flex flex-col overflow-hidden min-w-[3.25rem] w-[3.25rem] sm:min-w-[3.5rem] sm:w-[3.5rem] ${mailStyles.mailboxRail}`}
            >
              <div
                className={`py-3 px-1.5 border-b border-stone-200/80 dark:border-white/10 flex flex-col items-center gap-3.5 shrink-0 ${mailStyles.mailboxRailTop}`}
              >
                <button
                  type="button"
                  onClick={handleAddQuickRecipient}
                  className={`ti-btn ti-btn-icon ti-btn-light !rounded-full !w-9 !h-9 ${mailStyles.mailboxRailAdd}`}
                  title="Add quick contact"
                >
                  <i className="ri-add-line text-lg"></i>
                </button>
                {navMailboxAccounts.map((acc, idx) => {
                  const active = acc.id === selectedAccountId;
                  const initial =
                    (emailToDisplayName(acc.email || "")[0] || acc.email?.[0] || "?").toUpperCase();
                  return (
                    <div
                      key={acc.id}
                      className={`relative flex justify-center hs-tooltip ti-main-tooltip [--placement:left] ${mailStyles.mailboxSlot}`}
                      style={{ animationDelay: `${Math.min(idx, 8) * 0.055}s` }}
                    >
                      <button
                        type="button"
                        onClick={() => switchToMailbox(acc.id)}
                        className={`${mailStyles.mailboxAvatarBtn} ${active ? mailStyles.mailboxAvatarBtnActive : ""}`}
                        title={acc.provider === "outlook" ? `Outlook — ${acc.email}` : `Gmail — ${acc.email}`}
                        aria-label={`Switch to ${acc.email}`}
                        aria-pressed={active}
                      >
                        <span
                          key={`${acc.id}-${active}`}
                          className={`${mailStyles.mailboxAvatarFace} ${
                            acc.provider === "outlook"
                              ? mailStyles.mailboxAvatarFaceOutlook
                              : mailStyles.mailboxAvatarFaceGmail
                          } ${mailDisplay.className}`}
                        >
                          {initial}
                        </span>
                      </button>
                      <span className={mailStyles.mailboxProviderBadge} aria-hidden>
                        {acc.provider === "outlook" ? (
                          <i className="ri-microsoft-fill text-[11px] text-blue-600 dark:text-blue-400"></i>
                        ) : (
                          <i className="ri-google-fill text-[11px] text-red-500 dark:text-red-400"></i>
                        )}
                      </span>
                      <span
                        className="hs-tooltip-content ti-main-tooltip-content !py-1.5 px-2 !bg-stone-900 !text-xs !font-medium !text-white shadow-lg max-w-[220px] break-all"
                        role="tooltip"
                      >
                        <span className="block text-[0.65rem] uppercase tracking-wider text-stone-400 mb-0.5">
                          {acc.provider === "outlook" ? "Outlook" : "Gmail"}
                        </span>
                        {acc.email}
                      </span>
                    </div>
                  );
                })}
              </div>
              {quickRecipientList.length > 0 && (
                <div className="px-1 py-1.5 border-b border-stone-200/60 dark:border-white/5 text-center">
                  <span className="text-[0.75rem] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-semibold">
                    Quick
                  </span>
                </div>
              )}
              <div className="p-2 flex flex-col gap-3 overflow-y-auto overflow-x-hidden flex-1 min-h-0 max-h-[calc(100vh-14rem)] total-mail-recepients">
                {quickRecipientList.map((r) => (
                  <div
                    key={r.email}
                    className="hs-tooltip ti-main-tooltip [--placement:left] mail-recepeint-person group relative"
                  >
                    <button
                      type="button"
                      onClick={() => canManageEmail && handleQuickCompose(r.email)}
                      className={canManageEmail ? "cursor-pointer block" : "cursor-default block opacity-80"}
                      title={canManageEmail ? r.email : `${r.email} (view only)`}
                      disabled={!canManageEmail}
                    >
                      <span className="avatar avatar-sm online avatar-rounded flex items-center justify-center !bg-primary/20 !text-primary font-semibold hover:!bg-primary/30 transition-colors">
                        {(() => {
                        const m = r.email.match(/^([^<]+)</);
                        const letter = m ? m[1].trim()[0] : r.email[0];
                        return letter?.toUpperCase() || "?";
                      })()}
                      </span>
                    </button>
                    <span className="hs-tooltip-content ti-main-tooltip-content !py-[0.2rem] px-2 !bg-black !text-xs !font-medium !text-white shadow-sm" role="tooltip">
                      {r.email}
                    </span>
                    <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveQuickRecipient(r.email);
                        }}
                        className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white flex items-center justify-center !p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-[10px] ${mailStyles.quickRemoveBtn}`}
                        title="Remove"
                        aria-label={`Remove ${r.email} from quick contacts`}
                      >
                        <i className="ri-close-line" aria-hidden></i>
                      </button>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        )}

        {mailConfirm && (
          <MailConfirmDialog
            title={mailConfirm.title}
            message={mailConfirm.message}
            confirmLabel={mailConfirm.confirmLabel}
            cancelLabel={mailConfirm.cancelLabel}
            destructive={mailConfirm.destructive}
            onConfirm={() => settleMailConfirm(true)}
            onCancel={() => settleMailConfirm(false)}
          />
        )}

        {notice && (
          <div
            className={`${mailStyles.mailNotice} ${
              notice.tone === "error" ? mailStyles.mailNoticeError : mailStyles.mailNoticeSuccess
            }`}
            // role=alert for failures so it is announced immediately; polite status
            // for success so it never interrupts what the user is reading. Neither
            // moves focus - the user stays wherever they were.
            role={notice.tone === "error" ? "alert" : "status"}
            aria-live={notice.tone === "error" ? "assertive" : "polite"}
          >
            <i
              className={`${
                notice.tone === "error" ? "ri-error-warning-line" : "ri-check-line"
              } ${mailStyles.mailNoticeIcon}`}
              aria-hidden
            />
            <div className={mailStyles.mailNoticeBody}>
              {notice.message}
              {notice.action && (
                <div>
                  <button
                    type="button"
                    className={mailStyles.mailNoticeAction}
                    onClick={() => {
                      const run = notice.action?.onClick;
                      setNotice(null);
                      run?.();
                    }}
                  >
                    {notice.action.label}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className={mailStyles.mailNoticeDismiss}
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
            >
              <i className="ri-close-line" aria-hidden />
            </button>
          </div>
        )}

        {showQuickAddModal && (
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-auto p-4 ${mailStyles.modalBackdrop}`}
            onClick={(e) => e.target === e.currentTarget && closeQuickAddModal()}
            role="presentation"
          >
            <FocusLock returnFocus>
            <div
              className={`ti-modal-box bg-white dark:bg-stone-950 w-full max-w-sm overflow-hidden flex flex-col ${mailStyles.modalPanel}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-labelledby="quick-add-modal-title"
            >
              <form onSubmit={handleQuickAddSubmit} className="ti-modal-content flex flex-col">
                <div className="ti-modal-header flex-shrink-0 !p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-stone-50 to-white dark:from-stone-900 dark:to-stone-950">
                  <h6
                    id="quick-add-modal-title"
                    className={`modal-title text-base font-semibold text-stone-900 dark:text-stone-100 ${mailDisplay.className}`}
                  >
                    Add quick contact
                  </h6>
                  <button
                    type="button"
                    onClick={closeQuickAddModal}
                    className="ti-btn ti-btn-icon ti-btn-ghost hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="Close"
                  >
                    <i className="ri-close-line text-lg"></i>
                  </button>
                </div>
                <div className={`ti-modal-body !p-5 ${mailStyles.composeModalBody}`}>
                  <label htmlFor="quick-add-email" className="form-label block mb-1">
                    Email address<sup className="text-danger">*</sup>
                  </label>
                  <input
                    id="quick-add-email"
                    type="email"
                    autoFocus
                    className={`form-control w-full ${mailStyles.quickAddInput} ${quickAddError ? "!border-danger" : ""}`}
                    placeholder="name@example.com"
                    value={quickAddEmail}
                    onChange={(e) => {
                      setQuickAddEmail(e.target.value);
                      if (quickAddError) setQuickAddError(null);
                    }}
                    onKeyDown={(e) => e.key === "Escape" && closeQuickAddModal()}
                    aria-invalid={quickAddError ? true : undefined}
                    aria-describedby={quickAddError ? "quick-add-email-error" : undefined}
                  />
                  {quickAddError ? (
                    <p id="quick-add-email-error" className="text-danger text-[0.75rem] mt-1.5">
                      {quickAddError}
                    </p>
                  ) : (
                    <p className="text-[0.75rem] text-stone-500 dark:text-stone-400 mt-1.5">
                      Saved to your rail for one-tap replies. You can remove it anytime.
                    </p>
                  )}
                </div>
                <div className="ti-modal-footer !p-5 pt-0 flex items-center justify-end gap-2">
                  <button type="button" onClick={closeQuickAddModal} className="ti-btn ti-btn-light !mb-0">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!quickAddEmail.trim()}
                    className={`ti-btn px-5 !mb-0 rounded-xl text-white font-semibold disabled:opacity-50 ${mailStyles.composeCta}`}
                  >
                    Add contact
                  </button>
                </div>
              </form>
            </div>
            </FocusLock>
          </div>
        )}

        {showComposeModal && (
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-auto p-4 ${mailStyles.modalBackdrop}`}
            onClick={(e) => e.target === e.currentTarget && requestCloseCompose()}
            role="presentation"
          >
            {/* Focus stays inside while this is open and returns to whatever
                opened it on close. Before, Tab walked straight out into the mail
                list behind the overlay. The templates list is portalled to body,
                so it is declared as a shard or the lock would bounce focus away
                from it. */}
            <FocusLock returnFocus shards={[composeTemplatesListRef]}>
            <div
              className={`ti-modal-box bg-white dark:bg-stone-950 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${mailStyles.modalPanel}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-labelledby="compose-modal-title"
            >
              <div className="ti-modal-content flex flex-col flex-1 min-h-0">
                <div className="ti-modal-header flex-shrink-0 !p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-stone-50 to-white dark:from-stone-900 dark:to-stone-950">
                  <h6
                    id="compose-modal-title"
                    className={`modal-title text-xl font-semibold text-stone-900 dark:text-stone-100 ${mailDisplay.className}`}
                  >
                    {composeMode === "new"
                      ? "Compose Mail"
                      : composeMode === "reply"
                        ? "Reply"
                        : composeMode === "replyAll"
                          ? "Reply all"
                          : "Forward"}
                  </h6>
                  <button
                    type="button"
                    onClick={requestCloseCompose}
                    className="ti-btn ti-btn-icon ti-btn-ghost hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="Close compose window"
                  >
                    <i className="ri-close-line text-lg"></i>
                  </button>
                </div>
                <div className={`ti-modal-body flex-1 overflow-y-auto px-4 py-4 ${mailStyles.composeModalBody}`}>
                  <div className="grid grid-cols-1 gap-4">
                    {isReplyMode ? (
                      /* The reply and reply-all endpoints accept only accountId, html
                         and attachments - they derive recipients from the original
                         message server-side. These fields used to be editable here and
                         whatever the user typed, a Cc or a Bcc included, was dropped on
                         send with no indication. Show who it is going to instead of
                         pretending it can be changed. Upgrade path: add cc/bcc to
                         replyMessage in email.validation.js, and the backend must ship
                         before this UI does, because validate() rejects unknown keys
                         outright rather than ignoring them. */
                      <div className="rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-white/5 px-3 py-2.5">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[0.8125rem]">
                          <p className="mb-0 min-w-0">
                            <span className="text-stone-500 dark:text-stone-400">To:</span>{" "}
                            <span className="text-stone-800 dark:text-stone-100 break-words">
                              {composeTo || "the original sender"}
                            </span>
                          </p>
                          {composeCc ? (
                            <p className="mb-0 min-w-0">
                              <span className="text-stone-500 dark:text-stone-400">Cc:</span>{" "}
                              <span className="text-stone-800 dark:text-stone-100 break-words">{composeCc}</span>
                            </p>
                          ) : null}
                        </div>
                        <p className="mb-0 mt-1.5 text-[0.7rem] text-stone-500 dark:text-stone-400">
                          Taken from the original message. To choose different recipients, use Forward or start a
                          new message.
                        </p>
                      </div>
                    ) : (
                      <>
                        <EmailRecipientField
                          id="compose-to"
                          label="To"
                          required
                          value={composeTo}
                          onChange={(next) => {
                            setComposeTo(next);
                            setComposeRecipientErrors((prev) => ({ ...prev, to: undefined }));
                          }}
                          placeholder="recipient@example.com"
                          error={composeRecipientErrors.to ?? null}
                          onErrorChange={(message) =>
                            setComposeRecipientErrors((prev) => ({ ...prev, to: message ?? undefined }))
                          }
                          enableDirectory
                          quickContacts={quickRecipientList}
                          showQuickSuggestions
                        />
                        {!showComposeCc || !showComposeBcc ? (
                          <div className="flex flex-wrap gap-3 -mt-1">
                            {!showComposeCc ? (
                              <button
                                type="button"
                                className="text-[0.8125rem] text-primary hover:underline p-0 bg-transparent border-0"
                                onClick={() => setShowComposeCc(true)}
                              >
                                Cc
                              </button>
                            ) : null}
                            {!showComposeBcc ? (
                              <button
                                type="button"
                                className="text-[0.8125rem] text-primary hover:underline p-0 bg-transparent border-0"
                                onClick={() => setShowComposeBcc(true)}
                              >
                                Bcc
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {showComposeCc ? (
                          <EmailRecipientField
                            id="compose-cc"
                            label="Cc"
                            value={composeCc}
                            onChange={(next) => {
                              setComposeCc(next);
                              setComposeRecipientErrors((prev) => ({ ...prev, cc: undefined }));
                            }}
                            placeholder="cc@example.com"
                            error={composeRecipientErrors.cc ?? null}
                            onErrorChange={(message) =>
                              setComposeRecipientErrors((prev) => ({ ...prev, cc: message ?? undefined }))
                            }
                            enableDirectory
                          />
                        ) : null}
                        {showComposeBcc ? (
                          <EmailRecipientField
                            id="compose-bcc"
                            label="Bcc"
                            value={composeBcc}
                            onChange={(next) => {
                              setComposeBcc(next);
                              setComposeRecipientErrors((prev) => ({ ...prev, bcc: undefined }));
                            }}
                            placeholder="bcc@example.com"
                            error={composeRecipientErrors.bcc ?? null}
                            onErrorChange={(message) =>
                              setComposeRecipientErrors((prev) => ({ ...prev, bcc: message ?? undefined }))
                            }
                            enableDirectory
                          />
                        ) : null}
                      </>
                    )}
                    <div>
                      <label className="form-label block mb-1">Subject</label>
                      <input
                        type="text"
                        className="form-control w-full"
                        placeholder="Subject"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label block mb-1">Message</label>
                      <div className={`mail-compose border dark:border-defaultborder/10 rounded-lg overflow-hidden shadow-sm ${mailStyles.composeEditor}`}>
                        <TiptapEditor
                          content={composeHtml}
                          placeholder="Compose your email..."
                          onChange={setComposeHtml}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {composeMode === "new" && canManageEmail ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowComposeAiPanel((value) => !value);
                              setComposeAiError(null);
                            }}
                            className={`ti-btn ti-btn-light !mb-0 text-[0.8125rem] ${mailStyles.composeUtilityBtn}`}
                            title="Generate two AI draft options"
                          >
                            <i className="ri-magic-line me-1" />
                            AI Draft
                          </button>
                        ) : null}
                        {canUseEmailPreferences ? (
                          <div className="relative" ref={composeTemplatesMenuRef}>
                            <button
                              type="button"
                              ref={composeTemplatesBtnRef}
                              aria-haspopup="true"
                              aria-expanded={showComposeTemplatesMenu}
                              onClick={() => {
                                const next = !showComposeTemplatesMenu;
                                const rect = composeTemplatesBtnRef.current?.getBoundingClientRect();
                                setTemplatesMenuPosition(
                                  next && rect
                                    ? { bottom: window.innerHeight - rect.top + 4, left: rect.left }
                                    : null
                                );
                                setShowComposeTemplatesMenu(next);
                              }}
                              className={`ti-btn ti-btn-light !mb-0 text-[0.8125rem] ${mailStyles.composeUtilityBtn}`}
                              title="Insert a saved template"
                            >
                              <i className="ri-layout-line me-1" aria-hidden />
                              Templates
                            </button>
                            {/* Portalled and fixed, like the other two menus on this
                                page. As a plain absolutely-positioned child it was
                                clipped by the modal body's own scroll container, so
                                on a short window the template list was cut off or
                                entirely invisible. */}
                            {showComposeTemplatesMenu && templatesMenuPosition && typeof document !== "undefined" ? (
                              createPortal(
                              <div
                                ref={composeTemplatesListRef}
                                role="menu"
                                aria-label="Insert a saved template"
                                style={{
                                  bottom: templatesMenuPosition.bottom,
                                  left: templatesMenuPosition.left,
                                }}
                                className="fixed z-[10001] min-w-[240px] max-w-[min(100vw-2rem,360px)] max-h-72 overflow-y-auto rounded-md border border-defaultborder bg-bodybg shadow-lg py-1">
                                {agentTemplatesOwn.length === 0 && agentTemplatesShared.length === 0 ? (
                                  <div className="px-3 py-2 text-[0.8125rem] text-[#8c9097]">
                                    No templates yet. Add them under{" "}
                                    <Link href="/settings/email-templates/" className="text-primary underline">
                                      Settings → Email templates
                                    </Link>
                                    .
                                  </div>
                                ) : null}
                                {agentTemplatesOwn.length > 0 ? (
                                  <>
                                    <div className="px-3 py-1 text-[0.65rem] font-semibold text-[#8c9097] uppercase tracking-wide">
                                      My templates
                                    </div>
                                    {agentTemplatesOwn.map((t) => (
                                      <button
                                        key={t.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-[0.8125rem] hover:bg-black/5 dark:hover:bg-white/10"
                                        onClick={() => insertComposeTemplate(t)}
                                      >
                                        {t.title}
                                      </button>
                                    ))}
                                  </>
                                ) : null}
                                {agentTemplatesShared.length > 0 ? (
                                  <>
                                    <div className="px-3 py-1 text-[0.65rem] font-semibold text-[#8c9097] uppercase tracking-wide border-t border-defaultborder mt-1 pt-2">
                                      Shared
                                    </div>
                                    {agentTemplatesShared.map((t) => (
                                      <button
                                        key={t.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-[0.8125rem] hover:bg-black/5 dark:hover:bg-white/10"
                                        onClick={() => insertComposeTemplate(t)}
                                      >
                                        {t.title}
                                        {t.owner?.name ? (
                                          <span className="block text-[0.7rem] text-[#8c9097]">
                                            {t.owner.name}
                                          </span>
                                        ) : null}
                                      </button>
                                    ))}
                                  </>
                                ) : null}
                              </div>,
                              document.body
                              )
                            ) : null}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={handleAddAttachment}
                          disabled={attachmentsBusy}
                          className={`ti-btn ti-btn-icon ti-btn-light ${mailStyles.composeUtilityBtn}`}
                          title={attachmentsBusy ? "Adding attachment..." : "Add attachment"}
                          aria-busy={attachmentsBusy}
                        >
                          <i className={attachmentsBusy ? "ri-loader-4-line animate-spin" : "ri-attachment-2"}></i>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        {composeAttachments.map((att) => (
                          <span key={att.id} className={mailStyles.composeAttachmentChip}>
                            <span className="truncate max-w-[14rem]">{att.filename}</span>
                            <span className={mailStyles.composeAttachmentMeta}>{formatBytes(att.size)}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(att.id)}
                              className="ti-btn ti-btn-icon ti-btn-ghost !p-0 !w-5 !h-5"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                      {composeMode === "new" && showComposeAiPanel ? (
                        <div className={mailStyles.composeAiPanel}>
                          <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
                            <div className="flex-1">
                              <label className="form-label block mb-1">Tone</label>
                              <select
                                className={`form-control w-full ${mailStyles.composeAiSelect}`}
                                value={composeAiTone}
                                onChange={(e) => setComposeAiTone(e.target.value as EmailDraftTone)}
                              >
                                {AI_TONE_OPTIONS.map((tone) => (
                                  <option key={tone.value} value={tone.value}>
                                    {tone.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-full lg:w-[11rem]">
                              <label className="form-label block mb-1">Length</label>
                              <select
                                className={`form-control w-full ${mailStyles.composeAiSelect}`}
                                value={composeAiLength}
                                onChange={(e) => setComposeAiLength(e.target.value as EmailDraftLength)}
                              >
                                {AI_LENGTH_OPTIONS.map((length) => (
                                  <option key={length.value} value={length.value}>
                                    {length.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="form-label block mb-1">What should this email say?</label>
                            <textarea
                              className={`form-control w-full ${mailStyles.composeAiTextarea}`}
                              rows={3}
                              value={composeAiPrompt}
                              onChange={(e) => setComposeAiPrompt(e.target.value)}
                              placeholder="Example: Write a professional follow-up after yesterday's interview and thank them for their time."
                            />
                          </div>
                          <div className="mt-3">
                            <label className="form-label block mb-1">Extra context (optional)</label>
                            <textarea
                              className={`form-control w-full ${mailStyles.composeAiTextarea}`}
                              rows={2}
                              value={composeAiContext}
                              onChange={(e) => setComposeAiContext(e.target.value)}
                              placeholder="Add details, deadlines, bullet points, or a call to action."
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleGenerateComposeDrafts}
                              disabled={composeAiLoading}
                              className={`ti-btn ti-btn-primary !mb-0 ${mailStyles.composeAiAction}`}
                            >
                              <i className={`${composeAiLoading ? "ri-loader-4-line animate-spin" : "ri-sparkling-line"} me-1`} />
                              {composeAiLoading ? "Generating..." : "Generate 2 drafts"}
                            </button>
                            {composeAiOptions.length > 0 ? (
                              <button
                                type="button"
                                onClick={handleGenerateComposeDrafts}
                                disabled={composeAiLoading}
                                className={`ti-btn ti-btn-light !mb-0 ${mailStyles.composeUtilityBtn}`}
                              >
                                Regenerate
                              </button>
                            ) : null}
                            <span className={mailStyles.composeHint}>
                              Keeps the current email look and lets you choose before inserting.
                            </span>
                          </div>
                          {composeAiError ? <p className={mailStyles.composeError}>{composeAiError}</p> : null}
                          {composeAiOptions.length > 0 ? (
                            <div className={mailStyles.composeAiResults}>
                              {composeAiSubject ? (
                                <div className={mailStyles.composeAiSubject}>
                                  Suggested subject:
                                  <span>{composeAiSubject}</span>
                                </div>
                              ) : null}
                              {composeAiOptions.map((option) => {
                                const hasExistingDraft = hasMeaningfulComposeBody(composeHtml);
                                return (
                                  <div key={option.id} className={mailStyles.composeAiCard}>
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <p className={mailStyles.composeAiCardTitle}>{option.label}</p>
                                      <span className={mailStyles.composeAiTonePill}>
                                        {AI_TONE_OPTIONS.find((tone) => tone.value === composeAiTone)?.label}
                                      </span>
                                    </div>
                                    <p className={mailStyles.composeAiPreview}>{option.text}</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => applyComposeDraft(option, "replace")}
                                        className={`ti-btn ti-btn-primary !mb-0 ${mailStyles.composeAiAction}`}
                                      >
                                        {hasExistingDraft ? "Replace body" : "Use draft"}
                                      </button>
                                      {hasExistingDraft ? (
                                        <button
                                          type="button"
                                          onClick={() => applyComposeDraft(option, "append")}
                                          className={`ti-btn ti-btn-light !mb-0 ${mailStyles.composeUtilityBtn}`}
                                        >
                                          Append below
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <p className={mailStyles.composeHint}>
                        Attachments stay in the current compose flow. Keep files under {composeAttachmentLimitLabel}
                        {" "}because email encoding adds overhead.
                      </p>
                      {composeAttachmentError ? <p className={mailStyles.composeError}>{composeAttachmentError}</p> : null}
                    </div>
                  </div>
                </div>
                <div className="ti-modal-footer flex-shrink-0 !p-5 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-3 bg-stone-50/80 dark:bg-stone-900/80">
                  <button
                    type="button"
                    onClick={requestCloseCompose}
                    className="ti-btn px-5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCompose}
                    disabled={sending}
                    className={`ti-btn px-6 py-2.5 rounded-xl text-white font-semibold shadow-lg disabled:opacity-50 ${mailStyles.composeCta}`}
                  >
                    {sending ? "Sending…" : "Send message"}
                  </button>
                </div>
              </div>
            </div>
            </FocusLock>
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default Mailapp;
