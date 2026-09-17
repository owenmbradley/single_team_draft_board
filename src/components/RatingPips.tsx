import { useEffect, useState } from 'react';
import { clampRating, formatRating, MAX_RATING, MIN_RATING, pipFill, RATING_STEP } from '@/lib/ratings';

type RatingPipsProps = {
  value: number;
  onChange?: (value: number) => void;
  label: string;
};

export function RatingPips({ value, onChange, label }: RatingPipsProps) {
  const rating = clampRating(value);
  const circles = (
    <div className="flex items-center gap-1" aria-hidden={Boolean(onChange)}>
      {Array.from({ length: MAX_RATING }, (_, index) => {
        const pipValue = index + 1;
        const fill = pipFill(rating, index);
        if (!onChange) {
          return <RatingCircle key={pipValue} fill={fill} size="sm" />;
        }
        return (
          <button
            key={pipValue}
            type="button"
            onClick={() => onChange(pipValue)}
            className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            aria-label={`${label} ${pipValue}`}
          >
            <RatingCircle fill={fill} size="md" />
          </button>
        );
      })}
    </div>
  );

  if (!onChange) {
    return (
      <div className="flex items-center gap-2" aria-label={`${label} ${formatRating(rating)} of ${MAX_RATING}`}>
        {circles}
        <span className="tabular-nums text-[11px] font-semibold text-slate-500">{formatRating(rating)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {circles}
      <RatingNumberInput label={label} value={rating} onChange={onChange} />
    </div>
  );
}

function RatingCircle({ fill, size }: { fill: number; size: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-2.5 w-2.5' : 'h-5 w-5';
  return (
    <span className={`relative inline-block overflow-hidden rounded-full bg-slate-200 ${sizeClass}`}>
      <span className="absolute inset-y-0 left-0 bg-teal" style={{ width: `${fill * 100}%` }} />
    </span>
  );
}

function RatingNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(formatRating(value));

  useEffect(() => {
    setDraft(formatRating(value));
  }, [value]);

  return (
    <input
      type="number"
      inputMode="decimal"
      min={MIN_RATING}
      max={MAX_RATING}
      step={RATING_STEP}
      value={draft}
      aria-label={label}
      className="h-7 w-14 rounded-md border border-slate-300 bg-white px-1.5 text-center text-xs font-semibold tabular-nums text-ice"
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (!/^\d+(\.\d)?$/.test(next)) return;
        onChange(clampRating(Number(next)));
      }}
      onBlur={() => {
        const next = clampRating(Number(draft));
        onChange(next);
        setDraft(formatRating(next));
      }}
    />
  );
}

function overallTone(score: number): string {
  if (score >= 9) return 'border-[#e1a92c]/30 bg-[#fff7df] text-[#8b6110]';
  if (score >= 7) return 'border-teal/20 bg-[#e8f7f3] text-[#087064]';
  if (score >= 5) return 'border-slate-200 bg-slate-50 text-slate-600';
  return 'border-slate-200 bg-white text-slate-400';
}

export function TotalScore({ score, formatted }: { score: number; formatted: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${overallTone(score)}`}
    >
      {formatted}
    </span>
  );
}
