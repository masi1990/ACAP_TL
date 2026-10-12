# Machine-readable conversion fidelity

Standards affect **public health, safety, and the environment**. When converting an ARS PDF into machine form (JSON / future XML), the hub **must not omit** normative content.

## Rules

1. PDF remains the legal source of truth until ARSO formally adopts the machine form.
2. Machine pack stores the **full** document: scope, normative references, requirements/tables, contaminants, hygiene, packaging, labelling, sampling, and annexes that carry requirements.
3. Public portal and webstore **preview** may show only title + contents + Clause 1 Scope — that is an **access control** slice, not a truncated store of record.
4. Every `StandardVersion` carries a `contentHash` over the full machine document.
5. Completeness checks run at preview/load time (`assessMachinePackCompleteness`).

## Tariff linkage (independent standards)

- A **standard** does not own a single tariff code.
- Physical products that are traded are classified under REC tariff lines (HS6 / HS8 / HS10).
- `StandardTariffMap` links **one standard version → many tariff lines** across RECs.
- Example (ARS 464:2022 milled rice): COMESA/EAC/SADC `1006.30`, ECOWAS `1006.30.00` and `1006.30.00.00`.

## Public portal behaviour

Tariff lookup returns **standard designation, title, and Scope text** only, plus a link to the free PDF-style preview.
