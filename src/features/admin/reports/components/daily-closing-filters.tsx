"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { dailyClosingActionClassName } from "@/features/admin/reports/components/daily-closing-action-styles";

type DailyClosingFiltersProps = {
  date: string;
  startTime: string;
  endTime: string;
};

export function DailyClosingFilters({
  date,
  startTime,
  endTime,
}: DailyClosingFiltersProps) {
  const router = useRouter();
  const formKey = `${date}|${startTime}|${endTime}`;

  function normalizeTimeParam(value: string): string {
    const trimmed = value.trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed.slice(0, 5);
    }
    return trimmed;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const nextDate = String(formData.get("date") ?? "").trim();
    const nextStart = normalizeTimeParam(String(formData.get("start") ?? ""));
    const nextEnd = normalizeTimeParam(String(formData.get("end") ?? ""));

    if (nextDate) params.set("date", nextDate);
    if (nextStart) params.set("start", nextStart);
    if (nextEnd) params.set("end", nextEnd);

    router.push(`/admin/relatorios/fechamento?${params.toString()}`);
  }

  return (
    <form
      key={formKey}
      method="GET"
      action="/admin/relatorios/fechamento"
      onSubmit={onSubmit}
      data-testid="daily-closing-filters"
      className="rounded-2xl border border-stone-800 bg-stone-900/50 p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="block min-w-0 flex-1 text-sm text-stone-300">
          Data operacional
          <input
            type="date"
            name="date"
            defaultValue={date}
            required
            data-testid="daily-closing-date"
            className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
          />
        </label>

        <fieldset className="min-w-0 flex-1 border-0 p-0">
          <legend className="mb-1 text-sm text-stone-300">
            Janela operacional
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-stone-400">
              Início
              <input
                type="time"
                name="start"
                defaultValue={startTime}
                required
                data-testid="daily-closing-start"
                className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
              />
            </label>
            <label className="block text-xs text-stone-400">
              Fim
              <input
                type="time"
                name="end"
                defaultValue={endTime}
                required
                data-testid="daily-closing-end"
                className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
              />
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          data-testid="daily-closing-refresh"
          className={`${dailyClosingActionClassName.primary} w-full shrink-0 lg:w-auto`}
        >
          Atualizar
        </button>
      </div>
    </form>
  );
}
