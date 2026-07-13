export type AdminRole = "ADMIN";

export type AdminSessionPayload = {
  email: string;
  role: AdminRole;
  iat: number;
  exp: number;
};

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; message: string };
