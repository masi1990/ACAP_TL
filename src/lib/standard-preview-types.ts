export type PreviewTocEntry = {
  number: string;
  title: string;
  pageHint: string;
  includedInPreview: boolean;
};

export type PdfPreviewPage = {
  n: number;
  label: string;
  access: "free" | "partial" | "locked";
  imageUrl: string;
  note?: string;
};

export type PreviewPage = {
  id: string;
  label: string;
  kind: "cover" | "toc" | "scope" | "body" | "pdf";
  content: Record<string, string | undefined>;
};
