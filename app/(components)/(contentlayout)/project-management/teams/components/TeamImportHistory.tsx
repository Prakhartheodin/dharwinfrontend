'use client';
import { useEffect, useState } from 'react';
import { listTeamImportLogs, type TeamImportLogEntry } from '@/shared/lib/api/teams';

export default function TeamImportHistory() {
  const [logs, setLogs] = useState<TeamImportLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listTeamImportLogs({ page, limit: 10 })
      .then((r) => { setLogs(r.results); setPages(r.totalPages); })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Import History</h3>
      {loading ? <p>Loading…</p> : (
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Uploader</th>
              <th className="p-2 text-left">File</th>
              <th className="p-2 text-right">Rows</th>
              <th className="p-2 text-right">Created</th>
              <th className="p-2 text-right">Updated</th>
              <th className="p-2 text-right">Added</th>
              <th className="p-2 text-right">Ignored</th>
              <th className="p-2 text-left">Report</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="p-2">{l.uploadedBy?.name || l.uploadedBy?.email}</td>
                <td className="p-2">{l.fileName}</td>
                <td className="p-2 text-right">{l.rowsProcessed}</td>
                <td className="p-2 text-right">{l.teamsCreated}</td>
                <td className="p-2 text-right">{l.teamsUpdated}</td>
                <td className="p-2 text-right">{l.employeesAdded}</td>
                <td className="p-2 text-right">{l.employeesIgnored}</td>
                <td className="p-2">
                  {l.summaryFileUrl ? <a href={l.summaryFileUrl} className="text-blue-600 underline">Download</a> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex items-center gap-2 mt-3">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {page} / {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
