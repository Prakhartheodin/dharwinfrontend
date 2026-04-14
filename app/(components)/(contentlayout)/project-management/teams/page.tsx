"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Swal from "sweetalert2";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import {
  TEAM_GROUP_LABELS,
  type TeamGroup,
  type TeamMember,
  createTeamMember,
  deleteTeamMember,
  listTeamMembers,
  updateTeamMember,
} from "@/shared/lib/api/teams";
import {
  type TeamGroup as ApiTeamGroup,
  listTeamGroups,
  createTeamGroup,
  updateTeamGroup,
  deleteTeamGroup,
} from "@/shared/lib/api/projectTeams";
import { listCandidates, type CandidateListItem } from "@/shared/lib/api/candidates";

const Select = dynamic(() => import("react-select"), { ssr: false });

interface TeamMemberFormState {
  name: string;
  email: string;
  memberSinceLabel: string;
  projectsCount: string;
  position: string;
  coverImageUrl: string;
  avatarImageUrl: string;
  teamGroup: TeamGroup;
  teamId: string;
  onlineStatus: "online" | "offline";
  lastSeenLabel: string;
  isStarred: boolean;
}

const EMPTY_FORM: TeamMemberFormState = {
  name: "",
  email: "",
  memberSinceLabel: "",
  projectsCount: "",
  position: "",
  coverImageUrl: "",
  avatarImageUrl: "",
  teamGroup: "team_ui",
  teamId: "",
  onlineStatus: "online",
  lastSeenLabel: "",
  isStarred: false,
};

/** Backend toJSON may return id (not _id); use when reading team id from API or populated ref */
function getTeamIdFromRef(teamId: string | { _id?: string; id?: string } | undefined): string {
  if (!teamId) return "";
  if (typeof teamId === "string") return teamId;
  return (teamId as { _id?: string; id?: string })._id ?? (teamId as { id?: string }).id ?? "";
}

function getTeamGroupId(team: ApiTeamGroup & { id?: string }): string {
  return team.id ?? team._id ?? "";
}

/** Backend toJSON may return id instead of _id; use when calling APIs or for keys */
function getMemberId(member: TeamMember): string {
  return (member as TeamMember & { id?: string }).id ?? member._id ?? "";
}

function mapMemberToForm(member: TeamMember): TeamMemberFormState {
  const teamId = getTeamIdFromRef(member.teamId);
  return {
    name: member.name ?? "",
    email: member.email ?? "",
    memberSinceLabel: member.memberSinceLabel ?? "",
    projectsCount: String(member.projectsCount ?? 0),
    position: member.position ?? "",
    coverImageUrl: member.coverImageUrl ?? "",
    avatarImageUrl: member.avatarImageUrl ?? "",
    teamGroup: member.teamGroup ?? "team_ui",
    teamId,
    onlineStatus: member.onlineStatus ?? "online",
    lastSeenLabel: member.lastSeenLabel ?? "",
    isStarred: !!member.isStarred,
  };
}

function mapFormToPayload(form: TeamMemberFormState) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    memberSinceLabel: form.memberSinceLabel.trim() || undefined,
    projectsCount: form.projectsCount ? Number(form.projectsCount) : undefined,
    position: form.position.trim() || undefined,
    coverImageUrl: form.coverImageUrl.trim() || undefined,
    avatarImageUrl: form.avatarImageUrl.trim() || undefined,
    teamGroup: form.teamGroup,
    teamId: form.teamId.trim() || undefined,
    onlineStatus: form.onlineStatus,
    lastSeenLabel: form.lastSeenLabel.trim() || undefined,
    isStarred: form.isStarred,
  };
}

interface TeamMemberCardProps {
  member: TeamMember;
  onMoveTo: (member: TeamMember) => void;
  onEdit: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
  onToggleStar: (member: TeamMember) => void;
}

