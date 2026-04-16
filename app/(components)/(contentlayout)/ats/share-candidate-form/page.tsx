"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useState, useRef } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { sendCandidateInvitation } from "@/shared/lib/api/auth";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

interface EmailRow {
  id: string;
  email: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ShareCandidateForm = () => {
  const { user } = useAuth();
  const nextIdRef = useRef(2);
  const [emails, setEmails] = useState<EmailRow[]>([{ id: "1", email: "" }]);
  const [importMode, setImportMode] = useState<"manual" | "excel">("manual");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string) => email.trim() !== "" && EMAIL_REGEX.test(email.trim());
  const validEmails = emails.filter((row) => validateEmail(row.email));

  const handleEmailChange = (id: string, value: string) => {
    setEmails((prev) => prev.map((row) => (row.id === id ? { ...row, email: value } : row)));
  };

  const addRow = () => {
    const id = String(nextIdRef.current++);
    setEmails((prev) => [...prev, { id, email: "" }]);
  };

  const removeRow = (id: string) => {
    if (emails.length <= 1) return;
    setEmails((prev) => prev.filter((row) => row.id !== id));
  };

  const buildOnboardUrl = (email: string): string => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const userId = user?.id ?? user?._id ?? "default-admin";
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const userHash = btoa(String(userId) + timestamp).replace(/[^a-zA-Z0-9]/g, "");
    const token = `${userHash}_${timestamp}_${randomStr}`;
    const encryptedEmail = btoa(email);
    const encryptedAdminId = btoa(String(userId));
    const expires = Date.now() + 24 * 60 * 60 * 1000;
    return `${origin}/candidate-onboard?token=${token}&adminId=${encryptedAdminId}&email=${encryptedEmail}&expires=${expires}`;
  };

  const handleSend = async () => {
    if (validEmails.length === 0) return;
    setIsLoading(true);
    try {
      const invitations = validEmails.map((row) => ({
        email: row.email.trim(),
        onboardUrl: buildOnboardUrl(row.email.trim()),
      }));
      await sendCandidateInvitation({ invitations });
      setEmails([{ id: "1", email: "" }]);
      await Swal.fire({
        icon: "success",
        title: "Invitations sent",
        text: `Preboarding links were sent to ${invitations.length} recipient(s).`,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to send invitations.";
      await Swal.fire({
        icon: "error",
        title: "Send failed",
        text: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseExcel = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array((e.target?.result as ArrayBuffer) || []);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
          const found = new Set<string>();
          rows.forEach((row) => {
            (Array.isArray(row) ? row : Object.values(row)).forEach((cell) => {
              if (typeof cell === "string" && EMAIL_REGEX.test(cell.trim())) found.add(cell.trim());
            });
          });
          resolve(Array.from(found));
        } catch {
          reject(new Error("Failed to parse file. Use .xlsx, .xls, or .csv with email addresses."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      await Swal.fire({ icon: "warning", title: "Invalid file", text: "Please upload an Excel (.xlsx, .xls) or CSV file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      await Swal.fire({ icon: "warning", title: "File too large", text: "File must be under 5MB." });
      return;
    }
    setIsLoading(true);
    try {
      const list = await parseExcel(file);
      if (list.length === 0) {
        await Swal.fire({ icon: "warning", title: "No emails found", text: "No valid email addresses were found in the file." });
        return;
      }
      const startId = nextIdRef.current;
      nextIdRef.current += list.length;
      setEmails(list.map((email, i) => ({ id: String(startId + i), email })));
      await Swal.fire({
        icon: "success",
        title: "Import complete",
        text: `${list.length} email(s) imported. You can review and send.`,
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Import failed", text: e instanceof Error ? e.message : "Could not parse file." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files[0] || null);
  };

  return (
    <Fragment>
      <Seo title="Share Candidate Onboarding Forms" />
      <div className="mt-5 min-h-[80vh] bg-gray-50 px-4 py-8 dark:bg-bodybg sm:mt-6 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Centered title and intro */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-defaulttextcolor dark:text-white mb-4">
              Share Candidate Onboarding Forms
            </h1>
            <p className="text-base text-defaulttextcolor/80 dark:text-white/70 max-w-xl mx-auto">
              Send personalized candidate onboarding form links to multiple candidates via email. Each candidate will receive their unique secure link to complete the onboarding process.
            </p>
          </div>

          {/* Main card */}
          <div className="bg-white dark:bg-white/5 rounded-xl shadow-lg border border-gray-200/80 dark:border-white/10 overflow-hidden">
            <div className="p-6 sm:p-8">
              {/* Input method */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-sm font-medium text-defaulttextcolor dark:text-white">Input Method:</span>
                <div className="flex rounded-lg overflow-hidden bg-gray-100 dark:bg-black/20 p-1 gap-0">
                  <button
                    type="button"
                    onClick={() => setImportMode("manual")}
                    className={`inline-flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                      importMode === "manual"
                        ? "bg-primary text-white shadow-sm"
                        : "text-defaulttextcolor dark:text-white/70 hover:text-defaulttextcolor dark:hover:text-white"
                    }`}
                  >
                    <i className="ri-edit-line text-lg" /> Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("excel")}
                    className={`inline-flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                      importMode === "excel"
                        ? "bg-primary text-white shadow-sm"
                        : "text-defaulttextcolor dark:text-white/70 hover:text-defaulttextcolor dark:hover:text-white"
                    }`}
                  >
                    <i className="ri-file-excel-2-line text-lg" /> Excel Import
                  </button>
                </div>
                {importMode === "excel" && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-primary ti-btn-sm rounded-lg"
                    onClick={() => {
                      const ws = XLSX.utils.aoa_to_sheet([["Email Address"], ["john.doe@example.com"], ["jane.smith@example.com"], ["candidate@company.com"]]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Email List");
                      XLSX.writeFile(wb, "candidate_email_template.xlsx");
                    }}
                  >
                    <i className="ri-download-line me-1" /> Download Template
                  </button>
                )}
              </div>

              {/* Candidate email addresses */}
              <div className="mb-6">
                <label className="form-label block mb-3 text-defaulttextcolor dark:text-white font-medium">
                  Candidate Email Addresses
                </label>
                {importMode === "manual" && (
                  <>
                    <div className="space-y-3">
                      {emails.map((row, index) => (
                        <div key={row.id} className="flex gap-2 items-center">
                          <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/50 pointer-events-none flex items-center justify-center w-6">
                              <i className="ri-mail-line text-lg" />
                            </span>
                            <input
                              type="email"
                              className="form-control w-full !pl-11 rounded-lg border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20"
                              placeholder={`Enter candidate ${index + 1}'s email address`}
                              value={row.email}
                              onChange={(e) => handleEmailChange(row.id, e.target.value)}
                              disabled={isLoading}
                            />
                          </div>
                          {emails.length > 1 && (
                            <button
                              type="button"
                              className="ti-btn ti-btn-light ti-btn-sm !min-w-[2.5rem] rounded-lg"
                              onClick={() => removeRow(row.id)}
                              disabled={isLoading}
                              aria-label="Remove"
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-lg border-2 border-primary text-primary bg-white dark:bg-transparent hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors"
                      onClick={addRow}
                      disabled={isLoading}
                    >
                      <i className="ri-add-line text-lg" /> Add Another Email
                    </button>
                    <p className="text-sm text-defaulttextcolor/70 dark:text-white/50 mt-2 mb-0">
                      Each candidate will receive an email with their unique onboarding form link.
                    </p>
                  </>
                )}

                {importMode === "excel" && (
                  <>
                    <div
                      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                        isDragOver ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-gray-200 dark:border-white/10"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      />
                      <i className="ri-file-excel-2-line text-4xl text-primary/70 dark:text-primary mb-3 block" />
                      <p className="text-defaulttextcolor dark:text-white/70 mb-2">Drag and drop your file here, or click to browse.</p>
                      <p className="text-sm text-defaulttextcolor/60 dark:text-white/50 mb-4">.xlsx, .xls, .csv — max 5MB</p>
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary rounded-lg"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        <i className="ri-upload-2-line me-1" /> Choose file
                      </button>
                    </div>
                    {emails.some((r) => r.email) && (
                      <p className="text-sm text-defaulttextcolor/70 dark:text-white/50 mt-2 mb-0">
                        {validEmails.length} valid email(s) loaded. Switch to Manual entry to edit or send now.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Send button - centered, prominent */}
              <div className="flex justify-center my-8">
                <button
                  type="button"
                  className="ti-btn ti-btn-primary !py-3 !px-8 !text-base rounded-lg min-w-[280px]"
                  onClick={handleSend}
                  disabled={isLoading || validEmails.length === 0}
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin me-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line me-2 text-lg" />
                      Send Onboarding Form Links ({validEmails.length} email{validEmails.length !== 1 ? "s" : ""})
                    </>
                  )}
                </button>
              </div>

              {/* What happens - info box */}
              <div className="rounded-lg p-4 sm:p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <h3 className="flex items-center gap-2 text-defaulttextcolor dark:text-white font-semibold mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm">
                    <i className="ri-information-line" />
                  </span>
                  What happens when you send the links?
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-defaulttextcolor/80 dark:text-white/70">
                  <li>Each candidate will receive a unique email with their personalized onboarding form link</li>
                  <li>They can click their link to access the candidate onboarding form</li>
                  <li>Each link is secure and expires in 24 hours</li>
                  <li>You can manually add email addresses or import them from an Excel file</li>
                  <li>Excel import supports .xlsx, .xls, and .csv files up to 5MB</li>
                  <li>You will receive confirmation for each successfully sent link</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer text */}
          <p className="text-center text-sm text-defaulttextcolor/60 dark:text-white/50 mt-8">
            This form is for sharing personalized candidate onboarding form links with multiple new candidates.
          </p>
        </div>
      </div>
    </Fragment>
  );
};

export default ShareCandidateForm;
