"use client"
import React from 'react'

interface CandidateShareModalProps {
  shareCandidate: any | null
  setShareCandidate: (v: any | null) => void
  shareWithDoc: boolean
  setShareWithDoc: (v: boolean) => void
  sharedPublicUrl: string | null
  sharedPublicUrlForId: string | null
  copied: boolean
  handleCopyUrl: (url: string) => void
  showEmailInput: boolean
  setShowEmailInput: (v: boolean) => void
  shareEmail: string
  setShareEmail: (v: string) => void
  shareSubmitting: boolean
  handleShareWhatsApp: (candidate: any) => void
  handleEmailShareClick: () => void
  handleSendEmail: () => void
}

export default function CandidateShareModal({
  shareCandidate,
  setShareCandidate,
  shareWithDoc,
  setShareWithDoc,
  sharedPublicUrl,
  sharedPublicUrlForId,
  copied,
  handleCopyUrl,
  showEmailInput,
  setShowEmailInput,
  shareEmail,
  setShareEmail,
  shareSubmitting,
  handleShareWhatsApp,
  handleEmailShareClick,
  handleSendEmail,
}: CandidateShareModalProps) {
  if (!shareCandidate) return null

  const handleClose = () => {
    setShareCandidate(null)
    setShowEmailInput(false)
    setShareEmail('')
  }

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleClose} />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-lg my-8 sm:align-middle">
          <div className="ti-modal-content">
            <div className="ti-modal-header px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-share-line text-primary"></i>
                Share Employee
              </h6>
              <button
                type="button"
                className="ti-modal-close-btn text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={handleClose}
              >
                <span className="sr-only">Close</span>
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="ti-modal-body px-4 sm:px-6 py-4">
              {shareCandidate ? (
                <div className="space-y-4">
                  {/* Employee info */}
                  <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-1">{shareCandidate.name}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shareCandidate.email} • {shareCandidate.phone}
                    </p>
                  </div>

                  {/* Include documents in shared link */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="form-check-input" checked={shareWithDoc} onChange={(e) => setShareWithDoc(e.target.checked)} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include documents in shared link</span>
                  </label>

                  {/* Copy URL Section */}
                  <div>
                    <label className="form-label mb-2 font-semibold text-sm text-gray-800 dark:text-white">
                      Shareable link
                    </label>
                    {(sharedPublicUrl && sharedPublicUrlForId === shareCandidate.id) ? (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="form-control text-sm"
                            value={sharedPublicUrl}
                            readOnly
                          />
                          <button
                            type="button"
                            className={`ti-btn ${copied ? 'ti-btn-success' : 'ti-btn-primary'}`}
                            onClick={() => handleCopyUrl(sharedPublicUrl)}
                          >
                            <i className={`ri-${copied ? 'check' : 'file-copy'}-line me-1`}></i>
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This link was sent in the email. Recipients can open it to view the profile.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Send the email above to generate a shareable link. The link (with token) will appear here and was also included in the email.</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="form-control text-sm bg-gray-100 dark:bg-gray-800"
                            value="Send email first to get link"
                            readOnly
                          />
                        </div>
                      </>
                    )}
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
                        onClick={() => handleShareWhatsApp(shareCandidate)}
                      >
                        <i className="ri-whatsapp-line text-xl"></i>
                        WhatsApp
                      </button>
                      
                      {!showEmailInput ? (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary w-full flex items-center justify-center gap-2"
                          onClick={handleEmailShareClick}
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
                              if (e.key === 'Enter' && !shareSubmitting) handleSendEmail()
                            }}
                            disabled={shareSubmitting}
                          />
                          <div className="flex gap-2 items-center">
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary flex-1"
                              onClick={handleSendEmail}
                              disabled={!shareEmail.trim() || shareSubmitting}
                            >
                              {shareSubmitting ? (
                                <>
                                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin me-1.5" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <i className="ri-send-plane-line me-1"></i>
                                  Send
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="ti-btn ti-btn-light"
                              onClick={() => {
                                setShowEmailInput(false)
                                setShareEmail('')
                              }}
                              disabled={shareSubmitting}
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
                <div className="text-center py-4 text-gray-500">No candidate selected</div>
              )}
            </div>
            <div className="ti-modal-footer px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
