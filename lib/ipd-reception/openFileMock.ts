export const OPEN_FILE_DIET_OPTIONS = [
  { value: "", label: "Select Diet Plan" },
  { value: "standard", label: "Standard Diet" },
  { value: "diabetic", label: "Diabetic Diet" },
  { value: "low-sodium", label: "Low Sodium Diet" },
  { value: "ayurvedic", label: "Ayurvedic Diet Plan" },
];

export const OPEN_FILE_VITAL_REFERENCES = {
  bloodPressure: "120/80",
  sugarLevel: "50-500",
  temperature: "97.8-99.1",
  pulseRate: "60-100",
  spo2: "95-100",
} as const;

export const OPEN_FILE_CLINICAL_NOTE_PLACEHOLDER =
  "e.g. No dairy, patient prefers warm water only, low sodium intake required for hypertensive management...";

export const OPEN_FILE_STEP_LABELS = ["Step 1", "Step 2"] as const;
