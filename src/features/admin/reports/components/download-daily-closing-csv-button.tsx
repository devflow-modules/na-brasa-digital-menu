"use client";

import { useState } from "react";

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
        className="rounded-xl border border-orange-500/70 bg-stone-950 px-4 py-2 text-sm font-medium text-orange-100 hover:bg-stone-900"
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
