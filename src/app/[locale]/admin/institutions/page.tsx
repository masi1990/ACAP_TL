import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  assignableOrgRoles,
  AUTHORITY_LABELS,
  AUTHORITY_TYPES,
  authorityOwnerStateIds,
  can,
  canAssignAcrossOrganisations,
  isTradeOrgType,
  managesSameAuthorityType,
  roleLabel,
} from "@/lib/rbac";
import { isLocale, type Locale } from "@/lib/i18n";
import { AFRICA_REGIONS } from "@/lib/africa-regions";
import { dayInput, grantFromLicences } from "@/lib/cb-profile";
import { DeleteButton } from "@/components/admin/crud-form";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { Badge } from "@/components/ui/badge";
import { LinePager } from "@/components/line-pager";
import { listHref, listPage } from "@/lib/list-page";
import { GrantRightsForm, type GrantAccount } from "./grant-rights-form";
import { InstitutionForm } from "./institution-form";
import { InstitutionRequests } from "./institution-requests";
import { InstitutionAccounts, type AccountRole } from "./institution-accounts";
import { CountryRecForm } from "./country-recs";

function regionLabel(region: string) {
  return AFRICA_REGIONS.find((item) => item.id === region)?.label || region || "Region not set";
}

export default async function InstitutionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string; country?: string; rec?: string; type?: string; page?: string }>;
}) {
  const { locale: raw } = await params;
  const query = await searchParams;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/institutions`} />;
  const ownerStates = authorityOwnerStateIds(session.user);
  const hubRead = can(session.user, "institutions:read");
  if (!hubRead && ownerStates.length === 0) notFound();

  const region = (query.region || "").toUpperCase();
  const requestedCountry = query.country || "";
  const countryId = hubRead
    ? requestedCountry
    : ownerStates.includes(requestedCountry)
      ? requestedCountry
      : ownerStates.length === 1
        ? ownerStates[0]
        : "";
  const recId = query.rec || "";
  const type = (query.type || "").toUpperCase();
  const canWrite = can(session.user, "institutions:write");
  const canDelete = can(session.user, "institutions:delete");
  const hubAssign = canAssignAcrossOrganisations(session.user);

  const [states, recs, organizations, roleCatalogue, accountRows] = await Promise.all([
    prisma.memberState.findMany({
      include: { recMemberships: { include: { rec: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.rec.findMany({ orderBy: { code: "asc" } }),
    prisma.organization.findMany({
      where: {
        type: { in: type && (AUTHORITY_TYPES as readonly string[]).includes(type) ? [type] : [...AUTHORITY_TYPES] },
        ...(hubRead
          ? countryId
            ? { memberStateId: countryId }
            : {}
          : { memberStateId: { in: countryId ? [countryId] : ownerStates } }),
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                roleAssignments: {
                  select: {
                    roleCode: true,
                    organizationId: true,
                    role: { select: { name: true, scope: true } },
                  },
                },
              },
            },
          },
        },
        cbLicenses: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.roleDefinition.findMany({
      select: { code: true, name: true, scope: true },
      orderBy: { name: "asc" },
    }),
    hubRead && canWrite
      ? prisma.userAccount.findMany({
          select: {
            email: true,
            name: true,
            memberships: {
              select: {
                role: true,
                organization: { select: { name: true, type: true, memberStateId: true } },
              },
            },
          },
          orderBy: { email: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const requests = canWrite
    ? await prisma.institutionRequest.findMany({
        where: { status: "PENDING" },
        include: { user: { select: { email: true } }, memberState: { select: { name: true, iso2: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const catalogueRoles: AccountRole[] = roleCatalogue.map((role) => ({
    code: role.code,
    name: role.name,
    scope: role.scope === "GLOBAL" ? "GLOBAL" : "ORG",
  }));

  function rolesFor(type: string): AccountRole[] {
    if (hubAssign) return catalogueRoles;
    return assignableOrgRoles(type).map((code) => {
      const saved = catalogueRoles.find((role) => role.code === code);
      return { code, name: saved?.name || roleLabel(code), scope: "ORG" };
    });
  }

  function memberHubRoles(assignments: Array<{ roleCode: string; organizationId: string | null; role: { name: string; scope: string } | null }>) {
    return assignments
      .filter((assignment) => assignment.organizationId == null || assignment.role?.scope === "GLOBAL")
      .map((assignment) => ({
        code: assignment.roleCode,
        name: assignment.role?.name || roleLabel(assignment.roleCode),
      }));
  }

  const countryChoices = hubRead ? states : states.filter((state) => ownerStates.includes(state.id));
  const visibleStates = countryChoices.filter((state) => {
    if (region && state.region !== region) return false;
    if (countryId && state.id !== countryId) return false;
    if (recId && !state.recMemberships.some((membership) => membership.recId === recId)) return false;
    return true;
  });
  const filtered = Boolean(region || countryId || recId);
  const listedStates = visibleStates.filter(
    (state) => filtered || organizations.some((org) => org.memberStateId === state.id),
  );
  const listing = listPage(query.page, listedStates.length, 8);
  const pageStates = listedStates.slice(listing.skip, listing.skip + listing.take);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Institutions by country</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Each country keeps its own certification body, standards body, regulator, customs authority,
          and other offices. They do not share one account. A country belongs to one region and can
          belong to more than one REC.           Only ARSO can create or delete an authority. To create one for a person
          who already has an account, choose that account. The main account of an
          authority adds members for that same authority type. Other types in the
          country are listed for viewing only.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grid gap-1">
          Region
          <select name="region" defaultValue={region} className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3">
            <option value="">All regions</option>
            {AFRICA_REGIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Country
          <select name="country" defaultValue={countryId} className="h-10 max-w-64 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3">
            <option value="">All countries</option>
            {countryChoices.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          REC
          <select name="rec" defaultValue={recId} className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3">
            <option value="">All RECs</option>
            {recs.map((rec) => (
              <option key={rec.id} value={rec.id}>
                {rec.code}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Authority
          <select name="type" defaultValue={type} className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3">
            <option value="">All types</option>
            {AUTHORITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {AUTHORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-[var(--accent)] px-3 font-medium text-[var(--accent-fg)]">
          Filter
        </button>
        <Link href={`/${locale}/admin/institutions`} className="text-[var(--accent)] underline">
          Clear
        </Link>
      </form>

      {canWrite && (
        <InstitutionRequests
          rows={requests.map((row) => ({
            id: row.id,
            name: row.name,
            typeLabel: AUTHORITY_LABELS[row.type as keyof typeof AUTHORITY_LABELS] || row.type,
            country: `${row.memberState.name} (${row.memberState.iso2})`,
            email: row.user.email,
          }))}
        />
      )}

      {hubRead && canWrite && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Grant institutional rights</h2>
          <p className="max-w-3xl text-sm text-[var(--muted)]">
            Use this when someone already has an account and needs an institution on that same login. Choose their
            account. Their manufacturer company stays, and they become the organisation admin of the new institution.
            The institution name and country start from the organisation on that account.
          </p>
          <GrantRightsForm
            accounts={accountRows.map((user): GrantAccount => {
              const trade = user.memberships.filter((membership) => isTradeOrgType(membership.organization.type));
              const chosen =
                trade.find((membership) => membership.role === "PRIMARY_ADMIN") || trade[0] || user.memberships[0];
              const organizationName = chosen?.organization.name || "";
              return {
                email: user.email,
                label: `${user.email} · ${user.name}${organizationName ? ` · ${organizationName}` : " · No organisation"}`,
                institutionName: organizationName,
                memberStateId: chosen?.organization.memberStateId || "",
              };
            })}
            countries={states.map((state) => ({ value: state.id, label: `${state.name} (${state.iso2})` }))}
          />
        </section>
      )}

      {canWrite && (
        <InstitutionForm
          states={states}
          action="/api/admin/organizations"
          idPrefix="institution-"
          submitLabel="Add authority"
        />
      )}

      <div className="space-y-8">
        {pageStates.map((state) => {
          const rows = organizations.filter((org) => org.memberStateId === state.id);
          if (type && rows.length === 0) return null;
          return (
            <section key={state.id} className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">{state.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <Badge>{regionLabel(state.region)}</Badge>
                  {state.recMemberships.length === 0 && <span className="text-[var(--muted)]">No REC membership</span>}
                  {state.recMemberships.map((membership) => (
                    <Badge key={membership.recId} tone="info">
                      {membership.rec.code}
                    </Badge>
                  ))}
                </div>
              </div>
              {canWrite && (
                <details>
                  <summary className="cursor-pointer text-sm text-[var(--accent)]">REC membership</summary>
                  <div className="mt-3">
                    <CountryRecForm
                      memberStateId={state.id}
                      recs={recs}
                      selected={state.recMemberships.map((membership) => membership.recId)}
                    />
                  </div>
                </details>
              )}
              <div className="panel overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
                      <th className="px-4 py-2">Authority</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Accounts and roles</th>
                      {canDelete && <th className="px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={canDelete ? 4 : 3} className="px-4 py-6 text-[var(--muted)]">
                          No authorities in {state.name} yet.
                        </td>
                      </tr>
                    )}
                    {rows.map((org) => {
                      const licence = org.cbLicenses.find((item) => item.markScheme === "QUALITY") || org.cbLicenses[0];
                      const grant = grantFromLicences(org.cbLicenses);
                      return (
                        <Fragment key={org.id}>
                          <tr className="border-b border-[var(--line)]/50">
                            <td className="px-4 py-3">
                              <div className="font-medium">{org.name}</div>
                              <div className="text-xs text-[var(--muted)]">{org.contactEmail || "No contact email"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge>{AUTHORITY_LABELS[org.type as keyof typeof AUTHORITY_LABELS] || org.type}</Badge>
                              {org.type === "CB" && licence && (
                                <div className="mt-1 text-xs text-[var(--muted)]">
                                  {licence.licenseNumber} · {grant === "BOTH" ? "Quality and Eco" : "Quality"}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {org.memberships.length === 0 && <span className="text-[var(--muted)]">—</span>}
                              <ul className="space-y-1">
                                {org.memberships.map((member) => (
                                  <li key={member.user.id}>
                                    <span>{member.user.email}</span>
                                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                                      {roleLabel(member.role, catalogueRoles.find((role) => role.code === member.role)?.name)}
                                      {memberHubRoles(member.user.roleAssignments).map((hub) => ` · ${hub.name}`)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                            {canDelete && (
                              <td className="px-4 py-3 text-right">
                                <DeleteButton action={`/api/admin/organizations/${org.id}`} />
                              </td>
                            )}
                          </tr>
                          <tr className="border-b border-[var(--line)]">
                            <td colSpan={canDelete ? 4 : 3} className="px-4 py-3">
                              <div className="flex flex-wrap gap-4">
                                {canWrite && (
                                  <details>
                                    <summary className="cursor-pointer text-sm text-[var(--accent)]">Edit authority</summary>
                                    <div className="mt-3">
                                      <InstitutionForm
                                        states={states}
                                        method="PATCH"
                                        action={`/api/admin/organizations/${org.id}`}
                                        idPrefix={`institution-${org.id}-`}
                                        submitLabel="Save authority"
                                        defaults={{
                                          type: org.type,
                                          name: org.name,
                                          memberStateId: org.memberStateId,
                                          accreditationBody: org.accreditationBody,
                                          accreditationRef: org.accreditationRef,
                                          contactEmail: org.contactEmail,
                                          contactPhone: org.contactPhone,
                                          addressLine: org.addressLine,
                                          website: org.website,
                                          status: org.status,
                                          clientMarks: grant || "QUALITY",
                                          licenseStatus: licence?.status,
                                          licenseNumber: licence?.licenseNumber,
                                          issuedAt: dayInput(licence?.issuedAt ?? null),
                                          expiresAt: dayInput(licence?.expiresAt ?? null),
                                        }}
                                      />
                                    </div>
                                  </details>
                                )}
                                <details>
                                  <summary className="cursor-pointer text-sm text-[var(--accent)]">Accounts</summary>
                                  <div className="mt-3">
                                    <InstitutionAccounts
                                      organizationId={org.id}
                                      canAssign={hubAssign || managesSameAuthorityType(session.user, org)}
                                      roles={rolesFor(org.type)}
                                      members={org.memberships.map((member) => ({
                                        userId: member.user.id,
                                        email: member.user.email,
                                        name: member.user.name,
                                        role: member.role,
                                        hubRoles: memberHubRoles(member.user.roleAssignments),
                                      }))}
                                    />
                                  </div>
                                </details>
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
      <LinePager
        page={listing.page}
        pageCount={listing.pageCount}
        prevHref={listHref(`/${locale}/admin/institutions`, listing.page - 1, {
          region,
          country: countryId,
          rec: recId,
          type,
        })}
        nextHref={listHref(`/${locale}/admin/institutions`, listing.page + 1, {
          region,
          country: countryId,
          rec: recId,
          type,
        })}
      />
    </div>
  );
}
