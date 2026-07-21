"use client";

import { useState } from "react";

type CopyDailyClosingButtonProps = {
  text: string;
};

export function CopyDailyClosingButton({ text }: CopyDailyClosingButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function onCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onCopy}
        data-testid="daily-closing-copy"
        className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
      >
        Copiar resumo
      </button>
      {status === "copied" ? (
        <p
          data-testid="daily-closing-copy-success"
          className="text-sm text-emerald-300"
        >
          Resumo copiado.
        </p>
      ) : null}
      {status === "error" ? (
        <p
          data-testid="daily-closing-copy-error"
          className="text-sm text-red-300"
        >
          Não foi possível copiar. Selecione o texto abaixo manualmente.
        </p>
      ) : null}
    </div>
  );
}
