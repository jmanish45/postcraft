import { Trash2, FileText, Sparkles } from "lucide-react";
import { getSplittablePointsCount } from "../utils/textSplitter";

export default function SampleCard({
  index,
  value,
  onChange,
  onRemove,
  onSplit,
}) {
  const splittableCount = getSplittablePointsCount(value);

  return (
    <div className="group rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 sm:p-5 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <FileText size={14} />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
            Sample {index + 1}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {splittableCount >= 2 && onSplit && (
            <button
              type="button"
              onClick={() => onSplit(index)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-900 transition hover:bg-black hover:text-white hover:border-black active:scale-95 shadow-2xs"
              title={`Click to split this sample into ${splittableCount} individual cards`}
            >
              <Sparkles size={12} className="shrink-0 text-amber-500" />
              <span>Auto-Split ({splittableCount} points)</span>
            </button>
          )}

          <button
            onClick={onRemove}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-black active:scale-95"
            title="Remove sample"
            type="button"
            aria-label={`Remove sample ${index + 1}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your source post or information snippet here..."
        rows={4}
        className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-base sm:text-sm leading-6 text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white"
      />

      <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
        <div>
          {splittableCount >= 2 && (
            <span className="text-neutral-500 font-medium">
              💡 {splittableCount} distinct points detected. Tap <strong>Auto-Split</strong> above to break into separate cards.
            </span>
          )}
        </div>
        <span>{value.length} characters</span>
      </div>
    </div>
  );
}
