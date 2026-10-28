import { authorityOwnerStateIds, can, isTradeOrgType, permissionsForUser } from "./rbac";
import { t, type Locale } from "./i18n";

type NavUser = Parameters<typeof can>[0];

export type NavLink = {
  id: string;
  href: string;
  label: string;
  blurb?: string;
};

/** Public path, in the order a buyer or consumer moves through the system. */
export const PUBLIC_FLOW = [
  { id: "catalogue", path: "/catalogue", label: "navCatalogue" },
  { id: "library", path: "/library", label: "navLibrary" },
  { id: "store", path: "/store", label: "navStore" },
  { id: "lookup", path: "/lookup", label: "navLookup" },
  { id: "registry", path: "/registry", label: "navRegistry" },
  { id: "verify", path: "/verify", label: "navVerify" },
  { id: "consumers", path: "/consumers", label: "navConsumers" },
] as const;

export type PublicFlowId = (typeof PUBLIC_FLOW)[number]["id"];

const PUBLIC_BLURBS: Record<PublicFlowId, string> = {
  catalogue: "Number, name, scope, sector, technical committee, and tariff lines",
  library: "Original standards for harmonisation and adoption",
  store: "Published standards, with Clause 1 on the public preview",
  lookup: "Which standard applies to an HS line",
  registry: "The public register after a certificate is issued",
  verify: "One product identification number",
  consumers: "A public complaint about a certified product",
};

export function publicNav(locale: Locale): NavLink[] {
  return [
    { id: "home", href: `/${locale}`, label: t(locale, "navHome") },
    ...PUBLIC_FLOW.map((step) => ({
      id: step.id,
      href: `/${locale}${step.path}`,
      label: t(locale, step.label),
      blurb: PUBLIC_BLURBS[step.id],
    })),
    { id: "analytics", href: `/${locale}/analytics`, label: t(locale, "navAnalytics") },
  ];
}

/** Hub catalogue and role administration. Trade and certification-body memberships do not qualify. */
export function canOpenAdmin(user: NavUser) {
  const perms = permissionsForUser(user);
  return (
    perms.has("standards:write") ||
    perms.has("recs:write") ||
    perms.has("tariffs:write") ||
    perms.has("institutions:read") ||
    perms.has("roles:read") ||
    perms.has("audit:read")
  );
}

/** Certification desk. Recording products is not enough to open it. */
export function canOpenCertification(user: NavUser) {
  return can(user, "certify:operate");
}

/** Adapters and metrics stay off the public bar. */
export function canOpenHubTools(user: NavUser) {
  return can(user, "audit:read") || canOpenAdmin(user);
}

export function workNav(user: NavUser, locale: Locale): NavLink[] {
  const links: NavLink[] = [
    {
      id: "dashboard",
      href: `/${locale}/dashboard`,
      label: t(locale, "navDashboard"),
      blurb: "Your roles and the desks they open",
    },
  ];
  if (user.memberships?.some((membership) => isTradeOrgType(membership.organization.type))) {
    links.push({
      id: "trade",
      href: `/${locale}/trade`,
      label: "My products",
      blurb: "Every product, the body certifying it, and the certificate, customs, and inspection",
    });
  }
  if (canOpenCertification(user)) {
    links.push({
      id: "certification",
      href: `/${locale}/cb`,
      label: t(locale, "navCertification"),
      blurb: "Manufacturers, products, and certificates",
    });
  }
  if (can(user, "customs:decide")) {
    links.push({
      id: "customs",
      href: `/${locale}/customs`,
      label: t(locale, "navCustoms"),
      blurb: "Allow, hold, or refuse entry of a certified product",
    });
  }
  if (can(user, "inspect:write")) {
    links.push({
      id: "inspection",
      href: `/${locale}/inspect`,
      label: t(locale, "navInspection"),
      blurb: "Record conformity against the linked standard",
    });
  }
  if (can(user, "surveillance:operate")) {
    links.push({
      id: "surveillance",
      href: `/${locale}/surveillance`,
      label: t(locale, "navSurveillance"),
      blurb: "Follow-up after the product is on the market",
    });
  }
  if (can(user, "institutions:read") || authorityOwnerStateIds(user).length > 0) {
    links.push({
      id: "institutions",
      href: `/${locale}/admin/institutions`,
      label: t(locale, "navInstitutions"),
      blurb: "Authorities by country, and the account for each office",
    });
  }
  if (canOpenAdmin(user)) {
    links.push({
      id: "admin",
      href: `/${locale}/admin`,
      label: t(locale, "navAdmin"),
      blurb: "Catalogue, institutions, and roles",
    });
  }
  return links;
}

export type NavGroup = { id: string; label: string; links: NavLink[] };

/** One menu for the header, the home page, and the dashboard. */
export function siteNav(user: NavUser | null, locale: Locale): NavGroup[] {
  const link = (id: string, path: string, label: string, blurb?: string): NavLink => ({
    id,
    href: `/${locale}${path}`,
    label,
    blurb,
  });
  const groups: NavGroup[] = [
    {
      id: "standards",
      label: t(locale, "navGroupStandards"),
      links: [
        link("catalogue", "/catalogue", t(locale, "navCatalogue"), PUBLIC_BLURBS.catalogue),
        link("library", "/library", t(locale, "navLibrary"), PUBLIC_BLURBS.library),
        link("store", "/store", t(locale, "navStore"), PUBLIC_BLURBS.store),
        link("lookup", "/lookup", t(locale, "navLookup"), PUBLIC_BLURBS.lookup),
      ],
    },
    {
      id: "products",
      label: t(locale, "navGroupProducts"),
      links: [
        link("registry", "/registry", t(locale, "navRegistry"), PUBLIC_BLURBS.registry),
        link("verify", "/verify", t(locale, "navVerify"), PUBLIC_BLURBS.verify),
        link("consumers", "/consumers", t(locale, "navConsumers"), PUBLIC_BLURBS.consumers),
      ],
    },
  ];
  if (user) {
    const desks = workNav(user, locale).filter((item) => item.id !== "admin");
    if (desks.length) groups.push({ id: "desks", label: t(locale, "navGroupDesks"), links: desks });
  }
  groups.push({
    id: "analytics",
    label: t(locale, "navAnalytics"),
    links: [
      link("analytics", "/analytics", t(locale, "navAnalytics"), "Certified products, marks, and the certification pipeline"),
    ],
  });
  if (user && canOpenAdmin(user)) {
    groups.push({
      id: "admin",
      label: t(locale, "navAdmin"),
      links: [link("admin", "/admin", t(locale, "navAdmin"), "Catalogue, institutions, and roles")],
    });
  }
  return groups;
}
