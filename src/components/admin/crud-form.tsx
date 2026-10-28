"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyCrud } from "@/components/ui/crud-notice";
import { SearchSelect } from "@/components/ui/search-select";
import { isLocale, t, type Locale } from "@/lib/i18n";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "multiselect" | "checkbox" | "date" | "file";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean | string[];
  /** Hint under multiselect / complex fields */
  help?: string;
  /** Sent with the form and kept off the page. */
  hidden?: boolean;
  /** Hide this field unless another field has this value. */
  showWhen?: { field: string; equals: string };
};

export function CrudForm({
  action,
  method = "POST",
  fields,
  submitLabel = "Save",
  idPrefix = "",
  onSuccess,
  searchable = false,
  locale,
}: {
  action: string;
  method?: "POST" | "PATCH";
  fields: Field[];
  submitLabel?: string;
  /** Keeps input ids unique when several forms render on one page. */
  idPrefix?: string;
  onSuccess?: () => void;
  /** Certification desk: select fields open a searchable list. Other forms keep the native select. */
  searchable?: boolean;
  locale?: Locale;
}) {
  const pathname = usePathname() || "";
  const pathLocale = pathname.split("/")[1] || "";
  const activeLocale: Locale = locale ?? (isLocale(pathLocale) ? pathLocale : "en");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function initialValues() {
    const init: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "multiselect") continue;
      if (f.defaultValue != null) init[f.name] = String(f.defaultValue);
      else if (f.type === "checkbox") init[f.name] = "false";
      else init[f.name] = "";
    }
    return init;
  }

  function initialMulti() {
    const init: Record<string, string[]> = {};
    for (const f of fields) {
      if (f.type !== "multiselect") continue;
      init[f.name] = Array.isArray(f.defaultValue)
        ? f.defaultValue.map(String)
        : f.defaultValue
          ? [String(f.defaultValue)]
          : [];
    }
    return init;
  }

  function blankValues() {
    return initialValues();
  }

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>(initialMulti);
  const [fileEpoch, setFileEpoch] = useState(0);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function toggleMulti(name: string, value: string) {
    setMultiValues((prev) => {
      const cur = prev[name] || [];
      return {
        ...prev,
        [name]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    const hasFiles = fields.some((f) => f.type === "file");
    let res: Response;
    if (hasFiles) {
      const form = new FormData();
      for (const f of fields) {
        if (f.type === "file") {
          const file = fileRefs.current[f.name]?.files?.[0];
          if (file && file.size > 0) form.append(f.name, file);
          continue;
        }
        if (f.type === "multiselect") {
          form.append(f.name, JSON.stringify(multiValues[f.name] || []));
          continue;
        }
        form.append(f.name, values[f.name] ?? "");
      }
      res = await fetch(action, { method, body: form });
    } else {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.type === "multiselect") {
          body[f.name] = multiValues[f.name] || [];
          continue;
        }
        const raw = values[f.name];
        if (f.type === "checkbox") body[f.name] = raw === "true" || raw === "on";
        else if (f.type === "number") body[f.name] = raw === "" ? undefined : Number(raw);
        else body[f.name] = raw;
      }
      res = await fetch(action, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || t(activeLocale, "Request failed");
      setError(message);
      notifyCrud("error", message);
      return;
    }
    const note = typeof data.message === "string" ? data.message : method === "POST" ? t(activeLocale, "Created") : t(activeLocale, "Updated");
    setLink(typeof data.setPasswordUrl === "string" ? data.setPasswordUrl : null);
    if (method === "POST") {
      setValues(blankValues());
      setMultiValues(initialMulti());
      setFileEpoch((n) => n + 1);
      setMsg(note);
      notifyCrud("created");
    } else {
      setMsg(note);
      notifyCrud("updated");
    }
    onSuccess?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="panel grid max-w-2xl gap-3 p-4">
      {fields.map((f) => {
        if (f.hidden) return null;
        if (f.showWhen && values[f.showWhen.field] !== f.showWhen.equals) return null;
        const fieldId = `${idPrefix}${f.name}`;
        return (
        <div
          key={f.name}
          className="grid gap-1"
        >
          <Label htmlFor={fieldId}>{t(activeLocale, f.label)}</Label>
          {f.type === "textarea" ? (
            <textarea
              id={fieldId}
              required={f.required}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
              className="min-h-24 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          ) : f.type === "select" && searchable ? (
            <div className="relative">
              <SearchSelect
                id={fieldId}
                value={values[f.name] || ""}
                onChange={(next) => setValues((v) => ({ ...v, [f.name]: next }))}
                placeholder={(f.options || []).length === 0 ? t(activeLocale, "Nothing to choose yet") : t(activeLocale, "Select…")}
                searchPlaceholder={`Search ${f.label.toLowerCase()}`}
                options={f.options || []}
              />
              <input
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                value={values[f.name] || ""}
                required={f.required}
                onChange={() => undefined}
              />
            </div>
          ) : f.type === "select" ? (
            <select
              id={fieldId}
              required={f.required}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="">{(f.options || []).length === 0 ? t(activeLocale, "Nothing to choose yet") : t(activeLocale, "Select…")}</option>
              {(f.options || []).map((o) => (
                <option key={o.value} value={o.value}>
                  {t(activeLocale, o.label)}
                </option>
              ))}
            </select>
          ) : f.type === "multiselect" ? (
            <div className="sm:col-span-2">
              <div
                id={fieldId}
                className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-2"
                role="group"
                aria-label={f.label}
              >
                {(f.options || []).length === 0 && (
                  <p className="px-2 py-3 text-sm text-[var(--muted)]">
                    No tariff lines yet — create RECs and tariff codes first.
                  </p>
                )}
                {(f.options || []).map((o) => {
                  const checked = (multiValues[f.name] || []).includes(o.value);
                  return (
                    <label
                      key={o.value}
                      className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => toggleMulti(f.name, o.value)}
                      />
                      <span className="leading-snug">{t(activeLocale, o.label)}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {`${(multiValues[f.name] || []).length} ${t(activeLocale, "selected")}${f.help ? ` · ${t(activeLocale, f.help)}` : ""}`}
              </p>
            </div>
          ) : f.type === "file" ? (
            <Input
              key={`${fieldId}-${fileEpoch}`}
              id={fieldId}
              type="file"
              accept=".pdf,application/pdf"
              ref={(node) => {
                fileRefs.current[f.name] = node;
              }}
            />
          ) : f.type === "checkbox" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                id={fieldId}
                type="checkbox"
                checked={values[f.name] === "true"}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked ? "true" : "false" }))}
              />
              {f.placeholder || f.label}
            </label>
          ) : (
            <Input
              id={fieldId}
              autoComplete="off"
              type={f.type || "text"}
              required={f.required}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
            />
          )}
          {f.help && f.type !== "multiselect" ? <p className="text-xs text-[var(--muted)]">{t(activeLocale, f.help)}</p> : null}
        </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? t(activeLocale, "Saving…") : t(activeLocale, submitLabel)}
        </Button>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        {msg && <p className="text-sm text-emerald-800">{msg}</p>}
        {link && (
          <input
            readOnly
            value={link}
            aria-label="Set-password link"
            className="h-10 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-xs"
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </div>
    </form>
  );
}

export function DeleteButton({
  action,
  label = "Delete",
}: {
  action: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(action, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Delete failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    notifyCrud("deleted");
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onDelete}>
        {label}
      </Button>
      {error && <span className="max-w-[14rem] text-right text-xs text-rose-700">{error}</span>}
    </span>
  );
}
