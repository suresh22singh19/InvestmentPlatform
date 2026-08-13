import type { AwaitingPatient, RequiredDocumentItem } from "./types";

export type DocumentSelection = "required" | "not_required";

export function sortRequiredDocuments(
  documents: RequiredDocumentItem[] | undefined
): RequiredDocumentItem[] {
  if (!documents?.length) return [];
  return [...documents].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function buildDocumentSelectionsMap(
  documents: RequiredDocumentItem[]
): Record<number, DocumentSelection | undefined> {
  const selections: Record<number, DocumentSelection | undefined> = {};
  documents.forEach((doc) => {
    selections[doc.documentMasterId] = doc.isSubmitted ? "required" : "not_required";
  });
  return selections;
}

export function buildSelectedDocumentsMap(
  documents: RequiredDocumentItem[]
): Record<string, boolean> {
  const selected: Record<string, boolean> = {};
  documents.forEach((doc) => {
    selected[String(doc.documentMasterId)] = doc.isSubmitted;
  });
  return selected;
}

export function findAwaitingPatientById(
  patients: AwaitingPatient[] | undefined,
  patientId: number
): AwaitingPatient | undefined {
  if (!patients?.length) return undefined;
  return patients.find((p) => p.patientId === patientId);
}

export function findAwaitingPatientRequiredDocuments(
  patients: AwaitingPatient[] | undefined,
  patientId: number
): RequiredDocumentItem[] {
  return findAwaitingPatientById(patients, patientId)?.requiredDocuments ?? [];
}

export function allDocumentsSelected(
  requiredDocuments: RequiredDocumentItem[],
  documentSelections: Record<number, DocumentSelection | undefined>
): boolean {
  if (requiredDocuments.length === 0) return true;
  return requiredDocuments.every((doc) => documentSelections[doc.documentMasterId] != null);
}

export function hasAtLeastOneRequiredDocument(
  requiredDocuments: RequiredDocumentItem[],
  documentSelections: Record<number, DocumentSelection | undefined>
): boolean {
  if (requiredDocuments.length === 0) return true;
  return requiredDocuments.some(
    (doc) => documentSelections[doc.documentMasterId] === "required"
  );
}

export function hasAtLeastOneSelectedDocument(
  requiredDocuments: RequiredDocumentItem[],
  selectedDocuments: Record<string, boolean>
): boolean {
  if (requiredDocuments.length === 0) return true;
  return requiredDocuments.some((doc) =>
    Boolean(selectedDocuments[String(doc.documentMasterId)])
  );
}

