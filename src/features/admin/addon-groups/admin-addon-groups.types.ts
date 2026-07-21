export type AdminAddonGroupOption = {
  addonId: string;
  name: string;
  priceCents: number;
  sortOrder: number;
};

export type AdminAddonGroup = {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  minSelection: number;
  maxSelection: number;
  active: boolean;
  sortOrder: number;
  options: AdminAddonGroupOption[];
};

export type AdminAddonOptionCandidate = {
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
};

export type AdminAddonGroupActionResult =
  | { ok: true; groupId?: string }
  | { ok: false; message: string };
