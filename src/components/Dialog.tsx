import { useEffect, type ReactNode } from 'react';

type DialogProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
};

export function Dialog({ title, children, onClose, wide = false }: DialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ice/50 p-3 sm:place-items-center">
      <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl ${wide ? 'max-w-xl' : 'max-w-md'}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="dialog-title" className="font-display text-2xl text-ice">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-ice-3">
      {label}
      {children}
    </label>
  );
}

export const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-ice outline-none focus:border-teal';

export const primaryButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal px-4 text-sm font-bold text-white hover:bg-[#0b7565] disabled:opacity-50';

export const secondaryButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-ice-3 hover:bg-slate-50 disabled:opacity-50';
