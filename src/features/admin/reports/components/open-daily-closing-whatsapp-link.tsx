type OpenDailyClosingWhatsappLinkProps = {
  href: string;
};

export function OpenDailyClosingWhatsappLink({
  href,
}: OpenDailyClosingWhatsappLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="daily-closing-open-whatsapp"
      className="inline-flex rounded-xl border border-emerald-500/70 bg-stone-950 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-stone-900"
    >
      Abrir no WhatsApp
    </a>
  );
}
