import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
