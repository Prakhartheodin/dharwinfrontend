"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  createSupportTicket,
  getAllSupportTickets,
  getSupportTicketById,
  updateSupportTicket,
  addCommentToTicket,
  deleteSupportTicket,
  getCannedResponses,
  useCannedResponse,
  createCannedResponse,
  type SupportTicket,
  type TicketFilters,
  type CannedResponse,
  type ActivityEntry,
} from "@/shared/lib/api/supportTickets";
import { listCandidates } from "@/shared/lib/api/candidates";
import { listUsers } from "@/shared/lib/api/users";
import { useAuth } from "@/shared/contexts/auth-context";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* ─── status / priority maps ─── */
const STATUS_CONFIG: Record<string, { dot: string; badge: string; icon: string }> = {
  Open: { dot: "bg-primary", badge: "bg-primary/10 text-primary", icon: "ri-radio-button-line" },
  "In Progress": { dot: "bg-warning", badge: "bg-warning/10 text-warning", icon: "ri-loader-4-line" },
  Resolved: { dot: "bg-success", badge: "bg-success/10 text-success", icon: "ri-checkbox-circle-line" },
  Closed: { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50", icon: "ri-lock-line" },
};

const PRIORITY_CONFIG: Record<string, { badge: string; icon: string }> = {
  Low: { badge: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50", icon: "ri-arrow-down-line" },
  Medium: { badge: "bg-info/10 text-info", icon: "ri-subtract-line" },
  High: { badge: "bg-warning/10 text-warning", icon: "ri-arrow-up-line" },
  Urgent: { badge: "bg-danger/10 text-danger", icon: "ri-fire-line" },
};

const SupportTicketsPage = () => {
  const { user, roleNames } = useAuth();
  const { canView, canCreate, canEdit, canDelete } = useFeaturePermissions("support.tickets");

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>("createdAt:desc");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "Medium" as "Low" | "Medium" | "High" | "Urgent",
    category: "General",
    candidateId: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [candidatesList, setCandidatesList] = useState<{ id: string; fullName: string; email?: string }[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [adminUsersList, setAdminUsersList] = useState<{ id: string; name?: string; email: string; subRole?: string }[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [candidateId, setCandidateId] = useState<string>("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTicket, setAssignTicket] = useState<SupportTicket | null>(null);
  const [assignSelectedUserId, setAssignSelectedUserId] = useState<string>("");
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [assigningTicket, setAssigningTicket] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [commentAttachmentErrors, setCommentAttachmentErrors] = useState<string[]>([]);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const [isInternalNote, setIsInternalNote] = useState(false);

  const [updateForm, setUpdateForm] = useState({ status: "", priority: "", category: "", assignedTo: "" });
  const [updatingTicket, setUpdatingTicket] = useState(false);

  const [detailTab, setDetailTab] = useState<"activity" | "timeline">("activity");
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedSearch, setCannedSearch] = useState("");
  const [showSaveCannedModal, setShowSaveCannedModal] = useState(false);
  const [saveCannedForm, setSaveCannedForm] = useState({ title: "", category: "General" });

  const isAdmin = user?.role === "admin";
  const isAgent = roleNames.some((r) => String(r).toLowerCase() === "agent");
  /** Admins see all candidates; agents see only candidates where they are assignedAgent (API filter). */
  const canCreateTicketOnBehalf = isAdmin || isAgent;
  const userSubRole = (user as { subRole?: string })?.subRole;

  /* ─── data fetching ─── */
  const buildFilterParams = useCallback((): TicketFilters => {
    const params: TicketFilters = { page: currentPage, limit, sortBy };
    if (statusFilter) params.status = statusFilter as TicketFilters["status"];
    if (priorityFilter) params.priority = priorityFilter as TicketFilters["priority"];
    if (categoryFilter.trim()) params.category = categoryFilter.trim();
    if (searchQuery.trim()) params.search = searchQuery.trim();
    return params;
  }, [currentPage, limit, sortBy, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();
      const data = await getAllSupportTickets(params);
      const ticketsData = data?.results ?? [];
      setTotalPages(data?.totalPages ?? 1);
      setTotalResults(data?.totalResults ?? 0);
      setTickets(ticketsData);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to fetch tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (user?.role !== "user" || !user?.id) return;
    listCandidates({ page: 1, limit: 1000 })
      .then((res) => {
        const list = res?.results ?? [];
        const match = list.find((c) => {
          const ownerId =
            typeof (c as { owner?: string | { id?: string; _id?: string } }).owner === "string"
              ? (c as { owner: string }).owner
              : (c as { owner?: { id?: string; _id?: string } }).owner?.id ??
                (c as { owner?: { id?: string; _id?: string } }).owner?._id;
          return (
            String(ownerId) === String(user.id) ||
            (c.email ?? "").toLowerCase() === (user.email ?? "").toLowerCase()
          );
        });
        const id = match?.id ?? match?._id;
        if (id) setCandidateId(String(id));
      })
      .catch(() => {});
  }, [user?.role, user?.id, user?.email]);

  const fetchCandidates = useCallback(async () => {
    if (!canCreateTicketOnBehalf) return;
    setLoadingCandidates(true);
    try {
      const res = await listCandidates({
        page: 1,
        limit: 1000,
        sortBy: "fullName:asc",
        ...(!isAdmin && isAgent && user?.id ? { agentIds: String(user.id) } : {}),
      });
      const list = res?.results ?? [];
      setCandidatesList(list.map((c) => ({ id: c.id ?? c._id ?? "", fullName: c.fullName ?? "", email: c.email })));
    } catch {
      setCandidatesList([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, [canCreateTicketOnBehalf, isAdmin, isAgent, user?.id]);

  const fetchAdminUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAdminUsers(true);
    try {
      const res = await listUsers({ page: 1, limit: 1000, role: "admin" });
      let list = res?.results ?? [];
      if (userSubRole) list = list.filter((u) => (u as { subRole?: string }).subRole?.trim());
      list = list.filter((u) => {
        const sr = String((u as { subRole?: string }).subRole ?? "").trim().toLowerCase();
        return sr !== "admin";
      });
      setAdminUsersList(
        list.map((u) => ({
          id: u.id ?? "",
          name: u.name,
          email: u.email ?? "",
          subRole: (u as { subRole?: string }).subRole,
        }))
      );
    } catch {
      setAdminUsersList([]);
    } finally {
      setLoadingAdminUsers(false);
    }
  }, [isAdmin, userSubRole]);

  /* ─── modal open/close ─── */
  const openCreateModal = () => {
    setCreateForm({ title: "", description: "", priority: "Medium", category: "General", candidateId: "" });
    setAttachments([]);
    setAttachmentErrors([]);
    setShowCreateModal(true);
    if (canCreateTicketOnBehalf) fetchCandidates();
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ─── file handling ─── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const errors: string[] = [];
    const valid: File[] = [];
    const maxSize = 100 * 1024 * 1024;
    const allowed = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml",
      "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska",
    ];
    if (attachments.length + files.length > 10) {
      errors.push("Maximum 10 files allowed.");
      setAttachmentErrors(errors);
      return;
    }
    files.forEach((f) => {
      if (f.size > maxSize) errors.push(`${f.name}: exceeds 100MB`);
      else if (!allowed.includes(f.type)) errors.push(`${f.name}: type not allowed`);
      else valid.push(f);
    });
    setAttachmentErrors(errors);
    setAttachments((prev) => [...prev, ...valid]);
  };

  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const errors: string[] = [];
    const valid: File[] = [];
    const maxSize = 100 * 1024 * 1024;
    const allowed = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml",
      "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska",
    ];
    if (commentAttachments.length + files.length > 10) {
      errors.push("Maximum 10 files allowed.");
      setCommentAttachmentErrors(errors);
      return;
    }
    files.forEach((f) => {
      if (f.size > maxSize) errors.push(`${f.name}: exceeds 100MB`);
      else if (!allowed.includes(f.type)) errors.push(`${f.name}: type not allowed`);
      else valid.push(f);
    });
    setCommentAttachmentErrors(errors);
    setCommentAttachments((prev) => [...prev, ...valid]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  /* ─── CRUD handlers ─── */
  const handleCreateTicket = async () => {
    if (!createForm.title.trim() || createForm.title.length < 5) {
      await Swal.fire({ icon: "warning", title: "Invalid Title", text: "Title must be at least 5 characters." });
      return;
    }
    if (!createForm.description.trim() || createForm.description.length < 10) {
      await Swal.fire({ icon: "warning", title: "Invalid Description", text: "Description must be at least 10 characters." });
      return;
    }
    if (attachmentErrors.length) {
      await Swal.fire({ icon: "error", title: "File Error", html: attachmentErrors.join("<br>") });
      return;
    }
    try {
      setCreatingTicket(true);
      await createSupportTicket({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        priority: createForm.priority,
        category: createForm.category.trim() || "General",
        attachments: attachments.length ? attachments : undefined,
        ...(canCreateTicketOnBehalf && createForm.candidateId ? { candidateId: createForm.candidateId } : {}),
      });
      await Swal.fire({ icon: "success", title: "Ticket Created", timer: 2000, showConfirmButton: false });
      closeCreateModal();
      fetchTickets();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Failed to create ticket." });
    } finally {
      setCreatingTicket(false);
    }
  };

  const openTicketModal = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setCommentText("");
    setCommentAttachments([]);
    setCommentAttachmentErrors([]);
    setUpdateForm({
      status: ticket.status ?? "",
      priority: ticket.priority ?? "",
      category: ticket.category ?? "",
      assignedTo: ticket.assignedTo?.id ?? ticket.assignedTo?._id ?? "",
    });
    setShowTicketModal(true);
    try {
      const id = ticket.id ?? ticket._id;
      if (id) {
        const latest = await getSupportTicketById(String(id));
        setSelectedTicket(latest);
        setUpdateForm({
          status: latest.status ?? "",
          priority: latest.priority ?? "",
          category: latest.category ?? "",
          assignedTo: latest.assignedTo?.id ?? latest.assignedTo?._id ?? "",
        });
      }
    } catch {
      /* keep initial data */
    }
  };

  const closeTicketModal = () => {
    setShowTicketModal(false);
    setSelectedTicket(null);
    if (commentFileInputRef.current) commentFileInputRef.current.value = "";
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || commentText.length < 5) {
      await Swal.fire({ icon: "warning", title: "Invalid Comment", text: "Comment must be at least 5 characters." });
      return;
    }
    if (!selectedTicket || commentAttachmentErrors.length) return;
    const ticketId = selectedTicket.id ?? selectedTicket._id;
    if (!ticketId) return;
    try {
      setAddingComment(true);
      await addCommentToTicket(String(ticketId), commentText.trim(), commentAttachments.length ? commentAttachments : undefined, isInternalNote);
      setCommentText("");
      setCommentAttachments([]);
      setIsInternalNote(false);
      if (commentFileInputRef.current) commentFileInputRef.current.value = "";
      const latest = await getSupportTicketById(String(ticketId));
      setSelectedTicket(latest);
      setTickets((prev) => prev.map((t) => (String(t.id ?? t._id) === String(ticketId) ? latest : t)));
      await Swal.fire({ icon: "success", title: "Comment Added", timer: 2000, showConfirmButton: false });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Failed." });
    } finally {
      setAddingComment(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id ?? selectedTicket._id;
    if (!ticketId) return;
    const updateData: { status?: string; priority?: string; category?: string; assignedTo?: string } = {};
    if (updateForm.status && updateForm.status !== selectedTicket.status) updateData.status = updateForm.status;
    if (updateForm.priority && updateForm.priority !== selectedTicket.priority) updateData.priority = updateForm.priority;
    if (updateForm.category && updateForm.category !== selectedTicket.category) updateData.category = updateForm.category;
    const aid = updateForm.assignedTo;
    const cur = selectedTicket.assignedTo?.id ?? selectedTicket.assignedTo?._id;
    if (aid !== cur) updateData.assignedTo = aid;
    if (Object.keys(updateData).length === 0) {
      await Swal.fire({ icon: "info", title: "No Changes", text: "No changes to save." });
      return;
    }
    try {
      setUpdatingTicket(true);
      await updateSupportTicket(String(ticketId), updateData);
      const latest = await getSupportTicketById(String(ticketId));
      setSelectedTicket(latest);
      setUpdateForm({
        status: latest.status ?? "",
        priority: latest.priority ?? "",
        category: latest.category ?? "",
        assignedTo: latest.assignedTo?.id ?? latest.assignedTo?._id ?? "",
      });
      setTickets((prev) => prev.map((t) => (String(t.id ?? t._id) === String(ticketId) ? latest : t)));
      await Swal.fire({ icon: "success", title: "Updated", timer: 2000, showConfirmButton: false });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Failed." });
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleUpdateAndComment = async () => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id ?? selectedTicket._id;
    if (!ticketId) return;
    const updateData: { status?: string; priority?: string; category?: string; assignedTo?: string } = {};
    if (isAdmin) {
      if (updateForm.status && updateForm.status !== selectedTicket.status) updateData.status = updateForm.status;
      if (updateForm.priority && updateForm.priority !== selectedTicket.priority) updateData.priority = updateForm.priority;
      if (updateForm.category && updateForm.category !== selectedTicket.category) updateData.category = updateForm.category;
      const aid = updateForm.assignedTo;
      const cur = selectedTicket.assignedTo?.id ?? selectedTicket.assignedTo?._id;
      if (aid !== cur) updateData.assignedTo = aid;
    }
    const hasUpdate = Object.keys(updateData).length > 0;
    const hasComment = commentText.trim().length >= 5;
    if (!hasUpdate && !hasComment) {
      await Swal.fire({ icon: "info", title: "No Changes", text: "Add a comment or make changes." });
      return;
    }
    try {
      setUpdatingTicket(true);
      setAddingComment(true);
      if (hasUpdate) await updateSupportTicket(String(ticketId), updateData);
      if (hasComment) {
        await addCommentToTicket(String(ticketId), commentText.trim(), commentAttachments.length ? commentAttachments : undefined, isInternalNote);
      }
      setCommentText("");
      setCommentAttachments([]);
      setIsInternalNote(false);
      if (commentFileInputRef.current) commentFileInputRef.current.value = "";
      const latest = await getSupportTicketById(String(ticketId));
      setSelectedTicket(latest);
      setUpdateForm({
        status: latest.status ?? "",
        priority: latest.priority ?? "",
        category: latest.category ?? "",
        assignedTo: latest.assignedTo?.id ?? latest.assignedTo?._id ?? "",
      });
      setTickets((prev) => prev.map((t) => (String(t.id ?? t._id) === String(ticketId) ? latest : t)));
      await Swal.fire({ icon: "success", title: "Success", timer: 2000, showConfirmButton: false });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Failed." });
    } finally {
      setUpdatingTicket(false);
      setAddingComment(false);
    }
  };

  const handleQuickAssign = async (ticket: SupportTicket, assignedToUserId: string) => {
    const ticketId = ticket.id ?? ticket._id;
    if (!ticketId) return;
    const cur = ticket.assignedTo?.id ?? ticket.assignedTo?._id;
    if (!assignedToUserId && !cur) {
      await Swal.fire({ icon: "info", title: "Already Unassigned" });
      return;
    }
    if (assignedToUserId && cur === assignedToUserId) {
      await Swal.fire({ icon: "info", title: "Already Assigned" });
      return;
    }
    try {
      setAssigningTicket(true);
      setAssigningTicketId(String(ticketId));
      await updateSupportTicket(String(ticketId), { assignedTo: assignedToUserId || "" });
      const updated = await getSupportTicketById(String(ticketId));
      setTickets((prev) => prev.map((t) => (String(t.id ?? t._id) === String(ticketId) ? updated : t)));
      if (selectedTicket && String(selectedTicket.id ?? selectedTicket._id) === String(ticketId)) {
        setSelectedTicket(updated);
        setUpdateForm({
          status: updated.status ?? "",
          priority: updated.priority ?? "",
          category: updated.category ?? "",
          assignedTo: updated.assignedTo?.id ?? updated.assignedTo?._id ?? "",
        });
      }
      if (assignTicket && String(assignTicket.id ?? assignTicket._id) === String(ticketId)) {
        setAssignTicket(updated);
        setAssignSelectedUserId(updated.assignedTo?.id ?? updated.assignedTo?._id ?? "");
      }
      await Swal.fire({ icon: "success", title: assignedToUserId ? "Assigned" : "Unassigned", timer: 2000, showConfirmButton: false });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Failed." });
    } finally {
      setAssigningTicket(false);
      setAssigningTicketId(null);
    }
  };

  const handleDeleteTicket = async (ticket: SupportTicket) => {
    const ticketId = ticket.id ?? ticket._id;
    if (!ticketId) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteSupportTicket(String(ticketId));
      if (selectedTicket && String(selectedTicket.id ?? selectedTicket._id) === String(ticketId)) closeTicketModal();
      fetchTickets();
      await Swal.fire("Deleted!", "The ticket has been deleted.", "success");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire("Delete failed", e?.response?.data?.message ?? e?.message ?? "Unable to delete.", "error");
    }
  };

  /* ─── helpers ─── */
  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.Open;
  const getPriorityConfig = (priority: string) => PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Medium;

  const formatDate = (s?: string) => {
    if (!s) return "N/A";
    return new Date(s).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatRelative = (s?: string) => {
    if (!s) return "";
    const diff = Date.now() - new Date(s).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + "d ago";
    return formatDate(s);
  };

  const openAssignModal = (ticket: SupportTicket) => {
    const latest = tickets.find((t) => String(t.id ?? t._id) === String(ticket.id ?? ticket._id)) ?? ticket;
    const cur = latest.assignedTo?.id ?? latest.assignedTo?._id ?? "";
    setAssignTicket(latest);
    setAssignSelectedUserId(cur);
    setShowAssignModal(true);
    if (isAdmin) fetchAdminUsers();
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignTicket(null);
    setAssignSelectedUserId("");
  };

  const showCreateBtn = canCreate || canView;
  const showDeleteBtn = isAdmin && canDelete;
  const canAssign = isAdmin;

  const hasActiveFilters = statusFilter || priorityFilter || categoryFilter || searchQuery;

  /* ─── stat counters ─── */
  const openCount = tickets.filter((t) => t.status === "Open").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;
  const urgentCount = tickets.filter((t) => t.priority === "Urgent" || t.priority === "High").length;

  /* ─── RENDER ─── */
  return (
    <Fragment>
      <Seo title="Support Tickets" />

      <div className="container-fluid pt-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <i className="ri-coupon-3-line text-[1rem]" />
              </span>
              Support Tickets
            </h1>
            <p className="mt-1 text-[0.8125rem] text-[#8c9097] dark:text-white/50">
              Manage and track support requests
            </p>
          </div>
          {showCreateBtn && (
            <button
              type="button"
              onClick={openCreateModal}
              className="ti-btn ti-btn-primary ti-btn-wave inline-flex items-center gap-2 whitespace-nowrap !py-2 !px-4 !text-[0.8125rem]"
            >
              <i className="ri-add-line" />
              <span>Create Ticket</span>
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
          <div className="box !mb-0">
            <div className="box-body !p-4 flex items-center gap-3">
              <span className="avatar avatar-sm rounded-md bg-primary/10 text-primary">
                <i className="ri-radio-button-line text-[1rem]" />
              </span>
              <div>
                <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Open</p>
                <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{openCount}</p>
              </div>
            </div>
          </div>
          <div className="box !mb-0">
            <div className="box-body !p-4 flex items-center gap-3">
              <span className="avatar avatar-sm rounded-md bg-warning/10 text-warning">
                <i className="ri-loader-4-line text-[1rem]" />
              </span>
              <div>
                <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">In Progress</p>
                <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{inProgressCount}</p>
              </div>
            </div>
          </div>
          <div className="box !mb-0">
            <div className="box-body !p-4 flex items-center gap-3">
              <span className="avatar avatar-sm rounded-md bg-success/10 text-success">
                <i className="ri-checkbox-circle-line text-[1rem]" />
              </span>
              <div>
                <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">Resolved</p>
                <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{resolvedCount}</p>
              </div>
            </div>
          </div>
          <div className="box !mb-0">
            <div className="box-body !p-4 flex items-center gap-3">
              <span className="avatar avatar-sm rounded-md bg-danger/10 text-danger">
                <i className="ri-fire-line text-[1rem]" />
              </span>
              <div>
                <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">High / Urgent</p>
                <p className="text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white mb-0">{urgentCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + Table */}
        <div className="box">
          <div className="box-header justify-between">
            <div className="box-title">All Tickets</div>
            <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
              {totalResults} {totalResults === 1 ? "result" : "results"}
            </span>
          </div>
          <div className="box-body">
            {/* Search + Filters */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by ticket ID, title, or description..."
                  className="form-control !pl-9 !rounded-md !text-[0.8125rem]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 whitespace-nowrap">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-control !py-1 !px-3 !text-[0.75rem] !w-auto !rounded-md"
                  >
                    <option value="">All</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 whitespace-nowrap">Priority:</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="form-control !py-1 !px-3 !text-[0.75rem] !w-auto !rounded-md"
                  >
                    <option value="">All</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 whitespace-nowrap">Category:</label>
                  <input
                    type="text"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    placeholder="Filter..."
                    className="form-control !py-1 !px-3 !text-[0.75rem] !w-[140px] !rounded-md"
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("");
                      setPriorityFilter("");
                      setCategoryFilter("");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="ti-btn ti-btn-sm ti-btn-danger-full ti-btn-wave inline-flex items-center gap-1.5 whitespace-nowrap !py-1 !px-3 !text-[0.7rem] !rounded-md"
                  >
                    <i className="ri-close-line" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 flex items-center gap-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3">
                <i className="ri-error-warning-line text-danger text-[1.25rem]" />
                <span className="text-[0.8125rem] text-danger">{error}</span>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex items-center gap-4 p-3 animate-pulse">
                    <div className="h-4 w-20 rounded bg-black/5 dark:bg-white/10" />
                    <div className="h-4 flex-1 rounded bg-black/5 dark:bg-white/10" />
                    <div className="h-5 w-16 rounded-full bg-black/5 dark:bg-white/10" />
                    <div className="h-5 w-16 rounded-full bg-black/5 dark:bg-white/10" />
                    <div className="h-4 w-24 rounded bg-black/5 dark:bg-white/10" />
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              /* Empty State — primary CTA without ti-btn-wave (ripple could misalign and look like a stray box on the label) */
              <div className="py-16 text-center">
                <div
                  className="mx-auto mb-5 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl bg-gradient-to-br from-primary/[0.12] to-primary/[0.04] ring-1 ring-primary/10 dark:from-primary/20 dark:to-primary/5 dark:ring-primary/20"
                  aria-hidden
                >
                  <i className="ri-customer-service-2-line text-[2.125rem] text-primary" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-defaulttextcolor dark:text-white">
                  No tickets found
                </h3>
                <p className="mx-auto mt-1.5 max-w-[20rem] text-[0.8125rem] leading-relaxed text-[#8c9097] dark:text-white/50">
                  {hasActiveFilters ? "Try adjusting your search or filters." : "Create a support ticket to get started."}
                </p>
                {!hasActiveFilters && showCreateBtn && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className={
                        "group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[0.8125rem] font-semibold " +
                        "bg-primary text-white shadow-md shadow-primary/25 " +
                        "transition-[transform,box-shadow,background-color] duration-200 ease-out " +
                        "hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] " +
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
                        "dark:focus-visible:ring-offset-bodybg"
                      }
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15 text-base leading-none transition-colors group-hover:bg-white/25">
                        <i className="ri-add-line" aria-hidden />
                      </span>
                      <span className="whitespace-nowrap">Create your first ticket</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Table */
              <div className="table-responsive">
                <table className="table table-hover whitespace-nowrap table-bordered min-w-full">
                  <thead>
                    <tr className="border-b border-defaultborder dark:border-defaultborder/10">
                      <th scope="col" className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50">Ticket</th>
                      <th scope="col" className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50">Subject</th>
                      <th scope="col" className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50">Status</th>
                      <th scope="col" className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50">Priority</th>
                      <th scope="col" className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50">Category</th>
                      {isAdmin && <th scope="col" className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50">Created By</th>}
                      <th scope="col" className="!text-start !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50">Created</th>
                      <th scope="col" className="!text-center !text-[0.75rem] !font-semibold text-[#8c9097] dark:text-white/50">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => {
                      const tid = ticket.id ?? ticket._id;
                      const ticketCandidateId = ticket.candidate?.id ?? ticket.candidate?._id;
                      const ticketCreatedById = ticket.createdBy?.id ?? ticket.createdBy?._id;
                      const canViewTicket =
                        isAdmin ||
                        ticketCreatedById === user?.id ||
                        (candidateId && ticketCandidateId === candidateId) ||
                        (ticketCandidateId && user?.id && String(ticketCandidateId) === String(user.id));
                      const sc = getStatusConfig(ticket.status || "");
                      const pc = getPriorityConfig(ticket.priority || "");
                      const displayId = ticket.ticketId ?? String(tid).slice(-8).toUpperCase();

                      return (
                        <tr
                          key={String(tid)}
                          className="border-b border-defaultborder dark:border-defaultborder/10 hover:bg-gray-50/50 dark:hover:bg-light/5 transition-colors cursor-pointer"
                          onClick={() => openTicketModal(ticket)}
                        >
                          <td className="!py-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openTicketModal(ticket); }}
                              className="font-mono text-[0.75rem] font-semibold text-primary hover:underline"
                            >
                              {displayId}
                            </button>
                          </td>
                          <td className="!py-3">
                            <div className="max-w-[280px]">
                              <p className="text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white truncate mb-0">
                                {ticket.title}
                              </p>
                              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 truncate mb-0">
                                {ticket.description}
                              </p>
                            </div>
                          </td>
                          <td className="!py-3">
                            <span className={"badge !rounded-full !text-[0.6875rem] " + sc.badge}>
                              <i className={sc.icon + " me-1 text-[0.6rem]"} />
                              {ticket.status}
                            </span>
                          </td>
                          <td className="!py-3">
                            <span className={"badge !rounded-full !text-[0.6875rem] " + pc.badge}>
                              <i className={pc.icon + " me-1 text-[0.6rem]"} />
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="!py-3 text-[0.8125rem] text-[#8c9097] dark:text-white/50">
                            {ticket.category ?? "General"}
                          </td>
                          {isAdmin && (
                            <td className="!py-3">
                              <div className="flex items-center gap-2">
                                <span className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary text-[0.55rem] font-semibold">
                                  {(ticket.createdBy?.name ?? ticket.candidate?.fullName ?? "N")[0]?.toUpperCase()}
                                </span>
                                <span className="text-[0.8125rem] text-defaulttextcolor dark:text-white">
                                  {ticket.createdBy?.name ?? ticket.candidate?.fullName ?? "N/A"}
                                </span>
                              </div>
                            </td>
                          )}
                          <td className="!py-3">
                            <div>
                              <p className="text-[0.75rem] text-defaulttextcolor dark:text-white mb-0">{formatRelative(ticket.createdAt)}</p>
                              <p className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 mb-0">{formatDate(ticket.createdAt)}</p>
                            </div>
                          </td>
                          <td className="!py-3 !text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openTicketModal(ticket)}
                                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-soft-primary ti-btn-wave"
                                title="View Details"
                              >
                                <i className="ri-eye-line" />
                              </button>
                              {canAssign && (
                                <button
                                  type="button"
                                  onClick={() => openAssignModal(ticket)}
                                  disabled={assigningTicketId === String(tid)}
                                  className={"ti-btn ti-btn-icon ti-btn-sm ti-btn-wave " + (ticket.assignedTo ? "ti-btn-soft-success" : "ti-btn-soft-info")}
                                  title={ticket.assignedTo ? "Assigned: " + (ticket.assignedTo.name || ticket.assignedTo.email) : "Assign"}
                                >
                                  {assigningTicketId === String(tid) ? (
                                    <i className="ri-loader-4-line animate-spin" />
                                  ) : ticket.assignedTo ? (
                                    <i className="ri-user-star-line" />
                                  ) : (
                                    <i className="ri-user-add-line" />
                                  )}
                                </button>
                              )}
                              {showDeleteBtn && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTicket(ticket)}
                                  className="ti-btn ti-btn-icon ti-btn-sm ti-btn-soft-danger ti-btn-wave"
                                  title="Delete"
                                >
                                  <i className="ri-delete-bin-5-line" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="box-footer flex items-center justify-between">
              <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0">
                Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalResults)} of {totalResults}
              </p>
              <nav aria-label="Pagination">
                <ul className="ti-pagination mb-0">
                  <li className={"page-item" + (currentPage === 1 ? " disabled" : "")}>
                    <button
                      type="button"
                      className="page-link !py-[0.375rem] !px-[0.75rem]"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Prev
                    </button>
                  </li>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <li key={pageNum} className={"page-item" + (currentPage === pageNum ? " active" : "")}>
                        <button
                          type="button"
                          className="page-link !py-[0.375rem] !px-[0.75rem]"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  <li className={"page-item" + (currentPage === totalPages ? " disabled" : "")}>
                    <button
                      type="button"
                      className="page-link !py-[0.375rem] !px-[0.75rem]"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ CREATE MODAL ═══════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]" onClick={closeCreateModal}>
          <div
            className="w-full max-w-2xl rounded-md bg-white shadow-lg dark:bg-bodybg animate-[fadeIn_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-defaultborder px-5 py-4">
              <h6 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
                <i className="ri-add-circle-line text-primary" />
                Create Support Ticket
              </h6>
              <button type="button" onClick={closeCreateModal} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !rounded-full">
                <i className="ri-close-line" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label mb-2 font-semibold text-[0.8125rem] text-defaulttextcolor dark:text-white">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Brief summary of the issue"
                  className="form-control !rounded-md"
                  maxLength={200}
                />
                <p className="mt-1 text-[0.6875rem] text-[#8c9097]">5–200 characters</p>
              </div>

              <div>
                <label className="form-label mb-2 font-semibold text-[0.8125rem] text-defaulttextcolor dark:text-white">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue in detail..."
                  rows={5}
                  className="form-control !rounded-md"
                  maxLength={5000}
                />
                <p className="mt-1 text-[0.6875rem] text-[#8c9097]">10–5,000 characters</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label mb-2 font-semibold text-[0.8125rem] text-defaulttextcolor dark:text-white">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value as typeof createForm.priority }))}
                    className="form-control !rounded-md"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="form-label mb-2 font-semibold text-[0.8125rem] text-defaulttextcolor dark:text-white">Category</label>
                  <input
                    type="text"
                    value={createForm.category}
                    readOnly
                    className="form-control !rounded-md !bg-gray-50 dark:!bg-black/10"
                  />
                </div>
              </div>

              {canCreateTicketOnBehalf && (
                <div>
                  <label className="form-label mb-2 font-semibold text-[0.8125rem] text-defaulttextcolor dark:text-white">
                    {isAgent && !isAdmin ? "Create for assigned candidate" : "Create on behalf of candidate"}
                    <span className="ms-1 text-[0.6875rem] font-normal text-[#8c9097]">(optional)</span>
                  </label>
                  {isAdmin && (
                    <p className="mb-2 text-[0.6875rem] text-[#8c9097] dark:text-white/45">
                      Choose any candidate to file on their behalf, or leave empty for a ticket for yourself (staff).
                    </p>
                  )}
                  {loadingCandidates ? (
                    <div className="flex items-center gap-2 rounded-md border border-defaultborder px-3 py-2 text-[0.8125rem] text-[#8c9097]">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading candidates...
                    </div>
                  ) : (
                    <Select
                      isClearable
                      isSearchable
                      placeholder={isAdmin ? "Optional — select candidate or leave empty for yourself" : "Select candidate..."}
                      value={
                        createForm.candidateId
                          ? {
                              value: createForm.candidateId,
                              label: candidatesList.find((c) => c.id === createForm.candidateId)?.fullName ?? "Unknown",
                            }
                          : null
                      }
                      onChange={(opt) => setCreateForm((f) => ({ ...f, candidateId: opt?.value ?? "" }))}
                      options={candidatesList.map((c) => ({ value: c.id, label: c.fullName + (c.email ? " (" + c.email + ")" : "") }))}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  )}
                </div>
              )}

              {/* Attachments */}
              <div>
                <label className="form-label mb-2 font-semibold text-[0.8125rem] text-defaulttextcolor dark:text-white">
                  Attachments
                  <span className="ms-1 text-[0.6875rem] font-normal text-[#8c9097]">(optional)</span>
                </label>
                <div
                  className="relative flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-defaultborder p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="text-center">
                    <i className="ri-upload-cloud-2-line text-[1.5rem] text-[#8c9097]" />
                    <p className="mt-1 text-[0.8125rem] text-[#8c9097]">Click to upload images or videos</p>
                    <p className="text-[0.6875rem] text-[#8c9097]/70">Max 10 files, 100MB each</p>
                  </div>
                </div>
                {attachmentErrors.length > 0 && (
                  <div className="mt-2 rounded-md border border-danger/30 bg-danger/5 p-2">
                    {attachmentErrors.map((e, i) => (
                      <p key={i} className="text-[0.75rem] text-danger mb-0">{e}</p>
                    ))}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-black/10 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <i className={
                            f.type.startsWith("video/")
                              ? "ri-video-line text-info"
                              : "ri-image-line text-success"
                          } />
                          <span className="truncate text-[0.8125rem] text-defaulttextcolor dark:text-white">{f.name}</span>
                          <span className="text-[0.6875rem] text-[#8c9097] whitespace-nowrap">{formatFileSize(f.size)}</span>
                        </div>
                        <button type="button" onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))} className="ti-btn ti-btn-icon ti-btn-xs ti-btn-soft-danger !rounded-full ms-2">
                          <i className="ri-close-line" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-defaultborder px-5 py-4">
              <button type="button" onClick={closeCreateModal} className="ti-btn ti-btn-light">
                Cancel
              </button>
              <button type="button" onClick={handleCreateTicket} disabled={creatingTicket} className="ti-btn ti-btn-primary ti-btn-wave">
                {creatingTicket ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </span>
                ) : "Create Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TICKET DETAIL MODAL ═══════ */}
      {showTicketModal && selectedTicket && (() => {
        const sc = getStatusConfig(selectedTicket.status || "");
        const pc = getPriorityConfig(selectedTicket.priority || "");
        const statusColorMap: Record<string, string> = {
          Open: "#6366f1",
          "In Progress": "#f59e0b",
          Resolved: "#22c55e",
          Closed: "#9ca3af",
        };
        const accentColor = statusColorMap[selectedTicket.status] || "#6366f1";
        const isImage = (mime?: string) => !!mime && mime.startsWith("image/");
        const isVideo = (mime?: string) => !!mime && mime.startsWith("video/");

        return (
        <div className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto p-4 pt-[2vh]" onClick={closeTicketModal}
          style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-[56rem] rounded-xl bg-white shadow-2xl dark:bg-bodybg mb-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeIn 0.25s cubic-bezier(.4,0,.2,1)" }}
          >
            {/* ── Accent bar + Header ── */}
            <div style={{ height: "3px", background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 font-mono text-[0.7rem] font-semibold tracking-wide text-slate-600 dark:text-white/70">
                      <i className="ri-hashtag text-[0.6rem] opacity-50" />
                      {selectedTicket.ticketId ?? String(selectedTicket.id ?? selectedTicket._id).slice(-8).toUpperCase()}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold"
                      style={{ background: `${accentColor}14`, color: accentColor }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                      {selectedTicket.status}
                    </span>
                    <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium " + pc.badge}>
                      <i className={pc.icon + " text-[0.55rem]"} />
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <h5 className="text-[1.125rem] font-bold text-slate-800 dark:text-white leading-snug tracking-[-0.01em]">
                    {selectedTicket.title}
                  </h5>
                  {selectedTicket.createdBy && (
                    <p className="mt-1 text-[0.75rem] text-slate-400 dark:text-white/40">
                      Opened by <span className="font-medium text-slate-500 dark:text-white/60">{selectedTicket.createdBy.name || selectedTicket.createdBy.email}</span>
                      {" "}· {formatRelative(selectedTicket.createdAt)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeTicketModal}
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                >
                  <i className="ri-close-line text-[1.125rem]" />
                </button>
              </div>
            </div>

            {/* ── Two-column body ── */}
            <div className="flex flex-col lg:flex-row">
              {/* LEFT: Main content */}
              <div className="flex-1 min-w-0 border-t border-slate-100 dark:border-white/[0.06]">
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-white/[0.06]">
                        <i className="ri-file-text-line text-[0.75rem] text-slate-500 dark:text-white/50" />
                      </span>
                      <h6 className="text-[0.8125rem] font-semibold text-slate-700 dark:text-white/90">Description</h6>
                    </div>
                    <div className="rounded-lg border border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-black/10 p-4 text-[0.8125rem] text-slate-600 dark:text-white/75 leading-[1.7] whitespace-pre-wrap">
                      {selectedTicket.description}
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-white/[0.06]">
                          <i className="ri-attachment-2 text-[0.75rem] text-slate-500 dark:text-white/50" />
                        </span>
                        <h6 className="text-[0.8125rem] font-semibold text-slate-700 dark:text-white/90">
                          Attachments
                          <span className="ml-1.5 text-[0.6875rem] font-normal text-slate-400">({selectedTicket.attachments.length})</span>
                        </h6>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {selectedTicket.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative block rounded-lg border border-slate-150 dark:border-white/[0.08] overflow-hidden transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
                          >
                            {isImage(att.mimeType) ? (
                              <div className="aspect-[4/3] bg-slate-100 dark:bg-black/20 overflow-hidden">
                                <img
                                  src={att.url}
                                  alt={att.originalName}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              </div>
                            ) : isVideo(att.mimeType) ? (
                              <div className="aspect-[4/3] bg-slate-900 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-1">
                                  <i className="ri-play-circle-line text-[1.75rem] text-white/70 group-hover:text-white transition-colors" />
                                  <span className="text-[0.6rem] text-white/40 uppercase tracking-wider font-medium">Video</span>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-[4/3] bg-slate-50 dark:bg-black/15 flex items-center justify-center">
                                <i className="ri-file-line text-[1.5rem] text-slate-300 dark:text-white/20" />
                              </div>
                            )}
                            <div className="px-2.5 py-2 bg-white dark:bg-bodybg border-t border-slate-100 dark:border-white/[0.06]">
                              <p className="text-[0.6875rem] font-medium text-slate-600 dark:text-white/70 truncate mb-0 group-hover:text-primary transition-colors">
                                {att.originalName}
                              </p>
                              {att.size > 0 && (
                                <p className="text-[0.6rem] text-slate-400 dark:text-white/30 mt-0.5 mb-0">{formatFileSize(att.size)}</p>
                              )}
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white/90 dark:bg-black/60 shadow-sm">
                                <i className="ri-external-link-line text-[0.65rem] text-slate-600 dark:text-white/70" />
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity / Timeline Tabs */}
                  <div>
                    <div className="flex items-center gap-1 mb-3">
                      <button
                        type="button"
                        onClick={() => setDetailTab("activity")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold transition-all ${
                          detailTab === "activity"
                            ? "bg-primary/10 text-primary"
                            : "text-slate-500 hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        <i className="ri-chat-3-line text-[0.7rem]" />
                        Activity
                        {(selectedTicket.comments?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[1rem] h-[1rem] rounded-full bg-primary/10 text-primary text-[0.55rem] font-bold px-1">
                            {selectedTicket.comments?.length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailTab("timeline")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold transition-all ${
                          detailTab === "timeline"
                            ? "bg-primary/10 text-primary"
                            : "text-slate-500 hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        <i className="ri-history-line text-[0.7rem]" />
                        Timeline
                        {(selectedTicket.activityLog?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[1rem] h-[1rem] rounded-full bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-white/50 text-[0.55rem] font-bold px-1">
                            {selectedTicket.activityLog?.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Activity tab */}
                    {detailTab === "activity" && (
                      <>
                        <div className="mb-4 max-h-80 overflow-y-auto pr-1 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}>
                          {selectedTicket.comments?.length ? (
                            selectedTicket.comments.map((c, i) => {
                              const initials = ((c.commentedBy?.name ?? c.commentedBy?.email ?? "?")[0] || "?").toUpperCase();
                              return (
                                <div key={i} className={`flex gap-3 group/comment ${c.isInternal ? "border-l-2 border-amber-400 pl-2 bg-amber-50/40 dark:bg-amber-500/5 rounded-r-lg py-1" : ""}`}>
                                  <span
                                    className={"shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-[0.55rem] font-bold mt-0.5 " +
                                      (c.isInternal
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                        : c.isAdminComment
                                          ? "bg-primary text-white"
                                          : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-white/60")}
                                  >
                                    {c.isInternal ? <i className="ri-lock-line text-[0.6rem]" /> : initials}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="text-[0.8125rem] font-semibold text-slate-700 dark:text-white/90">
                                        {c.commentedBy?.name || c.commentedBy?.email}
                                      </span>
                                      {c.isInternal && (
                                        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                          <i className="ri-lock-line text-[0.5rem]" /> Internal
                                        </span>
                                      )}
                                      {c.isAdminComment && !c.isInternal && (
                                        <span className="inline-flex items-center rounded px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                                          Staff
                                        </span>
                                      )}
                                      <span className="text-[0.6875rem] text-slate-400 dark:text-white/35">
                                        {formatRelative(c.createdAt)}
                                      </span>
                                    </div>
                                    <div className="text-[0.8125rem] text-slate-600 dark:text-white/75 leading-relaxed">
                                      {c.content}
                                    </div>
                                    {c.attachments && c.attachments.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {c.attachments.map((ca, ci) => (
                                          <a
                                            key={ci}
                                            href={ca.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/[0.06] px-2 py-1 text-[0.6875rem] text-slate-600 dark:text-white/60 hover:text-primary hover:bg-primary/5 transition-colors"
                                          >
                                            <i className={isImage(ca.mimeType) ? "ri-image-line" : isVideo(ca.mimeType) ? "ri-video-line" : "ri-file-line"} />
                                            <span className="max-w-[120px] truncate">{ca.originalName}</span>
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-8 text-center">
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.04] mb-2">
                                <i className="ri-chat-smile-2-line text-[1.125rem] text-slate-300 dark:text-white/20" />
                              </div>
                              <p className="text-[0.8125rem] text-slate-400 dark:text-white/30 mb-0">No comments yet. Start the conversation below.</p>
                            </div>
                          )}
                        </div>

                        {/* Comment input */}
                        {selectedTicket.status !== "Closed" && (
                          <div className={`rounded-xl border overflow-hidden transition-colors focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.06)] ${
                            isInternalNote
                              ? "border-amber-300 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5 focus-within:border-amber-400"
                              : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-bodybg focus-within:border-primary/40"
                          }`}>
                            {isInternalNote && (
                              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-100/60 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20">
                                <i className="ri-lock-line text-[0.7rem] text-amber-600 dark:text-amber-400" />
                                <span className="text-[0.6875rem] font-medium text-amber-700 dark:text-amber-400">Internal note &mdash; only visible to staff</span>
                              </div>
                            )}
                            <textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder={isInternalNote ? "Write an internal note (hidden from user)..." : "Write a comment..."}
                              rows={3}
                              className="form-control !rounded-none !border-0 !bg-transparent !px-4 !pt-3 !pb-1 !shadow-none !text-[0.8125rem] focus:!ring-0 resize-none placeholder:text-slate-400 dark:placeholder:text-white/25"
                              maxLength={2000}
                            />
                            {commentAttachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                                {commentAttachments.map((f, i) => (
                                  <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-white/[0.06] pl-2 pr-1 py-1 text-[0.6875rem] text-slate-600 dark:text-white/60">
                                    <i className="ri-file-line text-[0.6rem] opacity-50" />
                                    <span className="max-w-[100px] truncate">{f.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setCommentAttachments((a) => a.filter((_, j) => j !== i))}
                                      className="flex items-center justify-center w-4 h-4 rounded hover:bg-red-100 hover:text-red-500 transition-colors"
                                    >
                                      <i className="ri-close-line text-[0.55rem]" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Canned responses dropdown */}
                            {showCannedPicker && isAdmin && (
                              <div className="mx-3 mb-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-bodybg shadow-lg max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                                <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.06]">
                                  <input
                                    type="text"
                                    value={cannedSearch}
                                    onChange={(e) => setCannedSearch(e.target.value)}
                                    placeholder="Search templates..."
                                    className="w-full bg-transparent border-0 outline-none text-[0.75rem] placeholder:text-slate-400"
                                    autoFocus
                                  />
                                </div>
                                {cannedResponses
                                  .filter((cr) => !cannedSearch || cr.title.toLowerCase().includes(cannedSearch.toLowerCase()) || cr.content.toLowerCase().includes(cannedSearch.toLowerCase()))
                                  .map((cr) => (
                                    <button
                                      key={cr.id ?? cr._id}
                                      type="button"
                                      onClick={() => {
                                        setCommentText((prev) => prev + (prev ? "\n" : "") + cr.content);
                                        setShowCannedPicker(false);
                                        setCannedSearch("");
                                        useCannedResponse(String(cr.id ?? cr._id)).catch(() => {});
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-primary/5 dark:hover:bg-white/[0.04] transition-colors border-b border-slate-50 dark:border-white/[0.03] last:border-0"
                                    >
                                      <div className="text-[0.75rem] font-medium text-slate-700 dark:text-white/80">{cr.title}</div>
                                      <div className="text-[0.6875rem] text-slate-400 dark:text-white/40 truncate">{cr.content}</div>
                                    </button>
                                  ))}
                                {cannedResponses.length === 0 && (
                                  <div className="px-3 py-4 text-center text-[0.75rem] text-slate-400">No templates yet</div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-black/5">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => commentFileInputRef.current?.click()}
                                  className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                                  title="Attach files"
                                >
                                  <i className="ri-attachment-2 text-[0.875rem]" />
                                </button>
                                <input
                                  ref={commentFileInputRef}
                                  type="file"
                                  multiple
                                  accept="image/*,video/*"
                                  onChange={handleCommentFileChange}
                                  className="hidden"
                                />
                                {isAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!cannedResponses.length) {
                                          getCannedResponses().then((r) => setCannedResponses(r.results ?? [])).catch(() => {});
                                        }
                                        setShowCannedPicker(!showCannedPicker);
                                      }}
                                      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                        showCannedPicker ? "text-primary bg-primary/10" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-white/10 dark:hover:text-white"
                                      }`}
                                      title="Quick replies"
                                    >
                                      <i className="ri-booklet-line text-[0.875rem]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIsInternalNote(!isInternalNote)}
                                      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                        isInternalNote
                                          ? "text-amber-600 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400"
                                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-white/10 dark:hover:text-white"
                                      }`}
                                      title={isInternalNote ? "Switch to public reply" : "Switch to internal note"}
                                    >
                                      <i className={isInternalNote ? "ri-lock-line text-[0.875rem]" : "ri-lock-unlock-line text-[0.875rem]"} />
                                    </button>
                                    {commentText.trim().length >= 5 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSaveCannedForm({ title: "", category: "General" });
                                          setShowSaveCannedModal(true);
                                        }}
                                        className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                                        title="Save as template"
                                      >
                                        <i className="ri-save-line text-[0.875rem]" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={handleUpdateAndComment}
                                disabled={updatingTicket || addingComment}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[0.75rem] font-semibold transition-all active:scale-[0.97] disabled:opacity-50 ${
                                  isInternalNote
                                    ? "text-amber-800 bg-amber-200 hover:bg-amber-300 dark:text-amber-100 dark:bg-amber-600 dark:hover:bg-amber-500"
                                    : "text-white bg-primary hover:bg-primary/90"
                                }`}
                              >
                                {updatingTicket || addingComment ? (
                                  <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <i className={isInternalNote ? "ri-lock-line text-[0.7rem]" : "ri-send-plane-2-line text-[0.7rem]"} />
                                    {isInternalNote ? "Add Note" : isAdmin ? "Update & Reply" : "Reply"}
                                  </>
                                )}
                              </button>
                            </div>
                            {commentAttachmentErrors.length > 0 && (
                              <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 border-t border-red-100 dark:border-red-500/10">
                                <p className="text-[0.75rem] text-red-600 dark:text-red-400 mb-0">{commentAttachmentErrors.join(", ")}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Timeline tab */}
                    {detailTab === "timeline" && (
                      <div className="max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}>
                        {selectedTicket.activityLog?.length ? (
                          <div className="relative pl-5 space-y-0">
                            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-white/10" />
                            {[...selectedTicket.activityLog].reverse().map((entry, i) => {
                              const actionLabels: Record<string, { label: string; icon: string; color: string }> = {
                                created: { label: "Ticket created", icon: "ri-add-circle-line", color: "text-success bg-success/10" },
                                status_changed: { label: `Status changed`, icon: "ri-refresh-line", color: "text-info bg-info/10" },
                                priority_changed: { label: `Priority changed`, icon: "ri-arrow-up-down-line", color: "text-warning bg-warning/10" },
                                category_changed: { label: "Category changed", icon: "ri-price-tag-3-line", color: "text-slate-500 bg-slate-100" },
                                assigned: { label: "Assigned", icon: "ri-user-add-line", color: "text-primary bg-primary/10" },
                                comment_added: { label: "Comment added", icon: "ri-chat-1-line", color: "text-slate-600 bg-slate-100" },
                                internal_note: { label: "Internal note added", icon: "ri-lock-line", color: "text-amber-600 bg-amber-100" },
                              };
                              const cfg = actionLabels[entry.action] || { label: entry.action, icon: "ri-circle-line", color: "text-slate-400 bg-slate-100" };
                              return (
                                <div key={i} className="relative flex gap-3 pb-4">
                                  <div className={`absolute -left-5 top-0.5 z-10 w-[15px] h-[15px] rounded-full flex items-center justify-center ${cfg.color}`}>
                                    <i className={`${cfg.icon} text-[0.5rem]`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[0.75rem] font-medium text-slate-700 dark:text-white/80">{cfg.label}</span>
                                      {entry.from && entry.to && (
                                        <span className="text-[0.6875rem] text-slate-400 dark:text-white/40">
                                          {entry.from} <i className="ri-arrow-right-s-line text-[0.6rem]" /> {entry.to}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[0.6875rem] text-slate-500 dark:text-white/50">
                                        {entry.performedBy?.name || entry.performedBy?.email || "System"}
                                      </span>
                                      <span className="text-[0.625rem] text-slate-400 dark:text-white/30">
                                        {entry.createdAt ? formatRelative(entry.createdAt) : ""}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.04] mb-2">
                              <i className="ri-history-line text-[1.125rem] text-slate-300 dark:text-white/20" />
                            </div>
                            <p className="text-[0.8125rem] text-slate-400 dark:text-white/30 mb-0">No activity recorded yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Sidebar */}
              <div className="w-full lg:w-[260px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-black/[0.03]">
                <div className="p-5 space-y-5">
                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30 mb-1.5">Category</p>
                      <div className="flex items-center gap-1.5">
                        <i className="ri-price-tag-3-line text-[0.75rem] text-slate-400" />
                        <span className="text-[0.8125rem] font-medium text-slate-700 dark:text-white/80">{selectedTicket.category ?? "General"}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30 mb-1.5">Created</p>
                      <div className="flex items-center gap-1.5">
                        <i className="ri-calendar-line text-[0.75rem] text-slate-400" />
                        <span className="text-[0.8125rem] font-medium text-slate-700 dark:text-white/80">{formatDate(selectedTicket.createdAt)}</span>
                      </div>
                    </div>

                    {selectedTicket.updatedAt && (
                      <div>
                        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30 mb-1.5">Last Updated</p>
                        <div className="flex items-center gap-1.5">
                          <i className="ri-time-line text-[0.75rem] text-slate-400" />
                          <span className="text-[0.8125rem] font-medium text-slate-700 dark:text-white/80">{formatRelative(selectedTicket.updatedAt)}</span>
                        </div>
                      </div>
                    )}

                    {selectedTicket.assignedTo && (
                      <div>
                        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30 mb-1.5">Assigned To</p>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-[0.55rem] font-bold">
                            {(selectedTicket.assignedTo.name ?? selectedTicket.assignedTo.email ?? "?")[0]?.toUpperCase()}
                          </span>
                          <span className="text-[0.8125rem] font-medium text-slate-700 dark:text-white/80">
                            {selectedTicket.assignedTo.name || selectedTicket.assignedTo.email}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedTicket.candidate && (
                      <div>
                        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30 mb-1.5">Candidate</p>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-[0.55rem] font-bold">
                            {(selectedTicket.candidate.fullName ?? "?")[0]?.toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[0.8125rem] font-medium text-slate-700 dark:text-white/80 truncate mb-0">{selectedTicket.candidate.fullName}</p>
                            {selectedTicket.candidate.email && (
                              <p className="text-[0.6875rem] text-slate-400 dark:text-white/35 truncate mb-0">{selectedTicket.candidate.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status timeline */}
                  <div>
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30 mb-2.5">Status</p>
                    <div className="space-y-0">
                      {(["Open", "In Progress", "Resolved", "Closed"] as const).map((s, idx) => {
                        const steps = ["Open", "In Progress", "Resolved", "Closed"];
                        const currentIdx = steps.indexOf(selectedTicket.status);
                        const isActive = s === selectedTicket.status;
                        const isPast = idx < currentIdx;
                        const sColor = statusColorMap[s] || "#6366f1";
                        return (
                          <div key={s} className="flex items-start gap-2.5">
                            <div className="flex flex-col items-center">
                              <span
                                className="flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all"
                                style={{
                                  borderColor: isActive || isPast ? sColor : "#e2e8f0",
                                  background: isActive ? sColor : isPast ? `${sColor}20` : "white",
                                }}
                              >
                                {isPast && <i className="ri-check-line text-[0.5rem]" style={{ color: sColor }} />}
                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              {idx < 3 && (
                                <span
                                  className="w-px h-4"
                                  style={{ background: isPast ? sColor : "#e2e8f0" }}
                                />
                              )}
                            </div>
                            <span
                              className={"text-[0.75rem] pt-0.5 " + (isActive ? "font-semibold" : isPast ? "font-medium" : "font-normal")}
                              style={{ color: isActive ? sColor : isPast ? "#475569" : "#94a3b8" }}
                            >
                              {s}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SLA Indicators */}
                  {selectedTicket.sla && isAdmin && (
                    <div>
                      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30 mb-2.5">SLA</p>
                      <div className="space-y-2.5">
                        {/* First Response */}
                        {(() => {
                          const fr = selectedTicket.sla.firstResponse;
                          const pct = Math.min(100, (fr.elapsedMin / fr.targetMin) * 100);
                          const breached = fr.breached && !fr.met;
                          const met = fr.met && !fr.breached;
                          const color = met ? "#10b981" : breached ? "#ef4444" : pct > 75 ? "#f59e0b" : "#6366f1";
                          const hrs = Math.floor(fr.targetMin / 60);
                          const mins = fr.targetMin % 60;
                          return (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[0.6875rem] font-medium text-slate-600 dark:text-white/60">First Response</span>
                                {fr.met ? (
                                  <span className="text-[0.6rem] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                    <i className="ri-check-line" /> Met
                                  </span>
                                ) : breached ? (
                                  <span className="text-[0.6rem] font-bold text-red-500 flex items-center gap-0.5">
                                    <i className="ri-error-warning-line" /> Breached
                                  </span>
                                ) : (
                                  <span className="text-[0.6rem] text-slate-400">{hrs}h{mins > 0 ? ` ${mins}m` : ""} target</span>
                                )}
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                        {/* Resolution */}
                        {(() => {
                          const rs = selectedTicket.sla.resolution;
                          const pct = Math.min(100, (rs.elapsedMin / rs.targetMin) * 100);
                          const breached = rs.breached && !rs.met;
                          const met = rs.met && !rs.breached;
                          const color = met ? "#10b981" : breached ? "#ef4444" : pct > 75 ? "#f59e0b" : "#6366f1";
                          const hrs = Math.floor(rs.targetMin / 60);
                          return (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[0.6875rem] font-medium text-slate-600 dark:text-white/60">Resolution</span>
                                {rs.met ? (
                                  <span className="text-[0.6rem] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                    <i className="ri-check-line" /> Resolved
                                  </span>
                                ) : breached ? (
                                  <span className="text-[0.6rem] font-bold text-red-500 flex items-center gap-0.5">
                                    <i className="ri-error-warning-line" /> Breached
                                  </span>
                                ) : (
                                  <span className="text-[0.6rem] text-slate-400">{hrs}h target</span>
                                )}
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Admin Controls */}
                  {isAdmin && (
                    <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.06] space-y-3">
                      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-primary/70 mb-0 flex items-center gap-1">
                        <i className="ri-shield-star-line text-[0.7rem]" />
                        Admin Controls
                      </p>
                      <div>
                        <label className="block text-[0.6875rem] font-medium text-slate-500 dark:text-white/40 mb-1">Status</label>
                        <select
                          value={updateForm.status}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
                          className="form-control !rounded-lg !text-[0.8125rem] !py-1.5 !border-slate-200 dark:!border-white/10"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-medium text-slate-500 dark:text-white/40 mb-1">Priority</label>
                        <select
                          value={updateForm.priority}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, priority: e.target.value }))}
                          className="form-control !rounded-lg !text-[0.8125rem] !py-1.5 !border-slate-200 dark:!border-white/10"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ═══════ ASSIGN MODAL ═══════ */}
      {canAssign && showAssignModal && assignTicket && (
        <div className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[10vh]" onClick={closeAssignModal}>
          <div
            className="w-full max-w-md rounded-md bg-white shadow-lg dark:bg-bodybg animate-[fadeIn_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-defaultborder px-5 py-4">
              <div className="flex items-center justify-between">
                <h6 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
                  <i className="ri-user-settings-line text-primary" />
                  Assign Ticket
                </h6>
                <button type="button" onClick={closeAssignModal} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !rounded-full">
                  <i className="ri-close-line" />
                </button>
              </div>
              <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-1 mb-0">
                {assignTicket.ticketId ?? String(assignTicket.id ?? assignTicket._id).slice(-8).toUpperCase()} — {assignTicket.title}
              </p>
            </div>

            <div className="p-5">
              <label className="form-label mb-2 text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white">Select team member</label>
              {loadingAdminUsers ? (
                <div className="flex items-center gap-2 rounded-md border border-defaultborder px-3 py-6 justify-center text-[0.8125rem] text-[#8c9097]">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading team members...
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border border-defaultborder p-2">
                  <button
                    type="button"
                    onClick={() => setAssignSelectedUserId("")}
                    className={"flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[0.8125rem] transition-colors " + (assignSelectedUserId === "" ? "bg-primary/10 text-primary font-medium" : "text-defaulttextcolor dark:text-white hover:bg-gray-50 dark:hover:bg-black/10")}
                  >
                    <span className="avatar avatar-xs avatar-rounded bg-gray-200 dark:bg-white/10 text-gray-500 text-[0.55rem]">
                      <i className="ri-user-unfollow-line text-[0.65rem]" />
                    </span>
                    Unassigned
                    {assignSelectedUserId === "" && <i className="ri-check-line ms-auto text-primary" />}
                  </button>
                  {adminUsersList.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setAssignSelectedUserId(u.id)}
                      className={"flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[0.8125rem] transition-colors " + (assignSelectedUserId === u.id ? "bg-primary/10 text-primary font-medium" : "text-defaulttextcolor dark:text-white hover:bg-gray-50 dark:hover:bg-black/10")}
                    >
                      <span className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary text-[0.55rem] font-bold">
                        {((u.name || u.email)[0] || "?").toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="mb-0 truncate">{u.name || u.email}</p>
                        {u.subRole && <p className="mb-0 text-[0.6875rem] text-[#8c9097] dark:text-white/50">{u.subRole}</p>}
                      </div>
                      {assignSelectedUserId === u.id && <i className="ri-check-line ms-auto text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-defaultborder px-5 py-4">
              <button type="button" onClick={closeAssignModal} className="ti-btn ti-btn-light">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleQuickAssign(assignTicket, assignSelectedUserId);
                  closeAssignModal();
                }}
                disabled={assigningTicket || loadingAdminUsers || assignSelectedUserId === (assignTicket.assignedTo?.id ?? assignTicket.assignedTo?._id ?? "")}
                className="ti-btn ti-btn-primary ti-btn-wave"
              >
                {assigningTicket ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </span>
                ) : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Save as Canned Response Modal */}
      {showSaveCannedModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowSaveCannedModal(false)}>
          <div className="bg-white dark:bg-bodybg rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 dark:border-white/[0.08]">
              <h6 className="text-[0.9375rem] font-semibold text-slate-800 dark:text-white">Save as Quick Reply Template</h6>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[0.75rem] font-medium text-slate-600 dark:text-white/60 mb-1">Template Name</label>
                <input
                  type="text"
                  value={saveCannedForm.title}
                  onChange={(e) => setSaveCannedForm((f) => ({ ...f, title: e.target.value }))}
                  className="form-control !text-[0.8125rem]"
                  placeholder="e.g. Visa Processing Update"
                />
              </div>
              <div>
                <label className="block text-[0.75rem] font-medium text-slate-600 dark:text-white/60 mb-1">Category</label>
                <input
                  type="text"
                  value={saveCannedForm.category}
                  onChange={(e) => setSaveCannedForm((f) => ({ ...f, category: e.target.value }))}
                  className="form-control !text-[0.8125rem]"
                  placeholder="General"
                />
              </div>
              <div>
                <label className="block text-[0.75rem] font-medium text-slate-600 dark:text-white/60 mb-1">Content Preview</label>
                <div className="rounded-lg bg-slate-50 dark:bg-black/10 p-3 text-[0.8125rem] text-slate-600 dark:text-white/70 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {commentText}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-white/[0.08]">
              <button type="button" onClick={() => setShowSaveCannedModal(false)} className="ti-btn ti-btn-light">Cancel</button>
              <button
                type="button"
                disabled={!saveCannedForm.title.trim()}
                onClick={async () => {
                  try {
                    await createCannedResponse({ title: saveCannedForm.title.trim(), content: commentText.trim(), category: saveCannedForm.category.trim() || "General" });
                    setShowSaveCannedModal(false);
                    getCannedResponses().then((r) => setCannedResponses(r.results ?? [])).catch(() => {});
                    await Swal.fire({ icon: "success", title: "Template Saved", timer: 1500, showConfirmButton: false });
                  } catch {
                    await Swal.fire({ icon: "error", title: "Failed", text: "Could not save template." });
                  }
                }}
                className="ti-btn ti-btn-primary"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default SupportTicketsPage;
