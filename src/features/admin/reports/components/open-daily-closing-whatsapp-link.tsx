import { dailyClosingActionClassName } from "@/features/admin/reports/components/daily-closing-action-styles";

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
      className={dailyClosingActionClassName.secondary}
    >
      Abrir no WhatsApp
    </a>
  );
}
