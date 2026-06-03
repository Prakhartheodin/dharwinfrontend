/** Shared email UI constants extracted from the mail page. */
export const LABEL_ICONS: Record<string, string> = {
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
  JUNK: "ri-spam-2-line",
  ARCHIVE: "ri-archive-line",
  OUTBOX: "ri-send-plane-2-line",
  conversationhistory: "ri-chat-history-line",
  notes: "ri-sticky-note-line",
};

export const PRACTICAL_ATTACHMENT_LIMIT_BYTES = {
  gmail: 22 * 1024 * 1024,
  outlook: 18 * 1024 * 1024,
} as const;
