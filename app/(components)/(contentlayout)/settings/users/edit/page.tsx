"use client";

import React, { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { ROUTES } from "@/shared/lib/constants";
import * as usersApi from "@/shared/lib/api/users";
import * as rolesApi from "@/shared/lib/api/roles";
import type { User, Role } from "@/shared/lib/types";
import { RolesDropdown } from "@/shared/components/roles-dropdown";
import { AxiosError } from "axios";
import Swal from "sweetalert2";

export default function SettingsUsersEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("active");
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      router.replace(ROUTES.settingsUsers);
      return;
    }
    let cancelled = false;
    (async () => {
      setFetching(true);
      setError("");
      try {
        const [userRes, rolesRes] = await Promise.all([
          usersApi.getUser(userId),
          rolesApi.listRoles({ limit: 100 }),
        ]);
        if (cancelled) return;
        // Protect primary admin account from being edited
        if ((userRes.email ?? "").toLowerCase() === "admin@gmail.com") {
          router.replace(ROUTES.settingsUsers);
          return;
        }
        setName(userRes.name ?? "");
        setEmail(userRes.email ?? "");
        setRoleIds(userRes.roleIds ?? []);
        const rawStatus = (userRes.status ?? "active").toString().toLowerCase();
        setStatus(["active", "pending", "disabled", "deleted"].includes(rawStatus) ? rawStatus : "active");
        setRoles(rolesRes.results ?? []);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof AxiosError && err.response?.data?.message
            ? String(err.response.data.message)
            : "Failed to load user.";
        setError(msg);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  const handleRoleToggle = (roleId: string) => {
    setRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    const allowedStatuses = ["active", "pending", "disabled", "deleted"] as const;
    const statusToSend = allowedStatuses.includes(status as (typeof allowedStatuses)[number]) ? status : "active";

    setLoading(true);
    try {
      await usersApi.updateUser(userId, {
        name: trimmedName,
        email: trimmedEmail,
        roleIds,
        status: statusToSend,
      });
      await Swal.fire({
        icon: "success",
        title: "User updated",
        text: `The user "${trimmedName}" has been updated successfully.`,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      router.push(ROUTES.settingsUsers);
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to update user.";
      setError(msg);
      await Swal.fire({
        icon: "error",
        title: "Failed to update user",
        text: msg,
        toast: true,
        position: "top-end",
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching && !name && !email) {
    return (
      <Fragment>
        <Seo title="Edit User" />
        <div className="box-body px-4 pb-4">
          <p className="text-defaulttextcolor/70">Loading user...</p>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Edit User" />
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex items-center justify-between flex-wrap gap-4">
                <div className="box-title">Edit User</div>
                <Link href={ROUTES.settingsUsers} className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]">
                  <i className="ri-arrow-left-line me-1"></i>Back to Users
                </Link>
              </div>
              <div className="box-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-6 p-4 bg-primary/10 border border-primary/30 text-primary rounded-md text-sm flex items-start gap-2">
                    <i className="ri-information-line text-[1.25rem] shrink-0 mt-0" aria-hidden></i>
                    <p className="mb-0 mt-1 text-defaulttextcolor">
                      Detailed profile data can be updated by logging in as the user or using the Manage section.
                    </p>
                  </div>
                  {error && (
                    <div className="mb-6 p-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <div className="mb-6">
                    <label htmlFor="edit-user-name" className="form-label">
                      Full Name
                    </label>
                    <input
                      id="edit-user-name"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="mb-6">
                    <label htmlFor="edit-user-email" className="form-label">
                      Email
                    </label>
                    <input
                      id="edit-user-email"
                      type="email"
                      className="form-control"
                      placeholder="e.g. jane.doe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="form-label">Roles</label>
                    <RolesDropdown
                      roles={roles}
                      selectedIds={roleIds}
                      onToggle={handleRoleToggle}
                      placeholder="Select roles..."
                    />
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      Search and select one or more roles.
                    </p>
                  </div>
                  <div className="mb-6">
                    <label htmlFor="edit-user-status" className="form-label">
                      Status
                    </label>
                    <select
                      id="edit-user-status"
                      className="form-control !w-auto"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="disabled">Disabled</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Updating..." : "Update User"}
                    </button>
                    <Link href={ROUTES.settingsUsers} className="ti-btn ti-btn-light">
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
