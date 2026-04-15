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
import Swal from "sweetalert2";
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
import {
  listCandidates,
  uploadDocument,
  updateCandidate,
  type CandidateListItem,
} from "@/shared/lib/api/candidates";

import styles from "./teams.module.css";
import { useAuth } from "@/shared/contexts/auth-context";

const Select = dynamic(() => import("react-select"), { ssr: false });

/** Unscoped roster for sidebar grouping; raise if orgs exceed this (API paginates). */
const SIDEBAR_ROSTER_LIMIT = 800;

function TeamRosterSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="xxl:col-span-4 xl:col-span-6 md:col-span-6 col-span-12"
          role="status"
          aria-label={i === 0 ? "Loading team roster" : undefined}
        >
          <div
            className={`box custom-box flex h-full flex-col overflow-hidden rounded-xl border border-defaultborder/70 shadow-sm dark:border-white/10 ${styles.skeletonCard}`}
          >
            <div className="h-24 bg-defaultborder/40 motion-safe:animate-pulse motion-reduce:animate-none dark:bg-white/10" />
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="h-4 max-w-[10rem] rounded-md bg-defaultborder/50 motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-2/3 rounded-md bg-defaultborder/40 motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-1/2 rounded-md bg-defaultborder/35 motion-safe:animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

