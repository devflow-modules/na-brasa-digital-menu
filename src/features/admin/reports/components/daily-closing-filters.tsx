"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

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
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-stone-300">
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
        <label className="block text-sm text-stone-300">
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
        <label className="block text-sm text-stone-300">
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
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          data-testid="daily-closing-refresh"
          className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
        >
          Atualizar
        </button>
      </div>
    </form>
  );
}
