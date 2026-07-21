import { z } from "zod";
import {
  DEFAULT_DAILY_CLOSING_END,
  DEFAULT_DAILY_CLOSING_START,
} from "@/features/admin/reports/daily-closing.types";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const dailyClosingQuerySchema = z.object({
  date: z
    .string()
    .regex(dateRegex, "Data operacional inválida.")
    .optional(),
  start: z
    .string()
    .regex(timeRegex, "Horário de início inválido.")
    .optional()
    .default(DEFAULT_DAILY_CLOSING_START),
  end: z
    .string()
    .regex(timeRegex, "Horário de fim inválido.")
    .optional()
    .default(DEFAULT_DAILY_CLOSING_END),
});

export type DailyClosingQueryInput = z.infer<typeof dailyClosingQuerySchema>;
