"use client";

import { DM_Sans, Newsreader } from "next/font/google";
import Seo from "@/shared/layout-components/seo/seo";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";
import * as emailApi from "@/shared/lib/api/email";
import mailStyles from "./mail-app.module.css";
import type {
  EmailAccount,
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
import { buildReplyAllRecipients } from "@/shared/lib/email-recipient-utils";
import { hasEmailManageAccess, hasEmailReadAccess } from "@/shared/lib/permissions";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import SimpleBar from "simplebar-react";

type ComposeMode = "new" | "reply" | "replyAll" | "forward";
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
  "STARRED",
  "conversationhistory",
  "notes",
];

function getLabelIcon(labelId: string): string {
  return LABEL_ICONS[labelId] || "ri-price-tag-line";
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

/** Clean Tiptap HTML before send: unescape entities, remove empty paragraphs, trim. */
function cleanHtmlForSend(html: string): string {
  if (!html?.trim()) return "<p></p>";
  let cleaned = html;
  // Unescape HTML entities so we send raw HTML, not &lt;p&gt;text&lt;/p&gt;
  cleaned = cleaned
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  cleaned = cleaned
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/\s*$/, "")
    .trim();
  return cleaned || "<p></p>";
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

const Mailapp = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, permissionsLoaded } = useAuth();
  const canUseEmailPreferences = hasEmailReadAccess(permissions ?? []);
  const canManageEmail = hasEmailManageAccess(permissions ?? []);
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
    const onDown = (e: MouseEvent) => {
      const el = composeTemplatesMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setShowComposeTemplatesMenu(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showComposeTemplatesMenu]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string>("ALL");
  const [threads, setThreads] = useState<EmailThreadListItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [resultSizeEstimate, setResultSizeEstimate] = useState<number>(0);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<EmailMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState(false);

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

  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("new");
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeHtml, setComposeHtml] = useState("");
  const [inlineReplyHtml, setInlineReplyHtml] = useState("");
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
  const composeMessageRef = useRef<EmailMessage | null>(null);
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
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [quickRecipients, setQuickRecipients] = useState<{ email: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("email-quick-recipients");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const Toggle1 = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 992) {
      setMailNavigationVisible(true);
      setTotalMailsVisible(false);
      setTotalMailsHidden(true);
    }
  }, []);

  const Toggle2 = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 992) {
      setTotalMailsVisible(true);
      setMailNavigationVisible(false);
      setTotalMailsHidden(false);
    }
  }, []);

  const Medium = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 1399) {
      setMailsInformationVisible(true);
      setTotalMailsVisible(false);
      setTotalMailsHidden(true);
    }
  }, []);

  const restoreMobileListLayout = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 1399) {
      setMailsInformationVisible(false);
      setTotalMailsVisible(true);
      setTotalMailsHidden(false);
    }
  }, []);

  const backToThreadList = useCallback(() => {
    setSelectedThreadId(null);
    setThreadMessages([]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("thread");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    restoreMobileListLayout();
  }, [router, pathname, searchParams, restoreMobileListLayout]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth <= 992) {
        setMailNavigationVisible(true);
        setTotalMailsVisible(false);
        setTotalMailsHidden(true);
      } else if (window.innerWidth <= 1399) {
        setMailsInformationVisible(true);
        setTotalMailsVisible(false);
        setTotalMailsHidden(true);
      } else {
        setMailNavigationVisible(false);
        setTotalMailsVisible(true);
        setTotalMailsHidden(false);
      }
    };
    // Initial state is wrong for desktop (total-mails flags start false). Sync only wide viewports;
    // do not call full handleResize() on mount — that would hide the thread list on tablet before a thread is opened.
    if (typeof window !== "undefined" && window.innerWidth > 1399) {
      setMailNavigationVisible(false);
      setTotalMailsVisible(true);
      setTotalMailsHidden(false);
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
    if (error) setOauthError(decodeURIComponent(error));
    if (connected === "gmail" || connected === "outlook") setOauthSuccess(true);
  }, [searchParams]);

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

        const list = await emailApi.getEmailAccounts();
        if (cancelled) return;

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
        if (preferredId && list.some((a) => a.id === preferredId)) {
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
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [oauthSuccess]);

  useEffect(() => {
    const accountId = selectedAccountId;
    if (!accountId) {
      setLabels([]);
      return;
    }
    const id: string = accountId;
    let cancelled = false;
    async function load() {
      try {
        const p =
          accounts.find((a) => a.id === id)?.provider === "outlook" ? "outlook" : "gmail";
        const list = await emailApi.getLabels(id, p);
        if (!cancelled) setLabels(list);
      } catch {
        if (!cancelled) setLabels([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, accounts]);

  // Outlook cannot use Gmail label ids as folder paths — reset when switching to Outlook
  useEffect(() => {
    if (!selectedAccountId || accounts.length === 0) return;
    const acc = accounts.find((a) => a.id === selectedAccountId);
    if (acc?.provider !== "outlook") return;
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
  }, [selectedAccountId, accounts]);

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
    async function load() {
      try {
        const p =
          accounts.find((a) => a.id === id)?.provider === "outlook" ? "outlook" : "gmail";
        const res = await emailApi.getThreads(
          {
            accountId: id,
            labelId: selectedLabelId === "ALL" ? undefined : selectedLabelId,
            pageSize: 20,
            q: searchQuery || undefined,
          },
          p
        );
        if (!cancelled) {
          setThreads(res.threads);
          setNextPageToken(res.nextPageToken);
          setResultSizeEstimate(res.resultSizeEstimate ?? 0);
        }
      } catch {
        if (!cancelled) setThreads([]);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, selectedLabelId, searchQuery, accounts]);

  const loadMoreThreads = useCallback(async () => {
    if (!selectedAccountId || !nextPageToken) return;
    setLoadingMessages(true);
    try {
      const res = await emailApi.getThreads(
        {
          accountId: selectedAccountId,
          labelId: selectedLabelId === "ALL" ? undefined : selectedLabelId,
          pageToken: nextPageToken,
          pageSize: 20,
          q: searchQuery || undefined,
        },
        mailProvider
      );
      setThreads((prev) => [...prev, ...res.threads]);
      setNextPageToken(res.nextPageToken);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedAccountId, selectedLabelId, searchQuery, nextPageToken, mailProvider]);

  useEffect(() => {
    if (!selectedAccountId || !selectedThreadId) {
      setThreadMessages([]);
      return;
    }
    const tid = selectedThreadId;
    let cancelled = false;
    setLoadingDetail(true);
    const p =
      accounts.find((a) => a.id === selectedAccountId)?.provider === "outlook" ? "outlook" : "gmail";
    emailApi
      .getThread(selectedAccountId, tid, p)
      .then((data) => {
        if (!cancelled && selectedThreadId === tid) setThreadMessages(data.messages);
      })
      .catch(() => {
        if (!cancelled) setThreadMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, selectedThreadId, accounts]);

  const handleConnectGmail = useCallback(async () => {
    if (gmailAccountCount >= MAX_GMAIL_ACCOUNTS) {
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
    } catch (err) {
      setOauthError("Failed to get Google auth URL");
    }
  }, [gmailAccountCount, accounts]);

  const handleConnectOutlook = useCallback(async () => {
    if (outlookAccountCount >= MAX_OUTLOOK_ACCOUNTS) {
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
    } catch (err) {
      setOauthError("Failed to get Microsoft auth URL");
    }
  }, [outlookAccountCount, accounts]);

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
      } catch {
        // ignore
      }
    },
    [accounts, selectedAccountId]
  );

  const handleSelectThread = useCallback(
    async (thread: EmailThreadListItem) => {
      setSelectedThreadId(thread.id);
      setInlineReplyHtml("");
      setInlineReplyAttachments([]);
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
          if (selectedLabelId === "INBOX") {
            setResultSizeEstimate((prev) => Math.max(0, prev - 1));
          }
        } catch {
          // ignore
        }
      }
    },
    [Medium, selectedAccountId, selectedLabelId, mailProvider, router, pathname, searchParams]
  );

  useEffect(() => {
    const tid = searchParams.get("thread");
    if (!tid || threads.length === 0) return;
    if (!threads.some((t) => t.id === tid)) return;
    if (selectedThreadId === tid) return;
    setSelectedThreadId(tid);
    Medium();
  }, [threads, searchParams, selectedThreadId, Medium]);

  const lastMessageInThread = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;

  const handleSendInlineReply = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    let targetMsg: EmailMessage | null = lastMessageInThread;
    const thread = threads.find((t) => t.id === selectedThreadId);
    if (!targetMsg && thread?.lastMessageId) {
      try {
        targetMsg = await emailApi.getMessage(selectedAccountId, thread.lastMessageId, mailProvider);
      } catch {
        alert("Could not load the message to reply to.");
        return;
      }
    }
    if (!targetMsg) {
      alert("No message loaded yet. Try the toolbar Reply or refresh.");
      return;
    }
    setSending(true);
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
      setInlineReplyHtml("");
      setInlineReplyAttachments([]);
      if (selectedThreadId) {
        const data = await emailApi.getThread(selectedAccountId, selectedThreadId, mailProvider);
        setThreadMessages(data.messages);
      }
    } catch {
      alert("Failed to send reply.");
    } finally {
      setSending(false);
    }
  }, [
    selectedAccountId,
    lastMessageInThread,
    inlineReplyHtml,
    inlineReplyAttachments,
    selectedThreadId,
    threads,
    mailProvider,
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

  const openCompose = useCallback(
    (mode: ComposeMode, msg?: EmailMessage) => {
      console.log("[Email] openCompose:", { mode, msgId: msg?.id });
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
        const quoteReply = `\n\n<div class="mail-quoted"><p>On ${msg.date || ""} ${msg.from} wrote:</p><blockquote>${msg.htmlBody || msg.textBody || ""}</blockquote></div>`;
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
          setComposeSubject(subject.startsWith("Re:") ? subject : `Re: ${subject}`);
          setComposeHtml(quoteReply);
        } else {
          setComposeTo("");
          setComposeSubject(subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`);
          const quoted = `\n\n<div class="mail-forwarded"><p>---------- Forwarded message ---------</p><p>From: ${msg.from}<br/>To: ${msg.to}${msg.cc ? `<br/>Cc: ${msg.cc}` : ""}<br/>Date: ${msg.date || ""}<br/>Subject: ${subject}</p><blockquote>${msg.htmlBody || msg.textBody || ""}</blockquote></div>`;
          setComposeHtml(quoted);
          setComposeCc("");
        }
        setComposeBcc("");
      }
      setComposeAttachments([]);
      setShowComposeModal(true);
    },
    [accounts, selectedAccountId]
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
        } catch (err) {
          console.error("[Email] getMessage for compose:", err);
          alert("Could not load this message. Refresh the page or re-open the thread.");
          return;
        }
      }
      if (!msg) {
        alert("No message is available yet. Wait a moment, or refresh the inbox.");
        return;
      }
      openCompose(mode, msg);
    },
    [
      selectedAccountId,
      selectedThreadId,
      threads,
      lastMessageInThread,
      threadMessages,
      mailProvider,
      openCompose,
    ]
  );

  const closeCompose = useCallback(() => {
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
      const firstRecipient = composeTo
        .split(/[,;]/)
        .map((value) => value.trim())
        .find(Boolean);
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
    (option: EmailDraftOption, mode: "replace" | "append" = "replace") => {
      if (mode === "replace" && hasMeaningfulComposeBody(composeHtml)) {
        const shouldReplace = window.confirm(
          "Replace the current draft body with this AI version? Your existing text will be removed, but your signature will stay."
        );
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
    [composeAiSubject, composeHtml]
  );

  const handleAddInlineReplyAttachment = useCallback(() => {
    inlineReplyFileInputRef.current?.click();
  }, []);

  const handleInlineReplyFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const content = await fileToBase64(file);
          setInlineReplyAttachments((prev) => [
            ...prev,
            { filename: file.name, content, mimeType: file.type || "application/octet-stream" },
          ]);
        } catch {
          // skip
        }
      }
      e.target.value = "";
    },
    []
  );

  const removeInlineReplyAttachment = useCallback((idx: number) => {
    setInlineReplyAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSendCompose = useCallback(async () => {
    if (!selectedAccountId) return;
    setSending(true);
    try {
      if (composeMode === "new" || composeMode === "forward") {
        const to = composeTo.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
        if (!to.length) {
          alert("Please enter at least one recipient.");
          setSending(false);
          return;
        }
        await emailApi.sendMessage(
          {
            accountId: selectedAccountId,
            to,
            cc: composeCc ? composeCc.split(/[,;]/).map((e) => e.trim()).filter(Boolean) : undefined,
            bcc: composeBcc ? composeBcc.split(/[,;]/).map((e) => e.trim()).filter(Boolean) : undefined,
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
      closeCompose();
      setThreads([]);
      if (selectedAccountId) {
        const res = await emailApi.getThreads(
          {
            accountId: selectedAccountId,
            labelId: selectedLabelId === "ALL" ? undefined : selectedLabelId,
            pageSize: 20,
            q: searchQuery || undefined,
          },
          mailProvider
        );
        setThreads(res.threads);
        setNextPageToken(res.nextPageToken);
      }
    } catch (err) {
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }, [
    selectedAccountId,
    composeTo,
    composeCc,
    composeBcc,
    composeSubject,
    composeHtml,
    composeAttachments,
    composeMode,
    selectedLabelId,
    searchQuery,
    closeCompose,
    mailProvider,
  ]);

  const handleTrash = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    try {
      await emailApi.trashThreads(selectedAccountId, [selectedThreadId], mailProvider);
      setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
      setSelectedThreadId(null);
      setThreadMessages([]);
      setSelectedThreadIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedThreadId);
        return next;
      });
      restoreMobileListLayout();
    } catch (err) {
      console.error("[Email] Trash failed:", err);
      alert("Could not delete this thread. Check your connection and try again.");
    }
  }, [selectedAccountId, selectedThreadId, restoreMobileListLayout, mailProvider]);

  const refetchMessages = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoadingMessages(true);
    setThreads([]);
    setNextPageToken(null);
    try {
      const res = await emailApi.getThreads(
        {
          accountId: selectedAccountId,
          labelId: selectedLabelId === "ALL" ? undefined : selectedLabelId,
          pageSize: 20,
          q: searchQuery || undefined,
        },
        mailProvider
      );
      setThreads(res.threads);
      setNextPageToken(res.nextPageToken);
      setResultSizeEstimate(res.resultSizeEstimate ?? 0);
    } catch {
      setThreads([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedAccountId, selectedLabelId, searchQuery, mailProvider]);

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
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  labelIds: isStarred
                    ? (t.labelIds || []).filter((l) => l !== "STARRED")
                    : [...(t.labelIds || []), "STARRED"],
                }
              : t
          )
        );
      } catch (err) {
        console.error("[Email] Star toggle failed:", err);
        alert("Could not update the star. Check your connection and try again.");
      }
    },
    [selectedAccountId, mailProvider]
  );

  const handleArchive = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
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
      setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
      setSelectedThreadId(null);
      setThreadMessages([]);
      setSelectedThreadIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedThreadId);
        return next;
      });
      restoreMobileListLayout();
    } catch (err) {
      console.error("[Email] Archive failed:", err);
      alert("Could not archive this thread. Check your connection and try again.");
    }
  }, [selectedAccountId, selectedThreadId, restoreMobileListLayout, mailProvider]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  const handleCreateLabel = useCallback(
    async (name: string) => {
      if (!selectedAccountId || !name?.trim()) return;
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
        if (selectedThreadId) {
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
      } catch (err) {
        console.error("Failed to create label:", err);
        alert("Failed to create label. Please try again.");
      } finally {
        setCreatingLabel(false);
      }
    },
    [selectedAccountId, selectedThreadId, mailProvider]
  );

  const handleApplyLabel = useCallback(
    async (labelId: string) => {
      if (!selectedAccountId || !selectedThreadId) return;
      const currentIds = selectedThread?.labelIds || [];
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
        alert("Failed to apply label. Please try again.");
      }
    },
    [selectedAccountId, selectedThreadId, selectedThread, mailProvider]
  );

  const handleMarkRead = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    const wasUnread = selectedThread?.isUnread;
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
      if (wasUnread && selectedLabelId === "INBOX") {
        setResultSizeEstimate((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
  }, [selectedAccountId, selectedThreadId, selectedThread?.isUnread, selectedLabelId, mailProvider]);

  const idsToUse = selectedThreadIds.size > 0 ? Array.from(selectedThreadIds) : threads.map((t) => t.id);

  const handleMarkAllRead = useCallback(async () => {
    if (!selectedAccountId || threads.length === 0) return;
    setShowMailMenu(false);
    const unreadCount = idsToUse.filter((id) => threads.find((t) => t.id === id)?.isUnread).length;
    try {
      await emailApi.batchModifyThreads(
        {
          accountId: selectedAccountId,
          threadIds: idsToUse,
          addLabelIds: [],
          removeLabelIds: ["UNREAD"],
        },
        mailProvider
      );
      setThreads((prev) => prev.map((t) => ({ ...t, isUnread: false, labelIds: (t.labelIds || []).filter((l) => l !== "UNREAD") })));
      setSelectedThreadIds(new Set());
      if (unreadCount > 0 && selectedLabelId === "INBOX") {
        setResultSizeEstimate((prev) => Math.max(0, prev - unreadCount));
      }
    } catch {
      // ignore
    }
  }, [selectedAccountId, threads, idsToUse, selectedLabelId, mailProvider]);

  const handleMoveToSpam = useCallback(async () => {
    if (!selectedAccountId || idsToUse.length === 0) return;
    setShowMailMenu(false);
    try {
      await emailApi.batchModifyThreads(
        {
          accountId: selectedAccountId,
          threadIds: idsToUse,
          addLabelIds: ["SPAM"],
          removeLabelIds: ["INBOX"],
        },
        mailProvider
      );
      setThreads((prev) => prev.filter((t) => !idsToUse.includes(t.id)));
      if (selectedThreadId && idsToUse.includes(selectedThreadId)) {
        setSelectedThreadId(null);
        setThreadMessages([]);
      }
      setSelectedThreadIds(new Set());
    } catch {
      // ignore
    }
  }, [selectedAccountId, idsToUse, selectedThreadId, mailProvider]);

  const handleDeleteAll = useCallback(async () => {
    if (!selectedAccountId || idsToUse.length === 0) return;
    setShowMailMenu(false);
    try {
      await emailApi.trashThreads(selectedAccountId, idsToUse, mailProvider);
      setThreads((prev) => prev.filter((t) => !idsToUse.includes(t.id)));
      if (selectedThreadId && idsToUse.includes(selectedThreadId)) {
        setSelectedThreadId(null);
        setThreadMessages([]);
      }
      setSelectedThreadIds(new Set());
    } catch {
      // ignore
    }
  }, [selectedAccountId, idsToUse, selectedThreadId, mailProvider]);

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

  const handlePrint = useCallback(() => {
    if (threadMessages.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the email.");
      return;
    }
    const firstMsg = threadMessages[0];
    const blocks = threadMessages.map(
      (msg) => `
      <div class="msg-block" style="margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid #eee;">
        <div class="meta">
          <p><strong>From:</strong> ${(msg.from || "").replace(/</g, "&lt;")}</p>
          <p><strong>To:</strong> ${(msg.to || "").replace(/</g, "&lt;")}</p>
          <p><strong>Date:</strong> ${(msg.date || "").replace(/</g, "&lt;")}</p>
        </div>
        <div class="body" style="margin-top:0.5rem;">${msg.htmlBody || (msg.textBody ? `<pre style="white-space:pre-wrap;font-family:inherit;">${msg.textBody}</pre>` : "<p>No content</p>")}</div>
      </div>
    `
    );
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${(firstMsg.subject || "Email").replace(/</g, "&lt;")}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
            .subject { font-size: 18px; font-weight: 600; margin-bottom: 1.5rem; }
            .body img { max-width: 100%; }
            @media print { body { margin: 0; padding: 1rem; } }
          </style>
        </head>
        <body>
          <div class="subject">${(firstMsg.subject || "(No subject)").replace(/</g, "&lt;")}</div>
          ${blocks.join("")}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      }
    }, 250);
  }, [threadMessages]);

  const handleAddQuickRecipient = useCallback(() => {
    const email = window.prompt("Enter email address for quick mail:");
    if (!email?.trim()) return;
    const trimmed = email.trim();
    setQuickRecipients((prev) => {
      if (prev.some((r) => r.email.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { email: trimmed }];
    });
  }, []);

  const handleQuickCompose = useCallback(
    (email: string) => {
      setComposeTo(email);
      setComposeCc("");
      setComposeBcc("");
      setComposeSubject("");
      setComposeHtml("");
      setComposeAttachments([]);
      setComposeMode("new");
      composeMessageRef.current = null;
      setShowComposeModal(true);
    },
    []
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
      const params = new URLSearchParams(searchParams.toString());
      params.delete("thread");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [selectedAccountId, router, pathname, searchParams]
  );

  const quickRecipientList = quickRecipients;

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
  }, [searchInput]);

  const currentProvider = accounts.find((a) => a.id === selectedAccountId)?.provider ?? "gmail";

  const filteredLabels = labels.filter((l) => {
    if (currentProvider === "outlook") {
      // For Outlook show all folders; INBOX is shown via hardcoded nav item
      return l.id !== "INBOX";
    }
    const isSystem = ["INBOX", "SENT", "DRAFT", "TRASH", "SPAM", "STARRED", "IMPORTANT"].includes(l.id);
    const isArchive = l.id === "CATEGORY_PERSONAL";
    const isUser = l.type === "user";
    const showInSidebar = l.labelListVisibility !== "labelHide" || isSystem || isArchive;
    return showInSidebar && (isSystem || isArchive || isUser);
  });

  const mailLabelsOrdered = [...filteredLabels].sort((a, b) => {
    const ai = MAILS_ORDER.indexOf(a.id);
    const bi = MAILS_ORDER.indexOf(b.id);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    if (a.type === "user" && b.type === "user") return (a.name || "").localeCompare(b.name || "");
    return (a.type === "user" ? 1 : 0) - (b.type === "user" ? 1 : 0);
  });

  const mailLabelsForNav = mailLabelsOrdered.filter((l) => {
    if (currentProvider === "outlook") {
      // All Outlook folders shown in nav (INBOX excluded via filteredLabels)
      return true;
    }
    return !["CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS"].includes(l.id || "");
  });

  // For Outlook, user folders are already included in mailLabelsForNav; no separate "Labels" section
  const userLabelsForNav = currentProvider === "outlook"
    ? []
    : filteredLabels.filter((l) => l.type === "user");

  return (
    <Fragment>
      <Seo title="Mail App" />
      <div className={`container-fluid mt-5 sm:mt-6 ${mailBody.className} ${mailStyles.mailRoot}`}>
        {!loading && accounts.length === 0 ? (
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
                    Your correspondence, one place
                  </h2>
                  <p
                    className={`${mailBody.className} text-stone-600 dark:text-stone-400 text-sm leading-relaxed mb-8 max-w-md mx-auto lg:mx-0`}
                  >
                    Link Gmail or Outlook to read threads, compose, and reply—without leaving Dharwin.
                  </p>
                  {oauthError && (
                    <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm text-left border border-red-100 dark:border-red-900/50">
                      {oauthError}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                    <button
                      type="button"
                      onClick={handleConnectGmail}
                      className={`ti-btn px-6 py-3 flex items-center justify-center gap-2 ${mailStyles.connectBtnGmail}`}
                    >
                      <i className="ri-google-fill text-lg"></i>
                      Connect Gmail
                    </button>
                    {canAddOutlookMailbox && (
                      <button
                        type="button"
                        onClick={handleConnectOutlook}
                        className={`ti-btn px-6 py-3 flex items-center justify-center gap-2 ${mailStyles.connectBtnOutlook}`}
                      >
                        <i className="ri-microsoft-fill text-lg"></i>
                        Connect Outlook
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
          <div className={`main-mail-container !p-2 gap-x-2 flex min-h-0 ${mailStyles.shell} ${mailStyles.fadeIn}`}>
            <div
              className={`mail-navigation ${isMailNavigationVisible ? "!block" : ""} border dark:border-defaultborder/10`}
            >
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
                      <button
                        type="button"
                        onClick={() => selectedAccountId && handleDisconnect(selectedAccountId)}
                        className="text-white/60 hover:text-white text-[0.65rem] mt-1.5 underline underline-offset-2"
                      >
                        Sign out mailbox
                      </button>
                    </div>
                  </div>
                  <div>
                    <PerfectScrollbar>
                      <ul className="list-none mail-main-nav !text-[0.813rem]">
                        {accounts.length > 1 && (
                          <>
                            <li className="!px-4 !pt-3 !pb-1">
                              <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                                MAILBOXES
                              </span>
                            </li>
                            {accounts.map((acc) => {
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
                          className={`mail-type cursor-pointer ${mailStyles.navItem} ${selectedLabelId === "ALL" ? mailStyles.navItemActive : ""}`}
                          onClick={() => {
                            setSelectedLabelId("ALL");
                            setSearchQuery("");
                            Toggle2();
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                              <i className="ri-mail-line align-middle text-[.875rem] me-2"></i>
                              <span className="whitespace-nowrap">All Mails</span>
                            </div>
                            {selectedLabelId === "ALL" && resultSizeEstimate > 0 && (
                              <span className="badge !rounded-full !bg-success/20 !text-success !text-[.65rem] !px-1.5 !py-0">
                                {resultSizeEstimate > 999 ? `${(resultSizeEstimate / 1000).toFixed(1)}k` : resultSizeEstimate}
                              </span>
                            )}
                          </div>
                        </li>
                        <li
                          className={`mail-type cursor-pointer ${mailStyles.navItem} ${selectedLabelId === "INBOX" ? mailStyles.navItemActive : ""}`}
                          onClick={() => {
                            setSelectedLabelId("INBOX");
                            setSearchQuery("");
                            Toggle2();
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                              <i className="ri-inbox-line align-middle text-[.875rem] me-2"></i>
                              <span className="whitespace-nowrap">Inbox</span>
                            </div>
                            {selectedLabelId === "INBOX" && resultSizeEstimate > 0 && (
                              <span className="badge !rounded-full !bg-success/20 !text-success !text-[.65rem] !px-1.5 !py-0">
                                {resultSizeEstimate > 999 ? `${(resultSizeEstimate / 1000).toFixed(1)}k` : resultSizeEstimate}
                              </span>
                            )}
                          </div>
                        </li>
                        {mailLabelsForNav.map((label) => (
                            <li
                              key={label.id}
                              className={`mail-type cursor-pointer ${mailStyles.navItem} ${selectedLabelId === label.id ? mailStyles.navItemActive : ""}`}
                              onClick={() => {
                                setSelectedLabelId(label.id);
                                Toggle2();
                              }}
                            >
                              <div className="flex items-center">
                                <i
                                  className={`${getLabelIcon(label.id)} align-middle text-[.875rem] me-2`}
                                ></i>
                                <span className="flex-grow whitespace-nowrap">
                                  {label.id === "CATEGORY_PERSONAL" ? "Archive" : label.id === "conversationhistory" ? "Conversation History" : label.name}
                                </span>
                              </div>
                            </li>
                          ))}
                        <li className="!px-4 !pt-4 !pb-1">
                          <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                            SETTINGS
                          </span>
                        </li>
                        <li>
                          {(() => {
                            const provider = accounts.find((a) => a.id === selectedAccountId)?.provider;
                            if (provider === "outlook") {
                              return (
                                <a
                                  href="https://outlook.live.com/mail/options/general"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block !px-4 !py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                  <div className="flex items-center">
                                    <i className="ri-settings-3-line align-middle text-[.875rem] me-2"></i>
                                    <span className="whitespace-nowrap">Outlook Settings</span>
                                  </div>
                                </a>
                              );
                            }
                            return (
                              <a
                                href="https://mail.google.com/mail/#settings"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block !px-4 !py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                <div className="flex items-center">
                                  <i className="ri-settings-3-line align-middle text-[.875rem] me-2"></i>
                                  <span className="whitespace-nowrap">Gmail Settings</span>
                                </div>
                              </a>
                            );
                          })()}
                        </li>
                        {(canAddMoreGmail ||
                          canAddOutlookMailbox ||
                          hasGmailAccount ||
                          hasOutlookAccount) && (
                          <li className="!px-4 !pt-4 !pb-1">
                            <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                              ADD ACCOUNT
                            </span>
                          </li>
                        )}
                        {canAddMoreGmail && (
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
                        {!canAddMoreGmail && accounts.some((a) => a.provider === "gmail") && (
                          <li className="!px-4 !py-2 text-[#8c9097] dark:text-white/45 text-[0.75rem]">
                            Maximum {MAX_GMAIL_ACCOUNTS} Gmail accounts (disconnect one to add another)
                          </li>
                        )}
                        {canAddOutlookMailbox && (
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
                        {!canAddOutlookMailbox && accounts.some((a) => a.provider === "outlook") && (
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
                            <li
                              className="cursor-pointer !px-4 !py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                              onClick={() => {
                                const name = window.prompt("New label name:");
                                if (name?.trim()) handleCreateLabel(name);
                              }}
                            >
                              <i className="ri-add-line align-middle text-[.875rem] text-primary"></i>
                              <span className="text-[0.75rem] text-primary">Create label</span>
                            </li>
                            {userLabelsForNav.map((label) => (
                              <li
                                key={label.id}
                                className={`cursor-pointer ${mailStyles.navItem} ${selectedLabelId === label.id ? mailStyles.navItemActive : ""}`}
                                onClick={() => {
                                  setSelectedLabelId(label.id);
                                  Toggle2();
                                }}
                              >
                                <div className="flex items-center">
                                  <i className="ri-price-tag-line align-middle text-[.875rem] me-2 text-secondary"></i>
                                  <span className="whitespace-nowrap">{label.name}</span>
                                </div>
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
              className={`total-mails ${mailStyles.threadListPane} ${isTotalMailsVisible ? "!block" : ""} ${isTotalMailsHidden ? "!hidden" : ""} border dark:border-defaultborder/10`}
            >
              <div className="!p-4 flex items-center gap-2 border-b dark:border-defaultborder/10">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="checkAllMails"
                  aria-label="Select all"
                  checked={threads.length > 0 && selectedThreadIds.size === threads.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <div className="flex-grow min-w-0">
                  <h6
                    className={`${mailDisplay.className} font-semibold mb-0 text-lg text-stone-800 dark:text-stone-100 truncate`}
                  >
                    {selectedLabelId === "ALL"
                      ? "All mail"
                      : selectedLabelId === "INBOX"
                        ? "Inbox"
                        : labels.find((l) => l.id === selectedLabelId)?.name ?? selectedLabelId}
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
                              Mark All Read
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                handleMoveToSpam();
                                setShowMailMenu(false);
                                setMailMenuPosition(null);
                              }}
                              className="ti-dropdown-item !py-2 !px-4 w-full text-left"
                            >
                              Spam
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteAll();
                                setShowMailMenu(false);
                                setMailMenuPosition(null);
                              }}
                              className="ti-dropdown-item !py-2 !px-4 w-full text-left"
                            >
                              Delete All
                            </button>
                          </li>
                        </ul>
                      </>,
                      document.body
                    )}
                </div>
                <button
                  onClick={Toggle1}
                  aria-label="Close"
                  type="button"
                  className="ti-btn ti-btn-icon ti-btn-light lg:hidden total-mails-close !mb-0"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
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
              </div>
              <SimpleBar className={mailStyles.threadListScroll}>
                <div className={`mail-messages ${mailStyles.threadListMessages}`}>
                  <ul className="list-none mb-0 mail-messages-container text-defaulttextcolor text-defaultsize w-full">
                    {loadingMessages ? (
                      <li className="!p-6 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-16 ${mailStyles.skeleton}`} />
                        ))}
                      </li>
                    ) : threads.length === 0 ? (
                      <li className="!p-10 text-center text-stone-500 dark:text-stone-400 text-sm">
                        <i className="ri-inbox-unarchive-line text-3xl mb-2 block opacity-40"></i>
                        Nothing here yet
                      </li>
                    ) : (
                      threads.map((thread) => (
                        <li
                          key={thread.id}
                          className={`cursor-pointer ${mailStyles.threadRow} ${selectedThreadId === thread.id ? mailStyles.threadRowActive : ""} ${thread.isUnread ? mailStyles.threadUnread : ""}`}
                          onClick={() => handleSelectThread(thread)}
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
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(thread, e)}
                              className="ti-btn ti-btn-icon ti-btn-ghost !p-1 ms-1 self-center opacity-50 hover:opacity-100"
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
                          disabled={loadingMessages}
                          className="ti-btn ti-btn-sm ti-btn-light whitespace-nowrap shrink-0 min-w-[5.5rem]"
                        >
                          {loadingMessages ? "Loading..." : "Load more"}
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </SimpleBar>
            </div>

            <div
              className={`mails-information ${isMailsInformationVisible ? "!block" : ""} border dark:border-defaultborder/10 text-defaulttextcolor text-defaultsize ${mailStyles.readingPane}`}
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
              ) : (
                <>
                  <div
                    className={`mail-info-header relative z-20 flex flex-wrap gap-2 items-center !p-5 border-b border-stone-200/80 dark:border-white/10 ${mailStyles.readingHeader} ${mailStyles.readingPaneHeader}`}
                  >
                    <div className="me-2">
                      <span className="avatar avatar-md online avatar-rounded flex items-center justify-center !bg-amber-100 !text-amber-900 dark:!bg-amber-900/40 dark:!text-amber-200 ring-2 ring-amber-200/50 dark:ring-amber-700/40">
                        {selectedThread?.from?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h6 className="mb-0 font-semibold text-[1.05rem] text-stone-900 dark:text-stone-100 truncate">
                        {selectedThread?.from}
                      </h6>
                      <span className="text-stone-500 dark:text-stone-400 text-[0.75rem] block truncate">
                        {selectedThread?.to}
                      </span>
                    </div>
                    <span
                      className={`text-[0.75rem] text-stone-500 dark:text-stone-400 shrink-0 ${mailStyles.threadListDate}`}
                    >
                      <time dateTime={selectedThread?.date || undefined}>
                        {formatMailListDate(selectedThread?.date)}
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
                          onClick={backToThreadList}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title="Back to list"
                          aria-label="Back to inbox list"
                        >
                          <i className="ri-arrow-left-line" aria-hidden></i>
                        </button>
                      </div>
                      <span className={mailStyles.toolbarDivider} aria-hidden />
                      <div className={mailStyles.mailToolbarGroup}>
                        <button
                          type="button"
                          onClick={(e) => selectedThread && handleToggleStar(selectedThread, e)}
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
                          title="Delete"
                          aria-label="Move thread to trash"
                        >
                          <i className="ri-delete-bin-line" aria-hidden></i>
                        </button>
                      </div>
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
                          {selectedThread?.subject || "(No subject)"}
                        </p>
                        {selectedThread && selectedThread.messageCount > 1 ? (
                          <span className={mailStyles.threadCountBadge}>
                            {selectedThread.messageCount} messages
                          </span>
                        ) : null}
                      </div>
                    </div>
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
                            className="main-mail-content prose dark:prose-invert max-w-none mail-html-body text-sm text-stone-800 dark:text-stone-100"
                            dangerouslySetInnerHTML={{
                              __html:
                                (msg.htmlBody && msg.htmlBody.trim()) ||
                                (msg.textBody
                                  ? `<pre class="whitespace-pre-wrap">${msg.textBody}</pre>`
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
                          onChange={setInlineReplyHtml}
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
                                className="ti-btn ti-btn-icon ti-btn-ghost !p-0 !w-5 !h-5"
                              >
                                <i className="ri-close-line text-xs"></i>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
                      <button
                        type="button"
                        onClick={handleAddInlineReplyAttachment}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Add attachment"
                        aria-label="Add attachment to reply"
                      >
                        <i className="ri-attachment-2" aria-hidden></i>
                      </button>
                      <input
                        ref={inlineReplyFileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleInlineReplyFileChange}
                      />
                      {selectedThread?.isUnread && (
                        <button
                          type="button"
                          onClick={handleMarkRead}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title="Mark as read"
                          aria-label="Mark thread as read"
                        >
                          <i className="ri-mail-open-line" aria-hidden></i>
                        </button>
                      )}
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
                        disabled={sending}
                        className="ti-btn ti-btn-light border border-stone-200 dark:border-white/10"
                      >
                        <i className="ri-reply-all-line me-1 align-middle"></i>
                        Reply all
                      </button>
                      <button
                        type="button"
                        onClick={() => void openComposeForReadingPane("reply")}
                        disabled={sending}
                        className="ti-btn ti-btn-danger-full"
                      >
                        <i className="ri-reply-line me-1 align-middle"></i>
                        {sending ? "Sending..." : "Reply"}
                      </button>
                    </div>
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
                {accounts.map((acc, idx) => {
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
                  <span className="text-[0.55rem] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-semibold">
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
                      onClick={() => handleQuickCompose(r.email)}
                      className="cursor-pointer block"
                      title={r.email}
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
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white flex items-center justify-center !p-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                        title="Remove"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showComposeModal && (
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-auto p-4 ${mailStyles.modalBackdrop}`}
            onClick={(e) => e.target === e.currentTarget && closeCompose()}
          >
            <div
              className={`ti-modal-box bg-white dark:bg-stone-950 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${mailStyles.modalPanel}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ti-modal-content flex flex-col flex-1 min-h-0">
                <div className="ti-modal-header flex-shrink-0 !p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-stone-50 to-white dark:from-stone-900 dark:to-stone-950">
                  <h6
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
                    onClick={closeCompose}
                    className="ti-btn ti-btn-icon ti-btn-ghost hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="Close"
                  >
                    <i className="ri-close-line text-lg"></i>
                  </button>
                </div>
                <div className="ti-modal-body flex-1 overflow-y-auto px-4 py-4 bg-white dark:bg-bodydark">
                  <div className="grid grid-cols-1 gap-4">
                    {(composeMode === "new" ||
                      composeMode === "forward" ||
                      composeMode === "reply" ||
                      composeMode === "replyAll") && (
                      <>
                        {composeMode === "replyAll" && mailProvider === "outlook" && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 -mt-1 mb-1">
                            Recipients are taken from the original message when you send (Outlook). To/Cc below are
                            for reference.
                          </p>
                        )}
                        <div>
                          <label className="form-label block mb-1">
                            To<sup className="text-danger">*</sup>
                          </label>
                          <input
                            type="text"
                            className="form-control w-full"
                            placeholder="recipient@example.com"
                            value={composeTo}
                            onChange={(e) => setComposeTo(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label block mb-1">Cc</label>
                            <input
                              type="text"
                              className="form-control w-full"
                              placeholder="cc@example.com"
                              value={composeCc}
                              onChange={(e) => setComposeCc(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label block mb-1">Bcc</label>
                            <input
                              type="text"
                              className="form-control w-full"
                              placeholder="bcc@example.com"
                              value={composeBcc}
                              onChange={(e) => setComposeBcc(e.target.value)}
                            />
                          </div>
                        </div>
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
                      <div className="mail-compose border dark:border-defaultborder/10 rounded-lg overflow-hidden bg-white dark:bg-bodydark shadow-sm [&_.tiptap-toolbar]:!bg-white [&_.tiptap-toolbar]:dark:!bg-bodydark [&_.tiptap-content]:!bg-white [&_.tiptap-content]:dark:!bg-bodydark [&_.ProseMirror]:!bg-white [&_.ProseMirror]:dark:!bg-bodydark">
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
                              onClick={() => setShowComposeTemplatesMenu((v) => !v)}
                              className={`ti-btn ti-btn-light !mb-0 text-[0.8125rem] ${mailStyles.composeUtilityBtn}`}
                              title="Insert a saved template"
                            >
                              <i className="ri-layout-line me-1" />
                              Templates
                            </button>
                            {showComposeTemplatesMenu ? (
                              <div className="absolute left-0 bottom-full mb-1 z-[200] min-w-[240px] max-w-[min(100vw-2rem,360px)] max-h-72 overflow-y-auto rounded-md border border-defaultborder bg-bodybg shadow-lg py-1">
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
                              </div>
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
                    onClick={closeCompose}
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
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default Mailapp;
