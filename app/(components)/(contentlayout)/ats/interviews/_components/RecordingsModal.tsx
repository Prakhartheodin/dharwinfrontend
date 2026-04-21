"use client"
import React from 'react'

/** Shared shape for interview + internal meeting recordings from `/recordings` APIs */
export interface RecordingListItem {
  id: string
  startedAt: string
  completedAt: string | null
  status: string
  playbackUrl?: string | null
  playbackError?: string
}

export interface RecordingsModalProps {
  recordingsLoading: boolean
  recordingsError: string | null
  recordingsList: RecordingListItem[]
  onClose: () => void
}

export default function RecordingsModal({
  recordingsLoading,
  recordingsError,
  recordingsList,
  onClose,
}: RecordingsModalProps) {
  return (
    <div
      id="view-recordings-modal"
      className="hs-overlay hidden ti-modal size-lg !z-[105]"
      tabIndex={-1}
      aria-labelledby="view-recordings-modal-label"
      aria-hidden="true"
    >
      <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out transition-all sm:max-w-2xl">
        <div className="ti-modal-content border border-defaultborder dark:border-defaultborder/10 rounded-xl shadow-xl overflow-hidden">
          <div className="ti-modal-header bg-gray-50 dark:bg-black/20 border-b border-defaultborder dark:border-defaultborder/10 px-6 py-4">
            <h3 id="view-recordings-modal-label" className="ti-modal-title text-lg font-semibold text-defaulttextcolor dark:text-white flex items-center gap-2">
              <i className="ri-video-line text-success"></i>
              Recordings
            </h3>
            <button
              type="button"
              className="ti-modal-close-btn hs-dropdown-toggle flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 dark:hover:text-white/80 rounded-md hover:bg-gray-100 dark:hover:bg-black/40 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
              data-hs-overlay="#view-recordings-modal"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="ti-modal-body px-6 py-5">
            {recordingsLoading && (
              <div className="flex items-center justify-center py-8 text-defaulttextcolor dark:text-white/70">
                <span className="animate-spin inline-block me-2 w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></span>
                Loading recordings...
              </div>
            )}
            {!recordingsLoading && recordingsError && (
              <div className="py-4 px-4 rounded-lg bg-danger/10 text-danger text-sm">
                {recordingsError}
              </div>
            )}
            {!recordingsLoading && !recordingsError && recordingsList.length === 0 && (
              <p className="text-defaulttextcolor/70 dark:text-white/70 text-sm py-4">No recordings for this meeting yet.</p>
            )}
            {!recordingsLoading && !recordingsError && recordingsList.length > 0 && (
              <ul className="space-y-3">
                {recordingsList.map((rec) => (
                  <li
                    key={rec.id}
                    className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg border border-defaultborder dark:border-defaultborder/10 bg-gray-50/50 dark:bg-black/20"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-defaulttextcolor dark:text-white truncate">
                        {rec.completedAt
                          ? new Date(rec.completedAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : new Date(rec.startedAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                      </p>
                      <p className="text-xs text-defaulttextcolor/70 dark:text-white/70 mt-0.5">
                        {rec.status === 'completed' ? 'Completed' : 'Recording'}
                      </p>
                    </div>
                    {rec.status === 'completed' && (rec.playbackUrl || rec.playbackError) && (
                      <div className="flex-shrink-0">
                        {rec.playbackUrl ? (
                          <a
                            href={rec.playbackUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-success text-white !py-1.5 !px-3 !text-xs font-medium whitespace-nowrap hover:bg-success/90"
                          >
                            <i className="ri-play-line"></i>
                            <span>Play</span>
                          </a>
                        ) : (
                          <span className="text-xs text-danger">{rec.playbackError || 'Playback unavailable'}</span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
