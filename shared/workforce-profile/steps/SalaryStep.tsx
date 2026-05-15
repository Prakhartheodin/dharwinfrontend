"use client";

import React from "react";
import { useWorkforceStore } from "../state/workforce.store";
import { useWizardContext } from "../engine/WizardContext";
import { uploadDocument } from "@/shared/lib/api/employees";
import type { SalarySlip } from "../types/workforce.types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const yearOptions = (): string[] => {
  const now = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => String(now - i));
};

let rowCounter = 0;
const newId = () => `ss-${Date.now()}-${++rowCounter}`;

function isExistingSlip(slip: SalarySlip): boolean {
  return slip.resource.status === "uploaded" && !slip.resource.file;
}

function findDuplicates(slips: SalarySlip[]): number[] {
  const seen = new Map<string, number>();
  const dupes: number[] = [];
  slips.forEach((s, idx) => {
    if (!s.month || !s.year) return;
    const key = `${s.month}|${s.year}`;
    if (seen.has(key)) {
      dupes.push(idx);
      dupes.push(seen.get(key)!);
    } else {
      seen.set(key, idx);
    }
  });
  return Array.from(new Set(dupes));
}

export function SalaryStep() {
  const salarySlips = useWorkforceStore((s) => s.salary.salarySlips);
  const addSalarySlip = useWorkforceStore((s) => s.addSalarySlip);
  const removeSalarySlip = useWorkforceStore((s) => s.removeSalarySlip);
  const updateSalarySlip = useWorkforceStore((s) => s.updateSalarySlip);
  const { issuesByField } = useWizardContext();

  const fieldErr = issuesByField["salarySlips"]?.[0]?.message ?? null;

  const existing = salarySlips.filter(isExistingSlip);
  const draft = salarySlips.filter((s) => !isExistingSlip(s));
  const duplicateIndexes = findDuplicates(draft);

  const handleAdd = () =>
    addSalarySlip({
      id: newId(),
      month: "",
      year: "",
      resource: {
        tempId: `${newId()}-r`,
        status: "queued",
        progress: 0,
        label: "",
        retryCount: 0,
      },
    });

  const setField = (id: SalarySlip["id"], patch: Partial<SalarySlip>) =>
    updateSalarySlip(id, patch);

  const handleFile = async (slip: SalarySlip, file: File) => {
    const label = slip.month && slip.year ? `${slip.month} ${slip.year}` : file.name;
    setField(slip.id, {
      resource: {
        ...slip.resource,
        status: "uploading",
        progress: 0,
        file,
        label,
      },
    });

    try {
      const metadata = await uploadDocument(file, label);
      setField(slip.id, {
        resource: {
          ...slip.resource,
          status: "uploaded",
          progress: 1,
          metadata,
          file: undefined,
          label,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setField(slip.id, {
        resource: {
          ...slip.resource,
          status: "failed",
          error: message,
          file,
          label,
        },
      });
    }
  };

  const fileThumbnail = (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      const url = URL.createObjectURL(file);
      return (
        <img
          src={url}
          alt={file.name}
          className="w-10 h-10 object-cover rounded border"
          onLoad={() => URL.revokeObjectURL(url)}
        />
      );
    }
    return (
      <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded text-xs">
        <i className="ri-file-text-line" />
      </div>
    );
  };

  return (
    <div className="p-4">
      <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">05</p>
      <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
        <div>Salary Slips (Optional) :</div>
        <button
          type="button"
          onClick={handleAdd}
          className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
        >
          + Add Salary Slip
        </button>
      </div>
      {fieldErr && <div className="text-red-500 text-sm mb-3">{fieldErr}</div>}
      {duplicateIndexes.length > 0 && (
        <div className="text-red-500 text-sm mb-3">
          Duplicate month/year combinations found. Each month and year combination must be unique.
        </div>
      )}

      {existing.length > 0 && (
        <div className="mb-6">
          <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
            Existing Salary Slips
          </h6>
          {existing.map((slip) => (
            <div
              key={slip.id}
              className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 bg-gray-50 dark:bg-gray-800"
            >
              <button
                type="button"
                onClick={() => removeSalarySlip(slip.id)}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Month</label>
                <input
                  type="text"
                  className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                  value={slip.month}
                  readOnly
                />
              </div>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Year</label>
                <input
                  type="text"
                  className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                  value={slip.year}
                  readOnly
                />
              </div>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">File Preview</label>
                <div className="flex items-center">
                  <a
                    href={slip.resource.metadata?.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline text-xs"
                  >
                    {slip.month} {slip.year}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft.length > 0 && (
        <div>
          {draft.map((slip, index) => {
            const isDuplicate = duplicateIndexes.includes(index);
            return (
              <div
                key={slip.id}
                className={`relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 ${
                  isDuplicate ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => removeSalarySlip(slip.id)}
                  className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                >
                  ✕
                </button>

                <div className="xl:col-span-2 col-span-6">
                  <label className="form-label">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`form-control w-full !rounded-md ${
                      fieldErr || isDuplicate ? "border-red-500" : ""
                    }`}
                    value={slip.month}
                    onChange={(e) => setField(slip.id, { month: e.target.value })}
                  >
                    <option value="">Select</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-2 col-span-6">
                  <label className="form-label">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`form-control w-full !rounded-md ${
                      fieldErr || isDuplicate ? "border-red-500" : ""
                    }`}
                    value={slip.year}
                    onChange={(e) => setField(slip.id, { year: e.target.value })}
                  >
                    <option value="">Select</option>
                    {yearOptions().map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-4 col-span-12">
                  <label className="form-label">Upload Salary Slip</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="form-control w-full !rounded-md"
                    disabled={!slip.month || !slip.year}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void handleFile(slip, file);
                    }}
                  />
                  <small className="text-gray-500 text-xs mt-1">
                    Supported formats: JPG, JPEG, PNG, PDF
                  </small>
                </div>

                {(slip.resource.file || slip.resource.metadata) && (
                  <div className="xl:col-span-4 col-span-12 mt-6">
                    <label className="form-label">File Preview</label>
                    <div className="flex items-center">
                      {slip.resource.file ? (
                        fileThumbnail(slip.resource.file)
                      ) : (
                        <a
                          href={slip.resource.metadata?.url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline text-xs"
                        >
                          {slip.resource.metadata?.originalName ?? "View"}
                        </a>
                      )}
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="text-xs">
                          {slip.resource.file?.name ?? "Uploaded File"}
                        </div>
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {slip.month} {slip.year}
                        </div>
                        {slip.resource.status === "uploading" && (
                          <div className="text-xs text-blue-600">Uploading…</div>
                        )}
                        {slip.resource.status === "failed" && (
                          <div className="text-xs text-red-600">
                            Failed: {slip.resource.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
