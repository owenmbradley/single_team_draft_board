import { useState } from 'react';
import { Dialog, primaryButtonClass, secondaryButtonClass } from '@/components/Dialog';
import { downloadTemplate } from '@/lib/importPlayers';
import type { ImportResult } from '@/types';

type ImportDialogProps = {
  onClose: () => void;
  onPreview: (file: File) => Promise<ImportResult>;
  onImport: (result: ImportResult, mode: 'merge' | 'replace') => void;
};

export function ImportDialog({ onClose, onPreview, onImport }: ImportDialogProps) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const readFile = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const next = await onPreview(file);
      setResult(next);
      if (next.players.length === 0 && next.warnings[0]) setError(next.warnings[0]);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Import players" onClose={onClose} wide>
      <p className="text-sm leading-relaxed text-slate-600">
        Drop in an Excel or CSV file. The importer looks for a Players sheet and maps Name, Class,
        Talent, Vibes, and Position. Skating columns from the Tripod spreadsheet become Talent.
        Goalie / G become Goalie; everyone else is a Skater. After import you land in planning so
        you can rate the pool before the draft.
      </p>
      <label className="mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-teal hover:bg-[#e8f7f3]">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
        <span className="font-display text-lg text-ice">Choose spreadsheet</span>
        <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          .xlsx, .xls, or .csv
        </span>
      </label>
      <button type="button" className={`${secondaryButtonClass} mt-3 w-full`} onClick={downloadTemplate}>
        Download CSV template
      </button>
      {busy && <p className="mt-3 text-sm font-semibold text-teal">Reading file…</p>}
      {error && <p className="mt-3 text-sm font-semibold text-coral">{error}</p>}
      {result && result.players.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-ice">
            {result.players.length} players from {result.sheetName || 'file'}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {result.players
              .slice(0, 4)
              .map((player) => player.name)
              .join(', ')}
            {result.players.length > 4 ? '…' : ''}
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
              {result.warnings.slice(0, 5).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => onImport(result, 'replace')}
            >
              Replace pool
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => onImport(result, 'merge')}>
              Merge into pool
            </button>
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-500">
            Merge updates ratings for matching names and keeps drafted / captain marks. Replace
            starts a fresh pool.
          </p>
        </div>
      )}
    </Dialog>
  );
}
