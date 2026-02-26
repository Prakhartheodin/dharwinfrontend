"use client"

import React from 'react'
import Link from 'next/link'
import type { Student } from '@/shared/lib/api/students'

export interface StudentViewModalProps {
  student: Student | null
  isLoading: boolean
  onClose: () => void
}

export default function StudentViewModal({
  student,
  isLoading,
  onClose,
}: StudentViewModalProps) {
  return (
    <div
      id="view-student-modal"
      className="hs-overlay hidden ti-modal"
    >
      <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-4xl lg:w-full m-3 lg:!mx-auto">
        <div className="ti-modal-content">
          <div className="ti-modal-header">
            <h6 className="ti-modal-title flex items-center gap-2">
              <i className="ri-eye-line text-primary"></i>
              Student Details
            </h6>
            <button
              type="button"
              className="hs-dropdown-toggle ti-modal-close-btn"
              data-hs-overlay="#view-student-modal"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div className="ti-modal-body">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading student details...</p>
              </div>
            ) : student ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                  <img
                    src={student.profileImageUrl || '/assets/images/faces/1.jpg'}
                    alt={student.user?.name || 'Student'}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                    }}
                  />
                  <div className="flex-1">
                    <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{student.user?.name || 'Unknown'}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-mail-line"></i>
                        {student.user?.email || 'N/A'}
                      </span>
                      {student.phone && (
                        <span className="flex items-center gap-1">
                          <i className="ri-phone-line"></i>
                          {student.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <i className="ri-user-settings-line"></i>
                        Status: <span className="font-semibold capitalize">{student.status}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {student.dateOfBirth && (
                    <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date of Birth</div>
                      <div className="font-semibold text-gray-800 dark:text-white">
                        {new Date(student.dateOfBirth).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  {student.gender && (
                    <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gender</div>
                      <div className="font-semibold text-gray-800 dark:text-white capitalize">{student.gender}</div>
                    </div>
                  )}
                </div>

                {student.address && (student.address.street || student.address.city || student.address.state || student.address.country) && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-map-pin-line text-primary"></i>
                      Address
                    </h6>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {[
                        student.address.street,
                        student.address.city,
                        student.address.state,
                        student.address.zipCode,
                        student.address.country
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                )}

                {student.education && student.education.length > 0 && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-graduation-cap-line text-primary"></i>
                      Education
                    </h6>
                    <div className="space-y-3">
                      {student.education.map((edu, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                          <div className="font-semibold text-gray-800 dark:text-white">
                            {edu.degree || 'N/A'} {edu.institution && `- ${edu.institution}`}
                          </div>
                          {edu.fieldOfStudy && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Field: {edu.fieldOfStudy}</div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {edu.startDate && new Date(edu.startDate).toLocaleDateString()} - {' '}
                            {edu.isCurrent ? 'Present' : (edu.endDate ? new Date(edu.endDate).toLocaleDateString() : 'N/A')}
                          </div>
                          {edu.description && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{edu.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {student.experience && student.experience.length > 0 && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-briefcase-line text-primary"></i>
                      Work Experience
                    </h6>
                    <div className="space-y-3">
                      {student.experience.map((exp, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                          <div className="font-semibold text-gray-800 dark:text-white">
                            {exp.title || 'N/A'} {exp.company && `at ${exp.company}`}
                          </div>
                          {exp.location && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <i className="ri-map-pin-line"></i> {exp.location}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {exp.startDate && new Date(exp.startDate).toLocaleDateString()} - {' '}
                            {exp.isCurrent ? 'Present' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'N/A')}
                          </div>
                          {exp.description && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{exp.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {student.skills && student.skills.length > 0 && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-tools-line text-primary"></i>
                      Skills
                    </h6>
                    <div className="flex flex-wrap gap-2">
                      {student.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="badge bg-primary/10 text-primary border border-primary/30 px-3 py-1 rounded-md text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {student.documents && student.documents.length > 0 && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-file-line text-primary"></i>
                      Documents
                    </h6>
                    <div className="space-y-2">
                      {student.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-black/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <i className="ri-file-text-line text-primary"></i>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-white">{doc.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{doc.type}</div>
                            </div>
                          </div>
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ti-btn ti-btn-sm ti-btn-primary"
                            >
                              <i className="ri-external-link-line"></i>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {student.bio && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-file-text-line text-primary"></i>
                      Bio
                    </h6>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {student.bio}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No student selected</div>
            )}
          </div>
          <div className="ti-modal-footer">
            <button
              type="button"
              className="ti-btn ti-btn-light"
              data-hs-overlay="#view-student-modal"
              onClick={onClose}
            >
              Close
            </button>
            {student && (
              <Link
                href={`/training/students/edit/?id=${encodeURIComponent(student.id)}`}
                className="ti-btn ti-btn-primary"
                onClick={() => {
                  ;(window as any).HSOverlay?.close(document.querySelector('#view-student-modal'))
                }}
              >
                <i className="ri-pencil-line me-1"></i>
                Edit Student
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