function TeamMemberCard({
  member,
  onMoveTo,
  onEdit,
  onDelete,
  onToggleStar,
}: TeamMemberCardProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropdownRef.current) return;
    const menu = dropdownRef.current.querySelector(".hs-dropdown-menu") as HTMLElement;
    const button = dropdownRef.current.querySelector("button") as HTMLElement;
    if (!menu || !button) return;

    const isHidden = menu.classList.contains("hidden");

    document.querySelectorAll(".hs-dropdown-menu").forEach((otherMenu) => {
      if (otherMenu !== menu) {
        const otherMenuEl = otherMenu as HTMLElement;
        otherMenuEl.classList.add("hidden");
        otherMenuEl.style.cssText =
          "opacity: 0 !important; pointer-events: none !important; display: none !important;";
        const otherButton = otherMenuEl.closest(".hs-dropdown")?.querySelector("button");
        if (otherButton) {
          otherButton.setAttribute("aria-expanded", "false");
        }
      }
    });

    if (isHidden) {
      menu.classList.remove("hidden");
      menu.style.cssText =
        "opacity: 1 !important; pointer-events: auto !important; display: block !important;";
      button.setAttribute("aria-expanded", "true");
    } else {
      menu.classList.add("hidden");
      menu.style.cssText =
        "opacity: 0 !important; pointer-events: none !important; display: none !important;";
      button.setAttribute("aria-expanded", "false");
    }
  };

  const closeDropdown = () => {
    if (!dropdownRef.current) return;
    const menu = dropdownRef.current.querySelector(".hs-dropdown-menu") as HTMLElement;
    const button = dropdownRef.current.querySelector("button") as HTMLElement;
    if (menu) {
      menu.classList.add("hidden");
      menu.style.cssText =
        "opacity: 0 !important; pointer-events: none !important; display: none !important;";
    }
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        const menu = dropdownRef.current.querySelector(".hs-dropdown-menu") as HTMLElement;
        const button = dropdownRef.current.querySelector("button") as HTMLElement;
        if (menu) {
          menu.classList.add("hidden");
          menu.style.cssText =
            "opacity: 0 !important; pointer-events: none !important; display: none !important;";
          if (button) {
            button.setAttribute("aria-expanded", "false");
          }
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMoveTo = () => {
    closeDropdown();
    onMoveTo(member);
  };

  const handleEdit = () => {
    closeDropdown();
    onEdit(member);
  };

  const handleDelete = () => {
    closeDropdown();
    onDelete(member);
  };

  const cover = member.coverImageUrl || "../../assets/images/media/team-covers/1.jpg";
  const avatar = member.avatarImageUrl || "../../assets/images/faces/11.jpg";

  return (
    <div className="xxl:col-span-4 xl:col-span-6 lg:col-span-6 md:col-span-6 sm:col-span-12 col-span-12">
      <div className="box team-member-card">
        <div className="teammember-cover-image">
          <img src={cover} className="card-img-top" alt={member.name} />
          <span className="avatar avatar-xl avatar-rounded">
            <img src={avatar} alt={member.name} />
          </span>
          <button
            type="button"
            aria-label="star"
            onClick={() => onToggleStar(member)}
            className={`team-member-star ${member.isStarred ? "text-warning" : "text-white"}`}
          >
            <i className="ri-star-fill text-[1rem]" />
          </button>
        </div>
        <div className="box-body !p-0">
          <div className="flex flex-wrap align-item-center sm:mt-0 mt-[3rem] justify-between border-b border-dashed dark:border-defaultborder/10 p-4">
            <div className="team-member-details flex-grow">
              <p className="mb-0 font-semibold text-[1rem] text-truncate">
                <span>{member.name}</span>
              </p>
              <p className="mb-0 text-[0.75rem] text-[#8c9097] dark:text-white/50 text-truncate">
                {member.email}
              </p>
            </div>
            <div className="hs-dropdown ti-dropdown" ref={dropdownRef}>
              <button
                className="ti-btn ti-btn-sm ti-btn-light"
                type="button"
                aria-label="button"
                aria-expanded="false"
                onClick={toggleDropdown}
              >
                <i className="ti ti-dots-vertical" />
              </button>
              <ul className="ti-dropdown-menu hs-dropdown-menu hidden">
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                    onClick={handleMoveTo}
                  >
                    Move To
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                    onClick={handleEdit}
                  >
                    Edit
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left text-danger"
                    onClick={handleDelete}
                  >
                    Remove
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="team-member-stats sm:flex items-center justify-evenly">
            <div className="text-center p-4 w-full">
              <p className="font-semibold mb-0">Member Since</p>
              <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                {member.memberSinceLabel || "—"}
              </span>
            </div>
            <div className="text-center p-4 w-full">
              <p className="font-semibold mb-0">Projects</p>
              <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                {member.projectsCount ?? 0}
              </span>
            </div>
            <div className="text-center p-4 w-full">
              <p className="font-semibold mb-0">Position</p>
              <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                {member.position || "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="box-footer border-block-start-dashed dark:border-defaultborder/10 text-center">
          <div className="btn-list">
            <button
              type="button"
              aria-label="button"
              className="ti-btn ti-btn-sm ti-btn-light !me-[0.375rem]"
            >
              <i className="ri-facebook-line font-bold" />
            </button>
            <button
              type="button"
              aria-label="button"
              className="ti-btn ti-btn-sm ti-btn-secondary !me-[0.375rem]"
            >
              <i className="ri-twitter-x-line font-bold" />
            </button>
            <button
              type="button"
              aria-label="button"
              className="ti-btn ti-btn-sm ti-btn-warning me-[0.375rem]"
            >
              <i className="ri-instagram-line font-bold" />
            </button>
            <button
              type="button"
              aria-label="button"
              className="ti-btn ti-btn-sm ti-btn-success me-[0.375rem]"
            >
              <i className="ri-github-line font-bold" />
            </button>
            <button
              type="button"
              aria-label="button"
              className="ti-btn ti-btn-sm ti-btn-danger"
            >
              <i className="ri-youtube-line font-bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TeamMemberFormModalProps {
  open: boolean;
  isEdit: boolean;
  form: TeamMemberFormState;
  teamOptions: { value: string; label: string }[];
  candidates: { id: string; name: string; email: string }[];
  onChange: (updates: Partial<TeamMemberFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

function TeamMemberFormModal({
  open,
  isEdit,
  form,
  teamOptions,
  candidates,
  onChange,
  onClose,
  onSubmit,
  submitting,
}: TeamMemberFormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[96vw] max-w-xl max-h-[92vh] flex flex-col">
        <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-defaultborder">
          <h6 className="modal-title">
            {isEdit ? "Edit Team Member" : "Create Team Member"}
          </h6>
          <button
            type="button"
            className="ti-modal-close-btn ti-btn ti-btn-sm ti-btn-light"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <i className="ri-close-line" />
          </button>
        </div>
        <div className="ti-modal-body px-4 py-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-12 gap-4">
            <div className="xl:col-span-12 col-span-12">
              <label htmlFor="member-candidate" className="form-label">
                Candidate
              </label>
              <Select
                inputId="member-candidate"
                classNamePrefix="Select2"
                className="basic-single-select"
                menuPlacement="auto"
                options={candidates.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.email})`,
                }))}
                value={
                  form.email
                    ? (() => {
                        const match = candidates.find((c) => c.email === form.email);
                        if (match) {
                          return {
                            value: match.id,
                            label: `${match.name} (${match.email})`,
                          };
                        }
                        return null;
                      })()
                    : null
                }
                placeholder={
                  candidates.length ? "Select candidate" : "No candidates available"
                }
                onChange={(opt) => {
                  const option = opt as { value: string; label: string } | null;
                  if (!option) {
                    onChange({ name: "", email: "" });
                    return;
                  }
                  const cand = candidates.find((c) => c.id === option.value);
                  onChange({
                    name: cand?.name ?? form.name,
                    email: cand?.email ?? form.email,
                  });
                }}
                isClearable
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="member-since" className="form-label">
                Member Since (label)
              </label>
              <input
                id="member-since"
                type="text"
                className="form-control"
                placeholder="e.g. 16 Months"
                value={form.memberSinceLabel}
                onChange={(e) => onChange({ memberSinceLabel: e.target.value })}
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="member-projects" className="form-label">
                Projects
              </label>
              <input
                id="member-projects"
                type="number"
                min={0}
                className="form-control"
                placeholder="e.g. 45"
                value={form.projectsCount}
                onChange={(e) => onChange({ projectsCount: e.target.value })}
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="member-position" className="form-label">
                Position
              </label>
              <input
                id="member-position"
                type="text"
                className="form-control"
                placeholder="e.g. Member, Associate"
                value={form.position}
                onChange={(e) => onChange({ position: e.target.value })}
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label className="form-label">Team</label>
              <Select
                classNamePrefix="Select2"
                className="basic-multi-select"
                menuPlacement="auto"
                value={
                  form.teamId
                    ? teamOptions.find((o) => o.value === form.teamId) ?? {
                        value: form.teamId,
                        label: form.teamId,
                      }
                    : teamOptions.length > 0
                      ? { value: teamOptions[0].value, label: teamOptions[0].label }
                      : null
                }
                options={teamOptions}
                onChange={(opt) => {
                  const val = (opt as { value: string } | null)?.value ?? "";
                  onChange({ teamId: val });
                }}
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label className="form-label">Status</label>
              <Select
                classNamePrefix="Select2"
                className="basic-multi-select"
                menuPlacement="auto"
                value={{
                  value: form.onlineStatus,
                  label:
                    form.onlineStatus === "online"
                      ? "Online"
                      : "Offline",
                }}
                options={[
                  { value: "online", label: "Online" },
                  { value: "offline", label: "Offline" },
                ]}
                onChange={(opt) =>
                  onChange({
                    onlineStatus:
                      (opt as { value: "online" | "offline" } | null)?.value ??
                      "online",
                  })
                }
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label htmlFor="member-lastseen" className="form-label">
                Last Seen Label
              </label>
              <input
                id="member-lastseen"
                type="text"
                className="form-control"
                placeholder="e.g. 8 min"
                value={form.lastSeenLabel}
                onChange={(e) => onChange({ lastSeenLabel: e.target.value })}
              />
            </div>
            <div className="xl:col-span-6 col-span-12 flex items-end gap-2">
              <div className="form-check">
                <input
                  id="member-starred"
                  type="checkbox"
                  className="form-check-input"
                  checked={form.isStarred}
                  onChange={(e) => onChange({ isStarred: e.target.checked })}
                />
                <label htmlFor="member-starred" className="form-check-label">
                  Starred
                </label>
              </div>
            </div>
            <div className="xl:col-span-12 col-span-12">
              <label htmlFor="member-cover" className="form-label">
                Cover Image URL
              </label>
              <input
                id="member-cover"
                type="text"
                className="form-control"
                placeholder="Enter cover image URL"
                value={form.coverImageUrl}
                onChange={(e) => onChange({ coverImageUrl: e.target.value })}
              />
            </div>
            <div className="xl:col-span-12 col-span-12">
              <label htmlFor="member-avatar" className="form-label">
                Avatar Image URL
              </label>
              <input
                id="member-avatar"
                type="text"
                className="form-control"
                placeholder="Enter avatar image URL"
                value={form.avatarImageUrl}
                onChange={(e) => onChange({ avatarImageUrl: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="ti-modal-footer flex items-center justify-end gap-2 px-4 py-3 border-t border-defaultborder">
          <button
            type="button"
            className="ti-btn ti-btn-light"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary-full"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TeamsPage = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamGroups, setTeamGroups] = useState<ApiTeamGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formIsEdit, setFormIsEdit] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TeamMemberFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createTeamOpen, setCreateTeamOpen] = useState<boolean>(false);
  const [createTeamName, setCreateTeamName] = useState<string>("");
  const [createTeamSubmitting, setCreateTeamSubmitting] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<
    { id: string; name: string; email: string }[]
  >([]);

  const PAGE_SIZE = 12;
  const teamOptions = useMemo(
    () => teamGroups.map((t) => ({ value: getTeamGroupId(t), label: t.name || getTeamGroupId(t) })),
    [teamGroups]
  );

  const fetchMembers = useCallback(
    async (params?: { page?: number; search?: string }) => {
      setLoading(true);
      try {
        const result = await listTeamMembers({
          search: params?.search ?? (searchQuery || undefined),
          page: params?.page ?? page,
          limit: PAGE_SIZE,
        });
        setMembers(result.results ?? []);
        setTotalPages(result.totalPages ?? 0);
        setTotalResults(result.totalResults ?? 0);
        if (params?.page !== undefined) {
          setPage(params.page);
        }
      } catch {
        setMembers([]);
        setTotalPages(0);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, page]
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const fetchTeamGroups = useCallback(async () => {
    try {
      const res = await listTeamGroups({ limit: 200 });
      setTeamGroups(res.results ?? []);
    } catch {
      setTeamGroups([]);
    }
  }, []);

  useEffect(() => {
    fetchTeamGroups();
    // Load candidates for team member selection (team members must be candidates)
    listCandidates({ limit: 500 })
      .then((res) => {
        const list = (res.results ?? []).map((c: CandidateListItem) => ({
          id: (c.id ?? c._id) as string,
          name: c.fullName,
          email: c.email,
        }));
        setCandidates(list);
      })
      .catch(() => setCandidates([]));
  }, [fetchTeamGroups]);

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    setSearchQuery(trimmed);
    setPage(1);
    fetchMembers({ page: 1, search: trimmed || undefined });
  };

  const openCreateForm = (defaultTeamId?: string) => {
    setFormIsEdit(false);
    setEditingMemberId(null);
    setFormState({
      ...EMPTY_FORM,
      teamId: defaultTeamId ?? (teamOptions[0]?.value ?? ""),
    });
    setFormOpen(true);
  };

  const openEditForm = (member: TeamMember) => {
    setFormIsEdit(true);
    setEditingMemberId(getMemberId(member));
    setFormState(mapMemberToForm(member));
    setFormOpen(true);
  };

  const handleFormChange = (updates: Partial<TeamMemberFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const handleFormSubmit = async () => {
    if (!formState.name.trim() || !formState.email.trim()) {
      Swal.fire("Validation", "Name and email are required.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const payload = mapFormToPayload(formState);
      if (formIsEdit && editingMemberId) {
        await updateTeamMember(editingMemberId, payload);
        await Swal.fire("Updated", "Team member updated successfully.", "success");
      } else {
        await createTeamMember(payload);
        await Swal.fire("Created", "Team member created successfully.", "success");
      }
      setFormOpen(false);
      setEditingMemberId(null);
      setFormState(EMPTY_FORM);
      fetchMembers({ page: 1, search: searchQuery || undefined });
    } catch {
      Swal.fire("Error", "Failed to save team member.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    const result = await Swal.fire({
      title: "Remove member?",
      text: `"${member.name}" will be removed from teams.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, remove",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTeamMember(getMemberId(member));
      await Swal.fire("Removed", "Team member removed.", "success");
      fetchMembers({ page, search: searchQuery || undefined });
    } catch {
      Swal.fire("Error", "Failed to remove team member.", "error");
    }
  };

  const handleMoveTo = async (member: TeamMember) => {
    const teamIdFromMember = getTeamIdFromRef(member.teamId);
    const inputOptions: Record<string, string> = {};
    teamGroups.forEach((t) => {
      inputOptions[getTeamGroupId(t)] = t.name || getTeamGroupId(t);
    });
    const { value: selectedId } = await Swal.fire<string>({
      title: "Move member to team",
      input: "select",
      inputOptions: Object.keys(inputOptions).length > 0 ? inputOptions : { "": "No teams" },
      inputValue: teamIdFromMember ?? "",
      showCancelButton: true,
    });
    if (selectedId == null || selectedId === "") return;
    try {
      await updateTeamMember(getMemberId(member), { teamId: selectedId });
      await Swal.fire("Updated", "Member moved to new team.", "success");
      fetchMembers({ page, search: searchQuery || undefined });
    } catch {
      Swal.fire("Error", "Failed to move member.", "error");
    }
  };

  const handleToggleStar = async (member: TeamMember) => {
    try {
      await updateTeamMember(getMemberId(member), { isStarred: !member.isStarred });
      fetchMembers({ page, search: searchQuery || undefined });
    } catch {
      Swal.fire("Error", "Failed to update star.", "error");
    }
  };

  const handleCreateTeam = async () => {
    const name = createTeamName.trim();
    if (!name) {
      Swal.fire("Validation", "Team name is required.", "warning");
      return;
    }
    setCreateTeamSubmitting(true);
    try {
      await createTeamGroup({ name });
      await Swal.fire("Created", "Team created successfully.", "success");
      setCreateTeamOpen(false);
      setCreateTeamName("");
      fetchTeamGroups();
    } catch {
      Swal.fire("Error", "Failed to create team.", "error");
    } finally {
      setCreateTeamSubmitting(false);
    }
  };

  const getMemberTeamId = (m: TeamMember): string => getTeamIdFromRef(m.teamId);
  const getMemberTeamName = (m: TeamMember): string => {
    if (typeof m.teamId === "object" && m.teamId?.name) return m.teamId.name;
    const g = m.teamGroup;
    return TEAM_GROUP_LABELS[g] ?? g ?? "—";
  };
  const groupedMembersByTeamId = useMemo(() => {
    const map: Record<string, TeamMember[]> = {};
    const validTeamIds = new Set(teamGroups.map((t) => getTeamGroupId(t)));
    for (const t of teamGroups) {
      map[getTeamGroupId(t)] = [];
    }
    for (const m of members) {
      const tid = getMemberTeamId(m);
      if (tid && validTeamIds.has(tid)) {
        if (map[tid]) map[tid].push(m);
        else map[tid] = [m];
      }
      /* No teamId or unknown teamId: not listed in the team sidebar (see main roster). */
    }
    return map;
  }, [members, teamGroups]);

  const handleRenameTeamGroup = async (team: ApiTeamGroup) => {
    const tid = getTeamGroupId(team);
    const { value: name, isConfirmed } = await Swal.fire({
      title: "Rename team",
      input: "text",
      inputValue: team.name ?? "",
      showCancelButton: true,
      confirmButtonText: "Save",
      inputValidator: (v) => {
        if (!v || !String(v).trim()) return "Name is required";
        return null;
      },
    });
    if (!isConfirmed || !name?.trim()) return;
    try {
      await updateTeamGroup(tid, { name: name.trim() });
      await Swal.fire("Updated", "Team renamed successfully.", "success");
      await fetchTeamGroups();
      fetchMembers({ page, search: searchQuery || undefined });
    } catch {
      Swal.fire("Error", "Failed to rename team.", "error");
    }
  };

  const handleDeleteTeamGroup = async (team: ApiTeamGroup) => {
    const tid = getTeamGroupId(team);
    const count = (groupedMembersByTeamId[tid] ?? []).length;
    const { isConfirmed } = await Swal.fire({
      title: "Delete team?",
      text:
        count > 0
          ? `This team has ${count} roster member(s). Deleting the team removes those roster rows so names no longer appear here (ATS candidate profiles are not deleted).`
          : "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed) return;
    try {
      await deleteTeamGroup(tid);
      await Swal.fire("Deleted", "Team removed.", "success");
      await fetchTeamGroups();
      fetchMembers({ page, search: searchQuery || undefined });
    } catch {
      Swal.fire(
        "Error",
        "Could not delete this team. Remove members (and unlink the team from projects if it is still assigned) and try again.",
        "error"
      );
    }
  };

  const hasMembers = members.length > 0;

  return (
    <Fragment>
      <Seo title="Team" />
      <Pageheader currentpage="Team" activepage="Pages" mainpage="Team" />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-9 col-span-12">
          <div className="team-members" id="team-members">
            <div className="grid grid-cols-12 gap-x-6">
              <div className="xl:col-span-12 col-span-12">
                <div className="box">
                  <div className="box-body">
                    <div className="team-header">
                      <div className="flex flex-wrap items-center justify-between">
                        <div className="h5 font-semibold mb-0">Team Ui</div>
                        <div className="flex items-center">
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control w-full !bg-light dark:!bg-light border-0 !rounded-s-md"
                              placeholder="Search Person Name"
                              aria-describedby="search-team-member"
                              value={searchInput}
                              onChange={(e) => setSearchInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                            <button
                              className="ti-btn ti-btn-light !mb-0"
                              type="button"
                              aria-label="button"
                              id="search-team-member"
                              onClick={handleSearch}
                            >
                              <i className="ri-search-line text-[#8c9097] dark:text-white/50" />
                            </button>
                          </div>
                          <div className="ms-2">
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary !text-[0.75rem] !py-1 !px-2"
                              onClick={() => openCreateForm()}
                            >
                              New Member
                              <i className="ri-add-line ms-1 align-middle" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="xl:col-span-12 col-span-12">
                  <div className="box">
                    <div className="box-body text-center py-10 text-[#8c9097] dark:text-white/50">
                      Loading team members...
                    </div>
                  </div>
                </div>
              ) : !hasMembers ? (
                <div className="xl:col-span-12 col-span-12">
                  <div className="box">
                    <div className="box-body text-center py-10 text-[#8c9097] dark:text-white/50">
                      No team members yet. Use &quot;New Member&quot; to add one.
                    </div>
                  </div>
                </div>
              ) : (
                members.map((member) => (
                  <TeamMemberCard
                    key={getMemberId(member)}
                    member={member}
                    onMoveTo={handleMoveTo}
                    onEdit={openEditForm}
                    onDelete={handleDeleteMember}
                    onToggleStar={handleToggleStar}
                  />
                ))
              )}
            </div>

            {totalPages > 1 && (
              <nav aria-label="Page navigation">
                <ul className="ti-pagination mb-4 justify-end">
                  <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link px-3 py-[0.375rem]"
                      onClick={() => {
                        const next = Math.max(1, page - 1);
                        setPage(next);
                        fetchMembers({ page: next, search: searchQuery || undefined });
                      }}
                      disabled={page <= 1}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                      <button
                        type="button"
                        className="page-link px-3 py-[0.375rem]"
                        onClick={() => {
                          setPage(p);
                          fetchMembers({ page: p, search: searchQuery || undefined });
                        }}
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link px-3 py-[0.375rem]"
                      onClick={() => {
                        const next = Math.min(totalPages, page + 1);
                        setPage(next);
                        fetchMembers({ page: next, search: searchQuery || undefined });
                      }}
                      disabled={page >= totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 col-span-12">
          <div className="team-groups">
            <div className="box">
              <div className="box-header !justify-between">
                <h6 className="font-semibold mb-0">All Teams</h6>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="ti-btn ti-btn-success !text-[0.75rem] !py-1 !px-2"
                    onClick={() => {
                      setCreateTeamName("");
                      setCreateTeamOpen(true);
                    }}
                  >
                    New Team
                    <i className="ri-add-line ms-1 align-middle" />
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !text-[0.75rem] !py-1 !px-2"
                    onClick={() => openCreateForm()}
                  >
                    Add Member
                    <i className="ri-add-line ms-1 align-middle" />
                  </button>
                </div>
              </div>
              <div className="box-body !p-0">
                <PerfectScrollbar>
                  <div className="teams-nav" id="teams-nav">
                    <ul className="list-none mb-0 mt-2">
                      {teamGroups.map((team) => {
                        const tid = getTeamGroupId(team);
                        return (
                        <Fragment key={tid}>
                          <li className="!pb-0">
                            <div className="flex justify-between items-center gap-1">
                              <div className="text-[.625rem] font-semibold mb-2 text-[#8c9097] dark:text-white/50 flex-grow min-w-0 truncate">
                                {team.name || tid}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 mb-2">
                                <button
                                  type="button"
                                  aria-label="Rename team"
                                  className="ti-btn ti-btn-sm ti-btn-light !px-1 !py-0"
                                  onClick={() => void handleRenameTeamGroup(team)}
                                >
                                  <i className="ri-pencil-line text-[0.95rem]" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Delete team"
                                  className="ti-btn ti-btn-sm ti-btn-danger !px-1 !py-0"
                                  onClick={() => void handleDeleteTeamGroup(team)}
                                >
                                  <i className="ri-delete-bin-line text-[0.95rem]" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Add member to team"
                                  className="ti-btn ti-btn-sm ti-btn-success"
                                  onClick={() => openCreateForm(tid)}
                                >
                                  <i className="ri-add-line" />
                                </button>
                              </div>
                            </div>
                          </li>
                          {(groupedMembersByTeamId[tid] ?? []).map((member) => (
                            <li key={getMemberId(member)}>
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => openEditForm(member)}
                              >
                                <div className="flex items-center">
                                  <div className="me-2 flex items-center">
                                    <span
                                      className={`avatar avatar-sm avatar-rounded ${
                                        member.onlineStatus === "online"
                                          ? "online"
                                          : "offline"
                                      }`}
                                    >
                                      <img
                                        src={
                                          member.avatarImageUrl ||
                                          "../../assets/images/faces/3.jpg"
                                        }
                                        alt={member.name}
                                      />
                                    </span>
                                  </div>
                                  <div className="flex-grow">
                                    <span>{member.name}</span>
                                  </div>
                                  <div>
                                    <span className="text-[.625rem] font-semibold text-[#8c9097] dark:text-white/50">
                                      {member.onlineStatus === "online"
                                        ? ""
                                        : member.lastSeenLabel}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </Fragment>
                      );
                      })}
                      {teamGroups.length === 0 && (
                        <li className="text-[.75rem] text-[#8c9097] dark:text-white/50 py-2">
                          No teams yet. Create a team to add members.
                        </li>
                      )}
                    </ul>
                  </div>
                </PerfectScrollbar>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TeamMemberFormModal
        open={formOpen}
        isEdit={formIsEdit}
        form={formState}
        teamOptions={teamOptions}
        candidates={candidates}
        onChange={handleFormChange}
        onClose={() => {
          if (submitting) return;
          setFormOpen(false);
          setEditingMemberId(null);
          setFormState(EMPTY_FORM);
        }}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />

      {createTeamOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[96vw] max-w-md">
            <div className="ti-modal-header flex items-center justify-between px-4 py-3 border-b border-defaultborder">
              <h6 className="modal-title">Create New Team</h6>
              <button
                type="button"
                className="ti-modal-close-btn ti-btn ti-btn-sm ti-btn-light"
                onClick={() => !createTeamSubmitting && setCreateTeamOpen(false)}
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="ti-modal-body px-4 py-4">
              <label htmlFor="create-team-name" className="form-label">
                Team name
              </label>
              <input
                id="create-team-name"
                type="text"
                className="form-control"
                placeholder="e.g. TEAM REACT"
                value={createTeamName}
                onChange={(e) => setCreateTeamName(e.target.value)}
              />
            </div>
            <div className="ti-modal-footer flex items-center justify-end gap-2 px-4 py-3 border-t border-defaultborder">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => setCreateTeamOpen(false)}
                disabled={createTeamSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full"
                onClick={handleCreateTeam}
                disabled={createTeamSubmitting || !createTeamName.trim()}
              >
                {createTeamSubmitting ? "Creating..." : "Create Team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default TeamsPage;

