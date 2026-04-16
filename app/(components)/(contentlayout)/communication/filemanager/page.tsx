"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import {
  listFiles,
  uploadFile,
  getDownloadUrl,
  deleteFile,
  createFolder,
  type FileStorageFolder,
  type FileStorageFile,
} from "@/shared/lib/api/fileStorage";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

const EXT_CATEGORY_MAP: Record<string, string> = {
  jpg: "Images", jpeg: "Images", png: "Images", gif: "Images", webp: "Images", svg: "Images", bmp: "Images",
  mp4: "Videos", webm: "Videos", mov: "Videos", avi: "Videos", mkv: "Videos",
  pdf: "Documents", doc: "Documents", docx: "Documents", xls: "Documents", xlsx: "Documents",
  ppt: "Documents", pptx: "Documents", txt: "Documents", csv: "Documents", rtf: "Documents",
  mp3: "Music", wav: "Music", ogg: "Music", m4a: "Music",
  zip: "Archives", rar: "Archives", "7z": "Archives", tar: "Archives", gz: "Archives",
};

function getCategory(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_CATEGORY_MAP[ext] ?? "Files";
}

function getFileIcon(name: string): { icon: string; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cat = EXT_CATEGORY_MAP[ext];
  switch (cat) {
    case "Images": return { icon: "ri-image-line", color: "text-primary" };
    case "Videos": return { icon: "ri-movie-line", color: "text-secondary" };
    case "Documents": return { icon: "ri-file-text-line", color: "text-warning" };
    case "Music": return { icon: "ri-music-2-line", color: "text-info" };
    case "Archives": return { icon: "ri-archive-line", color: "text-purple" };
    default: return { icon: "ri-file-line", color: "text-[#8c9097]" };
  }
}

type SidebarView = "my-files" | "recent";

const CATEGORIES = [
  { name: "Images", icon: "ri-image-line", color: "text-primary", bgColor: "bg-primary/10" },
  { name: "Videos", icon: "ri-movie-line", color: "text-secondary", bgColor: "bg-secondary/10" },
  { name: "Documents", icon: "ri-file-text-line", color: "text-warning", bgColor: "bg-warning/10" },
  { name: "Music", icon: "ri-music-2-line", color: "text-info", bgColor: "bg-info/10" },
  { name: "Downloads", icon: "ri-download-cloud-line", color: "text-danger", bgColor: "bg-danger/10" },
  { name: "Archives", icon: "ri-archive-line", color: "text-purple", bgColor: "bg-purple/10" },
] as const;

