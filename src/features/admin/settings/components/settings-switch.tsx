type SettingsSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onCheckedChange: (checked: boolean) => void;
  testId?: string;
};

export function SettingsSwitch({
  checked,
  disabled = false,
  label,
  description,
  onCheckedChange,
  testId,
}: SettingsSwitchProps) {
  return (
    <div
      data-testid={testId}
      className="flex items-start justify-between gap-4 rounded-xl border border-stone-800 bg-stone-950/50 px-3 py-3"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-100">{label}</p>
        <p className="mt-0.5 text-xs text-stone-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={[
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-orange-500" : "bg-stone-700",
        ].join(" ")}
      >
        <span
          aria-hidden
          className={[
            "absolute top-0.5 size-6 rounded-full bg-stone-950 shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
