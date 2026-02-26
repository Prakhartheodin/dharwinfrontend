"use client"

import React from 'react'
import Link from 'next/link'
import type { Mentor } from '@/shared/lib/api/mentors'

export interface MentorViewModalProps {
  mentor: Mentor | null
  isLoading: boolean
  onClose: () => void
}

export default function MentorViewModal({
  mentor,
  isLoading,
  onClose,
}: MentorViewModalProps) {
  return (
    <div
      id="view-mentor-modal"
      className="hs-overlay hidden ti-modal"
    >
      <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-4xl lg:w-full m-3 lg:!mx-auto">
        <div className="ti-modal-content">
          <div className="ti-modal-header">
            <h6 className="ti-modal-title flex items-center gap-2">
              <i className="ri-eye-line text-primary"></i>
              Mentor Details
            </h6>
            <button
              type="button"
              className="hs-dropdown-toggle ti-modal-close-btn"
              data-hs-overlay="#view-mentor-modal"
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
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading mentor details...</p>
              </div>
            ) : mentor ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                  <img
                    src={mentor.profileImageUrl || '/assets/images/faces/1.jpg'}
                    alt={mentor.user?.name || 'Mentor'}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                    }}
                  />
                  <div className="flex-1">
                    <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{mentor.user?.name || 'Unknown'}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-mail-line"></i>
                        {mentor.user?.email || 'N/A'}
                      </span>
                      {mentor.phone && (
                        <span className="flex items-center gap-1">
                          <i className="ri-phone-line"></i>
                          {mentor.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <i className="ri-user-settings-line"></i>
                        Status: <span className="font-semibold capitalize">{mentor.status}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mentor.dateOfBirth && (
                    <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date of Birth</div>
                      <div className="font-semibold text-gray-800 dark:text-white">
                        {new Date(mentor.dateOfBirth).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  {mentor.gender && (
                    <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gender</div>
                      <div className="font-semibold text-gray-800 dark:text-white capitalize">{mentor.gender}</div>
                    </div>
                  )}
                </div>

                {mentor.address && (mentor.address.street || mentor.address.city || mentor.address.state || mentor.address.country) && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-map-pin-line text-primary"></i>
                      Address
                    </h6>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {[
                        mentor.address.street,
                        mentor.address.city,
                        mentor.address.state,
                        mentor.address.zipCode,
                        mentor.address.country
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                )}

                {mentor.expertise && mentor.expertise.length > 0 && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-star-line text-primary"></i>
                      Expertise
                    </h6>
                    <div className="space-y-3">
                      {mentor.expertise.map((exp, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                          <div className="font-semibold text-gray-800 dark:text-white">
                            {exp.area || 'N/A'} {exp.level && `(${exp.level})`}
                          </div>
                          {exp.yearsOfExperience && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {exp.yearsOfExperience} years of experience
                            </div>
                          )}
                          {exp.description && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{exp.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mentor.experience && mentor.experience.length > 0 && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-briefcase-line text-primary"></i>
                      Work Experience
                    </h6>
                    <div className="space-y-3">
                      {mentor.experience.map((exp, index) => (
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

                {mentor.certifications && mentor.certifications.length > 0 && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-award-line text-primary"></i>
                      Certifications
                    </h6>
                    <div className="space-y-3">
                      {mentor.certifications.map((cert, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                          <div className="font-semibold text-gray-800 dark:text-white">
                            {cert.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Issued by: {cert.issuer}
                          </div>
                          {cert.credentialId && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Credential ID: {cert.credentialId}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {cert.issueDate && `Issued: ${new Date(cert.issueDate).toLocaleDateString()}`}
                            {cert.expiryDate && ` • Expires: ${new Date(cert.expiryDate).toLocaleDateString()}`}
                          </div>
                          {cert.credentialUrl && (
                            <a
                              href={cert.credentialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-1 inline-block"
                            >
                              <i className="ri-external-link-line"></i> Verify credential
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mentor.skills && mentor.skills.length > 0 && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-tools-line text-primary"></i>
                      Skills
                    </h6>
                    <div className="flex flex-wrap gap-2">
                      {mentor.skills.map((skill, index) => (
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

                {mentor.bio && (
                  <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <i className="ri-file-text-line text-primary"></i>
                      Bio
                    </h6>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {mentor.bio}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No mentor selected</div>
            )}
          </div>
          <div className="ti-modal-footer">
            <button
              type="button"
              className="ti-btn ti-btn-light"
              data-hs-overlay="#view-mentor-modal"
              onClick={onClose}
            >
              Close
            </button>
            {mentor && (
              <Link
                href={`/training/mentors/edit/?id=${encodeURIComponent(mentor.id)}`}
                className="ti-btn ti-btn-primary"
                onClick={() => {
                  ;(window as any).HSOverlay?.close(document.querySelector('#view-mentor-modal'))
                }}
              >
                <i className="ri-pencil-line me-1"></i>
                Edit Mentor
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
