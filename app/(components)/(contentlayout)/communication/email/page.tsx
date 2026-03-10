"use client";

import Seo from "@/shared/layout-components/seo/seo";
import TiptapEditor from "@/shared/data/forms/form-editors/tiptapeditor";
import * as emailApi from "@/shared/lib/api/email";
import type {
  EmailAccount,
  EmailLabel,
  EmailMessage,
  EmailThreadListItem,
} from "@/shared/lib/api/email";
import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import SimpleBar from "simplebar-react";

type ComposeMode = "new" | "reply" | "forward";

const LABEL_ICONS: Record<string, string> = {
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
};

const MAILS_ORDER = [
  "INBOX",
  "SENT",
  "DRAFT",
  "SPAM",
  "IMPORTANT",
  "TRASH",
  "CATEGORY_PERSONAL",
  "STARRED",
];

function getLabelIcon(labelId: string): string {
  return LABEL_ICONS[labelId] || "ri-price-tag-line";
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

const Mailapp = () => {
  const searchParams = useSearchParams();
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
  const [composeAttachments, setComposeAttachments] = useState<
    { filename: string; content: string; mimeType: string }[]
  >([]);
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

  const Close = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 1399) {
      setMailsInformationVisible(false);
      setTotalMailsVisible(true);
      setTotalMailsHidden(false);
    }
  }, []);

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
    if (connected === "gmail") setOauthSuccess(true);
  }, [searchParams]);

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
        const list = await emailApi.getEmailAccounts();
        if (cancelled) return;
        setAccounts(list);
        if (list.length > 0 && !selectedAccountId) {
          setSelectedAccountId(list[0].id);
        } else if (list.length === 0) {
          setSelectedAccountId(null);
        }
      } catch (err) {
        if (!cancelled) setAccounts([]);
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
        const list = await emailApi.getLabels(id);
        if (!cancelled) setLabels(list);
      } catch {
        if (!cancelled) setLabels([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

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
        const res = await emailApi.getThreads({
          accountId: id,
          labelId: selectedLabelId === "ALL" ? undefined : selectedLabelId,
          pageSize: 20,
          q: searchQuery || undefined,
        });
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
  }, [selectedAccountId, selectedLabelId, searchQuery]);

  const loadMoreThreads = useCallback(async () => {
    if (!selectedAccountId || !nextPageToken) return;
    setLoadingMessages(true);
    try {
      const res = await emailApi.getThreads({
        accountId: selectedAccountId,
        labelId: selectedLabelId === "ALL" ? undefined : selectedLabelId,
        pageToken: nextPageToken,
        pageSize: 20,
        q: searchQuery || undefined,
      });
      setThreads((prev) => [...prev, ...res.threads]);
      setNextPageToken(res.nextPageToken);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedAccountId, selectedLabelId, searchQuery, nextPageToken]);

  useEffect(() => {
    if (!selectedAccountId || !selectedThreadId) {
      setThreadMessages([]);
      return;
    }
    const tid = selectedThreadId;
    let cancelled = false;
    setLoadingDetail(true);
    emailApi
      .getThread(selectedAccountId, tid)
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
  }, [selectedAccountId, selectedThreadId]);

  const handleConnectGmail = useCallback(async () => {
    try {
      const { url } = await emailApi.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      setOauthError("Failed to get Google auth URL");
    }
  }, []);

  const handleDisconnect = useCallback(
    async (accountId: string) => {
      try {
        await emailApi.disconnectAccount(accountId);
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
      if (thread.isUnread && selectedAccountId) {
        try {
          await emailApi.batchModifyThreads({
            accountId: selectedAccountId,
            threadIds: [thread.id],
            addLabelIds: [],
            removeLabelIds: ["UNREAD"],
          });
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
    [Medium, selectedAccountId, selectedLabelId]
  );

  const lastMessageInThread = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;

  const handleSendInlineReply = useCallback(async () => {
    if (!selectedAccountId || !lastMessageInThread) return;
    setSending(true);
    try {
      await emailApi.replyMessage(lastMessageInThread.id, {
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
      });
      setInlineReplyHtml("");
      setInlineReplyAttachments([]);
      if (selectedThreadId) {
        const data = await emailApi.getThread(selectedAccountId, selectedThreadId);
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
  ]);

  const openCompose = useCallback((mode: ComposeMode, msg?: EmailMessage) => {
    composeMessageRef.current = msg ?? null;
    setComposeMode(mode);
    if (mode === "new") {
      setComposeTo("");
      setComposeCc("");
      setComposeBcc("");
      setComposeSubject("");
      setComposeHtml("");
    } else if (msg) {
      if (mode === "reply") {
        setComposeTo(msg.from ?? "");
        setComposeSubject(msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`);
        const quoted = `\n\n<div class="mail-quoted"><p>On ${msg.date || ""} ${msg.from} wrote:</p><blockquote>${msg.htmlBody || msg.textBody || ""}</blockquote></div>`;
        setComposeHtml(quoted);
      } else {
        setComposeTo("");
        setComposeSubject(msg.subject.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`);
        const quoted = `\n\n<div class="mail-forwarded"><p>---------- Forwarded message ---------</p><p>From: ${msg.from}<br/>To: ${msg.to}<br/>Date: ${msg.date || ""}<br/>Subject: ${msg.subject}</p><blockquote>${msg.htmlBody || msg.textBody || ""}</blockquote></div>`;
        setComposeHtml(quoted);
      }
      setComposeCc("");
      setComposeBcc("");
    }
    setComposeAttachments([]);
    setShowComposeModal(true);
  }, []);

  const closeCompose = useCallback(() => {
    setShowComposeModal(false);
    composeMessageRef.current = null;
  }, []);

  const handleAddAttachment = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const content = await fileToBase64(file);
          setComposeAttachments((prev) => [
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

  const removeAttachment = useCallback((idx: number) => {
    setComposeAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

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
      const to = composeTo.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
      if (!to.length) {
        alert("Please enter at least one recipient.");
        setSending(false);
        return;
      }
      if (composeMode === "new" || composeMode === "forward") {
        await emailApi.sendMessage({
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
        });
      } else {
        const msg = composeMessageRef.current;
        if (!msg) return;
        await emailApi.replyMessage(msg.id, {
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
        });
      }
      closeCompose();
      setThreads([]);
      if (selectedAccountId) {
        const res = await emailApi.getThreads({
          accountId: selectedAccountId,
          labelId: selectedLabelId === "ALL" ? undefined : selectedLabelId,
          pageSize: 20,
          q: searchQuery || undefined,
        });
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
  ]);

  const handleTrash = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    try {
      await emailApi.trashThreads(selectedAccountId, [selectedThreadId]);
      setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
      setSelectedThreadId(null);
      setThreadMessages([]);
      setSelectedThreadIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedThreadId);
        return next;
      });
      Close();
    } catch {
      // ignore
    }
  }, [selectedAccountId, selectedThreadId, Close]);

  const refetchMessages = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoadingMessages(true);
    setThreads([]);
    setNextPageToken(null);
    try {
      const res = await emailApi.getThreads({
        accountId: selectedAccountId,
        labelId: selectedLabelId === "ALL" ? undefined : selectedLabelId,
        pageSize: 20,
        q: searchQuery || undefined,
      });
      setThreads(res.threads);
      setNextPageToken(res.nextPageToken);
      setResultSizeEstimate(res.resultSizeEstimate ?? 0);
    } catch {
      setThreads([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedAccountId, selectedLabelId, searchQuery]);

  const handleToggleStar = useCallback(
    async (thread: EmailThreadListItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!selectedAccountId) return;
      const isStarred = thread.labelIds?.includes("STARRED");
      try {
        await emailApi.batchModifyThreads({
          accountId: selectedAccountId,
          threadIds: [thread.id],
          addLabelIds: isStarred ? [] : ["STARRED"],
          removeLabelIds: isStarred ? ["STARRED"] : [],
        });
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
      } catch {
        // ignore
      }
    },
    [selectedAccountId]
  );

  const handleArchive = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    try {
      await emailApi.batchModifyThreads({
        accountId: selectedAccountId,
        threadIds: [selectedThreadId],
        addLabelIds: [],
        removeLabelIds: ["INBOX"],
      });
      setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
      setSelectedThreadId(null);
      setThreadMessages([]);
      setSelectedThreadIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedThreadId);
        return next;
      });
      Close();
    } catch {
      // ignore
    }
  }, [selectedAccountId, selectedThreadId, Close]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  const handleCreateLabel = useCallback(
    async (name: string) => {
      if (!selectedAccountId || !name?.trim()) return;
      setCreatingLabel(true);
      try {
        const created = await emailApi.createLabel(selectedAccountId, { name: name.trim() });
        setLabels((prev) => [...prev, { ...created, type: "user" }]);
        setNewLabelName("");
        setCreateLabelExpanded(false);
        if (selectedThreadId) {
          await emailApi.batchModifyThreads({
            accountId: selectedAccountId,
            threadIds: [selectedThreadId],
            addLabelIds: [created.id],
            removeLabelIds: [],
          });
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
    [selectedAccountId, selectedThreadId]
  );

  const handleApplyLabel = useCallback(
    async (labelId: string) => {
      if (!selectedAccountId || !selectedThreadId) return;
      const currentIds = selectedThread?.labelIds || [];
      const hasLabel = currentIds.includes(labelId);
      try {
        await emailApi.batchModifyThreads({
          accountId: selectedAccountId,
          threadIds: [selectedThreadId],
          addLabelIds: hasLabel ? [] : [labelId],
          removeLabelIds: hasLabel ? [labelId] : [],
        });
        const nextIds = hasLabel ? currentIds.filter((l) => l !== labelId) : [...currentIds, labelId];
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThreadId ? { ...t, labelIds: nextIds } : t))
        );
      } catch (err) {
        console.error("Failed to apply label:", err);
        alert("Failed to apply label. Please try again.");
      }
    },
    [selectedAccountId, selectedThreadId, selectedThread]
  );

  const handleMarkRead = useCallback(async () => {
    if (!selectedAccountId || !selectedThreadId) return;
    const wasUnread = selectedThread?.isUnread;
    try {
      await emailApi.batchModifyThreads({
        accountId: selectedAccountId,
        threadIds: [selectedThreadId],
        addLabelIds: [],
        removeLabelIds: ["UNREAD"],
      });
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
  }, [selectedAccountId, selectedThreadId, selectedThread?.isUnread, selectedLabelId]);

  const idsToUse = selectedThreadIds.size > 0 ? Array.from(selectedThreadIds) : threads.map((t) => t.id);

  const handleMarkAllRead = useCallback(async () => {
    if (!selectedAccountId || threads.length === 0) return;
    setShowMailMenu(false);
    const unreadCount = idsToUse.filter((id) => threads.find((t) => t.id === id)?.isUnread).length;
    try {
      await emailApi.batchModifyThreads({
        accountId: selectedAccountId,
        threadIds: idsToUse,
        addLabelIds: [],
        removeLabelIds: ["UNREAD"],
      });
      setThreads((prev) => prev.map((t) => ({ ...t, isUnread: false, labelIds: (t.labelIds || []).filter((l) => l !== "UNREAD") })));
      setSelectedThreadIds(new Set());
      if (unreadCount > 0 && selectedLabelId === "INBOX") {
        setResultSizeEstimate((prev) => Math.max(0, prev - unreadCount));
      }
    } catch {
      // ignore
    }
  }, [selectedAccountId, threads, idsToUse, selectedLabelId]);

  const handleMoveToSpam = useCallback(async () => {
    if (!selectedAccountId || idsToUse.length === 0) return;
    setShowMailMenu(false);
    try {
      await emailApi.batchModifyThreads({
        accountId: selectedAccountId,
        threadIds: idsToUse,
        addLabelIds: ["SPAM"],
        removeLabelIds: ["INBOX"],
      });
      setThreads((prev) => prev.filter((t) => !idsToUse.includes(t.id)));
      if (selectedThreadId && idsToUse.includes(selectedThreadId)) {
        setSelectedThreadId(null);
        setThreadMessages([]);
      }
      setSelectedThreadIds(new Set());
    } catch {
      // ignore
    }
  }, [selectedAccountId, idsToUse, selectedThreadId]);

  const handleDeleteAll = useCallback(async () => {
    if (!selectedAccountId || idsToUse.length === 0) return;
    setShowMailMenu(false);
    try {
      await emailApi.trashThreads(selectedAccountId, idsToUse);
      setThreads((prev) => prev.filter((t) => !idsToUse.includes(t.id)));
      if (selectedThreadId && idsToUse.includes(selectedThreadId)) {
        setSelectedThreadId(null);
        setThreadMessages([]);
      }
      setSelectedThreadIds(new Set());
    } catch {
      // ignore
    }
  }, [selectedAccountId, idsToUse, selectedThreadId]);

  const handleMailMenuRecent = useCallback(() => {
    setShowMailMenu(false);
    refetchMessages();
  }, [refetchMessages]);

  const handleMailMenuUnread = useCallback(() => {
    setShowMailMenu(false);
    setSearchQuery("is:unread");
    setSearchInput("is:unread");
  }, []);

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

  const quickRecipientList = quickRecipients;

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
  }, [searchInput]);

  const filteredLabels = labels.filter((l) => {
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

  const mailLabelsForNav = mailLabelsOrdered.filter(
    (l) =>
      l.id !== "INBOX" &&
      !["CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS"].includes(l.id || "")
  );
  const userLabelsForNav = filteredLabels.filter((l) => l.type === "user");

  return (
    <Fragment>
      <Seo title="Mail App" />
      <div className="container-fluid">
        {!loading && accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4">
              <i className="ri-mail-line text-6xl text-[#8c9097] dark:text-white/50"></i>
            </div>
            <h5 className="font-semibold text-defaulttextcolor dark:text-defaulttextcolor/70 mb-2">
              Connect your Gmail account
            </h5>
            <p className="text-[#8c9097] dark:text-white/50 text-sm mb-6 max-w-md">
              Connect your Gmail to read your inbox, compose, reply, forward, and manage emails from
              Dharwin.
            </p>
            {oauthError && (
              <div className="mb-4 px-4 py-2 rounded bg-danger/10 text-danger text-sm">
                {oauthError}
              </div>
            )}
            <button
              type="button"
              onClick={handleConnectGmail}
              className="ti-btn !bg-success text-white flex items-center justify-center !font-medium"
            >
              <i className="ri-google-fill text-[1rem] align-middle me-2"></i>
              Connect Gmail
            </button>
          </div>
        ) : (
          <div className="main-mail-container !p-2 gap-x-2 flex">
            <div
              className={`mail-navigation ${isMailNavigationVisible ? "!block" : ""} border dark:border-defaultborder/10`}
            >
              <div className="!p-4 border-b dark:border-defaultborder/10">
                <button
                  type="button"
                  onClick={() => openCompose("new")}
                  className="ti-btn !bg-success text-white flex items-center justify-center !font-medium w-full"
                >
                  <i className="ri-add-circle-line text-[1rem] align-middle me-2"></i>
                  Compose Mail
                </button>
              </div>
              {selectedAccountId && accounts.length > 0 && (
                <>
                  <div className="flex items-start !p-4 !bg-primary">
                    <div>
                      <span className="avatar avatar-md online avatar-rounded bg-white/20 flex items-center justify-center">
                        <i className="ri-mail-line text-white text-lg"></i>
                      </span>
                    </div>
                    <div className="ms-2 flex-1 min-w-0">
                      <p className="font-semibold mb-0 text-white truncate">
                        {emailToDisplayName(
                          accounts.find((a) => a.id === selectedAccountId)?.email ?? ""
                        )}
                      </p>
                      <p className="text-white opacity-[0.8] text-[.6875rem] mb-0 truncate">
                        {accounts.find((a) => a.id === selectedAccountId)?.email ?? ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => selectedAccountId && handleDisconnect(selectedAccountId)}
                        className="text-white/80 hover:text-white text-[.6875rem] mt-0.5"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                  <div>
                    <PerfectScrollbar>
                      <ul className="list-none mail-main-nav !text-[0.813rem]">
                        <li className="!px-4 !pt-3 !pb-1">
                          <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] font-semibold">
                            MAILS
                          </span>
                        </li>
                        <li
                          className={`mail-type cursor-pointer !px-4 !py-2 rounded-md ${selectedLabelId === "ALL" ? "!bg-primary/10 !text-primary" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
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
                          className={`mail-type cursor-pointer !px-4 !py-2 rounded-md ${selectedLabelId === "INBOX" ? "!bg-primary/10 !text-primary" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
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
                              className={`mail-type cursor-pointer !px-4 !py-2 rounded-md ${selectedLabelId === label.id ? "!bg-primary/10 !text-primary" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
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
                                  {label.id === "CATEGORY_PERSONAL" ? "Archive" : label.name}
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
                        </li>
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
                              className={`cursor-pointer !px-4 !py-2 rounded-md ${selectedLabelId === label.id ? "!bg-primary/10 !text-primary" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
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
                      </ul>
                    </PerfectScrollbar>
                  </div>
                </>
              )}
            </div>

            <div
              className={`total-mails ${isTotalMailsVisible ? "!block" : ""} ${isTotalMailsHidden ? "!hidden" : ""} border dark:border-defaultborder/10`}
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
                <div className="flex-grow">
                  <h6 className="font-semibold mb-0 text-[1rem] !text-defaulttextcolor dark:!text-defaulttextcolor/70">
                    {selectedLabelId === "ALL"
                      ? "All Mails"
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
              <div className="p-4">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control !bg-light !border-0 !rounded-s-md"
                    placeholder="Search Email"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <button
                    aria-label="Search"
                    type="button"
                    onClick={handleSearch}
                    className="ti-btn ti-btn-light !rounded-s-none !mb-0"
                  >
                    <i className="ri-search-line text-[#8c9097] dark:text-white/50"></i>
                  </button>
                </div>
              </div>
              <SimpleBar>
                <div className="mail-messages">
                  <ul className="list-none mb-0 mail-messages-container text-defaulttextcolor text-defaultsize w-full">
                    {loadingMessages ? (
                      <li className="!p-4 text-center text-[#8c9097] shrink-0">
                        <span className="whitespace-nowrap">Loading...</span>
                      </li>
                    ) : threads.length === 0 ? (
                      <li className="!p-4 text-center text-[#8c9097]">No threads</li>
                    ) : (
                      threads.map((thread) => (
                        <li
                          key={thread.id}
                          className={`!border-x-0 border-b dark:border-defaultborder/10 cursor-pointer hover:bg-light dark:hover:bg-white/5 ${selectedThreadId === thread.id ? "!bg-primary/5" : ""}`}
                          onClick={() => handleSelectThread(thread)}
                        >
                          <div className="flex items-start !p-4">
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
                            <div className="flex-grow min-w-0">
                              <p className="mb-1 text-[0.75rem]">
                                <span className={thread.isUnread ? "font-semibold" : ""}>
                                  {thread.from}
                                </span>
                                <span className="ltr:float-right rtl:float-left text-[#8c9097] dark:text-white/50 font-normal text-[.6875rem]">
                                  {thread.date || ""}
                                </span>
                              </p>
                              <p className="mail-msg mb-0">
                                <span
                                  className={`block mb-0 ${thread.isUnread ? "font-semibold" : ""}`}
                                >
                                  {thread.subject || "(No subject)"}
                                </span>
                                <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50 line-clamp-2">
                                  {thread.snippet || ""}
                                </span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(thread, e)}
                              className="ti-btn ti-btn-icon ti-btn-ghost !p-1 ms-1 self-center opacity-50 hover:opacity-100"
                              title="Star"
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
              className={`mails-information ${isMailsInformationVisible ? "!block" : ""} border dark:border-defaultborder/10 text-defaulttextcolor text-defaultsize`}
            >
              {!selectedThreadId ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#8c9097] dark:text-white/50">
                  <i className="ri-mail-open-line text-4xl mb-2"></i>
                  <p>Select a conversation to view</p>
                </div>
              ) : loadingDetail ? (
                <div className="flex items-center justify-center py-16">Loading...</div>
              ) : (
                <>
                  <div className="mail-info-header flex flex-wrap gap-2 items-center !p-4 border-b dark:border-defaultborder/10">
                    <div className="me-2">
                      <span className="avatar avatar-md online avatar-rounded flex items-center justify-center !bg-primary/20 !text-primary">
                        {selectedThread?.from?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h6 className="mb-0 font-semibold text-[1rem] dark:text-defaulttextcolor/70 truncate">
                        {selectedThread?.from}
                      </h6>
                      <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                        {selectedThread?.to}
                      </span>
                    </div>
                    <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50 shrink-0">
                      {selectedThread?.date}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => selectedThread && handleToggleStar(selectedThread, e)}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Star"
                      >
                        <i
                          className={`${selectedThread?.labelIds?.includes("STARRED") ? "ri-star-fill text-warning" : "ri-star-line"}`}
                        ></i>
                      </button>
                      <div className="relative">
                        <button
                          ref={labelButtonRef}
                          type="button"
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
                          title="Label"
                        >
                          <i className="ri-price-tag-3-line"></i>
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
                      <button
                        type="button"
                        onClick={handleArchive}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Archive"
                      >
                        <i className="ri-inbox-archive-line"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => alert("Snooze is not yet supported.")}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Snooze"
                      >
                        <i className="ri-time-line"></i>
                      </button>
                      <button
                        type="button"
                        onClick={handleTrash}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Delete"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => lastMessageInThread && openCompose("reply", lastMessageInThread)}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Reply"
                      >
                        <i className="ri-reply-line"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => threadMessages[0] && openCompose("forward", threadMessages[0])}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Forward"
                      >
                        <i className="ri-share-forward-line"></i>
                      </button>
                      <button
                        type="button"
                        onClick={Close}
                        className="ti-btn ti-btn-icon ti-btn-light lg:hidden"
                        title="Close"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  </div>
                  <div className="mail-info-body dark:!border-defaultborder/10 p-6 overflow-auto">
                    <div className="sm:flex block items-center justify-between mb-6">
                      <p className="text-[1.25rem] font-semibold mb-0">{selectedThread?.subject}</p>
                    </div>
                    <div className="space-y-6">
                      {threadMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="border-b dark:border-defaultborder/10 pb-6 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <span className="avatar avatar-sm avatar-rounded flex items-center justify-center !bg-primary/20 !text-primary shrink-0">
                              {msg.from?.[0]?.toUpperCase() || "?"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm">{msg.from}</span>
                                <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                  {msg.date}
                                </span>
                              </div>
                              <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50 block truncate">
                                to {msg.to}
                              </span>
                            </div>
                          </div>
                          <div
                            className="main-mail-content prose dark:prose-invert max-w-none mail-html-body text-sm"
                            dangerouslySetInnerHTML={{
                              __html:
                                msg.htmlBody ||
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
                                      att.attachmentId
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mail-attachment border dark:border-defaultborder/10 inline-flex items-center gap-2 px-2 py-1 rounded text-sm hover:bg-light dark:hover:bg-white/5"
                                  >
                                    <i className="ri-file-line"></i>
                                    <span className="truncate max-w-[120px]">{att.filename}</span>
                                  </a>
                                ) : null
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t dark:border-defaultborder/10">
                      <span className="text-[.875rem] font-semibold block mb-2">
                        <i className="ri-reply-all-line me-1 align-middle"></i>Reply:
                      </span>
                      <div className="mail-reply border dark:border-defaultborder/10 rounded-lg overflow-hidden bg-white dark:bg-bodydark [&_.tiptap-toolbar]:!bg-white [&_.tiptap-toolbar]:dark:!bg-bodydark [&_.tiptap-content]:!bg-white [&_.tiptap-content]:dark:!bg-bodydark [&_.ProseMirror]:!bg-white [&_.ProseMirror]:dark:!bg-bodydark">
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
                  <div className="mail-info-footer border-t dark:border-defaultborder/10 !p-4 flex flex-wrap gap-2 items-center justify-between bg-light/30 dark:bg-white/5">
                    <div className="flex gap-1 flex-wrap items-center">
                      <button type="button" className="ti-btn ti-btn-icon ti-btn-light" title="Print" onClick={handlePrint}>
                        <i className="ri-printer-line"></i>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddInlineReplyAttachment}
                        className="ti-btn ti-btn-icon ti-btn-light"
                        title="Add attachment"
                      >
                        <i className="ri-attachment-2"></i>
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
                        >
                          <i className="ri-mail-open-line"></i>
                        </button>
                      )}
                      <button type="button" onClick={refetchMessages} className="ti-btn ti-btn-icon ti-btn-light" title="Reload">
                        <i className="ri-refresh-line"></i>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => threadMessages[0] && openCompose("forward", threadMessages[0])}
                        className="ti-btn ti-btn-primary-full"
                      >
                        <i className="ri-share-forward-line me-1 align-middle"></i>
                        Forward
                      </button>
                      <button
                        type="button"
                        onClick={handleSendInlineReply}
                        disabled={sending}
                        className="ti-btn ti-btn-danger-full"
                      >
                        <i className="ri-reply-all-line me-1 align-middle"></i>
                        {sending ? "Sending..." : "Reply"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mail-recepients border dark:border-defaultborder/10 flex flex-col overflow-hidden min-w-0">
              <div className="p-2 border-b dark:border-defaultborder/10 flex justify-center shrink-0">
                <button
                  type="button"
                  onClick={handleAddQuickRecipient}
                  className="ti-btn ti-btn-icon ti-btn-light !rounded-full"
                  title="Add recipient for quick mail"
                >
                  <i className="ri-add-line"></i>
                </button>
              </div>
              <div className="p-2 flex flex-col gap-3 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-12rem)] total-mail-recepients">
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
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-auto p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={(e) => e.target === e.currentTarget && closeCompose()}
          >
            <div
              className="ti-modal-box bg-white dark:bg-bodydark rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ti-modal-content flex flex-col flex-1 min-h-0">
                <div className="ti-modal-header flex-shrink-0 !p-4 border-b dark:border-defaultborder/10 flex items-center justify-between bg-white dark:bg-bodydark">
                  <h6 className="modal-title text-[1rem] font-semibold text-defaulttextcolor">
                    {composeMode === "new"
                      ? "Compose Mail"
                      : composeMode === "reply"
                        ? "Reply"
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
                    {(composeMode === "new" || composeMode === "forward") && (
                      <>
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
                        <button
                          type="button"
                          onClick={handleAddAttachment}
                          className="ti-btn ti-btn-icon ti-btn-light"
                          title="Add attachment"
                        >
                          <i className="ri-attachment-2"></i>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        {composeAttachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-light dark:bg-white/10 text-sm"
                          >
                            {att.filename}
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="ti-btn ti-btn-icon ti-btn-ghost !p-0 !w-5 !h-5"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ti-modal-footer flex-shrink-0 !p-4 border-t dark:border-defaultborder/10 flex justify-end gap-2 bg-white dark:bg-bodydark">
                  <button
                    type="button"
                    onClick={closeCompose}
                    className="ti-btn ti-btn-secondary-full"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCompose}
                    disabled={sending}
                    className="ti-btn bg-primary text-white !font-medium"
                  >
                    {sending ? "Sending..." : "Send"}
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
