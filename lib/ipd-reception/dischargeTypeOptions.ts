export type DischargeTypeValue = "normal" | "dama" | "lama" | "dopr";

export const DISCHARGE_TYPE_OPTIONS: { value: DischargeTypeValue; label: string }[] = [
  { value: "normal", label: "Normal Discharge" },
  { value: "dama", label: "DAMA" },
  { value: "lama", label: "LAMA" },
  { value: "dopr", label: "DOPR" },
];

export const DISCHARGE_TYPE_LABELS: Record<DischargeTypeValue, string> = {
  normal: "Normal Discharge",
  dama: "DAMA",
  lama: "LAMA",
  dopr: "DOPR",
};

export function isDischargeTypeValue(value: string): value is DischargeTypeValue {
  return value === "normal" || value === "dama" || value === "lama" || value === "dopr";
}
