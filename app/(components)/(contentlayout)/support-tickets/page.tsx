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
  type SupportTicket,
  type TicketFilters,
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

  const [updateForm, setUpdateForm] = useState({ status: "", priority: "", category: "", assignedTo: "" });
  const [updatingTicket, setUpdatingTicket] = useState(false);

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
    return params;
  }, [currentPage, limit, sortBy, statusFilter, priorityFilter, categoryFilter]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();
      const data = await getAllSupportTickets(params);
      let ticketsData = data?.results ?? [];
      setTotalPages(data?.totalPages ?? 1);
      setTotalResults(data?.totalResults ?? 0);

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        ticketsData = ticketsData.filter((t: SupportTicket) => {
          const tid = t.id ?? t._id;
          const ticketIdStr = (t.ticketId ?? String(tid).slice(-8)).toUpperCase();
          const title = (t.title ?? "").toLowerCase();
          const desc = (t.description ?? "").toLowerCase();
          return title.includes(query) || desc.includes(query) || ticketIdStr.toLowerCase().includes(query);
        });
        setTotalResults(ticketsData.length);
        setTotalPages(Math.ceil(ticketsData.length / limit));
      }
      setTickets(ticketsData);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to fetch tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, searchQuery, limit]);

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
      await addCommentToTicket(String(ticketId), commentText.trim(), commentAttachments.length ? commentAttachments : undefined);
      setCommentText("");
      setCommentAttachments([]);
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
        await addCommentToTicket(String(ticketId), commentText.trim(), commentAttachments.length ? commentAttachments : undefined);
      }
      setCommentText("");
      setCommentAttachments([]);
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
      await updateSupportTicket(String(ticketId), { assignedTo: assignedToUserId || undefined });
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

  const showCreateBtn = canCreate || (user?.role === "user" && canView);
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                        (user?.role === "user" && candidateId && ticketCandidateId === candidateId) ||
                        ticketCreatedById === user?.id ||
                        ticketCandidateId === user?.id;
                      const sc = getStatusConfig(ticket.status || "");
                      const pc = getPriorityConfig(ticket.priority || "");
                      const displayId = ticket.ticketId ?? String(tid).slice(-8).toUpperCase();

                      return (
                        <tr
                          key={String(tid)}
                          className="border-b border-defaultborder dark:border-defaultborder/10 hover:bg-gray-50/50 dark:hover:bg-light/5 transition-colors"
                        >
                          <td className="!py-3">
                            {canViewTicket && canView ? (
                              <button
                                type="button"
                                onClick={() => openTicketModal(ticket)}
                                className="font-mono text-[0.75rem] font-semibold text-primary hover:underline"
                              >
                                {displayId}
                              </button>
                            ) : (
                              <span className="font-mono text-[0.75rem] font-medium text-defaulttextcolor dark:text-white">
                                {displayId}
                              </span>
                            )}
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
                          <td className="!py-3 !text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canViewTicket && canView && (
                                <button
                                  type="button"
                                  onClick={() => openTicketModal(ticket)}
                                  className="ti-btn ti-btn-icon ti-btn-sm ti-btn-soft-primary ti-btn-wave"
                                  title="View Details"
                                >
                                  <i className="ri-eye-line" />
                                </button>
                              )}
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
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[3vh]" onClick={closeTicketModal}>
          <div
            className="w-full max-w-4xl rounded-md bg-white shadow-lg dark:bg-bodybg animate-[fadeIn_0.2s_ease] mb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-defaultborder px-5 py-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-primary/10 text-primary font-mono !text-[0.6875rem]">
                      {selectedTicket.ticketId ?? String(selectedTicket.id ?? selectedTicket._id).slice(-8).toUpperCase()}
                    </span>
                    <span className={"badge !rounded-full !text-[0.6875rem] " + getStatusConfig(selectedTicket.status || "").badge}>
                      {selectedTicket.status}
                    </span>
                    <span className={"badge !rounded-full !text-[0.6875rem] " + getPriorityConfig(selectedTicket.priority || "").badge}>
                      <i className={getPriorityConfig(selectedTicket.priority || "").icon + " me-1 text-[0.55rem]"} />
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <h6 className="text-[1rem] font-semibold text-defaulttextcolor dark:text-white">{selectedTicket.title}</h6>
                </div>
                <button type="button" onClick={closeTicketModal} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light !rounded-full ms-3">
                  <i className="ri-close-line" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-md bg-gray-50/70 dark:bg-black/10 p-3">
                  <p className="text-[0.6875rem] font-medium text-[#8c9097] dark:text-white/50 mb-1">Category</p>
                  <p className="text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white mb-0">{selectedTicket.category ?? "General"}</p>
                </div>
                <div className="rounded-md bg-gray-50/70 dark:bg-black/10 p-3">
                  <p className="text-[0.6875rem] font-medium text-[#8c9097] dark:text-white/50 mb-1">Created</p>
                  <p className="text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white mb-0">{formatDate(selectedTicket.createdAt)}</p>
                </div>
                {selectedTicket.assignedTo && (
                  <div className="rounded-md bg-gray-50/70 dark:bg-black/10 p-3">
                    <p className="text-[0.6875rem] font-medium text-[#8c9097] dark:text-white/50 mb-1">Assigned To</p>
                    <div className="flex items-center gap-2">
                      <span className="avatar avatar-xs avatar-rounded bg-success/10 text-success text-[0.55rem] font-bold">
                        {(selectedTicket.assignedTo.name ?? selectedTicket.assignedTo.email ?? "?")[0]?.toUpperCase()}
                      </span>
                      <span className="text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white">
                        {selectedTicket.assignedTo.name || selectedTicket.assignedTo.email}
                      </span>
                    </div>
                  </div>
                )}
                {selectedTicket.updatedAt && (
                  <div className="rounded-md bg-gray-50/70 dark:bg-black/10 p-3">
                    <p className="text-[0.6875rem] font-medium text-[#8c9097] dark:text-white/50 mb-1">Last Updated</p>
                    <p className="text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white mb-0">{formatRelative(selectedTicket.updatedAt)}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h6 className="text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white mb-2">Description</h6>
                <div className="rounded-md bg-gray-50/70 dark:bg-black/10 p-4 text-[0.8125rem] text-defaulttextcolor dark:text-white/80 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div>
                  <h6 className="text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white mb-2">
                    Attachments ({selectedTicket.attachments.length})
                  </h6>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {selectedTicket.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 rounded-md border border-defaultborder p-2.5 transition-all hover:border-primary/40 hover:bg-primary/[0.02]"
                      >
                        <i className="ri-attachment-2 text-[#8c9097] group-hover:text-primary" />
                        <span className="truncate text-[0.75rem] text-defaulttextcolor dark:text-white group-hover:text-primary">{att.originalName}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin: Update fields */}
              {isAdmin && (
                <div className="rounded-md border border-primary/20 bg-primary/[0.02] p-4">
                  <h6 className="flex items-center gap-2 text-[0.8125rem] font-semibold text-primary mb-3">
                    <i className="ri-settings-3-line" />
                    Admin Controls
                  </h6>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="form-label mb-1 text-[0.75rem] font-medium text-[#8c9097]">Status</label>
                      <select
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
                        className="form-control !rounded-md !text-[0.8125rem]"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label mb-1 text-[0.75rem] font-medium text-[#8c9097]">Priority</label>
                      <select
                        value={updateForm.priority}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, priority: e.target.value }))}
                        className="form-control !rounded-md !text-[0.8125rem]"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div>
                <h6 className="flex items-center gap-2 text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white mb-3">
                  <i className="ri-chat-3-line text-[#8c9097]" />
                  Comments
                  <span className="badge bg-light text-default rounded-full text-[0.6875rem]">
                    {selectedTicket.comments?.length ?? 0}
                  </span>
                </h6>
                <div className="mb-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {selectedTicket.comments?.length ? (
                    selectedTicket.comments.map((c, i) => (
                      <div
                        key={i}
                        className={"rounded-md p-3 " + (c.isAdminComment ? "border-l-[3px] border-l-primary bg-primary/[0.03]" : "border-l-[3px] border-l-defaultborder bg-gray-50/50 dark:bg-black/10")}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={"avatar avatar-xs avatar-rounded text-[0.5rem] font-bold " + (c.isAdminComment ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-white/60")}>
                            {((c.commentedBy?.name ?? c.commentedBy?.email ?? "?")[0] || "?").toUpperCase()}
                          </span>
                          <span className="text-[0.75rem] font-medium text-defaulttextcolor dark:text-white">
                            {c.commentedBy?.name || c.commentedBy?.email}
                          </span>
                          {c.isAdminComment && (
                            <span className="badge bg-primary/10 text-primary !text-[0.6rem] !py-0 !px-1.5">Admin</span>
                          )}
                          <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 ms-auto">
                            {formatRelative(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-[0.8125rem] text-defaulttextcolor/90 dark:text-white/80 mb-0 pl-7 leading-relaxed">{c.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center">
                      <i className="ri-chat-off-line text-[1.5rem] text-[#8c9097]/40" />
                      <p className="mt-1 text-[0.8125rem] text-[#8c9097] dark:text-white/50">No comments yet</p>
                    </div>
                  )}
                </div>

                {selectedTicket.status !== "Closed" && (
                  <div className="rounded-md border border-defaultborder p-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      className="form-control !rounded-md !border-0 !bg-transparent !p-0 !shadow-none !text-[0.8125rem] focus:!ring-0 resize-none"
                      maxLength={2000}
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-defaultborder mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => commentFileInputRef.current?.click()}
                          className="ti-btn ti-btn-icon ti-btn-xs ti-btn-light !rounded-full"
                          title="Attach files"
                        >
                          <i className="ri-attachment-2" />
                        </button>
                        <input
                          ref={commentFileInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleCommentFileChange}
                          className="hidden"
                        />
                        {commentAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {commentAttachments.map((f, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-black/20 px-2 py-0.5 text-[0.6875rem] text-defaulttextcolor dark:text-white/70">
                                {f.name.length > 15 ? f.name.slice(0, 12) + "..." : f.name}
                                <button type="button" onClick={() => setCommentAttachments((a) => a.filter((_, j) => j !== i))} className="hover:text-danger">
                                  <i className="ri-close-line text-[0.6rem]" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleUpdateAndComment}
                        disabled={updatingTicket || addingComment}
                        className="ti-btn ti-btn-primary ti-btn-sm ti-btn-wave !text-[0.75rem]"
                      >
                        {updatingTicket || addingComment ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Sending...
                          </span>
                        ) : isAdmin ? "Update & Comment" : "Add Comment"}
                      </button>
                    </div>
                    {commentAttachmentErrors.length > 0 && (
                      <p className="mt-2 text-[0.75rem] text-danger">{commentAttachmentErrors.join(", ")}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-defaultborder px-5 py-3">
              <button type="button" onClick={closeTicketModal} className="ti-btn ti-btn-light">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
    </Fragment>
  );
};

export default SupportTicketsPage;
