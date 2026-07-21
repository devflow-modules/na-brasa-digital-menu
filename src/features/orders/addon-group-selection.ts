export type CatalogAddon = {
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
};

export type CatalogAddonGroupOption = {
  sortOrder: number;
  addon: CatalogAddon;
};

export type CatalogAddonGroup = {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  active: boolean;
  sortOrder: number;
  options: CatalogAddonGroupOption[];
};

export type CatalogProductForAddonSelection = {
  productAddons: Array<{ addon: CatalogAddon }>;
  addonGroups: CatalogAddonGroup[];
};

export type AddonSelectionValidationFailure = {
  ok: false;
  message: string;
};

export type AddonSelectionValidationSuccess = {
  ok: true;
  selectedAddons: CatalogAddon[];
};

export type AddonSelectionValidationResult =
  | AddonSelectionValidationSuccess
  | AddonSelectionValidationFailure;

const ADDON_UNAVAILABLE_MESSAGE =
  "Adicional indisponível para este produto.";

export function formatAddonGroupSelectionHint(group: {
  minSelection: number;
  maxSelection: number;
}): string {
  const { minSelection, maxSelection } = group;

  if (minSelection === 0 && maxSelection === 1) {
    return "Opcional · escolha até 1";
  }
  if (minSelection === 1 && maxSelection === 1) {
    return "Obrigatório · escolha 1";
  }
  if (minSelection === 0) {
    return `Opcional · escolha até ${maxSelection}`;
  }
  if (minSelection === maxSelection) {
    return `Escolha exatamente ${minSelection}`;
  }
  return `Escolha de ${minSelection} a ${maxSelection}`;
}

/**
 * Resolves independent ProductAddon links vs grouped options for one product.
 * Grouped addons are excluded from the independent list even if still linked.
 */
export function partitionProductAddons(
  product: CatalogProductForAddonSelection,
): {
  independentAddons: CatalogAddon[];
  activeGroups: CatalogAddonGroup[];
  allowedAddonsById: Map<string, CatalogAddon>;
  groupByAddonId: Map<string, CatalogAddonGroup>;
} {
  const activeGroups = product.addonGroups
    .filter((group) => group.active)
    .map((group) => ({
      ...group,
      options: group.options
        .filter((option) => option.addon.active)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((group) => group.options.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const groupByAddonId = new Map<string, CatalogAddonGroup>();
  const allowedAddonsById = new Map<string, CatalogAddon>();

  for (const group of activeGroups) {
    for (const option of group.options) {
      groupByAddonId.set(option.addon.id, group);
      allowedAddonsById.set(option.addon.id, option.addon);
    }
  }

  const independentAddons: CatalogAddon[] = [];
  for (const link of product.productAddons) {
    if (!link.addon.active) {
      continue;
    }
    if (groupByAddonId.has(link.addon.id)) {
      continue;
    }
    independentAddons.push(link.addon);
    allowedAddonsById.set(link.addon.id, link.addon);
  }

  independentAddons.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return {
    independentAddons,
    activeGroups,
    allowedAddonsById,
    groupByAddonId,
  };
}

export function validateAddonSelectionForProduct(
  product: CatalogProductForAddonSelection,
  addonIds: string[],
): AddonSelectionValidationResult {
  const {
    activeGroups,
    allowedAddonsById,
    groupByAddonId,
  } = partitionProductAddons(product);

  const uniqueAddonIds = [...new Set(addonIds)];
  const selectedAddons: CatalogAddon[] = [];
  const selectedCountByGroupId = new Map<string, number>();

  for (const addonId of uniqueAddonIds) {
    const addon = allowedAddonsById.get(addonId);
    if (!addon) {
      return { ok: false, message: ADDON_UNAVAILABLE_MESSAGE };
    }

    selectedAddons.push(addon);

    const group = groupByAddonId.get(addonId);
    if (group) {
      selectedCountByGroupId.set(
        group.id,
        (selectedCountByGroupId.get(group.id) ?? 0) + 1,
      );
    }
  }

  for (const group of activeGroups) {
    const selectedCount = selectedCountByGroupId.get(group.id) ?? 0;

    if (selectedCount < group.minSelection) {
      return {
        ok: false,
        message:
          group.minSelection === 1 && group.maxSelection === 1
            ? `Selecione uma opção em “${group.name}”.`
            : `Selecione pelo menos ${group.minSelection} opção(ões) em “${group.name}”.`,
      };
    }

    if (selectedCount > group.maxSelection) {
      return {
        ok: false,
        message:
          group.maxSelection === 1
            ? `Escolha no máximo 1 opção em “${group.name}”.`
            : `Escolha no máximo ${group.maxSelection} opções em “${group.name}”.`,
      };
    }
  }

  return { ok: true, selectedAddons };
}

export function validateAddonGroupLimits(input: {
  minSelection: number;
  maxSelection: number;
  optionCount: number;
}): { ok: true } | { ok: false; message: string } {
  const { minSelection, maxSelection, optionCount } = input;

  if (!Number.isInteger(minSelection) || minSelection < 0) {
    return { ok: false, message: "Seleção mínima inválida." };
  }
  if (!Number.isInteger(maxSelection) || maxSelection < 1) {
    return { ok: false, message: "Seleção máxima inválida." };
  }
  if (minSelection > maxSelection) {
    return {
      ok: false,
      message: "Seleção mínima não pode ser maior que a máxima.",
    };
  }
  if (optionCount > 0 && maxSelection > optionCount) {
    return {
      ok: false,
      message: "Seleção máxima não pode exceder o número de opções.",
    };
  }

  return { ok: true };
}