interface TeamMemberFormState {
  name: string;
  email: string;
  memberSinceLabel: string;
  projectsCount: string;
  position: string;
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

/** Strip trailing `[24-hex]` suffix often stored with team names (Mongo ObjectId). */
function displayTeamLabel(name: string | undefined, fallbackId: string): string {
  const raw = (name || "").trim();
  const stripped = raw.replace(/\s*\[[a-f0-9]{24}\]\s*$/i, "").trim();
  if (stripped) return stripped;
  return fallbackId ? `Team · ${fallbackId.slice(-6)}` : "Team";
}

/** Ship with `public/` — old template paths (`faces/`, `team-covers/`) are not in this repo. */
const DEFAULT_TEAM_COVER = "/assets/images/media/backgrounds/5.svg";
const DEFAULT_TEAM_AVATAR = "/assets/images/media/backgrounds/8.svg";
const DEFAULT_SIDEBAR_AVATAR = "/assets/images/media/backgrounds/8.svg";

/** Next.js `/public` paths, absolute URLs, or legacy `../../assets/...` strings. */
function resolvePublicImageUrl(url: string | undefined | null, fallback: string): string {
  const u = (url || "").trim();
  if (!u) return fallback;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return u;
  const legacy = u.match(/assets\/images\/.+$/i);
  if (legacy) return `/${legacy[0].replace(/^\/+/, "")}`;
  return fallback;
}

function normalizeMemberEmail(email: string | undefined | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Roster avatarImageUrl override → server candidateProfilePictureUrl (from GET /teams) →
 * candidates list map → signed-in user's profile picture when emails match.
 * When none apply, show initials — do not load a placeholder image.
 */
function getTeamMemberAvatarDisplayState(
  member: TeamMember,
  candidateAvatarByEmail: ReadonlyMap<string, string>,
  sessionUserAvatar?: { email: string; url: string } | null
): { hasPhoto: boolean; imgSrc: string } {
  const override = (member.avatarImageUrl || "").trim();
  const fromApi = (member.candidateProfilePictureUrl || "").trim();
  const key = normalizeMemberEmail(member.email);
  const fromAts = (key ? candidateAvatarByEmail.get(key) : undefined) || "";
  const fromAtsTrim = fromAts.trim();
  const sessionUrl =
    sessionUserAvatar?.url?.trim() &&
    key &&
    normalizeMemberEmail(sessionUserAvatar.email) === key
      ? sessionUserAvatar.url.trim()
      : "";
  const chosen = override || fromApi || fromAtsTrim || sessionUrl;
  const hasPhoto = !!chosen;
  const imgSrc = resolvePublicImageUrl(chosen, DEFAULT_TEAM_AVATAR);
  return { hasPhoto, imgSrc };
}

function formatMemberSinceDisplay(member: TeamMember): string {
  const label = member.memberSinceLabel?.trim();
  if (label) return label;
  const created = member.createdAt;
  if (!created) return "—";
  const d = new Date(created);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsFromName(name: string | undefined): string {
  const raw = (name || "").trim();
  if (!raw) return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
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
  candidateAvatarByEmail: ReadonlyMap<string, string>;
  sessionUserAvatar?: { email: string; url: string } | null;
  staggerIndex?: number;
  onMoveTo: (member: TeamMember) => void;
  onEdit: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
  onToggleStar: (member: TeamMember) => void;
}

function TeamMemberCard({
  member,
  candidateAvatarByEmail,
  sessionUserAvatar,
  staggerIndex = 0,
  onMoveTo,
  onEdit,
  onDelete,
  onToggleStar,
}: TeamMemberCardProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const memberKey = getMemberId(member);
  const [coverBroken, setCoverBroken] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const { hasPhoto: hasAvatarPhoto, imgSrc: avatarImgSrc } = getTeamMemberAvatarDisplayState(
    member,
    candidateAvatarByEmail,
    sessionUserAvatar
  );

  useEffect(() => {
    setCoverBroken(false);
    setAvatarBroken(false);
  }, [
    memberKey,
    member.email,
    member.avatarImageUrl,
    member.candidateProfilePictureUrl,
    hasAvatarPhoto,
    avatarImgSrc,
  ]);

  const coverSrc = resolvePublicImageUrl(member.coverImageUrl, DEFAULT_TEAM_COVER);

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

  return (
    <div
      className="xxl:col-span-4 xl:col-span-6 lg:col-span-6 md:col-span-6 sm:col-span-12 col-span-12 motion-safe:animate-pm-panel-in motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(staggerIndex, 24) * 48}ms` }}
    >
      <div className="box custom-box team-member-card group flex h-full flex-col overflow-hidden rounded-xl border border-defaultborder/70 shadow-sm transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md dark:border-white/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="teammember-cover-image">
          {!coverBroken ? (
            <img
              src={coverSrc}
              className="card-img-top object-cover"
              alt=""
              onError={() => setCoverBroken(true)}
            />
          ) : (
            <div
              className="card-img-top bg-gradient-to-br from-primary/20 via-defaultbackground to-primary/10 dark:from-primary/25 dark:via-white/[0.06] dark:to-primary/15"
              aria-hidden
            />
          )}
          <span
            className="avatar avatar-xl avatar-rounded overflow-hidden !bg-defaultbackground ring-2 ring-white dark:ring-white/10"
            aria-label={member.name}
          >
            {!hasAvatarPhoto || avatarBroken ? (
              <span className="flex h-full w-full items-center justify-center bg-primary/15 text-[0.95rem] font-semibold text-primary">
                {initialsFromName(member.name)}
              </span>
            ) : (
              <img
                src={avatarImgSrc}
                className="h-full w-full object-cover"
                alt=""
                onError={() => setAvatarBroken(true)}
              />
            )}
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
                {formatMemberSinceDisplay(member)}
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

function RosterSidebarAvatar({
  member,
  candidateAvatarByEmail,
  sessionUserAvatar,
}: {
  member: TeamMember;
  candidateAvatarByEmail: ReadonlyMap<string, string>;
  sessionUserAvatar?: { email: string; url: string } | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const { hasPhoto, imgSrc } = getTeamMemberAvatarDisplayState(
    member,
    candidateAvatarByEmail,
    sessionUserAvatar
  );
  const memberId = getMemberId(member);
  const statusClass = member.onlineStatus === "online" ? "online" : "offline";

  useEffect(() => {
    setImgFailed(false);
  }, [hasPhoto, imgSrc, memberId]);

  return (
    <span className={`avatar avatar-sm avatar-rounded ${statusClass}`}>
      {!hasPhoto || imgFailed ? (
        <span className="flex h-full w-full min-h-8 min-w-8 items-center justify-center rounded-full bg-primary/15 text-[0.6rem] font-semibold text-primary">
          {initialsFromName(member.name)}
        </span>
      ) : (
        <img src={imgSrc} alt="" className="object-cover" onError={() => setImgFailed(true)} />
      )}
    </span>
  );
}

interface TeamMemberFormModalProps {
  open: boolean;
  isEdit: boolean;
  form: TeamMemberFormState;
  teamOptions: { value: string; label: string }[];
  candidates: { id: string; name: string; email: string; profilePictureUrl?: string }[];
  onChange: (updates: Partial<TeamMemberFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  onRefreshCandidates: () => Promise<void>;
}

function findCandidateByFormEmail(
  candidates: TeamMemberFormModalProps["candidates"],
  email: string
) {
  const key = normalizeMemberEmail(email);
  if (!key) return undefined;
  return candidates.find((c) => normalizeMemberEmail(c.email) === key);
}

function teamMemberPhotoApiMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return String(data.message);
  }
  return "";
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
  onRefreshCandidates,
}: TeamMemberFormModalProps) {
  const matchedCandidate = useMemo(
    () => (form.email.trim() ? findCandidateByFormEmail(candidates, form.email) : undefined),
    [candidates, form.email]
  );

  const avatarPreview = useMemo(() => {
    const override = form.avatarImageUrl.trim();
    const fromAts = (matchedCandidate?.profilePictureUrl || "").trim();
    const hasPhoto = !!(override || fromAts);
    const imgSrc = resolvePublicImageUrl(override || fromAts, DEFAULT_TEAM_AVATAR);
    return { hasPhoto, imgSrc };
  }, [form.avatarImageUrl, matchedCandidate?.profilePictureUrl]);

  const [avatarPreviewBroken, setAvatarPreviewBroken] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarPreviewBroken(false);
    setPhotoHint(null);
  }, [open, avatarPreview.imgSrc, avatarPreview.hasPhoto, form.email]);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!matchedCandidate?.id) {
      await Swal.fire(
        "Select a candidate",
        "Pick a candidate from the list so we can attach the photo to their ATS profile.",
        "info"
      );
      return;
    }
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      await Swal.fire("Invalid file", "Please upload a JPEG or PNG (max 5MB).", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      await Swal.fire("File too large", "Image must be smaller than 5MB.", "warning");
      return;
    }
    setPhotoHint(null);
    setAvatarUploading(true);
    try {
      const result = await uploadDocument(file);
      const profilePicture = {
        url: result.url,
        key: result.key,
        originalName: result.originalName,
        size: result.size,
        mimeType: result.mimeType,
      };
      await updateCandidate(matchedCandidate.id, { profilePicture });
      onChange({ avatarImageUrl: "" });
      await onRefreshCandidates();
      setPhotoHint("Photo saved to ATS and the candidate’s linked user profile.");
    } catch (err: unknown) {
      await Swal.fire(
        "Upload failed",
        teamMemberPhotoApiMessage(err) || "Could not update profile photo.",
        "error"
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!matchedCandidate?.id) return;
    const confirm = await Swal.fire({
      title: "Remove profile photo?",
      text: "Clears the photo on the candidate ATS record and the linked user profile.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    setPhotoHint(null);
    setAvatarRemoving(true);
    try {
      await updateCandidate(matchedCandidate.id, { profilePicture: null });
      onChange({ avatarImageUrl: "" });
      await onRefreshCandidates();
      setPhotoHint("Profile photo removed from ATS and linked user.");
    } catch (err: unknown) {
      await Swal.fire(
        "Remove failed",
        teamMemberPhotoApiMessage(err) || "Could not remove profile photo.",
        "error"
      );
    } finally {
      setAvatarRemoving(false);
    }
  };

  if (!open) return null;

  const modalTitleId = "team-member-modal-title";
  const candidateId = matchedCandidate?.id;
  const canManagePhoto = !!candidateId;
  const showRemovePhoto =
    canManagePhoto && !!(matchedCandidate?.profilePictureUrl?.trim() || form.avatarImageUrl.trim());

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/55 ${styles.memberModalBackdrop}`}
      onClick={() => {
        if (!submitting) onClose();
      }}
      role="presentation"
    >
      <div
        className={`bg-bodybg border border-defaultborder rounded-xl w-[96vw] max-w-lg max-h-[92vh] flex flex-col overflow-hidden ${styles.memberModalPanel}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <div className="ti-modal-header flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5 border-b border-defaultborder/80 bg-gradient-to-r from-bodybg via-bodybg to-primary/[0.04] dark:to-primary/[0.07]">
          <div className="min-w-0 pt-0.5">
            <h6 id={modalTitleId} className="modal-title mb-0 text-[1rem] font-semibold leading-tight">
              {isEdit ? "Edit team member" : "Add team member"}
            </h6>
            <p className="mb-0 mt-1 text-[0.75rem] text-muted leading-snug dark:text-white/45">
              Link an ATS candidate, adjust roster labels, and manage their profile photo (same flow as
              personal settings).
            </p>
          </div>
          <button
            type="button"
            className="ti-modal-close-btn ti-btn ti-btn-sm ti-btn-light shrink-0 rounded-lg"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close dialog"
          >
            <span className="sr-only">Close</span>
            <i className="ri-close-line text-lg leading-none" />
          </button>
        </div>

        <div className="ti-modal-body px-4 py-4 sm:px-5 overflow-y-auto flex-1 space-y-4">
          <div className={styles.memberModalSection}>
            <h3 className={styles.memberModalSectionTitle}>Live preview</h3>
            <div className={styles.memberPreviewStrip}>
              <div className={`${styles.memberAvatarPreview} flex items-center justify-center`}>
                {!avatarPreview.hasPhoto || avatarPreviewBroken ? (
                  <span className="text-[0.95rem] font-semibold text-primary">
                    {initialsFromName(form.name)}
                  </span>
                ) : (
                  <img
                    src={avatarPreview.imgSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setAvatarPreviewBroken(true)}
                  />
                )}
              </div>
              <p className={styles.memberModalHint}>
                Avatar uses the{" "}
                <strong className="font-semibold text-defaulttextcolor dark:text-white/80">
                  ATS profile photo
                </strong>{" "}
                when the email matches a candidate. Upload or remove the photo below to update the
                candidate (and linked user) the same way as personal settings. If there is no photo,
                initials show on cards.
              </p>
            </div>
          </div>

          <div className={styles.memberModalSection}>
            <h3 className={styles.memberModalSectionTitle}>Candidate &amp; team</h3>
            <div className="grid grid-cols-12 gap-x-4 gap-y-3">
              <div className="xl:col-span-12 col-span-12">
                <label htmlFor="member-candidate" className="form-label">
                  Candidate (ATS)
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
                          const match = findCandidateByFormEmail(candidates, form.email);
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
                    candidates.length ? "Search or pick candidate" : "No candidates available"
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
                {matchedCandidate && (
                  <p className="mb-0 mt-1.5 text-[0.72rem] text-muted dark:text-white/45">
                    <i className="ri-checkbox-circle-line me-1 align-middle text-success" aria-hidden />
                    Linked to ATS record for <span className="font-medium">{matchedCandidate.email}</span>
                  </p>
                )}
              </div>
              <div className="xl:col-span-12 col-span-12">
                <label className="form-label" htmlFor="member-team-select">
                  Team
                </label>
                <Select
                  inputId="member-team-select"
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
            </div>
          </div>

          <div className={styles.memberModalSection}>
            <h3 className={styles.memberModalSectionTitle}>Roster details</h3>
            <div className="grid grid-cols-12 gap-x-4 gap-y-3">
              <div className="xl:col-span-6 col-span-12">
                <label htmlFor="member-since" className="form-label">
                  Member since <span className="text-muted font-normal">(label)</span>
                </label>
                <input
                  id="member-since"
                  type="text"
                  className="form-control"
                  placeholder="e.g. 16 months"
                  value={form.memberSinceLabel}
                  onChange={(e) => onChange({ memberSinceLabel: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label htmlFor="member-projects" className="form-label">
                  Projects count
                </label>
                <input
                  id="member-projects"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="form-control"
                  placeholder="0"
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
                  autoComplete="organization-title"
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label" htmlFor="member-status-select">
                  Presence
                </label>
                <Select
                  inputId="member-status-select"
                  classNamePrefix="Select2"
                  className="basic-multi-select"
                  menuPlacement="auto"
                  value={{
                    value: form.onlineStatus,
                    label: form.onlineStatus === "online" ? "Online" : "Offline",
                  }}
                  options={[
                    { value: "online", label: "Online" },
                    { value: "offline", label: "Offline" },
                  ]}
                  onChange={(opt) =>
                    onChange({
                      onlineStatus:
                        (opt as { value: "online" | "offline" } | null)?.value ?? "online",
                    })
                  }
                />
              </div>
              <div className="xl:col-span-12 col-span-12">
                <label htmlFor="member-lastseen" className="form-label">
                  Last seen label
                </label>
                <input
                  id="member-lastseen"
                  type="text"
                  className="form-control"
                  placeholder="e.g. 8 min (shown when offline)"
                  value={form.lastSeenLabel}
                  onChange={(e) => onChange({ lastSeenLabel: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="xl:col-span-12 col-span-12">
                <div className={styles.memberStarRow}>
                  <div>
                    <span className="block text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white/90">
                      Star on roster
                    </span>
                    <span className="text-[0.72rem] text-muted dark:text-white/45">
                      Highlights this member in the team list.
                    </span>
                  </div>
                  <div className="form-check form-switch mb-0 d-flex align-items-center">
                    <input
                      id="member-starred"
                      type="checkbox"
                      role="switch"
                      className="form-check-input float-none m-0"
                      checked={form.isStarred}
                      onChange={(e) => onChange({ isStarred: e.target.checked })}
                      aria-label="Star this member on the roster"
                    />
                    <label className="form-check-label sr-only" htmlFor="member-starred">
                      Star on roster
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.memberModalSection}>
            <h3 className={styles.memberModalSectionTitle}>Profile photo</h3>
            <div className="grid grid-cols-12 gap-x-4 gap-y-3">
              <div className="xl:col-span-12 col-span-12">
                <label className="form-label">Candidate photo (ATS)</label>
                <p className="mb-2 text-[0.72rem] text-muted dark:text-white/45">
                  JPEG or PNG, max 5MB. Updates the candidate’s ATS profile picture and the linked user
                  account.
                </p>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary-full ti-btn-wave min-h-[2.5rem] px-4"
                    disabled={!canManagePhoto || avatarUploading || avatarRemoving}
                    onClick={() => avatarFileInputRef.current?.click()}
                  >
                    {avatarUploading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2 align-middle"
                          role="status"
                          aria-hidden
                        />
                        Uploading…
                      </>
                    ) : (
                      "Upload photo"
                    )}
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-light min-h-[2.5rem] px-4"
                    disabled={!showRemovePhoto || avatarUploading || avatarRemoving}
                    onClick={handleAvatarRemove}
                  >
                    {avatarRemoving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2 align-middle"
                          role="status"
                          aria-hidden
                        />
                        Removing…
                      </>
                    ) : (
                      "Remove photo"
                    )}
                  </button>
                </div>
                {!canManagePhoto && (
                  <p className="mb-0 mt-2 text-[0.72rem] text-muted dark:text-white/45">
                    Select a candidate above to enable upload and remove.
                  </p>
                )}
                {form.avatarImageUrl.trim() && (
                  <div className="mt-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
                    <p className="mb-2 text-[0.72rem] text-warning">
                      This member has a legacy roster avatar URL. Clear it to rely on the ATS photo only,
                      then save roster changes.
                    </p>
                    <button
                      type="button"
                      className="ti-btn ti-btn-warning ti-btn-sm min-h-[2rem] px-3"
                      disabled={submitting}
                      onClick={() => onChange({ avatarImageUrl: "" })}
                    >
                      Clear legacy URL from form
                    </button>
                  </div>
                )}
                {photoHint && (
                  <p className="mb-0 mt-2 text-[0.72rem] text-success dark:text-success/90">{photoHint}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="ti-modal-footer flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3.5 sm:px-5 border-t border-defaultborder/80 bg-bodybg/95 dark:bg-bodybg">
          <p className="mb-0 text-[0.7rem] text-muted dark:text-white/40 sm:max-w-[55%]">
            {submitting
              ? "Saving changes…"
              : "Roster fields apply to this team list only. Profile photo changes update ATS and the linked user."}
          </p>
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              className="ti-btn ti-btn-light min-h-[2.5rem] px-4"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary-full min-h-[2.5rem] px-5 shadow-sm disabled:opacity-60"
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Add member"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TeamsPage = () => {
  const { user } = useAuth();
  const sessionUserAvatar = useMemo(() => {
    const url = user?.profilePicture?.url?.trim();
    if (!user?.email || !url) return null;
    return { email: user.email, url };
  }, [user?.email, user?.profilePicture?.url]);

  const sidebarFetchSeq = useRef(0);

  const [members, setMembers] = useState<TeamMember[]>([]);
  /** Full roster (no teamId filter) for sidebar grouping — main grid stays paginated per team. */
  const [sidebarMembers, setSidebarMembers] = useState<TeamMember[]>([]);
  const [teamGroups, setTeamGroups] = useState<ApiTeamGroup[]>([]);
  /** Which team’s roster is shown in the main column (WhatsApp-style group switcher). */
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
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
    { id: string; name: string; email: string; profilePictureUrl?: string }[]
  >([]);

  const candidateAvatarByEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of candidates) {
      const u = c.profilePictureUrl?.trim();
      if (!u) continue;
      m.set(normalizeMemberEmail(c.email), u);
    }
    return m;
  }, [candidates]);

  const PAGE_SIZE = 12;
  const teamOptions = useMemo(
    () =>
      teamGroups.map((t) => {
        const id = getTeamGroupId(t);
        return { value: id, label: displayTeamLabel(t.name, id) };
      }),
    [teamGroups]
  );

  const selectedTeam = useMemo(
    () => teamGroups.find((t) => getTeamGroupId(t) === selectedTeamId),
    [teamGroups, selectedTeamId]
  );
  const mainTeamTitle = displayTeamLabel(selectedTeam?.name, selectedTeamId || "");

  const fetchSidebarRoster = useCallback(async () => {
    const seq = ++sidebarFetchSeq.current;
    try {
      const res = await listTeamMembers({
        limit: SIDEBAR_ROSTER_LIMIT,
        page: 1,
      });
      if (seq !== sidebarFetchSeq.current) return;
      setSidebarMembers(res.results ?? []);
    } catch {
      if (seq !== sidebarFetchSeq.current) return;
      setSidebarMembers([]);
    }
  }, []);

  const fetchMembers = useCallback(
    async (params?: { page?: number; search?: string }) => {
      setLoading(true);
      try {
        if (teamGroups.length > 0 && !selectedTeamId) {
          setMembers([]);
          setTotalPages(0);
          setTotalResults(0);
          return;
        }
        const result = await listTeamMembers({
          search: params?.search ?? (searchQuery || undefined),
          page: params?.page ?? page,
          limit: PAGE_SIZE,
          ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
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
    [searchQuery, page, selectedTeamId, teamGroups.length]
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const fetchTeamGroups = useCallback(async () => {
    try {
      const res = await listTeamGroups({ limit: 200 });
      const groups = res.results ?? [];
      setTeamGroups(groups);
      setSelectedTeamId((prev) => {
        const ids = groups.map((t) => getTeamGroupId(t));
        if (!groups.length) return null;
        if (prev && ids.includes(prev)) return prev;
        return ids[0];
      });
    } catch {
      setTeamGroups([]);
      setSelectedTeamId(null);
    } finally {
      await fetchSidebarRoster();
    }
  }, [fetchSidebarRoster]);

  const refreshCandidates = useCallback(async () => {
    try {
      const res = await listCandidates({ limit: 500 });
      const list = (res.results ?? []).map((c: CandidateListItem) => {
        const raw = (c.profilePicture?.url || "").trim();
        const profilePictureUrl = raw ? resolvePublicImageUrl(raw, "") || undefined : undefined;
        return {
          id: (c.id ?? c._id) as string,
          name: c.fullName,
          email: c.email,
          profilePictureUrl,
        };
      });
      setCandidates(list);
    } catch {
      setCandidates([]);
    }
  }, []);

  useEffect(() => {
    void fetchTeamGroups();
    void refreshCandidates();
  }, [fetchTeamGroups, refreshCandidates]);

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
      teamId:
        defaultTeamId ??
        selectedTeamId ??
        teamOptions[0]?.value ??
        "",
    });
    setFormOpen(true);
  };

  const selectTeam = (tid: string) => {
    setPage(1);
    setSelectedTeamId(tid);
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
      void fetchSidebarRoster();
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
      void fetchSidebarRoster();
    } catch {
      Swal.fire("Error", "Failed to remove team member.", "error");
    }
  };

  const handleMoveTo = async (member: TeamMember) => {
    const teamIdFromMember = getTeamIdFromRef(member.teamId);
    const inputOptions: Record<string, string> = {};
    teamGroups.forEach((t) => {
      const id = getTeamGroupId(t);
      inputOptions[id] = displayTeamLabel(t.name, id);
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
      void fetchSidebarRoster();
    } catch {
      Swal.fire("Error", "Failed to move member.", "error");
    }
  };

  const handleToggleStar = async (member: TeamMember) => {
    try {
      await updateTeamMember(getMemberId(member), { isStarred: !member.isStarred });
      fetchMembers({ page, search: searchQuery || undefined });
      void fetchSidebarRoster();
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
    for (const m of sidebarMembers) {
      const tid = getMemberTeamId(m);
      if (tid && validTeamIds.has(tid)) {
        if (map[tid]) map[tid].push(m);
        else map[tid] = [m];
      }
    }
    return map;
  }, [sidebarMembers, teamGroups]);

  const handleRenameTeamGroup = async (team: ApiTeamGroup) => {
    const tid = getTeamGroupId(team);
    const { value: name, isConfirmed } = await Swal.fire({
      title: "Rename team",
      input: "text",
      inputValue: displayTeamLabel(team.name, tid),
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
      fetchMembers({ page: 1, search: searchQuery || undefined });
    } catch {
      Swal.fire("Error", "Failed to rename team.", "error");
    }
  };

  const handleDeleteTeamGroup = async (team: ApiTeamGroup) => {
    const tid = getTeamGroupId(team);
    let count = (groupedMembersByTeamId[tid] ?? []).length;
    try {
      const snap = await listTeamMembers({ teamId: tid, limit: 1, page: 1 });
      count = snap.totalResults ?? count;
    } catch {
      /* keep sidebar-derived fallback */
    }
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
      setPage(1);
      fetchMembers({ page: 1, search: searchQuery || undefined });
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
    <>
      <Seo title="Teams — Rosters" />

      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="col-span-12 xl:col-span-12">
          <div className="box custom-box motion-safe:animate-pm-panel-in motion-reduce:animate-none rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
            <div className="border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/40 px-4 py-4 sm:px-5 dark:border-white/10 dark:from-white/[0.04] dark:via-transparent dark:to-transparent">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="newproject flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary-full !mb-0 shadow-sm transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                    onClick={() => openCreateForm()}
                  >
                    <i className="ri-add-line me-1 align-middle font-semibold" />
                    New member
                  </button>
                  <p className="max-w-xl text-[0.75rem] leading-snug text-muted dark:text-white/55">
                    Select a team under{" "}
                    <strong className="text-defaulttextcolor dark:text-white/75">All teams</strong> to switch squads.
                    Search filters the roster below.
                  </p>
                </div>
                <div
                  className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch lg:max-w-xl"
                  role="search"
                >
                  <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-defaultborder/80 bg-white shadow-sm dark:border-white/15 dark:bg-black/20">
                    <span
                      className="flex items-center border-e border-defaultborder/60 bg-defaultbackground/40 px-3 text-muted dark:border-white/10 dark:bg-white/[0.03]"
                      aria-hidden
                    >
                      <i className="ri-search-line text-base" />
                    </span>
                    <input
                      className="form-control !rounded-none border-0 shadow-none focus:ring-0"
                      type="search"
                      placeholder="Search by name or role"
                      aria-label="Search roster"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !mb-0 shrink-0 sm:px-5"
                    onClick={handleSearch}
                  >
                    Search
                  </button>
                </div>
              </div>
              {!loading && selectedTeamId ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-defaultborder/40 pt-3 text-[0.75rem] text-muted dark:border-white/10 dark:text-white/55">
                  <span className="min-w-0 font-medium text-defaulttextcolor dark:text-white/80">
                    <span className="truncate" title={selectedTeam?.name || mainTeamTitle}>
                      {mainTeamTitle}
                    </span>
                    <span className="text-muted dark:text-white/45">
                      {` · ${totalResults} member${totalResults === 1 ? "" : "s"}`}
                      {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.6875rem] font-medium text-primary ring-1 ring-primary/15">
                    <i className="ri-team-line" aria-hidden />
                    Roster
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-12 gap-6 sm:mt-4">
        <div className="col-span-12 flex min-h-0 flex-col xl:col-span-9">
          <div className="team-members flex min-h-0 flex-1 flex-col" id="team-members">
            {loading ? (
              <div className="grid min-h-[min(42vh,480px)] grid-cols-12 gap-x-6 gap-y-6 content-start">
                <TeamRosterSkeleton />
              </div>
            ) : (
              <>
                <div
                  className="grid grid-cols-12 gap-x-6 gap-y-6 content-start"
                  aria-live="polite"
                >
                  {!selectedTeamId ? (
                    <div className="col-span-12">
                      <div className="box custom-box overflow-hidden rounded-xl border border-dashed border-defaultborder/80 dark:border-white/15">
                        <div className="box-body flex min-h-[min(42vh,480px)] flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                            <i className="ri-team-line text-2xl" aria-hidden />
                          </span>
                          <p className="mb-0 max-w-md text-[0.8125rem] text-muted dark:text-white/50">
                            Create a team first, then pick it under{" "}
                            <strong className="text-defaulttextcolor">All teams</strong> to load its roster here.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : !hasMembers ? (
                    <div className="col-span-12">
                      <div className="box custom-box overflow-hidden rounded-xl border border-dashed border-defaultborder/80 dark:border-white/15">
                        <div className="box-body flex min-h-[min(42vh,480px)] flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                            <i className="ri-user-add-line text-2xl" aria-hidden />
                          </span>
                          <p className="mb-0 max-w-md text-[0.8125rem] text-muted dark:text-white/50">
                            No one on this squad yet. Use{" "}
                            <strong className="text-defaulttextcolor">New member</strong> or the plus on the team row to
                            add someone from your candidate pool.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    members.map((member, index) => (
                      <TeamMemberCard
                        key={getMemberId(member)}
                        member={member}
                        candidateAvatarByEmail={candidateAvatarByEmail}
                        sessionUserAvatar={sessionUserAvatar}
                        staggerIndex={index}
                        onMoveTo={handleMoveTo}
                        onEdit={openEditForm}
                        onDelete={handleDeleteMember}
                        onToggleStar={handleToggleStar}
                      />
                    ))
                  )}
                </div>

                {totalPages > 1 && selectedTeamId && hasMembers ? (
                  <nav className="mt-4 shrink-0" aria-label="Page navigation">
                    <ul className="ti-pagination mb-0 justify-end">
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
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="col-span-12 flex min-h-0 flex-col xl:col-span-3">
          <div className="box custom-box team-groups flex max-h-[min(72vh,calc(100dvh-12rem))] min-h-0 flex-col overflow-hidden rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/40 px-4 py-3 sm:px-5 dark:border-white/10 dark:from-white/[0.04] dark:via-transparent dark:to-transparent">
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted dark:text-white/50">
                All teams
              </span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="ti-btn ti-btn-light !mb-0 !px-2 !py-1 !text-[0.75rem]"
                  onClick={() => {
                    setCreateTeamName("");
                    setCreateTeamOpen(true);
                  }}
                >
                  New team
                  <i className="ri-add-line ms-1 align-middle" />
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary !mb-0 !px-2 !py-1 !text-[0.75rem]"
                  onClick={() => openCreateForm()}
                >
                  Add member
                  <i className="ri-add-line ms-1 align-middle" />
                </button>
              </div>
            </div>
            <div className="box-body min-h-0 flex-1 !p-0">
              <PerfectScrollbar className="h-full max-h-[min(64vh,calc(100dvh-14rem))]">
                <div className="teams-nav px-2 pb-3" id="teams-nav">
                  <ul className="mb-0 mt-2 list-none">
                      {teamGroups.map((team) => {
                        const tid = getTeamGroupId(team);
                        const isActive = selectedTeamId === tid;
                        return (
                        <Fragment key={tid}>
                          <li
                            className={`!pb-0 px-1 -mx-1 mb-1 rounded-lg transition-colors motion-reduce:transition-none ${
                              isActive
                                ? "bg-primary/10 ring-1 ring-primary/15"
                                : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="flex justify-between items-center gap-1">
                              <button
                                type="button"
                                className={`${styles.teamNameBtn} mb-2 flex-grow min-w-0 ${isActive ? "!text-primary" : ""}`}
                                aria-pressed={isActive}
                                title={`Show members of ${displayTeamLabel(team.name, tid)}`}
                                onClick={() => selectTeam(tid)}
                              >
                                {displayTeamLabel(team.name, tid)}
                              </button>
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
                                className={styles.memberPreview}
                                onClick={() => openEditForm(member)}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`shrink-0 rounded-full ${
                                      member.onlineStatus === "online"
                                        ? styles.statusDot
                                        : styles.statusDotOffline
                                    }`}
                                    aria-hidden
                                  />
                                  <div className="me-0 flex items-center">
                                    <RosterSidebarAvatar
                                      member={member}
                                      candidateAvatarByEmail={candidateAvatarByEmail}
                                      sessionUserAvatar={sessionUserAvatar}
                                    />
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
        onRefreshCandidates={refreshCandidates}
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
    </>
  );
};

export default TeamsPage;

