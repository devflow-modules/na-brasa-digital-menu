/** Shared visual language for closing export actions (primary / secondary / tertiary). */
export const dailyClosingActionClassName = {
  primary:
    "inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-stone-950 hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
  secondary:
    "inline-flex h-11 items-center justify-center rounded-xl border border-stone-500 bg-stone-950 px-4 text-sm font-semibold text-stone-100 hover:bg-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
  tertiary:
    "inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-transparent px-4 text-sm font-semibold text-stone-300 hover:border-stone-500 hover:bg-stone-900/60 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500",
} as const;
