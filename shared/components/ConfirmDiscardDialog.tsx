'use client';

interface ConfirmDiscardDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDiscardDialog({ open, onConfirm, onCancel }: ConfirmDiscardDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-bodybg">
        <h4 className="mb-1 text-sm font-semibold text-defaulttextcolor dark:text-white">
          Discard unsaved changes?
        </h4>
        <p className="mb-4 text-sm text-gray-600 dark:text-white/70">
          Your changes will be lost if you close now.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className="ti-btn ti-btn-light" onClick={onCancel}>
            Keep editing
          </button>
          <button type="button" className="ti-btn ti-btn-danger" onClick={onConfirm}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