const Filemanager = () => {
  const [isFoldersOpen, setFoldersOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);

  const [currentPrefix, setCurrentPrefix] = useState("");
  const [folders, setFolders] = useState<FileStorageFolder[]>([]);
  const [files, setFiles] = useState<FileStorageFile[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileStorageFile | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarView, setSidebarView] = useState<SidebarView>("my-files");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [allFiles, setAllFiles] = useState<FileStorageFile[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchList = useCallback(async (prefix: string, next?: string, append = false) => {
    if (!append) setLoading(true);
    setListError(null);
    try {
      const result = await listFiles(prefix || undefined, next);
      if (append) {
        setFolders((prev) => [...prev, ...result.folders]);
        setFiles((prev) => [...prev, ...result.files]);
      } else {
        setFolders(result.folders);
        setFiles(result.files);
      }
      setNextToken(result.nextContinuationToken);
      setIsTruncated(result.isTruncated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load files";
      setListError(message);
      if (!append) {
        setFolders([]);
        setFiles([]);
        setNextToken(null);
        setIsTruncated(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllFilesForCounts = useCallback(async () => {
    setCategoryLoading(true);
    try {
      const result = await listFiles(undefined, undefined);
      setAllFiles(result.files);
      const counts: Record<string, number> = {};
      for (const f of result.files) {
        const cat = getCategory(f.name);
        counts[cat] = (counts[cat] || 0) + 1;
      }
      for (const folder of result.folders) {
        counts[folder.name] = (counts[folder.name] || 0) + 1;
      }
      setCategoryCounts(counts);
    } catch {
      // silent fail for counts
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(currentPrefix);
  }, [currentPrefix, fetchList]);

  useEffect(() => {
    fetchAllFilesForCounts();
  }, [fetchAllFilesForCounts]);

  const totalSize = useMemo(() => {
    return allFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [allFiles]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const q = searchQuery.toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, searchQuery]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (sidebarView === "recent") {
      result = [...result].sort((a, b) => {
        const da = a.lastModified ? new Date(a.lastModified).getTime() : 0;
        const db = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        return db - da;
      });
    }
    return result;
  }, [files, searchQuery, sidebarView]);

  const handleResize = () => {
    const windowWidth = window.innerWidth;
    if (windowWidth <= 575) {
      setFoldersOpen(true);
      setDetailsOpen(false);
    } else if (windowWidth <= 1200) {
      setDetailsOpen(true);
    } else {
      setFoldersOpen(false);
      setDetailsOpen(false);
    }
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggleFolders = () => {
    if (window.innerWidth <= 575) {
      setFoldersOpen(true);
      setDetailsOpen(false);
    }
  };

  const handleToggleFoldersClose = () => setFoldersOpen(false);
  const handleToggleDetailsClose = () => setDetailsOpen(false);

  const handleMyFilesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPrefix("");
    setSelectedFile(null);
    setSidebarView("my-files");
    setSearchQuery("");
  };

  const handleRecentFilesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPrefix("");
    setSelectedFile(null);
    setSidebarView("recent");
    setSearchQuery("");
  };

  const handleFolderClick = (folderName: string) => {
    setCurrentPrefix((p) => (p ? `${p}${folderName}/` : `${folderName}/`));
    setSelectedFile(null);
    setSidebarView("my-files");
  };

  const handleCategoryClick = (catName: string) => {
    setCurrentPrefix(catName + "/");
    setSelectedFile(null);
    setSidebarView("my-files");
    setSearchQuery("");
  };

  const handleFileClick = (file: FileStorageFile) => {
    setSelectedFile(file);
    if (window.innerWidth <= 1200) setDetailsOpen(true);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    setListError(null);
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      try {
        await uploadFile(selectedFiles[i], currentPrefix || undefined);
        successCount++;
      } catch (err: unknown) {
        failCount++;
        const message = err instanceof Error ? err.message : "Upload failed";
        showToast(`Failed to upload "${selectedFiles[i].name}": ${message}`, "error");
      }
    }
    if (successCount > 0) {
      showToast(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully`, "success");
      await fetchList(currentPrefix);
      fetchAllFilesForCounts();
    }
    if (failCount > 0 && successCount === 0) {
      showToast("All uploads failed", "error");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      await createFolder(name, currentPrefix);
      showToast(`Folder "${name}" created`, "success");
      setShowFolderDialog(false);
      setNewFolderName("");
      await fetchList(currentPrefix);
      fetchAllFilesForCounts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create folder";
      showToast(message, "error");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedFile) return;
    try {
      const url = await getDownloadUrl(selectedFile.key);
      window.open(url, "_blank");
    } catch {
      showToast("Download link expired or failed. Try again.", "error");
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    if (!confirm(`Delete "${selectedFile.name}"?`)) return;
    try {
      await deleteFile(selectedFile.key);
      showToast(`"${selectedFile.name}" deleted`, "success");
      setSelectedFile(null);
      await fetchList(currentPrefix);
      fetchAllFilesForCounts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      showToast(message, "error");
    }
  };

  const handleLoadMore = () => {
    if (nextToken) fetchList(currentPrefix, nextToken, true);
  };

  const breadcrumbs = currentPrefix
    ? ["My Files", ...currentPrefix.replace(/\/$/, "").split("/")]
    : ["My Files"];

  const totalItems = folders.length + files.length;
  const totalAllItems = allFiles.length;

  return (
    <Fragment>
      <Seo title="File Manager" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
          toast.type === "success" ? "bg-success" : "bg-danger"
        }`}>
          <i className={toast.type === "success" ? "ri-check-line text-lg" : "ri-error-warning-line text-lg"} />
          <span>{toast.message}</span>
          <button type="button" className="ml-2 opacity-70 hover:opacity-100" onClick={() => setToast(null)}>
            <i className="ri-close-line" />
          </button>
        </div>
      )}

      {/* Create Folder Dialog */}
      {showFolderDialog && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-bodybg rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h6 className="font-semibold text-[1rem] mb-4 text-defaulttextcolor">Create New Folder</h6>
            <input
              type="text"
              className="form-control mb-4"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
            {currentPrefix && (
              <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-4">
                Location: {currentPrefix}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ti-btn ti-btn-light py-2 px-4"
                onClick={() => { setShowFolderDialog(false); setNewFolderName(""); }}
                disabled={creatingFolder}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary py-2 px-4"
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
              >
                {creatingFolder ? <i className="ri-loader-4-line animate-spin mr-1" /> : null}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="file-manager-container mt-5 p-2 gap-2 sm:mt-6 sm:!flex !block text-defaulttextcolor text-defaultsize">
        {/* Left sidebar */}
        <div className={`file-manager-navigation ${isFoldersOpen ? "close" : ""} bg-white dark:bg-bodybg border-e border-defaultborder/10`}>
          <div className="flex items-center justify-between w-full p-4 border-b border-defaultborder/10">
            <h6 className="font-semibold mb-0 text-[1rem] text-defaulttextcolor">File Manager</h6>
            <div className="hs-dropdown ti-dropdown">
              <button type="button" className="ti-btn ti-btn-sm ti-btn-primary" aria-label="Settings" aria-expanded="false">
                <i className="ri-settings-3-line" />
              </button>
              <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
                <li><button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-start">Hidden Files</button></li>
                <li><button type="button" className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-start">Settings</button></li>
              </ul>
            </div>
          </div>
          <div className="p-4 border-b border-defaultborder/10">
            <div className="input-group">
              <input
                type="text"
                className="form-control !bg-light dark:!bg-white/5 border-0 !rounded-s-sm"
                placeholder="Search Files"
                aria-label="Search files"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className="ti-btn ti-btn-light !rounded-s-none !mb-0"
                aria-label={searchQuery ? "Clear search" : "Search"}
                onClick={() => searchQuery && setSearchQuery("")}
              >
                <i className={`${searchQuery ? "ri-close-line" : "ri-search-line"} text-[#8c9097] dark:text-white/50`} />
              </button>
            </div>
          </div>
          <div>
            <PerfectScrollbar>
              <ul className="list-none files-main-nav p-4 mb-0" id="files-main-nav" onClick={handleToggleFolders}>
                <li className={`files-type ${sidebarView === "my-files" && !currentPrefix ? "active" : ""}`}>
                  <a
                    href="#!"
                    onClick={handleMyFilesClick}
                    className={`flex items-center gap-2 py-2 px-3 rounded-md ${
                      sidebarView === "my-files" && !currentPrefix
                        ? "bg-primary/10 text-primary"
                        : "text-[#8c9097] dark:text-white/50 hover:text-primary"
                    }`}
                  >
                    <i className="ri-folder-2-line text-[1rem]" />
                    <span className="flex-grow whitespace-nowrap">My Files</span>
                    <span className="badge bg-primary text-white text-[0.75rem]">{totalAllItems}</span>
                  </a>
                </li>
                <li className={`files-type ${sidebarView === "recent" ? "active" : ""}`}>
                  <a
                    href="#!"
                    onClick={handleRecentFilesClick}
                    className={`flex items-center gap-2 py-2 px-3 rounded-md ${
                      sidebarView === "recent"
                        ? "bg-primary/10 text-primary"
                        : "text-[#8c9097] dark:text-white/50 hover:text-primary"
                    }`}
                  >
                    <i className="ri-history-fill text-[1rem]" />
                    <span className="flex-grow whitespace-nowrap">Recent Files</span>
                  </a>
                </li>
                <li className="mt-2 pt-2 border-t border-defaultborder/10">
                  <p className="px-3 mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#8c9097] dark:text-white/40">Categories</p>
                </li>
                {CATEGORIES.map((cat) => (
                  <li key={cat.name} className={`files-type ${currentPrefix === cat.name + "/" ? "active" : ""}`}>
                    <a
                      href="#!"
                      onClick={(e) => { e.preventDefault(); handleCategoryClick(cat.name); }}
                      className={`flex items-center gap-2 py-2 px-3 rounded-md ${
                        currentPrefix === cat.name + "/"
                          ? "bg-primary/10 text-primary"
                          : "text-[#8c9097] dark:text-white/50 hover:text-primary"
                      }`}
                    >
                      <i className={`${cat.icon} text-[1rem] ${cat.color}`} />
                      <span className="flex-grow whitespace-nowrap">{cat.name}</span>
                      {!categoryLoading && (categoryCounts[cat.name] || 0) > 0 && (
                        <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50">
                          {categoryCounts[cat.name]}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
                <li className="mb-4 mt-4 pt-2 border-t border-defaultborder/10">
                  <div className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] px-3">
                    <p className="mb-1 font-bold text-defaulttextcolor text-[0.875rem]">Storage</p>
                    <p className="mb-1">{totalAllItems} {totalAllItems === 1 ? "item" : "items"} &middot; {formatSize(totalSize)}</p>
                    <div className="progress progress-xs mb-0">
                      <div
                        className="progress-bar bg-primary"
                        role="progressbar"
                        style={{ width: totalSize > 0 ? `${Math.min(Math.max((totalSize / (1024 * 1024 * 1024)) * 100, 1), 100).toFixed(0)}%` : "0%" }}
                        aria-valuenow={totalSize > 0 ? Math.min((totalSize / (1024 * 1024 * 1024)) * 100, 100) : 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <p className="text-[0.75rem] mt-1 mb-0 opacity-80">of 1 GB cloud storage</p>
                  </div>
                </li>
              </ul>
            </PerfectScrollbar>
          </div>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileInputChange} multiple aria-hidden />
        <div className={`file-manager-folders ${isFoldersOpen ? "open" : ""} bg-white dark:bg-bodybg`}>
          <div className="flex p-4 flex-wrap gap-3 items-center justify-between border-b border-defaultborder/10">
            <h6 className="font-semibold mb-0 text-[1rem]">
              {sidebarView === "recent" ? "Recent Files" : "Folders"}
            </h6>
            <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
              <button
                aria-label="Close"
                onClick={handleToggleFoldersClose}
                type="button"
                id="folders-close-btn"
                className="sm:hidden flex ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
              >
                <i className="ri-close-fill" />
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-md text-[0.8125rem] font-medium whitespace-nowrap border border-transparent bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[7.5rem]"
                aria-label="Create folder"
                onClick={() => setShowFolderDialog(true)}
              >
                <i className="ri-folder-add-line text-[1.125rem] shrink-0" aria-hidden />
                <span>Create Folder</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-md text-[0.8125rem] font-medium whitespace-nowrap border border-defaultborder/30 bg-white dark:bg-white/5 text-defaulttextcolor hover:bg-defaultborder/50 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-defaultborder/30 disabled:opacity-60 disabled:cursor-not-allowed min-w-[7.5rem]"
                onClick={handleUploadClick}
                disabled={uploading}
                aria-label="Upload file"
              >
                {uploading ? (
                  <i className="ri-loader-4-line animate-spin text-[1.125rem] shrink-0" aria-hidden />
                ) : (
                  <i className="ri-upload-cloud-line text-[1.125rem] shrink-0" aria-hidden />
                )}
                <span>{uploading ? "Uploading..." : "Upload File"}</span>
              </button>
            </div>
          </div>
          <div className="p-4 file-folders-container overflow-scroll" id="file-folders-container">
            {listError && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-[0.8125rem] font-medium mb-4">
                <i className="ri-error-warning-line shrink-0" />
                <span>{listError}</span>
                <button type="button" className="ml-auto text-danger/60 hover:text-danger" onClick={() => setListError(null)}>
                  <i className="ri-close-line" />
                </button>
              </div>
            )}
            <nav className="flex items-center gap-1.5 mb-4 flex-wrap text-[0.8125rem]" aria-label="Breadcrumb">
              {breadcrumbs.map((label, i) => (
                <Fragment key={i}>
                  {i > 0 && <i className="ri-arrow-right-s-line text-[#8c9097] dark:text-white/40" aria-hidden />}
                  <button
                    type="button"
                    className={`py-0.5 px-1 rounded font-medium transition-colors ${
                      i === breadcrumbs.length - 1
                        ? "text-primary"
                        : "text-[#8c9097] dark:text-white/50 hover:text-primary dark:hover:text-primary"
                    }`}
                    onClick={() => {
                      if (i === 0) { setCurrentPrefix(""); setSelectedFile(null); }
                      else {
                        const parts = breadcrumbs.slice(1, i + 1);
                        setCurrentPrefix(parts.join("/") + "/");
                        setSelectedFile(null);
                      }
                    }}
                  >
                    {label}
                  </button>
                </Fragment>
              ))}
            </nav>

            {/* Category quick-access grid — only on root */}
            {!currentPrefix && sidebarView === "my-files" && (
              <>
                <div className="flex mb-4 items-center justify-between">
                  <p className="mb-0 font-semibold text-[0.875rem]">Categories</p>
                </div>
                <div className="grid grid-cols-12 gap-x-6 gap-y-4 mb-6">
                  {CATEGORIES.map((cat) => {
                    const count = categoryCounts[cat.name] || 0;
                    return (
                      <div key={cat.name} className="xxl:col-span-4 xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-6">
                        <div
                          className={`box shadow-none rounded-lg cursor-pointer hover:!bg-primary/5 dark:hover:!bg-primary/10 transition-colors ${
                            currentPrefix === cat.name + "/" ? "!bg-primary/10 ring-1 ring-primary/30" : "!bg-light dark:!bg-white/5"
                          }`}
                          onClick={() => handleCategoryClick(cat.name)}
                        >
                          <div className="box-body !p-4">
                            <div className="flex justify-between flex-wrap items-center">
                              <div className={`w-10 h-10 rounded-lg ${cat.bgColor} flex items-center justify-center`}>
                                <i className={`${cat.icon} ${cat.color} text-[1.25rem]`} />
                              </div>
                              <div className="text-end">
                                <span className="font-semibold block text-[0.875rem]">{cat.name}</span>
                                <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50">
                                  {categoryLoading ? "..." : `${count} ${count === 1 ? "item" : "items"}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {loading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-12 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="xxl:col-span-3 xl:col-span-6 lg:col-span-6 md:col-span-6 col-span-12">
                      <div className="rounded-xl border border-defaultborder/20 dark:border-defaultborder/10 p-4 animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-defaultborder/20 dark:bg-white/10" />
                          <div className="h-4 flex-1 max-w-[8rem] rounded bg-defaultborder/20 dark:bg-white/10" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-defaultborder/20 dark:border-defaultborder/10 overflow-hidden">
                  <div className="border-b border-defaultborder/20 dark:border-defaultborder/10 bg-light/30 dark:bg-white/5 px-4 py-3 flex gap-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="h-4 w-24 rounded bg-defaultborder/20 dark:bg-white/10 animate-pulse" />
                    ))}
                  </div>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="px-4 py-3 border-b border-defaultborder/10 last:border-0 flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-defaultborder/20 dark:bg-white/10 animate-pulse" />
                      <div className="h-4 flex-1 max-w-xs rounded bg-defaultborder/20 dark:bg-white/10 animate-pulse" />
                      <div className="h-4 w-16 rounded bg-defaultborder/20 dark:bg-white/10 animate-pulse" />
                      <div className="h-4 w-24 rounded bg-defaultborder/20 dark:bg-white/10 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Folders */}
                {sidebarView !== "recent" && (
                  <>
                    <div className="flex mb-4 items-center justify-between">
                      <p className="mb-0 font-semibold text-[0.875rem]">
                        Folders
                        {filteredFolders.length > 0 && (
                          <span className="text-[#8c9097] dark:text-white/50 font-normal ml-1">({filteredFolders.length})</span>
                        )}
                      </p>
                    </div>
                    <div className="grid grid-cols-12 gap-x-6 gap-y-4 mb-6">
                      {filteredFolders.length === 0 ? (
                        <div className="col-span-12">
                          <div className="rounded-xl border border-dashed border-defaultborder/30 dark:border-defaultborder/20 bg-light/30 dark:bg-white/5 p-6 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-defaultborder/20 dark:bg-white/10 text-[#8c9097] dark:text-white/40 mb-2">
                              <i className="ri-folder-line text-2xl" />
                            </div>
                            <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-0">
                              {searchQuery ? "No folders match your search." : "No folders here. Create a folder or upload files."}
                            </p>
                          </div>
                        </div>
                      ) : (
                        filteredFolders.map((folder) => (
                          <div className="xxl:col-span-3 xl:col-span-6 lg:col-span-6 md:col-span-6 col-span-12" key={folder.prefix}>
                            <div
                              role="button"
                              tabIndex={0}
                              className="box border dark:border-defaultborder/10 shadow-none rounded-lg overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors"
                              onClick={() => handleFolderClick(folder.name)}
                              onKeyDown={(e) => e.key === "Enter" && handleFolderClick(folder.name)}
                            >
                              <div className="box-body !p-4 bg-white dark:bg-white/5">
                                <div className="mb-3 folder-svg-container flex flex-wrap justify-between items-start">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <i className="ri-folder-2-line text-primary text-[1.5rem]" />
                                  </div>
                                  <div className="hs-dropdown ti-dropdown" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" className="ti-btn ti-btn-sm ti-btn-primary !rounded" aria-label="Folder menu">
                                      <i className="ri-more-2-fill" />
                                    </button>
                                    <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
                                      <li>
                                        <button
                                          type="button"
                                          className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] w-full text-start"
                                          onClick={() => handleFolderClick(folder.name)}
                                        >
                                          Open
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                                <p className="text-[0.875rem] font-semibold mb-1 text-defaulttextcolor truncate">{folder.name}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* Files */}
                <div className="flex mb-4 items-center justify-between">
                  <p className="mb-0 font-semibold text-[0.875rem]">
                    {sidebarView === "recent" ? "Recent Files" : "Files"}
                    {filteredFiles.length > 0 && (
                      <span className="text-[#8c9097] dark:text-white/50 font-normal ml-1">({filteredFiles.length})</span>
                    )}
                  </p>
                  {sidebarView === "my-files" && !currentPrefix && (
                    <button
                      type="button"
                      className="ti-btn !py-1 !px-2 !text-[0.75rem] ti-btn-primary"
                      onClick={handleMyFilesClick}
                    >
                      View All
                    </button>
                  )}
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <div className="rounded-xl border border-defaultborder/20 dark:border-defaultborder/10 overflow-hidden bg-white dark:bg-white/5 shadow-sm">
                    <div className="table-responsive overflow-x-auto">
                      <table className="table min-w-full whitespace-nowrap mb-0">
                        <thead>
                          <tr className="border-b border-defaultborder/20 dark:border-defaultborder/10 bg-light/40 dark:bg-white/5">
                            <th scope="col" className="text-start py-3 px-4 text-[0.75rem] font-semibold uppercase tracking-wider text-[#8c9097] dark:text-white/50">File Name</th>
                            <th scope="col" className="text-start py-3 px-4 text-[0.75rem] font-semibold uppercase tracking-wider text-[#8c9097] dark:text-white/50">Category</th>
                            <th scope="col" className="text-start py-3 px-4 text-[0.75rem] font-semibold uppercase tracking-wider text-[#8c9097] dark:text-white/50">Size</th>
                            <th scope="col" className="text-start py-3 px-4 text-[0.75rem] font-semibold uppercase tracking-wider text-[#8c9097] dark:text-white/50">Date Modified</th>
                            <th scope="col" className="text-start py-3 px-4 text-[0.75rem] font-semibold uppercase tracking-wider text-[#8c9097] dark:text-white/50 w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody className="files-list divide-y divide-defaultborder/10">
                          {filteredFiles.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 px-4 text-center">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-light dark:bg-white/10 text-[#8c9097] dark:text-white/40 mb-3">
                                  <i className="ri-folder-open-line text-3xl" />
                                </div>
                                <p className="text-defaulttextcolor font-medium mb-1">
                                  {searchQuery ? "No files match your search" : "No files in this folder"}
                                </p>
                                <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-4 max-w-xs mx-auto">
                                  {searchQuery ? "Try a different search term." : "Upload a file or open a folder to see files here."}
                                </p>
                                {!searchQuery && (
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-primary gap-2 py-2 px-4 rounded-lg text-sm font-medium"
                                    onClick={handleUploadClick}
                                    disabled={uploading}
                                  >
                                    {uploading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-upload-cloud-line" />}
                                    <span>Upload File</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ) : (
                            filteredFiles.map((file) => {
                              const fIcon = getFileIcon(file.name);
                              return (
                                <tr
                                  key={file.key}
                                  className={`cursor-pointer transition-colors duration-150 ${
                                    selectedFile?.key === file.key
                                      ? "bg-light dark:bg-white/10 border-l-2 border-l-primary"
                                      : "hover:bg-light/50 dark:hover:bg-white/5 border-l-2 border-l-transparent"
                                  }`}
                                  onClick={() => handleFileClick(file)}
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-defaultborder/30 dark:bg-white/10 shrink-0">
                                        <i className={`${fIcon.icon} text-lg ${fIcon.color}`} />
                                      </div>
                                      <span className="font-medium text-defaulttextcolor truncate max-w-[12rem] sm:max-w-none">{file.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-[0.875rem] text-[#8c9097] dark:text-white/50">{getCategory(file.name)}</td>
                                  <td className="py-3 px-4 text-[0.875rem] text-[#8c9097] dark:text-white/50">{formatSize(file.size)}</td>
                                  <td className="py-3 px-4 text-[0.875rem] text-[#8c9097] dark:text-white/50">{formatDate(file.lastModified)}</td>
                                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        aria-label="Download"
                                        className="ti-btn ti-btn-icon ti-btn-sm !rounded-full !h-8 !w-8 bg-info/10 text-info hover:bg-info hover:text-white border-0 transition-colors duration-150"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            const url = await getDownloadUrl(file.key);
                                            window.open(url, "_blank");
                                          } catch {
                                            showToast("Download failed. Try again.", "error");
                                          }
                                        }}
                                      >
                                        <i className="ri-download-line" />
                                      </button>
                                      <button
                                        type="button"
                                        aria-label="Delete"
                                        className="ti-btn ti-btn-icon ti-btn-sm !rounded-full !h-8 !w-8 bg-danger/10 text-danger hover:bg-danger hover:text-white border-0 transition-colors duration-150"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!confirm(`Delete "${file.name}"?`)) return;
                                          try {
                                            await deleteFile(file.key);
                                            showToast(`"${file.name}" deleted`, "success");
                                            if (selectedFile?.key === file.key) setSelectedFile(null);
                                            await fetchList(currentPrefix);
                                            fetchAllFilesForCounts();
                                          } catch (err) {
                                            showToast(err instanceof Error ? err.message : "Delete failed", "error");
                                          }
                                        }}
                                      >
                                        <i className="ri-delete-bin-line" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {isTruncated && nextToken && filteredFiles.length > 0 && (
                          <tfoot>
                            <tr className="border-t border-defaultborder/20 dark:border-defaultborder/10 bg-light/20 dark:bg-white/5">
                              <td colSpan={5} className="py-3 px-4">
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-light py-2 px-4 rounded-xl text-sm font-medium hover:bg-defaultborder/20 transition-colors duration-150"
                                  onClick={handleLoadMore}
                                >
                                  Load more
                                </button>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* File Details panel */}
        <div className={`selected-file-details ${isDetailsOpen ? "open" : ""} bg-white dark:bg-bodybg border-s border-defaultborder/10`}>
          <div className="flex p-4 items-center justify-between border-b border-defaultborder/10">
            <h6 className="font-semibold mb-0 text-[1rem]">File Details</h6>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleDetailsClose}
                aria-label="Close details"
                type="button"
                id="file-close-btn"
                className="xl:hidden flex ti-btn ti-btn-icon ti-btn-sm ti-btn-ghost text-[#8c9097] hover:text-danger"
              >
                <i className="ri-close-fill" />
              </button>
            </div>
          </div>
          <div className="filemanager-file-details overflow-scroll bg-light/20 dark:bg-white/[0.02]" id="filemanager-file-details">
            {selectedFile ? (
              <>
                <div className="p-4 border-b border-defaultborder/10">
                  <div className="inline-flex items-center justify-center w-full aspect-[4/2] max-h-40 rounded-lg bg-defaultborder/20 dark:bg-white/10 mb-4">
                    {(() => {
                      const fIcon = getFileIcon(selectedFile.name);
                      return <i className={`${fIcon.icon} text-5xl ${fIcon.color}`} />;
                    })()}
                  </div>
                  <p className="mb-1 font-semibold text-defaulttextcolor break-words">{selectedFile.name}</p>
                  <p className="mb-0 text-[0.8125rem] text-[#8c9097] dark:text-white/50">
                    {formatSize(selectedFile.size)} &middot; {formatDate(selectedFile.lastModified)}
                  </p>
                </div>
                <div className="p-4 space-y-3 text-[0.875rem] border-b border-defaultborder/10">
                  <div>
                    <p className="mb-0.5 font-medium text-[#8c9097] dark:text-white/50 text-[0.75rem] uppercase tracking-wider">File Format</p>
                    <p className="mb-0 text-defaulttextcolor">.{selectedFile.name.split(".").pop()?.toLowerCase() ?? "—"}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 font-medium text-[#8c9097] dark:text-white/50 text-[0.75rem] uppercase tracking-wider">Category</p>
                    <p className="mb-0 text-defaulttextcolor">{getCategory(selectedFile.name)}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 font-medium text-[#8c9097] dark:text-white/50 text-[0.75rem] uppercase tracking-wider">File Location</p>
                    <p className="mb-0 text-defaulttextcolor break-all">{currentPrefix ? `${currentPrefix}${selectedFile.name}` : selectedFile.name}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 font-medium text-[#8c9097] dark:text-white/50 text-[0.75rem] uppercase tracking-wider">Size</p>
                    <p className="mb-0 text-defaulttextcolor">{formatSize(selectedFile.size)}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 font-medium text-[#8c9097] dark:text-white/50 text-[0.75rem] uppercase tracking-wider">Last Modified</p>
                    <p className="mb-0 text-defaulttextcolor">{formatDate(selectedFile.lastModified)}</p>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary w-full gap-2 py-2 rounded-lg font-medium text-sm"
                    onClick={handleDownload}
                  >
                    <i className="ri-download-line" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-danger w-full gap-2 py-2 rounded-lg font-medium text-sm"
                    onClick={handleDelete}
                  >
                    <i className="ri-delete-bin-line" />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[280px] p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-light dark:bg-white/10 text-[#8c9097] dark:text-white/40 mb-4 ring-1 ring-defaultborder/10 dark:ring-white/10">
                  <i className="ri-file-list-3-line text-3xl" />
                </div>
                <p className="text-defaulttextcolor font-medium text-[0.9375rem] mb-1">No file selected</p>
                <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 max-w-[12rem]">Select a file from the list to view details, download, or delete.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default Filemanager;
