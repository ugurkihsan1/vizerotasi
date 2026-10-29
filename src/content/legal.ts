import documents from "./legal-documents.json";

export type LegalDocumentId = "privacy" | "transfer" | "terms";
export type LegalBlock =
  { kind: "paragraph"; text: string } | { kind: "list"; items: string[] };
export interface LegalDocument {
  id: LegalDocumentId;
  shortTitle: string;
  title: string;
  filename: string;
  version: string;
  updatedAt: string;
  sections: { heading: string; blocks: LegalBlock[] }[];
}

export const legalDocuments = documents as LegalDocument[];
export function legalDocument(id: string | undefined) {
  return legalDocuments.find((document) => document.id === id);
}
export const privacyVersion = legalDocument("privacy")!.version;
export const transferVersion = legalDocument("transfer")!.version;
export const termsVersion = legalDocument("terms")!.version;
export const legalRoutes = {
  privacy: "/legal/privacy",
  transfer: "/legal/transfer",
  terms: "/legal/terms",
} as const;
export const legalPublicUrls = {
  privacy: "https://ugurkihsan1.github.io/vizerotasi/privacy.html",
  transfer: "https://ugurkihsan1.github.io/vizerotasi/transfer-consent.html",
  terms: "https://ugurkihsan1.github.io/vizerotasi/terms.html",
} as const;
