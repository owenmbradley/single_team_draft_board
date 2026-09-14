import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ClassFilter } from '@/lib/listPlayers';

type ClassYearFilterProps = {
  options: string[];
  value: ClassFilter;
  onChange: (value: ClassFilter) => void;
};

export function ClassYearFilter({ options, value, onChange }: ClassYearFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const label =
    value.length === 0 ? 'All' : value.length === 1 ? value[0] : `${value.length} selected`;

  const toggleYear = (year: string) => {
    if (value.includes(year)) {
      onChange(value.filter((item) => item !== year));
      return;
    }
    onChange([...value, year].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by class"
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-slate-300 bg-white px-1.5 text-left text-[11px] font-semibold normal-case tracking-normal text-ice"
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown className={`size-3 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 z-30 mt-1 min-w-[8.5rem] rounded-md border border-slate-200 bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            className={`mb-0.5 w-full rounded px-2 py-1.5 text-left text-[11px] font-semibold ${
              value.length === 0 ? 'bg-[#e8f7f3] text-teal' : 'text-ice hover:bg-slate-50'
            }`}
            onClick={() => onChange([])}
          >
            All classes
          </button>
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] font-medium text-slate-400">No class years</p>
          ) : (
            options.map((year) => {
              const checked = value.includes(year);
              return (
                <label
                  key={year}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[11px] font-semibold ${
                    checked ? 'bg-[#e8f7f3] text-teal' : 'text-ice hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleYear(year)}
                    className="size-3.5 accent-teal"
                  />
                  {year}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
