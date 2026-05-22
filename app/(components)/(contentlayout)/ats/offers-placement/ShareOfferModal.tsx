'use client';
import { useState } from 'react';
import { shareOfferWithCandidate } from '@/shared/lib/api/offers';
import { getApiErrorMessage } from '@/shared/lib/api/client';
import type { Offer } from '@/shared/lib/api/offers';
import { useModalBehavior } from '@/shared/hooks/useModalBehavior';
import ConfirmDiscardDialog from '@/shared/components/ConfirmDiscardDialog';

const INITIAL_BODY = 'Please review your offer letter using the link in this email.';

interface ShareOfferModalProps {
  offer: Offer | null;
  onClose: () => void;
  onSent: (sentTo: string) => void;
}

export default function ShareOfferModal({ offer, onClose, onSent }: ShareOfferModalProps) {
  const candidateEmail = offer?.candidate?.email ?? '';
  const roleTitle = offer?.positionTitle ?? offer?.job?.title ?? '';
  const [to, setTo] = useState(candidateEmail);
  const [ccText, setCcText] = useState('');
  const [bccText, setBccText] = useState('');
  const [subject, setSubject] = useState(`Your offer letter${roleTitle ? ` – ${roleTitle}` : ''}`);
  const [body, setBody] = useState(INITIAL_BODY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedInitialTo = (candidateEmail ?? '').trim();
  const isDirty =
    to.trim() !== normalizedInitialTo ||
    ccText.trim() !== '' ||
    bccText.trim() !== '' ||
    body !== INITIAL_BODY;
  const { containerRef, backdropProps, requestClose, confirmDiscardOpen, confirmDiscard, cancelDiscard } =
    useModalBehavior({ isOpen: !!offer, onClose, isDirty });

  if (!offer) return null;

  const parseEmails = (raw: string) =>
    raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);

  const handleSend = async () => {
    setError(null);
    if (!to.trim()) {
      setError('Recipient email is required.');
      return;
    }
    setSubmitting(true);
    const offerId = String((offer as { _id?: string; id?: string })._id ?? offer.id ?? '').trim();
    if (!offerId) {
      setError('Offer id is missing. Close and reopen this dialog.');
      setSubmitting(false);
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[share-offer] request start', { offerId, to: to.trim() });
    }
    try {
      const res = await shareOfferWithCandidate(offerId, {
        to: to.trim(),
        cc: parseEmails(ccText),
        bcc: parseEmails(bccText),
        subject,
        body,
      });
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[share-offer] response', res);
      }
      onSent(res.sharedTo);
    } catch (e) {
      const msg = getApiErrorMessage(e, 'Failed to send offer.');
      if (process.env.NODE_ENV !== 'production') {
        console.error('[share-offer] request failed', e);
      }
      setError(msg);
    } finally {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[share-offer] finally — reset sending state');
      }
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" {...backdropProps}>
        <div ref={containerRef} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl dark:bg-bodybg">
          <h3 className="mb-3 text-base font-semibold text-defaulttextcolor dark:text-white">
            Share offer with candidate
          </h3>
          {error && <div className="mb-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <label className="form-label">To</label>
          <input className="form-control mb-2" value={to} onChange={(e) => setTo(e.target.value)} />
          <label className="form-label">CC (comma-separated)</label>
          <input className="form-control mb-2" value={ccText} onChange={(e) => setCcText(e.target.value)} />
          <label className="form-label">BCC (comma-separated)</label>
          <input className="form-control mb-2" value={bccText} onChange={(e) => setBccText(e.target.value)} />
          <label className="form-label">Subject</label>
          <input className="form-control mb-2" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <label className="form-label">Message</label>
          <textarea className="form-control mb-3 min-h-[90px]" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className="ti-btn ti-btn-light" onClick={requestClose} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className="ti-btn ti-btn-primary" onClick={handleSend} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send to candidate'}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDiscardDialog open={confirmDiscardOpen} onConfirm={confirmDiscard} onCancel={cancelDiscard} />
    </>
  );
}
