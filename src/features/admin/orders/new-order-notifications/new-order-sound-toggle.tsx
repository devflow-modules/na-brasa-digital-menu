"use client";

type NewOrderSoundToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
};

export function NewOrderSoundToggle({
  enabled,
  onChange,
  disabled = false,
}: NewOrderSoundToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      data-testid="admin-new-order-sound-toggle"
      aria-label={enabled ? "Som ativado" : "Som desativado"}
      title={
        enabled
          ? "Som de novos pedidos ativado"
          : "Som de novos pedidos desativado — toque para ativar e ouvir uma prévia"
      }
      onClick={() => onChange(!enabled)}
      className={[
        "inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-2.5 text-sm font-medium sm:px-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70",
        "disabled:cursor-not-allowed disabled:opacity-50",
        enabled
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
          : "border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800",
      ].join(" ")}
    >
      <span aria-hidden>{enabled ? "🔔" : "🔕"}</span>
      <span className="hidden md:inline">
        {enabled ? "Som ativado" : "Som desativado"}
      </span>
    </button>
  );
}
