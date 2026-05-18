'use client';
import { useState } from 'react';
import {
  importTeamsExcel, downloadImportTemplate,
  type TeamImportResult,
} from '@/shared/lib/api/teams';
import TeamImportSummaryPanel from './TeamImportSummaryPanel';

type State =
  | { kind: 'idle' }
  | { kind: 'uploading'; pct: number }
  | { kind: 'result'; data: TeamImportResult }
  | { kind: 'error'; message: string; errors?: Array<{ type: string; [k: string]: unknown }> };

export default function TeamImportDialog({
  onClose,
  onImportSuccess,
}: {
  onClose: () => void;
  onImportSuccess?: () => void;
}) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (!file) return;
    setState({ kind: 'uploading', pct: 0 });
    try {
      const data = await importTeamsExcel(file, (pct) => setState({ kind: 'uploading', pct }));
      setState({ kind: 'result', data });
      onImportSuccess?.();
    } catch (err: unknown) {
      const e = err as { message?: string; errors?: Array<{ type: string }> };
      setState({ kind: 'error', message: e?.message || 'Upload failed', errors: e?.errors });
    }
  };

  const downloadTemplate = async () => {
    const blob = await downloadImportTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'teams-import-template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-bodybg rounded-lg shadow-xl w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Import Teams from Excel</h3>
          <button onClick={onClose} className="text-2xl leading-none" aria-label="Close">&times;</button>
        </div>

        <div className="p-6 min-h-[280px]">
          {state.kind === 'idle' && (
            <>
              <label className="block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50">
                <input type="file" accept=".xlsx" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <i className="ri-file-excel-2-line text-4xl text-green-600" />
                <p className="mt-2">{file ? file.name : 'Drop .xlsx here or click to choose'}</p>
              </label>
              <button onClick={downloadTemplate} className="mt-3 text-blue-600 underline text-sm">
                Download import template
              </button>
            </>
          )}
          {state.kind === 'uploading' && (
            <div className="text-center">
              <p>Uploading… {state.pct}%</p>
              <div className="w-full bg-gray-200 rounded h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded" style={{ width: `${state.pct}%` }} />
              </div>
            </div>
          )}
          {state.kind === 'result' && <TeamImportSummaryPanel result={state.data} />}
          {state.kind === 'error' && (
            <div className="text-red-600">
              <p className="font-semibold">{state.message}</p>
              {state.errors && (
                <ul className="list-disc ml-6 mt-2">
                  {state.errors.map((e, i) => <li key={i}>{prettyError(e)}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          {state.kind === 'idle' && (
            <button onClick={submit} disabled={!file} className="ti-btn ti-btn-primary">
              Import
            </button>
          )}
          <button onClick={onClose} className="ti-btn ti-btn-light">Close</button>
        </div>
      </div>
    </div>
  );
}

function prettyError(e: { type: string; [k: string]: unknown }): string {
  switch (e.type) {
    case 'missing_header':   return `Missing column: ${e.header}. Download the template.`;
    case 'empty_sheet':      return 'Excel file is empty.';
    case 'file_too_large':   return 'File exceeds 5 MB.';
    case 'invalid_mime':     return 'Only .xlsx files are supported.';
    case 'unknown_columns':  return `Ignored columns: ${(e.columns as string[]).join(', ')}`;
    case 'row_limit_exceeded': return `Too many rows (${e.received}). Max ${e.limit}.`;
    default:                 return JSON.stringify(e);
  }
}
