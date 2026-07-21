"use client";

import { useState } from "react";
import { dailyClosingActionClassName } from "@/features/admin/reports/components/daily-closing-action-styles";

type DownloadDailyClosingCsvButtonProps = {
  content: string;
  filename: string;
  mimeType?: string;
};

export function DownloadDailyClosingCsvButton({
  content,
  filename,
  mimeType = "text/csv;charset=utf-8",
}: DownloadDailyClosingCsvButtonProps) {
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");

  function onDownload() {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setStatus("ready");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onDownload}
        data-testid="daily-closing-download-csv"
        className={dailyClosingActionClassName.tertiary}
      >
        Baixar CSV
      </button>
      {status === "ready" ? (
        <p
          data-testid="daily-closing-download-csv-success"
          className="text-sm text-emerald-300"
        >
          Download iniciado.
        </p>
      ) : null}
      {status === "error" ? (
        <p
          data-testid="daily-closing-download-csv-error"
          className="text-sm text-red-300"
        >
          Não foi possível baixar o CSV.
        </p>
      ) : null}
    </div>
  );
}
