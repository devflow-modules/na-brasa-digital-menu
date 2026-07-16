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
    <label
      className="inline-flex cursor-pointer items-center gap-2 text-xs text-stone-300"
      data-testid="admin-new-order-sound-toggle"
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-stone-600 bg-stone-900 text-amber-500 focus:ring-amber-400"
        checked={enabled}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label="Ativar som de novos pedidos"
      />
      <span>Ativar som de novos pedidos (toca uma prévia)</span>
    </label>
  );
}
