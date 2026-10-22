import content from "../content/spain-tourism.json";
import type { Document } from "./types";
export interface DocumentSection {
  title: string;
  applies_to: string[];
  items: string[];
  requirement?: string;
}
export interface GuideDocument extends Document {
  visa_type: string;
  sort_order: number;
  requirement: string;
  source_name: string;
  source_document: string;
  source_type: string;
  source_scope: string;
  source_updated_at: string | null;
  editor_note: string | null;
  details: DocumentSection[];
}
export const spainSource = content.source;
export const spainGuide = content;
export const spainDocuments = content.documents as GuideDocument[];
export function sectionsFor(document: GuideDocument, employment: string) {
  return document.details.filter(
    (s) =>
      !employment || !s.applies_to.length || s.applies_to.includes(employment),
  );
}
export function mergeSpainDocuments(rows: Document[]): GuideDocument[] {
  return spainDocuments
    .map((original) => {
      const stored = rows.find((r) => r.id === original.id);
      return stored ? { ...original, ...stored } : original;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}
