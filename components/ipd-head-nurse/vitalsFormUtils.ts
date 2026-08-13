import * as Yup from "yup";

export function formatBloodPressureInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 6);

  if (digitsOnly.length <= 3) {
    return digitsOnly;
  }

  const systolic = digitsOnly.slice(0, 3);
  const diastolic = digitsOnly.slice(3);
  return `${systolic}/${diastolic}`;
}

export function formatTemperatureInput(rawValue: string) {
  let value = rawValue.replace(/[^0-9.]/g, "");
  const parts = value.split(".");
  if (parts.length > 2) {
    value = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  if (value.includes(".")) {
    const dotIndex = value.indexOf(".");
    value = value.slice(0, dotIndex + 2);
  }
  value = value.slice(0, 5);
  if (value) {
    const numValue = parseFloat(value);
    if (numValue > 113) {
      return "113";
    }
  }
  return value;
}

export function formatHeartRateInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 3);
  if (!digitsOnly) return "";
  const numValue = parseInt(digitsOnly, 10);
  if (numValue > 200) return "200";
  return digitsOnly;
}

export function formatSpo2Input(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 3);
  if (!digitsOnly) return "";
  const numValue = parseInt(digitsOnly, 10);
  if (numValue > 100) return "100";
  return digitsOnly;
}

export const coreVitalsValidationFields = {
  bloodPressure: Yup.string()
    .trim()
    .required("Blood Pressure is required")
    .matches(/^\d+\/\d+$/, "Blood Pressure must be in format Systolic/Diastolic (e.g., 120/80)"),
  temperature: Yup.string()
    .trim()
    .required("Temperature is required")
    .matches(/^\d+(\.\d{1,2})?$/, "Temperature must be a valid number")
    .test("temperature-range", "Temperature must be between 86 and 113 °F", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 86 && numValue <= 113;
    }),
  pulse: Yup.string()
    .trim()
    .required("Heart Rate is required")
    .matches(/^\d+$/, "Heart Rate must contain only digits")
    .test("pulse-range", "Heart Rate must be between 40 and 200 bpm", (value) => {
      if (!value) return false;
      const numValue = parseInt(value, 10);
      return numValue >= 40 && numValue <= 200;
    }),
  spo2: Yup.string()
    .trim()
    .required("SPO2 is required")
    .matches(/^\d+(\.\d{1,2})?$/, "SPO2 must be a valid number")
    .test("spo2-range", "SPO2 must be between 70 and 100%", (value) => {
      if (!value) return false;
      const numValue = parseFloat(value);
      return numValue >= 70 && numValue <= 100;
    }),
};

export function parseBloodPressureValues(bloodPressure: string) {
  const [systolic = "", diastolic = ""] = bloodPressure.split("/");

  return {
    systolic: Number(systolic),
    diastolic: Number(diastolic),
  };
}
