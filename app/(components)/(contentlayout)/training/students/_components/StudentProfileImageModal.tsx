"use client"

import React from 'react'

export interface StudentProfileImageModalStudent {
  id: string
  name: string
}

export interface StudentProfileImageModalProps {
  student: StudentProfileImageModalStudent | null
  profileImageUrl: string | null
  profileImageLoading: boolean
  profileImageUploading: boolean
  profileImageError: string | null
  onClose: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function StudentProfileImageModal({
  student,
  profileImageUrl,
  profileImageLoading,
  profileImageUploading,
  profileImageError,
  onClose,
  onFileChange,
}: StudentProfileImageModalProps) {
  return (
    <div
      id="student-profile-image-modal"
      className="hs-overlay hidden ti-modal"
      tabIndex={-1}
    >
      <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out">
        <div className="ti-modal-content">
          <div className="ti-modal-header">
            <h6 className="modal-title text-[1rem] font-semibold text-default dark:text-defaulttextcolor/70">
              {student
                ? `Profile Image – ${student.name}`
                : 'Profile Image'}
            </h6>
            <button
              type="button"
              className="hs-dropdown-toggle !text-[1rem] !font-semibold"
              data-hs-overlay="#student-profile-image-modal"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <i className="ri-close-line"></i>
            </button>
          </div>
          <div className="ti-modal-body px-6 space-y-4">
            {profileImageLoading ? (
              <p className="text-sm text-defaulttextcolor/70 mb-0">
                Loading current profile image...
              </p>
            ) : profileImageUrl ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profileImageUrl}
                  alt={student?.name || 'Profile image'}
                  className="w-24 h-24 rounded-full object-cover border border-defaultborder"
                />
                <p className="text-xs text-defaulttextcolor/60 mb-0">
                  This preview URL is temporary and may expire; refresh to get a new one.
                </p>
              </div>
            ) : (
              <p className="text-sm text-defaulttextcolor/70 mb-0">
                No profile image has been uploaded for this student yet.
              </p>
            )}

            {profileImageError && (
              <div className="p-2 rounded border border-danger/20 bg-danger/5 text-danger text-xs">
                {profileImageError}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="student-profile-image-file"
                className="form-label text-sm font-medium"
              >
                {profileImageUrl ? 'Change picture' : 'Add picture'}
              </label>
              <input
                id="student-profile-image-file"
                type="file"
                accept="image/*"
                className="form-control"
                onChange={onFileChange}
                disabled={profileImageUploading || !student}
              />
              <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                Allowed types: PNG, JPG, JPEG. The image is uploaded securely and stored on the
                file storage backend.
              </p>
              {profileImageUploading && (
                <p className="text-[0.75rem] text-primary mt-1 mb-0">
                  Uploading profile image...
                </p>
              )}
            </div>
          </div>
          <div className="ti-modal-footer">
            <button
              type="button"
              className="ti-btn ti-btn-light align-middle"
              data-hs-overlay="#student-profile-image-modal"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
