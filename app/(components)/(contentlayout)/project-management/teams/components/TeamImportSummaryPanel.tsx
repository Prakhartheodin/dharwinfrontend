'use client';
import type { TeamImportResult, TeamImportSkipReason } from '@/shared/lib/api/teams';

const REASON_LABEL: Record<TeamImportSkipReason, { label: string; severity: 'info'|'warning'|'error' }> = {
  employee_not_found:      { label: 'Not found in ATS — ignored', severity: 'warning' },
  inactive_or_resigned:    { label: 'Inactive / resigned — ignored', severity: 'error' },
  dummy_name_pattern:      { label: 'Looks like test/dummy — ignored', severity: 'error' },
  dummy_email_pattern:     { label: 'Test / no-reply email — ignored', severity: 'error' },
  ambiguous_employee_name: { label: 'Name matched multiple employees', severity: 'warning' },
  already_in_team:         { label: 'Already on this team — skipped', severity: 'info' },
  missing_identifiers:     { label: 'No identifier — row dropped', severity: 'warning' },
  team_lead_unmatched:     { label: 'Team Lead email not found', severity: 'warning' },
  metadata_conflict:       { label: 'Conflicting team metadata — first kept', severity: 'warning' },
};

export default function TeamImportSummaryPanel({ result }: { result: TeamImportResult }) {
  const s = result.summary;
  const groupedSkips = groupBy(result.details.skipped, (r) => r.reason);

  return (
    <div>
      <div className="grid grid-cols-5 gap-3 mb-4">
        <Tile label="Created"    value={s.teamsCreated}      color="bg-green-100 text-green-800" />
        <Tile label="Updated"    value={s.teamsUpdated}      color="bg-blue-100 text-blue-800" />
        <Tile label="Added"      value={s.employeesAdded}    color="bg-emerald-100 text-emerald-800" />
        <Tile label="Ignored"    value={s.employeesIgnored}  color="bg-amber-100 text-amber-800" />
        <Tile label="Duplicates" value={s.duplicatesSkipped} color="bg-gray-100 text-gray-800" />
      </div>

      {result.details.warnings.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
          {result.details.warnings.map((w, i) => (
            <div key={i} className="text-sm">⚠ {w.type === 'duplicate_file_hash'
              ? `Same file imported earlier on ${new Date(String(w.previousImportAt)).toLocaleString()}`
              : w.type === 'unknown_columns' ? `Ignored columns: ${(w.columns as string[]).join(', ')}`
              : w.type === 'summary_upload_failed' ? `Summary file unavailable: ${String(w.message)}`
              : JSON.stringify(w)}</div>
          ))}
        </div>
      )}

      {Object.keys(groupedSkips).length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Skipped rows</h4>
          {Object.entries(groupedSkips).map(([reason, rows]) => {
            const meta = REASON_LABEL[reason as TeamImportSkipReason] || { label: reason, severity: 'warning' };
            return (
              <details key={reason} className="border rounded mb-2">
                <summary className="px-3 py-2 cursor-pointer">
                  <span className={badgeClass(meta.severity)}>{rows.length}</span>
                  <span className="ml-2">{meta.label}</span>
                </summary>
                <ul className="px-3 py-2 text-sm">
                  {rows.slice(0, 50).map((r, i) => (
                    <li key={i}>{r.team} — {r.identifier} {r.matchCount ? `(matched ${r.matchCount})` : ''}</li>
                  ))}
                  {rows.length > 50 && <li className="text-gray-500">… {rows.length - 50} more in the full report</li>}
                </ul>
              </details>
            );
          })}
        </div>
      )}

      {result.summaryFileUrl && (
        <a href={result.summaryFileUrl} target="_blank" rel="noreferrer"
           className="ti-btn ti-btn-primary inline-block">Download full report (.xlsx)</a>
      )}
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded p-3 text-center ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function badgeClass(sev: 'info'|'warning'|'error'): string {
  const base = 'inline-block px-2 py-0.5 text-xs rounded font-semibold ';
  if (sev === 'error')   return base + 'bg-red-100 text-red-800';
  if (sev === 'warning') return base + 'bg-amber-100 text-amber-800';
  return base + 'bg-gray-100 text-gray-800';
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item); (acc[k] ||= []).push(item); return acc;
  }, {} as Record<K, T[]>);
}
