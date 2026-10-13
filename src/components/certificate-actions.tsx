"use client";

import { ArrowLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";

const downloadClass =
  "inline-flex items-center gap-2 rounded-md border border-[#1f4d3a] bg-[#1f4d3a] px-3 py-2 text-sm font-medium !text-white shadow-sm hover:brightness-110";

export function CertificateToolbar({
  fallbackHref,
  fileHref,
}: {
  fallbackHref: string;
  fileHref: string | null;
}) {
  const router = useRouter();

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push(fallbackHref);
        }}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--ink)] shadow-sm hover:bg-[var(--surface-2)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>
      {fileHref ? (
        <a href={fileHref} className={downloadClass}>
          <Download className="h-4 w-4" aria-hidden />
          Download certificate
        </a>
      ) : (
        <button type="button" onClick={() => window.print()} className={downloadClass}>
          <Download className="h-4 w-4" aria-hidden />
          Download certificate
        </button>
      )}
    </div>
  );
}

export function CertificateDownloadLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className={downloadClass}>
      <Download className="h-4 w-4" aria-hidden />
      {children}
    </a>
  );
}
