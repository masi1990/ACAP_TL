import { authorityOwnerStateIds, can, permissionsForUser } from "./rbac";
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
  { id: "store", path: "/store", label: "navStore" },
  { id: "lookup", path: "/lookup", label: "navLookup" },
  { id: "registry", path: "/registry", label: "navRegistry" },
  { id: "verify", path: "/verify", label: "navVerify" },
  { id: "consumers", path: "/consumers", label: "navConsumers" },
] as const;

export type PublicFlowId = (typeof PUBLIC_FLOW)[number]["id"];

const PUBLIC_BLURBS: Record<PublicFlowId, string> = {
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
  ];
}

/** Same gate as the admin shell. */
export function canOpenAdmin(user: NavUser) {
  const perms = permissionsForUser(user);
  return (
    authorityOwnerStateIds(user).length > 0 ||
    perms.has("standards:write") ||
    perms.has("recs:write") ||
    perms.has("tariffs:write") ||
    perms.has("cb:write") ||
    perms.has("manufacturer:write") ||
    perms.has("institutions:read") ||
    perms.has("standards:read") ||
    perms.has("roles:read")
  );
}

export function canOpenCertification(user: NavUser) {
  return (
    can(user, "clients:write") ||
    can(user, "products:write") ||
    can(user, "certify:operate") ||
    can(user, "products:read")
  );
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
