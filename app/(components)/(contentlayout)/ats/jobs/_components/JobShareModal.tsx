"use client"
import React from 'react'

interface JobShareModalProps {
  shareJob: any
  setShareJob: (job: any) => void
  copied: boolean
  shareEmail: string
  setShareEmail: (v: string) => void
  showEmailInput: boolean
  setShowEmailInput: (v: boolean) => void
  getJobPublicUrl: (jobId: string) => string
  handleCopyUrl: (url: string) => void
  handleShareWhatsApp: (job: any) => void
  handleSendEmail: () => void
  shareEmailSending: boolean
  /** True while HMAC `?ref=` is being fetched (URL unique to you + this job) */
  personalLinkLoading?: boolean
  /** False until `ref` token is loaded — WhatsApp needs this so the shared text matches Copy */
  shareReferralReady?: boolean
  onCloseShareModal?: () => void
}

const JobShareModal: React.FC<JobShareModalProps> = ({
  shareJob,
  setShareJob,
  copied,
  shareEmail,
  setShareEmail,
  showEmailInput,
  setShowEmailInput,
  getJobPublicUrl,
  handleCopyUrl,
  handleShareWhatsApp,
  handleSendEmail,
  shareEmailSending,
  personalLinkLoading = false,
  shareReferralReady = false,
  onCloseShareModal,
}) => {
  return (
      <div 
        id="share-job-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-share-line text-primary"></i>
                Share Job
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#share-job-modal"
                onClick={() => {
                  setShareJob(null)
                  setShowEmailInput(false)
                  setShareEmail('')
                  onCloseShareModal?.()
                }}
              >
                <span className="sr-only">Close</span>
                <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div className="ti-modal-body">
              {shareJob ? (
                <div className="space-y-4">
                  {/* Job Info */}
                  <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-1">{shareJob.jobTitle}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shareJob.company} • {shareJob.location}
                    </p>
                  </div>

                  {/* Copy URL Section */}
                  <div>
                    <label className="form-label mb-2 font-semibold text-sm text-gray-800 dark:text-white">
                      Public URL
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Includes a personal <code className="text-[0.7rem]">?ref=</code> so referrals credit your account
                      (differs for each person who shares this job).
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="form-control"
                        value={personalLinkLoading ? '' : getJobPublicUrl(shareJob.id)}
                        placeholder={personalLinkLoading ? 'Generating your personal tracking link…' : ''}
                        readOnly
                      />
                      <button
                        type="button"
                        className={`ti-btn ${copied ? 'ti-btn-success' : 'ti-btn-primary'}`}
                        disabled={personalLinkLoading || !getJobPublicUrl(shareJob.id)}
                        onClick={() => handleCopyUrl(getJobPublicUrl(shareJob.id))}
                      >
                        <i className={`ri-${copied ? 'check' : 'file-copy'}-line me-1`}></i>
                        {personalLinkLoading ? 'Loading…' : copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Share Options */}
                  <div>
                    <label className="form-label mb-3 font-semibold text-sm text-gray-800 dark:text-white">
                      Share via
                    </label>
                    <div className="space-y-3">
                      <button
                        type="button"
                        className="ti-btn ti-btn-success w-full flex items-center justify-center gap-2"
                        disabled={personalLinkLoading || !shareReferralReady}
                        onClick={() => handleShareWhatsApp(shareJob)}
                      >
                        <i className="ri-whatsapp-line text-xl"></i>
                        WhatsApp
                      </button>
                      
                      {!showEmailInput ? (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary w-full flex items-center justify-center gap-2"
                          onClick={() => setShowEmailInput(true)}
                        >
                          <i className="ri-mail-line text-xl"></i>
                          Email
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="email"
                            className="form-control"
                            placeholder="Enter email address"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSendEmail()
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary flex-1"
                              onClick={handleSendEmail}
                              disabled={!shareEmail.trim() || shareEmailSending}
                            >
                              <i className="ri-send-plane-line me-1"></i>
                              {shareEmailSending ? 'Sending...' : 'Send'}
                            </button>
                            <button
                              type="button"
                              className="ti-btn ti-btn-light"
                              onClick={() => {
                                setShowEmailInput(false)
                                setShareEmail('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No job selected</div>
              )}
            </div>
            <div className="ti-modal-footer">
              <button 
                type="button" 
                className="ti-btn ti-btn-light" 
                data-hs-overlay="#share-job-modal"
                onClick={() => {
                  setShareJob(null)
                  setShowEmailInput(false)
                  setShareEmail('')
                  onCloseShareModal?.()
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
  )
}

export default JobShareModal
