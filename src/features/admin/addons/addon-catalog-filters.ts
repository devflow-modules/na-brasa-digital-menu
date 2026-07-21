import type { AdminAddon } from "@/features/admin/addons/admin-addons.types";

export type AddonStatusFilter = "all" | "active" | "inactive";

export type AddonLinkFilter = "all" | "with-links" | "without-links";

export type AddonCatalogCounters = {
  totalAddons: number;
  activeAddons: number;
  totalLinks: number;
};

export function countAddonCatalog(addons: AdminAddon[]): AddonCatalogCounters {
  let activeAddons = 0;
  let totalLinks = 0;

  for (const addon of addons) {
    if (addon.active) {
      activeAddons += 1;
    }
    totalLinks += addon.linkedProducts.length;
  }

  return {
    totalAddons: addons.length,
    activeAddons,
    totalLinks,
  };
}

export function addonMatchesFilters(
  addon: AdminAddon,
  options: {
    search: string;
    status: AddonStatusFilter;
    links: AddonLinkFilter;
  },
): boolean {
  const query = options.search.trim().toLowerCase();
  if (query.length > 0 && !addon.name.toLowerCase().includes(query)) {
    return false;
  }

  if (options.status === "active" && !addon.active) {
    return false;
  }
  if (options.status === "inactive" && addon.active) {
    return false;
  }

  const hasLinks = addon.linkedProducts.length > 0;
  if (options.links === "with-links" && !hasLinks) {
    return false;
  }
  if (options.links === "without-links" && hasLinks) {
    return false;
  }

  return true;
}

export function filterAddonCatalog(
  addons: AdminAddon[],
  options: {
    search: string;
    status: AddonStatusFilter;
    links: AddonLinkFilter;
  },
): AdminAddon[] {
  return addons.filter((addon) => addonMatchesFilters(addon, options));
}
